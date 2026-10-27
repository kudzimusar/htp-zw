/**
 * HT-MVP-EXT-01A-RDY-01-R1 — Payment + Finance Business Transparency Foundation
 *
 * Canonical provider-independent commercial, transaction, reconciliation,
 * settlement, exception, audit, and Finance readiness engine for HealthTimes.
 *
 * Governing rules:
 * 1. Credentials alone NEVER enable checkout:
 *    credentials_present, provider_authority_certified, checkout_implementation_ready,
 *    and checkout_available are strictly separated. In RDY-01-R1,
 *    provider_authority_certified=false, checkout_implementation_ready=false,
 *    and checkout_available=false.
 * 2. PAYNOW_MODE must fail closed (missing/invalid/live -> checkout unavailable).
 * 3. No false Paynow cryptographic hash is implemented or claimed.
 *    Unverified events (NO_VERIFICATION_AUTHORITY) keep signatureValid=false
 *    and can never transition a transaction to PAYMENT_VERIFIED.
 *    Provider-independent tests must use an explicit SyntheticProviderVerificationAdapter
 *    classified as TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION.
 * 4. Business reconciliation is explicitly separated from Accounting reconciliation
 *    (accounting_status: PENDING_ACCOUNTANT_AUTHORITY | PENDING_POSTING | POSTED | REVERSED | POSTING_FAILED).
 */

export const PAYMENT_READINESS_UNIT_ID = "HT-MVP-EXT-01A-RDY-01-R1";

// ---------------------------------------------------------------------------
// Section 2: Canonical Premium Plan Authority
// ---------------------------------------------------------------------------
export interface CanonicalPremiumPlan {
  readonly plan_key: "healthtimes_premium_monthly";
  readonly version: number;
  readonly name: "HealthTimes Premium";
  readonly amount: 5.0;
  readonly currency: "USD";
  readonly billing_interval: "month";
  readonly status: "active";
  readonly effective_from: string;
  readonly effective_to: string | null;
}

export const CANONICAL_PREMIUM_PLAN: CanonicalPremiumPlan = Object.freeze({
  plan_key: "healthtimes_premium_monthly",
  version: 1,
  name: "HealthTimes Premium",
  amount: 5.0,
  currency: "USD",
  billing_interval: "month",
  status: "active",
  effective_from: "2026-01-01T00:00:00.000Z",
  effective_to: null
});

// ---------------------------------------------------------------------------
// Section 3 & 4: Payment Purposes & Canonical Merchant Reference Authority
// ---------------------------------------------------------------------------
export type PaymentPurpose =
  | "PREMIUM_SUBSCRIPTION"
  | "ADVERTISING_INVOICE"
  | "PROVIDER_CONNECTIVITY_TEST";

export const PAYMENT_PURPOSE_PREFIX: Readonly<Record<PaymentPurpose, string>> = Object.freeze({
  PREMIUM_SUBSCRIPTION: "HT-PREM-",
  ADVERTISING_INVOICE: "HT-INV-",
  PROVIDER_CONNECTIVITY_TEST: "HT-CONN-"
});

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const MERCHANT_REFERENCE_REGEX = /^HT-(PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$/;

let lastUlidTimestampMs = -1;
let lastUlidRandomness = new Uint8Array(16);

function fillRandomBytes(target: Uint8Array): void {
  const webCrypto = (globalThis as unknown as { crypto?: { getRandomValues?: (arr: Uint8Array) => void } }).crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    webCrypto.getRandomValues(target);
    return;
  }
  for (let i = 0; i < target.length; i += 1) {
    target[i] = Math.floor(Math.random() * 256);
  }
}

export function generateUlid(
  timestampMs: number = Date.now(),
  explicitRandomBytes?: Uint8Array
): string {
  let time = Math.floor(timestampMs);
  if (!Number.isFinite(time) || time < 0) {
    time = Date.now();
  }

  let timeChars = "";
  let remTime = time;
  for (let i = 0; i < 10; i += 1) {
    const mod = remTime % 32;
    timeChars = CROCKFORD_BASE32[mod]! + timeChars;
    remTime = Math.floor(remTime / 32);
  }

  const randBytes = new Uint8Array(16);
  if (explicitRandomBytes && explicitRandomBytes.length === 16) {
    randBytes.set(explicitRandomBytes);
  } else if (time === lastUlidTimestampMs) {
    randBytes.set(lastUlidRandomness);
    for (let i = 15; i >= 0; i -= 1) {
      if (randBytes[i]! < 31) {
        randBytes[i] = (randBytes[i]! + 1) & 0x1f;
        break;
      }
      randBytes[i] = 0;
    }
    lastUlidRandomness = new Uint8Array(randBytes);
  } else {
    fillRandomBytes(randBytes);
    for (let i = 0; i < 16; i += 1) {
      randBytes[i] = randBytes[i]! & 0x1f;
    }
    lastUlidTimestampMs = time;
    lastUlidRandomness = new Uint8Array(randBytes);
  }

  let randChars = "";
  for (let i = 0; i < 16; i += 1) {
    randChars += CROCKFORD_BASE32[randBytes[i]! % 32]!;
  }

  return timeChars + randChars;
}

export function generateMerchantReference(
  purpose: PaymentPurpose,
  timestampMs?: number,
  explicitRandomBytes?: Uint8Array
): string {
  const prefix = PAYMENT_PURPOSE_PREFIX[purpose];
  if (!prefix) {
    throw new Error(`Unsupported payment purpose for merchant reference: ${String(purpose)}`);
  }
  return `${prefix}${generateUlid(timestampMs, explicitRandomBytes)}`;
}

