import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

const settingsServiceModule = loadTs("src/services/newsroom-settings.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});
const { mapPlatformSettingsOverview } = settingsServiceModule;

const aiServiceModule = loadTs("src/services/newsroom-ai.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null }),
        functions: {
          invoke: () => Promise.resolve({ data: null, error: null })
        }
      })
    }
  }
});
const { createNewsroomAiService, mapAiAssistSession } = aiServiceModule;

import {
  handleWhatsAppDispatchRequest
} from "../../../supabase/functions/newsroom-whatsapp-dispatch/index.ts";
import {
  handleWhatsAppWebhookRequest,
  verifyMetaSignature
} from "../../../supabase/functions/newsroom-whatsapp-webhook/index.ts";
import {
  handleAiAssistRequest
} from "../../../supabase/functions/newsroom-ai-assist/index.ts";

test("HT-NR-CLOSE-R1: Repository migration count is at least 85", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 85, `Expected at least 85 migrations, found ${files.length}`);

  assert.ok(
    files.includes("20261018040000_ht_nr_r1_runtime_truth_audit_acl.sql"),
    "Migration 84 must exist"
  );
  assert.ok(
    files.includes("20261018050000_ht_nr_r1_whatsapp_provider_webhook.sql"),
    "Migration 85 must exist"
  );
});

// ============================================================================
// DEFECT A: PLATFORM SETTINGS RUNTIME TRUTH
// ============================================================================
test("HT-NR-CLOSE-R1 Defect A: Migration 84 seeds truthful settings and sets region ap-northeast-1", () => {
  const mig84Path = path.join(
    REPO_ROOT,
    "supabase/migrations/20261018040000_ht_nr_r1_runtime_truth_audit_acl.sql"
  );
  const sql = fs.readFileSync(mig84Path, "utf8");

  // Region must be ap-northeast-1, NOT af-south-1
  assert.ok(sql.includes("'region', 'ap-northeast-1'"), "Region must be ap-northeast-1");
  assert.ok(!sql.includes("'region', 'af-south-1'"), "Must not use af-south-1");

  // WhatsApp seed must be unconfigured before Owner activation
  assert.ok(sql.includes("'waba_id', null"), "WABA ID must be null");
  assert.ok(sql.includes("'phone_number_id', null"), "Phone number ID must be null");
  assert.ok(sql.includes("'webhook_configured', false"), "Webhook configured must be false");

  // Analytics projection from public.analytics_integrations
  assert.ok(
    sql.includes("from public.analytics_integrations"),
    "Must project from public.analytics_integrations"
  );
  assert.ok(
    sql.includes("coalesce(v_ga.external_measurement_id, 'G-S39LN2KX4X')"),
    "Must reference GA4 canonical measurement ID G-S39LN2KX4X"
  );
  assert.ok(
    sql.includes("'secret_configuration_state', 'unknown'"),
    "Must report secret_configuration_state unknown when secret is not verifiable"
  );
});

test("HT-NR-CLOSE-R1 Defect A: mapPlatformSettingsOverview accurately maps truthful integrations", () => {
  const rawData = {
    settings: [],
    integrations: {
      whatsapp: {
        name: "Meta WhatsApp Cloud API",
        provider: "meta_graph_api",
        status: "unconfigured_credentials_pending",
        phone_number_id: null,
        waba_id: null,
        webhook_configured: false,
        secret_configuration_state: "unknown",
        secret_configured: false
      },
      google_analytics: {
        name: "Google Analytics 4",
        provider: "google_ga4_data_api",
        status: "identity_verified_account_access_pending",
        property_id: "359235319",
        stream_id: "4756168788",
        measurement_id: "G-S39LN2KX4X",
        external_account_id: "137814020",
        secret_configuration_state: "unknown",
        secret_configured: false,
        data_api_configured: false
      },
      search_console: {
        name: "Google Search Console",
        provider: "google_search_console_api",
        status: "property_known_account_access_pending",
        site_url: "https://healthtimes.co.zw/",
        secret_configuration_state: "unknown",
        secret_configured: false,
        oauth_configured: false
      },
      supabase: {
        name: "Supabase Database & Edge Engine",
        provider: "supabase_postgres_v15",
        status: "healthy",
        project_ref: "bzuvntbkevvuhfhqhkua",
        region: "ap-northeast-1",
        active_migrations: 85
      }
    },
    audit_summary: {
      total_audit_events_24h: 0,
      last_audit_action: "none",
      last_audit_at: null
    }
  };

  const overview = mapPlatformSettingsOverview(rawData);
  assert.equal(overview.integrations.supabase.region, "ap-northeast-1");
  assert.equal(overview.integrations.whatsapp.secretConfigured, false);
  assert.equal(overview.integrations.google_analytics.measurement_id, "G-S39LN2KX4X");
  assert.equal(overview.integrations.google_analytics.secret_configuration_state, "unknown");
  assert.equal(overview.integrations.search_console.secret_configuration_state, "unknown");
});

