import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  handleWhatsAppDispatchRequest,
  normalizeInternationalPhone
} from "../../../supabase/functions/newsroom-whatsapp-dispatch/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

// =============================================================================
// 1. MIGRATION 88 AUTHORITY & IMMUTABILITY
// =============================================================================

test("HT-NR-CLOSE-R4: Repository migration count is at least 88", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 88, `Expected at least 88 migrations at R4, found ${files.length}`);

  assert.ok(
    files.includes("20261018080000_ht_nr_close_r4_send_authority.sql"),
    "Migration 88 (ht_nr_close_r4_send_authority) must exist"
  );
});

test("HT-NR-CLOSE-R4: Migration 88 adds dispatched_staff_id and submitted active attempt uniqueness", () => {
  const mig88 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018080000_ht_nr_close_r4_send_authority.sql"),
    "utf8"
  );

  assert.match(
    mig88,
    /ALTER\s+TABLE\s+public\.newsroom_whatsapp_dispatches\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+dispatched_staff_id\s+uuid\s+REFERENCES\s+public\.staff_profiles\(id\)/i,
    "Migration 88 must add dispatched_staff_id column referencing staff_profiles(id)"
  );

  assert.match(
    mig88,
    /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+uq_newsroom_whatsapp_dispatches_submitted\s+ON\s+public\.newsroom_whatsapp_dispatches\s*\(broadcast_id\)\s+WHERE\s*\(transport_status\s*=\s*'submitted'\)/i,
    "Migration 88 must create structural unique partial index on submitted active attempts"
  );
});

// =============================================================================
// 2. REMOVAL OF TIME-BASED AUTOMATIC TAKEOVER (NO 2-MINUTE TAKEOVER)
// =============================================================================

test("HT-NR-CLOSE-R4: Migration 88 removes interval '2 minutes' automatic takeover", () => {
  const mig88 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018080000_ht_nr_close_r4_send_authority.sql"),
    "utf8"
  );

  assert.doesNotMatch(
    mig88,
    /interval\s+'2\s+minutes'/i,
    "Migration 88 must strictly remove time-based automatic takeover (interval '2 minutes')"
  );

  // Verify that newsroom_prepare_whatsapp_dispatch blocks ANY submitted attempt regardless of age
  assert.match(
    mig88,
    /select\s+\*\s+into\s+v_active_dispatch\s+from\s+public\.newsroom_whatsapp_dispatches\s+where\s+broadcast_id\s*=\s*p_broadcast_id\s+and\s+transport_status\s*=\s*'submitted'\s+limit\s+1;/i,
    "newsroom_prepare_whatsapp_dispatch must block active submitted dispatches without age restriction"
  );
});

// =============================================================================
// 3. REMOVAL OF INVALID CROSS-TABLE UUID COMPARISON & PRESERVE PHONE SUPPRESSION
// =============================================================================

test("HT-NR-CLOSE-R4: newsroom_get_consented_whatsapp_recipients removes cs.contact_id = r.id and preserves phone suppression", () => {
  const mig88 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018080000_ht_nr_close_r4_send_authority.sql"),
    "utf8"
  );

  // cs.contact_id = r.id was an invalid cross-table UUID comparison and must not appear
  assert.doesNotMatch(
    mig88,
    /cs\.contact_id\s*=\s*r\.id/i,
    "Invalid cross-table UUID comparison cs.contact_id = r.id must be removed"
  );

  // Normalized-phone suppression lookup via contact_profiles must be preserved
  assert.match(
    mig88,
    /regexp_replace\(trim\(cp\.phone\),.*=\s*norm\.clean_digits/i,
    "Cross-source phone suppression via contact_profiles phone match must be preserved"
  );
});

// =============================================================================
// 4. IMMUTABLE STAFF ACTOR CAPTURE AT PREPARATION & RECORDING
// =============================================================================

