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
  validateLiveUpdateCreateInput,
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
const { buildPreviewLiveCoverage, buildPreviewLiveUpdates } = previewData;

// Load newsroom live coverage service
const newsroomLiveServiceModule = loadTs("src/services/newsroom-live.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});
const {
  NewsroomLiveError,
  mapNewsroomLiveCoverageRow,
  mapNewsroomLiveUpdateRow,
  createNewsroomLiveCoverageService
} = newsroomLiveServiceModule;

// Load public live service
const publicLiveModule = loadTs("src/services/public-live.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});
const {
  PublicLiveError,
  mapPublicLiveRow,
  mapPublicLiveUpdateRow,
  createPublicLiveService
} = publicLiveModule;

// Load StudioLiveDesk UI module
const studioLiveUiModule = loadTs("src/ui/StudioLiveDesk.tsx", {
  mocks: {
    react: {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useMemo: (fn) => fn(),
      useEffect: () => {},
      useCallback: (fn) => fn,
      useRef: (val) => ({ current: val })
    },
    "react-native": {
      View: "View",
      Text: "Text",
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      TextInput: "TextInput",
      Image: "Image",
      StyleSheet: { create: (s) => s },
      useWindowDimensions: () => ({ width: 1280, height: 800 })
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
          endCoverage: async () => 2,
          listUpdates: async () => [],
          postUpdate: async () => "e1000000-0000-4000-b000-000000000001"
        },
        newsroomStories: { listStories: async () => [] },
        newsroomMedia: { listMedia: async () => [] }
      }
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
      Fragment: "Fragment"
    }
  }
});
const { StudioLiveDeskView } = studioLiveUiModule;

// Load Reader Live screen helpers
const readerLiveModule = loadTs("app/(reader)/live.tsx", {
  mocks: {
    react: {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useMemo: (fn) => fn(),
      useEffect: () => {},
      useCallback: (fn) => fn,
      useRef: (val) => ({ current: val })
    },
    "react-native": {
      View: "View",
      Text: "Text",
      Pressable: "Pressable",
      Image: "Image",
      StyleSheet: { create: (s) => s }
    },
    "expo-router": {
      useRouter: () => ({ push: () => {}, replace: () => {} }),
      useLocalSearchParams: () => ({})
    },
    "../../src/ui/Cards": {
      LiveRail: "LiveRail",
      AdSlot: "AdSlot",
      formatLiveUpdateCountLabel: (item) =>
        item.kind === "live-blog" && typeof item.updateCount === "number"
          ? item.updateCount === 1
            ? "1 update"
            : `${item.updateCount} updates`
          : null
    },
    "../../src/ui/Layout": {
      Chip: "Chip",
      EmptyState: "EmptyState",
      LoadingBlock: "LoadingBlock",
      Page: "Page",
      Section: "Section",
      SectionHeader: "SectionHeader"
    },
    "../../src/services": {
      services: {
        live: {
          list: async () => [],
          listUpdates: async () => []
        }
      }
    },
    "../../src/hooks/useAsync": {
      useAsync: () => ({ data: [], loading: false, error: null })
    },
    "../../src/theme/tokens": {
      radius: { sm: 4, md: 8 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }
    },
    "../../src/theme/AppearanceProvider": {
      useAppearance: () => ({
        palette: {
          live: "#C81E1E",
          ink: "#0F172A",
          inkMuted: "#475569",
          border: "#E2E8F0",
          paper: "#FFFFFF",
          paperMuted: "#F8FAFC",
          blue: "#1D4ED8"
        }
      })
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
      Fragment: "Fragment"
    }
  }
});
const {
  LIVE_BLOG_POLL_INTERVAL_MS,
  isValidLiveCoverageId,
  computeMaxStreamSeq,
  advanceLiveStreamCursor,
  mergeAndSortLiveUpdates
} = readerLiveModule;

// Helper to recursively collect all rendered text strings from a JSX tree
function collectText(node, out = []) {
  if (node === null || node === undefined || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return out;
  }
  if (typeof node === "object" && node.props) {
    collectText(node.props.children, out);
  }
  return out;
}

// =============================================================================
// SECTION 55 — CUSTODY, INVARIANTS & FROZEN BLOBS
// =============================================================================

test("HT-NR-05D-B-R1 Section 55: Repository migration count is at least 77", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 77, `Migration count must be at least 77. Found ${files.length}.`);
  assert.ok(
    files.includes("20261017010000_ht_nr05da_live_desk_foundation.sql"),
    "Migration 70 must remain present"
  );
  assert.ok(
    files.includes("20261017020000_ht_nr05db_live_blog_updates.sql"),
    "Migration 71 (20261017020000_ht_nr05db_live_blog_updates.sql) must remain present"
  );
  assert.ok(
    files.includes("20261017030000_ht_nr05db_r1_stream_integrity.sql"),
    "Migration 72 (20261017030000_ht_nr05db_r1_stream_integrity.sql) must be present"
  );
});

