import type { NewsroomStoryService } from "../domain/contracts";
import type {
  CreateStoryInput,
  NewsroomPublicAuthor,
  NewsroomSection,
  NewsroomStory,
  NewsroomStoryAutosave,
  NewsroomStoryCorrection,
  NewsroomStoryReview,
  NewsroomStoryRevision,
  SaveStoryPatch
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

const canonicalIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    throw new Error(error.message || `HealthTimes story RPC ${name} failed.`);
  }
  return data as T;
}

async function ensureNewsroomSession() {
  const client = getStagingSupabaseClient() as any;
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData?.session) {
    throw new Error("Server-authorized Newsroom session required.");
  }
  await rpc("newsroom_register_session", { p_user_agent: "healthtimes-story-workspace" });
}

function mapStoryRow(row: any): NewsroomStory {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    standfirst: row.standfirst ?? null,
    excerpt: row.excerpt ?? null,
    bodyHtml: row.body_html ?? null,
    bodyJson: row.body_json ?? null,
    status: String(row.status ?? "draft"),
    workflowStatus: row.workflow_status ?? null,
    accessPolicy: row.access_policy ?? "public",
    authorId: row.author_id ?? null,
    primarySectionId: row.primary_section_id ?? null,
    publishedAt: row.published_at ?? null,
    scheduledAt: row.scheduled_at ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    canonicalUrl: row.canonical_url ?? null,
    ownerStaffId: row.owner_staff_id ?? null,
    assignedEditorStaffId: row.assigned_editor_staff_id ?? null,
    factCheckerStaffId: row.fact_checker_staff_id ?? null,
    healthReviewerStaffId: row.health_reviewer_staff_id ?? null,
    copyEditorStaffId: row.copy_editor_staff_id ?? null,
    desk: row.desk ?? null,
    topic: row.topic ?? null,
    country: row.country ?? null,
    region: row.region ?? null,
    sourceNotes: row.source_notes ?? null,
    internalNotes: row.internal_notes ?? null,
    deadlineAt: row.deadline_at ?? null,
    distribution: row.distribution ?? {},
    adSetting: row.ad_setting ?? "Standard",
    commentPolicy: row.comment_policy ?? "open",
    lockVersion: Number(row.lock_version ?? 1),
    lastSavedBy: row.last_saved_by ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    modifiedAt: row.modified_at ?? null
  };
}

