# HealthTimes 2.0 — Client Delivery & Handoff Package
## Executive Acceptance Register, 7-Column Evidence Matrix, Staging Truth Census & Unsigned Client Certificate

- **Document ID:** `HT-MVP-CLIENT-HANDOFF-PACK`
- **Unit ID:** `HT-MVP-CLIENT-READINESS-01-R1-FINAL`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Professional Delivery Standard
- **Programme:** HealthTimes 2.0 — Final Unified MVP
- **Accepted Release-Governance Authority SHA:** `3df501f8280ac6e983f3f640b70dc049626aa52b`
- **Application Preview SHA:** `126f81c65e24d30167deb21c06c598e39bf8ea10`
- **Application Preview Deployment:** `dpl_F17gteDKYCS2w7J5CtZfJBFihKw5`
- **Application Preview URL:** `https://healthtimes-staging-czazp4yi8-11-11.vercel.app`
- **Staging Supabase Project:** `bzuvntbkevvuhfhqhkua`
- **Staging Migration Tip:** `20261030001134` (110 applied migrations on Staging; 108 canonical production migrations + 2 quarantined staging-only UAT reconciliation migrations)
- **Production Authorization:** `NONE` (`PRODUCTION_TOUCHED=NO`, `MERGE_PERFORMED=NO`)
- **Client Acceptance Status:** `UNSIGNED — PENDING HUMAN OWNER UAT & SIGN-OFF`

---

### Executive Source & Lineage Notice
In strict accordance with exact-source governance:
- **Release-Governance Authority SHA (`3df501f8280ac6e983f3f640b70dc049626aa52b`):** Represents the certified release governance, disposable-database destination attestation boundary, and preflight tooling.
- **Application Preview SHA (`126f81c65e24d30167deb21c06c598e39bf8ea10`):** Represents the verified application runtime bundle deployed on Vercel (`dpl_F17gteDKYCS2w7J5CtZfJBFihKw5`).
- The application runtime bundle is identical between `126f81c65e24d30167deb21c06c598e39bf8ea10` and `3df501f8280ac6e983f3f640b70dc049626aa52b`, as commit `3df501f8` modified only release governance scripts and test fixtures without altering application runtime source.
- **Preview Protection Containment (`HT-MVP-CLIENT-READINESS-01-R1-FINAL`):** Vercel Preview SSO protection (`all_except_custom_domains`) is active on `healthtimes-staging`. The specialist reports provider-side revocation of the previously exposed bypass credential (fingerprint `00317e8682e5`), with an HTTP `302` rejection of the old credential and an HTTP `200` response using the rotated credential (fingerprint `0fb0100c3825`), stored outside the repository. **Evidence boundary:** the Moderator independently verified that SSO protection is enabled, but could not retrieve Vercel's rotation audit record (provider event-history access returned HTTP `403`). The specialist's redacted HTTP test results are reported evidence, not independently observed provider-side revocation. Never disclose either credential.

---

## 1. Executive Deliverables Inventory

HealthTimes 2.0 is delivered to the client for Staging review and Owner UAT across four planes:

1. **HealthTimes Reader Application (Experience Plane):**
   - Mobile and responsive web surfaces (phone, tablet, desktop).
   - Dual-feed discovery (Curated Lead Story + Chronological Latest Health Feed).
   - Contextual topic, tag, and author exploration engine.
   - Offline reading cache and saved bookmarks.
   - Audio journalism player and Dark Mode typography controls.

2. **HealthTimes Newsroom Operating System (Control Plane):**
   - Unified 7-desk control room (`/studio`).
   - Staff authentication with password and magic-link session management (`newsroom_sessions` + `auth.sessions`).
   - Editorial drafting, peer review queue, revision diff tracking, and homepage lead story curation.
   - Commercial ad operations desk (advertisers, orders, campaigns, creatives, zone analytics).
   - Multi-channel audience distribution staging (WhatsApp, Newsletter, Push notifications).
   - Double-entry General Ledger (GL) with 13-account Chart of Accounts, Trial Balance, Profit & Loss, Balance Sheet, Invoices, Payments, and Expenses.
   - Staff administration and Role-Based Access Control (RBAC).

