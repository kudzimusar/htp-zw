import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
  evaluateProviderReadinessGates,
  resolvePaynowReadinessState,
  createSyntheticProviderVerificationAdapter,
  getAdvertiserInvoicePaymentOptions,
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

test("3. RDY01-R1-001: Credentials alone do NOT enable checkout, PAYNOW_MODE fails closed, and readiness matches 503 checkout truth", async () => {
  // Case A: No credentials, no mode
  const emptyReadiness = resolvePaynowReadinessState({});
  assert.equal(emptyReadiness.credentials_present, false);
  assert.equal(emptyReadiness.mode, "unavailable");
  assert.equal(emptyReadiness.mode_status, "configuration_incomplete_missing_mode");
  assert.equal(emptyReadiness.provider_authority_certified, false);
  assert.equal(emptyReadiness.checkout_implementation_ready, false);
  assert.equal(emptyReadiness.configured, false);
  assert.equal(emptyReadiness.checkout_available, false);
  assert.equal(emptyReadiness.status, "authority-incomplete");

  // Case B: Credentials present, missing PAYNOW_MODE -> must fail closed, never silently mapped to 'test'
  const missingMode = resolvePaynowReadinessState({
    PAYNOW_INTEGRATION_ID: "19999",
    PAYNOW_INTEGRATION_KEY: "secret-key-candidate"
  });
  assert.equal(missingMode.credentials_present, true);
  assert.equal(missingMode.mode, "unavailable");
  assert.equal(missingMode.mode_status, "configuration_incomplete_missing_mode");
  assert.equal(missingMode.checkout_available, false);
  assert.equal(missingMode.configured, false);
  assert.equal(missingMode.status, "authority-incomplete");

  // Case C: Credentials present, invalid PAYNOW_MODE -> must fail closed
  const invalidMode = resolvePaynowReadinessState({
    PAYNOW_INTEGRATION_ID: "19999",
    PAYNOW_INTEGRATION_KEY: "secret-key-candidate",
    PAYNOW_MODE: "sandbox-invalid"
  });
  assert.equal(invalidMode.credentials_present, true);
  assert.equal(invalidMode.mode, "unavailable");
  assert.equal(invalidMode.mode_status, "configuration_incomplete_invalid_mode");
  assert.equal(invalidMode.checkout_available, false);
  assert.equal(invalidMode.configured, false);
  assert.equal(invalidMode.status, "authority-incomplete");

  // Case D: Credentials present, PAYNOW_MODE=live -> must fail closed
  const liveMode = evaluateProviderReadinessGates(
    {
      PAYNOW_INTEGRATION_ID: "19999",
      PAYNOW_INTEGRATION_KEY: "secret-key-candidate",
      PAYNOW_MODE: "live"
    },
    {
      providerAuthorityCertified: true,
      checkoutImplementationReady: true
    }
  );
  assert.equal(liveMode.credentials_present, true);
  assert.equal(liveMode.mode, "live");
  assert.equal(liveMode.mode_status, "live_forbidden_fail_closed");
  assert.equal(liveMode.checkout_available, false);
  assert.equal(liveMode.configured, false);
  assert.equal(liveMode.status, "authority-incomplete");

  // Case E: Credentials present + PAYNOW_MODE=test, but without provider certification -> fails closed
  const testModeUncertified = resolvePaynowReadinessState({
    PAYNOW_INTEGRATION_ID: "19999",
    PAYNOW_INTEGRATION_KEY: "secret-key-candidate",
    PAYNOW_MODE: "test"
  });
  assert.equal(testModeUncertified.credentials_present, true);
  assert.equal(testModeUncertified.mode, "test");
  assert.equal(testModeUncertified.mode_status, "valid_test_configuration_candidate");
  assert.equal(testModeUncertified.provider_authority_certified, false);
  assert.equal(testModeUncertified.checkout_implementation_ready, false);
  assert.equal(testModeUncertified.configured, false);
  assert.equal(testModeUncertified.checkout_available, false);
  assert.equal(testModeUncertified.status, "authority-incomplete");

  // Case F: Provider certification true, but without checkout implementation ready -> fails closed
  const certifiedWithoutCheckoutImpl = evaluateProviderReadinessGates(
    {
      PAYNOW_INTEGRATION_ID: "19999",
      PAYNOW_INTEGRATION_KEY: "secret-key-candidate",
      PAYNOW_MODE: "test"
    },
    {
      providerAuthorityCertified: true,
      checkoutImplementationReady: false
    }
  );
  assert.equal(certifiedWithoutCheckoutImpl.provider_authority_certified, true);
  assert.equal(certifiedWithoutCheckoutImpl.checkout_implementation_ready, false);
  assert.equal(certifiedWithoutCheckoutImpl.checkout_available, false);
  assert.equal(certifiedWithoutCheckoutImpl.configured, false);
  assert.equal(certifiedWithoutCheckoutImpl.status, "authority-incomplete");

  // Case G: Server readiness endpoint & checkoutDecision consistency even when credentials + PAYNOW_MODE=test are set
  const libReadinessWithCreds = commerceLib.providerReadinessState({
    PAYNOW_INTEGRATION_ID: "19999",
    PAYNOW_INTEGRATION_KEY: "secret-key-candidate",
    PAYNOW_MODE: "test"
  });
  const libCheckoutWithCreds = commerceLib.checkoutDecision({
    PAYNOW_INTEGRATION_ID: "19999",
    PAYNOW_INTEGRATION_KEY: "secret-key-candidate",
    PAYNOW_MODE: "test"
  });
  assert.equal(libReadinessWithCreds.credentials_present, true);
  assert.equal(libReadinessWithCreds.mode, "test");
  assert.equal(libReadinessWithCreds.provider_authority_certified, false);
  assert.equal(libReadinessWithCreds.checkout_implementation_ready, false);
  assert.equal(libReadinessWithCreds.checkout_available, false);
  assert.equal(libReadinessWithCreds.status, "authority-incomplete");
  assert.equal(libCheckoutWithCreds.httpStatus, 503);
  assert.equal(libCheckoutWithCreds.providerReadiness.checkout_available, false);
  assert.equal(libCheckoutWithCreds.providerReadiness.status, "authority-incomplete");

  // HTTP handler check for GET /api/commerce?action=readiness and POST /api/commerce?action=checkout
  const invokeApi = async (method, url) => {
    let statusCode = 0;
    let payload = "";
    await commerceApi(
      { method, url, headers: { host: "localhost" } },
      {
        set statusCode(v) {
          statusCode = v;
        },
        get statusCode() {
          return statusCode;
        },
        setHeader() {},
        end(body) {
          payload = body;
        }
      }
    );
    return { statusCode, body: JSON.parse(payload) };
  };

  const getReadiness = await invokeApi("GET", "/api/commerce?action=readiness");
  const postCheckout = await invokeApi("POST", "/api/commerce?action=checkout");
  assert.equal(getReadiness.statusCode, 200);
  assert.equal(getReadiness.body.checkout_available, false);
  assert.equal(getReadiness.body.status, "authority-incomplete");
  assert.equal(postCheckout.statusCode, 503);
  assert.equal(postCheckout.body.entitlementGranted, false);
});

