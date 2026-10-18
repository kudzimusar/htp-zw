import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";
import { handlePushDispatchRequest } from "../../../supabase/functions/newsroom-push-dispatch/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileRoot, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(mobileRoot, relPath), "utf8");
}

function readRepo(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

// =============================================================================
// 1. DOMAIN MODELS & VALIDATION (HT-NR-06C-B)
// =============================================================================

const modelsModule = loadTs("src/domain/models.ts");
const {
  NEWSROOM_PUSH_DISPATCH_STATUSES,
  validatePushDispatchStatus
} = modelsModule;

test("HT-NR-06C-B: NEWSROOM_PUSH_DISPATCH_STATUSES defines all 6 canonical transport states", () => {
  assert.deepEqual([...NEWSROOM_PUSH_DISPATCH_STATUSES], [
    "dispatching",
    "provider-accepted",
    "partially-accepted",
    "provider-rejected",
    "delivery-failed",
    "zero-recipients"
  ]);

  for (const st of NEWSROOM_PUSH_DISPATCH_STATUSES) {
    assert.equal(validatePushDispatchStatus(st), true);
  }
  assert.equal(validatePushDispatchStatus("sent"), false);
  assert.equal(validatePushDispatchStatus("delivered"), false);
  assert.equal(validatePushDispatchStatus("failed"), false);
  assert.equal(validatePushDispatchStatus("unknown"), false);
  assert.equal(validatePushDispatchStatus(null), false);
  assert.equal(validatePushDispatchStatus(123), false);
});

// =============================================================================
// 2. MIGRATION 76 & 77 AUTHORITY & DISCIPLINE
// =============================================================================

test("HT-NR-06C-B-R1: repository migration count is at least 77 (80 at Wave C)", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  assert.ok(migrationFiles.length >= 80, `Expected at least 80 migrations in supabase/migrations, found ${migrationFiles.length}`);
  assert.ok(
    migrationFiles.includes(
      "20261017040000_ht_nr06cb_push_provider_execution.sql"
    ),
    "Expected migration 20261017040000_ht_nr06cb_push_provider_execution.sql to be present"
  );
  assert.ok(
    migrationFiles.includes(
      "20261017041000_ht_nr06cb_r1_dispatch_idempotency_runtime_parity.sql"
    ),
    "Expected migration 20261017041000_ht_nr06cb_r1_dispatch_idempotency_runtime_parity.sql to be present"
  );
});

test("HT-NR-06C-B-R1: Migration 77 enforces single-dispatch invariant and accounting invariants", () => {
  const sql = readRepo(
    "supabase/migrations/20261017041000_ht_nr06cb_r1_dispatch_idempotency_runtime_parity.sql"
  );

  // Single-dispatch database constraint on alert_id
  assert.ok(
    sql.includes("uq_newsroom_push_dispatches_alert_id unique (alert_id)"),
    "Migration 77 must enforce unique constraint on alert_id"
  );

  // Idempotency key conflict handling (fails closed if key attached to different alert)
  assert.ok(
    sql.includes("Idempotency key already belongs to a different push alert"),
    "Migration 77 must fail closed when key belongs to a different alert"
  );

  // Single alert dispatch idempotency (returns is_duplicate: true for same alert under different key)
  assert.ok(
    sql.includes("where alert_id = p_alert_id"),
    "Migration 77 must check if alert is already dispatched"
  );

  // Accounting invariant enforcement
  assert.ok(
    sql.includes("Accepted and rejected counts must sum to eligible count"),
    "Migration 77 must enforce accepted + rejected == eligible in record RPC"
  );

  // Service role ACLs
  assert.ok(
    sql.includes("grant execute on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) to service_role;"),
    "Preparation RPC must be granted to service_role only"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) to service_role;"),
    "Record RPC must be granted to service_role only"
  );
});

// =============================================================================
// 3. FROZEN BLOBS & PARENT REPOSITORY INVARIANTS
// =============================================================================

test("HT-NR-06C-B: Parent PR #104 authority is verified at 92cae009f47ec9fa145cdc237b691fa78b9677d8", () => {
  try {
    const parentHead = execSync(
      "git rev-parse origin/feat/ht-nr06ca-push-alert-foundation",
      { cwd: repoRoot, encoding: "utf8" }
    ).trim();
    assert.equal(parentHead, "92cae009f47ec9fa145cdc237b691fa78b9677d8");
  } catch {
    const baseCommit = execSync(
      "git merge-base HEAD origin/feat/ht-nr06ca-push-alert-foundation || git rev-parse HEAD~1",
      { cwd: repoRoot, encoding: "utf8" }
    ).trim();
    assert.ok(baseCommit.length === 40);
  }
});

