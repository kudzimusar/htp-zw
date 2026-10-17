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

function gitBlobSha(content) {
  const header = `blob ${Buffer.byteLength(content, "utf8")}\0`;
  return crypto.createHash("sha1").update(header + content, "utf8").digest("hex");
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

const modelsModule = loadTs("src/domain/models.ts");
const {
  validateEditionSlug,
  parseHomepagePlacement,
  mergeHomepageDistribution,
  mergeHomepageEditionDistribution,
  deriveHomepageCurationState,
  deriveEditionHomepageCurationState,
  CURATED_HOMEPAGE_SECTIONS,
  UNCURATED_HOMEPAGE_SECTIONS,
  HOMEPAGE_SECTION_KEYS
} = modelsModule;

const presentationModule = loadTs("src/services/presentation.ts", {
  mocks: {
    "../domain/models": modelsModule,
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        rpc: async () => ({ data: [], error: null })
      })
    }
  }
});
const { mapPresentationRow, publicPresentationService } = presentationModule;

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
          saveStory: async () => 1
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
      hasServerCapability: () => true
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props })
    }
  }
});
const { StudioHomepageView } = homepageModule;

// Harness helper for testing StudioHomepage
function createHomepageHarness({
  initialStories = [],
  initialScope = "global",
  initialEdition = "zimbabwe",
  onSaveStory = async () => 1
} = {}) {
  let stateIndex = 0;
  const stateValues = [
    0, // refreshKey (0)
    null, // savingId (1)
    null, // actionMessage (2)
    null, // conflictError (3)
    initialScope, // presentationScope (4)
    initialEdition // selectedEditionSlug (5)
  ];

  const mockUseState = (init) => {
    const idx = stateIndex++;
    if (stateValues[idx] === undefined) {
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
    setScope: (scope) => {
      stateValues[4] = scope;
    },
    setEdition: (edition) => {
      stateValues[5] = edition;
    },
    getState: () => ({
      refreshKey: stateValues[0],
      savingId: stateValues[1],
      actionMessage: stateValues[2],
      conflictError: stateValues[3],
      presentationScope: stateValues[4],
      selectedEditionSlug: stateValues[5]
    })
  };
}

// ---------------------------------------------------------------------------
// 1. PUBLIC CONTRACT & MIGRATION RPC VERIFICATION
// ---------------------------------------------------------------------------
test("HT-NR-04B: Additive migration defines newsroom_public_homepage_presentations returning 19 public fields", () => {
  const migrationPath = path.join(root, "../../supabase/migrations/20261016140000_ht_nr04b_public_homepage_presentations.sql");
  assert.ok(fs.existsSync(migrationPath), "Additive migration file must exist");

  const sql = fs.readFileSync(migrationPath, "utf8");

  // Function signature
  assert.match(
    sql,
    /create or replace function (?:public\.)?newsroom_public_homepage_presentations\(\s*p_edition_slug text default null\s*\)/i,
    "RPC must declare newsroom_public_homepage_presentations(p_edition_slug text default null)"
  );

  // Security definer, stable, public search path
  assert.match(sql, /security definer/i, "RPC must be security definer");
  assert.match(sql, /set search_path = public/i, "RPC must pin search_path = public");
  assert.match(sql, /stable/i, "RPC must be stable volatility");

  // Grants
  assert.match(sql, /grant execute on function (?:public\.)?newsroom_public_homepage_presentations\(text\) to anon, authenticated/i);
  assert.match(sql, /revoke (?:all|execute) on function (?:public\.)?newsroom_public_homepage_presentations\(text\) from public/i);

  // 19 returned columns
  const expectedCols = [
    "story_id", "slug", "title", "standfirst", "excerpt", "access_policy",
    "published_at", "modified_at", "canonical_url", "author_name", "author_slug",
    "section_name", "section_slug", "hero_public_url", "hero_alt_text",
    "hero_caption", "hero_credit", "global_placement", "edition_placement"
  ];
  for (const col of expectedCols) {
    assert.match(sql, new RegExp(`\\b${col}\\b`, "i"), `RPC must expose public column ${col}`);
  }

  // Must NOT expose internal or sensitive fields
  assert.equal(/returns table\s*\([^)]*\bbody\b/i.test(sql), false, "RPC must not expose body");
  assert.equal(/returns table\s*\([^)]*\bnotes\b/i.test(sql), false, "RPC must not expose notes");
  assert.equal(/returns table\s*\([^)]*\bworkflow_status\b/i.test(sql), false, "RPC must not expose workflow_status");
  assert.equal(/returns table\s*\([^)]*\block_version\b/i.test(sql), false, "RPC must not expose lock_version");
  assert.equal(/returns table\s*\([^)]*\bmetadata\b/i.test(sql), false, "RPC must not expose raw metadata column");
});

// ---------------------------------------------------------------------------
// 2. DOMAIN MODELS & VALIDATION (ELIGIBILITY & MALFORMED SLUG HANDLING)
// ---------------------------------------------------------------------------
test("HT-NR-04B: validateEditionSlug handles valid and malformed inputs safely", () => {
  assert.equal(validateEditionSlug("zimbabwe"), "zimbabwe");
  assert.equal(validateEditionSlug("south-africa"), "south-africa");
  assert.equal(validateEditionSlug("  uk  "), "uk");

  // Global is the default scope, not a regional edition slug
  assert.equal(validateEditionSlug("GLOBAL"), null);
  assert.equal(validateEditionSlug("global"), null);

  // Malformed / injection inputs
  assert.equal(validateEditionSlug(""), null);
  assert.equal(validateEditionSlug("   "), null);
  assert.equal(validateEditionSlug("drop table stories;--"), null);
  assert.equal(validateEditionSlug("invalid/slash"), null);
  assert.equal(validateEditionSlug("bad_underscore"), null);
  assert.equal(validateEditionSlug(null), null);
  assert.equal(validateEditionSlug(undefined), null);
  assert.equal(validateEditionSlug(123), null);
});

test("HT-NR-04B: mergeHomepageEditionDistribution writes edition-scoped placements safely", () => {
  const initialDist = {
    public_reader: true,
    homepage: { section: "top-stories", rank: 1, active: true },
    homepage_editions: {
      uk: { section: "features", rank: 1, active: true }
    }
  };

  // Add zimbabwe edition placement
  const withZw = mergeHomepageEditionDistribution(initialDist, "zimbabwe", {
    section: "hero",
    rank: 1,
    active: true
  });

  assert.equal(withZw.public_reader, true);
  assert.deepEqual(withZw.homepage, { section: "top-stories", rank: 1, active: true });
  assert.deepEqual(withZw.homepage_editions.uk, { section: "features", rank: 1, active: true });
  assert.deepEqual(withZw.homepage_editions.zimbabwe, { section: "hero", rank: 1, active: true });

  // Remove zimbabwe placement
  const withoutZw = mergeHomepageEditionDistribution(withZw, "zimbabwe", null);
  assert.equal(withoutZw.homepage_editions?.zimbabwe, undefined);
  assert.deepEqual(withoutZw.homepage_editions?.uk, { section: "features", rank: 1, active: true });
  assert.deepEqual(withoutZw.homepage, { section: "top-stories", rank: 1, active: true });
});

// ---------------------------------------------------------------------------
// 3. EDITION CURATION DERIVATION (INHERITANCE, OVERRIDE, REMOVAL)
// ---------------------------------------------------------------------------
test("HT-NR-04B: deriveEditionHomepageCurationState correctly resolves overrides and global inheritance", () => {
  const globalHero = {
    id: "00000000-0000-4000-8000-000000001001",
    title: "Global Hero Story",
    slug: "global-hero-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    distribution: {
      homepage: { section: "hero", rank: 1, active: true }
    }
  };

  const globalTop1 = {
    id: "00000000-0000-4000-8000-000000001002",
    title: "Global Top 1",
    slug: "global-top-1",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    distribution: {
      homepage: { section: "top-stories", rank: 1, active: true }
    }
  };

  const editionOverrideHero = {
    id: "00000000-0000-4000-8000-000000001003",
    title: "Zimbabwe Override Hero",
    slug: "zimbabwe-override-hero",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    distribution: {
      homepage_editions: {
        zimbabwe: { section: "hero", rank: 1, active: true }
      }
    }
  };

  const stories = [globalHero, globalTop1, editionOverrideHero];

  // Derive curation state for Zimbabwe
  const stateZw = deriveEditionHomepageCurationState(stories, "zimbabwe");

  // Hero must be overridden by edition override
  assert.ok(stateZw.hero, "Hero should be present");
  assert.equal(stateZw.hero.id, "00000000-0000-4000-8000-000000001003");
  assert.equal(stateZw.hasEditionOverride("hero", 1), true);
  assert.equal(stateZw.isSlotInherited("hero", 1), false);

  // Top Story 1 has no edition override, so it must inherit from Global
  assert.ok(stateZw.topStories[0], "Top Story rank 1 should be present");
  assert.equal(stateZw.topStories[0].id, "00000000-0000-4000-8000-000000001002");
  assert.equal(stateZw.hasEditionOverride("top-stories", 1), false);
  assert.equal(stateZw.isSlotInherited("top-stories", 1), true);

  // Deriving for South Africa (no overrides) must inherit both Hero and Top 1
  const stateSa = deriveEditionHomepageCurationState(stories, "south-africa");
  assert.equal(stateSa.hero.id, "00000000-0000-4000-8000-000000001001");
  assert.equal(stateSa.hasEditionOverride("hero", 1), false);
  assert.equal(stateSa.isSlotInherited("hero", 1), true);
  assert.equal(stateSa.topStories[0].id, "00000000-0000-4000-8000-000000001002");
  assert.equal(stateSa.hasEditionOverride("top-stories", 1), false);
  assert.equal(stateSa.isSlotInherited("top-stories", 1), true);
});

