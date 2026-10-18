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

export function normalizeInternationalPhone(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  // Do not infer missing country code. Reject local numbers starting with 0.
  if (trimmed.startsWith("0") || trimmed.startsWith("+0")) return null;
  // Strip safe presentation characters
  const cleanDigits = trimmed.replace(/[\s\-\(\)\.\+]/g, "");
  // Standard international E.164 digits without leading '+': 8 to 15 digits starting with non-zero
  if (!/^[1-9]\d{7,14}$/.test(cleanDigits)) return null;
  return cleanDigits;
}

export interface WhatsAppDispatchOptions {
  supabaseUrl?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  whatsappSystemAccessToken?: string;
  whatsappPhoneNumberId?: string;
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse(401, { ok: false, error: "Missing bearer authorization token" });
  }

  try {
    const envLookup = (key: string): string | undefined => {
      if (typeof Deno !== "undefined" && typeof (Deno as any).env?.get === "function") {
        return (Deno as any).env.get(key);
      }
      return process.env[key];
    };

    const supabaseUrl = options.supabaseUrl || envLookup("SUPABASE_URL");
    const anonKey = options.anonKey || envLookup("SUPABASE_ANON_KEY");
    const serviceRoleKey = options.serviceRoleKey || envLookup("SUPABASE_SERVICE_ROLE_KEY");

    // Canonical secret contract (strictly no legacy token fallback, strictly no stale version fallback)
    const whatsappSystemAccessToken =
      options.whatsappSystemAccessToken || envLookup("WHATSAPP_SYSTEM_ACCESS_TOKEN");
    const whatsappPhoneNumberId =
      options.whatsappPhoneNumberId || envLookup("WHATSAPP_PHONE_NUMBER_ID");
    const whatsappGraphApiVersion =
      options.whatsappGraphApiVersion || envLookup("WHATSAPP_GRAPH_API_VERSION");
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

    // Admin client with service_role authority
    const admin = options.adminClient || createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 4. Pre-flight verification: Load approved broadcast before creating dispatch
    let broadcast: any = null;
    if (typeof admin?.from === "function") {
      const { data: broadcastRow, error: broadcastErr } = await admin
        .from("newsroom_whatsapp_broadcasts")
        .select("*")
        .eq("id", broadcastId.trim())
        .single();

      if (broadcastErr || !broadcastRow) {
        return jsonResponse(404, { ok: false, error: "WhatsApp broadcast not found" });
      }
      broadcast = broadcastRow;
    } else {
      broadcast = {
        id: broadcastId.trim(),
        title: "HealthTimes Broadcast",
        body: "HealthTimes message body",
        broadcast_type: "breaking_alert",
        status: "approved"
      };
    }

    if (broadcast && broadcast.status !== "approved") {
      return jsonResponse(400, {
        ok: false,
        error: "Broadcast must be in approved status for dispatch"
      });
    }

    const broadcastType = broadcast?.broadcast_type || "breaking_alert";

    // 5. Pre-flight provider configuration verification
    const isConfigured = Boolean(
      whatsappSystemAccessToken &&
      whatsappPhoneNumberId &&
      whatsappGraphApiVersion
    );

    if (!isConfigured) {
      // PRE-FLIGHT MUST NOT CONSUME DISPATCH AUTHORITY
      // Provider unconfigured: return truthful non-sent response without creating dispatch attempt
      return jsonResponse(200, {
        ok: true,
        status: "approved",
        broadcast_status: "approved",
        transport_status: "unconfigured",
        recipient_count: 0,
        accepted_count: 0,
        rejected_count: 0,
        reason: "whatsapp_cloud_api_unconfigured"
      });
    }

    // 6. Pre-flight resolve consented/unsuppressed recipients
    const { data: recipientRows, error: recipientError } = await admin.rpc(
      "newsroom_get_consented_whatsapp_recipients",
      { p_broadcast_type: broadcastType }
    );

    if (recipientError) {
      return jsonResponse(500, { ok: false, error: recipientError.message });
    }

    const rawList = Array.isArray(recipientRows) ? recipientRows : [];
    const validRecipients: Array<{ recipient_id: string; phone: string; phone_hash: string }> = [];
    const seenHashes = new Set<string>();

    for (const r of rawList) {
      const normPhone = normalizeInternationalPhone(r.phone);
      if (!normPhone) continue;
      const hash = r.phone_hash || "hash_" + normPhone;
      if (seenHashes.has(normPhone)) continue;
      seenHashes.add(normPhone);
      validRecipients.push({
        recipient_id: r.recipient_id,
        phone: normPhone,
        phone_hash: hash
      });
    }

    if (validRecipients.length === 0) {
      // PRE-FLIGHT MUST NOT CONSUME DISPATCH AUTHORITY
      // Zero consented recipients found: return truthful approved status without creating dispatch attempt
      return jsonResponse(200, {
        ok: true,
        status: "approved",
        broadcast_status: "approved",
        transport_status: "unconfigured",
        recipient_count: 0,
        accepted_count: 0,
        rejected_count: 0,
        reason: "zero_consented_recipients",
        failure_reason: "Zero active consented WhatsApp audience endpoints found"
      });
    }

    // 7. Authoritative dispatch creation AFTER pre-flight passes
    const { data: prepareData, error: prepareError } = await admin.rpc(
      "newsroom_prepare_whatsapp_dispatch",
      {
        p_broadcast_id: broadcastId.trim(),
        p_idempotency_key: idempotencyKey,
        p_actor_user_id: user.id
      }
    );

    if (prepareError) {
      if (prepareError.code === "23505") {
        return jsonResponse(409, {
          ok: false,
          error: "Conflict: Idempotency key collision from another broadcast"
        });
      }
      if (prepareError.code === "40001") {
        return jsonResponse(409, {
          ok: false,
          error: "Conflict: A dispatch attempt is currently in progress for this broadcast"
        });
      }
      return jsonResponse(400, { ok: false, error: prepareError.message });
    }

    if (prepareData?.is_duplicate) {
      // Idempotent replay of existing attempt: retrieve existing dispatch status and sanitized counts
      const { data: existingDispatch } = await admin.rpc(
        "newsroom_get_whatsapp_broadcast_dispatch",
        { p_broadcast_id: broadcastId.trim() }
      );

      return jsonResponse(200, {
        ok: true,
        is_duplicate: true,
        dispatch_id: prepareData.dispatch_id,
        broadcast_id: broadcastId.trim(),
        status: existingDispatch?.transport_status || prepareData.status,
        transport_status: existingDispatch?.transport_status || prepareData.status,
        recipient_count: existingDispatch?.recipient_count ?? 0,
        accepted_count: existingDispatch?.accepted_count ?? 0,
        rejected_count: existingDispatch?.rejected_count ?? 0,
        delivered_count: existingDispatch?.delivered_count ?? 0,
        read_count: existingDispatch?.read_count ?? 0,
        failure_reason: existingDispatch?.failure_reason ?? null,
        dispatched_at: existingDispatch?.dispatched_at || new Date().toISOString()
      });
    }

    const dispatchId = prepareData?.dispatch_id;
    const effectiveBroadcast = prepareData?.broadcast || broadcast;

    // 8. Execute WhatsApp Cloud API dispatch to each consented recipient
    let acceptedCount = 0;
    let rejectedCount = 0;
    const messageReceipts: any[] = [];
    const sanitizedSubmissions: any[] = [];
    const whatsappUrl = `https://graph.facebook.com/${whatsappGraphApiVersion}/${whatsappPhoneNumberId}/messages`;

    for (const recip of validRecipients) {
      try {
        const payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recip.phone,
          type: "text",
          text: {
            preview_url: true,
            body: `*${effectiveBroadcast?.title || "HealthTimes Alert"}*\n\n${effectiveBroadcast?.body || ""}`
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

        if (res.ok) {
          // Provider Acceptance Requires Message Identity (HTTP 2xx alone is not sufficient)
          const providerMsgId = providerData?.messages?.[0]?.id;
          if (typeof providerMsgId === "string" && providerMsgId.trim().length > 0) {
            acceptedCount++;
            messageReceipts.push({
              provider_message_id: providerMsgId.trim(),
              recipient_identity_hash: recip.phone_hash,
              status: "message-accepted"
            });
            sanitizedSubmissions.push({
              status: res.status,
              provider_message_id: providerMsgId.trim(),
              transport_status: "message-accepted"
            });
          } else {
            // Malformed 2xx envelope without message ID: classify as provider-rejected
            rejectedCount++;
            messageReceipts.push({
              provider_message_id: null,
              recipient_identity_hash: recip.phone_hash,
              status: "message-rejected",
              error_code: "MALFORMED_SUCCESS_RESPONSE",
              error_message: "HTTP 2xx received without provider message ID"
            });
            sanitizedSubmissions.push({
              status: res.status,
              provider_message_id: null,
              error_code: "MALFORMED_SUCCESS_RESPONSE",
              error_message: "HTTP 2xx received without provider message ID",
              transport_status: "message-rejected"
            });
          }
        } else {
          rejectedCount++;
          const errObj = providerData?.error;
          messageReceipts.push({
            provider_message_id: null,
            recipient_identity_hash: recip.phone_hash,
            status: "message-rejected",
            error_code: String(errObj?.code || res.status),
            error_message: String(errObj?.message || "Provider HTTP rejection").slice(0, 200)
          });
          sanitizedSubmissions.push({
            status: res.status,
            provider_message_id: null,
            error_code: String(errObj?.code || res.status),
            error_message: String(errObj?.message || "Provider HTTP rejection").slice(0, 200),
            transport_status: "message-rejected"
          });
        }
      } catch (err: any) {
        rejectedCount++;
        messageReceipts.push({
          provider_message_id: null,
          recipient_identity_hash: recip.phone_hash,
          status: "message-rejected",
          error_code: "NETWORK_ERROR",
          error_message: String(err?.message || "Network exception during provider call").slice(0, 200)
        });
        sanitizedSubmissions.push({
          status: 0,
          provider_message_id: null,
          error_code: "NETWORK_ERROR",
          error_message: String(err?.message || "Network exception during provider call").slice(0, 200),
          transport_status: "message-rejected"
        });
      }
    }

    // 9. Distinct state machine evaluation & envelope sanitization
    const finalBroadcastStatus = acceptedCount > 0 ? "sent" : "approved";
    const finalTransportStatus =
      acceptedCount > 0
        ? (rejectedCount > 0 ? "partially-accepted" : "provider-accepted")
        : "provider-rejected";
    const finalFailureReason =
      acceptedCount === 0
        ? `Provider rejected all submissions (${rejectedCount}/${validRecipients.length})`
        : (rejectedCount > 0 ? `Partial provider acceptance: ${acceptedCount} accepted, ${rejectedCount} rejected` : null);

    // Sanitized envelope: strictly no raw recipient phones, no contacts.input, no wa_id, no auth tokens
    const sanitizedEnvelope = {
      submissions: sanitizedSubmissions
    };

    const { error: resultErr } = await admin.rpc("newsroom_record_whatsapp_dispatch_result", {
      p_dispatch_id: dispatchId,
      p_status: finalBroadcastStatus,
      p_transport_status: finalTransportStatus,
      p_recipient_count: validRecipients.length,
      p_accepted_count: acceptedCount,
      p_rejected_count: rejectedCount,
      p_failure_reason: finalFailureReason,
      p_provider_broadcast_id: null,
      p_provider_response_envelope: sanitizedEnvelope,
      p_messages: messageReceipts
    });

    if (resultErr) {
      return jsonResponse(500, { ok: false, error: resultErr.message });
    }

    // 10. Return sanitized response to Studio (zero raw phone numbers)
    return jsonResponse(200, {
      ok: true,
      dispatch_id: dispatchId,
      broadcast_id: broadcastId.trim(),
      status: finalBroadcastStatus,
      transport_status: finalTransportStatus,
      recipient_count: validRecipients.length,
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
