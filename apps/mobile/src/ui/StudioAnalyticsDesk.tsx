import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle
} from "react-native";
import type {
  NewsroomEditorialIntelligence,
  NewsroomGrowthIntelligence
} from "../domain/models";
import { hasServerCapability, type AuthorizationSnapshot } from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export interface StudioAnalyticsDeskViewProps {
  editorialData: NewsroomEditorialIntelligence | null;
  growthData: NewsroomGrowthIntelligence | null;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  previewMode?: boolean;
}

export function StudioAnalyticsDeskView({
  editorialData,
  growthData,
  loading,
  error,
  onRefresh,
  previewMode = false
}: StudioAnalyticsDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const [period, setPeriod] = useState<"7 days" | "30 days" | "90 days">("30 days");
  const [selectedMetric, setSelectedMetric] = useState("Publishing velocity");

  const metricDetail = selectedMetric === "Publishing velocity"
    ? `${period === "7 days" ? editorialData?.publishingVelocity.last7Days ?? 0 : editorialData?.publishingVelocity.last30Days ?? 0} stories published in the selected sample window.`
    : selectedMetric === "Review queue"
      ? `${editorialData?.reviewQueue.inReviewCount ?? 0} stories in review; oldest item ${editorialData?.reviewQueue.oldestAgeHours ?? 0} hours.`
      : `${editorialData?.assignments.active ?? 0} active assignments and ${editorialData?.assignments.overdue ?? 0} overdue.`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID="studio-analytics-desk"
    >
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Analytics & Intelligence</Text>
            <View style={styles.badgeCapability}>
              <Text style={styles.badgeCapabilityText}>
                {previewMode ? "Executive Intelligence" : "analytics.view"}
              </Text>
            </View>
            {previewMode && (
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>SAMPLE PREVIEW METRICS</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            Truthful first-party editorial inventory, publishing velocity, and external growth integrations.
          </Text>
        </View>

        {onRefresh && (
          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled
            ]}
            onPress={onRefresh}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Refresh intelligence data"
          >
            <Text style={styles.refreshButtonText}>
              {loading ? "Refreshing…" : "↻ Refresh"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Loading Skeleton / State */}
      {loading && !editorialData && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Newsroom Intelligence…</Text>
        </View>
      )}

      {editorialData && (
        <>
          {previewMode && (
            <View
              style={{
                backgroundColor: "#FFFBEB",
                borderWidth: 1,
                borderColor: "#FDE68A",
                borderRadius: radius.md,
                padding: spacing.md
              }}
              testID="analytics-sample-metrics-banner"
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}>
                ℹ️ Sample Executive & Editorial Intelligence (Owner Preview): Story inventory, review queue metrics, assignments, and distribution counts below reflect the sample newsroom state. External GA4, Search Console, and AdSense integrations show verified staging status without fabricated live traffic.
              </Text>
            </View>
          )}
          <View style={styles.card} testID="analytics-period-drilldown-controls">
            <Text style={styles.cardTitle}>Reporting period and metric detail</Text>
            <Text style={styles.cardSubtitle}>Change the sample reporting window and inspect the newsroom measure that needs attention.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["7 days", "30 days", "90 days"] as const).map((option) => (
                <Pressable
                  key={option}
                  style={[styles.refreshButton, period === option && { borderColor: colors.blue, backgroundColor: "#EFF6FF" }]}
                  onPress={() => setPeriod(option)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show analytics for ${option}`}
                  accessibilityState={{ selected: period === option }}
                >
                  <Text style={styles.refreshButtonText}>{option}</Text>
                </Pressable>
              ))}
              {(["Publishing velocity", "Review queue", "Assignments"] as const).map((metric) => (
                <Pressable
                  key={metric}
                  style={[styles.refreshButton, selectedMetric === metric && { borderColor: colors.blue, backgroundColor: "#EFF6FF" }]}
                  onPress={() => setSelectedMetric(metric)}
                  accessibilityRole="button"
                  accessibilityLabel={`Inspect ${metric}`}
                  accessibilityState={{ selected: selectedMetric === metric }}
                >
                  <Text style={styles.refreshButtonText}>{metric}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.truthNotice} testID="analytics-metric-drilldown">
              <Text style={styles.truthNoticeText}>{selectedMetric} · {period}: {metricDetail} Sample Preview comparison only.</Text>
            </View>
          </View>
          {/* Top KPI Cards Grid */}
          <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>TOTAL STORY INVENTORY</Text>
              <Text style={styles.kpiValue}>
                {editorialData.storyInventory.total.toLocaleString()}
              </Text>
              <View style={styles.kpiBreakdown}>
                <Text style={styles.kpiSubtext}>
                  ✓ {editorialData.storyInventory.published.toLocaleString()} Published
                </Text>
                <Text style={styles.kpiSubtext}>
                  ✎ {editorialData.storyInventory.review} In Review
                </Text>
                <Text style={styles.kpiSubtext}>
                  📄 {editorialData.storyInventory.draft} Drafts
                </Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>PUBLISHING VELOCITY</Text>
              <Text style={styles.kpiValue}>
                {editorialData.publishingVelocity.last30Days}
              </Text>
              <View style={styles.kpiBreakdown}>
                <Text style={styles.kpiSubtext}>
                  Last 24 Hours: {editorialData.publishingVelocity.last24Hours}
                </Text>
                <Text style={styles.kpiSubtext}>
                  Last 7 Days: {editorialData.publishingVelocity.last7Days}
                </Text>
                <Text style={styles.kpiSubtext}>
                  Last 30 Days: {editorialData.publishingVelocity.last30Days}
                </Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>REVIEW QUEUE HEALTH</Text>
              <Text style={styles.kpiValue}>
                {editorialData.reviewQueue.inReviewCount}
              </Text>
              <View style={styles.kpiBreakdown}>
                <Text style={styles.kpiSubtext}>
                  Avg Queue Age: {editorialData.reviewQueue.avgAgeHours} hrs
                </Text>
                <Text style={styles.kpiSubtext}>
                  Oldest Queue Item: {editorialData.reviewQueue.oldestAgeHours} hrs
                </Text>
              </View>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>EDITORIAL ASSIGNMENTS</Text>
              <Text style={styles.kpiValue}>
                {editorialData.assignments.total}
              </Text>
              <View style={styles.kpiBreakdown}>
                <Text style={styles.kpiSubtext}>
                  Active: {editorialData.assignments.active}
                </Text>
                <Text style={styles.kpiSubtext}>
                  Overdue: {editorialData.assignments.overdue}
                </Text>
                <Text style={styles.kpiSubtext}>
                  Completed: {editorialData.assignments.completed}
                </Text>
              </View>
            </View>
          </View>

          {/* Section: Desk Mix & Distribution Channels */}
          <View style={[styles.sectionRow, isDesktop && styles.sectionRowDesktop]}>
            {/* Desk Mix */}
            <View style={[styles.card, isDesktop && styles.cardFlex]}>
              <Text style={styles.cardTitle}>Editorial Desk Mix</Text>
              <Text style={styles.cardSubtitle}>
                Verified distribution of reporting across Newsroom beats.
              </Text>
              <View style={styles.deskList}>
                {editorialData.deskMix.map((entry) => {
                  const percent =
                    editorialData.storyInventory.total > 0
                      ? Math.round((entry.count / editorialData.storyInventory.total) * 100)
                      : 0;
                  return (
                    <View key={entry.desk} style={styles.deskRow}>
                      <View style={styles.deskHeader}>
                        <Text style={styles.deskName}>{entry.desk}</Text>
                        <Text style={styles.deskCount}>
                          {entry.count.toLocaleString()} ({percent}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.max(percent, 2)}%` }
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Distribution Reach Across Channels */}
            <View style={[styles.card, isDesktop && styles.cardFlex]}>
              <Text style={styles.cardTitle}>Distribution Channels</Text>
              <Text style={styles.cardSubtitle}>
                Audited dispatch volume across authorized multi-channel desks.
              </Text>
              <View style={styles.channelGrid}>
                <View style={styles.channelBox}>
                  <Text style={styles.channelLabel}>Social Posts</Text>
                  <Text style={styles.channelValue}>
                    {editorialData.distributionReach.socialPostsCount}
                  </Text>
                  <Text style={styles.channelStatus}>Desk Active</Text>
                </View>
                <View style={styles.channelBox}>
                  <Text style={styles.channelLabel}>Newsletters</Text>
                  <Text style={styles.channelValue}>
                    {editorialData.distributionReach.newsletterCampaignsCount}
                  </Text>
                  <Text style={styles.channelStatus}>Desk Active</Text>
                </View>
                <View style={styles.channelBox}>
                  <Text style={styles.channelLabel}>Push Alerts</Text>
                  <Text style={styles.channelValue}>
                    {editorialData.distributionReach.pushAlertsCount}
                  </Text>
                  <Text style={styles.channelStatus}>Desk Active</Text>
                </View>
                <View style={styles.channelBox}>
                  <Text style={styles.channelLabel}>WhatsApp</Text>
                  <Text style={styles.channelValue}>
                    {editorialData.distributionReach.whatsappBroadcastsCount}
                  </Text>
                  <Text style={styles.channelStatus}>Desk Active</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Section: Third-Party Growth & Analytics Integrations */}
      {growthData && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>External Ingestion & Provider Authority</Text>
          <Text style={styles.cardSubtitle}>
            Zero simulated revenue or fabricated traffic. Unconfigured or pending providers fail closed.
          </Text>

          <View style={styles.integrationsTable}>
            {growthData.integrations.map((item) => (
              <View key={`${item.provider}-${item.integrationKey}`} style={styles.integrationRow}>
                <View style={styles.integrationMain}>
                  <Text style={styles.integrationProvider}>
                    {item.provider.toUpperCase().replace("_", " ")}
                  </Text>
                  <Text style={styles.integrationKey}>
                    Key: {item.integrationKey} • Ref: {item.externalPropertyId ?? item.externalAccountId ?? "N/A"}
                  </Text>
                  {item.notes && (
                    <Text style={styles.integrationNotes}>{item.notes}</Text>
                  )}
                </View>
                <View style={styles.integrationStatusContainer}>
                  <View
                    style={[
                      styles.statusPill,
                      item.status.includes("active") || item.status.includes("verified")
                        ? styles.statusPillActive
                        : styles.statusPillPending
                    ]}
                  >
                    <Text style={styles.statusPillText}>{item.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.truthNotice}>
            <Text style={styles.truthNoticeText}>
              🛡️ Operational Integrity Guarantee: HealthTimes Newsroom OS never presents fixture analytics or simulated revenue as truth. Real-time metrics will update automatically when external Google Analytics 4 service-account credentials are authenticated.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

export function StudioAnalyticsDesk() {
  const [editorialData, setEditorialData] = useState<NewsroomEditorialIntelligence | null>(null);
  const [growthData, setGrowthData] = useState<NewsroomGrowthIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ed, gr] = await Promise.all([
        services.newsroomIntelligence.getEditorialIntelligence(),
        services.newsroomIntelligence.getGrowthIntelligence()
      ]);
      setEditorialData(ed);
      setGrowthData(gr);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load intelligence data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <StudioAnalyticsDeskView
      editorialData={editorialData}
      growthData={growthData}
      loading={loading}
      error={error}
      onRefresh={loadData}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paperMuted
  },
  contentContainer: {
    padding: spacing.xl,
    gap: spacing.xl
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.md
  },
  headerTitles: {
    flex: 1,
    minWidth: 260
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink
  },
  badgeCapability: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  badgeCapabilityText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E40AF"
  },
  previewBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E"
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: spacing.xs,
    lineHeight: 20
  },
  refreshButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  buttonPressed: {
    opacity: 0.7
  },
  buttonDisabled: {
    opacity: 0.5
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md
  },
  errorBannerText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600"
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: "center"
  },
  loadingText: {
    fontSize: 14,
    color: colors.inkMuted
  },
  kpiGrid: {
    gap: spacing.md
  },
  kpiGridDesktop: {
    flexDirection: "row"
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.inkMuted
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.ink
  },
  kpiBreakdown: {
    marginTop: spacing.xs,
    gap: 2
  },
  kpiSubtext: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16
  },
  sectionRow: {
    gap: spacing.lg
  },
  sectionRowDesktop: {
    flexDirection: "row"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  cardFlex: {
    flex: 1
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.ink
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: -spacing.xs
  },
  deskList: {
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  deskRow: {
    gap: 4
  },
  deskHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  deskName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  deskCount: {
    fontSize: 12,
    color: colors.inkMuted
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden"
  },
  progressBarFill: {
    height: 6,
    backgroundColor: colors.blue,
    borderRadius: 3
  },
  channelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs
  },
  channelBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: 4
  },
  channelLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    textTransform: "uppercase"
  },
  channelValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.ink
  },
  channelStatus: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669"
  },
  integrationsTable: {
    gap: spacing.sm
  },
  integrationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    gap: spacing.md,
    flexWrap: "wrap"
  },
  integrationMain: {
    flex: 1,
    minWidth: 220,
    gap: 2
  },
  integrationProvider: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  integrationKey: {
    fontSize: 12,
    color: colors.inkMuted
  },
  integrationNotes: {
    fontSize: 11,
    color: colors.inkMuted,
    fontStyle: "italic",
    marginTop: 2
  },
  integrationStatusContainer: {
    alignItems: "flex-end"
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  statusPillActive: {
    backgroundColor: "#DCFCE7"
  },
  statusPillPending: {
    backgroundColor: "#FEF3C7"
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E293B"
  },
  truthNotice: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    padding: spacing.md,
    borderRadius: radius.md
  },
  truthNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#166534"
  }
});
