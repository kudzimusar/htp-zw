import type { NewsroomPushAlertService } from "../domain/contracts";
import {
  NEWSROOM_PUSH_ALERT_CATEGORIES,
  NEWSROOM_PUSH_ALERT_STATUSES,
  validatePushAlertCategory,
  validatePushAlertCreateInput,
  validatePushAlertDestination,
  validatePushAlertPatch,
  type NewsroomPushAlert,
  type NewsroomPushAlertCategory,
  type NewsroomPushAlertCreateInput,
  type NewsroomPushAlertPatch,
  type NewsroomPushAlertPrepareResult,
  type NewsroomPushAlertStatus
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NewsroomPushAlertErrorCode =
  | "MALFORMED_ENVELOPE"
  | "MALFORMED_DATA"
  | "VALIDATION_ERROR"
  | "RPC_ERROR"
  | "FAIL_CLOSED";

export class NewsroomPushAlertError extends Error {
  readonly code: NewsroomPushAlertErrorCode;

  constructor(message: string, code: NewsroomPushAlertErrorCode = "RPC_ERROR") {
    super(message);
    this.name = "NewsroomPushAlertError";
    this.code = code;
  }
}

export function isValidAlertUuid(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  const parsed = new Date(value);
  return !isNaN(parsed.getTime());
}

const VALID_CATEGORIES: ReadonlySet<NewsroomPushAlertCategory> = new Set(
  NEWSROOM_PUSH_ALERT_CATEGORIES
);

const VALID_STATUSES: ReadonlySet<NewsroomPushAlertStatus> = new Set(
  NEWSROOM_PUSH_ALERT_STATUSES
);

export function mapNewsroomPushAlertRow(row: any): NewsroomPushAlert | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  if (!isValidAlertUuid(row.id)) return null;

  if (typeof row.title !== "string" || row.title.trim().length === 0) {
    return null;
  }

  if (typeof row.body !== "string" || row.body.trim().length === 0) {
    return null;
  }

  if (
    typeof row.category !== "string" ||
    !VALID_CATEGORIES.has(row.category as NewsroomPushAlertCategory)
  ) {
    return null;
  }

  let destination: string | null = null;
  if (row.destination !== null && row.destination !== undefined) {
    if (typeof row.destination !== "string") return null;
    const trimmedDest = row.destination.trim();
    if (trimmedDest.length > 0) {
      if (!validatePushAlertDestination(trimmedDest)) return null;
      destination = trimmedDest;
    }
  }

  let relatedStoryId: string | null = null;
  if (row.related_story_id !== null && row.related_story_id !== undefined) {
    if (!isValidAlertUuid(row.related_story_id)) return null;
    relatedStoryId = String(row.related_story_id).trim();
  }

  if (
    typeof row.status !== "string" ||
    !VALID_STATUSES.has(row.status as NewsroomPushAlertStatus)
  ) {
    return null;
  }

  if (typeof row.created_by !== "string" || row.created_by.trim().length === 0) {
    return null;
  }

  if (typeof row.updated_by !== "string" || row.updated_by.trim().length === 0) {
    return null;
  }

  const approvedBy =
    typeof row.approved_by === "string" && row.approved_by.trim().length > 0
      ? row.approved_by.trim()
      : null;

  const preparedBy =
    typeof row.prepared_by === "string" && row.prepared_by.trim().length > 0
      ? row.prepared_by.trim()
      : null;

  const approvedAt = isValidTimestamp(row.approved_at)
    ? row.approved_at
    : null;

  const preparedAt = isValidTimestamp(row.prepared_at)
    ? row.prepared_at
    : null;

  if (!isValidTimestamp(row.created_at) || !isValidTimestamp(row.updated_at)) {
    return null;
  }

  return {
    id: String(row.id).trim(),
    title: row.title.trim(),
    body: row.body.trim(),
    category: row.category as NewsroomPushAlertCategory,
    destination,
    relatedStoryId,
    status: row.status as NewsroomPushAlertStatus,
    createdBy: row.created_by.trim(),
    updatedBy: row.updated_by.trim(),
    approvedBy,
    preparedBy,
    approvedAt,
    preparedAt,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapPreparePushAlertResponse(
  data: any
): NewsroomPushAlertPrepareResult | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  // Strict privacy check: ensure zero private recipient identities leak
  const forbiddenKeys = [
    "expo_push_token",
    "token",
    "token_hash",
    "reader_user_id",
    "email",
    "device_id",
    "device_ids",
    "devices"
  ];
  for (const key of forbiddenKeys) {
    if (key in data) return null;
  }

  if (!isValidAlertUuid(data.alert_id)) return null;

  if (typeof data.title !== "string" || data.title.trim().length === 0) {
    return null;
  }

  if (typeof data.body !== "string" || data.body.trim().length === 0) {
    return null;
  }

  if (
    typeof data.category !== "string" ||
    !VALID_CATEGORIES.has(data.category as NewsroomPushAlertCategory)
  ) {
    return null;
  }

  let destination: string | null = null;
  if (data.destination !== null && data.destination !== undefined) {
    if (typeof data.destination !== "string") return null;
    const trimmedDest = data.destination.trim();
    if (trimmedDest.length > 0) {
      if (!validatePushAlertDestination(trimmedDest)) return null;
      destination = trimmedDest;
    }
  }

  const count = Number(data.eligible_device_count);
  if (!Number.isInteger(count) || count < 0) {
    return null;
  }

  return {
    alert_id: String(data.alert_id).trim(),
    title: data.title.trim(),
    body: data.body.trim(),
    category: data.category as NewsroomPushAlertCategory,
    destination,
    eligible_device_count: count
  };
}

export function createNewsroomPushAlertService(
  clientProvider: () => any
): NewsroomPushAlertService {
  return {
    async listAlerts(options = {}): Promise<NewsroomPushAlert[]> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomPushAlertError(
          "Supabase client unavailable.",
          "FAIL_CLOSED"
        );
      }

      let statusParam: string | null = null;
      if (options.status) {
        if (!VALID_STATUSES.has(options.status)) {
          throw new NewsroomPushAlertError(
            `Invalid push alert status: ${options.status}`,
            "VALIDATION_ERROR"
          );
        }
        statusParam = options.status;
      }

      let categoryParam: string | null = null;
      if (options.category) {
        if (!VALID_CATEGORIES.has(options.category)) {
          throw new NewsroomPushAlertError(
            `Invalid push alert category: ${options.category}`,
            "VALIDATION_ERROR"
          );
        }
        categoryParam = options.category;
      }

      let searchParam: string | null = null;
      if (options.search !== undefined && options.search !== null) {
        const trimmed = options.search.trim();
        if (trimmed.length > 80) {
          throw new NewsroomPushAlertError(
            "Search query must not exceed 80 characters.",
            "VALIDATION_ERROR"
          );
        }
        if (trimmed.length > 0) {
          searchParam = trimmed;
        }
      }

      const limit = Math.max(
        1,
        Math.min(typeof options.limit === "number" ? options.limit : 100, 250)
      );

      const { data, error } = await client.rpc("newsroom_list_push_alerts", {
        p_status: statusParam,
        p_category: categoryParam,
        p_search: searchParam,
        p_limit: limit
      });

      if (error) {
        throw new NewsroomPushAlertError(
          `Failed to list push alerts: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new NewsroomPushAlertError(
          "Malformed response envelope: expected array of push alerts.",
          "MALFORMED_ENVELOPE"
        );
      }

      const results: NewsroomPushAlert[] = [];
      for (const row of data) {
        const mapped = mapNewsroomPushAlertRow(row);
        if (mapped) {
          results.push(mapped);
        }
      }

      return results;
    },

    async createAlert(input: NewsroomPushAlertCreateInput): Promise<string> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomPushAlertError(
          "Supabase client unavailable.",
          "FAIL_CLOSED"
        );
      }

      const validation = validatePushAlertCreateInput(input);
      if (!validation.valid) {
        throw new NewsroomPushAlertError(
          validation.error || "Invalid push alert input.",
          "VALIDATION_ERROR"
        );
      }

      const payload: Record<string, unknown> = {
        title: input.title.trim(),
        body: input.body.trim(),
        category: input.category
      };

      if (input.destination !== undefined && input.destination !== null) {
        payload.destination = input.destination.trim() || null;
      }

      if (
        input.related_story_id !== undefined &&
        input.related_story_id !== null &&
        input.related_story_id.trim().length > 0
      ) {
        payload.related_story_id = input.related_story_id.trim();
      }

      const { data, error } = await client.rpc("newsroom_create_push_alert", {
        p_input: payload
      });

      if (error) {
        throw new NewsroomPushAlertError(
          `Failed to create push alert: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }

      if (!isValidAlertUuid(data)) {
        throw new NewsroomPushAlertError(
          "Malformed response from newsroom_create_push_alert: expected UUID.",
          "MALFORMED_ENVELOPE"
        );
      }

      return String(data).trim();
    },

    async saveAlert(
      alertId: string,
      patch: NewsroomPushAlertPatch
    ): Promise<void> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomPushAlertError(
          "Supabase client unavailable.",
          "FAIL_CLOSED"
        );
      }

      if (!isValidAlertUuid(alertId)) {
        throw new NewsroomPushAlertError(
          "Invalid alert ID: valid UUID required.",
          "VALIDATION_ERROR"
        );
      }

      const validation = validatePushAlertPatch(patch);
      if (!validation.valid) {
        throw new NewsroomPushAlertError(
          validation.error || "Invalid push alert patch.",
          "VALIDATION_ERROR"
        );
      }

      const p_patch: Record<string, unknown> = {};
      if (patch.title !== undefined) {
        p_patch.title = patch.title.trim();
      }
      if (patch.body !== undefined) {
        p_patch.body = patch.body.trim();
      }
      if (patch.category !== undefined) {
        p_patch.category = patch.category;
      }
      if (patch.destination !== undefined) {
        p_patch.destination =
          patch.destination !== null ? patch.destination.trim() || null : null;
      }
      if (patch.related_story_id !== undefined) {
        p_patch.related_story_id =
          patch.related_story_id !== null
            ? patch.related_story_id.trim() || null
            : null;
      }

      const { error } = await client.rpc("newsroom_save_push_alert", {
        p_alert_id: alertId.trim(),
        p_patch
      });

      if (error) {
        throw new NewsroomPushAlertError(
          `Failed to save push alert: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }
    },

    async approveAlert(alertId: string): Promise<void> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomPushAlertError(
          "Supabase client unavailable.",
          "FAIL_CLOSED"
        );
      }

      if (!isValidAlertUuid(alertId)) {
        throw new NewsroomPushAlertError(
          "Invalid alert ID: valid UUID required.",
          "VALIDATION_ERROR"
        );
      }

      const { error } = await client.rpc("newsroom_approve_push_alert", {
        p_alert_id: alertId.trim()
      });

      if (error) {
        throw new NewsroomPushAlertError(
          `Failed to approve push alert: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }
    },

    async prepareAlert(
      alertId: string
    ): Promise<NewsroomPushAlertPrepareResult> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomPushAlertError(
          "Supabase client unavailable.",
          "FAIL_CLOSED"
        );
      }

      if (!isValidAlertUuid(alertId)) {
        throw new NewsroomPushAlertError(
          "Invalid alert ID: valid UUID required.",
          "VALIDATION_ERROR"
        );
      }

      const { data, error } = await client.rpc("newsroom_prepare_push_alert", {
        p_alert_id: alertId.trim()
      });

      if (error) {
        throw new NewsroomPushAlertError(
          `Failed to prepare push alert: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }

      const mapped = mapPreparePushAlertResponse(data);
      if (!mapped) {
        throw new NewsroomPushAlertError(
          "Malformed response from newsroom_prepare_push_alert.",
          "MALFORMED_ENVELOPE"
        );
      }

      return mapped;
    }
  };
}

export const stagingNewsroomPushAlertService: NewsroomPushAlertService =
  createNewsroomPushAlertService(getStagingSupabaseClient);
