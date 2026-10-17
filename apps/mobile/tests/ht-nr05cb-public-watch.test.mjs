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
  validateVideoHttpsUrl,
  validateVideoCreateInput,
  validateVideoPatch
} = models;

// Load preview data
const previewData = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: {} } },
    "../platform/config": { appEnvironment: "staging" }
  }
});
const { buildPreviewVideos } = previewData;

// Load UI module
const uiModule = loadTs("src/ui/StudioVideoDesk.tsx", {
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
      Linking: { openURL: () => {} },
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
            capabilities: ["media.manage", "story.publish"],
            reason: "Authorized session"
          })
        },
        newsroomVideo: {
          listVideos: async () => [],
          createVideo: async () => "00000000-0000-4000-a000-000000000001",
          saveVideo: async () => 2,
          setReady: async () => 2,
          publishVideo: async () => 2,
          unpublishVideo: async () => 2,
          setFeatured: async () => 2
        },
        newsroomStories: {
          listStories: async () => []
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
  hasVideoDeskAuthority,
  hasVideoPublicationAuthority,
  formatDurationSeconds,
  StudioVideoDeskView,
  StudioVideoDesk
} = uiModule;

// Load newsroom video service
let mockNewsroomRpcHandler = null;
const newsroomVideoServiceModule = loadTs("src/services/newsroom-video.ts", {
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
const { mapNewsroomVideoRow, stagingNewsroomVideoService } = newsroomVideoServiceModule;

// Load public video service
let mockPublicRpcHandler = null;
const publicVideoModule = loadTs("src/services/public-video.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        rpc: (fn, args) => {
          if (mockPublicRpcHandler) return mockPublicRpcHandler(fn, args);
          return Promise.resolve({ data: null, error: null });
        }
      })
    },
    "./source-parity": {
      sourceParityServices: {
        video: {
          list: async () => [
            {
              id: "fallback-video-1",
              title: "Fallback Parity Video",
              durationSeconds: 120,
              publishedAt: "2026-10-10T00:00:00Z",
              thumbnail: null,
              sourceUrl: "https://fallback.healthtimes.co.zw/vid1.mp4",
              relatedArticleId: null,
              sourceProvenance: { system: "source-parity" }
            }
          ]
        }
      }
    }
  }
});
const { mapPublicVideoRow, createPublicVideoService, PublicVideoError } = publicVideoModule;

// =============================================================================
// 1. EXACT INVARIANTS & CUSTODY PRESERVATION
// =============================================================================

test("HT-NR-05C-B Invariant: Repository migration count is exactly 76", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.strictEqual(
    files.length,
    76,
    `Migration count must be exactly 76 at HT-NR-06C-B. Found ${files.length}.`
  );
  assert.ok(
    files.includes("20261017000000_ht_nr05cb_public_watch_delivery.sql"),
    "Migration directory must contain 20261017000000_ht_nr05cb_public_watch_delivery.sql"
  );
});

test("HT-NR-05C-B Invariant: Remote parent authority is exact c7bdb930b1b907c591a7e04a5b466e7c0ea7fe4c", () => {
  const remoteRef = execSync("git rev-parse origin/feat/ht-nr05c-video-desk-foundation", {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
  assert.strictEqual(remoteRef, "c7bdb930b1b907c591a7e04a5b466e7c0ea7fe4c");
});

test("HT-NR-05C-B Invariant: Reader Watch route blob is exactly frozen at 34f2335e3fef6308f3656edb160bd2da3675f716", () => {
  const watchFilePath = path.join(root, "app/(reader)/watch.tsx");
  assert.ok(fs.existsSync(watchFilePath), "Reader watch file must exist");
  const content = fs.readFileSync(watchFilePath);
  const header = `blob ${content.length}\0`;
  const sha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(header), content]))
    .digest("hex");
  assert.strictEqual(
    sha,
    "34f2335e3fef6308f3656edb160bd2da3675f716",
    `Reader Watch route blob MUST remain untouched at 34f2335e3fef6308f3656edb160bd2da3675f716. Found ${sha}.`
  );
});

