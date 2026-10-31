# HealthTimes 2.0 — Owner User Acceptance Testing (UAT) Pack
## Interactive Physical Verification Protocol & Unsigned 7-Persona Checklist for the Human Owner

- **Document ID:** `HT-MVP-OWNER-UAT`
- **Unit ID:** `HT-MVP-CLIENT-READINESS-01-R1-FINAL`
- **Programme:** HealthTimes 2.0 — Final Unified MVP
- **Accepted Release-Governance Authority SHA:** `3df501f8280ac6e983f3f640b70dc049626aa52b`
- **Application Preview SHA:** `126f81c65e24d30167deb21c06c598e39bf8ea10`
- **Application Preview Deployment:** `dpl_F17gteDKYCS2w7J5CtZfJBFihKw5`
- **Application Preview URL:** `https://healthtimes-staging-czazp4yi8-11-11.vercel.app`
- **Staging Supabase:** `bzuvntbkevvuhfhqhkua` (`20261030001134`, 110 applied migrations)
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Section 45
- **Human Owner Execution Status:** `NOT_EXECUTED — PENDING HUMAN OWNER WALKTHROUGH`

---

## 1. Owner UAT Protocol, Access & Truthful State Disclosure

This document is the **executable interactive UAT runbook** for the Human Owner (`kudzimusar@gmail.com`) across all **seven operational personas**.

### 1.1 Verified Staging Owner Account & Session State
- **Primary Owner Account:** `kudzimusar@gmail.com`
- **Staging Account Status:** `OWNER_ACCOUNT_EXISTS=YES`, `OWNER_PUBLISHER_ROLE_ACTIVE=YES` (`status = 'active'` in `public.staff_profiles`, role `Publisher / Owner` active in `public.staff_role_assignments`, email confirmed `2026-10-23`, last sign-in `2026-10-26`, `14` active `newsroom_sessions` and `1` active `auth.sessions` preserved).
- **Important Distinction:** On Staging (`bzuvntbkevvuhfhqhkua`), the Owner account and `Publisher / Owner` role are already active and do **not** require first-time account creation. However, **Human Owner physical UAT across the 7 personas has not yet been signed off (`OWNER_PHYSICAL_UAT_COMPLETED=NO`, `OWNER_CLIENT_ACCEPTANCE_SIGNED=NO`).**
- **Preview Access:** `https://healthtimes-staging-czazp4yi8-11-11.vercel.app` is protected by Vercel Preview Protection (`all_except_custom_domains`). Access requires an authenticated Vercel session or the rotated `x-vercel-protection-bypass` secret (fingerprint `0fb0100c3825`, stored outside the repository in `~/.healthtimes-secrets/vercel-bypass`).

### 1.2 Separation of Specialist/RPC Evidence vs. Human Owner Sign-Off
Each test row below includes two distinct status columns:
1. **Specialist / Automated Pre-Verification:** Records whether the journey has been verified via unit tests, non-destructive RPC verification (`scripts/release/owner-acceptance-demonstration.mjs`), or prior specialist Playwright browser certification (`HT-MVP-COM-FINAL-01-R2-R2` / `phase12-canonical-uat`).
2. **Human Owner UAT Status:** Left strictly unchecked (`[ ] PENDING_OWNER`) until the Human Owner personally executes and accepts each step.

---

## 2. Seven-Persona Interactive Acceptance Checklists

---

