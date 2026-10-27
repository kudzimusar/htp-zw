import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { loadTs } from "./ts-module-loader.mjs";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

const readinessModule = loadTs("src/growth/payment-readiness.ts");
const {
  CANONICAL_PREMIUM_PLAN,
  ACCOUNTANT_POLICY_REGISTER,
  OWNER_POLICY_REGISTER,
  generateMerchantReference,
  validateMerchantReference,
  canTransitionPaymentState,
  mapTransactionToPremiumCheckoutState,
  resolvePaynowReadinessState,
  getAdvertiserInvoicePaymentOptions,
  computeDeterministicProviderHash,
  sanitizeProviderMetadata,
  createPaymentFinanceLedgerEngine
} = readinessModule;

const commerceLib = require(path.join(repoRoot, "lib/ag05-premium-commerce.js"));
const commerceApi = require(path.join(repoRoot, "api/commerce.js"));

const financeModule = loadTs("src/services/newsroom-finance.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({ rpc: async () => ({ data: null, error: null }) })
    }
  }
});

test("1. Canonical Premium plan authority is frozen and consistent across server, client, and SQL", () => {
  assert.equal(CANONICAL_PREMIUM_PLAN.plan_key, "healthtimes_premium_monthly");
  assert.equal(CANONICAL_PREMIUM_PLAN.name, "HealthTimes Premium");
  assert.equal(CANONICAL_PREMIUM_PLAN.amount, 5.0);
  assert.equal(CANONICAL_PREMIUM_PLAN.currency, "USD");
  assert.equal(CANONICAL_PREMIUM_PLAN.billing_interval, "month");
  assert.equal(CANONICAL_PREMIUM_PLAN.status, "active");
  assert.equal(CANONICAL_PREMIUM_PLAN.version, 1);

  assert.deepEqual(commerceLib.CANONICAL_PREMIUM_PLAN, CANONICAL_PREMIUM_PLAN);

  const sql = fs.readFileSync(
    path.join(repoRoot, "supabase/migrations/20261027000000_ht_ext01a_payment_finance_readiness.sql"),
    "utf8"
  );
  assert.match(sql, /create table if not exists public\.premium_plans/);
  assert.match(sql, /'healthtimes_premium_monthly'/);
  assert.match(sql, /'HealthTimes Premium'/);
  assert.match(sql, /5\.00/);
});

test("2. Merchant reference uniqueness, ULID format, and zero-PII enforcement", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) {
    const premRef = generateMerchantReference("PREMIUM_SUBSCRIPTION");
    const invRef = generateMerchantReference("ADVERTISING_INVOICE");
    const connRef = generateMerchantReference("PROVIDER_CONNECTIVITY_TEST");

    assert.equal(validateMerchantReference(premRef, "PREMIUM_SUBSCRIPTION"), true);
    assert.equal(validateMerchantReference(invRef, "ADVERTISING_INVOICE"), true);
    assert.equal(validateMerchantReference(connRef, "PROVIDER_CONNECTIVITY_TEST"), true);

    assert.equal(validateMerchantReference(premRef, "ADVERTISING_INVOICE"), false);
    assert.equal(seen.has(premRef), false);
    assert.equal(seen.has(invRef), false);
    assert.equal(seen.has(connRef), false);

    seen.add(premRef);
    seen.add(invRef);
    seen.add(connRef);
  }

  assert.equal(validateMerchantReference("HT-PREM-user@example.com"), false);
  assert.equal(validateMerchantReference("HT-INV-263772123456"), false);
});

test("3. Payment-intent integrity: server derives canonical amount/currency and ignores untrusted client flags", () => {
  const engine = createPaymentFinanceLedgerEngine();
  engine.registerSubscriber({
    id: "sub-001",
    email: "reader@example.com",
    displayName: "Tendai Moyo"
  });

  const { transaction, replayed } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-prem-intent-001",
    subscriberId: "sub-001",
    clientSuppliedPaid: true,
    clientSuppliedProviderStatus: "Paid",
    clientSuppliedPollUrl: "https://evil.example.test/poll"
  });

  assert.equal(replayed, false);
  assert.equal(transaction.expectedAmount, 5.0);
  assert.equal(transaction.currency, "USD");
  assert.equal(transaction.planKey, "healthtimes_premium_monthly");
  assert.equal(transaction.internalStatus, "CREATED");
  assert.equal(transaction.providerStatus, null);
  assert.equal(transaction.pollUrl, null);
  assert.equal(transaction.reconciliationStatus, "PENDING");
  assert.match(transaction.merchantReference, /^HT-PREM-[0-9A-HJKMNP-TV-Z]{26}$/);
});

