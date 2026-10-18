import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  handleWhatsAppWebhookRequest,
  verifyMetaSignature,
  constantTimeEqual
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

// Helper to compute HMAC SHA-256 for tests
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
// 1. MIGRATION 86 AUTHORITY & REPOSITORY COUNT (EXACTLY 86)
// =============================================================================

test("HT-NR-CLOSE-R2: Repository migration count is exactly 86", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.equal(files.length, 86, `Expected exactly 86 migrations at R2, found ${files.length}`);

  assert.ok(
    files.includes("20261018060000_ht_nr_close_r2_provider_integrity.sql"),
    "Migration 86 (ht_nr_close_r2_provider_integrity) must exist"
  );
});

// =============================================================================
// 2. WEBHOOK FAIL-CLOSED AUTHENTICATION & SIGNATURE SECURITY
// =============================================================================

test("HT-NR-CLOSE-R2: webhook missing App Secret rejects with fail-closed server error", async () => {
  // Case A: Missing App Secret + no signature -> reject 500
  const reqNoSig = new Request("https://localhost/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry: [] })
  });

  const respNoSig = await handleWhatsAppWebhookRequest(reqNoSig, {
    whatsappAppSecret: "" // missing
  });
  assert.equal(respNoSig.status, 500);
  const dataNoSig = await respNoSig.json();
  assert.equal(dataNoSig.ok, false);
  assert.match(dataNoSig.error, /WHATSAPP_APP_SECRET is missing/);

  // Case B: Missing App Secret + fake signature -> reject 500 (DO NOT accept arbitrary header)
  const reqFakeSig = new Request("https://localhost/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": "sha256=fake_signature_attempt_123"
    },
    body: JSON.stringify({ entry: [] })
  });

  const respFakeSig = await handleWhatsAppWebhookRequest(reqFakeSig, {
    whatsappAppSecret: "" // missing
  });
  assert.equal(respFakeSig.status, 500);
  const dataFakeSig = await respFakeSig.json();
  assert.equal(dataFakeSig.ok, false);
  assert.match(dataFakeSig.error, /WHATSAPP_APP_SECRET is missing/);
});

test("HT-NR-CLOSE-R2: webhook invalid signature rejects with 401 and zero RPC calls", async () => {
  let rpcCalled = false;
  const mockAdminClient = {
    rpc: async () => {
      rpcCalled = true;
      return { data: null, error: null };
    }
  };

  const secret = "test_app_secret_correct_12345";
  const bodyText = JSON.stringify({ entry: [{ changes: [] }] });

  const req = new Request("https://localhost/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": "sha256=wrong_hash_aabbccdd"
    },
    body: bodyText
  });

  const resp = await handleWhatsAppWebhookRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test-key",
    whatsappAppSecret: secret,
    adminClient: mockAdminClient
  });

  assert.equal(resp.status, 401);
  const data = await resp.json();
  assert.equal(data.ok, false);
  assert.match(data.error, /Invalid X-Hub-Signature-256/);
  assert.equal(rpcCalled, false, "Zero database RPC calls allowed on signature mismatch");
});

test("HT-NR-CLOSE-R2: webhook valid signature succeeds and constantTimeEqual protects HMAC comparison", async () => {
  // Constant time comparison
  assert.equal(constantTimeEqual("abc", "abc"), true);
  assert.equal(constantTimeEqual("abc", "abd"), false);
  assert.equal(constantTimeEqual("abc", "abcd"), false);

  const secret = "test_app_secret_correct_12345";
  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                {
                  id: "wamid.VALID001",
                  status: "delivered",
                  timestamp: "1729240000"
                }
              ]
            }
          }
        ]
      }
    ]
  };
  const bodyText = JSON.stringify(payload);
  const validSig = await computeTestSignature(secret, bodyText);

  let ingestArgs = [];
  const mockAdminClient = {
    rpc: async (fn, args) => {
      if (fn === "newsroom_ingest_whatsapp_webhook_event") {
        ingestArgs.push(args);
        return { data: { ok: true, matched: true, status: "delivered" }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": validSig
    },
    body: bodyText
  });

  const resp = await handleWhatsAppWebhookRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test-key",
    whatsappAppSecret: secret,
    adminClient: mockAdminClient
  });

  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.ok, true);
  assert.equal(data.processed, 1);
  assert.equal(ingestArgs.length, 1);
  assert.equal(ingestArgs[0].p_provider_message_id, "wamid.VALID001");
  assert.equal(ingestArgs[0].p_status, "delivered");
});

