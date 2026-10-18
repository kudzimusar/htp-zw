import type { SupabaseClient } from "@supabase/supabase-js";
import { getStagingSupabaseClient } from "../platform/supabase";
import type {
  NewsroomAiAssistOverview,
  NewsroomAiAssistSession,
  NewsroomAiSuggestion,
  NewsroomCitationReference,
  NewsroomCitationsDirectory,
  NewsroomRecordCitationInput,
  NewsroomRunAiAssistInput
} from "../domain/models";
import type { NewsroomAiService } from "../domain/contracts";

export function mapAiSuggestion(raw: any): NewsroomAiSuggestion {
  return {
    type: String(raw?.type ?? "general"),
    text: String(raw?.text ?? ""),
    rationale: String(raw?.rationale ?? "")
  };
}

export function mapAiAssistSession(raw: any): NewsroomAiAssistSession {
  const rawSuggestions = Array.isArray(raw?.suggestions) ? raw.suggestions : [];
  const rawSafety = raw?.safety_flags ?? raw?.safetyFlags ?? {};
  return {
    id: String(raw?.id ?? raw?.session_id ?? raw?.sessionId ?? ""),
    storyId: raw?.story_id ? String(raw.story_id) : (raw?.storyId ? String(raw.storyId) : null),
    storyTitle: raw?.story_title ? String(raw.story_title) : (raw?.storyTitle ? String(raw.storyTitle) : null),
    taskType: raw?.task_type ?? raw?.taskType ?? "headline_alternatives",
    inputPrompt: String(raw?.input_prompt ?? raw?.inputPrompt ?? ""),
    inputContext: raw?.input_context ? String(raw.input_context) : (raw?.inputContext ? String(raw.inputContext) : null),
    suggestions: rawSuggestions.map(mapAiSuggestion),
    provider: String(raw?.provider ?? "gemini-3.8-flash"),
    providerStatus: String(raw?.provider_status ?? raw?.providerStatus ?? "provider_unconfigured"),
    status: (raw?.status === "pending" || raw?.status === "failed") ? raw.status : "completed",
    safetyFlags: {
      canPublish: false,
      canApprove: false,
      canBypassReview: false,
      humanReviewRequired: Boolean(rawSafety.human_review_required ?? rawSafety.humanReviewRequired ?? true)
    },
    createdBy: raw?.created_by ? String(raw.created_by) : (raw?.createdBy ? String(raw.createdBy) : null),
    createdAt: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString())
  };
}

export function mapAiAssistOverview(data: any): NewsroomAiAssistOverview {
  const rawSafety = data?.safety_policy ?? data?.safetyPolicy ?? {};
  const rawMetrics = data?.metrics ?? {};
  const rawSessions = Array.isArray(data?.recent_sessions ?? data?.recentSessions)
    ? (data.recent_sessions ?? data.recentSessions)
    : [];
  const rawTasks = Array.isArray(data?.supported_tasks ?? data?.supportedTasks)
    ? (data.supported_tasks ?? data.supportedTasks)
    : [];

  return {
    providerStatus: String(data?.provider_status ?? data?.providerStatus ?? "provider_unconfigured"),
    providerModel: String(data?.provider_model ?? data?.providerModel ?? "gemini-3.8-flash"),
    safetyPolicy: {
      canPublish: false,
      canApprove: false,
      canBypassReview: false,
      humanReviewRequired: true,
      principle: String(rawSafety?.principle ?? "AI is restricted to reviewable suggestions and drafting assistance. Direct story publication or silent mutation is strictly prohibited.")
    },
    supportedTasks: rawTasks.map((t: any) => ({
      id: t.id,
      name: String(t.name ?? t.id),
      description: String(t.description ?? "")
    })),
    metrics: {
      totalSessions: Number(rawMetrics.total_sessions ?? rawMetrics.totalSessions ?? 0),
      taskCounts: rawMetrics.task_counts ?? rawMetrics.taskCounts ?? {}
    },
    recentSessions: rawSessions.map(mapAiAssistSession)
  };
}

export function mapCitationReference(raw: any): NewsroomCitationReference {
  const validStatus = (raw?.status === "verified" || raw?.status === "flagged" || raw?.status === "rejected")
    ? raw.status
    : "unverified";

  return {
    id: String(raw?.id ?? ""),
    storyId: raw?.story_id ? String(raw.story_id) : (raw?.storyId ? String(raw.storyId) : null),
    storyTitle: raw?.story_title ? String(raw.story_title) : (raw?.storyTitle ? String(raw.storyTitle) : null),
    storySlug: raw?.story_slug ? String(raw.story_slug) : (raw?.storySlug ? String(raw.storySlug) : null),
    referenceType: String(raw?.reference_type ?? raw?.referenceType ?? "academic"),
    sourceName: String(raw?.source_name ?? raw?.sourceName ?? "External Reference"),
    sourceUrl: raw?.source_url ? String(raw.source_url) : (raw?.sourceUrl ? String(raw.sourceUrl) : null),
    title: String(raw?.title ?? raw?.source_name ?? "Untitled Citation"),
    citedAt: raw?.cited_at ? String(raw.cited_at) : (raw?.citedAt ? String(raw.citedAt) : null),
    country: raw?.country ? String(raw.country) : (raw?.country ? String(raw.country) : null),
    authorityScore: raw?.authority_score !== undefined && raw?.authority_score !== null ? Number(raw.authority_score) : null,
    provider: raw?.provider ? String(raw.provider) : null,
    providerReference: raw?.provider_reference ? String(raw.provider_reference) : null,
    status: validStatus,
    createdAt: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString())
  };
}