// ---------------------------------------------------------------------------
// 4. PUBLIC PRESENTATION SERVICE & ROW MAPPING
// ---------------------------------------------------------------------------
test("HT-NR-04B: mapPresentationRow converts public RPC row to ArticleSummary and placement contracts", () => {
  const row = {
    story_id: "00000000-0000-4000-8000-000000000001",
    slug: "zimbabwe-cholera-response",
    title: "Zimbabwe Expands Oral Cholera Vaccination",
    standfirst: "Over 2 million doses administered.",
    excerpt: "Health authorities reported significant drops in case fatality rates.",
    access_policy: "public",
    status: "published",
    published_at: "2026-10-16T10:00:00Z",
    modified_at: "2026-10-16T11:00:00Z",
    canonical_url: "/articles/zimbabwe-cholera-response",
    author_name: "Dr. T. Moyo",
    author_slug: "t-moyo",
    section_name: "Public Health",
    section_slug: "public-health",
    hero_public_url: "https://example.com/media/cholera.jpg",
    hero_alt_text: "Vaccination drive in Harare",
    hero_caption: "Health workers administering doses",
    hero_credit: "HealthTimes / File",
    global_placement: { section: "hero", rank: 1, active: true },
    edition_placement: null
  };

  const presentation = mapPresentationRow(row);
  assert.equal(presentation.article.id, "zimbabwe-cholera-response");
  assert.equal(presentation.article.canonicalStoryId, "00000000-0000-4000-8000-000000000001");
  assert.equal(presentation.article.title, "Zimbabwe Expands Oral Cholera Vaccination");
  assert.equal(presentation.article.accessPolicy, "public");
  assert.equal(presentation.article.author.displayName, "Dr. T. Moyo");
  assert.equal(presentation.article.primarySection.name, "Public Health");
  assert.equal(presentation.article.heroMedia.publicUrl, "https://example.com/media/cholera.jpg");
  assert.deepEqual(presentation.globalPlacement, { section: "hero", rank: 1, active: true });
  assert.equal(presentation.editionPlacement, null);
});

