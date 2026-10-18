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
import type { NewsroomAudienceIntelligence } from "../domain/models";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export interface StudioAudienceDeskViewProps {
  audienceData: NewsroomAudienceIntelligence | null;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  previewMode?: boolean;
}

export function StudioAudienceDeskView({
  audienceData,
  loading,
  error,
  onRefresh,
  previewMode = false
}: StudioAudienceDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID="studio-audience-desk"
    >
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Audience Intelligence</Text>
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
            Verified first-party reader audience, consented contacts, and multi-channel reach.
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
            accessibilityLabel="Refresh audience data"
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
      {loading && !audienceData && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Audience Intelligence…</Text>
        </View>
      )}

      {audienceData && (
        <>
          {/* Top Audience Summary Cards */}
          <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>CONSENTED CONTACTS</Text>
              <Text style={styles.kpiValue}>
                {audienceData.contacts.consentedContacts.toLocaleString()}
              </Text>
              <Text style={styles.kpiSubtext}>
                Total Profiles: {audienceData.contacts.totalProfiles.toLocaleString()}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>NEWSLETTER SEGMENTS</Text>
              <Text style={styles.kpiValue}>
                {audienceData.segments.totalSegments}
              </Text>
              <Text style={styles.kpiSubtext}>
                Total Memberships: {audienceData.segments.totalMemberships}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>PUSH READER DEVICES</Text>
              <Text style={styles.kpiValue}>
                {audienceData.pushSubscribers.registeredDevices}
              </Text>
              <Text style={styles.kpiSubtext}>
                Active Devices: {audienceData.pushSubscribers.activeDevices}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>VERIFIED SUBSCRIBERS</Text>
              <Text style={styles.kpiValue}>
                {audienceData.subscribers.activeSubscribers}
              </Text>
              <Text style={styles.kpiSubtext}>
                Total Records: {audienceData.subscribers.totalSubscribers}
              </Text>
            </View>
          </View>

          {/* Section: Multi-Channel Audience Reach */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Direct Reader Relationships</Text>
            <Text style={styles.cardSubtitle}>
              Audited first-party opt-ins across HealthTimes distribution networks.
            </Text>

            <View style={styles.networkList}>
              <View style={styles.networkRow}>
                <View style={styles.networkInfo}>
                  <Text style={styles.networkName}>Consented Health Newsletter Subscribers</Text>
                  <Text style={styles.networkDetail}>
                    POPIA/GDPR-compliant contact profiles with explicit opt-in for health advisory emails.
                  </Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkCount}>{audienceData.contacts.consentedContacts}</Text>
                  <Text style={styles.networkUnit}>Consented</Text>
                </View>
              </View>

              <View style={styles.networkRow}>
                <View style={styles.networkInfo}>
                  <Text style={styles.networkName}>Reader Push Notification Endpoints</Text>
                  <Text style={styles.networkDetail}>
                    Mobile and PWA device tokens registered with category preferences.
                  </Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkCount}>{audienceData.pushSubscribers.activeDevices}</Text>
                  <Text style={styles.networkUnit}>Active Devices</Text>
                </View>
              </View>

              <View style={styles.networkRow}>
                <View style={styles.networkInfo}>
                  <Text style={styles.networkName}>WhatsApp Distribution Channel</Text>
                  <Text style={styles.networkDetail}>
                    Subscribers receiving broadcast advisory messages via Meta Cloud API.
                  </Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkCount}>{audienceData.whatsappDistribution.sentBroadcasts}</Text>
                  <Text style={styles.networkUnit}>Dispatches Sent</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Section: Third-Party Demographic Integration (GA4) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Third-Party Web Demographics (GA4)</Text>
            <Text style={styles.cardSubtitle}>
              Google Analytics 4 property status and demographic ingestion.
            </Text>

            <View style={styles.ga4Container}>
              <View style={styles.ga4DetailRow}>
                <Text style={styles.ga4Label}>Property ID:</Text>
                <Text style={styles.ga4Value}>{audienceData.ga4AudienceStatus.propertyId}</Text>
              </View>
              <View style={styles.ga4DetailRow}>
                <Text style={styles.ga4Label}>Account ID:</Text>
                <Text style={styles.ga4Value}>{audienceData.ga4AudienceStatus.accountId}</Text>
              </View>
              <View style={styles.ga4DetailRow}>
                <Text style={styles.ga4Label}>Status:</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{audienceData.ga4AudienceStatus.status}</Text>
                </View>
              </View>
              <Text style={styles.ga4Notes}>{audienceData.ga4AudienceStatus.notes}</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

export function StudioAudienceDesk() {
  const [audienceData, setAudienceData] = useState<NewsroomAudienceIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await services.newsroomIntelligence.getAudienceIntelligence();
      setAudienceData(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load audience data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <StudioAudienceDeskView
      audienceData={audienceData}
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
  networkList: {
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  networkRow: {
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
  networkInfo: {
    flex: 1,
    minWidth: 220,
    gap: 2
  },
  networkName: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.ink
  },
  networkDetail: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 16
  },
  networkStat: {
    alignItems: "flex-end"
  },
  networkCount: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink
  },
  networkUnit: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase"
  },
  ga4Container: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm
  },
  ga4DetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  ga4Label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink
  },
  ga4Value: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted
  },
  ga4Notes: {
    fontSize: 12,
    color: colors.inkMuted,
    fontStyle: "italic",
    marginTop: spacing.xs
  },
  statusPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E"
  }
});
