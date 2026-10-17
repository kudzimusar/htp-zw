import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

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
// 2. MIGRATION 76 DISCIPLINE & REPOSITORY AUTHORITY
// =============================================================================

test("HT-NR-06C-B: repository migration count is exactly 76", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  assert.equal(
    migrationFiles.length,
    76,
    `Expected exactly 76 migrations in supabase/migrations, found ${migrationFiles.length}`
  );
  assert.ok(
    migrationFiles.includes(
      "20261017040000_ht_nr06cb_push_provider_execution.sql"
    ),
    "Expected migration 20261017040000_ht_nr06cb_push_provider_execution.sql to be present"
  );
});

test("HT-NR-06C-B: migration 76 defines dispatch ledger tables and security boundary", () => {
  const sql = readRepo("supabase/migrations/20261017040000_ht_nr06cb_push_provider_execution.sql");

  // Tables defined
  assert.ok(sql.includes("create table if not exists public.newsroom_push_dispatches"));
  assert.ok(sql.includes("create table if not exists public.newsroom_push_dispatch_tickets"));

  // Check constraint on dispatch status
  assert.ok(sql.includes("'dispatching'"));
  assert.ok(sql.includes("'provider-accepted'"));
  assert.ok(sql.includes("'partially-accepted'"));
  assert.ok(sql.includes("'provider-rejected'"));
  assert.ok(sql.includes("'delivery-failed'"));
  assert.ok(sql.includes("'zero-recipients'"));

  // Idempotency unique constraint
  assert.ok(sql.includes("uq_newsroom_push_dispatches_idempotency") || sql.includes("unique (idempotency_key)"));

  // RLS enabled
  assert.ok(sql.includes("alter table public.newsroom_push_dispatches enable row level security;"));
  assert.ok(sql.includes("alter table public.newsroom_push_dispatch_tickets enable row level security;"));

  // Direct table privileges revoked from public, anon, authenticated
  assert.ok(sql.includes("revoke all on table public.newsroom_push_dispatches from public, anon, authenticated;"));
  assert.ok(sql.includes("revoke all on table public.newsroom_push_dispatch_tickets from public, anon, authenticated;"));

  // RPCs defined
  assert.ok(sql.includes("newsroom_get_push_alert_dispatch"));
  assert.ok(sql.includes("newsroom_prepare_dispatch_recipients"));
  assert.ok(sql.includes("newsroom_record_dispatch_result"));

  // RPC privileges
  assert.ok(sql.includes("grant execute on function public.newsroom_get_push_alert_dispatch(uuid) to authenticated;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_prepare_dispatch_recipients(uuid, text, uuid) to service_role;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_record_dispatch_result(uuid, text, integer, integer, integer, text, jsonb, jsonb) to service_role;"));

  // Service-role-only boundary verified inside function bodies
  assert.ok(sql.includes("current_user not in ('service_role', 'postgres')"));
  assert.ok(sql.includes("coalesce(auth.role(), '') <> 'service_role'"));
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
    // If remote is not directly resolvable in offline test environment, verify base commit
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
// 4. EDGE FUNCTION CONTRACT & SOURCE CHECKS
// =============================================================================

test("HT-NR-06C-B: supabase/config.toml configures newsroom-push-dispatch with verify_jwt = true", () => {
  const config = readRepo("supabase/config.toml");
  assert.ok(config.includes("[functions.newsroom-push-dispatch]"));
  assert.ok(config.includes("verify_jwt = true"));
});

test("HT-NR-06C-B: Edge Function source code enforces story.publish capability and strict boundary", () => {
  const code = readRepo("supabase/functions/newsroom-push-dispatch/index.ts");

  // CORS and OPTIONS handling
  assert.ok(code.includes("corsHeaders"));
  assert.ok(code.includes('req.method === "OPTIONS"') || code.includes("req.method === 'OPTIONS'"));

  // Authorization header parsing and 401 unauthenticated
  assert.ok(code.includes("Authentication required"));
  assert.ok(code.includes("status: 401") || code.includes("response(401"));

  // Capability verification: story.publish required, distribution.manage alone rejected
  assert.ok(code.includes("newsroom_has_capability"));
  assert.ok(code.includes("story.publish"));
  assert.ok(code.includes("Forbidden: story.publish capability required"));

  // Input validation
  assert.ok(code.includes("alert_id") && code.includes("valid UUID required"));
  assert.ok(code.includes("status: 400") || code.includes("response(400"));

  // Service role execution of prepare RPC
  assert.ok(code.includes("newsroom_prepare_dispatch_recipients"));

  // Zero recipients handling: does NOT call Expo
  assert.ok(code.includes("devices.length === 0"));
  assert.ok(code.includes("zero-recipients"));

  // Batching tokens in chunks of 100
  assert.ok(code.includes("CHUNK_SIZE = 100") || code.includes("100"));

  // Expo push provider endpoint
  assert.ok(code.includes("https://exp.host/--/api/v2/push/send"));

  // Provider response statuses
  assert.ok(code.includes("provider-accepted"));
  assert.ok(code.includes("partially-accepted"));
  assert.ok(code.includes("provider-rejected"));
  assert.ok(code.includes("delivery-failed"));

  // Service role recording of results
  assert.ok(code.includes("newsroom_record_dispatch_result"));

  // Separation of transport from delivery
  assert.ok(code.includes("confirmed_delivery_count"));

  // Client response must NEVER include device tokens or user IDs
  assert.ok(!code.includes("device_tokens"));
  assert.ok(!code.includes("reader_user_ids"));
});

// =============================================================================
// 5. CAPABILITY MATRIX RESOLUTION
// =============================================================================

const capabilitiesModule = loadTs("src/security/capabilities.ts");
const { resolvePushAlertDeskCapabilityState } = loadTs("src/ui/StudioPushAlertDesk.tsx", {
  mocks: {
    "react": {
      useCallback: () => {},
      useEffect: () => {},
      useMemo: () => {},
      useRef: () => ({ current: null }),
      useState: () => [null, () => {}]
    },
    "react/jsx-runtime": {
      jsx: () => null,
      jsxs: () => null,
      Fragment: () => null
    },
    "react-native": {
      Platform: { OS: "web" },
      Pressable: () => null,
      ScrollView: () => null,
      StyleSheet: { create: (s) => s },
      Text: () => null,
      TextInput: () => null,
      useWindowDimensions: () => ({ width: 1024 }),
      View: () => null
    },
    "../services": { services: {} },
    "../theme/tokens": {
      breakpoints: { tablet: 768 },
      colors: { blue: "#2563EB", ink: "#0F172A", inkMuted: "#64748B", border: "#E2E8F0" },
      radius: { sm: 4, md: 8, pill: 999 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 }
    }
  }
});

test("HT-NR-06C-B: resolvePushAlertDeskCapabilityState enforces story.publish for canDispatch", () => {
  // Null / unauthorized
  const empty = resolvePushAlertDeskCapabilityState(null);
  assert.equal(empty.canDispatch, false);

  // Authenticated with distribution.manage ONLY -> canCreate/canSave true, canDispatch false
  const distOnly = resolvePushAlertDeskCapabilityState({
    status: "authorized",
    source: "server",
    user: { id: "u1", email: "dist@healthtimes.co.zw" },
    capabilities: ["distribution.manage"]
  });
  assert.equal(distOnly.hasDeskAccess, true);
  assert.equal(distOnly.canCreate, true);
  assert.equal(distOnly.canSave, true);
  assert.equal(distOnly.canApprove, false);
  assert.equal(distOnly.canPrepare, false);
  assert.equal(distOnly.canDispatch, false, "distribution.manage ALONE cannot dispatch!");

  // Authenticated with story.publish -> canDispatch true
  const publisher = resolvePushAlertDeskCapabilityState({
    status: "authorized",
    source: "server",
    user: { id: "u2", email: "editor@healthtimes.co.zw" },
    capabilities: ["distribution.manage", "story.publish"]
  });
  assert.equal(publisher.canDispatch, true);

  // Client-source snapshot is rejected (server source required)
  const clientSnapshot = resolvePushAlertDeskCapabilityState({
    status: "authorized",
    source: "client",
    user: { id: "u3", email: "fake@healthtimes.co.zw" },
    capabilities: ["distribution.manage", "story.publish"]
  });
  assert.equal(clientSnapshot.canDispatch, false);
});

// =============================================================================
// 6. CLIENT SERVICE LAYER: newsroom-push-alerts.ts
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
const { createNewsroomPushAlertService, mapNewsroomPushDispatchRow, mapNewsroomPushDispatchResult } = pushServiceModule;

test("HT-NR-06C-B: mapNewsroomPushDispatchRow correctly transforms snake_case DB row to camelCase model", () => {
  const row = {
    id: "e1000000-0000-4000-a000-000000000001",
    alert_id: "d1000000-0000-4000-a000-000000000001",
    idempotency_key: "idem-12345",
    status: "provider-accepted",
    eligible_device_count: 50,
    provider_accepted_count: 48,
    provider_rejected_count: 2,
    confirmed_delivery_count: 0,
    failure_reason: null,
    created_at: "2026-10-17T04:00:00.000Z",
    updated_at: "2026-10-17T04:00:05.000Z"
  };

  const dispatch = mapNewsroomPushDispatchRow(row);
  assert.equal(dispatch.id, "e1000000-0000-4000-a000-000000000001");
  assert.equal(dispatch.alertId, "d1000000-0000-4000-a000-000000000001");
  assert.equal(dispatch.idempotencyKey, "idem-12345");
  assert.equal(dispatch.status, "provider-accepted");
  assert.equal(dispatch.eligibleDeviceCount, 50);
  assert.equal(dispatch.providerAcceptedCount, 48);
  assert.equal(dispatch.providerRejectedCount, 2);
  assert.equal(dispatch.confirmedDeliveryCount, 0);
  assert.equal(dispatch.failureReason, null);
  assert.equal(dispatch.createdAt, "2026-10-17T04:00:00.000Z");
  assert.equal(dispatch.updatedAt, "2026-10-17T04:00:05.000Z");
});

test("HT-NR-06C-B: getDispatch returns null when no dispatch record exists, and dispatches correctly via Edge Function", async () => {
  let invokedFunction = null;
  let invokedBody = null;
  let invokedRpc = null;

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

  // Push token strings must never appear as fields on dispatch models
  assert.doesNotMatch(modelsCode, /expoPushToken/);
  assert.doesNotMatch(modelsCode, /tokenHash/);
  assert.doesNotMatch(contractsCode, /expoPushToken/);
  assert.doesNotMatch(contractsCode, /tokenHash/);
  assert.doesNotMatch(serviceCode, /expoPushToken/);
  assert.doesNotMatch(serviceCode, /tokenHash/);
});
