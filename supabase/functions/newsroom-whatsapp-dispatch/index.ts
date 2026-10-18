const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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
    // In Deno runtime on Supabase
    // @ts-ignore
    const mod = await import("npm:@supabase/supabase-js@2.57.4");
    return mod.createClient;
  }
  // In Node.js environment
  try {
    const mod = await import("@supabase/supabase-js");
    return mod.createClient;
  } catch {
    return () => ({});
  }
}

export interface WhatsAppDispatchOptions {
  supabaseUrl?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string;
  fetchImpl?: typeof fetch;
  createClientFn?: any;
  userClient?: any;
  adminClient?: any;
}

export async function handleWhatsAppDispatchRequest(
  req: Request,
  options: WhatsAppDispatchOptions = {}
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed. POST required." });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse(401, { ok: false, error: "Authentication required" });
    }

    const envLookup = (key: string): string | undefined => {
      if (typeof Deno !== "undefined" && typeof (Deno as any).env?.get === "function") {
        return (Deno as any).env.get(key);
      }
      return process.env[key];
    };

    const supabaseUrl = options.supabaseUrl || envLookup("SUPABASE_URL");
    const anonKey = options.anonKey || envLookup("SUPABASE_ANON_KEY");
    const serviceRoleKey = options.serviceRoleKey || envLookup("SUPABASE_SERVICE_ROLE_KEY");
    const whatsappApiToken = options.whatsappApiToken || envLookup("WHATSAPP_API_TOKEN");
    const whatsappPhoneNumberId = options.whatsappPhoneNumberId || envLookup("WHATSAPP_PHONE_NUMBER_ID");
    const fetchFn = options.fetchImpl || fetch;

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { ok: false, error: "Server configuration missing" });
    }

    const createClient = (options.userClient && options.adminClient)
      ? null
      : await resolveCreateClient(options.createClientFn);

    // 1. Verify caller with user client
    const userClient = options.userClient || createClient(supabaseUrl, anonKey || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse(401, { ok: false, error: "Invalid or expired session token" });
    }

    // 2. Verify irreversible send authority: story.publish
    const { data: hasPublishCap, error: capError } = await userClient.rpc(
      "newsroom_has_capability",
      { p_capability: "story.publish" }
    );

    if (capError || !hasPublishCap) {
      return jsonResponse(403, {
        ok: false,
        error: "Forbidden: story.publish capability required for WhatsApp broadcast dispatch"
      });
    }

    // 3. Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const broadcastId = body?.broadcast_id;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!broadcastId || typeof broadcastId !== "string" || !uuidRegex.test(broadcastId.trim())) {
      return jsonResponse(400, { ok: false, error: "Invalid or missing broadcast_id UUID" });
    }

    const idempotencyKey =
      typeof body?.idempotency_key === "string" && body.idempotency_key.trim().length >= 8
        ? body.idempotency_key.trim()
        : `dispatch-wa-${broadcastId.trim()}`;

    // 4. Admin client with service_role authority
    const admin = options.adminClient || createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 5. Atomic single-dispatch preparation
    const { data: prepareData, error: prepareError } = await admin.rpc(
      "newsroom_prepare_whatsapp_dispatch",
      {
        p_broadcast_id: broadcastId.trim(),
        p_idempotency_key: idempotencyKey,
        p_actor_user_id: user.id
      }
    );

    if (prepareError) {
      const msg = prepareError.message || "Failed to prepare WhatsApp dispatch";
      if (msg.includes("must be in approved status")) {
        return jsonResponse(400, { ok: false, error: "Broadcast must be approved before dispatch" });
      }
      if (msg.includes("not found")) {
        return jsonResponse(404, { ok: false, error: "WhatsApp broadcast not found" });
      }
      if (msg.includes("collision")) {
        return jsonResponse(409, { ok: false, error: "Idempotency key collision from another broadcast" });
      }
      return jsonResponse(500, { ok: false, error: msg });
    }

    // 6. Handle idempotent replay
    if (prepareData.is_duplicate) {
      const { data: existingDispatch } = await admin.rpc(
        "newsroom_get_whatsapp_broadcast_dispatch",
        { p_broadcast_id: broadcastId.trim() }
      );

      return jsonResponse(200, {
        ok: true,
        is_duplicate: true,
        dispatch_id: prepareData.dispatch_id,
        broadcast_id: broadcastId.trim(),
        status: prepareData.status,
        transport_status: prepareData.status,
        recipient_count: existingDispatch?.recipient_count ?? 0,
        accepted_count: existingDispatch?.accepted_count ?? 0,
        rejected_count: existingDispatch?.rejected_count ?? 0,
        delivered_count: existingDispatch?.delivered_count ?? 0,
        read_count: existingDispatch?.read_count ?? 0,
        failure_reason: existingDispatch?.failure_reason ?? null,
        dispatched_at: existingDispatch?.dispatched_at ?? new Date().toISOString()
      });
    }

    const dispatchId = prepareData.dispatch_id;
    const broadcast = prepareData.broadcast;

    // 7. Check WhatsApp Cloud API configuration
    if (!whatsappApiToken || !whatsappPhoneNumberId) {
      // Graceful unconfigured state
      const { error: recordErr } = await admin.rpc(
        "newsroom_record_whatsapp_dispatch_result",
        {
          p_dispatch_id: dispatchId,
          p_status: "sent",
          p_transport_status: "unconfigured",
          p_recipient_count: 0,
          p_accepted_count: 0,
          p_rejected_count: 0,
          p_failure_reason:
            "WhatsApp Cloud API credentials (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID) not configured in Staging",
          p_provider_broadcast_id: null,
          p_provider_response_envelope: {
            configured: false,
            provider: "whatsapp_cloud_api",
            note: "Broadcast recorded in ledger; provider dispatch unconfigured"
          },
          p_messages: []
        }
      );

      if (recordErr) {
        return jsonResponse(500, { ok: false, error: recordErr.message });
      }

      return jsonResponse(200, {
        ok: true,
        dispatch_id: dispatchId,
        broadcast_id: broadcastId.trim(),
        status: "unconfigured",
        transport_status: "unconfigured",
        recipient_count: 0,
        accepted_count: 0,
        rejected_count: 0,
        delivered_count: 0,
        read_count: 0,
        failure_reason:
          "WhatsApp Cloud API credentials (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID) not configured in Staging",
        dispatched_at: new Date().toISOString()
      });
    }

    // 8. If configured: Execute real WhatsApp Cloud API dispatch
    try {
      const whatsappUrl = `https://graph.facebook.com/v19.0/${whatsappPhoneNumberId}/messages`;
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        type: "text",
        text: {
          preview_url: true,
          body: `*${broadcast.title}*\n\n${broadcast.body}`
        }
      };

      const res = await fetchFn(whatsappUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappApiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const providerData = await res.json().catch(() => ({}));

      if (!res.ok) {
        const failureReason = `WhatsApp Cloud API HTTP ${res.status}: ${JSON.stringify(providerData)}`;
        await admin.rpc("newsroom_record_whatsapp_dispatch_result", {
          p_dispatch_id: dispatchId,
          p_status: "sent",
          p_transport_status: "provider-rejected",
          p_recipient_count: 1,
          p_accepted_count: 0,
          p_rejected_count: 1,
          p_failure_reason: failureReason,
          p_provider_broadcast_id: null,
          p_provider_response_envelope: providerData,
          p_messages: []
        });

        return jsonResponse(200, {
          ok: true,
          dispatch_id: dispatchId,
          broadcast_id: broadcastId.trim(),
          status: "provider-rejected",
          transport_status: "provider-rejected",
          recipient_count: 1,
          accepted_count: 0,
          rejected_count: 1,
          delivered_count: 0,
          read_count: 0,
          failure_reason: failureReason,
          dispatched_at: new Date().toISOString()
        });
      }

      const providerMessageId = providerData?.messages?.[0]?.id || null;
      const messageReceipts = providerMessageId
        ? [
            {
              provider_message_id: providerMessageId,
              recipient_identity_hash: "channel_subscribers_digest",
              status: "message-accepted"
            }
          ]
        : [];

      await admin.rpc("newsroom_record_whatsapp_dispatch_result", {
        p_dispatch_id: dispatchId,
        p_status: "sent",
        p_transport_status: "provider-accepted",
        p_recipient_count: 1,
        p_accepted_count: 1,
        p_rejected_count: 0,
        p_failure_reason: null,
        p_provider_broadcast_id: providerMessageId,
        p_provider_response_envelope: providerData,
        p_messages: messageReceipts
      });

      return jsonResponse(200, {
        ok: true,
        dispatch_id: dispatchId,
        broadcast_id: broadcastId.trim(),
        status: "provider-accepted",
        transport_status: "provider-accepted",
        recipient_count: 1,
        accepted_count: 1,
        rejected_count: 0,
        delivered_count: 0,
        read_count: 0,
        failure_reason: null,
        dispatched_at: new Date().toISOString()
      });
    } catch (netErr: any) {
      const failureReason = `Network failure communicating with WhatsApp API: ${netErr.message || "Unknown"}`;
      await admin.rpc("newsroom_record_whatsapp_dispatch_result", {
        p_dispatch_id: dispatchId,
        p_status: "sent",
        p_transport_status: "delivery-failed",
        p_recipient_count: 1,
        p_accepted_count: 0,
        p_rejected_count: 1,
        p_failure_reason: failureReason,
        p_provider_broadcast_id: null,
        p_provider_response_envelope: { error: failureReason },
        p_messages: []
      });

      return jsonResponse(200, {
        ok: true,
        dispatch_id: dispatchId,
        broadcast_id: broadcastId.trim(),
        status: "delivery-failed",
        transport_status: "delivery-failed",
        recipient_count: 1,
        accepted_count: 0,
        rejected_count: 1,
        delivered_count: 0,
        read_count: 0,
        failure_reason: failureReason,
        dispatched_at: new Date().toISOString()
      });
    }
  } catch (err: any) {
    return jsonResponse(500, { ok: false, error: err.message || "Internal server error" });
  }
}

// Supabase Edge Runtime bootstrap
if (typeof Deno !== "undefined" && typeof (Deno as any).serve === "function") {
  (Deno as any).serve(async (req: Request) => {
    return handleWhatsAppDispatchRequest(req);
  });
}
