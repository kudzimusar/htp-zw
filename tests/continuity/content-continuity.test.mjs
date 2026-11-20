// G2G4G6-PARALLEL-CLOSE-01 Workstream A: content-continuity verifier on fixtures.
import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, verifyContinuity } from "../../scripts/continuity/content-continuity.mjs";

const NOW = "2026-11-14T12:00:00.000Z";
const record = (id, o = {}) => ({
  source: { system: "wordpress", type: "post", id: String(id), stableKey: `wordpress:post:${id}`,
    sourceUrl: `https://healthtimes.co.zw/story-${id}/`, legacyPath: `/story-${id}/` },
  story: { title: `Historical story number ${id}`, slug: `story-${id}`, authorSourceId: "4", categorySourceIds: ["1"],
    featuredMediaSourceId: `m${id}`, publishedAt: "2026-01-01T08:00:00", modifiedAt: "2026-01-01T09:00:00",
    seo: { canonical: `https://healthtimes.co.zw/story-${id}/` }, ...o }
});
const media = (id, o = {}) => ({ source: { id: `m${id}` }, media: { altText: "Alt", credit: "HealthTimes", ...o } });
const wp = (id, o = {}) => ({ postId: id, slug: `story-${id}`, title: `Historical story number ${id}`,
  publishedAt: "2026-01-01T08:00:00", modifiedAt: "2026-01-01T09:00:00", ...o });
const redirect = (id) => ({ sourcePath: `/story-${id}/`, targetPath: `/story-${id}/`, status: "preserve", sourceStableKey: `wordpress:post:${id}` });
const base = (o = {}) => ({
  capturedAt: NOW,
  wordpress: { complete: true, declaredTotals: { posts: 2, pages: 0 }, posts: [wp(1), wp(2)] },
  migrated: [record(1), record(2)],
  media: [media(1), media(2)],
  redirects: [redirect(1), redirect(2)],
  native: [],
  ...o
});
const codes = (r) => r.findings.map((f) => f.code);

test("a complete, consistent snapshot passes every static gate", () => {
  const r = verifyContinuity(base());
  assert.equal(r.severities.BLOCK, 0);
  assert.deepEqual(r.gates, { inventoryComplete: true, identityAndDuplicatesClear: true, metadataComplete: true, redirectsPreserved: true, freshness: "NOT_RUN" });
  assert.equal(r.counts[CLASSES.MIGRATED_HISTORICAL], 2);
  assert.equal(r.ready, false, "freshness must actually run before the package is ready");
});

test("inventory distinguishes historical, outdated, current-unmigrated, withdrawn and native", () => {
  const r = verifyContinuity(base({
    wordpress: { complete: true, posts: [wp(1), wp(2, { modifiedAt: "2026-11-10T00:00:00" }), wp(3, { publishedAt: "2026-11-13T00:00:00" })] },
    migrated: [record(1), record(2), record(4)], media: [media(1), media(2), media(4)],
    redirects: [redirect(1), redirect(2), redirect(4)],
    native: [{ storyId: "n1", slug: "native-one", title: "A native newsroom story today", authorName: "Desk", publishedAt: NOW, status: "published", approved: true }]
  }));
  assert.deepEqual(r.counts, { MIGRATED_HISTORICAL: 1, MIGRATED_OUTDATED: 1, CURRENT_WP_NOT_MIGRATED: 1, WITHDRAWN_AT_SOURCE: 1, NATIVE_NEWSROOM: 1 });
  assert.ok(codes(r).includes("MISSING_ARTICLE"));
  assert.ok(codes(r).includes("OUTDATED_MIGRATED_ARTICLE"));
  assert.equal(r.gates.inventoryComplete, false);
});

test("absence from a partial WordPress sample is never treated as withdrawal", () => {
  const r = verifyContinuity(base({ wordpress: { complete: false, posts: [wp(1)] } }));
  assert.equal(r.counts.WITHDRAWN_AT_SOURCE, 0);
  assert.equal(r.gates.inventoryComplete, false, "an incomplete listing cannot certify the inventory");
});

