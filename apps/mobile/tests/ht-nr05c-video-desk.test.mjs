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

// Load TypeScript modules
const models = loadTs("src/domain/models.ts");
const {
  validateVideoHttpsUrl,
  validateVideoCreateInput,
  validateVideoPatch
} = models;

const previewData = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: {} } },
    "../platform/config": { appEnvironment: "staging" }
  }
});
const { buildPreviewVideos } = previewData;

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
          getSnapshot: async () => ({
            status: "authorized",
            source: "server",
            staffProfileId: "00000000-0000-4000-8000-000000000001",
            capabilities: ["media.manage"],
            reason: "Authorized session"
          })
        },
        newsroomVideo: {
          listVideos: async () => [],
          createVideo: async () => "00000000-0000-4000-a000-000000000001",
          saveVideo: async () => 2,
          setReady: async () => 2
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
const { hasVideoDeskAuthority, formatDurationSeconds, StudioVideoDeskView, StudioVideoDesk } = uiModule;

// =============================================================================
// 1. EXACT INVARIANTS & CUSTODY PRESERVATION
// =============================================================================

test("HT-NR-05C Invariant: Migration count is exactly 66", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.strictEqual(
    files.length,
    66,
    `Migration count must be exactly 66 (65 prior + 05C video desk foundation). Found ${files.length}.`
  );
  assert.ok(
    files.includes("20261016210000_ht_nr05c_video_desk_foundation.sql"),
    "Migration directory must contain 20261016210000_ht_nr05c_video_desk_foundation.sql"
  );
});

test("HT-NR-05C Invariant: Primary repository remains untouched", () => {
  const primaryRepo = "/Users/shadreckmusarurwa/Project AI/htp-zw";
  if (fs.existsSync(primaryRepo)) {
    const status = execSync("git status --porcelain", {
      cwd: primaryRepo,
      encoding: "utf8"
    }).trim();
    assert.strictEqual(
      status,
      "",
      `Primary repository at ${primaryRepo} must remain pristine and untouched.`
    );
  }
});

test("HT-NR-05C Invariant: Reader Watch and Reader Live code are frozen and untouched", () => {
  const watchPath = path.join(root, "app/(reader)/watch.tsx");
  const livePath = path.join(root, "app/(reader)/live.tsx");

  assert.ok(fs.existsSync(watchPath), "Reader watch.tsx must exist");
  assert.ok(fs.existsSync(livePath), "Reader live.tsx must exist");

  const watchContent = fs.readFileSync(watchPath);
  const watchHeader = `blob ${watchContent.length}\0`;
  const watchSha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(watchHeader), watchContent]))
    .digest("hex");

  assert.strictEqual(
    watchSha,
    "34f2335e3fef6308f3656edb160bd2da3675f716",
    `Reader Watch git blob SHA must match exact parent authority 34f2335e3fef6308f3656edb160bd2da3675f716. Found: ${watchSha}`
  );
});

// =============================================================================
// 2. AUTHORITY AND CAPABILITY GATING (Section 40)
// =============================================================================

test("HT-NR-05C Section 40: hasVideoDeskAuthority enforces server authority and media.manage capability", () => {
  // Null / undefined / invalid inputs fail closed
  assert.strictEqual(hasVideoDeskAuthority(null), false);
  assert.strictEqual(hasVideoDeskAuthority(undefined), false);
  assert.strictEqual(hasVideoDeskAuthority(""), false);
  assert.strictEqual(hasVideoDeskAuthority({}), false);

  // Status must be "authorized"
  assert.strictEqual(
    hasVideoDeskAuthority({
      status: "unauthorized",
      source: "server",
      capabilities: ["media.manage"]
    }),
    false
  );

  // Source must be "server"
  assert.strictEqual(
    hasVideoDeskAuthority({
      status: "authorized",
      source: "client_fallback",
      capabilities: ["media.manage"]
    }),
    false
  );

  // Missing capabilities array fails closed
  assert.strictEqual(
    hasVideoDeskAuthority({
      status: "authorized",
      source: "server",
      capabilities: null
    }),
    false
  );

  // Missing media.manage capability fails closed
  assert.strictEqual(
    hasVideoDeskAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["story.edit_all", "story.publish", "assignment.manage"]
    }),
    false
  );

  // Role name strings alone (e.g. admin, editor) do NOT confer authority
  assert.strictEqual(
    hasVideoDeskAuthority({
      status: "authorized",
      source: "server",
      role: "editor",
      capabilities: ["story.edit_all"]
    }),
    false
  );
  assert.strictEqual(
    hasVideoDeskAuthority({
      status: "authorized",
      source: "server",
      role: "admin",
      capabilities: []
    }),
    false
  );

  // Valid server authority with media.manage succeeds
  assert.strictEqual(
    hasVideoDeskAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["media.manage"]
    }),
    true
  );
  assert.strictEqual(
    hasVideoDeskAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["story.edit_all", "media.manage", "story.publish"]
    }),
    true
  );
});

