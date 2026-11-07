import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

const commercialServiceModule = loadTs("src/services/newsroom-commercial.ts", {
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
  mapAdvertiser,
  mapAdCampaign,
  mapAdCreative,
  mapAdPlacement,
  mapAdvertisingOverview,
  mapSubscriberEntitlement,
  mapSubscriber,
  mapSubscribersDirectory,
  mapPremiumOperationsOverview,
  createNewsroomCommercialService
} = commercialServiceModule;

const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  hasAdvertisingDeskAccess,
  canCreateCampaign,
  canApproveCampaign,
  hasSubscriberDeskAccess,
  canManageSubscribers,
  hasPremiumDeskAccess,
  canManagePremium,
  canAssignPremium,
  emptyAuthorizationSnapshot
} = capabilitiesModule;

const previewDataModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: { extra: {} } } }
  }
});
const {
  OWNER_PREVIEW_NAV_ITEMS,
  buildPreviewAdvertisingOverview,
  buildPreviewSubscribersDirectory,
  buildPreviewPremiumOperationsOverview
} = previewDataModule;

test("HT-NR-CLOSE Wave D: repository migration count is at least 81", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 81, `Expected at least 81 migrations, found ${files.length}`);
});

test("HT-NR-CLOSE Wave D: Migration 81 defines commercial RPCs and strict security", () => {
  const migPath = path.join(
    REPO_ROOT,
    "supabase/migrations/20261017080000_ht_nr_wave_d_commercial_operations.sql"
  );
  assert.ok(fs.existsSync(migPath), "Migration 81 file must exist");
  const sql = fs.readFileSync(migPath, "utf8");

  // RLS Policies & Functions
  assert.ok(sql.includes("ag06_ad_placements_read"), "Must define placements read policy");
  assert.ok(sql.includes("newsroom_get_advertising_overview"), "Must define newsroom_get_advertising_overview");
  assert.ok(sql.includes("newsroom_create_advertiser"), "Must define newsroom_create_advertiser");
  assert.ok(sql.includes("newsroom_create_creative"), "Must define newsroom_create_creative");
  assert.ok(sql.includes("newsroom_update_campaign_status"), "Must define newsroom_update_campaign_status");
  assert.ok(sql.includes("newsroom_get_subscribers_directory"), "Must define newsroom_get_subscribers_directory");
  assert.ok(sql.includes("newsroom_update_subscriber_status"), "Must define newsroom_update_subscriber_status");
  assert.ok(sql.includes("newsroom_grant_subscriber_entitlement"), "Must define newsroom_grant_subscriber_entitlement");
  assert.ok(sql.includes("newsroom_get_premium_operations_overview"), "Must define newsroom_get_premium_operations_overview");

  // Security Grants
  assert.ok(sql.includes("revoke execute on function public.newsroom_get_advertising_overview() from anon, public;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_advertising_overview() to authenticated, service_role;"));
  assert.ok(sql.includes("revoke execute on function public.newsroom_get_subscribers_directory(text, text, int, int) from anon, public;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_subscribers_directory(text, text, int, int) to authenticated, service_role;"));
  assert.ok(sql.includes("revoke execute on function public.newsroom_get_premium_operations_overview() from anon, public;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_premium_operations_overview() to authenticated, service_role;"));
});

test("HT-NR-CLOSE Wave D: mapAdvertiser correctly maps raw database row", () => {
  const raw = {
    id: "adv-1",
    name: "Ministry of Health",
    contact_notes: "Government partner",
    created_at: "2026-09-01T00:00:00Z",
    active_campaigns_count: 3
  };
  const mapped = mapAdvertiser(raw);
  assert.equal(mapped.id, "adv-1");
  assert.equal(mapped.name, "Ministry of Health");
  assert.equal(mapped.contactNotes, "Government partner");
  assert.equal(mapped.activeCampaignsCount, 3);
});

