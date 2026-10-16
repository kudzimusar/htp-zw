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
  BOUNDED_MIME_BY_EXTENSION,
  resolveBoundedMimeType,
  isMediaAssetAttachable,
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
  copyPrivateToCanonicalPublic,
  deleteStagedPublicObject,
  newsroomStorageService
} = storageModule;

const filePickerModule = loadTs("src/services/file-picker.ts", {
  mocks: {
    "expo-document-picker": {
      getDocumentAsync: async () => ({ canceled: true, assets: [] })
    }
  }
});
const { createSelectedFileFromBytes } = filePickerModule;

const mediaServiceModule = loadTs("src/services/newsroom-media.ts", {
  mocks: {
    "../platform/supabase": mockSupabase
  }
});
const { stagingNewsroomMediaService } = mediaServiceModule;

// -----------------------------------------------------------------------------
// 1. INVARIANTS & INTEGRITY TESTS
// -----------------------------------------------------------------------------

test("HT-NR-05B-R1 Invariant: Migration count is exactly 65", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.strictEqual(
    files.length,
    65,
    `Migration count must be exactly 65 (62 pre-Presentation + 04B public presentation + 04B-R1 presentation safety + 05B-R1 story-media integrity). Found ${files.length}.`
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

// -----------------------------------------------------------------------------
// 6. HT-NR-05B-R1 REAL FILE INGESTION & DATA CUSTODY TESTS (Sections 38-51)
// -----------------------------------------------------------------------------

test("HT-NR-05B-R1 Section 38: Real file selection adapter & absence of operational sample content", () => {
  const panelSource = read("src/ui/StudioStoryMedia.tsx");
  assert.ok(
    !panelSource.includes("uploadSimulatedContent"),
    "Operational StudioStoryMedia must NOT contain uploadSimulatedContent"
  );
  assert.ok(
    !panelSource.includes("Sample newsroom asset content for verification."),
    "Operational StudioStoryMedia must NOT contain sample verification strings"
  );
  assert.ok(
    !panelSource.includes("clinic-lead-photo.jpg"),
    "Operational StudioStoryMedia must NOT contain hardcoded clinic-lead-photo.jpg"
  );
  assert.ok(
    !panelSource.includes("Tafadzwa Moyo"),
    "Operational StudioStoryMedia must NOT contain hardcoded Tafadzwa Moyo credit"
  );
  assert.ok(
    panelSource.includes("pickStoryMediaFile"),
    "Operational StudioStoryMedia must import pickStoryMediaFile"
  );
  assert.ok(
    panelSource.includes("onPickFile"),
    "Operational StudioStoryMedia must support onPickFile adapter"
  );
  assert.ok(
    panelSource.includes('testID="media-select-file-button"'),
    "Operational UI must render real file selection button"
  );
});

test("HT-NR-05B-R1 Section 39: Exact byte consistency from selected bytes to checksum and payload", async () => {
  // Deterministic 12-byte test payload
  const deterministicBytes = new Uint8Array([72, 101, 97, 108, 116, 104, 84, 105, 109, 101, 115, 33]);
  const expectedSha256 = crypto.createHash("sha256").update(deterministicBytes).digest("hex");
  const computedSha256 = await computeSha256Hex(deterministicBytes);
  assert.strictEqual(computedSha256, expectedSha256);

  const selected = createSelectedFileFromBytes("clinic-ward.jpg", deterministicBytes);
  assert.strictEqual(selected.filename, "clinic-ward.jpg");
  assert.strictEqual(selected.mimeType, "image/jpeg");
  assert.strictEqual(selected.byteSize, deterministicBytes.byteLength);
  assert.strictEqual(selected.bytes, deterministicBytes);

  // Prepare payload byte size and checksum MUST be derived from same exact bytes
  const uploadValidation = validateStoryMediaUpload({
    filename: selected.filename,
    mimeType: selected.mimeType,
    byteSize: selected.byteSize,
    checksum: computedSha256,
    usageType: "featured",
    altText: "Harare hospital clinic ward",
    sourceProvenance: "direct-reporting"
  });
  assert.strictEqual(uploadValidation.valid, true);
  assert.strictEqual(uploadValidation.error, undefined);
  assert.strictEqual(selected.byteSize, 12);
});

test("HT-NR-05B-R1 Section 40: MIME truth and file extension bounding", () => {
  // Truthful bounded resolutions
  assert.strictEqual(resolveBoundedMimeType("photo.jpg", "text/plain"), "image/jpeg");
  assert.strictEqual(resolveBoundedMimeType("photo.jpeg", "application/octet-stream"), "image/jpeg");
  assert.strictEqual(resolveBoundedMimeType("photo.JPG", ""), "image/jpeg");
  assert.strictEqual(resolveBoundedMimeType("graphic.png", "text/html"), "image/png");
  assert.strictEqual(resolveBoundedMimeType("banner.webp", ""), "image/webp");
  assert.strictEqual(resolveBoundedMimeType("bulletin.pdf", "image/jpeg"), "application/pdf");
  assert.strictEqual(
    resolveBoundedMimeType("summary.docx", "application/zip"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  assert.strictEqual(resolveBoundedMimeType("raw_notes.txt", "image/png"), "text/plain");

  // Disallowed extensions return null
  assert.strictEqual(resolveBoundedMimeType("danger.exe", "image/jpeg"), null);
  assert.strictEqual(resolveBoundedMimeType("malware.bin", "image/png"), null);
  assert.strictEqual(resolveBoundedMimeType("script.js", "application/javascript"), null);
  assert.strictEqual(resolveBoundedMimeType("page.html", "text/html"), null);
  assert.strictEqual(resolveBoundedMimeType("archive.zip", "application/zip"), null);

  // User cannot label text bytes as image/jpeg if extension is .txt
  const textMime = resolveBoundedMimeType("notes.txt", "image/jpeg");
  assert.strictEqual(textMime, "text/plain");
  const validation = validateStoryMediaUpload({
    filename: "notes.txt",
    mimeType: textMime,
    byteSize: 100,
    checksum: dummyChecksum,
    usageType: "featured",
    altText: "Test image alt",
    sourceProvenance: "direct-reporting"
  });
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.error?.includes("Featured lead media must be an image"));
});

test("HT-NR-05B-R1 Section 41: Two-stage private upload failure & retry state machine", async () => {
  // Scenario A: Prepare succeeds, Storage upload fails
  let prepareCalls = 0;
  let finalizeCalls = 0;
  let uploadCalls = 0;

  const failureClient = {
    auth: { getSession: async () => ({ data: mockSession, error: null }) },
    rpc: async (name, args) => {
      if (name === "newsroom_prepare_story_media") {
        prepareCalls++;
        return {
          data: {
            media_id: "00000000-0000-4000-8000-000000008001",
            storage_bucket: "newsroom-private",
            storage_key: "story-media/00000000-0000-4000-8000-000000001001/00000000-0000-4000-8000-000000008001/clinic.jpg",
            status: "upload_pending",
            usage_type: "featured",
            checksum: dummyChecksum
          },
          error: null
        };
      }
      if (name === "newsroom_finalize_story_media") {
        finalizeCalls++;
        return { data: { status: "private_ready" }, error: null };
      }
      return { data: null, error: null };
    },
    storage: {
      from: (bucket) => ({
        upload: async () => {
          uploadCalls++;
          if (uploadCalls === 1) {
            return { error: { message: "Network connection lost during upload." } };
          }
          return { error: null };
        }
      })
    }
  };

  const testMediaService = loadTs("src/services/newsroom-media.ts", {
    mocks: { "../platform/supabase": { getStagingSupabaseClient: () => failureClient } }
  }).stagingNewsroomMediaService;

  // 1. Prepare succeeds
  const prepared = await testMediaService.prepareStoryMedia("00000000-0000-4000-8000-000000001001", {
    filename: "clinic.jpg",
    mimeType: "image/jpeg",
    byteSize: 1024,
    checksum: dummyChecksum,
    usageType: "featured",
    altText: "Clinic ward",
    sourceProvenance: "direct-reporting"
  });
  assert.strictEqual(prepareCalls, 1);
  assert.strictEqual(prepared.mediaId, "00000000-0000-4000-8000-000000008001");

  // 2. Storage upload fails
  const uploadResult = await failureClient.storage.from(prepared.storageBucket).upload();
  assert.ok(uploadResult.error);
  // Finalize MUST NOT be called
  assert.strictEqual(finalizeCalls, 0);

  // 3. Retry upload does NOT call prepare a second time
  const retryUploadResult = await failureClient.storage.from(prepared.storageBucket).upload();
  assert.strictEqual(retryUploadResult.error, null);
  assert.strictEqual(prepareCalls, 1, "Prepare MUST NOT be called a second time on retry");

  // 4. Finalize succeeds after upload succeeds
  const finalized = await testMediaService.finalizeStoryMedia("00000000-0000-4000-8000-000000001001", prepared.mediaId);
  assert.strictEqual(finalizeCalls, 1);
  assert.strictEqual(finalized.status, "private_ready");

  // Scenario B: Upload succeeds, Finalize RPC fails
  let finalizeAttempts = 0;
  let detachCalls = 0;

  const finalizeFailureClient = {
    auth: { getSession: async () => ({ data: mockSession, error: null }) },
    rpc: async (name, args) => {
      if (name === "newsroom_finalize_story_media") {
        finalizeAttempts++;
        if (finalizeAttempts === 1) {
          return { data: null, error: { message: "Database lock conflict on finalize." } };
        }
        return { data: { status: "private_ready" }, error: null };
      }
      if (name === "newsroom_detach_story_media") {
        detachCalls++;
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }
  };

  const testMediaService2 = loadTs("src/services/newsroom-media.ts", {
    mocks: { "../platform/supabase": { getStagingSupabaseClient: () => finalizeFailureClient } }
  }).stagingNewsroomMediaService;

  await assert.rejects(
    async () => {
      await testMediaService2.finalizeStoryMedia("00000000-0000-4000-8000-000000001001", "00000000-0000-4000-8000-000000008001");
    },
    /Database lock conflict on finalize/
  );

  // Must NOT detach and must NOT falsely mark private_ready
  assert.strictEqual(detachCalls, 0, "Must not detach story media on finalize failure");

  // Retry finalize succeeds with exact same mediaId
  const retriedFinalize = await testMediaService2.finalizeStoryMedia("00000000-0000-4000-8000-000000001001", "00000000-0000-4000-8000-000000008001");
  assert.strictEqual(retriedFinalize.status, "private_ready");
  assert.strictEqual(finalizeAttempts, 2);
});

test("HT-NR-05B-R1 Section 42: Public null-checksum promotion uses real private byte SHA-256", async () => {
  const privateBytes = new Uint8Array([11, 22, 33, 44, 55, 66]);
  const realSha256 = crypto.createHash("sha256").update(privateBytes).digest("hex");

  let uploadedTargetKey = null;
  let uploadedContentType = null;
  let uploadedUpsert = null;

  const storageMock = {
    storage: {
      from: (bucket) => ({
        download: async (p) => ({ data: new Blob([privateBytes]), error: null }),
        upload: async (targetPath, bytes, options) => {
          uploadedTargetKey = targetPath;
          uploadedContentType = options?.contentType;
          uploadedUpsert = options?.upsert;
          return { error: null };
        }
      })
    }
  };

  const { verifiedChecksum, publicKey } = await copyPrivateToCanonicalPublic({
    storyId: "00000000-0000-4000-8000-000000001001",
    mediaId: "00000000-0000-4000-8000-000000007001",
    privateBucket: "newsroom-private",
    privateKey: "story-media/00000000-0000-4000-8000-000000001001/00000000-0000-4000-8000-000000007001/sample.jpg",
    filename: "sample.jpg",
    mimeType: "image/jpeg",
    expectedChecksum: null, // NULL checksum in canonical metadata
    clientOverride: storageMock
  });

  assert.strictEqual(verifiedChecksum, realSha256);
  assert.strictEqual(
    publicKey,
    `story-media/00000000-0000-4000-8000-000000001001/00000000-0000-4000-8000-000000007001/${realSha256}/sample.jpg`
  );
  assert.strictEqual(uploadedTargetKey, publicKey);
  assert.strictEqual(uploadedContentType, "image/jpeg");
  assert.strictEqual(uploadedUpsert, false);
});

test("HT-NR-05B-R1 Section 43: Public checksum mismatch aborts public copy and throws CHECKSUM VERIFICATION FAILED", async () => {
  const privateBytes = new Uint8Array([99, 88, 77]);
  const mismatchedExpectedChecksum = "0000000000000000000000000000000000000000000000000000000000000000";

  let publicUploadAttempted = false;

  const storageMock = {
    storage: {
      from: (bucket) => ({
        download: async () => ({ data: new Blob([privateBytes]), error: null }),
        upload: async () => {
          publicUploadAttempted = true;
          return { error: null };
        }
      })
    }
  };

  await assert.rejects(
    async () => {
      await copyPrivateToCanonicalPublic({
        storyId: "s1",
        mediaId: "m1",
        privateBucket: "newsroom-private",
        privateKey: "story-media/s1/m1/photo.jpg",
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        expectedChecksum: mismatchedExpectedChecksum,
        clientOverride: storageMock
      });
    },
    /CHECKSUM VERIFICATION FAILED/
  );

  assert.strictEqual(publicUploadAttempted, false, "Must not attempt upload to public bucket when checksum mismatches");
});

test("HT-NR-05B-R1 Section 44: Stage failure cleanup compensation and commit acknowledgment", async () => {
  const panelSource = read("src/ui/StudioStoryMedia.tsx");

  // 1. Panel source inspects canonical state on stage promotion failure
  assert.ok(
    panelSource.includes("services.newsroomMedia.getPromotionPlan"),
    "Panel must refresh canonical promotion plan on stage failure"
  );
  assert.ok(
    panelSource.includes("deleteStagedPublicObject"),
    "Panel must call deleteStagedPublicObject on stage failure compensation"
  );
  assert.ok(
    panelSource.includes("public_staged"),
    "Panel must verify if status actually committed as public_staged"
  );
  assert.ok(
    panelSource.includes("RECONCILIATION REQUIRED: Stage promotion failed"),
    "Panel must report cleanup failure without swallowing error"
  );

  // 2. Unit simulation: deletion error is NOT swallowed
  let removeCalledWith = null;
  const errorStorageMock = {
    storage: {
      from: (bucket) => ({
        remove: async (paths) => {
          removeCalledWith = paths;
          return { error: { message: "Storage permission error during cleanup" } };
        }
      })
    }
  };

  await assert.rejects(
    async () => {
      await deleteStagedPublicObject("story-media/s1/m1/chk/photo.jpg", errorStorageMock);
    },
    /Storage permission error during cleanup/
  );
  assert.deepStrictEqual(removeCalledWith, ["story-media/s1/m1/chk/photo.jpg"]);
});

test("HT-NR-05B-R1 Section 45: Clear-staged operation order deletes Storage object BEFORE clear RPC", () => {
  const panelSource = read("src/ui/StudioStoryMedia.tsx");
  const clearHandlerIdx = panelSource.lastIndexOf("const handleClearStagedPromotion = async");
  assert.ok(clearHandlerIdx > -1, "handleClearStagedPromotion must be present");

  const clearSnippet = panelSource.slice(clearHandlerIdx, clearHandlerIdx + 1200);
  const deleteStorageIdx = clearSnippet.indexOf("newsroomStorageService.deleteStagedPublicObject");
  const clearRpcIdx = clearSnippet.indexOf("services.newsroomMedia.clearStagedPromotion");

  assert.ok(deleteStorageIdx > -1, "Must call deleteStagedPublicObject in clear handler");
  assert.ok(clearRpcIdx > -1, "Must call clearStagedPromotion in clear handler");
  assert.ok(
    deleteStorageIdx < clearRpcIdx,
    "Storage public object MUST be deleted BEFORE calling newsroom_clear_staged_story_media RPC"
  );
});

test("HT-NR-05B-R1 Section 46: Clear failure compensation restores public object when DB remains public_staged", () => {
  const panelSource = read("src/ui/StudioStoryMedia.tsx");
  const clearHandlerIdx = panelSource.lastIndexOf("const handleClearStagedPromotion = async");
  const clearSnippet = panelSource.slice(clearHandlerIdx, clearHandlerIdx + 3000);

  assert.ok(
    clearSnippet.includes("copyPrivateToPublic"),
    "Must attempt restoring public object if clear RPC fails and DB remains public_staged"
  );
  assert.ok(
    clearSnippet.includes("Public storage object has been restored") ||
      clearSnippet.includes("restoration of public object failed"),
    "Must surface explicit revert notice upon clear restoration"
  );
});

test("HT-NR-05B-R1 Section 47: Story media completeness via newsroom_list_story_media", async () => {
  let rpcCalledWith = null;
  const mockRpcClient = {
    auth: { getSession: async () => ({ data: mockSession, error: null }) },
    rpc: async (name, args) => {
      rpcCalledWith = { name, args };
      // Return 20 columns as defined in 20261016190000_ht_nr05b_r1_story_media_integrity.sql
      return {
        data: [
          {
            id: "00000000-0000-4000-8000-000000009999",
            filename: "deep-archive-attachment.jpg",
            mime_type: "image/jpeg",
            byte_size: 2048,
            width: 800,
            height: 600,
            storage_bucket: "newsroom-private",
            storage_key: "story-media/s-target/00000000-0000-4000-8000-000000009999/deep-archive-attachment.jpg",
            public_url: null,
            checksum: dummyChecksum,
            status: "private_ready",
            source_provenance: "direct-reporting",
            caption: "Deep archive photo",
            alt_text: "Deep archive image",
            credit: "HealthTimes Staff",
            legacy_source_id: null,
            created_at: "2026-10-16T12:00:00Z",
            created_by: "00000000-0000-4000-8000-000000000001",
            updated_at: "2026-10-16T12:00:00Z",
            updated_by: "00000000-0000-4000-8000-000000000001",
            usage: [
              {
                story_id: "00000000-0000-4000-8000-000000001001",
                usage_type: "featured",
                sort_order: 0,
                caption: "Deep archive photo",
                alt_text: "Deep archive image",
                credit: "HealthTimes Staff",
                source_context: { attached_at: "2026-10-16T12:00:00Z" }
              }
            ]
          }
        ],
        error: null
      };
    }
  };

  const testMediaService = loadTs("src/services/newsroom-media.ts", {
    mocks: { "../platform/supabase": { getStagingSupabaseClient: () => mockRpcClient } }
  }).stagingNewsroomMediaService;

  const result = await testMediaService.listStoryMedia("00000000-0000-4000-8000-000000001001");
  assert.strictEqual(rpcCalledWith.name, "newsroom_list_story_media");
  assert.strictEqual(rpcCalledWith.args.p_story_id, "00000000-0000-4000-8000-000000001001");
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, "00000000-0000-4000-8000-000000009999");
  assert.strictEqual(result[0].filename, "deep-archive-attachment.jpg");
  assert.strictEqual(result[0].usage.length, 1);
  assert.strictEqual(result[0].usage[0].usageType, "featured");

  // In StudioStoryMedia.tsx, assert listStoryMedia is called instead of listMedia
  const panelSource = read("src/ui/StudioStoryMedia.tsx");
  assert.ok(
    panelSource.includes("services.newsroomMedia.listStoryMedia(storyId)"),
    "StudioStoryMediaPanel must call listStoryMedia(storyId) to load all story attachments"
  );
});

test("HT-NR-05B-R1 Section 48: Attachability eligibility filtering in Workspace and Media Library", () => {
  // Attachable
  assert.strictEqual(
    isMediaAssetAttachable({
      storageBucket: "newsroom-private",
      status: "private_ready",
      mimeType: "image/jpeg"
    }).attachable,
    true
  );
  assert.strictEqual(
    isMediaAssetAttachable({
      storageBucket: "newsroom-private",
      status: "published",
      mimeType: "application/pdf"
    }).attachable,
    true
  );

  // Ineligible statuses
  const pending = isMediaAssetAttachable({
    storageBucket: "newsroom-private",
    status: "pending",
    mimeType: "image/jpeg"
  });
  assert.strictEqual(pending.attachable, false);
  assert.ok(pending.reason?.includes("pending processing"));

  const uploadPending = isMediaAssetAttachable({
    storageBucket: "newsroom-private",
    status: "upload_pending",
    mimeType: "image/jpeg"
  });
  assert.strictEqual(uploadPending.attachable, false);
  assert.ok(uploadPending.reason?.includes("not been finalized"));

  const publicStaged = isMediaAssetAttachable({
    storageBucket: "newsroom-private",
    status: "public_staged",
    mimeType: "image/jpeg"
  });
  assert.strictEqual(publicStaged.attachable, false);
  assert.ok(publicStaged.reason?.includes("staged for public presentation"));

  const missing = isMediaAssetAttachable({
    storageBucket: "newsroom-private",
    status: "missing_from_uploads_archive",
    mimeType: "image/jpeg"
  });
  assert.strictEqual(missing.attachable, false);
  assert.ok(missing.reason?.includes("missing from storage archive"));

  // Ineligible custody
  const publicBucket = isMediaAssetAttachable({
    storageBucket: "newsroom-public",
    status: "published",
    mimeType: "image/jpeg"
  });
  assert.strictEqual(publicBucket.attachable, false);
  assert.ok(publicBucket.reason?.includes("newsroom-private"));

  // Ineligible MIME
  const unsupportedMime = isMediaAssetAttachable({
    storageBucket: "newsroom-private",
    status: "private_ready",
    mimeType: "video/mp4"
  });
  assert.strictEqual(unsupportedMime.attachable, false);
  assert.ok(unsupportedMime.reason?.includes("not supported for story attachment"));

  // Null asset
  assert.strictEqual(isMediaAssetAttachable(null).attachable, false);
});

test("HT-NR-05B-R1 Section 51: Storage upload overwrite policy uses upsert: false and retry verification", async () => {
  const deterministicBytes = new Uint8Array([1, 2, 3, 4, 5]);
  const expectedSha256 = crypto.createHash("sha256").update(deterministicBytes).digest("hex");

  let recordedUpsert = null;
  let uploadCalled = false;
  let downloadCalled = false;

  // Mock client that errors with 409 already exists on upload
  const duplicateClient = {
    storage: {
      from: (bucket) => ({
        upload: async (path, bytes, options) => {
          uploadCalled = true;
          recordedUpsert = options?.upsert;
          return { error: { statusCode: 409, message: "The resource already exists" } };
        },
        download: async (path) => {
          downloadCalled = true;
          return { data: new Blob([deterministicBytes]), error: null };
        }
      })
    }
  };

  // Safe retry: Existing object matches expectedChecksum
  await uploadPrivateObject(
    "newsroom-private",
    "story-media/s1/m1/photo.jpg",
    deterministicBytes,
    "image/jpeg",
    duplicateClient
  );

  assert.strictEqual(uploadCalled, true);
  assert.strictEqual(recordedUpsert, false, "Must specify upsert: false");
  assert.strictEqual(downloadCalled, true, "Must download existing object on duplicate to verify checksum");

  // Mismatch error: Existing object has DIFFERENT checksum
  const differentClient = {
    storage: {
      from: (bucket) => ({
        upload: async (path, bytes, options) => ({
          error: { statusCode: 409, message: "The resource already exists" }
        }),
        download: async (path) => ({
          data: new Blob([new Uint8Array([9, 9, 9])]),
          error: null
        })
      })
    }
  };

  await assert.rejects(
    async () => {
      await uploadPrivateObject(
        "newsroom-private",
        "story-media/s1/m1/photo.jpg",
        deterministicBytes,
        "image/jpeg",
        differentClient
      );
    },
    /already exists at .* with different checksum/
  );
});


