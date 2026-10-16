import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
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

const models = loadTs("src/domain/models.ts");
const {
  classifyMediaMimeType,
  deriveStorageCustodyCategory,
  validateMediaMetadataPatch
} = models;

const uiModule = loadTs("src/ui/StudioMediaLibrary.tsx", {
  mocks: {
    "react": {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useMemo: (fn) => fn(),
      useEffect: () => {},
      useCallback: (fn) => fn,
      useRef: (init) => ({ current: init })
    },
    "react-native": {
      View: "View",
      Text: "Text",
      Image: "Image",
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      TextInput: "TextInput",
      StyleSheet: { create: (s) => s },
      useWindowDimensions: () => ({ width: 1200, height: 800 })
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
        newsroomMedia: {
          listMedia: async () => [],
          getMediaPreview: async () => null,
          updateStoryMediaMetadata: async () => ({})
        }
      }
    },
    "../hooks/useAsync": {
      useAsync: () => ({ data: [], loading: false, error: null, execute: async () => {} })
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props })
    }
  }
});
const { hasMediaLibraryAuthority, formatByteSize, StudioMediaLibrary, StudioMediaLibraryView } = uiModule;

const previewData = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: {} } },
    "../platform/config": { appEnvironment: "staging" }
  }
});
const { buildPreviewMediaAssets, OWNER_PREVIEW_NAV_ITEMS } = previewData;

// =========================================================================
// 1. EXACT INVARIANTS & CUSTODY PRESERVATION
// =========================================================================

test("HT-NR-05A: Migration count remains strictly 64 (zero new migrations)", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const sqlFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.equal(
    sqlFiles.length,
    64,
    `Migration count must remain exactly 64. Found: ${sqlFiles.length}`
  );
});

test("HT-NR-05A: Real /studio landing remains exact frozen parent authority", () => {
  const content = fs.readFileSync(path.join(root, "app/studio/index.tsx"));
  const header = `blob ${content.length}\0`;
  const sha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(header), content]))
    .digest("hex");
  assert.equal(
    sha,
    "8ed2d24a4f8f20b5af881f9ce54f517b7a80720e",
    "app/studio/index.tsx must match exact parent git blob 8ed2d24a4f8f20b5af881f9ce54f517b7a80720e"
  );
});

test("HT-NR-05A: Reader Edition screen remains exact frozen parent authority", () => {
  const content = fs.readFileSync(path.join(root, "app/edition.tsx"));
  const header = `blob ${content.length}\0`;
  const sha = crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(header), content]))
    .digest("hex");
  assert.equal(
    sha,
    "d86d4df6aef091ae713549b4fbe4450aa0d20493",
    "app/edition.tsx must match exact parent git blob d86d4df6aef091ae713549b4fbe4450aa0d20493"
  );
});

test("HT-NR-05A: Reader Watch and Reader Live surfaces are untouched", () => {
  assert.ok(fs.existsSync(path.join(root, "app/(reader)/watch.tsx")));
  assert.ok(fs.existsSync(path.join(root, "app/(reader)/live.tsx")));
});

// =========================================================================
// 2. STUDIO ROUTE CONFIGURATION & AUTHORITY GATE
// =========================================================================

test("HT-NR-05A: Studio module route configures media with media.manage and HT-NR-05A ownership", () => {
  const moduleSource = read("app/studio/[module].tsx");
  assert.ok(
    moduleSource.includes('"media"'),
    "generateStaticParams must include media"
  );
  assert.ok(
    moduleSource.includes('owner:"HT-NR-05A"'),
    "media module must be owned by HT-NR-05A"
  );
  assert.ok(
    moduleSource.includes('capability:"media.manage"'),
    "media module must require media.manage capability"
  );
  assert.ok(
    moduleSource.includes("<StudioMediaLibrary />"),
    "media module must render StudioMediaLibrary"
  );
  assert.ok(
    moduleSource.includes('String(module)!=="media"'),
    "media module must be excluded from StudioPlaceholder"
  );
});