test("4. Amount tampering and currency tampering are rejected and generate exceptions", () => {
  const engine = createPaymentFinanceLedgerEngine();
  engine.registerSubscriber({
    id: "sub-002",
    email: "member@example.com",
    displayName: "Rudo Chikwanda"
  });

  // Intent-stage tampering
  assert.throws(
    () =>
      engine.createPaymentIntent({
        purpose: "PREMIUM_SUBSCRIPTION",
        idempotencyKey: "idem-tamper-amt-1",
        subscriberId: "sub-002",
        clientSuppliedAmount: 1.0
      }),
    /AMOUNT_MISMATCH/
  );

  assert.throws(
    () =>
      engine.createPaymentIntent({
        purpose: "PREMIUM_SUBSCRIPTION",
        idempotencyKey: "idem-tamper-curr-1",
        subscriberId: "sub-002",
        clientSuppliedCurrency: "ZWG"
      }),
    /CURRENCY_MISMATCH/
  );

  // Webhook-stage amount tampering
  const { transaction: txAmt } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-webhook-amt-1",
    subscriberId: "sub-002"
  });
  const resAmt = engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-amt-mismatch-1",
    merchantReference: txAmt.merchantReference,
    providerReference: "PN-1001",
    providerStatus: "Paid",
    reportedAmount: 2.5,
    reportedCurrency: "USD"
  });
  assert.equal(resAmt.eventStatus, "REJECTED");
  assert.equal(resAmt.internalStatus, "AMOUNT_MISMATCH");

  // Webhook-stage currency tampering
  const { transaction: txCurr } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-webhook-curr-1",
    subscriberId: "sub-002"
  });
  const resCurr = engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-curr-mismatch-1",
    merchantReference: txCurr.merchantReference,
    providerReference: "PN-1002",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "ZWG"
  });
  assert.equal(resCurr.eventStatus, "REJECTED");
  assert.equal(resCurr.internalStatus, "CURRENCY_MISMATCH");

  const excCodes = engine.getExceptions().map((e) => e.exceptionCode);
  assert.ok(excCodes.includes("AMOUNT_MISMATCH"));
  assert.ok(excCodes.includes("CURRENCY_MISMATCH"));
});

test("5. Deterministic contract hash verification & secret sanitization on provider events", () => {
  const testIntegrationKey = "CONTRACT-VECTOR-KEY-ONLY-NOT-LIVE";
  const engine = createPaymentFinanceLedgerEngine({
    integrationKeyForContractTests: testIntegrationKey
  });
  engine.registerSubscriber({
    id: "sub-hash-1",
    email: "hash@example.com",
    displayName: "Hash Vector Tester"
  });

  const { transaction } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-hash-test-001",
    subscriberId: "sub-hash-1"
  });

  const badHashResult = engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-bad-hash-1",
    merchantReference: transaction.merchantReference,
    providerReference: "PN-BAD-HASH",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    hash: "INVALID_FORGED_HASH",
    rawMetadata: {
      integration_key: "MUST_BE_REDACTED",
      hash: "MUST_BE_REDACTED",
      paynowreference: "PN-BAD-HASH"
    }
  });
  assert.equal(badHashResult.eventStatus, "REJECTED");
  assert.equal(badHashResult.internalStatus, "INVALID_HASH");

  const sanitized = sanitizeProviderMetadata({
    integration_key: "SECRET",
    password: "SECRET",
    hash: "SECRET",
    channel: "ecocash"
  });
  assert.deepEqual(sanitized, { channel: "ecocash" });

  // Valid deterministic contract hash on a second transaction
  const { transaction: tx2 } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-hash-test-002",
    subscriberId: "sub-hash-1"
  });
  const validHash = computeDeterministicProviderHash(
    {
      reference: tx2.merchantReference,
      paynowreference: "PN-GOOD-HASH",
      amount: "5.00",
      currency: "USD",
      status: "Paid"
    },
    testIntegrationKey
  );
  const goodHashResult = engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-good-hash-1",
    merchantReference: tx2.merchantReference,
    providerReference: "PN-GOOD-HASH",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    hash: validHash
  });
  assert.equal(goodHashResult.eventStatus, "PROCESSED");
  assert.equal(goodHashResult.internalStatus, "PAYMENT_VERIFIED");
});