test("HT-NR-05D-B Section 55: Remote parent authority on origin/feat/ht-nr05da-live-desk-foundation is 04b75b4764034e174b55661bddbabdfc69b2bc28", () => {
  const remoteRef = execSync("git rev-parse origin/feat/ht-nr05da-live-desk-foundation", {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
  assert.strictEqual(
    remoteRef,
    "04b75b4764034e174b55661bddbabdfc69b2bc28",
    "Remote parent branch origin/feat/ht-nr05da-live-desk-foundation must remain at 04b75b4764034e174b55661bddbabdfc69b2bc28"
  );
});

test("HT-NR-05D-B Section 55: Primary repository /Users/shadreckmusarurwa/Project AI/htp-zw is untouched", () => {
  const primaryRepo = "/Users/shadreckmusarurwa/Project AI/htp-zw";
  if (fs.existsSync(primaryRepo)) {
    const status = execSync("git status --porcelain", { cwd: primaryRepo, encoding: "utf8" }).trim();
    assert.strictEqual(status, "", `Primary repository must be clean, found:\n${status}`);
  }
});

test("HT-NR-05D-B Section 55: Frozen blobs ca01-communications.test.mjs and ReaderDiscussion.tsx are preserved", () => {
  const ca01Content = fs.readFileSync(path.join(root, "tests/ca01-communications.test.mjs"));
  const ca01Sha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${ca01Content.length}\0`), ca01Content]))
    .digest("hex");
  assert.strictEqual(
    ca01Sha,
    "fbd2f7b403f5d85c4b78a5f52176a2eaed32750d",
    `ca01-communications.test.mjs must remain exact blob fbd2f7b403f5d85c4b78a5f52176a2eaed32750d`
  );

  const rdContent = fs.readFileSync(path.join(root, "src/ui/ReaderDiscussion.tsx"));
  const rdSha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(`blob ${rdContent.length}\0`), rdContent]))
    .digest("hex");
  assert.strictEqual(
    rdSha,
    "f7ac3671f81b89170aaf1a4892e6095d280fd839",
    `ReaderDiscussion.tsx must remain exact blob f7ac3671f81b89170aaf1a4892e6095d280fd839`
  );
});

// =============================================================================
// SECTION 56 — MIGRATION 71 SQL CONTRACT VERIFICATION
// =============================================================================

test("HT-NR-05D-B Section 56: Migration 71 SQL schema, index, RLS, and RPC contracts", () => {
  const sql = readRepo("supabase/migrations/20261017020000_ht_nr05db_live_blog_updates.sql");

  // Table and columns
  assert.ok(
    sql.includes("create table if not exists public.newsroom_live_updates"),
    "Migration 71 must create public.newsroom_live_updates"
  );
  assert.ok(
    sql.includes("references public.newsroom_live_coverage(id) on delete cascade"),
    "coverage_id must reference public.newsroom_live_coverage(id) on delete cascade"
  );
  assert.ok(
    sql.includes("headline is null or (length(btrim(headline)) > 0 and length(btrim(headline)) <= 200)"),
    "headline check constraint must enforce 1..200 trimmed length when non-null"
  );
  assert.ok(
    sql.includes("length(btrim(body)) > 0 and length(btrim(body)) <= 10000"),
    "body check constraint must enforce 1..10000 trimmed length"
  );
  assert.ok(
    sql.includes("references public.media_assets(id) on delete set null"),
    "media_id must reference public.media_assets(id) on delete set null"
  );

  // Required index
  assert.ok(
    sql.includes("newsroom_live_updates_coverage_published_idx") &&
      sql.includes("on public.newsroom_live_updates (coverage_id, published_at desc, id desc)"),
    "Migration 71 must create index (coverage_id, published_at desc, id desc)"
  );

  // RLS enabled with 0 public table policies
  assert.ok(
    sql.includes("alter table public.newsroom_live_updates enable row level security;"),
    "RLS must be enabled on public.newsroom_live_updates"
  );
  assert.ok(
    sql.includes("revoke all on table public.newsroom_live_updates from public, anon, authenticated;"),
    "Direct table access must be revoked from public, anon, authenticated"
  );
  assert.strictEqual(
    /create\s+policy/i.test(sql),
    false,
    "Migration 71 must define 0 permissive RLS policies on newsroom_live_updates"
  );

  // All 4 RPCs defined with security definer and search_path
  for (const rpcName of [
    "newsroom_list_live_updates",
    "newsroom_post_live_update",
    "newsroom_public_live_coverage",
    "newsroom_public_live_updates"
  ]) {
    assert.ok(
      sql.includes(`public.${rpcName}`),
      `Migration 71 must define or update public.${rpcName}`
    );
  }
  assert.ok(
    sql.includes("security definer") && sql.includes("set search_path = public, auth"),
    "All RPCs must use security definer and set search_path = public, auth"
  );

  // Grants & revokes
  assert.ok(
    sql.includes("revoke all on function public.newsroom_list_live_updates(uuid, integer) from public, anon;"),
    "newsroom_list_live_updates must revoke from public, anon"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_list_live_updates(uuid, integer) to authenticated"),
    "newsroom_list_live_updates must grant execute to authenticated"
  );
  assert.ok(
    sql.includes("revoke all on function public.newsroom_post_live_update(uuid, jsonb) from public, anon;"),
    "newsroom_post_live_update must revoke from public, anon"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_post_live_update(uuid, jsonb) to authenticated"),
    "newsroom_post_live_update must grant execute to authenticated"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_public_live_coverage(integer) to anon, authenticated"),
    "newsroom_public_live_coverage must grant execute to anon, authenticated"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_public_live_updates(uuid, timestamptz, integer) to anon, authenticated"),
    "newsroom_public_live_updates must grant execute to anon, authenticated"
  );

  // Verify newsroom_post_live_update checks live-blog kind, live status, and updates parent coverage
  assert.ok(
    sql.includes("Live updates can only be posted to live-blog coverage"),
    "newsroom_post_live_update must enforce kind === 'live-blog'"
  );
  assert.ok(
    sql.includes("Live updates can only be posted when coverage status is live"),
    "newsroom_post_live_update must enforce status === 'live'"
  );
  assert.ok(
    sql.includes("update public.newsroom_live_coverage"),
    "newsroom_post_live_update must update parent coverage recency"
  );
});

test("HT-NR-05D-B-R1 Section 56B: Migration 72 SQL stream_seq identity, public projection privacy, and append-only service_role contracts", () => {
  const sql = readRepo("supabase/migrations/20261017030000_ht_nr05db_r1_stream_integrity.sql");

  // 1. Defect A — Public coverage projection omits source_provenance and started_at
  assert.ok(
    sql.includes("create or replace function public.newsroom_public_live_coverage("),
    "Migration 72 must replace public.newsroom_public_live_coverage"
  );
  const coverageRpcSlice = sql.slice(
    sql.indexOf("create or replace function public.newsroom_public_live_coverage("),
    sql.indexOf("revoke all on function public.newsroom_public_live_coverage(integer) from public;")
  );
  assert.strictEqual(
    coverageRpcSlice.includes("source_provenance"),
    false,
    "public.newsroom_public_live_coverage must NEVER expose source_provenance"
  );
  assert.strictEqual(
    coverageRpcSlice.includes("started_at"),
    false,
    "public.newsroom_public_live_coverage must NEVER expose started_at"
  );
  assert.ok(
    coverageRpcSlice.includes("update_count integer"),
    "public.newsroom_public_live_coverage must include update_count integer"
  );

  // 2. Defect B — Monotonic stream_seq identity and lossless cursor RPC
  assert.ok(
    sql.includes("add column if not exists stream_seq bigint generated always as identity"),
    "Migration 72 must add stream_seq bigint generated always as identity"
  );
  assert.ok(
    sql.includes("create unique index if not exists newsroom_live_updates_stream_seq_uidx") &&
      sql.includes("on public.newsroom_live_updates (stream_seq)"),
    "Migration 72 must create unique index newsroom_live_updates_stream_seq_uidx"
  );
  assert.ok(
    sql.includes("create index if not exists newsroom_live_updates_coverage_stream_seq_idx") &&
      sql.includes("on public.newsroom_live_updates (coverage_id, stream_seq desc)"),
    "Migration 72 must create index newsroom_live_updates_coverage_stream_seq_idx on (coverage_id, stream_seq desc)"
  );
  assert.ok(
    sql.includes("drop function if exists public.newsroom_public_live_updates(uuid, timestamptz, integer)"),
    "Migration 72 must drop the old timestamp-cursor RPC signature"
  );
  assert.ok(
    sql.includes("p_after_seq bigint default null") &&
      sql.includes("stream_seq bigint") &&
      sql.includes("u.stream_seq > p_after_seq") &&
      sql.includes("order by u.stream_seq asc") &&
      sql.includes("order by u.stream_seq desc"),
    "Migration 72 newsroom_public_live_updates must support lossless ascending pagination when p_after_seq is provided and descending initial load when null"
  );
  assert.ok(
    sql.includes("grant execute on function public.newsroom_public_live_updates(uuid, bigint, integer) to anon, authenticated"),
    "Migration 72 must grant execute on newsroom_public_live_updates(uuid, bigint, integer) to anon, authenticated"
  );

  // 3. Defect C — Append-only application role privileges (service_role gets SELECT only)
  assert.ok(
    sql.includes("revoke all on table public.newsroom_live_updates from public, anon, authenticated, service_role;"),
    "Migration 72 must revoke all direct table privileges from public, anon, authenticated, service_role"
  );
  assert.ok(
    sql.includes("grant select on table public.newsroom_live_updates to service_role;"),
    "Migration 72 must grant only SELECT on newsroom_live_updates to service_role"
  );
  assert.strictEqual(
    /grant\s+(insert|update|delete|all)/i.test(sql),
    false,
    "Migration 72 must not grant INSERT, UPDATE, DELETE, or ALL on newsroom_live_updates"
  );
  assert.strictEqual(
    /newsroom_(update|delete)_live_update/i.test(sql),
    false,
    "Migration 72 must not introduce any update or delete RPC for live updates"
  );
});

// =============================================================================
// SECTION 57 — DOMAIN VALIDATORS (validateLiveUpdateCreateInput)
// =============================================================================

test("HT-NR-05D-B Section 57: validateLiveUpdateCreateInput enforces all field constraints", () => {
  const validCovId = "d1000000-0000-4000-b000-000000000001";
  const validMediaId = "00000000-0000-4000-a000-000000000001";

  // 1. Valid body only
  assert.deepStrictEqual(
    validateLiveUpdateCreateInput({
      coverageId: validCovId,
      body: "Epidemiological teams have arrived in Manicaland."
    }),
    { valid: true }
  );

  // 2. Valid headline + body + mediaId
  assert.deepStrictEqual(
    validateLiveUpdateCreateInput({
      coverageId: validCovId,
      headline: "Emergency supply convoy dispatched",
      body: "Forty tonnes of supplies departed Harare central depot.",
      mediaId: validMediaId
    }),
    { valid: true }
  );

  // 3. Whitespace-only headline normalized/accepted as optional
  assert.deepStrictEqual(
    validateLiveUpdateCreateInput({
      coverageId: validCovId,
      headline: "    ",
      body: "Valid update body text."
    }),
    { valid: true }
  );

  // 4. Null mediaId accepted
  assert.deepStrictEqual(
    validateLiveUpdateCreateInput({
      coverageId: validCovId,
      headline: null,
      body: "Valid update body text.",
      mediaId: null
    }),
    { valid: true }
  );

  // 5. Blank / whitespace body rejected
  const blankBody = validateLiveUpdateCreateInput({
    coverageId: validCovId,
    body: ""
  });
  assert.strictEqual(blankBody.valid, false);
  assert.strictEqual(blankBody.error, "Update body is required.");

  const whitespaceBody = validateLiveUpdateCreateInput({
    coverageId: validCovId,
    body: "   \n\t  "
  });
  assert.strictEqual(whitespaceBody.valid, false);
  assert.strictEqual(whitespaceBody.error, "Update body is required.");

  // 6. Body > 10,000 chars rejected
  const longBody = validateLiveUpdateCreateInput({
    coverageId: validCovId,
    body: "x".repeat(10001)
  });
  assert.strictEqual(longBody.valid, false);
  assert.strictEqual(longBody.error, "Update body must be between 1 and 10,000 characters.");

  // 7. Headline > 200 chars rejected
  const longHeadline = validateLiveUpdateCreateInput({
    coverageId: validCovId,
    headline: "h".repeat(201),
    body: "Valid body"
  });
  assert.strictEqual(longHeadline.valid, false);
  assert.strictEqual(longHeadline.error, "Update headline must not exceed 200 characters.");

  // 8. Malformed coverageId rejected
  const badCoverageId = validateLiveUpdateCreateInput({
    coverageId: "not-a-uuid",
    body: "Valid body"
  });
  assert.strictEqual(badCoverageId.valid, false);
  assert.strictEqual(badCoverageId.error, "Valid coverage reference is required.");

  // 9. Malformed mediaId rejected
  const badMediaId = validateLiveUpdateCreateInput({
    coverageId: validCovId,
    body: "Valid body",
    mediaId: "bad-media-uuid"
  });
  assert.strictEqual(badMediaId.valid, false);
  assert.strictEqual(badMediaId.error, "Invalid media asset reference.");
});

// =============================================================================
// SECTION 58 — NEWSROOM LIVE UPDATE MAPPER & SERVICE
// =============================================================================

test("HT-NR-05D-B Section 58: mapNewsroomLiveUpdateRow maps valid rows and fails closed on malformed rows", () => {
  const validRow = {
    id: "e1000000-0000-4000-b000-000000000001",
    coverage_id: "d1000000-0000-4000-b000-000000000001",
    headline: "  Key briefing milestone  ",
    body: "  Detailed field report from provincial hospital.  ",
    media_id: "00000000-0000-4000-a000-000000000001",
    author_staff_id: "00000000-0000-4000-8000-000000000010",
    published_at: "2026-10-17T10:30:00.000Z",
    created_at: "2026-10-17T10:30:00.000Z"
  };

  const mapped = mapNewsroomLiveUpdateRow(validRow);
  assert.ok(mapped);
  assert.strictEqual(mapped.id, "e1000000-0000-4000-b000-000000000001");
  assert.strictEqual(mapped.coverageId, "d1000000-0000-4000-b000-000000000001");
  assert.strictEqual(mapped.headline, "Key briefing milestone");
  assert.strictEqual(mapped.body, "Detailed field report from provincial hospital.");
  assert.strictEqual(mapped.mediaId, "00000000-0000-4000-a000-000000000001");
  assert.strictEqual(mapped.authorStaffId, "00000000-0000-4000-8000-000000000010");
  assert.strictEqual(mapped.publishedAt, "2026-10-17T10:30:00.000Z");
  assert.strictEqual(mapped.createdAt, "2026-10-17T10:30:00.000Z");

  // Blank headline normalizes to null
  const nullHeadline = mapNewsroomLiveUpdateRow({ ...validRow, headline: "   ", media_id: null });
  assert.ok(nullHeadline);
  assert.strictEqual(nullHeadline.headline, null);
  assert.strictEqual(nullHeadline.mediaId, null);

  // Fail-closed checks
  assert.strictEqual(mapNewsroomLiveUpdateRow(null), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, id: "bad-id" }), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, coverage_id: "bad-cov" }), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, body: "   " }), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, body: "x".repeat(10001) }), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, headline: "h".repeat(201) }), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, media_id: "bad-media" }), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, author_staff_id: "bad-author" }), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, published_at: "not-a-date" }), null);
  assert.strictEqual(mapNewsroomLiveUpdateRow({ ...validRow, created_at: "not-a-date" }), null);
});

test("HT-NR-05D-B Section 58: NewsroomLiveCoverageService.listUpdates & postUpdate contracts", async () => {
  const validCovId = "d1000000-0000-4000-b000-000000000001";
  const validRow1 = {
    id: "e1000000-0000-4000-b000-000000000002",
    coverage_id: validCovId,
    headline: "Update 2",
    body: "Body 2",
    media_id: null,
    author_staff_id: "00000000-0000-4000-8000-000000000010",
    published_at: "2026-10-17T10:15:00.000Z",
    created_at: "2026-10-17T10:15:00.000Z"
  };
  const validRow2 = {
    ...validRow1,
    id: "e1000000-0000-4000-b000-000000000001",
    headline: null,
    body: "Body 1",
    published_at: "2026-10-17T09:50:00.000Z",
    created_at: "2026-10-17T09:50:00.000Z"
  };
  const malformedRow = { id: "not-a-uuid", body: "" };

  let rpcData = [];
  let rpcError = null;
  let lastCall = null;
  const service = createNewsroomLiveCoverageService({
    rpc: async (fn, args) => {
      lastCall = { fn, args };
      return { data: rpcData, error: rpcError };
    }
  });

  // 1. [] -> []
  rpcData = [];
  const emptyRes = await service.listUpdates(validCovId, 100);
  assert.deepStrictEqual(emptyRes, []);
  assert.strictEqual(lastCall.fn, "newsroom_list_live_updates");
  assert.strictEqual(lastCall.args.p_coverage_id, validCovId);
  assert.strictEqual(lastCall.args.p_limit, 100);

  // 2. [valid, malformed, valid] -> [valid, valid]
  rpcData = [validRow1, malformedRow, validRow2];
  const mixedRes = await service.listUpdates(validCovId);
  assert.strictEqual(mixedRes.length, 2);
  assert.strictEqual(mixedRes[0].id, validRow1.id);
  assert.strictEqual(mixedRes[1].id, validRow2.id);

  // 3. [malformed] -> reject
  rpcData = [malformedRow];
  await assert.rejects(
    () => service.listUpdates(validCovId),
    (err) =>
      err instanceof Error &&
      err.message.includes("non-empty payload contained no valid update rows")
  );

  // 4. null / object -> reject
  rpcData = null;
  await assert.rejects(
    () => service.listUpdates(validCovId),
    (err) =>
      err instanceof Error &&
      err.message.includes("expected array of update rows")
  );
  rpcData = { rows: [] };
  await assert.rejects(
    () => service.listUpdates(validCovId),
    (err) =>
      err instanceof Error &&
      err.message.includes("expected array of update rows")
  );

  // 5. Malformed coverageId rejected before RPC
  lastCall = null;
  await assert.rejects(
    () => service.listUpdates("bad-uuid"),
    (err) =>
      err instanceof Error &&
      err.message.includes("Valid canonical coverage ID is required")
  );
  assert.strictEqual(lastCall, null);

  // 6. postUpdate valid input calls newsroom_post_live_update and returns UUID
  rpcData = "e1000000-0000-4000-b000-000000000099";
  rpcError = null;
  const newUpdateId = await service.postUpdate(validCovId, {
    headline: "  New Flash Headline  ",
    body: "  Confirmed laboratory results received.  ",
    mediaId: "00000000-0000-4000-a000-000000000001"
  });
  assert.strictEqual(newUpdateId, "e1000000-0000-4000-b000-000000000099");
  assert.strictEqual(lastCall.fn, "newsroom_post_live_update");
  assert.strictEqual(lastCall.args.p_coverage_id, validCovId);
  assert.deepStrictEqual(lastCall.args.p_input, {
    headline: "New Flash Headline",
    body: "Confirmed laboratory results received.",
    media_id: "00000000-0000-4000-a000-000000000001"
  });

  // 7. postUpdate rejects non-UUID RPC response
  rpcData = "not-a-uuid";
  await assert.rejects(
    () => service.postUpdate(validCovId, { body: "Valid body" }),
    (err) =>
      err instanceof Error &&
      err.message.includes("expected canonical UUID")
  );

  // 8. postUpdate throws Error on RPC error
  rpcData = null;
  rpcError = { message: "Cannot post live updates after coverage has ended." };
  await assert.rejects(
    () => service.postUpdate(validCovId, { body: "Valid body" }),
    (err) =>
      err instanceof Error &&
      err.message.includes("Cannot post live updates after coverage has ended.")
  );
});

// =============================================================================
// SECTION 59 — PUBLIC LIVE UPDATE MAPPER & SERVICE
// =============================================================================

test("HT-NR-05D-B-R1 Section 59: mapPublicLiveUpdateRow enforces stream_seq positive integer, atomic media tuple rule, and no private field leakage", () => {
  const baseRow = {
    stream_seq: 3,
    id: "e1000000-0000-4000-b000-000000000003",
    coverage_id: "d1000000-0000-4000-b000-000000000001",
    headline: "NatPharm dispatches 40 tonnes of oral rehydration salts",
    body: "Emergency logistics teams have completed loading at the Harare central warehouse.",
    published_at: "2026-10-17T10:42:00.000Z",
    media_id: "00000000-0000-4000-a000-000000000001",
    media_public_url: "https://cdn.healthtimes.co.zw/media/dispatch.jpg",
    media_alt_text: "Supply trucks loading",
    media_caption: "Harare central warehouse dispatch",
    media_credit: "HealthTimes"
  };

  // 1. Valid row with numeric stream_seq and atomic media tuple -> canonical MediaRef with exact UUID + provenance
  const withMedia = mapPublicLiveUpdateRow(baseRow);
  assert.ok(withMedia);
  assert.strictEqual(withMedia.streamSeq, 3);
  assert.strictEqual(withMedia.id, "e1000000-0000-4000-b000-000000000003");
  assert.strictEqual(withMedia.coverageId, "d1000000-0000-4000-b000-000000000001");
  assert.strictEqual(withMedia.headline, "NatPharm dispatches 40 tonnes of oral rehydration salts");
  assert.strictEqual(withMedia.body, "Emergency logistics teams have completed loading at the Harare central warehouse.");
  assert.strictEqual(withMedia.publishedAt, "2026-10-17T10:42:00.000Z");
  assert.ok(withMedia.media);
  assert.strictEqual(withMedia.media.id, "00000000-0000-4000-a000-000000000001");
  assert.strictEqual(withMedia.media.publicUrl, "https://cdn.healthtimes.co.zw/media/dispatch.jpg");
  assert.strictEqual(withMedia.media.altText, "Supply trucks loading");
  assert.strictEqual(withMedia.media.caption, "Harare central warehouse dispatch");
  assert.strictEqual(withMedia.media.credit, "HealthTimes");
  assert.strictEqual(withMedia.media.sourceProvenance.system, "healthtimes-native");
  assert.strictEqual(withMedia.media.sourceProvenance.sourceId, "00000000-0000-4000-a000-000000000001");
  assert.strictEqual(withMedia.media.sourceProvenance.stableKey, "newsroom-media:00000000-0000-4000-a000-000000000001");

  // 1b. Valid bigint string stream_seq -> positive safe integer streamSeq
  const withStringSeq = mapPublicLiveUpdateRow({ ...baseRow, stream_seq: "42" });
  assert.ok(withStringSeq);
  assert.strictEqual(withStringSeq.streamSeq, 42);

  // 1c. Invalid stream_seq values fail closed (null)
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: undefined }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: null }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: 0 }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: "0" }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: -1 }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: "-5" }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: 1.5 }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: "1.5" }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: "abc" }), null);
  assert.strictEqual(mapPublicLiveUpdateRow({ ...baseRow, stream_seq: "" }), null);

  // 2. Valid row with no media -> media: null
  const noMedia = mapPublicLiveUpdateRow({
    ...baseRow,
    media_id: null,
    media_public_url: null
  });
  assert.ok(noMedia);
  assert.strictEqual(noMedia.media, null);

  // 3. URL without media_id -> media: null (no synthetic ID)
  const urlWithoutId = mapPublicLiveUpdateRow({
    ...baseRow,
    media_id: null,
    media_public_url: "https://cdn.healthtimes.co.zw/media/dispatch.jpg"
  });
  assert.ok(urlWithoutId);
  assert.strictEqual(urlWithoutId.media, null);

  // 4. Invalid media_id -> media: null
  const invalidMediaId = mapPublicLiveUpdateRow({
    ...baseRow,
    media_id: "not-a-uuid",
    media_public_url: "https://cdn.healthtimes.co.zw/media/dispatch.jpg"
  });
  assert.ok(invalidMediaId);
  assert.strictEqual(invalidMediaId.media, null);

  // 5. media_id without URL -> media: null
  const idWithoutUrl = mapPublicLiveUpdateRow({
    ...baseRow,
    media_id: "00000000-0000-4000-a000-000000000001",
    media_public_url: null
  });
  assert.ok(idWithoutUrl);
  assert.strictEqual(idWithoutUrl.media, null);

  // 6. Unsafe URL -> media: null
  const unsafeUrl = mapPublicLiveUpdateRow({
    ...baseRow,
    media_id: "00000000-0000-4000-a000-000000000001",
    media_public_url: "http://127.0.0.1/internal.jpg"
  });
  assert.ok(unsafeUrl);
  assert.strictEqual(unsafeUrl.media, null);

  // 7. Private fields never leaked
  const rowWithPrivate = mapPublicLiveUpdateRow({
    ...baseRow,
    author_staff_id: "00000000-0000-4000-8000-000000000010",
    lock_version: 5
  });
  assert.ok(rowWithPrivate);
  assert.strictEqual("authorStaffId" in rowWithPrivate, false);
  assert.strictEqual("author_staff_id" in rowWithPrivate, false);
  assert.strictEqual("lockVersion" in rowWithPrivate, false);

  // 8. Static source guard: no synthetic media ID in public-live.ts
  const publicLiveSource = read("src/services/public-live.ts");
  assert.strictEqual(
    publicLiveSource.includes("newsroom-live-media:"),
    false,
    "public-live.ts must never fabricate synthetic newsroom-live-media: IDs"
  );
  assert.strictEqual(
    publicLiveSource.includes("newsroom-update-media:"),
    false,
    "public-live.ts must never fabricate synthetic newsroom-update-media: IDs"
  );
});

test("HT-NR-05D-B-R1 Section 59: PublicLiveService.listUpdates envelope, afterSeq cursor forwarding, and validation", async () => {
  const validCovId = "d1000000-0000-4000-b000-000000000001";
  const validRow1 = {
    stream_seq: 2,
    id: "e1000000-0000-4000-b000-000000000002",
    coverage_id: validCovId,
    headline: "Headline 2",
    body: "Body 2",
    published_at: "2026-10-17T10:15:00.000Z",
    media_id: null,
    media_public_url: null,
    media_alt_text: null,
    media_caption: null,
    media_credit: null
  };
  const validRow2 = {
    ...validRow1,
    stream_seq: 1,
    id: "e1000000-0000-4000-b000-000000000001",
    headline: null,
    body: "Body 1",
    published_at: "2026-10-17T09:50:00.000Z"
  };
  const malformedRow = { id: "bad-id" };

  let rpcData = [];
  let rpcError = null;
  let lastCall = null;
  const service = createPublicLiveService({
    rpc: async (fn, args) => {
      lastCall = { fn, args };
      return { data: rpcData, error: rpcError };
    }
  });

  // 1. [] -> [] with initial afterSeq: null
  rpcData = [];
  const emptyRes = await service.listUpdates(validCovId, { afterSeq: null, limit: 100 });
  assert.deepStrictEqual(emptyRes, []);
  assert.strictEqual(lastCall.fn, "newsroom_public_live_updates");
  assert.strictEqual(lastCall.args.p_coverage_id, validCovId);
  assert.strictEqual(lastCall.args.p_after_seq, null);
  assert.strictEqual(lastCall.args.p_limit, 100);

  // 2. [valid, malformed, valid] -> [valid, valid] with afterSeq: 120
  rpcData = [validRow1, malformedRow, validRow2];
  const mixedRes = await service.listUpdates(validCovId, {
    afterSeq: 120,
    limit: 100
  });
  assert.strictEqual(mixedRes.length, 2);
  assert.strictEqual(mixedRes[0].streamSeq, 2);
  assert.strictEqual(mixedRes[1].streamSeq, 1);
  assert.strictEqual(lastCall.args.p_after_seq, 120);
  assert.strictEqual(lastCall.args.p_limit, 100);

  // 3. [malformed] -> reject MALFORMED_DATA
  rpcData = [malformedRow];
  await assert.rejects(
    () => service.listUpdates(validCovId),
    (err) => err instanceof PublicLiveError && err.code === "MALFORMED_DATA"
  );

  // 4. null / object -> reject MALFORMED_ENVELOPE
  rpcData = null;
  await assert.rejects(
    () => service.listUpdates(validCovId),
    (err) => err instanceof PublicLiveError && err.code === "MALFORMED_ENVELOPE"
  );
  rpcData = { updates: [] };
  await assert.rejects(
    () => service.listUpdates(validCovId),
    (err) => err instanceof PublicLiveError && err.code === "MALFORMED_ENVELOPE"
  );

  // 4b. RPC error -> reject RPC_ERROR
  rpcData = null;
  rpcError = { message: "Database timeout" };
  await assert.rejects(
    () => service.listUpdates(validCovId),
    (err) => err instanceof PublicLiveError && err.code === "RPC_ERROR"
  );
  rpcError = null;

  // 5. Malformed coverageId rejected
  lastCall = null;
  await assert.rejects(
    () => service.listUpdates("not-a-uuid"),
    (err) =>
      err instanceof PublicLiveError &&
      err.code === "INVALID_COVERAGE_ID"
  );
  assert.strictEqual(lastCall, null);

  // 6. Malformed afterSeq cursor rejected
  for (const invalidCursor of [0, -1, 1.5, NaN]) {
    await assert.rejects(
      () => service.listUpdates(validCovId, { afterSeq: invalidCursor }),
      (err) => err instanceof PublicLiveError && err.code === "INVALID_AFTER_SEQ"
    );
  }
});

// =============================================================================
// SECTION 60 — PUBLIC LIVE COVERAGE updateCount MAPPING & NO SOURCE PROVENANCE LEAK
// =============================================================================

test("HT-NR-05D-B-R1 Section 60: mapPublicLiveRow maps updateCount truthfully and requires no database source_provenance", () => {
  const baseRow = {
    id: "d1000000-0000-4000-b000-000000000001",
    title: "Emergency Briefing",
    kind: "live-blog",
    status: "live",
    updated_at: "2026-10-17T10:00:00.000Z",
    scheduled_at: null,
    media_id: null,
    media_public_url: null,
    media_alt_text: null,
    media_caption: null,
    media_credit: null
  };

  // Verify baseRow has no source_provenance column and maps cleanly
  assert.strictEqual("source_provenance" in baseRow, false);

  // 1. live-blog with update_count: 0 -> updateCount: 0
  const zeroUpdates = mapPublicLiveRow({ ...baseRow, update_count: 0 });
  assert.ok(zeroUpdates);
  assert.strictEqual(zeroUpdates.updateCount, 0);
  assert.strictEqual(zeroUpdates.sourceProvenance.system, "healthtimes-native");
  assert.strictEqual(zeroUpdates.sourceProvenance.sourceId, baseRow.id);

  // 2. live-blog with update_count: 5 -> updateCount: 5
  const fiveUpdates = mapPublicLiveRow({ ...baseRow, update_count: 5 });
  assert.ok(fiveUpdates);
  assert.strictEqual(fiveUpdates.updateCount, 5);

  // 3. scheduled with update_count: 0 -> updateCount === undefined
  const scheduled = mapPublicLiveRow({ ...baseRow, kind: "scheduled", update_count: 0 });
  assert.ok(scheduled);
  assert.strictEqual(scheduled.updateCount, undefined);

  // 4. Negative or non-integer update_count -> fail closed (null)
  assert.strictEqual(mapPublicLiveRow({ ...baseRow, update_count: -1 }), null);
  assert.strictEqual(mapPublicLiveRow({ ...baseRow, update_count: 2.5 }), null);
  assert.strictEqual(mapPublicLiveRow({ ...baseRow, update_count: "not-a-number" }), null);
});

// =============================================================================
// SECTION 61 — STUDIO LIVE DESK COMPOSER & STREAM STATES
// =============================================================================

test("HT-NR-05D-B Section 61: StudioLiveDeskView renders composer for active live-blog, locked history for ended, prerequisite for upcoming, and none for scheduled", () => {
  const previewCoverage = buildPreviewLiveCoverage();
  const previewUpdates = buildPreviewLiveUpdates();

  const liveBlogItem = previewCoverage.find((c) => c.status === "live" && c.kind === "live-blog");
  const upcomingBlogItem = previewCoverage.find((c) => c.status === "upcoming" && c.kind === "live-blog");
  const upcomingSchedItem = previewCoverage.find((c) => c.status === "upcoming" && c.kind === "scheduled");
  const endedBlogItem = previewCoverage.find((c) => c.status === "ended" && c.kind === "live-blog");

  const baseProps = {
    coverage: previewCoverage,
    stories: [],
    mediaAssets: [],
    loading: false,
    error: null,
    isOwnerPreview: true,
    onCreateCoverage: async () => "d1000000-0000-4000-b000-000000000001",
    onSaveCoverage: async () => 2,
    onStartCoverage: async () => 2,
    onEndCoverage: async () => 2,
    onRefresh: () => {},
    searchQuery: "",
    onSearch: () => {},
    statusFilter: "all",
    onStatusFilterChange: () => {},
    kindFilter: "all",
    onKindFilterChange: () => {},
    updatesLoading: false,
    updatesError: null,
    onPostUpdate: async () => "e1000000-0000-4000-b000-000000000099",
    onSelectCoverage: () => {}
  };

  // 1. Active live-blog -> renders Live Updates + Post Update composer
  const activeTree = StudioLiveDeskView({
    ...baseProps,
    selectedCoverageId: liveBlogItem.id,
    updates: previewUpdates
  });
  const activeText = collectText(activeTree).join(" ");
  assert.ok(activeText.includes("Live Updates"), "Active live-blog must render Live Updates section");
  assert.ok(activeText.includes("Post Update"), "Active live-blog must render Post Update composer and button");
  assert.ok(
    activeText.includes("Ministerial panel confirms provincial cold-chain buffer expansion"),
    "Active live-blog must render existing update headline"
  );

  // 2. Upcoming live-blog -> renders start prerequisite and no active Post Update composer
  const upcomingTree = StudioLiveDeskView({
    ...baseProps,
    selectedCoverageId: upcomingBlogItem.id,
    updates: previewUpdates
  });
  const upcomingText = collectText(upcomingTree).join(" ");
  assert.ok(
    upcomingText.includes("Start this coverage before posting live updates."),
    "Upcoming live-blog must show 'Start this coverage before posting live updates.'"
  );
  assert.strictEqual(
    upcomingText.includes("Update Headline (Optional, max 200 chars)"),
    false,
    "Upcoming live-blog must not render active Post Update composer fields"
  );

  // 3. Ended live-blog -> renders locked read-only history and no active Post Update composer
  const endedTree = StudioLiveDeskView({
    ...baseProps,
    selectedCoverageId: endedBlogItem.id,
    updates: previewUpdates
  });
  const endedText = collectText(endedTree).join(" ");
  assert.ok(
    endedText.includes("This live coverage has ended. Update history is locked and read-only."),
    "Ended live-blog must show locked read-only update history banner"
  );
  assert.ok(
    endedText.includes("Committee concludes public hearings and adjourns"),
    "Ended live-blog must display historical updates"
  );
  assert.strictEqual(
    endedText.includes("Update Headline (Optional, max 200 chars)"),
    false,
    "Ended live-blog must not render active Post Update composer fields"
  );

  // 4. Scheduled coverage -> does not render Live Updates composer
  const scheduledTree = StudioLiveDeskView({
    ...baseProps,
    selectedCoverageId: upcomingSchedItem.id,
    updates: previewUpdates
  });
  const scheduledText = collectText(scheduledTree).join(" ");
  assert.strictEqual(
    scheduledText.includes("Update Headline (Optional, max 200 chars)"),
    false,
    "Scheduled coverage must not render live-blog composer"
  );
  assert.strictEqual(
    scheduledText.includes("Start this coverage before posting live updates."),
    false,
    "Scheduled coverage must not pretend to be a live-blog"
  );

  // 5. Verify draft preservation on failure vs clearing on success in StudioLiveDesk.tsx source
  const studioSource = read("src/ui/StudioLiveDesk.tsx");
  const postHandlerSlice = studioSource.slice(
    studioSource.indexOf("const handlePostUpdate = async () => {"),
    studioSource.indexOf("// Counters")
  );
  assert.ok(
    postHandlerSlice.includes("await onPostUpdate(") &&
      postHandlerSlice.indexOf('setUpdateHeadline("")') > postHandlerSlice.indexOf("await onPostUpdate(") &&
      postHandlerSlice.indexOf('setUpdateBody("")') > postHandlerSlice.indexOf("await onPostUpdate("),
    "Draft headline/body/mediaId must only be cleared after onPostUpdate resolves, preserving operator draft on failure"
  );
});

// =============================================================================
// SECTION 62 — READER LIVE BLOG STREAM, MONOTONIC CURSOR & LOSSLESS 250-UPDATE BURST PAGINATION
// =============================================================================

test("HT-NR-05D-B-R1 Section 62: Reader Live Blog polling interval, UUID validator, streamSeq deduplication, and lossless 250-update burst pagination", async () => {
  // 1. Poll interval is 10,000ms
  assert.strictEqual(LIVE_BLOG_POLL_INTERVAL_MS, 10_000);

  // 2. isValidLiveCoverageId
  assert.strictEqual(isValidLiveCoverageId("d1000000-0000-4000-b000-000000000001"), true);
  assert.strictEqual(isValidLiveCoverageId("not-a-uuid"), false);
  assert.strictEqual(isValidLiveCoverageId(""), false);
  assert.strictEqual(isValidLiveCoverageId(null), false);

  // 3. mergeAndSortLiveUpdates deduplicates by id and streamSeq and orders newest-first (streamSeq DESC)
  const existing = [
    {
      streamSeq: 1,
      id: "e1000000-0000-4000-b000-000000000001",
      coverageId: "d1000000-0000-4000-b000-000000000001",
      headline: "First update",
      body: "Initial body",
      publishedAt: "2026-10-17T09:50:00.000Z",
      media: null
    },
    {
      streamSeq: 2,
      id: "e1000000-0000-4000-b000-000000000002",
      coverageId: "d1000000-0000-4000-b000-000000000001",
      headline: "Second update",
      body: "Second body",
      publishedAt: "2026-10-17T10:15:00.000Z",
      media: null
    }
  ];

  const incomingPoll = [
    // Duplicate of streamSeq 2 / e1000000-0000-4000-b000-000000000002
    {
      streamSeq: 2,
      id: "e1000000-0000-4000-b000-000000000002",
      coverageId: "d1000000-0000-4000-b000-000000000001",
      headline: "Second update",
      body: "Second body",
      publishedAt: "2026-10-17T10:15:00.000Z",
      media: null
    },
    // Two updates with identical timestamp, ordered deterministically by streamSeq DESC
    {
      streamSeq: 3,
      id: "e1000000-0000-4000-b000-000000000003",
      coverageId: "d1000000-0000-4000-b000-000000000001",
      headline: "Third update A",
      body: "Third body A",
      publishedAt: "2026-10-17T10:42:00.000Z",
      media: null
    },
    {
      streamSeq: 4,
      id: "e1000000-0000-4000-b000-000000000004",
      coverageId: "d1000000-0000-4000-b000-000000000001",
      headline: "Third update B (same timestamp, higher streamSeq)",
      body: "Third body B",
      publishedAt: "2026-10-17T10:42:00.000Z",
      media: null
    }
  ];

  const merged = mergeAndSortLiveUpdates(existing, incomingPoll);
  assert.strictEqual(merged.length, 4, "Duplicate update must be deduplicated");
  assert.deepStrictEqual(
    merged.map((u) => u.streamSeq),
    [4, 3, 2, 1],
    "Updates must be ordered newest-first by streamSeq DESC"
  );
  assert.strictEqual(computeMaxStreamSeq(merged), 4);

  // 4. Lossless 250-update burst pagination proof (cursor = 10, burst = 11..260, limit = 100)
  const coverageId = "d1000000-0000-4000-b000-000000000001";
  const makeUpdate = (seq) => ({
    streamSeq: seq,
    id: `e1000000-0000-4000-b000-${String(seq).padStart(12, "0")}`,
    coverageId,
    headline: `Update #${seq}`,
    body: `Body for update ${seq}`,
    publishedAt: "2026-10-17T11:00:00.000Z", // Even if all 250 share the exact same timestamp!
    media: null
  });

  // Initial state: updates 1..10 already loaded (newest-first: 10..1), cursor = 10
  let streamState = {
    updates: Array.from({ length: 10 }, (_, idx) => makeUpdate(10 - idx)),
    lastSeenStreamSeq: 10
  };
  assert.strictEqual(computeMaxStreamSeq(streamState.updates), 10);

  // Server database contains updates 1..260 (250 new updates 11..260 in burst)
  const serverDbUpdates = Array.from({ length: 260 }, (_, idx) => makeUpdate(idx + 1));

  // Simulate server RPC newsroom_public_live_updates(coverageId, afterSeq, limit = 100)
  // When afterSeq is not null: WHERE stream_seq > afterSeq ORDER BY stream_seq ASC LIMIT 100
  const simulateServerPoll = (afterSeq, limit = 100) => {
    return serverDbUpdates
      .filter((u) => u.streamSeq > afterSeq)
      .sort((a, b) => a.streamSeq - b.streamSeq)
      .slice(0, limit);
  };

  // Poll 1: afterSeq = 10, limit = 100 -> receives 11..110 -> cursor advances to 110
  const poll1Batch = simulateServerPoll(streamState.lastSeenStreamSeq, 100);
  assert.strictEqual(poll1Batch.length, 100);
  assert.strictEqual(poll1Batch[0].streamSeq, 11);
  assert.strictEqual(poll1Batch[99].streamSeq, 110);
  streamState = advanceLiveStreamCursor(streamState, poll1Batch);
  assert.strictEqual(streamState.lastSeenStreamSeq, 110);
  assert.strictEqual(streamState.updates.length, 110);

  // Poll 2: afterSeq = 110, limit = 100 -> receives 111..210 -> cursor advances to 210
  const poll2Batch = simulateServerPoll(streamState.lastSeenStreamSeq, 100);
  assert.strictEqual(poll2Batch.length, 100);
  assert.strictEqual(poll2Batch[0].streamSeq, 111);
  assert.strictEqual(poll2Batch[99].streamSeq, 210);
  streamState = advanceLiveStreamCursor(streamState, poll2Batch);
  assert.strictEqual(streamState.lastSeenStreamSeq, 210);
  assert.strictEqual(streamState.updates.length, 210);

  // Poll 3: afterSeq = 210, limit = 100 -> receives 211..260 -> cursor advances to 260
  const poll3Batch = simulateServerPoll(streamState.lastSeenStreamSeq, 100);
  assert.strictEqual(poll3Batch.length, 50);
  assert.strictEqual(poll3Batch[0].streamSeq, 211);
  assert.strictEqual(poll3Batch[49].streamSeq, 260);
  streamState = advanceLiveStreamCursor(streamState, poll3Batch);
  assert.strictEqual(streamState.lastSeenStreamSeq, 260);
  assert.strictEqual(streamState.updates.length, 260);

  // Verify zero lost updates, zero duplicates, and strict newest-first (260 down to 1) ordering
  for (let i = 0; i < 260; i += 1) {
    assert.strictEqual(
      streamState.updates[i].streamSeq,
      260 - i,
      `Expected streamSeq ${260 - i} at index ${i}, got ${streamState.updates[i].streamSeq}`
    );
  }

  // 5. Verify all 6 required Reader Live Blog states and race protection in app/(reader)/live.tsx
  const liveScreenSource = read("app/(reader)/live.tsx");
  assert.ok(
    liveScreenSource.includes("Loading live updates…"),
    "Must include loading state copy 'Loading live updates…'"
  );
  assert.ok(
    liveScreenSource.includes("Live coverage is active. Updates will appear here as the newsroom publishes them."),
    "Must include active 0-updates empty state copy"
  );
  assert.ok(
    liveScreenSource.includes("This live coverage has ended or is no longer active."),
    "Must include ended/not-public state copy"
  );
  assert.ok(
    liveScreenSource.includes("Live updates are temporarily unavailable."),
    "Must include error state copy"
  );
  assert.ok(
    liveScreenSource.includes("Invalid live coverage reference."),
    "Must include invalid coverage ID state copy"
  );
  assert.ok(
    liveScreenSource.includes("pollSeqRef") &&
      liveScreenSource.includes("lastSeenStreamSeqRef") &&
      liveScreenSource.includes("clearInterval"),
    "Must use monotonic pollSeqRef race protection, lastSeenStreamSeqRef cursor, and clearInterval cleanup"
  );
});