test("HT-NR-CLOSE-R4: newsroom_prepare_whatsapp_dispatch resolves active Staff profile and fails closed on 42501", () => {
  const mig88 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018080000_ht_nr_close_r4_send_authority.sql"),
    "utf8"
  );

  assert.match(
    mig88,
    /select\s+sp\.id\s+into\s+v_staff_id\s+from\s+public\.staff_profiles\s+sp\s+where\s+\(sp\.auth_user_id\s*=\s*p_actor_user_id\s+or\s+sp\.id\s*=\s*p_actor_user_id\)\s+and\s+lower\(sp\.status\)\s*=\s*'active'\s+and\s+sp\.revoked_at\s+is\s+null/i,
    "newsroom_prepare_whatsapp_dispatch must resolve actor to active, unrevoked staff profile before insert"
  );

  assert.match(
    mig88,
    /raise\s+exception\s+using\s+errcode\s*=\s*'42501',\s*message\s*=\s*'Dispatch actor must resolve to an active staff profile'/i,
    "Must raise 42501 if actor does not resolve to an active staff profile"
  );

  assert.match(
    mig88,
    /insert\s+into\s+public\.newsroom_whatsapp_dispatches\s*\([^\)]*dispatched_staff_id[^\)]*\)\s*values\s*\([^\)]*v_staff_id[^\)]*\)/i,
    "newsroom_prepare_whatsapp_dispatch must insert immutable dispatched_staff_id"
  );
});

test("HT-NR-CLOSE-R4: newsroom_record_whatsapp_dispatch_result uses captured dispatched_staff_id for audit", () => {
  const mig88 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018080000_ht_nr_close_r4_send_authority.sql"),
    "utf8"
  );

  assert.match(
    mig88,
    /v_staff_id\s*:=\s*v_dispatch\.dispatched_staff_id;/i,
    "newsroom_record_whatsapp_dispatch_result must read immutable captured dispatched_staff_id from dispatch record"
  );

  assert.match(
    mig88,
    /if\s+v_staff_id\s+is\s+null\s+then\s+raise\s+exception\s+using\s+errcode\s*=\s*'42501'/i,
    "newsroom_record_whatsapp_dispatch_result must fail closed (42501) if dispatched_staff_id is absent"
  );

  assert.match(
    mig88,
    /insert\s+into\s+public\.audit_logs\s*\([^\)]*actor_staff_id[^\)]*\)\s*values\s*\([^\)]*v_staff_id[^\)]*\)/i,
    "Audit log must record captured v_staff_id as actor_staff_id"
  );
});

// =============================================================================
// 5. EDGE FUNCTION: REPLAY READBACK WITH PERSISTED STATE & FAIL CLOSED
// =============================================================================

test("HT-NR-CLOSE-R4: same-key sent replay returns persisted state with zero provider calls", async () => {
  const broadcastId = "11111111-2222-4333-8444-555555555555";
  const idempotencyKey = "dispatch-key-replay-sent-exact";
  let providerCalls = 0;

  const persistedDispatch = {
    id: "disp-persisted-999",
    broadcast_id: broadcastId,
    transport_status: "provider-accepted",
    recipient_count: 5,
    accepted_count: 5,
    rejected_count: 0,
    delivered_count: 3,
    read_count: 2,
    failure_reason: null,
    idempotency_key: idempotencyKey,
    dispatched_at: "2026-10-18T01:23:45.678Z"
  };

  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-staff-001" } }, error: null })
    },
    rpc: async (name, args) => {
      if (name === "newsroom_has_capability") return { data: true, error: null };
      if (name === "newsroom_get_whatsapp_broadcast_dispatch") return { data: persistedDispatch, error: null };
      return { data: null, error: null };
    }
  };

  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, status: "sent", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (name, args) => {
      if (name === "newsroom_prepare_whatsapp_dispatch") {
        return {
          data: {
            is_duplicate: true,
            dispatch_id: persistedDispatch.id,
            status: persistedDispatch.transport_status,
            existing_dispatch: persistedDispatch
          },
          error: null
        };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://edge.example.com/newsroom-whatsapp-dispatch", {
    method: "POST",
    headers: {
      "Authorization": "Bearer test-jwt-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      broadcast_id: broadcastId,
      idempotency_key: idempotencyKey
    })
  });

  const res = await handleWhatsAppDispatchRequest(req, {
    userClient: mockUserClient,
    adminClient: mockAdminClient,
    whatsappSystemAccessToken: "mock-token",
    whatsappPhoneNumberId: "mock-phone-id",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: async () => {
      providerCalls++;
      return new Response(JSON.stringify({ ok: true }));
    }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.is_duplicate, true);
  assert.equal(data.dispatch_id, "disp-persisted-999");
  assert.equal(data.recipient_count, 5);
  assert.equal(data.accepted_count, 5);
  assert.equal(data.rejected_count, 0);
  assert.equal(data.delivered_count, 3);
  assert.equal(data.read_count, 2);
  assert.equal(data.dispatched_at, "2026-10-18T01:23:45.678Z");
  assert.equal(providerCalls, 0, "Same-key replay must execute zero provider calls");
});