test("6. Idempotency & duplicate events never create a second payment, entitlement, journal, or settlement", () => {
  const engine = createPaymentFinanceLedgerEngine();
  engine.registerSubscriber({
    id: "sub-idem-1",
    email: "idem@example.com",
    displayName: "Idempotency Reader"
  });

  // 1. Intent idempotency
  const firstIntent = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-key-10001",
    subscriberId: "sub-idem-1"
  });
  const secondIntent = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-key-10001",
    subscriberId: "sub-idem-1"
  });
  assert.equal(firstIntent.replayed, false);
  assert.equal(secondIntent.replayed, true);
  assert.equal(firstIntent.transaction.id, secondIntent.transaction.id);

  // Conflicting parameters with same idempotency key must fail
  assert.throws(
    () =>
      engine.createPaymentIntent({
        purpose: "PROVIDER_CONNECTIVITY_TEST",
        idempotencyKey: "idem-key-10001"
      }),
    /IDEMPOTENCY_CONFLICT/
  );

  // 2. Webhook ingestion + duplicate webhook replay
  const firstEvt = engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-unique-9001",
    merchantReference: firstIntent.transaction.merchantReference,
    providerReference: "PN-9001",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    now: "2026-10-27T08:00:00.000Z"
  });
  assert.equal(firstEvt.eventStatus, "PROCESSED");
  assert.equal(firstEvt.internalStatus, "PAYMENT_VERIFIED");

  const dupEvt = engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-unique-9001",
    merchantReference: firstIntent.transaction.merchantReference,
    providerReference: "PN-9001",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    now: "2026-10-27T08:01:00.000Z"
  });
  assert.equal(dupEvt.eventStatus, "DUPLICATE_EVENT");
  assert.equal(dupEvt.internalStatus, "DUPLICATE_EVENT");
  assert.ok(
    engine.getExceptions().some((e) => e.exceptionCode === "DUPLICATE_PROVIDER_EVENT"),
    "Duplicate provider event must be visible in exception queue"
  );

  // 3. Reconcile Premium once, then replay reconciliation
  const rec1 = engine.reconcilePremiumSubscription(
    firstIntent.transaction.id,
    "2026-10-27T08:05:00.000Z"
  );
  assert.equal(rec1.reconciled, true);
  assert.equal(rec1.replayed, false);
  assert.equal(rec1.entitlementChanged, true);

  const rec2 = engine.reconcilePremiumSubscription(
    firstIntent.transaction.id,
    "2026-10-27T09:00:00.000Z"
  );
  assert.equal(rec2.reconciled, true);
  assert.equal(rec2.replayed, true);
  assert.equal(rec2.entitlementChanged, false);
  assert.equal(rec2.newEndsAt, rec1.newEndsAt);
  assert.equal(engine.getEntitlements().length, 1);
});