// =============================================================================
// 3. WEBHOOK INGESTION STATE MACHINE & INVARIANTS (MIGRATION 86 SQL COVERAGE)
// =============================================================================

test("HT-NR-CLOSE-R2: Migration 86 defines safe webhook ordering, read-before-delivered rejection, and no regression", () => {
  const mig86 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018060000_ht_nr_close_r2_provider_integrity.sql"),
    "utf8"
  );

  // Unmatched event remains retryable (does not insert into replay table)
  assert.ok(mig86.includes("retryable"), "Must return retryable on unmatched event");
  assert.ok(mig86.includes("read_before_delivered_rejected"), "Must fail closed if read before delivered");
  assert.ok(mig86.includes("regressed"), "Must not regress delivered or read status on failed event");
  assert.ok(mig86.includes("unsupported_status"), "Must fail closed on unsupported webhook status");
});

// =============================================================================
// 4. COM-01 CONSENT MAPPING & SUPPRESSION (MIGRATION 86 SQL COVERAGE)
// =============================================================================

test("HT-NR-CLOSE-R2: Migration 86 enforces conservative COM-01 mapping, active suppression exclusion, and phone normalization", () => {
  const mig86 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018060000_ht_nr_close_r2_provider_integrity.sql"),
    "utf8"
  );

  // Conservative COM-01 mapping
  assert.ok(mig86.includes("BREAKING_NEWS"), "Must map breaking_alert to COM-01 BREAKING_NEWS");
  assert.ok(mig86.includes("NEWSLETTER"), "Must map daily_briefing to COM-01 NEWSLETTER");
  assert.ok(
    mig86.includes("v_com01_purpose := null;"),
    "Must NOT infer COM-01 purpose for story_update or health_alert"
  );

  // Active suppression
  assert.ok(
    mig86.includes("communication_suppressions"),
    "Must check communication_suppressions table"
  );
  assert.ok(
    mig86.includes("cs.active = true"),
    "Must fail closed on any active WhatsApp suppression"
  );

  // Phone normalization in SQL
  assert.ok(
    mig86.includes("^[1-9][0-9]{7,14}$"),
    "Must enforce international valid digits regex"
  );
  assert.ok(
    mig86.includes("not like '0%'"),
    "Must reject local ambiguous numbers starting with 0"
  );
});

// =============================================================================
// 5. PHONE NORMALIZATION HELPER & IDENTITY SAFETY
// =============================================================================

test("HT-NR-CLOSE-R2: normalizeInternationalPhone correctly normalizes valid international and excludes local/ambiguous phones", () => {
  // Valid international numbers
  assert.equal(normalizeInternationalPhone("+263771234567"), "263771234567");
  assert.equal(normalizeInternationalPhone("263 77 123 4567"), "263771234567");
  assert.equal(normalizeInternationalPhone("+1 (650) 555-1234"), "16505551234");
  assert.equal(normalizeInternationalPhone("263-77-1234567"), "263771234567");

  // Invalid: local ambiguous numbers starting with 0 (do NOT infer country code)
  assert.equal(normalizeInternationalPhone("0771234567"), null);
  assert.equal(normalizeInternationalPhone("+0771234567"), null);
  assert.equal(normalizeInternationalPhone("0712345678"), null);

  // Invalid: too short or malformed
  assert.equal(normalizeInternationalPhone("123"), null);
  assert.equal(normalizeInternationalPhone("abc"), null);
  assert.equal(normalizeInternationalPhone(""), null);
});

// =============================================================================
// 6. PRE-FLIGHT MUST NOT CONSUME DISPATCH AUTHORITY
// =============================================================================

