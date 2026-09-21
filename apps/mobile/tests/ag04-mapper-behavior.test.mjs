import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

function loadTsModule(relativePath) {
  const absolutePath = join(root, relativePath);
  return loadAbsoluteTsModule(absolutePath);
}

function loadAbsoluteTsModule(absolutePath) {
  const normalized = extname(absolutePath) ? absolutePath : absolutePath + ".ts";
  if (moduleCache.has(normalized)) return moduleCache.get(normalized).exports;

  const source = readFileSync(normalized, "utf8");
  const output = ts.transpileModule(source, {
    fileName: normalized,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true
    }
  }).outputText;

  const module = { exports: {} };
  moduleCache.set(normalized, module);
  const localRequire = (specifier) => {
    if (specifier.startsWith(".")) {
      return loadAbsoluteTsModule(join(dirname(normalized), specifier));
    }
    return require(specifier);
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const {
  mapAG04ReaderProjection,
  mapStoryRow
} = loadTsModule("src/domain/mappers.ts");

const {
  CURRENT_AG04_READER_REPOSITORY_READINESS,
  evaluateAG04ReaderRepositoryReadiness
} = loadTsModule("src/domain/ag04-conformance.ts");

const story = (overrides = {}) => ({
  access_policy: "public",
  author_id: "author-1",
  body_html: "<p>Public body</p>",
  body_json: null,
  canonical_url: "https://healthtimes.co.zw/example/",
  created_at: "2026-09-01T00:00:00Z",
  excerpt: "Excerpt",
  id: "story-1",
  legacy_source_id: "legacy-post-1",
  modified_at: "2026-09-02T00:00:00Z",
  primary_section_id: "section-1",
  published_at: "2026-09-01T00:00:00Z",
  scheduled_at: null,
  seo_description: null,
  seo_title: null,
  slug: "example",
  standfirst: "Standfirst",
  status: "published",
  title: "Example",
  updated_at: "2026-09-02T00:00:00Z",
  ...overrides
});

const author = (overrides = {}) => ({
  bio: null,
  created_at: "2026-09-01T00:00:00Z",
  display_name: "Reporter",
  id: "author-1",
  slug: "reporter",
  wordpress_source_id: "77",
  ...overrides
});

const section = (overrides = {}) => ({
  created_at: "2026-09-01T00:00:00Z",
  id: "section-1",
  name: "Public Health",
  parent_id: null,
  slug: "public-health",
  wordpress_source_id: null,
  ...overrides
});

const zone = (overrides = {}) => ({
  code: "ZW",
  created_at: "2026-09-01T00:00:00Z",
  id: "zone-zimbabwe",
  name: "Zimbabwe",
  parent_zone_id: "zone-southern-africa",
  slug: "zimbabwe",
  ...overrides
});

const media = (overrides = {}) => ({
  alt_text: "Hospital",
  caption: "Caption",
  checksum: "media-checksum",
  created_at: "2026-09-01T00:00:00Z",
  credit: "HealthTimes",
  filename: "hospital.jpg",
  height: 800,
  id: "media-1",
  legacy_source_id: "legacy-media-1",
  mime_type: "image/jpeg",
  public_url: "https://cdn.example/hospital.jpg",
  source_url: "https://healthtimes.co.zw/wp-content/uploads/hospital.jpg",
  status: "ready",
  storage_bucket: "migrated-media",
  storage_key: "hospital.jpg",
  width: 1200,
  ...overrides
});

const legacySource = (overrides = {}) => ({
  checksum: "post-checksum",
  first_seen_at: "2026-09-01T00:00:00Z",
  id: "legacy-post-1",
  last_seen_at: "2026-09-02T00:00:00Z",
  raw: {
    source: {
      type: "post",
      legacyPath: "/example/"
    },
    story: {
      authorSourceId: "77",
      categorySourceIds: ["10"],
      tagSourceIds: ["20"],
      featuredMediaSourceId: "88"
    },
    exceptions: []
  },
  site_url: "https://healthtimes.co.zw",
  source_id: "33085",
  source_type: "post",
  source_url: "https://healthtimes.co.zw/example/",
  stable_key: "wordpress:post:33085",
  system: "wordpress",
  ...overrides
});

const legacyTag = {
  id: "wordpress-term-20",
  name: "HIV/AIDS",
  slug: "hiv-aids",
  authority: "observed-source",
  sourceSystem: "wordpress",
  sourceId: "20",
  sourceKind: "post_tag"
};

test("canonical-approved section becomes Reader primarySection", () => {
  const result = mapStoryRow(story(), {
    primarySection: section(),
    primarySectionAuthority: "canonical-approved"
  });
  assert.deepEqual(result.primarySection, {
    id: "section-1",
    name: "Public Health",
    slug: "public-health"
  });
  assert.deepEqual(result.taxonomyResolution.approvedCanonical, [result.primarySection]);
});

test("observed WordPress section remains legacy taxonomy", () => {
  const result = mapStoryRow(story(), {
    primarySection: section({ wordpress_source_id: "10", name: "Health News", slug: "health-news" }),
    primarySectionAuthority: "observed-source"
  });
  assert.equal(result.primarySection, null);
  assert.equal(result.legacyTaxonomy.length, 1);
  assert.equal(result.legacyTaxonomy[0].sourceId, "10");
  assert.equal(result.legacyTaxonomy[0].sourceKind, "category");
  assert.deepEqual(result.taxonomyResolution.approvedCanonical, []);
});

test("inferred section remains review-only", () => {
  const candidate = section({ id: "candidate-section", name: "Health Financing", slug: "health-financing" });
  const result = mapStoryRow(story(), {
    primarySection: candidate,
    primarySectionAuthority: "inferred-requires-review"
  });
  assert.equal(result.primarySection, null);
  assert.deepEqual(result.taxonomyResolution.inferredRequiresReview, [{
    id: "candidate-section",
    name: "Health Financing",
    slug: "health-financing"
  }]);
});

test("canonical topics are exposed while inferred topics remain review-only", () => {
  const canonical = [{ id: "topic-policy", name: "Policy", slug: "policy" }];
  const approved = mapStoryRow(story(), {
    topics: canonical,
    topicsAuthority: "canonical-approved"
  });
  assert.deepEqual(approved.topics, canonical);
  assert.deepEqual(approved.taxonomyResolution.approvedCanonical, canonical);

  const inferred = mapStoryRow(story(), {
    topics: canonical,
    topicsAuthority: "inferred-requires-review"
  });
  assert.deepEqual(inferred.topics, []);
  assert.deepEqual(inferred.taxonomyResolution.inferredRequiresReview, canonical);
});

test("observed legacy tags retain WordPress identity", () => {
  const result = mapStoryRow(story(), { legacyTaxonomy: [legacyTag] });
  assert.deepEqual(result.legacyTaxonomy, [legacyTag]);
  assert.deepEqual(result.taxonomyResolution.observedWordPress, [legacyTag]);
});

test("canonical geography requires explicit canonical-approved authority", () => {
  const result = mapStoryRow(story(), {
    geography: [zone()],
    geographyAuthority: "canonical-approved"
  });
  assert.equal(result.geographyRefs.length, 1);
  assert.equal(result.geographyRefs[0].slug, "zimbabwe");
  assert.deepEqual(result.geography, [{
    id: "zone-zimbabwe",
    name: "Zimbabwe",
    slug: "zimbabwe"
  }]);
  assert.equal(result.geographyResolution.canonicalApproved.length, 1);
  assert.deepEqual(result.geographyResolution.observedSource, []);
  assert.deepEqual(result.geographyResolution.inferredRequiresReview, []);
});

test("observed geography remains evidence and cannot become canonical", () => {
  const result = mapStoryRow(story(), {
    geography: [zone()],
    geographyAuthority: "observed-source"
  });
  assert.deepEqual(result.geography, []);
  assert.deepEqual(result.geographyRefs, []);
  assert.deepEqual(result.geographyResolution.canonicalApproved, []);
  assert.equal(result.geographyResolution.observedSource.length, 1);
  assert.equal(result.geographyResolution.observedSource[0].authority, "observed-source");
  assert.equal(result.geographyResolution.observedSource[0].evidence, "ag04-repository");
});

test("inferred or authority-less geography remains review-only", () => {
  for (const relations of [
    { geography: [zone()], geographyAuthority: "inferred-requires-review" },
    { geography: [zone()] }
  ]) {
    const result = mapStoryRow(story(), relations);
    assert.deepEqual(result.geography, []);
    assert.deepEqual(result.geographyRefs, []);
    assert.equal(result.geographyResolution.inferredRequiresReview.length, 1);
    assert.equal(
      result.geographyResolution.inferredRequiresReview[0].authority,
      "inferred-requires-review"
    );
  }
});

test("resolved author maps provenance while unresolved author stays null", () => {
  const resolved = mapStoryRow(story(), { author: author() });
  assert.equal(resolved.author.displayName, "Reporter");
  assert.equal(resolved.author.sourceProvenance.wordpress.authorId, "77");

  const unresolved = mapStoryRow(story(), {});
  assert.equal(unresolved.author, null);
});

test("resolved media uses legacy-source provenance", () => {
  const mediaSource = legacySource({
    id: "legacy-media-1",
    source_id: "88",
    source_type: "media",
    stable_key: "wordpress:media:88",
    source_url: "https://healthtimes.co.zw/wp-content/uploads/hospital.jpg",
    raw: {}
  });
  const result = mapStoryRow(story(), {
    heroMedia: media(),
    heroMediaLegacySource: mediaSource
  });
  assert.equal(result.heroMedia.sourceProvenance.stableKey, "wordpress:media:88");
  assert.equal(result.heroMedia.sourceProvenance.sourceId, "88");
});

test("media missing its legacy-source relation is explicitly review-only", () => {
  const result = mapStoryRow(story(), { heroMedia: media() });
  assert.equal(result.heroMedia.sourceProvenance.stableKey, null);
  assert.equal(result.heroMedia.sourceProvenance.exceptions.length, 1);
  assert.equal(
    result.heroMedia.sourceProvenance.exceptions[0].classification,
    "requires-review"
  );
});

test("public body maps while Premium body is fail-closed", () => {
  const publicArticle = mapStoryRow(story(), {});
  assert.equal(publicArticle.accessPolicy, "public");
  assert.equal(publicArticle.bodyHtml, "<p>Public body</p>");

  const premiumArticle = mapStoryRow(story({
    access_policy: "premium",
    body_html: "<p>Protected body</p>"
  }), {
    premiumSourceContext: {
      legacyMembershipSignal: "wordpress-premium",
      providerReferencePresent: true,
      reconciliation: "match"
    }
  });
  assert.equal(premiumArticle.accessPolicy, "premium");
  assert.equal(premiumArticle.bodyHtml, null);
  assert.deepEqual(premiumArticle.premiumSourceContext, {
    accessPolicy: "premium",
    legacyMembershipSignal: "wordpress-premium",
    providerReferencePresent: true,
    reconciliation: "match"
  });
});

test("unknown access policy fails closed as Premium", () => {
  const result = mapStoryRow(story({
    access_policy: "migration-unknown",
    body_html: "<p>Must not leak</p>"
  }), {});
  assert.equal(result.accessPolicy, "premium");
  assert.equal(result.bodyHtml, null);
});

test("unknown shortcode and migration exceptions survive provenance mapping", () => {
  const source = legacySource({
    raw: {
      source: { type: "post", legacyPath: "/example/" },
      story: {},
      exceptions: [
        { type: "shortcode", detail: { raw: "[gallery ids=\"1,2\"]" } }
      ]
    }
  });
  const result = mapStoryRow(story(), {
    legacySource: source,
    migrationExceptions: [{
      kind: "missing-media",
      classification: "requires-review",
      field: "heroMedia",
      note: "Representative migration exception"
    }]
  });
  assert.equal(result.sourceProvenance.exceptions.length, 2);
  assert.equal(result.sourceProvenance.exceptions[0].kind, "unknown-shortcode");
  assert.equal(result.sourceProvenance.exceptions[1].kind, "missing-media");
  assert.equal(result.contentIntegrity, "requires-review");
});

test("stable WordPress post identity survives AG-04 projection", () => {
  const result = mapAG04ReaderProjection({
    story: story(),
    legacySource: legacySource()
  });
  assert.equal(result.sourceProvenance.sourceId, "33085");
  assert.equal(result.sourceProvenance.stableKey, "wordpress:post:33085");
  assert.equal(result.sourceProvenance.wordpress.postId, "33085");
  assert.equal(result.sourceProvenance.wordpress.authorId, "77");
  assert.deepEqual(result.sourceProvenance.wordpress.categoryIds, ["10"]);
  assert.deepEqual(result.sourceProvenance.wordpress.tagIds, ["20"]);
  assert.equal(result.sourceProvenance.wordpress.featuredMediaId, "88");
});

test("current AG-04 repository readiness is truthfully blocked", () => {
  assert.equal(CURRENT_AG04_READER_REPOSITORY_READINESS.ready, false);
  assert.equal(CURRENT_AG04_READER_REPOSITORY_READINESS.status, "blocked");
  const codes = new Set(CURRENT_AG04_READER_REPOSITORY_READINESS.blockers.map((item) => item.code));
  for (const required of [
    "ag03-source-package-not-accepted",
    "ag04-rehearsal-import-not-certified",
    "story-geography-relation-not-certified",
    "reader-safe-public-read-policy-not-certified",
    "stable-wordpress-provenance-not-certified",
    "premium-body-boundary-not-certified"
  ]) assert.ok(codes.has(required), required);
});

test("readiness becomes READY only with complete certified evidence and zero unexplained loss", () => {
  const readyEvidence = {
    ag03AuthoritativeSourcePackageAccepted: true,
    rehearsalImportCertified: true,
    postPageReconciliationComplete: true,
    authorsReconciled: true,
    taxonomyReconciled: true,
    mediaReconciled: true,
    exceptionsLedgerCertified: true,
    canonicalStoryFieldsCertified: true,
    premiumMarkersReconciled: true,
    internalLinksReconciled: true,
    idempotentImportCertified: true,
    stableWordPressProvenanceCertified: true,
    storyGeographyRelationCertified: true,
    readerSafePublicReadPolicyCertified: true,
    premiumBodyAccessBoundaryCertified: true,
    readerProjectionConformanceCertified: true,
    unexplainedContentLossCount: 0,
    unexplainedMediaLossCount: 0,
    unexplainedBrokenInternalLinkCount: 0
  };
  const ready = evaluateAG04ReaderRepositoryReadiness(readyEvidence);
  assert.equal(ready.ready, true);
  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.blockers, []);

  const lostMedia = evaluateAG04ReaderRepositoryReadiness({
    ...readyEvidence,
    unexplainedMediaLossCount: 1
  });
  assert.equal(lostMedia.ready, false);
  assert.ok(lostMedia.blockers.some((item) => item.code === "unexplained-media-loss"));
});
