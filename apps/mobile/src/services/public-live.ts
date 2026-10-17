import type { LiveService } from "../domain/contracts";
import {
  validateVideoHttpsUrl,
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
  let media: MediaRef | null = null;
  const rawMediaId = row.media_id;
  const rawMediaUrl = row.media_public_url;

  const hasValidMediaId = isValidUuid(rawMediaId);
  const hasValidMediaUrl =
    typeof rawMediaUrl === "string" && validateVideoHttpsUrl(rawMediaUrl);

  if (hasValidMediaId && hasValidMediaUrl) {
    const mediaId = String(rawMediaId).trim();
    const mediaUrl = rawMediaUrl.trim();

    const mediaProvenance: SourceProvenance = {
      system: "healthtimes-native",
      sourceId: mediaId,
      stableKey: `newsroom-media:${mediaId}`,
      sourceUrl: mediaUrl,
      checksum: null,
      capturedAt: updatedAt,
      exceptions: []
    };

    media = {
      id: mediaId,
      publicUrl: mediaUrl,
      altText: typeof row.media_alt_text === "string" ? row.media_alt_text : null,
      caption: typeof row.media_caption === "string" ? row.media_caption : null,
      credit: typeof row.media_credit === "string" ? row.media_credit : null,
      sourceProvenance: mediaProvenance
    };
  }

  return {
    id: coverageId,
    title,
    kind,
    status,
    updatedAt,
    updateCount: undefined,
    media,
    sourceProvenance: coverageProvenance
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
    }
  };
}

export const publicLiveService: LiveService = createPublicLiveService();