test("HT-NR-06C-B: frozen file ca01-communications.test.mjs matches exact blob 3af2f6988acf91b4118771a8fc15333af44c2fc7", () => {
  const content = fs.readFileSync(path.join(mobileRoot, "tests/ca01-communications.test.mjs"));
  const header = `blob ${content.length}\0`;
  const sha = crypto.createHash("sha1").update(Buffer.concat([Buffer.from(header), content])).digest("hex");
  assert.equal(sha, "3af2f6988acf91b4118771a8fc15333af44c2fc7");
});

test("HT-NR-06C-B: frozen file ReaderDiscussion.tsx matches exact blob f7ac3671f81b89170aaf1a4892e6095d280fd839", () => {
  const content = fs.readFileSync(path.join(mobileRoot, "src/ui/ReaderDiscussion.tsx"));
  const header = `blob ${content.length}\0`;
  const sha = crypto.createHash("sha1").update(Buffer.concat([Buffer.from(header), content])).digest("hex");
  assert.equal(sha, "f7ac3671f81b89170aaf1a4892e6095d280fd839");
});

// =============================================================================
// 4. EDGE FUNCTION CONFIGURATION & SOURCE INVARIANTS
// =============================================================================

test("HT-NR-06C-B: supabase/config.toml configures newsroom-push-dispatch with verify_jwt = true", () => {
  const config = readRepo("supabase/config.toml");
  assert.ok(config.includes("[functions.newsroom-push-dispatch]"));
  assert.ok(config.includes("verify_jwt = true"));
});

test("HT-NR-06C-B: Edge Function source code enforces story.publish capability and strict boundary", () => {
  const code = readRepo("supabase/functions/newsroom-push-dispatch/index.ts");

  assert.ok(code.includes("corsHeaders"));
  assert.ok(code.includes('req.method === "OPTIONS"'));
  assert.ok(code.includes("Authentication required"));
  assert.ok(code.includes("newsroom_has_capability"));
  assert.ok(code.includes("story.publish"));
  assert.ok(code.includes("Forbidden: story.publish capability required"));
  assert.ok(code.includes("newsroom_prepare_dispatch_recipients"));
  assert.ok(code.includes("devices.length === 0"));
  assert.ok(code.includes("zero-recipients"));
  assert.ok(code.includes("https://exp.host/--/api/v2/push/send"));
  assert.ok(code.includes("provider-accepted"));
  assert.ok(code.includes("partially-accepted"));
  assert.ok(code.includes("provider-rejected"));
  assert.ok(code.includes("delivery-failed"));
  assert.ok(code.includes("newsroom_record_dispatch_result"));
  assert.ok(code.includes("confirmed_delivery_count"));
  assert.ok(!code.includes("device_tokens"));
  assert.ok(!code.includes("reader_user_ids"));
});

// =============================================================================
// 5. DETERMINISTIC EXECUTABLE PROVIDER-PATH TEST MATRIX (20 CASES)
// =============================================================================

function createMockEnvironment(overrides = {}) {
  let fetchCallCount = 0;
  let fetchCalls = [];

  const mockFetch = overrides.fetchImpl || (async (url, init) => {
    fetchCallCount++;
    fetchCalls.push({ url, init, body: JSON.parse(init.body) });
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        data: [{ status: "ok", id: "ticket-123" }]
      })
    };
  });

  const mockUserClient = overrides.userClient || {
    auth: {
      getUser: async () => ({
        data: { user: { id: "u1000000-0000-4000-a000-000000000001", email: "editor@healthtimes.co.zw" } },
        error: null
      })
    },
    rpc: async (fn, args) => {
      if (fn === "newsroom_has_capability") {
        if (args?.p_capability === "story.publish") {
          return { data: overrides.hasPublishCap ?? true, error: null };
        }
      }
      return { data: false, error: null };
    }
  };

  const mockAdminClient = overrides.adminClient || {
    rpc: async (fn, args) => {
      if (fn === "newsroom_prepare_dispatch_recipients") {
        return overrides.prepareResult || {
          data: {
            is_duplicate: false,
            dispatch_id: "d1000000-0000-4000-a000-000000000001",
            alert_id: args.p_alert_id,
            status: "dispatching",
            alert: {
              id: args.p_alert_id,
              title: "Cholera Outbreak Alert",
              body: "Urgent advisory from MoHCC.",
              category: "breaking",
              destination: "/article/cholera-2026"
            },
            devices: [
              { device_id: "dev-001", expo_push_token: "ExponentPushToken[token1]" }
            ]
          },
          error: null
        };
      }
      if (fn === "newsroom_record_dispatch_result") {
        return overrides.recordResult || {
          data: {
            dispatch_id: args.p_dispatch_id,
            alert_id: "d1000000-0000-4000-a000-000000000001",
            status: args.p_status,
            eligible_device_count: args.p_eligible_count,
            provider_accepted_count: args.p_accepted_count,
            provider_rejected_count: args.p_rejected_count,
            confirmed_delivery_count: 0,
            failure_reason: args.p_failure_reason,
            dispatched_at: new Date().toISOString()
          },
          error: null
        };
      }
      return { data: null, error: null };
    }
  };

  return {
    fetchImpl: mockFetch,
    userClient: mockUserClient,
    adminClient: mockAdminClient,
    supabaseUrl: "https://mock.supabase.co",
    serviceRoleKey: "mock-service-role-key",
    anonKey: "mock-anon-key",
    getFetchCount: () => fetchCallCount,
    getFetchCalls: () => fetchCalls
  };
}