// =============================================================================
// SECTION 63 — OWNER PREVIEW PARITY
// =============================================================================

test("HT-NR-05D-B Section 63: Owner Preview includes deterministic live updates and simulated local posting", () => {
  const allUpdates = buildPreviewLiveUpdates();
  assert.ok(Array.isArray(allUpdates), "buildPreviewLiveUpdates must return an array of NewsroomLiveUpdate");

  const activeUpdates = allUpdates.filter((u) => u.coverageId === "d1000000-0000-4000-b000-000000000001");
  const endedUpdates = allUpdates.filter((u) => u.coverageId === "d1000000-0000-4000-b000-000000000004");

  assert.strictEqual(activeUpdates.length, 3);
  assert.strictEqual(endedUpdates.length, 2);

  // Verify newest-first ordering
  assert.ok(
    Date.parse(activeUpdates[0].publishedAt) > Date.parse(activeUpdates[1].publishedAt) &&
      Date.parse(activeUpdates[1].publishedAt) > Date.parse(activeUpdates[2].publishedAt),
    "Preview active live updates must be ordered newest-first"
  );

  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");
  assert.ok(
    previewStudioSource.includes("buildPreviewLiveUpdates"),
    "OwnerPreviewStudio must use buildPreviewLiveUpdates"
  );
  assert.ok(
    previewStudioSource.includes("onPostUpdate={handlePostUpdate}"),
    "OwnerPreviewStudio must pass simulated local handlePostUpdate to StudioLiveDeskView"
  );
});

