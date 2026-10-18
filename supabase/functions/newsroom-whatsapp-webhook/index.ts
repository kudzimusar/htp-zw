const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

async function resolveCreateClient(injected?: any) {
  if (injected) return injected;
  if (typeof Deno !== "undefined") {
    // @ts-ignore
    const mod = await import("npm:@supabase/supabase-js@2.57.4");
    return mod.createClient;
  }
  try {
    const mod = await import("@supabase/supabase-js");
    return mod.createClient;
  } catch {
    return () => ({});
  }
}

export async function verifyMetaSignature(
  signatureHeader: string | null,
  rawBody: string,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader || !appSecret) return false;
  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) return false;
  const providedHash = signatureHeader.slice(expectedPrefix.length).trim().toLowerCase();

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(appSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase();

    return computedHash === providedHash;
  } catch {
    return false;
  }
}

export interface WhatsAppWebhookOptions {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  whatsappWebhookVerifyToken?: string;
  whatsappAppSecret?: string;
  createClientFn?: any;
  adminClient?: any;
}

export async function handleWhatsAppWebhookRequest(
  req: Request,
  options: WhatsAppWebhookOptions = {}
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const envLookup = (key: string): string | undefined => {
    if (typeof Deno !== "undefined" && typeof (Deno as any).env?.get === "function") {
      return (Deno as any).env.get(key);
    }
    return process.env[key];
  };

  const webhookVerifyToken =
    options.whatsappWebhookVerifyToken ||
    envLookup("WHATSAPP_WEBHOOK_VERIFY_TOKEN") ||
    "";
  const appSecret =
    options.whatsappAppSecret ||
    envLookup("WHATSAPP_APP_SECRET") ||
    "";

  // 1. GET: Webhook Challenge Verification from Meta
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token && webhookVerifyToken && token === webhookVerifyToken) {
      return new Response(challenge || "", {
        status: 200,
        headers: { "content-type": "text/plain" }
      });
    }

    return new Response("Forbidden: Webhook challenge verification failed", { status: 403 });
  }

  // 2. POST: Event Ingestion with HMAC SHA-256 Signature Verification
  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed. GET or POST required." });
  }

  try {
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const rawBody = await req.text();

    // Verify cryptographic signature if appSecret is configured
    if (appSecret) {
      const isValid = await verifyMetaSignature(signatureHeader, rawBody, appSecret);
      if (!isValid) {
        return jsonResponse(401, {
          ok: false,
          error: "Unauthorized: Invalid or missing X-Hub-Signature-256"
        });
      }
    } else {
      // In staging without secret configured, reject unauthenticated mutations
      if (!signatureHeader) {
        return jsonResponse(401, {
          ok: false,
          error: "Unauthorized: Missing X-Hub-Signature-256 header"
        });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON webhook payload" });
    }

    const supabaseUrl = options.supabaseUrl || envLookup("SUPABASE_URL");
    const serviceRoleKey = options.serviceRoleKey || envLookup("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { ok: false, error: "Server database configuration missing" });
    }

    const createClient = options.adminClient
      ? null
      : await resolveCreateClient(options.createClientFn);

    const admin = options.adminClient || createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const results: any[] = [];
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const val = change?.value;
        const statuses = Array.isArray(val?.statuses) ? val.statuses : [];

        for (const st of statuses) {
          const providerMsgId = st?.id;
          const statusStr = st?.status; // 'delivered', 'read', 'failed'
          if (!providerMsgId || !statusStr) continue;

          const timestamp = st?.timestamp
            ? new Date(Number(st.timestamp) * 1000).toISOString()
            : new Date().toISOString();
          const eventId = `meta_${providerMsgId}_${statusStr}_${st?.timestamp || Date.now()}`;

          const { data: ingestResult, error: ingestError } = await admin.rpc(
            "newsroom_ingest_whatsapp_webhook_event",
            {
              p_event_id: eventId,
              p_provider_message_id: providerMsgId,
              p_status: statusStr,
              p_timestamp: timestamp,
              p_payload: st
            }
          );

          results.push({
            event_id: eventId,
            provider_message_id: providerMsgId,
            status: statusStr,
            result: ingestResult,
            error: ingestError?.message || null
          });
        }
      }
    }

    return jsonResponse(200, {
      ok: true,
      processed: results.length,
      events: results
    });
  } catch (err: any) {
    return jsonResponse(500, {
      ok: false,
      error: `Internal server error: ${err?.message || "Unknown error"}`
    });
  }
}

if (typeof Deno !== "undefined") {
  // @ts-ignore
  Deno.serve((req: Request) => handleWhatsAppWebhookRequest(req));
}
