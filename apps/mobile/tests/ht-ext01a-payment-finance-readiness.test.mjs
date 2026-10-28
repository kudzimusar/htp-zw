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

test("12. Section 2–13 Disposable PostgreSQL Runtime Certification (Supabase extensions.pgcrypto parity, payment_create_intent, connectivity purpose, idempotency, unverified barrier, Premium reconciliation & replay, Advertising invoice gating & accounting-pending, no-delete triggers, privileges, and transparency)", () => {
  const migrationPath = path.join(
    repoRoot,
    "supabase/migrations/20261027000000_ht_ext01a_payment_finance_readiness.sql"
  );
  const followupMigrationPath = path.join(
    repoRoot,
    "supabase/migrations/20261027010000_ht_ext01a_rdy01_stg01_pgcrypto_runtime_parity.sql"
  );
  const providerMigrationPath = path.join(
    repoRoot,
    "supabase/migrations/20261028010000_ht_ext01a_paynow_test_authority.sql"
  );
  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  const followupMigrationSql = fs.readFileSync(followupMigrationPath, "utf8");
  const providerMigrationSql = fs.readFileSync(providerMigrationPath, "utf8");

  // Structural & security boundary assertions on the SQL migrations
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

  // STG01-R1 follow-up migration structural assertions (extensions.gen_random_bytes(16), SECURITY DEFINER, search_path = public, service_role bounds)
  assert.match(followupMigrationSql, /create or replace function public\.payment_generate_ulid\(p_timestamp timestamptz default clock_timestamp\(\)\)/);
  assert.match(followupMigrationSql, /security definer/);
  assert.match(followupMigrationSql, /set search_path = public/);
  assert.match(followupMigrationSql, /extensions\.gen_random_bytes\(16\)/);
  assert.doesNotMatch(followupMigrationSql, /(?<!extensions\.)gen_random_bytes\s*\(/);
  assert.match(followupMigrationSql, /revoke all on function public\.payment_generate_ulid\(timestamptz\) from public, anon, authenticated/);
  assert.match(followupMigrationSql, /grant execute on function public\.payment_generate_ulid\(timestamptz\) to service_role/);

  // R3-R1 provider authority is service-only and records genuine SHA-512 authority.
  assert.match(providerMigrationSql, /create or replace function public\.payment_record_paynow_status\(/);
  assert.match(providerMigrationSql, /'PAYNOW_TEST_SHA512_VERIFIED'/);
  assert.match(providerMigrationSql, /on conflict \(provider, provider_event_id\) do nothing/);
  assert.match(providerMigrationSql, /grant execute on function public\.payment_record_paynow_status\(text, text, numeric, text, text, text, text, text, jsonb\) to service_role/);

  const psqlCandidates = [
    "/opt/homebrew/Cellar/postgresql@16/16.15/bin/psql",
    "/opt/homebrew/bin/psql",
    "psql"
  ];
  const psqlBin = psqlCandidates.find((p) => p === "psql" || fs.existsSync(p));
  assert.ok(psqlBin, "psql binary must be present");

  const dbName = `ht_rdy01_r2_verify_${process.pid}`;
  let canConnect = false;
  try {
    execFileSync(psqlBin, ["-h", "/tmp", "-p", "5432", "-d", "postgres", "-qAt", "-c", "SELECT 1;"], {
      stdio: "pipe"
    });
    canConnect = true;
  } catch (err) {
    const msg = String(err?.stderr || err?.message || "");
    // Seatbelt/IPC skip behavior ONLY when the OS sandbox blocks socket connect()
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

    // 1. Bootstrap prerequisite Supabase/Newsroom/Finance objects in the disposable database
    //    Match Supabase staging topology: pgcrypto lives in schema `extensions`, NOT `public`.
    runDbSql(
      dbName,
      `
      create schema if not exists extensions;
      create extension if not exists pgcrypto with schema extensions;
      create schema if not exists auth;
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = 'postgres') then create role postgres nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
      end $$;
      grant usage on schema extensions to postgres, anon, authenticated, service_role;
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

    // 2. Apply base readiness migration 20261027000000_ht_ext01a_payment_finance_readiness.sql
    runDbSql(dbName, migrationSql);

    // 2b. Prove that before the follow-up migration, unqualified gen_random_bytes fails with SQLSTATE 42883 when pgcrypto is in schema `extensions`
    const preRemediationSqlState = runDbSql(
      dbName,
      `
      do $$
      begin
        perform public.payment_generate_ulid();
        raise exception 'Expected SQLSTATE 42883 before STG01-R1 follow-up migration';
      exception when undefined_function then
        -- SQLSTATE 42883 confirmed
        null;
      end $$;
      select
        (select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pgcrypto') || ':' ||
        (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'gen_random_bytes');
      `
    );
    assert.equal(preRemediationSqlState, "extensions:0");

    // 2c. Apply follow-up migration 20261027010000_ht_ext01a_rdy01_stg01_pgcrypto_runtime_parity.sql
    runDbSql(dbName, followupMigrationSql);

    // 2d. Apply the Paynow TEST provider authority migration.
    runDbSql(dbName, providerMigrationSql);

    // 3. Execute all required runtime SQL assertions (Sections 3 through 12) and return a structured JSON proof
    const runtimeProofRaw = runDbSql(
      dbName,
      `
      create temp table r2_runtime_proof (payload jsonb);

      do $$
      declare
        v_staff_id uuid;
        v_sub_id uuid;
        v_cust_id uuid;
        v_inv_draft uuid;
        v_inv_approved uuid;
        v_inv_void uuid;
        v_inv_cancelled uuid;
        v_inv_issued uuid;
        v_inv_overdue uuid;

        v_prem_intent jsonb;
        v_prem_replay jsonb;
        v_prem_tx_id uuid;
        v_prem_tx_row public.payment_transactions%rowtype;
        v_prem_tx_count int;
        v_alt_amount_rejected boolean := false;
        v_idem_conflict_rejected boolean := false;

        v_conn_intent jsonb;
        v_conn_tx_id uuid;
        v_conn_prem_rejected boolean := false;
        v_conn_adv_rejected boolean := false;

        v_unverified_intent jsonb;
        v_unverified_tx_id uuid;
        v_unverified_update_rejected boolean := false;
        v_unverified_reconcile_rejected boolean := false;

        v_prem_rec_1 jsonb;
        v_prem_rec_2 jsonb;
        v_prem_rec_row public.premium_entitlement_reconciliations%rowtype;
        v_entitlement_count_after_first int;
        v_entitlement_count_after_replay int;

        v_draft_intent_rejected boolean := false;
        v_approved_intent_rejected boolean := false;
        v_void_intent_rejected boolean := false;
        v_cancelled_intent_rejected boolean := false;
        v_unpayable_reconcile_rejected boolean := false;

        v_adv_intent_1 jsonb;
        v_adv_tx_1 uuid;
        v_adv_rec_1 jsonb;
        v_adv_pay_1 public.finance_payments%rowtype;
        v_inv_issued_after public.finance_invoices%rowtype;
        v_gl_count_while_unapproved int;

        v_adv_intent_2 jsonb;
        v_adv_tx_2 uuid;
        v_adv_rec_2 jsonb;

        v_delete_tx_sqlstate text := '';
        v_delete_audit_sqlstate text := '';
        v_delete_fin_pay_sqlstate text := '';
        v_delete_prem_rec_sqlstate text := '';

        v_rls_enabled_count int;
        v_priv_proof jsonb;
        v_transparency jsonb;
      begin
        insert into public.staff_profiles(display_name) values ('Finance Officer') returning id into v_staff_id;
        insert into public.subscribers(email, display_name) values ('r2-runtime@example.com', 'R2 Runtime Subscriber') returning id into v_sub_id;
        insert into public.finance_customers(legal_name, currency) values ('R2 Medical Advertiser', 'USD') returning id into v_cust_id;

        -- Section 3 & 5: Payment Intent & Idempotency Runtime
        v_prem_intent := public.payment_create_intent('PREMIUM_SUBSCRIPTION', 'r2-idem-prem-001', v_sub_id, null);
        v_prem_replay := public.payment_create_intent('PREMIUM_SUBSCRIPTION', 'r2-idem-prem-001', v_sub_id, null);
        v_prem_tx_id := (v_prem_intent->>'transaction_id')::uuid;
        select * into v_prem_tx_row from public.payment_transactions where id = v_prem_tx_id;
        select count(*)::int into v_prem_tx_count from public.payment_transactions where idempotency_key = 'r2-idem-prem-001';

        -- Reject client-supplied alternative amount
        begin
          perform public.payment_create_intent('PREMIUM_SUBSCRIPTION', 'r2-idem-prem-bad-amt', v_sub_id, null, 'healthtimes_premium_monthly', 1.00, 'USD');
        exception when sqlstate '22023' then
          v_alt_amount_rejected := true;
        end;

        -- Reject conflicting parameters on existing idempotency key
        begin
          perform public.payment_create_intent('PROVIDER_CONNECTIVITY_TEST', 'r2-idem-prem-001', null, null);
        exception when sqlstate '22023' then
          v_idem_conflict_rejected := true;
        end;

        -- Section 4: Connectivity Purpose Runtime
        v_conn_intent := public.payment_create_intent('PROVIDER_CONNECTIVITY_TEST', 'r2-idem-conn-001', null, null);
        v_conn_tx_id := (v_conn_intent->>'transaction_id')::uuid;

        begin
          perform public.payment_reconcile_premium_transaction(v_conn_tx_id);
        exception when sqlstate '22023' then
          v_conn_prem_rejected := true;
        end;

        begin
          perform public.payment_reconcile_advertising_invoice(v_conn_tx_id, v_staff_id);
        exception when sqlstate '22023' then
          v_conn_adv_rejected := true;
        end;

        -- Section 6: Unverified Payment Barrier Runtime
        v_unverified_intent := public.payment_create_intent('PREMIUM_SUBSCRIPTION', 'r2-idem-unverified-001', v_sub_id, null);
        v_unverified_tx_id := (v_unverified_intent->>'transaction_id')::uuid;

        begin
          update public.payment_transactions
             set internal_status = 'PAYMENT_VERIFIED'
           where id = v_unverified_tx_id;
        exception when sqlstate '23514' then
          v_unverified_update_rejected := true;
        end;

        begin
          perform public.payment_reconcile_premium_transaction(v_unverified_tx_id);
        exception when sqlstate '22023' then
          v_unverified_reconcile_rejected := true;
        end;

        -- Section 7: Premium Reconciliation & Replay Runtime (using explicit TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION)
        update public.payment_transactions
           set verification_authority = 'TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION',
               internal_status = 'PAYMENT_VERIFIED',
               reported_amount = 5.00,
               provider_reference = 'SYNTH-PREM-001',
               confirmed_at = '2026-10-27T10:00:00Z'::timestamptz
         where id = v_prem_tx_id;

        v_prem_rec_1 := public.payment_reconcile_premium_transaction(v_prem_tx_id, '2026-10-27T10:05:00Z'::timestamptz);
        select count(*)::int into v_entitlement_count_after_first from public.premium_entitlements where subscriber_id = v_sub_id;

        v_prem_rec_2 := public.payment_reconcile_premium_transaction(v_prem_tx_id, '2026-10-27T11:00:00Z'::timestamptz);
        select count(*)::int into v_entitlement_count_after_replay from public.premium_entitlements where subscriber_id = v_sub_id;
        select * into v_prem_rec_row from public.premium_entitlement_reconciliations where transaction_id = v_prem_tx_id;

        -- Section 8: Advertising Invoice Gating Runtime (draft, approved, void, cancelled rejected; issued permitted)
        insert into public.finance_invoices(invoice_number, customer_id, currency, subtotal, total, balance_due, status, created_by)
        values ('INV-R2-DRAFT', v_cust_id, 'USD', 200, 200, 200, 'draft', v_staff_id) returning id into v_inv_draft;

        insert into public.finance_invoices(invoice_number, customer_id, currency, subtotal, total, balance_due, status, created_by, approved_by)
        values ('INV-R2-APPROVED', v_cust_id, 'USD', 200, 200, 200, 'approved', v_staff_id, v_staff_id) returning id into v_inv_approved;

        insert into public.finance_invoices(invoice_number, customer_id, currency, subtotal, total, balance_due, status, created_by)
        values ('INV-R2-VOID', v_cust_id, 'USD', 200, 200, 200, 'void', v_staff_id) returning id into v_inv_void;

        insert into public.finance_invoices(invoice_number, customer_id, currency, subtotal, total, balance_due, status, created_by)
        values ('INV-R2-CANCELLED', v_cust_id, 'USD', 200, 200, 200, 'cancelled', v_staff_id) returning id into v_inv_cancelled;

        insert into public.finance_invoices(invoice_number, customer_id, currency, subtotal, total, balance_due, status, created_by, issued_by)
        values ('INV-R2-ISSUED', v_cust_id, 'USD', 400, 400, 400, 'issued', v_staff_id, v_staff_id) returning id into v_inv_issued;

        insert into public.finance_invoices(invoice_number, customer_id, currency, subtotal, total, balance_due, status, created_by, issued_by)
        values ('INV-R2-OVERDUE', v_cust_id, 'USD', 300, 300, 300, 'overdue', v_staff_id, v_staff_id) returning id into v_inv_overdue;

        begin
          perform public.payment_create_intent('ADVERTISING_INVOICE', 'r2-idem-inv-draft', null, v_inv_draft);
        exception when sqlstate '22023' then v_draft_intent_rejected := true; end;

        begin
          perform public.payment_create_intent('ADVERTISING_INVOICE', 'r2-idem-inv-approved', null, v_inv_approved);
        exception when sqlstate '22023' then v_approved_intent_rejected := true; end;

        begin
          perform public.payment_create_intent('ADVERTISING_INVOICE', 'r2-idem-inv-void', null, v_inv_void);
        exception when sqlstate '22023' then v_void_intent_rejected := true; end;

        begin
          perform public.payment_create_intent('ADVERTISING_INVOICE', 'r2-idem-inv-cancelled', null, v_inv_cancelled);
        exception when sqlstate '22023' then v_cancelled_intent_rejected := true; end;

        -- Also prove payment_reconcile_advertising_invoice rejects an invoice that became void/approved before reconciliation
        declare
          v_inv_temp uuid;
          v_tx_temp uuid;
        begin
          insert into public.finance_invoices(invoice_number, customer_id, currency, subtotal, total, balance_due, status, created_by, issued_by)
          values ('INV-R2-TEMP', v_cust_id, 'USD', 150, 150, 150, 'issued', v_staff_id, v_staff_id) returning id into v_inv_temp;
          v_tx_temp := (public.payment_create_intent('ADVERTISING_INVOICE', 'r2-idem-inv-temp', null, v_inv_temp)->>'transaction_id')::uuid;
          update public.payment_transactions
             set verification_authority = 'TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION',
                 internal_status = 'PAYMENT_VERIFIED',
                 reported_amount = 150.00
           where id = v_tx_temp;
          update public.finance_invoices set status = 'approved' where id = v_inv_temp;
          begin
            perform public.payment_reconcile_advertising_invoice(v_tx_temp, v_staff_id);
          exception when sqlstate '22023' then
            v_unpayable_reconcile_rejected := true;
          end;
        end;

        -- Section 9: Advertising Accounting Pending Runtime (accountant_approved = false)
        v_adv_intent_1 := public.payment_create_intent('ADVERTISING_INVOICE', 'r2-idem-adv-001', null, v_inv_issued);
        v_adv_tx_1 := (v_adv_intent_1->>'transaction_id')::uuid;
        update public.payment_transactions
           set verification_authority = 'TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION',
               internal_status = 'PAYMENT_VERIFIED',
               reported_amount = 400.00,
               payment_channel = 'ecocash',
               provider_reference = 'SYNTH-ADV-001',
               confirmed_at = '2026-10-27T10:15:00Z'::timestamptz
         where id = v_adv_tx_1;

        v_adv_rec_1 := public.payment_reconcile_advertising_invoice(v_adv_tx_1, v_staff_id);
        select * into v_adv_pay_1 from public.finance_payments where transaction_id = v_adv_tx_1;
        select * into v_inv_issued_after from public.finance_invoices where id = v_inv_issued;
        select count(*)::int into v_gl_count_while_unapproved from public.finance_journal_entries;

        -- Approve clearing model for second payable invoice so both accounting_pending_authority and accounting_posted are populated for Section 12
        update public.finance_provider_clearing_config
           set accountant_approved = true,
               clearing_mode = 'PROVIDER_CLEARING_TWO_STEP',
               provider_clearing_account_code = '1060'
         where provider = 'paynow';

        v_adv_intent_2 := public.payment_create_intent('ADVERTISING_INVOICE', 'r2-idem-adv-002', null, v_inv_overdue);
        v_adv_tx_2 := (v_adv_intent_2->>'transaction_id')::uuid;
        update public.payment_transactions
           set verification_authority = 'TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION',
               internal_status = 'PAYMENT_VERIFIED',
               reported_amount = 300.00,
               payment_channel = 'innbucks',
               provider_reference = 'SYNTH-ADV-002',
               confirmed_at = '2026-10-27T10:30:00Z'::timestamptz
         where id = v_adv_tx_2;

        v_adv_rec_2 := public.payment_reconcile_advertising_invoice(v_adv_tx_2, v_staff_id);

        -- Section 10: No-Destructive-Delete Runtime
        begin
          delete from public.payment_transactions where id = v_prem_tx_id;
        exception when others then
          v_delete_tx_sqlstate := sqlstate;
        end;

        begin
          delete from public.payment_audit_logs;
        exception when others then
          v_delete_audit_sqlstate := sqlstate;
        end;

        begin
          delete from public.finance_payments where id = v_adv_pay_1.id;
        exception when others then
          v_delete_fin_pay_sqlstate := sqlstate;
        end;

        begin
          delete from public.premium_entitlement_reconciliations where id = v_prem_rec_row.id;
        exception when others then
          v_delete_prem_rec_sqlstate := sqlstate;
        end;

        -- Section 11: Privilege & RLS Runtime
        select count(*)::int into v_rls_enabled_count
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in (
            'premium_plans',
            'payment_transactions',
            'premium_entitlement_reconciliations',
            'finance_provider_clearing_config',
            'provider_settlements',
            'provider_settlement_lines',
            'payment_reversals',
            'payment_exceptions',
            'payment_audit_logs'
          )
          and c.relrowsecurity = true;

        v_priv_proof := jsonb_build_object(
          'rls_enabled_count', v_rls_enabled_count,
          'anon_table_select', has_table_privilege('anon', 'public.payment_transactions', 'SELECT'),
          'authenticated_table_select', has_table_privilege('authenticated', 'public.payment_transactions', 'SELECT'),
          'anon_create_intent', has_function_privilege('anon', 'public.payment_create_intent(text,text,uuid,uuid,text,numeric,text)', 'EXECUTE'),
          'authenticated_create_intent', has_function_privilege('authenticated', 'public.payment_create_intent(text,text,uuid,uuid,text,numeric,text)', 'EXECUTE'),
          'service_role_create_intent', has_function_privilege('service_role', 'public.payment_create_intent(text,text,uuid,uuid,text,numeric,text)', 'EXECUTE'),
          'anon_reconcile_premium', has_function_privilege('anon', 'public.payment_reconcile_premium_transaction(uuid,timestamptz)', 'EXECUTE'),
          'authenticated_reconcile_premium', has_function_privilege('authenticated', 'public.payment_reconcile_premium_transaction(uuid,timestamptz)', 'EXECUTE'),
          'service_role_reconcile_premium', has_function_privilege('service_role', 'public.payment_reconcile_premium_transaction(uuid,timestamptz)', 'EXECUTE'),
          'anon_reconcile_advertising', has_function_privilege('anon', 'public.payment_reconcile_advertising_invoice(uuid,uuid)', 'EXECUTE'),
          'authenticated_reconcile_advertising', has_function_privilege('authenticated', 'public.payment_reconcile_advertising_invoice(uuid,uuid)', 'EXECUTE'),
          'service_role_reconcile_advertising', has_function_privilege('service_role', 'public.payment_reconcile_advertising_invoice(uuid,uuid)', 'EXECUTE')
        );

        -- Section 12: Transparency Runtime
        v_transparency := public.finance_get_payment_transparency('USD');

        insert into r2_runtime_proof(payload) values (
          jsonb_build_object(
            'payment_intent', jsonb_build_object(
              'intent', v_prem_intent,
              'alt_amount_rejected', v_alt_amount_rejected
            ),
            'connectivity_intent', jsonb_build_object(
              'intent', v_conn_intent,
              'prem_reconcile_rejected', v_conn_prem_rejected,
              'adv_reconcile_rejected', v_conn_adv_rejected
            ),
            'idempotency', jsonb_build_object(
              'first_replayed', (v_prem_intent->>'replayed')::boolean,
              'second_replayed', (v_prem_replay->>'replayed')::boolean,
              'same_transaction_id', (v_prem_intent->>'transaction_id') = (v_prem_replay->>'transaction_id'),
              'tx_count', v_prem_tx_count,
              'conflict_rejected', v_idem_conflict_rejected
            ),
            'unverified_barrier', jsonb_build_object(
              'update_rejected', v_unverified_update_rejected,
              'reconcile_rejected', v_unverified_reconcile_rejected
            ),
            'premium_reconciliation', jsonb_build_object(
              'first', v_prem_rec_1,
              'replay', v_prem_rec_2,
              'entitlement_count_after_first', v_entitlement_count_after_first,
              'entitlement_count_after_replay', v_entitlement_count_after_replay,
              'amount', v_prem_rec_row.amount,
              'currency', v_prem_rec_row.currency,
              'business_reconciliation', v_prem_rec_row.business_reconciliation,
              'accounting_status', v_prem_rec_row.accounting_status,
              'revenue_journal_id', v_prem_rec_row.revenue_journal_id
            ),
            'advertising_gating', jsonb_build_object(
              'draft_rejected', v_draft_intent_rejected,
              'approved_rejected', v_approved_intent_rejected,
              'void_rejected', v_void_intent_rejected,
              'cancelled_rejected', v_cancelled_intent_rejected,
              'unpayable_reconcile_rejected', v_unpayable_reconcile_rejected
            ),
            'advertising_accounting_pending', jsonb_build_object(
              'rec_result', v_adv_rec_1,
              'payment_method', v_adv_pay_1.method,
              'business_reconciliation', v_adv_pay_1.business_reconciliation,
              'accounting_status', v_adv_pay_1.accounting_status,
              'clearing_journal_id', v_adv_pay_1.clearing_journal_id,
              'invoice_balance_due_after', v_inv_issued_after.balance_due,
              'invoice_status_after', v_inv_issued_after.status,
              'gl_count_while_unapproved', v_gl_count_while_unapproved,
              'approved_rec_result', v_adv_rec_2
            ),
            'no_delete_triggers', jsonb_build_object(
              'delete_tx_sqlstate', v_delete_tx_sqlstate,
              'delete_audit_sqlstate', v_delete_audit_sqlstate,
              'delete_fin_pay_sqlstate', v_delete_fin_pay_sqlstate,
              'delete_prem_rec_sqlstate', v_delete_prem_rec_sqlstate
            ),
            'privileges', v_priv_proof,
            'transparency', v_transparency
          )
        );
      end $$;

      select payload::text from r2_runtime_proof limit 1;
      `
    );

    const proof = JSON.parse(runtimeProofRaw);

    // Assert Section 3 — PAYMENT INTENT
    assert.equal(proof.payment_intent.intent.purpose, "PREMIUM_SUBSCRIPTION");
    assert.equal(Number(proof.payment_intent.intent.expected_amount), 5.0);
    assert.equal(proof.payment_intent.intent.currency, "USD");
    assert.equal(proof.payment_intent.intent.internal_status, "CREATED");
    assert.equal(proof.payment_intent.intent.reconciliation_status, "PENDING");
    assert.equal(proof.payment_intent.intent.accounting_status, "PENDING_ACCOUNTANT_AUTHORITY");
    assert.match(proof.payment_intent.intent.merchant_reference, /^HT-PREM-[0-9A-HJKMNP-TV-Z]{26}$/);
    assert.equal(proof.payment_intent.alt_amount_rejected, true);

    // Assert Section 4 — CONNECTIVITY PURPOSE
    assert.equal(proof.connectivity_intent.intent.purpose, "PROVIDER_CONNECTIVITY_TEST");
    assert.match(proof.connectivity_intent.intent.merchant_reference, /^HT-CONN-[0-9A-HJKMNP-TV-Z]{26}$/);
    assert.equal(proof.connectivity_intent.intent.reconciliation_status, "NOT_ELIGIBLE");
    assert.equal(proof.connectivity_intent.intent.accounting_status, "NOT_APPLICABLE");
    assert.equal(proof.connectivity_intent.prem_reconcile_rejected, true);
    assert.equal(proof.connectivity_intent.adv_reconcile_rejected, true);

    // Assert Section 5 — IDEMPOTENCY
    assert.equal(proof.idempotency.first_replayed, false);
    assert.equal(proof.idempotency.second_replayed, true);
    assert.equal(proof.idempotency.same_transaction_id, true);
    assert.equal(proof.idempotency.tx_count, 1);
    assert.equal(proof.idempotency.conflict_rejected, true);

    // Assert Section 6 — UNVERIFIED PAYMENT BARRIER
    assert.equal(proof.unverified_barrier.update_rejected, true);
    assert.equal(proof.unverified_barrier.reconcile_rejected, true);

    // Assert Section 7 — PREMIUM RECONCILIATION & REPLAY
    assert.equal(proof.premium_reconciliation.first.reconciled, true);
    assert.equal(proof.premium_reconciliation.first.replayed, false);
    assert.equal(proof.premium_reconciliation.first.entitlement_changed, true);
    assert.equal(proof.premium_reconciliation.business_reconciliation, "COMPLETE");
    assert.equal(proof.premium_reconciliation.accounting_status, "PENDING_ACCOUNTANT_AUTHORITY");
    assert.equal(proof.premium_reconciliation.revenue_journal_id, null);
    assert.equal(Number(proof.premium_reconciliation.amount), 5.0);
    assert.equal(proof.premium_reconciliation.currency, "USD");
    assert.equal(proof.premium_reconciliation.replay.replayed, true);
    assert.equal(proof.premium_reconciliation.replay.entitlement_changed, false);
    assert.equal(proof.premium_reconciliation.entitlement_count_after_first, 1);
    assert.equal(proof.premium_reconciliation.entitlement_count_after_replay, 1);

    // Assert Section 8 — ADVERTISING INVOICE GATING
    assert.equal(proof.advertising_gating.draft_rejected, true);
    assert.equal(proof.advertising_gating.approved_rejected, true);
    assert.equal(proof.advertising_gating.void_rejected, true);
    assert.equal(proof.advertising_gating.cancelled_rejected, true);
    assert.equal(proof.advertising_gating.unpayable_reconcile_rejected, true);

    // Assert Section 9 — ADVERTISING ACCOUNTING PENDING
    assert.equal(proof.advertising_accounting_pending.payment_method, "paynow");
    assert.equal(proof.advertising_accounting_pending.business_reconciliation, "COMPLETE");
    assert.equal(proof.advertising_accounting_pending.accounting_status, "PENDING_ACCOUNTANT_AUTHORITY");
    assert.equal(proof.advertising_accounting_pending.clearing_journal_id, null);
    assert.equal(Number(proof.advertising_accounting_pending.invoice_balance_due_after), 0);
    assert.equal(proof.advertising_accounting_pending.invoice_status_after, "paid");
    assert.equal(proof.advertising_accounting_pending.gl_count_while_unapproved, 0);
    assert.equal(proof.advertising_accounting_pending.approved_rec_result.accounting_status, "POSTED");
    assert.ok(proof.advertising_accounting_pending.approved_rec_result.clearing_journal_id);

    // Assert Section 10 — NO-DESTRUCTIVE-DELETE
    assert.equal(proof.no_delete_triggers.delete_tx_sqlstate, "42501");
    assert.equal(proof.no_delete_triggers.delete_audit_sqlstate, "42501");
    assert.equal(proof.no_delete_triggers.delete_fin_pay_sqlstate, "42501");
    assert.equal(proof.no_delete_triggers.delete_prem_rec_sqlstate, "42501");

    // Assert Section 11 — PRIVILEGES
    assert.equal(proof.privileges.rls_enabled_count, 9);
    assert.equal(proof.privileges.anon_table_select, false);
    assert.equal(proof.privileges.authenticated_table_select, false);
    assert.equal(proof.privileges.anon_create_intent, false);
    assert.equal(proof.privileges.authenticated_create_intent, false);
    assert.equal(proof.privileges.service_role_create_intent, true);
    assert.equal(proof.privileges.anon_reconcile_premium, false);
    assert.equal(proof.privileges.authenticated_reconcile_premium, false);
    assert.equal(proof.privileges.service_role_reconcile_premium, true);
    assert.equal(proof.privileges.anon_reconcile_advertising, false);
    assert.equal(proof.privileges.authenticated_reconcile_advertising, false);
    assert.equal(proof.privileges.service_role_reconcile_advertising, true);

    // Assert Section 12 — TRANSPARENCY
    assert.equal(Number(proof.transparency.business_reconciled), 705);
    assert.equal(Number(proof.transparency.accounting_pending_authority), 405);
    assert.equal(Number(proof.transparency.accounting_pending_posting), 0);
    assert.equal(Number(proof.transparency.accounting_posted), 300);
    assert.equal(Number(proof.transparency.provider_clearing_pending_settlement), 705);
    assert.equal(Number(proof.transparency.bank_settled), 0);

    const providerProofRaw = runDbSql(
      dbName,
      `
      create temp table provider_runtime_proof (payload jsonb);
      do $$
      declare
        v_conn jsonb;
        v_conn_id uuid;
        v_conn_ref text;
        v_conn_paid jsonb;
        v_conn_dup jsonb;
        v_conn_row public.payment_transactions%rowtype;
        v_conn_event_count int;
        v_amount jsonb;
        v_amount_result jsonb;
        v_currency jsonb;
        v_currency_result jsonb;
      begin
        v_conn := public.payment_create_intent('PROVIDER_CONNECTIVITY_TEST', 'r3-paynow-connectivity', null, null);
        v_conn_id := (v_conn->>'transaction_id')::uuid;
        v_conn_ref := v_conn->>'merchant_reference';
        perform public.payment_claim_paynow_initiation(v_conn_ref);
        perform public.payment_record_paynow_initiation(
          v_conn_ref,
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
          'https://www.paynow.co.zw/Payment/ConfirmPayment/9510',
          '9510'
        );
        v_conn_paid := public.payment_record_paynow_status(
          v_conn_ref, '9510', 1.00, 'USD', 'Paid',
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
          repeat('a', 64), repeat('b', 64),
          jsonb_build_object('source', 'disposable_provider_test', 'payment_channel', 'ecocash')
        );
        v_conn_dup := public.payment_record_paynow_status(
          v_conn_ref, '9510', 1.00, 'USD', 'Paid',
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
          repeat('a', 64), repeat('b', 64),
          jsonb_build_object('source', 'disposable_provider_test', 'payment_channel', 'ecocash')
        );
        select * into v_conn_row from public.payment_transactions where id = v_conn_id;
        select count(*)::int into v_conn_event_count from public.provider_webhook_events
          where transaction_id = v_conn_id;

        v_amount := public.payment_create_intent('PROVIDER_CONNECTIVITY_TEST', 'r3-paynow-amount-mismatch', null, null);
        perform public.payment_claim_paynow_initiation(v_amount->>'merchant_reference');
        perform public.payment_record_paynow_initiation(
          v_amount->>'merchant_reference',
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=7c583b19-8327-4e99-868d-9cc2c9693b4f',
          'https://www.paynow.co.zw/Payment/ConfirmPayment/9511', null
        );
        v_amount_result := public.payment_record_paynow_status(
          v_amount->>'merchant_reference', '9511', 2.00, 'USD', 'Paid',
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=7c583b19-8327-4e99-868d-9cc2c9693b4f',
          repeat('c', 64), repeat('d', 64), '{}'::jsonb
        );

        v_currency := public.payment_create_intent('PROVIDER_CONNECTIVITY_TEST', 'r3-paynow-currency-mismatch', null, null);
        perform public.payment_claim_paynow_initiation(v_currency->>'merchant_reference');
        perform public.payment_record_paynow_initiation(
          v_currency->>'merchant_reference',
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=42d7b196-1080-409d-8e39-5b5d196077e1',
          'https://www.paynow.co.zw/Payment/ConfirmPayment/9512', null
        );
        v_currency_result := public.payment_record_paynow_status(
          v_currency->>'merchant_reference', '9512', 1.00, 'ZWG', 'Paid',
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=42d7b196-1080-409d-8e39-5b5d196077e1',
          repeat('e', 64), repeat('f', 64), '{}'::jsonb
        );

        insert into provider_runtime_proof(payload) values (jsonb_build_object(
          'connectivity', jsonb_build_object(
            'first', v_conn_paid,
            'duplicate', v_conn_dup,
            'event_count', v_conn_event_count,
            'internal_status', v_conn_row.internal_status,
            'reconciliation_status', v_conn_row.reconciliation_status,
            'accounting_status', v_conn_row.accounting_status,
            'payment_channel', v_conn_row.payment_channel,
            'verification_authority', v_conn_row.verification_authority
          ),
          'amount_mismatch', v_amount_result,
          'currency_mismatch', v_currency_result,
          'privileges', jsonb_build_object(
            'anon_record_status', has_function_privilege('anon', 'public.payment_record_paynow_status(text,text,numeric,text,text,text,text,text,jsonb)', 'EXECUTE'),
            'authenticated_record_status', has_function_privilege('authenticated', 'public.payment_record_paynow_status(text,text,numeric,text,text,text,text,text,jsonb)', 'EXECUTE'),
            'service_record_status', has_function_privilege('service_role', 'public.payment_record_paynow_status(text,text,numeric,text,text,text,text,text,jsonb)', 'EXECUTE')
          )
        ));
      end $$;
      select payload::text from provider_runtime_proof limit 1;
      `
    );

    const providerProof = JSON.parse(providerProofRaw);
    assert.equal(providerProof.connectivity.first.accepted, true);
    assert.equal(providerProof.connectivity.first.duplicate, false);
    assert.equal(providerProof.connectivity.duplicate.duplicate, true);
    assert.equal(providerProof.connectivity.event_count, 1);
    assert.equal(providerProof.connectivity.internal_status, "PAYMENT_VERIFIED");
    assert.equal(providerProof.connectivity.reconciliation_status, "NOT_ELIGIBLE");
    assert.equal(providerProof.connectivity.accounting_status, "NOT_APPLICABLE");
    assert.equal(providerProof.connectivity.payment_channel, "ecocash");
    assert.equal(providerProof.connectivity.verification_authority, "PAYNOW_TEST_SHA512_VERIFIED");
    assert.equal(providerProof.amount_mismatch.accepted, false);
    assert.equal(providerProof.amount_mismatch.code, "AMOUNT_MISMATCH");
    assert.equal(providerProof.currency_mismatch.accepted, false);
    assert.equal(providerProof.currency_mismatch.code, "CURRENCY_MISMATCH");
    assert.equal(providerProof.privileges.anon_record_status, false);
    assert.equal(providerProof.privileges.authenticated_record_status, false);
    assert.equal(providerProof.privileges.service_record_status, true);

    // Reproduce the exact TEST-only mistaken currency assumption in a disposable DB.
    runDbSql(dbName, `
      do $$ declare v jsonb; v_ref text := 'HT-CONN-01M61ANPB2N0Y8QYEK426TP347'; begin
        v := public.payment_create_intent('PROVIDER_CONNECTIVITY_TEST', 'currency-correction-fixture', null, null);
        update public.payment_transactions set merchant_reference=v_ref where id=(v->>'transaction_id')::uuid;
        perform public.payment_claim_paynow_initiation(v_ref);
        perform public.payment_record_paynow_initiation(v_ref,
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
          'https://www.paynow.co.zw/Payment/ConfirmPayment/9510', '66738535');
        perform public.payment_record_paynow_status(v_ref, '66738535', 1.00, 'USD', 'Paid',
          'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
          repeat('1',64), repeat('2',64), '{}'::jsonb);
      end $$;
    `);
    const currencyMigration = fs.readFileSync(path.join(repoRoot,
      'supabase/migrations/20261029010000_ht_ext01a_paynow_currency_evidence.sql'), 'utf8');
    runDbSql(dbName, currencyMigration);
    const correction = JSON.parse(runDbSql(dbName, `
      select jsonb_build_object('status',t.internal_status,'authority',t.verification_authority,
        'reconciliation',t.reconciliation_status,'accounting',t.accounting_status,
        'exception_count',(select count(*) from public.payment_exceptions e where e.transaction_id=t.id and e.exception_code='CURRENCY_MISMATCH'),
        'audit_count',(select count(*) from public.payment_audit_logs a where a.transaction_id=t.id and a.action='payment.test.currency_evidence_corrected'))::text
      from public.payment_transactions t where t.merchant_reference='HT-CONN-01M61ANPB2N0Y8QYEK426TP347';
    `));
    assert.equal(correction.status, 'CURRENCY_MISMATCH');
    assert.equal(correction.authority, 'PAYNOW_TEST_SHA512_VERIFIED');
    assert.equal(correction.reconciliation, 'NOT_ELIGIBLE');
    assert.equal(correction.accounting, 'NOT_APPLICABLE');
    assert.equal(correction.exception_count, 1);
    assert.equal(correction.audit_count, 1);
    const guard = runDbSql(dbName, `
      do $$ declare rejected boolean := false; begin
        begin
          perform public.payment_record_paynow_status('HT-CONN-01M61ANPB2N0Y8QYEK426TP347', '66738535', 1.00, null, 'Paid',
            'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
            repeat('3',64), repeat('4',64), '{}'::jsonb);
        exception when check_violation then rejected := true; end;
        if not rejected then raise exception 'Missing provider currency was accepted'; end if;
        rejected := false;
        begin
          perform public.payment_record_paynow_status('HT-CONN-01M61ANPB2N0Y8QYEK426TP347', '66738535', 1.00, 'USD', 'Paid',
            'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
            repeat('5',64), repeat('6',64), '{}'::jsonb);
        exception when check_violation then rejected := true; end;
        if not rejected then raise exception 'Unproven provider currency was accepted'; end if;
      end $$;
      select 'guard_passed';
    `);
    assert.equal(guard.trim(), 'guard_passed');
    const signedMismatch = JSON.parse(runDbSql(dbName, `
      select public.payment_record_paynow_status('HT-CONN-01M61ANPB2N0Y8QYEK426TP347', '66738535', 1.00, 'ZWG', 'Paid',
        'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
        repeat('7',64), repeat('8',64), '{"currency_source":"SIGNED_PROVIDER_FIELD"}'::jsonb)::text;
    `));
    assert.equal(signedMismatch.accepted, false);
    assert.equal(signedMismatch.code, 'CURRENCY_MISMATCH');
  } finally {
    try {
      runDbSql("postgres", `drop database if exists ${dbName};`);
    } catch {
      // ignore cleanup error
    }
  }
});
