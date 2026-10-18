import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

const authorsServiceModule = loadTs("src/services/newsroom-authors.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});

const {
  mapAuthorItem,
  mapAuthorsDirectory,
  mapSectionItem,
  mapTaxonomyDirectory,
  createNewsroomAuthorsService
} = authorsServiceModule;

const settingsServiceModule = loadTs("src/services/newsroom-settings.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});

const {
  mapPlatformSettingItem,
  mapPlatformSettingsOverview,
  createNewsroomSettingsService
} = settingsServiceModule;

const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  hasAuthorsDeskAccess,
  canManageAuthors,
  hasSettingsDeskAccess,
  canManageSettings,
  emptyAuthorizationSnapshot
} = capabilitiesModule;

const previewDataModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: { extra: {} } } }
  }
});
const {
  OWNER_PREVIEW_NAV_ITEMS,
  buildPreviewAuthorsDirectory,
  buildPreviewTaxonomyDirectory,
  buildPreviewPlatformSettingsOverview
} = previewDataModule;

test("HT-NR-CLOSE Wave F: repository migration count is at least 83", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 83, `Expected at least 83 migrations, found ${files.length}`);
});

test("HT-NR-CLOSE Wave F: Migration 83 defines Authors, Taxonomy, and Settings RPCs with RLS", () => {
  const migPath = path.join(
    REPO_ROOT,
    "supabase/migrations/20261017100000_ht_nr_wave_f_authors_taxonomy_settings.sql"
  );
  assert.ok(fs.existsSync(migPath), "Migration 83 file must exist");
  const sql = fs.readFileSync(migPath, "utf8");

  // Table creation & RLS
  assert.ok(sql.includes("create table if not exists public.platform_settings"), "Must create platform_settings table");
  assert.ok(sql.includes("alter table public.platform_settings enable row level security;"), "Must enable RLS on platform_settings");
  assert.ok(sql.includes("create policy ag06_platform_settings_read"), "Must define platform settings read policy");
  assert.ok(sql.includes("create policy ag06_authors_staff_read"), "Must define authors staff read policy");

  // Seed rows
  assert.ok(sql.includes("editorial_require_review"), "Must seed editorial_require_review");
  assert.ok(sql.includes("paywall_hard_enforcement"), "Must seed paywall_hard_enforcement");
  assert.ok(sql.includes("ai_editorial_assist_enabled"), "Must seed ai_editorial_assist_enabled");
  assert.ok(sql.includes("comments_default_policy"), "Must seed comments_default_policy");
  assert.ok(sql.includes("whatsapp_cloud_api"), "Must seed whatsapp_cloud_api");

  // Functions defined
  assert.ok(sql.includes("newsroom_get_authors_directory"), "Must define newsroom_get_authors_directory");
  assert.ok(sql.includes("newsroom_create_author"), "Must define newsroom_create_author");
  assert.ok(sql.includes("newsroom_update_author"), "Must define newsroom_update_author");
  assert.ok(sql.includes("newsroom_bind_staff_author"), "Must define newsroom_bind_staff_author");
  assert.ok(sql.includes("newsroom_get_taxonomy_directory"), "Must define newsroom_get_taxonomy_directory");
  assert.ok(sql.includes("newsroom_create_section"), "Must define newsroom_create_section");
  assert.ok(sql.includes("newsroom_get_platform_settings"), "Must define newsroom_get_platform_settings");
  assert.ok(sql.includes("newsroom_update_platform_setting"), "Must define newsroom_update_platform_setting");

  // Audit logging
  assert.ok(sql.includes("author_created"), "Must log author creation to audit logs");
  assert.ok(sql.includes("author_updated"), "Must log author update to audit logs");
  assert.ok(sql.includes("staff_author_bound"), "Must log staff binding to audit logs");
  assert.ok(sql.includes("section_created"), "Must log section creation to audit logs");
  assert.ok(sql.includes("platform_setting_updated"), "Must log setting update to audit logs");

  // Grants & Revokes
  assert.ok(sql.includes("revoke all on function public.newsroom_get_authors_directory(text, int, int) from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_authors_directory(text, int, int) to authenticated, service_role;"));
  assert.ok(sql.includes("revoke all on function public.newsroom_get_platform_settings() from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_platform_settings() to authenticated, service_role;"));
});

