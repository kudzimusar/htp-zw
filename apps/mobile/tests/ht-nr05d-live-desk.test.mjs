import assert from "node:assert/strict";
import crypto from "node:crypto";
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

// Load domain models & validators
const models = loadTs("src/domain/models.ts");
const {
  validateLiveCoverageCreateInput,
  validateLiveCoveragePatch
} = models;

// Load preview data
const previewData = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: {} } },
    "../platform/config": { appEnvironment: "staging" }
  }
});
const { buildPreviewLiveCoverage } = previewData;

// Load UI module
const uiModule = loadTs("src/ui/StudioLiveDesk.tsx", {
  mocks: {
    react: {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useMemo: (fn) => fn(),
      useEffect: () => {},
      useCallback: (fn) => fn
    },
    "react-native": {
      View: "View",
      Text: "Text",
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      TextInput: "TextInput",
      Image: "Image",
      StyleSheet: { create: (s) => s },
      useWindowDimensions: () => ({ width: 1200, height: 800 })
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      SafeAreaView: "SafeAreaView",
      SafeAreaProvider: "SafeAreaProvider"
    },
    "expo-router": {
      useRouter: () => ({ push: () => {}, replace: () => {} })
    },
    "../services": {
      services: {
        authorization: {
          getSnapshot: () => ({
            status: "authorized",
            source: "server",
            staffProfileId: "00000000-0000-4000-8000-000000000001",
            capabilities: ["story.publish"],
            reason: "Authorized session"
          })
        },
        newsroomLive: {
          listCoverage: async () => [],
          createCoverage: async () => "d1000000-0000-4000-b000-000000000001",
          saveCoverage: async () => 2,
          startCoverage: async () => 2,
          endCoverage: async () => 2
        },
        newsroomStories: {
          listStories: async () => []
        },
        newsroomMedia: {
          listMedia: async () => []
        }
      }
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props })
    }
  }
});
const {
  hasLiveDeskAuthority,
  StudioLiveDeskView,
  StudioLiveDesk
} = uiModule;

// Load newsroom live coverage service
let mockNewsroomRpcHandler = null;
const newsroomLiveServiceModule = loadTs("src/services/newsroom-live.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        rpc: (fn, args) => {
          if (mockNewsroomRpcHandler) return mockNewsroomRpcHandler(fn, args);
          return Promise.resolve({ data: null, error: null });
        }
      })
    }
  }
});
const {
  mapNewsroomLiveCoverageRow,
  createNewsroomLiveCoverageService,
  stagingNewsroomLiveCoverageService
} = newsroomLiveServiceModule;

// Load public live service
let mockPublicRpcHandler = null;
const publicLiveModule = loadTs("src/services/public-live.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        rpc: (fn, args) => {
          if (mockPublicRpcHandler) return mockPublicRpcHandler(fn, args);
          return Promise.resolve({ data: null, error: null });
        }
      })
    }
  }
});
const {
  PublicLiveError,
  mapPublicLiveRow,
  createPublicLiveService,
  publicLiveService
} = publicLiveModule;

// =============================================================================
// 1. EXACT INVARIANTS & CUSTODY PRESERVATION
// =============================================================================

test("HT-NR-05D-A Invariant: Repository migration count is exactly 70", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.strictEqual(
    files.length,
    70,
    `Migration count must be exactly 70 (69 prior + 05D-A live desk foundation). Found ${files.length}.`
  );
  assert.ok(
    files.includes("20261017010000_ht_nr05da_live_desk_foundation.sql"),
    "Migration directory must contain 20261017010000_ht_nr05da_live_desk_foundation.sql"
  );
});