test("HT-NR-CLOSE-R4: replay readback failure fails closed (HTTP 500) and never manufactures synthetic state", async () => {
  const broadcastId = "22222222-3333-4444-8555-666666666666";
  const idempotencyKey = "dispatch-key-replay-fail-closed";

  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-staff-001" } }, error: null })
    },
    rpc: async (name, args) => {
      if (name === "newsroom_has_capability") return { data: true, error: null };
      if (name === "newsroom_get_whatsapp_broadcast_dispatch") {
        // Authoritative readback error
        return { data: null, error: { message: "Database connection failed during readback" } };
      }
      return { data: null, error: null };
    }
  };

  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, status: "sent", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (name, args) => {
      if (name === "newsroom_prepare_whatsapp_dispatch") {
        return {
          data: {
            is_duplicate: true,
            dispatch_id: "disp-some-id",
            status: "submitted",
            existing_dispatch: null // forces userClient readback
          },
          error: null
        };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://edge.example.com/newsroom-whatsapp-dispatch", {
    method: "POST",
    headers: {
      "Authorization": "Bearer test-jwt-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      broadcast_id: broadcastId,
      idempotency_key: idempotencyKey
    })
  });

  const res = await handleWhatsAppDispatchRequest(req, {
    userClient: mockUserClient,
    adminClient: mockAdminClient,
    whatsappSystemAccessToken: "mock-token",
    whatsappPhoneNumberId: "mock-phone-id",
    whatsappGraphApiVersion: "v21.0"
  });

  assert.equal(res.status, 500, "Replay readback failure must fail closed with 500 error");
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.match(data.error, /Failed to retrieve authoritative persisted dispatch state/i);
});

test("HT-NR-CLOSE-R4: different-key on sent broadcast returns 409 conflict with zero provider calls", async () => {
  const broadcastId = "33333333-4444-4555-8666-777777777777";
  const idempotencyKey = "dispatch-key-new-conflict";
  let providerCalls = 0;

  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-staff-001" } }, error: null })
    },
    rpc: async (name, args) => {
      if (name === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, status: "sent", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (name, args) => {
      if (name === "newsroom_prepare_whatsapp_dispatch") {
        return {
          data: null,
          error: {
            code: "22023",
            message: "Broadcast has already been accepted by provider and cannot be re-dispatched"
          }
        };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://edge.example.com/newsroom-whatsapp-dispatch", {
    method: "POST",
    headers: {
      "Authorization": "Bearer test-jwt-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      broadcast_id: broadcastId,
      idempotency_key: idempotencyKey
    })
  });

  const res = await handleWhatsAppDispatchRequest(req, {
    userClient: mockUserClient,
    adminClient: mockAdminClient,
    whatsappSystemAccessToken: "mock-token",
    whatsappPhoneNumberId: "mock-phone-id",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: async () => {
      providerCalls++;
      return new Response(JSON.stringify({ ok: true }));
    }
  });

  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.match(data.error, /Conflict/i);
  assert.equal(providerCalls, 0, "Different-key replay must execute zero provider calls");
});

