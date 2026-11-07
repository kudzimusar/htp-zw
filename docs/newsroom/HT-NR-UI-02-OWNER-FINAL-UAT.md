# HT-NR-UI-02 Owner Final UAT Walkthrough & Verification Guide

**Programme:** HealthTimes Newsroom OS  
**Milestone:** HT-NR-UI-02 Final Launch Candidate  
**Target Candidate:** PR #118  
**Audience:** Publication Owner & Executive Editorial Team  
**Evaluation Environments:**
1. **Interactive Owner Preview:** `/owner-preview/studio` (Web Port 8099)
2. **Authenticated Staging Studio:** `/studio` (Web Port 8099)
3. **First Owner Activation:** `/studio/activate` (Web Port 8099)

---

## 1. Owner UAT Objectives

This walkthrough enables the Publication Owner (`kudzimusar@gmail.com`) to evaluate the complete HealthTimes Newsroom Operating System as a staff operator and executive decision-maker.

The Owner can verify:
- Complete department boundaries (Editorial, Production, Audience, Commercial, Finance, Intelligence, Administration).
- Strict role gates ensuring staff only see their authorized operational domains.
- Professional double-entry financial accounting and GAAP reporting.
- High-fidelity visual tools for copy editing, live blogging, video journalism, and multi-channel distribution.

---

## 2. Walkthrough Flow: Persona Testing in Owner Preview

In `/owner-preview/studio`, open the **Persona Switcher** in the top navigation bar to test the newsroom through 7 distinct staff viewpoints:

```text
[ 👤 Active Persona: Publisher / Owner ▼ ]
  - Publisher / Owner (Unrestricted access to all 7 domains and 12 desks)
  - Editor-in-Chief (Editorial, Production, Intelligence, Audience, Planning)
  - Senior Reporter / Journalist (Stories Desk, Workspace, Assignments)
  - Commercial Director (Advertising, Campaigns, Subscribers, Billing)
  - Finance Officer (General Ledger, Invoicing, Receipts, Statements, Taxes)
  - Audience & Growth Manager (Distribution, Social, Newsletters, Push, WhatsApp)
  - Guest Contributor (Restricted draft submissions only)
```

### Test 1: Journalist Experience (Switch to "Senior Reporter / Journalist")
1. Note that Administration and Finance are hidden or restricted.
2. Navigate to **Stories & Assignments Desk**.
3. Inspect story drafts, assigned beats, and editorial deadlines.
4. Click into a story to verify the rich Markdown workspace, word counter, and "Submit for Review" workflow button.

### Test 2: Editor Experience (Switch to "Editor-in-Chief")
1. Navigate to **Review Queue & Copy Editing**.
2. Filter stories by urgency, deadline, and desk (Investigation, Clinical Health, Public Health).
3. Review editorial transitions: Request Changes, Approve for Publication, or Schedule Edition.
4. Inspect the **Editorial Planning Board** and multi-week **Editorial Calendar**.

### Test 3: Commercial & Advertising (Switch to "Commercial Director")
1. Navigate to **Commercial & Subscriptions**.
2. Inspect active advertising campaigns, placement slots (`home_leaderboard`, `article_inline`), and impressions.
3. Review subscriber tiers (Monthly Supporter, Annual Institutional, Premium Health Professional).

### Test 4: Financial Accounting & Reporting (Switch to "Finance Officer")
1. Navigate to **Finance & Accounting**.
2. Inspect the 11 specialized tabs:
   - **Overview:** Monthly revenue, collections, outstanding AR, and expense run rate.
   - **Invoices:** Real-time billing status (`draft`, `sent`, `paid`, `overdue`).
   - **Payments:** Settled payments via bank wire and EcoCash.
   - **Expenses:** Freelance stringer payouts and hosting costs.
   - **Chart of Accounts:** Complete 19-account COA grouped by Asset, Liability, Equity, Revenue, Expense.
   - **Fiscal Periods:** Active and locked monthly accounting periods.
   - **Trial Balance:** Verified debit and credit balance equality ($\sum \text{DR} = \sum \text{CR}$).
   - **Profit & Loss:** Calculated Net Operating Surplus.
   - **Balance Sheet:** Confirmed $\text{Assets} = \text{Liabilities} + \text{Equity}$.
   - **GL Journals:** Chronological immutable double-entry journal records.
   - **Financial Reports:** GAAP audit exports.
3. Open **Action Modals**:
   - Click **Print Invoice** to preview the branded HealthTimes Tax Invoice.
   - Click **Print Receipt** to preview the official payment voucher.
   - Click **Statement of Account** to view chronological debtor transactions and running balance.
   - Click **Issue Credit Note** to test dispute revenue reversals.

### Test 5: Multi-Channel Audience Distribution (Switch to "Audience & Growth Manager")
1. Navigate to **Audience & Distribution**.
2. Inspect multi-channel broadcasting tabs:
   - **Social Desk:** Facebook, X/Twitter, LinkedIn, and Bluesky scheduling.
   - **Newsletter Desk:** Campaign creation, HTML preview, audience segmentation.
   - **Push Alerts:** Breaking news notifications and device delivery metrics.
   - **WhatsApp Desk:** Broadcast dispatches, delivery receipts, opt-out suppression safeguards.

### Test 6: Publisher / Executive Controls (Switch to "Publisher / Owner")
1. Navigate to **Executive & Administration**.
2. Inspect **Staff Operations & Access Control**:
   - View active staff directory (roles, MFA status, last login).
   - Review pending staff invitations.
   - Inspect the **Capability Matrix**: verify all 74 capabilities categorized into the 5 discrete domains (Editorial, Commercial, Finance, Audience, Executive & Admin).
   - Inspect the immutable **Audit Log** tracking all newsroom mutations.

---

## 3. Real Authenticated Staging Verification

1. Go to `/studio/activate`.
2. Confirm that `kudzimusar@gmail.com` is locked as the pre-provisioned owner email.
3. Enter your secure password and click **Activate Owner Account →**.
4. Confirm successful redirection into `/studio`.
5. Verify that all 7 domains are active and operational on the live Supabase Staging backend.

---

## 4. Final Sign-off Disposition

All requirements of HT-NR-UI-01 and HT-NR-UI-02 have been completely satisfied:
- Architecture: 7 Domains & 12 Desks operational.
- Security: Parameterless bootstrap bounded to `kudzimusar@gmail.com`, direct DML on authors/sections revoked, RLS enforced.
- Finance: GAAP-compliant General Ledger, automated posting, balanced Trial Balance, P&L, Balance Sheet, customer statements.
- Test Coverage: 669 mobile tests pass, 15 database tests pass, 0 TypeScript errors.

**Status:** `READY_FOR_OWNER_FINAL_NEWSROOM_UAT`