test("HT-NR-CLOSE Wave F: Authors mappers map database records faithfully", () => {
  const rawAuthor = {
    id: "auth-123",
    display_name: "Tafadzwa Chigandiwa",
    slug: "tafadzwa-chigandiwa",
    bio: "Senior Health Reporter",
    wordpress_source_id: "wp-22",
    created_at: "2025-01-01T00:00:00Z",
    story_count: 14,
    bound_staff_id: "staff-456",
    bound_staff_name: "Tafadzwa C",
    bound_staff_email: "tafadzwa@healthtimes.co.zw"
  };

  const author = mapAuthorItem(rawAuthor);
  assert.equal(author.id, "auth-123");
  assert.equal(author.displayName, "Tafadzwa Chigandiwa");
  assert.equal(author.slug, "tafadzwa-chigandiwa");
  assert.equal(author.bio, "Senior Health Reporter");
  assert.equal(author.wordpressSourceId, "wp-22");
  assert.equal(author.storyCount, 14);
  assert.equal(author.boundStaffId, "staff-456");
  assert.equal(author.boundStaffName, "Tafadzwa C");
  assert.equal(author.boundStaffEmail, "tafadzwa@healthtimes.co.zw");

  const rawDir = {
    metrics: {
      total_authors: 10,
      migrated_authors_count: 7,
      bound_authors_count: 5,
      unbound_authors_count: 5
    },
    authors: [rawAuthor]
  };

  const directory = mapAuthorsDirectory(rawDir);
  assert.equal(directory.metrics.totalAuthors, 10);
  assert.equal(directory.metrics.migratedAuthorsCount, 7);
  assert.equal(directory.metrics.boundAuthorsCount, 5);
  assert.equal(directory.metrics.unboundAuthorsCount, 5);
  assert.equal(directory.authors.length, 1);
  assert.equal(directory.authors[0].displayName, "Tafadzwa Chigandiwa");
});

test("HT-NR-CLOSE Wave F: Taxonomy mappers map sections faithfully", () => {
  const rawSection = {
    id: "sec-001",
    name: "Epidemiology",
    slug: "epidemiology",
    parent_id: "sec-root",
    parent_name: "Public Health",
    wordpress_source_id: "wp-cat-10",
    created_at: "2025-01-01T00:00:00Z",
    story_count: 22
  };

  const section = mapSectionItem(rawSection);
  assert.equal(section.id, "sec-001");
  assert.equal(section.name, "Epidemiology");
  assert.equal(section.slug, "epidemiology");
  assert.equal(section.parentId, "sec-root");
  assert.equal(section.parentName, "Public Health");
  assert.equal(section.wordpressSourceId, "wp-cat-10");
  assert.equal(section.storyCount, 22);

  const rawTaxDir = {
    metrics: {
      total_sections: 12,
      root_sections_count: 6
    },
    sections: [rawSection]
  };

  const taxDirectory = mapTaxonomyDirectory(rawTaxDir);
  assert.equal(taxDirectory.metrics.totalSections, 12);
  assert.equal(taxDirectory.metrics.rootSectionsCount, 6);
  assert.equal(taxDirectory.sections.length, 1);
});

