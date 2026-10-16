import type { NewsroomMediaService } from "../domain/contracts";
import {
  classifyMediaMimeType,
  deriveStorageCustodyCategory,
  type NewsroomMediaAsset,
  type NewsroomMediaMetadataPatch,
  type NewsroomMediaPreview,
  type NewsroomMediaUsage
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const canonicalIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireCanonicalId(value: string | null | undefined, label: string): string {
  if (!value || !canonicalIdPattern.test(value)) {
    throw new Error(`Valid ${label} UUID is required.`);
  }
  return value;
}

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = getStagingSupabaseClient() as any;
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message || `HealthTimes media RPC ${name} failed.`);
  }
  return data as T;
}

export function mapMediaAssetRow(row: any): NewsroomMediaAsset {
  if (!row || typeof row !== "object") {
    throw new Error("Invalid media asset row: object expected.");
  }

  const mimeType = String(row.mime_type ?? "application/octet-stream");
  const usages: NewsroomMediaUsage[] = [];

  if (Array.isArray(row.usage)) {
    for (const u of row.usage) {
      if (u && typeof u === "object" && u.story_id) {
        usages.push({
          storyId: String(u.story_id),
          usageType: String(u.usage_type ?? "featured"),
          sourceContext: u.source_context ? String(u.source_context) : null
        });
      }
    }
  }

  const asset: NewsroomMediaAsset = {
    id: String(row.id),
    sourceUrl: row.source_url ? String(row.source_url) : null,
    storageBucket: row.storage_bucket ? String(row.storage_bucket) : null,
    storageKey: row.storage_key ? String(row.storage_key) : null,
    publicUrl: row.public_url ? String(row.public_url) : null,
    checksum: row.checksum ? String(row.checksum) : null,
    mimeType,
    filename: String(row.filename ?? "untitled"),
    altText: row.alt_text ? String(row.alt_text) : null,
    caption: row.caption ? String(row.caption) : null,
    credit: row.credit ? String(row.credit) : null,
    width: typeof row.width === "number" ? row.width : null,
    height: typeof row.height === "number" ? row.height : null,
    status: String(row.status ?? "pending"),
    byteSize:
      typeof row.byte_size === "number"
        ? row.byte_size
        : row.byte_size != null
          ? Number(row.byte_size)
          : null,
    sourceProvenance: row.source_provenance ? String(row.source_provenance) : null,
    uploadedByStaffId: row.uploaded_by_staff_id ? String(row.uploaded_by_staff_id) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    usage: usages
  };

  asset.typeGroup = classifyMediaMimeType(asset.mimeType);
  asset.storageCustodyCategory = deriveStorageCustodyCategory(asset);
  return asset;
}

export function mapMediaPreview(data: any): NewsroomMediaPreview {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid media preview: object expected.");
  }
  return {
    mediaId: String(data.media_id ?? data.id ?? ""),
    storageBucket: data.storage_bucket ? String(data.storage_bucket) : null,
    storageKey: data.storage_key ? String(data.storage_key) : null,
    mimeType: String(data.mime_type ?? "application/octet-stream"),
    filename: String(data.filename ?? "untitled"),
    status: String(data.status ?? "pending"),
    publicUrl: data.public_url ? String(data.public_url) : null
  };
}

export const stagingNewsroomMediaService: NewsroomMediaService = {
  async listMedia(search?: string | null, limit?: number): Promise<NewsroomMediaAsset[]> {
    const p_search = search && search.trim() !== "" ? search.trim() : null;
    const p_limit = limit !== undefined ? limit : 100;
    const rows = await rpc<any[]>("newsroom_list_media", { p_search, p_limit });
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map(mapMediaAssetRow);
  },

  async getMediaPreview(mediaId: string): Promise<NewsroomMediaPreview> {
    const validId = requireCanonicalId(mediaId, "media");
    const result = await rpc<any>("newsroom_get_media_preview", { p_media_id: validId });
    return mapMediaPreview(result);
  },

  async updateMediaMetadata(
    mediaId: string,
    patch: NewsroomMediaMetadataPatch
  ): Promise<void> {
    const validId = requireCanonicalId(mediaId, "media");
    await rpc("newsroom_update_story_media_metadata", {
      p_media_id: validId,
      p_alt_text: patch.altText !== undefined ? patch.altText : null,
      p_caption: patch.caption !== undefined ? patch.caption : null,
      p_credit: patch.credit !== undefined ? patch.credit : null,
      p_source_provenance: patch.sourceProvenance !== undefined ? patch.sourceProvenance : null
    });
  }
};
