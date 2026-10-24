import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle
} from "react-native";
import type {
  NewsroomAdvertiser,
  NewsroomAdCampaign,
  NewsroomAdCreative,
  NewsroomAdPlacement,
  NewsroomAdvertisingOverview,
  NewsroomCreateCampaignInput,
  NewsroomCreateCreativeInput
} from "../domain/models";
import {
  canApproveCampaign,
  canCreateCampaign,
  hasAdvertisingDeskAccess,
  type AuthorizationSnapshot
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export type AdvertisingDeskTab = "campaigns" | "creatives" | "advertisers" | "placements";

export interface StudioAdvertisingDeskViewProps {
  overview: NewsroomAdvertisingOverview | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  activeTab: AdvertisingDeskTab;
  onChangeTab: (tab: AdvertisingDeskTab) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  statusFilter: string;
  onChangeStatusFilter: (status: string) => void;
  onCreateAdvertiser: (name: string, notes?: string) => Promise<void>;
  onCreateCampaign: (input: NewsroomCreateCampaignInput) => Promise<void>;
  onCreateCreative: (input: NewsroomCreateCreativeInput) => Promise<void>;
  onApproveCampaign: (campaignId: string, approved: boolean) => Promise<void>;
  onUpdateCampaignStatus: (campaignId: string, status: string) => Promise<void>;
  canCreate: boolean;
  canApprove: boolean;
  actionMessage: string | null;
  isMutating: boolean;
  isOwnerPreview?: boolean;
  onOpenOrders?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#DCFCE7", text: "#166534" },
  approved: { bg: "#E0F2FE", text: "#075985" },
  draft: { bg: "#F3F4F6", text: "#4B5563" },
  paused: { bg: "#FEF3C7", text: "#92400E" },
  rejected: { bg: "#FEE2E2", text: "#991B1B" },
  archived: { bg: "#F3F4F6", text: "#6B7280" },
  continuity_captured: { bg: "#EDE9FE", text: "#5B21B6" }
};

function formatIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toISOString().replace("T", " ").slice(0, 10);
  } catch {
    return "—";
  }
}