test("HT-NR-CLOSE Wave F: Settings mappers map settings and zero-secret overview faithfully", () => {
  const rawSetting = {
    key: "editorial_require_review",
    category: "editorial",
    description: "Enforce two-person review",
    value: { enabled: true },
    updated_at: "2026-10-18T00:00:00Z",
    updated_by: "staff-001"
  };

  const setting = mapPlatformSettingItem(rawSetting);
  assert.equal(setting.key, "editorial_require_review");
  assert.equal(setting.category, "editorial");
  assert.equal(setting.description, "Enforce two-person review");
  assert.deepEqual(setting.value, { enabled: true });
  assert.equal(setting.updatedAt, "2026-10-18T00:00:00Z");

  const rawOverview = {
    settings: [rawSetting],
    integrations: {
      whatsapp: {
        name: "WhatsApp Cloud API",
        provider: "Meta Graph API",
        status: "unconfigured",
        secret_configured: false
      }
    },
    audit_summary: {
      total_audit_events_24h: 15,
      last_audit_action: "platform_setting_updated",
      last_audit_at: "2026-10-18T01:00:00Z"
    }
  };

  const overview = mapPlatformSettingsOverview(rawOverview);
  assert.equal(overview.settings.length, 1);
  assert.equal(overview.integrations.whatsapp.name, "WhatsApp Cloud API");
  assert.equal(overview.integrations.whatsapp.secretConfigured, false);
  assert.equal(overview.auditSummary.totalAuditEvents24h, 15);
  assert.equal(overview.auditSummary.lastAuditAction, "platform_setting_updated");
});

test("HT-NR-CLOSE Wave F: Security capabilities gate Authors and Settings desks", () => {
  const reporterAuth = {
    status: "authorized",
    source: "server",
    staffProfileId: "staff-reporter",
    capabilities: ["story.create", "story.edit_own"],
    reason: "ok"
  };

  const editorAuth = {
    status: "authorized",
    source: "server",
    staffProfileId: "staff-editor",
    capabilities: [
      "story.create",
      "story.edit_all",
      "story.publish",
      "staff.manage",
      "settings.manage"
    ],
    reason: "ok"
  };

  const guestAuth = emptyAuthorizationSnapshot("anonymous", "unauthenticated");

  // Authors Desk
  assert.equal(hasAuthorsDeskAccess(reporterAuth), true);
  assert.equal(hasAuthorsDeskAccess(editorAuth), true);
  assert.equal(hasAuthorsDeskAccess(guestAuth), false);

  assert.equal(canManageAuthors(reporterAuth), false);
  assert.equal(canManageAuthors(editorAuth), true);
  assert.equal(canManageAuthors(guestAuth), false);

  // Settings Desk
  assert.equal(hasSettingsDeskAccess(reporterAuth), false);
  assert.equal(hasSettingsDeskAccess(editorAuth), true);
  assert.equal(hasSettingsDeskAccess(guestAuth), false);

  assert.equal(canManageSettings(reporterAuth), false);
  assert.equal(canManageSettings(editorAuth), true);
  assert.equal(canManageSettings(guestAuth), false);
});