test("HT-NR-05D-A Invariant: Remote parent authority is exact fd0b999d6169a62491200ff0d8d657748ee857f4", () => {
  const remoteRef = execSync("git rev-parse origin/feat/ht-nr05cb-public-watch-delivery", {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
  assert.strictEqual(
    remoteRef,
    "fd0b999d6169a62491200ff0d8d657748ee857f4",
    "Remote parent branch origin/feat/ht-nr05cb-public-watch-delivery must be fd0b999d6169a62491200ff0d8d657748ee857f4"
  );
});

test("HT-NR-05D-A Invariant: Primary repository is untouched", () => {
  const primaryRepo = "/Users/shadreckmusarurwa/Project AI/htp-zw";
  if (fs.existsSync(primaryRepo)) {
    const status = execSync("git status --porcelain", { cwd: primaryRepo, encoding: "utf8" }).trim();
    assert.strictEqual(status, "", `Primary repository must be clean, found:\n${status}`);
  }
});

test("HT-NR-05D-A Invariant: Reader Live route freeze preserves exact blob aee9c0da414c8497a30b92173fbb679e8d9444d9", () => {
  const content = fs.readFileSync(path.join(root, "app/(reader)/live.tsx"));
  const header = `blob ${content.length}\0`;
  const sha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(header), content]))
    .digest("hex");
  assert.strictEqual(
    sha,
    "aee9c0da414c8497a30b92173fbb679e8d9444d9",
    `Reader Live route must remain exact frozen blob aee9c0da414c8497a30b92173fbb679e8d9444d9, got ${sha}`
  );
});

test("HT-NR-05D-A Invariant: CA-01 test and ReaderDiscussion remain exact frozen blobs", () => {
  const ca01Content = fs.readFileSync(path.join(root, "tests/ca01-communications.test.mjs"));
  const ca01Header = `blob ${ca01Content.length}\0`;
  const ca01Sha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(ca01Header), ca01Content]))
    .digest("hex");
  assert.strictEqual(
    ca01Sha,
    "3af2f6988acf91b4118771a8fc15333af44c2fc7",
    `CA-01 test must remain exact frozen blob 3af2f6988acf91b4118771a8fc15333af44c2fc7, got ${ca01Sha}`
  );

  const rdContent = fs.readFileSync(path.join(root, "src/ui/ReaderDiscussion.tsx"));
  const rdHeader = `blob ${rdContent.length}\0`;
  const rdSha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(rdHeader), rdContent]))
    .digest("hex");
  assert.strictEqual(
    rdSha,
    "f7ac3671f81b89170aaf1a4892e6095d280fd839",
    `ReaderDiscussion must remain exact frozen blob f7ac3671f81b89170aaf1a4892e6095d280fd839, got ${rdSha}`
  );
});

// =============================================================================
// 2. MIGRATION 70 SCHEMA & RPC CONTRACT VERIFICATION
// =============================================================================

test("HT-NR-05D-A Migration 70: Schema additions and index definitions", () => {
  const migrationSql = readRepo("supabase/migrations/20261017010000_ht_nr05da_live_desk_foundation.sql");

  // Table creation & constraints
  assert.ok(
    migrationSql.includes("create table if not exists public.newsroom_live_coverage"),
    "Migration must create newsroom_live_coverage table"
  );
  assert.ok(
    migrationSql.includes("kind in ('live-blog', 'scheduled')"),
    "kind constraint must allow live-blog and scheduled"
  );
  assert.ok(
    migrationSql.includes("status in ('upcoming', 'live', 'ended')"),
    "status constraint must allow upcoming, live, ended"
  );
  assert.ok(
    migrationSql.includes("default 'upcoming'"),
    "status must default to upcoming"
  );
  assert.ok(
    migrationSql.includes("lock_version bigint not null default 1"),
    "lock_version must be bigint not null default 1"
  );

  // Indexes
  assert.ok(
    migrationSql.includes("newsroom_live_coverage_status_idx"),
    "Must create status index"
  );
  assert.ok(
    migrationSql.includes("newsroom_live_coverage_related_story_idx"),
    "Must create related story index"
  );
  assert.ok(
    migrationSql.includes("newsroom_live_coverage_media_idx"),
    "Must create media index"
  );
  assert.ok(
    migrationSql.includes("newsroom_live_coverage_updated_at_idx"),
    "Must create updated_at index"
  );

  // RLS
  assert.ok(
    migrationSql.includes("alter table public.newsroom_live_coverage enable row level security"),
    "RLS must be enabled on newsroom_live_coverage"
  );
});