test("declared source totals expose a coverage gap even when listed items reconcile", () => {
  const r = verifyContinuity(base({ wordpress: { complete: true, declaredTotals: { posts: 5728, pages: 0 }, posts: [wp(1), wp(2)] } }));
  const gap = r.findings.find((f) => f.code === "SOURCE_COVERAGE_GAP");
  assert.equal(gap.missing, 5726);
  assert.equal(gap.severity, "BLOCK");
});

test("duplicate identities, slug collisions with native stories and canonical collisions block", () => {
  const r = verifyContinuity(base({
    migrated: [record(1), record(1), record(2, { seo: { canonical: "https://healthtimes.co.zw/story-1/" } })],
    native: [{ storyId: "n9", slug: "story-2", title: "Something else entirely here", authorName: "Desk", publishedAt: NOW }]
  }));
  for (const c of ["DUPLICATE_STABLE_KEY", "SLUG_COLLISION", "CANONICAL_COLLISION"]) assert.ok(codes(r).includes(c), c);
  assert.equal(r.gates.identityAndDuplicatesClear, false);
});

test("a WordPress story re-keyed into Newsroom is held as a duplicate suspect, never merged", () => {
  const r = verifyContinuity(base({ native: [{ storyId: "n2", slug: "different-slug", title: "Historical Story Number 1!", authorName: "Desk", publishedAt: "2026-01-02T08:00:00Z" }] }));
  const dup = r.findings.find((f) => f.code === "DUPLICATE_SUSPECT");
  assert.deepEqual(dup.ids, ["wordpress:post:1", "native:n2"]);
  assert.equal(dup.severity, "HOLD");
});

test("foreign canonical hosts block", () => {
  const r = verifyContinuity(base({ migrated: [record(1, { seo: { canonical: "https://evil.example/story-1/" } }), record(2)] }));
  assert.ok(codes(r).includes("FOREIGN_CANONICAL_URL"));
});

test("authors, categories, dates and media rights are required; rights are never inferred", () => {
  const r = verifyContinuity(base({
    migrated: [record(1, { authorSourceId: null, categorySourceIds: [], publishedAt: null }), record(2, { featuredMediaSourceId: "m404" })],
    media: [media(1, { credit: "", altText: "" })]
  }));
  for (const c of ["MISSING_AUTHOR", "MISSING_CATEGORY", "MISSING_PUBLICATION_DATE", "MEDIA_RIGHTS_UNRECORDED", "MEDIA_MISSING_ALT_TEXT", "FEATURED_MEDIA_NOT_INVENTORIED"]) {
    assert.ok(codes(r).includes(c), c);
  }
  assert.equal(r.gates.metadataComplete, false);
});

test("an explicit rights record satisfies media rights without a credit line", () => {
  const r = verifyContinuity(base({ media: [media(1, { credit: "", rights: { holder: "HealthTimes", basis: "staff" } }), media(2)] }));
  assert.equal(codes(r).includes("MEDIA_RIGHTS_UNRECORDED"), false);
});

test("every migrated legacy URL must be preserved, and no path may fall back to the homepage", () => {
  const r = verifyContinuity(base({ redirects: [redirect(1), { sourcePath: "/old-thing/", targetPath: "/", sourceStableKey: "wordpress:post:1" }] }));
  assert.ok(codes(r).includes("LEGACY_URL_NOT_PRESERVED"));
  assert.ok(codes(r).includes("HOMEPAGE_CATCHALL_REDIRECT"));
  assert.equal(r.gates.redirectsPreserved, false);
});

test("the preserved WordPress front page is not a catch-all", () => {
  const r = verifyContinuity(base({ redirects: [redirect(1), redirect(2), { sourcePath: "/", targetPath: "/", sourceStableKey: "wordpress:post:1" }] }));
  assert.equal(codes(r).includes("HOMEPAGE_CATCHALL_REDIRECT"), false);
});