export const stagingNewsroomStoryService: NewsroomStoryService = {
  async listStories(limit = 200) {
    await ensureNewsroomSession();
    const rows = await rpc<any[]>("newsroom_list_stories", { p_limit: limit });
    return (rows ?? []).map(mapStoryRow);
  },

  async getStory(storyId: string) {
    requireCanonicalId(storyId, "story");
    await ensureNewsroomSession();
    const client = getStagingSupabaseClient() as any;
    const { data, error } = await client
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message || "Failed to load story from server.");
    }
    if (!data) return null;
    return mapStoryRow(data);
  },

  async createStory(input: CreateStoryInput) {
    await ensureNewsroomSession();
    const payload: Record<string, unknown> = {
      title: input.title,
      slug: input.slug || null,
      standfirst: input.standfirst || null,
      body: input.body ?? input.bodyHtml ?? input.body_html ?? null,
      desk: input.desk || null,
      topic: input.topic || null,
      country: input.country || null,
      region: input.region || null,
      sources: input.sources ?? input.sourceNotes ?? null,
      notes: input.notes ?? input.internalNotes ?? null,
      deadline_at: input.deadline_at ?? input.deadlineAt ?? null,
      seo_title: input.seo_title ?? input.seoTitle ?? null,
      seo_description: input.seo_description ?? input.seoDescription ?? null,
      author_id: input.author_id ?? input.authorId ?? null,
      primary_section_id: input.primary_section_id ?? input.primarySectionId ?? null
    };

    const storyId = await rpc<string>("newsroom_create_story", { p_story: payload });
    return String(storyId);
  },

  async saveStory(storyId: string, expectedVersion: number, patch: SaveStoryPatch, reason = "Autosave") {
    requireCanonicalId(storyId, "story");
    await ensureNewsroomSession();

    const p_patch: Record<string, unknown> = {};
    if (patch.title !== undefined) p_patch.title = patch.title;
    if (patch.slug !== undefined) p_patch.slug = patch.slug;
    if (patch.standfirst !== undefined) p_patch.standfirst = patch.standfirst;
    if (patch.body !== undefined || patch.bodyHtml !== undefined || patch.body_html !== undefined) {
      p_patch.body = patch.body ?? patch.bodyHtml ?? patch.body_html;
    }
    if (patch.sources !== undefined || patch.sourceNotes !== undefined) {
      p_patch.sources = patch.sources ?? patch.sourceNotes;
    }
    if (patch.notes !== undefined || patch.internalNotes !== undefined) {
      p_patch.notes = patch.notes ?? patch.internalNotes;
    }
    if (patch.ownerStaffId !== undefined || patch.owner_staff_id !== undefined) {
      p_patch.owner_staff_id = patch.ownerStaffId ?? patch.owner_staff_id;
    }
    if (patch.assignedEditorStaffId !== undefined || patch.assigned_editor_staff_id !== undefined) {
      p_patch.assigned_editor_staff_id = patch.assignedEditorStaffId ?? patch.assigned_editor_staff_id;
    }
    if (patch.factCheckerStaffId !== undefined || patch.fact_checker_staff_id !== undefined) {
      p_patch.fact_checker_staff_id = patch.factCheckerStaffId ?? patch.fact_checker_staff_id;
    }
    if (patch.authorId !== undefined || patch.author_id !== undefined) {
      p_patch.author_id = patch.authorId ?? patch.author_id;
    }
    if (patch.primarySectionId !== undefined || patch.primary_section_id !== undefined) {
      p_patch.primary_section_id = patch.primarySectionId ?? patch.primary_section_id;
    }
    if (patch.desk !== undefined) p_patch.desk = patch.desk;
    if (patch.topic !== undefined) p_patch.topic = patch.topic;
    if (patch.country !== undefined) p_patch.country = patch.country;
    if (patch.region !== undefined) p_patch.region = patch.region;
    if (patch.accessPolicy !== undefined || patch.access_policy !== undefined) {
      p_patch.access_policy = patch.accessPolicy ?? patch.access_policy;
    }
    if (patch.deadlineAt !== undefined || patch.deadline_at !== undefined) {
      p_patch.deadline_at = patch.deadlineAt ?? patch.deadline_at;
    }
    if (patch.seoTitle !== undefined || patch.seo_title !== undefined) {
      p_patch.seo_title = patch.seoTitle ?? patch.seo_title;
    }
    if (patch.seoDescription !== undefined || patch.seo_description !== undefined) {
      p_patch.seo_description = patch.seoDescription ?? patch.seo_description;
    }
    if (patch.scheduledAt !== undefined || patch.scheduled_at !== undefined) {
      p_patch.scheduled_at = patch.scheduledAt ?? patch.scheduled_at;
    }
    if (patch.distribution !== undefined) p_patch.distribution = patch.distribution;
    if (patch.adSetting !== undefined || patch.ad_setting !== undefined) {
      p_patch.ad_setting = patch.adSetting ?? patch.ad_setting;
    }

    const newVersion = await rpc<number>("newsroom_save_story", {
      p_story_id: storyId,
      p_expected_version: expectedVersion,
      p_patch,
      p_reason: reason
    });

    const commentPolicy = patch.commentPolicy ?? patch.comment_policy;
    if (commentPolicy !== undefined && commentPolicy !== null) {
      await rpc("newsroom_set_story_comment_policy", {
        p_story_id: storyId,
        p_policy: commentPolicy
      });
    }

    return Number(newVersion);
  },

  async transitionStory(storyId: string, nextStatus: string, reason?: string) {
    requireCanonicalId(storyId, "story");
    await ensureNewsroomSession();
    const updatedStatus = await rpc<string>("newsroom_transition_story", {
      p_story_id: storyId,
      p_next_status: nextStatus,
      p_reason: reason || null
    });
    return String(updatedStatus);
  },

  async listAuthors() {
    await ensureNewsroomSession();
    const rows = await rpc<any[]>("newsroom_list_public_authors");
    return (rows ?? []).map((row): NewsroomPublicAuthor => ({
      id: String(row.id),
      displayName: String(row.display_name ?? ""),
      slug: String(row.slug ?? ""),
      bio: row.bio ?? null,
      provenance: row.provenance,
      wordpressSourceId: row.wordpress_source_id
    }));
  },

  async listSections() {
    await ensureNewsroomSession();
    const rows = await rpc<any[]>("newsroom_list_sections");
    return (rows ?? []).map((row): NewsroomSection => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      slug: String(row.slug ?? ""),
      parentId: row.parent_id ?? null,
      provenance: row.provenance,
      wordpressSourceId: row.wordpress_source_id
    }));
  },

  async listRevisions(storyId: string) {
    requireCanonicalId(storyId, "story");
    await ensureNewsroomSession();
    const client = getStagingSupabaseClient() as any;
    const { data, error } = await client
      .from("story_revisions")
      .select("*")
      .eq("story_id", storyId)
      .order("revision_number", { ascending: false });
    if (error) throw new Error(error.message || "Failed to load story revisions.");
    return (data ?? []).map((row: any): NewsroomStoryRevision => ({
      id: String(row.id),
      storyId: String(row.story_id),
      revisionNumber: Number(row.revision_number ?? 0),
      title: row.title ?? null,
      bodyHtml: row.body_html ?? null,
      bodyJson: row.body_json ?? null,
      changeSummary: row.change_summary ?? null,
      editorId: row.editor_id ?? null,
      createdAt: String(row.created_at ?? "")
    }));
  },

  async listAutosave(storyId: string) {
    requireCanonicalId(storyId, "story");
    await ensureNewsroomSession();
    const client = getStagingSupabaseClient() as any;
    const { data, error } = await client
      .from("story_autosaves")
      .select("*")
      .eq("story_id", storyId)
      .maybeSingle();
    if (error) throw new Error(error.message || "Failed to load autosave.");
    if (!data) return null;
    return {
      storyId: String(data.story_id),
      title: data.title ?? null,
      standfirst: data.standfirst ?? null,
      bodyHtml: data.body_html ?? null,
      lockVersion: Number(data.lock_version ?? 1),
      savedBy: String(data.saved_by ?? ""),
      savedAt: String(data.saved_at ?? "")
    };
  },

  async listReviews(storyId: string) {
    requireCanonicalId(storyId, "story");
    await ensureNewsroomSession();
    const client = getStagingSupabaseClient() as any;
    const { data, error } = await client
      .from("story_reviews")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message || "Failed to load reviews.");
    return (data ?? []).map((row: any): NewsroomStoryReview => ({
      id: String(row.id),
      storyId: String(row.story_id),
      reviewType: String(row.review_type ?? ""),
      status: String(row.status ?? ""),
      notes: row.notes ?? null,
      assignedTo: row.assigned_to ?? null,
      createdBy: row.created_by ?? null,
      completedBy: row.completed_by ?? null,
      createdAt: String(row.created_at ?? ""),
      completedAt: row.completed_at ?? null,
      updatedAt: row.updated_at
    }));
  },

  async listCorrections(storyId: string) {
    requireCanonicalId(storyId, "story");
    await ensureNewsroomSession();
    const client = getStagingSupabaseClient() as any;
    const { data, error } = await client
      .from("story_corrections")
      .select("*")
      .eq("story_id", storyId)
      .order("changed_at", { ascending: false });
    if (error) throw new Error(error.message || "Failed to load corrections.");
    return (data ?? []).map((row: any): NewsroomStoryCorrection => ({
      id: String(row.id),
      storyId: String(row.story_id),
      reason: String(row.reason ?? ""),
      changedBy: String(row.changed_by ?? ""),
      changedAt: String(row.changed_at ?? ""),
      previousRevisionId: row.previous_revision_id ?? null,
      newRevisionId: row.new_revision_id ?? null
    }));
  },

  async restoreRevision(storyId: string, revisionId: string, expectedVersion: number) {
    requireCanonicalId(storyId, "story");
    requireCanonicalId(revisionId, "revision");
    await ensureNewsroomSession();
    const newVersion = await rpc<number>("newsroom_restore_revision", {
      p_story_id: storyId,
      p_revision_id: revisionId,
      p_expected_version: expectedVersion
    });
    return Number(newVersion);
  },

  async recordReview(storyId: string, reviewType: string, status: string, notes?: string | null) {
    requireCanonicalId(storyId, "story");
    await ensureNewsroomSession();
    const reviewId = await rpc<string>("newsroom_record_review", {
      p_story_id: storyId,
      p_review_type: reviewType,
      p_status: status,
      p_notes: notes ?? undefined
    });
    return String(reviewId);
  },

  async requestChanges(storyId: string, reason: string) {
    requireCanonicalId(storyId, "story");
    if (!reason || !reason.trim()) {
      throw new Error("Editorial change request reason is required.");
    }
    await ensureNewsroomSession();
    const result = await rpc<Record<string, unknown>>("newsroom_request_story_changes", {
      p_story_id: storyId,
      p_reason: reason.trim()
    });
    return result ?? {};
  }
};