test("7. Premium early renewal vs expired renewal entitlement math", () => {
  const engine = createPaymentFinanceLedgerEngine();
  engine.registerSubscriber({
    id: "sub-renew-1",
    email: "renew@example.com",
    displayName: "Renewal Subscriber"
  });

  // First purchase at 2026-01-15T10:00:00.000Z -> ends 2026-02-15T10:00:00.000Z
  const { transaction: tx1 } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-renew-001",
    subscriberId: "sub-renew-1"
  });
  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-renew-001",
    merchantReference: tx1.merchantReference,
    providerReference: "PN-REN-1",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    now: "2026-01-15T10:00:00.000Z"
  });
  const firstRec = engine.reconcilePremiumSubscription(tx1.id, "2026-01-15T10:00:00.000Z");
  assert.equal(firstRec.newStartsAt, "2026-01-15T10:00:00.000Z");
  assert.equal(firstRec.newEndsAt, "2026-02-15T10:00:00.000Z");

  // Early renewal on 2026-02-01T10:00:00.000Z (before 2026-02-15) -> base is 2026-02-15, newEnd is 2026-03-15T10:00:00.000Z
  const { transaction: tx2 } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-renew-002",
    subscriberId: "sub-renew-1"
  });
  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-renew-002",
    merchantReference: tx2.merchantReference,
    providerReference: "PN-REN-2",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    now: "2026-02-01T10:00:00.000Z"
  });
  const earlyRec = engine.reconcilePremiumSubscription(tx2.id, "2026-02-01T10:00:00.000Z");
  assert.equal(earlyRec.previousEndsAt, "2026-02-15T10:00:00.000Z");
  assert.equal(earlyRec.newEndsAt, "2026-03-15T10:00:00.000Z");

  // Expired renewal on 2026-05-10T12:00:00.000Z (after 2026-03-15) -> base is 2026-05-10, newEnd is 2026-06-10T12:00:00.000Z
  const { transaction: tx3 } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-renew-003",
    subscriberId: "sub-renew-1"
  });
  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-renew-003",
    merchantReference: tx3.merchantReference,
    providerReference: "PN-REN-3",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    now: "2026-05-10T12:00:00.000Z"
  });
  const expiredRec = engine.reconcilePremiumSubscription(tx3.id, "2026-05-10T12:00:00.000Z");
  assert.equal(expiredRec.previousEndsAt, "2026-03-15T10:00:00.000Z");
  assert.equal(expiredRec.newStartsAt, "2026-05-10T12:00:00.000Z");
  assert.equal(expiredRec.newEndsAt, "2026-06-10T12:00:00.000Z");
});

test("8. Advertising invoice-state gating, method=paynow, bank_transfer preservation, and connectivity test isolation", () => {
  const engine = createPaymentFinanceLedgerEngine();

  // Register invoices in various states
  for (const status of ["draft", "approved", "void", "cancelled"]) {
    engine.registerInvoice({
      id: `inv-${status}`,
      invoiceNumber: `INV-2026-${status.toUpperCase()}`,
      customerId: "cust-1",
      customerName: "Harare Hospital Group",
      currency: "USD",
      subtotal: 200,
      taxTotal: 0,
      discountTotal: 0,
      total: 200,
      amountPaid: 0,
      balanceDue: 200,
      status
    });

    assert.throws(
      () =>
        engine.createPaymentIntent({
          purpose: "ADVERTISING_INVOICE",
          idempotencyKey: `idem-inv-${status}`,
          invoiceId: `inv-${status}`
        }),
      /UNPAYABLE_INVOICE/
    );
  }

  // Register payable invoice (issued) and test partial Paynow + partial bank_transfer settlement
  engine.registerInvoice({
    id: "inv-payable-1",
    invoiceNumber: "INV-2026-0100",
    customerId: "cust-1",
    customerName: "Harare Hospital Group",
    currency: "USD",
    subtotal: 500,
    taxTotal: 0,
    discountTotal: 0,
    total: 500,
    amountPaid: 0,
    balanceDue: 500,
    status: "issued"
  });

  const { transaction: advTx } = engine.createPaymentIntent({
    purpose: "ADVERTISING_INVOICE",
    idempotencyKey: "idem-adv-payable-1",
    invoiceId: "inv-payable-1"
  });
  assert.match(advTx.merchantReference, /^HT-INV-[0-9A-HJKMNP-TV-Z]{26}$/);

  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-adv-0100",
    merchantReference: advTx.merchantReference,
    providerReference: "PN-ADV-100",
    providerStatus: "Paid",
    reportedAmount: 500,
    reportedCurrency: "USD",
    paymentChannel: "ecocash",
    now: "2026-10-27T10:00:00.000Z"
  });

  const advRec = engine.reconcileAdvertisingInvoice(advTx.id, "staff-fin-1", "2026-10-27T10:02:00.000Z");
  assert.equal(advRec.reconciled, true);
  assert.equal(advRec.payment.method, "paynow");
  assert.equal(advRec.payment.providerChannel, "ecocash");
  assert.equal(advRec.payment.providerReference, "PN-ADV-100");
  assert.equal(advRec.invoiceStatus, "paid");
  assert.equal(advRec.balanceDue, 0);

  // Verify bank_transfer remains a first-class method on a second invoice
  engine.registerInvoice({
    id: "inv-bank-1",
    invoiceNumber: "INV-2026-0101",
    customerId: "cust-1",
    customerName: "Harare Hospital Group",
    currency: "USD",
    subtotal: 300,
    taxTotal: 0,
    discountTotal: 0,
    total: 300,
    amountPaid: 0,
    balanceDue: 300,
    status: "overdue"
  });

  const bankPay = engine.recordBankTransferPayment({
    invoiceId: "inv-bank-1",
    amount: 300,
    currency: "USD",
    paymentDate: "2026-10-27",
    bankReference: "STANBIC-TT-8821",
    idempotencyKey: "idem-bank-tt-8821",
    actorStaffId: "staff-fin-1"
  });
  assert.equal(bankPay.payment.method, "bank_transfer");
  assert.equal(bankPay.payment.providerReference, "STANBIC-TT-8821");

  // Verify PROVIDER_CONNECTIVITY_TEST can NEVER be reconciled into Premium or Finance
  const { transaction: connTx } = engine.createPaymentIntent({
    purpose: "PROVIDER_CONNECTIVITY_TEST",
    idempotencyKey: "idem-conn-test-001"
  });
  assert.equal(connTx.reconciliationStatus, "NOT_ELIGIBLE");
  assert.throws(
    () => engine.reconcilePremiumSubscription(connTx.id),
    /CONNECTIVITY_TEST_NOT_RECONCILABLE/
  );
  assert.throws(
    () => engine.reconcileAdvertisingInvoice(connTx.id),
    /CONNECTIVITY_TEST_NOT_RECONCILABLE/
  );
});

