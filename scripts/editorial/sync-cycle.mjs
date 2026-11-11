// One pass of the publisher-to-database sync. Everything external is injected, so
// the same cycle runs against fakes, a disposable database, or (only once the Owner
// authorizes it) staging. No writer supplied means plan-and-hold.
import { confirmWithdrawals, planIncrementalSync } from "./sync-incremental-dryrun.mjs";

export const FRESHNESS_SLA_SECONDS = 900;
export const MAX_WITHDRAWALS_PER_CYCLE = 10;
// Waiting on a person; repeating the cycle cannot resolve these.
const DECISION_STATES = new Set(["HOLD_PENDING_CLASSIFICATION", "HOLD_SLUG_CHANGED", "BLOCK_SLUG_COLLISION", "BLOCK_LEDGER_ORPHAN_SOURCE"]);

const postIdFromKey = (key) => Number(key.slice(key.lastIndexOf(":") + 1));

async function resolveWithdrawals(plan, ledger, checkWithdrawn, alerts) {
  const missing = plan.decisions.filter((item) => item.decision === "REVIEW_SOURCE_MISSING");
  if (!missing.length) return plan;
  const results = new Map();
  for (const { stableKey } of missing) results.set(stableKey, await checkWithdrawn(postIdFromKey(stableKey)));
  // A burst usually means the publisher or the check is broken, not mass deletion.
  if ([...results.values()].filter((result) => result === "withdrawn").length > MAX_WITHDRAWALS_PER_CYCLE) {
    alerts.push("WITHDRAWAL_SPIKE");
    return plan;
  }
  return confirmWithdrawals(plan, ledger, results);
}

export async function runSyncCycle({ state = {}, probe, readLedger, apply, checkWithdrawn, classification = null, now = Date.now() }) {
  const alerts = [];
  if (state.lastSuccessAt && now - Date.parse(state.lastSuccessAt) > FRESHNESS_SLA_SECONDS * 1000) alerts.push("FRESHNESS_SLA_EXCEEDED");

  // A one-second overlap re-reads the boundary post; unchanged posts are no-ops.
  const since = state.watermark ? new Date(Date.parse(state.watermark) - 1000).toISOString() : null;
  const window = await probe({ includeBody: Boolean(classification), since });
  if (!window.candidates) {
    alerts.push("SOURCE_UNAVAILABLE");
    return { status: "SOURCE_UNAVAILABLE", state, alerts, plan: null, applied: null };
  }

  const ledger = window.candidates.length
    ? await readLedger(window.candidates)
    : { capturedAt: new Date(now).toISOString(), sources: [], slugOwners: [] };
  let plan = planIncrementalSync(window.candidates, ledger, classification, {
    // Only a newest-first date window says anything about unpublished posts.
    windowComplete: !since,
    windowStartAt: window.candidates.map((post) => post.publishedAt).sort()[0],
    retrievedPostIds: window.retrievedPostIds,
    latestModifiedRetrievedAt: window.latestModifiedRetrievedAt
  });
  if (checkWithdrawn) plan = await resolveWithdrawals(plan, ledger, checkWithdrawn, alerts);
  if (plan.decisions.some((item) => DECISION_STATES.has(item.decision))) alerts.push("DECISIONS_PENDING");

  let applied = null;
  if (plan.candidates.length) {
    if (!apply) return { status: "PLANNED_HELD", state, alerts, plan, applied };
    try {
      applied = await apply(plan);
    } catch (error) {
      alerts.push("APPLY_FAILED");
      return { status: "APPLY_FAILED", state, alerts, plan, applied, error: String(error?.message ?? error).slice(0, 300) };
    }
  }
  const nextState = { watermark: plan.nextWatermark ?? state.watermark, lastSuccessAt: new Date(now).toISOString() };
  return { status: "SYNCED", state: nextState, alerts, plan, applied };
}