test("HT-NR-05D-A Migration 70: Operational & Public RPC functions and capabilities", () => {
  const migrationSql = readRepo("supabase/migrations/20261017010000_ht_nr05da_live_desk_foundation.sql");

  // Operational RPCs
  assert.ok(
    migrationSql.includes("create or replace function public.newsroom_list_live_coverage"),
    "Must define newsroom_list_live_coverage RPC"
  );
  assert.ok(
    migrationSql.includes("create or replace function public.newsroom_create_live_coverage"),
    "Must define newsroom_create_live_coverage RPC"
  );
  assert.ok(
    migrationSql.includes("create or replace function public.newsroom_save_live_coverage"),
    "Must define newsroom_save_live_coverage RPC"
  );
  assert.ok(
    migrationSql.includes("create or replace function public.newsroom_start_live_coverage"),
    "Must define newsroom_start_live_coverage RPC"
  );
  assert.ok(
    migrationSql.includes("create or replace function public.newsroom_end_live_coverage"),
    "Must define newsroom_end_live_coverage RPC"
  );

  // Public RPC
  assert.ok(
    migrationSql.includes("create or replace function public.newsroom_public_live_coverage"),
    "Must define newsroom_public_live_coverage RPC"
  );

  // Authority & Capability checks
  assert.ok(
    migrationSql.includes("story.publish"),
    "Operational RPCs must require story.publish capability"
  );
  assert.ok(
    migrationSql.includes("newsroom_session_authorized()"),
    "Operational RPCs must enforce server authorized session"
  );

  // Revoke from anon for operational RPCs
  assert.ok(
    migrationSql.includes("revoke execute on function public.newsroom_list_live_coverage") &&
    migrationSql.includes("from public, anon;"),
    "Must revoke list operational RPC from anon"
  );
  assert.ok(
    migrationSql.includes("revoke execute on function public.newsroom_create_live_coverage") &&
    migrationSql.includes("from public, anon;"),
    "Must revoke create operational RPC from anon"
  );
  assert.ok(
    migrationSql.includes("revoke execute on function public.newsroom_save_live_coverage") &&
    migrationSql.includes("from public, anon;"),
    "Must revoke save operational RPC from anon"
  );
  assert.ok(
    migrationSql.includes("revoke execute on function public.newsroom_start_live_coverage") &&
    migrationSql.includes("from public, anon;"),
    "Must revoke start operational RPC from anon"
  );
  assert.ok(
    migrationSql.includes("revoke execute on function public.newsroom_end_live_coverage") &&
    migrationSql.includes("from public, anon;"),
    "Must revoke end operational RPC from anon"
  );

  // Public projection grants
  assert.ok(
    migrationSql.includes("grant execute on function public.newsroom_public_live_coverage(integer) to anon, authenticated"),
    "Public RPC must be granted to anon, authenticated"
  );

  // Safe public media filter in public projection
  assert.ok(
    migrationSql.includes("'published'"),
    "Public projection must verify media is published"
  );
  assert.ok(
    migrationSql.includes("ma.public_storage_bucket = 'newsroom-public'"),
    "Public projection must verify media bucket is newsroom-public"
  );
  assert.ok(
    migrationSql.includes("ma.public_storage_key is not null"),
    "Public projection must verify media has public storage key"
  );
  assert.ok(
    migrationSql.includes("ma.public_url is not null"),
    "Public projection must verify media has public_url"
  );
  assert.ok(
    migrationSql.includes("c.status in ('live', 'upcoming')"),
    "Public projection must exclude ended coverage"
  );
});

// =============================================================================
// 3. DOMAIN VALIDATION (validateLiveCoverageCreateInput & validateLiveCoveragePatch)
// =============================================================================