test("HT-NR-CLOSE Wave F: Authors service executes RPC calls with exact arguments", async () => {
  const rpcCalls = [];
  const mockClient = {
    from: () => ({}),
    rpc: async (fn, args) => {
      rpcCalls.push({ fn, args });
      if (fn === "newsroom_get_authors_directory") {
        return {
          data: {
            metrics: { total_authors: 1, migrated_authors_count: 0, bound_authors_count: 1, unbound_authors_count: 0 },
            authors: []
          },
          error: null
        };
      }
      if (fn === "newsroom_create_author") {
        return { data: { id: "new-auth-1" }, error: null };
      }
      if (fn === "newsroom_update_author") {
        return { data: { id: "upd-auth-1" }, error: null };
      }
      if (fn === "newsroom_bind_staff_author") {
        return { data: { status: "success" }, error: null };
      }
      if (fn === "newsroom_get_taxonomy_directory") {
        return {
          data: {
            metrics: { total_sections: 1, root_sections_count: 1 },
            sections: []
          },
          error: null
        };
      }
      if (fn === "newsroom_create_section") {
        return { data: { id: "new-sec-1" }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const service = createNewsroomAuthorsService(mockClient);

  await service.getAuthorsDirectory({ search: "kudzai", limit: 20, offset: 0 });
  assert.equal(rpcCalls[0].fn, "newsroom_get_authors_directory");
  assert.equal(rpcCalls[0].args.p_search, "kudzai");

  await service.createAuthor({ displayName: "New Author", slug: "new-author", bio: "Bio test" });
  assert.equal(rpcCalls[1].fn, "newsroom_create_author");
  assert.equal(rpcCalls[1].args.p_display_name, "New Author");

  await service.updateAuthor({ authorId: "auth-1", displayName: "Updated Name", bio: "Updated Bio" });
  assert.equal(rpcCalls[2].fn, "newsroom_update_author");
  assert.equal(rpcCalls[2].args.p_author_id, "auth-1");

  await service.bindStaffAuthor({ staffId: "staff-1", authorId: "auth-1" });
  assert.equal(rpcCalls[3].fn, "newsroom_bind_staff_author");
  assert.equal(rpcCalls[3].args.p_staff_id, "staff-1");
  assert.equal(rpcCalls[3].args.p_author_id, "auth-1");

  await service.getTaxonomyDirectory({ search: "health" });
  assert.equal(rpcCalls[4].fn, "newsroom_get_taxonomy_directory");
  assert.equal(rpcCalls[4].args.p_search, "health");

  await service.createSection({ name: "Global Health", slug: "global-health" });
  assert.equal(rpcCalls[5].fn, "newsroom_create_section");
  assert.equal(rpcCalls[5].args.p_name, "Global Health");
});

test("HT-NR-CLOSE Wave F: Settings service executes RPC calls with exact arguments", async () => {
  const rpcCalls = [];
  const mockClient = {
    from: () => ({}),
    rpc: async (fn, args) => {
      rpcCalls.push({ fn, args });
      if (fn === "newsroom_get_platform_settings") {
        return {
          data: {
            settings: [],
            integrations: {},
            audit_summary: { total_audit_events_24h: 0, last_audit_action: "none", last_audit_at: null }
          },
          error: null
        };
      }
      if (fn === "newsroom_update_platform_setting") {
        return { data: { status: "success" }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const service = createNewsroomSettingsService(mockClient);

  await service.getPlatformSettings();
  assert.equal(rpcCalls[0].fn, "newsroom_get_platform_settings");

  await service.updatePlatformSetting("editorial_require_review", { enabled: false });
  assert.equal(rpcCalls[1].fn, "newsroom_update_platform_setting");
  assert.equal(rpcCalls[1].args.p_key, "editorial_require_review");
  assert.deepEqual(rpcCalls[1].args.p_value, { enabled: false });
});

test("HT-NR-CLOSE Wave F: preview integration registers 25 modules including authors and settings", () => {
  assert.equal(OWNER_PREVIEW_NAV_ITEMS.length, 25);
  const authorsItem = OWNER_PREVIEW_NAV_ITEMS.find((item) => item.key === "authors");
  assert.ok(authorsItem, "authors must be present in preview navigation");
  assert.equal(authorsItem.label, "Authors & Taxonomy");

  const settingsItem = OWNER_PREVIEW_NAV_ITEMS.find((item) => item.key === "settings");
  assert.ok(settingsItem, "settings must be present in preview navigation");
  assert.equal(settingsItem.label, "Platform Settings");

  const authorsDir = buildPreviewAuthorsDirectory();
  assert.ok(authorsDir.authors.length >= 8);
  assert.equal(authorsDir.metrics.totalAuthors, 8);
  assert.equal(authorsDir.metrics.boundAuthorsCount, 4);

  const taxonomyDir = buildPreviewTaxonomyDirectory();
  assert.ok(taxonomyDir.sections.length >= 8);
  assert.equal(taxonomyDir.metrics.totalSections, 8);
  assert.equal(taxonomyDir.metrics.rootSectionsCount, 6);

  const settingsOverview = buildPreviewPlatformSettingsOverview();
  assert.ok(settingsOverview.settings.length >= 10);
  assert.ok(settingsOverview.integrations.whatsapp);
  assert.ok(settingsOverview.integrations.gemini_ai);
  assert.ok(settingsOverview.integrations.database_backend);
  assert.equal(settingsOverview.integrations.database_backend.appliedMigrations, 83);

  // Zero-secret guarantee
  const rawString = JSON.stringify(settingsOverview);
  assert.ok(!rawString.includes("Bearer"), "No bearer tokens in settings overview");
  assert.ok(!rawString.includes("secret_key"), "No secret_key in settings overview");
  assert.ok(!rawString.includes("access_token"), "No access_token in settings overview");
});
