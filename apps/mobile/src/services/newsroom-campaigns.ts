import type { NewsroomCampaignService } from "../domain/contracts";
import {
  NEWSROOM_CAMPAIGN_PURPOSES,
  NEWSROOM_CAMPAIGN_STATUSES,
  NEWSROOM_SEGMENT_SYNC_STATES,
  validateCampaignCreateInput,
  type NewsroomCampaign,
  type NewsroomCampaignCreateInput,
  type NewsroomCampaignPrepareSendResult,
  type NewsroomCampaignPurpose,
  type NewsroomCampaignStatus,
  type NewsroomContactSegment,
  type NewsroomSegmentSyncState
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NewsroomCampaignErrorCode =
  | "MALFORMED_ENVELOPE"
  | "MALFORMED_DATA"
  | "VALIDATION_ERROR"
  | "RPC_ERROR"
  | "QUERY_ERROR"
  | "FAIL_CLOSED";

export class NewsroomCampaignError extends Error {
  readonly code: NewsroomCampaignErrorCode;

  constructor(message: string, code: NewsroomCampaignErrorCode = "RPC_ERROR") {
    super(message);
    this.name = "NewsroomCampaignError";
    this.code = code;
  }
}

export function isValidCampaignUuid(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  const parsed = new Date(value);
  return !isNaN(parsed.getTime());
}

const VALID_CAMPAIGN_PURPOSES: ReadonlySet<NewsroomCampaignPurpose> = new Set(
  NEWSROOM_CAMPAIGN_PURPOSES
);

const VALID_CAMPAIGN_STATUSES: ReadonlySet<NewsroomCampaignStatus> = new Set(
  NEWSROOM_CAMPAIGN_STATUSES
);

const VALID_SEGMENT_SYNC_STATES: ReadonlySet<NewsroomSegmentSyncState> =
  new Set(NEWSROOM_SEGMENT_SYNC_STATES);

export function mapNewsroomCampaignRow(row: any): NewsroomCampaign | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  if (!isValidCampaignUuid(row.id)) return null;

  if (typeof row.name !== "string" || row.name.trim().length === 0) {
    return null;
  }

  if (
    typeof row.purpose !== "string" ||
    !VALID_CAMPAIGN_PURPOSES.has(row.purpose as NewsroomCampaignPurpose)
  ) {
    return null;
  }

  if (row.channel !== "email") {
    return null;
  }

  let segmentId: string | null = null;
  if (row.segment_id !== null && row.segment_id !== undefined) {
    if (!isValidCampaignUuid(row.segment_id)) return null;
    segmentId = String(row.segment_id).trim();
  }

  if (row.provider !== "brevo") {
    return null;
  }

  let providerCampaignId: string | null = null;
  if (
    row.provider_campaign_id !== null &&
    row.provider_campaign_id !== undefined
  ) {
    if (typeof row.provider_campaign_id !== "string") return null;
    const trimmed = row.provider_campaign_id.trim();
    providerCampaignId = trimmed.length > 0 ? trimmed : null;
  }

  if (
    typeof row.status !== "string" ||
    !VALID_CAMPAIGN_STATUSES.has(row.status as NewsroomCampaignStatus)
  ) {
    return null;
  }

  if (typeof row.subject !== "string" || row.subject.trim().length === 0) {
    return null;
  }

  let htmlContent: string | null = null;
  if (row.html_content !== null && row.html_content !== undefined) {
    if (typeof row.html_content !== "string") return null;
    const trimmedHtml = row.html_content.trim();
    htmlContent = trimmedHtml.length > 0 ? row.html_content : null;
  }

  let textContent: string | null = null;
  if (row.text_content !== null && row.text_content !== undefined) {
    if (typeof row.text_content !== "string") return null;
    const trimmedText = row.text_content.trim();
    textContent = trimmedText.length > 0 ? row.text_content : null;
  }

  const hasValidContent =
    (htmlContent !== null && htmlContent.trim().length >= 11) ||
    (textContent !== null && textContent.trim().length >= 1);
  if (!hasValidContent) {
    return null;
  }

  let approvedAt: string | null = null;
  if (row.approved_at !== null && row.approved_at !== undefined) {
    if (!isValidTimestamp(row.approved_at)) return null;
    approvedAt = row.approved_at;
  }

  let scheduledAt: string | null = null;
  if (row.scheduled_at !== null && row.scheduled_at !== undefined) {
    if (!isValidTimestamp(row.scheduled_at)) return null;
    scheduledAt = row.scheduled_at;
  }

  let sentAt: string | null = null;
  if (row.sent_at !== null && row.sent_at !== undefined) {
    if (!isValidTimestamp(row.sent_at)) return null;
    sentAt = row.sent_at;
  }

  if (!isValidTimestamp(row.created_at)) return null;
  if (!isValidTimestamp(row.updated_at)) return null;

  return {
    id: String(row.id).trim(),
    name: row.name.trim(),
    purpose: row.purpose as NewsroomCampaignPurpose,
    channel: "email",
    segmentId,
    provider: "brevo",
    providerCampaignId,
    status: row.status as NewsroomCampaignStatus,
    subject: row.subject.trim(),
    htmlContent,
    textContent,
    approvedAt,
    scheduledAt,
    sentAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapNewsroomContactSegmentRow(
  row: any
): NewsroomContactSegment | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  if (!isValidCampaignUuid(row.id)) return null;

  if (typeof row.key !== "string" || row.key.trim().length === 0) {
    return null;
  }

  if (typeof row.name !== "string" || row.name.trim().length === 0) {
    return null;
  }

  let provider: string | null = null;
  if (row.provider !== null && row.provider !== undefined) {
    if (typeof row.provider !== "string") return null;
    const trimmed = row.provider.trim();
    provider = trimmed.length > 0 ? trimmed.toLowerCase() : null;
  }

  let providerSegmentId: string | null = null;
  if (
    row.provider_segment_id !== null &&
    row.provider_segment_id !== undefined
  ) {
    if (typeof row.provider_segment_id !== "string") return null;
    const trimmed = row.provider_segment_id.trim();
    providerSegmentId = trimmed.length > 0 ? trimmed : null;
  }

  if (
    typeof row.sync_state !== "string" ||
    !VALID_SEGMENT_SYNC_STATES.has(row.sync_state as NewsroomSegmentSyncState)
  ) {
    return null;
  }

  if (!isValidTimestamp(row.created_at)) return null;
  if (!isValidTimestamp(row.updated_at)) return null;

  return {
    id: String(row.id).trim(),
    key: row.key.trim(),
    name: row.name.trim(),
    provider,
    providerSegmentId,
    syncState: row.sync_state as NewsroomSegmentSyncState,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapPrepareCampaignSendResponse(
  raw: any
): NewsroomCampaignPrepareSendResult | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  if (!isValidCampaignUuid(raw.campaign_id)) return null;

  if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
    return null;
  }

  if (
    typeof raw.purpose !== "string" ||
    !VALID_CAMPAIGN_PURPOSES.has(raw.purpose as NewsroomCampaignPurpose)
  ) {
    return null;
  }

  if (typeof raw.subject !== "string" || raw.subject.trim().length === 0) {
    return null;
  }

  let htmlContent: string | null = null;
  if (raw.html_content !== null && raw.html_content !== undefined) {
    if (typeof raw.html_content !== "string") return null;
    htmlContent = raw.html_content.trim().length > 0 ? raw.html_content : null;
  }

  let textContent: string | null = null;
  if (raw.text_content !== null && raw.text_content !== undefined) {
    if (typeof raw.text_content !== "string") return null;
    textContent = raw.text_content.trim().length > 0 ? raw.text_content : null;
  }

  if (
    typeof raw.brevo_list_id !== "string" ||
    raw.brevo_list_id.trim().length === 0
  ) {
    return null;
  }

  if (
    typeof raw.eligible_count !== "number" ||
    !Number.isInteger(raw.eligible_count) ||
    raw.eligible_count < 0
  ) {
    return null;
  }

  if (
    typeof raw.no_consent_count !== "number" ||
    !Number.isInteger(raw.no_consent_count) ||
    raw.no_consent_count < 0
  ) {
    return null;
  }

  if (
    typeof raw.suppressed_count !== "number" ||
    !Number.isInteger(raw.suppressed_count) ||
    raw.suppressed_count < 0
  ) {
    return null;
  }

  return {
    campaignId: String(raw.campaign_id).trim(),
    name: raw.name.trim(),
    purpose: raw.purpose as NewsroomCampaignPurpose,
    subject: raw.subject.trim(),
    htmlContent,
    textContent,
    brevoListId: raw.brevo_list_id.trim(),
    eligibleCount: raw.eligible_count,
    noConsentCount: raw.no_consent_count,
    suppressedCount: raw.suppressed_count
  };
}

export interface CampaignSupabaseClientLike {
  from: (table: string) => any;
  rpc: (
    name: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: any; error: any }>;
}

export function createNewsroomCampaignService(
  clientOverride?: CampaignSupabaseClientLike
): NewsroomCampaignService {
  function getClient(): CampaignSupabaseClientLike {
    if (clientOverride) return clientOverride;
    return getStagingSupabaseClient() as unknown as CampaignSupabaseClientLike;
  }

  async function callRpc<T>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    const client = getClient();
    const { data, error } = await client.rpc(name, args);
    if (error) {
      throw new NewsroomCampaignError(
        error.message || `Newsletter Desk RPC ${name} failed.`,
        "RPC_ERROR"
      );
    }
    return data as T;
  }

  return {
    async listCampaigns(options?: {
      status?: NewsroomCampaignStatus | null;
      purpose?: NewsroomCampaignPurpose | null;
      limit?: number;
    }): Promise<NewsroomCampaign[]> {
      if (options?.status !== undefined && options.status !== null) {
        if (!VALID_CAMPAIGN_STATUSES.has(options.status)) {
          throw new NewsroomCampaignError(
            "Invalid campaign status filter.",
            "VALIDATION_ERROR"
          );
        }
      }

      if (options?.purpose !== undefined && options.purpose !== null) {
        if (!VALID_CAMPAIGN_PURPOSES.has(options.purpose)) {
          throw new NewsroomCampaignError(
            "Invalid campaign purpose filter.",
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
        .from("audience_campaigns")
        .select(
          "id, name, purpose, channel, segment_id, provider, provider_campaign_id, status, subject, html_content, text_content, approved_at, scheduled_at, sent_at, created_at, updated_at"
        );

      if (options?.status) {
        query = query.eq("status", options.status);
      }
      if (options?.purpose) {
        query = query.eq("purpose", options.purpose);
      }

      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .limit(boundedLimit);

      if (error) {
        throw new NewsroomCampaignError(
          error.message || "Failed to load audience campaigns.",
          "QUERY_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new NewsroomCampaignError(
          "Invalid response from audience_campaigns query: expected array envelope.",
          "MALFORMED_ENVELOPE"
        );
      }

      if (data.length === 0) {
        return [];
      }

      const mapped: NewsroomCampaign[] = [];
      for (const row of data) {
        const campaign = mapNewsroomCampaignRow(row);
        if (campaign) mapped.push(campaign);
      }

      if (mapped.length === 0) {
        throw new NewsroomCampaignError(
          "Invalid response from audience_campaigns query: non-empty payload contained no valid campaign rows.",
          "MALFORMED_DATA"
        );
      }

      return mapped;
    },

    async listSegments(): Promise<NewsroomContactSegment[]> {
      const client = getClient();
      const { data, error } = await client
        .from("contact_segments")
        .select(
          "id, key, name, provider, provider_segment_id, sync_state, created_at, updated_at"
        )
        .order("name", { ascending: true });

      if (error) {
        throw new NewsroomCampaignError(
          error.message || "Failed to load audience contact segments.",
          "QUERY_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new NewsroomCampaignError(
          "Invalid response from contact_segments query: expected array envelope.",
          "MALFORMED_ENVELOPE"
        );
      }

      if (data.length === 0) {
        return [];
      }

      const mapped: NewsroomContactSegment[] = [];
      for (const row of data) {
        const segment = mapNewsroomContactSegmentRow(row);
        if (segment) mapped.push(segment);
      }

      if (mapped.length === 0) {
        throw new NewsroomCampaignError(
          "Invalid response from contact_segments query: non-empty payload contained no valid segment rows.",
          "MALFORMED_DATA"
        );
      }

      return mapped;
    },

    async createCampaign(input: NewsroomCampaignCreateInput): Promise<string> {
      const check = validateCampaignCreateInput(input);
      if (!check.valid) {
        throw new NewsroomCampaignError(
          check.error || "Invalid campaign create input.",
          "VALIDATION_ERROR"
        );
      }

      const newId = await callRpc<string>("communications_create_campaign", {
        p_name: input.name.trim(),
        p_purpose: input.purpose,
        p_subject: input.subject.trim(),
        p_html_content: input.htmlContent ?? null,
        p_text_content: input.textContent?.trim() || null,
        p_segment_id: input.segmentId.trim()
      });

      if (!isValidCampaignUuid(newId)) {
        throw new NewsroomCampaignError(
          "Invalid response from communications_create_campaign: expected canonical UUID.",
          "MALFORMED_DATA"
        );
      }

      return String(newId).trim();
    },

    async approveCampaign(campaignId: string): Promise<void> {
      if (!isValidCampaignUuid(campaignId)) {
        throw new NewsroomCampaignError(
          "Valid canonical campaign UUID is required for approval.",
          "VALIDATION_ERROR"
        );
      }

      await callRpc<void>("communications_approve_campaign", {
        p_campaign_id: campaignId.trim()
      });
    },

    async prepareSend(
      campaignId: string
    ): Promise<NewsroomCampaignPrepareSendResult> {
      if (!isValidCampaignUuid(campaignId)) {
        throw new NewsroomCampaignError(
          "Valid canonical campaign UUID is required to prepare campaign send.",
          "VALIDATION_ERROR"
        );
      }

      const raw = await callRpc<any>("communications_prepare_campaign_send", {
        p_campaign_id: campaignId.trim()
      });

      const mapped = mapPrepareCampaignSendResponse(raw);
      if (!mapped) {
        throw new NewsroomCampaignError(
          "Invalid response from communications_prepare_campaign_send: malformed handoff payload.",
          "MALFORMED_DATA"
        );
      }

      return mapped;
    }
  };
}

export const stagingNewsroomCampaignService: NewsroomCampaignService =
  createNewsroomCampaignService();