test("HT-NR-CLOSE Wave D: mapAdCampaign correctly maps raw database row", () => {
  const raw = {
    id: "camp-1",
    advertiser_id: "adv-1",
    advertiser_name: "Ministry of Health",
    name: "Vaccine Rollout",
    status: "active",
    review_status: "approved",
    start_at: "2026-10-01T00:00:00Z",
    end_at: "2026-11-01T00:00:00Z",
    created_by: "staff-1",
    approved_by: "staff-2",
    approved_at: "2026-09-30T10:00:00Z",
    created_at: "2026-09-25T00:00:00Z",
    creatives_count: 2
  };
  const mapped = mapAdCampaign(raw);
  assert.equal(mapped.id, "camp-1");
  assert.equal(mapped.advertiserName, "Ministry of Health");
  assert.equal(mapped.status, "active");
  assert.equal(mapped.reviewStatus, "approved");
  assert.equal(mapped.creativesCount, 2);
});

test("HT-NR-CLOSE Wave D: mapAdvertisingOverview aggregates commercial entities and metrics", () => {
  const raw = {
    advertisers: [{ id: "a1", name: "HOSPAZ", active_campaigns_count: 1 }],
    campaigns: [{ id: "c1", advertiser_id: "a1", name: "HOSPAZ continuity", status: "active", review_status: "approved" }],
    creatives: [{ id: "cr1", campaign_id: "c1", placement: "hospaz-header-direct", status: "active" }],
    placements: [{ id: "p1", placement_key: "hospaz-header-direct", name: "Header", allowed_sources: ["direct"] }],
    metrics: {
      total_advertisers: 1,
      total_campaigns: 1,
      active_campaigns: 1,
      pending_review_campaigns: 0,
      total_creatives: 1,
      total_placements: 1
    }
  };
  const mapped = mapAdvertisingOverview(raw);
  assert.equal(mapped.advertisers.length, 1);
  assert.equal(mapped.campaigns.length, 1);
  assert.equal(mapped.creatives.length, 1);
  assert.equal(mapped.placements.length, 1);
  assert.equal(mapped.metrics.totalAdvertisers, 1);
  assert.equal(mapped.metrics.activeCampaigns, 1);
});

test("HT-NR-CLOSE Wave D: mapSubscriber correctly maps entitlements and active premium status", () => {
  const raw = {
    id: "sub-1",
    auth_user_id: "user-1",
    email: "reader@example.com",
    display_name: "Test Reader",
    status: "active",
    created_at: "2026-05-01T00:00:00Z",
    has_active_premium: true,
    entitlements: [
      {
        id: "ent-1",
        policy_key: "premium",
        starts_at: "2026-05-01T00:00:00Z",
        ends_at: "2027-05-01T00:00:00Z",
        provider: "stripe",
        provider_reference: "sub_123",
        is_active: true
      }
    ]
  };
  const mapped = mapSubscriber(raw);
  assert.equal(mapped.id, "sub-1");
  assert.equal(mapped.email, "reader@example.com");
  assert.equal(mapped.hasActivePremium, true);
  assert.equal(mapped.entitlements.length, 1);
  assert.equal(mapped.entitlements[0].policyKey, "premium");
  assert.equal(mapped.entitlements[0].isActive, true);
});

test("HT-NR-CLOSE Wave D: mapPremiumOperationsOverview maps teaser policy and inventory", () => {
  const raw = {
    policies: [
      { key: "public", name: "Public", description: "Open", is_metered: false },
      { key: "premium", name: "Premium", description: "Paywalled", is_metered: true }
    ],
    teaser_policy: {
      authority: "AG-05 / Owner Policy",
      enabled: true,
      duration_seconds: 20,
      paragraph_count: 1,
      enforcement: "Strict server-side body truncation with timer cutoff"
    },
    inventory_breakdown: {
      total_stories: 5792,
      premium_stories_count: 842,
      public_stories_count: 4950
    },
    recent_premium_stories: [
      { id: "s1", title: "Investigative Work", status: "published", access_policy: "premium" }
    ],
    subscriber_stats: {
      total_subscribers: 428,
      active_entitlements_count: 184,
      total_entitled_subscribers: 184,
      providers: [{ provider: "stripe", count: 112 }]
    }
  };
  const mapped = mapPremiumOperationsOverview(raw);
  assert.equal(mapped.policies.length, 2);
  assert.equal(mapped.teaserPolicy.durationSeconds, 20);
  assert.equal(mapped.teaserPolicy.paragraphCount, 1);
  assert.equal(mapped.inventoryBreakdown.totalStories, 5792);
  assert.equal(mapped.inventoryBreakdown.premiumStoriesCount, 842);
  assert.equal(mapped.subscriberStats.totalEntitledSubscribers, 184);
});

