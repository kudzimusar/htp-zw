// Source-key anchored plan for WordPress posts against public.stories. Pure data:
// it never connects to a database and never emits SQL. Applying a plan is a
// separate step held for Owner authorization (scripts/editorial/sql/).
//
// Usage: node sync-incremental-dryrun.mjs --ledger ledger.json [--classification c.json] [--output plan.json]
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { classificationIndex, isClassifiedPublic, stableKeyForPost } from "./public-manifest.mjs";
import { probePublicPublisher } from "./public-source-readonly-probe.mjs";

// Retried on a later run, so the watermark must not move past them. Premium and
// newsroom-edited stories are excluded: those are settled by people, not by sync.
const RETRY_DECISIONS = new Set([
  "HOLD_PENDING_CLASSIFICATION","HOLD_SLUG_CHANGED","BLOCK_SLUG_COLLISION","BLOCK_LEDGER_ORPHAN_SOURCE"
]);

function decide(post, source, slugOwner, classifiedPublic) {
  if (source) {
    if (!source.storyId) return "BLOCK_LEDGER_ORPHAN_SOURCE";
    if (source.storySlug !== post.slug) return "HOLD_SLUG_CHANGED";
    if (source.storyAccessPolicy !== "public") return "HOLD_PREMIUM_REVIEW";
    if (source.storyLockVersion > 1 || source.nativeRevisionCount > 0) return "HOLD_NATIVE_EDIT_CONFLICT";
    if (Date.parse(post.modifiedAt) <= Date.parse(source.storyModifiedAt)) return "NOOP_UNCHANGED";
    return classifiedPublic ? "UPDATE_CANDIDATE" : "HOLD_PENDING_CLASSIFICATION";
  }
  if (slugOwner) return "BLOCK_SLUG_COLLISION";
  return classifiedPublic ? "INSERT_CANDIDATE" : "HOLD_PENDING_CLASSIFICATION";
}

function candidateFor(decision, post, source) {
  const candidate = {
    decision,
    stableKey: stableKeyForPost(post.postId),
    sourceId: String(post.postId),
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? null,
    bodyHtml: post.contentBody,
    accessPolicy: "public",
    status: "published",
    publishedAt: post.publishedAt,
    modifiedAt: post.modifiedAt,
    canonicalUrl: post.canonicalUrl,
    legacyPath: new URL(post.canonicalUrl).pathname,
    authorSourceId: post.authorSourceId ?? null,
    primaryCategorySourceId: post.categoryIds?.[0] === undefined ? null : String(post.categoryIds[0]),
    checksum: createHash("sha256").update(JSON.stringify([post.title, post.contentBody, post.modifiedAt])).digest("hex")
  };
  if (decision === "UPDATE_CANDIDATE") {
    candidate.expected = { storyId: source.storyId, lockVersion: source.storyLockVersion, modifiedAt: source.storyModifiedAt };
  }
  return candidate;
}

function sealPlan(plan, capturedAt) {
  const counts = {};
  for (const { decision } of plan.decisions) counts[decision] = (counts[decision] ?? 0) + 1;
  const planSha256 = createHash("sha256")
    .update(JSON.stringify({ capturedAt, decisions: plan.decisions, candidates: plan.candidates }))
    .digest("hex");
  return { ...plan, counts, planSha256 };
}

// Turns "absent from the window" into an action only after a direct check of that post.
export function confirmWithdrawals(plan, ledger, results) {
  const sources = new Map(ledger.sources.map((row) => [row.stableKey, row]));
  const candidates = [...plan.candidates];
  const decisions = plan.decisions.map((item) => {
    if (item.decision !== "REVIEW_SOURCE_MISSING") return item;
    const result = results.get(item.stableKey);
    if (result === "still-published") return { ...item, decision: "NOOP_STILL_PUBLISHED" };
    if (result !== "withdrawn") return item;
    const row = sources.get(item.stableKey);
    if (!row?.storyId) return { ...item, decision: "BLOCK_LEDGER_ORPHAN_SOURCE" };
    if (row.storyLockVersion > 1 || row.nativeRevisionCount > 0) return { ...item, decision: "HOLD_NATIVE_EDIT_CONFLICT" };
    candidates.push({
      decision: "UNPUBLISH_CANDIDATE",
      stableKey: item.stableKey,
      expected: { storyId: row.storyId, lockVersion: row.storyLockVersion, modifiedAt: row.storyModifiedAt }
    });
    return { ...item, decision: "UNPUBLISH_CANDIDATE" };
  });
  return sealPlan({ ...plan, decisions, candidates }, plan.ledgerCapturedAt);
}

