import type { NewsroomLiveCoverageService } from "../domain/contracts";
import {
  validateLiveCoverageCreateInput,
  validateLiveCoveragePatch,
  validateLiveUpdateCreateInput,
  type NewsroomLiveCoverage,
  type NewsroomLiveCoverageCreateInput,
  type NewsroomLiveCoverageKind,
  type NewsroomLiveCoverageListOptions,
  type NewsroomLiveCoveragePatch,
  type NewsroomLiveCoverageStatus,
  type NewsroomLiveUpdate,
  type NewsroomLiveUpdateCreateInput
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

export function mapNewsroomLiveUpdateRow(row: any): NewsroomLiveUpdate | null {
  if (!row || typeof row !== "object") return null;

  if (!isValidUuid(row.id)) return null;
  if (!isValidUuid(row.coverage_id)) return null;

  let headline: string | null = null;
  if (row.headline !== null && row.headline !== undefined) {
    if (typeof row.headline !== "string") return null;
    const trimmedHeadline = row.headline.trim();
    if (trimmedHeadline.length > 200) return null;
    headline = trimmedHeadline.length > 0 ? trimmedHeadline : null;
  }

  if (typeof row.body !== "string") return null;
  const trimmedBody = row.body.trim();
  if (trimmedBody.length === 0 || trimmedBody.length > 10000) return null;

  let mediaId: string | null = null;
  if (row.media_id !== null && row.media_id !== undefined) {
    if (!isValidUuid(row.media_id)) return null;
    mediaId = String(row.media_id).trim();
  }

  if (!row.published_at || typeof row.published_at !== "string") return null;
  const pa = new Date(row.published_at);
  if (isNaN(pa.getTime())) return null;

  const createdBy = row.author_staff_id ?? row.created_by ?? row.created_by_staff_id;
  if (!isValidUuid(createdBy)) return null;

  if (!row.created_at || typeof row.created_at !== "string") return null;
  const ca = new Date(row.created_at);
  if (isNaN(ca.getTime())) return null;

  return {
    id: String(row.id).trim(),
    coverageId: String(row.coverage_id).trim(),
    headline,
    body: trimmedBody,
    mediaId,
    publishedAt: row.published_at,
    authorStaffId: String(createdBy).trim(),
    createdByStaffId: String(createdBy).trim(),
    createdAt: row.created_at
  };
}

export function mapNewsroomLiveCoverageRow(row: any): NewsroomLiveCoverage | null {
  if (!row || typeof row !== "object") return null;

  // id: canonical UUID
  if (!isValidUuid(row.id)) return null;

  // title: non-empty trimmed string
  if (typeof row.title !== "string" || row.title.trim().length === 0) return null;

  // kind: exactly "live-blog" or "scheduled"
  if (row.kind !== "live-blog" && row.kind !== "scheduled") {
    return null;
  }

  // status: exactly "upcoming", "live", or "ended"
  if (row.status !== "upcoming" && row.status !== "live" && row.status !== "ended") {
    return null;
  }

  // scheduled_at: null or parseable timestamp
  let scheduledAt: string | null = null;
  if (row.scheduled_at !== null && row.scheduled_at !== undefined) {
    if (typeof row.scheduled_at !== "string") return null;
    const d = new Date(row.scheduled_at);
    if (isNaN(d.getTime())) return null;
    scheduledAt = row.scheduled_at;
  }

  // started_at: null or parseable timestamp
  let startedAt: string | null = null;
  if (row.started_at !== null && row.started_at !== undefined) {
    if (typeof row.started_at !== "string") return null;
    const d = new Date(row.started_at);
    if (isNaN(d.getTime())) return null;
    startedAt = row.started_at;
  }

  // ended_at: null or parseable timestamp
  let endedAt: string | null = null;
  if (row.ended_at !== null && row.ended_at !== undefined) {
    if (typeof row.ended_at !== "string") return null;
    const d = new Date(row.ended_at);
    if (isNaN(d.getTime())) return null;
    endedAt = row.ended_at;
  }

  // related_story_id: null or canonical UUID
  let relatedStoryId: string | null = null;
  if (row.related_story_id !== null && row.related_story_id !== undefined) {
    if (!isValidUuid(row.related_story_id)) return null;
    relatedStoryId = String(row.related_story_id).trim();
  }

  // media_id: null or canonical UUID
  let mediaId: string | null = null;
  if (row.media_id !== null && row.media_id !== undefined) {
    if (!isValidUuid(row.media_id)) return null;
    mediaId = String(row.media_id).trim();
  }

  // source_provenance: non-empty trimmed string
  if (typeof row.source_provenance !== "string" || row.source_provenance.trim().length === 0) {
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

  // created_at: parseable timestamp
  if (!row.created_at || typeof row.created_at !== "string") return null;
  const ca = new Date(row.created_at);
  if (isNaN(ca.getTime())) return null;

  // updated_at: parseable timestamp
  if (!row.updated_at || typeof row.updated_at !== "string") return null;
  const ua = new Date(row.updated_at);
  if (isNaN(ua.getTime())) return null;

  return {
    id: String(row.id).trim(),
    title: row.title.trim(),
    kind: row.kind as NewsroomLiveCoverageKind,
    status: row.status as NewsroomLiveCoverageStatus,
    scheduledAt,
    startedAt,
    endedAt,
    relatedStoryId,
    mediaId,
    sourceProvenance: row.source_provenance.trim(),
    lockVersion: lv,
    createdByStaffId: String(createdBy).trim(),
    updatedByStaffId: String(updatedBy).trim(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function defaultRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = getStagingSupabaseClient() as any;
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message || `Newsroom live coverage RPC ${name} failed.`);
  }
  return data as T;
}

export function createNewsroomLiveCoverageService(
  clientOverride?: { rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }> }
): NewsroomLiveCoverageService {
  async function callRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    if (clientOverride) {
      const { data, error } = await clientOverride.rpc(name, args);
      if (error) {
        throw new Error(error.message || `Newsroom live coverage RPC ${name} failed.`);
      }
      return data as T;
    }
    return defaultRpc<T>(name, args);
  }

  return {
    async listCoverage(options?: NewsroomLiveCoverageListOptions): Promise<NewsroomLiveCoverage[]> {
      const trimmedSearch = typeof options?.search === "string" ? options.search.trim() : "";
      const rawRows = await callRpc<any[]>("newsroom_list_live_coverage", {
        p_status: options?.status ?? null,
        p_kind: options?.kind ?? null,
        p_search: trimmedSearch.length > 0 ? trimmedSearch : null,
        p_limit: options?.limit ?? 100
      });
      if (!Array.isArray(rawRows)) {
        throw new Error("Invalid response from live coverage list: expected array of coverage rows.");
      }
      if (rawRows.length === 0) {
        return [];
      }
      const mapped: NewsroomLiveCoverage[] = [];
      for (const r of rawRows) {
        const c = mapNewsroomLiveCoverageRow(r);
        if (c) mapped.push(c);
      }
      if (mapped.length === 0) {
        throw new Error(
          "Invalid response from live coverage list: non-empty payload contained no valid coverage rows."
        );
      }
      return mapped;
    },

    async createCoverage(input: NewsroomLiveCoverageCreateInput): Promise<string> {
      const check = validateLiveCoverageCreateInput(input);
      if (!check.valid) {
        throw new Error(check.error || "Invalid live coverage create input.");
      }

      const payload = {
        title: input.title.trim(),
        kind: input.kind,
        scheduled_at: input.scheduledAt?.trim() || null,
        related_story_id: input.relatedStoryId?.trim() || null,
        media_id: input.mediaId?.trim() || null,
        source_provenance: input.sourceProvenance.trim()
      };

      const newId = await callRpc<string>("newsroom_create_live_coverage", {
        p_input: payload
      });
      if (!newId || typeof newId !== "string" || !isValidUuid(newId)) {
        throw new Error("Invalid response from live coverage create: expected canonical UUID.");
      }
      return String(newId).trim();
    },

    async saveCoverage(
      coverageId: string,
      expectedVersion: number,
      patch: NewsroomLiveCoveragePatch
    ): Promise<number> {
      if (!coverageId || typeof coverageId !== "string" || !isValidUuid(coverageId)) {
        throw new Error("Valid coverage ID is required for save.");
      }
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
        throw new Error("Valid expected lock version >= 1 is required for save.");
      }
      const check = validateLiveCoveragePatch(patch);
      if (!check.valid) {
        throw new Error(check.error || "Invalid live coverage patch.");
      }

      const p_patch: Record<string, unknown> = {};
      if (patch.title !== undefined) p_patch.title = patch.title.trim();
      if (patch.scheduledAt !== undefined) {
        p_patch.scheduled_at = patch.scheduledAt?.trim() || null;
      }
      if (patch.relatedStoryId !== undefined) {
        p_patch.related_story_id = patch.relatedStoryId?.trim() || null;
      }
      if (patch.mediaId !== undefined) {
        p_patch.media_id = patch.mediaId?.trim() || null;
      }
      if (patch.sourceProvenance !== undefined) {
        p_patch.source_provenance = patch.sourceProvenance.trim();
      }

      const nextVersion = await callRpc<number>("newsroom_save_live_coverage", {
        p_coverage_id: coverageId,
        p_expected_version: expectedVersion,
        p_patch
      });
      if (
        typeof nextVersion !== "number" ||
        !Number.isFinite(nextVersion) ||
        !Number.isInteger(nextVersion) ||
        nextVersion < 1 ||
        nextVersion <= expectedVersion
      ) {
        throw new Error("Invalid response from live coverage save: expected numeric lock version strictly greater than expected version.");
      }
      return nextVersion;
    },

    async startCoverage(
      coverageId: string,
      expectedVersion: number
    ): Promise<number> {
      if (!coverageId || typeof coverageId !== "string" || !isValidUuid(coverageId)) {
        throw new Error("Valid coverage ID is required to start.");
      }
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
        throw new Error("Valid expected lock version >= 1 is required.");
      }
      const nextVersion = await callRpc<number>("newsroom_start_live_coverage", {
        p_coverage_id: coverageId,
        p_expected_version: expectedVersion
      });
      if (
        typeof nextVersion !== "number" ||
        !Number.isFinite(nextVersion) ||
        !Number.isInteger(nextVersion) ||
        nextVersion < 1 ||
        nextVersion <= expectedVersion
      ) {
        throw new Error("Invalid response from live coverage start: expected numeric lock version strictly greater than expected version.");
      }
      return nextVersion;
    },

    async endCoverage(
      coverageId: string,
      expectedVersion: number
    ): Promise<number> {
      if (!coverageId || typeof coverageId !== "string" || !isValidUuid(coverageId)) {
        throw new Error("Valid coverage ID is required to end.");
      }
      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
        throw new Error("Valid expected lock version >= 1 is required.");
      }
      const nextVersion = await callRpc<number>("newsroom_end_live_coverage", {
        p_coverage_id: coverageId,
        p_expected_version: expectedVersion
      });
      if (
        typeof nextVersion !== "number" ||
        !Number.isFinite(nextVersion) ||
        !Number.isInteger(nextVersion) ||
        nextVersion < 1 ||
        nextVersion <= expectedVersion
      ) {
        throw new Error("Invalid response from live coverage end: expected numeric lock version strictly greater than expected version.");
      }
      return nextVersion;
    },

    async listUpdates(coverageId: string, limit = 100): Promise<NewsroomLiveUpdate[]> {
      if (!coverageId || typeof coverageId !== "string" || !isValidUuid(coverageId)) {
        throw new Error("Valid canonical coverage ID is required to list live updates.");
      }
      const boundedLimit =
        typeof limit === "number" && Number.isInteger(limit)
          ? Math.max(1, Math.min(limit, 250))
          : 100;

      const rawRows = await callRpc<any[]>("newsroom_list_live_updates", {
        p_coverage_id: coverageId.trim(),
        p_limit: boundedLimit
      });

      if (!Array.isArray(rawRows)) {
        throw new Error("Invalid response from live updates list: expected array of update rows.");
      }
      if (rawRows.length === 0) {
        return [];
      }

      const mapped: NewsroomLiveUpdate[] = [];
      for (const r of rawRows) {
        const u = mapNewsroomLiveUpdateRow(r);
        if (u) mapped.push(u);
      }

      if (mapped.length === 0) {
        throw new Error(
          "Invalid response from live updates list: non-empty payload contained no valid update rows."
        );
      }

      return mapped;
    },

    async postUpdate(
      coverageId: string,
      input: NewsroomLiveUpdateCreateInput
    ): Promise<string> {
      if (!coverageId || typeof coverageId !== "string" || !isValidUuid(coverageId)) {
        throw new Error("Valid canonical coverage ID is required to post a live update.");
      }

      const check = validateLiveUpdateCreateInput(input);
      if (!check.valid) {
        throw new Error(check.error || "Invalid live update payload.");
      }

      const payload = {
        headline: input.headline?.trim() || null,
        body: input.body.trim(),
        media_id: input.mediaId?.trim() || null
      };

      const newId = await callRpc<string>("newsroom_post_live_update", {
        p_coverage_id: coverageId.trim(),
        p_input: payload
      });

      if (!newId || typeof newId !== "string" || !isValidUuid(newId)) {
        throw new Error("Invalid response from live update post: expected canonical UUID.");
      }

      return String(newId).trim();
    }
  };
}

export const stagingNewsroomLiveCoverageService: NewsroomLiveCoverageService =
  createNewsroomLiveCoverageService();

