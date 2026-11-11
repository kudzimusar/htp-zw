// Proves the held Reader eligibility rules on the canonical schema, publishing
// native stories through the real Newsroom workflow RPCs. Disposable data only:
// this is not authenticated staging UAT.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, disposableDatabase } from "./support/canonical-schema.mjs";

const db = disposableDatabase("ht_reader_eligibility_test");
const { sql, failure } = db;
const USER = "11111111-1111-4111-8111-111111111111";
const STAFF = "22222222-2222-4222-8222-222222222222";
const AUTHOR = "33333333-3333-4333-8333-333333333333";
const SESSION = `SET "request.jwt.claim.sub" = '${USER}'; SET "request.jwt.claims" = '{"sub":"${USER}","session_id":"session-eligibility"}';`;
const PAST = "2026-10-01T00:00:00.000Z";
const uuid = (n) => `cccccccc-0000-4000-8000-${String(n).padStart(12, "0")}`;
const src = (n) => `dddddddd-0000-4000-8000-${String(n).padStart(12, "0")}`;
const lane = (id) => sql(`select public.ht_story_reader_lane('${id}');`);
const nativeFeed = () => sql("select coalesce(string_agg(slug, ',' order by slug), '') from public.newsroom_public_published_stories(null);").split(",").filter(Boolean);
const wordpressFeed = () => JSON.parse(sql("select public.ag05_public_feed_documents(50);"));

function publish(title, slug) {
  const id = sql(`${SESSION} select public.newsroom_create_story(jsonb_build_object('title', '${title}', 'slug', '${slug}', 'body_html', '<p>Body of ${slug}</p>'));`);
  sql(`update public.stories set slug='${slug}', body_html='<p>Body of ${slug}</p>', distribution='{"public_reader":true}'::jsonb where id='${id}';`);
  for (const step of ["Submitted", "Fact check", "Health / Science review", "Copy edit", "Editor review", "Ready", "Published"]) {
    sql(`${SESSION} select public.newsroom_transition_story('${id}', '${step}', 'Disposable workflow step');`);
  }
  return id;
}

test("canonical schema replays and the eligibility rules install", () => {
  db.createCanonical();
  db.applyFile(join(ROOT, "scripts/editorial/sql/reader-editorial-eligibility.sql"));
  assert.equal(sql("select count(*) from pg_proc where proname = 'ht_story_reader_lane';"), "1");
});

test("a Publisher staff identity is provisioned in the disposable database", () => {
  sql(`
    insert into auth.users (id, email) values ('${USER}', 'disposable-publisher@healthtimes.test');
    insert into public.authors (id, display_name, slug) values ('${AUTHOR}', 'Disposable Publisher', 'disposable-publisher');
    insert into public.staff_profiles (id, auth_user_id, email, display_name, status, role_id, public_author_id)
      select '${STAFF}', '${USER}', 'disposable-publisher@healthtimes.test', 'Disposable Publisher', 'active', r.id, '${AUTHOR}' from public.newsroom_roles r where r.name = 'Publisher / Owner';
    insert into public.newsroom_sessions (staff_profile_id, auth_user_id, provider_session_id, user_agent) values ('${STAFF}', '${USER}', 'session-eligibility', 'DisposableTest');
  `);
  assert.equal(sql(`${SESSION} select public.newsroom_has_capability('story.publish');`), "t");
});

let genuine;
let uat;

test("a story published through the real workflow is an approved native story", () => {
  genuine = publish("Genuine newsroom report", "genuine-newsroom-report");
  assert.equal(sql(`select workflow_status from public.stories where id='${genuine}';`), "Published");
  assert.equal(sql(`select legacy_source_id is null from public.stories where id='${genuine}';`), "t");
  assert.equal(lane(genuine), "native-newsroom");
});

test("native stories reach the Reader feed without a legacy source", () => {
  assert.ok(nativeFeed().includes("genuine-newsroom-report"));
});

test("a UAT story published through the same workflow is excluded", () => {
  uat = publish("[UAT04B] Test Story 001", "uat04b-test-story-001");
  assert.equal(lane(uat), "excluded-test");
  assert.equal(nativeFeed().includes("uat04b-test-story-001"), false);
});

test("the single-story route also refuses the UAT story", () => {
  assert.equal(sql(`select public.newsroom_public_story_document('/uat04b-test-story-001/') is null;`), "t");
  assert.equal(sql(`select public.newsroom_public_story_document('/genuine-newsroom-report/') is null;`), "f");
});

test("explicit test classification excludes an otherwise genuine story", () => {
  const id = publish("Quiet rehearsal report", "quiet-rehearsal-report");
  assert.equal(lane(id), "native-newsroom");
  sql(`insert into public.story_editorial_classifications (story_id, classification, decided_by, basis) values ('${id}', 'test', 'Disposable test', 'Fixture');`);
  assert.equal(lane(id), "excluded-test");
  assert.equal(nativeFeed().includes("quiet-rehearsal-report"), false);
});