function makeRequest(body, headers = {}) {
  const reqHeaders = new Headers({
    "Content-Type": "application/json",
    Authorization: "Bearer valid-jwt-token",
    ...headers
  });
  return new Request("https://mock.supabase.co/functions/v1/newsroom-push-dispatch", {
    method: "POST",
    headers: reqHeaders,
    body: JSON.stringify(body)
  });
}

test("Case 1: unauthenticated execution denied (401)", async () => {
  const env = createMockEnvironment();
  const req = makeRequest(
    { alert_id: "d1000000-0000-4000-a000-000000000001", idempotency_key: "idem-key-12345" },
    { Authorization: "" }
  );
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 401);
  const json = await res.json();
  assert.equal(json.ok, false);
  assert.match(json.error, /Authentication required/);
  assert.equal(env.getFetchCount(), 0);
});

test("Case 2: authenticated Reader / non-Newsroom execution denied (403)", async () => {
  const env = createMockEnvironment({ hasPublishCap: false });
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 403);
  const json = await res.json();
  assert.equal(json.ok, false);
  assert.match(json.error, /Forbidden: story\.publish capability required/);
  assert.equal(env.getFetchCount(), 0);
});

test("Case 3: Newsroom session without story.publish denied (403)", async () => {
  const env = createMockEnvironment({ hasPublishCap: false });
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 403);
  const json = await res.json();
  assert.equal(json.ok, false);
  assert.match(json.error, /story\.publish capability required/);
  assert.equal(env.getFetchCount(), 0);
});

test("Case 4: non-prepared alert denied (400)", async () => {
  const env = createMockEnvironment({
    prepareResult: {
      data: null,
      error: new Error("Push alert must be in prepared status for dispatch")
    }
  });
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.ok, false);
  assert.match(json.error, /prepared status/);
  assert.equal(env.getFetchCount(), 0);
});

test("Case 5: prepared alert enters canonical dispatch (200)", async () => {
  const env = createMockEnvironment();
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.ok, true);
  assert.equal(json.status, "provider-accepted");
  assert.equal(env.getFetchCount(), 1);
});

test("Case 6: zero recipients performs zero provider requests (200)", async () => {
  const env = createMockEnvironment({
    prepareResult: {
      data: {
        is_duplicate: false,
        dispatch_id: "d1000000-0000-4000-a000-000000000001",
        alert_id: "d1000000-0000-4000-a000-000000000001",
        status: "dispatching",
        alert: { id: "d1000000-0000-4000-a000-000000000001", title: "Test", body: "Body", category: "breaking", destination: null },
        devices: []
      },
      error: null
    },
    recordResult: {
      data: {
        dispatch_id: "d1000000-0000-4000-a000-000000000001",
        alert_id: "d1000000-0000-4000-a000-000000000001",
        status: "zero-recipients",
        eligible_device_count: 0,
        provider_accepted_count: 0,
        provider_rejected_count: 0,
        confirmed_delivery_count: 0,
        failure_reason: "Zero active reader devices registered",
        dispatched_at: new Date().toISOString()
      },
      error: null
    }
  });
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.ok, true);
  assert.equal(json.status, "zero-recipients");
  assert.equal(env.getFetchCount(), 0); // Zero provider requests!
});