test("HT-NR-CLOSE-R2: unconfigured provider creates zero dispatch attempt and zero irreversible records", async () => {
  let prepareCalled = false;
  let recordCalled = false;

  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-editor" } }, error: null })
    },
    rpc: async (fn) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: "b0000000-0000-4000-a000-000000000001", status: "approved", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (fn) => {
      if (fn === "newsroom_prepare_whatsapp_dispatch") prepareCalled = true;
      if (fn === "newsroom_record_whatsapp_dispatch_result") recordCalled = true;
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: {
      Authorization: "Bearer token-123",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ broadcast_id: "b0000000-0000-4000-a000-000000000001" })
  });

  // Call without WhatsApp tokens
  const resp = await handleWhatsAppDispatchRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test-key",
    userClient: mockUserClient,
    adminClient: mockAdminClient
    // tokens omitted -> unconfigured
  });

  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.status, "approved", "Broadcast remains approved");
  assert.equal(data.transport_status, "unconfigured");
  assert.equal(prepareCalled, false, "Pre-flight must NOT call prepare_whatsapp_dispatch");
  assert.equal(recordCalled, false, "Pre-flight must NOT call record_whatsapp_dispatch_result");
});

test("HT-NR-CLOSE-R2: zero recipients creates zero dispatch attempt and zero irreversible records", async () => {
  let prepareCalled = false;

  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-editor" } }, error: null })
    },
    rpc: async (fn) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: "b0000000-0000-4000-a000-000000000001", status: "approved", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (fn) => {
      if (fn === "newsroom_get_consented_whatsapp_recipients") {
        // Zero recipients returned
        return { data: [], error: null };
      }
      if (fn === "newsroom_prepare_whatsapp_dispatch") {
        prepareCalled = true;
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: {
      Authorization: "Bearer token-123",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ broadcast_id: "b0000000-0000-4000-a000-000000000001" })
  });

  const resp = await handleWhatsAppDispatchRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test-key",
    whatsappSystemAccessToken: "token-xyz",
    whatsappPhoneNumberId: "phone-123",
    whatsappGraphApiVersion: "v21.0",
    userClient: mockUserClient,
    adminClient: mockAdminClient
  });

  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.status, "approved");
  assert.equal(data.transport_status, "unconfigured");
  assert.equal(data.recipient_count, 0);
  assert.equal(prepareCalled, false, "Must NOT create dispatch attempt when zero recipients exist");
});

// =============================================================================
// 7. PROVIDER ACCEPTANCE REQUIRES MESSAGE IDENTITY & SANITIZED ENVELOPE
// =============================================================================

test("HT-NR-CLOSE-R2: HTTP 2xx without message ID is rejected and does not increment accepted_count", async () => {
  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-editor" } }, error: null })
    },
    rpc: async (fn) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  let recordedResult = null;
  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: "b0000000-0000-4000-a000-000000000001", status: "approved", broadcast_type: "breaking_alert" },
            error: null
          })
        })
      })
    }),
    rpc: async (fn, args) => {
      if (fn === "newsroom_get_consented_whatsapp_recipients") {
        return {
          data: [{ recipient_id: "r1", phone: "263771234567", phone_hash: "hash_263771234567" }],
          error: null
        };
      }
      if (fn === "newsroom_prepare_whatsapp_dispatch") {
        return { data: { dispatch_id: "disp-malformed", is_duplicate: false }, error: null };
      }
      if (fn === "newsroom_record_whatsapp_dispatch_result") {
        recordedResult = args;
        return { data: { dispatch_id: args.p_dispatch_id }, error: null };
      }
      return { data: null, error: null };
    }
  };

  // Mock Meta returning 200 OK but EMPTY messages array (malformed response)
  const mockFetch = async () => {
    return new Response(JSON.stringify({ messaging_product: "whatsapp", messages: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const req = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: {
      Authorization: "Bearer token-123",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ broadcast_id: "b0000000-0000-4000-a000-000000000001" })
  });

  const resp = await handleWhatsAppDispatchRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test-key",
    whatsappSystemAccessToken: "token-xyz",
    whatsappPhoneNumberId: "phone-123",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: mockFetch,
    userClient: mockUserClient,
    adminClient: mockAdminClient
  });

  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.status, "approved", "Broadcast remains approved on malformed provider response");
  assert.equal(data.transport_status, "provider-rejected");
  assert.equal(data.accepted_count, 0, "Accepted count must NOT increment without message ID");
  assert.equal(data.rejected_count, 1);

  assert.ok(recordedResult);
  assert.equal(recordedResult.p_accepted_count, 0);
  assert.equal(recordedResult.p_rejected_count, 1);
  assert.equal(recordedResult.p_status, "approved");

  // Sanitized envelope verification (zero raw phone, zero wa_id, zero tokens)
  const envelopeStr = JSON.stringify(recordedResult.p_provider_response_envelope);
  assert.ok(!envelopeStr.includes("263771234567"), "No raw recipient phone in stored envelope");
  assert.ok(!envelopeStr.includes("token-xyz"), "No auth token in stored envelope");
});

