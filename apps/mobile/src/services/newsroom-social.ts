import type { NewsroomSocialService } from "../domain/contracts";
import {
  validateSocialDraftCreateInput,
  type NewsroomSocialAccount,
  type NewsroomSocialAccountEnvironment,
  type NewsroomSocialAccountStatus,
  type NewsroomSocialAttemptStatus,
  type NewsroomSocialDraftCreateInput,
  type NewsroomSocialPost,
  type NewsroomSocialPostStatus,
  type NewsroomSocialPreparePublishResult,
  type NewsroomSocialPublicationAttempt
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NewsroomSocialErrorCode =
  | "MALFORMED_ENVELOPE"
  | "MALFORMED_DATA"
  | "VALIDATION_ERROR"
  | "RPC_ERROR"
  | "QUERY_ERROR"
  | "FAIL_CLOSED";

export class NewsroomSocialError extends Error {
  readonly code: NewsroomSocialErrorCode;

  constructor(message: string, code: NewsroomSocialErrorCode = "RPC_ERROR") {
    super(message);
    this.name = "NewsroomSocialError";
    this.code = code;
  }
}

export function isValidUuid(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  const parsed = new Date(value);
  return !isNaN(parsed.getTime());
}

const VALID_ACCOUNT_ENVIRONMENTS: ReadonlySet<NewsroomSocialAccountEnvironment> = new Set([
  "staging",
  "production"
]);

const VALID_ACCOUNT_STATUSES: ReadonlySet<NewsroomSocialAccountStatus> = new Set([
  "unconfigured",
  "ready",
  "disabled",
  "error"
]);

const VALID_POST_STATUSES: ReadonlySet<NewsroomSocialPostStatus> = new Set([
  "draft",
  "approved",
  "published",
  "failed",
  "cancelled"
]);

const VALID_ATTEMPT_STATUSES: ReadonlySet<NewsroomSocialAttemptStatus> = new Set([
  "pending",
  "succeeded",
  "failed",
  "unconfigured"
]);

export function mapNewsroomSocialAccountRow(row: any): NewsroomSocialAccount | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  if (!isValidUuid(row.id)) return null;

  if (typeof row.provider !== "string" || row.provider.trim().length === 0) return null;
  if (typeof row.account_label !== "string" || row.account_label.trim().length === 0) return null;

  let providerAccountId: string | null = null;
  if (row.provider_account_id !== null && row.provider_account_id !== undefined) {
    if (typeof row.provider_account_id !== "string") return null;
    const trimmed = row.provider_account_id.trim();
    providerAccountId = trimmed.length > 0 ? trimmed : null;
  }

  if (
    typeof row.environment !== "string" ||
    !VALID_ACCOUNT_ENVIRONMENTS.has(row.environment as NewsroomSocialAccountEnvironment)
  ) {
    return null;
  }

  if (
    typeof row.status !== "string" ||
    !VALID_ACCOUNT_STATUSES.has(row.status as NewsroomSocialAccountStatus)
  ) {
    return null;
  }

  if (!isValidTimestamp(row.created_at)) return null;
  if (!isValidTimestamp(row.updated_at)) return null;

  return {
    id: String(row.id).trim(),
    provider: row.provider.trim().toLowerCase(),
    accountLabel: row.account_label.trim(),
    providerAccountId,
    environment: row.environment as NewsroomSocialAccountEnvironment,
    status: row.status as NewsroomSocialAccountStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapNewsroomSocialPostRow(row: any): NewsroomSocialPost | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  if (!isValidUuid(row.id)) return null;
  if (!isValidUuid(row.story_id)) return null;

  let socialAccountId: string | null = null;
  if (row.social_account_id !== null && row.social_account_id !== undefined) {
    if (!isValidUuid(row.social_account_id)) return null;
    socialAccountId = String(row.social_account_id).trim();
  }

  if (typeof row.provider !== "string" || row.provider.trim().length === 0) return null;

  if (typeof row.body !== "string") return null;
  const trimmedBody = row.body.trim();
  if (trimmedBody.length === 0 || trimmedBody.length > 10000) return null;

  if (
    typeof row.status !== "string" ||
    !VALID_POST_STATUSES.has(row.status as NewsroomSocialPostStatus)
  ) {
    return null;
  }

  if (!isValidUuid(row.created_by)) return null;

  let approvedBy: string | null = null;
  if (row.approved_by !== null && row.approved_by !== undefined) {
    if (!isValidUuid(row.approved_by)) return null;
    approvedBy = String(row.approved_by).trim();
  }

  let approvedAt: string | null = null;
  if (row.approved_at !== null && row.approved_at !== undefined) {
    if (!isValidTimestamp(row.approved_at)) return null;
    approvedAt = row.approved_at;
  }

  let publishedAt: string | null = null;
  if (row.published_at !== null && row.published_at !== undefined) {
    if (!isValidTimestamp(row.published_at)) return null;
    publishedAt = row.published_at;
  }

  let providerPostId: string | null = null;
  if (row.provider_post_id !== null && row.provider_post_id !== undefined) {
    if (typeof row.provider_post_id !== "string") return null;
    const trimmed = row.provider_post_id.trim();
    providerPostId = trimmed.length > 0 ? trimmed : null;
  }

  if (!isValidTimestamp(row.created_at)) return null;
  if (!isValidTimestamp(row.updated_at)) return null;

  return {
    id: String(row.id).trim(),
    storyId: String(row.story_id).trim(),
    socialAccountId,
    provider: row.provider.trim().toLowerCase(),
    body: trimmedBody,
    status: row.status as NewsroomSocialPostStatus,
    createdBy: String(row.created_by).trim(),
    approvedBy,
    approvedAt,
    publishedAt,
    providerPostId,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapNewsroomSocialPublicationAttemptRow(
  row: any
): NewsroomSocialPublicationAttempt | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  if (!isValidUuid(row.id)) return null;
  if (!isValidUuid(row.social_post_id)) return null;
  if (!isValidUuid(row.attempted_by)) return null;
  const attemptedBy = String(row.attempted_by).trim();

  if (typeof row.provider !== "string" || row.provider.trim().length === 0) return null;

  if (
    typeof row.status !== "string" ||
    !VALID_ATTEMPT_STATUSES.has(row.status as NewsroomSocialAttemptStatus)
  ) {
    return null;
  }

  let providerPostId: string | null = null;
  if (row.provider_post_id !== null && row.provider_post_id !== undefined) {
    if (typeof row.provider_post_id !== "string") return null;
    const trimmed = row.provider_post_id.trim();
    providerPostId = trimmed.length > 0 ? trimmed : null;
  }

  if (!isValidTimestamp(row.attempted_at)) return null;

  let completedAt: string | null = null;
  if (row.completed_at !== null && row.completed_at !== undefined) {
    if (!isValidTimestamp(row.completed_at)) return null;
    completedAt = row.completed_at;
  }

  let safeReason: string | null = null;
  if (
    row.provider_response &&
    typeof row.provider_response === "object" &&
    !Array.isArray(row.provider_response) &&
    typeof row.provider_response.reason === "string"
  ) {
    const trimmedReason = row.provider_response.reason.trim();
    if (trimmedReason.length > 0) {
      safeReason = trimmedReason.slice(0, 160);
    }
  }

  return {
    id: String(row.id).trim(),
    socialPostId: String(row.social_post_id).trim(),
    attemptedBy,
    provider: row.provider.trim().toLowerCase(),
    status: row.status as NewsroomSocialAttemptStatus,
    providerPostId,
    attemptedAt: row.attempted_at,
    completedAt,
    safeReason
  };
}

export function mapPrepareSocialPublishResponse(
  raw: any
): NewsroomSocialPreparePublishResult | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  if (!isValidUuid(raw.attempt_id)) return null;
  if (typeof raw.provider !== "string" || raw.provider.trim().length === 0) return null;
  if (typeof raw.body !== "string" || raw.body.trim().length === 0) return null;
  if (typeof raw.provider_ready !== "boolean") return null;

  return {
    attemptId: String(raw.attempt_id).trim(),
    provider: raw.provider.trim().toLowerCase(),
    body: raw.body.trim(),
    providerReady: raw.provider_ready
  };
}

export interface SocialSupabaseClientLike {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
}

export function createNewsroomSocialService(
  clientOverride?: SocialSupabaseClientLike
): NewsroomSocialService {
  function getClient(): SocialSupabaseClientLike {
    if (clientOverride) return clientOverride;
    return getStagingSupabaseClient() as unknown as SocialSupabaseClientLike;
  }

  async function callRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const client = getClient();
    const { data, error } = await client.rpc(name, args);
    if (error) {
      throw new NewsroomSocialError(
        error.message || `Social Desk RPC ${name} failed.`,
        "RPC_ERROR"
      );
    }
    return data as T;
  }

  return {
    async listAccounts(): Promise<NewsroomSocialAccount[]> {
      const client = getClient();
      const { data, error } = await client
        .from("social_accounts")
        .select(
          "id, provider, account_label, provider_account_id, environment, status, created_at, updated_at"
        )
        .order("provider", { ascending: true })
        .order("account_label", { ascending: true });

      if (error) {
        throw new NewsroomSocialError(
          error.message || "Failed to load social provider accounts.",
          "QUERY_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new NewsroomSocialError(
          "Invalid response from social_accounts query: expected array envelope.",
          "MALFORMED_ENVELOPE"
        );
      }

      if (data.length === 0) {
        return [];
      }

      const mapped: NewsroomSocialAccount[] = [];
      for (const row of data) {
        const account = mapNewsroomSocialAccountRow(row);
        if (account) mapped.push(account);
      }

      if (mapped.length === 0) {
        throw new NewsroomSocialError(
          "Invalid response from social_accounts query: non-empty payload contained no valid account rows.",
          "MALFORMED_DATA"
        );
      }

      return mapped;
    },

    async listPosts(options?: {
      storyId?: string | null;
      status?: NewsroomSocialPostStatus | null;
      limit?: number;
    }): Promise<NewsroomSocialPost[]> {
      if (options?.storyId !== undefined && options.storyId !== null) {
        if (!isValidUuid(options.storyId)) {
          throw new NewsroomSocialError(
            "Valid canonical story UUID is required when filtering social posts by story.",
            "VALIDATION_ERROR"
          );
        }
      }

      if (options?.status !== undefined && options.status !== null) {
        if (!VALID_POST_STATUSES.has(options.status)) {
          throw new NewsroomSocialError(
            "Invalid social post status filter.",
            "VALIDATION_ERROR"
          );
        }
      }

      const boundedLimit =
        typeof options?.limit === "number" && Number.isInteger(options.limit)
          ? Math.max(1, Math.min(options.limit, 200))
          : 100;

      const client = getClient();
      let query = client
        .from("social_posts")
        .select(
          "id, story_id, social_account_id, provider, body, status, created_by, approved_by, approved_at, published_at, provider_post_id, created_at, updated_at"
        );

      if (options?.storyId) {
        query = query.eq("story_id", options.storyId.trim());
      }
      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .limit(boundedLimit);

      if (error) {
        throw new NewsroomSocialError(
          error.message || "Failed to load social posts.",
          "QUERY_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new NewsroomSocialError(
          "Invalid response from social_posts query: expected array envelope.",
          "MALFORMED_ENVELOPE"
        );
      }

      if (data.length === 0) {
        return [];
      }

      const mapped: NewsroomSocialPost[] = [];
      for (const row of data) {
        const post = mapNewsroomSocialPostRow(row);
        if (post) mapped.push(post);
      }

      if (mapped.length === 0) {
        throw new NewsroomSocialError(
          "Invalid response from social_posts query: non-empty payload contained no valid social post rows.",
          "MALFORMED_DATA"
        );
      }

      return mapped;
    },

    async listPublicationAttempts(
      socialPostId: string
    ): Promise<NewsroomSocialPublicationAttempt[]> {
      if (!isValidUuid(socialPostId)) {
        throw new NewsroomSocialError(
          "Valid canonical social post UUID is required to list publication attempts.",
          "VALIDATION_ERROR"
        );
      }

      const client = getClient();
      const { data, error } = await client
        .from("social_publication_attempts")
        .select(
          "id, social_post_id, attempted_by, provider, status, provider_post_id, provider_response, attempted_at, completed_at"
        )
        .eq("social_post_id", socialPostId.trim())
        .order("attempted_at", { ascending: false })
        .limit(50);

      if (error) {
        throw new NewsroomSocialError(
          error.message || "Failed to load social publication attempts.",
          "QUERY_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new NewsroomSocialError(
          "Invalid response from social_publication_attempts query: expected array envelope.",
          "MALFORMED_ENVELOPE"
        );
      }

      if (data.length === 0) {
        return [];
      }

      const mapped: NewsroomSocialPublicationAttempt[] = [];
      for (const row of data) {
        const attempt = mapNewsroomSocialPublicationAttemptRow(row);
        if (attempt) mapped.push(attempt);
      }

      if (mapped.length === 0) {
        throw new NewsroomSocialError(
          "Invalid response from social_publication_attempts query: non-empty payload contained no valid attempt rows.",
          "MALFORMED_DATA"
        );
      }

      return mapped;
    },

    async createDraft(input: NewsroomSocialDraftCreateInput): Promise<string> {
      const check = validateSocialDraftCreateInput(input);
      if (!check.valid) {
        throw new NewsroomSocialError(
          check.error || "Invalid social draft input.",
          "VALIDATION_ERROR"
        );
      }

      const newId = await callRpc<string>("communications_create_social_draft", {
        p_story_id: input.storyId.trim(),
        p_provider: input.provider.trim().toLowerCase(),
        p_body: input.body.trim(),
        p_social_account_id: input.socialAccountId?.trim() || null
      });

      if (!isValidUuid(newId)) {
        throw new NewsroomSocialError(
          "Invalid response from communications_create_social_draft: expected canonical UUID.",
          "MALFORMED_DATA"
        );
      }

      return String(newId).trim();
    },

    async approvePost(socialPostId: string): Promise<void> {
      if (!isValidUuid(socialPostId)) {
        throw new NewsroomSocialError(
          "Valid canonical social post UUID is required for approval.",
          "VALIDATION_ERROR"
        );
      }

      await callRpc<void>("communications_approve_social_post", {
        p_social_post_id: socialPostId.trim()
      });
    },

    async preparePublish(socialPostId: string): Promise<NewsroomSocialPreparePublishResult> {
      if (!isValidUuid(socialPostId)) {
        throw new NewsroomSocialError(
          "Valid canonical social post UUID is required to prepare publication.",
          "VALIDATION_ERROR"
        );
      }

      const raw = await callRpc<any>("communications_prepare_social_publish", {
        p_social_post_id: socialPostId.trim()
      });

      const mapped = mapPrepareSocialPublishResponse(raw);
      if (!mapped) {
        throw new NewsroomSocialError(
          "Invalid response from communications_prepare_social_publish: malformed handoff payload.",
          "MALFORMED_DATA"
        );
      }

      return mapped;
    }
  };
}

export const stagingNewsroomSocialService: NewsroomSocialService =
  createNewsroomSocialService();