// ============================================================================
// DEFECT B: CANONICAL AUDIT LOG SCHEMA COMPLIANCE
// ============================================================================
test("HT-NR-CLOSE-R1 Defect B: Migration 84 enforces canonical audit_logs schema", () => {
  const mig84Path = path.join(
    REPO_ROOT,
    "supabase/migrations/20261018040000_ht_nr_r1_runtime_truth_audit_acl.sql"
  );
  const sql = fs.readFileSync(mig84Path, "utf8");

  // Must NOT use legacy Wave E / Wave F columns
  assert.ok(
    !sql.includes("user_id,") && !sql.includes("entity_type,") && !sql.includes("details\n"),
    "Migration 84 must not insert into legacy audit_logs columns (user_id, entity_type, entity_id, details)"
  );

  // Must use canonical schema: actor_staff_id, action, target_table, target_id, metadata
  const canonicalAuditRegex =
    /insert into public\.audit_logs \(\s*actor_staff_id,\s*action,\s*target_table,\s*target_id,\s*metadata\s*\)/g;
  const matches = sql.match(canonicalAuditRegex);
  assert.ok(matches && matches.length >= 7, "Must replace audit inserts in all affected Wave E/F RPCs");

  // Must resolve actor using newsroom_current_staff_id_basic()
  assert.ok(
    sql.includes("public.newsroom_current_staff_id_basic()"),
    "Must resolve canonical staff actor via newsroom_current_staff_id_basic()"
  );
});

// ============================================================================
// DEFECT C: DIRECT PRIVILEGED TABLE MUTATION REVOCATION
// ============================================================================
test("HT-NR-CLOSE-R1 Defect C: Migration 84 explicitly revokes mutation privileges from anon and authenticated", () => {
  const mig84Path = path.join(
    REPO_ROOT,
    "supabase/migrations/20261018040000_ht_nr_r1_runtime_truth_audit_acl.sql"
  );
  const sql = fs.readFileSync(mig84Path, "utf8");

  const requiredTables = [
    "platform_settings",
    "citation_references",
    "newsroom_ai_assist_sessions",
    "subscribers",
    "premium_entitlements",
    "advertisers",
    "ad_campaigns",
    "ad_creatives",
    "ad_placements"
  ];

  for (const table of requiredTables) {
    assert.ok(sql.includes(`public.${table}`), `Migration 84 must revoke privileges on public.${table}`);
  }

  assert.ok(
    sql.includes("revoke insert, update, delete, truncate, references, trigger on table"),
    "Must revoke all direct mutation operations"
  );
  assert.ok(
    sql.includes("from anon, authenticated;"),
    "Must revoke from both anon and authenticated"
  );
});

// ============================================================================
// DEFECT D: WHATSAPP PROVIDER EXECUTION & WEBHOOK INTEGRITY
// ============================================================================
test("HT-NR-CLOSE-R1 Defect D: Migration 85 establishes private recipients, state machine, and webhook idempotency", () => {
  const mig85Path = path.join(
    REPO_ROOT,
    "supabase/migrations/20261018050000_ht_nr_r1_whatsapp_provider_webhook.sql"
  );
  const sql = fs.readFileSync(mig85Path, "utf8");

  // Private recipient table
  assert.ok(sql.includes("create table if not exists public.newsroom_whatsapp_recipients"), "Defines private recipients table");
  assert.ok(sql.includes("phone_hash text not null unique"), "Enforces deterministic phone_hash");
  assert.ok(sql.includes("revoke all on public.newsroom_whatsapp_recipients from public, anon, authenticated;"), "Private recipient storage restricted from client roles");

  // Webhook deduplication table
  assert.ok(sql.includes("create table if not exists public.newsroom_whatsapp_webhook_events"), "Defines webhook events deduplication table");
  assert.ok(sql.includes("event_id text not null unique"), "Unique event_id for replay protection");

  // Recipient resolver RPC
  assert.ok(sql.includes("newsroom_get_consented_whatsapp_recipients"), "Defines recipient resolver RPC");

  // Hardened dispatch result RPC
  assert.ok(sql.includes("Accounting invariant violation"), "Enforces accepted + rejected = recipient_count");
  assert.ok(sql.includes("p_status = 'sent' and p_accepted_count > 0"), "Broadcast sent only when accepted_count > 0");
  assert.ok(sql.includes("Invalid recipient identity hash"), "Rejects placeholder/unknown hashes");

  // Hardened webhook ingestion RPC
  assert.ok(sql.includes("newsroom_ingest_whatsapp_webhook_event"), "Defines webhook ingestion RPC");
  assert.ok(sql.includes("delivered_count cannot exceed accepted_count"), "Enforces delivered <= accepted invariant");
  assert.ok(sql.includes("read_count cannot exceed delivered_count"), "Enforces read <= delivered invariant");
});

