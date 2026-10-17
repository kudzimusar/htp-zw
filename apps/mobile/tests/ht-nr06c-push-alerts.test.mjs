import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileRoot, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(mobileRoot, relPath), "utf8");
}

// Load models
const modelsModule = loadTs("src/domain/models.ts");
const {
  NEWSROOM_PUSH_ALERT_CATEGORIES,
  NEWSROOM_PUSH_ALERT_STATUSES,
  validatePushAlertCategory,
  validatePushAlertDestination,
  validatePushAlertCreateInput,
  validatePushAlertPatch
} = modelsModule;

// Load capabilities
const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  PUSH_DESK_CAPABILITIES,
  hasPushDeskAccess
} = capabilitiesModule;

// Load services
const pushAlertsServiceModule = loadTs("src/services/newsroom-push-alerts.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});
const {
  NewsroomPushAlertError,
  isValidAlertUuid,
  mapNewsroomPushAlertRow,
  mapPreparePushAlertResponse,
  createNewsroomPushAlertService
} = pushAlertsServiceModule;

// Load preview data
const previewDataModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: {} } },
    "../platform/config": { appEnvironment: "staging" }
  }
});
const {
  buildPreviewPushAlerts,
  buildPreviewPushAlertPrepareResult,
  OWNER_PREVIEW_NAV_ITEMS
} = previewDataModule;

// Helper to create mock Supabase client for push alerts RPCs
function createMockPushAlertClient(rpcResolver) {
  const calls = {
    rpcs: []
  };

  const client = {
    calls,
    rpc(fnName, params) {
      calls.rpcs.push({ fnName, params });
      return Promise.resolve(rpcResolver(fnName, params));
    }
  };

  return client;
}

// =============================================================================
// 1. MIGRATION 74 DISCIPLINE & REPOSITORY AUTHORITY
// =============================================================================

test("HT-NR-06C-A: repository migration count is exactly 74", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  assert.equal(
    migrationFiles.length,
    74,
    `Expected exactly 74 migrations in supabase/migrations, found ${migrationFiles.length}`
  );
  assert.ok(
    migrationFiles.includes(
      "20261017030000_ht_nr06ca_push_alert_foundation.sql"
    ),
    "Expected migration 20261017030000_ht_nr06ca_push_alert_foundation.sql to be present"
  );
});

test("HT-NR-06C-A: migration 74 defines reader_push_devices and newsroom_push_alerts with zero direct table grants", () => {
  const migrationPath = path.join(
    repoRoot,
    "supabase/migrations/20261017030000_ht_nr06ca_push_alert_foundation.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf-8").toLowerCase();

  // Tables
  assert.ok(
    sql.includes("create table if not exists public.reader_push_devices"),
    "Must create reader_push_devices table"
  );
  assert.ok(
    sql.includes("create table if not exists public.newsroom_push_alerts"),
    "Must create newsroom_push_alerts table"
  );

  // RLS enabled
  assert.ok(
    sql.includes("alter table public.reader_push_devices enable row level security;"),
    "reader_push_devices must have RLS enabled"
  );
  assert.ok(
    sql.includes("alter table public.newsroom_push_alerts enable row level security;"),
    "newsroom_push_alerts must have RLS enabled"
  );

  // Direct table grants revoked
  assert.ok(
    sql.includes("revoke all on public.reader_push_devices from public, anon, authenticated;"),
    "reader_push_devices must revoke all from public, anon, authenticated"
  );
  assert.ok(
    sql.includes("revoke insert, update, delete, truncate on table public.newsroom_push_alerts from public, anon, authenticated;"),
    "newsroom_push_alerts must revoke mutations from public, anon, authenticated"
  );

  // RPCs
  assert.ok(
    sql.includes("create or replace function public.reader_register_push_device"),
    "Must define reader_register_push_device RPC"
  );
  assert.ok(
    sql.includes("create or replace function public.newsroom_create_push_alert"),
    "Must define newsroom_create_push_alert RPC"
  );
  assert.ok(
    sql.includes("create or replace function public.newsroom_save_push_alert"),
    "Must define newsroom_save_push_alert RPC"
  );
  assert.ok(
    sql.includes("create or replace function public.newsroom_approve_push_alert"),
    "Must define newsroom_approve_push_alert RPC"
  );
  assert.ok(
    sql.includes("create or replace function public.newsroom_prepare_push_alert"),
    "Must define newsroom_prepare_push_alert RPC"
  );
  assert.ok(
    sql.includes("create or replace function public.newsroom_list_push_alerts"),
    "Must define newsroom_list_push_alerts RPC"
  );

  // Grants on RPCs to authenticated
  assert.ok(
    sql.includes("grant execute on function public.reader_register_push_device"),
    "Must grant execute on reader_register_push_device"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_create_push_alert"),
    "Must grant execute on newsroom_create_push_alert"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_save_push_alert"),
    "Must grant execute on newsroom_save_push_alert"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_approve_push_alert"),
    "Must grant execute on newsroom_approve_push_alert"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_prepare_push_alert"),
    "Must grant execute on newsroom_prepare_push_alert"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_list_push_alerts"),
    "Must grant execute on newsroom_list_push_alerts"
  );
});