test("4. RDY01-R1-002: False Paynow hash is removed, unverified events never become PAYMENT_VERIFIED, and synthetic verification is explicitly classified", () => {
  assert.equal("computeDeterministicProviderHash" in readinessModule, false);
  const sourceCode = fs.readFileSync(
    path.join(repoRoot, "apps/mobile/src/growth/payment-readiness.ts"),
    "utf8"
  );
  assert.equal(sourceCode.includes("computeDeterministicProviderHash"), false);

  const unverifiedEngine = createPaymentFinanceLedgerEngine();
  unverifiedEngine.registerSubscriber({
    id: "sub-unverified-1",
    email: "unverified@example.com",
    displayName: "Unverified Event Tester"
  });
  const { transaction: unverifiedTx } = unverifiedEngine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-unverified-001",
    subscriberId: "sub-unverified-1"
  });

  const unverifiedEvtResult = unverifiedEngine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-unverified-001",
    merchantReference: unverifiedTx.merchantReference,
    providerReference: "PN-UNVERIFIED-001",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD"
  });

  assert.equal(unverifiedEvtResult.eventStatus, "REJECTED");
  assert.equal(unverifiedEvtResult.internalStatus, "INVALID_HASH");
  assert.equal(unverifiedEvtResult.verificationAuthority, "NO_VERIFICATION_AUTHORITY");
  assert.equal(unverifiedEvtResult.signatureValid, false);

  assert.throws(
    () => unverifiedEngine.reconcilePremiumSubscription(unverifiedTx.id),
    /RECONCILIATION_FAILED/
  );
  assert.equal(unverifiedEngine.getEntitlements().length, 0);

  const syntheticAdapter = createSyntheticProviderVerificationAdapter();
  assert.equal(syntheticAdapter.classification, "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION");

  const syntheticEngine = createPaymentFinanceLedgerEngine({
    syntheticVerificationAdapter: syntheticAdapter
  });
  syntheticEngine.registerSubscriber({
    id: "sub-synth-1",
    email: "synth@example.com",
    displayName: "Synthetic Adapter Tester"
  });

  const { transaction: rejectedTx } = syntheticEngine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-synth-reject-001",
    subscriberId: "sub-synth-1"
  });
  const synthRejected = syntheticEngine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-synth-reject-1",
    merchantReference: rejectedTx.merchantReference,
    providerReference: "PN-SYNTH-REJ",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD",
    syntheticDecision: "REJECT_SYNTHETIC_TAMPER",
    rawMetadata: {
      integration_key: "MUST_BE_REDACTED",
      hash: "MUST_BE_REDACTED",
      channel: "ecocash"
    }
  });
  assert.equal(synthRejected.eventStatus, "REJECTED");
  assert.equal(synthRejected.internalStatus, "INVALID_HASH");
  assert.equal(synthRejected.verificationAuthority, "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION");
  assert.equal(synthRejected.signatureValid, false);

  const { transaction: acceptedTx } = syntheticEngine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-synth-accept-001",
    subscriberId: "sub-synth-1"
  });
  const synthAccepted = syntheticEngine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-synth-accept-1",
    merchantReference: acceptedTx.merchantReference,
    providerReference: "PN-SYNTH-ACC",
    providerStatus: "Paid",
    reportedAmount: 5.0,
    reportedCurrency: "USD"
  });
  assert.equal(synthAccepted.eventStatus, "PROCESSED");
  assert.equal(synthAccepted.internalStatus, "PAYMENT_VERIFIED");
  assert.equal(synthAccepted.verificationAuthority, "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION");
  assert.equal(synthAccepted.signatureValid, false);

  const sanitized = sanitizeProviderMetadata({
    integration_key: "SECRET",
    password: "SECRET",
    hash: "SECRET",
    channel: "ecocash"
  });
  assert.deepEqual(sanitized, { channel: "ecocash" });
});