test("HT-NR-05A: hasMediaLibraryAuthority enforces server authority and media.manage capability", () => {
  // Valid authorized session
  assert.equal(
    hasMediaLibraryAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["media.manage"]
    }),
    true
  );

  // Authorized with multiple capabilities
  assert.equal(
    hasMediaLibraryAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["story.create", "media.manage", "story.publish"]
    }),
    true
  );

  // Lacking media.manage capability
  assert.equal(
    hasMediaLibraryAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["story.create", "story.publish"]
    }),
    false
  );

  // Non-server source
  assert.equal(
    hasMediaLibraryAuthority({
      status: "authorized",
      source: "none",
      capabilities: ["media.manage"]
    }),
    false
  );

  // Anonymous status
  assert.equal(
    hasMediaLibraryAuthority({
      status: "anonymous",
      source: "none",
      capabilities: []
    }),
    false
  );

  // Authenticated without staff authority
  assert.equal(
    hasMediaLibraryAuthority({
      status: "authenticated-no-staff-authority",
      source: "server",
      capabilities: []
    }),
    false
  );

  // Null, undefined, malformed
  assert.equal(hasMediaLibraryAuthority(null), false);
  assert.equal(hasMediaLibraryAuthority(undefined), false);
  assert.equal(hasMediaLibraryAuthority({}), false);
  assert.equal(hasMediaLibraryAuthority("authorized"), false);
});

// =========================================================================
// 3. MIME TYPE CLASSIFICATION & CUSTODY DETECTION
// =========================================================================

test("HT-NR-05A: classifyMediaMimeType classifies across all 5 canonical MIME groups", () => {
  // Image group
  assert.equal(classifyMediaMimeType("image/jpeg"), "Images");
  assert.equal(classifyMediaMimeType("image/png"), "Images");
  assert.equal(classifyMediaMimeType("image/webp"), "Images");
  assert.equal(classifyMediaMimeType("image/gif"), "Images");
  assert.equal(classifyMediaMimeType("image/avif"), "Images");
  assert.equal(classifyMediaMimeType("IMAGE/JPEG"), "Images");

  // Document group
  assert.equal(classifyMediaMimeType("application/pdf"), "Documents");
  assert.equal(classifyMediaMimeType("application/msword"), "Documents");
  assert.equal(
    classifyMediaMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "Documents"
  );
  assert.equal(classifyMediaMimeType("application/vnd.ms-excel"), "Documents");
  assert.equal(classifyMediaMimeType("application/vnd.ms-powerpoint"), "Documents");

  // Video group
  assert.equal(classifyMediaMimeType("video/mp4"), "Video");
  assert.equal(classifyMediaMimeType("video/webm"), "Video");
  assert.equal(classifyMediaMimeType("video/quicktime"), "Video");

  // Audio group
  assert.equal(classifyMediaMimeType("audio/mpeg"), "Audio");
  assert.equal(classifyMediaMimeType("audio/wav"), "Audio");
  assert.equal(classifyMediaMimeType("audio/ogg"), "Audio");
  assert.equal(classifyMediaMimeType("audio/mp3"), "Audio");

  // Other / unknown group
  assert.equal(classifyMediaMimeType("application/octet-stream"), "Other");
  assert.equal(classifyMediaMimeType("binary/data"), "Other");
  assert.equal(classifyMediaMimeType(""), "Other");
  assert.equal(classifyMediaMimeType(null), "Other");
  assert.equal(classifyMediaMimeType(undefined), "Other");
});

test("HT-NR-05A: deriveStorageCustodyCategory correctly resolves public vs private custody", () => {
  assert.equal(
    deriveStorageCustodyCategory({ publicUrl: "https://example.com/image.jpg", storageBucket: "media" }),
    "public"
  );
  assert.equal(
    deriveStorageCustodyCategory({ publicUrl: null, sourceUrl: "https://legacy.example.com/image.jpg", storageBucket: "media" }),
    "migrated"
  );
  assert.equal(
    deriveStorageCustodyCategory({ publicUrl: null, storageBucket: "newsroom-public" }),
    "public"
  );
  assert.equal(
    deriveStorageCustodyCategory({ publicUrl: null, storageBucket: "newsroom-private" }),
    "private"
  );
  assert.equal(
    deriveStorageCustodyCategory({ publicUrl: null, storageBucket: "external-s3" }),
    "unknown"
  );
  assert.equal(
    deriveStorageCustodyCategory({ publicUrl: null, storageBucket: "" }),
    "unknown"
  );
});

// =========================================================================
// 4. METADATA VALIDATION & CONSTRAINTS
// =========================================================================