test("HT-NR-CLOSE-R1 Defect D: newsroom-whatsapp-dispatch includes recipient in Meta request and handles unconfigured truth", async () => {
  // 1. Test unconfigured handling: broadcast remains 'approved'
  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-123" } }, error: null })
    },
    rpc: async (fn) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  let recordDispatchCalls = [];
  const mockAdminClient = {
    rpc: async (fn, args) => {
      if (fn === "newsroom_prepare_whatsapp_dispatch") {
        return {
          data: {
            dispatch_id: "disp-101",
            is_duplicate: false,
            broadcast: {
              id: args.p_broadcast_id,
              title: "Cholera Response Update",
              body: "Harare City Council deploys mobile clinics.",
              broadcast_type: "breaking_alert"
            }
          },
          error: null
        };
      }
      if (fn === "newsroom_record_whatsapp_dispatch_result") {
        recordDispatchCalls.push(args);
        return { data: { dispatch_id: args.p_dispatch_id }, error: null };
      }
      if (fn === "newsroom_get_consented_whatsapp_recipients") {
        return {
          data: [
            {
              recipient_id: "recip-1",
              phone: "263771234567",
              phone_hash: "a".repeat(64)
            }
          ],
          error: null
        };
      }
      return { data: null, error: null };
    }
  };

  // Dispatch without secrets: must stay 'approved' and report 'unconfigured'
  const unconfiguredReq = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ broadcast_id: "e04df772-5645-4299-813c-7a63583ee899" })
  });

  const unconfiguredResp = await handleWhatsAppDispatchRequest(unconfiguredReq, {
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test-key",
    userClient: mockUserClient,
    adminClient: mockAdminClient
  });

  assert.equal(unconfiguredResp.status, 200);
  const unconfData = await unconfiguredResp.json();
  assert.equal(unconfData.status, "approved", "Broadcast must remain approved when provider unconfigured");
  assert.equal(unconfData.transport_status, "unconfigured");
  assert.equal(recordDispatchCalls.length, 0, "Preflight unconfigured must not create dispatch attempt");

  // 2. Test configured send: verifies 'to' field in Meta payload
  let metaPayloads = [];
  const mockFetch = async (url, init) => {
    metaPayloads.push({ url, body: JSON.parse(init.body), headers: init.headers });
    return new Response(
      JSON.stringify({
        messaging_product: "whatsapp",
        messages: [{ id: "wamid.HBgL" }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const configuredReq = new Request("https://localhost/dispatch", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ broadcast_id: "e04df772-5645-4299-813c-7a63583ee899" })
  });

  const configuredResp = await handleWhatsAppDispatchRequest(configuredReq, {
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test-key",
    whatsappSystemAccessToken: "system-token-xyz",
    whatsappPhoneNumberId: "phone-id-456",
    whatsappGraphApiVersion: "v21.0",
    fetchImpl: mockFetch,
    userClient: mockUserClient,
    adminClient: mockAdminClient
  });

  assert.equal(configuredResp.status, 200);
  const confData = await configuredResp.json();
  assert.equal(confData.status, "sent", "Broadcast marked sent after provider acceptance");
  assert.equal(confData.accepted_count, 1);
  assert.equal(metaPayloads.length, 1);
  assert.equal(metaPayloads[0].body.to, "263771234567", "Meta API payload must include 'to' recipient");
  assert.ok(!JSON.stringify(confData).includes("263771234567"), "No raw recipient phone in client response");
});

