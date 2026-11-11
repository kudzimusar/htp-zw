// Decides Premium status from canonical WordPress evidence. The migration's original
// rule searched all postmeta for "member", which also matches the Classic Editor's
// `classic-editor-remember` key and SEO text, so a match is not evidence of restriction.
import { stableKeyForPost } from "./public-manifest.mjs";

const RESTRICTED_TERM = /(?:^|[\s-])(?:premium|members?-only|subscription|restricted)(?:$|[\s-])/i;
const OTHER_MEMBERSHIP_META = /^_?(?:rcp_|pmpro_|mepr_|is_paid$)/i;
const SUREMEMBERS_TARGET = /^post-(\d+)-\|$/;

const isSet = (value) => !["", "0", "false", "no"].includes(String(value ?? "").trim().toLowerCase());

// Reduces membership configuration to what can be evaluated per post. Anything too
// broad or unrecognized marks the rules indeterminate rather than permissive.
export function normalizeMembershipRules({ suremembersGroups = [], wcRules = [] }) {
  const rules = { restrictedObjectIds: new Set(), restrictedTermIds: new Set(), indeterminate: false };
  for (const group of suremembersGroups) {
    if (group.includeRules.some((rule) => rule !== "specifics")) rules.indeterminate = true;
    for (const target of group.specifics) {
      const match = SUREMEMBERS_TARGET.exec(target);
      if (match) rules.restrictedObjectIds.add(Number(match[1]));
      else rules.indeterminate = true;
    }
  }
  for (const rule of wcRules) {
    if (rule.ruleType !== "content_restriction") continue;
    if (rule.contentType === "taxonomy") {
      for (const id of rule.objectIds) rules.restrictedTermIds.add(Number(id));
    } else if (rule.objectIds.length) {
      for (const id of rule.objectIds) rules.restrictedObjectIds.add(Number(id));
    } else if (rule.contentTypeName === "post") {
      rules.indeterminate = true;
    }
  }
  return rules;
}

function leakyPaywallVisibility(value) {
  return /"visibility_type";s:\d+:"(\w+)"/.exec(String(value ?? ""))?.[1] ?? null;
}

export function classifyFromCanonicalEvidence(evidence, rules) {
  if (!evidence || !rules) return { accessPolicy: "unknown", signals: ["no-canonical-evidence"] };
  if (rules.indeterminate) return { accessPolicy: "unknown", signals: ["indeterminate-membership-rules"] };
  const { postId, meta = {}, terms = [], passwordProtected = false } = evidence;

  const restricted = [];
  if (passwordProtected) restricted.push("password-protected");
  if (terms.some((term) => RESTRICTED_TERM.test(`${term.name} ${term.slug}`))) restricted.push("restricted-term");
  if (terms.some((term) => rules.restrictedTermIds.has(Number(term.termTaxonomyId)))) restricted.push("membership-rule-term");
  if (rules.restrictedObjectIds.has(Number(postId))) restricted.push("membership-rule-object");
  if (isSet(meta._jetpack_memberships_contains_paid_content)) restricted.push("jetpack-paid-content");
  const newsletter = String(meta._jetpack_newsletter_access ?? "").trim().toLowerCase();
  if (newsletter && newsletter !== "everybody") restricted.push("jetpack-restricted-newsletter");
  if (restricted.length) return { accessPolicy: "premium", signals: restricted };

  const unresolved = [];
  if ("_issuem_leaky_paywall_visibility" in meta && leakyPaywallVisibility(meta._issuem_leaky_paywall_visibility) !== "default") {
    unresolved.push("legacy-paywall-setting");
  }
  if (Object.keys(meta).some((key) => OTHER_MEMBERSHIP_META.test(key))) unresolved.push("other-membership-plugin-meta");
  return unresolved.length ? { accessPolicy: "unknown", signals: unresolved } : { accessPolicy: "public", signals: [] };
}

// Evidence for the Publisher/Owner to decide on. It carries no authority, so
// classificationIndex rejects it until someone with that role signs a ledger.
export function buildProposedLedger({ snapshot, rules, posts }) {
  const counts = { public: 0, premium: 0, unknown: 0 };
  const records = posts.map((post) => {
    const { accessPolicy, signals } = classifyFromCanonicalEvidence(post, rules);
    counts[accessPolicy] += 1;
    return {
      stableKey: stableKeyForPost(post.postId),
      proposedAccessPolicy: accessPolicy,
      sourceModifiedAt: post.sourceModifiedAt,
      evidence: { kind: "wordpress-postmeta", snapshot: snapshot.database, snapshotSha256: snapshot.sha256, signals }
    };
  });
  return { schemaVersion: 1, status: "PROPOSED_PENDING_PUBLISHER_OWNER_DECISION", authority: null, snapshot, counts, records };
}