// ---------------------------------------------------------------------------
// 5. READER HOME PRESENTATION INTEGRATION & ZERO-CURATION INVARIANT
// ---------------------------------------------------------------------------
test("HT-NR-04B: Reader Home connects to services.presentation and preserves zero-curation invariant", () => {
  const readerHomeContent = read("app/(reader)/index.tsx");

  // Verified connection to services.presentation
  assert.match(
    readerHomeContent,
    /services\.presentation\.getPublicHomepagePresentations\(/,
    "Reader home must query public presentation service with resolvedEditionSlug"
  );

  // Raw distribution.homepage must NOT be checked
  assert.equal(
    /distribution\??\.homepage\b/.test(readerHomeContent),
    false,
    "Reader home must not inspect raw distribution.homepage directly"
  );

  // Zero-curation invariant: empty presentation falls back to natural uncurated feed
  assert.match(
    readerHomeContent,
    /const \[naturalHero, \.\.\.filteredRemainder\] = filteredStories;/,
    "Reader home must preserve uncurated natural feed fallback"
  );

  // Failure fallback: presentation error is caught and returns empty array, not crashing reader
  assert.match(
    readerHomeContent,
    /presentationState = useAsync\(async \(\) => \{\s*try \{\s*return await services\.presentation\.getPublicHomepagePresentations\(resolvedEditionSlug\);\s*\} catch \{\s*return \[\];\s*\}\s*\}, \[resolvedEditionSlug\]\);/,
    "Reader home must safely catch and fall back to [] when presentation service errors"
  );
});

// ---------------------------------------------------------------------------
// 6. READER HIERARCHY & AD SLOT PRESERVATION
// ---------------------------------------------------------------------------
test("HT-NR-04B: Reader Home preserves exact ad slot placement and layout hierarchy", () => {
  const readerHomeContent = read("app/(reader)/index.tsx");

  // Hero section exists
  const heroIndex = readerHomeContent.indexOf("<HeroStory");
  assert.ok(heroIndex > -1, "HeroStory component must be present in reader home");

  // HOSPAZ ad placement exists immediately after Hero
  const adIndex = readerHomeContent.indexOf('placement="hospaz-header-direct"');
  assert.ok(adIndex > -1, "hospaz-header-direct placement must exist in reader home");
  assert.ok(adIndex > heroIndex, "HOSPAZ ad slot must be rendered after Hero");

  // Top stories rendered after HOSPAZ
  const topStoriesIndex = readerHomeContent.indexOf('title="Top Stories"');
  assert.ok(topStoriesIndex > -1, "Top Stories section must be present in reader home");
  assert.ok(topStoriesIndex > adIndex, "Top Stories section must be rendered after HOSPAZ ad");
});

// ---------------------------------------------------------------------------
// 7. EDITION PREFERENCE SEMANTICS UNCHANGED
// ---------------------------------------------------------------------------
test("HT-NR-04B: apps/mobile/app/edition.tsx retains exact parent SHA d86d4df6aef091ae713549b4fbe4450aa0d20493", () => {
  const editionContent = read("app/edition.tsx");
  const blobSha = gitBlobSha(editionContent);

  assert.equal(
    blobSha,
    "d86d4df6aef091ae713549b4fbe4450aa0d20493",
    "apps/mobile/app/edition.tsx must remain strictly byte-identical to parent"
  );
});

// ---------------------------------------------------------------------------
// 8. NATIVE ARTICLE RESOLUTION IN MIGRATED CORPUS
// ---------------------------------------------------------------------------
test("HT-NR-04B: migrated-corpus service falls back to newsroom_public_story_document for native articles", () => {
  const corpusContent = read("src/services/migrated-corpus.ts");

  assert.match(
    corpusContent,
    /newsroom_public_story_document/,
    "resolveIdentity must query newsroom_public_story_document for articles not in migrated corpus"
  );
  assert.match(
    corpusContent,
    /presentation:\s*publicPresentationService/,
    "migratedCorpusServices must expose presentation repository"
  );
});

// ---------------------------------------------------------------------------
// 9. STUDIO HOMEPAGE SCOPE CONTROLS & COMPENSATING ROLLBACK IN EDITION SCOPE
// ---------------------------------------------------------------------------
test("HT-NR-04B: Studio Homepage renders scope controls and edition selector chips", () => {
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
    onRemovePlacement: () => {},
    presentationScope: "global",
    onScopeChange: () => {},
    selectedEditionSlug: "zimbabwe",
    onEditionSlugChange: () => {},
    deliveryConnected: true
  });

  const texts = collectTexts(viewTree);
  assert.ok(texts.includes("Global Homepage"), "Scope control must render Global tab");
  assert.ok(texts.includes("Edition Curation"), "Scope control must render Edition tab");
  assert.ok(
    texts.some((t) => t.includes("Public presentation delivery connected")),
    "Delivery connected banner must be present"
  );
});

