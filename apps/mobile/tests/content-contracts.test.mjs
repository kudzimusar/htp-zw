import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

test("generated staging types cover NM-03 source-backed domains", () => {
  const types = read("src/generated/database.types.ts");
  for (const table of [
    "legacy_sources",
    "authors",
    "media_assets",
    "stories",
    "sections",
    "tags",
    "editorial_desks",
    "geographic_zones",
    "premium_entitlements",
    "ad_campaigns",
    "ad_creatives",
    "ad_placements"
  ]) {
    assert.match(types, new RegExp(`\\b${table}: \\{`), `generated staging types missing ${table}`);
  }
});

test("source contracts preserve AG-03 reconciliation classifications", () => {
  const source = read("src/domain/source.ts");
  for (const classification of [
    "match",
    "expected-source-drift",
    "requires-review",
    "missing-from-database",
    "database-only"
  ]) {
    assert.match(source, new RegExp(`"${classification}"`));
  }
  for (const exception of [
    "unknown-shortcode",
    "unmapped-custom-field",
    "missing-media",
    "author-unresolved",
    "taxonomy-unresolved",
    "premium-history-unresolved",
    "commerce-history-unresolved"
  ]) {
    assert.match(source, new RegExp(`"${exception}"`));
  }
});

test("AG-03 readiness stays blocked until authoritative private source evidence exists", () => {
  const source = read("src/domain/source.ts");
  assert.match(source, /status: "blocked"/);
  assert.match(source, /authoritativeDatabaseValidated: false/);
  assert.match(source, /completeUploadsValidated: false/);
  assert.match(source, /contentFrozen: false/);
  assert.doesNotMatch(source, /5721|5800|5728|3269|10256/, "historical discovery counts must not be encoded as current app truth");
});

test("global taxonomy model is not Zimbabwe-only", () => {
  const taxonomy = read("src/services/taxonomy.ts");
  for (const desk of [
    "Global Health",
    "Africa",
    "Research",
    "Policy",
    "Investigations",
    "Public Health",
    "Health Systems",
    "Health Business"
  ]) {
    assert.match(taxonomy, new RegExp(desk.replace(/[&/]/g, "\\$&")));
  }
  for (const geography of [
    "Global",
    "Africa",
    "Southern Africa",
    "East Africa",
    "West Africa",
    "Central Africa",
    "North Africa",
    "Zimbabwe"
  ]) {
    assert.match(taxonomy, new RegExp(geography));
  }
  assert.match(taxonomy, /level: "global"/);
  assert.match(taxonomy, /level: "continent"/);
  assert.match(taxonomy, /level: "region"/);
  assert.match(taxonomy, /level: "country"/);
  assert.match(taxonomy, /isoCountryCode/);
});

test("Reader uses taxonomy service rather than hardcoded edition arrays", () => {
  const explore = read("app/(reader)/explore.tsx");
  const edition = read("app/edition.tsx");
  assert.match(explore, /services\.taxonomy\.getSnapshot/);
  assert.match(edition, /services\.taxonomy\.getSnapshot/);
  assert.doesNotMatch(edition, /const editions=\[/);
  assert.doesNotMatch(explore, /const browseGroups=\[/);
});

test("typed mappers cover article, author, media, geography, provenance and Premium context", () => {
  const mapper = read("src/domain/mappers.ts");
  for (const fn of [
    "mapAuthorRow",
    "mapMediaRow",
    "mapSectionRow",
    "mapTagRow",
    "mapLegacyTagRow",
    "mapGeographicZoneRow",
    "mapSourceProvenance",
    "mapStoryRow"
  ]) {
    assert.match(mapper, new RegExp(`function ${fn}\\b`));
  }
  assert.match(mapper, /premiumSourceContext/);
  assert.match(mapper, /legacyMembershipSignal/);
  assert.match(mapper, /sourceProvenance/);
  assert.match(mapper, /taxonomyResolution/);
  assert.match(mapper, /geographyResolution/);
});

test("taxonomy authority separates observed WordPress, approved canonical, and inferred review states", () => {
  const models = read("src/domain/models.ts");
  const authority = read("src/domain/taxonomy-authority.ts");
  const sourceParity = read("src/services/source-parity.ts");
  for (const state of ["observedWordPress", "approvedCanonical", "inferredRequiresReview"]) {
    assert.match(models, new RegExp(state));
  }
  assert.match(authority, /approvedLegacyDeskAliases/);
  assert.match(authority, /approvedCanonicalSectionForLegacy/);
  assert.match(sourceParity, /observedWordPress:legacy/);
  assert.match(sourceParity, /approvedCanonical:primarySection/);
  assert.doesNotMatch(authority, /return AG01_CANONICAL_DESKS\["public-health"\]/);
});

test("Source Parity and AG-04 mapper share one canonical geography projection", () => {
  const authority = read("src/domain/taxonomy-authority.ts");
  const sourceParity = read("src/services/source-parity.ts");
  const mapper = read("src/domain/mappers.ts");
  assert.match(authority, /function normalizeCanonicalGeography/);
  assert.match(authority, /geography: projectCanonicalGeography\(refs\)/);
  assert.match(sourceParity, /normalizeCanonicalGeography\(geographyResolution\.canonicalApproved\)/);
  assert.match(mapper, /normalizeCanonicalGeography\(geographyRefs\)/);
  assert.match(mapper, /canonicalApproved: geographyRefs/);
  assert.match(sourceParity, /inferredRequiresReview:inferredGeographyEvidence\(post\)/);
});

test("AG-04 mapped provenance preserves WordPress reconciliation identities and exceptions", () => {
  const mapper = read("src/domain/mappers.ts");
  for (const field of [
    "authorSourceId",
    "featuredMediaSourceId",
    "categorySourceIds",
    "tagSourceIds",
    "legacyPath"
  ]) {
    assert.match(mapper, new RegExp(field));
  }
  assert.match(mapper, /exceptionsFromLegacySource/);
  assert.match(mapper, /unknown-shortcode/);
  assert.match(mapper, /unmapped-custom-field/);
  assert.match(mapper, /migrationExceptions/);
});

test("repository implementations expose the same Reader-facing semantic contract", () => {
  const sourceParity = read("src/services/source-parity.ts");
  const mapper = read("src/domain/mappers.ts");
  const semantics = [
    ["identity", /id:/, /id: row\.id/],
    ["title", /title:/, /title: row\.title/],
    ["author", /author:/, /author: relations\.author/],
    ["canonical URL", /canonicalUrl/, /canonicalUrl: row\.canonical_url/],
    ["publication date", /publishedAt/, /publishedAt: row\.published_at/],
    ["modified date", /modifiedAt/, /modifiedAt: row\.modified_at/],
    ["access policy", /accessPolicy/, /accessPolicy,/],
    ["media", /heroMedia:/, /heroMedia: relations\.heroMedia/],
    ["taxonomy", /taxonomyResolution/, /taxonomyResolution/],
    ["geography", /geographyResolution/, /geographyResolution/],
    ["source provenance", /sourceProvenance:/, /sourceProvenance,/],
    ["migration exceptions", /mappingExceptions/, /migrationExceptions/]
  ];
  for (const [label, sourcePattern, stagingPattern] of semantics) {
    assert.match(sourceParity, sourcePattern, `Source Parity missing ${label}`);
    assert.match(mapper, stagingPattern, `AG-04 mapper missing ${label}`);
  }
});