export function validateMerchantReference(
  reference: string,
  expectedPurpose?: PaymentPurpose
): boolean {
  if (typeof reference !== "string" || !MERCHANT_REFERENCE_REGEX.test(reference)) {
    return false;
  }
  if (reference.includes("@") || /\b\d{9,}\b/.test(reference)) {
    return false;
  }
  if (expectedPurpose) {
    const expectedPrefix = PAYMENT_PURPOSE_PREFIX[expectedPurpose];
    if (!reference.startsWith(expectedPrefix)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Section 6, 8, 9, 10, 15: Explicit Server-Side Payment & Accounting State Models
// ---------------------------------------------------------------------------
export type PaymentInternalStatus =
  | "CREATED"
  | "PROVIDER_INITIATED"
  | "PROVIDER_PENDING"
  | "PAYMENT_VERIFIED"
  | "RECONCILIATION_PENDING"
  | "RECONCILED"
  | "CANCELLED"
  | "FAILED"
  | "EXPIRED"
  | "DISPUTED"
  | "REFUNDED"
  | "INVALID_HASH"
  | "AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "UNKNOWN_REFERENCE"
  | "DUPLICATE_EVENT"
  | "RECONCILIATION_FAILED"
  | "SETTLEMENT_MISMATCH"
  | "REFUND_REQUESTED"
  | "REFUND_CONFIRMED"
  | "DISPUTE_OPENED"
  | "DISPUTE_RESOLVED"
  | "REVERSAL_REQUIRED";

export type PaymentReconciliationStatus =
  | "NOT_ELIGIBLE"
  | "PENDING"
  | "RECONCILED"
  | "RECONCILIATION_FAILED"
  | "REVERSED";

export type PaymentAccountingStatus =
  | "NOT_APPLICABLE"
  | "PENDING_ACCOUNTANT_AUTHORITY"
  | "PENDING_POSTING"
  | "POSTED"
  | "REVERSED"
  | "POSTING_FAILED";

export type BusinessReconciliationDisposition = "PENDING" | "COMPLETE" | "FAILED" | "REVERSED" | "NOT_ELIGIBLE";

export type PremiumCheckoutExperienceState =
  | "Available"
  | "Starting payment"
  | "Redirecting to provider"
  | "Pending"
  | "Verified"
  | "Activated"
  | "Cancelled"
  | "Failed"
  | "Requires review"
  | "Unavailable";

const ALLOWED_PAYMENT_TRANSITIONS: Readonly<Record<PaymentInternalStatus, readonly PaymentInternalStatus[]>> = Object.freeze({
  CREATED: [
    "PROVIDER_INITIATED",
    "PROVIDER_PENDING",
    "PAYMENT_VERIFIED",
    "CANCELLED",
    "FAILED",
    "EXPIRED",
    "INVALID_HASH",
    "AMOUNT_MISMATCH",
    "CURRENCY_MISMATCH"
  ],
  PROVIDER_INITIATED: [
    "PROVIDER_PENDING",
    "PAYMENT_VERIFIED",
    "CANCELLED",
    "FAILED",
    "EXPIRED",
    "INVALID_HASH",
    "AMOUNT_MISMATCH",
    "CURRENCY_MISMATCH"
  ],
  PROVIDER_PENDING: [
    "PROVIDER_PENDING",
    "PAYMENT_VERIFIED",
    "CANCELLED",
    "FAILED",
    "EXPIRED",
    "INVALID_HASH",
    "AMOUNT_MISMATCH",
    "CURRENCY_MISMATCH"
  ],
  PAYMENT_VERIFIED: [
    "RECONCILIATION_PENDING",
    "RECONCILED",
    "RECONCILIATION_FAILED",
    "AMOUNT_MISMATCH",
    "CURRENCY_MISMATCH",
    "SETTLEMENT_MISMATCH",
    "REFUND_REQUESTED",
    "DISPUTE_OPENED"
  ],
  RECONCILIATION_PENDING: [
    "RECONCILED",
    "RECONCILIATION_FAILED",
    "AMOUNT_MISMATCH",
    "CURRENCY_MISMATCH",
    "SETTLEMENT_MISMATCH",
    "REFUND_REQUESTED",
    "DISPUTE_OPENED"
  ],
  RECONCILED: [
    "SETTLEMENT_MISMATCH",
    "REFUND_REQUESTED",
    "DISPUTE_OPENED"
  ],
  REFUND_REQUESTED: [
    "REFUND_CONFIRMED",
    "REVERSAL_REQUIRED"
  ],
  REFUND_CONFIRMED: [
    "REFUNDED",
    "REVERSAL_REQUIRED"
  ],
  DISPUTE_OPENED: [
    "DISPUTED",
    "DISPUTE_RESOLVED",
    "REVERSAL_REQUIRED"
  ],
  DISPUTE_RESOLVED: [
    "RECONCILED",
    "REVERSAL_REQUIRED"
  ],
  REVERSAL_REQUIRED: [
    "REFUNDED",
    "DISPUTED"
  ],
  CANCELLED: [],
  FAILED: [],
  EXPIRED: [],
  DISPUTED: ["DISPUTE_RESOLVED", "REVERSAL_REQUIRED"],
  REFUNDED: [],
  INVALID_HASH: [],
  AMOUNT_MISMATCH: [],
  CURRENCY_MISMATCH: [],
  UNKNOWN_REFERENCE: [],
  DUPLICATE_EVENT: [],
  RECONCILIATION_FAILED: [],
  SETTLEMENT_MISMATCH: ["RECONCILED"]
});

export function canTransitionPaymentState(
  from: PaymentInternalStatus,
  to: PaymentInternalStatus
): boolean {
  return (ALLOWED_PAYMENT_TRANSITIONS[from] ?? []).includes(to);
}

export function mapTransactionToPremiumCheckoutState(
  status: PaymentInternalStatus | null | undefined,
  checkoutAvailable: boolean
): PremiumCheckoutExperienceState {
  if (!status) {
    return checkoutAvailable ? "Available" : "Unavailable";
  }
  switch (status) {
    case "CREATED":
      return "Starting payment";
    case "PROVIDER_INITIATED":
      return "Redirecting to provider";
    case "PROVIDER_PENDING":
      return "Pending";
    case "PAYMENT_VERIFIED":
    case "RECONCILIATION_PENDING":
      return "Verified";
    case "RECONCILED":
      return "Activated";
    case "CANCELLED":
      return "Cancelled";
    case "FAILED":
    case "EXPIRED":
      return "Failed";
    case "INVALID_HASH":
    case "AMOUNT_MISMATCH":
    case "CURRENCY_MISMATCH":
    case "UNKNOWN_REFERENCE":
    case "DUPLICATE_EVENT":
    case "RECONCILIATION_FAILED":
    case "SETTLEMENT_MISMATCH":
    case "REFUND_REQUESTED":
    case "REFUND_CONFIRMED":
    case "DISPUTE_OPENED":
    case "DISPUTE_RESOLVED":
    case "REVERSAL_REQUIRED":
    case "DISPUTED":
    case "REFUNDED":
      return "Requires review";
  }
}

// ---------------------------------------------------------------------------
// Section 16: Exception Queue Codes & Model
// ---------------------------------------------------------------------------
export type PaymentExceptionCode =
  | "AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "UNKNOWN_REFERENCE"
  | "DUPLICATE_PROVIDER_EVENT"
  | "RECONCILIATION_FAILED"
  | "UNPAYABLE_INVOICE"
  | "SETTLEMENT_MISMATCH"
  | "UNMATCHED_BANK_SETTLEMENT"
  | "REFUND_REVIEW"
  | "DISPUTE_REVIEW";

export interface PaymentExceptionRecord {
  id: string;
  exceptionCode: PaymentExceptionCode;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED";
  reason: string;
  transactionId: string | null;
  settlementId: string | null;
  merchantReference: string | null;
  providerReference: string | null;
  details: Record<string, unknown>;
  openedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

// ---------------------------------------------------------------------------
// Section 17: Audit Authority Model
// ---------------------------------------------------------------------------
export type PaymentAuditSource =
  | "server_intent"
  | "provider_webhook"
  | "reconciliation_engine"
  | "settlement_engine"
  | "manual_intervention";

export interface PaymentAuditEntry {
  id: string;
  actor: string;
  actorType: "staff" | "subscriber" | "system" | "provider_webhook";
  action: string;
  source: PaymentAuditSource;
  transactionId: string | null;
  businessObject: string;
  timestamp: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  reason: string | null;
  providerReference: string | null;
}

// ---------------------------------------------------------------------------
// Remediation RDY01-R1-001 (Sections 1, 2, 3):
// Provider Readiness Truth, Separated Gates & Fail-Closed PAYNOW_MODE
// ---------------------------------------------------------------------------
export type PaynowModeStatus =
  | "valid_test_configuration_candidate"
  | "live_forbidden_fail_closed"
  | "configuration_incomplete_missing_mode"
  | "configuration_incomplete_invalid_mode";

export interface ProviderReadinessState {
  provider: "paynow";
  status: "authority-incomplete" | "ready";
  configured: boolean;
  credentials_present: boolean;
  mode: "unavailable" | "test" | "live";
  mode_status: PaynowModeStatus;
  provider_authority_certified: boolean;
  checkout_implementation_ready: boolean;
  checkout_available: boolean;
  paynow_configured: "YES" | "NO";
  checkout_behavior: "CHECKOUT_FAILS_CLOSED" | "CHECKOUT_AVAILABLE";
  business_authority_mutated: false;
}

export interface ProviderReadinessGateOverrides {
  /**
   * Used only by unit tests to verify individual gate behavior.
   * In RDY-01-R1 production/staging runtime, both gates are frozen to false.
   */
  providerAuthorityCertified?: boolean;
  checkoutImplementationReady?: boolean;
}

export function evaluateProviderReadinessGates(
  env: Record<string, string | undefined> = {},
  gates: ProviderReadinessGateOverrides = {}
): ProviderReadinessState {
  const integrationId = (env.PAYNOW_INTEGRATION_ID ?? "").trim();
  const integrationKey = (env.PAYNOW_INTEGRATION_KEY ?? "").trim();
  const rawMode = (env.PAYNOW_MODE ?? "").trim().toLowerCase();

  const credentialsPresent = integrationId.length > 0 && integrationKey.length > 0;

  let mode: "unavailable" | "test" | "live" = "unavailable";
  let modeStatus: PaynowModeStatus = "configuration_incomplete_missing_mode";

  if (rawMode === "test") {
    mode = "test";
    modeStatus = "valid_test_configuration_candidate";
  } else if (rawMode === "live") {
    // PAYNOW_MODE=live must fail closed until later explicit live authority
    mode = "live";
    modeStatus = "live_forbidden_fail_closed";
  } else if (rawMode.length > 0) {
    mode = "unavailable";
    modeStatus = "configuration_incomplete_invalid_mode";
  }

  const providerAuthorityCertified = Boolean(gates.providerAuthorityCertified ?? false);
  const checkoutImplementationReady = Boolean(gates.checkoutImplementationReady ?? false);

  // Checkout is only available if ALL four gates hold AND mode is valid TEST candidate
  const allGatesSatisfied =
    credentialsPresent &&
    mode === "test" &&
    modeStatus === "valid_test_configuration_candidate" &&
    providerAuthorityCertified &&
    checkoutImplementationReady;

  return {
    provider: "paynow",
    status: allGatesSatisfied ? "ready" : "authority-incomplete",
    configured: allGatesSatisfied,
    credentials_present: credentialsPresent,
    mode,
    mode_status: modeStatus,
    provider_authority_certified: providerAuthorityCertified,
    checkout_implementation_ready: checkoutImplementationReady,
    checkout_available: allGatesSatisfied,
    paynow_configured: allGatesSatisfied ? "YES" : "NO",
    checkout_behavior: allGatesSatisfied ? "CHECKOUT_AVAILABLE" : "CHECKOUT_FAILS_CLOSED",
    business_authority_mutated: false
  };
}

/**
 * Canonical RDY-01-R1 runtime readiness resolver.
 * Even if PAYNOW_INTEGRATION_ID, PAYNOW_INTEGRATION_KEY, and PAYNOW_MODE=test
 * are installed in the environment, provider_authority_certified=false,
 * checkout_implementation_ready=false, and checkout_available=false.
 */
export function resolvePaynowReadinessState(
  env: Record<string, string | undefined> = typeof process !== "undefined" && process.env ? process.env : {}
): ProviderReadinessState {
  return evaluateProviderReadinessGates(env, {
    providerAuthorityCertified: false,
    checkoutImplementationReady: false
  });
}

// ---------------------------------------------------------------------------
// Remediation RDY01-R1-002 (Sections 4, 5, 6, 7):
// Synthetic Provider Verification Boundary (No False Paynow SHA-512 Claims)
// ---------------------------------------------------------------------------
export type ProviderVerificationAuthority =
  | "NO_VERIFICATION_AUTHORITY"
  | "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION";

export interface SyntheticVerificationInput {
  providerEventId: string;
  merchantReference: string;
  providerReference: string;
  reportedAmount: number;
  reportedCurrency: string;
  providerStatus: string;
  syntheticDecision?: "ALLOW_SYNTHETIC_TEST" | "REJECT_SYNTHETIC_TAMPER";
}

export interface SyntheticVerificationResult {
  readonly classification: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION";
  readonly acceptedBySyntheticAdapter: boolean;
  readonly cryptographicSignatureVerified: false;
  readonly reason: string;
}

export interface SyntheticProviderVerificationAdapter {
  readonly classification: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION";
  verifySyntheticEvent(input: SyntheticVerificationInput): SyntheticVerificationResult;
}

export function createSyntheticProviderVerificationAdapter(): SyntheticProviderVerificationAdapter {
  return Object.freeze({
    classification: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION" as const,
    verifySyntheticEvent(input: SyntheticVerificationInput): SyntheticVerificationResult {
      const rejected = input.syntheticDecision === "REJECT_SYNTHETIC_TAMPER";
      return {
        classification: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION",
        acceptedBySyntheticAdapter: !rejected,
        cryptographicSignatureVerified: false,
        reason: rejected
          ? "Rejected by test-only synthetic verification adapter"
          : "Accepted by test-only synthetic verification adapter (not real Paynow SHA-512)"
      };
    }
  });
}

// ---------------------------------------------------------------------------
// Section 20: Advertiser Invoice Payment Experience Readiness
// ---------------------------------------------------------------------------
export type InvoicePayableStatus =
  | "draft"
  | "approved"
  | "issued"
  | "partially_paid"
  | "overdue"
  | "paid"
  | "void"
  | "cancelled";

export const PAYABLE_INVOICE_STATUSES: readonly InvoicePayableStatus[] = Object.freeze([
  "issued",
  "partially_paid",
  "overdue"
]);

export interface AdvertiserInvoicePaymentOptions {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  balanceDue: number;
  currency: string;
  eligibleForPayment: boolean;
  payOnline: {
    label: "Pay Online";
    available: boolean;
    statusText: string;
  };
  bankTransfer: {
    label: "Bank Transfer";
    available: boolean;
    method: "bank_transfer";
    statusText: string;
  };
}

export function getAdvertiserInvoicePaymentOptions(
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    effectiveStatus?: string;
    balanceDue: number;
    currency: string;
  },
  readiness: ProviderReadinessState = resolvePaynowReadinessState()
): AdvertiserInvoicePaymentOptions {
  const effective = (invoice.effectiveStatus ?? invoice.status).toLowerCase();
  const isPayableState =
    (PAYABLE_INVOICE_STATUSES as readonly string[]).includes(invoice.status.toLowerCase()) ||
    (PAYABLE_INVOICE_STATUSES as readonly string[]).includes(effective);
  const eligible = isPayableState && invoice.balanceDue > 0;

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    balanceDue: Number(invoice.balanceDue.toFixed(2)),
    currency: invoice.currency,
    eligibleForPayment: eligible,
    payOnline: {
      label: "Pay Online",
      available: eligible && readiness.checkout_available,
      statusText: !eligible
        ? `Invoice not payable in ${invoice.status} state`
        : readiness.checkout_available
          ? "Pay Online via Paynow"
          : "Provider unavailable / configuration pending"
    },
    bankTransfer: {
      label: "Bank Transfer",
      available: eligible,
      method: "bank_transfer",
      statusText: eligible
        ? "Direct bank transfer settlement available"
        : `Invoice not payable in ${invoice.status} state`
    }
  };
}

// ---------------------------------------------------------------------------
// Section 26 & 27: Accountant & Owner Policy Registers
// ---------------------------------------------------------------------------
export interface PolicyRegisterItem {
  readonly key: string;
  readonly domain: "ACCOUNTANT_POLICY" | "OWNER_POLICY";
  readonly status: "UNRESOLVED_AWAITING_AUTHORITY";
  readonly description: string;
  readonly implementationConsequence: string;
}

export const ACCOUNTANT_POLICY_REGISTER: readonly PolicyRegisterItem[] = Object.freeze([
  {
    key: "paynow_clearing_account_number",
    domain: "ACCOUNTANT_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Chart of Accounts code for the Paynow Provider Clearing asset account.",
    implementationConsequence:
      "finance_provider_clearing_config.accountant_approved remains false; verified Paynow collections record business_reconciliation=COMPLETE and accounting_status=PENDING_ACCOUNTANT_AUTHORITY with clearing_journal_id=null."
  },
  {
    key: "fee_expense_account",
    domain: "ACCOUNTANT_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Chart of Accounts code for Paynow merchant transaction/settlement fee expenses.",
    implementationConsequence:
      "Provider fees are recorded on provider_settlements from settlement evidence only and held in accounting_status=PENDING_ACCOUNTANT_AUTHORITY pending accountant GL account code assignment."
  },
  {
    key: "premium_revenue_recognition_timing",
    domain: "ACCOUNTANT_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Whether monthly Premium subscription receipts are recognized immediately upon verification or ratably over the 1-month service window.",
    implementationConsequence:
      "Premium reconciliations record business_reconciliation=COMPLETE and accounting_status=PENDING_ACCOUNTANT_AUTHORITY with revenue_journal_id=null until accountant sign-off."
  },
  {
    key: "deferred_revenue_treatment",
    domain: "ACCOUNTANT_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Whether unearned subscription/advertising balances require a dedicated Deferred Revenue liability account.",
    implementationConsequence:
      "finance_provider_clearing_config.deferred_revenue_account_code remains null until accountant designation."
  },
  {
    key: "vat_treatment",
    domain: "ACCOUNTANT_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Statutory VAT applicability and rate breakdown on digital reader subscriptions vs commercial advertising invoices.",
    implementationConsequence:
      "Invoices preserve explicit subtotal and tax_total columns; Premium $5.00 USD plan does not fabricate tax splits until tax/accountant sign-off."
  },
  {
    key: "fiscalization",
    domain: "ACCOUNTANT_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "ZIMRA FDMS fiscal device/receipt integration requirements for online digital collections.",
    implementationConsequence:
      "Business receipts issue canonical HealthTimes references (HT-PREM / HT-INV / PAY) without fabricating ZIMRA fiscal signatures."
  },
  {
    key: "refund_accounting",
    domain: "ACCOUNTANT_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "GL debit/credit treatment for customer refunds (contra-revenue vs direct revenue reversal and fee recovery).",
    implementationConsequence:
      "payment_reversals records REFUND_REQUESTED / REFUND_CONFIRMED with accounting_action=PENDING_ACCOUNTANT_POLICY and opens a REFUND_REVIEW exception."
  },
  {
    key: "chargeback_accounting",
    domain: "ACCOUNTANT_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "GL treatment for disputed payments, chargeback losses, and provider dispute fees.",
    implementationConsequence:
      "payment_reversals records DISPUTE_OPENED / DISPUTE_RESOLVED with accounting_action=PENDING_ACCOUNTANT_POLICY and opens a DISPUTE_REVIEW exception."
  }
]);

export const OWNER_POLICY_REGISTER: readonly PolicyRegisterItem[] = Object.freeze([
  {
    key: "auto_renew",
    domain: "OWNER_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Whether monthly Premium memberships auto-renew via recurring token or require explicit monthly renewal checkout.",
    implementationConsequence:
      "Each reconciled payment grants exactly +1 billing month from max(now, current_end); no recurring background charge is scheduled."
  },
  {
    key: "grace_period",
    domain: "OWNER_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Number of post-expiry grace days (if any) before Premium article access locks.",
    implementationConsequence:
      "Entitlement checks enforce strict ends_at > now() with zero assumed grace days."
  },
  {
    key: "cancellation_effective_date",
    domain: "OWNER_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Whether subscriber-initiated cancellation takes effect at period end or immediately.",
    implementationConsequence:
      "Paid entitlements remain valid through their reconciled ends_at timestamp unless explicitly adjusted by authorized staff."
  },
  {
    key: "refund_eligibility",
    domain: "OWNER_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Commercial rules governing when a Premium subscriber or advertiser qualifies for a refund.",
    implementationConsequence:
      "Refund requests enter REFUND_REQUESTED and open a REFUND_REVIEW exception for manual review."
  },
  {
    key: "dispute_entitlement_effect",
    domain: "OWNER_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Whether opening a payment dispute or confirming a refund immediately revokes active Premium entitlement.",
    implementationConsequence:
      "payment_reversals sets entitlement_action=PENDING_OWNER_POLICY and preserves audit history without destructive entitlement deletion."
  },
  {
    key: "subscription_pause",
    domain: "OWNER_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Whether subscribers may pause active monthly memberships.",
    implementationConsequence:
      "No pause state is exposed or assumed."
  },
  {
    key: "retry_policy",
    domain: "OWNER_POLICY",
    status: "UNRESOLVED_AWAITING_AUTHORITY",
    description: "Dunning and payment retry cadence for failed or expired renewal attempts.",
    implementationConsequence:
      "Failed or expired transactions terminate in FAILED/EXPIRED; subsequent checkout creates a fresh idempotent payment intent."
  }
]);

// ---------------------------------------------------------------------------
// Secret Sanitization & Date Helpers
// ---------------------------------------------------------------------------
const REDACTED_SECRET_KEYS = new Set([
  "integration_key",
  "integrationkey",
  "paynow_integration_key",
  "secret",
  "secret_key",
  "api_key",
  "authorization",
  "password",
  "hash"
]);

export function sanitizeProviderMetadata(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (REDACTED_SECRET_KEYS.has(key.toLowerCase())) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export function addOneBillingMonth(baseIsoOrDate: string | Date): string {
  const d = typeof baseIsoOrDate === "string" ? new Date(baseIsoOrDate) : new Date(baseIsoOrDate.getTime());
  const next = new Date(d.getTime());
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

// ---------------------------------------------------------------------------
// Canonical Domain Records for the Provider-Independent Payment / Finance Engine
// ---------------------------------------------------------------------------
export interface PaymentTransactionRecord {
  id: string;
  provider: "paynow" | "bank_transfer";
  purpose: PaymentPurpose;
  merchantReference: string;
  subscriberId: string | null;
  invoiceId: string | null;
  planKey: string | null;
  planVersion: number | null;
  currency: string;
  expectedAmount: number;
  reportedAmount: number | null;
  providerReference: string | null;
  pollUrl: string | null;
  providerStatus: string | null;
  internalStatus: PaymentInternalStatus;
  reconciliationStatus: PaymentReconciliationStatus;
  accountingStatus: PaymentAccountingStatus;
  verificationAuthority: ProviderVerificationAuthority;
  idempotencyKey: string;
  paymentChannel: string | null;
  initiatedAt: string | null;
  confirmedAt: string | null;
  reconciledAt: string | null;
  providerMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderWebhookEventRecord {
  id: string;
  provider: "paynow" | "cloudflare" | "resend" | "brevo" | "social";
  providerEventId: string;
  eventType: string;
  signatureValid: false;
  verificationAuthority: ProviderVerificationAuthority;
  payloadHash: string;
  status: "received" | "processed" | "ignored" | "failed";
  transactionId: string | null;
  merchantReference: string | null;
  providerReference: string | null;
  reportedAmount: number | null;
  reportedCurrency: string | null;
  sanitizedMetadata: Record<string, unknown>;
  receivedAt: string;
  processedAt: string | null;
}

export interface SubscriberEntitlementRecord {
  id: string;
  subscriberId: string;
  policyKey: "premium";
  startsAt: string;
  endsAt: string;
  provider: string;
  providerReference: string;
}

export interface PremiumReconciliationRecord {
  id: string;
  transactionId: string;
  entitlementId: string;
  subscriberId: string;
  amount: number;
  currency: string;
  previousEndsAt: string | null;
  newStartsAt: string;
  newEndsAt: string;
  businessReconciliation: "COMPLETE" | "REVERSED";
  accountingStatus: PaymentAccountingStatus;
  revenueJournalId: string | null;
  unresolvedAccountingPolicies: readonly string[];
  reconciledAt: string;
}

export interface FinanceInvoiceRecord {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoicePayableStatus;
}

export interface FinancePaymentRecord {
  id: string;
  paymentNumber: string;
  customerId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: "bank_transfer" | "paynow" | "card" | "mobile_money" | "cash" | "other";
  providerChannel: string | null;
  providerReference: string | null;
  merchantReference: string | null;
  transactionId: string | null;
  businessReconciliation: "COMPLETE" | "REVERSED";
  accountingStatus: PaymentAccountingStatus;
  clearingJournalId: string | null;
  idempotencyKey: string;
  receivedBy: string;
  createdAt: string;
}

export interface ProviderSettlementLineRecord {
  id: string;
  settlementId: string;
  transactionId: string;
  merchantReference: string;
  providerReference: string | null;
  currency: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
}

export interface ProviderSettlementRecord {
  id: string;
  settlementNumber: string;
  provider: "paynow";
  settlementReference: string;
  settlementDate: string;
  currency: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  bankReference: string | null;
  status: "PENDING" | "MATCHED" | "SETTLEMENT_MISMATCH" | "RECONCILED_TO_BANK";
  accountingStatus: PaymentAccountingStatus;
  lines: ProviderSettlementLineRecord[];
  clearingJournalId: string | null;
  createdAt: string;
}

export interface PaymentReversalRecord {
  id: string;
  transactionId: string;
  merchantReference: string;
  reversalType: "REFUND" | "DISPUTE";
  workflowState:
    | "REFUND_REQUESTED"
    | "REFUND_CONFIRMED"
    | "DISPUTE_OPENED"
    | "DISPUTE_RESOLVED"
    | "REVERSAL_REQUIRED";
  amount: number;
  currency: string;
  reason: string;
  providerReference: string | null;
  entitlementAction: "PENDING_OWNER_POLICY" | "NO_ACTION" | "REVOKED_BY_OWNER_AUTHORITY";
  accountingAction: "PENDING_ACCOUNTANT_POLICY" | "REVERSAL_JOURNAL_POSTED" | "NO_POSTING_REQUIRED";
  openedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

export interface BusinessReceiptRecord {
  healthtimesReference: string;
  merchantReference: string;
  businessPurpose: PaymentPurpose;
  customerOrSubscriberId: string;
  customerOrSubscriberName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: "paynow" | "bank_transfer";
  paymentChannel: string | null;
  providerReference: string | null;
  invoiceOrPlanReference: string;
  internalStatus: PaymentInternalStatus;
  reconciliationStatus: PaymentReconciliationStatus;
  accountingStatus: PaymentAccountingStatus;
}

export interface FinanceTransparencySnapshot {
  currency: string;
  accountsReceivable: number;
  verifiedProviderPaymentsPendingReconciliation: number;
  businessReconciled: number;
  accountingPendingAuthority: number;
  accountingPendingPosting: number;
  accountingPosted: number;
  providerClearingPendingSettlement: number;
  bankSettled: number;
  bankSettlements: number;
  providerFees: number;
  refundsAndDisputes: number;
  openPaymentExceptionsCount: number;
}

export interface CommercialRevenueTransparencySnapshot {
  currency: string;
  premiumRevenue: number;
  directAdvertisingRevenue: number;
  adsenseRevenue: number;
  otherCommercialRevenue: number;
}

export interface DailyClearingControlSnapshot {
  controlDate: string;
  currency: string;
  openingProviderClearing: number;
  verifiedProviderCollections: number;
  settlementsToBank: number;
  providerFees: number;
  refundsAndReversals: number;
  closingProviderClearing: number;
  reportedActualClosingClearing: number;
  unexplainedDifference: number;
  status: "BALANCED" | "EXCEPTION_RAISED";
}

export interface MonthEndControlSnapshot {
  periodStart: string;
  periodEnd: string;
  currency: string;
  providerCollections: number;
  providerSettlements: number;
  providerFees: number;
  outstandingClearing: number;
  outstandingAr: number;
  refunds: number;
  disputes: number;
  premiumReceipts: number;
  advertisingReceipts: number;
  bankTransferReceipts: number;
}

// ---------------------------------------------------------------------------
// Complete Deterministic Payment + Finance Readiness Engine
// ---------------------------------------------------------------------------
export function createPaymentFinanceLedgerEngine(options?: {
  env?: Record<string, string | undefined>;
  syntheticVerificationAdapter?: SyntheticProviderVerificationAdapter;
}) {
  let seq = 1;
  const nextId = (prefix: string) => `${prefix}-${String(seq++).padStart(4, "0")}`;

  const subscribers = new Map<string, { id: string; email: string; displayName: string }>();
  const invoices = new Map<string, FinanceInvoiceRecord>();
  const transactions = new Map<string, PaymentTransactionRecord>();
  const transactionsByIdempotency = new Map<string, string>();
  const transactionsByMerchantRef = new Map<string, string>();
  const providerEvents = new Map<string, ProviderWebhookEventRecord>();
  const entitlements: SubscriberEntitlementRecord[] = [];
  const premiumReconciliations = new Map<string, PremiumReconciliationRecord>();
  const financePayments: FinancePaymentRecord[] = [];
  const financePaymentsByIdempotency = new Map<string, FinancePaymentRecord>();
  const financePaymentsByTxId = new Map<string, FinancePaymentRecord>();
  const settlements = new Map<string, ProviderSettlementRecord>();
  const settledTransactionIds = new Set<string>();
  const reversals: PaymentReversalRecord[] = [];
  const exceptions: PaymentExceptionRecord[] = [];
  const auditLogs: PaymentAuditEntry[] = [];
  const journals: Array<{
    id: string;
    entryNumber: string;
    source: string;
    sourceId: string;
    currency: string;
    memo: string;
    lines: Array<{ accountCode: string; debit: number; credit: number; description: string }>;
  }> = [];

  let adsenseRevenueTotal = 0;
  let otherCommercialRevenueTotal = 0;

  let clearingConfig = {
    provider: "paynow" as const,
    clearingMode: "PENDING_ACCOUNTANT_AUTHORITY" as "PENDING_ACCOUNTANT_AUTHORITY" | "PROVIDER_CLEARING_TWO_STEP",
    accountantApproved: false,
    premiumAccountingApproved: false,
    providerClearingAccountCode: null as string | null,
    providerFeeExpenseAccountCode: null as string | null,
    bankSettlementAccountCode: "1000",
    accountsReceivableAccountCode: "1200",
    premiumRevenueAccountCode: "4100"
  };

  function recordAudit(input: {
    actor: string;
    actorType: PaymentAuditEntry["actorType"];
    action: string;
    source: PaymentAuditSource;
    transactionId: string | null;
    businessObject: string;
    beforeState: Record<string, unknown> | null;
    afterState: Record<string, unknown> | null;
    reason?: string | null;
    providerReference?: string | null;
    timestamp?: string;
  }): PaymentAuditEntry {
    if (input.source === "manual_intervention" && (!input.reason || input.reason.trim().length < 3)) {
      throw new Error("AUDIT_REASON_REQUIRED: Manual payment intervention requires an explicit reason");
    }
    const entry: PaymentAuditEntry = {
      id: nextId("aud"),
      actor: input.actor,
      actorType: input.actorType,
      action: input.action,
      source: input.source,
      transactionId: input.transactionId,
      businessObject: input.businessObject,
      timestamp: input.timestamp ?? new Date().toISOString(),
      beforeState: input.beforeState,
      afterState: input.afterState,
      reason: input.reason ?? null,
      providerReference: input.providerReference ?? null
    };
    auditLogs.push(entry);
    return entry;
  }

  function openException(input: {
    exceptionCode: PaymentExceptionCode;
    reason: string;
    transactionId?: string | null;
    settlementId?: string | null;
    merchantReference?: string | null;
    providerReference?: string | null;
    details?: Record<string, unknown>;
    openedAt?: string;
  }): PaymentExceptionRecord {
    const exc: PaymentExceptionRecord = {
      id: nextId("exc"),
      exceptionCode: input.exceptionCode,
      status: "OPEN",
      reason: input.reason,
      transactionId: input.transactionId ?? null,
      settlementId: input.settlementId ?? null,
      merchantReference: input.merchantReference ?? null,
      providerReference: input.providerReference ?? null,
      details: input.details ?? {},
      openedAt: input.openedAt ?? new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
      resolutionNote: null
    };
    exceptions.push(exc);
    recordAudit({
      actor: "system",
      actorType: "system",
      action: `payment.exception.${input.exceptionCode.toLowerCase()}`,
      source: "reconciliation_engine",
      transactionId: exc.transactionId,
      businessObject: `payment_exceptions:${exc.id}`,
      beforeState: null,
      afterState: { exceptionCode: exc.exceptionCode, status: exc.status },
      reason: exc.reason,
      providerReference: exc.providerReference,
      timestamp: exc.openedAt
    });
    return exc;
  }

  return {
    getReadinessState(): ProviderReadinessState {
      return resolvePaynowReadinessState(options?.env ?? {});
    },

    registerSubscriber(sub: { id: string; email: string; displayName: string }) {
      subscribers.set(sub.id, { ...sub });
    },

    registerInvoice(inv: FinanceInvoiceRecord) {
      invoices.set(inv.id, { ...inv });
    },

    getInvoice(invoiceId: string): FinanceInvoiceRecord | undefined {
      return invoices.get(invoiceId);
    },

    configureClearingModel(cfg: {
      accountantApproved: boolean;
      providerClearingAccountCode: string | null;
      providerFeeExpenseAccountCode: string | null;
      premiumAccountingApproved?: boolean;
    }) {
      clearingConfig = {
        ...clearingConfig,
        clearingMode: cfg.accountantApproved ? "PROVIDER_CLEARING_TWO_STEP" : "PENDING_ACCOUNTANT_AUTHORITY",
        accountantApproved: cfg.accountantApproved,
        premiumAccountingApproved: Boolean(cfg.premiumAccountingApproved ?? false),
        providerClearingAccountCode: cfg.providerClearingAccountCode,
        providerFeeExpenseAccountCode: cfg.providerFeeExpenseAccountCode
      };
    },

    recordSeparateAdSenseRevenue(amount: number) {
      if (amount < 0) throw new Error("AdSense revenue cannot be negative");
      adsenseRevenueTotal = Number((adsenseRevenueTotal + amount).toFixed(2));
    },

    recordOtherCommercialRevenue(amount: number) {
      if (amount < 0) throw new Error("Other commercial revenue cannot be negative");
      otherCommercialRevenueTotal = Number((otherCommercialRevenueTotal + amount).toFixed(2));
    },

    // Section 8: Payment Intent Creation
    createPaymentIntent(input: {
      purpose: PaymentPurpose;
      idempotencyKey: string;
      subscriberId?: string | null;
      invoiceId?: string | null;
      planKey?: string | null;
      clientSuppliedAmount?: number | null;
      clientSuppliedCurrency?: string | null;
      clientSuppliedPaid?: boolean | null;
      clientSuppliedProviderStatus?: string | null;
      clientSuppliedPollUrl?: string | null;
      now?: string;
    }): { transaction: PaymentTransactionRecord; replayed: boolean } {
      const idem = (input.idempotencyKey ?? "").trim();
      if (idem.length < 8) {
        throw new Error("IDEMPOTENCY_KEY_INVALID: Idempotency key must be at least 8 characters");
      }

      const existingId = transactionsByIdempotency.get(idem);
      if (existingId) {
        const existingTx = transactions.get(existingId)!;
        if (
          existingTx.purpose !== input.purpose ||
          (existingTx.subscriberId ?? null) !== (input.subscriberId ?? null) ||
          (existingTx.invoiceId ?? null) !== (input.invoiceId ?? null)
        ) {
          throw new Error("IDEMPOTENCY_CONFLICT: Idempotency key already bound to different intent parameters");
        }
        return { transaction: existingTx, replayed: true };
      }

      let expectedAmount = 0;
      let currency = "USD";
      let planKey: string | null = null;
      let planVersion: number | null = null;
      let reconciliationStatus: PaymentReconciliationStatus = "PENDING";
      let accountingStatus: PaymentAccountingStatus = "PENDING_ACCOUNTANT_AUTHORITY";

      if (input.purpose === "PREMIUM_SUBSCRIPTION") {
        if (!input.subscriberId || !subscribers.has(input.subscriberId)) {
          throw new Error("SUBSCRIBER_REQUIRED: Valid subscriber is required for PREMIUM_SUBSCRIPTION");
        }
        if (input.invoiceId) {
          throw new Error("INVALID_INTENT: PREMIUM_SUBSCRIPTION cannot reference an invoice");
        }
        const requestedPlan = input.planKey ?? CANONICAL_PREMIUM_PLAN.plan_key;
        if (requestedPlan !== CANONICAL_PREMIUM_PLAN.plan_key) {
          throw new Error(`UNKNOWN_PLAN: ${requestedPlan} is not an active canonical Premium plan`);
        }
        expectedAmount = CANONICAL_PREMIUM_PLAN.amount;
        currency = CANONICAL_PREMIUM_PLAN.currency;
        planKey = CANONICAL_PREMIUM_PLAN.plan_key;
        planVersion = CANONICAL_PREMIUM_PLAN.version;
      } else if (input.purpose === "ADVERTISING_INVOICE") {
        if (!input.invoiceId) {
          throw new Error("INVOICE_REQUIRED: invoiceId is required for ADVERTISING_INVOICE");
        }
        if (input.subscriberId) {
          throw new Error("INVALID_INTENT: ADVERTISING_INVOICE cannot reference a subscriber");
        }
        const inv = invoices.get(input.invoiceId);
        if (!inv) {
          throw new Error("INVOICE_NOT_FOUND: Invoice does not exist");
        }
        if (!(PAYABLE_INVOICE_STATUSES as readonly string[]).includes(inv.status) || inv.balanceDue <= 0) {
          openException({
            exceptionCode: "UNPAYABLE_INVOICE",
            reason: `Attempted to create payment intent for invoice ${inv.invoiceNumber} in non-payable status ${inv.status}`,
            details: { invoiceId: inv.id, invoiceStatus: inv.status }
          });
          throw new Error(`UNPAYABLE_INVOICE: Invoice ${inv.invoiceNumber} is in status ${inv.status}`);
        }
        expectedAmount = inv.balanceDue;
        currency = inv.currency;
      } else if (input.purpose === "PROVIDER_CONNECTIVITY_TEST") {
        if (input.subscriberId || input.invoiceId) {
          throw new Error("INVALID_INTENT: PROVIDER_CONNECTIVITY_TEST cannot reference subscriber or invoice");
        }
        expectedAmount = 1.0;
        currency = "USD";
        reconciliationStatus = "NOT_ELIGIBLE";
        accountingStatus = "NOT_APPLICABLE";
      } else {
        throw new Error(`UNSUPPORTED_PURPOSE: ${String(input.purpose)}`);
      }

      if (
        input.clientSuppliedCurrency !== undefined &&
        input.clientSuppliedCurrency !== null &&
        input.clientSuppliedCurrency.trim().toUpperCase() !== currency
      ) {
        openException({
          exceptionCode: "CURRENCY_MISMATCH",
          reason: `Client supplied currency ${input.clientSuppliedCurrency} against canonical ${currency}`
        });
        throw new Error(`CURRENCY_MISMATCH: Expected ${currency}, received ${input.clientSuppliedCurrency}`);
      }

      if (
        input.clientSuppliedAmount !== undefined &&
        input.clientSuppliedAmount !== null &&
        Number(input.clientSuppliedAmount.toFixed(2)) !== Number(expectedAmount.toFixed(2))
      ) {
        openException({
          exceptionCode: "AMOUNT_MISMATCH",
          reason: `Client supplied amount ${input.clientSuppliedAmount} against canonical ${expectedAmount}`
        });
        throw new Error(`AMOUNT_MISMATCH: Expected ${expectedAmount}, received ${input.clientSuppliedAmount}`);
      }

      const now = input.now ?? new Date().toISOString();
      const merchantRef = generateMerchantReference(input.purpose);

      const tx: PaymentTransactionRecord = {
        id: nextId("tx"),
        provider: "paynow",
        purpose: input.purpose,
        merchantReference: merchantRef,
        subscriberId: input.subscriberId ?? null,
        invoiceId: input.invoiceId ?? null,
        planKey,
        planVersion,
        currency,
        expectedAmount,
        reportedAmount: null,
        providerReference: null,
        pollUrl: null,
        providerStatus: null,
        internalStatus: "CREATED",
        reconciliationStatus,
        accountingStatus,
        verificationAuthority: "NO_VERIFICATION_AUTHORITY",
        idempotencyKey: idem,
        paymentChannel: null,
        initiatedAt: null,
        confirmedAt: null,
        reconciledAt: null,
        providerMetadata: {},
        createdAt: now,
        updatedAt: now
      };

      transactions.set(tx.id, tx);
      transactionsByIdempotency.set(idem, tx.id);
      transactionsByMerchantRef.set(merchantRef, tx.id);

      recordAudit({
        actor: input.subscriberId ?? "server",
        actorType: input.subscriberId ? "subscriber" : "system",
        action: "payment.intent.created",
        source: "server_intent",
        transactionId: tx.id,
        businessObject: `payment_transactions:${tx.id}`,
        beforeState: null,
        afterState: {
          merchantReference: tx.merchantReference,
          purpose: tx.purpose,
          expectedAmount: tx.expectedAmount,
          currency: tx.currency,
          internalStatus: tx.internalStatus,
          accountingStatus: tx.accountingStatus
        },
        reason: "Canonical server payment intent created",
        timestamp: now
      });

      return { transaction: { ...tx }, replayed: false };
    },

    // Section 1, 2, 3, 21 & 29: Fail-closed provider checkout initiation
    initiateProviderCheckout(transactionId: string): {
      allowed: boolean;
      readiness: ProviderReadinessState;
      reason: string;
    } {
      const readiness = resolvePaynowReadinessState(options?.env ?? {});
      const tx = transactions.get(transactionId);
      if (!tx) {
        throw new Error("TRANSACTION_NOT_FOUND");
      }
      if (!readiness.checkout_available) {
        return {
          allowed: false,
          readiness,
          reason: `CHECKOUT_FAILS_CLOSED: status=${readiness.status}, mode_status=${readiness.mode_status}, provider_authority_certified=${String(readiness.provider_authority_certified)}, checkout_implementation_ready=${String(readiness.checkout_implementation_ready)}`
        };
      }
      const before = { internalStatus: tx.internalStatus };
      tx.internalStatus = "PROVIDER_INITIATED";
      tx.initiatedAt = new Date().toISOString();
      tx.updatedAt = tx.initiatedAt;
      recordAudit({
        actor: "system",
        actorType: "system",
        action: "payment.provider.initiated",
        source: "server_intent",
        transactionId: tx.id,
        businessObject: `payment_transactions:${tx.id}`,
        beforeState: before,
        afterState: { internalStatus: tx.internalStatus }
      });
      return {
        allowed: true,
        readiness,
        reason: "Provider checkout initiated"
      };
    },

    // Remediation RDY01-R1-002 (Sections 4, 5, 6):
    // Provider Event Ingestion with strict NO_VERIFICATION_AUTHORITY fail-closed gate
    ingestProviderWebhookEvent(input: {
      provider: "paynow";
      providerEventId: string;
      merchantReference: string;
      providerReference: string;
      providerStatus: string;
      reportedAmount: number;
      reportedCurrency: string;
      paymentChannel?: string | null;
      pollUrl?: string | null;
      syntheticDecision?: "ALLOW_SYNTHETIC_TEST" | "REJECT_SYNTHETIC_TAMPER";
      rawMetadata?: Record<string, unknown>;
      now?: string;
    }): {
      eventStatus: "PROCESSED" | "DUPLICATE_EVENT" | "REJECTED";
      internalStatus: PaymentInternalStatus;
      verificationAuthority: ProviderVerificationAuthority;
      signatureValid: false;
      transactionId: string | null;
      exceptionId: string | null;
    } {
      const now = input.now ?? new Date().toISOString();
      const eventKey = `${input.provider}:${input.providerEventId}`;
      const sanitizedMeta = sanitizeProviderMetadata(input.rawMetadata);

      // 1. Provider event idempotency check
      if (providerEvents.has(eventKey)) {
        const existingEvt = providerEvents.get(eventKey)!;
        const existingTxId = transactionsByMerchantRef.get(input.merchantReference) ?? null;
        const exc = openException({
          exceptionCode: "DUPLICATE_PROVIDER_EVENT",
          reason: `Duplicate provider webhook event ${eventKey} ignored idempotently`,
          transactionId: existingTxId,
          merchantReference: input.merchantReference,
          providerReference: input.providerReference,
          details: { providerEventId: input.providerEventId },
          openedAt: now
        });
        return {
          eventStatus: "DUPLICATE_EVENT",
          internalStatus: "DUPLICATE_EVENT",
          verificationAuthority: existingEvt.verificationAuthority,
          signatureValid: false,
          transactionId: existingTxId,
          exceptionId: exc.id
        };
      }

      // 2. Resolve canonical transaction by merchantReference
      const txId = transactionsByMerchantRef.get(input.merchantReference) ?? null;
      if (!txId) {
        const exc = openException({
          exceptionCode: "UNKNOWN_REFERENCE",
          reason: `Webhook received for unknown merchant reference ${input.merchantReference}`,
          merchantReference: input.merchantReference,
          providerReference: input.providerReference,
          openedAt: now
        });
        providerEvents.set(eventKey, {
          id: nextId("evt"),
          provider: input.provider,
          providerEventId: input.providerEventId,
          eventType: input.providerStatus,
          signatureValid: false,
          verificationAuthority: "NO_VERIFICATION_AUTHORITY",
          payloadHash: "unverified",
          status: "failed",
          transactionId: null,
          merchantReference: input.merchantReference,
          providerReference: input.providerReference,
          reportedAmount: input.reportedAmount,
          reportedCurrency: input.reportedCurrency,
          sanitizedMetadata: sanitizedMeta,
          receivedAt: now,
          processedAt: now
        });
        return {
          eventStatus: "REJECTED",
          internalStatus: "UNKNOWN_REFERENCE",
          verificationAuthority: "NO_VERIFICATION_AUTHORITY",
          signatureValid: false,
          transactionId: null,
          exceptionId: exc.id
        };
      }

      const tx = transactions.get(txId)!;
      const beforeState = {
        internalStatus: tx.internalStatus,
        reconciliationStatus: tx.reconciliationStatus,
        reportedAmount: tx.reportedAmount,
        verificationAuthority: tx.verificationAuthority
      };

      // 3. Enforce Verification Authority Invariant (Sections 5 & 6):
      // If no SyntheticProviderVerificationAdapter is configured, NO_VERIFICATION_AUTHORITY applies:
      // signatureValid=false and transaction can NEVER transition to PAYMENT_VERIFIED.
      const syntheticAdapter = options?.syntheticVerificationAdapter;
      if (!syntheticAdapter || syntheticAdapter.classification !== "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION") {
        tx.internalStatus = "INVALID_HASH";
        tx.verificationAuthority = "NO_VERIFICATION_AUTHORITY";
        tx.updatedAt = now;
        providerEvents.set(eventKey, {
          id: nextId("evt"),
          provider: input.provider,
          providerEventId: input.providerEventId,
          eventType: input.providerStatus,
          signatureValid: false,
          verificationAuthority: "NO_VERIFICATION_AUTHORITY",
          payloadHash: "unverified",
          status: "failed",
          transactionId: tx.id,
          merchantReference: input.merchantReference,
          providerReference: input.providerReference,
          reportedAmount: input.reportedAmount,
          reportedCurrency: input.reportedCurrency,
          sanitizedMetadata: sanitizedMeta,
          receivedAt: now,
          processedAt: now
        });
        recordAudit({
          actor: "provider_webhook",
          actorType: "provider_webhook",
          action: "payment.webhook.unverified_rejected",
          source: "provider_webhook",
          transactionId: tx.id,
          businessObject: `payment_transactions:${tx.id}`,
          beforeState,
          afterState: {
            internalStatus: tx.internalStatus,
            verificationAuthority: "NO_VERIFICATION_AUTHORITY",
            signatureValid: false
          },
          reason: "NO_VERIFICATION_AUTHORITY: Unverified provider event cannot transition transaction to PAYMENT_VERIFIED",
          providerReference: input.providerReference,
          timestamp: now
        });
        return {
          eventStatus: "REJECTED",
          internalStatus: "INVALID_HASH",
          verificationAuthority: "NO_VERIFICATION_AUTHORITY",
          signatureValid: false,
          transactionId: tx.id,
          exceptionId: null
        };
      }

      const syntheticResult = syntheticAdapter.verifySyntheticEvent({
        providerEventId: input.providerEventId,
        merchantReference: input.merchantReference,
        providerReference: input.providerReference,
        reportedAmount: input.reportedAmount,
        reportedCurrency: input.reportedCurrency,
        providerStatus: input.providerStatus,
        syntheticDecision: input.syntheticDecision
      });

      if (!syntheticResult.acceptedBySyntheticAdapter) {
        tx.internalStatus = "INVALID_HASH";
        tx.verificationAuthority = "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION";
        tx.updatedAt = now;
        providerEvents.set(eventKey, {
          id: nextId("evt"),
          provider: input.provider,
          providerEventId: input.providerEventId,
          eventType: input.providerStatus,
          signatureValid: false,
          verificationAuthority: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION",
          payloadHash: "synthetic-rejected",
          status: "failed",
          transactionId: tx.id,
          merchantReference: input.merchantReference,
          providerReference: input.providerReference,
          reportedAmount: input.reportedAmount,
          reportedCurrency: input.reportedCurrency,
          sanitizedMetadata: sanitizedMeta,
          receivedAt: now,
          processedAt: now
        });
        recordAudit({
          actor: "provider_webhook",
          actorType: "provider_webhook",
          action: "payment.webhook.synthetic_rejected",
          source: "provider_webhook",
          transactionId: tx.id,
          businessObject: `payment_transactions:${tx.id}`,
          beforeState,
          afterState: {
            internalStatus: tx.internalStatus,
            verificationAuthority: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION"
          },
          reason: syntheticResult.reason,
          providerReference: input.providerReference,
          timestamp: now
        });
        return {
          eventStatus: "REJECTED",
          internalStatus: "INVALID_HASH",
          verificationAuthority: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION",
          signatureValid: false,
          transactionId: tx.id,
          exceptionId: null
        };
      }

      // Record event with signatureValid=false (never claiming real Paynow SHA-512)
      // and verificationAuthority="TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION"
      providerEvents.set(eventKey, {
        id: nextId("evt"),
        provider: input.provider,
        providerEventId: input.providerEventId,
        eventType: input.providerStatus,
        signatureValid: false,
        verificationAuthority: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION",
        payloadHash: "synthetic-test-only",
        status: "processed",
        transactionId: tx.id,
        merchantReference: input.merchantReference,
        providerReference: input.providerReference,
        reportedAmount: input.reportedAmount,
        reportedCurrency: input.reportedCurrency,
        sanitizedMetadata: sanitizedMeta,
        receivedAt: now,
        processedAt: now
      });

      if (tx.internalStatus === "RECONCILED") {
        const exc = openException({
          exceptionCode: "DUPLICATE_PROVIDER_EVENT",
          reason: `Webhook event ${input.providerEventId} arrived for already-reconciled transaction ${tx.merchantReference}`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          providerReference: input.providerReference,
          openedAt: now
        });
        return {
          eventStatus: "DUPLICATE_EVENT",
          internalStatus: tx.internalStatus,
          verificationAuthority: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION",
          signatureValid: false,
          transactionId: tx.id,
          exceptionId: exc.id
        };
      }

      tx.verificationAuthority = "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION";
      tx.providerReference = input.providerReference;
      tx.providerStatus = input.providerStatus;
      tx.reportedAmount = Number(input.reportedAmount.toFixed(2));
      tx.paymentChannel = input.paymentChannel ?? tx.paymentChannel;
      tx.pollUrl = input.pollUrl ?? tx.pollUrl;
      tx.providerMetadata = sanitizedMeta;
      tx.updatedAt = now;

      // 4. Currency check
      if (input.reportedCurrency.trim().toUpperCase() !== tx.currency) {
        tx.internalStatus = "CURRENCY_MISMATCH";
        if (tx.purpose !== "PROVIDER_CONNECTIVITY_TEST") {
          tx.reconciliationStatus = "RECONCILIATION_FAILED";
        }
        const exc = openException({
          exceptionCode: "CURRENCY_MISMATCH",
          reason: `Reported currency ${input.reportedCurrency} does not match expected ${tx.currency}`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          providerReference: input.providerReference,
          openedAt: now
        });
        return {
          eventStatus: "REJECTED",
          internalStatus: tx.internalStatus,
          verificationAuthority: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION",
          signatureValid: false,
          transactionId: tx.id,
          exceptionId: exc.id
        };
      }

      // 5. Amount check
      if (Number(input.reportedAmount.toFixed(2)) !== Number(tx.expectedAmount.toFixed(2))) {
        tx.internalStatus = "AMOUNT_MISMATCH";
        if (tx.purpose !== "PROVIDER_CONNECTIVITY_TEST") {
          tx.reconciliationStatus = "RECONCILIATION_FAILED";
        }
        const exc = openException({
          exceptionCode: "AMOUNT_MISMATCH",
          reason: `Reported amount ${input.reportedAmount} does not match expected ${tx.expectedAmount}`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          providerReference: input.providerReference,
          openedAt: now
        });
        return {
          eventStatus: "REJECTED",
          internalStatus: tx.internalStatus,
          verificationAuthority: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION",
          signatureValid: false,
          transactionId: tx.id,
          exceptionId: exc.id
        };
      }

      // 6. Map provider status to explicit internal state
      const normStatus = input.providerStatus.trim().toLowerCase();
      if (normStatus === "paid" || normStatus === "awaiting delivery" || normStatus === "delivered") {
        tx.internalStatus = "PAYMENT_VERIFIED";
        tx.confirmedAt = now;
      } else if (normStatus === "created" || normStatus === "sent" || normStatus === "pending") {
        tx.internalStatus = "PROVIDER_PENDING";
      } else if (normStatus === "cancelled") {
        tx.internalStatus = "CANCELLED";
      } else if (normStatus === "expired") {
        tx.internalStatus = "EXPIRED";
      } else {
        tx.internalStatus = "FAILED";
      }

      recordAudit({
        actor: "provider_webhook",
        actorType: "provider_webhook",
        action: `payment.webhook.${tx.internalStatus.toLowerCase()}`,
        source: "provider_webhook",
        transactionId: tx.id,
        businessObject: `payment_transactions:${tx.id}`,
        beforeState,
        afterState: {
          internalStatus: tx.internalStatus,
          reportedAmount: tx.reportedAmount,
          providerReference: tx.providerReference,
          verificationAuthority: tx.verificationAuthority,
          signatureValid: false
        },
        reason: `Provider status ${input.providerStatus} processed under TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION`,
        providerReference: input.providerReference,
        timestamp: now
      });

      return {
        eventStatus: "PROCESSED",
        internalStatus: tx.internalStatus,
        verificationAuthority: "TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION",
        signatureValid: false,
        transactionId: tx.id,
        exceptionId: null
      };
    },

    // Section 9 & 10: Premium Payment Reconciliation Primitive (with Accounting State Closure)
    reconcilePremiumSubscription(
      transactionId: string,
      nowIso: string = new Date().toISOString()
    ): {
      reconciled: boolean;
      replayed: boolean;
      entitlementChanged: boolean;
      businessReconciliation: "COMPLETE" | "REVERSED";
      accountingStatus: PaymentAccountingStatus;
      revenueJournalId: string | null;
      unresolvedAccountingPolicies: readonly string[];
      entitlement: SubscriberEntitlementRecord | null;
      previousEndsAt: string | null;
      newStartsAt: string;
      newEndsAt: string;
    } {
      const tx = transactions.get(transactionId);
      if (!tx) {
        throw new Error("TRANSACTION_NOT_FOUND");
      }
      if (tx.purpose === "PROVIDER_CONNECTIVITY_TEST") {
        throw new Error("CONNECTIVITY_TEST_NOT_RECONCILABLE: PROVIDER_CONNECTIVITY_TEST must never be reconciled into Premium");
      }
      if (tx.purpose !== "PREMIUM_SUBSCRIPTION") {
        throw new Error(`INVALID_PURPOSE: Expected PREMIUM_SUBSCRIPTION, got ${tx.purpose}`);
      }

      const existingRec = premiumReconciliations.get(tx.id);
      if (existingRec || tx.reconciliationStatus === "RECONCILED") {
        const ent = entitlements.find((e) => e.id === existingRec?.entitlementId) ?? null;
        return {
          reconciled: true,
          replayed: true,
          entitlementChanged: false,
          businessReconciliation: existingRec?.businessReconciliation ?? "COMPLETE",
          accountingStatus: existingRec?.accountingStatus ?? tx.accountingStatus,
          revenueJournalId: existingRec?.revenueJournalId ?? null,
          unresolvedAccountingPolicies: existingRec?.unresolvedAccountingPolicies ?? [
            "revenue_recognition_timing",
            "deferred_revenue_treatment",
            "vat",
            "fiscalization"
          ],
          entitlement: ent,
          previousEndsAt: existingRec?.previousEndsAt ?? null,
          newStartsAt: existingRec?.newStartsAt ?? nowIso,
          newEndsAt: existingRec?.newEndsAt ?? nowIso
        };
      }

      if (
        tx.verificationAuthority === "NO_VERIFICATION_AUTHORITY" ||
        (tx.internalStatus !== "PAYMENT_VERIFIED" && tx.internalStatus !== "RECONCILIATION_PENDING")
      ) {
        openException({
          exceptionCode: "RECONCILIATION_FAILED",
          reason: `Cannot reconcile Premium transaction in status ${tx.internalStatus} (verification=${tx.verificationAuthority})`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          providerReference: tx.providerReference,
          openedAt: nowIso
        });
        tx.internalStatus = "RECONCILIATION_FAILED";
        tx.reconciliationStatus = "RECONCILIATION_FAILED";
        throw new Error(`RECONCILIATION_FAILED: Transaction status is ${tx.internalStatus}`);
      }

      if (tx.currency !== CANONICAL_PREMIUM_PLAN.currency) {
        openException({
          exceptionCode: "CURRENCY_MISMATCH",
          reason: `Currency ${tx.currency} does not match canonical plan currency ${CANONICAL_PREMIUM_PLAN.currency}`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          openedAt: nowIso
        });
        tx.internalStatus = "CURRENCY_MISMATCH";
        tx.reconciliationStatus = "RECONCILIATION_FAILED";
        throw new Error("CURRENCY_MISMATCH");
      }

      if (tx.reportedAmount !== CANONICAL_PREMIUM_PLAN.amount || tx.expectedAmount !== CANONICAL_PREMIUM_PLAN.amount) {
        openException({
          exceptionCode: "AMOUNT_MISMATCH",
          reason: `Amount ${String(tx.reportedAmount)} does not match canonical plan amount ${CANONICAL_PREMIUM_PLAN.amount}`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          openedAt: nowIso
        });
        tx.internalStatus = "AMOUNT_MISMATCH";
        tx.reconciliationStatus = "RECONCILIATION_FAILED";
        throw new Error("AMOUNT_MISMATCH");
      }

      if (!tx.subscriberId || !subscribers.has(tx.subscriberId)) {
        throw new Error("SUBSCRIBER_NOT_FOUND");
      }

      const subEntitlements = entitlements.filter((e) => e.subscriberId === tx.subscriberId);
      let latestEnd: string | null = null;
      for (const ent of subEntitlements) {
        if (!latestEnd || new Date(ent.endsAt).getTime() > new Date(latestEnd).getTime()) {
          latestEnd = ent.endsAt;
        }
      }

      const nowMs = new Date(nowIso).getTime();
      const latestEndMs = latestEnd ? new Date(latestEnd).getTime() : -1;
      const baseIso = latestEnd && latestEndMs > nowMs ? latestEnd : nowIso;
      const newEndsAt = addOneBillingMonth(baseIso);

      const newEntitlement: SubscriberEntitlementRecord = {
        id: nextId("ent"),
        subscriberId: tx.subscriberId,
        policyKey: "premium",
        startsAt: nowIso,
        endsAt: newEndsAt,
        provider: tx.provider,
        providerReference: tx.merchantReference
      };
      entitlements.push(newEntitlement);

      // Section 10: Premium accounting state remains PENDING_ACCOUNTANT_AUTHORITY
      // because revenue recognition timing, deferred revenue treatment, VAT, and fiscalization are unresolved.
      const accountingStatus: PaymentAccountingStatus =
        clearingConfig.accountantApproved && clearingConfig.premiumAccountingApproved
          ? "PENDING_POSTING"
          : "PENDING_ACCOUNTANT_AUTHORITY";

      const recRecord: PremiumReconciliationRecord = {
        id: nextId("prec"),
        transactionId: tx.id,
        entitlementId: newEntitlement.id,
        subscriberId: tx.subscriberId,
        amount: CANONICAL_PREMIUM_PLAN.amount,
        currency: CANONICAL_PREMIUM_PLAN.currency,
        previousEndsAt: latestEnd,
        newStartsAt: nowIso,
        newEndsAt,
        businessReconciliation: "COMPLETE",
        accountingStatus,
        revenueJournalId: null,
        unresolvedAccountingPolicies: Object.freeze([
          "revenue_recognition_timing",
          "deferred_revenue_treatment",
          "vat",
          "fiscalization"
        ]),
        reconciledAt: nowIso
      };
      premiumReconciliations.set(tx.id, recRecord);

      const beforeState = {
        internalStatus: tx.internalStatus,
        reconciliationStatus: tx.reconciliationStatus,
        accountingStatus: tx.accountingStatus
      };
      tx.internalStatus = "RECONCILED";
      tx.reconciliationStatus = "RECONCILED";
      tx.accountingStatus = accountingStatus;
      tx.reconciledAt = nowIso;
      tx.updatedAt = nowIso;

      recordAudit({
        actor: "reconciliation_engine",
        actorType: "system",
        action: "payment.premium.reconciled",
        source: "reconciliation_engine",
        transactionId: tx.id,
        businessObject: `premium_entitlements:${newEntitlement.id}`,
        beforeState,
        afterState: {
          internalStatus: tx.internalStatus,
          reconciliationStatus: tx.reconciliationStatus,
          businessReconciliation: "COMPLETE",
          accountingStatus: tx.accountingStatus,
          revenueJournalId: null,
          previousEndsAt: latestEnd,
          newStartsAt: nowIso,
          newEndsAt
        },
        reason: "Verified Premium payment reconciled into subscriber entitlement (accounting pending accountant authority)",
        providerReference: tx.providerReference,
        timestamp: nowIso
      });

      return {
        reconciled: true,
        replayed: false,
        entitlementChanged: true,
        businessReconciliation: "COMPLETE",
        accountingStatus,
        revenueJournalId: null,
        unresolvedAccountingPolicies: recRecord.unresolvedAccountingPolicies,
        entitlement: newEntitlement,
        previousEndsAt: latestEnd,
        newStartsAt: nowIso,
        newEndsAt
      };
    },

    // Section 8, 9, 10 & 11: Advertising Invoice Payment Reconciliation Primitive
    reconcileAdvertisingInvoice(
      transactionId: string,
      actorStaffId: string = "staff-finance-system",
      nowIso: string = new Date().toISOString()
    ): {
      reconciled: boolean;
      replayed: boolean;
      businessReconciliation: "COMPLETE" | "REVERSED";
      accountingStatus: PaymentAccountingStatus;
      clearingJournalId: string | null;
      payment: FinancePaymentRecord;
      invoiceStatus: InvoicePayableStatus;
      balanceDue: number;
    } {
      const tx = transactions.get(transactionId);
      if (!tx) {
        throw new Error("TRANSACTION_NOT_FOUND");
      }
      if (tx.purpose === "PROVIDER_CONNECTIVITY_TEST") {
        throw new Error("CONNECTIVITY_TEST_NOT_RECONCILABLE: PROVIDER_CONNECTIVITY_TEST must never be reconciled into Finance");
      }
      if (tx.purpose !== "ADVERTISING_INVOICE") {
        throw new Error(`INVALID_PURPOSE: Expected ADVERTISING_INVOICE, got ${tx.purpose}`);
      }

      const existingPayment = financePaymentsByTxId.get(tx.id);
      if (existingPayment || tx.reconciliationStatus === "RECONCILED") {
        const inv = invoices.get(tx.invoiceId!)!;
        return {
          reconciled: true,
          replayed: true,
          businessReconciliation: existingPayment?.businessReconciliation ?? "COMPLETE",
          accountingStatus: existingPayment?.accountingStatus ?? tx.accountingStatus,
          clearingJournalId: existingPayment?.clearingJournalId ?? null,
          payment: existingPayment!,
          invoiceStatus: inv.status,
          balanceDue: inv.balanceDue
        };
      }

      if (
        tx.verificationAuthority === "NO_VERIFICATION_AUTHORITY" ||
        (tx.internalStatus !== "PAYMENT_VERIFIED" && tx.internalStatus !== "RECONCILIATION_PENDING")
      ) {
        openException({
          exceptionCode: "RECONCILIATION_FAILED",
          reason: `Cannot reconcile Advertising transaction in status ${tx.internalStatus} (verification=${tx.verificationAuthority})`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          openedAt: nowIso
        });
        tx.internalStatus = "RECONCILIATION_FAILED";
        tx.reconciliationStatus = "RECONCILIATION_FAILED";
        throw new Error(`RECONCILIATION_FAILED: Transaction status is ${tx.internalStatus}`);
      }

      const inv = invoices.get(tx.invoiceId ?? "");
      if (!inv) {
        throw new Error("INVOICE_NOT_FOUND");
      }

      if (!(PAYABLE_INVOICE_STATUSES as readonly string[]).includes(inv.status)) {
        openException({
          exceptionCode: "UNPAYABLE_INVOICE",
          reason: `Cannot reconcile payment against invoice ${inv.invoiceNumber} in status ${inv.status}`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          providerReference: tx.providerReference,
          details: { invoiceId: inv.id, invoiceStatus: inv.status },
          openedAt: nowIso
        });
        tx.internalStatus = "RECONCILIATION_FAILED";
        tx.reconciliationStatus = "RECONCILIATION_FAILED";
        throw new Error(`UNPAYABLE_INVOICE: Invoice status ${inv.status} cannot be reconciled`);
      }

      if (tx.currency !== inv.currency) {
        openException({
          exceptionCode: "CURRENCY_MISMATCH",
          reason: `Transaction currency ${tx.currency} does not match invoice currency ${inv.currency}`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          openedAt: nowIso
        });
        tx.internalStatus = "CURRENCY_MISMATCH";
        tx.reconciliationStatus = "RECONCILIATION_FAILED";
        throw new Error("CURRENCY_MISMATCH");
      }

      if (!tx.reportedAmount || tx.reportedAmount <= 0 || tx.reportedAmount > inv.balanceDue) {
        openException({
          exceptionCode: "AMOUNT_MISMATCH",
          reason: `Reported amount ${String(tx.reportedAmount)} invalid or exceeds invoice balance due ${inv.balanceDue}`,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          openedAt: nowIso
        });
        tx.internalStatus = "AMOUNT_MISMATCH";
        tx.reconciliationStatus = "RECONCILIATION_FAILED";
        throw new Error("AMOUNT_MISMATCH");
      }

      // Section 8 & 9: Separate business reconciliation from accounting reconciliation
      let accountingStatus: PaymentAccountingStatus = "PENDING_ACCOUNTANT_AUTHORITY";
      let clearingJournalId: string | null = null;
      const paymentNumber = `PAY-2026-${String(financePayments.length + 1).padStart(4, "0")}`;

      if (clearingConfig.accountantApproved && clearingConfig.providerClearingAccountCode) {
        const jrnId = nextId("jrn");
        clearingJournalId = jrnId;
        accountingStatus = "POSTED";
        journals.push({
          id: jrnId,
          entryNumber: `JRN-2026-${String(journals.length + 1).padStart(4, "0")}`,
          source: "payment",
          sourceId: tx.id,
          currency: tx.currency,
          memo: `Paynow Provider Clearing Receipt: ${paymentNumber}`,
          lines: [
            {
              accountCode: clearingConfig.providerClearingAccountCode,
              debit: tx.reportedAmount,
              credit: 0,
              description: `DR Provider Clearing (${tx.merchantReference})`
            },
            {
              accountCode: clearingConfig.accountsReceivableAccountCode,
              debit: 0,
              credit: tx.reportedAmount,
              description: `CR Accounts Receivable (${inv.invoiceNumber})`
            }
          ]
        });
      }

      const paymentIdem = `paynow-tx-${tx.id}`;
      const payment: FinancePaymentRecord = {
        id: nextId("pay"),
        paymentNumber,
        customerId: inv.customerId,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: tx.reportedAmount,
        currency: tx.currency,
        paymentDate: nowIso.slice(0, 10),
        method: "paynow",
        providerChannel: tx.paymentChannel,
        providerReference: tx.providerReference ?? tx.merchantReference,
        merchantReference: tx.merchantReference,
        transactionId: tx.id,
        businessReconciliation: "COMPLETE",
        accountingStatus,
        clearingJournalId,
        idempotencyKey: paymentIdem,
        receivedBy: actorStaffId,
        createdAt: nowIso
      };

      financePayments.push(payment);
      financePaymentsByIdempotency.set(paymentIdem, payment);
      financePaymentsByTxId.set(tx.id, payment);

      const prevInvoiceStatus = inv.status;
      const prevBalanceDue = inv.balanceDue;
      inv.amountPaid = Number((inv.amountPaid + tx.reportedAmount).toFixed(2));
      inv.balanceDue = Number((inv.total - inv.amountPaid).toFixed(2));
      inv.status = inv.balanceDue === 0 ? "paid" : "partially_paid";

      tx.internalStatus = "RECONCILED";
      tx.reconciliationStatus = "RECONCILED";
      tx.accountingStatus = accountingStatus;
      tx.reconciledAt = nowIso;
      tx.updatedAt = nowIso;

      recordAudit({
        actor: actorStaffId,
        actorType: "system",
        action: "payment.advertising.reconciled",
        source: "reconciliation_engine",
        transactionId: tx.id,
        businessObject: `finance_payments:${payment.id}`,
        beforeState: { invoiceStatus: prevInvoiceStatus, balanceDue: prevBalanceDue },
        afterState: {
          invoiceStatus: inv.status,
          balanceDue: inv.balanceDue,
          paymentNumber: payment.paymentNumber,
          method: payment.method,
          providerChannel: payment.providerChannel,
          businessReconciliation: payment.businessReconciliation,
          accountingStatus: payment.accountingStatus,
          clearingJournalId: payment.clearingJournalId
        },
        reason: "Verified Paynow invoice payment reconciled",
        providerReference: tx.providerReference,
        timestamp: nowIso
      });

      return {
        reconciled: true,
        replayed: false,
        businessReconciliation: payment.businessReconciliation,
        accountingStatus: payment.accountingStatus,
        clearingJournalId: payment.clearingJournalId,
        payment,
        invoiceStatus: inv.status,
        balanceDue: inv.balanceDue
      };
    },

    // Section 11: Preserve first-class bank_transfer method
    recordBankTransferPayment(input: {
      invoiceId: string;
      amount: number;
      currency: string;
      paymentDate: string;
      bankReference: string;
      idempotencyKey: string;
      actorStaffId: string;
    }): { payment: FinancePaymentRecord; replayed: boolean } {
      const existing = financePaymentsByIdempotency.get(input.idempotencyKey);
      if (existing) {
        return { payment: existing, replayed: true };
      }
      const inv = invoices.get(input.invoiceId);
      if (!inv) throw new Error("INVOICE_NOT_FOUND");
      if (!(PAYABLE_INVOICE_STATUSES as readonly string[]).includes(inv.status)) {
        throw new Error(`UNPAYABLE_INVOICE: Invoice status is ${inv.status}`);
      }
      if (input.currency !== inv.currency) throw new Error("CURRENCY_MISMATCH");
      if (input.amount <= 0 || input.amount > inv.balanceDue) throw new Error("AMOUNT_MISMATCH");

      const jrnId = nextId("jrn");
      const payment: FinancePaymentRecord = {
        id: nextId("pay"),
        paymentNumber: `PAY-2026-${String(financePayments.length + 1).padStart(4, "0")}`,
        customerId: inv.customerId,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(input.amount.toFixed(2)),
        currency: input.currency,
        paymentDate: input.paymentDate,
        method: "bank_transfer",
        providerChannel: null,
        providerReference: input.bankReference,
        merchantReference: null,
        transactionId: null,
        businessReconciliation: "COMPLETE",
        accountingStatus: "POSTED",
        clearingJournalId: jrnId,
        idempotencyKey: input.idempotencyKey,
        receivedBy: input.actorStaffId,
        createdAt: new Date().toISOString()
      };

      financePayments.push(payment);
      financePaymentsByIdempotency.set(input.idempotencyKey, payment);

      inv.amountPaid = Number((inv.amountPaid + payment.amount).toFixed(2));
      inv.balanceDue = Number((inv.total - inv.amountPaid).toFixed(2));
      inv.status = inv.balanceDue === 0 ? "paid" : "partially_paid";

      journals.push({
        id: jrnId,
        entryNumber: `JRN-2026-${String(journals.length + 1).padStart(4, "0")}`,
        source: "payment",
        sourceId: payment.id,
        currency: payment.currency,
        memo: `Bank Transfer Payment: ${payment.paymentNumber}`,
        lines: [
          { accountCode: "1000", debit: payment.amount, credit: 0, description: "DR Cash & Bank" },
          { accountCode: "1200", debit: 0, credit: payment.amount, description: "CR Accounts Receivable" }
        ]
      });

      return { payment, replayed: false };
    },

    // Section 13 & 14: Provider Settlement & Fee Allocation
    recordProviderSettlement(input: {
      settlementReference: string;
      settlementDate: string;
      currency: string;
      grossAmount: number;
      feeAmount: number;
      netAmount: number;
      bankDepositAmount?: number | null;
      bankReference?: string | null;
      lines: Array<{
        transactionId: string;
        grossAmount: number;
        feeAmount: number;
        netAmount: number;
      }>;
      actorStaffId: string;
      now?: string;
    }): {
      settlement: ProviderSettlementRecord;
      exception: PaymentExceptionRecord | null;
    } {
      const now = input.now ?? new Date().toISOString();
      const expectedNet = Number((input.grossAmount - input.feeAmount).toFixed(2));
      if (Number(input.netAmount.toFixed(2)) !== expectedNet) {
        throw new Error(`SETTLEMENT_MATH_ERROR: gross (${input.grossAmount}) - fee (${input.feeAmount}) != net (${input.netAmount})`);
      }

      for (const line of input.lines) {
        if (settledTransactionIds.has(line.transactionId)) {
          throw new Error(`DUPLICATE_SETTLEMENT_ALLOCATION: Transaction ${line.transactionId} is already allocated to a settlement`);
        }
      }

      const settlementId = nextId("stl");
      const lineRecords: ProviderSettlementLineRecord[] = [];
      let sumGross = 0;
      let sumFee = 0;
      let sumNet = 0;

      for (const line of input.lines) {
        const tx = transactions.get(line.transactionId);
        if (!tx) {
          throw new Error(`TRANSACTION_NOT_FOUND: ${line.transactionId}`);
        }
        if (tx.reconciliationStatus !== "RECONCILED") {
          throw new Error(`UNRECONCILED_TRANSACTION: Transaction ${tx.merchantReference} must be RECONCILED before settlement`);
        }
        const lineExpectedNet = Number((line.grossAmount - line.feeAmount).toFixed(2));
        if (Number(line.netAmount.toFixed(2)) !== lineExpectedNet) {
          throw new Error("SETTLEMENT_LINE_MATH_ERROR");
        }
        sumGross = Number((sumGross + line.grossAmount).toFixed(2));
        sumFee = Number((sumFee + line.feeAmount).toFixed(2));
        sumNet = Number((sumNet + line.netAmount).toFixed(2));

        lineRecords.push({
          id: nextId("stll"),
          settlementId,
          transactionId: tx.id,
          merchantReference: tx.merchantReference,
          providerReference: tx.providerReference,
          currency: tx.currency,
          grossAmount: line.grossAmount,
          feeAmount: line.feeAmount,
          netAmount: line.netAmount
        });
      }

      let status: ProviderSettlementRecord["status"] = "RECONCILED_TO_BANK";
      let raisedException: PaymentExceptionRecord | null = null;

      const headerMismatch =
        sumGross !== Number(input.grossAmount.toFixed(2)) ||
        sumFee !== Number(input.feeAmount.toFixed(2)) ||
        sumNet !== Number(input.netAmount.toFixed(2)) ||
        lineRecords.some((l) => {
          const tx = transactions.get(l.transactionId)!;
          return l.grossAmount !== tx.reportedAmount;
        });

      const bankMismatch =
        input.bankDepositAmount !== undefined &&
        input.bankDepositAmount !== null &&
        Number(input.bankDepositAmount.toFixed(2)) !== Number(input.netAmount.toFixed(2));

      if (headerMismatch) {
        status = "SETTLEMENT_MISMATCH";
        for (const l of lineRecords) {
          const tx = transactions.get(l.transactionId)!;
          tx.internalStatus = "SETTLEMENT_MISMATCH";
        }
        raisedException = openException({
          exceptionCode: "SETTLEMENT_MISMATCH",
          reason: `Settlement ${input.settlementReference} line totals (${sumGross}/${sumFee}/${sumNet}) mismatch header (${input.grossAmount}/${input.feeAmount}/${input.netAmount}) or transaction amounts`,
          settlementId,
          details: { sumGross, sumFee, sumNet, headerGross: input.grossAmount, headerFee: input.feeAmount, headerNet: input.netAmount },
          openedAt: now
        });
      } else if (bankMismatch) {
        status = "SETTLEMENT_MISMATCH";
        raisedException = openException({
          exceptionCode: "UNMATCHED_BANK_SETTLEMENT",
          reason: `Settlement ${input.settlementReference} net amount (${input.netAmount}) does not match bank deposit (${input.bankDepositAmount})`,
          settlementId,
          details: { netAmount: input.netAmount, bankDepositAmount: input.bankDepositAmount },
          openedAt: now
        });
      } else {
        for (const l of lineRecords) {
          settledTransactionIds.add(l.transactionId);
        }
      }

      let clearingJournalId: string | null = null;
      let accountingStatus: PaymentAccountingStatus = "PENDING_ACCOUNTANT_AUTHORITY";
      if (status === "RECONCILED_TO_BANK") {
        if (
          clearingConfig.accountantApproved &&
          clearingConfig.providerClearingAccountCode &&
          clearingConfig.providerFeeExpenseAccountCode
        ) {
          const jrnId = nextId("jrn");
          clearingJournalId = jrnId;
          accountingStatus = "POSTED";
          const jrnLines: Array<{ accountCode: string; debit: number; credit: number; description: string }> = [
            {
              accountCode: clearingConfig.bankSettlementAccountCode,
              debit: input.netAmount,
              credit: 0,
              description: `DR Bank Settlement (${input.settlementReference})`
            }
          ];
          if (input.feeAmount > 0) {
            jrnLines.push({
              accountCode: clearingConfig.providerFeeExpenseAccountCode,
              debit: input.feeAmount,
              credit: 0,
              description: `DR Provider Fees Expense (${input.settlementReference})`
            });
          }
          jrnLines.push({
            accountCode: clearingConfig.providerClearingAccountCode,
            debit: 0,
            credit: input.grossAmount,
            description: `CR Provider Clearing (${input.settlementReference})`
          });

          journals.push({
            id: jrnId,
            entryNumber: `JRN-2026-${String(journals.length + 1).padStart(4, "0")}`,
            source: "manual",
            sourceId: settlementId,
            currency: input.currency,
            memo: `Paynow Settlement to Bank: ${input.settlementReference}`,
            lines: jrnLines
          });
        }
      } else {
        accountingStatus = "POSTING_FAILED";
      }

      const settlement: ProviderSettlementRecord = {
        id: settlementId,
        settlementNumber: `STL-2026-${String(settlements.size + 1).padStart(4, "0")}`,
        provider: "paynow",
        settlementReference: input.settlementReference,
        settlementDate: input.settlementDate,
        currency: input.currency,
        grossAmount: Number(input.grossAmount.toFixed(2)),
        feeAmount: Number(input.feeAmount.toFixed(2)),
        netAmount: Number(input.netAmount.toFixed(2)),
        bankReference: input.bankReference ?? null,
        status,
        accountingStatus,
        lines: lineRecords,
        clearingJournalId,
        createdAt: now
      };

      settlements.set(settlement.id, settlement);

      recordAudit({
        actor: input.actorStaffId,
        actorType: "staff",
        action: `payment.settlement.${status.toLowerCase()}`,
        source: "settlement_engine",
        transactionId: lineRecords[0]?.transactionId ?? null,
        businessObject: `provider_settlements:${settlement.id}`,
        beforeState: null,
        afterState: {
          settlementReference: settlement.settlementReference,
          grossAmount: settlement.grossAmount,
          feeAmount: settlement.feeAmount,
          netAmount: settlement.netAmount,
          status: settlement.status,
          accountingStatus: settlement.accountingStatus
        },
        reason: `Settlement ${input.settlementReference} recorded`,
        timestamp: now
      });

      return { settlement, exception: raisedException };
    },

    // Section 15: Refund / Dispute Workflow (No Destructive Deletion)
    recordRefundOrDisputeTransition(input: {
      transactionId: string;
      reversalType: "REFUND" | "DISPUTE";
      workflowState: PaymentReversalRecord["workflowState"];
      amount?: number;
      reason: string;
      actorStaffId: string;
      now?: string;
    }): {
      reversal: PaymentReversalRecord;
      transaction: PaymentTransactionRecord;
      exception: PaymentExceptionRecord;
    } {
      if (!input.reason || input.reason.trim().length < 3) {
        throw new Error("REASON_REQUIRED: Refund or dispute transition requires a substantive reason");
      }
      const tx = transactions.get(input.transactionId);
      if (!tx) {
        throw new Error("TRANSACTION_NOT_FOUND");
      }
      const now = input.now ?? new Date().toISOString();
      const beforeStatus = tx.internalStatus;

      if (!canTransitionPaymentState(tx.internalStatus, input.workflowState)) {
        throw new Error(`INVALID_STATE_TRANSITION: Cannot transition from ${tx.internalStatus} to ${input.workflowState}`);
      }

      tx.internalStatus = input.workflowState;
      if (input.workflowState === "REFUND_CONFIRMED" || input.workflowState === "REVERSAL_REQUIRED") {
        tx.reconciliationStatus = "REVERSED";
        tx.accountingStatus = "REVERSED";
      }
      tx.updatedAt = now;

      const rev: PaymentReversalRecord = {
        id: nextId("rev"),
        transactionId: tx.id,
        merchantReference: tx.merchantReference,
        reversalType: input.reversalType,
        workflowState: input.workflowState,
        amount: Number((input.amount ?? tx.reportedAmount ?? tx.expectedAmount).toFixed(2)),
        currency: tx.currency,
        reason: input.reason.trim(),
        providerReference: tx.providerReference,
        entitlementAction: "PENDING_OWNER_POLICY",
        accountingAction: "PENDING_ACCOUNTANT_POLICY",
        openedAt: now,
        resolvedAt: null,
        resolvedBy: null,
        resolutionNote: null
      };
      reversals.push(rev);

      const excCode: PaymentExceptionCode =
        input.reversalType === "REFUND" ? "REFUND_REVIEW" : "DISPUTE_REVIEW";
      const exc = openException({
        exceptionCode: excCode,
        reason: `${input.reversalType} (${input.workflowState}): ${input.reason.trim()}`,
        transactionId: tx.id,
        merchantReference: tx.merchantReference,
        providerReference: tx.providerReference,
        details: { workflowState: input.workflowState, entitlementAction: rev.entitlementAction, accountingAction: rev.accountingAction },
        openedAt: now
      });

      recordAudit({
        actor: input.actorStaffId,
        actorType: "staff",
        action: `payment.${input.reversalType.toLowerCase()}.${input.workflowState.toLowerCase()}`,
        source: "manual_intervention",
        transactionId: tx.id,
        businessObject: `payment_reversals:${rev.id}`,
        beforeState: { internalStatus: beforeStatus },
        afterState: {
          internalStatus: tx.internalStatus,
          reconciliationStatus: tx.reconciliationStatus,
          accountingStatus: tx.accountingStatus,
          workflowState: rev.workflowState
        },
        reason: input.reason.trim(),
        providerReference: tx.providerReference,
        timestamp: now
      });

      return { reversal: rev, transaction: { ...tx }, exception: exc };
    },

    deleteTransaction(_transactionId: string): never {
      throw new Error("DESTRUCTIVE_PAYMENT_DELETION_PROHIBITED: Original payments and transactions must never be deleted");
    },

    // Section 23: Business Receipt Model
    getBusinessReceipt(transactionId: string): BusinessReceiptRecord {
      const tx = transactions.get(transactionId);
      if (!tx) {
        throw new Error("TRANSACTION_NOT_FOUND");
      }
      if (tx.purpose === "PROVIDER_CONNECTIVITY_TEST") {
        throw new Error("RECEIPT_FORBIDDEN: Connectivity test transactions never generate business receipts");
      }
      if (
        tx.verificationAuthority === "NO_VERIFICATION_AUTHORITY" ||
        (tx.internalStatus !== "PAYMENT_VERIFIED" &&
          tx.internalStatus !== "RECONCILIATION_PENDING" &&
          tx.internalStatus !== "RECONCILED")
      ) {
        throw new Error(`RECEIPT_UNAVAILABLE_UNVERIFIED: Cannot generate receipt in status ${tx.internalStatus}`);
      }

      if (tx.purpose === "PREMIUM_SUBSCRIPTION") {
        const sub = subscribers.get(tx.subscriberId ?? "");
        return {
          healthtimesReference: tx.merchantReference,
          merchantReference: tx.merchantReference,
          businessPurpose: tx.purpose,
          customerOrSubscriberId: tx.subscriberId ?? "",
          customerOrSubscriberName: sub?.displayName ?? sub?.email ?? "Subscriber",
          amount: tx.reportedAmount ?? tx.expectedAmount,
          currency: tx.currency,
          paymentDate: (tx.confirmedAt ?? tx.updatedAt).slice(0, 10),
          paymentMethod: tx.provider,
          paymentChannel: tx.paymentChannel,
          providerReference: tx.providerReference,
          invoiceOrPlanReference: tx.planKey ?? CANONICAL_PREMIUM_PLAN.plan_key,
          internalStatus: tx.internalStatus,
          reconciliationStatus: tx.reconciliationStatus,
          accountingStatus: tx.accountingStatus
        };
      }

      const inv = invoices.get(tx.invoiceId ?? "")!;
      const pay = financePaymentsByTxId.get(tx.id);
      return {
        healthtimesReference: pay?.paymentNumber ?? tx.merchantReference,
        merchantReference: tx.merchantReference,
        businessPurpose: tx.purpose,
        customerOrSubscriberId: inv.customerId,
        customerOrSubscriberName: inv.customerName,
        amount: tx.reportedAmount ?? tx.expectedAmount,
        currency: tx.currency,
        paymentDate: (tx.confirmedAt ?? tx.updatedAt).slice(0, 10),
        paymentMethod: tx.provider,
        paymentChannel: tx.paymentChannel,
        providerReference: tx.providerReference,
        invoiceOrPlanReference: inv.invoiceNumber,
        internalStatus: tx.internalStatus,
        reconciliationStatus: tx.reconciliationStatus,
        accountingStatus: tx.accountingStatus
      };
    },

    // Section 11 & 18: Finance Transparency (distinguishing business_reconciled vs accounting states)
    getFinanceTransparency(currency: string = "USD"): FinanceTransparencySnapshot {
      let accountsReceivable = 0;
      for (const inv of invoices.values()) {
        if (
          inv.currency === currency &&
          (PAYABLE_INVOICE_STATUSES as readonly string[]).includes(inv.status) &&
          inv.balanceDue > 0
        ) {
          accountsReceivable = Number((accountsReceivable + inv.balanceDue).toFixed(2));
        }
      }

      let verifiedProviderPaymentsPendingReconciliation = 0;
      let businessReconciled = 0;
      let accountingPendingAuthority = 0;
      let accountingPendingPosting = 0;
      let accountingPosted = 0;
      let providerClearingPendingSettlement = 0;

      for (const tx of transactions.values()) {
        if (tx.currency !== currency || tx.purpose === "PROVIDER_CONNECTIVITY_TEST") continue;
        const amt = tx.reportedAmount ?? tx.expectedAmount;
        if (
          (tx.internalStatus === "PAYMENT_VERIFIED" || tx.internalStatus === "RECONCILIATION_PENDING") &&
          tx.reconciliationStatus === "PENDING"
        ) {
          verifiedProviderPaymentsPendingReconciliation = Number(
            (verifiedProviderPaymentsPendingReconciliation + amt).toFixed(2)
          );
        }
        if (tx.reconciliationStatus === "RECONCILED") {
          businessReconciled = Number((businessReconciled + (tx.reportedAmount ?? 0)).toFixed(2));
          if (tx.accountingStatus === "PENDING_ACCOUNTANT_AUTHORITY") {
            accountingPendingAuthority = Number((accountingPendingAuthority + (tx.reportedAmount ?? 0)).toFixed(2));
          } else if (tx.accountingStatus === "PENDING_POSTING") {
            accountingPendingPosting = Number((accountingPendingPosting + (tx.reportedAmount ?? 0)).toFixed(2));
          } else if (tx.accountingStatus === "POSTED") {
            accountingPosted = Number((accountingPosted + (tx.reportedAmount ?? 0)).toFixed(2));
          }
          if (tx.provider === "paynow" && !settledTransactionIds.has(tx.id)) {
            providerClearingPendingSettlement = Number(
              (providerClearingPendingSettlement + (tx.reportedAmount ?? 0)).toFixed(2)
            );
          }
        }
      }

      let bankSettlements = 0;
      let providerFees = 0;
      for (const stl of settlements.values()) {
        if (stl.currency !== currency) continue;
        if (stl.status === "RECONCILED_TO_BANK") {
          bankSettlements = Number((bankSettlements + stl.netAmount).toFixed(2));
          providerFees = Number((providerFees + stl.feeAmount).toFixed(2));
        } else if (stl.status === "MATCHED") {
          providerFees = Number((providerFees + stl.feeAmount).toFixed(2));
        }
      }

      let refundsAndDisputes = 0;
      for (const rev of reversals) {
        if (rev.currency === currency) {
          refundsAndDisputes = Number((refundsAndDisputes + rev.amount).toFixed(2));
        }
      }

      const openPaymentExceptionsCount = exceptions.filter(
        (e) => e.status === "OPEN" || e.status === "IN_REVIEW"
      ).length;

      return {
        currency,
        accountsReceivable,
        verifiedProviderPaymentsPendingReconciliation,
        businessReconciled,
        accountingPendingAuthority,
        accountingPendingPosting,
        accountingPosted,
        providerClearingPendingSettlement,
        bankSettled: bankSettlements,
        bankSettlements,
        providerFees,
        refundsAndDisputes,
        openPaymentExceptionsCount
      };
    },

    // Section 19: Commercial Transparency (separate revenue classifications)
    getCommercialRevenueTransparency(currency: string = "USD"): CommercialRevenueTransparencySnapshot {
      let premiumRevenue = 0;
      for (const rec of premiumReconciliations.values()) {
        if (rec.currency === currency) {
          premiumRevenue = Number((premiumRevenue + rec.amount).toFixed(2));
        }
      }

      let directAdvertisingRevenue = 0;
      for (const pay of financePayments) {
        if (pay.currency === currency) {
          directAdvertisingRevenue = Number((directAdvertisingRevenue + pay.amount).toFixed(2));
        }
      }

      return {
        currency,
        premiumRevenue,
        directAdvertisingRevenue,
        adsenseRevenue: currency === "USD" ? adsenseRevenueTotal : 0,
        otherCommercialRevenue: currency === "USD" ? otherCommercialRevenueTotal : 0
      };
    },

    // Section 24: Daily Finance Control
    runDailyClearingControl(input: {
      controlDate: string;
      currency?: string;
      openingProviderClearing: number;
      reportedActualClosingClearing?: number;
    }): DailyClearingControlSnapshot {
      const currency = input.currency ?? "USD";
      let verifiedProviderCollections = 0;
      for (const tx of transactions.values()) {
        if (
          tx.provider === "paynow" &&
          tx.currency === currency &&
          tx.purpose !== "PROVIDER_CONNECTIVITY_TEST" &&
          (tx.internalStatus === "PAYMENT_VERIFIED" ||
            tx.internalStatus === "RECONCILIATION_PENDING" ||
            tx.internalStatus === "RECONCILED") &&
          (tx.confirmedAt ?? "").slice(0, 10) === input.controlDate
        ) {
          verifiedProviderCollections = Number((verifiedProviderCollections + (tx.reportedAmount ?? 0)).toFixed(2));
        }
      }

      let settlementsToBank = 0;
      let providerFees = 0;
      for (const stl of settlements.values()) {
        if (
          stl.provider === "paynow" &&
          stl.currency === currency &&
          stl.status === "RECONCILED_TO_BANK" &&
          stl.settlementDate === input.controlDate
        ) {
          settlementsToBank = Number((settlementsToBank + stl.netAmount).toFixed(2));
          providerFees = Number((providerFees + stl.feeAmount).toFixed(2));
        }
      }

      let refundsAndReversals = 0;
      for (const rev of reversals) {
        if (
          rev.currency === currency &&
          (rev.workflowState === "REFUND_CONFIRMED" || rev.workflowState === "REVERSAL_REQUIRED") &&
          rev.openedAt.slice(0, 10) === input.controlDate
        ) {
          refundsAndReversals = Number((refundsAndReversals + rev.amount).toFixed(2));
        }
      }

      const closingProviderClearing = Number(
        (
          input.openingProviderClearing +
          verifiedProviderCollections -
          settlementsToBank -
          providerFees -
          refundsAndReversals
        ).toFixed(2)
      );

      const actualClosing =
        input.reportedActualClosingClearing !== undefined
          ? Number(input.reportedActualClosingClearing.toFixed(2))
          : closingProviderClearing;

      const unexplainedDifference = Number((actualClosing - closingProviderClearing).toFixed(2));
      let status: "BALANCED" | "EXCEPTION_RAISED" = "BALANCED";

      if (Math.abs(unexplainedDifference) > 0.001) {
        status = "EXCEPTION_RAISED";
        openException({
          exceptionCode: "SETTLEMENT_MISMATCH",
          reason: `Daily clearing control variance of ${unexplainedDifference} ${currency} on ${input.controlDate}`,
          details: {
            controlDate: input.controlDate,
            expectedClosing: closingProviderClearing,
            actualClosing,
            unexplainedDifference
          }
        });
      }

      return {
        controlDate: input.controlDate,
        currency,
        openingProviderClearing: input.openingProviderClearing,
        verifiedProviderCollections,
        settlementsToBank,
        providerFees,
        refundsAndReversals,
        closingProviderClearing,
        reportedActualClosingClearing: actualClosing,
        unexplainedDifference,
        status
      };
    },

    // Section 25: Month-End Control
    getMonthEndControl(input: {
      periodStart: string;
      periodEnd: string;
      currency?: string;
    }): MonthEndControlSnapshot {
      const currency = input.currency ?? "USD";
      const transparency = this.getFinanceTransparency(currency);

      let providerCollections = 0;
      for (const tx of transactions.values()) {
        const d = (tx.confirmedAt ?? "").slice(0, 10);
        if (
          tx.provider === "paynow" &&
          tx.currency === currency &&
          tx.purpose !== "PROVIDER_CONNECTIVITY_TEST" &&
          (tx.internalStatus === "PAYMENT_VERIFIED" ||
            tx.internalStatus === "RECONCILIATION_PENDING" ||
            tx.internalStatus === "RECONCILED") &&
          d >= input.periodStart &&
          d <= input.periodEnd
        ) {
          providerCollections = Number((providerCollections + (tx.reportedAmount ?? 0)).toFixed(2));
        }
      }

      let providerSettlements = 0;
      let providerFees = 0;
      for (const stl of settlements.values()) {
        if (
          stl.provider === "paynow" &&
          stl.currency === currency &&
          stl.status === "RECONCILED_TO_BANK" &&
          stl.settlementDate >= input.periodStart &&
          stl.settlementDate <= input.periodEnd
        ) {
          providerSettlements = Number((providerSettlements + stl.netAmount).toFixed(2));
          providerFees = Number((providerFees + stl.feeAmount).toFixed(2));
        }
      }

      let refunds = 0;
      let disputes = 0;
      for (const rev of reversals) {
        const d = rev.openedAt.slice(0, 10);
        if (rev.currency === currency && d >= input.periodStart && d <= input.periodEnd) {
          if (rev.reversalType === "REFUND") refunds = Number((refunds + rev.amount).toFixed(2));
          if (rev.reversalType === "DISPUTE") disputes = Number((disputes + rev.amount).toFixed(2));
        }
      }

      let premiumReceipts = 0;
      for (const rec of premiumReconciliations.values()) {
        const d = rec.reconciledAt.slice(0, 10);
        if (rec.currency === currency && d >= input.periodStart && d <= input.periodEnd) {
          premiumReceipts = Number((premiumReceipts + rec.amount).toFixed(2));
        }
      }

      let advertisingReceipts = 0;
      let bankTransferReceipts = 0;
      for (const pay of financePayments) {
        if (pay.currency === currency && pay.paymentDate >= input.periodStart && pay.paymentDate <= input.periodEnd) {
          if (pay.method === "paynow") {
            advertisingReceipts = Number((advertisingReceipts + pay.amount).toFixed(2));
          } else if (pay.method === "bank_transfer") {
            bankTransferReceipts = Number((bankTransferReceipts + pay.amount).toFixed(2));
          }
        }
      }

      return {
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        currency,
        providerCollections,
        providerSettlements,
        providerFees,
        outstandingClearing: transparency.providerClearingPendingSettlement,
        outstandingAr: transparency.accountsReceivable,
        refunds,
        disputes,
        premiumReceipts,
        advertisingReceipts,
        bankTransferReceipts
      };
    },

    getExceptions(): PaymentExceptionRecord[] {
      return [...exceptions];
    },

    getAuditLogs(): PaymentAuditEntry[] {
      return [...auditLogs];
    },

    getEntitlements(): SubscriberEntitlementRecord[] {
      return [...entitlements];
    },

    getFinancePayments(): FinancePaymentRecord[] {
      return [...financePayments];
    },

    getJournals() {
      return [...journals];
    },

    getProviderEvents(): ProviderWebhookEventRecord[] {
      return [...providerEvents.values()];
    }
  };
}
