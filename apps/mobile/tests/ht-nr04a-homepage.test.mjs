import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function collectTexts(node, out = []) {
  if (node == null || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectTexts(child, out);
    return out;
  }
  if (typeof node === "object" && node.props) {
    collectTexts(node.props.children, out);
  }
  return out;
}

function findPressables(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findPressables(child, out);
    return out;
  }
  if (node.type === "Pressable") {
    out.push(node);
  }
  if (node.props && node.props.children) {
    findPressables(node.props.children, out);
  }
  return out;
}

const modelsModule = loadTs("src/domain/models.ts");
const {
  isStoryPublishable,
  parseHomepagePlacement,
  mergeHomepageDistribution,
  deriveHomepageCurationState,
  CURATED_HOMEPAGE_SECTIONS,
  UNCURATED_HOMEPAGE_SECTIONS,
  HOMEPAGE_SECTION_KEYS
} = modelsModule;

const homepageModule = loadTs("src/ui/StudioHomepage.tsx", {
  mocks: {
    react: {
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useMemo: (fn) => fn(),
      useEffect: () => {}
    },
    "react-native": {
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      StyleSheet: { create: (s) => s },
      Text: "Text",
      TextInput: "TextInput",
      View: "View",
      useWindowDimensions: () => ({ width: 1280, height: 800 })
    },
    "expo-router": {
      useRouter: () => ({ push: () => {} })
    },
    "../services": {
      services: {
        newsroomStories: {
          listStories: async () => [],
          saveStory: async () => ({ ok: true })
        },
        authorization: {
          getSnapshot: async () => ({
            status: "authorized",
            source: "server",
            capabilities: ["distribution.manage"]
          })
        }
      }
    },
    "../hooks/useAsync": {
      useAsync: () => ({ data: null, loading: false, error: null })
    },
    "../security/capabilities": {
      hasServerCapability: (snapshot, cap) =>
        snapshot?.status === "authorized" &&
        snapshot?.source === "server" &&
        Array.isArray(snapshot?.capabilities) &&
        snapshot.capabilities.includes(cap)
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props })
    }
  }
});

const { hasHomepageAuthority, StudioHomepageView, StudioHomepage } =
  homepageModule;

test("HT-NR-04A: Studio navigation and route registration require distribution.manage", () => {
  const studioSource = read("src/ui/Studio.tsx");
  const moduleSource = read("app/studio/[module].tsx");

  assert.match(
    studioSource,
    /\["Homepage",\s*"\/studio\/homepage"\]/,
    "Studio navigation must register Homepage at /studio/homepage"
  );

  assert.match(
    moduleSource,
    /"homepage"/,
    "app/studio/[module].tsx must handle homepage slug"
  );
  assert.match(
    moduleSource,
    /capability:\s*"distribution\.manage"/,
    "Homepage module owner authority must require distribution.manage"
  );
  assert.match(
    moduleSource,
    /<StudioHomepage \/>/,
    "Homepage route must render StudioHomepage component"
  );
});

test("HT-NR-04A: Authority check requires server-authorized session with distribution.manage", () => {
  assert.equal(hasHomepageAuthority(null), false);
  assert.equal(hasHomepageAuthority(undefined), false);
  assert.equal(
    hasHomepageAuthority({
      status: "anonymous",
      source: "none",
      capabilities: []
    }),
    false
  );
  assert.equal(
    hasHomepageAuthority({
      status: "authenticated-no-staff-authority",
      source: "none",
      capabilities: []
    }),
    false
  );
  assert.equal(
    hasHomepageAuthority({
      status: "authorized",
      source: "none",
      capabilities: ["distribution.manage"]
    }),
    false,
    "Client-only or non-server session source must fail closed"
  );
  assert.equal(
    hasHomepageAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["story.edit_own", "assignment.manage"]
    }),
    false,
    "Staff session lacking distribution.manage must fail closed"
  );

  assert.equal(
    hasHomepageAuthority({
      status: "authorized",
      source: "server",
      capabilities: ["distribution.manage"]
    }),
    true,
    "Server-authorized session with distribution.manage must pass"
  );
});

