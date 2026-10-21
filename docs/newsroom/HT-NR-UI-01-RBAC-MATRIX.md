# HealthTimes Newsroom OS — Role-Based Access Control (RBAC) Matrix

**Document Reference:** `HT-NR-UI-01-RBAC-MATRIX`  
**Programme:** HealthTimes Newsroom OS (HT-NR)  
**Status:** Certified Implementation Architecture  
**Release Target:** Wave UI-01 Pre-Launch Convergence  

---

## 1. Role Taxonomy

HealthTimes Newsroom OS enforces 7 discrete staff personas representing the real operating departments of an independent news organization:

| Role Identifier | Role Title | Primary Desk | Description |
|---|---|---|---|
| `owner` | Publisher / Owner | Executive Suite | Unrestricted executive authority across all editorial, commercial, finance, and administrative domains. |
| `editor` | Managing Editor | Editorial Board | Oversees the news agenda, manages review queue, assigns stories, fact-checks, and publishes stories. |
| `reporter` | Senior Reporter | Investigative / Health | Researches stories, writes drafts, files expense claims, and manages personal assignments. |
| `marketer` | Audience & Growth Manager | Audience & Marketing | Authors newsletters, schedules push alerts, manages WhatsApp broadcasts, and executes social distribution. |
| `commercial_manager` | Commercial Director | Commercial & Revenue | Manages corporate customers, books ad insertion orders, approves creatives, and configures rate cards. |
| `finance_officer` | Head of Finance & Accounting | Finance Desk | Issues corporate invoices, tracks AR aging, records immutable payments, approves/pays expenses, and prepares operating statements. |
| `admin` | Platform Administrator | System Admin | Provisions newsroom staff, manages RBAC role assignments, reviews security sessions, and configures platform settings. |

---

## 2. Granular Capability Catalog

Every privileged action in HealthTimes Newsroom OS is controlled by an explicit server capability token:

```
EDITORIAL CAPABILITIES:
  • story.create                    Create draft stories
  • story.edit                      Edit existing story content
  • story.fact_check                Review, triage, and verify stories in Review Queue
  • story.publish                   Publish stories immediately or schedule publication
  • assignment.manage               Create and manage editorial assignments & planning
  • media.manage                    Upload, curate, and promote media in Media Library
  • communication.desk.manage       Manage specialist editorial desk rooms
  • communication.breaking.manage   Manage breaking news coordination rooms

AUDIENCE & MARKETING CAPABILITIES:
  • campaign.manage                 Create and schedule multi-channel campaigns
  • campaign.send                   Approve and trigger campaign dispatches
  • audience.view                   Inspect audience segments and contact lists
  • audience.manage                 Create and curate audience segments

COMMERCIAL CAPABILITIES:
  • commercial.order.create         Draft client insertion orders
  • commercial.order.approve        Approve and execute insertion orders (Separation of Duties)
  • commercial.campaign.manage      Manage ad campaigns and creatives
  • commercial.rates.manage         Configure rate cards and pricing schedules

FINANCE & ACCOUNTING CAPABILITIES:
  • finance.view                    Inspect basic financial summaries and billing customers
  • finance.invoice.create          Draft new corporate invoices
  • finance.invoice.approve         Approve draft invoices for issuance (Creator != Approver)
  • finance.invoice.issue           Issue approved invoices to corporate clients
  • finance.payment.record          Record immutable payment receipts against open invoices
  • finance.aging.view              Access aged accounts receivable breakdown
  • finance.statement.view          Access multi-currency income and operating statements
  • finance.expense.submit          Submit operational expense claims
  • finance.expense.view            Inspect expense claim register
  • finance.expense.approve         Approve submitted expense claims (Submitter != Approver)
  • finance.expense.pay             Disburse payment for approved expense claims

ADMINISTRATIVE & GOVERNANCE CAPABILITIES:
  • staff.view                      Inspect newsroom staff roster and invitations
  • staff.manage                    Invite new staff, assign roles, and revoke access
  • settings.manage                 Configure system-wide settings and integrations
  • security.view_sessions          Inspect active staff sessions and revoke credentials
  • analytics.view                  Access high-level intelligence and business metrics
  • comment.moderate                Moderate verified-reader discussion comments
```

---

## 3. Domain Access Matrix by Role

| Domain / Workspace | Publisher / Owner | Managing Editor | Senior Reporter | Audience Manager | Commercial Manager | Finance Officer | Platform Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. MY WORK** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **2. EDITORIAL** | ✅ | ✅ | ⚠️ (Drafts only) | ❌ | ❌ | ❌ | ❌ |
| **3. AUDIENCE & MARKETING** | ✅ | ⚠️ (Read-only) | ❌ | ✅ | ❌ | ❌ | ❌ |
| **4. COMMERCIAL** | ✅ | ❌ | ❌ | ❌ | ✅ | ⚠️ (Orders view) | ❌ |
| **5. FINANCE & ACCOUNTING**| ✅ | ❌ | ❌ | ❌ | ⚠️ (Billing view) | ✅ | ❌ |
| **6. PUBLISHER / EXECUTIVE**| ✅ | ⚠️ (Homepage) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **7. ADMINISTRATION** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

*Legend: ✅ Full Access | ⚠️ Restricted / Scoped Access | ❌ Access Locked by Server Capability Gate*

---

## 4. Separation of Duties (Four-Eyes Principle)

To safeguard corporate integrity and comply with accounting audit standards, the database layer strictly enforces separation of duties:

1. **Invoice Creation vs Approval:**
   - RPC `newsroom_approve_invoice(p_invoice_id)` verifies that `auth.uid() != created_by`.
   - A commercial officer cannot draft and self-approve an invoice.
2. **Expense Submission vs Approval:**
   - RPC `newsroom_approve_expense(p_expense_id)` verifies that `staff_id != submitted_by`.
   - A journalist or editor cannot self-approve their own travel or reporting expense claim.
3. **Approval vs Payment Disbursement:**
   - Only staff holding `finance.expense.pay` can execute `newsroom_pay_expense`.
4. **Immutable Payment Receipts:**
   - Once a payment is recorded via `newsroom_record_payment`, it cannot be edited, overwritten, or deleted. Any correcting entry must be a separate, auditable transaction.

---

## 5. First-Owner Bootstrap Architecture

To eliminate the bootstrap deadlock where a fresh staging environment has zero staff members and therefore nobody holds `staff.manage` to invite the first user:

1. **Migration `20261021010000_ht_nr_ui01_first_owner_bootstrap.sql`** defines `newsroom_bootstrap_owner(p_email, p_display_name)`.
2. **Fail-Closed Security Check:** The function queries `SELECT COUNT(*) FROM staff_profiles WHERE active = true`. If ANY active staff member already exists, the function immediately raises an exception:
   `'Cannot bootstrap owner: an active staff profile already exists'`.
3. **Invitation Provisioning:** If active staff count is 0, the function generates a root invitation with `role = 'owner'` and `capabilities = ALL`.
4. **Trigger Linking:** When the user with that email signs in via Supabase Auth, trigger `newsroom_sync_staff_from_auth()` matches the pending invitation by email and links the account as the first authenticated Publisher / Owner.
