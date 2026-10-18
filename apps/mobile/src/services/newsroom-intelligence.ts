import type {
  NewsroomEditorialIntelligence,
  NewsroomGrowthIntelligence,
  NewsroomAudienceIntelligence
} from "../domain/models";
import type { NewsroomIntelligenceService } from "../domain/contracts";
import { getStagingSupabaseClient } from "../platform/supabase";

export function mapEditorialIntelligence(
  data: any
): NewsroomEditorialIntelligence | null {
  if (!data || typeof data !== "object") return null;

  const inv = data.story_inventory ?? data.storyInventory;
  if (!inv || typeof inv !== "object") return null;

  const vel = data.publishing_velocity ?? data.publishingVelocity;
  if (!vel || typeof vel !== "object") return null;

  const rq = data.review_queue ?? data.reviewQueue;
  if (!rq || typeof rq !== "object") return null;

  const asg = data.assignments;
  if (!asg || typeof asg !== "object") return null;

  const rawDeskMix = data.desk_mix ?? data.deskMix;
  const deskMix = Array.isArray(rawDeskMix)
    ? rawDeskMix.map((item: any) => ({
        desk: String(item.desk ?? "General"),
        count: Number(item.count ?? 0)
      }))
    : [];

  const rawDist = data.distribution_reach ?? data.distributionReach ?? {};
  const distributionReach = {
    socialPostsCount: Number(rawDist.social_posts_count ?? rawDist.socialPostsCount ?? 0),
    newsletterCampaignsCount: Number(rawDist.newsletter_campaigns_count ?? rawDist.newsletterCampaignsCount ?? 0),
    pushAlertsCount: Number(rawDist.push_alerts_count ?? rawDist.pushAlertsCount ?? 0),
    whatsappBroadcastsCount: Number(rawDist.whatsapp_broadcasts_count ?? rawDist.whatsappBroadcastsCount ?? 0)
  };

  return {
    generatedAt: String(data.generated_at ?? data.generatedAt ?? new Date().toISOString()),
    storyInventory: {
      total: Number(inv.total ?? 0),
      published: Number(inv.published ?? 0),
      draft: Number(inv.draft ?? 0),
      review: Number(inv.review ?? 0),
      scheduled: Number(inv.scheduled ?? 0),
      archived: Number(inv.archived ?? 0)
    },
    publishingVelocity: {
      last24Hours: Number(vel.last_24_hours ?? vel.last24Hours ?? 0),
      last7Days: Number(vel.last_7_days ?? vel.last7Days ?? 0),
      last30Days: Number(vel.last_30_days ?? vel.last30Days ?? 0)
    },
    reviewQueue: {
      inReviewCount: Number(rq.in_review_count ?? rq.inReviewCount ?? 0),
      avgAgeHours: Number(rq.avg_age_hours ?? rq.avgAgeHours ?? 0),
      oldestAgeHours: Number(rq.oldest_age_hours ?? rq.oldestAgeHours ?? 0)
    },
    assignments: {
      total: Number(asg.total ?? 0),
      active: Number(asg.active ?? 0),
      overdue: Number(asg.overdue ?? 0),
      completed: Number(asg.completed ?? 0)
    },
    deskMix,
    distributionReach
  };
}

export function mapGrowthIntelligence(
  data: any
): NewsroomGrowthIntelligence | null {
  if (!data || typeof data !== "object") return null;

  const rawIntegrations = data.integrations;
  const integrations = Array.isArray(rawIntegrations)
    ? rawIntegrations.map((item: any) => ({
        id: String(item.id ?? ""),
        provider: String(item.provider ?? ""),
        integrationKey: String(item.integration_key ?? item.integrationKey ?? ""),
        status: String(item.status ?? "unconfigured"),
        externalAccountId: item.external_account_id ?? item.externalAccountId ?? null,
        externalPropertyId: item.external_property_id ?? item.externalPropertyId ?? null,
        externalMeasurementId: item.external_measurement_id ?? item.externalMeasurementId ?? null,
        lastSuccessAt: item.last_success_at ?? item.lastSuccessAt ?? null,
        lastErrorAt: item.last_error_at ?? item.lastErrorAt ?? null,
        lastError: item.last_error ?? item.lastError ?? null,
        notes: item.notes ? String(item.notes) : null
      }))
    : [];

  const rawDaily = data.analytics_daily_summary ?? data.analyticsDailySummary ?? {};
  const analyticsDailySummary = {
    rowsRecorded: Number(rawDaily.rows_recorded ?? rawDaily.rowsRecorded ?? 0),
    totalPageViews: Number(rawDaily.total_page_views ?? rawDaily.totalPageViews ?? 0),
    totalUsers: Number(rawDaily.total_users ?? rawDaily.totalUsers ?? 0),
    totalSessions: Number(rawDaily.total_sessions ?? rawDaily.totalSessions ?? 0),
    status: (rawDaily.status === "active" ? "active" : "pending_ingestion") as "active" | "pending_ingestion"
  };

  const rawSearch = data.search_console_summary ?? data.searchConsoleSummary ?? {};
  const searchConsoleSummary = {
    property: String(rawSearch.property ?? "https://healthtimes.co.zw/"),
    rowsRecorded: Number(rawSearch.rows_recorded ?? rawSearch.rowsRecorded ?? 0),
    totalClicks: Number(rawSearch.total_clicks ?? rawSearch.totalClicks ?? 0),
    totalImpressions: Number(rawSearch.total_impressions ?? rawSearch.totalImpressions ?? 0),
    status: (rawSearch.status === "active" ? "active" : "pending_ingestion") as "active" | "pending_ingestion"
  };

  const rawSeo = data.seo_health ?? data.seoHealth ?? {};
  const seoHealth = {
    totalStories: Number(rawSeo.total_stories ?? rawSeo.totalStories ?? 0),
    withSeoTitle: Number(rawSeo.with_seo_title ?? rawSeo.withSeoTitle ?? 0),
    withSeoDescription: Number(rawSeo.with_seo_description ?? rawSeo.withSeoDescription ?? 0),
    withCanonicalUrl: Number(rawSeo.with_canonical_url ?? rawSeo.withCanonicalUrl ?? 0)
  };

  const rawCit = data.citations_summary ?? data.citationsSummary ?? {};
  const citationsSummary = {
    status: String(rawCit.status ?? "provider_not_connected"),
    verifiedCitationsCount: Number(rawCit.verified_citations_count ?? rawCit.verifiedCitationsCount ?? 0),
    institutionalReferencesCount: Number(rawCit.institutional_references_count ?? rawCit.institutionalReferencesCount ?? 0),
    governmentNgoMentionsCount: Number(rawCit.government_ngo_mentions_count ?? rawCit.governmentNgoMentionsCount ?? 0),
    notes: String(rawCit.notes ?? "Production citation tracking requires academic/cross-ref indexer API integration.")
  };

  return {
    generatedAt: String(data.generated_at ?? data.generatedAt ?? new Date().toISOString()),
    integrations,
    analyticsDailySummary,
    searchConsoleSummary,
    seoHealth,
    citationsSummary
  };
}