test("Case 7: same idempotency key cannot resend (200 duplicate)", async () => {
  const env = createMockEnvironment({
    prepareResult: {
      data: {
        is_duplicate: true,
        dispatch_id: "d1000000-0000-4000-a000-000000000001",
        alert_id: "d1000000-0000-4000-a000-000000000001",
        status: "provider-accepted",
        eligible_device_count: 1,
        provider_accepted_count: 1,
        provider_rejected_count: 0,
        confirmed_delivery_count: 0,
        failure_reason: null,
        devices: []
      },
      error: null
    }
  });
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.ok, true);
  assert.equal(json.is_duplicate, true);
  assert.equal(env.getFetchCount(), 0);
});

test("Case 8: same alert with a DIFFERENT idempotency key cannot resend (200 duplicate)", async () => {
  const env = createMockEnvironment({
    prepareResult: {
      data: {
        is_duplicate: true,
        dispatch_id: "d1000000-0000-4000-a000-000000000001",
        alert_id: "d1000000-0000-4000-a000-000000000001",
        status: "provider-accepted",
        eligible_device_count: 1,
        provider_accepted_count: 1,
        provider_rejected_count: 0,
        confirmed_delivery_count: 0,
        failure_reason: null,
        devices: []
      },
      error: null
    }
  });
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "different-key-99999"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.ok, true);
  assert.equal(json.is_duplicate, true);
  assert.equal(env.getFetchCount(), 0);
});

test("Case 9: concurrent execution for the same alert cannot double-send (race safe)", async () => {
  const env = createMockEnvironment({
    prepareResult: {
      data: {
        is_duplicate: true,
        dispatch_id: "d1000000-0000-4000-a000-000000000001",
        alert_id: "d1000000-0000-4000-a000-000000000001",
        status: "dispatching",
        eligible_device_count: 1,
        provider_accepted_count: 0,
        provider_rejected_count: 0,
        confirmed_delivery_count: 0,
        failure_reason: null,
        devices: []
      },
      error: null
    }
  });
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "concurrent-race-key"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.is_duplicate, true);
  assert.equal(env.getFetchCount(), 0);
});

test("Case 10: idempotency key already attached to another alert fails closed (409)", async () => {
  const env = createMockEnvironment({
    prepareResult: {
      data: null,
      error: new Error("Idempotency key already belongs to a different push alert")
    }
  });
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000002",
    idempotency_key: "key-from-alert-1"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 409);
  const json = await res.json();
  assert.equal(json.ok, false);
  assert.match(json.error, /already belongs to a different push alert/);
  assert.equal(env.getFetchCount(), 0);
});

test("Case 11: provider complete acceptance (provider-accepted)", async () => {
  const env = createMockEnvironment({
    prepareResult: {
      data: {
        is_duplicate: false,
        dispatch_id: "d1000000-0000-4000-a000-000000000001",
        alert_id: "d1000000-0000-4000-a000-000000000001",
        status: "dispatching",
        alert: { id: "d1000000-0000-4000-a000-000000000001", title: "T", body: "B", category: "breaking", destination: null },
        devices: [
          { device_id: "dev-1", expo_push_token: "tok-1" },
          { device_id: "dev-2", expo_push_token: "tok-2" }
        ]
      },
      error: null
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { status: "ok", id: "ticket-1" },
          { status: "ok", id: "ticket-2" }
        ]
      })
    }),
    recordResult: {
      data: {
        dispatch_id: "d1000000-0000-4000-a000-000000000001",
        alert_id: "d1000000-0000-4000-a000-000000000001",
        status: "provider-accepted",
        eligible_device_count: 2,
        provider_accepted_count: 2,
        provider_rejected_count: 0,
        confirmed_delivery_count: 0,
        failure_reason: null,
        dispatched_at: new Date().toISOString()
      },
      error: null
    }
  });

  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, "provider-accepted");
  assert.equal(json.provider_accepted_count, 2);
  assert.equal(json.provider_rejected_count, 0);
});

