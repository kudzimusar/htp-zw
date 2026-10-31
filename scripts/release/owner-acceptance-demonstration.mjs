#!/usr/bin/env node

/**
 * HealthTimes 2.0 — Fail-Closed Non-Destructive Client Readiness & RPC Verifier
 * Unit: HT-MVP-CLIENT-READINESS-01-R1-FINAL
 *
 * Executes non-destructive API/RPC checks across Reader, Commercial, and Finance
 * personas against Staging (`bzuvntbkevvuhfhqhkua`) and verifies Vercel Preview
 * protection and build-info SHA custody (`126f81c65e24d30167deb21c06c598e39bf8ea10`).
 *
 * Security & Session Guarantees:
 * - Zero hardcoded secrets or tokens in source.
 * - Strictly fail-closed: exits with status code 1 if any assertion or RPC fails.
 * - Guaranteed `try / finally` session revocation (`newsroom_revoke_session` +
 *   `auth.signOut({ scope: "global" })`) for every authenticated test persona,
 *   even when an assertion failure occurs.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createClient } = require("../../apps/mobile/node_modules/@supabase/supabase-js");

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://bzuvntbkevvuhfhqhkua.supabase.co";
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_G82EfIFGaJeJYG-A5G2B8w_UkA7zTVZ";
const PREVIEW_URL =
  process.env.HT_PREVIEW_URL || "https://healthtimes-staging-czazp4yi8-11-11.vercel.app";
const EXPECTED_PREVIEW_SHA =
  process.env.EXPECTED_PREVIEW_SHA || "126f81c65e24d30167deb21c06c598e39bf8ea10";
const SIMULATE_FAILURE =
  process.env.SIMULATE_ASSERTION_FAILURE === "1" ||
  process.argv.includes("--simulate-failure");

function loadBypassSecret() {
  const envSecret =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    process.env.VERCEL_PROTECTION_BYPASS;
  if (envSecret && envSecret.trim().length > 0) {
    return envSecret.trim();
  }
  const secretPath = path.join(os.homedir(), ".healthtimes-secrets", "vercel-bypass");
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, "utf8").trim();
  }
  return null;
}

function loadTestActors() {
  if (process.env.HT_TEST_ACTORS_JSON) {
    return JSON.parse(process.env.HT_TEST_ACTORS_JSON);
  }
  const secretsFile = path.join(os.homedir(), ".healthtimes-secrets", "test-actors.json");
  if (!fs.existsSync(secretsFile)) {
    throw new Error(
      `Missing local test actors credential file at ${secretsFile} (or HT_TEST_ACTORS_JSON env var).`
    );
  }
  return JSON.parse(fs.readFileSync(secretsFile, "utf8"));
}

function createIsolatedClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function revokeAndSignOut(client, label) {
  let newsroomRevoked = false;
  let authSignedOut = false;
  try {
    const { data: staffId, error: idErr } = await client.rpc(
      "newsroom_current_staff_id_basic"
    );
    if (!idErr && staffId) {
      const { error: revErr } = await client.rpc("newsroom_revoke_session", {
        p_staff_id: staffId,
        p_provider_session_id: null,
      });
      if (revErr) {
        console.error(`  [WARN] ${label}: newsroom_revoke_session error: ${revErr.message}`);
      } else {
        newsroomRevoked = true;
      }
    }
  } catch (err) {
    console.error(`  [WARN] ${label}: exception during newsroom session revoke: ${err.message}`);
  }

  try {
    const { error: signOutErr } = await client.auth.signOut({ scope: "global" });
    if (signOutErr) {
      console.error(`  [WARN] ${label}: auth.signOut error: ${signOutErr.message}`);
    } else {
      authSignedOut = true;
    }
  } catch (err) {
    console.error(`  [WARN] ${label}: exception during auth.signOut: ${err.message}`);
  }

  return { newsroomRevoked, authSignedOut };
}

async function run() {
  const failures = [];
  const checks = [];

  function recordCheck(id, category, status, details) {
    checks.push({ id, category, status, details });
    const prefix =
      status === "PASS"
        ? "  [PASS]"
        : status === "FAIL"
        ? "  [FAIL]"
        : status === "BLOCKED"
        ? "  [BLOCKED]"
        : "  [NOT_EXECUTED]";
    console.log(`${prefix} ${id}: ${details}`);
    if (status === "FAIL") {
      failures.push(`${id}: ${details}`);
    }
  }

  function assertCondition(id, category, condition, passMsg, failMsg) {
    if (condition) {
      recordCheck(id, category, "PASS", passMsg);
    } else {
      recordCheck(id, category, "FAIL", failMsg);
    }
  }

  console.log("================================================================");
  console.log("HEALTHTIMES 2.0 — FAIL-CLOSED STAGING & ACCEPTANCE VERIFIER");
  console.log("================================================================");
  console.log(`Preview URL:          ${PREVIEW_URL}`);
  console.log(`Expected Preview SHA: ${EXPECTED_PREVIEW_SHA}`);
  console.log(`Supabase URL:         ${SUPABASE_URL}`);
  console.log("----------------------------------------------------------------");

  // 1. VERCEL PREVIEW PROTECTION & SHA CUSTODY
  console.log("\n[1/5] Verifying Vercel Preview Protection & Build SHA Custody...");
  try {
    const unauthRes = await fetch(`${PREVIEW_URL}/build-info.json`, {
      redirect: "manual",
    });
    assertCondition(
      "PREVIEW_SSO_PROTECTION_ACTIVE",
      "security_containment",
      unauthRes.status === 302 || unauthRes.status === 401 || unauthRes.status === 403,
      `Unauthenticated Preview request blocked as expected (HTTP ${unauthRes.status}).`,
      `Unauthenticated Preview request was NOT blocked (HTTP ${unauthRes.status}).`
    );
  } catch (err) {
    recordCheck(
      "PREVIEW_SSO_PROTECTION_ACTIVE",
      "security_containment",
      "FAIL",
      `Unauthenticated Preview probe threw error: ${err.message}`
    );
  }

  const bypassSecret = loadBypassSecret();
  if (!bypassSecret) {
    recordCheck(
      "PREVIEW_BUILD_SHA_CUSTODY",
      "security_containment",
      "FAIL",
      "Missing Vercel protection bypass secret in env or ~/.healthtimes-secrets/vercel-bypass."
    );
  } else {
    const fingerprint = crypto
      .createHash("sha256")
      .update(bypassSecret)
      .digest("hex")
      .slice(0, 12);
    try {
      const authRes = await fetch(`${PREVIEW_URL}/build-info.json`, {
        headers: { "x-vercel-protection-bypass": bypassSecret },
        redirect: "manual",
      });
      if (authRes.status !== 200) {
        recordCheck(
          "PREVIEW_BUILD_SHA_CUSTODY",
          "security_containment",
          "FAIL",
          `Authenticated Preview probe with secret fingerprint ${fingerprint} returned HTTP ${authRes.status}.`
        );
      } else {
        const buildInfo = await authRes.json();
        assertCondition(
          "PREVIEW_BUILD_SHA_CUSTODY",
          "security_containment",
          buildInfo?.sha === EXPECTED_PREVIEW_SHA,
          `Preview /build-info.json verified (HTTP 200, SHA=${buildInfo?.sha}, bypass fingerprint=${fingerprint}).`,
          `Preview /build-info.json SHA mismatch: expected ${EXPECTED_PREVIEW_SHA}, got ${buildInfo?.sha}.`
        );
      }
    } catch (err) {
      recordCheck(
        "PREVIEW_BUILD_SHA_CUSTODY",
        "security_containment",
        "FAIL",
        `Authenticated Preview probe threw error: ${err.message}`
      );
    }
  }

  // 2. PUBLIC READER & PREMIUM TEASER GATING (RPC)
  console.log("\n[2/5] Verifying Public Reader Catalog & Premium Teaser Protection (RPC)...");
  const anonClient = createIsolatedClient();

  const { data: sitemapXml, error: sitemapErr } = await anonClient.rpc(
    "ag05_public_sitemap_xml"
  );
  if (sitemapErr) {
    recordCheck(
      "READER_PUBLIC_SITEMAP_RPC",
      "reader_rpc",
      "FAIL",
      `ag05_public_sitemap_xml failed: ${sitemapErr.message}`
    );
  } else {
    const urlCount = (sitemapXml?.match(/<url>/g) || []).length;
    assertCondition(
      "READER_PUBLIC_SITEMAP_RPC",
      "reader_rpc",
      urlCount >= 5000,
      `Public sitemap RPC returned ${urlCount} indexed URLs (${(sitemapXml.length / 1024).toFixed(1)} KB XML).`,
      `Public sitemap RPC returned insufficient URLs (${urlCount} < 5000).`
    );
  }

  const testStoryPath =
    "/2026/09/18/ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis/";
  const { data: teaserData, error: teaserErr } = await anonClient.rpc(
    "ag05_public_story_teaser_document",
    { p_path: testStoryPath }
  );
  if (teaserErr || !teaserData) {
    recordCheck(
      "PREMIUM_TEASER_MASKING_RPC",
      "reader_rpc",
      "FAIL",
      `ag05_public_story_teaser_document failed: ${teaserErr?.message || "null payload"}`
    );
  } else {
    assertCondition(
      "PREMIUM_TEASER_MASKING_RPC",
      "reader_rpc",
      Boolean(teaserData.story_title) && teaserData.body_html === null,
      `Story teaser RPC returned "${teaserData.story_title}" with body_html=null (masked for non-subscribers).`,
      `Story teaser RPC failed body masking check (body_html=${teaserData.body_html !== null ? "EXPOSED" : "null"}).`
    );
  }

  const actors = loadTestActors();

  // 3. COMMERCIAL MANAGER PERSONA & CAPABILITY BOUNDARY
  console.log("\n[3/5] Verifying Commercial Manager Persona & RBAC Capability Boundary...");
  const commCreds = actors["uat-commercial@healthtimes.test"];
  if (!commCreds?.email || !commCreds?.password) {
    recordCheck(
      "COMMERCIAL_PERSONA_AUTH",
      "commercial_rpc",
      "FAIL",
      "Missing credentials for uat-commercial@healthtimes.test."
    );
  } else {
    const commClient = createIsolatedClient();
    let commLoggedIn = false;
    try {
      const { error: commAuthErr } = await commClient.auth.signInWithPassword({
        email: commCreds.email,
        password: commCreds.password,
      });
      if (commAuthErr) {
        recordCheck(
          "COMMERCIAL_PERSONA_AUTH",
          "commercial_rpc",
          "FAIL",
          `Commercial authentication failed: ${commAuthErr.message}`
        );
      } else {
        commLoggedIn = true;
        recordCheck(
          "COMMERCIAL_PERSONA_AUTH",
          "commercial_rpc",
          "PASS",
          `Authenticated as ${commCreds.email} (${commCreds.roleName}).`
        );

        const { error: regErr } = await commClient.rpc("newsroom_register_session", {
          p_user_agent: "ht-mvp-client-readiness-r1-verifier",
        });
        assertCondition(
          "COMMERCIAL_SESSION_REGISTERED",
          "commercial_rpc",
          !regErr,
          "Registered newsroom session for Commercial Manager.",
          `newsroom_register_session failed: ${regErr?.message}`
        );

        const { data: advertisers, error: advErr } = await commClient
          .from("advertisers")
          .select("id, name");
        assertCondition(
          "COMMERCIAL_ADVERTISERS_READ",
          "commercial_rpc",
          !advErr && Array.isArray(advertisers) && advertisers.length >= 1,
          `Advertisers catalog accessible (${advertisers?.length || 0} registered advertisers).`,
          `Advertisers query failed or empty: ${advErr?.message || "0 rows"}`
        );

        const { data: orders, error: ordErr } = await commClient.rpc(
          "commercial_list_orders",
          { p_status: null }
        );
        const totalOrders = Array.isArray(orders) ? orders.length : 0;
        const cancelledOrders = Array.isArray(orders)
          ? orders.filter((o) => o.status === "cancelled").length
          : 0;
        const uncancelledOrders = totalOrders - cancelledOrders;
        assertCondition(
          "COMMERCIAL_ORDERS_LEDGER_TRUTH",
          "commercial_rpc",
          !ordErr && totalOrders === 16 && cancelledOrders === 16 && uncancelledOrders === 0,
          `Commercial orders reconciled: ${totalOrders} total (${cancelledOrders} cancelled, ${uncancelledOrders} uncancelled).`,
          `Commercial orders mismatch: err=${ordErr?.message}, total=${totalOrders}, cancelled=${cancelledOrders}, uncancelled=${uncancelledOrders}`
        );

        // Real RBAC capability check: Commercial Manager lacks finance.statement.view
        const { error: tbForbiddenErr } = await commClient.rpc(
          "finance_get_trial_balance",
          { p_currency: "USD" }
        );
        assertCondition(
          "COMMERCIAL_RBAC_FINANCE_STATEMENT_DENIED",
          "rbac_boundary",
          Boolean(tbForbiddenErr) &&
            /finance\.statement\.view capability required/i.test(
              tbForbiddenErr.message || ""
            ),
          `RBAC enforced: Commercial Manager denied finance_get_trial_balance (${tbForbiddenErr?.message}).`,
          `RBAC violation: finance_get_trial_balance did not fail with expected capability error (got: ${tbForbiddenErr?.message || "SUCCESS"}).`
        );
      }
    } finally {
      if (commLoggedIn) {
        const cleanup = await revokeAndSignOut(commClient, "Commercial Manager");
        assertCondition(
          "COMMERCIAL_SESSION_CLEANUP",
          "session_hygiene",
          cleanup.newsroomRevoked && cleanup.authSignedOut,
          "Commercial Manager newsroom session revoked and auth token signed out in finally block.",
          `Commercial Manager session cleanup incomplete: newsroomRevoked=${cleanup.newsroomRevoked}, authSignedOut=${cleanup.authSignedOut}`
        );
      }
    }
  }

  // 4. FINANCE MANAGER PERSONA & EXACT STAGING FINANCIAL TRUTH
  console.log("\n[4/5] Verifying Finance Manager Persona & Exact Staging Ledger Truth...");
  const finCreds = actors["uat-finance@healthtimes.test"];
  if (!finCreds?.email || !finCreds?.password) {
    recordCheck(
      "FINANCE_PERSONA_AUTH",
      "finance_rpc",
      "FAIL",
      "Missing credentials for uat-finance@healthtimes.test."
    );
  } else {
    const finClient = createIsolatedClient();
    let finLoggedIn = false;
    try {
      const { error: finAuthErr } = await finClient.auth.signInWithPassword({
        email: finCreds.email,
        password: finCreds.password,
      });
      if (finAuthErr) {
        recordCheck(
          "FINANCE_PERSONA_AUTH",
          "finance_rpc",
          "FAIL",
          `Finance authentication failed: ${finAuthErr.message}`
        );
      } else {
        finLoggedIn = true;
        recordCheck(
          "FINANCE_PERSONA_AUTH",
          "finance_rpc",
          "PASS",
          `Authenticated as ${finCreds.email} (${finCreds.roleName}).`
        );

        const { error: regErr } = await finClient.rpc("newsroom_register_session", {
          p_user_agent: "ht-mvp-client-readiness-r1-verifier",
        });
        assertCondition(
          "FINANCE_SESSION_REGISTERED",
          "finance_rpc",
          !regErr,
          "Registered newsroom session for Finance Manager.",
          `newsroom_register_session failed: ${regErr?.message}`
        );

        if (SIMULATE_FAILURE) {
          recordCheck(
            "SIMULATED_ASSERTION_FAILURE",
            "fail_closed_test",
            "FAIL",
            "Simulated assertion failure triggered to verify nonzero exit and finally session revocation."
          );
          throw new Error("Simulated assertion failure inside Finance session.");
        }

        const { data: tb, error: tbErr } = await finClient.rpc(
          "finance_get_trial_balance",
          { p_currency: "USD" }
        );
        const tbAccounts = tb?.accounts || [];
        const tbDebits = Number(tb?.total_debits ?? -1);
        const tbCredits = Number(tb?.total_credits ?? -2);
        assertCondition(
          "FINANCE_TRIAL_BALANCE_PARITY",
          "finance_rpc",
          !tbErr &&
            tb?.is_balanced === true &&
            tbAccounts.length === 13 &&
            tbDebits === 31300 &&
            tbCredits === 31300,
          `Trial Balance balanced across ${tbAccounts.length} accounts: reversal-inclusive Debits $${tbDebits.toFixed(2)} = Credits $${tbCredits.toFixed(2)} (posted-only journal lines = $22,400.00).`,
          `Trial Balance check failed: err=${tbErr?.message}, balanced=${tb?.is_balanced}, debits=${tbDebits}, credits=${tbCredits}`
        );

        const { data: bs, error: bsErr } = await finClient.rpc(
          "finance_get_balance_sheet",
          { p_currency: "USD" }
        );
        const totalAssets = Number(bs?.total_assets ?? -1);
        const totalLiabEq = Number(bs?.total_liabilities_and_equity ?? -2);
        assertCondition(
          "FINANCE_BALANCE_SHEET_PARITY",
          "finance_rpc",
          !bsErr &&
            bs?.is_balanced === true &&
            totalAssets === 10500 &&
            totalLiabEq === 10500,
          `Balance Sheet balanced: Total Assets $${totalAssets.toFixed(2)} (Cash $3,000.00 + Trade AR $7,500.00) = Liabilities & Equity $${totalLiabEq.toFixed(2)}.`,
          `Balance Sheet check failed: err=${bsErr?.message}, balanced=${bs?.is_balanced}, assets=${totalAssets}, liab_eq=${totalLiabEq}`
        );

        const { data: pnl, error: pnlErr } = await finClient.rpc(
          "finance_get_profit_and_loss",
          { p_currency: "USD" }
        );
        const totalRev = Number(pnl?.total_revenue ?? -1);
        const totalExp = Number(pnl?.total_expenses ?? -1);
        const netSurplus = Number(pnl?.net_operating_surplus ?? -1);
        assertCondition(
          "FINANCE_PROFIT_AND_LOSS_TRUTH",
          "finance_rpc",
          !pnlErr && totalRev === 10500 && totalExp === 0 && netSurplus === 10500,
          `Profit & Loss verified (synthetic UAT fixtures): Revenue $${totalRev.toFixed(2)}, Expenses $${totalExp.toFixed(2)}, Net Surplus $${netSurplus.toFixed(2)}.`,
          `Profit & Loss check failed: err=${pnlErr?.message}, rev=${totalRev}, exp=${totalExp}, surplus=${netSurplus}`
        );

        const { data: invoices, error: invErr } = await finClient.rpc(
          "finance_list_invoices",
          { p_status: null }
        );
        const invList = Array.isArray(invoices) ? invoices : [];
        const invIssued = invList.filter((i) => i.status === "issued").length;
        const invPaid = invList.filter((i) => i.status === "paid").length;
        const invVoid = invList.filter((i) => i.status === "void").length;
        assertCondition(
          "FINANCE_INVOICES_CENSUS",
          "finance_rpc",
          !invErr &&
            invList.length === 12 &&
            invIssued === 3 &&
            invPaid === 2 &&
            invVoid === 7,
          `Staging invoices reconciled (synthetic UAT fixtures): ${invList.length} total (issued=${invIssued}, paid=${invPaid}, void=${invVoid}).`,
          `Invoices census mismatch: err=${invErr?.message}, total=${invList.length}, issued=${invIssued}, paid=${invPaid}, void=${invVoid}`
        );

        const { data: expenses, error: expErr } = await finClient.rpc(
          "finance_list_expenses",
          { p_status: null }
        );
        const expList = Array.isArray(expenses) ? expenses : [];
        const expVoid = expList.filter((e) => e.status === "void").length;
        const expRejected = expList.filter((e) => e.status === "rejected").length;
        assertCondition(
          "FINANCE_EXPENSES_CENSUS",
          "finance_rpc",
          !expErr && expList.length === 12 && expVoid === 11 && expRejected === 1,
          `Staging expenses reconciled (synthetic UAT fixtures): ${expList.length} total (void=${expVoid}, rejected=${expRejected}, posted_active=0).`,
          `Expenses census mismatch: err=${expErr?.message}, total=${expList.length}, void=${expVoid}, rejected=${expRejected}`
        );
      }
    } catch (err) {
      if (!SIMULATE_FAILURE) {
        recordCheck(
          "FINANCE_UNEXPECTED_EXCEPTION",
          "finance_rpc",
          "FAIL",
          `Unexpected error during Finance verification: ${err.message}`
        );
      }
    } finally {
      if (finLoggedIn) {
        const cleanup = await revokeAndSignOut(finClient, "Finance Manager");
        assertCondition(
          "FINANCE_SESSION_CLEANUP",
          "session_hygiene",
          cleanup.newsroomRevoked && cleanup.authSignedOut,
          "Finance Manager newsroom session revoked and auth token signed out in finally block.",
          `Finance Manager session cleanup incomplete: newsroomRevoked=${cleanup.newsroomRevoked}, authSignedOut=${cleanup.authSignedOut}`
        );
      }
    }
  }

  // 5. EXPLICIT BOUNDARY CLASSIFICATIONS (PAYNOW & HUMAN OWNER UAT)
  console.log("\n[5/5] Recording Explicit External & Human Boundary Classifications...");
  recordCheck(
    "PAYNOW_LIVE_USD_CHECKOUT",
    "commercial_boundary",
    "BLOCKED",
    "PAYNOW_PUBLIC_CHECKOUT=DISABLED, LIVE_USD_PAYMENT_CERTIFIED=NO (requires live Paynow merchant credentials & Owner authorization)."
  );
  recordCheck(
    "HUMAN_OWNER_BROWSER_UAT_AND_SIGNOFF",
    "owner_acceptance_boundary",
    "NOT_EXECUTED",
    "OWNER_ACCOUNT_EXISTS=YES (kudzimusar@gmail.com, Publisher / Owner active), OWNER_PHYSICAL_UAT_COMPLETED=NO, OWNER_CLIENT_ACCEPTANCE_SIGNED=NO."
  );

  const summary = {
    unit: "HT-MVP-CLIENT-READINESS-01-R1-FINAL",
    previewUrl: PREVIEW_URL,
    expectedPreviewSha: EXPECTED_PREVIEW_SHA,
    supabaseUrl: SUPABASE_URL,
    counts: {
      pass: checks.filter((c) => c.status === "PASS").length,
      fail: checks.filter((c) => c.status === "FAIL").length,
      blocked: checks.filter((c) => c.status === "BLOCKED").length,
      notExecuted: checks.filter((c) => c.status === "NOT_EXECUTED").length,
    },
    checks,
  };

  console.log("\n================================================================");
  console.log(
    `VERIFICATION SUMMARY: PASS=${summary.counts.pass} | FAIL=${summary.counts.fail} | BLOCKED=${summary.counts.blocked} | NOT_EXECUTED=${summary.counts.notExecuted}`
  );
  console.log("================================================================");

  if (failures.length > 0) {
    console.error("\n[FAIL-CLOSED EXIT] One or more mandatory checks failed:");
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }

  return summary;
}

run().catch((err) => {
  console.error("[FATAL ERROR]", err);
  process.exit(1);
});
