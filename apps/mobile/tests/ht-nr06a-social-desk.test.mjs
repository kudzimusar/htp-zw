import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function readRepo(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

// Load security capabilities module
const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  HEALTH_TIMES_CAPABILITIES,
  SOCIAL_DESK_CAPABILITIES,
  hasServerCapability,
  hasAnyServerCapability,
  hasSocialDeskAccess
} = capabilitiesModule;

// Load domain models & validator
const modelsModule = loadTs("src/domain/models.ts");
const { validateSocialDraftCreateInput } = modelsModule;

// Load newsroom social service
const socialServiceModule = loadTs("src/services/newsroom-social.ts", {
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
  NewsroomSocialError,
  isValidUuid,
  mapNewsroomSocialAccountRow,
  mapNewsroomSocialPostRow,
  mapNewsroomSocialPublicationAttemptRow,
  mapPrepareSocialPublishResponse,
  createNewsroomSocialService
} = socialServiceModule;

// Load preview data
const previewDataModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: {} } },
    "../platform/config": { appEnvironment: "staging" }
  }
});
const {
  buildPreviewSocialAccounts,
  buildPreviewSocialPosts,
  buildPreviewSocialAttempts
} = previewDataModule;

// ============================================================================
// 1. MIGRATION DISCIPLINE & FROZEN AUTHORITY
// ============================================================================

test("HT-NR-06A Section 3/9: repository migration count is 74 at HT-NR-06C-A authority", () => {
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
    migrationFiles.includes("20261017030000_ht_nr05db_r1_stream_integrity.sql")
  );
  assert.ok(
    migrationFiles.includes("20261017020000_ht_nr06b_campaign_read_authority.sql")
  );
});

test("HT-NR-06A Section 4/5/6/7: existing COM-01 migration defines social tables, RLS, and RPCs", () => {
  const com01Sql = readRepo("supabase/migrations/20260922094527_com01_communications_domain.sql");
  assert.match(com01Sql, /create table public\.social_accounts/i);
  assert.match(com01Sql, /create table public\.social_posts/i);
  assert.match(com01Sql, /create table public\.social_publication_attempts/i);
  assert.match(com01Sql, /communications_create_social_draft/i);
  assert.match(com01Sql, /communications_approve_social_post/i);
  assert.match(com01Sql, /communications_prepare_social_publish/i);
  assert.match(
    com01Sql,
    /revoke execute on function public\.communications_record_social_result\(uuid,boolean,text,jsonb\) from public,anon,authenticated;/i
  );
});