test("HT-NR-04B: Studio Homepage displays edition override and inheritance badges", () => {
  const dummyStory = {
    id: "00000000-0000-4000-8000-000000009999",
    title: "Edition Badge Story",
    slug: "edition-badge-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 1
  };

  const editionCuration = {
    hero: dummyStory,
    topStories: [dummyStory],
    sections: {
      hero: [dummyStory],
      "top-stories": [dummyStory],
      features: [],
      "public-health": [],
      research: [],
      "health-business": [],
      "hiv-aids": [],
      "global-health": [],
      premium: [],
      "further-coverage": []
    },
    editionSlug: "zimbabwe",
    isSlotInherited: (section, rank) => section === "top-stories" && rank === 1,
    hasEditionOverride: (section, rank) => section === "hero" && rank === 1,
    editionOverridesCount: 1
  };

  const viewTree = StudioHomepageView({
    stories: [dummyStory],
    curationState: editionCuration,
    loading: false,
    error: null,
    savingId: null,
    actionMessage: null,
    conflictError: null,
    onRefresh: () => {},
    onSetHero: () => {},
    onRemoveHero: () => {},
    onAssignPlacement: () => {},
    onRemovePlacement: () => {},
    presentationScope: "edition",
    onScopeChange: () => {},
    selectedEditionSlug: "zimbabwe",
    onEditionSlugChange: () => {},
    deliveryConnected: true
  });

  const texts = collectTexts(viewTree);
  assert.ok(texts.includes("EDITION OVERRIDE"), "Must display EDITION OVERRIDE badge for overridden slots");
  assert.ok(texts.includes("INHERITED FROM GLOBAL"), "Must display INHERITED FROM GLOBAL badge for inherited slots");
});