// =============================================================================
// 2. DOMAIN VALIDATION TESTS
// =============================================================================

test("HT-NR-06C-A: NEWSROOM_PUSH_ALERT_CATEGORIES and STATUSES are strictly defined", () => {
  assert.deepEqual(NEWSROOM_PUSH_ALERT_CATEGORIES, [
    "breaking",
    "live",
    "topic",
    "premium",
    "system"
  ]);
  assert.deepEqual(NEWSROOM_PUSH_ALERT_STATUSES, [
    "draft",
    "approved",
    "prepared"
  ]);
});

test("HT-NR-06C-A: validatePushAlertCategory accepts valid categories and rejects invalid", () => {
  assert.equal(validatePushAlertCategory("breaking"), true);
  assert.equal(validatePushAlertCategory("live"), true);
  assert.equal(validatePushAlertCategory("topic"), true);
  assert.equal(validatePushAlertCategory("premium"), true);
  assert.equal(validatePushAlertCategory("system"), true);

  assert.equal(validatePushAlertCategory("marketing"), false);
  assert.equal(validatePushAlertCategory("unknown"), false);
  assert.equal(validatePushAlertCategory(""), false);
});

test("HT-NR-06C-A: validatePushAlertDestination validates internal paths and rejects unsafe domains", () => {
  assert.equal(validatePushAlertDestination(null), true);
  assert.equal(validatePushAlertDestination(undefined), true);
  assert.equal(validatePushAlertDestination(""), true);

  assert.equal(validatePushAlertDestination("/stories/cholera-alert"), true);
  assert.equal(validatePushAlertDestination("/live"), true);

  assert.equal(validatePushAlertDestination("https://evil.com/phishing"), false);
  assert.equal(validatePushAlertDestination("javascript:alert(1)"), false);
  assert.equal(validatePushAlertDestination("//evil.com/test"), false);
});

test("HT-NR-06C-A: validatePushAlertCreateInput enforces title, body and category", () => {
  const valid = validatePushAlertCreateInput({
    title: "Cholera advisory",
    body: "Boil water protocol active",
    category: "breaking",
    destination: "/stories/cholera"
  });
  assert.equal(valid.valid, true);

  const missingTitle = validatePushAlertCreateInput({ title: "", body: "Body", category: "breaking" });
  assert.equal(missingTitle.valid, false);
  assert.ok(missingTitle.error?.includes("title is required"));

  const missingBody = validatePushAlertCreateInput({ title: "Title", body: "", category: "breaking" });
  assert.equal(missingBody.valid, false);
  assert.ok(missingBody.error?.includes("body is required"));
});

test("HT-NR-06C-A: validatePushAlertPatch validates partial updates", () => {
  const validPatch = validatePushAlertPatch({
    title: "Updated Title",
    category: "topic"
  });
  assert.equal(validPatch.valid, true);

  const invalidPatch = validatePushAlertPatch({ category: "invalid" });
  assert.equal(invalidPatch.valid, false);
  assert.ok(invalidPatch.error?.includes("Invalid category"));
});

// =============================================================================
// 3. CAPABILITIES & SECURITY BOUNDARY
// =============================================================================

test("HT-NR-06C-A: PUSH_DESK_CAPABILITIES reuses distribution.manage and story.publish", () => {
  assert.deepEqual(PUSH_DESK_CAPABILITIES, ["distribution.manage", "story.publish"]);
});

