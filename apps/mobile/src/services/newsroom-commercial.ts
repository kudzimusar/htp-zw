import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsroomCommercialService } from "../domain/contracts";
import type {
  NewsroomAdvertiser,
  NewsroomAdCampaign,
  NewsroomAdCreative,
  NewsroomAdPlacement,
  NewsroomAdvertisingOverview,
  NewsroomCreateCampaignInput,
  NewsroomCreateCreativeInput,
  NewsroomSubscriberEntitlement,
  NewsroomSubscriber,
  NewsroomSubscribersDirectory,
  NewsroomPremiumPolicy,
  NewsroomTeaserPolicy,
  NewsroomPremiumStoryItem,
  NewsroomPremiumOperationsOverview
} from "../domain/models";
import { getStagingSupabaseClient } from "../platform/supabase";

export function mapAdvertiser(raw: Record<string, unknown>): NewsroomAdvertiser {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "Unnamed Advertiser"),
    contactNotes: raw.contact_notes ? String(raw.contact_notes) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    activeCampaignsCount: Number(raw.active_campaigns_count ?? 0)
  };
}

export function mapAdCampaign(raw: Record<string, unknown>): NewsroomAdCampaign {
  return {
    id: String(raw.id ?? ""),
    advertiserId: String(raw.advertiser_id ?? ""),
    advertiserName: String(raw.advertiser_name ?? "Unknown Advertiser"),
    name: String(raw.name ?? "Untitled Campaign"),
    status: String(raw.status ?? "draft"),
    reviewStatus: String(raw.review_status ?? "pending"),
    startAt: raw.start_at ? String(raw.start_at) : null,
    endAt: raw.end_at ? String(raw.end_at) : null,
    createdBy: raw.created_by ? String(raw.created_by) : null,
    approvedBy: raw.approved_by ? String(raw.approved_by) : null,
    approvedAt: raw.approved_at ? String(raw.approved_at) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    creativesCount: Number(raw.creatives_count ?? 0)
  };
}

export function mapAdCreative(raw: Record<string, unknown>): NewsroomAdCreative {
  return {
    id: String(raw.id ?? ""),
    campaignId: String(raw.campaign_id ?? ""),
    campaignName: String(raw.campaign_name ?? "Unknown Campaign"),
    placement: String(raw.placement ?? ""),
    destinationUrl: raw.destination_url ? String(raw.destination_url) : null,
    disclosureLabel: String(raw.disclosure_label ?? "Advertisement"),
    status: String(raw.status ?? "active"),
    createdAt: String(raw.created_at ?? new Date().toISOString())
  };
}

export function mapAdPlacement(raw: Record<string, unknown>): NewsroomAdPlacement {
  return {
    id: String(raw.id ?? ""),
    placementKey: String(raw.placement_key ?? ""),
    name: String(raw.name ?? ""),
    allowedSources: Array.isArray(raw.allowed_sources) ? raw.allowed_sources.map(String) : ["direct", "adsense", "house"],
    defaultSource: String(raw.default_source ?? "none"),
    status: String(raw.status ?? "active"),
    layoutPolicy: (raw.layout_policy && typeof raw.layout_policy === "object") ? raw.layout_policy as Record<string, unknown> : {}
  };
}

export function mapAdvertisingOverview(raw: Record<string, unknown>): NewsroomAdvertisingOverview {
  const advertisersRaw = Array.isArray(raw.advertisers) ? raw.advertisers : [];
  const campaignsRaw = Array.isArray(raw.campaigns) ? raw.campaigns : [];
  const creativesRaw = Array.isArray(raw.creatives) ? raw.creatives : [];
  const placementsRaw = Array.isArray(raw.placements) ? raw.placements : [];
  const metricsRaw = (raw.metrics && typeof raw.metrics === "object") ? raw.metrics as Record<string, unknown> : {};

  return {
    advertisers: advertisersRaw.map((a) => mapAdvertiser(a as Record<string, unknown>)),
    campaigns: campaignsRaw.map((c) => mapAdCampaign(c as Record<string, unknown>)),
    creatives: creativesRaw.map((cr) => mapAdCreative(cr as Record<string, unknown>)),
    placements: placementsRaw.map((p) => mapAdPlacement(p as Record<string, unknown>)),
    metrics: {
      totalAdvertisers: Number(metricsRaw.total_advertisers ?? advertisersRaw.length),
      totalCampaigns: Number(metricsRaw.total_campaigns ?? campaignsRaw.length),
      activeCampaigns: Number(metricsRaw.active_campaigns ?? 0),
      pendingReviewCampaigns: Number(metricsRaw.pending_review_campaigns ?? 0),
      totalCreatives: Number(metricsRaw.total_creatives ?? creativesRaw.length),
      totalPlacements: Number(metricsRaw.total_placements ?? placementsRaw.length)
    }
  };
}

