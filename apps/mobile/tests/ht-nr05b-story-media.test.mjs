import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function readRepo(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

// -----------------------------------------------------------------------------
// LOAD MODULES VIA TS-LOADER
// -----------------------------------------------------------------------------

const models = loadTs("src/domain/models.ts");
const {
  ALLOWED_STORY_MEDIA_MIME_TYPES,
  MAX_STORY_MEDIA_BYTES,
  isValidSha256Checksum,
  validateStoryMediaUpload,
  buildCanonicalPublicStorageKey
} = models;

const dummyChecksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

let mockRpcCalls = [];
let mockRpcResponse = { data: [], error: null };
let mockSession = { session: { user: { id: "00000000-0000-4000-8000-000000000001" } } };

const mockSupabase = {
  getStagingSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: mockSession, error: null })
    },
    rpc: async (name, args) => {
      mockRpcCalls.push({ name, args });
      return mockRpcResponse;
    },
    storage: {
      from: (bucket) => ({
        download: async (path) => ({ data: new Blob([new Uint8Array([1, 2, 3])]), error: null }),
        upload: async (targetPath, bytes, options) => ({ error: null }),
        remove: async (paths) => ({ error: null })
      })
    }
  })
};

const storageModule = loadTs("src/services/newsroom-storage.ts", {
  mocks: {
    "../platform/supabase": mockSupabase
  }
});
const {
  computeSha256Hex,
  uploadPrivateObject,
  downloadPrivateObject,
  copyPrivateToPublic,
  deleteStagedPublicObject
} = storageModule;

const mediaServiceModule = loadTs("src/services/newsroom-media.ts", {
  mocks: {
    "../platform/supabase": mockSupabase
  }
});
const { stagingNewsroomMediaService } = mediaServiceModule;

// -----------------------------------------------------------------------------
// 1. INVARIANTS & INTEGRITY TESTS
// -----------------------------------------------------------------------------

test("HT-NR-05B Invariant: Migration count remains exactly 64 (zero new migrations)", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.strictEqual(
    files.length,
    64,
    `Migration count must be exactly 64. Found ${files.length}. No new migrations permitted for HT-NR-05B.`
  );
});

test("HT-NR-05B Invariant: Primary repository is untouched", () => {
  const primaryRepo = "/Users/shadreckmusarurwa/Project AI/htp-zw";
  if (fs.existsSync(primaryRepo)) {
    // Check that primary repo git status is clean
    const status = execSync("git status --porcelain", { cwd: primaryRepo, encoding: "utf8" }).trim();
    assert.strictEqual(
      status,
      "",
      `Primary repository at ${primaryRepo} must remain pristine and untouched.`
    );
  }
});

test("HT-NR-05B Invariant: Reader Watch and Reader Live code are untouched", () => {
  const watchPath = path.join(root, "app/(reader)/watch.tsx");
  const livePath = path.join(root, "app/(reader)/live.tsx");
  if (fs.existsSync(watchPath)) {
    const watchContent = fs.readFileSync(watchPath, "utf8");
    assert.ok(
      !watchContent.includes("newsroom_stage_story_media_promotion"),
      "Reader Watch must not contain studio promotion RPCs"
    );
  }
  if (fs.existsSync(livePath)) {
    const liveContent = fs.readFileSync(livePath, "utf8");
    assert.ok(
      !liveContent.includes("newsroom_stage_story_media_promotion"),
      "Reader Live must not contain studio promotion RPCs"
    );
  }
});

test("HT-NR-05B Invariant: Zero direct table writes to media_assets or media_usage", () => {
  const mediaServiceSource = read("src/services/newsroom-media.ts");
  assert.ok(
    !mediaServiceSource.includes('.from("media_assets").insert'),
    "Zero direct insert to media_assets permitted. Must use newsroom_prepare_story_media."
  );
  assert.ok(
    !mediaServiceSource.includes('.from("media_assets").update'),
    "Zero direct update to media_assets permitted. Must use newsroom_finalize_story_media."
  );
  assert.ok(
    !mediaServiceSource.includes('.from("media_usage").insert'),
    "Zero direct insert to media_usage permitted. Must use newsroom_attach_story_media."
  );
  assert.ok(
    !mediaServiceSource.includes('.from("media_usage").delete'),
    "Zero direct delete to media_usage permitted. Must use newsroom_detach_story_media."
  );
});

