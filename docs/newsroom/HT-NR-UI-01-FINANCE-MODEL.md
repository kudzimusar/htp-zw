# HealthTimes Newsroom OS — Finance & Accounting Operations Model

**Document Reference:** `HT-NR-UI-01-FINANCE-MODEL`  
**Programme:** HealthTimes Newsroom OS (HT-NR)  
**Status:** Certified Implementation Architecture  
**Release Target:** Wave UI-01 Pre-Launch Convergence  

---

## 1. Overview & Business Mandate

An enterprise newsroom cannot operate without integrated business and financial controls. HealthTimes Newsroom OS provides a native financial engine supporting corporate billing, insertion order tracking, multi-currency accounts receivable (AR), immutable payment receipting, newsroom expense tracking, and real-time operating statements.

---

## 2. Database Schema Architecture

Migration `20261021000000_ht_nr_ui01_finance_foundation.sql` creates eight dedicated relational tables:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FINANCE RELATIONAL SCHEMA                       │
├──────────────────────────────┬─────────────────────────────────────────┤
│ TABLE                        │ PURPOSE                                 │
├──────────────────────────────┼─────────────────────────────────────────┤
│ newsroom_customers           │ Corporate advertising & billing clients │
│ newsroom_commercial_orders   │ Commercial ad insertion orders          │
│ newsroom_invoices            │ Invoices issued to customers            │
│ newsroom_invoice_items       │ Line items belonging to invoices        │
│ newsroom_payments            │ Immutable cash/bank payment receipts    │
│ newsroom_expenses            │ Staff editorial & travel expense claims │
│ newsroom_exchange_rates      │ Multi-currency conversion rates (USD/ZiG)│
│ newsroom_financial_periods   │ Accounting periods & closure governance │
└──────────────────────────────┴─────────────────────────────────────────┘
```

All 8 tables enforce Row Level Security (RLS) and have direct access **revoked from `anon`, `public`, and `authenticated`**. All client interaction occurs exclusively through 18 `SECURITY DEFINER` RPCs that check caller capabilities via `newsroom_current_context()`.

---

## 3. Multi-Currency Operations

HealthTimes operates in Zimbabwe's dual-currency financial environment:
- **USD (United States Dollar):** Primary international and reporting currency.
- **ZiG (Zimbabwe Gold):** Primary local transactional currency.

The finance service computes metrics, aging buckets, and operating statements with strict per-currency segregation. Conversions are calculated using authoritative rates defined in `newsroom_exchange_rates`.

---

## 4. Lifecycle State Machines

### 4.1 Invoicing Lifecycle
```
             ┌───────────┐
             │   draft   │
             └─────┬─────┘
                   │ approve (Creator != Approver)
                   ▼
             ┌───────────┐
             │ approved  │
             └─────┬─────┘
                   │ issue (Sends invoice to client)
                   ▼
             ┌───────────┐
             │  issued   │◄────────────────┐
             └─────┬─────┘                 │ Partial
                   │ record_payment        │ Payment
                   ▼                       │
             ┌───────────┐                 │
             │ partially ├─────────────────┘
             │   paid    │
             └─────┬─────┘
                   │ Full balance cleared
                   ▼
             ┌───────────┐
             │   paid    │
             └───────────┘
```
*Note: Invoices past their due date dynamically project status `overdue` when queried, while preserving their structural status in the database.*

### 4.2 Newsroom Expense Lifecycle
```
             ┌───────────┐
             │   draft   │
             └─────┬─────┘
                   │ submit
                   ▼
             ┌───────────┐
             │ submitted │
             └─────┬─────┘
                   │ approve (Submitter != Approver)
        ┌──────────┴──────────┐
        ▼                     ▼
  ┌───────────┐         ┌───────────┐
  │ rejected  │         │ approved  │
  └───────────┘         └─────┬─────┘
                              │ pay (Disbursement)
                              ▼
                        ┌───────────┐
                        │   paid    │
                        └───────────┘
```

### 4.3 Immutable Payment Receipts
Payments cannot be edited, altered, or deleted once recorded.
Database trigger `trg_recalculate_invoice_balance` recalculates `total_paid` and `balance_due` on the target invoice atomically. If a payment amount exceeds the remaining balance due, the transaction is rejected with an exception:
`'Payment amount exceeds remaining invoice balance due'`.

---

## 5. Accounts Receivable (AR) Aging Engine

RPC `newsroom_get_receivables_aging(p_currency)` calculates outstanding customer balances across 5 standard aging intervals:

1. **Current (Not Yet Due):** `due_date >= CURRENT_DATE`
2. **1–30 Days Overdue:** `CURRENT_DATE - due_date BETWEEN 1 AND 30`
3. **31–60 Days Overdue:** `CURRENT_DATE - due_date BETWEEN 31 AND 60`
4. **61–90 Days Overdue:** `CURRENT_DATE - due_date BETWEEN 61 AND 90`
5. **90+ Days Overdue:** `CURRENT_DATE - due_date > 90`

The system returns total sums per bucket and a granular breakdown per corporate customer.

---

## 6. Financial Statements

RPC `newsroom_get_financial_statements(p_period_start, p_period_end)` derives truthful operating statements:

### 6.1 Income Statement
- **Revenue Recorded:** Total cash receipts recorded from commercial invoices within the period.
- **Operating Expenses:** Total approved editorial and administrative expenses.
- **Net Operating Surplus / (Deficit):** `Revenue - Expenses`.

### 6.2 Balance Sheet Governance
HealthTimes maintains strict financial truthfulness. The Balance Sheet is explicitly reported as:
`"NOT AVAILABLE UNTIL GENERAL LEDGER AUTHORITY EXISTS"`
Assets, liabilities, and equity accounts are not fabricated from transaction logs without a double-entry general ledger.
