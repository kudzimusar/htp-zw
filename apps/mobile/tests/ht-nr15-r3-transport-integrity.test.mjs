import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  handleWhatsAppWebhookRequest,
  verifyMetaSignature,
  constantTimeEqual,
  computeStablePayloadHash
} from "../../../supabase/functions/newsroom-whatsapp-webhook/index.ts";

import {
  handleWhatsAppDispatchRequest,
  normalizeInternationalPhone
} from "../../../supabase/functions/newsroom-whatsapp-dispatch/index.ts";

import {
  handleAiAssistRequest
} from "../../../supabase/functions/newsroom-ai-assist/index.ts";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

const aiServiceModule = loadTs("src/services/newsroom-ai.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});

const { mapAiAssistOverview } = aiServiceModule;

// Helper to compute HMAC SHA-256 for test signatures
async function computeTestSignature(secret, body) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return "sha256=" + Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// =============================================================================
// 1. MIGRATION 87 AUTHORITY & DATABASE SERIALIZATION PROOF
// =============================================================================

test("HT-NR-CLOSE-R3: Repository migration count is at least 87", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 87, `Expected at least 87 migrations, found ${files.length}`);

  assert.ok(
    files.includes("20261018070000_ht_nr_close_r3_transport_serialization.sql"),
    "Migration 87 (ht_nr_close_r3_transport_serialization) must exist"
  );
});

test("HT-NR-CLOSE-R3: Migration 87 establishes true database serialization via SELECT ... FOR UPDATE", () => {
  const mig87 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018070000_ht_nr_close_r3_transport_serialization.sql"),
    "utf8"
  );

  assert.match(
    mig87,
    /select\s+\*\s+into\s+v_broadcast\s+from\s+public\.newsroom_whatsapp_broadcasts\s+where\s+id\s*=\s*p_broadcast_id\s+for\s+update;/i,
    "Migration 87 must acquire row lock (FOR UPDATE) on canonical broadcast row before evaluating dispatch attempts"
  );
});

