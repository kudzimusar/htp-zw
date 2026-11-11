// Proves the held WordPress source-sync writer against the canonical schema on a
// disposable local Postgres. Refuses any non-loopback target.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { buildLedgerQuery } from "../../scripts/editorial/source-sync-ledger-query.mjs";
import { confirmWithdrawals, planIncrementalSync } from "../../scripts/editorial/sync-incremental-dryrun.mjs";
import { runSyncCycle } from "../../scripts/editorial/sync-cycle.mjs";
import { ROOT, disposableDatabase } from "./support/canonical-schema.mjs";

const db = disposableDatabase("ht_source_sync_test");
const { sql, failure } = db;
const WRITER = join(ROOT, "scripts/editorial/sql/source-sync-writer.sql");
const apply = (plan) => JSON.parse(sql("select public.ht_source_sync_apply(:'plan'::jsonb, :'actor');", { plan: JSON.stringify(plan), actor: "disposable-test" }));
const rollback = (runId) => JSON.parse(sql("select public.ht_source_sync_rollback(:'run'::uuid, :'actor');", { run: runId, actor: "disposable-test" }));

const T1 = "2026-10-01T00:00:00.000Z";
const T2 = "2026-11-05T00:00:00.000Z";
const id = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sid = (n) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, "0")}`;
const post = (postId, slug, modifiedAt, overrides = {}) => ({
  postId, slug, title: `Title ${slug}`, canonicalUrl: `https://healthtimes.co.zw/${slug}/`,
  publishedAt: T1, modifiedAt, contentBody: `<p>New body ${slug}</p>`, excerpt: `Excerpt ${slug}`,
  categoryIds: [1], authorSourceId: "4", ...overrides
});
const POSTS = [
  post(1001, "unchanged-story", T1),
  post(1002, "modified-story", T2),
  post(1003, "premium-story", T2),
  post(1004, "edited-story", T2),
  post(1005, "native-collision", T2),
  post(1006, "brand-new-story", T2),
  post(1007, "unclassified-story", T2)
];
const classification = {
  schemaVersion: 1,
  authority: { role: "Publisher/Owner", decidedBy: "Disposable test fixture", decidedAt: T2, basis: "Golden fixture" },
  records: POSTS.filter((p) => p.postId !== 1007).map((p) => ({ stableKey: `wordpress:post:${p.postId}`, accessPolicy: "public", sourceModifiedAt: p.modifiedAt, evidence: { kind: "publisher-owner-decision", reference: "fixture" } }))
};
const ledger = () => JSON.parse(sql(buildLedgerQuery(POSTS)));
const freshPlan = () => planIncrementalSync(POSTS, ledger(), classification);
const SNAPSHOT = `select md5(string_agg(x, '|' order by x)) from (
  select 'st:'||s::text x from public.stories s
  union all select 'ls:'||l::text from public.legacy_sources l
  union all select 'um:'||u::text from public.legacy_url_mappings u
  union all select 'seo:'||m::text from public.seo_metadata m) t;`;
const snapshot = () => sql(SNAPSHOT);
const row = (slug) => JSON.parse(sql(`select to_jsonb(s) from public.stories s where slug='${slug}';`) || "null");

test("canonical schema replays and the writer installs", () => {
  db.createCanonical();
  db.applyFile(WRITER);
  assert.equal(sql("select count(*) from pg_proc where proname in ('ht_source_sync_apply','ht_source_sync_rollback');"), "2");
});