test("5. Payment-intent integrity, amount tampering, and currency tampering rejection", () => {
  const engine = createPaymentFinanceLedgerEngine({
    syntheticVerificationAdapter: createSyntheticProviderVerificationAdapter()
  });
  engine.registerSubscriber({
    id: "sub-002",
    email: "member@example.com",
    displayName: "Rudo Chikwanda"
  });

  const { transaction } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-prem-intent-001",
    subscriberId: "sub-002",
    clientSuppliedPaid: true,
    clientSuppliedProviderStatus: "Paid",
    clientSuppliedPollUrl: "https://evil.example.test/poll"
  });
  assert.equal(transaction.expectedAmount, 5.0);
  assert.equal(transaction.currency, "USD");
  assert.equal(transaction.internalStatus, "CREATED");
  assert.equal(transaction.accountingStatus, "PENDING_ACCOUNTANT_AUTHORITY");
  assert.equal(transaction.verificationAuthority, "NO_VERIFICATION_AUTHORITY");
  assert.equal(transaction.providerStatus, null);
  assert.equal(transaction.pollUrl, null);

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

test("6. Idempotency & duplicate events never create a second payment, entitlement, journal, or settlement", () => {
  const engine = createPaymentFinanceLedgerEngine({
    syntheticVerificationAdapter: createSyntheticProviderVerificationAdapter()
  });
  engine.registerSubscriber({
    id: "sub-idem-1",
    email: "idem@example.com",
    displayName: "Idempotency Reader"
  });

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

  assert.throws(
    () =>
      engine.createPaymentIntent({
        purpose: "PROVIDER_CONNECTIVITY_TEST",
        idempotencyKey: "idem-key-10001"
      }),
    /IDEMPOTENCY_CONFLICT/
  );

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

  const rec1 = engine.reconcilePremiumSubscription(
    firstIntent.transaction.id,
    "2026-10-27T08:05:00.000Z"
  );
  assert.equal(rec1.reconciled, true);
  assert.equal(rec1.replayed, false);
  assert.equal(rec1.entitlementChanged, true);
  assert.equal(rec1.businessReconciliation, "COMPLETE");
  assert.equal(rec1.accountingStatus, "PENDING_ACCOUNTANT_AUTHORITY");
  assert.equal(rec1.revenueJournalId, null);

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
  const engine = createPaymentFinanceLedgerEngine({
    syntheticVerificationAdapter: createSyntheticProviderVerificationAdapter()
  });
  engine.registerSubscriber({
    id: "sub-renew-1",
    email: "renew@example.com",
    displayName: "Renewal Subscriber"
  });

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

test("8. RDY01-R1-003: Business reconciliation vs Accounting reconciliation (accountant authority absent vs approved)", () => {
  const engine = createPaymentFinanceLedgerEngine({
    syntheticVerificationAdapter: createSyntheticProviderVerificationAdapter()
  });

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

  engine.registerInvoice({
    id: "inv-pending-acc",
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

  const { transaction: advTx1 } = engine.createPaymentIntent({
    purpose: "ADVERTISING_INVOICE",
    idempotencyKey: "idem-adv-pending-acc-1",
    invoiceId: "inv-pending-acc"
  });
  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-adv-0100",
    merchantReference: advTx1.merchantReference,
    providerReference: "PN-ADV-100",
    providerStatus: "Paid",
    reportedAmount: 500,
    reportedCurrency: "USD",
    paymentChannel: "ecocash",
    now: "2026-10-27T10:00:00.000Z"
  });

  const advRecPending = engine.reconcileAdvertisingInvoice(advTx1.id, "staff-fin-1", "2026-10-27T10:02:00.000Z");
  assert.equal(advRecPending.reconciled, true);
  assert.equal(advRecPending.businessReconciliation, "COMPLETE");
  assert.equal(advRecPending.accountingStatus, "PENDING_ACCOUNTANT_AUTHORITY");
  assert.equal(advRecPending.clearingJournalId, null);
  assert.equal(advRecPending.payment.method, "paynow");
  assert.equal(advRecPending.payment.providerChannel, "ecocash");
  assert.equal(advRecPending.payment.accountingStatus, "PENDING_ACCOUNTANT_AUTHORITY");
  assert.equal(advRecPending.payment.clearingJournalId, null);
  assert.equal(engine.getJournals().length, 0);

  const transBeforeApproval = engine.getFinanceTransparency("USD");
  assert.equal(transBeforeApproval.businessReconciled, 500);
  assert.equal(transBeforeApproval.accountingPendingAuthority, 500);
  assert.equal(transBeforeApproval.accountingPosted, 0);
  assert.equal(transBeforeApproval.providerClearingPendingSettlement, 500);
  assert.equal(transBeforeApproval.bankSettled, 0);

  engine.configureClearingModel({
    accountantApproved: true,
    providerClearingAccountCode: "1060",
    providerFeeExpenseAccountCode: "5450"
  });

  engine.registerInvoice({
    id: "inv-approved-acc",
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

  const { transaction: advTx2 } = engine.createPaymentIntent({
    purpose: "ADVERTISING_INVOICE",
    idempotencyKey: "idem-adv-approved-acc-1",
    invoiceId: "inv-approved-acc"
  });
  engine.ingestProviderWebhookEvent({
    provider: "paynow",
    providerEventId: "evt-adv-0101",
    merchantReference: advTx2.merchantReference,
    providerReference: "PN-ADV-101",
    providerStatus: "Paid",
    reportedAmount: 300,
    reportedCurrency: "USD",
    paymentChannel: "innbucks",
    now: "2026-10-27T11:00:00.000Z"
  });

  const advRecPosted = engine.reconcileAdvertisingInvoice(advTx2.id, "staff-fin-1", "2026-10-27T11:02:00.000Z");
  assert.equal(advRecPosted.reconciled, true);
  assert.equal(advRecPosted.businessReconciliation, "COMPLETE");
  assert.equal(advRecPosted.accountingStatus, "POSTED");
  assert.ok(advRecPosted.clearingJournalId);
  assert.equal(engine.getJournals().length, 1);

  const transAfterApproval = engine.getFinanceTransparency("USD");
  assert.equal(transAfterApproval.businessReconciled, 800);
  assert.equal(transAfterApproval.accountingPendingAuthority, 500);
  assert.equal(transAfterApproval.accountingPosted, 300);
  assert.equal(transAfterApproval.providerClearingPendingSettlement, 800);
});

test("9. Provider clearing, settlement allocation, settlement mismatch, and fee truthfulness", () => {
  const engine = createPaymentFinanceLedgerEngine({
    syntheticVerificationAdapter: createSyntheticProviderVerificationAdapter()
  });
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

  const preSettlementTransparency = engine.getFinanceTransparency("USD");
  assert.equal(preSettlementTransparency.providerFees, 0);
  assert.equal(preSettlementTransparency.providerClearingPendingSettlement, 100);

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
  assert.equal(matched.settlement.accountingStatus, "POSTED");
  assert.equal(matched.exception, null);

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
    bankDepositAmount: 4.0,
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
  const engine = createPaymentFinanceLedgerEngine({
    syntheticVerificationAdapter: createSyntheticProviderVerificationAdapter()
  });
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
  assert.equal(confStep.transaction.accountingStatus, "REVERSED");

  assert.throws(() => engine.deleteTransaction(transaction.id), /DESTRUCTIVE_PAYMENT_DELETION_PROHIBITED/);
});

test("11. Finance Transparency, Commercial Transparency (AdSense separated), Daily & Month-End Controls, and Business Receipts", async () => {
  const engine = createPaymentFinanceLedgerEngine({
    syntheticVerificationAdapter: createSyntheticProviderVerificationAdapter()
  });
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

  const { transaction: premTx } = engine.createPaymentIntent({
    purpose: "PREMIUM_SUBSCRIPTION",
    idempotencyKey: "idem-trans-prem-1",
    subscriberId: "sub-trans-1"
  });

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
  assert.equal(receipt.accountingStatus, "PENDING_ACCOUNTANT_AUTHORITY");

  engine.recordSeparateAdSenseRevenue(125.5);
  engine.recordOtherCommercialRevenue(50.0);

  const comm = engine.getCommercialRevenueTransparency("USD");
  assert.equal(comm.premiumRevenue, 5.0);
  assert.equal(comm.directAdvertisingRevenue, 0);
  assert.equal(comm.adsenseRevenue, 125.5);
  assert.equal(comm.otherCommercialRevenue, 50.0);

  const fin = engine.getFinanceTransparency("USD");
  assert.equal(fin.accountsReceivable, 400);
  assert.equal(fin.businessReconciled, 5.0);
  assert.equal(fin.accountingPendingAuthority, 5.0);
  assert.equal(fin.accountingPosted, 0);
  assert.equal(fin.providerClearingPendingSettlement, 5.0);
  assert.equal(fin.bankSettled, 0);

  const dailyBalanced = engine.runDailyClearingControl({
    controlDate: "2026-10-27",
    openingProviderClearing: 0,
    reportedActualClosingClearing: 5.0
  });
  assert.equal(dailyBalanced.closingProviderClearing, 5.0);
  assert.equal(dailyBalanced.unexplainedDifference, 0);
  assert.equal(dailyBalanced.status, "BALANCED");

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

  const invOptions = getAdvertiserInvoicePaymentOptions(
    {
      id: "inv-1",
      invoiceNumber: "INV-2026-0001",
      status: "issued",
      balanceDue: 250,
      currency: "USD"
    },
    resolvePaynowReadinessState({
      PAYNOW_INTEGRATION_ID: "19999",
      PAYNOW_INTEGRATION_KEY: "secret",
      PAYNOW_MODE: "test"
    })
  );
  assert.equal(invOptions.eligibleForPayment, true);
  assert.equal(invOptions.payOnline.available, false);
  assert.equal(invOptions.payOnline.statusText, "Provider unavailable / configuration pending");
  assert.equal(invOptions.bankTransfer.available, true);

  assert.equal(ACCOUNTANT_POLICY_REGISTER.length, 8);
  assert.equal(OWNER_POLICY_REGISTER.length, 7);
  assert.equal(canTransitionPaymentState("CREATED", "PROVIDER_INITIATED"), true);
  assert.equal(canTransitionPaymentState("CANCELLED", "RECONCILED"), false);
  assert.equal(mapTransactionToPremiumCheckoutState("RECONCILED", false), "Activated");
  assert.equal(mapTransactionToPremiumCheckoutState("AMOUNT_MISMATCH", false), "Requires review");
});

test("12. Section 14 SQL Migration & Runtime Contract Verification (disposable PostgreSQL when socket/IPC permitted, full SQL structure verification always)", () => {
  const migrationPath = path.join(
    repoRoot,
    "supabase/migrations/20261027000000_ht_ext01a_payment_finance_readiness.sql"
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf8");

  // Structural & security boundary assertions on the SQL migration
  assert.match(migrationSql, /create or replace function public\.payment_create_intent\(/);
  assert.match(migrationSql, /create or replace function public\.payment_reconcile_premium_transaction\(/);
  assert.match(migrationSql, /create or replace function public\.payment_reconcile_advertising_invoice\(/);
  assert.match(migrationSql, /create or replace function public\.finance_get_payment_transparency\(/);
  assert.match(migrationSql, /accounting_status text not null default 'PENDING_ACCOUNTANT_AUTHORITY'/);
  assert.match(migrationSql, /verification_authority text not null default 'NO_VERIFICATION_AUTHORITY'/);
  assert.match(migrationSql, /revoke all on function public\.payment_create_intent\(text, text, uuid, uuid, text, numeric, text\) from public, anon, authenticated/);
  assert.match(migrationSql, /grant execute on function public\.payment_create_intent\(text, text, uuid, uuid, text, numeric, text\) to service_role/);
  assert.match(migrationSql, /create trigger trg_payment_transactions_no_delete/);
  assert.match(migrationSql, /create trigger trg_payment_audit_logs_immutable/);

  // Attempt disposable local PostgreSQL runtime execution if local socket/IPC is permitted by OS sandbox
  const psqlCandidates = [
    "/opt/homebrew/Cellar/postgresql@16/16.15/bin/psql",
    "/opt/homebrew/bin/psql",
    "psql"
  ];
  const psqlBin = psqlCandidates.find((p) => p === "psql" || fs.existsSync(p));
  if (!psqlBin) return;

  const dbName = `ht_rdy01_r1_verify_${process.pid}`;
  let canConnect = false;
  try {
    execFileSync(psqlBin, ["-h", "/tmp", "-p", "5432", "-d", "postgres", "-qAt", "-c", "SELECT 1;"], {
      stdio: "pipe"
    });
    canConnect = true;
  } catch (err) {
    const msg = String(err?.stderr || err?.message || "");
    // Under macOS Seatbelt sandbox with network/IPC disabled, socket connect returns Operation not permitted
    if (msg.includes("Operation not permitted") || msg.includes("could not connect")) {
      return;
    }
    throw err;
  }

  if (!canConnect) return;

  const runDbSql = (db, sqlText) =>
    execFileSync(
      psqlBin,
      ["-h", "/tmp", "-p", "5432", "-d", db, "-v", "ON_ERROR_STOP=1", "-qAt"],
      { input: sqlText, encoding: "utf8" }
    ).trim();

  try {
    runDbSql("postgres", `drop database if exists ${dbName}; create database ${dbName};`);
    runDbSql(
      dbName,
      `
      create extension if not exists pgcrypto;
      create schema if not exists auth;
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
      end $$;
      create table public.newsroom_capabilities (key text primary key, description text);
      create table public.newsroom_roles (id uuid primary key default gen_random_uuid(), name text unique not null, description text);
      create table public.newsroom_role_capabilities (role_id uuid references public.newsroom_roles(id), capability_key text references public.newsroom_capabilities(key), primary key (role_id, capability_key));
      insert into public.newsroom_roles(name, description) values ('Publisher / Owner', 'Owner'), ('Finance Manager', 'Finance'), ('Accounts Officer', 'Accounts');
      create table public.staff_profiles (id uuid primary key default gen_random_uuid(), display_name text not null default 'Staff');
      create or replace function public.newsroom_current_staff_id_basic() returns uuid language sql stable as $$ select id from public.staff_profiles limit 1; $$;
      create or replace function public.newsroom_has_capability(p_cap text) returns boolean language sql stable as $$ select true; $$;
      create table public.audit_logs (id uuid primary key default gen_random_uuid(), actor_staff_id uuid, action text not null, target_table text, target_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
      create table public.subscribers (id uuid primary key default gen_random_uuid(), auth_user_id uuid unique, email text not null unique, display_name text, status text not null default 'active', created_at timestamptz not null default now());
      create table public.premium_entitlements (id uuid primary key default gen_random_uuid(), subscriber_id uuid not null references public.subscribers(id) on delete cascade, policy_key text not null, starts_at timestamptz not null default now(), ends_at timestamptz, provider text, provider_reference text, unique (subscriber_id, policy_key, provider, provider_reference));
      create table public.provider_webhook_events (id uuid primary key default gen_random_uuid(), provider text not null check (provider in ('cloudflare','resend','brevo','social')), provider_event_id text not null, event_type text not null, signature_valid boolean not null, payload_hash text not null, payload jsonb not null default '{}'::jsonb, status text not null default 'received' check (status in ('received','processed','ignored','failed')), received_at timestamptz not null default now(), processed_at timestamptz, error text, unique(provider,provider_event_id));
      create table public.finance_number_counters (doc_type text not null check (doc_type in ('invoice','payment','expense','order','journal','credit_note')), fiscal_year int not null, last_value int not null default 0, primary key (doc_type, fiscal_year));
      create table public.finance_customers (id uuid primary key default gen_random_uuid(), legal_name text not null, currency text not null default 'USD');
      create table public.finance_invoices (id uuid primary key default gen_random_uuid(), invoice_number text not null unique, customer_id uuid not null references public.finance_customers(id), currency text not null default 'USD', subtotal numeric(18,2) not null default 0, tax_total numeric(18,2) not null default 0, discount_total numeric(18,2) not null default 0, total numeric(18,2) not null default 0, amount_paid numeric(18,2) not null default 0, balance_due numeric(18,2) not null default 0, status text not null default 'draft' check (status in ('draft','approved','issued','partially_paid','paid','overdue','void','cancelled')), created_by uuid references public.staff_profiles(id), approved_by uuid references public.staff_profiles(id), issued_by uuid references public.staff_profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
      create table public.finance_payments (id uuid primary key default gen_random_uuid(), payment_number text not null unique, customer_id uuid not null references public.finance_customers(id), invoice_id uuid not null references public.finance_invoices(id), amount numeric(18,2) not null check (amount > 0), currency text not null, payment_date date not null, method text not null check (method in ('bank_transfer','card','mobile_money','cash','other')), provider_reference text, idempotency_key text not null unique, received_by uuid not null references public.staff_profiles(id), notes text, created_at timestamptz not null default now());
      create or replace function public.finance_payments_immutable() returns trigger language plpgsql as $$ begin raise exception using errcode='42501', message='Finance payments are immutable'; end $$;
      create trigger finance_payments_no_update before update or delete on public.finance_payments for each row execute function public.finance_payments_immutable();
      create table public.finance_chart_of_accounts (id uuid primary key default gen_random_uuid(), account_code text not null unique, account_name text not null, account_type text not null check (account_type in ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')));
      insert into public.finance_chart_of_accounts(account_code, account_name, account_type) values ('1000', 'Cash & Bank Clearing', 'ASSET'), ('1060', 'Paynow Provider Clearing', 'ASSET'), ('1200', 'Accounts Receivable (Trade)', 'ASSET'), ('4000', 'Commercial Advertising Revenue', 'REVENUE'), ('4100', 'Reader Premium Subscription Revenue', 'REVENUE'), ('4200', 'Sponsorship & Grants Revenue', 'REVENUE');
      create table public.finance_fiscal_periods (id uuid primary key default gen_random_uuid(), period_name text not null unique, start_date date not null, end_date date not null, status text not null default 'OPEN');
      insert into public.finance_fiscal_periods(period_name, start_date, end_date, status) values ('2026-Annual', '2026-01-01', '2026-12-31', 'OPEN');
      create table public.finance_journal_entries (id uuid primary key default gen_random_uuid(), entry_number text not null unique, entry_date date not null default current_date, period_id uuid references public.finance_fiscal_periods(id), status text not null default 'posted', source text not null, source_id uuid, currency text not null default 'USD', memo text not null, posted_at timestamptz default now(), posted_by uuid, created_by uuid);
      create table public.finance_journal_lines (id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.finance_journal_entries(id) on delete cascade, line_number int not null, account_id uuid not null references public.finance_chart_of_accounts(id), debit numeric(14,2) not null default 0, credit numeric(14,2) not null default 0, description text);
      create or replace function public.finance_record_operational_journal(p_source text, p_source_id uuid, p_memo text, p_currency text, p_actor uuid, p_lines jsonb) returns uuid language plpgsql security definer as $$
      declare v_id uuid; v_line jsonb; v_pos int := 0;
      begin
        insert into public.finance_journal_entries(entry_number, source, source_id, currency, memo, created_by) values (public.finance_next_number('journal'), p_source, p_source_id, p_currency, p_memo, p_actor) returning id into v_id;
        for v_line in select * from jsonb_array_elements(p_lines) loop
          v_pos := v_pos + 1;
          insert into public.finance_journal_lines(entry_id, line_number, account_id, debit, credit, description) values (v_id, v_pos, (v_line->>'account_id')::uuid, coalesce((v_line->>'debit')::numeric,0), coalesce((v_line->>'credit')::numeric,0), v_line->>'description');
        end loop;
        return v_id;
      end $$;
      create table public.analytics_daily_metrics (id uuid primary key default gen_random_uuid(), source_system text not null, metric_date date not null, ad_revenue numeric(18,2) default 0);
      `
    );
    runDbSql(dbName, migrationSql);
  } finally {
    try {
      runDbSql("postgres", `drop database if exists ${dbName};`);
    } catch {
      // ignore cleanup error
    }
  }
});