test("HT-NR-05A: validateMediaMetadataPatch enforces image alt text requirements", () => {
  // Image with valid alt text passes
  const validImage = validateMediaMetadataPatch(
    { mimeType: "image/jpeg", altText: null },
    { altText: "Clinic immunization nurse recording patient card" }
  );
  assert.equal(validImage.valid, true);

  // Image with empty alt text fails
  const emptyAlt = validateMediaMetadataPatch(
    { mimeType: "image/jpeg", altText: null },
    { altText: "" }
  );
  assert.equal(emptyAlt.valid, false);
  assert.match(emptyAlt.error, /Image alt text is required/i);

  // Image with whitespace-only alt text fails
  const whitespaceAlt = validateMediaMetadataPatch(
    { mimeType: "image/png", altText: null },
    { altText: "   " }
  );
  assert.equal(whitespaceAlt.valid, false);

  // Image with single character alt text fails (< 2 characters)
  const shortAlt = validateMediaMetadataPatch(
    { mimeType: "image/webp", altText: null },
    { altText: "A" }
  );
  assert.equal(shortAlt.valid, false);

  // Non-image (e.g. PDF document) does NOT require alt text
  const docResult = validateMediaMetadataPatch(
    { mimeType: "application/pdf", altText: null },
    { altText: null, caption: "Official Gazette PDF" }
  );
  assert.equal(docResult.valid, true);

  // Non-image video does NOT require alt text
  const videoResult = validateMediaMetadataPatch(
    { mimeType: "video/mp4", altText: null },
    { altText: null, caption: "Press conference briefing" }
  );
  assert.equal(videoResult.valid, true);

  // Non-image audio does NOT require alt text
  const audioResult = validateMediaMetadataPatch(
    { mimeType: "audio/mpeg", altText: null },
    { altText: null, caption: "Interview recording" }
  );
  assert.equal(audioResult.valid, true);
});

test("HT-NR-05A: formatByteSize formats raw bytes truthfully", () => {
  assert.equal(formatByteSize(500), "500 B");
  assert.equal(formatByteSize(1024), "1.0 KB");
  assert.equal(formatByteSize(1536), "1.5 KB");
  assert.equal(formatByteSize(1048576), "1.0 MB");
  assert.equal(formatByteSize(2500000), "2.4 MB");
  assert.equal(formatByteSize(0), "Unknown size");
  assert.equal(formatByteSize(null), "Unknown size");
  assert.equal(formatByteSize(undefined), "Unknown size");
  assert.equal(formatByteSize(NaN), "Unknown size");
});

// =========================================================================
// 5. SERVICE ARCHITECTURE & SECURITY BOUNDARIES
// =========================================================================