test("golden rows are seeded", () => {
  sql(`
    insert into public.legacy_sources (id,system,site_url,source_type,source_id,stable_key,source_url,checksum,raw) values
      ('${sid(1)}','wordpress','https://healthtimes.co.zw','post','1001','wordpress:post:1001','https://healthtimes.co.zw/unchanged-story/','c1','{}'),
      ('${sid(2)}','wordpress','https://healthtimes.co.zw','post','1002','wordpress:post:1002','https://healthtimes.co.zw/modified-story/','c2','{}'),
      ('${sid(3)}','wordpress','https://healthtimes.co.zw','post','1003','wordpress:post:1003','https://healthtimes.co.zw/premium-story/','c3','{}'),
      ('${sid(4)}','wordpress','https://healthtimes.co.zw','post','1004','wordpress:post:1004','https://healthtimes.co.zw/edited-story/','c4','{}');
    insert into public.stories (id,legacy_source_id,title,slug,excerpt,body_html,status,access_policy,published_at,modified_at,canonical_url,lock_version,workflow_status,distribution) values
      ('${id(1)}','${sid(1)}','Old unchanged','unchanged-story','e','<p>old 1</p>','published','public','${T1}','${T1}','https://healthtimes.co.zw/unchanged-story/',1,'Published','{"public_reader":true}'),
      ('${id(2)}','${sid(2)}','Old modified','modified-story','e','<p>old 2</p>','published','public','${T1}','${T1}','https://healthtimes.co.zw/modified-story/',1,'Published','{"public_reader":true}'),
      ('${id(3)}','${sid(3)}','Old premium','premium-story','e','<p>secret premium body</p>','published','premium_marker_review','${T1}','${T1}','https://healthtimes.co.zw/premium-story/',1,'Published','{}'),
      ('${id(4)}','${sid(4)}','Newsroom edit','edited-story','e','<p>editor wrote this</p>','published','public','${T1}','${T1}','https://healthtimes.co.zw/edited-story/',2,'Published','{}');
    insert into public.stories (id,title,slug,body_html,status,access_policy,published_at) values
      ('${id(5)}','Native story','native-collision','<p>native body</p>','published','public','${T1}');
  `);
  assert.equal(sql("select count(*) from public.stories;"), "5");
});

test("the ledger query runs in a read-only transaction", () => {
  const output = sql(`begin transaction read only; ${buildLedgerQuery(POSTS)} commit;`);
  assert.equal(JSON.parse(output).schemaVersion, 1);
});

test("real ledger data drives every decision", () => {
  const byKey = Object.fromEntries(freshPlan().decisions.map((item) => [item.stableKey, item.decision]));
  assert.deepEqual(byKey, {
    "wordpress:post:1001": "NOOP_UNCHANGED",
    "wordpress:post:1002": "UPDATE_CANDIDATE",
    "wordpress:post:1003": "HOLD_PREMIUM_REVIEW",
    "wordpress:post:1004": "HOLD_NATIVE_EDIT_CONFLICT",
    "wordpress:post:1005": "BLOCK_SLUG_COLLISION",
    "wordpress:post:1006": "INSERT_CANDIDATE",
    "wordpress:post:1007": "HOLD_PENDING_CLASSIFICATION"
  });
});

test("a forged non-public candidate is rejected and nothing persists", () => {
  const before = snapshot();
  const plan = freshPlan();
  plan.planSha256 = "1".repeat(64);
  plan.candidates = plan.candidates.map((c) => c.decision === "INSERT_CANDIDATE" ? { ...c, accessPolicy: "free" } : c);
  assert.match(failure(() => apply(plan)), /SYNC_NON_PUBLIC_CANDIDATE/);
  assert.equal(snapshot(), before);
});

test("a concurrent newsroom edit aborts the whole plan", () => {
  const plan = freshPlan();
  plan.planSha256 = "2".repeat(64);
  sql(`update public.stories set lock_version = lock_version + 1 where id='${id(2)}';`);
  const before = snapshot();
  assert.match(failure(() => apply(plan)), /SYNC_STALE_STORY/);
  assert.equal(snapshot(), before, "the valid insert in the same plan must not survive");
  sql(`update public.stories set lock_version = lock_version - 1 where id='${id(2)}';`);
});

test("a slug claimed between plan and apply fails closed", () => {
  const plan = freshPlan();
  plan.planSha256 = "3".repeat(64);
  sql(`insert into public.stories (id,title,slug,status,access_policy) values ('${id(9)}','Race','brand-new-story','draft','public');`);
  const before = snapshot();
  assert.match(failure(() => apply(plan)), /SYNC_SLUG_COLLISION/);
  assert.equal(snapshot(), before);
  sql(`delete from public.stories where id='${id(9)}';`);
});

let applied;
let preApply;

test("a valid plan applies atomically and reports its counts", () => {
  preApply = snapshot();
  applied = apply(freshPlan());
  assert.equal(applied.inserted, 1);
  assert.equal(applied.updated, 1);
  assert.match(applied.runId, /^[0-9a-f-]{36}$/);
});

