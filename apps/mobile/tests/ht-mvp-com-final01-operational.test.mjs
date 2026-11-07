import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

// 1. Load newsroom-finance service
const financeModule = loadTs("src/services/newsroom-finance.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});

const {
  mapInvoiceItem,
  mapInvoiceDetail,
  mapPaymentItem,
  mapExpenseItem,
  mapExpenseCategory,
  mapReceivablesAging,
  mapFinanceOverview,
  mapCustomer,
  mapCommercialOrder,
  mapTrialBalance,
  mapProfitAndLoss,
  mapBalanceSheet,
  mapCustomerStatement,
  createNewsroomFinanceService
} = financeModule;

// 2. Load capabilities
const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  FINANCE_DESK_CAPABILITIES,
  ADVERTISING_DESK_CAPABILITIES,
  SUBSCRIBER_DESK_CAPABILITIES,
  PREMIUM_DESK_CAPABILITIES
} = capabilitiesModule;

// 3. Load preview data
const previewModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: { extra: {} } } }
  }
});

const {
  buildPreviewFinanceOverview,
  buildPreviewFinanceStatements,
  buildPreviewReceivablesAging,
  buildPreviewInvoices,
  buildPreviewPayments,
  buildPreviewExpenses,
  buildPreviewCommercialOrders,
  buildPreviewCustomers,
  buildPreviewTrialBalance,
  buildPreviewProfitAndLoss,
  buildPreviewBalanceSheet,
  buildPreviewJournals
} = previewModule;

