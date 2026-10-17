import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response(405, { ok: false, error: "Method not allowed. POST required." });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return response(401, { ok: false, error: "Authentication required" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return response(500, { ok: false, error: "Server configuration missing" });
    }

    // 1. Verify caller with user client
    const userClient = createClient(supabaseUrl, anonKey || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return response(401, { ok: false, error: "Invalid or expired session token" });
    }

    // 2. Verify irreversible send authority: story.publish
    // distribution.manage by itself must NOT authorize final provider execution
    const { data: hasPublishCap, error: capError } = await userClient.rpc(
      "newsroom_has_capability",
      { p_capability: "story.publish" }
    );

    if (capError || hasPublishCap !== true) {
      return response(403, {
        ok: false,
        error: "Forbidden: story.publish capability required for push provider execution"
      });
    }

    // 3. Parse and validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return response(400, { ok: false, error: "Invalid JSON body" });
    }

    const alertId = String(body.alert_id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(alertId)) {
      return response(400, { ok: false, error: "Invalid or missing alert_id (valid UUID required)" });
    }

    const idempotencyKey = String(body.idempotency_key || "").trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return response(400, { ok: false, error: "Invalid idempotency_key (must be 8-128 characters)" });
    }

    // 4. Admin client with service_role authority
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 5. Prepare dispatch and resolve recipient devices safely inside service_role boundary
    const { data: prepareData, error: prepError } = await admin.rpc(
      "newsroom_prepare_dispatch_recipients",
      {
        p_alert_id: alertId,
        p_idempotency_key: idempotencyKey,
        p_actor_user_id: user.id
      }
    );

    if (prepError) {
      const msg = prepError.message || "Failed to prepare push dispatch";
      const status = msg.includes("prepared status") || msg.includes("not found") ? 400 : 500;
      return response(status, { ok: false, error: msg });
    }

    // If duplicate idempotency hit: return existing dispatch state immediately without re-sending
    if (prepareData.is_duplicate) {
      return response(200, {
        ok: true,
        is_duplicate: true,
        dispatch_id: prepareData.dispatch_id,
        alert_id: alertId,
        status: prepareData.status,
        eligible_device_count: prepareData.eligible_device_count,
        provider_accepted_count: prepareData.provider_accepted_count,
        provider_rejected_count: prepareData.provider_rejected_count,
        confirmed_delivery_count: prepareData.confirmed_delivery_count || 0,
        failure_reason: prepareData.failure_reason
      });
    }

    const dispatchId = prepareData.dispatch_id;
    const alert = prepareData.alert;
    const devices: Array<{ device_id: string; expo_push_token: string }> = prepareData.devices || [];

    // Zero recipients case
    if (devices.length === 0) {
      const { data: zeroResult, error: zeroErr } = await admin.rpc(
        "newsroom_record_dispatch_result",
        {
          p_dispatch_id: dispatchId,
          p_status: "zero-recipients",
          p_eligible_count: 0,
          p_accepted_count: 0,
          p_rejected_count: 0,
          p_failure_reason: "Zero active reader devices registered"
        }
      );
      if (zeroErr) {
        return response(500, { ok: false, error: zeroErr.message });
      }
      return response(200, {
        ok: true,
        ...zeroResult
      });
    }

    // 6. Build and dispatch Expo Push batch messages in chunks of 100 (Expo limit)
    const CHUNK_SIZE = 100;
    const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
    const expoHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    if (expoAccessToken) {
      expoHeaders["Authorization"] = `Bearer ${expoAccessToken}`;
    }

    let providerResponse: any = null;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let finalStatus: string;
    let failureReason: string | null = null;
    const ticketRecords: any[] = [];

    try {
      for (let i = 0; i < devices.length; i += CHUNK_SIZE) {
        const deviceChunk = devices.slice(i, i + CHUNK_SIZE);
        const chunkMessages = deviceChunk.map((d) => ({
          to: d.expo_push_token,
          title: alert.title,
          body: alert.body,
          data: {
            alertId: alert.id,
            category: alert.category,
            destination: alert.destination
          },
          priority: "high",
          sound: "default"
        }));

        const providerRes = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: expoHeaders,
          body: JSON.stringify(chunkMessages)
        });

        if (!providerRes.ok) {
          finalStatus = "delivery-failed";
          failureReason = `Expo provider HTTP ${providerRes.status}: ${providerRes.statusText}`;
          rejectedCount += deviceChunk.length;
          break;
        }

        const chunkResponse = await providerRes.json();
        const responseData = chunkResponse?.data;
        if (!Array.isArray(responseData)) {
          finalStatus = "delivery-failed";
          failureReason = "Malformed response envelope from Expo provider";
          rejectedCount += deviceChunk.length;
          break;
        }

        providerResponse = chunkResponse;
        for (let j = 0; j < responseData.length; j++) {
          const item = responseData[j];
          const device = deviceChunk[j];
          if (item?.status === "ok") {
            acceptedCount++;
            ticketRecords.push({
              device_id: device.device_id,
              ticket_id: item.id || null,
              status: "ticket-accepted",
              ticket_error: null
            });
          } else {
            rejectedCount++;
            ticketRecords.push({
              device_id: device.device_id,
              ticket_id: null,
              status: "ticket-rejected",
              ticket_error: item?.message || item?.details?.error || "Unknown provider error"
            });
          }
        }
      }

      if (!failureReason) {
        if (rejectedCount === 0) {
          finalStatus = "provider-accepted";
        } else if (acceptedCount === 0) {
          finalStatus = "provider-rejected";
          failureReason = "All recipient push tickets were rejected by provider";
        } else {
          finalStatus = "partially-accepted";
        }
      }
    } catch (err: any) {
      finalStatus = "delivery-failed";
      failureReason = `Provider connection error: ${err.message || String(err)}`;
    }

    // 7. Record dispatch result via service-role RPC
    const { data: recordResult, error: recordErr } = await admin.rpc(
      "newsroom_record_dispatch_result",
      {
        p_dispatch_id: dispatchId,
        p_status: finalStatus,
        p_eligible_count: devices.length,
        p_accepted_count: acceptedCount,
        p_rejected_count: rejectedCount,
        p_failure_reason: failureReason,
        p_tickets: ticketRecords,
        p_provider_response: providerResponse
      }
    );

    if (recordErr) {
      return response(500, { ok: false, error: recordErr.message });
    }

    // 8. Return bounded sanitized aggregate (zero tokens, zero device IDs, zero reader IDs)
    return response(200, {
      ok: true,
      ...recordResult
    });
  } catch (err: any) {
    return response(500, {
      ok: false,
      error: err.message || "Internal server error"
    });
  }
});
