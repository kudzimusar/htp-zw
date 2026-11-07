import type { SupabaseClient } from "@supabase/supabase-js";
import { getStagingSupabaseClient } from "../platform/supabase";
import type {
  NewsroomAuthorItem,
  NewsroomAuthorsDirectory,
  NewsroomCreateAuthorInput,
  NewsroomUpdateAuthorInput,
  NewsroomBindStaffAuthorInput,
  NewsroomSectionItem,
  NewsroomTaxonomyDirectory,
  NewsroomCreateSectionInput
} from "../domain/models";
import type { NewsroomAuthorsService } from "../domain/contracts";

export function mapAuthorItem(raw: any): NewsroomAuthorItem {
  return {
    id: String(raw?.id ?? ""),
    displayName: String(raw?.display_name ?? raw?.displayName ?? "Unnamed Author"),
    slug: String(raw?.slug ?? ""),
    bio: raw?.bio ? String(raw.bio) : null,
    wordpressSourceId: raw?.wordpress_source_id ? String(raw.wordpress_source_id) : (raw?.wordpressSourceId ? String(raw.wordpressSourceId) : null),
    createdAt: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
    storyCount: Number(raw?.story_count ?? raw?.storyCount ?? 0),
    boundStaffId: raw?.bound_staff_id ? String(raw.bound_staff_id) : (raw?.boundStaffId ? String(raw.boundStaffId) : null),
    boundStaffName: raw?.bound_staff_name ? String(raw.bound_staff_name) : (raw?.boundStaffName ? String(raw.boundStaffName) : null),
    boundStaffEmail: raw?.bound_staff_email ? String(raw.bound_staff_email) : (raw?.boundStaffEmail ? String(raw.boundStaffEmail) : null)
  };
}

export function mapAuthorsDirectory(data: any): NewsroomAuthorsDirectory {
  const rawMetrics = data?.metrics ?? {};
  const rawAuthors = Array.isArray(data?.authors) ? data.authors : [];

  return {
    metrics: {
      totalAuthors: Number(rawMetrics.total_authors ?? rawMetrics.totalAuthors ?? 0),
      migratedAuthorsCount: Number(rawMetrics.migrated_authors_count ?? rawMetrics.migratedAuthorsCount ?? 0),
      boundAuthorsCount: Number(rawMetrics.bound_authors_count ?? rawMetrics.boundAuthorsCount ?? 0),
      unboundAuthorsCount: Number(rawMetrics.unbound_authors_count ?? rawMetrics.unboundAuthorsCount ?? 0)
    },
    authors: rawAuthors.map(mapAuthorItem)
  };
}

export function mapSectionItem(raw: any): NewsroomSectionItem {
  return {
    id: String(raw?.id ?? ""),
    name: String(raw?.name ?? "Unnamed Section"),
    slug: String(raw?.slug ?? ""),
    parentId: raw?.parent_id ? String(raw.parent_id) : (raw?.parentId ? String(raw.parentId) : null),
    parentName: raw?.parent_name ? String(raw.parent_name) : (raw?.parentName ? String(raw.parentName) : null),
    wordpressSourceId: raw?.wordpress_source_id ? String(raw.wordpress_source_id) : (raw?.wordpressSourceId ? String(raw.wordpressSourceId) : null),
    createdAt: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
    storyCount: Number(raw?.story_count ?? raw?.storyCount ?? 0)
  };
}

export function mapTaxonomyDirectory(data: any): NewsroomTaxonomyDirectory {
  const rawMetrics = data?.metrics ?? {};
  const rawSections = Array.isArray(data?.sections) ? data.sections : [];

  return {
    metrics: {
      totalSections: Number(rawMetrics.total_sections ?? rawMetrics.totalSections ?? 0),
      rootSectionsCount: Number(rawMetrics.root_sections_count ?? rawMetrics.rootSectionsCount ?? 0)
    },
    sections: rawSections.map(mapSectionItem)
  };
}

export function createNewsroomAuthorsService(client?: SupabaseClient | null): NewsroomAuthorsService {
  const getClient = (): SupabaseClient =>
    client ?? (getStagingSupabaseClient() as unknown as SupabaseClient);

  return {
    async getAuthorsDirectory(filter?: {
      search?: string | null;
      limit?: number;
      offset?: number;
    }): Promise<NewsroomAuthorsDirectory> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_get_authors_directory", {
        p_search: filter?.search ?? null,
        p_limit: filter?.limit ?? 50,
        p_offset: filter?.offset ?? 0
      });

      if (error) {
        throw new Error(`Failed to fetch authors directory: ${error.message}`);
      }
      return mapAuthorsDirectory(data);
    },

    async createAuthor(input: NewsroomCreateAuthorInput): Promise<{ authorId: string; slug: string; created: boolean }> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_create_author", {
        p_display_name: input.displayName,
        p_slug: input.slug ?? null,
        p_bio: input.bio ?? null
      });

      if (error) {
        throw new Error(`Failed to create author: ${error.message}`);
      }
      const rawData = data as Record<string, unknown> | null;
      return {
        authorId: String(rawData?.author_id ?? ""),
        slug: String(rawData?.slug ?? ""),
        created: Boolean(rawData?.created ?? true)
      };
    },

    async updateAuthor(input: NewsroomUpdateAuthorInput): Promise<{ authorId: string; updated: boolean }> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_update_author", {
        p_author_id: input.authorId,
        p_display_name: input.displayName,
        p_bio: input.bio ?? null
      });

      if (error) {
        throw new Error(`Failed to update author: ${error.message}`);
      }
      const rawData = data as Record<string, unknown> | null;
      return {
        authorId: String(rawData?.author_id ?? input.authorId),
        updated: Boolean(rawData?.updated ?? true)
      };
    },

    async bindStaffAuthor(input: NewsroomBindStaffAuthorInput): Promise<{ staffId: string; authorId: string | null; bound: boolean }> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_bind_staff_author", {
        p_staff_id: input.staffId,
        p_author_id: input.authorId ?? null
      });

      if (error) {
        throw new Error(`Failed to bind staff profile to author: ${error.message}`);
      }
      const rawData = data as Record<string, unknown> | null;
      return {
        staffId: String(rawData?.staff_id ?? input.staffId),
        authorId: rawData?.author_id ? String(rawData.author_id) : null,
        bound: Boolean(rawData?.bound ?? (input.authorId !== null))
      };
    },

    async getTaxonomyDirectory(filter?: {
      parentId?: string | null;
      search?: string | null;
    }): Promise<NewsroomTaxonomyDirectory> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_get_taxonomy_directory", {
        p_parent_id: filter?.parentId ?? null,
        p_search: filter?.search ?? null
      });

      if (error) {
        throw new Error(`Failed to fetch taxonomy directory: ${error.message}`);
      }
      return mapTaxonomyDirectory(data);
    },

    async createSection(input: NewsroomCreateSectionInput): Promise<{ sectionId: string; slug: string; created: boolean }> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_create_section", {
        p_name: input.name,
        p_slug: input.slug ?? null,
        p_parent_id: input.parentId ?? null
      });

      if (error) {
        throw new Error(`Failed to create section: ${error.message}`);
      }
      const rawData = data as Record<string, unknown> | null;
      return {
        sectionId: String(rawData?.section_id ?? ""),
        slug: String(rawData?.slug ?? ""),
        created: Boolean(rawData?.created ?? true)
      };
    }
  };
}

export const stagingNewsroomAuthorsService = createNewsroomAuthorsService();
