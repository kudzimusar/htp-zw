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

export interface PushDispatchOptions {
  supabaseUrl?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  expoAccessToken?: string;
  fetchImpl?: typeof fetch;
  createClientFn?: any;
  userClient?: any;
  adminClient?: any;
}

export async function handlePushDispatchRequest(
  req: Request,
  options: PushDispatchOptions = {}
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
    const expoAccessToken = options.expoAccessToken || envLookup("EXPO_ACCESS_TOKEN");
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
    // distribution.manage alone is explicitly forbidden for provider dispatch
    const { data: hasPublishCap, error: capError } = await userClient.rpc(
      "newsroom_has_capability",
      { p_capability: "story.publish" }
    );

    if (capError || hasPublishCap !== true) {
      return jsonResponse(403, {
        ok: false,
        error: "Forbidden: story.publish capability required for push provider execution"
      });
    }

    // 3. Parse and validate request body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
    }

    const alertId = String(body.alert_id || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(alertId)) {
      return jsonResponse(400, { ok: false, error: "Invalid or missing alert_id (valid UUID required)" });
    }

    const idempotencyKey = String(body.idempotency_key || "").trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return jsonResponse(400, { ok: false, error: "Invalid idempotency_key (must be 8-128 characters)" });
    }

    // 4. Admin client with service_role authority
    const admin = options.adminClient || createClient(supabaseUrl, serviceRoleKey, {
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
      const status = msg.includes("already belongs to a different push alert") ? 409
        : msg.includes("prepared status") || msg.includes("not found") ? 400
        : 500;
      return jsonResponse(status, { ok: false, error: msg });
    }

    // 6. Handle canonical idempotent hit (same key OR same alert already dispatched)
    if (prepareData.is_duplicate) {
      return jsonResponse(200, {
        ok: true,
        is_duplicate: true,
        dispatch_id: prepareData.dispatch_id,
        alert_id: prepareData.alert_id || alertId,
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

    // 7. Handle Zero Recipients Case
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
        return jsonResponse(500, { ok: false, error: zeroErr.message });
      }

      return jsonResponse(200, {
        ok: true,
        dispatch_id: zeroResult.dispatch_id,
        alert_id: zeroResult.alert_id,
        status: zeroResult.status,
        eligible_device_count: zeroResult.eligible_device_count,
        provider_accepted_count: zeroResult.provider_accepted_count,
        provider_rejected_count: zeroResult.provider_rejected_count,
        confirmed_delivery_count: zeroResult.confirmed_delivery_count || 0,
        failure_reason: zeroResult.failure_reason,
        dispatched_at: zeroResult.dispatched_at
      });
    }

    // 8. Build and dispatch Expo Push batch messages in chunks of 100
    const CHUNK_SIZE = 100;
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

        const providerRes = await fetchFn("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: expoHeaders,
          body: JSON.stringify(chunkMessages)
        });

        if (!providerRes.ok) {
          finalStatus = "delivery-failed";
          failureReason = `Expo provider HTTP ${providerRes.status}: ${providerRes.statusText}`;
          // Account for remaining devices
          const remaining = devices.slice(acceptedCount + rejectedCount);
          rejectedCount += remaining.length;
          for (const d of remaining) {
            ticketRecords.push({
              device_id: d.device_id,
              ticket_id: null,
              status: "ticket-error",
              ticket_error: failureReason
            });
          }
          break;
        }

        let chunkResponse: any;
        try {
          chunkResponse = await providerRes.json();
        } catch {
          finalStatus = "delivery-failed";
          failureReason = "Malformed non-JSON response envelope from Expo provider";
          const remaining = devices.slice(acceptedCount + rejectedCount);
          rejectedCount += remaining.length;
          for (const d of remaining) {
            ticketRecords.push({
              device_id: d.device_id,
              ticket_id: null,
              status: "ticket-error",
              ticket_error: failureReason
            });
          }
          break;
        }

        const responseData = chunkResponse?.data;
        // Cardinality requirement: provider ticket result count MUST equal submitted device count
        if (!Array.isArray(responseData) || responseData.length !== deviceChunk.length) {
          finalStatus = "delivery-failed";
          failureReason = `Malformed response envelope from Expo provider: expected ${deviceChunk.length} tickets, received ${Array.isArray(responseData) ? responseData.length : "non-array"}`;
          const remaining = devices.slice(acceptedCount + rejectedCount);
          rejectedCount += remaining.length;
          for (const d of remaining) {
            ticketRecords.push({
              device_id: d.device_id,
              ticket_id: null,
              status: "ticket-error",
              ticket_error: failureReason
            });
          }
          break;
        }

        providerResponse = chunkResponse;
        for (let j = 0; j < responseData.length; j++) {
          const item = responseData[j];
          const device = deviceChunk[j];
          const ticketId = typeof item?.id === "string" && item.id.trim().length > 0 ? item.id.trim() : null;

          if (item?.status === "ok" && ticketId) {
            acceptedCount++;
            ticketRecords.push({
              device_id: device.device_id,
              ticket_id: ticketId,
              status: "ticket-accepted",
              ticket_error: null
            });
          } else if (item?.status === "ok" && !ticketId) {
            // Missing required ticket identity must be treated as rejected
            rejectedCount++;
            ticketRecords.push({
              device_id: device.device_id,
              ticket_id: null,
              status: "ticket-rejected",
              ticket_error: "Missing ticket id in provider acceptance response"
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

      // Enforce status determination if no HTTP/envelope failure occurred
      if (!failureReason) {
        if (rejectedCount === 0 && acceptedCount > 0) {
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
      const accounted = acceptedCount + rejectedCount;
      if (accounted < devices.length) {
        const remaining = devices.slice(accounted);
        rejectedCount += remaining.length;
        for (const d of remaining) {
          ticketRecords.push({
            device_id: d.device_id,
            ticket_id: null,
            status: "ticket-error",
            ticket_error: failureReason
          });
        }
      }
    }

    // 9. Record dispatch result via service-role RPC (enforces accepted + rejected == eligible)
    const { data: recordResult, error: recordErr } = await admin.rpc(
      "newsroom_record_dispatch_result",
      {
        p_dispatch_id: dispatchId,
        p_status: finalStatus!,
        p_eligible_count: devices.length,
        p_accepted_count: acceptedCount,
        p_rejected_count: rejectedCount,
        p_failure_reason: failureReason,
        p_tickets: ticketRecords,
        p_provider_response: providerResponse
      }
    );

    if (recordErr) {
      return jsonResponse(500, { ok: false, error: recordErr.message });
    }

    // 10. Return bounded sanitized aggregate (zero tokens, zero device IDs, zero reader IDs)
    return jsonResponse(200, {
      ok: true,
      dispatch_id: recordResult.dispatch_id,
      alert_id: recordResult.alert_id,
      status: recordResult.status,
      eligible_device_count: recordResult.eligible_device_count,
      provider_accepted_count: recordResult.provider_accepted_count,
      provider_rejected_count: recordResult.provider_rejected_count,
      confirmed_delivery_count: 0,
      failure_reason: recordResult.failure_reason,
      dispatched_at: recordResult.dispatched_at
    });
  } catch (err: any) {
    return jsonResponse(500, {
      ok: false,
      error: err.message || "Internal server error"
    });
  }
}

if (typeof Deno !== "undefined" && typeof (Deno as any).serve === "function") {
  (Deno as any).serve(async (req: Request) => handlePushDispatchRequest(req));
}