test("HT-NR-04B: Occupied slot replacement in Edition scope executes 5-step compensating rollback on failure", async () => {
  const existingEditionStory = {
    id: "00000000-0000-4000-8000-000000003001",
    title: "Existing Edition Story",
    slug: "existing-edition-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 3,
    distribution: {
      public_reader: true,
      homepage_editions: {
        zimbabwe: { section: "top-stories", rank: 1, active: true }
      }
    }
  };

  const targetStory = {
    id: "00000000-0000-4000-8000-000000003002",
    title: "New Edition Story",
    slug: "new-edition-story",
    accessPolicy: "public",
    status: "published",
    workflowStatus: "Published",
    lockVersion: 5,
    distribution: { public_reader: true }
  };

  const calls = [];
  const harness = createHomepageHarness({
    initialStories: [existingEditionStory, targetStory],
    initialScope: "edition",
    initialEdition: "zimbabwe",
    onSaveStory: async (storyId, expectedVersion, patch, reason) => {
      calls.push({ storyId, expectedVersion, patch, reason });
      if (storyId === targetStory.id) {
        throw new Error("Target edition write failed");
      }
      return expectedVersion + 1;
    }
  });

  await harness.props.onAssignPlacement("top-stories", 1, targetStory.id);

  assert.equal(calls.length, 3, "Displacement, target attempt, and rollback must be executed");
  assert.equal(calls[0].storyId, existingEditionStory.id);
  assert.equal(calls[0].reason, "Homepage curation updated - displaced");

  assert.equal(calls[1].storyId, targetStory.id);
  assert.equal(calls[1].expectedVersion, 5);

  assert.equal(calls[2].storyId, existingEditionStory.id);
  assert.equal(calls[2].expectedVersion, 4, "Rollback must use new lockVersion from displacement step");
  assert.deepEqual(calls[2].patch.distribution, existingEditionStory.distribution);
  assert.equal(calls[2].reason, "Homepage replacement rollback");

  const state = harness.getState();
  assert.match(state.conflictError, /Displaced story was restored/);
  assert.equal(state.refreshKey, 1);
});