// =============================================================================
// 2. CONCURRENT SAME-BROADCAST SAME-KEY: EXACTLY 1 PROVIDER CALL
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 1: concurrent same-broadcast same-key requests result in one provider-send authority", async () => {
  const broadcastId = "11111111-1111-4111-8111-111111111111";
  const idempotencyKey = "dispatch-key-same-concurrent-01";
  let providerCallCount = 0;

  // Shared in-memory lock & state simulating the transactional FOR UPDATE serialization
  let isLocked = false;
  let activeAttempt = null;
  const lockQueue = [];

  const acquireLock = () => new Promise((resolve) => {
    if (!isLocked) {
      isLocked = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });

  const releaseLock = () => {
    if (lockQueue.length > 0) {
      const next = lockQueue.shift();
      next();
    } else {
      isLocked = false;
    }
  };

  const createMockDb = () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-staff-001" } }, error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, title: "Alert", body: "Body", status: "approved", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (fn, args) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      if (fn === "newsroom_get_consented_whatsapp_recipients") {
        return {
          data: [{ recipient_id: "recip-1", phone: "263771234567", phone_hash: "0123456789abcdef0123456789abcdef" }],
          error: null
        };
      }
      if (fn === "newsroom_prepare_whatsapp_dispatch") {
        await acquireLock();
        try {
          if (activeAttempt) {
            // Same key replay
            if (activeAttempt.idempotency_key === args.p_idempotency_key) {
              return {
                data: { is_duplicate: true, dispatch_id: activeAttempt.id, status: activeAttempt.status },
                error: null
              };
            }
          }
          activeAttempt = {
            id: "disp-1001",
            idempotency_key: args.p_idempotency_key,
            status: "submitted"
          };
          return {
            data: { is_duplicate: false, dispatch_id: activeAttempt.id, status: "submitted" },
            error: null
          };
        } finally {
          releaseLock();
        }
      }
      if (fn === "newsroom_record_whatsapp_dispatch_result") {
        if (activeAttempt) {
          activeAttempt.status = "provider-accepted";
          activeAttempt.accepted_count = args.p_accepted_count;
        }
        return { data: { ok: true }, error: null };
      }
      if (fn === "newsroom_get_whatsapp_broadcast_dispatch") {
        return {
          data: {
            id: activeAttempt?.id,
            transport_status: activeAttempt?.status || "provider-accepted",
            accepted_count: 1,
            recipient_count: 1
          },
          error: null
        };
      }
      return { data: null, error: null };
    }
  });

  const customFetch = async (url) => {
    providerCallCount++;
    return new Response(JSON.stringify({ messages: [{ id: `wamid_${providerCallCount}` }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const dbClient = createMockDb();
  const options = {
    userClient: dbClient,
    adminClient: dbClient,
    whatsappSystemAccessToken: "valid_token",
    whatsappPhoneNumberId: "phone_123",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: customFetch
  };

  const makeReq = () => new Request("https://localhost/dispatch", {
    method: "POST",
    headers: { "Authorization": "Bearer valid_jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ broadcast_id: broadcastId, idempotency_key: idempotencyKey })
  });

  // Launch two concurrent requests for the exact same broadcast and same key
  const [res1, res2] = await Promise.all([
    handleWhatsAppDispatchRequest(makeReq(), options),
    handleWhatsAppDispatchRequest(makeReq(), options)
  ]);

  const json1 = await res1.json();
  const json2 = await res2.json();

  assert.equal(res1.status, 200);
  assert.equal(res2.status, 200);
  assert.ok(json1.ok);
  assert.ok(json2.ok);

  // Exactly one of the requests acquired provider call authority; the second got duplicate
  const duplicates = [json1.is_duplicate, json2.is_duplicate].filter(Boolean);
  assert.equal(duplicates.length, 1, "Exactly one request must be marked duplicate replay");

  // PROVE: Provider call count = 1 under concurrent execution
  assert.equal(providerCallCount, 1, "Provider Meta call count must be exactly 1 under concurrent execution");
});

// =============================================================================
// 3. CONCURRENT SAME-BROADCAST DIFFERENT-KEY: EXACTLY 1 PROVIDER CALL
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 2: concurrent same-broadcast different-key requests result in one provider-send authority", async () => {
  const broadcastId = "22222222-2222-4222-8222-222222222222";
  let providerCallCount = 0;

  let isLocked = false;
  let activeAttempt = null;
  const lockQueue = [];

  const acquireLock = () => new Promise((resolve) => {
    if (!isLocked) {
      isLocked = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });

  const releaseLock = () => {
    if (lockQueue.length > 0) {
      const next = lockQueue.shift();
      next();
    } else {
      isLocked = false;
    }
  };

  const createMockDb = () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-staff-002" } }, error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, title: "Alert", body: "Body", status: "approved", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (fn, args) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      if (fn === "newsroom_get_consented_whatsapp_recipients") {
        return {
          data: [{ recipient_id: "recip-2", phone: "263771234568", phone_hash: "abcdef0123456789abcdef0123456789" }],
          error: null
        };
      }
      if (fn === "newsroom_prepare_whatsapp_dispatch") {
        await acquireLock();
        try {
          if (activeAttempt && activeAttempt.status === "submitted") {
            // Concurrent in-flight collision!
            return {
              data: null,
              error: { code: "40001", message: "A dispatch attempt is currently in progress for this broadcast" }
            };
          }
          activeAttempt = {
            id: "disp-2002",
            idempotency_key: args.p_idempotency_key,
            status: "submitted"
          };
          return {
            data: { is_duplicate: false, dispatch_id: activeAttempt.id, status: "submitted" },
            error: null
          };
        } finally {
          releaseLock();
        }
      }
      if (fn === "newsroom_record_whatsapp_dispatch_result") {
        if (activeAttempt) {
          activeAttempt.status = "provider-accepted";
        }
        return { data: { ok: true }, error: null };
      }
      return { data: null, error: null };
    }
  });

  const customFetch = async () => {
    providerCallCount++;
    return new Response(JSON.stringify({ messages: [{ id: `wamid_diff_${providerCallCount}` }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const dbClient = createMockDb();
  const options = {
    userClient: dbClient,
    adminClient: dbClient,
    whatsappSystemAccessToken: "valid_token",
    whatsappPhoneNumberId: "phone_123",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: customFetch
  };

  const req1 = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: { "Authorization": "Bearer valid_jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ broadcast_id: broadcastId, idempotency_key: "key-thread-alpha-001" })
  });

  const req2 = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: { "Authorization": "Bearer valid_jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ broadcast_id: broadcastId, idempotency_key: "key-thread-beta-002" })
  });

  const [res1, res2] = await Promise.all([
    handleWhatsAppDispatchRequest(req1, options),
    handleWhatsAppDispatchRequest(req2, options)
  ]);

  const statuses = [res1.status, res2.status];
  assert.ok(statuses.includes(200), "One request must succeed");
  assert.ok(statuses.includes(409), "The other concurrent request must receive 409 conflict");

  // PROVE: Exactly 1 provider call executed
  assert.equal(providerCallCount, 1, "Provider call count must be exactly 1 under concurrent different-key requests");
});

// =============================================================================
// 4. SAME-KEY REPLAY AFTER SENT BROADCAST: ZERO PROVIDER CALLS
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 3: successful same-key replay after broadcast status=sent performs zero provider calls", async () => {
  const broadcastId = "33333333-3333-4333-8333-333333333333";
  const idempotencyKey = "original-sent-key-333";
  let providerCallCount = 0;

  const mockDb = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-staff-003" } }, error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, title: "Sent Alert", body: "Body", status: "sent", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (fn, args) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      if (fn === "newsroom_prepare_whatsapp_dispatch") {
        // Migration 87 logic: same-key for already sent/accepted returns duplicate
        if (args.p_idempotency_key === idempotencyKey) {
          return {
            data: { is_duplicate: true, dispatch_id: "disp-333", status: "provider-accepted" },
            error: null
          };
        }
        return { data: null, error: { code: "22023", message: "Broadcast has already been accepted by provider" } };
      }
      if (fn === "newsroom_get_whatsapp_broadcast_dispatch") {
        return {
          data: {
            id: "disp-333",
            transport_status: "provider-accepted",
            recipient_count: 5,
            accepted_count: 5,
            dispatched_at: "2026-10-18T05:00:00Z"
          },
          error: null
        };
      }
      return { data: null, error: null };
    }
  };

  const customFetch = async () => {
    providerCallCount++;
    return new Response("{}", { status: 200 });
  };

  const req = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: { "Authorization": "Bearer valid_jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ broadcast_id: broadcastId, idempotency_key: idempotencyKey })
  });

  const res = await handleWhatsAppDispatchRequest(req, {
    userClient: mockDb,
    adminClient: mockDb,
    whatsappSystemAccessToken: "valid_token",
    whatsappPhoneNumberId: "phone_123",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: customFetch
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.is_duplicate, true);
  assert.equal(data.dispatch_id, "disp-333");
  assert.equal(data.status, "provider-accepted");
  assert.equal(providerCallCount, 0, "Must perform ZERO provider calls on sent broadcast same-key replay");
});

