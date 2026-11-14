// HT-MVP-PUBLIC-LAUNCH-01-G5: reader account-deletion contract (candidate migration) on a
// disposable loopback database replaying the applied schema. Never touches a hosted project.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, disposableDatabase } from "./support/canonical-schema.mjs";

const CANDIDATE = join(ROOT, "supabase/migrations/candidates/20261114120000_ht_mvp_g5_account_deletion_contract.sql");
const READER = "11111111-1111-4111-8111-111111111111";
const STAFF = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const SUBSCRIBER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STORY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROFILE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const COMMENT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const db = disposableDatabase("ht_g5_account_deletion");
const as = (role, uid, statement) => db.sql(`begin;
set local role ${role};
${uid ? `select set_config('request.jwt.claim.sub', '${uid}', true);` : ""}
${statement}
commit;`).split("\n").filter(line => line && !/^(set_config|SET|BEGIN|COMMIT)$/.test(line) && line !== uid).at(-1);
const fails = (role, uid, statement) => db.failure(() => as(role, uid, statement));
const json = text => JSON.parse(text);

test("account deletion contract", async (t) => {
  db.createCanonical();
  db.applyFile(CANDIDATE);
  db.sql(`
    select set_config('app.newsroom_rpc', '1', false);
    insert into auth.users (id, email) values ('${READER}', 'reader@example.test'), ('${STAFF}', 'staff@example.test'), ('${OTHER}', 'other@example.test');
    insert into public.staff_profiles (auth_user_id, display_name, email) values ('${STAFF}', 'Staff Member', 'staff@example.test');
    insert into public.subscribers (id, auth_user_id, email, display_name) values ('${SUBSCRIBER}', '${READER}', 'reader@example.test', 'Reader One');
    insert into public.premium_entitlements (subscriber_id, policy_key, provider, provider_reference) values ('${SUBSCRIBER}', 'premium', 'paynow', 'ref-g5-1');
    insert into public.payment_transactions (purpose, merchant_reference, subscriber_id, plan_key, currency, expected_amount, idempotency_key)
      values ('PREMIUM_SUBSCRIPTION', 'HT-PREM-0123456789ABCDEFGHJKMNPQRS', '${SUBSCRIBER}', 'healthtimes_premium_monthly', 'USD', 5, 'idem-g5-account-deletion');
    insert into public.reader_push_devices (reader_user_id, expo_push_token, token_hash, platform) values ('${READER}', 'ExponentPushToken[g5]', 'hash-g5', 'android');
    insert into public.stories (id, title, slug) values ('${STORY}', 'Fixture story', 'g5-fixture-story');
    insert into public.reader_comment_profiles (id, auth_user_id, display_name) values ('${PROFILE}', '${READER}', 'Reader One');
    insert into public.story_comments (id, story_id, author_profile_id, body, state) values ('${COMMENT}', '${STORY}', '${PROFILE}', 'My personal comment', 'PUBLISHED');
    insert into public.story_comment_revisions (comment_id, actor_auth_user_id, revision_type, previous_body) values ('${COMMENT}', '${READER}', 'edit', 'Original personal text');
  `);

  await t.test("anonymous callers cannot request, and only service_role can process", () => {
    assert.match(fails("anon", null, "select public.account_request_deletion('DELETE MY ACCOUNT');"), /permission denied/);
    assert.match(fails("authenticated", READER, `select public.account_deletion_process('${SUBSCRIBER}', 'x');`), /permission denied/);
    assert.match(fails("authenticated", READER, `select public.account_deletion_mark_identity_deleted('${SUBSCRIBER}');`), /permission denied/);
    assert.match(fails("authenticated", null, "select public.account_request_deletion('DELETE MY ACCOUNT');"), /ACCOUNT_DELETION_REQUIRES_SIGNED_IN_READER/);
  });

  let requestId;
  await t.test("a reader request needs the exact phrase, is idempotent and visible only to its owner", () => {
    assert.match(fails("authenticated", READER, "select public.account_request_deletion('delete');"), /ACCOUNT_DELETION_CONFIRMATION_REQUIRED/);
    const first = json(as("authenticated", READER, "select public.account_request_deletion('DELETE MY ACCOUNT');"));
    const again = json(as("authenticated", READER, "select public.account_request_deletion('DELETE MY ACCOUNT');"));
    assert.equal(first.status, "requested");
    assert.equal(again.requestId, first.requestId);
    requestId = first.requestId;
    assert.equal(json(as("authenticated", READER, "select public.account_deletion_request_status();")).requestId, requestId);
    assert.equal(as("authenticated", OTHER, "select count(*) from public.account_deletion_requests;"), "0", "RLS hides other readers' requests");
    assert.equal(json(as("authenticated", OTHER, "select public.account_deletion_request_status();")).status, "none");
    assert.match(fails("authenticated", READER, `insert into public.account_deletion_requests (auth_user_id) values ('${READER}');`), /permission denied/);
  });

  await t.test("staff identities are refused and must leave through Newsroom offboarding", () => {
    assert.match(fails("authenticated", STAFF, "select public.account_request_deletion('DELETE MY ACCOUNT');"), /STAFF_ACCOUNT_REQUIRES_NEWSROOM_OFFBOARDING/);
  });

  await t.test("processing waits for the cancellation window; cancelled requests are never processed", () => {
    assert.match(fails("service_role", null, `select public.account_deletion_process('${requestId}', 'g5-test');`), /DELETION_CANCEL_WINDOW_OPEN/);
    const other = json(as("authenticated", OTHER, "select public.account_request_deletion('DELETE MY ACCOUNT');"));
    assert.equal(json(as("authenticated", OTHER, "select public.account_cancel_deletion_request();")).status, "cancelled");
    db.sql(`update public.account_deletion_requests set cancel_window_ends_at = now() - interval '1 minute', requested_at = now() - interval '2 days' where id = '${other.requestId}';`);
    assert.match(fails("service_role", null, `select public.account_deletion_process('${other.requestId}', 'g5-test');`), /DELETION_REQUEST_NOT_PROCESSABLE/);
    assert.match(fails("service_role", null, `select public.account_deletion_process('${requestId}', '');`), /ACCOUNT_DELETION_PROCESSOR_REQUIRED/);
  });

  await t.test("after the window, reader data is erased or anonymised and payment records are retained", () => {
    db.sql(`update public.account_deletion_requests set requested_at = now() - interval '2 days', cancel_window_ends_at = now() - interval '1 minute' where id = '${requestId}';`);
    assert.match(fails("authenticated", READER, "select public.account_cancel_deletion_request();"), /DELETION_CANCEL_WINDOW_CLOSED/);
    const result = json(as("service_role", null, `select public.account_deletion_process('${requestId}', 'g5-test');`));
    assert.equal(result.status, "data_erased");
    assert.equal(result.nextStep, "DELETE_AUTH_IDENTITY_VIA_ADMIN_API");
    assert.deepEqual(result.summary, {
      pushDevicesDeleted: 1, subscribersAnonymised: 1, entitlementsEnded: 1, paymentRecordsRetained: 1,
      commentProfilesAnonymised: 1, commentsRemoved: 1, commentRevisionsScrubbed: 1, communicationContactsForManualReview: 0
    });
    const subscriber = db.sql(`select coalesce(auth_user_id::text,'null')||'|'||email||'|'||coalesce(display_name,'null')||'|'||status from public.subscribers where id = '${SUBSCRIBER}';`);
    assert.equal(subscriber, `null|deleted+${SUBSCRIBER}@account-deleted.invalid|null|deleted`);
    assert.equal(db.sql(`select count(*) from public.subscribers where email ilike '%reader@example.test%';`), "0");
    assert.equal(db.sql(`select (ends_at <= now())::text from public.premium_entitlements where subscriber_id = '${SUBSCRIBER}';`), "true");
    assert.equal(db.sql(`select count(*) from public.payment_transactions where subscriber_id = '${SUBSCRIBER}';`), "1", "financial record retained");
    assert.equal(db.sql(`select count(*) from public.reader_push_devices where reader_user_id = '${READER}';`), "0");
    assert.equal(db.sql(`select display_name||'|'||state||'|'||(auth_user_id <> '${READER}')::text from public.reader_comment_profiles where id = '${PROFILE}';`), "Former reader|disabled|true");
    assert.equal(db.sql(`select body||'|'||state from public.story_comments where id = '${COMMENT}';`), "[removed at account deletion]|REMOVED");
    assert.equal(db.sql(`select count(*) from public.story_comment_revisions where actor_auth_user_id = '${READER}' or previous_body like '%personal%';`), "0");
    assert.match(fails("service_role", null, `select public.account_deletion_process('${requestId}', 'g5-test');`), /DELETION_REQUEST_NOT_PROCESSABLE/, "processing runs once");
  });

  await t.test("completion requires the Auth identity to be gone", () => {
    assert.match(fails("service_role", null, `select public.account_deletion_mark_identity_deleted('${requestId}');`), /AUTH_IDENTITY_STILL_PRESENT/);
    db.sql(`delete from auth.users where id = '${READER}';`); // Supabase Auth Admin API deleteUser in production
    const done = json(as("service_role", null, `select public.account_deletion_mark_identity_deleted('${requestId}');`));
    assert.equal(done.status, "completed");
    assert.equal(db.sql(`select status from public.account_deletion_requests where id = '${requestId}';`), "completed");
    assert.equal(db.sql(`select count(*) from public.payment_transactions;`), "1");
  });
});
