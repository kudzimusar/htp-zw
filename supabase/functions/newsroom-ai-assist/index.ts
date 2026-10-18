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

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader) {
      return jsonResponse(401, {
        ok: false,
        error: "Missing authorization token in request headers"
      });
    }

    const token = authHeader.replace(/^bearer\s+/i, "");
    if (!token) {
      return jsonResponse(401, {
        ok: false,
        error: "Malformed Bearer token"
      });
    }

    const envSupabaseUrl =
      options.supabaseUrl ||
      (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : process.env.SUPABASE_URL) ||
      "";
    const envAnonKey =
      options.anonKey ||
      (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_ANON_KEY") : process.env.SUPABASE_ANON_KEY) ||
      "";
    const envServiceRoleKey =
      options.serviceRoleKey ||
      (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") : process.env.SUPABASE_SERVICE_ROLE_KEY) ||
      "";
    const geminiKey =
      options.geminiApiKey ||
      (typeof Deno !== "undefined" ? Deno.env.get("GEMINI_API_KEY") : process.env.GEMINI_API_KEY) ||
      "";

    const createClient = await resolveCreateClient(options.createClientFn);

    const userClient =
      options.userClient ||
      createClient(envSupabaseUrl, envAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false }
      });

    const adminClient =
      options.adminClient ||
      createClient(envSupabaseUrl, envServiceRoleKey, {
        auth: { persistSession: false }
      });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse(401, {
        ok: false,
        error: `Invalid or expired session: ${userError?.message || "Unknown error"}`
      });
    }

    const userId = userData.user.id;

    // Check capabilities
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

    const taskType = body.task_type || body.taskType || "headline_alternatives";
    const inputPrompt = (body.input_prompt || body.inputPrompt || "").trim();
    const inputContext = (body.input_context || body.inputContext || "").trim();
    const storyId = body.story_id || body.storyId || null;

    if (!inputPrompt) {
      return jsonResponse(400, { ok: false, error: "Missing required parameter: input_prompt" });
    }

    let suggestions: Array<{ type: string; text: string; rationale: string }> = [];
    let provider = "editorial_heuristics_fallback";
    let providerStatus = "provider_unconfigured";

    const customFetch = options.fetchImpl || fetch;

    if (geminiKey) {
      try {
        const prompt = `You are the HealthTimes Zimbabwe AI Editorial Assistant.
You assist professional health journalists and editors.
Principles:
1. Strict factual grounding in public health and Zimbabwean medical context.
2. ZERO fiction, zero fabricated sources or quotes.
3. You have ZERO publishing authority; output suggestions only for human review.

Task: ${taskType}
Prompt: ${inputPrompt}
Context: ${inputContext}

Respond ONLY with a JSON array of suggestions with schema:
[{"type": "string", "text": "string", "rationale": "string"}]`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const resp = await customFetch(geminiUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (resp.ok) {
          const geminiData = await resp.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            suggestions = JSON.parse(rawText);
            provider = "gemini-1.5-flash";
            providerStatus = "active";
          }
        }
      } catch {
        // Fall back gracefully to heuristics
      }
    }

    // Heuristics fallback if Gemini is unconfigured or failed
    if (suggestions.length === 0) {
      if (taskType === "headline_alternatives") {
        suggestions = [
          {
            type: "straight_news",
            text: `HealthTimes Investigation: ${inputPrompt}`,
            rationale: "Standard factual headline emphasizing public health findings"
          },
          {
            type: "analytical",
            text: `Inside Zimbabwe Health Policy: Why ${inputPrompt} Demands Immediate Action`,
            rationale: "Analytical perspective connecting news events to systemic health impacts"
          },
          {
            type: "impact_focused",
            text: `What ${inputPrompt} Means For Healthcare Workers and Vulnerable Patients`,
            rationale: "Human-centered framing focused on frontline clinical delivery"
          }
        ];
      } else if (taskType === "seo_alternatives") {
        suggestions = [
          {
            type: "meta_title",
            text: `${inputPrompt} | Zimbabwe Health Analysis`,
            rationale: "Optimized title under 60 characters with national keywords"
          },
          {
            type: "meta_description",
            text: `In-depth reporting on ${inputPrompt} from HealthTimes Zimbabwe. Read clinical analyses, ministry updates, and patient impact.`,
            rationale: "Search engine snippet under 160 characters designed for high click-through"
          }
        ];
      } else {
        suggestions = [
          {
            type: "editorial_guidance",
            text: `Editorial review recommendation for "${inputPrompt}": verify all primary medical claims and institutional figures before submitting for workflow review.`,
            rationale: "Compliance with HealthTimes accuracy standards"
          }
        ];
      }
    }

    // Persist session to database via admin client
    let sessionId = crypto.randomUUID ? crypto.randomUUID() : "sess-" + Date.now();
    try {
      const { data: sessionRow } = await adminClient
        .from("newsroom_ai_assist_sessions")
        .insert({
          story_id: storyId,
          task_type: taskType,
          input_prompt: inputPrompt,
          input_context: inputContext || null,
          suggestions,
          provider,
          provider_status: providerStatus,
          status: "completed",
          created_by: userId
        })
        .select("id")
        .single();

      if (sessionRow?.id) {
        sessionId = sessionRow.id;
      }
    } catch {
      // Non-fatal if logging fails
    }

    return jsonResponse(200, {
      ok: true,
      session_id: sessionId,
      task_type: taskType,
      provider,
      provider_status: providerStatus,
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