test("a redirect may not point at an unmigrated source", () => {
  const r = verifyContinuity(base({ redirects: [redirect(1), redirect(2), { sourcePath: "/ghost/", targetPath: "/ghost/", sourceStableKey: "wordpress:post:999" }] }));
  assert.ok(codes(r).includes("REDIRECT_TO_UNMIGRATED_SOURCE"));
});

// ---- Freshness acceptance ---------------------------------------------------------------
const nativeStory = (o = {}) => ({ storyId: "n1", slug: "todays-story", title: "Cholera vaccination drive reaches Harare", authorName: "Desk",
  publishedAt: "2026-11-14T10:00:00Z", status: "published", approved: true, accessPolicy: "public", ...o });
const reader = (slugs, o = {}) => ({ capturedAt: NOW, truncated: false, items: slugs.map((s, i) => ({ slug: s, publishedAt: `2026-11-14T0${9 - i}:00:00Z` })), ...o });

test("freshness passes when every approved, due item older than the SLA is visible", () => {
  const r = verifyContinuity(base({ native: [nativeStory()], reader: reader(["todays-story", "story-1"]) }));
  assert.equal(r.freshness.verdict, "PASS");
  assert.equal(r.freshness.approvedDueChecked, 1);
  assert.equal(r.ready, true);
});

test("freshness fails when approved current content is missing from the Reader", () => {
  const r = verifyContinuity(base({ native: [nativeStory()], reader: reader(["story-1"]) }));
  assert.equal(r.freshness.verdict, "FAIL");
  assert.ok(codes(r).includes("APPROVED_CONTENT_NOT_IN_READER"));
  assert.equal(r.ready, false);
});

test("an approved current WordPress post classified public is also required in the Reader", () => {
  const r = verifyContinuity(base({
    wordpress: { complete: true, posts: [wp(1), wp(2), wp(3, { classifiedPublic: true, publishedAt: "2026-11-14T09:00:00" })] },
    reader: reader(["story-1"])
  }));
  const miss = r.findings.find((f) => f.code === "APPROVED_CONTENT_NOT_IN_READER");
  assert.equal(miss.lane, "wordpress");
});

test("items inside the SLA window are not yet required", () => {
  const r = verifyContinuity(base({ native: [nativeStory({ publishedAt: "2026-11-14T11:55:00Z" })], reader: reader(["story-1"]) }));
  assert.equal(r.freshness.verdict, "NOT_RUN");
  assert.equal(codes(r).includes("APPROVED_CONTENT_NOT_IN_READER"), false);
});

test("embargoed and unapproved stories visible in the Reader fail closed", () => {
  const r = verifyContinuity(base({
    native: [nativeStory(), nativeStory({ storyId: "n2", slug: "embargoed", publishedAt: "2026-11-15T00:00:00Z" }), nativeStory({ storyId: "n3", slug: "draft-one", status: "draft", approved: false })],
    reader: reader(["todays-story", "embargoed", "draft-one"])
  }));
  assert.ok(codes(r).includes("EMBARGO_LEAK"));
  assert.ok(codes(r).includes("UNAPPROVED_IN_READER"));
  assert.equal(r.freshness.verdict, "FAIL");
});

test("a truncated Reader capture only proves items inside its window", () => {
  const r = verifyContinuity(base({
    native: [nativeStory(), nativeStory({ storyId: "old", slug: "older-story", publishedAt: "2026-11-01T00:00:00Z" })],
    reader: reader(["todays-story"], { truncated: true, items: [{ slug: "todays-story", publishedAt: "2026-11-14T10:00:00Z" }] })
  }));
  assert.equal(r.freshness.verdict, "PASS");
  assert.equal(r.freshness.approvedDueChecked, 1);
});

test("missing capture time is rejected rather than defaulted", () => {
  assert.throws(() => verifyContinuity({ wordpress: {} }), /capturedAt/);
});