test("HT-NR-05D-A Domain: validateLiveCoverageCreateInput allows valid inputs and rejects invalid", () => {
  const validInput = {
    title: "National Health Summit Opening Live Blog",
    kind: "live-blog",
    scheduledAt: "2026-10-18T10:00:00.000Z",
    relatedStoryId: "00000000-0000-4000-8000-000000000001",
    mediaId: "00000000-0000-4000-9000-000000000001",
    sourceProvenance: "Ministry of Health press gallery"
  };

  assert.strictEqual(validateLiveCoverageCreateInput(validInput).valid, true);

  // Valid scheduled kind
  assert.strictEqual(
    validateLiveCoverageCreateInput({ ...validInput, kind: "scheduled" }).valid,
    true
  );

  // Rejects live-video kind (reserved for future task)
  const videoKind = validateLiveCoverageCreateInput({ ...validInput, kind: "live-video" });
  assert.strictEqual(videoKind.valid, false);
  assert.match(videoKind.error, /live-blog or scheduled/);

  // Rejects empty/missing title
  assert.strictEqual(validateLiveCoverageCreateInput({ ...validInput, title: "" }).valid, false);
  assert.strictEqual(validateLiveCoverageCreateInput({ ...validInput, title: "   " }).valid, false);

  // Rejects empty/missing sourceProvenance
  assert.strictEqual(validateLiveCoverageCreateInput({ ...validInput, sourceProvenance: "" }).valid, false);

  // Rejects invalid scheduledAt timestamp
  assert.strictEqual(validateLiveCoverageCreateInput({ ...validInput, scheduledAt: "invalid-date" }).valid, false);

  // Rejects invalid UUID for relatedStoryId or mediaId
  assert.strictEqual(validateLiveCoverageCreateInput({ ...validInput, relatedStoryId: "bad-uuid" }).valid, false);
  assert.strictEqual(validateLiveCoverageCreateInput({ ...validInput, mediaId: "bad-uuid" }).valid, false);
});

test("HT-NR-05D-A Domain: validateLiveCoveragePatch restricts patchable fields", () => {
  const validPatch = {
    title: "Updated Coverage Title",
    scheduledAt: "2026-10-19T10:00:00.000Z",
    sourceProvenance: "Updated provenance"
  };

  assert.strictEqual(validateLiveCoveragePatch(validPatch).valid, true);

  // Empty patch rejected
  assert.strictEqual(validateLiveCoveragePatch({}).valid, false);

  // Forbidden fields rejected
  assert.strictEqual(validateLiveCoveragePatch({ status: "live" }).valid, false);
  assert.strictEqual(validateLiveCoveragePatch({ kind: "scheduled" }).valid, false);
  assert.strictEqual(validateLiveCoveragePatch({ lockVersion: 5 }).valid, false);
  assert.strictEqual(validateLiveCoveragePatch({ id: "00000000-0000-4000-8000-000000000001" }).valid, false);
  assert.strictEqual(validateLiveCoveragePatch({ startedAt: "2026-10-18T10:00:00Z" }).valid, false);
  assert.strictEqual(validateLiveCoveragePatch({ endedAt: "2026-10-18T12:00:00Z" }).valid, false);

  // Empty title rejected
  assert.strictEqual(validateLiveCoveragePatch({ title: "   " }).valid, false);

  // Empty sourceProvenance rejected
  assert.strictEqual(validateLiveCoveragePatch({ sourceProvenance: "   " }).valid, false);

  // Invalid scheduledAt rejected
  assert.strictEqual(validateLiveCoveragePatch({ scheduledAt: "not-a-timestamp" }).valid, false);
});

// =============================================================================
// 4. NEWSROOM LIVE ROW MAPPER & SERVICE CONTRACTS
// =============================================================================