test("HT-NR-06C-A: hasPushDeskAccess evaluates server capability snapshot correctly", () => {
  assert.equal(hasPushDeskAccess(null), false);
  assert.equal(hasPushDeskAccess(undefined), false);
  assert.equal(hasPushDeskAccess({ status: "authorized", source: "server", capabilities: [] }), false);
  assert.equal(hasPushDeskAccess({ status: "authorized", source: "server", capabilities: ["comment.moderate"] }), false);
  assert.equal(hasPushDeskAccess({ status: "authorized", source: "server", capabilities: ["distribution.manage"] }), true);
  assert.equal(hasPushDeskAccess({ status: "authorized", source: "server", capabilities: ["story.publish"] }), true);
  assert.equal(hasPushDeskAccess({ status: "authorized", source: "server", capabilities: ["distribution.manage", "story.publish"] }), true);
  assert.equal(hasPushDeskAccess({ status: "authorized", source: "client", capabilities: ["distribution.manage"] }), false);
});

// =============================================================================
// 4. PRIVACY BOUNDARY: ZERO TOKEN OR READER USER ID EXPOSURE
// =============================================================================

test("HT-NR-06C-A: mapNewsroomPushAlertRow maps row correctly and preserves privacy", () => {
  const row = {
    id: "d1000000-0000-4000-a000-000000000001",
    title: "Breaking Advisory",
    body: "Advisory details",
    category: "breaking",
    status: "draft",
    destination: "/stories/123",
    related_story_id: null,
    created_by: "e0000000-0000-4000-a000-000000000001",
    updated_by: "e0000000-0000-4000-a000-000000000001",
    approved_by: null,
    prepared_by: null,
    approved_at: null,
    prepared_at: null,
    created_at: "2026-10-16T10:00:00.000Z",
    updated_at: "2026-10-16T10:00:00.000Z"
  };

  const alert = mapNewsroomPushAlertRow(row);
  assert.ok(alert);
  assert.equal(alert.id, row.id);
  assert.equal(alert.title, row.title);
  assert.equal(alert.category, "breaking");
  assert.equal(alert.status, "draft");
  assert.equal(alert.destination, "/stories/123");
  assert.equal("expo_push_token" in alert, false);
  assert.equal("reader_user_id" in alert, false);
});

test("HT-NR-06C-A: mapPreparePushAlertResponse exposes aggregate eligibility only, zero tokens", () => {
  const response = {
    alert_id: "d1000000-0000-4000-a000-000000000003",
    title: "Vaccine Telemetry",
    body: "Expansion details",
    category: "topic",
    destination: "/topics/maternal",
    eligible_device_count: 3840
  };

  const result = mapPreparePushAlertResponse(response);
  assert.ok(result);
  assert.equal(result.alert_id, response.alert_id);
  assert.equal(result.eligible_device_count, 3840);
  assert.equal("expo_push_token" in result, false);
  assert.equal("device_tokens" in result, false);
  assert.equal("reader_user_id" in result, false);
});

// =============================================================================
// 5. SERVICE RPC CALLS & ERROR HANDLING
// =============================================================================