// =============================================================================
// 5. DIFFERENT-KEY REPLAY AFTER SENT BROADCAST: 409 CONFLICT & ZERO PROVIDER CALLS
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 4: successful different-key replay after sent is rejected with zero provider calls", async () => {
  const broadcastId = "44444444-4444-4444-8444-444444444444";
  let providerCallCount = 0;

  const mockDb = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-staff-004" } }, error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, title: "Sent Alert", body: "Body", status: "sent", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (fn, args) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      if (fn === "newsroom_prepare_whatsapp_dispatch") {
        // Different key against sent broadcast must fail closed with 22023
        return {
          data: null,
          error: { code: "22023", message: "Broadcast has already been accepted by provider and cannot be re-dispatched" }
        };
      }
      return { data: null, error: null };
    }
  };

  const customFetch = async () => {
    providerCallCount++;
    return new Response("{}", { status: 200 });
  };

  const req = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: { "Authorization": "Bearer valid_jwt", "Content-Type": "application/json" },
    body: JSON.stringify({ broadcast_id: broadcastId, idempotency_key: "new-different-key-444" })
  });

  const res = await handleWhatsAppDispatchRequest(req, {
    userClient: mockDb,
    adminClient: mockDb,
    whatsappSystemAccessToken: "valid_token",
    whatsappPhoneNumberId: "phone_123",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: customFetch
  });

  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.match(data.error, /already been accepted/);
  assert.equal(providerCallCount, 0, "Must perform ZERO provider calls on sent broadcast different key request");
});

