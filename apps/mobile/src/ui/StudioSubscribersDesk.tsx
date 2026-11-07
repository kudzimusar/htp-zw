import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  NewsroomSubscriber,
  NewsroomSubscribersDirectory
} from "../domain/models";
import {
  canManageSubscribers,
  hasSubscriberDeskAccess,
  type AuthorizationSnapshot
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export interface StudioSubscribersDeskViewProps {
  directory: NewsroomSubscribersDirectory | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  statusFilter: string;
  onChangeStatusFilter: (status: string) => void;
  onUpdateStatus: (subscriberId: string, status: string) => Promise<void>;
  onGrantEntitlement: (
    subscriberId: string,
    policyKey: string,
    durationDays: number
  ) => Promise<void>;
  canManage: boolean;
  actionMessage: string | null;
  isMutating: boolean;
  isOwnerPreview?: boolean;
  onOpenPremium?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#DCFCE7", text: "#166534" },
  suspended: { bg: "#FEF3C7", text: "#92400E" },
  canceled: { bg: "#FEE2E2", text: "#991B1B" },
  past_due: { bg: "#FEE2E2", text: "#991B1B" }
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

export function StudioSubscribersDeskView({
  directory,
  isLoading,
  error,
  onRefresh,
  searchQuery,
  onChangeSearchQuery,
  statusFilter,
  onChangeStatusFilter,
  onUpdateStatus,
  onGrantEntitlement,
  canManage,
  actionMessage,
  isMutating,
  isOwnerPreview = false,
  onOpenPremium
}: StudioSubscribersDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  const [selectedSubForGrant, setSelectedSubForGrant] = useState<NewsroomSubscriber | null>(null);
  const [grantPolicy, setGrantPolicy] = useState("premium");
  const [grantDuration, setGrantDuration] = useState(30);

  const metrics = directory?.metrics ?? {
    totalSubscribers: 0,
    activeSubscribers: 0,
    premiumSubscribers: 0,
    suspendedSubscribers: 0,
    canceledSubscribers: 0
  };

  const filteredSubscribers = useMemo(() => {
    if (!directory?.subscribers) return [];
    return directory.subscribers.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.displayName && s.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus =
        statusFilter === "all" ||
        s.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [directory?.subscribers, searchQuery, statusFilter]);

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={[styles.headerCard, isDesktop ? styles.rowBetween : null]}>
        <View style={styles.headerTitles}>
          <View style={styles.badgeRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>Commercial Desk</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {canManage ? "Subscriber Manager" : "Auditor (Read-Only)"}
              </Text>
            </View>
          </View>
          <Text style={styles.mainTitle}>Subscribers & Reader Entitlements</Text>
          <Text style={styles.mainSubtitle}>
            Verified subscriber accounts, access pass grants, policy memberships, and status lifecycle.
          </Text>
        </View>

        <View style={styles.headerActions}>
          {onOpenPremium && (
            <Pressable
              style={styles.secondaryButton}
              onPress={onOpenPremium}
              testID="subscribers-open-premium-btn"
            >
              <Text style={styles.secondaryButtonText}>Premium Access Policies →</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.secondaryButton, isMutating && styles.disabledButton]}
            onPress={onRefresh}
            disabled={isMutating}
          >
            <Text style={styles.secondaryButtonText}>
              {isLoading ? "Refreshing..." : "Refresh Registry"}
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
          testID="subscribers-preview-banner"
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}>
            ℹ️ Sample Subscriber & Entitlement Registry (Owner Preview): Reader accounts and entitlement passes shown below are sample records. Account status (Active / Suspended) governs login standing, while Entitlement Passes govern metered Premium story access. Actions below update local Preview memory only and never charge customers.
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
      <View style={[styles.metricsGrid, isDesktop ? styles.gridCols5 : styles.gridCols2]}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Readers</Text>
          <Text style={styles.metricValue}>{metrics.totalSubscribers}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Readers</Text>
          <Text style={[styles.metricValue, { color: "#166534" }]}>{metrics.activeSubscribers}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Premium Subscribers</Text>
          <Text style={[styles.metricValue, { color: "#1D4ED8" }]}>
            {metrics.premiumSubscribers}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Suspended</Text>
          <Text style={[styles.metricValue, { color: "#92400E" }]}>
            {metrics.suspendedSubscribers}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Canceled / Lapsed</Text>
          <Text style={[styles.metricValue, { color: "#991B1B" }]}>
            {metrics.canceledSubscribers}
          </Text>
        </View>
      </View>

      {/* Search & Filter Toolbar */}
      <View style={[styles.toolbarCard, isDesktop ? styles.rowBetween : null]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email or name..."
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          placeholderTextColor="#9CA3AF"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPills}>
          {["all", "active", "suspended", "canceled", "past_due"].map((status) => (
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
      </View>

      {/* Subscribers List */}
      <View style={styles.sectionContainer}>
        {filteredSubscribers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Subscriber Records Found</Text>
            <Text style={styles.emptySubtitle}>
              No verified subscriber records matched the search query or status filter.
            </Text>
          </View>
        ) : (
          filteredSubscribers.map((sub) => {
            const statusStyle = STATUS_COLORS[sub.status.toLowerCase()] ?? {
              bg: "#F3F4F6",
              text: "#4B5563"
            };
            return (
              <View key={sub.id} style={styles.itemCard}>
                <View style={[styles.rowBetween, { marginBottom: spacing.xs }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{sub.email}</Text>
                    <Text style={styles.itemSubtitle}>
                      {sub.displayName ? `${sub.displayName} • ` : ""}Joined {formatIso(sub.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.badgeRow}>
                    {sub.hasActivePremium && (
                      <View style={[styles.badge, { backgroundColor: "#DBEAFE" }]}>
                        <Text style={[styles.badgeText, { color: "#1D4ED8" }]}>PREMIUM ACTIVE</Text>
                      </View>
                    )}
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                        {sub.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Entitlements Breakdown */}
                {sub.entitlements.length > 0 ? (
                  <View style={styles.entitlementsContainer}>
                    <Text style={styles.entitlementsLabel}>Entitlements:</Text>
                    <View style={styles.entitlementsPillsRow}>
                      {sub.entitlements.map((e) => (
                        <View
                          key={e.id}
                          style={[
                            styles.entitlementPill,
                            e.isActive ? styles.entitlementActive : styles.entitlementExpired
                          ]}
                        >
                          <Text
                            style={[
                              styles.entitlementText,
                              e.isActive ? styles.entitlementTextActive : styles.entitlementTextExpired
                            ]}
                          >
                            {e.policyKey.toUpperCase()} ({e.provider ?? "direct"}) — until {formatIso(e.endsAt)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <Text style={styles.metaText}>No active or historical entitlements</Text>
                )}

                {/* Management Actions */}
                {canManage && (
                  <View style={[styles.rowBetween, styles.actionRow]}>
                    <View />
                    <View style={styles.actionButtonsRow}>
                      <Pressable
                        style={[styles.smallGrantButton, isMutating && styles.disabledButton]}
                        onPress={() => setSelectedSubForGrant(sub)}
                        disabled={isMutating}
                      >
                        <Text style={styles.smallGrantText}>+ Grant Access</Text>
                      </Pressable>

                      {sub.status === "active" ? (
                        <Pressable
                          style={[styles.smallSuspendButton, isMutating && styles.disabledButton]}
                          onPress={() => onUpdateStatus(sub.id, "suspended")}
                          disabled={isMutating}
                        >
                          <Text style={styles.smallSuspendText}>Suspend</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[styles.smallActivateButton, isMutating && styles.disabledButton]}
                          onPress={() => onUpdateStatus(sub.id, "active")}
                          disabled={isMutating}
                        >
                          <Text style={styles.smallActivateText}>Activate</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* MODAL: Grant Entitlement */}
      {selectedSubForGrant && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Grant Subscriber Entitlement</Text>
            <Text style={styles.modalSubtitle}>
              Assign access pass to reader: <Text style={{ fontWeight: "700" }}>{selectedSubForGrant.email}</Text>
            </Text>

            <Text style={styles.fieldLabel}>Access Policy:</Text>
            <View style={styles.durationOptionsRow}>
              {["premium"].map((p) => (
                <Pressable
                  key={p}
                  style={[styles.durationOption, grantPolicy === p && styles.durationOptionActive]}
                  onPress={() => setGrantPolicy(p)}
                >
                  <Text style={[styles.durationText, grantPolicy === p && styles.durationTextActive]}>
                    {p.toUpperCase()} (Full Access)
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Duration Period:</Text>
            <View style={styles.durationOptionsRow}>
              {[7, 30, 90, 365].map((d) => (
                <Pressable
                  key={d}
                  style={[styles.durationOption, grantDuration === d && styles.durationOptionActive]}
                  onPress={() => setGrantDuration(d)}
                >
                  <Text style={[styles.durationText, grantDuration === d && styles.durationTextActive]}>
                    {d} Days
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setSelectedSubForGrant(null)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isMutating && styles.disabledButton]}
                disabled={isMutating}
                onPress={async () => {
                  await onGrantEntitlement(selectedSubForGrant.id, grantPolicy, grantDuration);
                  setSelectedSubForGrant(null);
                }}
              >
                <Text style={styles.primaryButtonText}>
                  {isMutating ? "Granting..." : "Confirm Grant"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export function StudioSubscribersDesk() {
  const [directory, setDirectory] = useState<NewsroomSubscribersDirectory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const data = await services.newsroomCommercial.getSubscribersDirectory();
      setDirectory(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load subscribers directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canManage = useMemo(() => canManageSubscribers(authSnapshot), [authSnapshot]);

  const handleUpdateStatus = async (subscriberId: string, status: string) => {
    setIsMutating(true);
    setActionMessage(null);
    try {
      const res = await services.newsroomCommercial.updateSubscriberStatus(subscriberId, status);
      setActionMessage(`Subscriber status updated to ${res}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update subscriber status");
    } finally {
      setIsMutating(false);
    }
  };

  const handleGrantEntitlement = async (
    subscriberId: string,
    policyKey: string,
    durationDays: number
  ) => {
    setIsMutating(true);
    setActionMessage(null);
    try {
      await services.newsroomCommercial.grantSubscriberEntitlement(
        subscriberId,
        policyKey,
        durationDays
      );
      setActionMessage(`Granted ${durationDays}-day "${policyKey}" pass.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? "Failed to grant entitlement");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <StudioSubscribersDeskView
      directory={directory}
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      searchQuery={searchQuery}
      onChangeSearchQuery={setSearchQuery}
      statusFilter={statusFilter}
      onChangeStatusFilter={setStatusFilter}
      onUpdateStatus={handleUpdateStatus}
      onGrantEntitlement={handleGrantEntitlement}
      canManage={canManage}
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
  gridCols5: {
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
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  entitlementsContainer: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 4
  },
  entitlementsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  entitlementsPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  entitlementPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  entitlementActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  entitlementExpired: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  entitlementText: {
    fontSize: 11,
    fontWeight: "600"
  },
  entitlementTextActive: {
    color: "#1D4ED8"
  },
  entitlementTextExpired: {
    color: "#6B7280"
  },
  metaText: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  actionRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6"
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  smallGrantButton: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  smallGrantText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8"
  },
  smallSuspendButton: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  smallSuspendText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E"
  },
  smallActivateButton: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  smallActivateText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534"
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
    maxWidth: 480,
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 4
  },
  durationOptionsRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  durationOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  durationOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6"
  },
  durationText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  durationTextActive: {
    fontWeight: "800",
    color: "#1D4ED8"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm
  }
});