test("HT-NR-04A: parseHomepagePlacement accepts valid placements and fails closed on invalid input", () => {
  // Valid placements
  assert.deepEqual(
    parseHomepagePlacement({ section: "hero", rank: 1, active: true }),
    { section: "hero", rank: 1, active: true }
  );
  assert.deepEqual(
    parseHomepagePlacement({ section: "top-stories", rank: 4, active: false }),
    { section: "top-stories", rank: 4, active: false }
  );
  assert.deepEqual(
    parseHomepagePlacement({ section: "public-health", rank: 6, active: true }),
    { section: "public-health", rank: 6, active: true }
  );

  // Rejects invalid types
  assert.equal(parseHomepagePlacement(null), null);
  assert.equal(parseHomepagePlacement(undefined), null);
  assert.equal(parseHomepagePlacement("hero"), null);
  assert.equal(parseHomepagePlacement([1, 2, 3]), null);
  assert.equal(parseHomepagePlacement({}), null);

  // Rejects uncurated or unknown sections
  assert.equal(
    parseHomepagePlacement({ section: "live-desk", rank: 1, active: true }),
    null
  );
  assert.equal(
    parseHomepagePlacement({ section: "unknown-desk", rank: 1, active: true }),
    null
  );

  // Rejects invalid rank
  assert.equal(
    parseHomepagePlacement({ section: "top-stories", rank: 0, active: true }),
    null
  );
  assert.equal(
    parseHomepagePlacement({ section: "top-stories", rank: 7, active: true }),
    null
  );
  assert.equal(
    parseHomepagePlacement({ section: "top-stories", rank: 2.5, active: true }),
    null
  );
  assert.equal(
    parseHomepagePlacement({ section: "top-stories", rank: "1", active: true }),
    null
  );

  // Hero section strictly requires rank === 1
  assert.equal(
    parseHomepagePlacement({ section: "hero", rank: 2, active: true }),
    null
  );

  // Rejects non-boolean active
  assert.equal(
    parseHomepagePlacement({ section: "hero", rank: 1, active: "true" }),
    null
  );
  assert.equal(
    parseHomepagePlacement({ section: "hero", rank: 1, active: 1 }),
    null
  );
  assert.equal(
    parseHomepagePlacement({ section: "hero", rank: 1, active: null }),
    null
  );
});

test("HT-NR-04A: mergeHomepageDistribution strictly preserves unknown distribution keys", () => {
  const current = {
    social: { twitter: true, facebook: false },
    newsletter: "morning-brief",
    whatsApp: { channel: "healthtimes-zw" },
    public_reader: true
  };

  // Adding placement
  const updated = mergeHomepageDistribution(current, {
    section: "hero",
    rank: 1,
    active: true
  });
  assert.deepEqual(updated.social, current.social);
  assert.equal(updated.newsletter, "morning-brief");
  assert.deepEqual(updated.whatsApp, current.whatsApp);
  assert.equal(updated.public_reader, true);
  assert.deepEqual(updated.homepage, {
    section: "hero",
    rank: 1,
    active: true
  });

  // Removing placement deletes homepage while preserving unknown keys
  const cleared = mergeHomepageDistribution(updated, null);
  assert.equal("homepage" in cleared, false);
  assert.deepEqual(cleared.social, current.social);
  assert.equal(cleared.newsletter, "morning-brief");
  assert.deepEqual(cleared.whatsApp, current.whatsApp);
  assert.equal(cleared.public_reader, true);

  // Handles null / undefined current distribution safely
  const initial = mergeHomepageDistribution(null, {
    section: "top-stories",
    rank: 1,
    active: true
  });
  assert.deepEqual(initial, {
    homepage: { section: "top-stories", rank: 1, active: true }
  });
});

