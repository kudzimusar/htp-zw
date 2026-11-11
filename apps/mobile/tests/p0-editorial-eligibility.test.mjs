import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

const { readerEligibility, isSuspectedTestStory } = loadTs("src/reader/editorial-eligibility.ts");
const PAST = "2026-11-01T00:00:00.000Z";
const FUTURE = "2099-01-01T00:00:00.000Z";
const now = Date.parse("2026-11-11T00:00:00.000Z");
const wordpress = (overrides = {}) => ({ sourceSystem: "wordpress", sourceType: "post", stableKey: "wordpress:post:33185", status: "published", accessPolicy: "public", publishedAt: PAST, ...overrides });
const native = (overrides = {}) => ({ sourceSystem: null, sourceType: null, stableKey: null, status: "publish", accessPolicy: "public", publishedAt: PAST, workflowStatus: "Published", publicReaderReleased: true, approvedByStaff: true, title: "Genuine newsroom report", slug: "genuine-newsroom-report", ...overrides });
const decide = (record) => readerEligibility(record, now);

test("a canonical WordPress post is listed with its body", () => {
  assert.deepEqual(decide(wordpress()), { lane: "wordpress-post", listed: true, bodyAllowed: true });
});

test("a WordPress post needs the canonical source key", () => {
  assert.equal(decide(wordpress({ stableKey: "wordpress:post:abc" })).listed, false);
  assert.equal(decide(wordpress({ stableKey: null })).listed, false);
});

for (const policy of ["premium", "premium_marker_review"]) {
  test("a " + policy + " post is listed but its body stays protected", () => {
    assert.deepEqual(decide(wordpress({ accessPolicy: policy })), { lane: "wordpress-post", listed: true, bodyAllowed: false });
  });
}

for (const policy of ["free", "", null, "PUBLIC-ish"]) {
  test("unresolved policy " + JSON.stringify(policy) + " never exposes a body", () => {
    assert.equal(decide(wordpress({ accessPolicy: policy })).bodyAllowed, false);
  });
}

test("a WordPress page is never news", () => {
  for (const title of ["Login", "Checkout", "About us"]) {
    assert.deepEqual(decide(wordpress({ sourceType: "page", stableKey: "wordpress:page:9", title })), { lane: "excluded-page", listed: false, bodyAllowed: false });
  }
});

test("other imported record types are not news", () => {
  assert.equal(decide(wordpress({ sourceType: "attachment" })).listed, false);
  assert.equal(decide(wordpress({ sourceSystem: "joomla" })).listed, false);
});

test("an approved native story is listed although it has no legacy source", () => {
  assert.deepEqual(decide(native()), { lane: "native-newsroom", listed: true, bodyAllowed: true });
});

test("a corrected native story stays listed", () => {
  assert.equal(decide(native({ workflowStatus: "Updated / Corrected" })).listed, true);
});

test("a native Premium story is listed without its body", () => {
  assert.deepEqual(decide(native({ accessPolicy: "premium" })), { lane: "native-newsroom", listed: true, bodyAllowed: false });
});

for (const [label, overrides] of Object.entries({
  "no public-reader release": { publicReaderReleased: false },
  "no recorded staff approval": { approvedByStaff: false },
  "a draft workflow state": { workflowStatus: "Editor review" },
  "a draft status": { status: "draft" }
})) {
  test("a native story with " + label + " is excluded", () => {
    assert.deepEqual(decide(native(overrides)), { lane: "excluded-unreleased", listed: false, bodyAllowed: false });
  });
}

test("explicit test classification excludes any record", () => {
  assert.deepEqual(decide(native({ testClassification: "test" })), { lane: "excluded-test", listed: false, bodyAllowed: false });
  assert.equal(decide(wordpress({ testClassification: "test" })).listed, false);
});

for (const [title, slug] of [["[UAT04B] Test Story 001", "story"], ["[TEST] Publication check", "x"], ["Fine title", "uat-story-1"], ["Fine title", "uat04b-test-story-001"], ["Fine title", "test-story-9"], ["Fine title", "fixture-001"]]) {
  test("a suspected test story is excluded: " + title + " / " + slug, () => {
    assert.equal(decide(native({ title, slug })).lane, "excluded-test");
  });
}

test("the Publisher can clear a false suspicion explicitly", () => {
  assert.equal(decide(native({ title: "[TEST] of the new HIV drug", testClassification: "production" })).lane, "native-newsroom");
});

for (const slug of ["test-kits-reach-rural-clinics", "testing-times-for-clinics", "fixtures-of-the-health-week", "uatu-health-forum"]) {
  test("real slugs are not mistaken for test stories: " + slug, () => {
    assert.equal(isSuspectedTestStory({ title: "Ordinary headline", slug }), false);
  });
}

for (const title of ["New HIV test rollout in Harare", "Testing times for Zimbabwe's clinics", "Malaria test kits arrive", "UAT results at the University of Agriculture"]) {
  test("ordinary headlines are not mistaken for test stories: " + title, () => {
    assert.equal(isSuspectedTestStory({ title, slug: "ordinary-slug" }), false);
  });
}

test("a future publication is not yet listed", () => {
  assert.equal(decide(wordpress({ publishedAt: FUTURE })).listed, false);
  assert.equal(decide(native({ publishedAt: FUTURE })).listed, false);
});

test("an unpublished WordPress post is not listed", () => {
  assert.equal(decide(wordpress({ status: "draft" })).listed, false);
});