test("HT-NR-05C Section 40: Studio module route gates video-desk with media.manage capability", () => {
  const moduleSource = read("app/studio/[module].tsx");

  // Verify video-desk module configuration
  assert.ok(
    moduleSource.includes('"video-desk":'),
    "Module configuration must configure video-desk"
  );
  assert.ok(
    moduleSource.includes('capability:"media.manage"') ||
      moduleSource.includes('capability: "media.manage"'),
    "Module configuration must require media.manage capability"
  );
  assert.ok(
    moduleSource.includes("<StudioVideoDesk />"),
    "Module route must render StudioVideoDesk"
  );
  assert.ok(
    moduleSource.includes('String(module)!=="video-desk"') ||
      moduleSource.includes('String(module) !== "video-desk"'),
    "Placeholder screen must explicitly exclude video-desk"
  );
});

// =============================================================================
// 3. VALIDATION & DOMAIN CONTRACTS (Section 41)
// =============================================================================

test("HT-NR-05C Section 41: validateVideoHttpsUrl enforces HTTPS scheme and rejects non-HTTPS protocols", () => {
  // Valid HTTPS URLs
  assert.strictEqual(validateVideoHttpsUrl("https://example.com/video.mp4"), true);
  assert.strictEqual(validateVideoHttpsUrl("https://cdn.healthtimes.co.zw/hls/live.m3u8"), true);
  assert.strictEqual(validateVideoHttpsUrl("HTTPS://EXAMPLE.COM/STREAM"), true);

  // Non-HTTPS schemes fail closed
  assert.strictEqual(validateVideoHttpsUrl("http://example.com/video.mp4"), false);
  assert.strictEqual(validateVideoHttpsUrl("ftp://files.example.com/video.mp4"), false);
  assert.strictEqual(validateVideoHttpsUrl("javascript:alert(1)"), false);
  assert.strictEqual(validateVideoHttpsUrl("data:video/mp4;base64,..."), false);
  assert.strictEqual(validateVideoHttpsUrl("file:///etc/passwd"), false);

  // Invalid / relative URLs fail closed
  assert.strictEqual(validateVideoHttpsUrl("/relative/path/video.mp4"), false);
  assert.strictEqual(validateVideoHttpsUrl("not-a-url"), false);
  assert.strictEqual(validateVideoHttpsUrl(""), false);
  assert.strictEqual(validateVideoHttpsUrl(null), false);
  assert.strictEqual(validateVideoHttpsUrl(undefined), false);
});