test("HT-NR-06A Section 2: frozen blobs remain untouched", () => {
  const ca01TestHash = execSync(
    "git rev-parse HEAD:apps/mobile/tests/ca01-communications.test.mjs",
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();
  const readerDiscussionHash = execSync(
    "git rev-parse HEAD:apps/mobile/src/ui/ReaderDiscussion.tsx",
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();

  assert.equal(ca01TestHash, "3af2f6988acf91b4118771a8fc15333af44c2fc7");
  assert.equal(readerDiscussionHash, "f7ac3671f81b89170aaf1a4892e6095d280fd839");

  const workingStatus = execSync(
    "git status --porcelain apps/mobile/tests/ca01-communications.test.mjs apps/mobile/src/ui/ReaderDiscussion.tsx",
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();
  assert.equal(workingStatus, "");
});

// ============================================================================
// 2. CAPABILITY RECONCILIATION & SCOPED SOCIAL AUTHORITY
// ============================================================================

test("HT-NR-06A Section 10/11: capabilities.ts registers canonical social capabilities and removes analytics.view as Social Desk authority", () => {
  assert.deepEqual(SOCIAL_DESK_CAPABILITIES, [
    "social.compose",
    "social.approve",
    "social.publish",
    "social.manage_accounts"
  ]);

  for (const cap of SOCIAL_DESK_CAPABILITIES) {
    assert.ok(
      HEALTH_TIMES_CAPABILITIES.includes(cap),
      `Expected HEALTH_TIMES_CAPABILITIES to include ${cap}`
    );
  }

  // Verify each of the 4 social capabilities grants Social Desk access when server-authorized
  for (const cap of SOCIAL_DESK_CAPABILITIES) {
    const snap = {
      status: "authorized",
      source: "server",
      userId: "00000000-0000-4000-8000-000000000101",
      staffStatus: "active",
      roles: ["social_editor"],
      capabilities: [cap],
      reason: "Server-authorized."
    };
    assert.equal(hasSocialDeskAccess(snap), true, `Expected ${cap} to grant Social Desk access`);
    assert.equal(hasAnyServerCapability(snap, SOCIAL_DESK_CAPABILITIES), true);
  }

  // Verify analytics.view alone does NOT grant Social Desk access
  const analyticsOnlySnap = {
    status: "authorized",
    source: "server",
    userId: "00000000-0000-4000-8000-000000000101",
    staffStatus: "active",
    roles: ["analyst"],
    capabilities: ["analytics.view"],
    reason: "Server-authorized."
  };
  assert.equal(hasSocialDeskAccess(analyticsOnlySnap), false);
  assert.equal(hasAnyServerCapability(analyticsOnlySnap, SOCIAL_DESK_CAPABILITIES), false);

  // Verify client/non-server or unauthenticated snapshots are rejected even if capabilities array is populated
  const forgedClientSnap = {
    status: "authorized",
    source: "none",
    userId: "00000000-0000-4000-8000-000000000101",
    staffStatus: "active",
    roles: ["admin"],
    capabilities: ["social.compose", "social.approve", "social.publish", "social.manage_accounts"],
    reason: "Forged."
  };
  assert.equal(hasSocialDeskAccess(forgedClientSnap), false);
  assert.equal(hasAnyServerCapability(forgedClientSnap, SOCIAL_DESK_CAPABILITIES), false);
});

// ============================================================================
// 3. DOMAIN VALIDATION
// ============================================================================

test("HT-NR-06A Section 12: validateSocialDraftCreateInput enforces story UUID, provider, body, and optional account UUID", () => {
  const validStoryId = "00000000-0000-4000-8000-000000001001";
  const validAccountId = "f1000000-0000-4000-a000-000000000001";

  // Valid payload with socialAccountId
  assert.deepEqual(
    validateSocialDraftCreateInput({
      storyId: validStoryId,
      provider: "x",
      body: "Breaking health policy update from Harare.",
      socialAccountId: validAccountId
    }),
    { valid: true }
  );

  // Valid payload with null socialAccountId
  assert.deepEqual(
    validateSocialDraftCreateInput({
      storyId: validStoryId,
      provider: "facebook",
      body: "Provincial clinic cold-chain update.",
      socialAccountId: null
    }),
    { valid: true }
  );

  // Invalid storyId
  const badStory = validateSocialDraftCreateInput({
    storyId: "not-a-uuid",
    provider: "x",
    body: "Valid body"
  });
  assert.equal(badStory.valid, false);
  assert.match(badStory.error, /story selection is required/i);

  // Empty provider
  const emptyProvider = validateSocialDraftCreateInput({
    storyId: validStoryId,
    provider: "   ",
    body: "Valid body"
  });
  assert.equal(emptyProvider.valid, false);
  assert.match(emptyProvider.error, /provider/i);

  // Empty body
  const emptyBody = validateSocialDraftCreateInput({
    storyId: validStoryId,
    provider: "x",
    body: "   "
  });
  assert.equal(emptyBody.valid, false);
  assert.match(emptyBody.error, /body is required/i);

  // Oversized body (> 10000 chars)
  const hugeBody = validateSocialDraftCreateInput({
    storyId: validStoryId,
    provider: "x",
    body: "a".repeat(10001)
  });
  assert.equal(hugeBody.valid, false);
  assert.match(hugeBody.error, /10,000/);

  // Invalid socialAccountId
  const badAccount = validateSocialDraftCreateInput({
    storyId: validStoryId,
    provider: "x",
    body: "Valid body",
    socialAccountId: "invalid-account-id"
  });
  assert.equal(badAccount.valid, false);
  assert.match(badAccount.error, /social account/i);
});

// ============================================================================
// 4. ROW MAPPERS & SAFE DATA PROJECTION
// ============================================================================

test("HT-NR-06A Section 15/21: mapNewsroomSocialAccountRow validates fields and never exposes metadata JSON", () => {
  const validRow = {
    id: "f1000000-0000-4000-a000-000000000001",
    provider: "X",
    account_label: "  @HealthTimesZW Official  ",
    provider_account_id: "  ht_x_01 ",
    environment: "staging",
    status: "unconfigured",
    metadata: { secret_webhook_hint: "do-not-expose", token_ref: "vault_123" },
    created_at: "2026-10-16T08:00:00.000Z",
    updated_at: "2026-10-16T09:00:00.000Z"
  };

  const mapped = mapNewsroomSocialAccountRow(validRow);
  assert.ok(mapped);
  assert.equal(mapped.id, "f1000000-0000-4000-a000-000000000001");
  assert.equal(mapped.provider, "x");
  assert.equal(mapped.accountLabel, "@HealthTimesZW Official");
  assert.equal(mapped.providerAccountId, "ht_x_01");
  assert.equal(mapped.environment, "staging");
  assert.equal(mapped.status, "unconfigured");
  assert.equal("metadata" in mapped, false, "Account mapper must not expose metadata JSON");

  // Reject invalid status or environment
  assert.equal(
    mapNewsroomSocialAccountRow({ ...validRow, status: "unknown_status" }),
    null
  );
  assert.equal(
    mapNewsroomSocialAccountRow({ ...validRow, environment: "dev" }),
    null
  );
  assert.equal(
    mapNewsroomSocialAccountRow({ ...validRow, id: "bad-id" }),
    null
  );
});

test("HT-NR-06A Section 15: mapNewsroomSocialPostRow validates all canonical post fields", () => {
  const validRow = {
    id: "f2000000-0000-4000-a000-000000000001",
    story_id: "00000000-0000-4000-8000-000000001001",
    social_account_id: "f1000000-0000-4000-a000-000000000001",
    provider: "Facebook",
    body: "  Story-linked social post body.  ",
    status: "approved",
    created_by: "00000000-0000-4000-8000-000000000101",
    approved_by: "00000000-0000-4000-8000-000000000201",
    approved_at: "2026-10-16T09:00:00.000Z",
    published_at: null,
    provider_post_id: null,
    created_at: "2026-10-16T08:00:00.000Z",
    updated_at: "2026-10-16T09:00:00.000Z"
  };

  const mapped = mapNewsroomSocialPostRow(validRow);
  assert.ok(mapped);
  assert.equal(mapped.id, "f2000000-0000-4000-a000-000000000001");
  assert.equal(mapped.storyId, "00000000-0000-4000-8000-000000001001");
  assert.equal(mapped.socialAccountId, "f1000000-0000-4000-a000-000000000001");
  assert.equal(mapped.provider, "facebook");
  assert.equal(mapped.body, "Story-linked social post body.");
  assert.equal(mapped.status, "approved");

  assert.equal(mapNewsroomSocialPostRow({ ...validRow, story_id: "invalid" }), null);
  assert.equal(mapNewsroomSocialPostRow({ ...validRow, body: "   " }), null);
  assert.equal(mapNewsroomSocialPostRow({ ...validRow, status: "queued" }), null);
});

test("HT-NR-06A Section 15/21: mapNewsroomSocialPublicationAttemptRow extracts bounded safeReason and never leaks raw provider_response", () => {
  const validRow = {
    id: "f3000000-0000-4000-a000-000000000001",
    social_post_id: "f2000000-0000-4000-a000-000000000001",
    attempted_by: "00000000-0000-4000-8000-000000000201",
    provider: "x",
    status: "unconfigured",
    provider_post_id: null,
    provider_response: {
      reason: "Provider account is not ready",
      raw_headers: { authorization: "Bearer secret" }
    },
    attempted_at: "2026-10-16T09:05:00.000Z",
    completed_at: "2026-10-16T09:05:00.000Z"
  };

  const mapped = mapNewsroomSocialPublicationAttemptRow(validRow);
  assert.ok(mapped);
  assert.equal(mapped.status, "unconfigured");
  assert.equal(mapped.safeReason, "Provider account is not ready");
  assert.equal("provider_response" in mapped, false);
  assert.equal("providerResponse" in mapped, false);

  // Bounded reason slicing (max 160 chars)
  const longReasonRow = {
    ...validRow,
    provider_response: { reason: "R".repeat(300) }
  };
  const mappedLong = mapNewsroomSocialPublicationAttemptRow(longReasonRow);
  assert.ok(mappedLong);
  assert.equal(mappedLong.safeReason.length, 160);
});

test("HT-NR-06A Section 15: mapPrepareSocialPublishResponse validates RPC handoff payload", () => {
  const validPayload = {
    attempt_id: "f3000000-0000-4000-a000-000000000001",
    provider: "X",
    body: "Story-linked social copy.",
    provider_ready: false
  };
  const mapped = mapPrepareSocialPublishResponse(validPayload);
  assert.deepEqual(mapped, {
    attemptId: "f3000000-0000-4000-a000-000000000001",
    provider: "x",
    body: "Story-linked social copy.",
    providerReady: false
  });

  assert.equal(mapPrepareSocialPublishResponse(null), null);
  assert.equal(
    mapPrepareSocialPublishResponse({ ...validPayload, attempt_id: "bad-uuid" }),
    null
  );
  assert.equal(
    mapPrepareSocialPublishResponse({ ...validPayload, provider_ready: "false" }),
    null
  );
});

// ============================================================================
// 5. SERVICE ENVELOPE TRUTH & CANONICAL RPC INVOCATION
// ============================================================================

function createMockQueryClient(queryResponder, rpcResponder) {
  const calls = { queries: [], rpcs: [] };
  return {
    calls,
    from(table) {
      const state = { table, selects: [], filters: [], orders: [], limitVal: null };
      const builder = {
        select(cols) {
          state.selects.push(cols);
          return builder;
        },
        eq(col, val) {
          state.filters.push({ col, val });
          return builder;
        },
        order(col, opts) {
          state.orders.push({ col, opts });
          return builder;
        },
        limit(n) {
          state.limitVal = n;
          return builder;
        },
        then(resolve, reject) {
          calls.queries.push(state);
          return Promise.resolve(queryResponder(state)).then(resolve, reject);
        }
      };
      return builder;
    },
    async rpc(name, args) {
      calls.rpcs.push({ name, args });
      return rpcResponder(name, args);
    }
  };
}

test("HT-NR-06A Section 16: listAccounts, listPosts, and listPublicationAttempts enforce envelope truth ([], [valid, malformed], [malformed], non-array)", async () => {
  const validAccountRow = {
    id: "f1000000-0000-4000-a000-000000000001",
    provider: "x",
    account_label: "@HealthTimesZW",
    provider_account_id: null,
    environment: "staging",
    status: "unconfigured",
    created_at: "2026-10-16T08:00:00.000Z",
    updated_at: "2026-10-16T08:00:00.000Z"
  };

  // 1. Empty array -> []
  const emptyClient = createMockQueryClient(() => ({ data: [], error: null }), () => ({}));
  const emptySvc = createNewsroomSocialService(emptyClient);
  assert.deepEqual(await emptySvc.listAccounts(), []);
  assert.deepEqual(await emptySvc.listPosts(), []);
  assert.deepEqual(
    await emptySvc.listPublicationAttempts("f2000000-0000-4000-a000-000000000001"),
    []
  );

  // 2. Mixed [valid, malformed] -> [valid]
  const mixedClient = createMockQueryClient(
    () => ({ data: [validAccountRow, { id: "bad-row" }], error: null }),
    () => ({})
  );
  const mixedSvc = createNewsroomSocialService(mixedClient);
  const accounts = await mixedSvc.listAccounts();
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].id, validAccountRow.id);

  // 3. All malformed -> throws MALFORMED_DATA
  const malformedClient = createMockQueryClient(
    () => ({ data: [{ id: "bad-row" }], error: null }),
    () => ({})
  );
  const malformedSvc = createNewsroomSocialService(malformedClient);
  await assert.rejects(
    () => malformedSvc.listAccounts(),
    (err) => err instanceof NewsroomSocialError && err.code === "MALFORMED_DATA"
  );
  await assert.rejects(
    () => malformedSvc.listPosts(),
    (err) => err instanceof NewsroomSocialError && err.code === "MALFORMED_DATA"
  );
  await assert.rejects(
    () => malformedSvc.listPublicationAttempts("f2000000-0000-4000-a000-000000000001"),
    (err) => err instanceof NewsroomSocialError && err.code === "MALFORMED_DATA"
  );

  // 4. Non-array -> throws MALFORMED_ENVELOPE
  const nonArrayClient = createMockQueryClient(
    () => ({ data: { unexpected: true }, error: null }),
    () => ({})
  );
  const nonArraySvc = createNewsroomSocialService(nonArrayClient);
  await assert.rejects(
    () => nonArraySvc.listAccounts(),
    (err) => err instanceof NewsroomSocialError && err.code === "MALFORMED_ENVELOPE"
  );
});

test("HT-NR-06A Section 14/20: createDraft, approvePost, and preparePublish call only canonical client RPCs and never call communications_record_social_result", async () => {
  const storyId = "00000000-0000-4000-8000-000000001001";
  const accountId = "f1000000-0000-4000-a000-000000000001";
  const postId = "f2000000-0000-4000-a000-000000000001";
  const attemptId = "f3000000-0000-4000-a000-000000000001";

  const mockClient = createMockQueryClient(
    () => ({ data: [], error: null }),
    (name) => {
      if (name === "communications_create_social_draft") {
        return { data: postId, error: null };
      }
      if (name === "communications_approve_social_post") {
        return { data: null, error: null };
      }
      if (name === "communications_prepare_social_publish") {
        return {
          data: {
            attempt_id: attemptId,
            provider: "x",
            body: "Verified copy",
            provider_ready: false
          },
          error: null
        };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    }
  );

  const svc = createNewsroomSocialService(mockClient);

  const createdId = await svc.createDraft({
    storyId,
    provider: "X",
    body: "  Verified copy  ",
    socialAccountId: accountId
  });
  assert.equal(createdId, postId);

  await svc.approvePost(postId);

  const prepared = await svc.preparePublish(postId);
  assert.deepEqual(prepared, {
    attemptId,
    provider: "x",
    body: "Verified copy",
    providerReady: false
  });

  assert.deepEqual(
    mockClient.calls.rpcs.map((c) => c.name),
    [
      "communications_create_social_draft",
      "communications_approve_social_post",
      "communications_prepare_social_publish"
    ]
  );
  assert.deepEqual(mockClient.calls.rpcs[0].args, {
    p_story_id: storyId,
    p_provider: "x",
    p_body: "Verified copy",
    p_social_account_id: accountId
  });
  assert.deepEqual(mockClient.calls.rpcs[1].args, {
    p_social_post_id: postId
  });
  assert.deepEqual(mockClient.calls.rpcs[2].args, {
    p_social_post_id: postId
  });
});

// ============================================================================
// 6. CLIENT BOUNDARY & ROUTE CONVERGENCE INSPECTIONS
// ============================================================================

test("HT-NR-06A Section 8/13/14: client code never references communications_record_social_result or direct table mutations on social tables", () => {
  const socialServiceSrc = read("src/services/newsroom-social.ts");
  const socialDeskSrc = read("src/ui/StudioSocialDesk.tsx");
  const contractsSrc = read("src/domain/contracts.ts");

  assert.equal(
    socialServiceSrc.includes("communications_record_social_result"),
    false,
    "Client service must not reference communications_record_social_result"
  );
  assert.equal(
    socialDeskSrc.includes("communications_record_social_result"),
    false,
    "StudioSocialDesk UI must not reference communications_record_social_result"
  );
  assert.equal(
    contractsSrc.includes("recordPublishResult"),
    false,
    "Contracts must not expose recordPublishResult"
  );

  // Ensure no direct table write calls exist in newsroom-social.ts
  for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete("]) {
    assert.equal(
      socialServiceSrc.includes(forbidden),
      false,
      `newsroom-social.ts must not contain direct table write ${forbidden}`
    );
  }
});

test("HT-NR-06A Section 11/17/18/19/20/21: /studio/social route and StudioSocialDesk UI enforce capability separation and honest provider handoff", () => {
  const moduleRouteSrc = read("app/studio/[module].tsx");
  const studioUiSrc = read("src/ui/Studio.tsx");
  const socialDeskSrc = read("src/ui/StudioSocialDesk.tsx");

  // 1. /studio/social uses SOCIAL_DESK_CAPABILITIES via StudioAnyCapabilityGate, not analytics.view
  assert.ok(moduleRouteSrc.includes("anyOfCapabilities:SOCIAL_DESK_CAPABILITIES"));
  assert.equal(
    moduleRouteSrc.includes('"social":{title:"Social Desk",owner:"AG-05 + AG-06",capability:"analytics.view"'),
    false
  );
  assert.ok(moduleRouteSrc.includes('String(module)==="social" && <StudioSocialDesk />'));
  assert.ok(studioUiSrc.includes("export function StudioAnyCapabilityGate"));

  // 2. Honest empty state and provider configuration notice
  assert.ok(socialDeskSrc.includes("No social provider accounts are configured."));
  assert.ok(
    socialDeskSrc.includes("Account configuration is controlled by provider integration.")
  );

  // 3. Honest preparePublish feedback messages
  assert.ok(
    socialDeskSrc.includes("Provider not configured — publication was not sent.")
  );
  assert.ok(socialDeskSrc.includes("Publication handoff prepared."));

  // 4. Separate Approve Draft vs Prepare Publication actions
  assert.ok(socialDeskSrc.includes('capabilities.canApprove && selectedPost.status === "draft"'));
  assert.ok(
    socialDeskSrc.includes('capabilities.canPublish && selectedPost.status === "approved"')
  );
  assert.ok(socialDeskSrc.includes("Approve Draft"));
  assert.ok(socialDeskSrc.includes("Prepare Publication"));
});

test("HT-NR-06A Section 22/23: Owner Preview Social Desk data and route are wired and isolated", () => {
  const previewAccounts = buildPreviewSocialAccounts();
  const previewPosts = buildPreviewSocialPosts();
  const previewAttempts = buildPreviewSocialAttempts();

  assert.ok(previewAccounts.length >= 3);
  assert.ok(previewPosts.length >= 4);
  assert.ok(Object.keys(previewAttempts).length >= 3);

  const ownerPreviewModuleRoute = read("app/owner-preview/studio/[module].tsx");
  const ownerPreviewStudioSrc = read("src/preview/OwnerPreviewStudio.tsx");

  assert.ok(ownerPreviewModuleRoute.includes('"social"'));
  assert.ok(ownerPreviewStudioSrc.includes('case "social":'));
  assert.ok(ownerPreviewStudioSrc.includes("<OwnerPreviewSocialDeskView />"));
});
