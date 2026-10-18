import type { NewsroomWhatsAppService } from "../domain/contracts";
import {
  NEWSROOM_WHATSAPP_BROADCAST_STATUSES,
  NEWSROOM_WHATSAPP_BROADCAST_TYPES,
  NEWSROOM_WHATSAPP_DISPATCH_STATUSES,
  validateWhatsAppBroadcastCreateInput,
  type NewsroomWhatsAppBroadcast,
  type NewsroomWhatsAppBroadcastCreateInput,
  type NewsroomWhatsAppBroadcastStatus,
  type NewsroomWhatsAppBroadcastType,
  type NewsroomWhatsAppDispatch,
  type NewsroomWhatsAppDispatchResult,
  type NewsroomWhatsAppDispatchStatus
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NewsroomWhatsAppErrorCode =
  | "MALFORMED_ENVELOPE"
  | "MALFORMED_DATA"
  | "VALIDATION_ERROR"
  | "RPC_ERROR"
  | "FAIL_CLOSED";

export class NewsroomWhatsAppError extends Error {
  readonly code: NewsroomWhatsAppErrorCode;

  constructor(message: string, code: NewsroomWhatsAppErrorCode = "RPC_ERROR") {
    super(message);
    this.name = "NewsroomWhatsAppError";
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

const VALID_TYPES: ReadonlySet<NewsroomWhatsAppBroadcastType> = new Set(
  NEWSROOM_WHATSAPP_BROADCAST_TYPES
);

const VALID_STATUSES: ReadonlySet<NewsroomWhatsAppBroadcastStatus> = new Set(
  NEWSROOM_WHATSAPP_BROADCAST_STATUSES
);

const VALID_DISPATCH_STATUSES: ReadonlySet<NewsroomWhatsAppDispatchStatus> =
  new Set(NEWSROOM_WHATSAPP_DISPATCH_STATUSES);

export function mapNewsroomWhatsAppDispatchRow(
  row: any
): NewsroomWhatsAppDispatch | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  const id = row.id ?? row.dispatch_id;
  if (!isValidUuid(id)) return null;

  const transportStatus = row.transport_status ?? row.transportStatus;
  if (
    typeof transportStatus !== "string" ||
    !VALID_DISPATCH_STATUSES.has(transportStatus as NewsroomWhatsAppDispatchStatus)
  ) {
    return null;
  }

  const broadcastId = row.broadcast_id ?? row.broadcastId;
  const recipientCount = Number(row.recipient_count ?? row.recipientCount ?? 0);
  const acceptedCount = Number(row.accepted_count ?? row.acceptedCount ?? 0);
  const rejectedCount = Number(row.rejected_count ?? row.rejectedCount ?? 0);
  const deliveredCount = Number(row.delivered_count ?? row.deliveredCount ?? 0);
  const readCount = Number(row.read_count ?? row.readCount ?? 0);

  if (
    isNaN(recipientCount) ||
    isNaN(acceptedCount) ||
    isNaN(rejectedCount) ||
    isNaN(deliveredCount) ||
    isNaN(readCount) ||
    recipientCount < 0 ||
    acceptedCount < 0 ||
    rejectedCount < 0 ||
    deliveredCount < 0 ||
    readCount < 0
  ) {
    return null;
  }

  return {
    id: String(id),
    broadcastId: broadcastId ? String(broadcastId) : "",
    transportStatus: transportStatus as NewsroomWhatsAppDispatchStatus,
    provider: String(row.provider ?? "whatsapp_cloud_api"),
    providerBroadcastId: row.provider_broadcast_id ?? row.providerBroadcastId ?? null,
    recipientCount,
    acceptedCount,
    rejectedCount,
    deliveredCount,
    readCount,
    failureReason: row.failure_reason ?? row.failureReason ?? null,
    idempotencyKey: row.idempotency_key ?? row.idempotencyKey ?? undefined,
    dispatchedAt: String(row.dispatched_at ?? row.dispatchedAt ?? new Date().toISOString())
  };
}

export function mapNewsroomWhatsAppBroadcastRow(
  row: any
): NewsroomWhatsAppBroadcast | null {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  if (!isValidUuid(row.id)) return null;

  if (typeof row.title !== "string" || row.title.trim().length === 0) {
    return null;
  }

  if (typeof row.body !== "string" || row.body.trim().length === 0) {
    return null;
  }

  if (
    typeof row.broadcast_type !== "string" ||
    !VALID_TYPES.has(row.broadcast_type as NewsroomWhatsAppBroadcastType)
  ) {
    return null;
  }

  if (
    typeof row.status !== "string" ||
    !VALID_STATUSES.has(row.status as NewsroomWhatsAppBroadcastStatus)
  ) {
    return null;
  }

  let relatedStoryId: string | null = null;
  if (row.related_story_id !== null && row.related_story_id !== undefined) {
    if (!isValidUuid(row.related_story_id)) return null;
    relatedStoryId = String(row.related_story_id).trim();
  }

  let dispatch: NewsroomWhatsAppDispatch | null = null;
  if (row.dispatch && typeof row.dispatch === "object") {
    dispatch = mapNewsroomWhatsAppDispatchRow(row.dispatch);
  }

  return {
    id: String(row.id),
    title: row.title.trim(),
    body: row.body.trim(),
    broadcastType: row.broadcast_type as NewsroomWhatsAppBroadcastType,
    channelIdentity: String(row.channel_identity ?? "healthtimes-whatsapp-channel"),
    relatedStoryId,
    status: row.status as NewsroomWhatsAppBroadcastStatus,
    createdBy: String(row.created_by ?? ""),
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    rejectedBy: row.rejected_by ? String(row.rejected_by) : null,
    approvedAt: isValidTimestamp(row.approved_at) ? row.approved_at : null,
    rejectedAt: isValidTimestamp(row.rejected_at) ? row.rejected_at : null,
    sentAt: isValidTimestamp(row.sent_at) ? row.sent_at : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    createdAt: isValidTimestamp(row.created_at) ? row.created_at : new Date().toISOString(),
    updatedAt: isValidTimestamp(row.updated_at) ? row.updated_at : new Date().toISOString(),
    dispatch
  };
}

export function mapNewsroomWhatsAppDispatchResult(
  data: any
): NewsroomWhatsAppDispatchResult | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const dispatchId = data.dispatch_id ?? data.id;
  const broadcastId = data.broadcast_id;
  const transportStatus = data.transport_status ?? data.status;

  if (!isValidUuid(dispatchId) || !isValidUuid(broadcastId)) return null;

  if (
    typeof transportStatus !== "string" ||
    !VALID_DISPATCH_STATUSES.has(transportStatus as NewsroomWhatsAppDispatchStatus)
  ) {
    return null;
  }

  return {
    dispatch_id: String(dispatchId),
    broadcast_id: String(broadcastId),
    transport_status: transportStatus as NewsroomWhatsAppDispatchStatus,
    recipient_count: Number(data.recipient_count ?? 0),
    accepted_count: Number(data.accepted_count ?? 0),
    rejected_count: Number(data.rejected_count ?? 0),
    delivered_count: Number(data.delivered_count ?? 0),
    read_count: Number(data.read_count ?? 0),
    failure_reason: data.failure_reason ?? null,
    dispatched_at: String(data.dispatched_at ?? new Date().toISOString())
  };
}

export function createNewsroomWhatsAppService(
  clientProvider: () => any
): NewsroomWhatsAppService {
  return {
    async listBroadcasts(options?: {
      status?: NewsroomWhatsAppBroadcastStatus | null;
      broadcastType?: NewsroomWhatsAppBroadcastType | null;
      search?: string | null;
      limit?: number;
    }): Promise<NewsroomWhatsAppBroadcast[]> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomWhatsAppError("Supabase client unavailable.", "FAIL_CLOSED");
      }

      const { data, error } = await client.rpc("newsroom_list_whatsapp_broadcasts");
      if (error) {
        throw new NewsroomWhatsAppError(
          `Failed to list WhatsApp broadcasts: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new NewsroomWhatsAppError(
          "Malformed response from newsroom_list_whatsapp_broadcasts: expected array.",
          "MALFORMED_ENVELOPE"
        );
      }

      let broadcasts: NewsroomWhatsAppBroadcast[] = [];
      for (const item of data) {
        const mapped = mapNewsroomWhatsAppBroadcastRow(item);
        if (!mapped) {
          throw new NewsroomWhatsAppError(
            "Malformed broadcast row received from server.",
            "MALFORMED_DATA"
          );
        }
        broadcasts.push(mapped);
      }

      if (options?.status) {
        broadcasts = broadcasts.filter((b) => b.status === options.status);
      }

      if (options?.broadcastType) {
        broadcasts = broadcasts.filter((b) => b.broadcastType === options.broadcastType);
      }

      if (options?.search && options.search.trim().length > 0) {
        const q = options.search.trim().toLowerCase();
        broadcasts = broadcasts.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.body.toLowerCase().includes(q)
        );
      }

      if (options?.limit && options.limit > 0) {
        broadcasts = broadcasts.slice(0, options.limit);
      }

      return broadcasts;
    },

    async createBroadcast(input: NewsroomWhatsAppBroadcastCreateInput): Promise<string> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomWhatsAppError("Supabase client unavailable.", "FAIL_CLOSED");
      }

      const validation = validateWhatsAppBroadcastCreateInput(input);
      if (!validation.valid) {
        throw new NewsroomWhatsAppError(
          validation.error || "Validation error",
          "VALIDATION_ERROR"
        );
      }

      const { data, error } = await client.rpc(
        "newsroom_create_whatsapp_broadcast",
        {
          p_title: input.title.trim(),
          p_body: input.body.trim(),
          p_broadcast_type: input.broadcast_type,
          p_channel_identity: input.channel_identity?.trim() || "healthtimes-whatsapp-channel",
          p_related_story_id: input.related_story_id?.trim() || null
        }
      );

      if (error) {
        throw new NewsroomWhatsAppError(
          `Failed to create WhatsApp broadcast: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }

      if (!data || typeof data !== "object" || !isValidUuid(data.id)) {
        throw new NewsroomWhatsAppError(
          "Malformed response from newsroom_create_whatsapp_broadcast.",
          "MALFORMED_ENVELOPE"
        );
      }

      return String(data.id);
    },

    async approveBroadcast(broadcastId: string): Promise<void> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomWhatsAppError("Supabase client unavailable.", "FAIL_CLOSED");
      }

      if (!isValidUuid(broadcastId)) {
        throw new NewsroomWhatsAppError(
          "Invalid broadcast ID: valid UUID required.",
          "VALIDATION_ERROR"
        );
      }

      const { error } = await client.rpc("newsroom_approve_whatsapp_broadcast", {
        p_broadcast_id: broadcastId.trim()
      });

      if (error) {
        throw new NewsroomWhatsAppError(
          `Failed to approve WhatsApp broadcast: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }
    },

    async rejectBroadcast(broadcastId: string, reason?: string): Promise<void> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomWhatsAppError("Supabase client unavailable.", "FAIL_CLOSED");
      }

      if (!isValidUuid(broadcastId)) {
        throw new NewsroomWhatsAppError(
          "Invalid broadcast ID: valid UUID required.",
          "VALIDATION_ERROR"
        );
      }

      const { error } = await client.rpc("newsroom_reject_whatsapp_broadcast", {
        p_broadcast_id: broadcastId.trim(),
        p_reason: reason?.trim() || "Editorial rejection"
      });

      if (error) {
        throw new NewsroomWhatsAppError(
          `Failed to reject WhatsApp broadcast: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }
    },

    async getDispatch(broadcastId: string): Promise<NewsroomWhatsAppDispatch | null> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomWhatsAppError("Supabase client unavailable.", "FAIL_CLOSED");
      }

      if (!isValidUuid(broadcastId)) {
        throw new NewsroomWhatsAppError(
          "Invalid broadcast ID: valid UUID required.",
          "VALIDATION_ERROR"
        );
      }

      const { data, error } = await client.rpc(
        "newsroom_get_whatsapp_broadcast_dispatch",
        { p_broadcast_id: broadcastId.trim() }
      );

      if (error) {
        throw new NewsroomWhatsAppError(
          `Failed to get WhatsApp dispatch: ${error.message || "Unknown RPC error"}`,
          "RPC_ERROR"
        );
      }

      if (!data) return null;

      const targetRow = Array.isArray(data)
        ? data.length > 0
          ? data[0]
          : null
        : data;
      if (!targetRow) return null;

      return mapNewsroomWhatsAppDispatchRow(targetRow);
    },

    async dispatchBroadcast(
      broadcastId: string,
      idempotencyKey?: string
    ): Promise<NewsroomWhatsAppDispatchResult> {
      const client = clientProvider();
      if (!client) {
        throw new NewsroomWhatsAppError("Supabase client unavailable.", "FAIL_CLOSED");
      }

      if (!isValidUuid(broadcastId)) {
        throw new NewsroomWhatsAppError(
          "Invalid broadcast ID: valid UUID required.",
          "VALIDATION_ERROR"
        );
      }

      const key =
        idempotencyKey && idempotencyKey.trim().length >= 8
          ? idempotencyKey.trim()
          : `dispatch-wa-${broadcastId.trim()}`;

      let data: any = null;
      let error: any = null;

      if (client.functions && typeof client.functions.invoke === "function") {
        const res = await client.functions.invoke("newsroom-whatsapp-dispatch", {
          body: {
            broadcast_id: broadcastId.trim(),
            idempotency_key: key
          }
        });
        data = res.data;
        error = res.error;
      } else {
        throw new NewsroomWhatsAppError(
          "Functions invoke client unavailable on Supabase client.",
          "FAIL_CLOSED"
        );
      }

      if (error) {
        throw new NewsroomWhatsAppError(
          `WhatsApp dispatch failed: ${error.message || "Unknown error"}`,
          "RPC_ERROR"
        );
      }

      const mapped = mapNewsroomWhatsAppDispatchResult(data);
      if (!mapped) {
        throw new NewsroomWhatsAppError(
          "Malformed response envelope from WhatsApp dispatch.",
          "MALFORMED_ENVELOPE"
        );
      }

      return mapped;
    }
  };
}

export const stagingNewsroomWhatsAppService: NewsroomWhatsAppService =
  createNewsroomWhatsAppService(getStagingSupabaseClient);