test("HT-NR-05A: Service relies exclusively on canonical RPCs without direct table access", () => {
  const serviceSource = read("src/services/newsroom-media.ts");

  // Relies on canonical RPCs
  assert.ok(
    serviceSource.includes("newsroom_list_media"),
    "Service must call newsroom_list_media"
  );
  assert.ok(
    serviceSource.includes("newsroom_get_media_preview"),
    "Service must call newsroom_get_media_preview"
  );
  assert.ok(
    serviceSource.includes("newsroom_update_story_media_metadata"),
    "Service must call newsroom_update_story_media_metadata"
  );

  // Zero direct table mutations or queries
  assert.equal(
    /\.from\(["']media_assets["']\)/.test(serviceSource),
    false,
    "Service must never directly query media_assets table"
  );
  assert.equal(
    /\.from\(["']media_usage["']\)/.test(serviceSource),
    false,
    "Service must never directly query media_usage table"
  );

  // Zero service-role keys
  assert.equal(
    /service_role/i.test(serviceSource),
    false,
    "Service must never mention or use service_role keys"
  );

  // Zero private URL construction
  assert.equal(
    serviceSource.includes("createSignedUrl"),
    false,
    "Client must not generate signed URLs directly"
  );
});

test("HT-NR-05A: Fixtures service provides fail-closed contract implementation", () => {
  const fixturesSource = read("src/services/fixtures.ts");
  assert.ok(
    fixturesSource.includes("fixtureNewsroomMediaService"),
    "fixtures.ts must export fixtureNewsroomMediaService"
  );
  assert.ok(
    fixturesSource.includes("newsroomMedia: fixtureNewsroomMediaService"),
    "fixtureServices must include newsroomMedia"
  );
});

test("HT-NR-05A: Staging services index registers newsroomMedia contract", () => {
  const servicesIndex = read("src/services/index.ts");
  assert.ok(
    servicesIndex.includes("stagingNewsroomMediaService"),
    "services/index.ts must register stagingNewsroomMediaService"
  );
  assert.ok(
    servicesIndex.includes("newsroomMedia: stagingNewsroomMediaService"),
    "services.newsroomMedia must be registered in staging services"
  );
});

// =========================================================================
// 6. UI TRUTHFULNESS & RESILIENCE
// =========================================================================

test("HT-NR-05A: UI presents truthful constraints without inventing metadata", () => {
  const uiSource = read("src/ui/StudioMediaLibrary.tsx");

  // Truthful copyright copy
  assert.ok(
    uiSource.includes("Copyright metadata is not available in the current canonical media contract."),
    "UI must truthfully declare absence of copyright column in canonical media contract"
  );

  // Truthful uploader identity copy
  assert.ok(
    uiSource.includes("Uploader recorded") || uiSource.includes("uploadedByStaffId"),
    "UI must truthfully display recorded uploader ID without inventing staff names"
  );

  // Truthful public preview fallback
  assert.ok(
    uiSource.includes("Public preview unavailable for this asset."),
    "UI must indicate preview unavailability for non-images or missing public URLs"
  );

  // Exports both container and shared view
  assert.ok(
    uiSource.includes("export function StudioMediaLibraryView"),
    "Must export StudioMediaLibraryView for Owner Preview reuse"
  );
  assert.ok(
    uiSource.includes("export function StudioMediaLibrary"),
    "Must export StudioMediaLibrary container"
  );
});

// =========================================================================
// 7. OWNER PREVIEW CONFORMANCE & SAMPLE DATA INTEGRITY
// =========================================================================

test("HT-NR-05A: Owner Preview nav items include Media Library as 9th item", () => {
  assert.equal(OWNER_PREVIEW_NAV_ITEMS.length, 9);
  const mediaNav = OWNER_PREVIEW_NAV_ITEMS.find((item) => item.key === "media");
  assert.ok(mediaNav, "OWNER_PREVIEW_NAV_ITEMS must contain media item");
  assert.equal(mediaNav.label, "Media Library");
  assert.equal(mediaNav.path, "/owner-preview/studio/media");
});

test("HT-NR-05A: buildPreviewMediaAssets covers all MIME groups and statuses with PREVIEW tags", () => {
  const sampleAssets = buildPreviewMediaAssets();
  assert.ok(sampleAssets.length >= 5, "Sample assets must contain at least 5 assets");

  // MIME groups coverage
  const mimeTypes = sampleAssets.map((a) => a.mimeType);
  const typeGroups = new Set(mimeTypes.map((m) => classifyMediaMimeType(m)));
  assert.ok(typeGroups.has("Images"), "Must cover Images MIME type");
  assert.ok(typeGroups.has("Documents"), "Must cover Documents MIME type");
  assert.ok(typeGroups.has("Video"), "Must cover Video MIME type");
  assert.ok(typeGroups.has("Audio"), "Must cover Audio MIME type");

  // Statuses coverage
  const statuses = new Set(sampleAssets.map((a) => a.status));
  assert.ok(statuses.has("published"), "Must cover published status");
  assert.ok(statuses.has("pending"), "Must cover pending status");
  assert.ok(statuses.has("private_ready"), "Must cover private_ready status");
  assert.ok(statuses.has("missing_from_uploads_archive"), "Must cover missing_from_uploads_archive status");

  // Usage coverage
  assert.ok(sampleAssets.some((a) => a.usage.length > 0), "Must include used media assets");
  assert.ok(sampleAssets.some((a) => a.usage.length === 0), "Must include unused media assets");

  // Check storage bucket
  for (const asset of sampleAssets) {
    assert.equal(asset.storageBucket, "media");
    assert.ok(asset.byteSize > 0);
  }
});

test("HT-NR-05A: OwnerPreviewStudio reuses StudioMediaLibraryView and keeps writes local", () => {
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");
  assert.ok(
    previewStudioSource.includes("StudioMediaLibraryView"),
    "OwnerPreviewStudio must import StudioMediaLibraryView"
  );
  assert.ok(
    previewStudioSource.includes("<StudioMediaLibraryView"),
    "OwnerPreviewStudio must render StudioMediaLibraryView"
  );
  assert.ok(
    previewStudioSource.includes('case "media":'),
    "OwnerPreviewModuleScreen must handle media case"
  );
  assert.ok(
    previewStudioSource.includes("Preview state only: Simulated metadata update saved in local preview memory."),
    "OwnerPreviewStudio must show local-only feedback for metadata saves"
  );
});
