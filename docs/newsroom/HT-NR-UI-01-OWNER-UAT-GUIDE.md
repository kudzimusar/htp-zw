# HealthTimes Newsroom OS — Owner UAT & Walkthrough Guide

**Document Reference:** `HT-NR-UI-01-OWNER-UAT-GUIDE`  
**Programme:** HealthTimes Newsroom OS (HT-NR)  
**Status:** Certified Implementation Architecture  
**Release Target:** Wave UI-01 Pre-Launch Convergence  

---

## 1. Introduction

Welcome to the HealthTimes Newsroom Operating System. This guide provides a hands-on walkthrough for the Owner and executive leadership to physically inspect and operate the converged Newsroom across all seven departments.

---

## 2. Launching the Owner Preview

The Owner Preview provides an interactive, full-fidelity inspection environment running on local development/staging servers with zero risk of mutating production data.

1. **Preview URL:** Open [http://localhost:8099/owner-preview/studio](http://localhost:8099/owner-preview/studio) in your desktop browser.
2. **Persistent Watermark:** Note the prominent preview banner at the top of the screen confirming that the session is running in safe preview mode.

---

## 3. Departmental Tour via the Persona Switcher

At the top of the preview interface, observe the **Interactive Persona Switcher** with 7 role pills:

### Step 1: Publisher / Owner (`owner`)
- **Action:** Click the `Publisher / Owner` pill.
- **Identity:** Avatar `KM` • Kudzi Musarurwa • `@kudzi` • Executive Suite.
- **Observation:** Notice that all seven navigation domains are unlocked:
  - `1. MY WORK`
  - `2. EDITORIAL`
  - `3. AUDIENCE & MARKETING`
  - `4. COMMERCIAL`
  - `5. FINANCE & ACCOUNTING`
  - `6. PUBLISHER / EXECUTIVE`
  - `7. ADMINISTRATION`
- **Action:** Click `5. FINANCE & ACCOUNTING` in the sidebar. Inspect the financial KPIs, billing invoices, AR aging buckets, payments, and newsroom expenses.

### Step 2: Senior Reporter (`reporter`)
- **Action:** Click the `Senior Reporter` pill.
- **Identity:** Avatar `TN` • Tariro Nyathi • `@tariro` • Health Investigations.
- **Observation:** Notice the immediate role boundary enforcement:
  - `4. COMMERCIAL`, `5. FINANCE & ACCOUNTING`, `6. PUBLISHER / EXECUTIVE`, and `7. ADMINISTRATION` are locked with red `LOCKED` badges.
  - Attempting to click into Finance displays a role boundary banner:
    `"Role Boundary: 'Senior Reporter' does not have authority for 5. FINANCE & ACCOUNTING. Switch persona via the switcher bar above to inspect this workspace."`
- **Action:** Click into `Story Workspace / Drafts`. Observe the reporter's personal draft queue and research tools.

### Step 3: Managing Editor (`editor`)
- **Action:** Click the `Managing Editor` pill.
- **Identity:** Avatar `FM` • Farai Moyo • `@farai` • Editorial Board.
- **Observation:** Editorial workspace is unlocked:
  - Open `Review Queue`. Inspect stories pending fact-checking, legal review, and triage.
  - Open `Planning Board`. Review the news budget and assignment workflows.
  - Open `Homepage Curation`. Inspect the hero story slot and edition placements.

### Step 4: Audience & Growth Manager (`marketer`)
- **Action:** Click the `Audience & Growth Manager` pill.
- **Identity:** Avatar `CC` • Chipo Chidzero • `@chipo` • Audience Desk.
- **Observation:** Unlocked access to `3. AUDIENCE & MARKETING`:
  - Open `Push Alerts Desk`. Inspect breaking news alert preparation and category targeting.
  - Open `Newsletter Desk`. Review editorial digest campaigns and audience distribution.
  - Open `WhatsApp Desk`. Inspect community health broadcast messages.

### Step 5: Commercial Director (`commercial_manager`)
- **Action:** Click the `Commercial Director` pill.
- **Identity:** Avatar `TM` • Tendai Mutasa • `@tendai` • Commercial Desk.
- **Observation:** Unlocked access to `4. COMMERCIAL`:
  - Open `Corporate Customers`. Review pharmaceutical, hospital, and NGO advertising clients.
  - Open `Commercial Orders`. Inspect active ad insertion orders, start/end dates, and billing links.

### Step 6: Head of Finance & Accounting (`finance_officer`)
- **Action:** Click the `Finance Officer` pill.
- **Identity:** Avatar `RN` • Rudo Ndlovu • `@rudo` • Finance Desk.
- **Observation:** Full operational control over `5. FINANCE & ACCOUNTING`:
  - Inspect the Invoices table: review `draft`, `approved`, `issued`, and `paid` states.
  - Click the **Aging** tab: observe the 30/60/90-day overdue receivables distribution.
  - Click the **Payments** tab: inspect immutable payment receipt entries.
  - Click the **Newsroom Expenses** tab: review submitted journalist claims, approve pending claims, and disburse reimbursements.
  - Click the **Statements** tab: review the income statement showing net operating surplus.

### Step 7: Platform Administrator (`admin`)
- **Action:** Click the `Platform Administrator` pill.
- **Identity:** Avatar `ST` • Simbarashe Taderera • `@simba` • System Admin.
- **Observation:** Full operational control over `7. ADMINISTRATION`:
  - Open `Staff & Roles`. Review the staff directory, pending email invitations, and capability grants.
  - Open `Active Sessions & Audit`. Inspect active tokens and security logs.

---

## 4. Staging First-Owner Bootstrap Procedure

When deploying to a live Staging environment, the initial Owner account is bootstrapped using the secure database procedure:

1. **Staging Invitation Ready:** Database migration `20261021010000_ht_nr_ui01_first_owner_bootstrap.sql` has already provisioned a root invitation on staging database `gcdohgbmqhqwydgaxrcr`:
   - Target Email: `kudzimusar@gmail.com`
   - Invitation Token: `3c277c48-5319-429f-a2c3-1bf2dbae4c2a`
   - Role: `Publisher / Owner`
   - Status: `pending`
2. **First Login:** When Kudzi signs into HealthTimes Staging via Supabase Auth using `kudzimusar@gmail.com`, trigger `newsroom_sync_staff_from_auth()` automatically claims the invitation and elevates the user to the active Owner.
3. **Fail-Closed Security:** Once Kudzi is active, `newsroom_bootstrap_owner()` permanently locks down and will reject any further bootstrap calls with an exception.

---

## 5. Verification Checklist for Owner Sign-Off

- [x] All 7 domains clearly identified and navigable.
- [x] Persistent Staff Identity Header visible on every screen.
- [x] Persona Switcher accurately toggles between all 7 roles.
- [x] Role boundary lockouts enforce separation of duties.
- [x] Finance desk fully operational with Invoices, AR Aging, Payments, Expenses, and Operating Statements.
- [x] Staging runtime zero-state maintained (no fabricated transactions in staging database).
- [x] 100% of TypeScript checks and unit tests passing.