export function planIncrementalSync(posts, ledger, classification, options = {}) {
  if (!ledger?.capturedAt || !Array.isArray(ledger.sources) || !Array.isArray(ledger.slugOwners)) {
    throw new Error("LEDGER_REQUIRED");
  }
  const records = classificationIndex(classification);
  const sourcesByKey = new Map(ledger.sources.map((row) => [row.stableKey, row]));
  const slugOwners = new Map(ledger.slugOwners.map((row) => [row.slug, row]));
  const decisions = [];
  const candidates = [];
  const retryTimes = [];

  for (const post of posts) {
    const stableKey = stableKeyForPost(post.postId);
    const source = sourcesByKey.get(stableKey);
    const decision = decide(post, source, slugOwners.get(post.slug), isClassifiedPublic(post, records));
    decisions.push({ decision, stableKey, slug: post.slug, sourceModifiedAt: post.modifiedAt });
    if (decision === "INSERT_CANDIDATE" || decision === "UPDATE_CANDIDATE") candidates.push(candidateFor(decision, post, source));
    if (RETRY_DECISIONS.has(decision)) retryTimes.push(post.modifiedAt);
  }

  // Absence only means something inside a window known to be complete.
  let unpublishDetection = "NOT_EVALUATED_INCOMPLETE_WINDOW";
  if (options.windowComplete && options.windowStartAt) {
    unpublishDetection = "EVALUATED";
    const windowStart = Date.parse(options.windowStartAt);
    const retrieved = new Set((options.retrievedPostIds ?? posts.map((post) => post.postId)).map(stableKeyForPost));
    for (const row of ledger.sources) {
      if (Date.parse(row.storyPublishedAt) >= windowStart && !retrieved.has(row.stableKey)) {
        decisions.push({ decision: "REVIEW_SOURCE_MISSING", stableKey: row.stableKey, slug: row.storySlug ?? null });
      }
    }
  }

  return sealPlan({
    engine: "healthtimes-source-key-sync-plan-v2",
    ledgerCapturedAt: ledger.capturedAt,
    stagingDatabaseWriteStatus: "HELD_PENDING_OWNER_AUTHORIZATION",
    unpublishDetection,
    nextWatermark: [...retryTimes].sort()[0] ?? options.latestModifiedRetrievedAt ?? null,
    decisions,
    candidates
  }, ledger.capturedAt);
}

async function main(argv) {
  const argument = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : null; };
  const readJson = async (path) => (path ? JSON.parse(await readFile(path, "utf8")) : null);
  const ledger = await readJson(argument("--ledger"));
  const classification = await readJson(argument("--classification"));
  // A one-second overlap re-reads the boundary post; unchanged posts are no-ops.
  const since = ledger?.watermark ? new Date(Date.parse(ledger.watermark) - 1000).toISOString() : null;
  const probe = await probePublicPublisher({ includeBody: Boolean(classification), since });
  if (!probe.candidates) {
    console.error(JSON.stringify({ status: "SYNC_PLAN_BLOCKED", reason: probe.status }));
    process.exit(2);
  }
  const oldest = probe.candidates.map((post) => post.publishedAt).sort()[0];
  const plan = planIncrementalSync(probe.candidates, ledger, classification, {
    // Only a newest-first date window says anything about unpublished posts.
    windowComplete: !since,
    windowStartAt: oldest,
    retrievedPostIds: probe.retrievedPostIds,
    latestModifiedRetrievedAt: probe.latestModifiedRetrievedAt
  });
  const output = argument("--output");
  if (output) await writeFile(output, JSON.stringify(plan, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ planSha256: plan.planSha256, counts: plan.counts, nextWatermark: plan.nextWatermark, unpublishDetection: plan.unpublishDetection, stagingDatabaseWriteStatus: plan.stagingDatabaseWriteStatus }, null, 2));
}

if (process.argv[1]?.endsWith("sync-incremental-dryrun.mjs")) {
  await main(process.argv.slice(2));
}