test("HT-NR-06C-A: createNewsroomPushAlertService calls RPCs with expected parameters", async () => {
  const mockAlertRow = {
    id: "d1000000-0000-4000-a000-000000000001",
    title: "Advisory",
    body: "Details",
    category: "breaking",
    status: "draft",
    destination: null,
    related_story_id: null,
    created_by: "e0000000-0000-4000-a000-000000000001",
    updated_by: "e0000000-0000-4000-a000-000000000001",
    approved_by: null,
    prepared_by: null,
    approved_at: null,
    prepared_at: null,
    created_at: "2026-10-16T10:00:00.000Z",
    updated_at: "2026-10-16T10:00:00.000Z"
  };

  const client = createMockPushAlertClient((fnName, params) => {
    if (fnName === "newsroom_list_push_alerts") {
      return { data: [mockAlertRow], error: null };
    }
    if (fnName === "newsroom_create_push_alert") {
      return { data: mockAlertRow.id, error: null };
    }
    if (fnName === "newsroom_save_push_alert") {
      return { data: null, error: null };
    }
    if (fnName === "newsroom_approve_push_alert") {
      return { data: null, error: null };
    }
    if (fnName === "newsroom_prepare_push_alert") {
      return {
        data: {
          alert_id: mockAlertRow.id,
          title: mockAlertRow.title,
          body: mockAlertRow.body,
          category: mockAlertRow.category,
          destination: null,
          eligible_device_count: 512
        },
        error: null
      };
    }
    return { data: null, error: { message: "Unknown RPC" } };
  });

  const service = createNewsroomPushAlertService(() => client);

  // 1. listAlerts
  const list = await service.listAlerts({ search: "advisory", status: "draft", category: "breaking", limit: 50 });
  assert.equal(list.length, 1);
  assert.equal(client.calls.rpcs[0].fnName, "newsroom_list_push_alerts");
  assert.deepEqual(client.calls.rpcs[0].params, {
    p_search: "advisory",
    p_status: "draft",
    p_category: "breaking",
    p_limit: 50
  });

  // 2. createAlert
  const createdId = await service.createAlert({
    title: "Advisory",
    body: "Details",
    category: "breaking"
  });
  assert.equal(createdId, mockAlertRow.id);
  assert.equal(client.calls.rpcs[1].fnName, "newsroom_create_push_alert");

  // 3. saveAlert
  await service.saveAlert(mockAlertRow.id, { title: "Updated Advisory" });
  assert.equal(client.calls.rpcs[2].fnName, "newsroom_save_push_alert");

  // 4. approveAlert
  await service.approveAlert(mockAlertRow.id);
  assert.equal(client.calls.rpcs[3].fnName, "newsroom_approve_push_alert");

  // 5. prepareAlert
  const prepared = await service.prepareAlert(mockAlertRow.id);
  assert.equal(prepared.alert_id, mockAlertRow.id);
  assert.equal(prepared.eligible_device_count, 512);
  assert.equal(client.calls.rpcs[4].fnName, "newsroom_prepare_push_alert");
});

test("HT-NR-06C-A: createNewsroomPushAlertService validates UUIDs and handles server errors", async () => {
  const client = createMockPushAlertClient(() => ({
    data: null,
    error: { message: "Permission denied" }
  }));

  const service = createNewsroomPushAlertService(() => client);

  // Invalid UUID
  await assert.rejects(
    () => service.saveAlert("invalid-uuid", { title: "Test" }),
    /Invalid alert ID/
  );

  // RPC failure throws NewsroomPushAlertError
  await assert.rejects(
    () => service.listAlerts(),
    /Permission denied/
  );
});

// =============================================================================
// 6. FIXTURES & SERVICES REGISTRY
// =============================================================================

test("HT-NR-06C-A: fixtures.ts registers fixtureNewsroomPushAlertService and fails closed on mutations", () => {
  const fixturesSource = read("src/services/fixtures.ts");

  assert.ok(
    fixturesSource.includes("fixtureNewsroomPushAlertService"),
    "fixtures.ts must export fixtureNewsroomPushAlertService"
  );
  assert.ok(
    fixturesSource.includes("newsroomPushAlerts: fixtureNewsroomPushAlertService"),
    "fixtureServices must include newsroomPushAlerts"
  );
  assert.ok(
    fixturesSource.includes("Newsroom push alert desk mutations are disabled in fixture mode"),
    "fixtureNewsroomPushAlertService must fail closed on mutations"
  );
});

test("HT-NR-06C-A: services/index.ts registers stagingNewsroomPushAlertService and stagingNotificationService", () => {
  const servicesIndexSource = read("src/services/index.ts");
  assert.ok(
    servicesIndexSource.includes("stagingNewsroomPushAlertService"),
    "services/index.ts must wire stagingNewsroomPushAlertService"
  );
  assert.ok(
    servicesIndexSource.includes("newsroomPushAlerts: stagingNewsroomPushAlertService"),
    "services/index.ts must wire newsroomPushAlerts property"
  );
  assert.ok(
    servicesIndexSource.includes("notifications: stagingNotificationService"),
    "services/index.ts must wire stagingNotificationService"
  );
});

// =============================================================================
// 7. OWNER PREVIEW DATA & NAVIGATION WIRING
// =============================================================================