test("HT-NR-05B Invariant: Status of promoted media is PUBLIC STAGED, never published", () => {
  const modelsSource = read("src/domain/models.ts");
  const mediaServiceSource = read("src/services/newsroom-media.ts");
  const storageSource = read("src/services/newsroom-storage.ts");
  const uiSource = read("src/ui/StudioStoryMedia.tsx");

  assert.ok(
    modelsSource.includes('"public_staged"'),
    "Must model 'public_staged' status"
  );
  assert.ok(
    mediaServiceSource.includes("newsroom_stage_story_media_promotion"),
    "Must wrap newsroom_stage_story_media_promotion"
  );
  // Ensure the client does not transition story to Published automatically
  assert.ok(
    !uiSource.includes('transitionStory(storyId, "Published")'),
    "Media panel must NOT trigger story publication directly."
  );
});

// -----------------------------------------------------------------------------
// 2. DOMAIN VALIDATION TESTS
// -----------------------------------------------------------------------------

test("HT-NR-05B Validation: isValidSha256Checksum enforces 64 lowercase hexadecimal characters", () => {
  assert.strictEqual(
    isValidSha256Checksum("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
    true
  );
  assert.strictEqual(isValidSha256Checksum(""), false);
  assert.strictEqual(isValidSha256Checksum("not-a-hash"), false);
  assert.strictEqual(
    isValidSha256Checksum("E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855"),
    false,
    "Uppercase hex must be rejected; checksum must be canonical lowercase"
  );
  assert.strictEqual(
    isValidSha256Checksum("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85"),
    false,
    "63 chars must be rejected"
  );
  assert.strictEqual(
    isValidSha256Checksum("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855a"),
    false,
    "65 chars must be rejected"
  );
});

test("HT-NR-05B Validation: MIME types and file size boundaries", () => {
  const dummyChecksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  // Allowed MIME types
  for (const mime of ALLOWED_STORY_MEDIA_MIME_TYPES) {
    const isDoc = mime === "application/pdf" || mime === "text/plain" || mime.includes("wordprocessing");
    const val = validateStoryMediaUpload({
      filename: isDoc ? "doc.pdf" : "photo.jpg",
      mimeType: mime,
      byteSize: 1024,
      checksum: dummyChecksum,
      usageType: isDoc ? "supporting_document" : "featured",
      altText: isDoc ? undefined : "Valid alt text",
      sourceProvenance: "direct-reporting"
    });
    assert.strictEqual(val.valid, true, `MIME type ${mime} should be allowed`);
  }

  // Disallowed MIME types
  const disallowed = ["application/x-msdownload", "video/mp4", "audio/mpeg", "application/zip", "text/javascript"];
  for (const mime of disallowed) {
    const val = validateStoryMediaUpload({
      filename: "test.bin",
      mimeType: mime,
      byteSize: 1024,
      checksum: dummyChecksum,
      usageType: "featured",
      altText: "Test alt",
      sourceProvenance: "direct-reporting"
    });
    assert.strictEqual(val.valid, false);
    assert.ok(val.error?.includes("Unsupported media MIME type"));
  }

  // Size boundaries
  assert.strictEqual(
    validateStoryMediaUpload({
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      byteSize: 0,
      checksum: dummyChecksum,
      usageType: "featured",
      altText: "Test alt",
      sourceProvenance: "direct-reporting"
    }).valid,
    false,
    "0 bytes must be rejected"
  );

  assert.strictEqual(
    validateStoryMediaUpload({
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      byteSize: MAX_STORY_MEDIA_BYTES,
      checksum: dummyChecksum,
      usageType: "featured",
      altText: "Test alt",
      sourceProvenance: "direct-reporting"
    }).valid,
    true,
    "15 MB exactly must be accepted"
  );

  assert.strictEqual(
    validateStoryMediaUpload({
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      byteSize: MAX_STORY_MEDIA_BYTES + 1,
      checksum: dummyChecksum,
      usageType: "featured",
      altText: "Test alt",
      sourceProvenance: "direct-reporting"
    }).valid,
    false,
    "15 MB + 1 byte must be rejected"
  );
});

test("HT-NR-05B Validation: Usage role and accessibility requirements", () => {
  const dummyChecksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  // Featured must be image
  const featDoc = validateStoryMediaUpload({
    filename: "doc.pdf",
    mimeType: "application/pdf",
    byteSize: 1024,
    checksum: dummyChecksum,
    usageType: "featured",
    altText: "Valid alt",
    sourceProvenance: "source"
  });
  assert.strictEqual(featDoc.valid, false);
  assert.ok(featDoc.error?.includes("Featured lead media must be an image"));

  // Inline must be image
  const inlineDoc = validateStoryMediaUpload({
    filename: "doc.pdf",
    mimeType: "application/pdf",
    byteSize: 1024,
    checksum: dummyChecksum,
    usageType: "inline",
    altText: "Valid alt",
    sourceProvenance: "source"
  });
  assert.strictEqual(inlineDoc.valid, false);
  assert.ok(inlineDoc.error?.includes("Inline media must be an image"));

  // Supporting document must not be image
  const suppImg = validateStoryMediaUpload({
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    byteSize: 1024,
    checksum: dummyChecksum,
    usageType: "supporting_document",
    sourceProvenance: "source"
  });
  assert.strictEqual(suppImg.valid, false);
  assert.ok(suppImg.error?.includes("Supporting documents cannot be images"));

  // Alt text is required for images
  const missingAlt = validateStoryMediaUpload({
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    byteSize: 1024,
    checksum: dummyChecksum,
    usageType: "featured",
    altText: "   ",
    sourceProvenance: "source"
  });
  assert.strictEqual(missingAlt.valid, false);
  assert.ok(missingAlt.error?.includes("Alt text is required for editorial images"));

  // Source provenance is required
  const missingProv = validateStoryMediaUpload({
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    byteSize: 1024,
    checksum: dummyChecksum,
    usageType: "featured",
    altText: "Valid alt",
    sourceProvenance: "   "
  });
  assert.strictEqual(missingProv.valid, false);
  assert.ok(missingProv.error?.includes("Source provenance is required"));
});

test("HT-NR-05B Validation: buildCanonicalPublicStorageKey generates deterministic format", () => {
  const storyId = "00000000-0000-4000-8000-000000001001";
  const mediaId = "00000000-0000-4000-8000-000000007001";
  const checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const filename = "clinical-ward-vaccination.jpg";

  const key = buildCanonicalPublicStorageKey(storyId, mediaId, checksum, filename);
  assert.strictEqual(
    key,
    `story-media/${storyId}/${mediaId}/${checksum}/${filename}`
  );
});

// -----------------------------------------------------------------------------
// 3. STORAGE & CRYPTO SERVICE TESTS
// -----------------------------------------------------------------------------

test("HT-NR-05B Storage: computeSha256Hex produces correct SHA-256 hash", async () => {
  const data = new TextEncoder().encode("HealthTimes Newsroom Test Payload");
  const computed = await computeSha256Hex(data);
  const expected = crypto.createHash("sha256").update(data).digest("hex");
  assert.strictEqual(computed, expected);
});

test("HT-NR-05B Storage: copyPrivateToPublic rejects checksum mismatch", async () => {
  const realBytes = new TextEncoder().encode("Actual File Content");
  const wrongChecksum = "0000000000000000000000000000000000000000000000000000000000000000";

  let clientMock = {
    storage: {
      from: (bucket) => ({
        download: async (path) => ({ data: new Blob([realBytes]), error: null }),
        upload: async () => ({ error: null })
      })
    }
  };

  await assert.rejects(
    async () => {
      await copyPrivateToPublic(
        "story-media/1/2/photo.jpg",
        "story-media/1/2/target.jpg",
        "image/jpeg",
        wrongChecksum,
        clientMock
      );
    },
    /CHECKSUM VERIFICATION FAILED/,
    "Must abort public promotion if private object checksum does not match canonical metadata"
  );
});

test("HT-NR-05B Storage: copyPrivateToPublic copies verified bytes to newsroom-public", async () => {
  const realBytes = new TextEncoder().encode("Authentic Verified Content");
  const correctChecksum = crypto.createHash("sha256").update(realBytes).digest("hex");

  let uploadedBucket = null;
  let uploadedPath = null;
  let uploadedBytes = null;

  let clientMock = {
    storage: {
      from: (bucket) => ({
        download: async (path) => ({ data: new Blob([realBytes]), error: null }),
        upload: async (targetPath, bytes, options) => {
          uploadedBucket = bucket;
          uploadedPath = targetPath;
          uploadedBytes = bytes;
          return { error: null };
        }
      })
    }
  };

  await copyPrivateToPublic(
    "story-media/story1/media1/photo.jpg",
    "story-media/story1/media1/checksum/photo.jpg",
    "image/jpeg",
    correctChecksum,
    clientMock
  );

  assert.strictEqual(uploadedBucket, "newsroom-public");
  assert.strictEqual(uploadedPath, "story-media/story1/media1/checksum/photo.jpg");
  assert.ok(uploadedBytes);
});

test("HT-NR-05B Storage: deleteStagedPublicObject calls remove on single public key", async () => {
  let removedPaths = null;
  let clientMock = {
    storage: {
      from: (bucket) => ({
        remove: async (paths) => {
          removedPaths = paths;
          return { error: null };
        }
      })
    }
  };

  await deleteStagedPublicObject("story-media/story1/media1/chk/photo.jpg", clientMock);
  assert.deepStrictEqual(removedPaths, ["story-media/story1/media1/chk/photo.jpg"]);
});

// -----------------------------------------------------------------------------
// 4. NEWSROOM MEDIA SERVICE RPC WRAPPERS
// -----------------------------------------------------------------------------

test("HT-NR-05B Media Service: prepareStoryMedia wraps newsroom_prepare_story_media RPC", async () => {
  mockRpcCalls = [];
  mockRpcResponse = {
    data: {
      media_id: "00000000-0000-4000-8000-000000007001",
      storage_bucket: "newsroom-private",
      storage_key: "story-media/story1/media1/photo.jpg",
      status: "upload_pending",
      usage_type: "featured",
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    error: null
  };

  const prep = await stagingNewsroomMediaService.prepareStoryMedia(
    "00000000-0000-4000-8000-000000001001",
    {
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      byteSize: 1024,
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      usageType: "featured",
      altText: "Staff in clinical ward",
      sourceProvenance: "direct-reporting"
    }
  );

  assert.strictEqual(mockRpcCalls.length, 1);
  assert.strictEqual(mockRpcCalls[0].name, "newsroom_prepare_story_media");
  assert.strictEqual(prep.mediaId, "00000000-0000-4000-8000-000000007001");
  assert.strictEqual(prep.status, "upload_pending");
});

test("HT-NR-05B Media Service: finalizeStoryMedia wraps newsroom_finalize_story_media RPC", async () => {
  mockRpcCalls = [];
  mockRpcResponse = {
    data: {
      media_id: "00000000-0000-4000-8000-000000007001",
      status: "private_ready",
      usage_type: "featured",
      story_id: "00000000-0000-4000-8000-000000001001"
    },
    error: null
  };

  const finalized = await stagingNewsroomMediaService.finalizeStoryMedia(
    "00000000-0000-4000-8000-000000001001",
    "00000000-0000-4000-8000-000000007001"
  );

  assert.strictEqual(mockRpcCalls.length, 1);
  assert.strictEqual(mockRpcCalls[0].name, "newsroom_finalize_story_media");
  assert.strictEqual(finalized.status, "private_ready");
});

test("HT-NR-05B Media Service: stagePromotion wraps newsroom_stage_story_media_promotion RPC", async () => {
  mockRpcCalls = [];
  mockRpcResponse = {
    data: {
      media_id: "00000000-0000-4000-8000-000000007001",
      status: "public_staged",
      storage_bucket: "newsroom-public",
      storage_key: "story-media/story1/media1/chk/photo.jpg",
      public_url: "https://staging.healthtimes.co.zw/storage/v1/object/public/newsroom-public/story-media/story1/media1/chk/photo.jpg"
    },
    error: null
  };

  const staged = await stagingNewsroomMediaService.stagePromotion(
    "00000000-0000-4000-8000-000000001001",
    "00000000-0000-4000-8000-000000007001",
    "story-media/story1/media1/chk/photo.jpg",
    dummyChecksum
  );

  assert.strictEqual(mockRpcCalls.length, 1);
  assert.strictEqual(mockRpcCalls[0].name, "newsroom_stage_story_media_promotion");
  assert.strictEqual(staged.status, "public_staged");
});

test("HT-NR-05B Fixtures: fixtureNewsroomMediaService fails closed for all new 05B methods", () => {
  const fixturesSource = read("src/services/fixtures.ts");
  assert.ok(fixturesSource.includes("prepareStoryMedia"), "Must define prepareStoryMedia in fixtureNewsroomMediaService");
  assert.ok(fixturesSource.includes("finalizeStoryMedia"), "Must define finalizeStoryMedia in fixtureNewsroomMediaService");
  assert.ok(fixturesSource.includes("attachStoryMedia"), "Must define attachStoryMedia in fixtureNewsroomMediaService");
  assert.ok(fixturesSource.includes("detachStoryMedia"), "Must define detachStoryMedia in fixtureNewsroomMediaService");
  assert.ok(fixturesSource.includes("getPromotionPlan"), "Must define getPromotionPlan in fixtureNewsroomMediaService");
  assert.ok(fixturesSource.includes("stagePromotion"), "Must define stagePromotion in fixtureNewsroomMediaService");
  assert.ok(fixturesSource.includes("clearStagedPromotion"), "Must define clearStagedPromotion in fixtureNewsroomMediaService");
  assert.ok(fixturesSource.includes("FAIL_CLOSED_MEDIA_MESSAGE"), "Must reference FAIL_CLOSED_MEDIA_MESSAGE in all stubs");
});

// -----------------------------------------------------------------------------
// 5. WORKSPACE & MEDIA LIBRARY INTEGRATION TESTS
// -----------------------------------------------------------------------------

test("HT-NR-05B Workspace Integration: StudioStoryWorkspace contains media tab and wires mediaSlot", () => {
  const workspaceSource = read("src/ui/StudioStoryWorkspace.tsx");
  assert.ok(
    workspaceSource.includes('"media"'),
    "TabId must include 'media'"
  );
  assert.ok(
    workspaceSource.includes('["media", "Media & Attachments"]'),
    "TabBar must render 'Media & Attachments' tab"
  );
  assert.ok(
    workspaceSource.includes("StudioStoryMediaPanel"),
    "StudioStoryWorkspace must render StudioStoryMediaPanel"
  );
  assert.ok(
    workspaceSource.includes("mediaSlot?: ReactNode"),
    "StudioStoryWorkspaceViewProps must accept mediaSlot"
  );
});

test("HT-NR-05B Media Library Integration: StudioMediaLibraryView provides Story Association and Attach to Story", () => {
  const librarySource = read("src/ui/StudioMediaLibrary.tsx");
  assert.ok(
    librarySource.includes('testID="media-story-attachment-section"'),
    "Must include story attachment inspector section"
  );
  assert.ok(
    librarySource.includes('testID="media-attach-to-story-button"'),
    "Must include Attach to Story button"
  );
  assert.ok(
    librarySource.includes('testID="media-attach-modal"'),
    "Must include Attach to Story modal"
  );
  assert.ok(
    librarySource.includes('testID="media-attach-replacement-warning"'),
    "Must include featured lead replacement warning"
  );
  assert.ok(
    librarySource.includes("onAttachToStory?:"),
    "StudioMediaLibraryViewProps must accept onAttachToStory"
  );
});

test("HT-NR-05B Owner Preview: OwnerPreviewStoryWorkspace renders StudioStoryMediaPanelView and keeps writes local", () => {
  const previewWorkspaceSource = read("src/preview/OwnerPreviewStoryWorkspace.tsx");
  assert.ok(
    previewWorkspaceSource.includes("StudioStoryMediaPanelView"),
    "OwnerPreviewStoryWorkspace must render StudioStoryMediaPanelView"
  );
  assert.ok(
    previewWorkspaceSource.includes("mediaSlot={mediaSlot}"),
    "OwnerPreviewStoryWorkspace must pass mediaSlot into StudioStoryWorkspaceView"
  );
  assert.ok(
    previewWorkspaceSource.includes("handlePreviewUpload"),
    "Must provide local simulated upload handler"
  );
  assert.ok(
    previewWorkspaceSource.includes("handlePreviewStagePromotion"),
    "Must provide local simulated promotion staging handler"
  );
  assert.ok(
    previewWorkspaceSource.includes("PUBLIC STAGED"),
    "Must report PUBLIC STAGED status upon staging"
  );
});