test("HT-NR-CLOSE-R1 Defect D: newsroom-whatsapp-webhook verifies GET challenge and POST HMAC SHA-256", async () => {
  const verifyToken = "my_verify_secret_token_123";
  const appSecret = "meta_app_secret_test_xyz";

  // 1. GET Challenge verification
  const getReq = new Request(
    `https://localhost/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=test_challenge_12345`,
    { method: "GET" }
  );

  const getResp = await handleWhatsAppWebhookRequest(getReq, {
    whatsappWebhookVerifyToken: verifyToken,
    whatsappAppSecret: appSecret
  });

  assert.equal(getResp.status, 200);
  const challengeText = await getResp.text();
  assert.equal(challengeText, "test_challenge_12345");

  // Invalid token gets 403
  const badGetReq = new Request(
    `https://localhost/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge_12345`,
    { method: "GET" }
  );
  const badGetResp = await handleWhatsAppWebhookRequest(badGetReq, {
    whatsappWebhookVerifyToken: verifyToken
  });
  assert.equal(badGetResp.status, 403);

  // 2. POST HMAC Signature Verification
  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                {
                  id: "wamid.HBgL123",
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
  const rawBody = JSON.stringify(payload);

  // Compute valid HMAC
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const validSig = "sha256=" + Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Test verifyMetaSignature helper
  const sigMatches = await verifyMetaSignature(validSig, rawBody, appSecret);
  assert.equal(sigMatches, true, "Signature verification helper must return true for valid HMAC");

  let ingestCalls = [];
  const mockAdmin = {
    rpc: async (fn, args) => {
      if (fn === "newsroom_ingest_whatsapp_webhook_event") {
        ingestCalls.push(args);
        return { data: { ok: true, matched: true, status: args.p_status }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const postReq = new Request("https://localhost/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": validSig
    },
    body: rawBody
  });

  const postResp = await handleWhatsAppWebhookRequest(postReq, {
    supabaseUrl: "https://test.supabase.co",
    serviceRoleKey: "test-key",
    whatsappAppSecret: appSecret,
    adminClient: mockAdmin
  });

  assert.equal(postResp.status, 200);
  const postData = await postResp.json();
  assert.equal(postData.processed, 1);
  assert.equal(ingestCalls.length, 1);
  assert.equal(ingestCalls[0].p_status, "delivered");
  assert.equal(ingestCalls[0].p_provider_message_id, "wamid.HBgL123");
});

// ============================================================================
// DEFECT E: AI DESK REAL EDGE EXECUTION PATH
// ============================================================================
test("HT-NR-CLOSE-R1 Defect E: client invokes newsroom-ai-assist Edge Function instead of RPC", async () => {
  let invokedFunction = null;
  let invokedBody = null;

  const mockClient = {
    functions: {
      invoke: async (fnName, options) => {
        invokedFunction = fnName;
        invokedBody = options?.body;
        return {
          data: {
            ok: true,
            session_id: "sess-edge-456",
            task_type: options?.body?.task_type,
            provider: "gemini-2.5-flash",
            provider_status: "active",
            suggestions: [
              {
                type: "headline",
                text: "Real Edge Function Suggestion",
                rationale: "Factual"
              }
            ],
            safety_flags: {
              can_publish: false,
              human_review_required: true
            }
          },
          error: null
        };
      }
    }
  };

  const service = createNewsroomAiService(mockClient);
  const result = await service.runAssist({
    taskType: "headline_alternatives",
    inputPrompt: "Health funding in Zimbabwe"
  });

  assert.equal(invokedFunction, "newsroom-ai-assist", "Must invoke Edge Function newsroom-ai-assist");
  assert.equal(invokedBody.task_type, "headline_alternatives");
  assert.equal(result.id, "sess-edge-456");
  assert.equal(result.provider, "gemini-2.5-flash");
});

test("HT-NR-CLOSE-R1 Defect E: Edge Function newsroom-ai-assist reports truthful unconfigured status without heuristic fallback", async () => {
  const mockUserClient = {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-editor-1" } }, error: null })
    },
    rpc: async (fn) => {
      if (fn === "newsroom_has_capability") return { data: true, error: null };
      return { data: null, error: null };
    }
  };

  const req = new Request("https://localhost/ai-assist", {
    method: "POST",
    headers: {
      Authorization: "Bearer valid-editor-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      task_type: "headline_alternatives",
      input_prompt: "Hospital supplies"
    })
  });

  // Call with missing GEMINI_API_KEY
  const resp = await handleAiAssistRequest(req, {
    supabaseUrl: "https://test.supabase.co",
    anonKey: "anon-key",
    serviceRoleKey: "service-key",
    userClient: mockUserClient,
    geminiApiKey: "" // explicitly unconfigured
  });

  assert.equal(resp.status, 200);
  const data = await resp.json();
  assert.equal(data.ok, false, "Must report ok: false when provider unconfigured");
  assert.equal(data.provider_status, "provider_unconfigured");
  assert.equal(data.suggestions.length, 0, "Zero fake suggestions generated when unconfigured");
});