3. **Database & Release-Governance Core (Platform Plane):**
   - Supabase PostgreSQL staging database with 110 applied ledger versions (`bzuvntbkevvuhfhqhkua`) and a reviewed 108-migration canonical production plan (2 staging-only migrations excluded). Disposable PostgreSQL 17 certification (`HT-MVP-REL-COM-01-R3-R1`) exercised **six incremental Commercial migrations against a constructed baseline**; it did not replay all 108 migrations from an empty database.
   - Row-Level Security (RLS) and `SECURITY DEFINER` capability-checked RPCs across public tables.
   - Hardened migration governor (`scripts/release/ht-migration-governor.mjs`) with content-addressed SHA-256 manifest verification, per-migration atomic ledger wrapping, and live destination attestation.

4. **Delivery & Operations Documentation (Governance & Ops Planes):**
   - Fail-closed non-destructive RPC and preview custody verifier (`scripts/release/owner-acceptance-demonstration.mjs`).
   - Standard Operating Procedures (SOP), Incident Runbooks, and Backup/Recovery (PITR) procedures.
   - External Release Gates, Security/Privacy/Legal compliance registers, and V1.1/V1.2 deferred backlog.

---

## 2. Seven-Column Capability Acceptance & Evidence Matrix

To maintain strict claim discipline, capabilities are reported across **seven distinct evidence columns**. Automated tests, non-destructive API/RPC checks, prior specialist Playwright browser runs, and Human Owner physical UAT are reported separately and never conflated. No capability is labeled `PRODUCTION READY` while Human Owner acceptance, external compliance gates, or production promotion authorization remain pending.

| Capability Area | 1. Source Implemented | 2. Automated Tests Passed | 3. API / RPC Verification Completed | 4. Physical Interactive Browser UAT Completed | 5. Human Owner UAT Completed | 6. Environment Ready | 7. Production / Commercial Activation Authorized |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Reader & Search** | YES (`126f81c6`) | PASS (74 unit/contract tests) | PASS (`ag05_public_sitemap_xml`: 5,786 URLs; teaser RPC verified) | YES — Prior specialist Playwright runs (`phase12-canonical-uat`); NOT re-run in R1 | **NO** (`PENDING_HUMAN_OWNER`) | `STAGING_READY` (Vercel Preview + Supabase Staging) | **NO** (`PRODUCTION_NOT_AUTHORIZED`) |
| **2. Newsroom Editorial** | YES (`126f81c6`) | PASS (Editorial + studio test suites) | PASS (Publication & teaser contract verified) | YES — Prior specialist Playwright runs (`phase12-canonical-uat`); NOT re-run in R1 | **NO** (`PENDING_HUMAN_OWNER`) | `STAGING_READY` (`bzuvntbkevvuhfhqhkua`) | **NO** (`PRODUCTION_NOT_AUTHORIZED`) |
| **3. Staff Auth & RBAC** | YES (`126f81c6`) | PASS (RBAC + session hygiene tests) | PASS (Commercial denied `finance_get_trial_balance` with `42501`; session cleanup verified) | PARTIAL — Specialist browser auth/routes verified in `HT-MVP-COM-FINAL-01-R2-R2` | **NO** (`PENDING_HUMAN_OWNER`) | `STAGING_READY` (Owner + UAT roles active; 0 leaked UAT sessions) | **NO** (`PRODUCTION_NOT_AUTHORIZED`) |
| **4. Finance & Accounting** | YES (`126f81c6`) | PASS (Finance unit + migration governor 10/10) | PASS (`finance_get_trial_balance`, `balance_sheet`, `profit_and_loss`, `list_invoices`, `list_expenses`) | YES — Specialist Playwright verification of 12 commercial/finance routes (`HT-MVP-COM-FINAL-01-R2-R2`) | **NO** (`PENDING_HUMAN_OWNER`) | `STAGING_READY` (Synthetic UAT fixtures reconciled; $0 realized revenue) | **NO** (`PRODUCTION_NOT_AUTHORIZED`) |
| **5. Advertising Operations** | YES (`126f81c6`) | PASS (Commercial contract tests) | PASS (`advertisers` read + `commercial_list_orders`: 16 cancelled, 0 uncancelled) | YES — Specialist Playwright verification (`HT-MVP-COM-FINAL-01-R2-R2`) | **NO** (`PENDING_HUMAN_OWNER`) | `STAGING_READY` (Direct staff booking + manual invoice workflow) | **NO** (`PRODUCTION_NOT_AUTHORIZED`) |
| **6. Premium Access Gating** | YES (`126f81c6`) | PASS (Teaser & entitlement tests) | PASS (`ag05_public_story_teaser_document` returns `body_html: null`) | YES — Specialist Playwright verification (`HT-MVP-COM-FINAL-01-R2-R2`) | **NO** (`PENDING_HUMAN_OWNER`) | `STAGING_READY` (Manual entitlement provisioning only) | **NO** (`PRODUCTION_NOT_AUTHORIZED`) |
| **7. Paynow Gateway** | YES (`126f81c6`) | PASS (Webhook/hash unit tests) | BLOCKED (`PAYNOW_PUBLIC_CHECKOUT=DISABLED`; `LIVE_USD_PAYMENT_CERTIFIED=NO`) | NO — Live USD browser checkout disabled due to sandbox ZIG currency mismatch | **NO** (`PENDING_HUMAN_OWNER`) | `RESTRICTED_SANDBOX_ONLY` (Live USD merchant credentials pending) | **NO** (`STRICTLY_DISABLED`) |
| **8. Mobile / PWA** | YES (`126f81c6`) | PASS (Responsive/mobile quality suite) | PASS (Shared Supabase RPCs verified) | PARTIAL — Responsive web viewports verified in Playwright; native store builds not executed | **NO** (`PENDING_HUMAN_OWNER`) | `STAGING_WEB_PWA_READY` (App Store / Play Store credentials pending) | **NO** (`PRODUCTION_NOT_AUTHORIZED`) |
| **9. Ops Monitoring & Audit** | YES (`3df501f8`) | PASS (Migration governor & security tests) | PASS (`audit_logs` & `newsroom_sessions` verified on Staging) | N/A (Backend governance, CLI preflight, and SQL audit) | **NO** (`PENDING_HUMAN_OWNER`) | `STAGING_READY` (Runbooks & governor active) | **NO** (`PRODUCTION_NOT_AUTHORIZED`) |

