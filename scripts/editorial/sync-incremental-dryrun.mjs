// HT-MVP-OWNER-UAT-P0-RECOVERY-01-R2 — Incremental Sync Dry-Run Engine.
// Evaluates continuous publisher synchronization from WordPress REST API into the
// canonical HealthTimes stories table schema.
//
// ZERO-WRITE SAFETY: This script operates strictly in isolated dry-run mode.
// It never executes DDL/DML against the staging database (bzuvntbkevvuhfhqhkua)
// without explicit Owner operational authorization.

import { probePublicPublisher } from "./public-source-readonly-probe.mjs";
import { createHash } from "node:crypto";

export const STAGING_CORPUS_BASELINE = {
  projectRef: "bzuvntbkevvuhfhqhkua",
  totalMigratedStories: 5792,
  latestCorpusTipAt: "2026-10-31T23:59:19.000Z"
};

export function planIncrementalSync(posts, baseline = STAGING_CORPUS_BASELINE) {
  const tipMs = Date.parse(baseline.latestCorpusTipAt);
  const candidates = [];

  for (const post of posts) {
    if (!post || !post.publishedAt) continue;
    const publishedMs = Date.parse(post.publishedAt);
    if (!Number.isFinite(publishedMs)) continue;

    // Only posts newer than the existing staging corpus tip
    if (publishedMs > tipMs) {
      const sectionSlug = (post.categoryIds ?? []).includes(21) ? "features" : "health-news";
      candidates.push({
        externalId: post.postId,
        slug: post.slug,
        title: post.title,
        standfirst: post.excerpt ?? null,
        contentHtml: post.contentBody ?? null,
        accessPolicy: "free",
        status: "published",
        publishedAt: post.publishedAt,
        modifiedAt: post.modifiedAt ?? post.publishedAt,
        canonicalUrl: post.canonicalUrl,
        primarySectionSlug: sectionSlug,
        heroMedia: post.heroMedia ?? null,
        authorName: post.authorName ?? "HealthTimes Reporter",
        sourceProvenance: {
          system: "wordpress",
          sourceId: String(post.postId),
          canonicalUrl: post.canonicalUrl,
          capturedAt: new Date().toISOString()
        },
        lockVersion: 1
      });
    }
  }

  // Sort descending by publication date
  candidates.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  // Generate idempotent SQL migration plan for separate Owner authorization
  const sqlStatements = candidates.map((c) => {
    const esc = (val) => (val == null ? "NULL" : `'${String(val).replace(/'/g, "''")}'`);
    const provJson = JSON.stringify(c.sourceProvenance).replace(/'/g, "''");
    return `INSERT INTO public.stories (
  slug, title, standfirst, content_html, access_policy, status,
  published_at, updated_at, canonical_url, lock_version, source_provenance
) VALUES (
  ${esc(c.slug)}, ${esc(c.title)}, ${esc(c.standfirst)}, ${esc(c.contentHtml)},
  ${esc(c.accessPolicy)}, ${esc(c.status)}, ${esc(c.publishedAt)}, ${esc(c.modifiedAt)},
  ${esc(c.canonicalUrl)}, ${c.lockVersion}, '${provJson}'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  standfirst = EXCLUDED.standfirst,
  content_html = EXCLUDED.content_html,
  updated_at = EXCLUDED.updated_at,
  lock_version = public.stories.lock_version + 1;`;
  });

  const planHash = createHash("sha256")
    .update(JSON.stringify(candidates))
    .digest("hex");

  return {
    engine: "healthtimes-incremental-sync-dryrun-v1",
    targetDatabase: baseline.projectRef,
    baselineTipAt: baseline.latestCorpusTipAt,
    candidatesIdentified: candidates.length,
    newestCandidateAt: candidates[0]?.publishedAt ?? null,
    planSha256: planHash,
    stagingDatabaseWriteStatus: "HELD_PENDING_OWNER_AUTHORIZATION",
    candidates,
    sqlStatements
  };
}

export async function runIncrementalSyncDryRun(options = {}) {
  const probe = await probePublicPublisher({ includeBody: true, ...options });
  if (probe.status !== "PROBE_SUCCEEDED_NOT_AUTHORIZED_AS_FEED") {
    return {
      status: "SYNC_DRY_RUN_FAILED",
      reason: probe.status,
      probe
    };
  }
  const plan = planIncrementalSync(probe.latestTwentyMetadata);
  return {
    status: "SYNC_DRY_RUN_SUCCESS",
    generatedAt: new Date().toISOString(),
    ...plan
  };
}

if (process.argv[1] && process.argv[1].endsWith("sync-incremental-dryrun.mjs")) {
  runIncrementalSyncDryRun()
    .then((result) => {
      console.log(JSON.stringify({
        status: result.status,
        targetDatabase: result.targetDatabase,
        baselineTipAt: result.baselineTipAt,
        candidatesIdentified: result.candidatesIdentified,
        newestCandidateAt: result.newestCandidateAt,
        planSha256: result.planSha256,
        stagingDatabaseWriteStatus: result.stagingDatabaseWriteStatus,
        sampleCandidate: result.candidates?.[0] ? {
          externalId: result.candidates[0].externalId,
          slug: result.candidates[0].slug,
          title: result.candidates[0].title,
          publishedAt: result.candidates[0].publishedAt,
          bodyLength: result.candidates[0].contentHtml?.length,
          hasHeroMedia: Boolean(result.candidates[0].heroMedia?.sourceUrl)
        } : null
      }, null, 2));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