// =============================================================================
// 6. TOTAL REJECTION RETRY WITH NEW KEY & ACCEPTED RETRY BLOCKS FURTHER SENDS
// =============================================================================

test("HT-NR-CLOSE-R3 Requirements 5 & 6: total rejection remains retryable with a new key, and accepted retry prevents all further sends", async () => {
  const mig87 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018070000_ht_nr_close_r3_transport_serialization.sql"),
    "utf8"
  );

  // Requirement 5: Migration 87 checks accepted_count > 0 for irreversible completion:
  assert.match(
    mig87,
    /where\s+broadcast_id\s*=\s*p_broadcast_id\s+and\s+accepted_count\s*>\s*0/i,
    "Migration 87 only blocks new attempts if a prior attempt has accepted_count > 0 (total rejections remain retryable)"
  );

  // Requirement 6: Once an attempt is accepted, subsequent different keys fail closed:
  assert.match(
    mig87,
    /if\s+v_accepted_dispatch\.id\s+is\s+not\s+null\s+then[\s\S]*?raise\s+exception\s+using\s+errcode\s*=\s*'22023'/i,
    "Accepted attempt strictly prevents all further different-key sends"
  );
});

// =============================================================================
// 7. WEBHOOK INGEST RPC ERROR CAUSES NON-2XX
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 7: webhook ingest RPC error causes non-2xx", async () => {
  const secret = "test_webhook_secret_07";
  const rawBody = JSON.stringify({
    entry: [{
      changes: [{
        value: {
          statuses: [{ id: "wamid_err_01", status: "delivered", timestamp: "1790000001" }]
        }
      }]
    }]
  });
  const sig = await computeTestSignature(secret, rawBody);

  const mockDb = {
    rpc: async (fn) => {
      if (fn === "newsroom_ingest_whatsapp_webhook_event") {
        return { data: null, error: { message: "Database connection terminated unexpectedly" } };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sig
    },
    body: rawBody
  });

  const res = await handleWhatsAppWebhookRequest(req, {
    whatsappAppSecret: secret,
    adminClient: mockDb,
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test_key"
  });

  assert.equal(res.status, 500, "Webhook RPC database error must return non-2xx (HTTP 500)");
  const data = await res.json();
  assert.equal(data.ok, false);
});

