import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const mobileRoot = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(mobileRoot, rel), "utf8");
}

function readRepo(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

// Dynamic module imports via loadTs
const intelligenceServiceModule = loadTs("src/services/newsroom-intelligence.ts", {
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
  mapEditorialIntelligence,
  mapGrowthIntelligence,
  mapAudienceIntelligence,
  createNewsroomIntelligenceService
} = intelligenceServiceModule;

// =============================================================================
// 1. MIGRATION 79 AUTHORITY & HARDENING
// =============================================================================

test("HT-NR-CLOSE Wave B: repository migration count is at least 79 (80 at Wave C)", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"));

  assert.ok(
    files.length >= 79,
    `Expected at least 79 migrations, found ${files.length}`
  );

  assert.ok(
    files.includes("20261017060000_ht_nr_wave_b_intelligence.sql"),
    "Migration 79 file must exist"
  );
});

test("HT-NR-CLOSE Wave B: Migration 79 defines intelligence RPCs with strict security boundaries", () => {
  const sql = readRepo("supabase/migrations/20261017060000_ht_nr_wave_b_intelligence.sql");

  // Check functions exist
  assert.ok(sql.includes("newsroom_get_editorial_intelligence()"));
  assert.ok(sql.includes("newsroom_get_growth_intelligence()"));
  assert.ok(sql.includes("newsroom_get_audience_intelligence()"));

  // Check search_path security definer
  assert.ok(sql.includes("security definer"));
  assert.ok(sql.includes("set search_path = public, auth"));

  // Check capability gating
  assert.ok(sql.includes("public.newsroom_has_capability('analytics.view')"));
  assert.ok(sql.includes("unauthorized: analytics.view required"));

  // Check privileges revoked from anon and public
  assert.ok(sql.includes("revoke all on function public.newsroom_get_editorial_intelligence() from public, anon;"));
  assert.ok(sql.includes("revoke all on function public.newsroom_get_growth_intelligence() from public, anon;"));
  assert.ok(sql.includes("revoke all on function public.newsroom_get_audience_intelligence() from public, anon;"));

  // Check grants to authenticated and service_role
  assert.ok(sql.includes("grant execute on function public.newsroom_get_editorial_intelligence() to authenticated;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_growth_intelligence() to authenticated;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_audience_intelligence() to authenticated;"));
});

// =============================================================================
// 2. EDITORIAL INTELLIGENCE SERVICE & MAPPING
// =============================================================================

test("HT-NR-CLOSE Wave B: mapEditorialIntelligence correctly maps database payload", () => {
  const rawData = {
    generated_at: "2026-10-18T10:00:00.000Z",
    story_inventory: {
      total: 5792,
      published: 5789,
      draft: 3,
      review: 3,
      scheduled: 0,
      archived: 0
    },
    publishing_velocity: {
      last_24_hours: 0,
      last_7_days: 0,
      last_30_days: 7
    },
    review_queue: {
      in_review_count: 3,
      avg_age_hours: 24.5,
      oldest_age_hours: 48.0
    },
    assignments: {
      total: 10,
      active: 4,
      overdue: 1,
      completed: 5
    },
    desk_mix: [
      { desk: "Public Health", count: 2400 },
      { desk: "Policy", count: 1500 }
    ],
    distribution_reach: {
      social_posts_count: 12,
      newsletter_campaigns_count: 4,
      push_alerts_count: 6,
      whatsapp_broadcasts_count: 8
    }
  };

  const mapped = mapEditorialIntelligence(rawData);
  assert.ok(mapped);
  assert.equal(mapped.storyInventory.total, 5792);
  assert.equal(mapped.storyInventory.published, 5789);
  assert.equal(mapped.storyInventory.draft, 3);
  assert.equal(mapped.publishingVelocity.last30Days, 7);
  assert.equal(mapped.reviewQueue.inReviewCount, 3);
  assert.equal(mapped.reviewQueue.avgAgeHours, 24.5);
  assert.equal(mapped.assignments.total, 10);
  assert.equal(mapped.assignments.active, 4);
  assert.equal(mapped.assignments.overdue, 1);
  assert.equal(mapped.deskMix.length, 2);
  assert.equal(mapped.deskMix[0].desk, "Public Health");
  assert.equal(mapped.distributionReach.whatsappBroadcastsCount, 8);

  // Fails closed on invalid input
  assert.equal(mapEditorialIntelligence(null), null);
  assert.equal(mapEditorialIntelligence({}), null);
});

// =============================================================================
// 3. GROWTH INTELLIGENCE SERVICE & MAPPING
// =============================================================================

test("HT-NR-CLOSE Wave B: mapGrowthIntelligence correctly maps integrations and SEO audit", () => {
  const rawData = {
    generated_at: "2026-10-18T10:00:00.000Z",
    integrations: [
      {
        id: "int-ga4",
        provider: "google_analytics",
        integration_key: "public_web",
        status: "identity_verified_account_access_pending",
        external_account_id: "137814020",
        external_property_id: "359235319",
        notes: "Account verified"
      }
    ],
    analytics_daily_summary: {
      rows_recorded: 0,
      total_page_views: 0,
      total_users: 0,
      total_sessions: 0,
      status: "pending_ingestion"
    },
    search_console_summary: {
      property: "https://healthtimes.co.zw/",
      rows_recorded: 0,
      total_clicks: 0,
      total_impressions: 0,
      status: "pending_ingestion"
    },
    seo_health: {
      total_stories: 5792,
      with_seo_title: 5780,
      with_seo_description: 5780,
      with_canonical_url: 5792
    },
    citations_summary: {
      status: "provider_not_connected",
      verified_citations_count: 0,
      institutional_references_count: 0,
      government_ngo_mentions_count: 0,
      notes: "Production citation tracking requires academic/cross-ref indexer API integration."
    }
  };

  const mapped = mapGrowthIntelligence(rawData);
  assert.ok(mapped);
  assert.equal(mapped.integrations.length, 1);
  assert.equal(mapped.integrations[0].provider, "google_analytics");
  assert.equal(mapped.integrations[0].status, "identity_verified_account_access_pending");
  assert.equal(mapped.analyticsDailySummary.status, "pending_ingestion");
  assert.equal(mapped.searchConsoleSummary.property, "https://healthtimes.co.zw/");
  assert.equal(mapped.seoHealth.totalStories, 5792);
  assert.equal(mapped.seoHealth.withSeoTitle, 5780);
  assert.equal(mapped.citationsSummary.status, "provider_not_connected");

  // Fails closed on invalid input
  assert.equal(mapGrowthIntelligence(null), null);
  assert.equal(mapGrowthIntelligence("string"), null);
});

// =============================================================================
// 4. AUDIENCE INTELLIGENCE SERVICE & MAPPING
// =============================================================================

test("HT-NR-CLOSE Wave B: mapAudienceIntelligence maps contacts, push, and subscribers", () => {
  const rawData = {
    generated_at: "2026-10-18T10:00:00.000Z",
    contacts: {
      total_profiles: 100,
      consented_contacts: 85
    },
    segments: {
      total_segments: 3,
      total_memberships: 120
    },
    push_subscribers: {
      registered_devices: 450,
      active_devices: 430
    },
    whatsapp_distribution: {
      total_broadcasts: 5,
      sent_broadcasts: 4
    },
    subscribers: {
      total_subscribers: 50,
      active_subscribers: 42
    },
    ga4_audience_status: {
      property_id: "359235319",
      account_id: "137814020",
      status: "identity_verified_account_access_pending",
      notes: "Google Analytics 4 property identified."
    }
  };

  const mapped = mapAudienceIntelligence(rawData);
  assert.ok(mapped);
  assert.equal(mapped.contacts.consentedContacts, 85);
  assert.equal(mapped.segments.totalSegments, 3);
  assert.equal(mapped.pushSubscribers.activeDevices, 430);
  assert.equal(mapped.whatsappDistribution.sentBroadcasts, 4);
  assert.equal(mapped.subscribers.activeSubscribers, 42);
  assert.equal(mapped.ga4AudienceStatus.propertyId, "359235319");

  // Fails closed on invalid input
  assert.equal(mapAudienceIntelligence(null), null);
});

// =============================================================================
// 5. SERVICE RPC INVOCATION & ERROR HANDLING
// =============================================================================

test("HT-NR-CLOSE Wave B: createNewsroomIntelligenceService invokes correct RPCs and handles errors", async () => {
  let calledRpc = "";
  const mockClient = {
    rpc: async (name) => {
      calledRpc = name;
      if (name === "newsroom_get_editorial_intelligence") {
        return {
          data: {
            story_inventory: { total: 10, published: 8, draft: 1, review: 1 },
            publishing_velocity: { last_24_hours: 1, last_7_days: 3, last_30_days: 8 },
            review_queue: { in_review_count: 1, avg_age_hours: 12, oldest_age_hours: 12 },
            assignments: { total: 2, active: 1, overdue: 0, completed: 1 }
          },
          error: null
        };
      }
      return { data: null, error: { message: "Simulated RPC error" } };
    }
  };

  const service = createNewsroomIntelligenceService(() => mockClient);
  const ed = await service.getEditorialIntelligence();
  assert.equal(calledRpc, "newsroom_get_editorial_intelligence");
  assert.equal(ed.storyInventory.total, 10);

  await assert.rejects(
    async () => service.getGrowthIntelligence(),
    /Failed to load growth intelligence: Simulated RPC error/
  );
});

// =============================================================================
// 6. UI COMPONENT REGISTRATION & STATIC PARAMS CONFORMANCE
// =============================================================================

test("HT-NR-CLOSE Wave B: Studio [module].tsx renders intelligence desks and omits placeholder", () => {
  const moduleSource = read("app/studio/[module].tsx");

  // Modules dispatched to their real components
  assert.ok(moduleSource.includes("<StudioAnalyticsDesk />"));
  assert.ok(moduleSource.includes("<StudioAudienceDesk />"));
  assert.ok(moduleSource.includes("<StudioSearchGrowthDesk />"));

  // Omitted from StudioPlaceholder check
  assert.ok(moduleSource.includes('String(module)!=="analytics"'));
  assert.ok(moduleSource.includes('String(module)!=="audience"'));
  assert.ok(moduleSource.includes('String(module)!=="search-growth"'));
});

test("HT-NR-CLOSE Wave B: Owner Preview registers all 3 intelligence modules", () => {
  const previewSource = read("src/preview/OwnerPreviewStudio.tsx");
  assert.ok(previewSource.includes("OwnerPreviewAnalyticsView"));
  assert.ok(previewSource.includes("OwnerPreviewAudienceView"));
  assert.ok(previewSource.includes("OwnerPreviewSearchGrowthView"));

  const staticParamsSource = read("app/owner-preview/studio/[module].tsx");
  assert.ok(staticParamsSource.includes('"analytics"'));
  assert.ok(staticParamsSource.includes('"audience"'));
  assert.ok(staticParamsSource.includes('"search-growth"'));
});