test("HT-NR-05C-B Invariant: Primary owner repository is clean and untouched", () => {
  const primaryRepo = "/Users/shadreckmusarurwa/Project AI/htp-zw";
  if (fs.existsSync(primaryRepo)) {
    const gitStatus = execSync("git status --porcelain", {
      cwd: primaryRepo,
      encoding: "utf8"
    }).trim();
    assert.strictEqual(
      gitStatus,
      "",
      `Primary owner repo must remain pristine and clean. Found uncommitted changes:\n${gitStatus}`
    );
  }
});

// =============================================================================
// 2. MIGRATION 69 SCHEMA & RPC CONTRACT VERIFICATION
// =============================================================================

test("HT-NR-05C-B Migration 69: Schema additions and index definitions", () => {
  const sql = readRepo("supabase/migrations/20261017000000_ht_nr05cb_public_watch_delivery.sql");

  // Columns added
  assert.ok(sql.includes("add column if not exists published_at timestamptz null,"));
  assert.ok(sql.includes("add column if not exists published_by uuid null"));
  assert.ok(sql.includes("add column if not exists watch_featured boolean not null default false;"));

  // Partial unique index for single featured published video
  assert.ok(
    sql.includes("create unique index if not exists newsroom_videos_single_watch_featured_idx"),
    "Must define partial unique index newsroom_videos_single_watch_featured_idx"
  );
  assert.ok(sql.includes("where (watch_featured = true and published_at is not null);"));

  // Public index for Watch query ordering
  assert.ok(
    sql.includes("create index if not exists newsroom_videos_public_watch_idx"),
    "Must define public watch query index"
  );
  assert.ok(
    sql.includes("(watch_featured desc, published_at desc, id asc)")
  );
  assert.ok(
    sql.includes("where (published_at is not null and status = 'ready');")
  );
});

test("HT-NR-05C-B Migration 69: RPC functions and capability boundaries", () => {
  const sql = readRepo("supabase/migrations/20261017000000_ht_nr05cb_public_watch_delivery.sql");

  // newsroom_publish_video
  assert.ok(sql.includes("create or replace function public.newsroom_publish_video("));
  assert.ok(sql.includes("story.publish authority required to publish video"));
  assert.ok(sql.includes("Video must be in ready status to publish"));
  assert.ok(sql.includes("revoke execute on function public.newsroom_publish_video(uuid, bigint, boolean) from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_publish_video(uuid, bigint, boolean) to authenticated, service_role, postgres;"));

  // newsroom_unpublish_video
  assert.ok(sql.includes("create or replace function public.newsroom_unpublish_video("));
  assert.ok(sql.includes("story.publish authority required to unpublish video"));
  assert.ok(sql.includes("Video is not currently published"));
  assert.ok(sql.includes("revoke execute on function public.newsroom_unpublish_video(uuid, bigint) from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_unpublish_video(uuid, bigint) to authenticated, service_role, postgres;"));

  // newsroom_set_video_featured
  assert.ok(sql.includes("create or replace function public.newsroom_set_video_featured("));
  assert.ok(sql.includes("story.publish authority required to set featured video"));
  assert.ok(sql.includes("Only published videos can be featured on Watch"));
  assert.ok(sql.includes("revoke execute on function public.newsroom_set_video_featured(uuid, bigint, boolean) from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_set_video_featured(uuid, bigint, boolean) to authenticated, service_role, postgres;"));

  // newsroom_public_videos
  assert.ok(sql.includes("create or replace function public.newsroom_public_videos("));
  assert.ok(sql.includes("where v.published_at is not null"));
  assert.ok(sql.includes("and v.status = 'ready'"));
  assert.ok(sql.includes("order by v.watch_featured desc,"));
  assert.ok(sql.includes("v.published_at desc,"));
  assert.ok(sql.includes("v.id asc"));
  assert.ok(sql.includes("grant execute on function public.newsroom_public_videos(integer) to anon, authenticated, service_role, postgres;"));

  // Hardened save and ready RPCs
  assert.ok(sql.includes("Published video cannot be edited. Unpublish first."));
  assert.ok(sql.includes("Published video cannot be transitioned to draft. Unpublish first."));
});