// =============================================================================
// 8. UNMATCHED / RETRYABLE WEBHOOK EVENT CAUSES NON-2XX
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 8: unmatched/retryable webhook event causes non-2xx", async () => {
  const secret = "test_webhook_secret_08";
  const rawBody = JSON.stringify({
    entry: [{
      changes: [{
        value: {
          statuses: [{ id: "wamid_unmatched_02", status: "delivered", timestamp: "1790000002" }]
        }
      }]
    }]
  });
  const sig = await computeTestSignature(secret, rawBody);

  const mockDb = {
    rpc: async (fn) => {
      if (fn === "newsroom_ingest_whatsapp_webhook_event") {
        // Event arrived before dispatch message row committed: matched: false, retryable: true
        return { data: { ok: true, matched: false, retryable: true }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sig
    },
    body: rawBody
  });

  const res = await handleWhatsAppWebhookRequest(req, {
    whatsappAppSecret: secret,
    adminClient: mockDb,
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test_key"
  });

  assert.equal(res.status, 500, "Unmatched retryable webhook event must return non-2xx so Meta will retry");
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.match(data.error, /durably processed or matched/);
});

// =============================================================================
// 9. DUPLICATE ALREADY-PROCESSED WEBHOOK RETURNS 2XX
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 9: duplicate already-processed webhook may return 2xx", async () => {
  const secret = "test_webhook_secret_09";
  const rawBody = JSON.stringify({
    entry: [{
      changes: [{
        value: {
          statuses: [{ id: "wamid_dup_03", status: "delivered", timestamp: "1790000003" }]
        }
      }]
    }]
  });
  const sig = await computeTestSignature(secret, rawBody);

  const mockDb = {
    rpc: async (fn) => {
      if (fn === "newsroom_ingest_whatsapp_webhook_event") {
        // Replay of already applied event returns duplicate: true
        return { data: { ok: true, duplicate: true, matched: true, status: "delivered" }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sig
    },
    body: rawBody
  });

  const res = await handleWhatsAppWebhookRequest(req, {
    whatsappAppSecret: secret,
    adminClient: mockDb,
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test_key"
  });

  assert.equal(res.status, 200, "Duplicate already-processed webhook should return HTTP 200");
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.processed, 1);
});

// =============================================================================
// 10. BATCH WITH ONE FAILED/RETRYABLE EVENT IS NOT GLOBALLY ACKNOWLEDGED
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 10: batch with one failed/retryable event is not globally acknowledged", async () => {
  const secret = "test_webhook_secret_10";
  const rawBody = JSON.stringify({
    entry: [{
      changes: [{
        value: {
          statuses: [
            { id: "wamid_batch_ok", status: "delivered", timestamp: "1790000010" },
            { id: "wamid_batch_unmatched", status: "read", timestamp: "1790000011" }
          ]
        }
      }]
    }]
  });
  const sig = await computeTestSignature(secret, rawBody);

  const mockDb = {
    rpc: async (fn, args) => {
      if (fn === "newsroom_ingest_whatsapp_webhook_event") {
        if (args.p_provider_message_id === "wamid_batch_ok") {
          return { data: { ok: true, matched: true, status: "delivered" }, error: null };
        }
        // Second item is unmatched / retryable
        return { data: { ok: true, matched: false, retryable: true }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sig
    },
    body: rawBody
  });

  const res = await handleWhatsAppWebhookRequest(req, {
    whatsappAppSecret: secret,
    adminClient: mockDb,
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test_key"
  });

  assert.equal(res.status, 500, "Batch containing ANY non-durable/retryable item must NOT return 200");
  const data = await res.json();
  assert.equal(data.ok, false);
});

// =============================================================================
// 11. DETERMINISTIC WEBHOOK REPLAY ID WITHOUT TIMESTAMP
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 11: deterministic webhook replay ID without timestamp", async () => {
  const statusWithoutTimestamp = {
    id: "wamid_no_ts_999",
    status: "delivered",
    recipient_id: "263771234567"
  };

  const hash1 = await computeStablePayloadHash(statusWithoutTimestamp);
  const hash2 = await computeStablePayloadHash(statusWithoutTimestamp);

  assert.equal(hash1, hash2, "Payload hash must be 100% deterministic across calls");
  assert.equal(typeof hash1, "string");
  assert.equal(hash1.length, 16);

  // Check webhook source code does not contain Date.now() for event ID generation
  const webhookSrc = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/functions/newsroom-whatsapp-webhook/index.ts"),
    "utf8"
  );

  assert.ok(
    !webhookSrc.includes("Date.now()"),
    "Webhook index.ts must NOT use Date.now() for event ID construction"
  );
  assert.ok(
    webhookSrc.includes("computeStablePayloadHash"),
    "Webhook index.ts must use computeStablePayloadHash for deterministic replay IDs"
  );
});