export function mapSubscriberEntitlement(raw: Record<string, unknown>): NewsroomSubscriberEntitlement {
  return {
    id: String(raw.id ?? ""),
    policyKey: String(raw.policy_key ?? "premium"),
    startsAt: String(raw.starts_at ?? new Date().toISOString()),
    endsAt: raw.ends_at ? String(raw.ends_at) : null,
    provider: raw.provider ? String(raw.provider) : null,
    providerReference: raw.provider_reference ? String(raw.provider_reference) : null,
    isActive: Boolean(raw.is_active ?? true)
  };
}

export function mapSubscriber(raw: Record<string, unknown>): NewsroomSubscriber {
  const entitlementsRaw = Array.isArray(raw.entitlements) ? raw.entitlements : [];
  return {
    id: String(raw.id ?? ""),
    authUserId: raw.auth_user_id ? String(raw.auth_user_id) : null,
    email: String(raw.email ?? ""),
    displayName: raw.display_name ? String(raw.display_name) : null,
    status: String(raw.status ?? "active"),
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    hasActivePremium: Boolean(raw.has_active_premium ?? false),
    entitlements: entitlementsRaw.map((e) => mapSubscriberEntitlement(e as Record<string, unknown>))
  };
}

export function mapSubscribersDirectory(raw: Record<string, unknown>): NewsroomSubscribersDirectory {
  const subscribersRaw = Array.isArray(raw.subscribers) ? raw.subscribers : [];
  const metricsRaw = (raw.metrics && typeof raw.metrics === "object") ? raw.metrics as Record<string, unknown> : {};

  return {
    subscribers: subscribersRaw.map((s) => mapSubscriber(s as Record<string, unknown>)),
    totalCount: Number(raw.total_count ?? subscribersRaw.length),
    metrics: {
      totalSubscribers: Number(metricsRaw.total_subscribers ?? subscribersRaw.length),
      activeSubscribers: Number(metricsRaw.active_subscribers ?? 0),
      premiumSubscribers: Number(metricsRaw.premium_subscribers ?? 0),
      suspendedSubscribers: Number(metricsRaw.suspended_subscribers ?? 0),
      canceledSubscribers: Number(metricsRaw.canceled_subscribers ?? 0)
    }
  };
}

export function mapPremiumOperationsOverview(raw: Record<string, unknown>): NewsroomPremiumOperationsOverview {
  const policiesRaw = Array.isArray(raw.policies) ? raw.policies : [];
  const teaserRaw = (raw.teaser_policy && typeof raw.teaser_policy === "object") ? raw.teaser_policy as Record<string, unknown> : {};
  const inventoryRaw = (raw.inventory_breakdown && typeof raw.inventory_breakdown === "object") ? raw.inventory_breakdown as Record<string, unknown> : {};
  const recentStoriesRaw = Array.isArray(raw.recent_premium_stories) ? raw.recent_premium_stories : [];
  const subscriberStatsRaw = (raw.subscriber_stats && typeof raw.subscriber_stats === "object") ? raw.subscriber_stats as Record<string, unknown> : {};
  const providersRaw = Array.isArray(subscriberStatsRaw.providers) ? subscriberStatsRaw.providers : [];

  return {
    policies: policiesRaw.map((p: any) => ({
      key: String(p.key ?? ""),
      name: String(p.name ?? ""),
      description: String(p.description ?? ""),
      isMetered: Boolean(p.is_metered ?? false)
    })),
    teaserPolicy: {
      authority: String(teaserRaw.authority ?? "AG-05 / Owner Policy"),
      enabled: Boolean(teaserRaw.enabled ?? true),
      durationSeconds: Number(teaserRaw.duration_seconds ?? 20),
      paragraphCount: Number(teaserRaw.paragraph_count ?? 1),
      enforcement: String(teaserRaw.enforcement ?? "Strict server-side body truncation with timer cutoff")
    },
    inventoryBreakdown: {
      totalStories: Number(inventoryRaw.total_stories ?? 0),
      premiumStoriesCount: Number(inventoryRaw.premium_stories_count ?? 0),
      publicStoriesCount: Number(inventoryRaw.public_stories_count ?? 0)
    },
    recentPremiumStories: recentStoriesRaw.map((s: any) => ({
      id: String(s.id ?? ""),
      title: String(s.title ?? "Untitled Story"),
      status: String(s.status ?? "published"),
      accessPolicy: String(s.access_policy ?? "premium"),
      publishedAt: s.published_at ? String(s.published_at) : null,
      updatedAt: String(s.updated_at ?? new Date().toISOString())
    })),
    subscriberStats: {
      totalSubscribers: Number(subscriberStatsRaw.total_subscribers ?? 0),
      activeEntitlementsCount: Number(subscriberStatsRaw.active_entitlements_count ?? 0),
      totalEntitledSubscribers: Number(subscriberStatsRaw.total_entitled_subscribers ?? 0),
      providers: providersRaw.map((pr: any) => ({
        provider: String(pr.provider ?? "unknown"),
        count: Number(pr.count ?? 0)
      }))
    }
  };
}