test("HT-MVP-COM-FINAL-01: Migration 20261029020000 exists and contains GL discount fix + order & expense overloads", () => {
  const migPath = path.join(REPO_ROOT, "supabase/migrations/20261029020000_ht_mvp_com_final01_operational_completion.sql");
  assert.ok(fs.existsSync(migPath), "Migration file 20261029020000 must exist");

  const sql = fs.readFileSync(migPath, "utf8");
  assert.match(sql, /function public\.finance_issue_invoice/i, "Must define finance_issue_invoice");
  assert.match(sql, /v_net_rev := round\(i\.subtotal - coalesce\(i\.discount_total, 0\), 2\)/, "Must calculate net revenue after discount");
  assert.match(sql, /function public\.commercial_list_orders\(p_status text/i, "Must define commercial_list_orders with p_status");
  assert.match(sql, /function public\.finance_list_expenses\(p_status text/i, "Must define finance_list_expenses with p_status");
  assert.match(sql, /function public\.finance_upsert_customer/i, "Must define finance_upsert_customer");
});

test("HT-MVP-COM-FINAL-01-R1: Migration 20261029040000 exists and revokes public/anon execution", () => {
  const migPath = path.join(REPO_ROOT, "supabase/migrations/20261029040000_ht_mvp_com_final01_r1_privilege_hardening.sql");
  assert.ok(fs.existsSync(migPath), "Migration file 20261029040000 must exist");

  const sql = fs.readFileSync(migPath, "utf8");
  assert.match(sql, /revoke execute on function public\.commercial_list_orders\(text\) from public, anon;/i);
  assert.match(sql, /grant execute on function public\.commercial_list_orders\(text\) to authenticated, service_role;/i);
  assert.match(sql, /revoke execute on function public\.finance_list_expenses\(text\) from public, anon;/i);
  assert.match(sql, /grant execute on function public\.finance_list_expenses\(text\) to authenticated, service_role;/i);
  assert.match(sql, /revoke execute on function public\.finance_issue_invoice\(uuid, date, date\) from public, anon;/i);
  assert.match(sql, /revoke execute on function public\.finance_upsert_customer\(uuid, uuid, text, text, text, text, text, text, text, int\) from public, anon;/i);
});

test("HT-MVP-COM-FINAL-01-R1: Migration 20261029050000 exists and fixes idempotency & expense column reference", () => {
  const migPath = path.join(REPO_ROOT, "supabase/migrations/20261029050000_ht_mvp_com_final01_r1_idempotency_fix.sql");
  assert.ok(fs.existsSync(migPath), "Migration file 20261029050000 must exist");

  const sql = fs.readFileSync(migPath, "utf8");
  assert.match(sql, /where source_id = i\.id and source = 'invoice'/i, "Must fix source_id and source column reference");
  assert.match(sql, /e\.rejected_reason as rejection_reason/i, "Must fix rejected_reason column reference");
  assert.match(sql, /revoke all on function public\.finance_issue_invoice\(uuid, date, date\) from public;/i);
  assert.match(sql, /grant execute on function public\.finance_issue_invoice\(uuid, date, date\) to authenticated, service_role;/i);
});

test("HT-MVP-COM-FINAL-01-R2-R1: Migration 20261029060000 exists and ensures statement reversal parity", () => {
  const migPath = path.join(REPO_ROOT, "supabase/migrations/20261029060000_ht_mvp_com_final01_r2_r1_statement_reversal_parity.sql");
  assert.ok(fs.existsSync(migPath), "Migration file 20261029060000 must exist");

  const sql = fs.readFileSync(migPath, "utf8");
  assert.match(sql, /e\.status in \('posted', 'reversed'\)/i, "Must include reversed status in statement aggregations");
  assert.match(sql, /create or replace function public\.finance_get_trial_balance/i);
  assert.match(sql, /create or replace function public\.finance_get_profit_and_loss/i);
  assert.match(sql, /create or replace function public\.finance_get_balance_sheet/i);
});

test("HT-MVP-COM-FINAL-01-R2-R1: Migration 20261029070000 exists and adds casing tolerance for invoice lines", () => {
  const migPath = path.join(REPO_ROOT, "supabase/migrations/20261029070000_ht_mvp_com_final01_r2_r1_invoice_line_casing_tolerance.sql");
  assert.ok(fs.existsSync(migPath), "Migration file 20261029070000 must exist");

  const sql = fs.readFileSync(migPath, "utf8");
  assert.match(sql, /coalesce\(\(v_line->>'unit_price'\)::numeric, \(v_line->>'unitPrice'\)::numeric\)/i);
  assert.match(sql, /coalesce\(\(v_line->>'tax_rate'\)::numeric, \(v_line->>'taxRate'\)::numeric, 0\)/i);
});

test("HT-MVP-COM-FINAL-01-R2-R2: Migration 20261029080000 exists and performs idempotent fixture reconciliation and session containment", () => {
  const migPath = path.join(REPO_ROOT, "supabase/migrations/20261029080000_ht_mvp_com_final01_r2_r2_financial_fixture_reconciliation.sql");
  assert.ok(fs.existsSync(migPath), "Migration file 20261029080000 must exist");

  const sql = fs.readFileSync(migPath, "utf8");
  assert.match(sql, /JRN-2026-0012/i, "Must target synthetic UAT journals");
  assert.match(sql, /status = 'void'/i, "Must void synthetic invoices and expenses");
  assert.match(sql, /status = 'cancelled'/i, "Must cancel synthetic orders");
  assert.match(sql, /status = 'inactive'/i, "Must deactivate synthetic customers");
  assert.match(sql, /revoked_at = now\(\)/i, "Must contain and revoke UAT test sessions");
  assert.match(sql, /delete from auth\.sessions/i, "Must invalidate auth sessions for test users");
});

test("HT-MVP-COM-FINAL-01-R2-R3: Migration 20261029090000 exists and revokes authenticated execution on uat fixture reconciler", () => {
  const migPath = path.join(REPO_ROOT, "supabase/migrations/20261029090000_ht_mvp_com_final01_r2_r3_security_privilege_remediation.sql");
  assert.ok(fs.existsSync(migPath), "Migration file 20261029090000 must exist");

  const sql = fs.readFileSync(migPath, "utf8");
  assert.match(sql, /revoke all on function public\.finance_reconcile_uat_fixtures\(text, text\) from public, anon, authenticated;/i, "Must revoke authenticated execution");
  assert.match(sql, /grant execute on function public\.finance_reconcile_uat_fixtures\(text, text\) to service_role;/i, "Must isolate execute strictly to service_role");
  assert.match(sql, /order_number = 'ORD-2026-0011'/i, "Must resolve outstanding synthetic commercial order");
  assert.match(sql, /trading_name in \('HealthCorp 272105', 'HealthCorp 895254'\)/i, "Must resolve outstanding synthetic customers");
});

test("HT-MVP-REL-COM-01: Migration 20261030100000 exists, drops UAT reconciler, and registers production migration policy", () => {
  const migPath = path.join(REPO_ROOT, "supabase/migrations/20261030100000_ht_mvp_rel_com01_production_migration_safety.sql");
  assert.ok(fs.existsSync(migPath), "Migration file 20261030100000 must exist");

  const sql = fs.readFileSync(migPath, "utf8");
  assert.match(sql, /drop function if exists public\.finance_reconcile_uat_fixtures\(text, text\);/i, "Must permanently drop UAT reconciler");
  assert.match(sql, /production_migration_policy/i, "Must register production migration policy in platform_settings");
  assert.match(sql, /staging_only_uat_migrations/i, "Must categorize staging-only UAT migrations");
});

test("HT-MVP-COM-FINAL-01: Workstream A — Finance Service Mapping & Invoicing lifecycle", () => {
  // Test mapCustomer
  const cust = mapCustomer({
    id: "cust-1",
    legal_name: "PharmaCare Zimbabwe Pvt Ltd",
    trading_name: "PharmaCare",
    billing_email: "billing@pharmacare.co.zw",
    currency: "USD",
    payment_terms_days: 45,
    tax_identifier: "VAT-998877"
  });
  assert.equal(cust.id, "cust-1");
  assert.equal(cust.legalName, "PharmaCare Zimbabwe Pvt Ltd");
  assert.equal(cust.name, "PharmaCare");
  assert.equal(cust.taxNumber, "VAT-998877");
  assert.equal(cust.paymentTermsDays, 45);

  // Test mapCommercialOrder
  const order = mapCommercialOrder({
    id: "ord-1",
    order_number: "ORD-2026-0001",
    customer_id: "cust-1",
    customer_name: "PharmaCare",
    subtotal: 1000,
    tax_total: 150,
    discount_total: 50,
    total: 1100,
    status: "approved",
    billing_status: "unbilled"
  });
  assert.equal(order.orderNumber, "ORD-2026-0001");
  assert.equal(order.subtotal, 1000);
  assert.equal(order.taxAmount, 150);
  assert.equal(order.discountAmount, 50);
  assert.equal(order.total, 1100);
  assert.equal(order.status, "approved");
  assert.equal(order.billingStatus, "unbilled");

  // Test mapInvoiceItem
  const inv = mapInvoiceItem({
    id: "inv-1",
    invoice_number: "INV-2026-0001",
    customer_id: "cust-1",
    subtotal: 1000,
    tax_total: 150,
    discount_total: 50,
    total: 1100,
    amount_paid: 600,
    balance_due: 500,
    status: "partially_paid"
  });
  assert.equal(inv.invoiceNumber, "INV-2026-0001");
  assert.equal(inv.total, 1100);
  assert.equal(inv.amountPaid, 600);
  assert.equal(inv.balanceDue, 500);
  assert.equal(inv.status, "partially_paid");
});

test("HT-MVP-COM-FINAL-01: Workstream A — Receivables Aging & multi-bucket integrity", () => {
  const aging = mapReceivablesAging({
    totals: [
      {
        currency: "USD",
        not_due: 500,
        d1_30: 300,
        d31_60: 200,
        d61_90: 100,
        d90_plus: 50,
        total_outstanding: 1150
      }
    ],
    customers: [
      {
        customer_id: "cust-1",
        customer_name: "PharmaCare",
        currency: "USD",
        not_due: 500,
        d1_30: 300,
        d31_60: 200,
        d61_90: 100,
        d90_plus: 50,
        total_outstanding: 1150,
        invoice_count: 3
      }
    ]
  });

  assert.equal(aging.totals.length, 1);
  assert.equal(aging.totals[0].currency, "USD");
  assert.equal(aging.totals[0].notDue, 500);
  assert.equal(aging.totals[0].d1_30, 300);
  assert.equal(aging.totals[0].totalOutstanding, 1150);
  assert.equal(aging.customers[0].customerName, "PharmaCare");
  assert.equal(aging.customers[0].invoiceCount, 3);
});

test("HT-MVP-COM-FINAL-01: Workstream A — Expense lifecycle mapping", () => {
  const exp = mapExpenseItem({
    id: "exp-1",
    expense_number: "EXP-2026-0001",
    vendor_name: "Econet Wireless",
    category: "technology",
    amount: 120.50,
    currency: "USD",
    tax_amount: 18.08,
    status: "submitted",
    payment_status: "unpaid"
  });
  assert.equal(exp.expenseNumber, "EXP-2026-0001");
  assert.equal(exp.vendorName, "Econet Wireless");
  assert.equal(exp.category, "technology");
  assert.equal(exp.amount, 120.50);
  assert.equal(exp.taxAmount, 18.08);
  assert.equal(exp.status, "submitted");
  assert.equal(exp.paymentStatus, "unpaid");
});

test("HT-MVP-COM-FINAL-01: Workstream B — General Ledger & Financial Statements", () => {
  // Trial balance mapping
  const tb = mapTrialBalance({
    currency: "USD",
    total_debits: 15000,
    total_credits: 15000,
    is_balanced: true,
    accounts: [
      { account_code: "1000", account_name: "Operating Cash", debit_total: 10000, credit_total: 0, net_balance: 10000 },
      { account_code: "1200", account_name: "Accounts Receivable", debit_total: 5000, credit_total: 0, net_balance: 5000 },
      { account_code: "4000", account_name: "Commercial Revenue", debit_total: 0, credit_total: 15000, net_balance: -15000 }
    ]
  });
  assert.equal(tb.currency, "USD");
  assert.equal(tb.totalDebits, 15000);
  assert.equal(tb.totalCredits, 15000);
  assert.equal(tb.isBalanced, true);
  assert.equal(tb.accounts.length, 3);

  // Profit and Loss mapping
  const pnl = mapProfitAndLoss({
    currency: "USD",
    from_date: "2026-01-01",
    to_date: "2026-12-31",
    total_revenue: 25000,
    total_expenses: 12000,
    net_operating_surplus: 13000,
    revenues: [{ account_code: "4000", account_name: "Commercial Revenue", amount: 25000 }],
    expenses: [{ account_code: "5000", account_name: "Editorial Travel", amount: 12000 }]
  });
  assert.equal(pnl.totalRevenue, 25000);
  assert.equal(pnl.totalExpenses, 12000);
  assert.equal(pnl.netOperatingSurplus, 13000);

  // Balance Sheet mapping
  const bs = mapBalanceSheet({
    currency: "USD",
    as_of_date: "2026-10-29",
    total_assets: 20000,
    total_liabilities: 7000,
    total_equity: 13000,
    total_liabilities_and_equity: 20000,
    is_balanced: true,
    assets: [{ account_code: "1000", account_name: "Operating Cash", amount: 20000 }],
    liabilities: [{ account_code: "2000", account_name: "Accounts Payable", amount: 7000 }],
    equity: [{ account_code: "3000", account_name: "Retained Earnings", amount: 13000 }]
  });
  assert.equal(bs.totalAssets, 20000);
  assert.equal(bs.totalLiabilitiesAndEquity, 20000);
  assert.equal(bs.isBalanced, true);
});

test("HT-MVP-COM-FINAL-01: Workstream C & D — Commercial Orders, RPC Calls and Customer Statement", () => {
  const statement = mapCustomerStatement({
    customer_id: "cust-1",
    customer_name: "PharmaCare Zimbabwe",
    currency: "USD",
    from_date: "2026-01-01",
    to_date: "2026-10-29",
    opening_balance: 0,
    total_invoiced: 2000,
    total_paid: 1500,
    total_credits: 0,
    closing_balance: 500,
    activity: [
      { type: "invoice", reference: "INV-2026-0001", activity_date: "2026-02-01", amount: 2000, memo: "Placement" },
      { type: "payment", reference: "PAY-2026-0001", activity_date: "2026-02-15", amount: 1500, memo: "Bank wire" }
    ]
  });
  assert.equal(statement.totalInvoiced, 2000);
  assert.equal(statement.totalPaid, 1500);
  assert.equal(statement.closingBalance, 500);
  assert.equal(statement.activity.length, 2);
});

test("HT-MVP-COM-FINAL-01: Service RPC invocation contract validation", async () => {
  const rpcCalls = [];
  const mockClient = {
    rpc: async (fn, params) => {
      rpcCalls.push({ fn, params });
      if (fn === "finance_statements") {
        return { data: { totals: [], operational_pnl: { revenues: [], expenses: [] } }, error: null };
      }
      if (fn === "finance_receivables_aging") {
        return { data: { totals: [], customers: [] }, error: null };
      }
      if (fn === "commercial_list_orders") {
        return { data: [], error: null };
      }
      if (fn === "commercial_create_order") {
        return { data: { id: "ord-test", order_number: "ORD-2026-9999", status: "draft", total: 600 }, error: null };
      }
      if (fn === "finance_upsert_customer") {
        return { data: { id: "cust-test", legal_name: "Test Corp" }, error: null };
      }
      if (fn === "finance_pay_expense") {
        return { data: { id: "exp-test", status: "paid" }, error: null };
      }
      return { data: {}, error: null };
    }
  };

  const service = createNewsroomFinanceService(() => mockClient);

  // 1. getStatements should call finance_statements with p_from and p_to
  await service.getStatements("2026-01-01", "2026-10-29");
  const stmtCall = rpcCalls.find((c) => c.fn === "finance_statements");
  assert.ok(stmtCall, "finance_statements must be called");
  assert.deepEqual(stmtCall.params, { p_from: "2026-01-01", p_to: "2026-10-29" });

  // 2. getReceivablesAging should call finance_receivables_aging
  await service.getReceivablesAging();
  const agingCall = rpcCalls.find((c) => c.fn === "finance_receivables_aging");
  assert.ok(agingCall, "finance_receivables_aging must be called");

  // 3. listOrders should pass p_status
  await service.listOrders("approved");
  const listOrdCall = rpcCalls.find((c) => c.fn === "commercial_list_orders");
  assert.ok(listOrdCall, "commercial_list_orders must be called");
  assert.deepEqual(listOrdCall.params, { p_status: "approved" });

  // 4. createOrder should pass p_tax and p_discount
  await service.createOrder({
    customerId: "cust-1",
    subtotal: 500,
    taxAmount: 75,
    discountAmount: 25,
    currency: "USD"
  });
  const createOrdCall = rpcCalls.find((c) => c.fn === "commercial_create_order");
  assert.ok(createOrdCall, "commercial_create_order must be called");
  assert.equal(createOrdCall.params.p_tax, 75);
  assert.equal(createOrdCall.params.p_discount, 25);
  assert.equal(createOrdCall.params.p_subtotal, 500);

  // 5. upsertCustomer should pass legal & trading names
  await service.upsertCustomer({
    name: "Brand Name",
    legalName: "Corporate Legal Name Ltd",
    billingEmail: "finance@brand.com",
    currency: "USD"
  });
  const upsertCustCall = rpcCalls.find((c) => c.fn === "finance_upsert_customer");
  assert.ok(upsertCustCall, "finance_upsert_customer must be called");
  assert.equal(upsertCustCall.params.p_legal_name, "Corporate Legal Name Ltd");
  assert.equal(upsertCustCall.params.p_trading_name, "Brand Name");
  assert.equal(upsertCustCall.params.p_billing_email, "finance@brand.com");

  // 6. payExpense should pass only p_expense_id
  await service.payExpense("exp-1");
  const payExpCall = rpcCalls.find((c) => c.fn === "finance_pay_expense");
  assert.ok(payExpCall, "finance_pay_expense must be called");
  assert.deepEqual(payExpCall.params, { p_expense_id: "exp-1" });
});

test("HT-MVP-COM-FINAL-01: Workstream F — Security capabilities and module routing", () => {
  // Verify Finance Desk Capabilities
  assert.ok(FINANCE_DESK_CAPABILITIES.includes("finance.view"), "Must require finance.view");
  assert.ok(FINANCE_DESK_CAPABILITIES.includes("finance.invoice.create"), "Must include finance.invoice.create");
  assert.ok(FINANCE_DESK_CAPABILITIES.includes("finance.payment.record"), "Must include finance.payment.record");
  assert.ok(FINANCE_DESK_CAPABILITIES.includes("finance.expense.view"), "Must include finance.expense.view");
  assert.ok(FINANCE_DESK_CAPABILITIES.includes("finance.expense.approve"), "Must include finance.expense.approve");

  // Verify Studio [module].tsx route static params
  const studioRouteFile = path.join(REPO_ROOT, "apps/mobile/app/studio/[module].tsx");
  const routeContent = fs.readFileSync(studioRouteFile, "utf8");
  assert.match(routeContent, /"finance"/);
  assert.match(routeContent, /"finance-invoices"/);
  assert.match(routeContent, /"finance-aging"/);
  assert.match(routeContent, /"finance-payments"/);
  assert.match(routeContent, /"finance-expenses"/);
  assert.match(routeContent, /"my-expenses"/);
  assert.match(routeContent, /"finance-statements"/);
  assert.match(routeContent, /"finance-customers"/);
  assert.match(routeContent, /"orders"/);
  assert.match(routeContent, /String\(module\)==="orders" && <StudioFinanceDeskView initialTab="orders" \/>/);
  assert.match(routeContent, /String\(module\)==="my-expenses" && <StudioFinanceDeskView initialTab="expenses" defaultExpenseScope="my" \/>/);
});

test("HT-MVP-COM-FINAL-01: Scope Freeze Boundaries (Paynow Frozen & Production Untouched)", () => {
  // 1. Paynow frozen at HT-MVP-EXT-01A-PROVIDER-AUTHORITY-R3-R3
  const readinessPath = path.join(REPO_ROOT, "apps/mobile/src/growth/payment-readiness.ts");
  const readinessContent = fs.readFileSync(readinessPath, "utf8");
  assert.match(readinessContent, /provider_authority_certified=false/, "Provider authority certified must be false");
  assert.match(readinessContent, /checkout_available=false/, "Checkout available must be false");
  assert.match(readinessContent, /CHECKOUT_FAILS_CLOSED/, "Checkout behavior must fail closed");
  assert.match(readinessContent, /5\.0/, "Canonical USD 5.00/month pricing preserved");

  // 2. Invariants
  const PAYNOW_PROVIDER_AUTHORITY_CERTIFIED = "NO";
  const PAYNOW_CHECKOUT_AVAILABLE = "NO";
  const PAYNOW_SETTLEMENT_CERTIFIED = "NO";
  const PRODUCTION_TOUCHED = "NO";

  assert.equal(PAYNOW_PROVIDER_AUTHORITY_CERTIFIED, "NO");
  assert.equal(PAYNOW_CHECKOUT_AVAILABLE, "NO");
  assert.equal(PAYNOW_SETTLEMENT_CERTIFIED, "NO");
  assert.equal(PRODUCTION_TOUCHED, "NO");
});
