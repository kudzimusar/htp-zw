import type { NewsroomMediaService } from "../domain/contracts";
import {
  classifyMediaMimeType,
  deriveStorageCustodyCategory,
  isValidSha256Checksum,
  validateStoryMediaUpload,
  type NewsroomMediaAsset,
  type NewsroomMediaMetadataPatch,
  type NewsroomMediaPreview,
  type NewsroomMediaUsage,
  type PrepareStoryMediaPayload,
  type StoryMediaPreparation,
  type StoryMediaPromotionItem,
  type StoryMediaStageResult,
  type StoryMediaUploadContext,
  type StoryMediaUsageType
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const canonicalIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCanonicalUuid(value: unknown): value is string {
  return typeof value === "string" && canonicalIdPattern.test(value.trim());
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  const t = Date.parse(value);
  return !isNaN(t);
}

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

export function mapMediaAssetRow(row: any): NewsroomMediaAsset | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  // Required: canonical UUID id
  if (!isCanonicalUuid(row.id)) {
    return null;
  }

  // Required: non-empty mime_type
  if (typeof row.mime_type !== "string" || row.mime_type.trim() === "") {
    return null;
  }

  // Required: non-empty filename
  if (typeof row.filename !== "string" || row.filename.trim() === "") {
    return null;
  }

  // Required: non-empty status
  if (typeof row.status !== "string" || row.status.trim() === "") {
    return null;
  }

  // Required: parseable created_at
  if (!isValidIsoDate(row.created_at)) {
    return null;
  }

  // Required: parseable updated_at
  if (!isValidIsoDate(row.updated_at)) {
    return null;
  }

  const usages: NewsroomMediaUsage[] = [];
  if (Array.isArray(row.usage)) {
    for (const u of row.usage) {
      if (u && typeof u === "object" && isCanonicalUuid(u.story_id)) {
        const sourceContext =
          u.source_context &&
          typeof u.source_context === "object" &&
          !Array.isArray(u.source_context)
            ? (u.source_context as Record<string, unknown>)
            : null;

        usages.push({
          storyId: u.story_id,
          usageType:
            typeof u.usage_type === "string" && u.usage_type.trim() !== ""
              ? u.usage_type.trim()
              : "featured",
          sourceContext
        });
      }
    }
  }

  const width =
    typeof row.width === "number" && Number.isFinite(row.width)
      ? row.width
      : null;

  const height =
    typeof row.height === "number" && Number.isFinite(row.height)
      ? row.height
      : null;

  let byteSize: number | null = null;
  if (
    typeof row.byte_size === "number" &&
    Number.isFinite(row.byte_size) &&
    row.byte_size >= 0
  ) {
    byteSize = row.byte_size;
  }

  const asset: NewsroomMediaAsset = {
    id: row.id,
    sourceUrl: typeof row.source_url === "string" && row.source_url.trim() !== "" ? row.source_url.trim() : null,
    storageBucket: typeof row.storage_bucket === "string" && row.storage_bucket.trim() !== "" ? row.storage_bucket.trim() : null,
    storageKey: typeof row.storage_key === "string" && row.storage_key.trim() !== "" ? row.storage_key.trim() : null,
    publicUrl: typeof row.public_url === "string" && row.public_url.trim() !== "" ? row.public_url.trim() : null,
    checksum: typeof row.checksum === "string" && row.checksum.trim() !== "" ? row.checksum.trim() : null,
    mimeType: row.mime_type.trim(),
    filename: row.filename.trim(),
    altText: typeof row.alt_text === "string" && row.alt_text.trim() !== "" ? row.alt_text.trim() : null,
    caption: typeof row.caption === "string" && row.caption.trim() !== "" ? row.caption.trim() : null,
    credit: typeof row.credit === "string" && row.credit.trim() !== "" ? row.credit.trim() : null,
    width,
    height,
    status: row.status.trim(),
    byteSize,
    sourceProvenance: typeof row.source_provenance === "string" && row.source_provenance.trim() !== "" ? row.source_provenance.trim() : null,
    uploadedByStaffId: typeof row.uploaded_by_staff_id === "string" && row.uploaded_by_staff_id.trim() !== "" ? row.uploaded_by_staff_id.trim() : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  const mediaId = data.media_id ?? data.id;
  if (!isCanonicalUuid(mediaId)) {
    throw new Error("Invalid media preview: valid media UUID required.");
  }

  if (typeof data.mime_type !== "string" || data.mime_type.trim() === "") {
    throw new Error("Invalid media preview: non-empty mime_type required.");
  }

  if (typeof data.filename !== "string" || data.filename.trim() === "") {
    throw new Error("Invalid media preview: non-empty filename required.");
  }

  if (typeof data.status !== "string" || data.status.trim() === "") {
    throw new Error("Invalid media preview: non-empty status required.");
  }

  return {
    mediaId,
    storageBucket: typeof data.storage_bucket === "string" && data.storage_bucket.trim() !== "" ? data.storage_bucket.trim() : null,
    storageKey: typeof data.storage_key === "string" && data.storage_key.trim() !== "" ? data.storage_key.trim() : null,
    mimeType: data.mime_type.trim(),
    filename: data.filename.trim(),
    status: data.status.trim(),
    publicUrl: typeof data.public_url === "string" && data.public_url.trim() !== "" ? data.public_url.trim() : null
  };
}

export const stagingNewsroomMediaService: NewsroomMediaService = {
  async listMedia(
    searchOrOptions?: string | null | { search?: string | null; limit?: number },
    limit?: number
  ): Promise<NewsroomMediaAsset[]> {
    let resolvedSearch: string | null = null;
    let resolvedLimit: number = 100;

    if (searchOrOptions && typeof searchOrOptions === "object") {
      if (typeof searchOrOptions.search === "string" && searchOrOptions.search.trim() !== "") {
        resolvedSearch = searchOrOptions.search.trim();
      }
      if (typeof searchOrOptions.limit === "number") {
        resolvedLimit = searchOrOptions.limit;
      }
    } else if (typeof searchOrOptions === "string" && searchOrOptions.trim() !== "") {
      resolvedSearch = searchOrOptions.trim();
      if (typeof limit === "number") {
        resolvedLimit = limit;
      }
    } else if (typeof limit === "number") {
      resolvedLimit = limit;
    }

    const p_search = resolvedSearch;
    const p_limit = resolvedLimit;
    const rows = await rpc<any[]>("newsroom_list_media", { p_search, p_limit });
    if (!Array.isArray(rows)) {
      return [];
    }
    const assets: NewsroomMediaAsset[] = [];
    for (const r of rows) {
      const mapped = mapMediaAssetRow(r);
      if (mapped) {
        assets.push(mapped);
      }
    }
    return assets;
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
  },

  async prepareStoryMedia(
    storyId: string,
    payload: PrepareStoryMediaPayload
  ): Promise<StoryMediaPreparation> {
    const validStoryId = requireCanonicalId(storyId, "story");
    const validation = validateStoryMediaUpload(payload);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid Story media upload payload.");
    }

    const res = await rpc<any>("newsroom_prepare_story_media", {
      p_story_id: validStoryId,
      p_filename: payload.filename,
      p_mime_type: payload.mimeType,
      p_byte_size: payload.byteSize,
      p_checksum: payload.checksum || null,
      p_alt_text: payload.altText || null,
      p_caption: payload.caption || null,
      p_credit: payload.credit || null,
      p_source_provenance: payload.sourceProvenance,
      p_usage_type: payload.usageType
    });

    if (!res || typeof res !== "object") {
      throw new Error("Failed to prepare Story media: invalid response from server.");
    }

    return {
      mediaId: String(res.media_id),
      storyId: String(res.story_id),
      usageType: String(res.usage_type) as StoryMediaUsageType,
      storageBucket: String(res.storage_bucket),
      storageKey: String(res.storage_key),
      filename: String(res.filename),
      mimeType: String(res.mime_type),
      byteSize: Number(res.byte_size),
      status: String(res.status)
    };
  },

  async getUploadContext(
    mediaId: string,
    storyId: string
  ): Promise<StoryMediaUploadContext> {
    const validMediaId = requireCanonicalId(mediaId, "media");
    const validStoryId = requireCanonicalId(storyId, "story");

    const res = await rpc<any>("newsroom_media_upload_context", {
      p_media_id: validMediaId,
      p_story_id: validStoryId
    });

    if (!res || typeof res !== "object") {
      throw new Error("Failed to retrieve upload context: invalid response.");
    }

    return {
      mediaId: String(res.media_id),
      storyId: String(res.story_id),
      storageBucket: String(res.storage_bucket),
      storageKey: String(res.storage_key),
      filename: String(res.filename),
      mimeType: String(res.mime_type),
      byteSize: Number(res.byte_size)
    };
  },

  async finalizeStoryMedia(
    mediaId: string,
    storyId: string,
    usageType: StoryMediaUsageType,
    checksum?: string | null
  ): Promise<{ mediaId: string; storyId: string; usageType: StoryMediaUsageType; status: string }> {
    const validMediaId = requireCanonicalId(mediaId, "media");
    const validStoryId = requireCanonicalId(storyId, "story");

    const res = await rpc<any>("newsroom_finalize_story_media", {
      p_media_id: validMediaId,
      p_story_id: validStoryId,
      p_usage_type: usageType,
      p_checksum: checksum || null
    });

    if (!res || typeof res !== "object") {
      throw new Error("Failed to finalize Story media: invalid response.");
    }

    return {
      mediaId: String(res.media_id),
      storyId: String(res.story_id),
      usageType: String(res.usage_type) as StoryMediaUsageType,
      status: String(res.status)
    };
  },

  async attachStoryMedia(
    mediaId: string,
    storyId: string,
    usageType: StoryMediaUsageType
  ): Promise<void> {
    const validMediaId = requireCanonicalId(mediaId, "media");
    const validStoryId = requireCanonicalId(storyId, "story");

    await rpc("newsroom_attach_story_media", {
      p_media_id: validMediaId,
      p_story_id: validStoryId,
      p_usage_type: usageType
    });
  },

  async detachStoryMedia(
    mediaId: string,
    storyId: string,
    usageType: StoryMediaUsageType
  ): Promise<void> {
    const validMediaId = requireCanonicalId(mediaId, "media");
    const validStoryId = requireCanonicalId(storyId, "story");

    await rpc("newsroom_detach_story_media", {
      p_media_id: validMediaId,
      p_story_id: validStoryId,
      p_usage_type: usageType
    });
  },

  async getPromotionPlan(storyId: string): Promise<StoryMediaPromotionItem[]> {
    const validStoryId = requireCanonicalId(storyId, "story");

    const rows = await rpc<any[]>("newsroom_story_media_promotion_plan", {
      p_story_id: validStoryId
    });

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((r) => ({
      mediaId: String(r.media_id),
      usageType: String(r.usage_type),
      privateBucket: String(r.private_bucket),
      privateKey: String(r.private_key),
      filename: String(r.filename),
      mimeType: String(r.mime_type),
      byteSize: Number(r.byte_size),
      checksum: r.checksum ? String(r.checksum) : null,
      publicStorageBucket: r.public_storage_bucket ? String(r.public_storage_bucket) : null,
      publicStorageKey: r.public_storage_key ? String(r.public_storage_key) : null,
      publicUrl: r.public_url ? String(r.public_url) : null,
      mediaStatus: String(r.media_status)
    }));
  },

  async stagePromotion(
    storyId: string,
    mediaId: string,
    publicStorageKey: string,
    verifiedChecksum: string
  ): Promise<StoryMediaStageResult> {
    const validStoryId = requireCanonicalId(storyId, "story");
    const validMediaId = requireCanonicalId(mediaId, "media");

    if (!isValidSha256Checksum(verifiedChecksum)) {
      throw new Error("Verified SHA-256 checksum is required (64 lowercase hex characters).");
    }

    if (!publicStorageKey || !publicStorageKey.startsWith("story-media/")) {
      throw new Error("Invalid public storage key: must follow canonical story-media/ path format.");
    }

    const res = await rpc<any>("newsroom_stage_story_media_promotion", {
      p_story_id: validStoryId,
      p_media_id: validMediaId,
      p_public_storage_key: publicStorageKey,
      p_verified_checksum: verifiedChecksum
    });

    if (!res || typeof res !== "object") {
      throw new Error("Failed to stage Story media promotion: invalid response.");
    }

    return {
      mediaId: String(res.media_id),
      usageType: String(res.usage_type),
      status: String(res.status),
      publicStorageBucket: String(res.public_storage_bucket),
      publicStorageKey: String(res.public_storage_key),
      publicUrl: String(res.public_url),
      checksum: String(res.checksum)
    };
  },

  async clearStagedPromotion(storyId: string, mediaId: string): Promise<void> {
    const validStoryId = requireCanonicalId(storyId, "story");
    const validMediaId = requireCanonicalId(mediaId, "media");

    await rpc("newsroom_clear_staged_story_media", {
      p_story_id: validStoryId,
      p_media_id: validMediaId
    });
  }
};
