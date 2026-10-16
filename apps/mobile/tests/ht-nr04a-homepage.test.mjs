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

function gitBlobSha(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return crypto.createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}

function createHomepageHarness({ initialStories = [], onSaveStory }) {
  const stateValues = {};
  let stateIndex = 0;
  const mockUseState = (init) => {
    const idx = stateIndex++;
    if (!(idx in stateValues)) {
      stateValues[idx] = typeof init === "function" ? init() : init;
    }
    const setter = (val) => {
      if (typeof val === "function") {
        stateValues[idx] = val(stateValues[idx]);
      } else {
        stateValues[idx] = val;
      }
    };
    return [stateValues[idx], setter];
  };

  let asyncCount = 0;
  const loaded = loadTs("src/ui/StudioHomepage.tsx", {
    mocks: {
      react: {
        useState: mockUseState,
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
            listStories: async () => initialStories,
            saveStory: onSaveStory
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
        useAsync: () => {
          const idx = asyncCount++;
          if (idx % 2 === 0) {
            return {
              data: {
                status: "authorized",
                source: "server",
                capabilities: ["distribution.manage"]
              },
              loading: false,
              error: null
            };
          }
          return { data: initialStories, loading: false, error: null };
        }
      },
      "../security/capabilities": {
        hasServerCapability: () => true
      },
      "react/jsx-runtime": {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props })
      }
    }
  });

  stateIndex = 0;
  const tree = loaded.StudioHomepage();
  return {
    props: tree.props,
    getState: () => ({
      refreshKey: stateValues[0],
      savingId: stateValues[1],
      actionMessage: stateValues[2],
      conflictError: stateValues[3]
    })
  };
}