test("HT-NR-CLOSE-R4: unresolved Staff actor causes 403 Forbidden and blocks provider calls", async () => {
  const broadcastId = "44444444-5555-4666-8777-888888888888";
  let providerCalls = 0;

  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "unknown-user-id" } }, error: null })
    },
    rpc: async (name, args) => {
      if (name === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, status: "approved", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (name, args) => {
      if (name === "newsroom_get_consented_whatsapp_recipients") {
        return {
          data: [{ recipient_id: "recip-1", phone: "+263771234567", phone_hash: "hash_263771234567" }],
          error: null
        };
      }
      if (name === "newsroom_prepare_whatsapp_dispatch") {
        return {
          data: null,
          error: {
            code: "42501",
            message: "Dispatch actor must resolve to an active staff profile"
          }
        };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://edge.example.com/newsroom-whatsapp-dispatch", {
    method: "POST",
    headers: {
      "Authorization": "Bearer test-jwt-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      broadcast_id: broadcastId,
      idempotency_key: "dispatch-key-unresolved-actor"
    })
  });

  const res = await handleWhatsAppDispatchRequest(req, {
    userClient: mockUserClient,
    adminClient: mockAdminClient,
    whatsappSystemAccessToken: "mock-token",
    whatsappPhoneNumberId: "mock-phone-id",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: async () => {
      providerCalls++;
      return new Response(JSON.stringify({ ok: true }));
    }
  });

  assert.equal(res.status, 403, "Unresolved Staff actor must fail closed with 403 Forbidden");
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.match(data.error, /Forbidden: Dispatch actor must resolve to an active staff profile/i);
  assert.equal(providerCalls, 0, "No provider call when staff actor resolution fails");
});

test("HT-NR-CLOSE-R4: provider-rejected zero-accepted attempt remains retryable with fresh key", async () => {
  // If an attempt was provider-rejected (accepted_count = 0), a subsequent retry with fresh key
  // passes prepare checks and proceeds to execute provider
  const broadcastId = "55555555-6666-4777-8888-999999999999";
  let providerCalls = 0;

  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-staff-001" } }, error: null })
    },
    rpc: async (name, args) => {
      if (name === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: broadcastId, status: "approved", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (name, args) => {
      if (name === "newsroom_get_consented_whatsapp_recipients") {
        return {
          data: [{ recipient_id: "recip-1", phone: "+263771234567", phone_hash: "hash_263771234567" }],
          error: null
        };
      }
      if (name === "newsroom_prepare_whatsapp_dispatch") {
        // New attempt allowed because broadcast status is approved and zero accepted attempts exist
        return {
          data: {
            is_duplicate: false,
            dispatch_id: "disp-retry-attempt-02",
            status: "submitted",
            dispatched_staff_id: "staff-uuid-001"
          },
          error: null
        };
      }
      if (name === "newsroom_record_whatsapp_dispatch_result") {
        return { data: { dispatch_id: "disp-retry-attempt-02", transport_status: "provider-accepted" }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://edge.example.com/newsroom-whatsapp-dispatch", {
    method: "POST",
    headers: {
      "Authorization": "Bearer test-jwt-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      broadcast_id: broadcastId,
      idempotency_key: "dispatch-key-fresh-retry-after-failure"
    })
  });

  const res = await handleWhatsAppDispatchRequest(req, {
    userClient: mockUserClient,
    adminClient: mockAdminClient,
    whatsappSystemAccessToken: "mock-token",
    whatsappPhoneNumberId: "mock-phone-id",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: async () => {
      providerCalls++;
      return new Response(JSON.stringify({
        messaging_product: "whatsapp",
        messages: [{ id: "wamid.retry.success" }]
      }), { status: 200 });
    }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.status, "sent");
  assert.equal(data.transport_status, "provider-accepted");
  assert.equal(providerCalls, 1, "Fresh retry executes provider exactly once");
});
