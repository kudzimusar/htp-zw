# HT-MVP-PAYNOW-USD-01-R4-FINAL-ICR-LR01 — Consolidated source, evidence and continuity

**Authority:** Issue #135, starting exact R3 SHA `8f93c30fe53308aae2d1ef2bfef172576efe50ea`.  
**Branch:** `fix/ht-mvp-paynow-usd01-r4-physical-cert-closure`. **Draft PR:** #138 based on R3 branch.  
**R4 pre-evidence implementation head:** `154457dacb7f9353bbc20b0c06188ddee72378ed`.  
**Final evidence SHA / CI:** Use the exact remote HEAD and CI run linked in the controlling Issue #135; this file intentionally does not invent a self-referential Git SHA.

## 1. Engineering and customer-return product

The R3 endpoint continues to protect `GET /api/commerce?action=status` with subscriber ownership or a separately authorized TEST operator. **R4 source defect confirmed:** the customer return route requested that protected status for connectivity references without any owning subscriber. R4 now renders an explicit `HT-CONN-` operator-only notice, **zero anonymous payment status requests**, and never ships operator secrets to web clients.

Premium subscriber returns use only same-origin authenticated cookies. An HTTP 401 shows a clear session-expired sign-in notice; 403/404 shows a privacy-preserving unknown/foreign reference; 429 stops blind polling; provider cancel/fail and TEST simulated Paid show no commercial entitlement; pending allows a bounded manual retry. Browser refresh requeries the trusted server, not client-supplied `paid` parameters. The query-dependent Expo web return UI is delayed until hydration to avoid server/client mismatch.

**Browser harness:** `tests/browser/paynow-r4-return.browser.cjs`, real Expo web static export and actual headless Chromium, fixture JSON served over a real local HTTP endpoint (not a unit-test-only render or request interception). Nine explicit cases: connectivity, 401, foreign 404, TEST simulated Paid, cancelled, failed, rate limited, pending/manual retry, and refresh simulated Paid. Fixtures are NOT real Paynow provider events, and the Chromium export is not an authenticated live Paynow browser session.

**Engineering regression:** R3 baseline 54 Paynow/security + 2 disposable LIVE SQL + 12 Finance/Premium = 68. R4 adds nine browser scenarios without disabling any baseline suites. GitHub Actions workflow `.github/workflows/ht-mvp-paynow-usd01-r4.yml` installs Expo for web without changing the existing out-of-sync mobile package-lock. Require exact-head green CI before classifying final R4 candidate engineering PASS.

## 2. Full-schema Finance parity

The R4 change to `apps/mobile/tests/ht-ext01a-payment-finance-readiness.test.mjs` applies the **undeployed** R3 LIVE USD candidate SQL to a disposable PostgreSQL database already bootstrapped with the actual HealthTimes Finance/payment migrations and historical currency-evidence remediation. The test checks the RPC and attestation table compile, public EXECUTE denied, service_role attestation INSERT denied, original `CURRENCY_MISMATCH` unchanged, exception intact, and unproven LIVE connectivity status refused. No staging/prod monetary SQL applied.

**FIN-R4-001 High / blocked commercial release:** text-only `security_reviewer`/`finance_reviewer` and a manually entered SHA-256 provider evidence hash do NOT independently validate genuine merchant-specific USD receipt/settlement proof. Privileged actors could populate those fields without an authenticated Paynow statement review. No provider evidence retrieval/reviewer cryptographic signature verification is deployed. Independent Finance reviewer and authenticated merchant/provider source required before setting LIVE flags or deploying LIVE RPC.

## 3. Exact read-only Staging reconciliation (2 November 2026)

```text
PAYNOW_INTENTS=5
PROVIDER_INITIATED=4
HISTORIC_CURRENCY_MISMATCH=1
OPEN_EXCEPTIONS=1
PAYMENT_VERIFIED=0
PROVIDER_WEBHOOK_EVENTS=3
NEW_SIMULATED_TEST_EVENTS=0
PAYNOW_PREMIUM_ENTITLEMENTS=0
PREMIUM_ENTITLEMENT_RECONCILIATIONS=0
FINANCE_PAYNOW_PAYMENT_ROWS=0
PAYMENT_REVERSALS=0
LIVE_MONETARY_RPC_DEPLOYED=0
LIVE_ATTESTATION_TABLE_DEPLOYED=0
PREMIUM_PLAN=healthtimes_premium_monthly;USD_5.00;month;active
```