test("HT-NR-05D-A Newsroom Mapper: mapNewsroomLiveCoverageRow maps valid rows and rejects invalid", () => {
  const row = {
    id: "d1000000-0000-4000-b000-000000000001",
    title: "Live Summit Coverage",
    kind: "live-blog",
    status: "live",
    scheduled_at: "2026-10-16T08:00:00.000Z",
    started_at: "2026-10-16T08:15:00.000Z",
    ended_at: null,
    related_story_id: "00000000-0000-4000-8000-000000000001",
    media_id: "00000000-0000-4000-9000-000000000001",
    source_provenance: "HealthTimes Summit Reporting Desk",
    lock_version: 3,
    created_by_staff_id: "00000000-0000-4000-8000-000000000010",
    updated_by_staff_id: "00000000-0000-4000-8000-000000000010",
    created_at: "2026-10-16T07:30:00.000Z",
    updated_at: "2026-10-16T08:15:00.000Z"
  };

  const mapped = mapNewsroomLiveCoverageRow(row);
  assert.ok(mapped);
  assert.strictEqual(mapped.id, "d1000000-0000-4000-b000-000000000001");
  assert.strictEqual(mapped.title, "Live Summit Coverage");
  assert.strictEqual(mapped.kind, "live-blog");
  assert.strictEqual(mapped.status, "live");
  assert.strictEqual(mapped.scheduledAt, "2026-10-16T08:00:00.000Z");
  assert.strictEqual(mapped.startedAt, "2026-10-16T08:15:00.000Z");
  assert.strictEqual(mapped.endedAt, null);
  assert.strictEqual(mapped.lockVersion, 3);

  // Fail-closed checks
  assert.strictEqual(mapNewsroomLiveCoverageRow(null), null);
  assert.strictEqual(mapNewsroomLiveCoverageRow({ ...row, id: "bad-id" }), null);
  assert.strictEqual(mapNewsroomLiveCoverageRow({ ...row, title: "" }), null);
  assert.strictEqual(mapNewsroomLiveCoverageRow({ ...row, kind: "live-video" }), null);
  assert.strictEqual(mapNewsroomLiveCoverageRow({ ...row, status: "unknown" }), null);
  assert.strictEqual(mapNewsroomLiveCoverageRow({ ...row, lock_version: 0 }), null);
  assert.strictEqual(mapNewsroomLiveCoverageRow({ ...row, scheduled_at: "bad-date" }), null);
  assert.strictEqual(mapNewsroomLiveCoverageRow({ ...row, started_at: "bad-date" }), null);
  assert.strictEqual(mapNewsroomLiveCoverageRow({ ...row, ended_at: "bad-date" }), null);
});

test("HT-NR-05D-A Newsroom Service: createCoverage, saveCoverage, startCoverage, endCoverage contracts", async () => {
  let lastRpc = null;
  let lastArgs = null;

  const mockClient = {
    rpc: async (fn, args) => {
      lastRpc = fn;
      lastArgs = args;
      if (fn === "newsroom_create_live_coverage") {
        return { data: "d1000000-0000-4000-b000-000000000099", error: null };
      }
      if (fn === "newsroom_save_live_coverage") {
        return { data: 4, error: null };
      }
      if (fn === "newsroom_start_live_coverage") {
        return { data: 5, error: null };
      }
      if (fn === "newsroom_end_live_coverage") {
        return { data: 6, error: null };
      }
      if (fn === "newsroom_list_live_coverage") {
        return { data: [], error: null };
      }
      return { data: null, error: { message: "Unknown RPC" } };
    }
  };

  const service = createNewsroomLiveCoverageService(mockClient);

  // createCoverage
  const createdId = await service.createCoverage({
    title: "New Scheduled Briefing",
    kind: "scheduled",
    sourceProvenance: "Press pool desk"
  });
  assert.strictEqual(createdId, "d1000000-0000-4000-b000-000000000099");
  assert.strictEqual(lastRpc, "newsroom_create_live_coverage");
  assert.strictEqual(lastArgs.p_input.title, "New Scheduled Briefing");

  // saveCoverage
  const nextVerSave = await service.saveCoverage(
    "d1000000-0000-4000-b000-000000000099",
    3,
    { title: "Renamed Scheduled Briefing" }
  );
  assert.strictEqual(nextVerSave, 4);
  assert.strictEqual(lastRpc, "newsroom_save_live_coverage");
  assert.strictEqual(lastArgs.p_expected_version, 3);
  assert.strictEqual(lastArgs.p_patch.title, "Renamed Scheduled Briefing");

  // startCoverage
  const nextVerStart = await service.startCoverage(
    "d1000000-0000-4000-b000-000000000099",
    4
  );
  assert.strictEqual(nextVerStart, 5);
  assert.strictEqual(lastRpc, "newsroom_start_live_coverage");
  assert.strictEqual(lastArgs.p_expected_version, 4);

  // endCoverage
  const nextVerEnd = await service.endCoverage(
    "d1000000-0000-4000-b000-000000000099",
    5
  );
  assert.strictEqual(nextVerEnd, 6);
  assert.strictEqual(lastRpc, "newsroom_end_live_coverage");
  assert.strictEqual(lastArgs.p_expected_version, 5);
});