### Persona 1: Anonymous & Registered Healthcare Reader

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Specialist / Automated Pre-Verification | Human Owner UAT Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **UAT-R01** | Feed Discovery | Open Home screen (`/`); refresh feed. | Header shows date, curated hero lead story, and chronological latest health feed (`5,786` indexed public URLs via `ag05_public_sitemap_xml`). | Draft articles are invisible to anonymous readers. | PASS (RPC + Playwright `phase12`) | `[ ]` PENDING_OWNER |
| **UAT-R02** | Category Drilldown | Select a category/section pill on the Reader navigation bar. | Feed filters to stories in that section with active category indicator. | URL/route updates cleanly without broken state. | PASS (Playwright `phase12`) | `[ ]` PENDING_OWNER |
| **UAT-R03** | Article Reading & Teaser Gating | Open a published story card; inspect free vs. premium teaser state. | Public stories render full body; premium teaser RPC (`ag05_public_story_teaser_document`) masks `body_html` as `null` for non-subscribers. | Invalid slugs return clean not-found state; no SQL/stack exposure. | PASS (RPC + Playwright `HT-MVP-COM-FINAL-01-R2-R2`) | `[ ]` PENDING_OWNER |
| **UAT-R04** | Bookmark & Offline Cache | Tap bookmark icon on an article; open 'Saved' view. | Bookmarked article appears in Saved list and persists locally. | Local storage isolates saved reader state. | PASS (Automated suite) | `[ ]` PENDING_OWNER |
| **UAT-R05** | Audio Journalism Player | Open 'Listen' / audio control; toggle play/pause. | Audio player bar renders with playback and scrubber controls. | Media loads over HTTPS only. | PASS (Automated suite) | `[ ]` PENDING_OWNER |
| **UAT-R06** | Dark Mode Toggle | Toggle theme control in Reader header/drawer. | Interface switches to contrast-compliant dark mode and persists. | Theme preference persists across page reload. | PASS (Playwright `phase12`) | `[ ]` PENDING_OWNER |

---

### Persona 2: Staff Beat Journalist

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Specialist / Automated Pre-Verification | Human Owner UAT Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **UAT-J01** | Staff Authentication | Sign in at `/account-access` as Staff Journalist; open `/studio`. | Authenticated session opens Editorial Desk. | Cannot access Finance or Commercial approval actions. | PASS (Playwright `phase12`) | `[ ]` PENDING_OWNER |
| **UAT-J02** | Story Drafting | Create a draft story with headline, summary, body, and section. | Live word/character counters update; draft saves cleanly. | Rich text inputs sanitized against script injection. | PASS (Playwright `phase12`) | `[ ]` PENDING_OWNER |
| **UAT-J03** | Media Attachment | Attach a hero image with caption and credit metadata. | Image preview and attribution fields save with the draft. | Only permitted image MIME types accepted. | PASS (Automated + Playwright) | `[ ]` PENDING_OWNER |
| **UAT-J04** | Submit to Review | Submit draft to the editorial review queue. | Story status transitions to `in_review`. | Journalist cannot self-publish directly to the live site. | PASS (Playwright `phase12`) | `[ ]` PENDING_OWNER |

---

### Persona 3: Desk Editor / Copy Editor

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Specialist / Automated Pre-Verification | Human Owner UAT Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **UAT-E01** | Review Queue Inspection | Open 'Review Queue' in `/studio`; inspect submitted drafts. | Pending drafts display author, section, and submission timestamp. | Unauthorized roles cannot view or mutate review queue. | PASS (Playwright `phase12`) | `[ ]` PENDING_OWNER |
| **UAT-E02** | Copy Editing & Revisions | Edit headline/body of a draft in review; save revision note. | Revision is recorded with editor attribution in `article_revisions`. | Immutable revision history preserved. | PASS (Automated + Playwright) | `[ ]` PENDING_OWNER |
| **UAT-E03** | Story Approval & Publication | Approve and publish a reviewed story. | Status transitions to `published` (`publication_status = 'published'`); story appears on Reader. | Publication contract synchronizes `status` and `publication_status`. | PASS (Unit + Playwright `HT-MVP-REL-COM-01-R1`) | `[ ]` PENDING_OWNER |
| **UAT-E04** | Homepage Lead Curation | Pin a published story to the Homepage Hero Lead slot. | Reader home view updates lead story placement. | Homepage curation restricted to Editor/Publisher capabilities. | PASS (Playwright `phase12`) | `[ ]` PENDING_OWNER |

---