TEST provider display of ZiG/ZWG, signed Paid status and USD product price remain three different facts. Staging TEST Edge `paynow-test-callback` v24 is unchanged and noncommercial; no new R4 physical Paynow event.

## 4. Reviewer independence (cannot be self certified)

- **Security:** `BLOCKED_INDEPENDENT_SECURITY_REVIEW`. Distinct nonimplementing GitHub reviewer not identified/approved. SEC-R3-001 IDOR repair exists, R4 browser return repair is engineering tested; actual Security signoff must recheck final SHA, auth negatives, signed callback/poll, SSRF, Edge v24, operator tokens and all High issues.
- **SEC-R4-002:** the process-local `Map` rate limiter does not provide distributed serverless enforcement. Require shared rate limit or independently certified edge/WAF policy before public rollout. Do not misstate per-process map as globally secure.
- **Finance:** `BLOCKED_INDEPENDENT_FINANCE_REVIEW`. A second, distinct nonimplementing Finance reviewer must verify actual provider evidence and accountant/currency/charge-vs-settlement/reversal policy. Synthetic postgres tests are not merchant evidence.
- The implementing GitHub identity is `kudzimusar`; it cannot impersonate either reviewer. Review packets: `SECURITY-INDEPENDENT-REVIEW-BLOCKER.md` and `FINANCE-INDEPENDENT-REVIEW-BLOCKER.md`.

## 5. Merchant physical TEST and provider proof

The Browser connector could not access a merchant session from this desktop context: `Browser access requires the originating browser context. Open ChatGPT in the browser with the connected extension and try again.` No TEST Faked Success event, actual Paynow receipt, new provider reference or replay was created. **`MERCHANT_TEST_PHYSICAL=BLOCKED_MERCHANT_TEST_SESSION`**. The Owner must directly authenticate the TEST integration merchant account in a controlled connected browser; no credentials should enter chat or GitHub.

Provider-specific LIVE merchant integration payment methods, USD charged/cleared amount and independently attributable settlement evidence remain unavailable. No LIVE monetary migration is deployed or authorized.

## 6. Acceptance guardrail

```text
SECURITY_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED
FINANCE_INDEPENDENT_REVIEW=NOT_YET_CERTIFIED
PHYSICAL_PROVIDER_TEST=BLOCKED_MERCHANT_TEST_SESSION
LIVE_MERCHANT_USD_CERTIFIED=NO
LIVE_MONETARY_RPC_DEPLOYED=NO
LIVE_USD_SETTLEMENT=NOT_CERTIFIED
PUBLIC_CHECKOUT=DISABLED
PRODUCTION_TOUCHED=NO
MERGE_PERFORMED=NO
REAL_MONEY=0
PROVIDER_MESSAGES=0
MODERATOR_REVIEW_REQUIRED=YES
```

Recommend `REMEDIATE_OR_BLOCK_FINAL_ACCEPTANCE` until independent Security/Finance and merchant physical TEST requirements are fulfilled. Engineering evidence may be accepted separately only after exact-head CI and Preview checks. Do not mark final certification PASS from implementation work.

## 7. Executed R4 engineering evidence

**Exact implementation commit:** `154457dacb7f9353bbc20b0c06188ddee72378ed`. GitHub Actions https://github.com/kudzimusar/htp-zw/actions/runs/41425750385 **completed SUCCESS**, with **68/68 Node/SQL** plus **9/9 actual Chromium browser journeys** passing. All mandatory static no-activation checks pass. R4's full Finance parity extension is included in its 12/12 suite. No mandatory test skipped.

The final R4 evidence commit must preserve these implementation sources and rerun the same workflow at the new exact remote SHA. A successful CI result is implementation evidence only; it is **not** an independently attributed Security/Finance signature, authentic Paynow merchant TEST event, or proof of USD bank settlement.
