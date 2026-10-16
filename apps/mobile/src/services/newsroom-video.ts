import type { NewsroomVideoService } from "../domain/contracts";
import {
  validateVideoCreateInput,
  validateVideoHttpsUrl,
  validateVideoPatch,
  type NewsroomVideo,
  type NewsroomVideoCreateInput,
  type NewsroomVideoListOptions,
  type NewsroomVideoPatch,
  type NewsroomVideoStatus
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export function mapNewsroomVideoRow(row: any): NewsroomVideo | null {
  if (!row || typeof row !== "object") return null;

  // id: canonical UUID
  if (!isValidUuid(row.id)) return null;

  // title: non-empty trimmed string
  if (typeof row.title !== "string" || row.title.trim().length === 0) return null;

  // source_url: valid canonical public HTTPS destination
  if (typeof row.source_url !== "string" || !validateVideoHttpsUrl(row.source_url)) return null;

  // thumbnail_url: null or valid canonical public HTTPS destination
  let thumbnailUrl: string | null = null;
  if (row.thumbnail_url !== null && row.thumbnail_url !== undefined) {
    if (typeof row.thumbnail_url !== "string" || !validateVideoHttpsUrl(row.thumbnail_url)) {
      return null;
    }
    thumbnailUrl = row.thumbnail_url.trim();
  }

  // duration_seconds: null or finite non-negative integer
  let durationSeconds: number | null = null;
  if (row.duration_seconds !== null && row.duration_seconds !== undefined) {
    if (typeof row.duration_seconds !== "number" || !Number.isInteger(row.duration_seconds) || row.duration_seconds < 0) {
      return null;
    }
    durationSeconds = row.duration_seconds;
  }

  // related_story_id: null or canonical UUID
  let relatedStoryId: string | null = null;
  if (row.related_story_id !== null && row.related_story_id !== undefined) {
    if (!isValidUuid(row.related_story_id)) return null;
    relatedStoryId = String(row.related_story_id).trim();
  }

  // source_provenance: non-empty trimmed string
  if (typeof row.source_provenance !== "string" || row.source_provenance.trim().length === 0) {
    return null;
  }

  // status: exactly "draft" or "ready"
  if (row.status !== "draft" && row.status !== "ready") {
    return null;
  }

  // lock_version: finite integer >= 1
  if (typeof row.lock_version !== "number" || !Number.isInteger(row.lock_version) || row.lock_version < 1) {
    return null;
  }
  const lv = row.lock_version;

  // created_by: canonical UUID
  const createdBy = row.created_by ?? row.created_by_staff_id;
  if (!isValidUuid(createdBy)) return null;

  // updated_by: canonical UUID
  const updatedBy = row.updated_by ?? row.updated_by_staff_id;
  if (!isValidUuid(updatedBy)) return null;

  // created_at: parseable timestamp (no fallback to new Date)
  if (!row.created_at || typeof row.created_at !== "string") return null;
  const ca = new Date(row.created_at);
  if (isNaN(ca.getTime())) return null;

  // updated_at: parseable timestamp (no fallback to new Date)
  if (!row.updated_at || typeof row.updated_at !== "string") return null;
  const ua = new Date(row.updated_at);
  if (isNaN(ua.getTime())) return null;

  return {
    id: String(row.id).trim(),
    title: row.title.trim(),
    sourceUrl: row.source_url.trim(),
    thumbnailUrl,
    durationSeconds,
    relatedStoryId,
    sourceProvenance: row.source_provenance.trim(),
    status: row.status as NewsroomVideoStatus,
    lockVersion: lv,
    createdByStaffId: String(createdBy).trim(),
    updatedByStaffId: String(updatedBy).trim(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = getStagingSupabaseClient() as any;
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message || `Newsroom video RPC ${name} failed.`);
  }
  return data as T;
}

export const stagingNewsroomVideoService: NewsroomVideoService = {
  async listVideos(options?: NewsroomVideoListOptions): Promise<NewsroomVideo[]> {
    const rawRows = await rpc<any[]>("newsroom_list_videos", {
      p_status: options?.status ?? null,
      p_search: options?.search ?? null,
      p_limit: options?.limit ?? 100
    });
    if (!Array.isArray(rawRows)) return [];
    const mapped: NewsroomVideo[] = [];
    for (const r of rawRows) {
      const v = mapNewsroomVideoRow(r);
      if (v) mapped.push(v);
    }
    return mapped;
  },

  async createVideo(input: NewsroomVideoCreateInput): Promise<string> {
    const check = validateVideoCreateInput(input);
    if (!check.valid) {
      throw new Error(check.error || "Invalid video create input.");
    }

    const payload = {
      title: input.title.trim(),
      source_url: input.sourceUrl.trim(),
      thumbnail_url: input.thumbnailUrl?.trim() || null,
      duration_seconds:
        input.durationSeconds !== undefined && input.durationSeconds !== null
          ? input.durationSeconds
          : null,
      related_story_id: input.relatedStoryId?.trim() || null,
      source_provenance: input.sourceProvenance.trim()
    };

    const newId = await rpc<string>("newsroom_create_video", {
      p_video: payload
    });
    if (!newId || typeof newId !== "string" || !isValidUuid(newId)) {
      throw new Error("Invalid response from video create: expected canonical UUID.");
    }
    return String(newId).trim();
  },

  async saveVideo(
    videoId: string,
    expectedVersion: number,
    patch: NewsroomVideoPatch
  ): Promise<number> {
    if (!videoId || typeof videoId !== "string" || !isValidUuid(videoId)) {
      throw new Error("Valid video ID is required for save.");
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error("Valid expected lock version >= 1 is required for save.");
    }
    const check = validateVideoPatch(patch);
    if (!check.valid) {
      throw new Error(check.error || "Invalid video patch.");
    }

    const p_patch: Record<string, unknown> = {};
    if (patch.title !== undefined) p_patch.title = patch.title.trim();
    if (patch.sourceUrl !== undefined) p_patch.source_url = patch.sourceUrl.trim();
    if (patch.thumbnailUrl !== undefined) {
      p_patch.thumbnail_url = patch.thumbnailUrl?.trim() || null;
    }
    if (patch.durationSeconds !== undefined) {
      p_patch.duration_seconds = patch.durationSeconds;
    }
    if (patch.relatedStoryId !== undefined) {
      p_patch.related_story_id = patch.relatedStoryId?.trim() || null;
    }
    if (patch.sourceProvenance !== undefined) {
      p_patch.source_provenance = patch.sourceProvenance.trim();
    }

    const nextVersion = await rpc<number>("newsroom_save_video", {
      p_video_id: videoId,
      p_expected_version: expectedVersion,
      p_patch
    });
    const v = typeof nextVersion === "number" ? nextVersion : Number(nextVersion);
    if (!Number.isInteger(v) || v < 1 || v <= expectedVersion) {
      throw new Error("Invalid response from video save: expected incremented lock version strictly greater than expected version.");
    }
    return v;
  },

  async setReady(
    videoId: string,
    expectedVersion: number,
    ready: boolean
  ): Promise<number> {
    if (!videoId || typeof videoId !== "string" || !isValidUuid(videoId)) {
      throw new Error("Valid video ID is required.");
    }
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error("Valid expected lock version >= 1 is required.");
    }
    const nextVersion = await rpc<number>("newsroom_set_video_ready", {
      p_video_id: videoId,
      p_expected_version: expectedVersion,
      p_ready: Boolean(ready)
    });
    const v = typeof nextVersion === "number" ? nextVersion : Number(nextVersion);
    if (!Number.isInteger(v) || v < 1 || v <= expectedVersion) {
      throw new Error("Invalid response from video setReady: expected incremented lock version strictly greater than expected version.");
    }
    return v;
  }
};
