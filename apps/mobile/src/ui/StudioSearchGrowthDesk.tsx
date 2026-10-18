import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import type { NewsroomGrowthIntelligence } from "../domain/models";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export interface StudioSearchGrowthDeskViewProps {
  growthData: NewsroomGrowthIntelligence | null;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  previewMode?: boolean;
}

export function StudioSearchGrowthDeskView({
  growthData,
  loading,
  error,
  onRefresh,
  previewMode = false
}: StudioSearchGrowthDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID="studio-search-growth-desk"
    >
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Search & Growth</Text>
            <View style={styles.badgeCapability}>
              <Text style={styles.badgeCapabilityText}>analytics.view</Text>
            </View>
            {previewMode && (
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>PREVIEW MODE</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            Google Search Console authority, organic SEO audit, and academic research citations.
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
            accessibilityLabel="Refresh growth data"
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

      {/* Loading State */}
      {loading && !growthData && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Search & Growth Intelligence…</Text>
        </View>
      )}

      {growthData && (
        <>
          {/* Top SEO & Search KPI Grid */}
          <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>TOTAL INDEXABLE STORIES</Text>
              <Text style={styles.kpiValue}>
                {growthData.seoHealth.totalStories.toLocaleString()}
              </Text>
              <Text style={styles.kpiSubtext}>
                Canonical URLs: {growthData.seoHealth.withCanonicalUrl.toLocaleString()}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>SEO TITLE COVERAGE</Text>
              <Text style={styles.kpiValue}>
                {Math.round(
                  growthData.seoHealth.totalStories > 0
                    ? (growthData.seoHealth.withSeoTitle / growthData.seoHealth.totalStories) * 100
                    : 0
                )}%
              </Text>
              <Text style={styles.kpiSubtext}>
                {growthData.seoHealth.withSeoTitle.toLocaleString()} stories optimized
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>SEARCH CONSOLE STATUS</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {growthData.searchConsoleSummary.status === "active" ? "ACTIVE" : "PENDING ACCESS"}
                </Text>
              </View>
              <Text style={styles.kpiSubtext}>
                Property: {growthData.searchConsoleSummary.property}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>RESEARCH CITATIONS</Text>
              <Text style={styles.kpiValue}>
                {growthData.citationsSummary.verifiedCitationsCount}
              </Text>
              <Text style={styles.kpiSubtext}>
                Status: {growthData.citationsSummary.status}
              </Text>
            </View>
          </View>

          {/* Section: Search Console Integration Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Google Search Console Verification</Text>
            <Text style={styles.cardSubtitle}>
              Authoritative search appearance and query performance.
            </Text>

            <View style={styles.searchConsoleBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Verified Property URL:</Text>
                <Text style={styles.detailValue}>{growthData.searchConsoleSummary.property}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ingested Queries:</Text>
                <Text style={styles.detailValue}>{growthData.searchConsoleSummary.rowsRecorded} rows</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Ingested Clicks:</Text>
                <Text style={styles.detailValue}>{growthData.searchConsoleSummary.totalClicks}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Impressions:</Text>
                <Text style={styles.detailValue}>{growthData.searchConsoleSummary.totalImpressions}</Text>
              </View>
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  ℹ️ Account Access Pending: HealthTimes domain property is registered in Staging. Once Google Search Console OAuth service credentials are provisioned, daily search performance queries will ingest into search_console_daily_metrics. Zero fabricated search queries are shown.
                </Text>
              </View>
            </View>
          </View>

          {/* Section: Global Health Research Citations & Impact */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Citations & Academic Research Impact</Text>
            <Text style={styles.cardSubtitle}>
              External references from global health agencies, governments, and peer-reviewed journals.
            </Text>

            <View style={styles.citationBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Citations Provider Status:</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{growthData.citationsSummary.status}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Institutional References:</Text>
                <Text style={styles.detailValue}>{growthData.citationsSummary.institutionalReferencesCount}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Government / NGO Mentions:</Text>
                <Text style={styles.detailValue}>{growthData.citationsSummary.governmentNgoMentionsCount}</Text>
              </View>
              <Text style={styles.citationNotes}>{growthData.citationsSummary.notes}</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

export function StudioSearchGrowthDesk() {
  const [growthData, setGrowthData] = useState<NewsroomGrowthIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await services.newsroomIntelligence.getGrowthIntelligence();
      setGrowthData(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load growth data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <StudioSearchGrowthDeskView
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
  kpiSubtext: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginTop: 2
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
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
  searchConsoleBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted
  },
  noticeBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#1E40AF"
  },
  citationBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  citationNotes: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic",
    marginTop: spacing.xs
  }
});