// =============================================================================
// 3. EDITORIAL AUTHORITY & PUBLICATION GATING
// =============================================================================

test("HT-NR-05C-B Authority: hasVideoPublicationAuthority requires server status and story.publish", () => {
  // Matrix item 1: status="authorized", source="server", capabilities=["story.publish"] -> TRUE
  assert.strictEqual(
    hasVideoPublicationAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["story.publish"]
    }),
    true
  );

  // Matrix item 2: status="authorized", source="server", capabilities=[] -> FALSE
  assert.strictEqual(
    hasVideoPublicationAuthority({
      status: "authorized",
      source: "server",
      capabilities: []
    }),
    false
  );

  // Matrix item 3: status="authorized", source="fixture", capabilities=["story.publish"] -> FALSE
  assert.strictEqual(
    hasVideoPublicationAuthority({
      status: "authorized",
      source: "fixture",
      capabilities: ["story.publish"]
    }),
    false
  );

  // Matrix item 4: status="authorized", source="local", capabilities=["story.publish"] -> FALSE
  assert.strictEqual(
    hasVideoPublicationAuthority({
      status: "authorized",
      source: "local",
      capabilities: ["story.publish"]
    }),
    false
  );

  // Matrix item 5: status="authorized", capabilities=["story.publish"] (missing source) -> FALSE
  assert.strictEqual(
    hasVideoPublicationAuthority({
      status: "authorized",
      capabilities: ["story.publish"]
    }),
    false
  );

  // Matrix item 6: authorized=true, capabilities=["story.publish"] -> FALSE
  assert.strictEqual(
    hasVideoPublicationAuthority({
      authorized: true,
      capabilities: ["story.publish"]
    }),
    false
  );

  // Matrix item 7: null -> FALSE
  assert.strictEqual(hasVideoPublicationAuthority(null), false);

  // Additional boundary checks: undefined, empty object, non-array capabilities
  assert.strictEqual(hasVideoPublicationAuthority(undefined), false);
  assert.strictEqual(hasVideoPublicationAuthority({}), false);
  assert.strictEqual(
    hasVideoPublicationAuthority({
      status: "authorized",
      source: "server",
      capabilities: "story.publish"
    }),
    false
  );
});

// =============================================================================
// 4. STUDIO VIDEO DESK SERVICE CONTRACTS (newsroomVideo)
// =============================================================================

test("HT-NR-05C-B Studio Service: publishVideo invokes newsroom_publish_video and validates version", async () => {
  let invoked = false;
  mockNewsroomRpcHandler = async (fn, args) => {
    assert.strictEqual(fn, "newsroom_publish_video");
    assert.strictEqual(args.p_video_id, "c1000000-0000-4000-a000-000000000001");
    assert.strictEqual(args.p_expected_version, 2);
    assert.strictEqual(args.p_featured, true);
    invoked = true;
    return { data: 3, error: null };
  };

  const nextVer = await stagingNewsroomVideoService.publishVideo(
    "c1000000-0000-4000-a000-000000000001",
    2,
    true
  );
  assert.strictEqual(nextVer, 3);
  assert.strictEqual(invoked, true);

  // Fails closed on invalid expectedVersion
  await assert.rejects(
    () => stagingNewsroomVideoService.publishVideo("c1000000-0000-4000-a000-000000000001", 0),
    /Valid expected lock version >= 1 is required for publish/
  );
  await assert.rejects(
    () => stagingNewsroomVideoService.publishVideo("c1000000-0000-4000-a000-000000000001", 1.5),
    /Valid expected lock version >= 1 is required for publish/
  );
  await assert.rejects(
    () => stagingNewsroomVideoService.publishVideo("c1000000-0000-4000-a000-000000000001", "2"),
    /Valid expected lock version >= 1 is required for publish/
  );
});