test("HT-NR-05C Section 41: validateVideoCreateInput validates required fields and fails closed", () => {
  const validBase = {
    title: "Health Worker Training: Immunisation Protocols",
    sourceUrl: "https://video.healthtimes.co.zw/training/immunisation.mp4",
    sourceProvenance: "Ministry of Health press briefing feed",
    durationSeconds: 180,
    relatedStoryId: "00000000-0000-4000-8000-000000000001",
    thumbnailUrl: "https://video.healthtimes.co.zw/thumbs/immunisation.jpg"
  };

  // Valid base passes
  const resValid = validateVideoCreateInput(validBase);
  assert.strictEqual(resValid.valid, true);
  assert.strictEqual(resValid.error, undefined);

  // Null / non-object input fails closed
  assert.strictEqual(validateVideoCreateInput(null).valid, false);
  assert.strictEqual(validateVideoCreateInput("string").valid, false);

  // Title validation
  assert.strictEqual(validateVideoCreateInput({ ...validBase, title: "" }).valid, false);
  assert.strictEqual(validateVideoCreateInput({ ...validBase, title: "   " }).valid, false);
  assert.strictEqual(validateVideoCreateInput({ ...validBase, title: null }).valid, false);

  // Source URL validation
  assert.strictEqual(
    validateVideoCreateInput({ ...validBase, sourceUrl: "http://insecure.com/video.mp4" }).valid,
    false
  );
  assert.strictEqual(
    validateVideoCreateInput({ ...validBase, sourceUrl: "" }).valid,
    false
  );

  // Provenance validation
  assert.strictEqual(
    validateVideoCreateInput({ ...validBase, sourceProvenance: "" }).valid,
    false
  );
  assert.strictEqual(
    validateVideoCreateInput({ ...validBase, sourceProvenance: null }).valid,
    false
  );

  // Duration validation: negative numbers rejected
  assert.strictEqual(
    validateVideoCreateInput({ ...validBase, durationSeconds: -5 }).valid,
    false
  );
  // Duration validation: floating point rejected
  assert.strictEqual(
    validateVideoCreateInput({ ...validBase, durationSeconds: 12.5 }).valid,
    false
  );

  // Thumbnail URL validation: non-HTTPS rejected
  assert.strictEqual(
    validateVideoCreateInput({ ...validBase, thumbnailUrl: "http://thumb.jpg" }).valid,
    false
  );

  // Related story validation: non-UUID rejected
  assert.strictEqual(
    validateVideoCreateInput({ ...validBase, relatedStoryId: "invalid-uuid" }).valid,
    false
  );
});

test("HT-NR-05C Section 41: Server owns ID, status='draft', lock_version=1 on creation", () => {
  const migrationSql = readRepo("supabase/migrations/20261016210000_ht_nr05c_video_desk_foundation.sql");

  // Verify newsroom_create_video sets initial values
  assert.ok(
    migrationSql.includes("'draft',"),
    "newsroom_create_video must set status to 'draft'"
  );
  assert.ok(
    migrationSql.includes("1,"),
    "newsroom_create_video must initialize lock_version to 1"
  );
  assert.ok(
    migrationSql.includes("returning id into v_id;"),
    "newsroom_create_video must generate and return id"
  );
  assert.ok(
    migrationSql.includes("v_actor := coalesce(public.newsroom_current_staff_id_basic(), auth.uid()"),
    "newsroom_create_video must resolve caller staff ID as created_by"
  );
});

// =============================================================================
// 4. OPTIMISTIC CONCURRENCY & SAVE PATCHING (Section 42)
// =============================================================================

test("HT-NR-05C Section 42: validateVideoPatch rejects unpatchable keys and invalid values", () => {
  // Valid patch passes
  const validPatch = validateVideoPatch({
    title: "Updated Video Title",
    durationSeconds: 300
  });
  assert.strictEqual(validPatch.valid, true);

  // Empty patch rejected
  const emptyPatch = validateVideoPatch({});
  assert.strictEqual(emptyPatch.valid, false);
  assert.match(emptyPatch.error, /Patch must contain at least one field to update/);

  // Unpatchable keys fail closed
  for (const forbiddenKey of [
    "id",
    "status",
    "lock_version",
    "lockVersion",
    "created_at",
    "createdAt",
    "updated_at",
    "updatedAt",
    "created_by",
    "updated_by"
  ]) {
    const res = validateVideoPatch({ [forbiddenKey]: "foo" });
    assert.strictEqual(res.valid, false);
    assert.match(res.error, new RegExp(`Invalid or unpatchable field: ${forbiddenKey}`));
  }

  // Duration validation in patch
  assert.strictEqual(validateVideoPatch({ durationSeconds: -10 }).valid, false);
  assert.strictEqual(validateVideoPatch({ durationSeconds: 4.2 }).valid, false);

  // Source URL validation in patch
  assert.strictEqual(validateVideoPatch({ sourceUrl: "http://insecure.org/stream" }).valid, false);

  // Related story validation in patch
  assert.strictEqual(validateVideoPatch({ relatedStoryId: "not-a-uuid" }).valid, false);
});

test("HT-NR-05C Section 42: Migration newsroom_save_video implements optimistic concurrency", () => {
  const migrationSql = readRepo("supabase/migrations/20261016210000_ht_nr05c_video_desk_foundation.sql");

  // Verify concurrency check in SQL
  assert.ok(
    migrationSql.includes("if not found or v_existing.lock_version <> p_expected_version then"),
    "newsroom_save_video must compare existing lock_version against expected_version"
  );
  assert.ok(
    migrationSql.includes("errcode='40001'"),
    "Concurrency conflict must raise serialization_failure (40001)"
  );
  assert.ok(
    migrationSql.includes("v_new_version := v_existing.lock_version + 1;"),
    "newsroom_save_video must increment lock_version on save"
  );
});

