import { createHash, timingSafeEqual } from "node:crypto";

// This endpoint is intentionally restricted to the approved TEST project.
const STAGING_ORIGIN = "https://bzuvntbkevvuhfhqhkua.supabase.co";
const TRUSTED_HOSTS = new Set(["www.paynow.co.zw", "paynow.co.zw", "staging.paynow.co.zw"]);
const MAX_BYTES = 16_384;

function verifiedFields(raw: string, key: string): Record<string, string> {
  if (new TextEncoder().encode(raw).length > MAX_BYTES || /%(?![\da-f]{2})/i.test(raw)) throw new Error("INVALID_FORM");
  const entries = [...new URLSearchParams(raw).entries()];
  const fields: Record<string, string> = Object.create(null);
  for (const [name, value] of entries) {
    const normalized = name.toLowerCase();
    if (!/^[a-z][a-z0-9]*$/.test(normalized) || Object.hasOwn(fields, normalized)) throw new Error("INVALID_FORM");
    fields[normalized] = value;
  }
  if (!/^[a-f0-9]{128}$/i.test(fields.hash || "")) throw new Error("INVALID_HASH");
  const expected = createHash("sha512").update(entries.filter(([name]) => name.toLowerCase() !== "hash").map(([, value]) => value).join("") + key, "utf8").digest();
  const supplied = Buffer.from(fields.hash, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("INVALID_HASH");
  return fields;
}

function trustedPollUrl(raw: string): string {
  if (!raw || raw.length > 2048 || /[\\\u0000-\u001f]/.test(raw)) throw new Error("INVALID_POLL_URL");
  const url = new URL(raw);
  if (url.protocol !== "https:" || !TRUSTED_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password ||
      (url.port && url.port !== "443") || url.hash || !/^\/interface\/checkpayment\/?$/i.test(url.pathname) ||
      !/^[\da-f]{8}-[\da-f]{4}-[1-5][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(url.searchParams.get("guid") || "") ||
      [...url.searchParams.keys()].length !== 1) throw new Error("INVALID_POLL_URL");
  return url.toString();
}

function reply(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

type Options = { key: string; supabaseUrl: string; serviceKey: string; fetcher?: typeof fetch };

export async function handlePaynowTestCallback(request: Request, options: Options): Promise<Response> {
  if (request.method !== "POST") return reply(405, { error: "METHOD_NOT_ALLOWED" });
  if (options.supabaseUrl.replace(/\/$/, "") !== STAGING_ORIGIN || options.key.length < 32 || options.serviceKey.length < 20) {
    return reply(503, { error: "CONFIGURATION_REQUIRED" });
  }
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
    pollUrl = trustedPollUrl(callback.pollurl);
    if (!/^HT-(PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$/.test(callback.reference || "") ||
        !callback.paynowreference || !/^\d+\.\d{2}$/.test(callback.amount || "") || !callback.status) throw new Error("INVALID_FIELDS");
  } catch { return reply(400, { error: "INVALID_PROVIDER_MESSAGE" }); }
  const fetcher = options.fetcher || fetch;
  try {
    const response = await fetcher(pollUrl, { method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error("POLL_FAILED");
    const polled = verifiedFields(await response.text(), options.key);
    trustedPollUrl(polled.pollurl);
    for (const field of ["reference", "paynowreference", "amount", "status", "pollurl"]) {
      if (callback[field] !== polled[field]) throw new Error("POLL_MISMATCH");
    }
    const eventId = createHash("sha256").update(raw).digest("hex");
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const res = await fetcher(`${STAGING_ORIGIN}/rest/v1/rpc/${name}`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
        headers: { apikey: options.serviceKey, Authorization: `Bearer ${options.serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(args)
      });
      if (!res.ok) throw new Error("AUTHORITY_FAILED");
      return await res.json();
    };
    const result = await rpc("payment_record_paynow_status", {
      p_merchant_reference: callback.reference, p_provider_reference: callback.paynowreference,
      p_amount: callback.amount, p_currency: "USD", p_provider_status: callback.status,
      p_poll_url: callback.pollurl, p_event_id: eventId, p_payload_hash: eventId,
      p_metadata: { source: "paynow_callback_confirmed_by_poll", payment_channel: callback.paymentchannel || null, poll_http_status: response.status }
    });
    if (result?.accepted === true && result?.purpose === "PREMIUM_SUBSCRIPTION" &&
        ["PAYMENT_VERIFIED", "RECONCILIATION_PENDING", "RECONCILED"].includes(result.internal_status)) {
      await rpc("payment_reconcile_premium_transaction", { p_transaction_id: result.transaction_id });
    }
    return reply(200, { received: true, accepted: result?.accepted === true, duplicate: result?.duplicate === true });
  } catch { return reply(503, { error: "PROVIDER_VERIFICATION_FAILED" }); }
}

if (typeof Deno !== "undefined") {
  Deno.serve((req: Request) => handlePaynowTestCallback(req, {
    key: Deno.env.get("PAYNOW_INTEGRATION_KEY") || "",
    supabaseUrl: Deno.env.get("SUPABASE_URL") || "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  }));
}
