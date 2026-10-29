import { createHash, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import "../_shared/paynow-protocol.js";

const createProtocol = (globalThis as any)[Symbol.for("healthtimes.paynow.protocol")];
const { verifyForm: verifiedFields, trustedUrl } = createProtocol({ createHash, timingSafeEqual, Buffer });

// This endpoint is intentionally restricted to the approved TEST project.
const STAGING_ORIGIN = "https://bzuvntbkevvuhfhqhkua.supabase.co";
const MAX_BYTES = 16_384;
const trustedPollUrl = (raw: string) => trustedUrl(raw, "poll");

function reply(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

type Options = { key: string; supabaseUrl: string; serviceKey: string; fetcher?: typeof fetch;
  makeHttp1Client?: () => { close: () => void } };

function amountCents(value: unknown): bigint | null {
  const match = /^(\d{1,16})(?:\.(\d{1,2}))?$/.exec(String(value));
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0')) : null;
}

// Inspect nested runtime causes in memory, but expose only fixed classifications.
export function classifyPollTransport(error: unknown): string {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  let current: any = error;
  for (let depth = 0; current && depth < 8 && !seen.has(current); depth++) {
    seen.add(current);
    if (typeof current === 'object') {
      for (const field of ['name', 'code', 'message']) {
        if (typeof current[field] === 'string') parts.push(current[field]);
      }
      current = current.cause;
    } else { parts.push(String(current)); break; }
  }
  const text = parts.join(' ');
  if (/certificate|cert_|unknownissuer|unknown issuer|tls alert|invalid peer/i.test(text)) return 'TLS_CERTIFICATE';
  if (/handshake|tls|ssl/i.test(text)) return 'TLS_NEGOTIATION';
  if (/enotfound|eai_again|dns|name resolution|lookup|resolve|not known/i.test(text)) return 'DNS';
  if (/timeout|timed ?out|aborterror|aborted/i.test(text)) return 'TIMEOUT';
  if (/econnrefused|connection refused/i.test(text)) return 'CONNECTION_REFUSED';
  if (/econnreset|connection reset|broken pipe/i.test(text)) return 'CONNECTION_RESET';
  if (/enetunreach|ehostunreach|network is unreachable|host is unreachable/i.test(text)) return 'NETWORK_UNREACHABLE';
  if (/connect|connection/i.test(text)) return 'CONNECTION_OTHER';
  return 'OTHER';
}

export async function handlePaynowTestCallback(request: Request, options: Options): Promise<Response> {
  if (request.method !== "POST") return reply(405, { error: "METHOD_NOT_ALLOWED" });
  if (!/^application\/x-www-form-urlencoded(?:\s*;|\s*$)/i.test(request.headers.get("content-type") || "")) {
    return reply(415, { error: "CONTENT_TYPE_INVALID" });
  }
  if (options.supabaseUrl.replace(/\/$/, "") !== STAGING_ORIGIN) return reply(503, { error: "STAGING_PROJECT_CONFIGURATION_REQUIRED" });
  if (options.key.length < 32) return reply(503, { error: "PAYNOW_KEY_CONFIGURATION_REQUIRED" });
  if (options.serviceKey.length < 20) return reply(503, { error: "DATABASE_CONFIGURATION_REQUIRED" });
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) return reply(413, { error: "BODY_TOO_LARGE" });
  let raw: string;
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); return reply(413, { error: "BODY_TOO_LARGE" }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { return reply(400, { error: "INVALID_FORM" }); }
  let callback: Record<string, string>;
  let pollUrl: string;
  try {
    callback = verifiedFields(raw, options.key);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const signatureFailure = code === "PAYNOW_HASH_MISMATCH" || code === "PAYNOW_HASH_MISSING_OR_INVALID";
    return reply(400, { error: signatureFailure ? "SIGNATURE_REJECTED" : "FORM_REJECTED", provider_signature_verified: false });
  }
  try {
    pollUrl = trustedPollUrl(callback.pollurl);
    if (!/^HT-(PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$/.test(callback.reference || "") ||
        !callback.paynowreference || !/^\d+\.\d{2}$/.test(callback.amount || "") || !callback.status) throw new Error("INVALID_FIELDS");
  } catch { return reply(400, { error: "TRANSACTION_FIELDS_REJECTED", provider_signature_verified: true }); }
  const fetcher = options.fetcher || fetch;
  const headers = { apikey: options.serviceKey, Authorization: `Bearer ${options.serviceKey}`, "Content-Type": "application/json" };
  let transaction: Record<string, unknown>;
  try {
    const lookupUrl = `${STAGING_ORIGIN}/rest/v1/payment_transactions?provider=eq.paynow&merchant_reference=eq.${encodeURIComponent(callback.reference)}&select=id,purpose,expected_amount,currency,poll_url,provider_reference,reconciliation_status,accounting_status&limit=2`;
    const lookup = await fetcher(lookupUrl, { headers, signal: AbortSignal.timeout(15_000), redirect: "error" });
    if (!lookup.ok) throw new Error("LOOKUP_FAILED");
    const rows = await lookup.json();
    if (!Array.isArray(rows) || rows.length !== 1) return reply(404, { error: "TRANSACTION_NOT_FOUND", provider_signature_verified: true, provider_transaction_matched: false });
    transaction = rows[0];
    if (transaction.poll_url !== callback.pollurl || (transaction.provider_reference && String(transaction.provider_reference) !== callback.paynowreference)) {
      return reply(409, { error: "TRANSACTION_MISMATCH", provider_signature_verified: true, provider_transaction_matched: false });
    }
  } catch { return reply(503, { error: "TRANSACTION_LOOKUP_FAILED", provider_signature_verified: true }); }
  if (amountCents(transaction.expected_amount) === null || amountCents(transaction.expected_amount) !== amountCents(callback.amount)) {
    return reply(409, { error: "AMOUNT_MISMATCH", provider_signature_verified: true, provider_transaction_matched: true, provider_amount_verified: false });
  }
  let response: Response;
  let polled: Record<string, string>;
  let pollTransport = "DEFAULT";
  let retryClient: { close: () => void } | undefined;
  const pollFailure = (error: string, httpStatus?: number) => reply(503, { error, poll_http_status: httpStatus,
    provider_signature_verified: true, provider_transaction_matched: true, provider_amount_verified: true, poll_verified: false });
  try {
    // Paynow requires a zero-length POST, including an explicit body. Some
    // runtimes otherwise omit Content-Length and receive HTTP 411.
    response = await fetcher(pollUrl, { method: "POST", body: "", redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    const category = classifyPollTransport(error);
    // A reset may happen during protocol negotiation. Compare HTTP/1.1 with
    // default negotiation without changing the destination or TLS validation.
    const createClient = options.makeHttp1Client ||
      (typeof Deno !== 'undefined' && typeof Deno.createHttpClient === 'function'
        ? () => Deno.createHttpClient({http1: true, http2: false}) : null);
    if (category !== 'CONNECTION_RESET' || !createClient) return reply(503, {
      error: "POLL_TRANSPORT_FAILED", transport_category: category, poll_transport: "DEFAULT",
      provider_signature_verified: true, provider_transaction_matched: true, provider_amount_verified: true, poll_verified: false });
    try {
      retryClient = createClient();
      response = await fetcher(pollUrl, { method: "POST", body: "", redirect: "error",
        signal: AbortSignal.timeout(15_000), client: retryClient } as RequestInit);
      pollTransport = "HTTP1_RETRY";
    } catch (retryError) {
      retryClient?.close();
      return reply(503, { error: "POLL_TRANSPORT_FAILED", transport_category: category,
        retry_transport: "HTTP1", retry_category: classifyPollTransport(retryError),
        provider_signature_verified: true, provider_transaction_matched: true, provider_amount_verified: true, poll_verified: false });
    }
  }
  if (!response.ok) { retryClient?.close(); return pollFailure("POLL_HTTP_FAILED", response.status); }
  try { polled = verifiedFields(await response.text(), options.key); }
  catch { return pollFailure("POLL_SIGNATURE_OR_FORM_REJECTED", response.status); }
  finally { retryClient?.close(); }
  try {
    trustedPollUrl(polled.pollurl);
    for (const field of ["reference", "paynowreference", "amount", "status", "pollurl", "currency"]) {
      if (callback[field] !== polled[field]) throw new Error("POLL_MISMATCH");
    }
  } catch { return pollFailure("POLL_TRANSACTION_MISMATCH", response.status); }
  const currency = String(callback.currency || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    // Record signed evidence only. This cannot grant entitlement or change a
    // transaction, and does not claim a payment verification authority.
    const semanticId = createHash("sha256").update(JSON.stringify([callback.reference, callback.paynowreference, callback.amount, callback.status, callback.pollurl])).digest("hex");
    const payloadHash = createHash("sha256").update(raw).digest("hex");
    try {
      const event = await fetcher(`${STAGING_ORIGIN}/rest/v1/provider_webhook_events?on_conflict=provider,provider_event_id`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
        headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify({ provider: "paynow", provider_event_id: semanticId, event_type: callback.status,
          signature_valid: true, payload_hash: payloadHash, payload: { source: "paynow_signed_status" },
          status: "ignored", error: "CURRENCY_UNVERIFIED", transaction_id: transaction.id,
          merchant_reference: callback.reference, provider_reference: callback.paynowreference,
          reported_amount: callback.amount, reported_currency: null, verification_authority: "NO_VERIFICATION_AUTHORITY",
          sanitized_metadata: { source: "paynow_callback_confirmed_by_poll", signature_verified: true,
            transaction_matched: true, amount_verified: true, poll_verified: true, currency_verified: false,
            reconciliation_eligible: false } })
      });
      if (!event.ok) throw new Error("EVENT_STORE_FAILED");
      const rows = await event.json();
      if (!Array.isArray(rows)) throw new Error("EVENT_STORE_FAILED");
      return reply(200, { received: true, accepted: false, duplicate: rows.length === 0,
        provider_signature_verified: true, provider_transaction_matched: true, provider_amount_verified: true,
        poll_verified: true, poll_transport: pollTransport, provider_currency_verified: false, reconciliation_eligible: false, event_stored: true });
    } catch { return reply(503, { error: "EVENT_STORAGE_FAILED", provider_signature_verified: true, provider_transaction_matched: true, provider_amount_verified: true, poll_verified: true, provider_currency_verified: false }); }
  }
  try {
    const eventId = createHash("sha256").update(raw).digest("hex");
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const res = await fetcher(`${STAGING_ORIGIN}/rest/v1/rpc/${name}`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
        headers,
        body: JSON.stringify(args)
      });
      if (!res.ok) throw new Error("AUTHORITY_FAILED");
      return await res.json();
    };
    const result = await rpc("payment_record_paynow_status", {
      p_merchant_reference: callback.reference, p_provider_reference: callback.paynowreference,
      p_amount: callback.amount, p_currency: currency, p_provider_status: callback.status,
      p_poll_url: callback.pollurl, p_event_id: eventId, p_payload_hash: eventId,
      p_metadata: { source: "paynow_callback_confirmed_by_poll", currency_source: "SIGNED_PROVIDER_FIELD", payment_channel: callback.paymentchannel || null, poll_http_status: response.status }
    });
    if (result?.accepted === true && result?.purpose === "PREMIUM_SUBSCRIPTION" &&
        ["PAYMENT_VERIFIED", "RECONCILIATION_PENDING", "RECONCILED"].includes(result.internal_status)) {
      await rpc("payment_reconcile_premium_transaction", { p_transaction_id: result.transaction_id });
    }
    return reply(200, { received: true, accepted: result?.accepted === true, duplicate: result?.duplicate === true,
      provider_signature_verified: true, provider_transaction_matched: true, provider_amount_verified: true,
      poll_verified: true, provider_currency_verified: currency === String(transaction.currency),
      reconciliation_eligible: result?.accepted === true && transaction.purpose !== "PROVIDER_CONNECTIVITY_TEST" });
  } catch { return reply(503, { error: "DATABASE_RECORDING_FAILED", provider_signature_verified: true, provider_transaction_matched: true, provider_amount_verified: true, poll_verified: true }); }
}

if (typeof Deno !== "undefined") {
  Deno.serve((req: Request) => handlePaynowTestCallback(req, {
    key: Deno.env.get("PAYNOW_INTEGRATION_KEY") || "",
    supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  }));
}