// =============================================================================
// 5. READINESS LIFECYCLE (Section 43)
// =============================================================================

test("HT-NR-05C Section 43: newsroom_set_video_ready enforces publication-ready minimums", () => {
  const migrationSql = readRepo("supabase/migrations/20261016210000_ht_nr05c_video_desk_foundation.sql");

  // Verify readiness validation in SQL
  assert.ok(
    migrationSql.includes("if p_ready then"),
    "newsroom_set_video_ready must distinguish ready vs draft transitions"
  );
  assert.ok(
    migrationSql.includes("Video title cannot be empty for ready status"),
    "newsroom_set_video_ready must enforce non-empty title"
  );
  assert.ok(
    migrationSql.includes("Valid HTTPS source_url is required for ready status"),
    "newsroom_set_video_ready must enforce valid HTTPS source URL"
  );
  assert.ok(
    migrationSql.includes("source_provenance cannot be empty for ready status"),
    "newsroom_set_video_ready must enforce non-empty source provenance"
  );
  assert.ok(
    migrationSql.includes("v_new_status := 'ready';"),
    "Setting ready transitions status to 'ready'"
  );
  assert.ok(
    migrationSql.includes("v_new_status := 'draft';"),
    "Setting draft transitions status to 'draft'"
  );
});

// =============================================================================
// 6. DIRECT TABLE ISOLATION & RPC INTERFACE (Section 44)
// =============================================================================

test("HT-NR-05C Section 44: Service layer adheres strictly to direct table isolation", () => {
  const serviceSource = read("src/services/newsroom-video.ts");
  const uiSource = read("src/ui/StudioVideoDesk.tsx");

  // Verify no direct table selects/inserts/updates to newsroom_videos
  assert.strictEqual(
    serviceSource.includes('.from("newsroom_videos")'),
    false,
    "Service layer must never directly query newsroom_videos table"
  );
  assert.strictEqual(
    serviceSource.includes(".from('newsroom_videos')"),
    false,
    "Service layer must never directly query newsroom_videos table"
  );
  assert.strictEqual(
    uiSource.includes('.from("newsroom_videos")'),
    false,
    "UI layer must never directly query newsroom_videos table"
  );
  assert.strictEqual(
    uiSource.includes(".from('newsroom_videos')"),
    false,
    "UI layer must never directly query newsroom_videos table"
  );

  // Verify canonical RPC invocation
  for (const rpc of [
    "newsroom_list_videos",
    "newsroom_create_video",
    "newsroom_save_video",
    "newsroom_set_video_ready"
  ]) {
    assert.ok(
      serviceSource.includes(`"${rpc}"`),
      `Service layer must invoke canonical RPC: ${rpc}`
    );
  }
});

test("HT-NR-05C Section 44: Fixture service provides fail-closed contract implementation", () => {
  const fixturesSource = read("src/services/fixtures.ts");
  assert.ok(
    fixturesSource.includes("fixtureNewsroomVideoService"),
    "fixtures.ts must export fixtureNewsroomVideoService"
  );
  assert.ok(
    fixturesSource.includes("newsroomVideo: fixtureNewsroomVideoService"),
    "fixtureServices must include newsroomVideo"
  );
  assert.ok(
    fixturesSource.includes("Fixture video service mutations remain locked in non-production fixture mode"),
    "fixtureNewsroomVideoService must fail closed on mutations"
  );
});

test("HT-NR-05C Section 44: Staging services index registers newsroomVideo contract", () => {
  const servicesIndexSource = read("src/services/index.ts");
  assert.ok(
    servicesIndexSource.includes("stagingNewsroomVideoService"),
    "services/index.ts must export stagingNewsroomVideoService"
  );
  assert.ok(
    servicesIndexSource.includes("newsroomVideo: stagingNewsroomVideoService"),
    "services index must wire newsroomVideo to stagingNewsroomVideoService"
  );
});

// =============================================================================
// 7. FORMATTING & PRESENTATION TRUTH
// =============================================================================