test("HT-NR-05C-B Studio Service: unpublishVideo invokes newsroom_unpublish_video", async () => {
  let invoked = false;
  mockNewsroomRpcHandler = async (fn, args) => {
    assert.strictEqual(fn, "newsroom_unpublish_video");
    assert.strictEqual(args.p_video_id, "c1000000-0000-4000-a000-000000000001");
    assert.strictEqual(args.p_expected_version, 4);
    invoked = true;
    return { data: 5, error: null };
  };

  const nextVer = await stagingNewsroomVideoService.unpublishVideo(
    "c1000000-0000-4000-a000-000000000001",
    4
  );
  assert.strictEqual(nextVer, 5);
  assert.strictEqual(invoked, true);
});

test("HT-NR-05C-B Studio Service: setFeatured invokes newsroom_set_video_featured", async () => {
  let invoked = false;
  mockNewsroomRpcHandler = async (fn, args) => {
    assert.strictEqual(fn, "newsroom_set_video_featured");
    assert.strictEqual(args.p_video_id, "c1000000-0000-4000-a000-000000000001");
    assert.strictEqual(args.p_expected_version, 3);
    assert.strictEqual(args.p_featured, true);
    invoked = true;
    return { data: 4, error: null };
  };

  const nextVer = await stagingNewsroomVideoService.setFeatured(
    "c1000000-0000-4000-a000-000000000001",
    3,
    true
  );
  assert.strictEqual(nextVer, 4);
  assert.strictEqual(invoked, true);

  // Fails closed on non-boolean featured
  await assert.rejects(
    () => stagingNewsroomVideoService.setFeatured("c1000000-0000-4000-a000-000000000001", 3, "true"),
    /featured must be a boolean/
  );
});

// =============================================================================
// 5. REGISTRY ROW MAPPER (mapNewsroomVideoRow)
// =============================================================================

test("HT-NR-05C-B Row Mapper: mapNewsroomVideoRow handles publishedAt, watchFeatured, publishedBy", () => {
  const baseValid = {
    id: "c1000000-0000-4000-a000-000000000001",
    title: "Validated Title",
    source_url: "https://video.healthtimes.co.zw/vid.mp4",
    thumbnail_url: null,
    duration_seconds: 120,
    related_story_id: null,
    source_provenance: "HealthTimes Studio",
    status: "ready",
    published_at: "2026-10-16T12:00:00.000Z",
    published_by: "00000000-0000-4000-8000-000000000002",
    watch_featured: true,
    lock_version: 5,
    created_by: "00000000-0000-4000-8000-000000000001",
    updated_by: "00000000-0000-4000-8000-000000000001",
    created_at: "2026-10-16T10:00:00.000Z",
    updated_at: "2026-10-16T12:00:00.000Z"
  };

  const mapped = mapNewsroomVideoRow(baseValid);
  assert.ok(mapped);
  assert.strictEqual(mapped.publishedAt, "2026-10-16T12:00:00.000Z");
  assert.strictEqual(mapped.watchFeatured, true);
  assert.strictEqual(mapped.publishedByStaffId, "00000000-0000-4000-8000-000000000002");

  // Unpublished row
  const unpublished = mapNewsroomVideoRow({
    ...baseValid,
    published_at: null,
    published_by: null,
    watch_featured: false
  });
  assert.ok(unpublished);
  assert.strictEqual(unpublished.publishedAt, null);
  assert.strictEqual(unpublished.watchFeatured, false);
  assert.strictEqual(unpublished.publishedByStaffId, null);

  // Fails closed on invalid published_at date
  assert.strictEqual(
    mapNewsroomVideoRow({ ...baseValid, published_at: "invalid-date" }),
    null
  );

  // Fails closed on non-boolean watch_featured
  assert.strictEqual(
    mapNewsroomVideoRow({ ...baseValid, watch_featured: 1 }),
    null
  );
  assert.strictEqual(
    mapNewsroomVideoRow({ ...baseValid, watch_featured: "true" }),
    null
  );
});