// =============================================================================
// SECTION 64 — FORBIDDEN SURFACE & SECURITY AUDIT
// =============================================================================

test("HT-NR-05D-B Section 64: Forbidden surface and security audit across modified files", () => {
  const filesToAudit = [
    "src/domain/models.ts",
    "src/domain/contracts.ts",
    "src/services/newsroom-live.ts",
    "src/services/public-live.ts",
    "src/ui/StudioLiveDesk.tsx",
    "src/ui/Cards.tsx",
    "app/(reader)/live.tsx"
  ];

  for (const relPath of filesToAudit) {
    const content = read(relPath);
    assert.strictEqual(
      content.includes("dangerouslySetInnerHTML"),
      false,
      `${relPath} must not contain dangerouslySetInnerHTML`
    );
    assert.strictEqual(
      content.includes("eval("),
      false,
      `${relPath} must not contain eval(`
    );
    assert.strictEqual(
      content.includes("service_role"),
      false,
      `${relPath} must not reference service_role`
    );
    assert.strictEqual(
      content.includes('.from("newsroom_live_updates")') ||
        content.includes(".from('newsroom_live_updates')"),
      false,
      `${relPath} must not perform direct client table reads/writes on newsroom_live_updates`
    );
  }

  // Reader UI must not contain internal programme codes
  const readerLive = read("app/(reader)/live.tsx");
  assert.doesNotMatch(
    readerLive,
    /HT-NR-05|AG-0[1-7]|CA-01|SOURCE PARITY PREVIEW/i,
    "Reader Live UI must not leak internal programme codes"
  );
});