// ---------------------------------------------------------------------------
// 10. OWNER PREVIEW SIMULATION PARITY
// ---------------------------------------------------------------------------
test("HT-NR-04B: Owner Preview Homepage simulates edition distribution updates and displays delivery connection", () => {
  const previewSource = read("src/preview/OwnerPreviewStudio.tsx");

  assert.match(
    previewSource,
    /OwnerPreviewHomepageView/,
    "OwnerPreviewStudio must export OwnerPreviewHomepageView"
  );
  assert.match(
    previewSource,
    /deriveEditionHomepageCurationState/,
    "OwnerPreviewHomepageView must use deriveEditionHomepageCurationState when in edition mode"
  );
  assert.match(
    previewSource,
    /mergeHomepageEditionDistribution/,
    "OwnerPreviewHomepageView must simulate edition distribution updates via mergeHomepageEditionDistribution"
  );
  assert.match(
    previewSource,
    /deliveryConnected=\{true\}/,
    "OwnerPreviewHomepageView must pass deliveryConnected={true} to StudioHomepageView"
  );
});


// ---------------------------------------------------------------------------
// 11. HT-NR-04B-R1 PUBLIC PRESENTATION SAFETY CLOSURE
// ---------------------------------------------------------------------------
test("HT-NR-04B-R1: Reader Edition presentation resolution never invents an unknown slug", () => {
  const readerHomeContent = read("app/(reader)/index.tsx");

  assert.match(
    readerHomeContent,
    /const zones = taxonomy\.data\?\.geographicZones \?\? \[\];/,
    "Edition presentation resolution must use canonical taxonomy zones"
  );
  assert.match(
    readerHomeContent,
    /return match\?\.slug \?\? null;/,
    "Unknown or unavailable taxonomy Edition must fall back to Global/null"
  );
  assert.equal(
    readerHomeContent.includes('edition.toLowerCase().replace(/\\s+/g, "-")'),
    false,
    "Reader must not invent an Edition slug from preference display text"
  );
  assert.equal(
    readerHomeContent.includes("validateEditionSlug(sanitized)"),
    false,
    "Reader must not validate and accept a guessed slug"
  );
});