test("9. Provider clearing, settlement allocation, settlement mismatch, and fee truthfulness", () => {
  const engine = createPaymentFinanceLedgerEngine();
  engine.configureClearingModel({
    accountantApproved: true,
    providerClearingAccountCode: "1060",
    providerFeeExpenseAccountCode: "5450"
  });

  engine.registerInvoice({
    id: "inv-stl-1",
    invoiceNumber: "INV-2026-0200",
    customerId: "cust-2",
    customerName: "CIMAS Medical Aid",
    currency: "USD",
    subtotal: 100,
    taxTotal: 0,
    discountTotal: 0,
    total: 100,
    amountPaid: 0,
    balanceDue: 100,
    status: "issued"
  });

  const { transaction: tx1 } = engine.createPaymentIntent({
    purpose: "ADVERTISING_INVOICE",
    idempotencyKey: "idem-stl-tx-1",
    invoiceId: "inv-stl-1"
  });
  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-stl-1",
    merchantReference: tx1.merchantReference,
    providerReference: "PN-STL-1",
    providerStatus: "Paid",
    reportedAmount: 100,
    reportedCurrency: "USD",
    now: "2026-10-27T09:00:00.000Z"
  });
  engine.reconcileAdvertisingInvoice(tx1.id, "staff-fin-1", "2026-10-27T09:05:00.000Z");

  // Before settlement, providerFees must be 0 (callback never invents provider fees)
  const preSettlementTransparency = engine.getFinanceTransparency("USD");
  assert.equal(preSettlementTransparency.providerFees, 0);
  assert.equal(preSettlementTransparency.providerClearingPendingSettlement, 100);

  // Record a matched settlement with $100 gross, $2.50 fee, $97.50 net to bank
  const matched = engine.recordProviderSettlement({
    settlementReference: "PAYNOW-BATCH-20261027-A",
    settlementDate: "2026-10-27",
    currency: "USD",
    grossAmount: 100,
    feeAmount: 2.5,
    netAmount: 97.5,
    bankDepositAmount: 97.5,
    bankReference: "ZBBANK-DEP-001",
    lines: [
      {
        transactionId: tx1.id,
        grossAmount: 100,
        feeAmount: 2.5,
        netAmount: 97.5
      }
    ],
    actorStaffId: "staff-fin-1"
  });
  assert.equal(matched.settlement.status, "RECONCILED_TO_BANK");
  assert.equal(matched.exception, null);

  // Duplicate settlement allocation of the same transaction must be rejected
  assert.throws(
    () =>
      engine.recordProviderSettlement({
        settlementReference: "PAYNOW-BATCH-20261027-DUP",
        settlementDate: "2026-10-27",
        currency: "USD",
        grossAmount: 100,
        feeAmount: 2.5,
        netAmount: 97.5,
        lines: [
          {
            transactionId: tx1.id,
            grossAmount: 100,
            feeAmount: 2.5,
            netAmount: 97.5
          }
        ],
        actorStaffId: "staff-fin-1"
      }),
    /DUPLICATE_SETTLEMENT_ALLOCATION/
  );

  // Test settlement mismatch detection on a second transaction
  engine.registerSubscriber({
    id: "sub-stl-2",
    email: "stl2@example.com",
    displayName: "Settlement Mismatch Subscriber"
  });
  const { transaction: tx2 } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-stl-tx-2",
    subscriberId: "sub-stl-2"
  });
  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-stl-2",
    merchantReference: tx2.merchantReference,
    providerReference: "PN-STL-2",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    now: "2026-10-27T11:00:00.000Z"
  });
  engine.reconcilePremiumSubscription(tx2.id, "2026-10-27T11:05:00.000Z");

  const mismatched = engine.recordProviderSettlement({
    settlementReference: "PAYNOW-BATCH-20261027-MISMATCH",
    settlementDate: "2026-10-27",
    currency: "USD",
    grossAmount: 5.0,
    feeAmount: 0.25,
    netAmount: 4.75,
    bankDepositAmount: 4.0, // Bank deposit mismatch!
    lines: [
      {
        transactionId: tx2.id,
        grossAmount: 5.0,
        feeAmount: 0.25,
        netAmount: 4.75
      }
    ],
    actorStaffId: "staff-fin-1"
  });
  assert.equal(mismatched.settlement.status, "SETTLEMENT_MISMATCH");
  assert.equal(mismatched.exception?.exceptionCode, "UNMATCHED_BANK_SETTLEMENT");
});