test("an inserted story is anchored to its source and uses the canonical policy", () => {
  const story = row("brand-new-story");
  assert.equal(story.access_policy, "public");
  assert.equal(story.status, "published");
  assert.equal(story.body_html, "<p>New body brand-new-story</p>");
  assert.equal(sql(`select ls.stable_key from public.legacy_sources ls where ls.id='${story.legacy_source_id}';`), "wordpress:post:1006");
});

test("the inserted story is served by the real Reader feed with its body", () => {
  const feed = JSON.parse(sql("select public.ag05_public_feed_documents(50);"));
  const entry = feed.find((item) => item.source_id === "1006");
  assert.ok(entry);
  assert.equal(entry.access_policy, "public");
  assert.equal(entry.body_html, "<p>New body brand-new-story</p>");
});

test("an update changes source fields only", () => {
  const story = row("modified-story");
  assert.equal(story.title, "Title modified-story");
  assert.equal(story.body_html, "<p>New body modified-story</p>");
  assert.equal(story.access_policy, "public");
  assert.equal(story.status, "published");
  assert.equal(story.workflow_status, "Published");
  assert.equal(story.lock_version, 1);
  assert.deepEqual(story.distribution, { public_reader: true });
  assert.equal(new Date(story.published_at).toISOString(), T1);
  assert.equal(new Date(story.modified_at).toISOString(), T2);
});

test("Premium, newsroom-edited and native stories are untouched", () => {
  const premium = row("premium-story");
  assert.equal(premium.access_policy, "premium_marker_review");
  assert.equal(premium.body_html, "<p>secret premium body</p>");
  assert.equal(row("edited-story").body_html, "<p>editor wrote this</p>");
  assert.equal(row("native-collision").body_html, "<p>native body</p>");
  assert.equal(row("native-collision").legacy_source_id, null);
});

test("Premium bodies stay withheld by the Reader feed", () => {
  const feed = JSON.parse(sql("select public.ag05_public_feed_documents(50);"));
  const entry = feed.find((item) => item.source_id === "1003");
  assert.ok(entry);
  assert.equal(entry.body_html, null);
});

test("each change is audited with its prior state", () => {
  assert.equal(sql(`select count(*) from public.source_sync_row_audit where run_id='${applied.runId}';`), "2");
  const before = JSON.parse(sql(`select before_story from public.source_sync_row_audit where run_id='${applied.runId}' and action='update';`));
  assert.equal(before.body_html, "<p>old 2</p>");
});

test("the same plan cannot be applied twice", () => {
  const plan = { planSha256: sql(`select plan_sha256 from public.source_sync_runs where id='${applied.runId}';`), candidates: [] };
  const before = snapshot();
  assert.match(failure(() => apply(plan)), /SYNC_PLAN_ALREADY_APPLIED/);
  assert.equal(snapshot(), before);
});

test("application roles cannot run the writer or read its audit", () => {
  for (const role of ["anon", "authenticated"]) {
    assert.match(failure(() => sql(`set role ${role}; select public.ht_source_sync_apply('{}'::jsonb,'x');`)), /permission denied/);
    assert.match(failure(() => sql(`set role ${role}; select * from public.source_sync_row_audit;`)), /permission denied/);
  }
});

test("rollback refuses a story edited after the run", () => {
  sql(`update public.stories set lock_version = lock_version + 1 where id='${id(2)}';`);
  const before = snapshot();
  assert.match(failure(() => rollback(applied.runId)), /SYNC_ROLLBACK_CONFLICT/);
  assert.equal(snapshot(), before);
  sql(`update public.stories set lock_version = lock_version - 1 where id='${id(2)}';`);
});

test("rollback restores the exact prior database state", () => {
  const result = rollback(applied.runId);
  assert.equal(result.reverted, 2);
  assert.equal(snapshot(), preApply);
  assert.equal(sql(`select status from public.source_sync_runs where id='${applied.runId}';`), "rolled_back");
});

test("a run cannot be rolled back twice", () => {
  assert.match(failure(() => rollback(applied.runId)), /SYNC_RUN_NOT_APPLIED/);
});