---

## 3. Reconciled Owner Authentication & Staging Session State

Independent inspection of Staging Supabase (`bzuvntbkevvuhfhqhkua`) establishes the exact authentication and session state:

```text
OWNER_ACCOUNT_EXISTS=YES
OWNER_EMAIL=kudzimusar@gmail.com
OWNER_PUBLISHER_ROLE_ACTIVE=YES
OWNER_EMAIL_CONFIRMED_AT=2026-10-23T08:11:04.222585Z
OWNER_LAST_SIGN_IN_AT=2026-10-26T17:19:03.902265Z
OWNER_ACTIVE_NEWSROOM_SESSIONS=14
OWNER_ACTIVE_AUTH_SESSIONS=1
OWNER_PHYSICAL_UAT_COMPLETED=NO
OWNER_CLIENT_ACCEPTANCE_SIGNED=NO
COMMERCIAL_UAT_UNREVOKED_NEWSROOM_SESSIONS=0
FINANCE_UAT_UNREVOKED_NEWSROOM_SESSIONS=0
COMMERCIAL_UAT_AUTH_SESSIONS=0
FINANCE_UAT_AUTH_SESSIONS=0
```

- **Staging Owner Account State:** The primary Owner account (`kudzimusar@gmail.com`) **already exists** in `auth.users` and `public.staff_profiles` with `status = 'active'` and an active `Publisher / Owner` role assignment in `public.staff_role_assignments`. It does **not** require initial account creation or first-time `/studio/activate` bootstrapping on Staging.
- **Remaining Owner Action on Staging:** The Human Owner must perform the physical interactive browser UAT walkthrough across the 7 personas (`docs/delivery/HT-MVP-OWNER-UAT.md`) and execute the formal Client Acceptance Certificate (Section 10 below) if satisfied.
- **Production Bootstrap Note:** When a separate Production Supabase instance is eventually authorized and provisioned, `/studio/activate` remains the designated first-owner bootstrap endpoint for elevating the confirmed Owner email on that fresh environment.
- **Staging UAT Session Hygiene:** All synthetic test sessions for `uat-commercial@healthtimes.test` and `uat-finance@healthtimes.test` have been revoked (`0` unrevoked `newsroom_sessions`, `0` active `auth.sessions`), while all genuine Owner sessions for `kudzimusar@gmail.com` (`14` `newsroom_sessions`, `1` `auth.sessions`) have been preserved untouched.

---

## 4. Reconciled Staging Financial Truth (Synthetic UAT Fixtures vs. Realized Revenue)

All financial records currently in Staging (`bzuvntbkevvuhfhqhkua`) are **synthetic UAT / staging verification fixtures** created during prior certification phases. **Realized commercial production revenue is `$0.00`.**

