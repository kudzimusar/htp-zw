import { useCallback, useEffect, useMemo, useState } from "react";
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
  NewsroomPremiumOperationsOverview,
  NewsroomPremiumStoryItem
} from "../domain/models";
import {
  canAssignPremium,
  canManagePremium,
  hasPremiumDeskAccess,
  type AuthorizationSnapshot
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export interface StudioPremiumDeskViewProps {
  overview: NewsroomPremiumOperationsOverview | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onSetStoryAccess: (storyId: string, policy: "public" | "premium") => Promise<void>;
  canManage: boolean;
  canAssign: boolean;
  actionMessage: string | null;
  isMutating: boolean;
  isOwnerPreview?: boolean;
  onOpenSubscribers?: () => void;
  onOpenStory?: (storyId: string) => void;
}

function formatIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toISOString().replace("T", " ").slice(0, 10);
  } catch {
    return "—";
  }
}

export function StudioPremiumDeskView({
  overview,
  isLoading,
  error,
  onRefresh,
  onSetStoryAccess,
  canManage,
  canAssign,
  actionMessage,
  isMutating,
  isOwnerPreview = false,
  onOpenSubscribers,
  onOpenStory
}: StudioPremiumDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  const inventory = overview?.inventoryBreakdown ?? {
    totalStories: 0,
    premiumStoriesCount: 0,
    publicStoriesCount: 0
  };

  const subscriberStats = overview?.subscriberStats ?? {
    totalSubscribers: 0,
    activeEntitlementsCount: 0,
    totalEntitledSubscribers: 0,
    providers: []
  };

  const teaser = overview?.teaserPolicy ?? {
    authority: "Publisher / Editorial Access Policy",
    enabled: true,
    durationSeconds: 20,
    paragraphCount: 1,
    enforcement: "Strict reader-facing body truncation after lead paragraph and 20s preview window"
  };

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={[styles.headerCard, isDesktop ? styles.rowBetween : null]}>
        <View style={styles.headerTitles}>
          <View style={styles.badgeRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>Commercial & Editorial Policy</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {canManage ? "Policy Manager" : canAssign ? "Editor (Assign Policy)" : "Auditor (Read-Only)"}
              </Text>
            </View>
          </View>
          <Text style={styles.mainTitle}>Premium Policies & Monetization</Text>
          <Text style={styles.mainSubtitle}>
            Editorial access policies, metered paywall governance, public teaser rules, and subscriber entitlement coverage.
          </Text>
        </View>

        <View style={styles.headerActions}>
          {onOpenSubscribers && (
            <Pressable
              style={styles.secondaryButton}
              onPress={onOpenSubscribers}
              testID="premium-open-subscribers-btn"
            >
              <Text style={styles.secondaryButtonText}>Manage Subscribers & Passes →</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.secondaryButton, isMutating && styles.disabledButton]}
            onPress={onRefresh}
            disabled={isMutating}
          >
            <Text style={styles.secondaryButtonText}>
              {isLoading ? "Refreshing..." : "Refresh Policies"}
            </Text>
          </Pressable>
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
          testID="premium-preview-banner"
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}>
            ℹ️ Sample Monetization & Access Policy State (Owner Preview): Payment channels (Stripe, EcoCash, Paynow) and story access toggles below operate in local Preview memory only and do not execute live billing or alter public Reader access.
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
      <View style={[styles.metricsGrid, isDesktop ? styles.gridCols4 : styles.gridCols2]}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Story Inventory</Text>
          <Text style={styles.metricValue}>{inventory.totalStories}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Premium Stories</Text>
          <Text style={[styles.metricValue, { color: "#1D4ED8" }]}>
            {inventory.premiumStoriesCount}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Public Open Access</Text>
          <Text style={[styles.metricValue, { color: "#166534" }]}>
            {inventory.publicStoriesCount}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Entitled Readers</Text>
          <Text style={[styles.metricValue, { color: "#9333EA" }]}>
            {subscriberStats.totalEntitledSubscribers}
          </Text>
        </View>
      </View>

      {/* SECTION 1: Editorial Access Policies & Teaser Authority */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Editorial Access Policies</Text>
        <Text style={styles.sectionSubtitle}>
          HealthTimes content access levels governing open public journalism and subscriber-funded reporting.
        </Text>

        <View style={[styles.policiesGrid, isDesktop ? styles.gridCols2 : null]}>
          {(overview?.policies ?? []).map((pol) => (
            <View key={pol.key} style={styles.policyCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.policyName}>{pol.name}</Text>
                <View
                  style={[
                    styles.badge,
                    pol.key === "premium" ? { backgroundColor: "#DBEAFE" } : { backgroundColor: "#DCFCE7" }
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      pol.key === "premium" ? { color: "#1D4ED8" } : { color: "#166534" }
                    ]}
                  >
                    {pol.key.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.policyDesc}>{pol.description}</Text>
              <Text style={styles.policyMeter}>
                Meter Policy: {pol.isMetered ? "Paywalled / Metered" : "Unmetered Public"}
              </Text>
            </View>
          ))}
        </View>

        {/* Public Teaser Policy Callout */}
        <View style={styles.teaserCallout}>
          <View style={styles.rowBetween}>
            <Text style={styles.teaserTitle}>Reader Public Teaser Policy</Text>
            <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[styles.badgeText, { color: "#92400E" }]}>
                {isOwnerPreview ? "Publisher / Editorial Access Policy" : teaser.authority}
              </Text>
            </View>
          </View>
          <Text style={styles.teaserBody}>
            Non-subscribed readers receive{" "}
            <Text style={{ fontWeight: "700" }}>{teaser.paragraphCount} lead paragraph</Text> of editorial body for{" "}
            <Text style={{ fontWeight: "700" }}>{teaser.durationSeconds} seconds</Text> before the subscriber prompt transitions to paywall mode.
          </Text>
          <Text style={styles.teaserEnforce}>
            Reader Experience Rule: {teaser.enforcement}
          </Text>
        </View>
      </View>

      {/* SECTION 2: Recent Premium Stories */}
      <View style={styles.card}>
        <View style={[styles.rowBetween, { marginBottom: spacing.sm }]}>
          <View>
            <Text style={styles.sectionTitle}>Recent Premium Stories</Text>
            <Text style={styles.sectionSubtitle}>
              Editorial works currently designated under the premium access policy.
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: colors.inkMuted }]}>
              Count: {overview?.recentPremiumStories.length ?? 0}
            </Text>
          </View>
        </View>

        {(overview?.recentPremiumStories ?? []).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Stories Set to Premium</Text>
            <Text style={styles.emptySubtitle}>
              All published stories are currently open access. Editors can assign premium policy in the Story Workspace.
            </Text>
          </View>
        ) : (
          (overview?.recentPremiumStories ?? []).map((st) => (
            <View key={st.id} style={styles.storyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.storyTitle}>{st.title}</Text>
                <Text style={styles.storyMeta}>
                  Status: {st.status.toUpperCase()} • Published: {formatIso(st.publishedAt)}
                </Text>
              </View>

              <View style={styles.storyActions}>
                <View style={[styles.badge, { backgroundColor: st.accessPolicy === "public" ? "#DCFCE7" : "#DBEAFE" }]}>
                  <Text style={[styles.badgeText, { color: st.accessPolicy === "public" ? "#166534" : "#1D4ED8" }]}>
                    {st.accessPolicy.toUpperCase()}
                  </Text>
                </View>

                {onOpenStory && (
                  <Pressable
                    style={styles.smallPolicyButton}
                    onPress={() => onOpenStory(st.id)}
                  >
                    <Text style={styles.smallPolicyButtonText}>Open Story →</Text>
                  </Pressable>
                )}

                {canAssign && (
                  <Pressable
                    style={[styles.smallPolicyButton, isMutating && styles.disabledButton]}
                    onPress={() => onSetStoryAccess(st.id, st.accessPolicy === "premium" ? "public" : "premium")}
                    disabled={isMutating}
                  >
                    <Text style={styles.smallPolicyButtonText}>
                      {st.accessPolicy === "premium" ? "Make Public" : "Set Premium"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* SECTION 3: Entitlement Providers & Integrations */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Entitlement Providers & Channels</Text>
        <Text style={styles.sectionSubtitle}>
          Active verification pathways feeding reader access passes.
        </Text>

        <View style={[styles.policiesGrid, isDesktop ? styles.gridCols3 : null]}>
          <View style={styles.providerCard}>
            <Text style={styles.providerName}>Direct Staff Grant</Text>
            <Text style={styles.providerDesc}>
              Administrative passes granted by newsroom staff for partners, researchers and contributors.
            </Text>
            <Text style={styles.providerCount}>
              Active: {subscriberStats.providers.find((p) => p.provider === "staff_grant")?.count ?? 0}
            </Text>
          </View>

          <View style={styles.providerCard}>
            <Text style={styles.providerName}>Web / Stripe Checkout</Text>
            <Text style={styles.providerDesc}>
              Recurring monthly and annual subscriptions authenticated via HealthTimes Web reader portal.
            </Text>
            <Text style={styles.providerCount}>
              Active: {subscriberStats.providers.find((p) => p.provider === "stripe")?.count ?? 0}
            </Text>
          </View>

          <View style={styles.providerCard}>
            <Text style={styles.providerName}>Mobile & Local Invoicing</Text>
            <Text style={styles.providerDesc}>
              EcoCash, Paynow, and Apple / Google in-app subscriptions verified via native receipt validation.
            </Text>
            <Text style={styles.providerCount}>
              Active: {subscriberStats.providers.find((p) => p.provider === "ecocash" || p.provider === "in_app")?.count ?? 0}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function StudioPremiumDesk() {
  const [overview, setOverview] = useState<NewsroomPremiumOperationsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [authSnapshot, setAuthSnapshot] = useState<AuthorizationSnapshot | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const snap = await services.authorization.getSnapshot();
      setAuthSnapshot(snap);
      const data = await services.newsroomCommercial.getPremiumOperationsOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load premium operations overview");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canManage = useMemo(() => canManagePremium(authSnapshot), [authSnapshot]);
  const canAssign = useMemo(() => canAssignPremium(authSnapshot), [authSnapshot]);

  const handleSetStoryAccess = async (storyId: string, policy: "public" | "premium") => {
    setIsMutating(true);
    setActionMessage(null);
    try {
      const res = await services.newsroomCommercial.setStoryAccess(storyId, policy);
      setActionMessage(`Story policy changed to "${res}".`);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to set story access policy");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <StudioPremiumDeskView
      overview={overview}
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      onSetStoryAccess={handleSetStoryAccess}
      canManage={canManage}
      canAssign={canAssign}
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
  gridCols4: {
    flexDirection: "row"
  },
  gridCols3: {
    flexDirection: "row"
  },
  gridCols2: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
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
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.ink
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.inkMuted
  },
  policiesGrid: {
    gap: spacing.md
  },
  policyCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: "#FAFAFA"
  },
  policyName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  policyDesc: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18
  },
  policyMeter: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginTop: 4
  },
  teaserCallout: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.xs
  },
  teaserTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400E"
  },
  teaserBody: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19
  },
  teaserEnforce: {
    fontSize: 12,
    color: "#92400E",
    fontStyle: "italic",
    marginTop: 2
  },
  storyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: spacing.md
  },
  storyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink
  },
  storyMeta: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2
  },
  storyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  smallPolicyButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  smallPolicyButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
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
  providerCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: "#FAFAFA"
  },
  providerName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink
  },
  providerDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 17
  },
  providerCount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D4ED8",
    marginTop: 4
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center"
  }
});
