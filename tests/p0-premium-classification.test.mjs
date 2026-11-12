import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProposedLedger,
  classifyFromCanonicalEvidence,
  normalizeMembershipRules
} from "../scripts/editorial/premium-classification.mjs";
import { classificationIndex } from "../scripts/editorial/public-manifest.mjs";

const RULES = normalizeMembershipRules({
  suremembersGroups: [{ includeRules: ["specifics"], specifics: ["post-32220-|"] }],
  wcRules: [
    { ruleType: "content_restriction", contentType: "post_type", contentTypeName: "page", objectIds: [32312] },
    { ruleType: "product_restriction", contentType: "taxonomy", contentTypeName: "product_cat", objectIds: [10221] }
  ]
});
const evidence = (overrides = {}) => ({ postId: 500, meta: {}, terms: [], passwordProtected: false, ...overrides });
const policy = (overrides, rules = RULES) => classifyFromCanonicalEvidence(evidence(overrides), rules).accessPolicy;

test("a post with no restriction signal is public", () => {
  assert.equal(policy({}), "public");
});

for (const [label, meta] of Object.entries({
  "the Classic Editor preference key": { "classic-editor-remember": "classic-editor" },
  "a WooCommerce default set to no": { _wc_memberships_force_public: "no", _wc_memberships_use_custom_post_content_restricted_message: "no" },
  "an empty WooCommerce message": { _wc_memberships_post_content_restricted_message: "" },
  "an empty Jetpack paid flag": { _jetpack_memberships_contains_paid_content: "" },
  "SEO text mentioning members": { rank_math_description: "Members of Parliament debated premium health insurance." }
})) {
  test("not treated as a restriction: " + label, () => {
    assert.equal(policy({ meta }), "public");
  });
}

test("Jetpack paid content is Premium", () => {
  assert.equal(policy({ meta: { _jetpack_memberships_contains_paid_content: "1" } }), "premium");
});

test("restricted Jetpack newsletter access is Premium", () => {
  assert.equal(policy({ meta: { _jetpack_newsletter_access: "paid_subscribers" } }), "premium");
  assert.equal(policy({ meta: { _jetpack_newsletter_access: "everybody" } }), "public");
});

test("a restricted taxonomy term is Premium", () => {
  assert.equal(policy({ terms: [{ taxonomy: "category", name: "HealthTimes Premium", slug: "premium", termTaxonomyId: 7 }] }), "premium");
});

test("a password-protected post is Premium", () => {
  assert.equal(policy({ passwordProtected: true }), "premium");
});

test("a post named by an access group is Premium", () => {
  assert.equal(policy({ postId: 32220 }), "premium");
});

test("a post named by a WooCommerce rule is Premium", () => {
  assert.equal(policy({ postId: 32312 }), "premium");
});

test("a term named by a WooCommerce rule is Premium", () => {
  const rules = normalizeMembershipRules({ suremembersGroups: [], wcRules: [{ ruleType: "content_restriction", contentType: "taxonomy", contentTypeName: "category", objectIds: [7] }] });
  assert.equal(policy({ terms: [{ taxonomy: "category", name: "News", slug: "news", termTaxonomyId: 7 }] }, rules), "premium");
});

test("a product rule says nothing about articles", () => {
  const rules = normalizeMembershipRules({ suremembersGroups: [], wcRules: [{ ruleType: "product_restriction", contentType: "taxonomy", contentTypeName: "category", objectIds: [7] }] });
  assert.equal(policy({ terms: [{ taxonomy: "category", name: "News", slug: "news", termTaxonomyId: 7 }] }, rules), "public");
});

for (const [label, input] of Object.entries({
  "a site-wide access group": { suremembersGroups: [{ includeRules: ["basic-singulars"], specifics: [] }], wcRules: [] },
  "an access group on all posts": { suremembersGroups: [{ includeRules: ["post|all"], specifics: [] }], wcRules: [] },
  "a WooCommerce rule on all posts": { suremembersGroups: [], wcRules: [{ ruleType: "content_restriction", contentType: "post_type", contentTypeName: "post", objectIds: [] }] },
  "an access-group target it cannot read": { suremembersGroups: [{ includeRules: ["specifics"], specifics: ["mystery-99"] }], wcRules: [] }
})) {
  test("unknown when rules are too broad to evaluate: " + label, () => {
    assert.equal(policy({}, normalizeMembershipRules(input)), "unknown");
  });
}

test("another membership plugin's key is unknown, not public", () => {
  assert.equal(policy({ meta: { rcp_subscription_level: "2" } }), "unknown");
  assert.equal(policy({ meta: { _pmpro_required: "1" } }), "unknown");
});

test("a legacy paywall setting needs a human decision", () => {
  const visibility = (type) => ({ _issuem_leaky_paywall_visibility: `a:1:{s:15:"visibility_type";s:${type.length}:"${type}";}` });
  assert.equal(policy({ meta: visibility("default") }), "public");
  for (const type of ["only", "always", "onlyalways"]) assert.equal(policy({ meta: visibility(type) }), "unknown");
  assert.equal(policy({ meta: { _issuem_leaky_paywall_visibility: "unreadable" } }), "unknown");
});

test("missing evidence or rules is unknown", () => {
  assert.equal(classifyFromCanonicalEvidence(null, RULES).accessPolicy, "unknown");
  assert.equal(classifyFromCanonicalEvidence(evidence(), null).accessPolicy, "unknown");
});

const ledger = () => buildProposedLedger({
  snapshot: { database: "healthtimesco_wp551", sha256: "a".repeat(64), capturedAt: "2026-09-21T00:00:00.000Z" },
  rules: RULES,
  posts: [
    { ...evidence({ postId: 1, meta: { "classic-editor-remember": "classic-editor" } }), sourceModifiedAt: "2026-09-01T00:00:00.000Z" },
    { ...evidence({ postId: 2, meta: { _jetpack_memberships_contains_paid_content: "1" } }), sourceModifiedAt: "2026-09-01T00:00:00.000Z" },
    { ...evidence({ postId: 3, meta: { rcp_subscription_level: "2" } }), sourceModifiedAt: "2026-09-01T00:00:00.000Z" }
  ]
});

test("a proposed ledger records evidence per canonical source key", () => {
  const { records, counts } = ledger();
  assert.equal(records[0].stableKey, "wordpress:post:1");
  assert.equal(records[0].proposedAccessPolicy, "public");
  assert.equal(records[0].evidence.kind, "wordpress-postmeta");
  assert.equal(records[0].evidence.snapshot, "healthtimesco_wp551");
  assert.equal(records[1].proposedAccessPolicy, "premium");
  assert.deepEqual(records[1].evidence.signals, ["jetpack-paid-content"]);
  assert.equal(records[2].proposedAccessPolicy, "unknown");
  assert.deepEqual(counts, { public: 1, premium: 1, unknown: 1 });
});

test("a proposed ledger has no authority and cannot publish anything", () => {
  const proposed = ledger();
  assert.equal(proposed.status, "PROPOSED_PENDING_PUBLISHER_OWNER_DECISION");
  assert.equal(proposed.authority, null);
  assert.throws(() => classificationIndex(proposed), /INVALID_CLASSIFICATION/);
});
