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

export interface AiAssistOptions {
  supabaseUrl?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  fetchImpl?: typeof fetch;
  createClientFn?: any;
  userClient?: any;
  adminClient?: any;
}

export async function handleAiAssistRequest(
  req: Request,
  options: AiAssistOptions = {}
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

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const envLookup = (key: string): string | undefined => {
      if (typeof Deno !== "undefined" && typeof (Deno as any).env?.get === "function") {
        return (Deno as any).env.get(key);
      }
      return process.env[key];
    };

    const envSupabaseUrl = options.supabaseUrl || envLookup("SUPABASE_URL") || "";
    const envAnonKey = options.anonKey || envLookup("SUPABASE_ANON_KEY") || "";
    const envServiceRoleKey = options.serviceRoleKey || envLookup("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiKey = options.geminiApiKey || envLookup("GEMINI_API_KEY") || "";
    const geminiModel = options.geminiModel || envLookup("GEMINI_MODEL") || "";

    const createClient = await resolveCreateClient(options.createClientFn);

    const userClient =
      options.userClient ||
      createClient(envSupabaseUrl, envAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false }
      });

    const adminClient =
      options.adminClient ||
      createClient(envSupabaseUrl, envServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse(401, {
        ok: false,
        error: `Invalid or expired session: ${userError?.message || "Unknown error"}`
      });
    }

    const userId = userData.user.id;

    // Check editorial capabilities
    const capabilitiesToCheck = [
      "story.create",
      "story.edit_own",
      "story.edit_all",
      "story.copy_edit",
      "story.fact_check",
      "story.health_review",
      "story.publish"
    ];

    let hasAnyCap = false;
    for (const cap of capabilitiesToCheck) {
      const { data: capData } = await userClient.rpc("newsroom_has_capability", { p_capability: cap });
      if (capData === true) {
        hasAnyCap = true;
        break;
      }
    }

    if (!hasAnyCap) {
      return jsonResponse(403, {
        ok: false,
        error: "Forbidden: You do not have editorial capabilities required to use AI assist."
      });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse(400, { ok: false, error: "Invalid JSON request body." });
    }

    // Supported tasks: headline_alternatives, seo_alternatives, editorial_guidance
    const taskType = body.task_type || body.taskType || "headline_alternatives";
    const inputPrompt = (body.input_prompt || body.inputPrompt || "").trim();
    const inputContext = (body.input_context || body.inputContext || "").trim();
    const storyId = body.story_id || body.storyId || null;

    if (!inputPrompt) {
      return jsonResponse(400, { ok: false, error: "Missing required parameter: input_prompt" });
    }

    // Truthful provider check: if GEMINI_API_KEY or GEMINI_MODEL is not configured, report unconfigured truth
    if (!geminiKey || !geminiModel) {
      return jsonResponse(200, {
        ok: false,
        provider: geminiModel || "google_gemini",
        provider_status: "provider_unconfigured",
        error: "Google Gemini AI provider credentials (GEMINI_API_KEY) or model configuration (GEMINI_MODEL) are not configured in this environment",
        suggestions: [],
        safety_flags: {
          can_publish: false,
          can_approve: false,
          can_bypass_review: false,
          human_review_required: true,
          zero_direct_mutation: true
        }
      });
    }

    const customFetch = options.fetchImpl || fetch;
    const prompt = `You are the HealthTimes Zimbabwe AI Editorial Assistant.
You assist professional health journalists and editors.
Principles:
1. Strict factual grounding in public health and Zimbabwean medical context.
2. ZERO fiction, zero fabricated sources or quotes.
3. You have ZERO publishing authority; output suggestions only for human review.

Task: ${taskType}
Prompt: ${inputPrompt}
Context: ${inputContext}

Respond ONLY with a valid JSON array of suggestions conforming to schema:
[{"type": "string", "text": "string", "rationale": "string"}]`;

    // Strictly authenticate via x-goog-api-key header; never include API key in URL query string
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

    let suggestions: Array<{ type: string; text: string; rationale: string }> = [];

    try {
      const resp = await customFetch(geminiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": geminiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!resp.ok) {
        return jsonResponse(200, {
          ok: false,
          provider: geminiModel,
          provider_status: "provider_failed",
          error: `Google Gemini API returned HTTP status ${resp.status}`,
          suggestions: [],
          safety_flags: {
            can_publish: false,
            can_approve: false,
            can_bypass_review: false,
            human_review_required: true,
            zero_direct_mutation: true
          }
        });
      }

      let geminiData: any;
      try {
        geminiData = await resp.json();
      } catch {
        return jsonResponse(200, {
          ok: false,
          provider: geminiModel,
          provider_status: "provider_failed",
          error: "Malformed provider response: unparseable JSON",
          suggestions: [],
          safety_flags: {
            can_publish: false,
            can_approve: false,
            can_bypass_review: false,
            human_review_required: true,
            zero_direct_mutation: true
          }
        });
      }

      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return jsonResponse(200, {
          ok: false,
          provider: geminiModel,
          provider_status: "provider_failed",
          error: "Malformed provider response: missing candidate text",
          suggestions: [],
          safety_flags: {
            can_publish: false,
            can_approve: false,
            can_bypass_review: false,
            human_review_required: true,
            zero_direct_mutation: true
          }
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return jsonResponse(200, {
          ok: false,
          provider: geminiModel,
          provider_status: "provider_failed",
          error: "Malformed provider response: candidate text is not valid JSON",
          suggestions: [],
          safety_flags: {
            can_publish: false,
            can_approve: false,
            can_bypass_review: false,
            human_review_required: true,
            zero_direct_mutation: true
          }
        });
      }

      if (!Array.isArray(parsed)) {
        return jsonResponse(200, {
          ok: false,
          provider: geminiModel,
          provider_status: "provider_failed",
          error: "Malformed provider response: suggestions must be an array",
          suggestions: [],
          safety_flags: {
            can_publish: false,
            can_approve: false,
            can_bypass_review: false,
            human_review_required: true,
            zero_direct_mutation: true
          }
        });
      }

      suggestions = parsed
        .filter(
          (s: any) =>
            s &&
            typeof s.text === "string" &&
            s.text.trim().length > 0 &&
            typeof s.type === "string"
        )
        .map((s: any) => ({
          type: String(s.type).trim(),
          text: String(s.text).trim(),
          rationale: String(s.rationale || "").trim()
        }));

      if (suggestions.length === 0) {
        return jsonResponse(200, {
          ok: false,
          provider: geminiModel,
          provider_status: "provider_failed",
          error: "Malformed provider response: zero valid suggestions returned",
          suggestions: [],
          safety_flags: {
            can_publish: false,
            can_approve: false,
            can_bypass_review: false,
            human_review_required: true,
            zero_direct_mutation: true
          }
        });
      }
    } catch (err: any) {
      return jsonResponse(200, {
        ok: false,
        provider: geminiModel,
        provider_status: "provider_failed",
        error: `Google Gemini API invocation failed: ${err?.message || "Unknown error"}`,
        suggestions: [],
        safety_flags: {
          can_publish: false,
          can_approve: false,
          can_bypass_review: false,
          human_review_required: true,
          zero_direct_mutation: true
        }
      });
    }

    // Persist session atomically and record canonical audit log via service-role RPC
    // Fail closed if session recording fails: do not return ok: true and do not manufacture a fake session ID
    const { data: recordData, error: recordErr } = await adminClient.rpc(
      "newsroom_record_ai_assist_session",
      {
        p_story_id: storyId,
        p_task_type: taskType,
        p_input_prompt: inputPrompt,
        p_input_context: inputContext || null,
        p_suggestions: suggestions,
        p_provider: geminiModel,
        p_provider_status: "active",
        p_actor_user_id: userId
      }
    );

    if (recordErr || !recordData?.session_id) {
      return jsonResponse(200, {
        ok: false,
        provider: geminiModel,
        provider_status: "persistence_failed",
        error: `Session persistence failed: ${recordErr?.message || "Could not record session in database"}`,
        suggestions: [],
        safety_flags: {
          can_publish: false,
          can_approve: false,
          can_bypass_review: false,
          human_review_required: true,
          zero_direct_mutation: true
        }
      });
    }

    return jsonResponse(200, {
      ok: true,
      session_id: recordData.session_id,
      task_type: taskType,
      provider: geminiModel,
      provider_status: "active",
      suggestions,
      safety_flags: {
        can_publish: false,
        can_approve: false,
        can_bypass_review: false,
        human_review_required: true,
        zero_direct_mutation: true
      }
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
  Deno.serve((req: Request) => handleAiAssistRequest(req));
}
