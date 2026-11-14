# Workstream A: Newsroom content continuity

**Status:** prepared on 2026-11-14 on local branch `local/g2g4g6-parallel-close-01` (base `4fa9768`). Nothing was imported, published or written to staging.
**Audience:** the G2/G3 specialist who runs the transition after staging recovery, the Publisher and the Editor-in-Chief.

## 1. What the transition must achieve

Readers must see one continuous HealthTimes:
- the historical WordPress corpus (already imported into staging: **5,741 stories**, per the IMP-01-R3-R1 matrix);
- WordPress posts published since that import;
- native Newsroom OS stories from cut-over onward.

Nothing may be duplicated, lost, re-pointed or exposed before approval.

This package adds a verification layer on top of the accepted P0 machinery. It does not replace that machinery.

| Already accepted (reuse, do not rebuild) | Where |
|---|---|
| Stable identity `wordpress:post:<id>` | `scripts/editorial/public-manifest.mjs` |
| Read-only WordPress probe (published, classified, canonical-host checks) | `scripts/editorial/public-source-readonly-probe.mjs` |
| Source-key-anchored sync planner (insert, update, hold or block; never overwrites native edits; never claims a slug owned by another story) | `scripts/editorial/sync-incremental-dryrun.mjs` |
| Held source-sync writer | `scripts/editorial/sql/source-sync-writer.sql`, tested in `tests/database/source-sync-writer.test.mjs` |
| URL resolver (direct mapping → unique-slug 301 → explicit 404; never the homepage) | `ag05_resolve_public_path` |
| Media archive (2,318 files) | Cloudflare `healthtimes-media`. Unchanged; do not rebuild |

## 2. New tools in this package

| Tool | Purpose |
|---|---|
| `scripts/continuity/content-continuity.mjs` | Pure verifier. It takes one JSON snapshot and returns: <br>• an inventory in five classes;<br>• identity, slug, canonical-URL and duplicate-suspect checks;<br>• author, category, date, image, alt-text and media-rights checks;<br>• legacy redirect preservation;<br>• the freshness gate.<br>Exit code 1 if any BLOCK finding. |
| `scripts/continuity/snapshot-from-migration-output.mjs` | Builds a snapshot from a `migration-output/` directory (offline) |
| `scripts/continuity/capture-reader-snapshot.mjs` | Read-only, anonymous capture of what the Reader can see. It refuses a service-role key. |
| `tests/continuity/content-continuity.test.mjs` | 19 fixture tests |
| `tests/continuity/legacy-url-preservation.test.mjs` | 8 tests that drive the real `api/public.js` handler through all 149 pilot legacy URLs |
| `tests/account/…`, `tests/database/account-deletion-operator.test.mjs` | Workstream B |

### Inventory classes

| Class | Meaning | Action |
|---|---|---|
| `MIGRATED_HISTORICAL` | In WordPress and migrated, unchanged since | None |
| `MIGRATED_OUTDATED` | WordPress has a newer revision than Newsroom | HOLD: the sync planner decides. A native edit always wins (`HOLD_NATIVE_EDIT_CONFLICT`). |
| `CURRENT_WP_NOT_MIGRATED` | Live in WordPress, absent from Newsroom | BLOCK until synced or deliberately excluded |
| `WITHDRAWN_AT_SOURCE` | Migrated, but no longer published in WordPress | REVIEW. Only a **complete** WordPress listing can prove this; a partial sample never does. |
| `NATIVE_NEWSROOM` | Authored in Newsroom OS | None |

A **duplicate suspect** is the same headline (normalised) published within 72 hours under a different identity, for example a WordPress story re-keyed into Newsroom by hand. It is HOLD and never auto-merged. An editor decides.

**Media rights are never inferred.** An image passes only with a credit line or an explicit rights record.

## 3. Evidence on real data (offline)

Run on the committed `migration-output/`, a pilot of 100 posts and 49 pages captured on 2026-09-16. Report: `evidence/A-pilot-manifest-continuity-report.json`.

| Check | Result |
|---|---|
| Identity, slugs, canonical URLs, duplicates | **Clear.** 149 unique stable keys, no collisions. |
| Legacy URLs | **Preserved.** All 149 paths covered, no catch-all. Through the real edge handler, all 148 non-root paths return 200 `story`. |
| Pages | 49/49 |
| Posts | 100 of 5,728 declared. This measures the pilot manifest, not staging (which holds 5,741 stories). It shows that `migration-output` must never be used as the reconciliation source. |
| Media rights | **81 of 100** posts have a featured image with no credit or rights record (HOLD) |
| Featured image not inventoried | 17 posts reference media absent from the media manifest (HOLD) |
| Missing alt text | 27 (REVIEW) |

**Gap A-1 (rights).** Rights for most historical featured images are unrecorded. The Publisher must decide the basis: staff photography, agency licence, or remove the image (decision D-07).