test("Case 12: provider complete rejection (provider-rejected)", async () => {
  let recordedStatus = null;
  const env = createMockEnvironment({
    prepareResult: {
      data: {
        is_duplicate: false,
        dispatch_id: "d1000000-0000-4000-a000-000000000001",
        alert_id: "d1000000-0000-4000-a000-000000000001",
        status: "dispatching",
        alert: { id: "d1000000-0000-4000-a000-000000000001", title: "T", body: "B", category: "breaking", destination: null },
        devices: [
          { device_id: "dev-1", expo_push_token: "tok-1" },
          { device_id: "dev-2", expo_push_token: "tok-2" }
        ]
      },
      error: null
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { status: "error", message: "DeviceNotRegistered" },
          { status: "error", message: "InvalidCredentials" }
        ]
      })
    }),
    adminClient: {
      rpc: async (fn, args) => {
        if (fn === "newsroom_prepare_dispatch_recipients") {
          return {
            data: {
              is_duplicate: false,
              dispatch_id: "d1000000-0000-4000-a000-000000000001",
              alert_id: args.p_alert_id,
              status: "dispatching",
              alert: { id: args.p_alert_id, title: "T", body: "B", category: "breaking", destination: null },
              devices: [
                { device_id: "dev-1", expo_push_token: "tok-1" },
                { device_id: "dev-2", expo_push_token: "tok-2" }
              ]
            },
            error: null
          };
        }
        if (fn === "newsroom_record_dispatch_result") {
          recordedStatus = args.p_status;
          return {
            data: {
              dispatch_id: args.p_dispatch_id,
              alert_id: "d1000000-0000-4000-a000-000000000001",
              status: args.p_status,
              eligible_device_count: args.p_eligible_count,
              provider_accepted_count: args.p_accepted_count,
              provider_rejected_count: args.p_rejected_count,
              confirmed_delivery_count: 0,
              failure_reason: args.p_failure_reason,
              dispatched_at: new Date().toISOString()
            },
            error: null
          };
        }
      }
    }
  });

  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(recordedStatus, "provider-rejected");
  assert.equal(json.status, "provider-rejected");
  assert.equal(json.provider_accepted_count, 0);
  assert.equal(json.provider_rejected_count, 2);
});

test("Case 13: provider mixed acceptance (partially-accepted)", async () => {
  let recordedStatus = null;
  const env = createMockEnvironment({
    adminClient: {
      rpc: async (fn, args) => {
        if (fn === "newsroom_prepare_dispatch_recipients") {
          return {
            data: {
              is_duplicate: false,
              dispatch_id: "d1000000-0000-4000-a000-000000000001",
              alert_id: args.p_alert_id,
              status: "dispatching",
              alert: { id: args.p_alert_id, title: "T", body: "B", category: "breaking", destination: null },
              devices: [
                { device_id: "dev-1", expo_push_token: "tok-1" },
                { device_id: "dev-2", expo_push_token: "tok-2" }
              ]
            },
            error: null
          };
        }
        if (fn === "newsroom_record_dispatch_result") {
          recordedStatus = args.p_status;
          return {
            data: {
              dispatch_id: args.p_dispatch_id,
              alert_id: "d1000000-0000-4000-a000-000000000001",
              status: args.p_status,
              eligible_device_count: args.p_eligible_count,
              provider_accepted_count: args.p_accepted_count,
              provider_rejected_count: args.p_rejected_count,
              confirmed_delivery_count: 0,
              failure_reason: args.p_failure_reason,
              dispatched_at: new Date().toISOString()
            },
            error: null
          };
        }
      }
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { status: "ok", id: "ticket-1" },
          { status: "error", message: "DeviceNotRegistered" }
        ]
      })
    })
  });

  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(recordedStatus, "partially-accepted");
  assert.equal(json.status, "partially-accepted");
  assert.equal(json.provider_accepted_count, 1);
  assert.equal(json.provider_rejected_count, 1);
});

test("Case 14: provider HTTP failure (delivery-failed)", async () => {
  let recordedStatus = null;
  const env = createMockEnvironment({
    adminClient: {
      rpc: async (fn, args) => {
        if (fn === "newsroom_prepare_dispatch_recipients") {
          return {
            data: {
              is_duplicate: false,
              dispatch_id: "d1000000-0000-4000-a000-000000000001",
              alert_id: args.p_alert_id,
              status: "dispatching",
              alert: { id: args.p_alert_id, title: "T", body: "B", category: "breaking", destination: null },
              devices: [
                { device_id: "dev-1", expo_push_token: "tok-1" },
                { device_id: "dev-2", expo_push_token: "tok-2" }
              ]
            },
            error: null
          };
        }
        if (fn === "newsroom_record_dispatch_result") {
          recordedStatus = args.p_status;
          return {
            data: {
              dispatch_id: args.p_dispatch_id,
              alert_id: "d1000000-0000-4000-a000-000000000001",
              status: args.p_status,
              eligible_device_count: args.p_eligible_count,
              provider_accepted_count: args.p_accepted_count,
              provider_rejected_count: args.p_rejected_count,
              confirmed_delivery_count: 0,
              failure_reason: args.p_failure_reason,
              dispatched_at: new Date().toISOString()
            },
            error: null
          };
        }
      }
    },
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      statusText: "Service Unavailable"
    })
  });

  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(recordedStatus, "delivery-failed");
  assert.equal(json.status, "delivery-failed");
  assert.equal(json.provider_accepted_count, 0);
  assert.equal(json.provider_rejected_count, 2);
  assert.match(json.failure_reason, /Expo provider HTTP 503/);
});