### 4.1 Exact Staging Record Census
| Ledger / Table | Total Rows | Status Breakdown | Financial / Audit Explanation |
| :--- | :---: | :--- | :--- |
| `finance_invoices` | **12** | `issued`: **3** (`$7,500.00`)<br>`paid`: **2** (`$3,000.00`)<br>`void`: **7** (`$8,050.00`) | Synthetic staging invoices: three issued `INV-2026-0001`–`0003`, seven void `INV-2026-0004`–`0010` (each `$1,150.00`, linked to `UAT HealthCorp * Ltd` customers), and two paid `INV-UAT04B-*` invoices (each `$1,500.00`, linked to `UAT04B Staging Partner Ltd`). No real customer collections are evidenced. |
| `commercial_orders` | **16** | `cancelled`: **16**<br>`uncancelled`: **0** | All 16 synthetic UAT commercial orders (`ORD-202610-*`) are in `cancelled` status (`0` active/uncancelled orders). |
| `finance_expenses` | **12** | `void`: **11**<br>`rejected`: **1**<br>`posted / paid`: **0** | All 12 synthetic UAT expenses (`EXP-2026-00001` through `EXP-2026-00012`) are `void` or `rejected` (`$0.00` active expenses). |
| `finance_payments` | **2** | `recorded`: **2** (`$3,000.00`) | Two synthetic USD bank-transfer entries of `$1,500.00` each: `PAY-2026-0001` → `INV-UAT04B-1792947702191`; `PAY-2026-0002` → `INV-UAT04B-1792950919321`. Neither is a Paynow payment nor evidence of real bank settlement. |
| `finance_customers` | **23** | `active`: **4** (UAT04B staging partners)<br>`inactive`: **19** (`UAT HealthCorp * Ltd`) | All are staging test customers. Historical UAT HealthCorp rows were deactivated during controlled staging cleanup; `20261030001134` is the applied ledger version of the **canonical** `20261030100000` production-migration-safety source, not a quarantined migration. |
| `finance_journal_entries` | **41** | `posted`: **24** (55 lines)<br>`reversed`: **17** (41 lines) | Immutable double-entry journal ledger. |

### 4.2 Posted-Only vs. Reversal-Inclusive Trial Balance Reconciliation
- **Posted-Only Journal Lines (24 `posted` entries / 55 lines):**
  - `POSTED_JOURNAL_DEBITS_USD = $22,400.00`
  - `POSTED_JOURNAL_CREDITS_USD = $22,400.00`
  - Comprises current active synthetic UAT invoices/payments plus reversing entries that zeroed out earlier UAT expense and voided-invoice journals.
- **Posted + Reversed Journal Lines (41 `posted` + `reversed` entries / 96 lines — reported by `finance_get_trial_balance`):**
  - `POSTED_AND_REVERSED_DEBITS_USD = $31,300.00`
  - `POSTED_AND_REVERSED_CREDITS_USD = $31,300.00`
  - `is_balanced = true` across all 13 Chart of Accounts buckets. The `$8,900.00` difference between `$31,300.00` and `$22,400.00` consists of the 17 original `reversed` journal entries whose offsetting reversal entries are in `posted` status.
- **Net Financial Statements on Staging (Synthetic UAT Balances):**
  - **Balance Sheet (`finance_get_balance_sheet`):** Total Assets = **`$10,500.00`** (`1000 Cash and Cash Equivalents`: `$3,000.00`; `1100 Accounts Receivable — Trade`: `$7,500.00`) = Total Liabilities (**`$0.00`**) + Total Equity / Current Period Net Surplus (**`$10,500.00`**). `is_balanced = true`.
  - **Profit & Loss (`finance_get_profit_and_loss`):** Total Revenue = **`$10,500.00`** (`4000 Advertising Revenue — Digital`: `$4,500.00`; `4010 Sponsored Content & Supplements`: `$6,000.00`), Total Expenses = **`$0.00`**, Net Operating Surplus = **`$10,500.00`**.
- **Production migration exclusion policy:** The two quarantined **source files** are `20261029080000_ht_mvp_com_final01_r2_r2_financial_fixture_reconciliation.sql` and `20261029090000_ht_mvp_com_final01_r2_r3_security_privilege_remediation.sql`, recorded in the Staging ledger under versions `20261029131047` and `20261029142840`, respectively. The source migrations `20261029070000_ht_mvp_com_final01_r2_r1_invoice_line_casing_tolerance.sql` and `20261030100000_ht_mvp_rel_com01_production_migration_safety.sql` are **canonical**, not quarantined; the latter was applied in Staging as ledger version `20261030001134`. The approved 108-migration Production plan excludes the two quarantined source files. **Execution-scope limitation:** the attested disposable run applied six incremental Commercial migrations after seeding a constructed baseline; full fresh replay of all 108 migrations and any future Production database state remain unverified and unauthorized.