test("HT-NR-CLOSE Wave D: security capability predicates enforce strict permissions", () => {
  const snapAnonymous = emptyAuthorizationSnapshot("anonymous", "Not logged in");
  assert.equal(hasAdvertisingDeskAccess(snapAnonymous), false);
  assert.equal(canCreateCampaign(snapAnonymous), false);
  assert.equal(canApproveCampaign(snapAnonymous), false);
  assert.equal(hasSubscriberDeskAccess(snapAnonymous), false);
  assert.equal(canManageSubscribers(snapAnonymous), false);
  assert.equal(hasPremiumDeskAccess(snapAnonymous), false);
  assert.equal(canManagePremium(snapAnonymous), false);
  assert.equal(canAssignPremium(snapAnonymous), false);

  const snapCommercialManager = {
    status: "authorized",
    staffProfileId: "sp-cm",
    capabilities: ["ads.view", "ads.create", "ads.approve", "subscriber.view", "subscriber.manage", "premium.manage"],
    source: "server",
    reason: "Valid session"
  };
  assert.equal(hasAdvertisingDeskAccess(snapCommercialManager), true);
  assert.equal(canCreateCampaign(snapCommercialManager), true);
  assert.equal(canApproveCampaign(snapCommercialManager), true);
  assert.equal(hasSubscriberDeskAccess(snapCommercialManager), true);
  assert.equal(canManageSubscribers(snapCommercialManager), true);
  assert.equal(hasPremiumDeskAccess(snapCommercialManager), true);
  assert.equal(canManagePremium(snapCommercialManager), true);
  assert.equal(canAssignPremium(snapCommercialManager), true);

  const snapEditor = {
    status: "authorized",
    staffProfileId: "sp-ed",
    capabilities: ["premium.assign", "subscriber.view"],
    source: "server",
    reason: "Valid session"
  };
  assert.equal(hasAdvertisingDeskAccess(snapEditor), false);
  assert.equal(hasSubscriberDeskAccess(snapEditor), true);
  assert.equal(canManageSubscribers(snapEditor), false);
  assert.equal(hasPremiumDeskAccess(snapEditor), true);
  assert.equal(canManagePremium(snapEditor), false);
  assert.equal(canAssignPremium(snapEditor), true);
});

test("HT-NR-CLOSE Wave D: preview data builders return complete commercial data", () => {
  const adv = buildPreviewAdvertisingOverview();
  assert.ok(adv.advertisers.length >= 2, "Must contain sample advertisers");
  assert.ok(adv.campaigns.length >= 2, "Must contain sample campaigns");
  assert.ok(adv.creatives.length >= 2, "Must contain sample creatives");
  assert.ok(adv.placements.length >= 2, "Must contain sample placements");
  assert.equal(adv.metrics.totalAdvertisers, adv.advertisers.length);

  const subs = buildPreviewSubscribersDirectory();
  assert.ok(subs.subscribers.length >= 3, "Must contain sample subscribers");
  assert.ok(subs.metrics.totalSubscribers > 0, "Metrics must have totalSubscribers");
  assert.ok(subs.metrics.premiumSubscribers > 0, "Metrics must have premiumSubscribers");

  const prem = buildPreviewPremiumOperationsOverview();
  assert.equal(prem.teaserPolicy.durationSeconds, 20);
  assert.equal(prem.teaserPolicy.paragraphCount, 1);
  assert.ok(prem.inventoryBreakdown.premiumStoriesCount > 0);
  assert.ok(prem.recentPremiumStories.length >= 2);
});