// =============================================================================
// 5. PUBLIC LIVE ROW MAPPER & SERVICE CONTRACTS
// =============================================================================

test("HT-NR-05D-A Public Mapper: mapPublicLiveRow constructs canonical LiveItem and enforces safety", () => {
  const row = {
    id: "d1000000-0000-4000-b000-000000000001",
    title: "Live Summit Coverage",
    kind: "live-blog",
    status: "live",
    scheduled_at: "2026-10-16T08:00:00.000Z",
    started_at: "2026-10-16T08:15:00.000Z",
    updated_at: "2026-10-16T08:30:00.000Z",
    media_id: "00000000-0000-4000-9000-000000000001",
    media_public_url: "https://cdn.healthtimes.co.zw/media/summit.jpg",
    media_alt_text: "Health ministers onstage",
    media_caption: "Minister delivers address",
    media_credit: "HealthTimes"
  };

  const item = mapPublicLiveRow(row);
  assert.ok(item);
  assert.strictEqual(item.id, "d1000000-0000-4000-b000-000000000001");
  assert.strictEqual(item.title, "Live Summit Coverage");
  assert.strictEqual(item.kind, "live-blog");
  assert.strictEqual(item.status, "live");
  assert.strictEqual(item.updatedAt, "2026-10-16T08:30:00.000Z");

  // Media projected
  assert.ok(item.media);
  assert.strictEqual(item.media.publicUrl, "https://cdn.healthtimes.co.zw/media/summit.jpg");
  assert.strictEqual(item.media.altText, "Health ministers onstage");
  assert.strictEqual(item.media.sourceProvenance.system, "healthtimes-native");

  // Provenance has no private staff IDs or lock_version
  assert.strictEqual(item.sourceProvenance.system, "healthtimes-native");
  assert.strictEqual(item.sourceProvenance.sourceId, "d1000000-0000-4000-b000-000000000001");
  assert.strictEqual(item.sourceProvenance.stableKey, "newsroom-live:d1000000-0000-4000-b000-000000000001");

  // Fail-closed checks
  assert.strictEqual(mapPublicLiveRow(null), null);
  assert.strictEqual(mapPublicLiveRow({ ...row, id: "bad-id" }), null);
  assert.strictEqual(mapPublicLiveRow({ ...row, title: "   " }), null);
  assert.strictEqual(mapPublicLiveRow({ ...row, kind: "live-video" }), null);
  assert.strictEqual(mapPublicLiveRow({ ...row, status: "ended" }), null); // ended is excluded
  assert.strictEqual(mapPublicLiveRow({ ...row, updated_at: "bad-date" }), null);

  // If media URL is insecure HTTP, media is omitted (returns null media)
  const insecureMedia = mapPublicLiveRow({ ...row, media_public_url: "http://insecure.com/pic.jpg" });
  assert.ok(insecureMedia);
  assert.strictEqual(insecureMedia.media, null);
});

test("HT-NR-05D-A Public Service: list returns mapped items, empty on empty, and throws on error", async () => {
  // Empty data -> returns []
  const emptyService = createPublicLiveService({
    rpc: async (fn) => {
      assert.strictEqual(fn, "newsroom_public_live_coverage");
      return { data: [], error: null };
    }
  });
  const emptyList = await emptyService.list();
  assert.deepStrictEqual(emptyList, []);

  // Valid data -> returns mapped items
  const validService = createPublicLiveService({
    rpc: async () => ({
      data: [
        {
          id: "d1000000-0000-4000-b000-000000000001",
          title: "Public Live Event",
          kind: "live-blog",
          status: "live",
          updated_at: "2026-10-16T12:00:00.000Z",
          media_id: null,
          media_public_url: null,
          media_alt_text: null,
          media_caption: null,
          media_credit: null
        }
      ],
      error: null
    })
  });
  const validList = await validService.list();
  assert.strictEqual(validList.length, 1);
  assert.strictEqual(validList[0].id, "d1000000-0000-4000-b000-000000000001");
  assert.strictEqual(validList[0].status, "live");

  // RPC error -> throws PublicLiveError
  const rpcErrorService = createPublicLiveService({
    rpc: async () => ({ data: null, error: { message: "Database down" } })
  });
  await assert.rejects(
    () => rpcErrorService.list(),
    (err) => err instanceof PublicLiveError && err.code === "RPC_ERROR"
  );

  // Malformed envelope -> throws PublicLiveError
  const malformedService = createPublicLiveService({
    rpc: async () => ({ data: { notAnArray: true }, error: null })
  });
  await assert.rejects(
    () => malformedService.list(),
    (err) => err instanceof PublicLiveError && err.code === "MALFORMED_ENVELOPE"
  );

  // All malformed rows -> throws PublicLiveError
  const allBadRowsService = createPublicLiveService({
    rpc: async () => ({
      data: [{ id: "bad-1" }, { id: "bad-2" }],
      error: null
    })
  });
  await assert.rejects(
    () => allBadRowsService.list(),
    (err) => err instanceof PublicLiveError && err.code === "MALFORMED_DATA"
  );
});

