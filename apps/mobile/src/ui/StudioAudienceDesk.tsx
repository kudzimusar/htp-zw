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
  onOpenDesk?: (moduleKey: "newsletters" | "push-alerts" | "whatsapp" | "subscribers") => void;
}

export function StudioAudienceDeskView({
  audienceData,
  loading,
  error,
  onRefresh,
  previewMode = false,
  onOpenDesk
}: StudioAudienceDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const [period, setPeriod] = useState<"7 days" | "30 days" | "90 days">("30 days");
  const [selectedSegment, setSelectedSegment] = useState("Clinical & Healthcare Practitioners Cohort");

  const periodMultiplier = period === "7 days" ? 0.35 : period === "90 days" ? 2.4 : 1;
  const segmentDetails: Record<string, { members: number; growth: number; channel: string }> = {
    "Clinical & Healthcare Practitioners Cohort": { members: 540, growth: 14, channel: "Newsletter" },
    "Public Health & Outbreak Advisory Readers": { members: 620, growth: 22, channel: "WhatsApp & Push" },
    "Health Policy, NGO & Institutional Subscribers": { members: 260, growth: 9, channel: "Daily Briefing" }
  };
  const selectedSegmentDetail = segmentDetails[selectedSegment] ?? segmentDetails["Clinical & Healthcare Practitioners Cohort"]!;

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
              <Text style={styles.badgeCapabilityText}>
                {previewMode ? "Audience & Growth" : "analytics.view"}
              </Text>
            </View>
            {previewMode && (
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>SAMPLE PREVIEW METRICS</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            Verified first-party reader audience, consented contacts, segment trends, and multi-channel reach.
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
          {previewMode && (
            <View
              style={{
                backgroundColor: "#FFFBEB",
                borderWidth: 1,
                borderColor: "#FDE68A",
                borderRadius: radius.md,
                padding: spacing.md
              }}
              testID="audience-sample-analytics-banner"
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}>
                ℹ️ Sample Audience & Segment Figures (Owner Preview): The contact counts, segment memberships, and 30-day trends below reconcile with the sample records in Newsletter, Push, WhatsApp, and Subscriber desks. They do not represent live production analytics.
              </Text>
            </View>
          )}

          <View style={styles.card} testID="audience-period-and-segment-controls">
            <Text style={styles.cardTitle}>Audience reporting window</Text>
            <Text style={styles.cardSubtitle}>Compare sample first-party audience movement, then select a cohort for its operational detail.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(["7 days", "30 days", "90 days"] as const).map((option) => (
                <Pressable
                  key={option}
                  style={[styles.refreshButton, period === option && { borderColor: colors.blue, backgroundColor: "#EFF6FF" }]}
                  onPress={() => setPeriod(option)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show audience trends for ${option}`}
                  accessibilityState={{ selected: period === option }}
                >
                  <Text style={styles.refreshButtonText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          </View>

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
            {onOpenDesk && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
                <Pressable
                  style={styles.refreshButton}
                  onPress={() => onOpenDesk("newsletters")}
                  testID="audience-open-newsletters-btn"
                >
                  <Text style={styles.refreshButtonText}>Open Newsletter Segments →</Text>
                </Pressable>
                <Pressable
                  style={styles.refreshButton}
                  onPress={() => onOpenDesk("push-alerts")}
                  testID="audience-open-push-btn"
                >
                  <Text style={styles.refreshButtonText}>Open Push Alerts →</Text>
                </Pressable>
                <Pressable
                  style={styles.refreshButton}
                  onPress={() => onOpenDesk("whatsapp")}
                  testID="audience-open-whatsapp-btn"
                >
                  <Text style={styles.refreshButtonText}>Open WhatsApp Desk →</Text>
                </Pressable>
                <Pressable
                  style={styles.refreshButton}
                  onPress={() => onOpenDesk("subscribers")}
                  testID="audience-open-subscribers-btn"
                >
                  <Text style={styles.refreshButtonText}>Open Subscriber Directory →</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Section: Audience Segments & 30-Day Growth Interpretation */}
          <View style={styles.card} testID="audience-segments-interpretation-card">
            <Text style={styles.cardTitle}>Audience Segments & 30-Day Engagement Trends</Text>
            <Text style={styles.cardSubtitle}>
              Cohort breakdown and editorial interpretation across first-party health readership segments.
            </Text>

            <View style={styles.networkList}>
              <Pressable
                style={styles.networkRow}
                onPress={() => setSelectedSegment("Clinical & Healthcare Practitioners Cohort")}
                accessibilityRole="button"
                accessibilityLabel="Inspect Clinical and Healthcare Practitioners cohort"
              >
                <View style={styles.networkInfo}>
                  <Text style={styles.networkName}>Clinical & Healthcare Practitioners Cohort</Text>
                  <Text style={styles.networkDetail}>
                    High retention on clinical deep dives, oncology procurement updates, and policy briefings (+{Math.round(14 * periodMultiplier)}% over {period}).
                  </Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkCount}>540</Text>
                  <Text style={styles.networkUnit}>Members</Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.networkRow}
                onPress={() => setSelectedSegment("Public Health & Outbreak Advisory Readers")}
                accessibilityRole="button"
                accessibilityLabel="Inspect Public Health and Outbreak Advisory readers"
              >
                <View style={styles.networkInfo}>
                  <Text style={styles.networkName}>Public Health & Outbreak Advisory Readers</Text>
                  <Text style={styles.networkDetail}>
                    Driven by cholera, malaria vaccine, and provincial clinic coverage across WhatsApp & Push (+{Math.round(22 * periodMultiplier)}% over {period}).
                  </Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkCount}>620</Text>
                  <Text style={styles.networkUnit}>Members</Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.networkRow}
                onPress={() => setSelectedSegment("Health Policy, NGO & Institutional Subscribers")}
                accessibilityRole="button"
                accessibilityLabel="Inspect Health Policy NGO and Institutional subscribers"
              >
                <View style={styles.networkInfo}>
                  <Text style={styles.networkName}>Health Policy, NGO & Institutional Subscribers</Text>
                  <Text style={styles.networkDetail}>
                    Strong weekday morning engagement with Daily Health Briefing and parliamentary budget coverage (+{Math.round(9 * periodMultiplier)}% over {period}).
                  </Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkCount}>260</Text>
                  <Text style={styles.networkUnit}>Members</Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.ga4Container} testID="audience-segment-drilldown">
              <Text style={styles.networkName}>{selectedSegment}</Text>
              <Text style={styles.networkDetail}>Selected cohort: {selectedSegmentDetail.members} members · Primary channel: {selectedSegmentDetail.channel}</Text>
              <Text style={styles.networkDetail}>Sample trend for {period}: +{Math.round(selectedSegmentDetail.growth * periodMultiplier)}%. This is Preview interpretation, not live provider analytics.</Text>
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