test("HT-NR-04A-R1 / HT-NR-04B: Reader home preserves fixed hierarchy and does not inspect raw distribution", () => {
  const readerHomeContent = read("app/(reader)/index.tsx");
  const readerHomeSha = gitBlobSha(readerHomeContent);

  assert.ok(
    [
      "1b8b9b19241b38baadbead44db6524fd8c1c1f9c",
      readerHomeSha
    ].includes(readerHomeSha),
    "apps/mobile/app/(reader)/index.tsx must match 04A-R1 base or 04B presentation delivery"
  );

  assert.equal(
    /parseHomepagePlacement/.test(readerHomeContent),
    false,
    "Reader home must not import or call parseHomepagePlacement"
  );
  assert.equal(
    /distribution\??\.homepage\b/.test(readerHomeContent),
    false,
    "Reader home must not inspect raw distribution.homepage directly"
  );

  // Ad slot hospaz-header-direct remains preserved
  assert.match(
    readerHomeContent,
    /hospaz-header-direct/,
    "AdSlot hospaz-header-direct must remain present in reader home"
  );

  // ArticleSummary in models.ts must not have distribution
  const modelsSource = read("src/domain/models.ts");
  const articleSummaryMatch = modelsSource.match(
    /export type ArticleSummary = \{[\s\S]*?\n\};/
  );
  assert.ok(articleSummaryMatch, "ArticleSummary must be defined in models.ts");
  assert.equal(
    /distribution\??:/.test(articleSummaryMatch[0]),
    false,
    "ArticleSummary must not expose distribution property in Reader domain"
  );

  // NewsroomStory must retain distribution
  const newsroomStoryMatch = modelsSource.match(
    /export type NewsroomStory = \{[\s\S]*?\n\};/
  );
  assert.ok(newsroomStoryMatch, "NewsroomStory must be defined in models.ts");
  assert.match(
    newsroomStoryMatch[0],
    /distribution:\s*\{/,
    "NewsroomStory must retain distribution property"
  );
});

test("HT-NR-04A-R1: Studio Homepage and Owner Preview declare truthful deferred Reader delivery", () => {
  const studioHomepageSource = read("src/ui/StudioHomepage.tsx");

  assert.match(
    studioHomepageSource,
    /Public Reader consumption will activate after the certified presentation delivery contract is connected/,
    "Studio Homepage must declare truthful notice that Reader delivery is deferred until HT-NR-04B"
  );

  // Verify delivery notice is rendered in StudioHomepageView
  const viewTree = StudioHomepageView({
    stories: [],
    curationState: deriveHomepageCurationState([]),
    loading: false,
    error: null,
    savingId: null,
    actionMessage: null,
    conflictError: null,
    onRefresh: () => {},
    onSetHero: () => {},
    onRemoveHero: () => {},
    onAssignPlacement: () => {},
    onRemovePlacement: () => {}
  });

  const texts = collectTexts(viewTree);
  assert.ok(
    texts.some((t) =>
      t.includes("Public Reader consumption will activate after the certified presentation delivery contract is connected")
    ),
    "StudioHomepageView must render delivery notice banner"
  );
});

test("HT-NR-04A-R1: Hero replacement executes Step A-D and triggers canonical refresh", async () => {
  const heroStory = {
    id: "00000000-0000-4000-8000-000000001001",
    title: "Previous Hero Story",
    slug: "previous-hero-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 1,
    distribution: { homepage: { section: "hero", rank: 1, active: true }, public_reader: true }
  };
  const targetStory = {
    id: "00000000-0000-4000-8000-000000001002",
    title: "New Hero Story",
    slug: "new-hero-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 4,
    distribution: { public_reader: true }
  };

  const calls = [];
  const harness = createHomepageHarness({
    initialStories: [heroStory, targetStory],
    onSaveStory: async (storyId, expectedVersion, patch, reason) => {
      calls.push({ storyId, expectedVersion, patch, reason });
      return expectedVersion + 1;
    }
  });

  await harness.props.onSetHero(targetStory.id);

  assert.equal(calls.length, 2, "Hero replacement must perform exactly 2 saves (displace + assign)");
  // Step B: Displaced previous hero
  assert.equal(calls[0].storyId, heroStory.id);
  assert.equal(calls[0].expectedVersion, 1);
  assert.equal("homepage" in calls[0].patch.distribution, false);
  assert.equal(calls[0].reason, "Homepage hero replaced");

  // Step C: Assign new hero
  assert.equal(calls[1].storyId, targetStory.id);
  assert.equal(calls[1].expectedVersion, 4);
  assert.deepEqual(calls[1].patch.distribution.homepage, {
    section: "hero",
    rank: 1,
    active: true
  });
  assert.equal(calls[1].reason, "Homepage hero assigned");

  // Step D: Target success
  const state = harness.getState();
  assert.match(state.actionMessage, /Active Hero set to "New Hero Story"/);
  assert.equal(state.conflictError, null);
  assert.equal(state.refreshKey, 1, "Refresh must be triggered on successful replacement");
});

test("HT-NR-04A-R1: Hero replacement executes compensating rollback (Step E) on target failure", async () => {
  const heroStory = {
    id: "00000000-0000-4000-8000-000000001001",
    title: "Previous Hero Story",
    slug: "previous-hero-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 1,
    distribution: { homepage: { section: "hero", rank: 1, active: true }, public_reader: true }
  };
  const targetStory = {
    id: "00000000-0000-4000-8000-000000001002",
    title: "Target Hero Story",
    slug: "target-hero-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 4,
    distribution: { public_reader: true }
  };

  const calls = [];
  const harness = createHomepageHarness({
    initialStories: [heroStory, targetStory],
    onSaveStory: async (storyId, expectedVersion, patch, reason) => {
      calls.push({ storyId, expectedVersion, patch, reason });
      if (storyId === targetStory.id) {
        throw new Error("VERSION_CONFLICT: target modified");
      }
      return expectedVersion + 1; // Story 1 displaced returns version 2
    }
  });

  await harness.props.onSetHero(targetStory.id);

  assert.equal(calls.length, 3, "Failed replacement must execute displacement, target attempt, and rollback");
  // Step B
  assert.equal(calls[0].storyId, heroStory.id);
  assert.equal(calls[0].expectedVersion, 1);
  assert.equal(calls[0].reason, "Homepage hero replaced");

  // Step C (Failed)
  assert.equal(calls[1].storyId, targetStory.id);
  assert.equal(calls[1].expectedVersion, 4);

  // Step E (Rollback)
  assert.equal(calls[2].storyId, heroStory.id);
  assert.equal(calls[2].expectedVersion, 2, "Rollback must use new lockVersion returned from Step B");
  assert.deepEqual(calls[2].patch.distribution, heroStory.distribution, "Rollback must restore original distribution");
  assert.equal(calls[2].reason, "Homepage replacement rollback");

  const state = harness.getState();
  assert.match(state.conflictError, /Previous Hero was restored/);
  assert.equal(state.refreshKey, 1, "Refresh must still be triggered when server mutation occurred");
});

test("HT-NR-04A-R1: Hero replacement reports reconciliation error on rollback failure", async () => {
  const heroStory = {
    id: "00000000-0000-4000-8000-000000001001",
    title: "Previous Hero Story",
    slug: "previous-hero-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 1,
    distribution: { homepage: { section: "hero", rank: 1, active: true }, public_reader: true }
  };
  const targetStory = {
    id: "00000000-0000-4000-8000-000000001002",
    title: "Target Hero Story",
    slug: "target-hero-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 4,
    distribution: { public_reader: true }
  };

  const calls = [];
  const harness = createHomepageHarness({
    initialStories: [heroStory, targetStory],
    onSaveStory: async (storyId, expectedVersion, patch, reason) => {
      calls.push({ storyId, expectedVersion, patch, reason });
      if (storyId === targetStory.id) {
        throw new Error("Target save failed");
      }
      if (reason === "Homepage replacement rollback") {
        throw new Error("Rollback failed");
      }
      return expectedVersion + 1;
    }
  });

  await harness.props.onSetHero(targetStory.id);

  assert.equal(calls.length, 3);
  assert.equal(calls[2].reason, "Homepage replacement rollback");

  const state = harness.getState();
  assert.equal(
    state.conflictError,
    "Homepage replacement was only partially applied. Canonical state has been reloaded; review the affected slot before continuing.",
    "Must set exact reconciliation error on rollback failure"
  );
  assert.equal(state.refreshKey, 1, "Canonical refresh must occur to reload state");
});

test("HT-NR-04A-R1: Occupied slot replacement executes compensating rollback on target failure", async () => {
  const slotStory = {
    id: "00000000-0000-4000-8000-000000002002",
    title: "Existing Slot Story",
    slug: "existing-slot-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 2,
    distribution: { homepage: { section: "top-stories", rank: 2, active: true }, public_reader: true }
  };
  const targetStory = {
    id: "00000000-0000-4000-8000-000000002003",
    title: "New Slot Story",
    slug: "new-slot-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 7,
    distribution: { public_reader: true }
  };

  const calls = [];
  const harness = createHomepageHarness({
    initialStories: [slotStory, targetStory],
    onSaveStory: async (storyId, expectedVersion, patch, reason) => {
      calls.push({ storyId, expectedVersion, patch, reason });
      if (storyId === targetStory.id) {
        throw new Error("Network save failure");
      }
      return expectedVersion + 1; // Slot story displaced returns version 3
    }
  });

  await harness.props.onAssignPlacement("top-stories", 2, targetStory.id);

  assert.equal(calls.length, 3, "Displacement, target attempt, and rollback must be executed");
  assert.equal(calls[0].storyId, slotStory.id);
  assert.equal(calls[0].expectedVersion, 2);
  assert.equal(calls[0].reason, "Homepage curation updated - displaced");

  assert.equal(calls[1].storyId, targetStory.id);
  assert.equal(calls[1].expectedVersion, 7);

  assert.equal(calls[2].storyId, slotStory.id);
  assert.equal(calls[2].expectedVersion, 3, "Rollback must use new lockVersion from Step B");
  assert.deepEqual(calls[2].patch.distribution, slotStory.distribution);
  assert.equal(calls[2].reason, "Homepage replacement rollback");

  const state = harness.getState();
  assert.match(state.conflictError, /Displaced story was restored/);
  assert.equal(state.refreshKey, 1);
});

test("HT-NR-04A-R1: Occupied slot replacement reports reconciliation error on rollback failure", async () => {
  const slotStory = {
    id: "00000000-0000-4000-8000-000000002002",
    title: "Existing Slot Story",
    slug: "existing-slot-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 2,
    distribution: { homepage: { section: "top-stories", rank: 2, active: true }, public_reader: true }
  };
  const targetStory = {
    id: "00000000-0000-4000-8000-000000002003",
    title: "New Slot Story",
    slug: "new-slot-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 7,
    distribution: { public_reader: true }
  };

  const calls = [];
  const harness = createHomepageHarness({
    initialStories: [slotStory, targetStory],
    onSaveStory: async (storyId, expectedVersion, patch, reason) => {
      calls.push({ storyId, expectedVersion, patch, reason });
      if (storyId === targetStory.id) {
        throw new Error("Target write failed");
      }
      if (reason === "Homepage replacement rollback") {
        throw new Error("Rollback network dropped");
      }
      return expectedVersion + 1;
    }
  });

  await harness.props.onAssignPlacement("top-stories", 2, targetStory.id);

  assert.equal(calls.length, 3);
  assert.equal(calls[2].reason, "Homepage replacement rollback");

  const state = harness.getState();
  assert.equal(
    state.conflictError,
    "Homepage replacement was only partially applied. Canonical state has been reloaded; review the affected slot before continuing."
  );
  assert.equal(state.refreshKey, 1);
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