test("10. Refund & dispute state transitions, audit reason enforcement, and non-destructive history", () => {
  const engine = createPaymentFinanceLedgerEngine();
  engine.registerSubscriber({
    id: "sub-ref-1",
    email: "refund@example.com",
    displayName: "Refund Tester"
  });

  const { transaction } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-refund-001",
    subscriberId: "sub-ref-1"
  });
  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-refund-001",
    merchantReference: transaction.merchantReference,
    providerReference: "PN-REF-001",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    now: "2026-10-27T12:00:00.000Z"
  });
  engine.reconcilePremiumSubscription(transaction.id, "2026-10-27T12:02:00.000Z");

  // Missing reason on manual refund intervention must be rejected
  assert.throws(
    () =>
      engine.recordRefundOrDisputeTransition({
        transactionId: transaction.id,
        reversalType: "REFUND",
        workflowState: "REFUND_REQUESTED",
        reason: "",
        actorStaffId: "staff-fin-1"
      }),
    /REASON_REQUIRED/
  );

  // Valid refund transitions: RECONCILED -> REFUND_REQUESTED -> REFUND_CONFIRMED -> REVERSAL_REQUIRED
  const reqStep = engine.recordRefundOrDisputeTransition({
    transactionId: transaction.id,
    reversalType: "REFUND",
    workflowState: "REFUND_REQUESTED",
    reason: "Subscriber duplicate device payment request",
    actorStaffId: "staff-fin-1",
    now: "2026-10-27T13:00:00.000Z"
  });
  assert.equal(reqStep.transaction.internalStatus, "REFUND_REQUESTED");
  assert.equal(reqStep.reversal.entitlementAction, "PENDING_OWNER_POLICY");
  assert.equal(reqStep.reversal.accountingAction, "PENDING_ACCOUNTANT_POLICY");
  assert.equal(reqStep.exception.exceptionCode, "REFUND_REVIEW");

  const confStep = engine.recordRefundOrDisputeTransition({
    transactionId: transaction.id,
    reversalType: "REFUND",
    workflowState: "REFUND_CONFIRMED",
    reason: "Provider confirmed refund execution",
    actorStaffId: "staff-fin-1",
    now: "2026-10-27T14:00:00.000Z"
  });
  assert.equal(confStep.transaction.internalStatus, "REFUND_CONFIRMED");
  assert.equal(confStep.transaction.reconciliationStatus, "REVERSED");

  // Destructive deletion must always throw
  assert.throws(() => engine.deleteTransaction(transaction.id), /DESTRUCTIVE_PAYMENT_DELETION_PROHIBITED/);
});

