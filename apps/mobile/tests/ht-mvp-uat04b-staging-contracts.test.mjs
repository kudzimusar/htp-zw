import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20261025105152_ht_mvp_uat04b_staging_contract_convergence.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");

const financeModule = loadTs("src/services/newsroom-finance.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({ rpc: async () => ({ data: null, error: null }) })
    }
  }
});

const {
  createNewsroomFinanceService,
  mapPaymentItem,
  mapExpenseItem
} = financeModule;

test("UAT04B staging migration preserves exact finance contracts and positive invoice values", () => {
  assert.match(migration, /add column if not exists terms text/);
  assert.match(migration, /finance_create_invoice\([\s\S]*p_terms text/);
  assert.match(migration, /add column if not exists story_id uuid references public\.stories/);
  assert.match(migration, /finance_create_expense\([\s\S]*p_vendor_name text[\s\S]*p_receipt_reference text[\s\S]*p_story_id uuid/);
  assert.match(migration, /check \(unit_price > 0\)/);
});

test("UAT04B staging migration uses canonical taxonomy, consent, push and premium authority", () => {
  assert.doesNotMatch(migration, /from public\.story_sections/);
  assert.match(migration, /st\.primary_section_id = s\.id/);
  assert.match(migration, /count\(distinct contact_id\)[\s\S]*status = 'granted'/);
  assert.match(migration, /status = 'active'[\s\S]*expo_push_token/);
  assert.match(migration, /from \([\s\S]*group by coalesce\(provider, 'unknown'\)[\s\S]*\) provider_totals/);
});

test("UAT04B finance adapter calls exact invoice and expense Data API arguments", async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      if (fn === "finance_create_invoice") {
        return { data: { id: "invoice-1", invoice_number: "INV-1", total: 10 }, error: null };
      }
      return { data: { id: "expense-1", expense_number: "EXP-1" }, error: null };
    }
  };
  const service = createNewsroomFinanceService(() => client);

  await service.createInvoice({
    customerId: "customer-1",
    currency: "USD",
    lines: [{ description: "Placement", quantity: 1, unitPrice: 10 }],
    terms: "Due in 30 days"
  });
  await service.createExpense({
    expenseDate: "2026-10-25",
    vendorName: "UAT Vendor",
    category: "travel",
    description: "UAT expense",
    department: "Editorial",
    amount: 10,
    currency: "USD",
    receiptReference: "UAT-RCPT",
    storyId: null,
    submitImmediately: true
  });

  assert.equal(calls[0].fn, "finance_create_invoice");
  assert.equal(calls[0].args.p_terms, "Due in 30 days");
  assert.equal(calls[1].fn, "finance_create_expense");
  assert.equal(calls[1].args.p_vendor_name, "UAT Vendor");
  assert.equal(calls[1].args.p_receipt_reference, "UAT-RCPT");
  assert.equal(calls[1].args.p_story_id, null);
});

test("UAT04B finance adapter maps canonical database payment and expense fields", () => {
  const payment = mapPaymentItem({
    method: "mobile_money",
    provider_reference: "MM-1",
    received_by: "staff-1"
  });
  assert.equal(payment.paymentMethod, "mobile_money");
  assert.equal(payment.reference, "MM-1");
  assert.equal(payment.recordedBy, "staff-1");

  const expense = mapExpenseItem({
    vendor: "Supplier",
    document_ref: "RCPT-1",
    rejected_reason: "Duplicate"
  });
  assert.equal(expense.vendorName, "Supplier");
  assert.equal(expense.receiptReference, "RCPT-1");
  assert.equal(expense.rejectionReason, "Duplicate");
});

test("UAT04B payment adapter uses canonical RPC names and filters invoice results", async () => {
  const calls = [];
  const client = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      if (fn === "finance_record_payment") {
        return {
          data: { id: "pay-1", payment_number: "PAY-1", invoice_id: "inv-1", amount: 5, currency: "USD" },
          error: null
        };
      }
      return {
        data: [
          { id: "pay-1", invoice_id: "inv-1", method: "cash" },
          { id: "pay-2", invoice_id: "inv-2", method: "bank_transfer" }
        ],
        error: null
      };
    }
  };
  const service = createNewsroomFinanceService(() => client);

  await service.recordPayment({
    invoiceId: "inv-1",
    amount: 5,
    currency: "USD",
    paymentMethod: "ecocash",
    idempotencyKey: "uat04b-payment"
  });
  const payments = await service.listPayments("inv-1");

  assert.equal(calls[0].args.p_method, "mobile_money");
  assert.equal(calls[0].args.p_payment_method, undefined);
  assert.ok(calls[0].args.p_payment_date);
  assert.equal(calls[1].args, undefined);
  assert.deepEqual(payments.map((item) => item.invoiceId), ["inv-1"]);
});