export function mapAudienceIntelligence(
  data: any
): NewsroomAudienceIntelligence | null {
  if (!data || typeof data !== "object") return null;

  const rawContacts = data.contacts ?? {};
  const rawSegments = data.segments ?? {};
  const rawPush = data.push_subscribers ?? data.pushSubscribers ?? {};
  const rawWhatsApp = data.whatsapp_distribution ?? data.whatsappDistribution ?? {};
  const rawSubs = data.subscribers ?? {};
  const rawGa4 = data.ga4_audience_status ?? data.ga4AudienceStatus ?? {};

  return {
    generatedAt: String(data.generated_at ?? data.generatedAt ?? new Date().toISOString()),
    contacts: {
      totalProfiles: Number(rawContacts.total_profiles ?? rawContacts.totalProfiles ?? 0),
      consentedContacts: Number(rawContacts.consented_contacts ?? rawContacts.consentedContacts ?? 0)
    },
    segments: {
      totalSegments: Number(rawSegments.total_segments ?? rawSegments.totalSegments ?? 0),
      totalMemberships: Number(rawSegments.total_memberships ?? rawSegments.totalMemberships ?? 0)
    },
    pushSubscribers: {
      registeredDevices: Number(rawPush.registered_devices ?? rawPush.registeredDevices ?? 0),
      activeDevices: Number(rawPush.active_devices ?? rawPush.activeDevices ?? 0)
    },
    whatsappDistribution: {
      totalBroadcasts: Number(rawWhatsApp.total_broadcasts ?? rawWhatsApp.totalBroadcasts ?? 0),
      sentBroadcasts: Number(rawWhatsApp.sent_broadcasts ?? rawWhatsApp.sentBroadcasts ?? 0)
    },
    subscribers: {
      totalSubscribers: Number(rawSubs.total_subscribers ?? rawSubs.totalSubscribers ?? 0),
      activeSubscribers: Number(rawSubs.active_subscribers ?? rawSubs.activeSubscribers ?? 0)
    },
    ga4AudienceStatus: {
      propertyId: String(rawGa4.property_id ?? rawGa4.propertyId ?? "359235319"),
      accountId: String(rawGa4.account_id ?? rawGa4.accountId ?? "137814020"),
      status: String(rawGa4.status ?? "identity_verified_account_access_pending"),
      notes: String(rawGa4.notes ?? "Google Analytics 4 property identified. Awaiting Data API service account grant.")
    }
  };
}

export function createNewsroomIntelligenceService(
  clientFactory: () => any
): NewsroomIntelligenceService {
  return {
    async getEditorialIntelligence(): Promise<NewsroomEditorialIntelligence> {
      const client = clientFactory();
      const { data, error } = await client.rpc("newsroom_get_editorial_intelligence");

      if (error) {
        throw new Error(`Failed to load editorial intelligence: ${error.message}`);
      }

      const mapped = mapEditorialIntelligence(data);
      if (!mapped) {
        throw new Error("Malformed editorial intelligence payload received from server.");
      }

      return mapped;
    },

    async getGrowthIntelligence(): Promise<NewsroomGrowthIntelligence> {
      const client = clientFactory();
      const { data, error } = await client.rpc("newsroom_get_growth_intelligence");

      if (error) {
        throw new Error(`Failed to load growth intelligence: ${error.message}`);
      }

      const mapped = mapGrowthIntelligence(data);
      if (!mapped) {
        throw new Error("Malformed growth intelligence payload received from server.");
      }

      return mapped;
    },

    async getAudienceIntelligence(): Promise<NewsroomAudienceIntelligence> {
      const client = clientFactory();
      const { data, error } = await client.rpc("newsroom_get_audience_intelligence");

      if (error) {
        throw new Error(`Failed to load audience intelligence: ${error.message}`);
      }

      const mapped = mapAudienceIntelligence(data);
      if (!mapped) {
        throw new Error("Malformed audience intelligence payload received from server.");
      }

      return mapped;
    }
  };
}

export const stagingNewsroomIntelligenceService = createNewsroomIntelligenceService(
  getStagingSupabaseClient
);