test("HT-NR-CLOSE Wave D: OWNER_PREVIEW_NAV_ITEMS contains 22 modules including commercial", () => {
  assert.ok(OWNER_PREVIEW_NAV_ITEMS.length >= 22, `Expected at least 22 nav items, found ${OWNER_PREVIEW_NAV_ITEMS.length}`);
  const keys = OWNER_PREVIEW_NAV_ITEMS.map((item) => item.key);
  assert.ok(keys.includes("advertising"), "Must include advertising");
  assert.ok(keys.includes("subscribers"), "Must include subscribers");
  assert.ok(keys.includes("premium"), "Must include premium");
});

test("HT-NR-CLOSE Wave D: createNewsroomCommercialService executes RPCs with expected parameters", async () => {
  const calls = [];
  const mockClient = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      if (fn === "newsroom_get_advertising_overview") {
        return { data: { advertisers: [], campaigns: [], creatives: [], placements: [], metrics: {} }, error: null };
      }
      if (fn === "newsroom_create_advertiser") {
        return { data: "new-adv-id", error: null };
      }
      if (fn === "newsroom_create_campaign") {
        return { data: "new-camp-id", error: null };
      }
      if (fn === "newsroom_create_creative") {
        return { data: "new-cr-id", error: null };
      }
      if (fn === "newsroom_approve_campaign") {
        return { data: "approved", error: null };
      }
      if (fn === "newsroom_update_campaign_status") {
        return { data: "active", error: null };
      }
      if (fn === "newsroom_get_subscribers_directory") {
        return { data: { subscribers: [], total_count: 0, metrics: {} }, error: null };
      }
      if (fn === "newsroom_update_subscriber_status") {
        return { data: "suspended", error: null };
      }
      if (fn === "newsroom_grant_subscriber_entitlement") {
        return { data: "new-ent-id", error: null };
      }
      if (fn === "newsroom_get_premium_operations_overview") {
        return { data: { policies: [], teaser_policy: {}, inventory_breakdown: {}, recent_premium_stories: [], subscriber_stats: {} }, error: null };
      }
      if (fn === "newsroom_set_story_access") {
        return { data: "premium", error: null };
      }
      return { data: null, error: null };
    }
  };

  const service = createNewsroomCommercialService(() => mockClient);

  await service.getAdvertisingOverview();
  assert.equal(calls[0].fn, "newsroom_get_advertising_overview");

  const advId = await service.createAdvertiser("Test Partner", "Notes");
  assert.equal(advId, "new-adv-id");
  assert.equal(calls[1].fn, "newsroom_create_advertiser");
  assert.deepEqual(calls[1].args, { p_name: "Test Partner", p_contact_notes: "Notes" });

  const campId = await service.createCampaign({ advertiserId: advId, name: "Test Camp" });
  assert.equal(campId, "new-camp-id");
  assert.equal(calls[2].fn, "newsroom_create_campaign");

  const crId = await service.createCreative({ campaignId: campId, placement: "header" });
  assert.equal(crId, "new-cr-id");

  const appr = await service.approveCampaign(campId, true);
  assert.equal(appr, "approved");

  const stat = await service.updateCampaignStatus(campId, "active");
  assert.equal(stat, "active");

  await service.getSubscribersDirectory({ status: "active", limit: 20 });
  assert.equal(calls[6].fn, "newsroom_get_subscribers_directory");

  const subStat = await service.updateSubscriberStatus("sub-1", "suspended");
  assert.equal(subStat, "suspended");

  const entId = await service.grantSubscriberEntitlement("sub-1", "premium", 60);
  assert.equal(entId, "new-ent-id");

  await service.getPremiumOperationsOverview();
  assert.equal(calls[9].fn, "newsroom_get_premium_operations_overview");

  const pol = await service.setStoryAccess("story-1", "premium");
  assert.equal(pol, "premium");
});