// =============================================================================
// 6. PUBLIC VIDEO ROW MAPPER (mapPublicVideoRow)
// =============================================================================

test("HT-NR-05C-B Public Mapper: mapPublicVideoRow constructs canonical VideoItem", () => {
  const row = {
    id: "c1000000-0000-4000-a000-000000000001",
    title: "Canonical Public Video",
    source_url: "https://cdn.healthtimes.co.zw/videos/sample.mp4",
    thumbnail_url: "https://cdn.healthtimes.co.zw/thumbs/sample.jpg",
    duration_seconds: 300,
    published_at: "2026-10-16T15:00:00.000Z",
    watch_featured: true,
    related_story_id: "00000000-0000-4000-8000-000000000099"
  };

  const item = mapPublicVideoRow(row);
  assert.ok(item);
  assert.strictEqual(item.id, "c1000000-0000-4000-a000-000000000001");
  assert.strictEqual(item.title, "Canonical Public Video");
  assert.strictEqual(item.durationSeconds, 300);
  assert.strictEqual(item.sourceUrl, "https://cdn.healthtimes.co.zw/videos/sample.mp4");
  assert.strictEqual(item.publishedAt, "2026-10-16T15:00:00.000Z");
  assert.strictEqual(item.relatedArticleId, "00000000-0000-4000-8000-000000000099");

  // Provenance checks
  assert.strictEqual(item.sourceProvenance.system, "healthtimes-native");
  assert.strictEqual(item.sourceProvenance.sourceId, "c1000000-0000-4000-a000-000000000001");
  assert.strictEqual(item.sourceProvenance.stableKey, "newsroom-video:c1000000-0000-4000-a000-000000000001");

  // Thumbnail checks
  assert.ok(item.thumbnail);
  assert.strictEqual(item.thumbnail.publicUrl, "https://cdn.healthtimes.co.zw/thumbs/sample.jpg");
  assert.strictEqual(item.thumbnail.sourceProvenance.system, "healthtimes-native");

  // Fail-closed checks
  assert.strictEqual(mapPublicVideoRow({ ...row, id: "not-a-uuid" }), null);
  assert.strictEqual(mapPublicVideoRow({ ...row, title: "   " }), null);
  assert.strictEqual(mapPublicVideoRow({ ...row, source_url: "http://insecure.com" }), null);
  assert.strictEqual(mapPublicVideoRow({ ...row, thumbnail_url: "http://insecure.com" }), null);
  assert.strictEqual(mapPublicVideoRow({ ...row, duration_seconds: -1 }), null);
  assert.strictEqual(mapPublicVideoRow({ ...row, published_at: "not-a-date" }), null);
  assert.strictEqual(mapPublicVideoRow({ ...row, related_story_id: "not-a-uuid" }), null);
});

// =============================================================================
// 7. PUBLIC VIDEO SERVICE DELIVERY & FALLBACK SEMANTICS
// =============================================================================

test("HT-NR-05C-B Public Service: Fallback to source-parity on legitimate empty array", async () => {
  const service = createPublicVideoService({
    rpc: async (fn) => {
      assert.strictEqual(fn, "newsroom_public_videos");
      return { data: [], error: null };
    }
  });

  const list = await service.list();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, "fallback-video-1");
});

