import type { LiveService } from "../domain/contracts";
import {
  validateVideoHttpsUrl,
  type LiveBlogUpdate,
  type LiveItem,
  type MediaRef
} from "../domain/models";
import type { SourceProvenance } from "../domain/source";
import { getStagingSupabaseClient } from "../platform/supabase";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export class PublicLiveError extends Error {
  readonly code: string;
  constructor(message: string, code = "PUBLIC_LIVE_ERROR") {
    super(message);
    this.name = "PublicLiveError";
    this.code = code;
  }
}

function mapAtomicPublicMediaTuple(
  rawMediaId: unknown,
  rawMediaUrl: unknown,
  rawAltText: unknown,
  rawCaption: unknown,
  rawCredit: unknown,
  capturedAt: string
): MediaRef | null {
  const hasValidMediaId = isValidUuid(rawMediaId);
  const hasValidMediaUrl =
    typeof rawMediaUrl === "string" && validateVideoHttpsUrl(rawMediaUrl);

  if (!hasValidMediaId || !hasValidMediaUrl) {
    return null;
  }

  const mediaId = String(rawMediaId).trim();
  const mediaUrl = rawMediaUrl.trim();

  const mediaProvenance: SourceProvenance = {
    system: "healthtimes-native",
    sourceId: mediaId,
    stableKey: `newsroom-media:${mediaId}`,
    sourceUrl: mediaUrl,
    checksum: null,
    capturedAt,
    exceptions: []
  };

  return {
    id: mediaId,
    publicUrl: mediaUrl,
    altText: typeof rawAltText === "string" ? rawAltText : null,
    caption: typeof rawCaption === "string" ? rawCaption : null,
    credit: typeof rawCredit === "string" ? rawCredit : null,
    sourceProvenance: mediaProvenance
  };
}

export function mapPublicLiveRow(row: any): LiveItem | null {
  if (!row || typeof row !== "object") return null;

  // id: canonical UUID
  if (!isValidUuid(row.id)) return null;
  const coverageId = String(row.id).trim();

  // title: non-empty trimmed string
  if (typeof row.title !== "string" || row.title.trim().length === 0) return null;
  const title = row.title.trim();

  // kind: live-blog or scheduled (live-video reserved for future task)
  if (row.kind !== "live-blog" && row.kind !== "scheduled") {
    return null;
  }
  const kind = row.kind as "live-blog" | "scheduled";

  // status: live or upcoming (ended rows are excluded from public projection)
  if (row.status !== "live" && row.status !== "upcoming") {
    return null;
  }
  const status = row.status as "live" | "upcoming";

  // updated_at: required parseable timestamp
  if (!row.updated_at || typeof row.updated_at !== "string") return null;
  const ua = new Date(row.updated_at);
  if (isNaN(ua.getTime())) return null;
  const updatedAt = row.updated_at;

  // update_count: optional non-negative integer for live-blog
  let updateCount: number | undefined = undefined;
  if (row.update_count !== undefined && row.update_count !== null) {
    let parsedCount: number | null = null;
    if (
      typeof row.update_count === "number" &&
      Number.isInteger(row.update_count) &&
      row.update_count >= 0
    ) {
      parsedCount = row.update_count;
    } else if (
      typeof row.update_count === "string" &&
      /^\d+$/.test(row.update_count.trim())
    ) {
      parsedCount = Number(row.update_count.trim());
    } else {
      return null;
    }
    if (kind === "live-blog" && parsedCount !== null) {
      updateCount = parsedCount;
    }
  }

  // Canonical native coverage provenance
  const coverageProvenance: SourceProvenance = {
    system: "healthtimes-native",
    sourceId: coverageId,
    stableKey: `newsroom-live:${coverageId}`,
    sourceUrl: null,
    checksum: null,
    capturedAt: updatedAt,
    exceptions: []
  };

  // Safe public media projection: optional atomic tuple
  const media = mapAtomicPublicMediaTuple(
    row.media_id,
    row.media_public_url,
    row.media_alt_text,
    row.media_caption,
    row.media_credit,
    updatedAt
  );

  const summary =
    typeof row.summary === "string" && row.summary.trim().length > 0
      ? row.summary.trim()
      : null;

  return {
    id: coverageId,
    title,
    summary,
    kind,
    status,
    updatedAt,
    updateCount,
    media,
    sourceProvenance: coverageProvenance
  };
}