// Ledger rows for a published source, as the reconciliation query returns them.
const ledgerFor = (posts, options) => JSON.parse(sql(buildLedgerQuery(posts, options)));
const classifiedFor = (posts) => ({
  schemaVersion: 1,
  authority: { role: "Publisher/Owner", decidedBy: "Disposable test fixture", decidedAt: T2, basis: "Golden fixture" },
  records: posts.map((p) => ({ stableKey: `wordpress:post:${p.postId}`, accessPolicy: "public", sourceModifiedAt: p.modifiedAt, evidence: { kind: "publisher-owner-decision", reference: "fixture" } }))
});
const T3 = "2026-11-08T00:00:00.000Z";
const LIFECYCLE = post(2001, "lifecycle-story", T2, { publishedAt: T2 });

test("import is idempotent: replanning after an apply is all no-ops", () => {
  const first = planIncrementalSync([LIFECYCLE], ledgerFor([LIFECYCLE]), classifiedFor([LIFECYCLE]));
  assert.equal(first.decisions[0].decision, "INSERT_CANDIDATE");
  apply(first);
  const second = planIncrementalSync([LIFECYCLE], ledgerFor([LIFECYCLE]), classifiedFor([LIFECYCLE]));
  assert.equal(second.decisions[0].decision, "NOOP_UNCHANGED");
  assert.equal(second.candidates.length, 0);
});

test("a later source edit propagates through the modification path", () => {
  const edited = { ...LIFECYCLE, modifiedAt: T3, title: "Edited title", contentBody: "<p>Edited body</p>" };
  const plan = planIncrementalSync([edited], ledgerFor([edited]), classifiedFor([edited]));
  assert.equal(plan.decisions[0].decision, "UPDATE_CANDIDATE");
  apply(plan);
  assert.equal(row("lifecycle-story").body_html, "<p>Edited body</p>");
  assert.equal(new Date(row("lifecycle-story").modified_at).toISOString(), T3);
});

let unpublishRun;
let beforeUnpublish;

test("a confirmed withdrawal hides the story from the Reader", () => {
  beforeUnpublish = snapshot();
  const edited = { ...LIFECYCLE, modifiedAt: T3 };
  const ledger = ledgerFor([edited], { windowStartAt: T1 });
  const planned = planIncrementalSync([], ledger, null, { windowComplete: true, windowStartAt: T1, retrievedPostIds: [1001, 1002, 1003, 1004, 1006] });
  assert.equal(planned.decisions.find((d) => d.stableKey === "wordpress:post:2001").decision, "REVIEW_SOURCE_MISSING");
  const plan = confirmWithdrawals(planned, ledger, new Map([["wordpress:post:2001", "withdrawn"]]));
  assert.equal(plan.candidates.length, 1);
  unpublishRun = apply(plan);
  assert.equal(unpublishRun.unpublished, 1);
  assert.equal(row("lifecycle-story").status, "unpublished");
  const feed = JSON.parse(sql("select public.ag05_public_feed_documents(50);"));
  assert.equal(feed.some((item) => item.source_id === "2001"), false);
});

test("withdrawal keeps editorial authority fields and the audit trail", () => {
  const story = row("lifecycle-story");
  assert.equal(story.access_policy, "public");
  assert.equal(story.lock_version, 1);
  assert.equal(sql(`select action from public.source_sync_row_audit where run_id='${unpublishRun.runId}';`), "unpublish");
});

test("a withdrawal can be rolled back exactly", () => {
  rollback(unpublishRun.runId);
  assert.equal(snapshot(), beforeUnpublish);
  assert.equal(row("lifecycle-story").status, "published");
});

test("a newsroom-edited story is never withdrawn by sync", () => {
  const ledger = ledgerFor([post(1004, "edited-story", T2)]);
  const planned = { ...planIncrementalSync([], ledger, null, { windowComplete: true, windowStartAt: T1, retrievedPostIds: [] }) };
  const confirmed = confirmWithdrawals(planned, ledger, new Map([["wordpress:post:1004", "withdrawn"]]));
  assert.equal(confirmed.decisions.find((d) => d.stableKey === "wordpress:post:1004").decision, "HOLD_NATIVE_EDIT_CONFLICT");
  assert.equal(confirmed.candidates.length, 0);
});

test("the writer refuses a forged withdrawal of a newsroom-edited story", () => {
  const story = row("edited-story");
  const before = snapshot();
  const forged = { planSha256: "4".repeat(64), candidates: [{ decision: "UNPUBLISH_CANDIDATE", stableKey: "wordpress:post:1004", expected: { storyId: story.id, lockVersion: story.lock_version, modifiedAt: story.modified_at } }] };
  assert.match(failure(() => apply(forged)), /SYNC_NATIVE_EDIT_CONFLICT/);
  assert.equal(snapshot(), before);
});