test("HT-NR-05C-B Public Service: Canonical takeover returns ONLY canonical items", async () => {
  const service = createPublicVideoService({
    rpc: async (fn) => {
      assert.strictEqual(fn, "newsroom_public_videos");
      return {
        data: [
          {
            id: "c1000000-0000-4000-a000-000000000001",
            title: "Live Canonical Featured Video",
            source_url: "https://video.healthtimes.co.zw/live.mp4",
            thumbnail_url: null,
            duration_seconds: 600,
            published_at: "2026-10-16T16:00:00.000Z",
            watch_featured: true,
            related_story_id: null
          }
        ],
        error: null
      };
    }
  });

  const list = await service.list();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, "c1000000-0000-4000-a000-000000000001");
  assert.strictEqual(list[0].title, "Live Canonical Featured Video");
  assert.strictEqual(list[0].sourceProvenance.system, "healthtimes-native");
});

test("HT-NR-05C-B Public Service: Fail-closed on RPC error or malformed payload", async () => {
  // RPC error throws PublicVideoError
  const rpcErrorService = createPublicVideoService({
    rpc: async () => ({ data: null, error: { message: "Database connection failed" } })
  });
  await assert.rejects(
    () => rpcErrorService.list(),
    (err) => err instanceof PublicVideoError && err.code === "RPC_ERROR"
  );

  // Malformed envelope (not an array)
  const malformedEnvelopeService = createPublicVideoService({
    rpc: async () => ({ data: { invalid: "object" }, error: null })
  });
  await assert.rejects(
    () => malformedEnvelopeService.list(),
    (err) => err instanceof PublicVideoError && err.code === "MALFORMED_ENVELOPE"
  );

  // Non-empty array with all malformed rows
  const allMalformedRowsService = createPublicVideoService({
    rpc: async () => ({
      data: [{ id: "bad-id-1" }, { id: "bad-id-2" }],
      error: null
    })
  });
  await assert.rejects(
    () => allMalformedRowsService.list(),
    (err) => err instanceof PublicVideoError && err.code === "MALFORMED_DATA"
  );
});

// =============================================================================
// 8. OWNER PREVIEW & DOMAIN MODELS
// =============================================================================

test("HT-NR-05C-B Preview Data: buildPreviewVideos includes draft, ready, published, and featured items", () => {
  const previewVideos = buildPreviewVideos();
  assert.ok(Array.isArray(previewVideos));
  assert.strictEqual(previewVideos.length, 5);

  const draft = previewVideos.find((v) => v.status === "draft");
  assert.ok(draft, "Must have draft preview video");
  assert.strictEqual(draft.publishedAt, null);
  assert.strictEqual(draft.watchFeatured, false);

  const readyUnpublished = previewVideos.find((v) => v.status === "ready" && !v.publishedAt);
  assert.ok(readyUnpublished, "Must have ready unpublished preview video");

  const publishedFeatured = previewVideos.find((v) => Boolean(v.publishedAt) && v.watchFeatured);
  assert.ok(publishedFeatured, "Must have published featured preview video");
  assert.strictEqual(typeof publishedFeatured.publishedAt, "string");
  assert.strictEqual(publishedFeatured.watchFeatured, true);

  const publishedRegular = previewVideos.find((v) => Boolean(v.publishedAt) && !v.watchFeatured);
  assert.ok(publishedRegular, "Must have published non-featured preview video");
});

test("HT-NR-05C-B UI Component: StudioVideoDesk and StudioVideoDeskView exports", () => {
  assert.strictEqual(typeof StudioVideoDesk, "function");
  assert.strictEqual(typeof StudioVideoDeskView, "function");
  assert.strictEqual(typeof hasVideoPublicationAuthority, "function");
  assert.strictEqual(typeof formatDurationSeconds, "function");
});

test("HT-NR-05C-B Wiring: migratedCorpusServices uses publicVideoService", () => {
  const corpusContent = read("src/services/migrated-corpus.ts");
  assert.ok(
    corpusContent.includes("video: publicVideoService"),
    "migratedCorpusServices must wire publicVideoService to video"
  );
});