test("HT-NR-04A: isStoryPublishable validates canonical publishability requirements", () => {
  const validStory = {
    id: "00000000-0000-4000-8000-000000001001",
    title: "Valid Published Story",
    slug: "valid-published-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published"
  };
  assert.equal(isStoryPublishable(validStory), true);

  // Rejects invalid UUID
  assert.equal(
    isStoryPublishable({ ...validStory, id: "invalid-uuid-123" }),
    false
  );

  // Rejects empty title or slug
  assert.equal(isStoryPublishable({ ...validStory, title: "   " }), false);
  assert.equal(isStoryPublishable({ ...validStory, slug: "" }), false);

  // Rejects missing or invalid access policy
  assert.equal(
    isStoryPublishable({ ...validStory, accessPolicy: "members-only" }),
    false
  );

  // Rejects archived status
  assert.equal(
    isStoryPublishable({ ...validStory, workflowStatus: "Archived" }),
    false
  );
  assert.equal(
    isStoryPublishable({ ...validStory, status: "archived" }),
    false
  );
});

test("HT-NR-04A: deriveHomepageCurationState enforces Hero cardinality (max 1) and tie-breaking", () => {
  const story1 = {
    id: "00000000-0000-4000-8000-000000001001",
    title: "Story 1",
    slug: "story-1",
    accessPolicy: "public",
    workflowStatus: "Published",
    updatedAt: "2026-10-15T10:00:00Z",
    distribution: {
      homepage: { section: "hero", rank: 1, active: true }
    }
  };
  const story2 = {
    id: "00000000-0000-4000-8000-000000001002",
    title: "Story 2 (Newer)",
    slug: "story-2",
    accessPolicy: "public",
    workflowStatus: "Published",
    updatedAt: "2026-10-15T12:00:00Z",
    distribution: {
      homepage: { section: "hero", rank: 1, active: true }
    }
  };

  // When both claim Hero, the newer modification timestamp wins
  const state = deriveHomepageCurationState([story1, story2]);
  assert.ok(state.hero);
  assert.equal(state.hero.id, story2.id);
  assert.equal(state.sections.hero.length, 1);
  assert.equal(state.sections.hero[0].id, story2.id);
});

test("HT-NR-04A: deriveHomepageCurationState enforces Top Stories cardinality (max 6) and rank ordering", () => {
  const stories = [];
  for (let r = 1; r <= 8; r++) {
    stories.push({
      id: `00000000-0000-4000-8000-00000000200${r}`,
      title: `Top Story ${r}`,
      slug: `top-story-${r}`,
      accessPolicy: "public",
      workflowStatus: "Published",
      updatedAt: `2026-10-15T${10 + r}:00:00Z`,
      distribution: {
        homepage: { section: "top-stories", rank: Math.min(r, 6), active: true }
      }
    });
  }

  const state = deriveHomepageCurationState(stories);
  assert.equal(state.topStories.length, 6, "Top stories must be capped at 6");
  for (let i = 0; i < state.topStories.length; i++) {
    const placement = parseHomepagePlacement(
      state.topStories[i].distribution?.homepage
    );
    assert.equal(placement.rank, i + 1);
  }
});

test("HT-NR-04A: deriveHomepageCurationState populates thematic curated sections", () => {
  const featuresStory = {
    id: "00000000-0000-4000-8000-000000003001",
    title: "Features Lead",
    slug: "features-lead",
    accessPolicy: "premium",
    workflowStatus: "Published",
    distribution: {
      homepage: { section: "features", rank: 1, active: true }
    }
  };
  const researchStory = {
    id: "00000000-0000-4000-8000-000000003002",
    title: "Research Dispatch",
    slug: "research-dispatch",
    accessPolicy: "public",
    workflowStatus: "Published",
    distribution: {
      homepage: { section: "research", rank: 1, active: true }
    }
  };

  const state = deriveHomepageCurationState([featuresStory, researchStory]);
  assert.equal(state.sections.features.length, 1);
  assert.equal(state.sections.features[0].id, featuresStory.id);
  assert.equal(state.sections.research.length, 1);
  assert.equal(state.sections.research[0].id, researchStory.id);
  assert.equal(state.sections["hiv-aids"].length, 0);
});