// =============================================================================
// 8. RETRY STATE MACHINE & CONCURRENCY CONTROLS (MIGRATION 86)
// =============================================================================

test("HT-NR-CLOSE-R2: Migration 86 defines retryable total rejection, concurrent locking, and blocks resend of accepted broadcast", () => {
  const mig86 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018060000_ht_nr_close_r2_provider_integrity.sql"),
    "utf8"
  );

  // Checks accepted_count > 0 prevents second attempt
  assert.ok(
    mig86.includes("uq_newsroom_whatsapp_dispatches_accepted"),
    "Must create partial unique index on accepted dispatches"
  );
  assert.ok(
    mig86.includes("Broadcast has already been accepted by provider and cannot be re-dispatched"),
    "Must block re-dispatch if accepted attempt exists"
  );

  // Concurrency lock check
  assert.ok(
    mig86.includes("A dispatch attempt is currently in progress for this broadcast"),
    "Must prevent concurrent in-flight attempts for the same broadcast"
  );

  // Staff profile actor resolution
  assert.ok(
    mig86.includes("v_dispatch.dispatched_by"),
    "Must resolve canonical Staff profile from dispatched_by"
  );
  assert.ok(
    mig86.includes("actor_staff_id"),
    "Must record resolved Staff ID into audit_logs"
  );
});

// =============================================================================
// 9. ACL HARDENING: REVOKE DIRECT DISPATCH SELECT
// =============================================================================

test("HT-NR-CLOSE-R2: Migration 86 revokes all direct mutation and select privileges on dispatches from authenticated and anon", () => {
  const mig86 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018060000_ht_nr_close_r2_provider_integrity.sql"),
    "utf8"
  );

  assert.ok(
    mig86.includes("REVOKE ALL ON public.newsroom_whatsapp_dispatches FROM anon, authenticated;"),
    "Must revoke all privileges on newsroom_whatsapp_dispatches from anon and authenticated"
  );
  assert.ok(
    mig86.includes("REVOKE ALL ON public.newsroom_whatsapp_dispatch_messages FROM anon, authenticated;"),
    "Must revoke all privileges on newsroom_whatsapp_dispatch_messages from anon and authenticated"
  );
});

// =============================================================================
// 10. AI PROVIDER: AUTH HEADER, MODEL REQUIREMENT, MALFORMED REJECTION, PERSISTENCE FAIL-CLOSED
// =============================================================================

test("HT-NR-CLOSE-R2: AI assist uses x-goog-api-key header and rejects API key in URL query string", async () => {
  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-ai-1" } }, error: null })
    },
    rpc: async (fn) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  let capturedUrl = "";
  let capturedHeaders = {};

  const mockFetch = async (url, init) => {
    capturedUrl = url;
    capturedHeaders = init.headers;
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { type: "headline", text: "New Clinic Opens", rationale: "Clear and factual" }
                  ])
                }
              ]
            }
          }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const mockAdminClient = {
    rpc: async (fn) => {
      if (fn === "newsroom_record_ai_assist_session") {
        return { data: { session_id: "sess-valid-001" }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/ai", {
    method: "POST",
    headers: {
      Authorization: "Bearer editor-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ task_type: "headline_alternatives", input_prompt: "Harare clinic" })
  });

  const resp = await handleAiAssistRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    anonKey: "anon-key",
    serviceRoleKey: "service-key",
    geminiApiKey: "secret_gemini_key_12345",
    geminiModel: "gemini-3.8-flash",
    fetchImpl: mockFetch,
    userClient: mockUserClient,
    adminClient: mockAdminClient
  });

  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.ok, true);
  assert.equal(data.provider, "gemini-3.8-flash");

  // Authentication header verification: x-goog-api-key MUST be used
  assert.equal(capturedHeaders["x-goog-api-key"], "secret_gemini_key_12345");
  // Security verification: NO key in URL query parameter
  assert.ok(!capturedUrl.includes("key="), "Gemini API key must NOT be present in URL query string");
});

