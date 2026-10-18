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
  whatsappSystemAccessToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappWabaId?: string;
  whatsappGraphApiVersion?: string;
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
    // Standardized secret names (HT-NR-CLOSE-R1 canonical secret contract)
    const whatsappSystemAccessToken =
      options.whatsappSystemAccessToken ||
      envLookup("WHATSAPP_SYSTEM_ACCESS_TOKEN") ||
      envLookup("WHATSAPP_API_TOKEN"); // Backward compatibility during transition
    const whatsappPhoneNumberId =
      options.whatsappPhoneNumberId || envLookup("WHATSAPP_PHONE_NUMBER_ID");
    const whatsappGraphApiVersion =
      options.whatsappGraphApiVersion ||
      envLookup("WHATSAPP_GRAPH_API_VERSION") ||
      "v20.0";
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
    if (!whatsappSystemAccessToken || !whatsappPhoneNumberId) {
      // Truthful unconfigured state: broadcast remains 'approved', transport is 'unconfigured'
      const { error: recordErr } = await admin.rpc(
        "newsroom_record_whatsapp_dispatch_result",
        {
          p_dispatch_id: dispatchId,
          p_status: "approved",
          p_transport_status: "unconfigured",
          p_recipient_count: 0,
          p_accepted_count: 0,
          p_rejected_count: 0,
          p_failure_reason:
            "WhatsApp Cloud API credentials (WHATSAPP_SYSTEM_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID) not configured in Staging",
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
        status: "approved",
        transport_status: "unconfigured",
        recipient_count: 0,
        accepted_count: 0,
        rejected_count: 0,
        delivered_count: 0,
        read_count: 0,
        failure_reason:
          "WhatsApp Cloud API credentials (WHATSAPP_SYSTEM_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID) not configured in Staging",
        dispatched_at: new Date().toISOString()
      });
    }

    // 8. Resolve consented recipients from private authority
    const { data: recipientRows, error: recipErr } = await admin.rpc(
      "newsroom_get_consented_whatsapp_recipients",
      { p_broadcast_type: broadcast.broadcast_type || "breaking_alert" }
    );

    if (recipErr) {
      return jsonResponse(500, { ok: false, error: `Failed to resolve recipients: ${recipErr.message}` });
    }

    const recipients: Array<{ recipient_id: string; phone: string; phone_hash: string }> =
      Array.isArray(recipientRows) ? recipientRows : [];

    if (recipients.length === 0) {
      // Zero consented recipients found: broadcast remains approved, dispatch unconfigured/ready
      await admin.rpc("newsroom_record_whatsapp_dispatch_result", {
        p_dispatch_id: dispatchId,
        p_status: "approved",
        p_transport_status: "unconfigured",
        p_recipient_count: 0,
        p_accepted_count: 0,
        p_rejected_count: 0,
        p_failure_reason: "Zero active consented WhatsApp audience endpoints found",
        p_provider_broadcast_id: null,
        p_provider_response_envelope: {
          configured: true,
          recipients: 0,
          note: "No consented subscribers currently enrolled in WhatsApp distribution"
        },
        p_messages: []
      });

      return jsonResponse(200, {
        ok: true,
        dispatch_id: dispatchId,
        broadcast_id: broadcastId.trim(),
        status: "approved",
        transport_status: "unconfigured",
        recipient_count: 0,
        accepted_count: 0,
        rejected_count: 0,
        delivered_count: 0,
        read_count: 0,
        failure_reason: "Zero active consented WhatsApp audience endpoints found",
        dispatched_at: new Date().toISOString()
      });
    }

    // 9. Execute real WhatsApp Cloud API dispatch to each consented recipient
    let acceptedCount = 0;
    let rejectedCount = 0;
    const messageReceipts: any[] = [];
    const providerEnvelopes: any[] = [];
    const whatsappUrl = `https://graph.facebook.com/${whatsappGraphApiVersion}/${whatsappPhoneNumberId}/messages`;

    for (const recip of recipients) {
      try {
        const payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recip.phone,
          type: "text",
          text: {
            preview_url: true,
            body: `*${broadcast.title}*\n\n${broadcast.body}`
          }
        };

        const res = await fetchFn(whatsappUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${whatsappSystemAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const providerData = await res.json().catch(() => ({}));
        providerEnvelopes.push(providerData);

        if (res.ok) {
          acceptedCount++;
          const providerMsgId = providerData?.messages?.[0]?.id || null;
          messageReceipts.push({
            provider_message_id: providerMsgId,
            recipient_identity_hash: recip.phone_hash,
            status: "message-accepted"
          });
        } else {
          rejectedCount++;
          messageReceipts.push({
            provider_message_id: null,
            recipient_identity_hash: recip.phone_hash,
            status: "message-rejected",
            error_code: String(res.status),
            error_message: JSON.stringify(providerData)
          });
        }
      } catch (err: any) {
        rejectedCount++;
        messageReceipts.push({
          provider_message_id: null,
          recipient_identity_hash: recip.phone_hash,
          status: "message-rejected",
          error_code: "NETWORK_ERROR",
          error_message: err?.message || "Network exception during provider call"
        });
      }
    }

    // 10. Distinct state machine evaluation
    // Broadcast status: 'sent' only if >= 1 outbound accepted; else remains 'approved'
    const finalBroadcastStatus = acceptedCount > 0 ? "sent" : "approved";
    const finalTransportStatus =
      acceptedCount > 0
        ? (rejectedCount > 0 ? "partially-accepted" : "provider-accepted")
        : "provider-rejected";
    const finalFailureReason =
      acceptedCount === 0
        ? `Provider rejected all submissions (${rejectedCount}/${recipients.length})`
        : (rejectedCount > 0 ? `Partial provider acceptance: ${acceptedCount} accepted, ${rejectedCount} rejected` : null);

    const { error: resultErr } = await admin.rpc("newsroom_record_whatsapp_dispatch_result", {
      p_dispatch_id: dispatchId,
      p_status: finalBroadcastStatus,
      p_transport_status: finalTransportStatus,
      p_recipient_count: recipients.length,
      p_accepted_count: acceptedCount,
      p_rejected_count: rejectedCount,
      p_failure_reason: finalFailureReason,
      p_provider_broadcast_id: null,
      p_provider_response_envelope: { submissions: providerEnvelopes },
      p_messages: messageReceipts
    });

    if (resultErr) {
      return jsonResponse(500, { ok: false, error: resultErr.message });
    }

    // 11. Return sanitized response to Studio (zero exposed raw phones)
    return jsonResponse(200, {
      ok: true,
      dispatch_id: dispatchId,
      broadcast_id: broadcastId.trim(),
      status: finalBroadcastStatus,
      transport_status: finalTransportStatus,
      recipient_count: recipients.length,
      accepted_count: acceptedCount,
      rejected_count: rejectedCount,
      delivered_count: 0,
      read_count: 0,
      failure_reason: finalFailureReason,
      dispatched_at: new Date().toISOString()
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
  Deno.serve((req: Request) => handleWhatsAppDispatchRequest(req));
}