// =============================================================================
// 12. UNRESOLVED STAFF IDENTITY PREVENTS FINAL DISPATCH RESULT COMMIT
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 12: unresolved Staff identity prevents final dispatch result commit", () => {
  const mig87 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018070000_ht_nr_close_r3_transport_serialization.sql"),
    "utf8"
  );

  assert.match(
    mig87,
    /if\s+v_staff_id\s+is\s+null\s+then[\s\S]*?raise\s+exception\s+using\s+errcode\s*=\s*'42501'[\s\S]*?message\s*=\s*'Canonical Staff profile required for WhatsApp dispatch record'/i,
    "Migration 87 must fail closed (42501) if dispatched_by cannot be resolved to a Staff profile"
  );
});

// =============================================================================
// 13. RESOLVED STAFF IDENTITY APPEARS IN AUDIT ACTOR
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 13: resolved Staff identity appears in audit actor", () => {
  const mig87 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018070000_ht_nr_close_r3_transport_serialization.sql"),
    "utf8"
  );

  assert.match(
    mig87,
    /insert\s+into\s+public\.audit_logs\s*\([\s\S]*?actor_staff_id[\s\S]*?values\s*\(\s*v_staff_id/i,
    "Migration 87 must record the resolved non-null v_staff_id into audit_logs.actor_staff_id"
  );
});

// =============================================================================
// 14. DIRECT RECIPIENT NORMALIZED PHONE CANNOT BYPASS COM-01 SUPPRESSION
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 14: direct-recipient normalized phone cannot bypass COM-01 WhatsApp suppression", () => {
  const mig87 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018070000_ht_nr_close_r3_transport_serialization.sql"),
    "utf8"
  );

  assert.ok(
    mig87.includes("select 1 from public.contact_profiles cp") &&
    mig87.includes("where cp.id = cs.contact_id") &&
    mig87.includes("norm.clean_digits"),
    "Migration 87 must exclude direct Newsroom recipients whose phone matches an active COM-01 contact suppression"
  );
  assert.ok(
    mig87.includes("communication_suppressions cs") &&
    mig87.includes("lower(cs.channel) = 'whatsapp'"),
    "Migration 87 must enforce active channel = whatsapp suppression"
  );
});

// =============================================================================
// 15. AI MISSING PROVIDER-MODEL AUTHORITY REMAINS UNCONFIGURED/UNKNOWN
// =============================================================================

test("HT-NR-CLOSE-R3 Requirement 15: AI missing provider-model authority remains unconfigured/unknown rather than invented", () => {
  // Client mapper test: empty server data yields empty model and unconfigured status
  const unconfigured = mapAiAssistOverview({});
  assert.equal(unconfigured.providerModel, "", "Missing server model must NOT default to gemini-3.8-flash");
  assert.equal(unconfigured.providerStatus, "provider_unconfigured");

  // Migration 87 RPC test: zero silent manufacturing of model string
  const mig87 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018070000_ht_nr_close_r3_transport_serialization.sql"),
    "utf8"
  );

  assert.ok(
    !mig87.includes("v_provider_model := 'gemini-3.8-flash'"),
    "Migration 87 must NOT fallback to hardcoded gemini-3.8-flash when platform_settings model is missing"
  );
  assert.match(
    mig87,
    /if\s+v_provider_model\s+is\s+null\s+then\s+v_provider_status\s*:=\s*'provider_unconfigured';/i,
    "Migration 87 must set provider_status to provider_unconfigured when platform setting model is absent"
  );
});