test("11. Finance Transparency, Commercial Transparency (AdSense separated), Daily & Month-End Controls, and Business Receipts", () => {
  const engine = createPaymentFinanceLedgerEngine();
  engine.registerSubscriber({
    id: "sub-trans-1",
    email: "trans@example.com",
    displayName: "Transparency Subscriber"
  });
  engine.registerInvoice({
    id: "inv-trans-1",
    invoiceNumber: "INV-2026-0500",
    customerId: "cust-5",
    customerName: "NatPharm",
    currency: "USD",
    subtotal: 400,
    taxTotal: 0,
    discountTotal: 0,
    total: 400,
    amountPaid: 0,
    balanceDue: 400,
    status: "issued"
  });

  // Premium payment ($5.00)
  const { transaction: premTx } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-trans-prem-1",
    subscriberId: "sub-trans-1"
  });

  // Before verification, receipt generation must fail closed
  assert.throws(() => engine.getBusinessReceipt(premTx.id), /RECEIPT_UNAVAILABLE_UNVERIFIED/);

  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-trans-prem-1",
    merchantReference: premTx.merchantReference,
    providerReference: "PN-TRANS-1",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    paymentChannel: "innbucks",
    now: "2026-10-27T08:30:00.000Z"
  });
  engine.reconcilePremiumSubscription(premTx.id, "2026-10-27T08:31:00.000Z");

  const receipt = engine.getBusinessReceipt(premTx.id);
  assert.equal(receipt.healthtimesReference, premTx.merchantReference);
  assert.equal(receipt.businessPurpose, "PREMIUM_SUBSCRIPTION");
  assert.equal(receipt.amount, 5.0);
  assert.equal(receipt.currency, "USD");
  assert.equal(receipt.paymentMethod, "paynow");
  assert.equal(receipt.paymentChannel, "innbucks");
  assert.equal(receipt.providerReference, "PN-TRANS-1");

  // Record separate AdSense revenue ($125.50) and verify it is never merged into Paynow or Direct Advertising
  engine.recordSeparateAdSenseRevenue(125.5);
  engine.recordOtherCommercialRevenue(50.0);

  const comm = engine.getCommercialRevenueTransparency("USD");
  assert.equal(comm.premiumRevenue, 5.0);
  assert.equal(comm.directAdvertisingRevenue, 0);
  assert.equal(comm.adsenseRevenue, 125.5);
  assert.equal(comm.otherCommercialRevenue, 50.0);

  const fin = engine.getFinanceTransparency("USD");
  assert.equal(fin.accountsReceivable, 400);
  assert.equal(fin.providerClearingPendingSettlement, 5.0);
  assert.equal(fin.bankSettlements, 0);

  // Daily clearing control: opening 0 + collections 5.00 - settlements 0 - fees 0 - refunds 0 = closing 5.00
  const dailyBalanced = engine.runDailyClearingControl({
    controlDate: "2026-10-27",
    openingProviderClearing: 0,
    reportedActualClosingClearing: 5.0
  });
  assert.equal(dailyBalanced.closingProviderClearing, 5.0);
  assert.equal(dailyBalanced.unexplainedDifference, 0);
  assert.equal(dailyBalanced.status, "BALANCED");

  // Unexplained daily variance must enter exception status
  const dailyVariance = engine.runDailyClearingControl({
    controlDate: "2026-10-27",
    openingProviderClearing: 0,
    reportedActualClosingClearing: 3.0
  });
  assert.equal(dailyVariance.unexplainedDifference, -2.0);
  assert.equal(dailyVariance.status, "EXCEPTION_RAISED");

  const monthEnd = engine.getMonthEndControl({
    periodStart: "2026-10-01",
    periodEnd: "2026-10-31",
    currency: "USD"
  });
  assert.equal(monthEnd.providerCollections, 5.0);
  assert.equal(monthEnd.outstandingClearing, 5.0);
  assert.equal(monthEnd.outstandingAr, 400);
  assert.equal(monthEnd.premiumReceipts, 5.0);
});