test("HT-NR-CLOSE-R2: AI assist rejects malformed Gemini responses and does not persist sessions", async () => {
  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-ai-1" } }, error: null })
    },
    rpc: async (fn) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  let sessionRecorded = false;
  const mockAdminClient = {
    rpc: async (fn) => {
      if (fn === "newsroom_record_ai_assist_session") {
        sessionRecorded = true;
        return { data: { session_id: "sess-should-not-exist" }, error: null };
      }
      return { data: null, error: null };
    }
  };

  // Malformed: returns valid JSON but empty suggestions array
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: "[]" }] } }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const req = new Request("https://localhost/ai", {
    method: "POST",
    headers: {
      Authorization: "Bearer editor-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ task_type: "headline_alternatives", input_prompt: "Harare clinic" })
  });

  const resp = await handleAiAssistRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    anonKey: "anon-key",
    serviceRoleKey: "service-key",
    geminiApiKey: "secret_gemini_key_12345",
    geminiModel: "gemini-3.8-flash",
    fetchImpl: mockFetch,
    userClient: mockUserClient,
    adminClient: mockAdminClient
  });

  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.ok, false);
  assert.equal(data.provider_status, "provider_failed");
  assert.equal(sessionRecorded, false, "Must NOT record session when provider response is malformed");
});

test("HT-NR-CLOSE-R2: AI assist session persistence error fails closed without fake session ID", async () => {
  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-ai-1" } }, error: null })
    },
    rpc: async (fn) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  const mockAdminClient = {
    rpc: async (fn) => {
      if (fn === "newsroom_record_ai_assist_session") {
        // Return persistence error from RPC
        return {
          data: null,
          error: { message: "Canonical Staff profile required for AI assist session persistence" }
        };
      }
      return { data: null, error: null };
    }
  };

  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { type: "headline", text: "Polio Campaign Launched", rationale: "Factual" }
                  ])
                }
              ]
            }
          }
        ]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const req = new Request("https://localhost/ai", {
    method: "POST",
    headers: {
      Authorization: "Bearer editor-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ task_type: "headline_alternatives", input_prompt: "Polio campaign" })
  });

  const resp = await handleAiAssistRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    anonKey: "anon-key",
    serviceRoleKey: "service-key",
    geminiApiKey: "secret_gemini_key_12345",
    geminiModel: "gemini-3.8-flash",
    fetchImpl: mockFetch,
    userClient: mockUserClient,
    adminClient: mockAdminClient
  });

  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.ok, false, "Must NOT claim ok: true when session persistence fails");
  assert.equal(data.provider_status, "persistence_failed");
  assert.equal(data.session_id, undefined, "Must NOT manufacture a random session ID on persistence error");
  assert.match(data.error, /Canonical Staff profile required/);
});

// =============================================================================
// 11. AI OVERVIEW TRUTH: ZERO HEURISTIC OR GEMINI 1.5 MENTIONS
// =============================================================================

test("HT-NR-CLOSE-R2: AI Overview mapper and Migration 86 contains zero reference to Editorial Heuristics or Gemini 1.5", () => {
  const overview = mapAiAssistOverview({});
  assert.ok(
    !overview.providerModel.includes("Editorial Heuristics"),
    "Client mapper must not default to Editorial Heuristics"
  );
  assert.ok(
    !overview.providerModel.includes("Gemini 1.5"),
    "Client mapper must not default to Gemini 1.5"
  );
  assert.equal(overview.providerModel, "gemini-3.8-flash");

  const mig86 = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/migrations/20261018060000_ht_nr_close_r2_provider_integrity.sql"),
    "utf8"
  );
  assert.ok(
    !mig86.includes("Editorial Heuristics"),
    "Migration 86 must contain zero mention of Editorial Heuristics"
  );
  assert.ok(
    !mig86.includes("Gemini 1.5"),
    "Migration 86 must contain zero mention of Gemini 1.5"
  );
  assert.ok(
    mig86.includes("gemini-3.8-flash"),
    "Migration 86 must set model to gemini-3.8-flash"
  );
});