export function mapPublicLiveUpdateRow(row: any): LiveBlogUpdate | null {
  if (!row || typeof row !== "object") return null;

  if (!isValidUuid(row.id)) return null;
  const updateId = String(row.id).trim();

  if (!isValidUuid(row.coverage_id)) return null;
  const coverageId = String(row.coverage_id).trim();

  let headline: string | null = null;
  if (row.headline !== null && row.headline !== undefined) {
    if (typeof row.headline !== "string") return null;
    const trimmedHeadline = row.headline.trim();
    if (trimmedHeadline.length > 200) return null;
    headline = trimmedHeadline.length > 0 ? trimmedHeadline : null;
  }

  if (typeof row.body !== "string") return null;
  const body = row.body.trim();
  if (body.length === 0 || body.length > 10000) return null;

  if (!row.published_at || typeof row.published_at !== "string") return null;
  const pa = new Date(row.published_at);
  if (isNaN(pa.getTime())) return null;
  const publishedAt = row.published_at;

  const updateProvenance: SourceProvenance = {
    system: "healthtimes-native",
    sourceId: updateId,
    stableKey: `newsroom-live-update:${updateId}`,
    sourceUrl: null,
    checksum: null,
    capturedAt: publishedAt,
    exceptions: []
  };

  const media = mapAtomicPublicMediaTuple(
    row.media_id,
    row.media_public_url,
    row.media_alt_text,
    row.media_caption,
    row.media_credit,
    publishedAt
  );

  return {
    id: updateId,
    coverageId,
    headline,
    body,
    publishedAt,
    media,
    sourceProvenance: updateProvenance
  };
}

export function createPublicLiveService(
  clientOverride?: { rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }> }
): LiveService {
  return {
    async list(): Promise<LiveItem[]> {
      const client = clientOverride || (getStagingSupabaseClient() as any);
      const { data, error } = await client.rpc("newsroom_public_live_coverage", { p_limit: 50 });

      if (error) {
        throw new PublicLiveError(
          error.message || "Failed to fetch public live coverage from server.",
          "RPC_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new PublicLiveError(
          "Invalid response from public live coverage RPC: expected array.",
          "MALFORMED_ENVELOPE"
        );
      }

      // Canonical zero-coverage state: return []
      if (data.length === 0) {
        return [];
      }

      // Non-empty array: map rows strictly
      const validItems: LiveItem[] = [];
      for (const row of data) {
        const item = mapPublicLiveRow(row);
        if (item) {
          validItems.push(item);
        }
      }

      // If raw array was non-empty but every single row was malformed: fail closed
      if (validItems.length === 0) {
        throw new PublicLiveError(
          "All returned public live coverage rows were malformed.",
          "MALFORMED_DATA"
        );
      }

      return validItems;
    },

    async listUpdates(
      coverageId: string,
      options?: { since?: string | null; limit?: number }
    ): Promise<LiveBlogUpdate[]> {
      if (!isValidUuid(coverageId)) {
        throw new PublicLiveError(
          "Invalid live coverage ID: expected canonical UUID.",
          "INVALID_COVERAGE_ID"
        );
      }

      let sinceIso: string | null = null;
      if (options?.since !== undefined && options?.since !== null) {
        if (typeof options.since !== "string" || options.since.trim().length === 0) {
          throw new PublicLiveError(
            "Invalid since timestamp filter.",
            "INVALID_SINCE"
          );
        }
        const parsedSince = new Date(options.since.trim());
        if (isNaN(parsedSince.getTime())) {
          throw new PublicLiveError(
            "Invalid since timestamp filter.",
            "INVALID_SINCE"
          );
        }
        sinceIso = options.since.trim();
      }

      const boundedLimit =
        typeof options?.limit === "number" && Number.isInteger(options.limit)
          ? Math.max(1, Math.min(options.limit, 100))
          : 100;

      const client = clientOverride || (getStagingSupabaseClient() as any);
      const { data, error } = await client.rpc("newsroom_public_live_updates", {
        p_coverage_id: coverageId.trim(),
        p_since: sinceIso,
        p_limit: boundedLimit
      });

      if (error) {
        throw new PublicLiveError(
          error.message || "Failed to fetch public live blog updates from server.",
          "RPC_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new PublicLiveError(
          "Invalid response from public live updates RPC: expected array.",
          "MALFORMED_ENVELOPE"
        );
      }

      if (data.length === 0) {
        return [];
      }

      const validUpdates: LiveBlogUpdate[] = [];
      for (const row of data) {
        const mapped = mapPublicLiveUpdateRow(row);
        if (mapped) {
          validUpdates.push(mapped);
        }
      }

      if (validUpdates.length === 0) {
        throw new PublicLiveError(
          "All returned public live update rows were malformed.",
          "MALFORMED_DATA"
        );
      }

      return validUpdates;
    }
  };
}

export const publicLiveService: LiveService = createPublicLiveService();