---

## 5. Available Client Access Paths (Staging Preview)

> **Access Note:** Because Vercel Deployment Protection (`all_except_custom_domains`) is enforced on `healthtimes-staging`, accessing the Preview URL requires either logging in via an authorized Vercel team session or supplying the rotated `x-vercel-protection-bypass` credential stored in the local operator secret store (`~/.healthtimes-secrets/vercel-bypass`).

| Surface / Persona | Access URL | Authentication Required | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Public Reader** | `https://healthtimes-staging-czazp4yi8-11-11.vercel.app/` | Preview Protection + Public | Dual-feed browsing, article reading, dark mode, audio player, sitemap. |
| **Staff Sign-In Portal** | `https://healthtimes-staging-czazp4yi8-11-11.vercel.app/account-access` | Magic Link or Password | Newsroom session authentication, staff profile loading, role routing. |
| **Newsroom Operating Room**| `https://healthtimes-staging-czazp4yi8-11-11.vercel.app/studio` | Staff Session | 7-desk control room (Editorial, Review, Audience, Ads, Finance, Staff, Settings). |
| **Owner Bootstrap Route** | `https://healthtimes-staging-czazp4yi8-11-11.vercel.app/studio/activate` | `kudzimusar@gmail.com` | Already active on Staging; used for first-owner bootstrap on new environments. |
| **Build Info & Custody** | `https://healthtimes-staging-czazp4yi8-11-11.vercel.app/build-info.json` | Bypass Header / Vercel Auth | Exact SHA custody verification (`126f81c65e24d30167deb21c06c598e39bf8ea10`). |

---

## 6. Staff Role & Segregation of Duties Guide

HealthTimes 2.0 enforces Role-Based Access Control (RBAC) through capability-checked `SECURITY DEFINER` RPCs and Row-Level Security:

1. **Editorial vs. Commercial/Finance:** Journalists and Editors cannot create commercial orders, issue invoices, or query financial statements.
2. **Commercial vs. Finance Statement Separation:** Commercial Managers can manage `advertisers` and `commercial_list_orders`, but are rejected with HTTP/SQL `42501` (`finance.statement.view capability required`) if they invoke `finance_get_trial_balance`, `finance_get_balance_sheet`, or `finance_get_profit_and_loss`.
3. **Order Creation vs. Order Approval:** Commercial Managers cannot self-approve orders where they are the creator.
4. **Invoicing & Expense Controls:** Only Finance Managers or Publishers hold `finance.invoice.approve`, `finance.expense.approve`, and `finance.journal.reverse` capabilities.

---

## 7. Known Limitations & Paynow Parallel-Track Boundary

### 7.1 External Provider Boundaries
1. **Meta WhatsApp Cloud API:** Broadcast dispatches compose, validate, and stage in `broadcast_dispatches`. Live outbound transmission requires a client-provisioned Meta Business System User Token.
2. **Brevo Email Service:** Newsletter digests compose and preview in HTML. Outbound email delivery requires client DNS configuration (`SPF`, `DKIM`, `DMARC`) and a live Brevo API key.
3. **Apple Push (APNs) & Google Play (FCM):** Native mobile push notifications require client enrollment in Apple Developer Program and Google Play Console.
4. **Self-Service Advertiser Portal:** Deferred to V1.1. Ad campaigns are booked by newsroom commercial staff and invoiced via the Finance Desk.

### 7.2 Paynow USD-First Parallel-Track Boundary
```text
USD_PRIORITY=PRIMARY
ZIG_PRIORITY=SECONDARY
TEST_CURRENCY_MISMATCH=EXPLAINED
LIVE_USD_PAYMENT_CERTIFIED=NO
PAYNOW_PUBLIC_CHECKOUT=DISABLED
REAL_MONEY_TEST_REQUIRES_OWNER_AUTHORIZATION=YES
```
- Automated public Paynow checkout is **DISABLED** (`PAYNOW_CHECKOUT_AVAILABLE=NO`).
- Live USD payment certification requires live Paynow Zimbabwe USD merchant credentials and explicit Owner authorization for real-money transaction testing.

---

## 8. External Release Gates Prior to Production Promotion

Before any promotion from Staging to Production is authorized, the following six external gates must be satisfied:

| External Gate | Governing Authority | Current Status | Required Action |
| :--- | :--- | :---: | :--- |
| **1. Human Owner Physical UAT & Sign-Off** | Human Owner (Kudzai Musarurwa) | **PENDING (`NOT_EXECUTED`)** | Complete physical browser UAT in `HT-MVP-OWNER-UAT.md` using `kudzimusar@gmail.com` and sign Section 10 below. |
| **2. Legal Counsel Gate** | Independent Legal Counsel | **NOT_EVIDENCED — REVIEW_REQUIRED** | Formal legal sign-off on defamation policy, ZMC compliance, and medical disclaimers. |
| **3. Tax & Audit Gate** | Certified Public Accountant (CPA) | **NOT_EVIDENCED — REVIEW_REQUIRED** | Formal accountant sign-off on 13-account Chart of Accounts, VAT treatment, and double-entry rules. |
| **4. Data Protection Gate** | Data Protection Officer (DPO) | **NOT_EVIDENCED — REVIEW_REQUIRED** | Formal DPO sign-off under Zimbabwe Cyber and Data Protection Act [Chapter 12:07]. |
| **5. Production Domain & DNS** | Client DNS Administrator | **PENDING DNS PROVISIONING** | Point `healthtimes.co.zw` DNS records to authorized production endpoints after promotion approval. |
| **6. Paynow Live USD Credentials** | Paynow Zimbabwe & Client | **PENDING LIVE CREDENTIALS** | Supply live USD merchant keys and authorize supervised live USD transaction test. |

---

## 9. Security, Backup, Monitoring & Recovery Responsibilities

- **Credential Hygiene:** Zero plain-text tokens, passwords, or bypass secrets are permitted in repository source or documentation. Automated regression tests (`tests/release/client-readiness-security.test.mjs`) scan tracked files for secret patterns and verify fail-closed session revocation.
- **Database Recovery (PITR) & Audit Trail:** Documented in `docs/delivery/HT-MVP-BACKUP-RECOVERY.md` and `docs/delivery/HT-MVP-INCIDENT-RUNBOOK.md`. All sensitive role, session, and ledger actions are immutably logged in `public.audit_logs`.

---

## 10. Formal Client Delivery Sign-Off Certificate (UNSIGNED — FOR HUMAN OWNER COMPLETION)

> **Instruction:** This certificate must remain **unsigned** (`[ ]` unchecked and `( )` unselected) until the Human Owner (`kudzimusar@gmail.com`) personally completes physical UAT and records their disposition.

```text
================================================================
HEALTHTIMES 2.0 FORMAL CLIENT ACCEPTANCE CERTIFICATE
================================================================
Programme:              HealthTimes 2.0 — Final Unified MVP
Governing Unit:         HT-MVP-CLIENT-READINESS-01-R1-FINAL
Governing Standard:     11-11 Tech UDPCS 1.0 Professional Standard
Repository:             kudzimusar/htp-zw
Accepted Governance:    3df501f8280ac6e983f3f640b70dc049626aa52b
Application Preview:    https://healthtimes-staging-czazp4yi8-11-11.vercel.app (126f81c6)
Staging Database:       bzuvntbkevvuhfhqhkua (110 migrations applied)

CLIENT ACCEPTANCE CHECKLIST (TO BE COMPLETED BY HUMAN OWNER):
[ ] Reader mobile & responsive web experience physically inspected by Owner.
[ ] 7-Desk Newsroom Operating System physically inspected by Owner.
[ ] Role-Based Access Control (RBAC) and role separation reviewed by Owner.
[ ] Staging General Ledger reconciliation ($22.4k posted / $31.3k reversal-inclusive synthetic UAT fixtures; $0 realized revenue) reviewed by Owner.
[ ] Non-destructive RPC & Preview custody verification output reviewed by Owner.
[ ] Standard Operating Procedures (SOP) and Disaster Recovery runbooks received.
[ ] External Release Gates, Provider Boundaries, and Paynow USD restrictions acknowledged.

ACCEPTANCE DISPOSITION (SELECT ONE):
( ) ACCEPTED WITHOUT RESERVATIONS
( ) ACCEPTED SUBJECT TO EXTERNAL GATES (LEGAL, TAX/CPA, DPO, DNS, PAYNOW LIVE USD)
( ) REJECTED (SPECIFY BLOCKERS BELOW)

Client Authorized Representative: ______________________________
Designation:                      Product Owner / Publisher
Signature:                        ______________________________
Date:                             ______________________________
================================================================
```