test("12. No provider credential requirement: PAYNOW_CONFIGURED=NO, CHECKOUT_FAILS_CLOSED, NO BUSINESS AUTHORITY MUTATED", async () => {
  const readiness = resolvePaynowReadinessState({});
  assert.deepEqual(readiness, {
    provider: "paynow",
    configured: false,
    mode: "unavailable",
    checkout_available: false,
    paynow_configured: "NO",
    checkout_behavior: "CHECKOUT_FAILS_CLOSED",
    business_authority_mutated: false
  });

  const engine = createPaymentFinanceLedgerEngine({ env: {} });
  engine.registerSubscriber({
    id: "sub-failclosed-1",
    email: "fc@example.com",
    displayName: "Fail Closed Reader"
  });
  const { transaction } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-failclosed-001",
    subscriberId: "sub-failclosed-1"
  });

  const checkoutAttempt = engine.initiateProviderCheckout(transaction.id);
  assert.equal(checkoutAttempt.allowed, false);
  assert.equal(checkoutAttempt.readiness.paynow_configured, "NO");
  assert.equal(checkoutAttempt.readiness.checkout_behavior, "CHECKOUT_FAILS_CLOSED");
  assert.equal(engine.getEntitlements().length, 0);

  // Verify Advertiser Invoice Payment Options when Paynow is unconfigured
  const invOptions = getAdvertiserInvoicePaymentOptions(
    {
      id: "inv-1",
      invoiceNumber: "INV-2026-0001",
      status: "issued",
      balanceDue: 250,
      currency: "USD"
    },
    readiness
  );
  assert.equal(invOptions.eligibleForPayment, true);
  assert.equal(invOptions.payOnline.available, false);
  assert.equal(invOptions.payOnline.statusText, "Provider unavailable / configuration pending");
  assert.equal(invOptions.bankTransfer.available, true);
  assert.equal(invOptions.bankTransfer.method, "bank_transfer");

  // Verify API readiness endpoint response
  let statusCode = 0;
  let body = "";
  const req = { method: "GET", url: "/api/commerce?action=readiness", headers: { host: "localhost" } };
  const res = {
    set statusCode(val) {
      statusCode = val;
    },
    get statusCode() {
      return statusCode;
    },
    setHeader() {},
    end(payload) {
      body = payload;
    }
  };
  await commerceApi(req, res);
  assert.equal(statusCode, 200);
  const parsed = JSON.parse(body);
  assert.equal(parsed.provider, "paynow");
  assert.equal(parsed.configured, false);
  assert.equal(parsed.checkout_available, false);
  assert.equal(parsed.paynow_configured, "NO");

  // Verify newsroom-finance service preserves method=paynow without disguising as mobile_money
  const rpcCalls = [];
  const financeService = financeModule.createNewsroomFinanceService(() => ({
    rpc: async (fn, args) => {
      rpcCalls.push({ fn, args });
      return {
        data: { id: "pay-1", payment_number: "PAY-2026-0001", invoice_id: "inv-1", amount: 100, currency: "USD" },
        error: null
      };
    }
  }));
  await financeService.recordPayment({
    invoiceId: "inv-1",
    amount: 100,
    currency: "USD",
    paymentMethod: "paynow",
    reference: "PN-100",
    idempotencyKey: "idem-paynow-direct-1"
  });
  assert.equal(rpcCalls[0].args.p_method, "paynow");

  // Verify Accountant and Owner Policy Registers are complete and unresolved
  assert.equal(ACCOUNTANT_POLICY_REGISTER.length, 8);
  assert.equal(OWNER_POLICY_REGISTER.length, 7);
  assert.equal(canTransitionPaymentState("CREATED", "PROVIDER_INITIATED"), true);
  assert.equal(canTransitionPaymentState("CANCELLED", "RECONCILED"), false);
  assert.equal(mapTransactionToPremiumCheckoutState("RECONCILED", false), "Activated");
  assert.equal(mapTransactionToPremiumCheckoutState("AMOUNT_MISMATCH", false), "Requires review");
});