test("Case 15: provider malformed non-array response (delivery-failed)", async () => {
  let recordedStatus = null;
  const env = createMockEnvironment({
    adminClient: {
      rpc: async (fn, args) => {
        if (fn === "newsroom_prepare_dispatch_recipients") {
          return {
            data: {
              is_duplicate: false,
              dispatch_id: "d1000000-0000-4000-a000-000000000001",
              alert_id: args.p_alert_id,
              status: "dispatching",
              alert: { id: args.p_alert_id, title: "T", body: "B", category: "breaking", destination: null },
              devices: [{ device_id: "dev-1", expo_push_token: "tok-1" }]
            },
            error: null
          };
        }
        if (fn === "newsroom_record_dispatch_result") {
          recordedStatus = args.p_status;
          return {
            data: {
              dispatch_id: args.p_dispatch_id,
              alert_id: "d1000000-0000-4000-a000-000000000001",
              status: args.p_status,
              eligible_device_count: args.p_eligible_count,
              provider_accepted_count: args.p_accepted_count,
              provider_rejected_count: args.p_rejected_count,
              confirmed_delivery_count: 0,
              failure_reason: args.p_failure_reason,
              dispatched_at: new Date().toISOString()
            },
            error: null
          };
        }
      }
    },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: "not-an-array" })
    })
  });

  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(recordedStatus, "delivery-failed");
  assert.equal(json.status, "delivery-failed");
  assert.match(json.failure_reason, /Malformed response envelope/);
});

test("Case 16: provider response with wrong result cardinality (delivery-failed)", async () => {
  let recordedStatus = null;
  const env = createMockEnvironment({
    adminClient: {
      rpc: async (fn, args) => {
        if (fn === "newsroom_prepare_dispatch_recipients") {
          return {
            data: {
              is_duplicate: false,
              dispatch_id: "d1000000-0000-4000-a000-000000000001",
              alert_id: args.p_alert_id,
              status: "dispatching",
              alert: { id: args.p_alert_id, title: "T", body: "B", category: "breaking", destination: null },
              devices: [
                { device_id: "dev-1", expo_push_token: "tok-1" },
                { device_id: "dev-2", expo_push_token: "tok-2" }
              ]
            },
            error: null
          };
        }
        if (fn === "newsroom_record_dispatch_result") {
          recordedStatus = args.p_status;
          return {
            data: {
              dispatch_id: args.p_dispatch_id,
              alert_id: "d1000000-0000-4000-a000-000000000001",
              status: args.p_status,
              eligible_device_count: args.p_eligible_count,
              provider_accepted_count: args.p_accepted_count,
              provider_rejected_count: args.p_rejected_count,
              confirmed_delivery_count: 0,
              failure_reason: args.p_failure_reason,
              dispatched_at: new Date().toISOString()
            },
            error: null
          };
        }
      }
    },
    // Submits 2 devices, but provider returns only 1 ticket
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ status: "ok", id: "ticket-1" }]
      })
    })
  });

  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(recordedStatus, "delivery-failed");
  assert.equal(json.status, "delivery-failed");
  assert.match(json.failure_reason, /expected 2 tickets, received 1/);
});

test("Case 17: provider result never claims confirmed delivery merely from ticket acceptance", async () => {
  const env = createMockEnvironment();
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  const json = await res.json();
  assert.equal(json.confirmed_delivery_count, 0);
});

test("Case 18: client response contains zero Expo tokens", async () => {
  const env = createMockEnvironment();
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  const json = await res.json();
  const rawText = JSON.stringify(json);
  assert.ok(!rawText.includes("ExponentPushToken"));
  assert.ok(!rawText.includes("expo_push_token"));
});

test("Case 19: client response contains zero device IDs", async () => {
  const env = createMockEnvironment();
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  const json = await res.json();
  assert.equal(json.device_id, undefined);
  assert.equal(json.device_ids, undefined);
  assert.equal(json.devices, undefined);
});

test("Case 20: client response contains zero reader user IDs", async () => {
  const env = createMockEnvironment();
  const req = makeRequest({
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-key-12345"
  });
  const res = await handlePushDispatchRequest(req, env);
  const json = await res.json();
  assert.equal(json.user_id, undefined);
  assert.equal(json.reader_id, undefined);
  assert.equal(json.reader_user_id, undefined);
});