test("the Publisher can clear a false test suspicion", () => {
  const id = publish("[TEST] kits reach rural clinics", "test-kits-reach-rural-clinics");
  assert.equal(lane(id), "excluded-test");
  sql(`insert into public.story_editorial_classifications (story_id, classification, decided_by, basis) values ('${id}', 'production', 'Disposable test', 'Fixture');`);
  assert.equal(lane(id), "native-newsroom");
});

test("a row marked published without workflow approval is not an approved story", () => {
  sql(`insert into public.stories (id, title, slug, body_html, status, access_policy, published_at, workflow_status, distribution) values ('${uuid(1)}', 'Direct row', 'direct-row', '<p>x</p>', 'publish', 'public', '${PAST}', 'Published', '{"public_reader":true}');`);
  assert.equal(lane(uuid(1)), "excluded-unreleased");
  assert.equal(nativeFeed().includes("direct-row"), false);
});

test("wordpress rows are seeded per source type", () => {
  sql(`
    insert into public.legacy_sources (id, system, site_url, source_type, source_id, stable_key, source_url, raw) values
      ('${src(1)}', 'wordpress', 'https://healthtimes.co.zw', 'post', '5001', 'wordpress:post:5001', 'https://healthtimes.co.zw/public-post/', '{}'),
      ('${src(2)}', 'wordpress', 'https://healthtimes.co.zw', 'post', '5002', 'wordpress:post:5002', 'https://healthtimes.co.zw/flagged-post/', '{}'),
      ('${src(3)}', 'wordpress', 'https://healthtimes.co.zw', 'page', '5003', 'wordpress:page:5003', 'https://healthtimes.co.zw/login/', '{}'),
      ('${src(4)}', 'wordpress', 'https://healthtimes.co.zw', 'post', '5004', 'wordpress:post:5004', 'https://healthtimes.co.zw/test-import/', '{}');
    insert into public.stories (id, legacy_source_id, title, slug, body_html, status, access_policy, published_at) values
      ('${uuid(11)}', '${src(1)}', 'Public post', 'public-post', '<p>Public body</p>', 'published', 'public', '${PAST}'),
      ('${uuid(12)}', '${src(2)}', 'Flagged post', 'flagged-post', '<p>First paragraph.</p><p>Protected body</p>', 'published', 'premium_marker_review', '${PAST}'),
      ('${uuid(13)}', '${src(3)}', 'Login', 'login', '<p>Login form</p>', 'publish', 'public', '${PAST}'),
      ('${uuid(14)}', '${src(4)}', 'Imported test', 'test-import', '<p>x</p>', 'published', 'public', '${PAST}');
    insert into public.story_editorial_classifications (story_id, classification, decided_by, basis) values ('${uuid(14)}', 'test', 'Disposable test', 'Fixture');
  `);
  assert.equal(lane(uuid(11)), "wordpress-post");
});

test("a public WordPress post is served with its body", () => {
  const entry = wordpressFeed().find((item) => item.source_id === "5001");
  assert.equal(entry.body_html, "<p>Public body</p>");
});

test("a flagged WordPress post is listed with its body withheld", () => {
  assert.equal(lane(uuid(12)), "wordpress-post");
  const entry = wordpressFeed().find((item) => item.source_id === "5002");
  assert.equal(entry.body_html, null);
});

test("an imported page never appears as news", () => {
  assert.equal(lane(uuid(13)), "excluded-page");
  assert.equal(wordpressFeed().some((item) => item.source_id === "5003"), false);
  assert.equal(sql("select count(*) from public.ag05_public_feed_rows(50) where title = 'Login';"), "0");
});

test("an imported record classified as test is excluded from both feeds", () => {
  assert.equal(lane(uuid(14)), "excluded-test");
  assert.equal(wordpressFeed().some((item) => item.source_id === "5004"), false);
  assert.equal(sql("select count(*) from public.ag05_public_feed_rows(50) where title = 'Imported test';"), "0");
});

test("readers keep access to the feeds but not the unfiltered functions or the registry", () => {
  for (const role of ["anon", "authenticated"]) {
    assert.equal(failure(() => sql(`set role ${role}; select public.ag05_public_feed_documents(5);`)), null);
    assert.equal(failure(() => sql(`set role ${role}; select count(*) from public.newsroom_public_published_stories(null);`)), null);
    assert.match(failure(() => sql(`set role ${role}; select public.ag05_public_feed_documents_unfiltered(5, 0, null);`)), /permission denied/);
    assert.match(failure(() => sql(`set role ${role}; select * from public.story_editorial_classifications;`)), /permission denied/);
  }
});
