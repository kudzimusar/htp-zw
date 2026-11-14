// G2G4G6-PARALLEL-CLOSE-01 Workstream B: the operator job end to end against the real G5
// candidate contract on a disposable loopback database. Auth deletion is simulated by
// deleting the auth.users row, as the Admin API does. Never touches a hosted project.
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ROOT, disposableDatabase } from "./support/canonical-schema.mjs";
import { processDeletions } from "../../scripts/account/process-account-deletions.mjs";

const CANDIDATE = join(ROOT, "supabase/migrations/candidates/20261114120000_ht_mvp_g5_account_deletion_contract.sql");
const READER = "41111111-1111-4111-8111-111111111111";
const WAITING = "42222222-2222-4222-8222-222222222222";
const STAFF = "43333333-3333-4333-8333-333333333333";
const db = disposableDatabase("ht_g2g4g6_deletion_operator");
const last = (out) => out.split("\n").filter(Boolean).at(-1);
const asService = (statement) => {
  try {
    return JSON.parse(last(db.sql(`begin;\nset local role service_role;\n${statement}\ncommit;`)));
  } catch (error) {
    const text = String(error.stderr ?? error.message);
    throw Object.assign(new Error(text), { contractCode: text.match(/ERROR:\s+([A-Z_]+)/)?.[1] ?? text });
  }
};
const asReader = (uid, statement) => last(db.sql(`begin;\nset local role authenticated;\nselect set_config('request.jwt.claim.sub', '${uid}', true);\n${statement}\ncommit;`));

const adapters = {
  db: {
    listDue: async () => db.sql(`select id || '|' || auth_user_id || '|' || status from public.account_deletion_requests
      where (status = 'requested' and cancel_window_ends_at <= now()) or status = 'data_erased' order by requested_at;`)
      .split("\n").filter((l) => l.includes("|")).map((l) => { const [id, authUserId, status] = l.split("|"); return { id, authUserId, status }; }),
    process: async (id, by) => asService(`select public.account_deletion_process('${id}', '${by}')::text;`),
    markIdentityDeleted: async (id) => asService(`select public.account_deletion_mark_identity_deleted('${id}')::text;`)
  },
  auth: { deleteUser: async (uid) => { db.sql(`delete from auth.users where id = '${uid}';`); } }
};

test("operator job against the real contract", async (t) => {
  db.createCanonical();
  db.applyFile(CANDIDATE);
  db.sql(`
    select set_config('app.newsroom_rpc', '1', false);
    insert into auth.users (id, email) values ('${READER}', 'r@example.test'), ('${WAITING}', 'w@example.test'), ('${STAFF}', 's@example.test');
    insert into public.subscribers (auth_user_id, email, display_name) values ('${READER}', 'r@example.test', 'Reader');
  `);
  for (const uid of [READER, WAITING]) asReader(uid, "select public.account_request_deletion('DELETE MY ACCOUNT');");
  // Staff are refused at request time; the operator therefore never sees them.
  db.sql(`insert into public.staff_profiles (auth_user_id, display_name, email) values ('${STAFF}', 'Staff', 's@example.test');`);
  db.sql(`update public.account_deletion_requests set requested_at = now() - interval '2 days', cancel_window_ends_at = now() - interval '1 minute' where auth_user_id = '${READER}';`);

  await t.test("dry run lists only the due request and writes nothing", async () => {
    const r = await processDeletions({ ...adapters });
    assert.equal(r.due, 1);
    assert.equal(db.sql(`select count(*) from public.account_deletion_requests where status = 'requested';`).trim().split("\n").at(-1), "2");
  });

  await t.test("execute completes the due request and leaves the waiting one alone", async () => {
    const r = await processDeletions({ ...adapters, execute: true, processedBy: "operator:disposable" });
    assert.deepEqual([r.summary.COMPLETED, r.summary.FAILED_RESUMABLE], [1, 0]);
    const states = db.sql(`select auth_user_id || ':' || status from public.account_deletion_requests order by auth_user_id;`);
    assert.match(states, new RegExp(`${READER}:completed`));
    assert.match(states, new RegExp(`${WAITING}:requested`));
    assert.equal(last(db.sql(`select count(*) from auth.users where id = '${READER}';`)), "0");
    assert.equal(last(db.sql(`select email from public.subscribers where auth_user_id is null;`)).endsWith("@account-deleted.invalid"), true);
  });

  await t.test("an Auth failure leaves data_erased; the next run resumes without re-erasing", async () => {
    db.sql(`update public.account_deletion_requests set requested_at = now() - interval '2 days', cancel_window_ends_at = now() - interval '1 minute' where auth_user_id = '${WAITING}';`);
    const broken = { ...adapters, auth: { deleteUser: async () => { throw Object.assign(new Error("upstream 503"), { status: 503 }); } } };
    const first = await processDeletions({ ...broken, execute: true, processedBy: "operator:disposable" });
    assert.equal(first.results[0].step, "deleteUser");
    assert.match(db.sql(`select status from public.account_deletion_requests where auth_user_id = '${WAITING}';`), /data_erased/);
    const second = await processDeletions({ ...adapters, execute: true, processedBy: "operator:disposable" });
    assert.equal(second.summary.COMPLETED, 1);
  });

  await t.test("the contract itself refuses completion while the identity still exists", async () => {
    asReader(STAFF, "select 1;");
    db.sql(`insert into public.account_deletion_requests (auth_user_id, status, requested_at, cancel_window_ends_at) values ('${STAFF}', 'data_erased', now() - interval '2 days', now() - interval '1 day');`);
    const noDelete = { ...adapters, auth: { deleteUser: async () => {} } };
    const r = await processDeletions({ ...noDelete, execute: true, processedBy: "operator:disposable" });
    assert.equal(r.results[0].outcome, "FAILED_RESUMABLE");
    assert.equal(r.results[0].error, "AUTH_IDENTITY_STILL_PRESENT");
  });
});