test("HT-NR-04B-R1: corrective RPC is non-throwing for malformed placement booleans and preserves the 19-column contract", () => {
  const originalPath = path.join(
    root,
    "../../supabase/migrations/20261016140000_ht_nr04b_public_homepage_presentations.sql"
  );
  const r1Path = path.join(
    root,
    "../../supabase/migrations/20261016150000_ht_nr04b_r1_public_presentation_safety.sql"
  );
  assert.ok(fs.existsSync(originalPath), "Original HT-NR-04B migration must remain in lineage");
  assert.ok(fs.existsSync(r1Path), "HT-NR-04B-R1 corrective migration must exist");

  const sql = fs.readFileSync(r1Path, "utf8");
  assert.equal(
    sql.includes("::boolean"),
    false,
    "Corrective public presentation RPC must not cast JSON text directly to boolean"
  );
  assert.match(
    sql,
    /lower\(coalesce\(s\.distribution->'homepage'->>'active',\s*''\)\)\s*=\s*'true'/,
    "Global placement active flag must use non-throwing truth evaluation"
  );
  assert.match(
    sql,
    /lower\(coalesce\(s\.distribution->'homepage_editions'->v_edition->>'active',\s*''\)\)\s*=\s*'true'/,
    "Edition placement active flag must use non-throwing truth evaluation"
  );
  assert.match(
    sql,
    /lower\(coalesce\(s\.distribution->>'public_reader',\s*''\)\)\s*=\s*'true'/,
    "Native Reader eligibility must also avoid unsafe JSON boolean casts"
  );

  const match = sql.match(/returns table\s*\(([\s\S]*?)\)\s*language plpgsql/i);
  assert.ok(match, "Corrective RPC must retain an explicit returns table contract");
  const columns = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/,$/, "").split(/\s+/)[0]);
  assert.equal(columns.length, 19, "Public presentation contract must remain exactly 19 columns");
  assert.deepEqual(columns, [
    "story_id", "slug", "title", "standfirst", "excerpt", "access_policy",
    "published_at", "modified_at", "canonical_url", "author_name", "author_slug",
    "section_name", "section_slug", "hero_public_url", "hero_alt_text",
    "hero_caption", "hero_credit", "global_placement", "edition_placement"
  ]);
});

test("HT-NR-04B-R1: native presentation media is public-only while legacy source fallback remains", () => {
  const r1Path = path.join(
    root,
    "../../supabase/migrations/20261016150000_ht_nr04b_r1_public_presentation_safety.sql"
  );
  const sql = fs.readFileSync(r1Path, "utf8");

  assert.match(
    sql,
    /when s\.legacy_source_id is not null then coalesce\(ma\.public_url,\s*ma\.source_url\)\s*else ma\.public_url\s*end as hero_public_url/i,
    "Legacy stories may retain public_url -> source_url media fallback"
  );
  assert.match(sql, /lower\(coalesce\(ma\.status,\s*''\)\)\s*=\s*'published'/i);
  assert.match(sql, /ma\.public_storage_bucket\s*=\s*'newsroom-public'/i);
  assert.match(sql, /ma\.public_storage_key is not null/i);
  assert.match(sql, /ma\.public_url is not null/i);
  assert.match(
    sql,
    /s\.legacy_source_id is not null\s*or\s*\(\s*lower\(coalesce\(ma\.status,\s*''\)\)\s*=\s*'published'/i,
    "Strict public-media publication gate must apply to native stories only"
  );
});

test("HT-NR-04B-R1: repository migration authority is exactly 75 at HT-NR-06C-A-R1", () => {
  const migrationsDir = path.resolve(root, "../../supabase/migrations");
  const migrationFiles = fs.readdirSync(migrationsDir);
  assert.equal(migrationFiles.length, 75);
  assert.ok(
    migrationFiles.includes("20261016140000_ht_nr04b_public_homepage_presentations.sql")
  );
  assert.ok(
    migrationFiles.includes("20261016150000_ht_nr04b_r1_public_presentation_safety.sql")
  );
  assert.ok(
    migrationFiles.includes("20261016190000_ht_nr05b_r1_story_media_integrity.sql")
  );
  assert.ok(
    migrationFiles.includes("20261016210000_ht_nr05c_video_desk_foundation.sql")
  );
  assert.ok(
    migrationFiles.includes("20261016220000_ht_nr05ca_r1_video_url_safety.sql")
  );
  assert.ok(
    migrationFiles.includes("20261016230000_ht_nr05ca_r2_video_url_port_safety.sql")
  );
});
