// HT-MVP-PUBLIC-LAUNCH-01-G2G4G6-PARALLEL-CLOSE-01, Workstream B.
// Operator job for the G5 account-deletion contract
// (supabase/migrations/candidates/20261114120000_ht_mvp_g5_account_deletion_contract.sql).
//
// Server-only. It needs the service-role key, so it must never run in a browser, an app
// bundle or a Vercel function reachable from the public internet. It is NOT scheduled
// anywhere; scheduling it is a separately authorized production step.
//
// For each due request it runs, in order:
//   1. account_deletion_process(id, processedBy)  requested -> data_erased (or rejected for staff)
//   2. auth.admin.deleteUser(authUserId)           Auth identity removed (404 = already gone)
//   3. account_deletion_mark_identity_deleted(id)  data_erased -> completed
// Every step is idempotent or guarded by the contract, so a crash at any point leaves the
// request resumable: a later run picks up data_erased requests at step 2.
//
// Default is a dry run. Pass --execute to act.
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node process-account-deletions.mjs [--execute] [--limit 25]

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const OUTCOMES = Object.freeze({
  COMPLETED: "COMPLETED",
  REJECTED_STAFF: "REJECTED_STAFF",
  SKIPPED_WINDOW_OPEN: "SKIPPED_WINDOW_OPEN",
  SKIPPED_NOT_PROCESSABLE: "SKIPPED_NOT_PROCESSABLE",
  FAILED_RESUMABLE: "FAILED_RESUMABLE",
  WOULD_PROCESS: "WOULD_PROCESS"
});

// Audit lines carry a one-way reference, never an email or a raw user ID.
export const subjectRef = (uid) => "sub_" + createHash("sha256").update(String(uid)).digest("hex").slice(0, 16);

const contractError = (error) => String(error?.contractCode ?? error?.message ?? error);

export async function processDeletions({ db, auth, now = () => new Date(), execute = false, limit = 25, processedBy, log = () => {} }) {
  if (!db || !auth) throw new TypeError("db and auth adapters are required");
  if (execute && !processedBy) throw new TypeError("processedBy is required when executing");
  const due = await db.listDue({ now: now(), limit });
  const results = [];
  for (const request of due) {
    const ref = subjectRef(request.authUserId);
    const record = (outcome, extra = {}) => {
      const entry = { requestId: request.id, subject: ref, fromStatus: request.status, outcome, at: now().toISOString(), ...extra };
      results.push(entry);
      log(entry);
      return entry;
    };
    if (!execute) { record(OUTCOMES.WOULD_PROCESS); continue; }

    let authUserId = request.authUserId;
    if (request.status === "requested") {
      let processed;
      try {
        processed = await db.process(request.id, processedBy);
      } catch (error) {
        const code = contractError(error);
        if (/DELETION_CANCEL_WINDOW_OPEN/.test(code)) { record(OUTCOMES.SKIPPED_WINDOW_OPEN); continue; }
        // Cancelled or already handled by a concurrent run between list and process.
        if (/DELETION_REQUEST_NOT_PROCESSABLE|DELETION_REQUEST_NOT_FOUND/.test(code)) { record(OUTCOMES.SKIPPED_NOT_PROCESSABLE); continue; }
        record(OUTCOMES.FAILED_RESUMABLE, { step: "process", error: code });
        continue;
      }
      if (processed?.status === "rejected") { record(OUTCOMES.REJECTED_STAFF, { reason: processed.reason }); continue; }
      if (processed?.status !== "data_erased" || processed?.nextStep !== "DELETE_AUTH_IDENTITY_VIA_ADMIN_API") {
        record(OUTCOMES.FAILED_RESUMABLE, { step: "process", error: "UNEXPECTED_PROCESS_RESULT" });
        continue;
      }
      authUserId = processed.authUserId ?? authUserId;
    } else if (request.status !== "data_erased") {
      record(OUTCOMES.SKIPPED_NOT_PROCESSABLE);
      continue;
    }

    try {
      await auth.deleteUser(authUserId);
    } catch (error) {
      if (!(error?.status === 404 || /user not found/i.test(String(error?.message)))) {
        record(OUTCOMES.FAILED_RESUMABLE, { step: "deleteUser", error: contractError(error) });
        continue;
      }
    }

    try {
      const marked = await db.markIdentityDeleted(request.id);
      if (marked?.status !== "completed") throw new Error("UNEXPECTED_MARK_RESULT");
      record(OUTCOMES.COMPLETED);
    } catch (error) {
      record(OUTCOMES.FAILED_RESUMABLE, { step: "markIdentityDeleted", error: contractError(error) });
    }
  }
  const summary = Object.fromEntries(Object.values(OUTCOMES).map((o) => [o, results.filter((r) => r.outcome === o).length]));
  return { execute, due: due.length, summary, results };
}

// ---- Supabase REST adapters (service role, server-only) --------------------------------
export function supabaseAdapters({ url, serviceRoleKey, fetchImpl = fetch }) {
  if (!url || !serviceRoleKey) throw new TypeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const base = url.replace(/\/$/, "");
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" };
  const call = async (path, init) => {
    const response = await fetchImpl(`${base}${path}`, { ...init, headers });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const error = new Error(body?.message ?? `HTTP ${response.status}`);
      error.status = response.status;
      error.contractCode = body?.message;
      throw error;
    }
    return body;
  };
  const rpc = (name, args) => call(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
  return {
    db: {
      // Requires service_role SELECT on the table (Supabase default privileges grant it;
      // see the integration handover: a dedicated due-list function is the cleaner fix).
      listDue: async ({ now, limit }) => {
        const iso = encodeURIComponent(now.toISOString());
        const rows = await call(`/rest/v1/account_deletion_requests?select=id,auth_user_id,status,cancel_window_ends_at` +
          `&or=(and(status.eq.requested,cancel_window_ends_at.lte.${iso}),status.eq.data_erased)&order=requested_at.asc&limit=${Number(limit)}`, { method: "GET" });
        return rows.map((r) => ({ id: r.id, authUserId: r.auth_user_id, status: r.status }));
      },
      process: (id, by) => rpc("account_deletion_process", { p_request_id: id, p_processed_by: by }),
      markIdentityDeleted: (id) => rpc("account_deletion_mark_identity_deleted", { p_request_id: id })
    },
    auth: {
      deleteUser: (uid) => call(`/auth/v1/admin/users/${encodeURIComponent(uid)}`, { method: "DELETE" })
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 25;
  const { db, auth } = supabaseAdapters({ url: process.env.SUPABASE_URL, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY });
  const report = await processDeletions({
    db, auth, execute, limit,
    processedBy: process.env.HT_DELETION_OPERATOR ?? (execute ? undefined : "dry-run"),
    log: (entry) => console.log(JSON.stringify(entry))
  });
  console.log(JSON.stringify({ execute: report.execute, due: report.due, summary: report.summary }));
  process.exit(report.summary.FAILED_RESUMABLE ? 1 : 0);
}