**Gap A-2 (real reconciliation).** The full reconciliation against staging needs:
- a ledger capture from staging (`scripts/editorial/source-sync-ledger-query.mjs`);
- a complete WordPress listing.

Both are blocked while staging returns HTTP 402.

**Gap A-3 (shortlinks).** WordPress shortlinks `/?p=<id>` arrive at `/` and land on the Reader home. They appear as the post GUID in old RSS items and share links. No route maps them. A test pins this gap, so adding a route will flag the test for update.

Proposed fix, for the G5 web owner after G3/G5 certification: a `vercel.json` redirect with `has: [{type:"query",key:"p"}]` to `/api/public?kind=resolve-id&p=:p`, backed by a lookup on `legacy_sources.source_id`. This is not implemented here, because `vercel.json` belongs to the active candidate.

## 4. Dry-run import and verification procedure

Run this only after the G2 backup-and-restore proof and an authorized staging recovery. Every step through 5 is read-only or disposable.

1. **Content freeze starts (section 6).** Record the freeze time T0.
2. **Capture the source.** Run the read-only probe for posts published or modified since the last ledger watermark. Use `probePublicPublisher({ since })`; it calls only the public REST API.
3. **Capture the ledger.** Run the read-only ledger query (`source-sync-ledger-query.mjs`) with a read-only database role.
4. **Plan.** Run `node scripts/editorial/sync-incremental-dryrun.mjs --ledger ledger.json --classification classification.json --output plan.json`. Review every non-`NOOP` decision. `BLOCK_*` and `HOLD_*` decisions go to the Editor.
5. **Rehearse on disposable infrastructure.**
   - Replay the canonical schema into a fresh local Postgres 16 cluster, as `tests/database/support/canonical-schema.mjs` does.
   - Load the ledger fixture and apply `plan.json` through the held writer.
   - Run `content-continuity.mjs` on the post-apply snapshot. Required: **0 BLOCK**, and `identityAndDuplicatesClear` and `redirectsPreserved` both true.
6. **Apply to staging.** This is a separately authorized step, by the G2/G3 owner holding the writer authority. Apply the same `plan.json`, byte-identical (record its SHA-256).
7. **Verify.**
   - Recapture the ledger and the Reader (`capture-reader-snapshot.mjs`).
   - Build a snapshot with `wordpress.complete=true` and the `native` section (query below).
   - Run `content-continuity.mjs` and archive the report.

Read-only query for the `native` section. Run it as a read-only role. It returns no bodies and no personal data.

```sql
select jsonb_agg(jsonb_build_object(
  'storyId', st.id, 'slug', st.slug, 'title', st.title,
  'publishedAt', st.published_at, 'status', lower(st.status),
  'approved', lower(st.status) in ('publish','published'),
  'accessPolicy', st.access_policy, 'authorName', au.display_name))
from public.stories st
left join public.authors au on au.id = st.author_id
where st.legacy_source_id is null;
```

Check the column names against the current schema before use. `authors`/`author_id` follow the AG-05 feed function.

## 5. Freshness acceptance test

**Pass condition.** Every approved story must be visible in the Reader if it is:
- public or Premium (Premium appears as a teaser);
- published at or before the Reader capture time;
- published more than **15 minutes** (the P0 sync SLA) before capture.

Also:
- nothing embargoed (future `published_at`) or unapproved may be visible;
- if the Reader list was truncated at 200 items, only items inside its window count.

**Outcomes.**
- `PASS`: as above.
- `FAIL`: names each missing, embargoed or unapproved story.
- `NOT_RUN`: nothing was old enough to judge. The package is never "ready" without a real PASS.

**Run it in two lanes:**
1. **Native lane.** The Publisher publishes one clearly labelled approved story in the agreed acceptance window. Capture the Reader 20 minutes later.
2. **WordPress lane.** After a sync cycle, the newest classified-public WordPress post must be present.

## 6. Content freeze and editorial rollback

**Freeze** (requires the Owner/Publisher decision D-02).
- Announce the freeze window to WordPress authors. In WordPress, demote author accounts to Contributor, so they cannot publish.
- Editors may still correct published posts. Each correction is captured by the next probe (as `UPDATE_CANDIDATE`) unless the Newsroom copy was edited natively.
- The freeze ends only when the step-7 report shows 0 BLOCK and the freshness gate passes.

**Cut-over.** From cut-over time T1, publish only in Newsroom OS. WordPress becomes read-only. Do not delete it: it is the source of record for historical identity.

**Rollback**, in increasing order of cost:
1. **One bad story.** The Editor unpublishes it in Newsroom; its URL then resolves to the explicit 404.
2. **A bad sync batch.** Every writer-created row carries its source key and plan hash. Unpublish exactly those story IDs. Rows are never deleted, so identities and redirects stay stable.
3. **Whole cut-over.** Re-enable WordPress publishing and point the public domain back at WordPress. That domain decision belongs to G5 and the Owner (decision D-02).

A rollback never deletes legacy mappings. Redirects must survive every rollback.