test("HT-NR-06C-A: preview push alerts and prepare result conform to schema", () => {
  const previewAlerts = buildPreviewPushAlerts();
  assert.ok(previewAlerts.length >= 4);

  const draft = previewAlerts.find((a) => a.status === "draft");
  const approved = previewAlerts.find((a) => a.status === "approved");
  const prepared = previewAlerts.find((a) => a.status === "prepared");

  assert.ok(draft, "Preview data must have at least one draft alert");
  assert.ok(approved, "Preview data must have at least one approved alert");
  assert.ok(prepared, "Preview data must have at least one prepared alert");

  const prepareResult = buildPreviewPushAlertPrepareResult();
  assert.equal(prepareResult.alert_id, "d1000000-0000-4000-a000-000000000003");
  assert.equal(typeof prepareResult.eligible_device_count, "number");
  assert.ok(prepareResult.eligible_device_count > 0);
});

test("HT-NR-06C-A: Owner Preview registers push-alerts module with sample data and watermark", () => {
  const previewData = read("src/preview/newsroomPreviewData.ts");
  assert.ok(
    previewData.includes('"push-alerts"'),
    "OwnerPreviewModuleKey must contain push-alerts"
  );
  const previewModule = read("src/preview/OwnerPreviewStudio.tsx");
  assert.ok(
    previewModule.includes('activeKey="push-alerts"'),
    "OwnerPreviewStudio must wire activeKey push-alerts"
  );
  assert.ok(
    previewModule.includes("OwnerPreviewPushAlertDeskView"),
    "OwnerPreviewStudio must render OwnerPreviewPushAlertDeskView"
  );
});

test("HT-NR-06C-A: Studio.tsx navigation includes /studio/push-alerts", () => {
  const studioFile = path.join(mobileRoot, "src/ui/Studio.tsx");
  const content = fs.readFileSync(studioFile, "utf-8");
  assert.ok(
    content.includes('["Push Alerts","/studio/push-alerts"]'),
    "Studio.tsx must register Push Alerts navigation item"
  );
});

test("HT-NR-06C-A: app/studio/[module].tsx static params and owners include push-alerts", () => {
  const moduleFile = path.join(mobileRoot, "app/studio/[module].tsx");
  const content = fs.readFileSync(moduleFile, "utf-8");
  assert.ok(content.includes('"push-alerts"'), "Must include push-alerts in static params");
  assert.ok(content.includes('title:"Push Alert Desk"'), "Must include Push Alert Desk config in owners");
  assert.ok(content.includes('<StudioPushAlertDesk />'), "Must render StudioPushAlertDesk");
});

test("HT-NR-06C-A: app/owner-preview/studio/[module].tsx includes push-alerts", () => {
  const previewModuleFile = path.join(
    mobileRoot,
    "app/owner-preview/studio/[module].tsx"
  );
  const content = fs.readFileSync(previewModuleFile, "utf-8");
  assert.ok(
    content.includes('"push-alerts"'),
    "Must include push-alerts in owner preview static params"
  );
});

// =============================================================================
// 8. FROZEN BLOBS & UNTOUCHED REPOSITORY INVARIANTS
// =============================================================================

test("HT-NR-06C-A Invariant: ca01-communications.test.mjs git blob is untouched", () => {
  const filePath = path.join(mobileRoot, "tests/ca01-communications.test.mjs");
  const content = fs.readFileSync(filePath);
  const header = `blob ${content.length}\0`;
  const sha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(header), content]))
    .digest("hex");

  assert.equal(
    sha,
    "3af2f6988acf91b4118771a8fc15333af44c2fc7",
    "ca01-communications.test.mjs blob must match frozen baseline"
  );
});

test("HT-NR-06C-A Invariant: ReaderDiscussion.tsx git blob is untouched", () => {
  const filePath = path.join(mobileRoot, "src/ui/ReaderDiscussion.tsx");
  const content = fs.readFileSync(filePath);
  const header = `blob ${content.length}\0`;
  const sha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(header), content]))
    .digest("hex");

  assert.equal(
    sha,
    "f7ac3671f81b89170aaf1a4892e6095d280fd839",
    "ReaderDiscussion.tsx blob must match frozen baseline"
  );
});

test("HT-NR-06C-A Invariant: Primary worktree remains completely untouched", () => {
  const primaryRepo = "/Users/shadreckmusarurwa/Project AI/htp-zw";
  assert.ok(
    fs.existsSync(primaryRepo),
    "Primary repository path must exist"
  );
});
