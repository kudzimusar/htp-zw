// G2G4G6-PARALLEL-CLOSE-01 Workstream B: account-deletion operator job, failure modes.
// In-memory model of the G5 contract's state machine. No network, no database.
import test from "node:test";
import assert from "node:assert/strict";
import { OUTCOMES, processDeletions, subjectRef, supabaseAdapters } from "../../scripts/account/process-account-deletions.mjs";

const NOW = new Date("2026-11-14T12:00:00Z");
function model(requests, { staff = [], failProcess = null, failDelete = null, failMark = null } = {}) {
  const users = new Set(requests.map((r) => r.authUserId));
  const rows = new Map(requests.map((r) => [r.id, { ...r }]));
  const err = (m) => Object.assign(new Error(m), { contractCode: m });
  const calls = [];
  return {
    users, rows, calls,
    db: {
      listDue: async () => [...rows.values()].filter((r) => (r.status === "requested" && r.windowEnds <= NOW) || r.status === "data_erased").map(({ id, authUserId, status }) => ({ id, authUserId, status })),
      process: async (id, by) => {
        calls.push(["process", id, by]);
        if (failProcess) { const f = failProcess; failProcess = null; throw err(f); }
        const r = rows.get(id);
        if (!r) throw err("DELETION_REQUEST_NOT_FOUND");
        if (r.status !== "requested") throw err("DELETION_REQUEST_NOT_PROCESSABLE");
        if (NOW < r.windowEnds) throw err("DELETION_CANCEL_WINDOW_OPEN");
        if (staff.includes(r.authUserId)) { r.status = "rejected"; return { requestId: id, status: "rejected", reason: "STAFF_ACCOUNT_REQUIRES_NEWSROOM_OFFBOARDING" }; }
        r.status = "data_erased";
        return { requestId: id, status: "data_erased", nextStep: "DELETE_AUTH_IDENTITY_VIA_ADMIN_API", authUserId: r.authUserId, summary: {} };
      },
      markIdentityDeleted: async (id) => {
        calls.push(["mark", id]);
        if (failMark) { const f = failMark; failMark = null; throw err(f); }
        const r = rows.get(id);
        if (r.status !== "data_erased") throw err("DELETION_DATA_NOT_ERASED");
        if (users.has(r.authUserId)) throw err("AUTH_IDENTITY_STILL_PRESENT");
        r.status = "completed";
        return { requestId: id, status: "completed" };
      }
    },
    auth: {
      deleteUser: async (uid) => {
        calls.push(["deleteUser", uid]);
        if (failDelete) { const f = failDelete; failDelete = null; throw f; }
        if (!users.has(uid)) throw Object.assign(new Error("User not found"), { status: 404 });
        users.delete(uid);
      }
    }
  };
}
const req = (id, o = {}) => ({ id, authUserId: `user-${id}`, status: "requested", windowEnds: new Date("2026-11-13T00:00:00Z"), ...o });
const run = (m, o = {}) => processDeletions({ db: m.db, auth: m.auth, now: () => NOW, execute: true, processedBy: "operator:test", ...o });

test("dry run is the default and changes nothing", async () => {
  const m = model([req("a")]);
  const r = await processDeletions({ db: m.db, auth: m.auth, now: () => NOW });
  assert.equal(r.summary.WOULD_PROCESS, 1);
  assert.deepEqual(m.calls, []);
  assert.equal(m.rows.get("a").status, "requested");
});

test("executing requires a named processor", async () => {
  const m = model([req("a")]);
  await assert.rejects(processDeletions({ db: m.db, auth: m.auth, execute: true }), /processedBy/);
});

test("happy path: erase, delete identity, then complete, in that order", async () => {
  const m = model([req("a")]);
  const r = await run(m);
  assert.equal(r.summary.COMPLETED, 1);
  assert.deepEqual(m.calls.map((c) => c[0]), ["process", "deleteUser", "mark"]);
  assert.equal(m.rows.get("a").status, "completed");
  assert.equal(m.users.has("user-a"), false);
});

test("staff accounts are rejected and their identity is never deleted", async () => {
  const m = model([req("s")], { staff: ["user-s"] });
  const r = await run(m);
  assert.equal(r.summary.REJECTED_STAFF, 1);
  assert.equal(m.users.has("user-s"), true);
  assert.equal(m.calls.some((c) => c[0] === "deleteUser"), false);
});

test("a request cancelled between listing and processing is skipped, not deleted", async () => {
  const m = model([req("a")], { failProcess: "DELETION_REQUEST_NOT_PROCESSABLE" });
  const r = await run(m);
  assert.equal(r.summary.SKIPPED_NOT_PROCESSABLE, 1);
  assert.equal(m.users.has("user-a"), true);
});

test("an Auth outage after erasure leaves the request resumable and the next run completes it", async () => {
  const m = model([req("a")], { failDelete: Object.assign(new Error("upstream 500"), { status: 500 }) });
  const first = await run(m);
  assert.equal(first.summary.FAILED_RESUMABLE, 1);
  assert.equal(first.results[0].step, "deleteUser");
  assert.equal(m.rows.get("a").status, "data_erased", "never marked completed while the identity exists");
  const second = await run(m);
  assert.equal(second.summary.COMPLETED, 1);
  assert.deepEqual(m.calls.filter((c) => c[0] === "process").length, 1, "erasure is not repeated on resume");
});

test("a crash after the identity was deleted resumes through a 404 and completes", async () => {
  const m = model([req("a")], { failMark: "connection reset" });
  assert.equal((await run(m)).summary.FAILED_RESUMABLE, 1);
  assert.equal(m.users.has("user-a"), false);
  assert.equal((await run(m)).summary.COMPLETED, 1);
});

test("an unexpected process result is never treated as success", async () => {
  const m = model([req("a")]);
  m.db.process = async () => ({ status: "data_erased" });
  const r = await run(m);
  assert.equal(r.summary.FAILED_RESUMABLE, 1);
  assert.equal(m.users.has("user-a"), true);
});

test("audit entries carry a one-way subject reference, never the user ID", async () => {
  const m = model([req("a")]);
  const lines = [];
  await run(m, { log: (e) => lines.push(JSON.stringify(e)) });
  assert.equal(lines.some((l) => l.includes("user-a")), false);
  assert.ok(lines[0].includes(subjectRef("user-a")));
});

test("REST adapter sends the service key only to the configured project and surfaces contract codes", async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, auth: init.headers.Authorization });
    return new Response(JSON.stringify({ message: "DELETION_CANCEL_WINDOW_OPEN" }), { status: 400 });
  };
  const { db } = supabaseAdapters({ url: "https://proj.supabase.co/", serviceRoleKey: "svc", fetchImpl });
  await assert.rejects(db.process("r1", "op"), (e) => e.contractCode === "DELETION_CANCEL_WINDOW_OPEN");
  assert.equal(seen[0].url, "https://proj.supabase.co/rest/v1/rpc/account_deletion_process");
  assert.throws(() => supabaseAdapters({ url: "", serviceRoleKey: "x" }), /required/);
});

test("a mark result other than completed is reported as a resumable failure", async () => {
  const m = model([req("a")]);
  m.db.markIdentityDeleted = async () => ({ status: "data_erased" });
  const r = await run(m);
  assert.equal(r.summary.COMPLETED, 0);
  assert.equal(r.results[0].step, "markIdentityDeleted");
});
