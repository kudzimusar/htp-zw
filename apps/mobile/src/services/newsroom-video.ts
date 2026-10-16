import type { NewsroomVideoService } from "../domain/contracts";
import {
  validateVideoCreateInput,
  validateVideoPatch,
  type NewsroomVideo,
  type NewsroomVideoCreateInput,
  type NewsroomVideoListOptions,
  type NewsroomVideoPatch,
  type NewsroomVideoStatus
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

export function mapNewsroomVideoRow(row: any): NewsroomVideo | null {
  if (!row || typeof row !== "object") return null;
  if (!row.id || typeof row.id !== "string") return null;
  if (!row.title || typeof row.title !== "string") return null;
  if (!row.source_url || typeof row.source_url !== "string") return null;

  return {
    id: String(row.id),
    title: String(row.title),
    sourceUrl: String(row.source_url),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    durationSeconds:
      row.duration_seconds !== null && row.duration_seconds !== undefined
        ? Number(row.duration_seconds)
        : null,
    relatedStoryId: row.related_story_id ? String(row.related_story_id) : null,
    sourceProvenance: String(row.source_provenance ?? ""),
    status: (row.status === "ready" ? "ready" : "draft") as NewsroomVideoStatus,
    lockVersion: Number(row.lock_version ?? 1),
    createdByStaffId: String(row.created_by ?? ""),
    updatedByStaffId: String(row.updated_by ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString())
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
    return String(newId);
  },

  async saveVideo(
    videoId: string,
    expectedVersion: number,
    patch: NewsroomVideoPatch
  ): Promise<number> {
    if (!videoId || typeof videoId !== "string") {
      throw new Error("Valid video ID is required for save.");
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
    return Number(nextVersion);
  },

  async setReady(
    videoId: string,
    expectedVersion: number,
    ready: boolean
  ): Promise<number> {
    if (!videoId || typeof videoId !== "string") {
      throw new Error("Valid video ID is required.");
    }
    const nextVersion = await rpc<number>("newsroom_set_video_ready", {
      p_video_id: videoId,
      p_expected_version: expectedVersion,
      p_ready: Boolean(ready)
    });
    return Number(nextVersion);
  }
};