test("repeated scheduled cycles converge and replay safely", async () => {
  const article = post(3001, "cycle-story", T2, { publishedAt: T2 });
  const window = (candidates) => async () => ({ candidates, retrieved: candidates.length, retrievedPostIds: candidates.map((p) => p.postId), windowComplete: true, latestModifiedRetrievedAt: candidates.map((p) => p.modifiedAt).sort().at(-1) });
  const readLedger = async (posts) => ledgerFor(posts);
  const applyPlan = async (plan) => apply(plan);
  const now = Date.parse(T3);
  const first = await runSyncCycle({ state: {}, probe: window([article]), readLedger, apply: applyPlan, classification: classifiedFor([article]), now });
  assert.equal(first.status, "SYNCED");
  assert.equal(first.applied.inserted, 1);
  const replay = await runSyncCycle({ state: first.state, probe: window([article]), readLedger, apply: applyPlan, classification: classifiedFor([article]), now });
  assert.equal(replay.status, "SYNCED");
  assert.equal(replay.applied, null);
  const edited = { ...article, modifiedAt: T3, contentBody: "<p>Cycle edit</p>" };
  const third = await runSyncCycle({ state: replay.state, probe: window([edited]), readLedger, apply: applyPlan, classification: classifiedFor([edited]), now });
  assert.equal(third.applied.updated, 1);
  assert.equal(row("cycle-story").body_html, "<p>Cycle edit</p>");
  assert.equal(third.state.watermark, T3);
});

test("a failed apply leaves the watermark for replay and persists nothing", async () => {
  const article = post(3002, "failed-cycle-story", T2, { publishedAt: T2 });
  const before = snapshot();
  const result = await runSyncCycle({
    state: { watermark: T1 }, now: Date.parse(T3), classification: classifiedFor([article]),
    probe: async () => ({ candidates: [article], retrieved: 1, retrievedPostIds: [3002], windowComplete: true, latestModifiedRetrievedAt: T2 }),
    readLedger: async (posts) => ledgerFor(posts),
    apply: async (plan) => apply({ ...plan, candidates: [...plan.candidates, { ...plan.candidates[0], accessPolicy: "free" }] })
  });
  assert.equal(result.status, "APPLY_FAILED");
  assert.equal(result.state.watermark, T1);
  assert.equal(snapshot(), before);
});

const forgedUpdate = (hash, key, story) => ({
  planSha256: hash.repeat(64),
  candidates: [{
    decision: "UPDATE_CANDIDATE", stableKey: key, accessPolicy: "public", title: "Forged", excerpt: "Forged", bodyHtml: "<p>Forged</p>",
    modifiedAt: T3, canonicalUrl: "https://healthtimes.co.zw/forged/", checksum: "forged",
    expected: { storyId: story.id, lockVersion: story.lock_version, modifiedAt: story.modified_at }
  }]
});

test("the writer refuses a forged update of a Premium story", () => {
  const before = snapshot();
  assert.match(failure(() => apply(forgedUpdate("5", "wordpress:post:1003", row("premium-story")))), /SYNC_PREMIUM_PROTECTED/);
  assert.equal(snapshot(), before);
});

test("the writer refuses an update once a staff revision exists", () => {
  sql(`
    insert into auth.users (id, email) values ('${id(50)}', 'disposable-editor@healthtimes.test');
    insert into public.staff_profiles (id, auth_user_id, email, display_name, status, role_id)
      select '${id(51)}', '${id(50)}', 'disposable-editor@healthtimes.test', 'Disposable Editor', 'active', r.id from public.newsroom_roles r where r.name = 'Publisher / Owner';
    insert into public.story_revisions (story_id, revision_number, title, editor_id) values ('${id(2)}', 1, 'Edited', '${id(51)}');
  `);
  const before = snapshot();
  assert.match(failure(() => apply(forgedUpdate("6", "wordpress:post:1002", row("modified-story")))), /SYNC_NATIVE_EDIT_CONFLICT/);
  assert.equal(snapshot(), before);
  sql(`delete from public.story_revisions where story_id='${id(2)}';`);
});