export function createNewsroomCommercialService(
  getClient: () => SupabaseClient
): NewsroomCommercialService {
  return {
    async getAdvertisingOverview(): Promise<NewsroomAdvertisingOverview> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_get_advertising_overview");
      if (error) {
        throw new Error(`Failed to load advertising overview: ${error.message} (code ${error.code})`);
      }
      return mapAdvertisingOverview((data as Record<string, unknown>) ?? {});
    },

    async createAdvertiser(name: string, contactNotes?: string | null): Promise<string> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_create_advertiser", {
        p_name: name,
        p_contact_notes: contactNotes ?? null
      });
      if (error) {
        throw new Error(`Failed to create advertiser: ${error.message} (code ${error.code})`);
      }
      return String(data);
    },

    async createCampaign(input: NewsroomCreateCampaignInput): Promise<string> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_create_campaign", {
        p_advertiser_id: input.advertiserId,
        p_name: input.name,
        p_start_at: input.startAt ?? null,
        p_end_at: input.endAt ?? null
      });
      if (error) {
        throw new Error(`Failed to create campaign: ${error.message} (code ${error.code})`);
      }
      return String(data);
    },

    async createCreative(input: NewsroomCreateCreativeInput): Promise<string> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_create_creative", {
        p_campaign_id: input.campaignId,
        p_placement: input.placement,
        p_destination_url: input.destinationUrl ?? null,
        p_disclosure_label: input.disclosureLabel ?? "Advertisement"
      });
      if (error) {
        throw new Error(`Failed to create creative: ${error.message} (code ${error.code})`);
      }
      return String(data);
    },

    async approveCampaign(campaignId: string, approved: boolean): Promise<string> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_approve_campaign", {
        p_campaign_id: campaignId,
        p_approved: approved
      });
      if (error) {
        throw new Error(`Failed to review campaign: ${error.message} (code ${error.code})`);
      }
      return String(data);
    },

    async updateCampaignStatus(campaignId: string, status: string): Promise<string> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_update_campaign_status", {
        p_campaign_id: campaignId,
        p_status: status
      });
      if (error) {
        throw new Error(`Failed to update campaign status: ${error.message} (code ${error.code})`);
      }
      return String(data);
    },

    async getSubscribersDirectory(options?: {
      status?: string | null;
      search?: string | null;
      limit?: number;
      offset?: number;
    }): Promise<NewsroomSubscribersDirectory> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_get_subscribers_directory", {
        p_status: options?.status ?? null,
        p_search: options?.search ?? null,
        p_limit: options?.limit ?? 50,
        p_offset: options?.offset ?? 0
      });
      if (error) {
        throw new Error(`Failed to load subscribers directory: ${error.message} (code ${error.code})`);
      }
      return mapSubscribersDirectory((data as Record<string, unknown>) ?? {});
    },

    async updateSubscriberStatus(subscriberId: string, status: string): Promise<string> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_update_subscriber_status", {
        p_subscriber_id: subscriberId,
        p_status: status
      });
      if (error) {
        throw new Error(`Failed to update subscriber status: ${error.message} (code ${error.code})`);
      }
      return String(data);
    },

    async grantSubscriberEntitlement(
      subscriberId: string,
      policyKey?: string,
      durationDays?: number,
      provider?: string
    ): Promise<string> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_grant_subscriber_entitlement", {
        p_subscriber_id: subscriberId,
        p_policy_key: policyKey ?? "premium",
        p_duration_days: durationDays ?? 30,
        p_provider: provider ?? "staff_grant"
      });
      if (error) {
        throw new Error(`Failed to grant subscriber entitlement: ${error.message} (code ${error.code})`);
      }
      return String(data);
    },

    async getPremiumOperationsOverview(): Promise<NewsroomPremiumOperationsOverview> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_get_premium_operations_overview");
      if (error) {
        throw new Error(`Failed to load premium operations overview: ${error.message} (code ${error.code})`);
      }
      return mapPremiumOperationsOverview((data as Record<string, unknown>) ?? {});
    },

    async setStoryAccess(storyId: string, accessPolicy: "public" | "premium"): Promise<string> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_set_story_access", {
        p_story_id: storyId,
        p_access_policy: accessPolicy
      });
      if (error) {
        throw new Error(`Failed to set story access policy: ${error.message} (code ${error.code})`);
      }
      return String(data);
    }
  };
}

export const stagingNewsroomCommercialService = createNewsroomCommercialService(getStagingSupabaseClient);