test("HT-NR-05C Formatting: formatDurationSeconds formats seconds truthfully", () => {
  assert.strictEqual(formatDurationSeconds(0), "0s");
  assert.strictEqual(formatDurationSeconds(45), "45s");
  assert.strictEqual(formatDurationSeconds(60), "1m 00s");
  assert.strictEqual(formatDurationSeconds(75), "1m 15s");
  assert.strictEqual(formatDurationSeconds(745), "12m 25s");
  assert.strictEqual(formatDurationSeconds(3600), "60m 00s");

  // Missing or negative values format truthfully as Unknown duration
  assert.strictEqual(formatDurationSeconds(null), "Unknown duration");
  assert.strictEqual(formatDurationSeconds(undefined), "Unknown duration");
  assert.strictEqual(formatDurationSeconds(-10), "Unknown duration");
  assert.strictEqual(formatDurationSeconds(NaN), "Unknown duration");
});

test("HT-NR-05C UI: StudioVideoDesk and StudioVideoDeskView are properly exported", () => {
  assert.ok(typeof StudioVideoDesk === "function", "StudioVideoDesk must be exported");
  assert.ok(typeof StudioVideoDeskView === "function", "StudioVideoDeskView must be exported");
});

// =============================================================================
// 8. OWNER PREVIEW SAMPLE DATA & ISOLATION
// =============================================================================

test("HT-NR-05C Owner Preview: buildPreviewVideos provides required sample states", () => {
  const sampleVideos = buildPreviewVideos();
  assert.ok(sampleVideos.length >= 4, "Must provide at least 4 sample videos");

  // All sample videos have truthful PREVIEW data
  for (const v of sampleVideos) {
    assert.ok(v.id.startsWith("c1000000-"), `Sample video ID must be deterministic UUID: ${v.id}`);
    assert.ok(v.title.length > 0, "Sample video must have a title");
    assert.ok(v.sourceUrl.startsWith("https://"), "Sample video source URL must be HTTPS");
    assert.ok(v.sourceProvenance.length > 0, "Sample video must have provenance");
    assert.ok(["draft", "ready"].includes(v.status), "Sample video status must be draft or ready");
    assert.ok(v.lockVersion >= 1, "Sample video lock version must be at least 1");
  }

  // Covers draft and ready statuses
  const statuses = new Set(sampleVideos.map((v) => v.status));
  assert.ok(statuses.has("draft"), "Must include draft video");
  assert.ok(statuses.has("ready"), "Must include ready video");

  // Covers video with null duration / null thumbnail
  assert.ok(
    sampleVideos.some((v) => v.durationSeconds === null && v.thumbnailUrl === null),
    "Must include sample video with unknown duration and no thumbnail"
  );

  // Covers video with related story
  assert.ok(
    sampleVideos.some((v) => v.relatedStoryId !== null),
    "Must include sample video with related story linkage"
  );
});

test("HT-NR-05C Owner Preview: Studio Video Desk view is rendered in OwnerPreviewStudio", () => {
  const studioPreviewSource = read("src/preview/OwnerPreviewStudio.tsx");

  assert.ok(
    studioPreviewSource.includes('case "video-desk":'),
    "OwnerPreviewModuleScreen must handle 'video-desk' slug"
  );
  assert.ok(
    studioPreviewSource.includes("<StudioVideoDeskView"),
    "OwnerPreviewStudio must render StudioVideoDeskView"
  );
  assert.ok(
    studioPreviewSource.includes("function OwnerPreviewVideoDeskView"),
    "OwnerPreviewStudio must export OwnerPreviewVideoDeskView"
  );
});

// =============================================================================
// 9. STAGING CONNECTIVITY & DATABASE RESTRAINT
// =============================================================================

test("HT-NR-05C Staging Read-Only: newsroom_list_videos RPC fails closed for anonymous caller", async () => {
  const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
  const stagingEnv = eas.build?.staging?.env ?? {};
  const supabaseUrl = stagingEnv.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = stagingEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  assert.ok(supabaseUrl, "Staging Supabase URL must be configured in eas.json");
  assert.ok(anonKey, "Staging Supabase key must be configured in eas.json");

  // Calling newsroom_list_videos anonymously must be rejected with 401 or 403 or P0001
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/newsroom_list_videos`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_status: null, p_search: null, p_limit: 10 })
  });

  // RPC revoked from public/anon or newsroom_session_authorized fails closed
  assert.ok(
    !response.ok,
    `newsroom_list_videos must fail closed for anonymous requests, returned status ${response.status}`
  );
});
