# HT-NR-UI-02 Double-Entry General Ledger & Financial Reporting

**Programme:** HealthTimes Newsroom OS  
**Milestone:** HT-NR-UI-02 General Ledger & Financial Operations  
**Architecture:** Double-Entry Bookkeeping (GAAP & IFRS Compliant)  
**Database Migration:** Staging Migration 95 (`20261021040000_ht_nr_ui02_general_ledger.sql`)  
**Currency Support:** Multi-currency baseline (USD primary, ZWG secondary)

---

## 1. Accounting Architecture & Core Principles

HT-NR-UI-02 introduces complete double-entry general ledger infrastructure, bridging operational transactions (ad campaigns, invoices, payments, subscriptions, editorial expenses) directly into immutable accounting journals and GAAP financial statements.

### Core Guarantees:
1. **Mathematical Balance:** Every journal entry must satisfy $\sum \text{Debits} = \sum \text{Credits}$ to within $0.0001$. The database trigger `trg_enforce_journal_entry_balance` prevents unposted entries from posting if unbalanced.
2. **Immutability of Posted Records:** Once a journal entry is marked `posted`, trigger `trg_protect_posted_journal_entry` forbids updating or deleting its header, and `trg_prevent_posted_journal_line_mutation` forbids modifying or deleting its constituent lines.
3. **Audit Reversals:** Corrections cannot overwrite historical ledger entries. Reversals must be executed via `finance_reverse_journal_entry()`, creating a complete offsetting journal entry linked to the original.
4. **Fiscal Period Locking:** Entries cannot be posted into `LOCKED` or `CLOSED` periods (`trg_check_fiscal_period_open`).

---

## 2. Standard Chart of Accounts (COA)

Migration 95 seeds a comprehensive chart of accounts tailored to digital journalism and media operations:

| Account Code | Account Name | Account Type | Description |
|---|---|---|---|
| **1000** | Operating Bank Account | ASSET | Primary commercial checking account |
| **1050** | Mobile Money (EcoCash / InnBucks) | ASSET | High-volume mobile money collection account |
| **1200** | Accounts Receivable (Commercial Ads) | ASSET | Outstanding advertiser invoices |
| **1300** | Prepaid Expenses | ASSET | Advance platform hosting and service payments |
| **1500** | Newsroom Studio & Video Equipment | ASSET | Capitalized studio cameras, microphones, lighting |
| **2000** | Accounts Payable (Suppliers & Freelancers) | LIABILITY | Unpaid vendor bills and contributor fees |
| **2100** | Output VAT / Tax Payable | LIABILITY | 15% standard-rate VAT collected on advertising |
| **2200** | Accrued Editorial Expenses | LIABILITY | Incurred but unbilled contributor assignments |
| **3000** | Publisher's Initial Equity | EQUITY | Owner initial capital contribution |
| **3100** | Retained Earnings | EQUITY | Cumulative net surplus from operations |
| **4000** | Display & Programmatic Ad Revenue | REVENUE | Banner and direct sponsorship ad income |
| **4100** | Sponsored Content & Native Studio Revenue | REVENUE | HealthTimes Studio sponsored health features |
| **4200** | Reader Subscriptions & Premium Access | REVENUE | Recurring reader membership dues |
| **4300** | Syndication & Content Licensing | REVENUE | Third-party republication licenses |
| **5000** | Editorial Freelance & Stringer Fees | EXPENSE | Per-story contributor and investigative fees |
| **5100** | News Agency Wire Services | EXPENSE | Wire service syndication subscriptions |
| **5200** | Technology & Platform Hosting | EXPENSE | Cloud databases, Cloud Run, Vercel, Expo EAS |
| **5300** | Telephony & WhatsApp Messaging | EXPENSE | Provider API messaging and alert dispatches |
| **5400** | Sales Commissions & Partner Fees | EXPENSE | Commercial ad sales representative commissions |

---

## 3. Automated Operational Posting Triggers

To eliminate human entry lag, operational actions trigger automatic double-entry journal postings:

### 1. Invoice Issuance (`status = 'sent'`)
When an advertising invoice is finalized and dispatched:
- **Debit:** Accounts Receivable (`1200`) for the full invoice total (amount + VAT).
- **Credit:** Display Ad Revenue (`4000`) for the net service amount.
- **Credit:** Output VAT Payable (`2100`) for the VAT component.

### 2. Payment Receipt (`status = 'completed'`)
When an advertiser payment is recorded:
- **Debit:** Operating Bank Account (`1000`) or Mobile Money (`1050`) for the received amount.
- **Credit:** Accounts Receivable (`1200`) for the settled amount.

### 3. Credit Note Issuance (`status = 'issued'`)
When a dispute or discount requires an invoice adjustment:
- **Debit:** Display Ad Revenue (`4000`) for the discounted amount.
- **Credit:** Accounts Receivable (`1200`) offsetting the outstanding balance.

---

## 4. GAAP Financial Statements (Database RPCs)

Migration 95 deploys 4 real-time accounting query RPCs:

1. **`finance_get_trial_balance(p_period_id UUID)`:**
   Returns all accounts with debit totals, credit totals, net balances, and global equality verification (`is_balanced: boolean`).
2. **`finance_get_profit_and_loss(p_from_date TIMESTAMPTZ, p_to_date TIMESTAMPTZ)`:**
   Aggregates total operating revenue, itemized expense accounts, total operating expenses, and net operating surplus/deficit.
3. **`finance_get_balance_sheet(p_as_of_date TIMESTAMPTZ)`:**
   Calculates total assets, total liabilities, total equity (including period retained earnings), and verifies the balance sheet equation: $\text{Assets} = \text{Liabilities} + \text{Equity}$.
4. **`finance_get_customer_statement(p_customer_id UUID, p_from_date TIMESTAMPTZ, p_to_date TIMESTAMPTZ)`:**
   Produces an itemized customer ledger containing opening balance, invoiced amounts, received payments, issued credit notes, running chronological balances, and closing balance.

---

## 5. UI Presentation & Modals

The Finance Desk (`StudioFinanceDesk.tsx`) includes:
- **Chart of Accounts:** Tabular overview of all 19 accounts grouped by Asset, Liability, Equity, Revenue, Expense.
- **Fiscal Periods:** Management of accounting months, locking status, and closeout operations.
- **Trial Balance:** Live ledger debits and credits with green/red balance status indicator.
- **Profit & Loss:** Income and expense breakdown with automated Net Operating Surplus computation.
- **Balance Sheet:** Statement of financial position with automated Assets vs Liabilities+Equity verification.
- **GL Journals:** Complete historical journal viewer with one-click reverse capability.
- **Printable Modals:**
  - Printable Commercial Tax Invoice (standard letterhead, remittance info, VAT itemization).
  - Printable Official Payment Receipt (receipt number, payment method, settlement reference).
  - Printable Statement of Account (date range filter, opening/closing balance, running activity).
  - Issue Credit Note Modal (reason capture, invoice selection, immediate journal creation).
