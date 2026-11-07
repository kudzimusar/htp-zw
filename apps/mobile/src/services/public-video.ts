import type { VideoService } from "../domain/contracts";
import {
  validateVideoHttpsUrl,
  type MediaRef,
  type VideoItem
} from "../domain/models";
import type { SourceProvenance } from "../domain/source";
import { getStagingSupabaseClient } from "../platform/supabase";
import { sourceParityServices } from "./source-parity";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export class PublicVideoError extends Error {
  readonly code: string;
  constructor(message: string, code = "PUBLIC_VIDEO_ERROR") {
    super(message);
    this.name = "PublicVideoError";
    this.code = code;
  }
}

export function mapPublicVideoRow(row: any): VideoItem | null {
  if (!row || typeof row !== "object") return null;

  // id: canonical UUID
  if (!isValidUuid(row.id)) return null;
  const videoId = String(row.id).trim();

  // title: non-empty trimmed string
  if (typeof row.title !== "string" || row.title.trim().length === 0) return null;
  const title = row.title.trim();

  // source_url: validated canonical public HTTPS URL
  if (typeof row.source_url !== "string" || !validateVideoHttpsUrl(row.source_url)) {
    return null;
  }
  const sourceUrl = row.source_url.trim();

  // duration_seconds: null or finite non-negative integer
  let durationSeconds: number | null = null;
  if (row.duration_seconds !== null && row.duration_seconds !== undefined) {
    if (
      typeof row.duration_seconds !== "number" ||
      !Number.isInteger(row.duration_seconds) ||
      row.duration_seconds < 0
    ) {
      return null;
    }
    durationSeconds = row.duration_seconds;
  }

  // published_at: required parseable timestamp
  if (!row.published_at || typeof row.published_at !== "string") return null;
  const pa = new Date(row.published_at);
  if (isNaN(pa.getTime())) return null;
  const publishedAt = row.published_at;

  // related_article_id / related_story_id: null or canonical UUID
  let relatedArticleId: string | null = null;
  const rawStoryId = row.related_story_id ?? row.related_article_id;
  if (rawStoryId !== null && rawStoryId !== undefined) {
    if (!isValidUuid(rawStoryId)) return null;
    relatedArticleId = String(rawStoryId).trim();
  }

  // Canonical native provenance
  const nativeProvenance: SourceProvenance = {
    system: "healthtimes-native",
    sourceId: videoId,
    stableKey: `newsroom-video:${videoId}`,
    sourceUrl,
    checksum: null,
    capturedAt: publishedAt,
    exceptions: []
  };

  // thumbnail: if thumbnail_url exists and is valid HTTPS destination
  let thumbnail: MediaRef | null = null;
  if (row.thumbnail_url !== null && row.thumbnail_url !== undefined) {
    if (typeof row.thumbnail_url !== "string" || !validateVideoHttpsUrl(row.thumbnail_url)) {
      return null;
    }
    thumbnail = {
      id: `newsroom-video-thumbnail:${videoId}`,
      publicUrl: row.thumbnail_url.trim(),
      altText: null,
      caption: null,
      credit: null,
      sourceProvenance: nativeProvenance
    };
  }

  return {
    id: videoId,
    title,
    durationSeconds,
    publishedAt,
    thumbnail,
    sourceUrl,
    relatedArticleId,
    sourceProvenance: nativeProvenance
  };
}

export function createPublicVideoService(
  clientOverride?: { rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }> },
  fallbackService: VideoService = sourceParityServices.video
): VideoService {
  return {
    async list(): Promise<VideoItem[]> {
      const client = clientOverride || (getStagingSupabaseClient() as any);
      const { data, error } = await client.rpc("newsroom_public_videos", { p_limit: 50 });

      if (error) {
        throw new PublicVideoError(
          error.message || "Failed to fetch public videos from server.",
          "RPC_ERROR"
        );
      }

      if (!Array.isArray(data)) {
        throw new PublicVideoError(
          "Invalid response from public videos RPC: expected array.",
          "MALFORMED_ENVELOPE"
        );
      }

      // Canonical zero-publication state: Fall back to source-parity inventory
      if (data.length === 0) {
        return fallbackService.list();
      }

      // Non-empty array: map rows strictly
      const validItems: VideoItem[] = [];
      for (const row of data) {
        const item = mapPublicVideoRow(row);
        if (item) {
          validItems.push(item);
        }
      }

      // If raw array was non-empty but every single row was malformed: fail closed
      if (validItems.length === 0) {
        throw new PublicVideoError(
          "All returned public video rows were malformed.",
          "MALFORMED_DATA"
        );
      }

      // When one or more canonical published videos exist, return ONLY canonical items
      return validItems;
    }
  };
}

export const publicVideoService: VideoService = createPublicVideoService();
