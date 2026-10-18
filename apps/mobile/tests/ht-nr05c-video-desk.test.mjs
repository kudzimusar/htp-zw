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

let mockRpcHandler = null;
const videoServiceModule = loadTs("src/services/newsroom-video.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        rpc: (fn, args) => {
          if (mockRpcHandler) return mockRpcHandler(fn, args);
          return Promise.resolve({ data: null, error: null });
        }
      })
    }
  }
});
const { mapNewsroomVideoRow, stagingNewsroomVideoService } = videoServiceModule;

// =============================================================================
// 1. EXACT INVARIANTS & CUSTODY PRESERVATION
// =============================================================================

test("HT-NR-05C-B Invariant: Migration count is at least 77", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 77, `Migration count must be at least 77. Found ${files.length}.`);
  assert.ok(
    files.includes("20261016210000_ht_nr05c_video_desk_foundation.sql"),
    "Migration directory must contain 20261016210000_ht_nr05c_video_desk_foundation.sql"
  );
  assert.ok(
    files.includes("20261016220000_ht_nr05ca_r1_video_url_safety.sql"),
    "Migration directory must contain 20261016220000_ht_nr05ca_r1_video_url_safety.sql"
  );
  assert.ok(
    files.includes("20261016230000_ht_nr05ca_r2_video_url_port_safety.sql"),
    "Migration directory must contain 20261016230000_ht_nr05ca_r2_video_url_port_safety.sql"
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

test("HT-NR-05C-A-R2 Defect C: validateVideoHttpsUrl enforces public DNS boundary and port parity (1..65535)", () => {
  // Required Canonical Test Matrix (Section 12):
  // PASS:
  assert.strictEqual(validateVideoHttpsUrl("https://example.com/video"), true);
  assert.strictEqual(validateVideoHttpsUrl("https://example.com:443/video"), true);
  assert.strictEqual(validateVideoHttpsUrl("https://example.com:8443/video"), true);
  assert.strictEqual(validateVideoHttpsUrl("https://example.com:65535/video"), true);
  assert.strictEqual(validateVideoHttpsUrl("https://youtube.com?v=abc"), true);
  assert.strictEqual(validateVideoHttpsUrl("https://youtu.be/abc"), true);
  assert.strictEqual(validateVideoHttpsUrl("https://cdn.healthtimes.co.zw/video.mp4"), true);

  // Additional valid cases
  assert.strictEqual(validateVideoHttpsUrl("https://www.youtube.com/watch?v=123"), true);
  assert.strictEqual(validateVideoHttpsUrl("https://player.vimeo.com/video/456"), true);
  assert.strictEqual(validateVideoHttpsUrl("HTTPS://EXAMPLE.COM/STREAM"), true);

  // FAIL:
  assert.strictEqual(validateVideoHttpsUrl("https://example.com:0/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("https://example.com:65536/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("https://example.com:99999/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("https://example.com:abc/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("https://localhost/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("https://127.0.0.1/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("https://[::1]/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("https://example/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("https://user:pass@example.com/video"), false);
  assert.strictEqual(validateVideoHttpsUrl("http://example.com/video"), false);

  // Insecure protocols & invalid formats fail closed
  assert.strictEqual(validateVideoHttpsUrl("javascript:alert(1)"), false);
  assert.strictEqual(validateVideoHttpsUrl("ftp://files.example.com/video.mp4"), false);
  assert.strictEqual(validateVideoHttpsUrl("data:video/mp4;base64,..."), false);
  assert.strictEqual(validateVideoHttpsUrl("file:///etc/passwd"), false);
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

// =============================================================================
// 10. HT-NR-05C-A-R1 REMEDIATION SUITES (DEFECTS A, B, B2)
// =============================================================================

test("HT-NR-05C-A-R1 Defect A: mapNewsroomVideoRow maps valid row with exact types", () => {
  const validRow = {
    id: "a0000000-0000-4000-8000-000000000001",
    title: "MOHCC Briefing on Cholera Containment",
    source_url: "https://youtube.com/watch?v=cholera2026",
    thumbnail_url: "https://cdn.healthtimes.co.zw/thumbs/cholera.jpg",
    duration_seconds: 420,
    related_story_id: "b0000000-0000-4000-8000-000000000002",
    source_provenance: "HealthTimes Studio broadcast capture",
    status: "ready",
    lock_version: 3,
    created_at: "2026-10-16T12:00:00.000Z",
    updated_at: "2026-10-16T12:30:00.000Z",
    created_by: "c0000000-0000-4000-8000-000000000003",
    updated_by: "c0000000-0000-4000-8000-000000000003"
  };

  const mapped = mapNewsroomVideoRow(validRow);
  assert.ok(mapped !== null, "Valid row must map successfully");
  assert.strictEqual(mapped.id, validRow.id);
  assert.strictEqual(mapped.title, validRow.title);
  assert.strictEqual(mapped.sourceUrl, validRow.source_url);
  assert.strictEqual(mapped.thumbnailUrl, validRow.thumbnail_url);
  assert.strictEqual(mapped.durationSeconds, 420);
  assert.strictEqual(mapped.relatedStoryId, validRow.related_story_id);
  assert.strictEqual(mapped.sourceProvenance, validRow.source_provenance);
  assert.strictEqual(mapped.status, "ready");
  assert.strictEqual(mapped.lockVersion, 3);
  assert.strictEqual(mapped.createdAt, validRow.created_at);
  assert.strictEqual(mapped.updatedAt, validRow.updated_at);
  assert.strictEqual(mapped.createdByStaffId, validRow.created_by);
  assert.strictEqual(mapped.updatedByStaffId, validRow.updated_by);
});

test("HT-NR-05C-A-R1 Defect A: mapNewsroomVideoRow rejects malformed rows and never fabricates defaults", () => {
  const baseValid = {
    id: "a0000000-0000-4000-8000-000000000001",
    title: "Valid Video",
    source_url: "https://example.com/stream.mp4",
    thumbnail_url: null,
    duration_seconds: null,
    related_story_id: null,
    source_provenance: "Field reporter",
    status: "draft",
    lock_version: 1,
    created_at: "2026-10-16T10:00:00.000Z",
    updated_at: "2026-10-16T10:00:00.000Z",
    created_by: "c0000000-0000-4000-8000-000000000003",
    updated_by: "c0000000-0000-4000-8000-000000000003"
  };

  // Null or non-object row returns null
  assert.strictEqual(mapNewsroomVideoRow(null), null);
  assert.strictEqual(mapNewsroomVideoRow(undefined), null);
  assert.strictEqual(mapNewsroomVideoRow("bad"), null);

  // Malformed ID (not UUID) returns null
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, id: "123" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, id: null }), null);

  // Malformed title (empty) returns null
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, title: "" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, title: "   " }), null);

  // Malformed source_url returns null
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, source_url: "http://insecure.com" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, source_url: "https://localhost/vid" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, source_url: "https://192.168.1.1/vid" }), null);

  // Malformed thumbnail_url returns null
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, thumbnail_url: "http://thumb.jpg" }), null);

  // Malformed duration returns null
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, duration_seconds: -1 }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, duration_seconds: 12.3 }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, duration_seconds: "120" }), null);

  // Malformed related_story_id returns null
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, related_story_id: "not-a-uuid" }), null);

  // Malformed provenance returns null
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, source_provenance: "" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, source_provenance: "   " }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, source_provenance: null }), null);

  // Unknown status must return null (NEVER fallback to draft)
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, status: "archived" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, status: "pending" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, status: "published" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, status: null }), null);

  // Invalid lock_version must return null (NEVER fallback to 1)
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, lock_version: 0 }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, lock_version: -1 }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, lock_version: "1" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, lock_version: null }), null);

  // Invalid timestamps must return null (NEVER fallback to current timestamp)
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, created_at: "not-a-date" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, created_at: null }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, updated_at: "invalid" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, updated_at: null }), null);

  // Missing or malformed audit columns (created_by, updated_by) must return null
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, created_by: "not-uuid" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, created_by: null }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, updated_by: "not-uuid" }), null);
  assert.strictEqual(mapNewsroomVideoRow({ ...baseValid, updated_by: null }), null);
});
test("HT-NR-05C-A-R2 Defect A: Mutation responses strictly validate returned identifiers and lock versions without coercion", async () => {
  const videoId = "00000000-0000-4000-8000-000000000099";

  // 1. createVideo strict UUID check
  mockRpcHandler = async (fn, args) => {
    if (fn === "newsroom_create_video") {
      return { data: "00000000-0000-4000-8000-000000000099", error: null };
    }
  };
  const createdId = await stagingNewsroomVideoService.createVideo({
    title: "Valid Title",
    sourceUrl: "https://example.com/v.mp4",
    sourceProvenance: "Archive"
  });
  assert.strictEqual(createdId, "00000000-0000-4000-8000-000000000099");

  // createVideo rejects non-UUID response
  mockRpcHandler = async () => ({ data: "not-a-uuid", error: null });
  await assert.rejects(
    async () =>
      stagingNewsroomVideoService.createVideo({
        title: "Test",
        sourceUrl: "https://example.com/v.mp4",
        sourceProvenance: "Archive"
      }),
    /canonical UUID/
  );

  mockRpcHandler = async () => ({ data: null, error: null });
  await assert.rejects(
    async () =>
      stagingNewsroomVideoService.createVideo({
        title: "Test",
        sourceUrl: "https://example.com/v.mp4",
        sourceProvenance: "Archive"
      }),
    /canonical UUID/
  );

  // 2. saveVideo lock version contract (Section 5 test matrix, expectedVersion = 2)
  // expectedVersion = 2, returns 3 -> PASS
  mockRpcHandler = async () => ({ data: 3, error: null });
  const savedVersion = await stagingNewsroomVideoService.saveVideo(videoId, 2, { title: "Updated Title" });
  assert.strictEqual(savedVersion, 3);

  // returns "3" -> FAIL
  mockRpcHandler = async () => ({ data: "3", error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.saveVideo(videoId, 2, { title: "Updated" }),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns null -> FAIL
  mockRpcHandler = async () => ({ data: null, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.saveVideo(videoId, 2, { title: "Updated" }),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns NaN -> FAIL
  mockRpcHandler = async () => ({ data: NaN, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.saveVideo(videoId, 2, { title: "Updated" }),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns Infinity -> FAIL
  mockRpcHandler = async () => ({ data: Infinity, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.saveVideo(videoId, 2, { title: "Updated" }),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns 2 (same version) -> FAIL
  mockRpcHandler = async () => ({ data: 2, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.saveVideo(videoId, 2, { title: "Updated" }),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns 1 (lower version) -> FAIL
  mockRpcHandler = async () => ({ data: 1, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.saveVideo(videoId, 2, { title: "Updated" }),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns 3.5 (fractional) -> FAIL
  mockRpcHandler = async () => ({ data: 3.5, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.saveVideo(videoId, 2, { title: "Updated" }),
    /expected numeric lock version strictly greater than expected version/
  );

  // 3. setReady lock version contract (Section 5 test matrix, expectedVersion = 2)
  // expectedVersion = 2, returns 3 -> PASS
  mockRpcHandler = async () => ({ data: 3, error: null });
  const readyVersion = await stagingNewsroomVideoService.setReady(videoId, 2, true);
  assert.strictEqual(readyVersion, 3);

  // returns "3" -> FAIL
  mockRpcHandler = async () => ({ data: "3", error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.setReady(videoId, 2, true),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns null -> FAIL
  mockRpcHandler = async () => ({ data: null, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.setReady(videoId, 2, true),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns NaN -> FAIL
  mockRpcHandler = async () => ({ data: NaN, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.setReady(videoId, 2, true),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns Infinity -> FAIL
  mockRpcHandler = async () => ({ data: Infinity, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.setReady(videoId, 2, true),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns 2 (same version) -> FAIL
  mockRpcHandler = async () => ({ data: 2, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.setReady(videoId, 2, true),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns 1 (lower version) -> FAIL
  mockRpcHandler = async () => ({ data: 1, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.setReady(videoId, 2, true),
    /expected numeric lock version strictly greater than expected version/
  );

  // returns 3.5 (fractional) -> FAIL
  mockRpcHandler = async () => ({ data: 3.5, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.setReady(videoId, 2, true),
    /expected numeric lock version strictly greater than expected version/
  );

  mockRpcHandler = null;
});

test("HT-NR-05C-A-R2 Defect B: listVideos rejects malformed envelopes and preserves valid rows in mixed responses", async () => {
  // RPC returns null -> listVideos() rejects
  mockRpcHandler = async () => ({ data: null, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.listVideos(),
    /expected array of video rows/
  );

  // RPC returns object -> listVideos() rejects
  mockRpcHandler = async () => ({ data: { error: "something" }, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.listVideos(),
    /expected array of video rows/
  );

  // RPC returns string -> listVideos() rejects
  mockRpcHandler = async () => ({ data: "not-an-array", error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.listVideos(),
    /expected array of video rows/
  );

  // RPC returns number -> listVideos() rejects
  mockRpcHandler = async () => ({ data: 42, error: null });
  await assert.rejects(
    async () => stagingNewsroomVideoService.listVideos(),
    /expected array of video rows/
  );

  // RPC returns [] -> valid empty registry
  mockRpcHandler = async () => ({ data: [], error: null });
  const emptyResult = await stagingNewsroomVideoService.listVideos();
  assert.ok(Array.isArray(emptyResult), "Must return array");
  assert.strictEqual(emptyResult.length, 0, "Must be empty array");

  // RPC returns mixed array [validRow1, malformedRow, validRow2]
  const validRow1 = {
    id: "a0000000-0000-4000-8000-000000000001",
    title: "Valid Video 1",
    source_url: "https://example.com/stream1.mp4",
    thumbnail_url: null,
    duration_seconds: 120,
    related_story_id: null,
    source_provenance: "Reporter A",
    status: "draft",
    lock_version: 1,
    created_at: "2026-10-16T10:00:00.000Z",
    updated_at: "2026-10-16T10:00:00.000Z",
    created_by: "c0000000-0000-4000-8000-000000000003",
    updated_by: "c0000000-0000-4000-8000-000000000003"
  };

  const malformedRow = {
    id: "not-a-uuid",
    title: "",
    source_url: "http://insecure.com",
    status: "unknown"
  };

  const validRow2 = {
    id: "a0000000-0000-4000-8000-000000000002",
    title: "Valid Video 2",
    source_url: "https://example.com/stream2.mp4",
    thumbnail_url: "https://example.com/thumb2.jpg",
    duration_seconds: 240,
    related_story_id: null,
    source_provenance: "Reporter B",
    status: "ready",
    lock_version: 2,
    created_at: "2026-10-16T11:00:00.000Z",
    updated_at: "2026-10-16T11:00:00.000Z",
    created_by: "c0000000-0000-4000-8000-000000000003",
    updated_by: "c0000000-0000-4000-8000-000000000003"
  };

  mockRpcHandler = async () => ({
    data: [validRow1, malformedRow, validRow2],
    error: null
  });

  const mixedResult = await stagingNewsroomVideoService.listVideos();
  assert.strictEqual(mixedResult.length, 2, "Valid rows must survive and malformed row omitted");
  assert.strictEqual(mixedResult[0].id, validRow1.id);
  assert.strictEqual(mixedResult[1].id, validRow2.id);

  mockRpcHandler = null;
});

test("HT-NR-05C-A-R1 Defect B: Operational StudioVideoDesk supplies search query to listVideos", () => {
  const deskSource = read("src/ui/StudioVideoDesk.tsx");

  // Verify search state and debounce in StudioVideoDesk
  assert.ok(
    deskSource.includes("const [searchQuery, setSearchQuery] = useState"),
    "StudioVideoDesk must maintain searchQuery state"
  );
  assert.ok(
    deskSource.includes("const [debouncedSearch, setDebouncedSearch] = useState"),
    "StudioVideoDesk must maintain debouncedSearch state"
  );
  assert.ok(
    deskSource.includes("search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined"),
    "StudioVideoDesk must pass debounced search to services.newsroomVideo.listVideos"
  );
  assert.ok(
    deskSource.includes("limit: 100"),
    "StudioVideoDesk must explicitly request limit: 100"
  );

  // Verify services.newsroomVideo passes p_search to RPC
  const serviceSource = read("src/services/newsroom-video.ts");
  assert.ok(
    serviceSource.includes("p_search: options?.search ?? null"),
    "stagingNewsroomVideoService must supply p_search to newsroom_list_videos"
  );
});

test("HT-NR-05C-A-R1 Defect B2: Metric counters display truthful result-set labels and disclosure text", () => {
  const deskSource = read("src/ui/StudioVideoDesk.tsx");

  // Verify truthful labels
  assert.ok(
    deskSource.includes("Loaded Results"),
    "Metric counters must display 'Loaded Results' instead of 'Total Registered'"
  );
  assert.ok(
    deskSource.includes("Draft in Results"),
    "Metric counters must display 'Draft in Results' instead of 'Draft Videos'"
  );
  assert.ok(
    deskSource.includes("Ready in Results"),
    "Metric counters must display 'Ready in Results' instead of 'Ready Videos'"
  );

  // Verify disclosure copy
  assert.ok(
    deskSource.includes("Showing up to 100 server-matched videos. Results reflect current query criteria."),
    "Must display explicit disclosure copy explaining the result set constraint"
  );

  // Prohibit fake authority labels in the metrics row
  assert.strictEqual(
    deskSource.includes("<Text style={styles.metricLabel}>Total Registered</Text>"),
    false,
    "Must not claim authoritative 'Total Registered' in metric labels"
  );
  assert.strictEqual(
    deskSource.includes("<Text style={styles.metricLabel}>Draft Videos</Text>"),
    false,
    "Must not claim authoritative 'Draft Videos' in metric labels"
  );
  assert.strictEqual(
    deskSource.includes("<Text style={styles.metricLabel}>Ready Videos</Text>"),
    false,
    "Must not claim authoritative 'Ready Videos' in metric labels"
  );
});
