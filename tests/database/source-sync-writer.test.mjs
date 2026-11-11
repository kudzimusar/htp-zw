// Proves the held WordPress source-sync writer against the canonical schema on a
// disposable local Postgres. Refuses any non-loopback target.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { buildLedgerQuery } from "../../scripts/editorial/source-sync-ledger-query.mjs";
import { planIncrementalSync } from "../../scripts/editorial/sync-incremental-dryrun.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = process.env.HT_DISPOSABLE_PG_BASE_URI ?? "postgres://postgres:ephemeral-ci-only@127.0.0.1:55432";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(BASE).hostname), "source-sync tests run on loopback only");
const DB = "ht_source_sync_test";
const PSQL = ["/opt/homebrew/opt/postgresql@16/bin/psql", "/opt/homebrew/opt/libpq/bin/psql"].find((path) => fs.existsSync(path)) ?? "psql";
const WRITER = join(ROOT, "scripts/editorial/sql/source-sync-writer.sql");
// Held for G2, or fail-closed staging-only fixtures whose guard needs an authorization this test does not have.
const EXCLUDED = /^(20261102160000|20261107130000|20261029080000|20261029090000)_/;

const psql = (database, input, vars = {}) => execFileSync(
  PSQL,
  [`${BASE}/${database}`, "-At", "-q", "-v", "ON_ERROR_STOP=1", ...Object.entries(vars).flatMap(([k, v]) => ["-v", `${k}=${v}`])],
  { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }
).trim();
const sql = (input, vars) => psql(DB, input, vars);
const failure = (fn) => { try { fn(); } catch (error) { return String(error.stderr ?? error.message); } return null; };
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
  authority: { decidedBy: "Disposable test editor", decidedAt: T2, basis: "Golden fixture" },
  records: POSTS.filter((p) => p.postId !== 1007).map((p) => ({ stableKey: `wordpress:post:${p.postId}`, accessPolicy: "public", sourceModifiedAt: p.modifiedAt }))
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
  psql("postgres", `DROP DATABASE IF EXISTS ${DB};`);
  psql("postgres", `CREATE DATABASE ${DB};`);
  for (const role of ["anon", "authenticated", "service_role", "authenticator", "supabase_admin", "supabase_auth_admin", "supabase_storage_admin", "dashboard_user"]) {
    psql("postgres", `DO $$ BEGIN CREATE ROLE ${role} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  }
  psql("postgres", `ALTER DATABASE ${DB} SET search_path = public, extensions;`);
  sql(`
    create schema if not exists extensions;
    create extension if not exists pgcrypto with schema extensions;
    create extension if not exists "uuid-ossp" with schema extensions;
    create extension if not exists pg_trgm with schema extensions;
    create schema if not exists auth;
    create table auth.users (id uuid primary key default extensions.gen_random_uuid(), email text unique, phone text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean default false, created_at timestamptz default now(), updated_at timestamptz default now(), raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
    create table auth.sessions (id uuid primary key default extensions.gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), updated_at timestamptz default now(), not_after timestamptz, aal text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create schema if not exists storage;
    create table storage.buckets (id text primary key, name text, owner uuid, public boolean default false, file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now());
    create table storage.objects (id uuid primary key default extensions.gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz default now(), metadata jsonb);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
    create schema if not exists supabase_migrations;
    create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
    create schema if not exists realtime;
    create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb, event text, private boolean, inserted_at timestamptz default now());
    alter table realtime.messages enable row level security;
    create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language sql as $$ select $$;
    create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
  `);
  const migrations = join(ROOT, "supabase/migrations");
  for (const file of fs.readdirSync(migrations).filter((name) => name.endsWith(".sql") && !EXCLUDED.test(name)).sort()) {
    execFileSync(PSQL, [`${BASE}/${DB}`, "-q", "-v", "ON_ERROR_STOP=1", "-1", "-f", join(migrations, file)], { stdio: "pipe" });
  }
  execFileSync(PSQL, [`${BASE}/${DB}`, "-q", "-v", "ON_ERROR_STOP=1", "-1", "-f", WRITER], { stdio: "pipe" });
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