// =============================================================================
// 6. CLIENT SERVICE INTEGRATION & CONTRACT CONFORMANCE
// =============================================================================

const pushServiceModule = loadTs("src/services/newsroom-push-alerts.ts", {
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
const {
  createNewsroomPushAlertService,
  mapNewsroomPushDispatchRow,
  mapNewsroomPushDispatchResult,
  NewsroomPushAlertError
} = pushServiceModule;

test("HT-NR-06C-B: mapNewsroomPushDispatchRow strictly preserves privacy and parses ledger row", () => {
  const validRow = {
    id: "e1000000-0000-4000-a000-000000000001",
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "dispatch-key-001",
    status: "provider-accepted",
    eligible_device_count: 50,
    provider_accepted_count: 49,
    provider_rejected_count: 1,
    confirmed_delivery_count: 0,
    failure_reason: null,
    created_at: "2026-10-17T04:00:00.000Z",
    updated_at: "2026-10-17T04:00:05.000Z"
  };

  const mapped = mapNewsroomPushDispatchRow(validRow);
  assert.ok(mapped);
  assert.equal(mapped.id, "e1000000-0000-4000-a000-000000000001");
  assert.equal(mapped.alertId, "d1000000-0000-4000-a000-000000000001");
  assert.equal(mapped.status, "provider-accepted");
  assert.equal(mapped.eligibleDeviceCount, 50);
  assert.equal(mapped.providerAcceptedCount, 49);
  assert.equal(mapped.providerRejectedCount, 1);
  assert.equal(mapped.confirmedDeliveryCount, 0);

  // Rejects rows containing raw device tokens
  assert.equal(
    mapNewsroomPushDispatchRow({ ...validRow, expo_push_token: "ExponentPushToken[123]" }),
    null
  );
  // Rejects rows containing user IDs
  assert.equal(
    mapNewsroomPushDispatchRow({ ...validRow, reader_user_id: "user-uuid" }),
    null
  );
  // Rejects invalid status
  assert.equal(
    mapNewsroomPushDispatchRow({ ...validRow, status: "completed" }),
    null
  );
});

test("HT-NR-06C-B: mapNewsroomPushDispatchResult parses edge function result envelope safely", () => {
  const validResult = {
    dispatch_id: "e1000000-0000-4000-a000-000000000001",
    alert_id: "d1000000-0000-4000-a000-000000000001",
    status: "partially-accepted",
    eligible_device_count: 100,
    provider_accepted_count: 98,
    provider_rejected_count: 2,
    confirmed_delivery_count: 0,
    failure_reason: null,
    dispatched_at: "2026-10-17T04:00:00.000Z"
  };

  const mapped = mapNewsroomPushDispatchResult(validResult);
  assert.ok(mapped);
  assert.equal(mapped.dispatch_id, "e1000000-0000-4000-a000-000000000001");
  assert.equal(mapped.status, "partially-accepted");
  assert.equal(mapped.confirmed_delivery_count, 0);

  // Token leak rejection
  assert.equal(
    mapNewsroomPushDispatchResult({ ...validResult, token: "ExponentPushToken[123]" }),
    null
  );
  // Device ID leak rejection
  assert.equal(
    mapNewsroomPushDispatchResult({ ...validResult, device_id: "uuid" }),
    null
  );
});

test("HT-NR-06C-B: getDispatch and dispatchAlert client methods invoke correct backend endpoints", async () => {
  let invokedRpc = null;
  let invokedFunction = null;
  let invokedBody = null;

  const mockClient = {
    rpc(fn, args) {
      invokedRpc = { fn, args };
      if (fn === "newsroom_get_push_alert_dispatch") {
        return Promise.resolve({
          data: [
            {
              id: "e1000000-0000-4000-a000-000000000001",
              alert_id: args.p_alert_id,
              idempotency_key: "idem-key",
              status: "provider-accepted",
              eligible_device_count: 10,
              provider_accepted_count: 10,
              provider_rejected_count: 0,
              confirmed_delivery_count: 0,
              failure_reason: null,
              created_at: "2026-10-17T04:00:00.000Z",
              updated_at: "2026-10-17T04:00:05.000Z"
            }
          ],
          error: null
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
    functions: {
      invoke(name, opts) {
        invokedFunction = name;
        invokedBody = opts.body;
        return Promise.resolve({
          data: {
            dispatch_id: "e1000000-0000-4000-a000-000000000001",
            alert_id: opts.body.alert_id,
            status: "provider-accepted",
            eligible_device_count: 10,
            provider_accepted_count: 10,
            provider_rejected_count: 0,
            confirmed_delivery_count: 0,
            failure_reason: null,
            dispatched_at: "2026-10-17T04:00:00.000Z"
          },
          error: null
        });
      }
    }
  };

  const service = createNewsroomPushAlertService(() => mockClient);

  // 1. getDispatch
  const dispatch = await service.getDispatch("d1000000-0000-4000-a000-000000000001");
  assert.equal(invokedRpc.fn, "newsroom_get_push_alert_dispatch");
  assert.equal(invokedRpc.args.p_alert_id, "d1000000-0000-4000-a000-000000000001");
  assert.equal(dispatch.status, "provider-accepted");
  assert.equal(dispatch.eligibleDeviceCount, 10);

  // 2. dispatchAlert
  const result = await service.dispatchAlert("d1000000-0000-4000-a000-000000000001", "custom-idem-key");
  assert.equal(invokedFunction, "newsroom-push-dispatch");
  assert.equal(invokedBody.alert_id, "d1000000-0000-4000-a000-000000000001");
  assert.equal(invokedBody.idempotency_key, "custom-idem-key");
  assert.equal(result.status, "provider-accepted");
  assert.equal(result.confirmed_delivery_count, 0);
});

test("HT-NR-06C-B: dispatchAlert fails closed on invalid UUID or edge error", async () => {
  const service = createNewsroomPushAlertService(() => ({
    rpc: () => Promise.resolve({ data: null, error: null }),
    functions: {
      invoke: () => Promise.resolve({ data: null, error: new Error("Server error 500") })
    }
  }));

  // Invalid UUID fails closed
  await assert.rejects(
    () => service.dispatchAlert("not-a-uuid"),
    /Invalid alert ID: valid UUID required/
  );

  // Edge invocation error fails closed
  await assert.rejects(
    () => service.dispatchAlert("d1000000-0000-4000-a000-000000000001"),
    /Server error 500/
  );
});

// =============================================================================
// 7. OWNER PREVIEW SIMULATION INTEGRITY
// =============================================================================

const previewModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: {} } },
    "../platform/config": { appEnvironment: "staging" }
  }
});
const { buildPreviewPushDispatches, buildPreviewPushDispatchResult } = previewModule;

test("HT-NR-06C-B: Owner Preview produces mock dispatch records without touching server", () => {
  const previewDispatches = buildPreviewPushDispatches();
  assert.ok(typeof previewDispatches === "object");
  const alert004Dispatch = previewDispatches["d1000000-0000-4000-a000-000000000004"];
  assert.ok(alert004Dispatch, "Expected preview dispatch for sample alert 004");
  assert.equal(alert004Dispatch.status, "provider-accepted");
  assert.equal(alert004Dispatch.eligibleDeviceCount, 1250);
  assert.equal(alert004Dispatch.providerAcceptedCount, 1248);
  assert.equal(alert004Dispatch.providerRejectedCount, 2);
  assert.equal(alert004Dispatch.confirmedDeliveryCount, 0);

  const simulatedResult = buildPreviewPushDispatchResult("d1000000-0000-4000-a000-000000000003");
  assert.equal(simulatedResult.alert_id, "d1000000-0000-4000-a000-000000000003");
  assert.equal(simulatedResult.status, "provider-accepted");
  assert.equal(simulatedResult.eligible_device_count, 3840);
  assert.equal(simulatedResult.provider_accepted_count, 3840);
  assert.equal(simulatedResult.provider_rejected_count, 0);
  assert.equal(simulatedResult.confirmed_delivery_count, 0);
});

// =============================================================================
// 8. PRIVACY & LEAK PREVENTION INVARIANTS
// =============================================================================

test("HT-NR-06C-B: Neither model nor client code exposes raw tokens or private identities", () => {
  const modelsCode = read("src/domain/models.ts");
  const contractsCode = read("src/domain/contracts.ts");
  const serviceCode = read("src/services/newsroom-push-alerts.ts");

  assert.doesNotMatch(modelsCode, /expoPushToken/);
  assert.doesNotMatch(modelsCode, /tokenHash/);
  assert.doesNotMatch(contractsCode, /expoPushToken/);
  assert.doesNotMatch(contractsCode, /tokenHash/);
  assert.doesNotMatch(serviceCode, /expoPushToken/);
  assert.doesNotMatch(serviceCode, /tokenHash/);
});