export function mapCitationsDirectory(data: any): NewsroomCitationsDirectory {
  const rawMetrics = data?.metrics ?? {};
  const rawCitations = Array.isArray(data?.citations) ? data.citations : [];

  return {
    metrics: {
      totalCitations: Number(rawMetrics.total_citations ?? rawMetrics.totalCitations ?? 0),
      verifiedCount: Number(rawMetrics.verified_count ?? rawMetrics.verifiedCount ?? 0),
      unverifiedCount: Number(rawMetrics.unverified_count ?? rawMetrics.unverifiedCount ?? 0),
      flaggedCount: Number(rawMetrics.flagged_count ?? rawMetrics.flaggedCount ?? 0),
      rejectedCount: Number(rawMetrics.rejected_count ?? rawMetrics.rejectedCount ?? 0),
      academicCount: Number(rawMetrics.academic_count ?? rawMetrics.academicCount ?? 0)
    },
    citations: rawCitations.map(mapCitationReference)
  };
}

export function createNewsroomAiService(client?: SupabaseClient | null): NewsroomAiService {
  const getClient = (): SupabaseClient =>
    client ?? (getStagingSupabaseClient() as unknown as SupabaseClient);

  return {
    async getOverview(): Promise<NewsroomAiAssistOverview> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_get_ai_assist_overview");
      if (error) {
        throw new Error(`Failed to fetch AI assist overview: ${error.message}`);
      }
      return mapAiAssistOverview(data);
    },

    async runAssist(input: NewsroomRunAiAssistInput): Promise<NewsroomAiAssistSession> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      // HT-NR-CLOSE-R1: Invoke Edge Function newsroom-ai-assist via functions.invoke()
      if (typeof sb.functions?.invoke === "function") {
        const { data, error } = await sb.functions.invoke("newsroom-ai-assist", {
          body: {
            task_type: input.taskType,
            input_prompt: input.inputPrompt,
            input_context: input.inputContext ?? null,
            story_id: input.storyId ?? null
          }
        });

        if (error) {
          throw new Error(`Failed to run AI assist: ${error.message}`);
        }

        if (data && data.ok === false) {
          return {
            id: data.session_id ? String(data.session_id) : "",
            storyId: input.storyId ?? null,
            storyTitle: null,
            taskType: input.taskType,
            inputPrompt: input.inputPrompt,
            inputContext: input.inputContext ?? null,
            suggestions: [],
            provider: String(data.provider ?? "google_gemini"),
            providerStatus: String(data.provider_status ?? "provider_unconfigured"),
            status: "failed",
            safetyFlags: {
              canPublish: false,
              canApprove: false,
              canBypassReview: false,
              humanReviewRequired: true
            },
            createdBy: null,
            createdAt: new Date().toISOString()
          };
        }

        return mapAiAssistSession(data);
      }

      // Mock client fallback when functions api is not mocked
      const { data, error } = await (sb.rpc as any)("newsroom_run_ai_assist", {
        p_story_id: input.storyId ?? null,
        p_task_type: input.taskType,
        p_input_prompt: input.inputPrompt,
        p_input_context: input.inputContext ?? null
      });

      if (error) {
        throw new Error(`Failed to run AI assist: ${error.message}`);
      }
      return mapAiAssistSession(data);
    },

    async getCitationsDirectory(options?: {
      status?: string | null;
      search?: string | null;
      limit?: number;
      offset?: number;
    }): Promise<NewsroomCitationsDirectory> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_get_citations_directory", {
        p_status: options?.status ?? null,
        p_search: options?.search ?? null,
        p_limit: options?.limit ?? 50,
        p_offset: options?.offset ?? 0
      });

      if (error) {
        throw new Error(`Failed to fetch citations directory: ${error.message}`);
      }
      return mapCitationsDirectory(data);
    },

    async recordCitation(input: NewsroomRecordCitationInput): Promise<{ citationId: string; status: string }> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_record_citation", {
        p_story_id: input.storyId ?? null,
        p_reference_type: input.referenceType,
        p_source_name: input.sourceName,
        p_source_url: input.sourceUrl ?? null,
        p_title: input.title ?? null,
        p_country: input.country ?? "Zimbabwe"
      });

      if (error) {
        throw new Error(`Failed to record citation: ${error.message}`);
      }
      const rawData = data as Record<string, unknown> | null;
      return {
        citationId: String(rawData?.citation_id ?? ""),
        status: String(rawData?.status ?? "unverified")
      };
    },

    async updateCitationStatus(citationId: string, status: string): Promise<{ citationId: string; status: string }> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_update_citation_status", {
        p_citation_id: citationId,
        p_status: status
      });

      if (error) {
        throw new Error(`Failed to update citation status: ${error.message}`);
      }
      const rawData = data as Record<string, unknown> | null;
      return {
        citationId: String(rawData?.citation_id ?? citationId),
        status: String(rawData?.status ?? status)
      };
    }
  };
}

export const stagingNewsroomAiService = createNewsroomAiService();