### Persona 4: Audience Engagement & Social Specialist

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Specialist / Automated Pre-Verification | Human Owner UAT Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **UAT-A01** | WhatsApp Broadcast Draft | Open Audience Desk → WhatsApp; select a published story. | Broadcast message preview populates with headline, summary, and link. | Payload validated against message length limits. | PASS (Automated suite) | `[ ]` PENDING_OWNER |
| **UAT-A02** | WhatsApp Queue Staging | Stage broadcast into `broadcast_dispatches`. | Job records as `staged` in database queue (live outbound Meta API requires client token). | Logged in audit trail; external dispatch gated until Meta token configured. | PASS (Automated suite; live provider `BLOCKED` pending token) | `[ ]` PENDING_OWNER |
| **UAT-A03** | Newsletter Digest Staging | Compose Weekly Healthcare Digest preview in Newsletter tab. | Responsive HTML digest preview renders with unsubscribe footer. | Outbound email gated until client DNS (`SPF`/`DKIM`/`DMARC`) and Brevo key configured. | PASS (Automated suite; live provider `BLOCKED` pending key) | `[ ]` PENDING_OWNER |
| **UAT-A04** | Push Alert Staging | Compose breaking health alert preview in Push tab. | Notification preview card renders; secondary confirmation required before staging. | Native APNs/FCM delivery gated until Apple/Google store keys configured. | PASS (Automated suite; live provider `BLOCKED` pending keys) | `[ ]` PENDING_OWNER |

---

### Persona 5: Commercial & Ad Operations Specialist (`uat-commercial@healthtimes.test`)

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Specialist / Automated Pre-Verification | Human Owner UAT Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **UAT-C01** | Advertiser Directory | Sign in as Commercial Manager; inspect Advertisers list. | Registered advertiser(s) display cleanly (`1` active staging advertiser verified via RPC). | Direct table/RPC access restricted to authorized commercial/finance staff. | PASS (RPC + Playwright `HT-MVP-COM-FINAL-01-R2-R2`) | `[ ]` PENDING_OWNER |
| **UAT-C02** | Commercial Orders Inspection | Inspect Commercial Orders list (`commercial_list_orders`). | Staging shows `16` synthetic UAT orders, all `cancelled` (`0` uncancelled). | Creator cannot self-approve their own commercial order. | PASS (RPC + Playwright `HT-MVP-COM-FINAL-01-R2-R2`) | `[ ]` PENDING_OWNER |
| **UAT-C03** | Campaign & Creative Management | Inspect ad campaigns, zones, and creative asset configuration. | Campaign schedule and creative zone assignments render in Commercial Desk. | Destination URLs validated for HTTPS; Commercial Manager blocked from `finance_get_trial_balance` (`42501`). | PASS (RPC + Playwright `HT-MVP-COM-FINAL-01-R2-R2`) | `[ ]` PENDING_OWNER |
| **UAT-C04** | Ad Telemetry & Session Cleanup | Inspect zone impression/click metrics; sign out of session. | Telemetry view renders; signing out revokes `newsroom_sessions` and `auth.sessions` (`0` lingering sessions). | Session revocation recorded in `public.audit_logs`. | PASS (RPC verifier `HT-MVP-CLIENT-READINESS-01-R1-FINAL`) | `[ ]` PENDING_OWNER |

---

### Persona 6: Finance & Accounting Officer (`uat-finance@healthtimes.test`)

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Specialist / Automated Pre-Verification | Human Owner UAT Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **UAT-F01** | Chart of Accounts & Trial Balance | Sign in as Finance Manager; inspect Trial Balance (`finance_get_trial_balance`). | All `13` accounts render; `is_balanced = true`; reversal-inclusive Debits `$31,300.00` = Credits `$31,300.00` (posted-only journal lines = `$22,400.00`). | Non-finance roles are rejected with `42501: finance.statement.view capability required`. | PASS (RPC + Playwright `HT-MVP-COM-FINAL-01-R2-R2`) | `[ ]` PENDING_OWNER |
| **UAT-F02** | Invoices & Payments Reconciliation | Inspect Invoices (`finance_list_invoices`) and Payments. | Staging shows `12` synthetic UAT invoices (`3` issued = `$7,500`, `2` paid = `$3,000`, `7` void = `$23,200`) and `2` synthetic payments (`$3,000`). | Realized production revenue is `$0.00`; all staging rows are synthetic UAT fixtures. | PASS (RPC + Playwright `HT-MVP-COM-FINAL-01-R2-R2`) | `[ ]` PENDING_OWNER |
| **UAT-F03** | Expenses & Unbalanced Entry Guard | Inspect Expenses (`finance_list_expenses`); verify unbalanced journal guard. | Staging shows `12` synthetic UAT expenses (`11` void, `1` rejected, `0` active). Unbalanced journal entries are rejected by database trigger. | Destructive UAT cleanup RPC (`finance_reconcile_uat_fixtures`) is revoked from `PUBLIC`, `anon`, and `authenticated`. | PASS (RPC + Security R2-R3 verification) | `[ ]` PENDING_OWNER |
| **UAT-F04** | Balance Sheet & Profit & Loss | Open Balance Sheet (`finance_get_balance_sheet`) and P&L (`finance_get_profit_and_loss`). | Balance Sheet balanced: Assets `$10,500.00` (Cash `$3,000` + AR `$7,500`) = Liabilities (`$0`) + Equity (`$10,500`). P&L Net Surplus = `$10,500.00` (synthetic UAT fixtures). | Posted ledger entries cannot be deleted; adjustments require formal reversal journals. | PASS (RPC + Playwright `HT-MVP-COM-FINAL-01-R2-R2`) | `[ ]` PENDING_OWNER |