export function StudioAdvertisingDeskView({
  overview,
  isLoading,
  error,
  onRefresh,
  activeTab,
  onChangeTab,
  searchQuery,
  onChangeSearchQuery,
  statusFilter,
  onChangeStatusFilter,
  onCreateAdvertiser,
  onCreateCampaign,
  onCreateCreative,
  onApproveCampaign,
  onUpdateCampaignStatus,
  canCreate,
  canApprove,
  actionMessage,
  isMutating,
  isOwnerPreview = false,
  onOpenOrders
}: StudioAdvertisingDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  // Local creation form states
  const [showAdvertiserModal, setShowAdvertiserModal] = useState(false);
  const [newAdvName, setNewAdvName] = useState("");
  const [newAdvNotes, setNewAdvNotes] = useState("");

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [newCampName, setNewCampName] = useState("");
  const [newCampAdvId, setNewCampAdvId] = useState("");

  const [showCreativeModal, setShowCreativeModal] = useState(false);
  const [newCrCampId, setNewCrCampId] = useState("");
  const [newCrPlacement, setNewCrPlacement] = useState("");
  const [newCrDestUrl, setNewCrDestUrl] = useState("");

  const metrics = overview ? {
    ...overview.metrics,
    activeCampaigns: overview.campaigns.filter((campaign) => campaign.status === "active").length
  } : {
    totalAdvertisers: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    pendingReviewCampaigns: 0,
    totalCreatives: 0,
    totalPlacements: 0
  };

  const filteredCampaigns = useMemo(() => {
    if (!overview?.campaigns) return [];
    return overview.campaigns.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.advertiserName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        c.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [overview?.campaigns, searchQuery, statusFilter]);

  const filteredCreatives = useMemo(() => {
    if (!overview?.creatives) return [];
    return overview.creatives.filter((cr) => {
      if (!searchQuery) return true;
      return (
        cr.placement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cr.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cr.destinationUrl && cr.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [overview?.creatives, searchQuery]);

  const filteredAdvertisers = useMemo(() => {
    if (!overview?.advertisers) return [];
    return overview.advertisers.filter((a) => {
      if (!searchQuery) return true;
      return a.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [overview?.advertisers, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerCard, isDesktop ? styles.rowBetween : null]}>
        <View style={styles.headerTitles}>
          <View style={styles.badgeRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>Commercial Desk</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {canApprove ? "Approver Authority" : canCreate ? "Manager Authority" : "Read-Only"}
              </Text>
            </View>
          </View>
          <Text style={styles.mainTitle}>Advertising Manager</Text>
          <Text style={styles.mainSubtitle}>
            Direct campaigns, advertiser accounts, disclosure compliance, and inventory placements.
          </Text>
        </View>

        <View style={styles.headerActions}>
          {onOpenOrders && (
            <Pressable
              style={styles.secondaryButton}
              onPress={onOpenOrders}
              testID="advertising-open-orders-btn"
            >
              <Text style={styles.secondaryButtonText}>Commercial Orders →</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.secondaryButton, isMutating && styles.disabledButton]}
            onPress={onRefresh}
            disabled={isMutating}
          >
            <Text style={styles.secondaryButtonText}>
              {isLoading ? "Refreshing..." : "Refresh Overview"}
            </Text>
          </Pressable>
          {canCreate && (
            <Pressable
              style={[styles.primaryButton, isMutating && styles.disabledButton]}
              onPress={() => setShowCampaignModal(true)}
              disabled={isMutating}
            >
              <Text style={styles.primaryButtonText}>+ New Campaign</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isOwnerPreview && (
        <View
          style={{
            backgroundColor: "#FFFBEB",
            borderWidth: 1,
            borderColor: "#FDE68A",
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.md
          }}
          testID="advertising-preview-banner"
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}>
            ℹ️ Sample Commercial Inventory (Owner Preview): Campaigns, advertisers, creatives, and placements below are sample records. Creating or approving campaigns updates local Preview memory only and does not serve live ads or bill customers.
          </Text>
        </View>
      )}

      {/* Action / Error Banner */}
      {actionMessage && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{actionMessage}</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Metrics Row */}
      <View style={[styles.metricsGrid, isDesktop ? styles.gridCols6 : styles.gridCols2]}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Advertisers</Text>
          <Text style={styles.metricValue}>{metrics.totalAdvertisers}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Campaigns</Text>
          <Text style={styles.metricValue}>{metrics.totalCampaigns}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Campaigns</Text>
          <Text style={[styles.metricValue, { color: "#166534" }]}>{metrics.activeCampaigns}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending Review</Text>
          <Text style={[styles.metricValue, { color: "#92400E" }]}>
            {metrics.pendingReviewCampaigns}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Creatives</Text>
          <Text style={styles.metricValue}>{metrics.totalCreatives}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Placements</Text>
          <Text style={styles.metricValue}>{metrics.totalPlacements}</Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        {(["campaigns", "creatives", "advertisers", "placements"] as AdvertisingDeskTab[]).map(
          (tab) => {
            const isActive = activeTab === tab;
            const labels: Record<AdvertisingDeskTab, string> = {
              campaigns: `Campaigns (${overview?.campaigns.length ?? 0})`,
              creatives: `Creatives (${overview?.creatives.length ?? 0})`,
              advertisers: `Advertisers (${overview?.advertisers.length ?? 0})`,
              placements: `Placements (${overview?.placements.length ?? 0})`
            };
            return (
              <Pressable
                key={tab}
                style={[styles.tabButton, isActive && styles.activeTabButton]}
                onPress={() => onChangeTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {labels[tab]}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>

      {/* Search & Filter Bar */}
      <View style={[styles.toolbarCard, isDesktop ? styles.rowBetween : null]}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          placeholderTextColor="#9CA3AF"
        />

        {activeTab === "campaigns" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPills}>
            {["all", "active", "approved", "draft", "paused", "rejected"].map((status) => (
              <Pressable
                key={status}
                style={[styles.pill, statusFilter === status && styles.activePill]}
                onPress={() => onChangeStatusFilter(status)}
              >
                <Text
                  style={[styles.pillText, statusFilter === status && styles.activePillText]}
                >
                  {status === "all" ? "All Statuses" : status.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {activeTab === "advertisers" && canCreate && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => setShowAdvertiserModal(true)}
          >
            <Text style={styles.primaryButtonText}>+ Add Advertiser</Text>
          </Pressable>
        )}

        {activeTab === "creatives" && canCreate && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => setShowCreativeModal(true)}
          >
            <Text style={styles.primaryButtonText}>+ Add Creative</Text>
          </Pressable>
        )}
      </View>

      {/* TAB CONTENT: Campaigns */}
      {activeTab === "campaigns" && (
        <View style={styles.sectionContainer}>
          {filteredCampaigns.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Campaigns Found</Text>
              <Text style={styles.emptySubtitle}>
                No advertising campaigns match the current filter or search criteria.
              </Text>
            </View>
          ) : (
            filteredCampaigns.map((camp) => {
              const statusStyle = STATUS_COLORS[camp.status.toLowerCase()] ?? {
                bg: "#F3F4F6",
                text: "#4B5563"
              };
              return (
                <View key={camp.id} style={styles.itemCard}>
                  <View style={[styles.rowBetween, { marginBottom: spacing.xs }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{camp.name}</Text>
                      <Text style={styles.itemSubtitle}>
                        Advertiser: <Text style={{ fontWeight: "700" }}>{camp.advertiserName}</Text> • Created {formatIso(camp.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                          {camp.status.toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: "#F3F4F6" }]}>
                        <Text style={[styles.badgeText, { color: "#374151" }]}>
                          Review: {camp.reviewStatus}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.rowBetween, styles.metaRow]}>
                    <Text style={styles.metaText}>
                      Flight: {formatIso(camp.startAt)} → {formatIso(camp.endAt)} • Creatives: {camp.creativesCount}
                    </Text>

                    {/* Quick action buttons */}
                    <View style={styles.actionButtonsRow}>
                      {canApprove && camp.reviewStatus === "pending" && (
                        <>
                          <Pressable
                            style={[styles.smallApproveButton, isMutating && styles.disabledButton]}
                            onPress={() => onApproveCampaign(camp.id, true)}
                            disabled={isMutating}
                          >
                            <Text style={styles.smallApproveText}>Approve</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.smallRejectButton, isMutating && styles.disabledButton]}
                            onPress={() => onApproveCampaign(camp.id, false)}
                            disabled={isMutating}
                          >
                            <Text style={styles.smallRejectText}>Reject</Text>
                          </Pressable>
                        </>
                      )}

                      {(canCreate || canApprove) && camp.status !== "active" && (
                        <Pressable
                          style={[styles.smallActionButton, isMutating && styles.disabledButton]}
                          onPress={() => onUpdateCampaignStatus(camp.id, "active")}
                          disabled={isMutating}
                        >
                          <Text style={styles.smallActionText}>Activate</Text>
                        </Pressable>
                      )}

                      {(canCreate || canApprove) && camp.status === "active" && (
                        <Pressable
                          style={[styles.smallActionButton, isMutating && styles.disabledButton]}
                          onPress={() => onUpdateCampaignStatus(camp.id, "paused")}
                          disabled={isMutating}
                        >
                          <Text style={styles.smallActionText}>Pause</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* TAB CONTENT: Creatives */}
      {activeTab === "creatives" && (
        <View style={styles.sectionContainer}>
          {filteredCreatives.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Creatives Registered</Text>
              <Text style={styles.emptySubtitle}>
                Add creative assets and tie them to active campaigns and approved placements.
              </Text>
            </View>
          ) : (
            filteredCreatives.map((cr) => (
              <View key={cr.id} style={styles.itemCard}>
                <View style={styles.creativePreviewFrame}>
                  {cr.assetUrl ? (
                    <Image
                      source={{ uri: cr.assetUrl }}
                      style={styles.creativePreviewImage}
                      resizeMode="contain"
                      accessibilityLabel={`${cr.campaignName} advertising creative preview`}
                    />
                  ) : (
                    <Text style={styles.creativePreviewUnavailable}>Creative preview pending</Text>
                  )}
                </View>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>Placement: {cr.placement}</Text>
                    <Text style={styles.itemSubtitle}>
                      Campaign: <Text style={{ fontWeight: "700" }}>{cr.campaignName}</Text> • Disclosure: "{cr.disclosureLabel}"
                    </Text>
                    {cr.destinationUrl && (
                      <Text style={[styles.metaText, { marginTop: 4, color: "#2563EB" }]}>
                        URL: {cr.destinationUrl}
                      </Text>
                    )}
                    <Text style={styles.metaText}>
                      Asset: {cr.mimeType ?? "type pending"} · {cr.width && cr.height ? `${cr.width} × ${cr.height}px` : "dimensions pending"}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={[styles.badgeText, { color: "#166534" }]}>
                      {cr.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* TAB CONTENT: Advertisers */}
      {activeTab === "advertisers" && (
        <View style={styles.sectionContainer}>
          {filteredAdvertisers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Advertisers Found</Text>
              <Text style={styles.emptySubtitle}>
                Register direct sponsors or commercial partners to create campaigns.
              </Text>
            </View>
          ) : (
            filteredAdvertisers.map((a) => (
              <View key={a.id} style={styles.itemCard}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{a.name}</Text>
                    {a.contactNotes && (
                      <Text style={styles.itemSubtitle}>{a.contactNotes}</Text>
                    )}
                    <Text style={styles.metaText}>
                      Registered: {formatIso(a.createdAt)} • Active Campaigns: {a.activeCampaignsCount}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* TAB CONTENT: Placements */}
      {activeTab === "placements" && (
        <View style={styles.sectionContainer}>
          {(overview?.placements ?? []).map((p) => (
            <View key={p.id} style={styles.itemCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{p.name} ({p.placementKey})</Text>
                  <Text style={styles.itemSubtitle}>
                    Allowed: {p.allowedSources.join(", ")} • Default: {p.defaultSource}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: "#E0F2FE" }]}>
                  <Text style={[styles.badgeText, { color: "#075985" }]}>
                    {p.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* MODAL: New Advertiser */}
      {showAdvertiserModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register Advertiser</Text>
            <Text style={styles.modalSubtitle}>
              Create a verified commercial sponsor record.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Advertiser Name (e.g. Ministry of Health, UNICEF)"
              value={newAdvName}
              onChangeText={setNewAdvName}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Contact Notes / Commercial Terms (optional)"
              value={newAdvNotes}
              onChangeText={setNewAdvNotes}
              multiline
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowAdvertiserModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  (!newAdvName.trim() || isMutating) && styles.disabledButton
                ]}
                disabled={!newAdvName.trim() || isMutating}
                onPress={async () => {
                  await onCreateAdvertiser(newAdvName, newAdvNotes);
                  setNewAdvName("");
                  setNewAdvNotes("");
                  setShowAdvertiserModal(false);
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {isMutating ? "Saving..." : "Save Advertiser"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* MODAL: New Campaign */}
      {showCampaignModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Ad Campaign</Text>
            <Text style={styles.modalSubtitle}>
              Set up a commercial campaign linked to an advertiser.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Campaign Name (e.g. Q4 Immunization Drive)"
              value={newCampName}
              onChangeText={setNewCampName}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.fieldLabel}>Select Advertiser:</Text>
            <ScrollView style={{ maxHeight: 120, marginBottom: spacing.md }}>
              {(overview?.advertisers ?? []).map((adv) => (
                <Pressable
                  key={adv.id}
                  style={[
                    styles.selectRow,
                    newCampAdvId === adv.id && styles.selectRowActive
                  ]}
                  onPress={() => setNewCampAdvId(adv.id)}
                >
                  <Text
                    style={[
                      styles.selectRowText,
                      newCampAdvId === adv.id && styles.selectRowTextActive
                    ]}
                  >
                    {adv.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowCampaignModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  (!newCampName.trim() || !newCampAdvId || isMutating) && styles.disabledButton
                ]}
                disabled={!newCampName.trim() || !newCampAdvId || isMutating}
                onPress={async () => {
                  await onCreateCampaign({
                    name: newCampName,
                    advertiserId: newCampAdvId
                  });
                  setNewCampName("");
                  setNewCampAdvId("");
                  setShowCampaignModal(false);
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {isMutating ? "Creating..." : "Create Campaign"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* MODAL: New Creative */}
      {showCreativeModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Creative Asset</Text>
            <Text style={styles.modalSubtitle}>
              Link a destination placement to an existing campaign.
            </Text>

            <Text style={styles.fieldLabel}>Select Campaign:</Text>
            <ScrollView style={{ maxHeight: 100, marginBottom: spacing.md }}>
              {(overview?.campaigns ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.selectRow,
                    newCrCampId === c.id && styles.selectRowActive
                  ]}
                  onPress={() => setNewCrCampId(c.id)}
                >
                  <Text
                    style={[
                      styles.selectRowText,
                      newCrCampId === c.id && styles.selectRowTextActive
                    ]}
                  >
                    {c.name} ({c.advertiserName})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Select Inventory Placement:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm }}>
              {(overview?.placements ?? []).map((plc) => (
                <Pressable
                  key={plc.id}
                  style={[
                    styles.pill,
                    newCrPlacement === plc.placementKey && styles.activePill
                  ]}
                  onPress={() => setNewCrPlacement(plc.placementKey)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      newCrPlacement === plc.placementKey && styles.activePillText
                    ]}
                  >
                    {plc.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Placement Key (or select a placement chip above)"
              value={newCrPlacement}
              onChangeText={setNewCrPlacement}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Destination URL (https://...)"
              value={newCrDestUrl}
              onChangeText={setNewCrDestUrl}
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowCreativeModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  (!newCrCampId || !newCrPlacement.trim() || isMutating) && styles.disabledButton
                ]}
                disabled={!newCrCampId || !newCrPlacement.trim() || isMutating}
                onPress={async () => {
                  await onCreateCreative({
                    campaignId: newCrCampId,
                    placement: newCrPlacement,
                    destinationUrl: newCrDestUrl || null
                  });
                  setNewCrCampId("");
                  setNewCrPlacement("");
                  setNewCrDestUrl("");
                  setShowCreativeModal(false);
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {isMutating ? "Saving..." : "Save Creative"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export function StudioAdvertisingDesk() {
  const [overview, setOverview] = useState<NewsroomAdvertisingOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdvertisingDeskTab>("campaigns");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [authSnapshot, setAuthSnapshot] = useState<AuthorizationSnapshot | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const snap = await services.authorization.getSnapshot();
      setAuthSnapshot(snap);
      const data = await services.newsroomCommercial.getAdvertisingOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load advertising overview");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canCreate = useMemo(() => canCreateCampaign(authSnapshot), [authSnapshot]);
  const canApprove = useMemo(() => canApproveCampaign(authSnapshot), [authSnapshot]);

  const handleCreateAdvertiser = async (name: string, notes?: string) => {
    setIsMutating(true);
    setActionMessage(null);
    try {
      await services.newsroomCommercial.createAdvertiser(name, notes);
      setActionMessage(`Advertiser "${name}" registered successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to register advertiser");
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateCampaign = async (input: NewsroomCreateCampaignInput) => {
    setIsMutating(true);
    setActionMessage(null);
    try {
      await services.newsroomCommercial.createCampaign(input);
      setActionMessage(`Campaign "${input.name}" created successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create campaign");
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateCreative = async (input: NewsroomCreateCreativeInput) => {
    setIsMutating(true);
    setActionMessage(null);
    try {
      await services.newsroomCommercial.createCreative(input);
      setActionMessage(`Creative for placement "${input.placement}" saved.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save creative");
    } finally {
      setIsMutating(false);
    }
  };

  const handleApproveCampaign = async (campaignId: string, approved: boolean) => {
    setIsMutating(true);
    setActionMessage(null);
    try {
      const res = await services.newsroomCommercial.approveCampaign(campaignId, approved);
      setActionMessage(`Campaign marked as ${res}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update review status");
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateCampaignStatus = async (campaignId: string, status: string) => {
    setIsMutating(true);
    setActionMessage(null);
    try {
      const res = await services.newsroomCommercial.updateCampaignStatus(campaignId, status);
      setActionMessage(`Campaign status changed to ${res}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update campaign status");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <StudioAdvertisingDeskView
      overview={overview}
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      searchQuery={searchQuery}
      onChangeSearchQuery={setSearchQuery}
      statusFilter={statusFilter}
      onChangeStatusFilter={setStatusFilter}
      onCreateAdvertiser={handleCreateAdvertiser}
      onCreateCampaign={handleCreateCampaign}
      onCreateCreative={handleCreateCreative}
      onApproveCampaign={handleApproveCampaign}
      onUpdateCampaignStatus={handleUpdateCampaignStatus}
      canCreate={canCreate}
      canApprove={canApprove}
      actionMessage={actionMessage}
      isMutating={isMutating}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerTitles: {
    gap: spacing.xs,
    flex: 1
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  brandBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8"
  },
  statusPill: {
    backgroundColor: "#F3F4F6",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563"
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink
  },
  mainSubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  secondaryButtonText: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 14
  },
  disabledButton: {
    opacity: 0.5
  },
  successBanner: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  successBannerText: {
    color: "#166534",
    fontWeight: "600",
    fontSize: 14
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  errorBannerText: {
    color: "#991B1B",
    fontWeight: "600",
    fontSize: 14
  },
  metricsGrid: {
    gap: spacing.md
  },
  gridCols6: {
    flexDirection: "row"
  },
  gridCols2: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  metricCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMuted
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: radius.sm,
    padding: 3,
    gap: 4
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm
  },
  activeTabButton: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted
  },
  activeTabText: {
    color: colors.ink,
    fontWeight: "800"
  },
  toolbarCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md
  },
  searchInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: "#FAFAFA"
  },
  filterPills: {
    flexDirection: "row",
    gap: spacing.xs
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    marginRight: spacing.xs
  },
  activePill: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  activePillText: {
    color: "#FFFFFF"
  },
  sectionContainer: {
    gap: spacing.sm
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl * 2,
    alignItems: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center"
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs
  },
  creativePreviewFrame: {
    width: "100%",
    aspectRatio: 3,
    maxHeight: 220,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.md
  },
  creativePreviewImage: {
    width: "100%",
    height: "100%"
  },
  creativePreviewUnavailable: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  itemSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2
  },
  metaRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6"
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280"
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  smallApproveButton: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  smallApproveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534"
  },
  smallRejectButton: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  smallRejectText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B"
  },
  smallActionButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    zIndex: 999
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.inkMuted
  },
  modalInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.ink
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 4
  },
  selectRow: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4
  },
  selectRowActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6"
  },
  selectRowText: {
    fontSize: 13,
    color: colors.ink
  },
  selectRowTextActive: {
    fontWeight: "700",
    color: "#1D4ED8"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm
  }
});