test("HT-NR-04A: Zero direct Supabase updates and strict service write boundary", () => {
  const homepageSource = read("src/ui/StudioHomepage.tsx");

  // Must not import or call direct supabase table mutations
  assert.equal(
    /supabase\.from\s*\(\s*["']stories["']\s*\)\.update/.test(homepageSource),
    false,
    "Direct supabase.from('stories').update is strictly forbidden"
  );

  // Must use services.newsroomStories.saveStory
  assert.match(
    homepageSource,
    /services\.newsroomStories\.saveStory/,
    "All homepage placement changes must flow through services.newsroomStories.saveStory"
  );

  // Must pass lockVersion
  assert.match(
    homepageSource,
    /lockVersion/,
    "saveStory mutation must pass optimistic concurrency lockVersion"
  );
});

test("HT-NR-04A: StudioHomepage displays unauthorized state when user lacks capability", () => {
  let listStoriesCalled = false;

  const unauthorizedMod = loadTs("src/ui/StudioHomepage.tsx", {
    mocks: {
      react: {
        useState: (init) => [typeof init === "function" ? init() : init, () => {}],
        useMemo: (fn) => fn(),
        useEffect: () => {}
      },
      "react-native": {
        Pressable: "Pressable",
        ScrollView: "ScrollView",
        StyleSheet: { create: (s) => s },
        Text: "Text",
        TextInput: "TextInput",
        View: "View",
        useWindowDimensions: () => ({ width: 1280, height: 800 })
      },
      "expo-router": {
        useRouter: () => ({ push: () => {} })
      },
      "../services": {
        services: {
          newsroomStories: {
            listStories: async () => {
              listStoriesCalled = true;
              return [];
            },
            saveStory: async () => ({ ok: true })
          },
          authorization: {
            getSnapshot: async () => ({
              status: "authorized",
              source: "server",
              capabilities: ["story.create"] // Lacks distribution.manage
            })
          }
        }
      },
      "../hooks/useAsync": {
        useAsync: () => ({
          data: {
            status: "authorized",
            source: "server",
            capabilities: ["story.create"]
          },
          loading: false,
          error: null
        })
      },
      "../security/capabilities": {
        hasServerCapability: () => false
      },
      "react/jsx-runtime": {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props })
      }
    }
  });

  const tree = unauthorizedMod.StudioHomepage();
  const texts = collectTexts(tree);
  assert.ok(
    texts.some((t) => t.includes("ACCESS RESTRICTED")),
    "Must display ACCESS RESTRICTED when unauthorized"
  );
  assert.ok(
    texts.some((t) => t.includes("distribution.manage")),
    "Must explain required capability distribution.manage"
  );
  assert.equal(
    listStoriesCalled,
    false,
    "Zero story retrieval must be attempted when unauthorized"
  );
});

test("HT-NR-04A: Reader Home integrates parseHomepagePlacement preferring curated stories while preserving fallback", () => {
  const readerHomeSource = read("app/(reader)/index.tsx");

  assert.match(
    readerHomeSource,
    /parseHomepagePlacement/,
    "Reader home must import and use parseHomepagePlacement"
  );
  assert.match(
    readerHomeSource,
    /\.section === "hero"/,
    "Reader home must inspect curated hero placement"
  );
  assert.match(
    readerHomeSource,
    /\.section === "top-stories"/,
    "Reader home must inspect curated top-stories placement"
  );

  // Ad slot hospaz-header-direct remains preserved
  assert.match(
    readerHomeSource,
    /hospaz-header-direct/,
    "AdSlot hospaz-header-direct must remain present in reader home"
  );
});

test("HT-NR-04A: Owner Preview incorporates Homepage curation preview route", () => {
  const previewDataSource = read("src/preview/newsroomPreviewData.ts");
  const studioPreviewSource = read("src/preview/OwnerPreviewStudio.tsx");

  assert.match(
    previewDataSource,
    /key:\s*"homepage"/,
    "OWNER_PREVIEW_NAV_ITEMS must contain homepage key"
  );
  assert.match(
    studioPreviewSource,
    /OwnerPreviewHomepageView/,
    "OwnerPreviewStudio must export OwnerPreviewHomepageView"
  );
  assert.match(
    studioPreviewSource,
    /<StudioHomepageView/,
    "OwnerPreviewHomepageView must reuse shared StudioHomepageView presentation component"
  );
  assert.match(
    studioPreviewSource,
    /Preview state only/,
    "Owner Preview homepage must declare non-persistence feedback"
  );
});