---

### Persona 7: Executive Publisher & Owner (`kudzimusar@gmail.com`)

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Specialist / Automated Pre-Verification | Human Owner UAT Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **UAT-O01** | Owner Session & Role Verification | Sign in at `/account-access` as `kudzimusar@gmail.com`; open `/studio`. | Account is already active on Staging with `Publisher / Owner` role (`OWNER_ACCOUNT_EXISTS=YES`, `OWNER_PUBLISHER_ROLE_ACTIVE=YES`). | Unconfirmed or non-owner emails are blocked from Publisher bootstrap (`42501`). | PASS (Staging DB inspection + SQL unit tests) | `[ ]` PENDING_OWNER |
| **UAT-O02** | Full 7-Desk Executive Access | Navigate across Editorial, Review, Audience, Commercial, Finance, Staff, and Settings desks. | Publisher / Owner role accesses all desks without capability errors. | RBAC grants full executive visibility while preserving audit attribution. | PASS (Staging role capability matrix verified) | `[ ]` PENDING_OWNER |
| **UAT-O03** | Staff Role Administration | Inspect Staff Directory & Role Assignments in `/studio`. | Active and revoked staff profiles and role assignments are visible and manageable. | Only `Publisher / Owner` can assign or revoke staff roles. | PASS (Automated + Playwright) | `[ ]` PENDING_OWNER |
| **UAT-O04** | Immutable Audit Log Review | Inspect `audit_logs` / Security & Audit trail. | Chronological record of session registrations, revocations, role changes, and ledger reversals is visible. | Audit log table is append-only (`INSERT` via security definer; no staff `DELETE`/`UPDATE`). | PASS (Staging DB inspection) | `[ ]` PENDING_OWNER |

---

## 3. Human Owner UAT Sign-Off Block (UNSIGNED — FOR HUMAN OWNER COMPLETION)

> **Important:** This sign-off block is intentionally blank and unsigned. It may only be completed by the Human Owner (`kudzimusar@gmail.com`) after executing the interactive checklists above.

```text
================================================================
HEALTHTIMES 2.0 HUMAN OWNER UAT SIGN-OFF
================================================================
Programme:               HealthTimes 2.0 — Final Unified MVP
Governing Unit:          HT-MVP-CLIENT-READINESS-01-R1-FINAL
Preview URL Tested:      https://healthtimes-staging-czazp4yi8-11-11.vercel.app (126f81c6)
Staging Database:        bzuvntbkevvuhfhqhkua
Owner Account:           kudzimusar@gmail.com (Publisher / Owner)

Personas Physically Tested by Owner:  ____ of 7
Test Cases Physically Verified:       ____ of 28
Passed:                               ____
Failed / Deferred:                    ____

OWNER DISPOSITION (SELECT ONE):
( ) ACCEPTED — READY FOR CLIENT ACCEPTANCE CERTIFICATE SIGN-OFF
( ) CONDITIONALLY ACCEPTED — SEE OWNER NOTES BELOW
( ) REJECTED — BLOCKERS LISTED BELOW

Owner Notes / Observations:
________________________________________________________________
________________________________________________________________

Human Owner Name:        ______________________________
Signature:               ______________________________
Date:                    ______________________________
================================================================
```