// =============================================================================
// 6. OWNER PREVIEW & DOMAIN MODELS
// =============================================================================

test("HT-NR-05D-A Preview Data: buildPreviewLiveCoverage contains live, upcoming, and ended coverage", () => {
  const previewCoverage = buildPreviewLiveCoverage();
  assert.ok(Array.isArray(previewCoverage));
  assert.strictEqual(previewCoverage.length, 4);

  const live = previewCoverage.find((c) => c.status === "live");
  assert.ok(live, "Must have live preview item");
  assert.strictEqual(live.kind, "live-blog");
  assert.ok(live.startedAt);

  const upcomingBlog = previewCoverage.find((c) => c.status === "upcoming" && c.kind === "live-blog");
  assert.ok(upcomingBlog, "Must have upcoming live-blog preview item");

  const upcomingSched = previewCoverage.find((c) => c.status === "upcoming" && c.kind === "scheduled");
  assert.ok(upcomingSched, "Must have upcoming scheduled preview item");

  const ended = previewCoverage.find((c) => c.status === "ended");
  assert.ok(ended, "Must have ended preview item");
  assert.ok(ended.startedAt);
  assert.ok(ended.endedAt);
});

test("HT-NR-05D-A UI Components: StudioLiveDesk and StudioLiveDeskView exports", () => {
  assert.strictEqual(typeof StudioLiveDesk, "function");
  assert.strictEqual(typeof StudioLiveDeskView, "function");
  assert.strictEqual(typeof hasLiveDeskAuthority, "function");
});

test("HT-NR-05D-A Authority Helper: hasLiveDeskAuthority checks server and story.publish", () => {
  assert.strictEqual(
    hasLiveDeskAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["story.publish"]
    }),
    true
  );

  // Missing capability
  assert.strictEqual(
    hasLiveDeskAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["media.manage"]
    }),
    false
  );

  // Local/client source rejected
  assert.strictEqual(
    hasLiveDeskAuthority({
      status: "authorized",
      source: "client",
      capabilities: ["story.publish"]
    }),
    false
  );

  // Unauthorized status rejected
  assert.strictEqual(
    hasLiveDeskAuthority({
      status: "unauthorized",
      source: "server",
      capabilities: ["story.publish"]
    }),
    false
  );
});

test("HT-NR-05D-A Wiring: migratedCorpusServices uses publicLiveService", () => {
  const corpusContent = read("src/services/migrated-corpus.ts");
  assert.ok(
    corpusContent.includes("live: publicLiveService"),
    "migratedCorpusServices must wire publicLiveService to live"
  );
});

test("HT-NR-05D-A Routing: studio/[module].tsx maps live-desk to StudioLiveDesk", () => {
  const studioRoute = read("app/studio/[module].tsx");
  assert.ok(
    studioRoute.includes('"live-desk":'),
    "app/studio/[module].tsx must configure live-desk module"
  );
  assert.ok(
    studioRoute.includes('String(module)==="live-desk" && <StudioLiveDesk />'),
    "app/studio/[module].tsx must render StudioLiveDesk for live-desk"
  );
});
