import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import type {
  NewsroomPlatformSettingItem,
  NewsroomPlatformSettingsOverview,
  NewsroomIntegrationHealth
} from "../domain/models";
import {
  canManageSettings,
  hasSettingsDeskAccess,
  emptyAuthorizationSnapshot,
  type AuthorizationSnapshot
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export interface StudioSettingsDeskViewProps {
  overview: NewsroomPlatformSettingsOverview | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onUpdateSetting: (key: string, value: Record<string, unknown>) => Promise<void>;
  canManage: boolean;
  actionMessage: string | null;
  isMutating: boolean;
}

const DEFAULT_STATUS_PILL = { bg: "#FEF3C7", text: "#92400E" };

const STATUS_PILLS: Record<string, { bg: string; text: string }> = {
  configured: { bg: "#DCFCE7", text: "#166534" },
  active: { bg: "#DCFCE7", text: "#166534" },
  healthy: { bg: "#DCFCE7", text: "#166534" },
  property_verified: { bg: "#E0F2FE", text: "#0369A1" },
  unconfigured: { bg: "#FEF3C7", text: "#92400E" },
  error: { bg: "#FEE2E2", text: "#991B1B" }
};

export function StudioSettingsDeskView({
  overview,
  isLoading,
  error,
  onRefresh,
  onUpdateSetting,
  canManage,
  actionMessage,
  isMutating
}: StudioSettingsDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;

  const integrations = overview?.integrations ?? {};
  const settings = overview?.settings ?? [];
  const audit = overview?.auditSummary;

  const getSettingValue = (key: string, field: string, defaultVal: any) => {
    const s = settings.find((item) => item.key === key);
    return s?.value?.[field] ?? defaultVal;
  };

  const handleToggle = async (key: string, field: string, currentValue: boolean) => {
    if (!canManage || isMutating) return;
    await onUpdateSetting(key, { [field]: !currentValue });
  };

  const handleChangeCommentPolicy = async (policy: string) => {
    if (!canManage || isMutating) return;
    await onUpdateSetting("comments_default_policy", { policy });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Platform & Integration Settings</Text>
          <Text style={styles.subtitle}>
            Centralized newsroom integrations, distribution transports, editorial guardrails, and environment health.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.secondaryButton, isMutating && styles.buttonDisabled]}
            onPress={onRefresh}
            disabled={isMutating}
          >
            <Text style={styles.secondaryButtonText}>↻ Refresh Status</Text>
          </Pressable>
        </View>
      </View>

      {/* Security Principle Alert */}
      <View style={styles.securityNotice}>
        <Text style={styles.securityNoticeTitle}>🔒 Zero Secret Exposure Guarantee</Text>
        <Text style={styles.securityNoticeText}>
          In accordance with Newsroom OS security architecture, API keys, webhook signing secrets, and authentication credentials are held exclusively in server environment vaults and edge runtimes. This interface exposes configuration health, verified property identifiers, and operational toggles only.
        </Text>
      </View>

      {/* Action Feedback Banner */}
      {actionMessage && (
        <View style={styles.bannerSuccess}>
          <Text style={styles.bannerSuccessText}>{actionMessage}</Text>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.bannerError}>
          <Text style={styles.bannerErrorText}>Error: {error}</Text>
        </View>
      )}

      {/* Audit Activity Summary */}
      <View style={styles.auditCard}>
        <View style={styles.auditLeft}>
          <Text style={styles.auditLabel}>Audit Trail Activity (24h)</Text>
          <Text style={styles.auditValue}>{audit?.totalAuditEvents24h ?? 0} audited operations</Text>
        </View>
        <View style={styles.auditRight}>
          <Text style={styles.auditLabel}>Last Security Event</Text>
          <Text style={styles.auditAction}>{audit?.lastAuditAction ?? "none"}</Text>
          {audit?.lastAuditAt && (
            <Text style={styles.auditTime}>{new Date(audit.lastAuditAt).toLocaleTimeString()}</Text>
          )}
        </View>
      </View>

      {/* Integration Health Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connected Distribution & Growth Integrations</Text>
        <Text style={styles.sectionSubtitle}>Verified third-party transports and measurement endpoints.</Text>
      </View>

      <View style={[styles.integrationsGrid, isDesktop && styles.integrationsGridDesktop]}>
        {Object.entries(integrations).map(([key, item]) => {
          const pill = STATUS_PILLS[item.status] ?? DEFAULT_STATUS_PILL;
          return (
            <View style={styles.integrationCard} key={key}>
              <View style={styles.integrationCardHeader}>
                <Text style={styles.integrationName}>{item.name}</Text>
                <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.statusPillText, { color: pill.text }]}>{item.status.replace("_", " ")}</Text>
                </View>
              </View>

              <Text style={styles.integrationProvider}>Provider: {item.provider}</Text>

              <View style={styles.integrationDetails}>
                {Boolean(item.phone_number_id) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone Number ID:</Text>
                    <Text style={styles.detailValue}>{String(item.phone_number_id)}</Text>
                  </View>
                )}
                {Boolean(item.property_id) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>GA4 Property:</Text>
                    <Text style={styles.detailValue}>{String(item.property_id)}</Text>
                  </View>
                )}
                {Boolean(item.site_url) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Search Console Site:</Text>
                    <Text style={styles.detailValue}>{String(item.site_url)}</Text>
                  </View>
                )}
                {Boolean(item.sender_email) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sender Email:</Text>
                    <Text style={styles.detailValue}>{String(item.sender_email)}</Text>
                  </View>
                )}
                {Boolean(item.project_ref) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Supabase Ref:</Text>
                    <Text style={styles.detailValue}>{String(item.project_ref)} ({String(item.region)})</Text>
                  </View>
                )}
                {Boolean(item.active_migrations) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Active Migrations:</Text>
                    <Text style={styles.detailValue}>{String(item.active_migrations)} applied</Text>
                  </View>
                )}
              </View>

              <View style={styles.secretBadgeRow}>
                {item.secretConfigured ? (
                  <Text style={styles.secretConfiguredText}>✓ Credentials Active in Vault</Text>
                ) : (
                  <Text style={styles.secretPendingText}>⏳ Secret Configuration Pending</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Operational Policies & Toggles Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Operational Guardrails & Policies</Text>
        <Text style={styles.sectionSubtitle}>
          Real-time newsroom controls. Changes are immediately recorded in the tamper-evident audit log.
        </Text>
      </View>

      <View style={styles.togglesCard}>
        {/* Toggle: Require Review */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Require Editorial Review</Text>
            <Text style={styles.toggleDesc}>
              Enforce formal two-stage approval in Review Queue before any draft can be scheduled or published.
            </Text>
          </View>
          <Switch
            value={getSettingValue("editorial_require_review", "enabled", true)}
            onValueChange={() =>
              handleToggle(
                "editorial_require_review",
                "enabled",
                getSettingValue("editorial_require_review", "enabled", true)
              )
            }
            disabled={!canManage || isMutating}
            trackColor={{ false: colors.border, true: colors.blue }}
          />
        </View>

        {/* Toggle: Paywall Hard Enforcement */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Strict Premium Paywall Enforcement</Text>
            <Text style={styles.toggleDesc}>
              Require verified active subscription for in-depth clinical investigations, with automated teaser cutoff.
            </Text>
          </View>
          <Switch
            value={getSettingValue("paywall_hard_enforcement", "enabled", false)}
            onValueChange={() =>
              handleToggle(
                "paywall_hard_enforcement",
                "enabled",
                getSettingValue("paywall_hard_enforcement", "enabled", false)
              )
            }
            disabled={!canManage || isMutating}
            trackColor={{ false: colors.border, true: colors.blue }}
          />
        </View>

        {/* Toggle: AI Assist Enabled */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>AI Editorial Research Assistant</Text>
            <Text style={styles.toggleDesc}>
              Enable Gemini-assisted headline generation, summaries, and evidence gap detection in Story Workspace.
            </Text>
          </View>
          <Switch
            value={getSettingValue("ai_editorial_assist_enabled", "enabled", true)}
            onValueChange={() =>
              handleToggle(
                "ai_editorial_assist_enabled",
                "enabled",
                getSettingValue("ai_editorial_assist_enabled", "enabled", true)
              )
            }
            disabled={!canManage || isMutating}
            trackColor={{ false: colors.border, true: colors.blue }}
          />
        </View>

        {/* Toggle: Maintenance Mode */}
        <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleTitle, { color: "#991B1B" }]}>Maintenance Mode</Text>
            <Text style={styles.toggleDesc}>
              Temporarily restrict public portal writes, reader comments, and non-essential external webhook processing.
            </Text>
          </View>
          <Switch
            value={getSettingValue("maintenance_mode", "enabled", false)}
            onValueChange={() =>
              handleToggle(
                "maintenance_mode",
                "enabled",
                getSettingValue("maintenance_mode", "enabled", false)
              )
            }
            disabled={!canManage || isMutating}
            trackColor={{ false: colors.border, true: "#DC2626" }}
          />
        </View>

        {/* Comment Policy Selector */}
        <View style={styles.policyRow}>
          <Text style={styles.toggleTitle}>Default Story Comment Policy</Text>
          <Text style={styles.toggleDesc}>Governs reader discussion eligibility on newly authored stories.</Text>
          <View style={styles.policyButtons}>
            {(["open", "read_only", "disabled"] as const).map((pol) => {
              const current = getSettingValue("comments_default_policy", "policy", "open");
              const isSelected = current === pol;
              return (
                <Pressable
                  key={pol}
                  style={[styles.policyBtn, isSelected && styles.policyBtnActive]}
                  onPress={() => handleChangeCommentPolicy(pol)}
                  disabled={!canManage || isMutating}
                >
                  <Text style={[styles.policyBtnText, isSelected && styles.policyBtnTextActive]}>
                    {pol === "open" ? "Open (Moderated)" : pol === "read_only" ? "Read Only" : "Disabled"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export function StudioSettingsDesk() {
  const [snapshot, setSnapshot] = useState<AuthorizationSnapshot>(
    emptyAuthorizationSnapshot("server-policy-unavailable", "initializing")
  );
  const [overview, setOverview] = useState<NewsroomPlatformSettingsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authSnap = await services.authorization.getSnapshot();
      setSnapshot(authSnap);

      if (!hasSettingsDeskAccess(authSnap)) {
        setIsLoading(false);
        return;
      }

      const data = await services.newsroomSettings.getPlatformSettings();
      setOverview(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load platform settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canManage = canManageSettings(snapshot);

  const handleUpdateSetting = async (key: string, value: Record<string, unknown>) => {
    try {
      setIsMutating(true);
      setActionMessage(null);
      await services.newsroomSettings.updatePlatformSetting(key, value);
      setActionMessage(`Platform setting "${key}" updated and audited.`);
      await loadData();
    } catch (err: any) {
      setError(err.message ?? "Failed to update platform setting");
    } finally {
      setIsMutating(false);
    }
  };

  if (!isLoading && !hasSettingsDeskAccess(snapshot)) {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedText}>
          You do not have the required settings.manage or security.manage capability to access Platform Settings.
        </Text>
      </View>
    );
  }

  return (
    <StudioSettingsDeskView
      overview={overview}
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
      onUpdateSetting={handleUpdateSetting}
      canManage={canManage}
      actionMessage={actionMessage}
      isMutating={isMutating}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paperMuted
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md
  },
  headerLeft: {
    flex: 1,
    minWidth: 280
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 4,
    lineHeight: 20
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  secondaryButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center"
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  securityNotice: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: spacing.md,
    borderRadius: radius.md
  },
  securityNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 2
  },
  securityNoticeText: {
    fontSize: 12,
    color: "#1E3A8A",
    lineHeight: 18
  },
  bannerSuccess: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    padding: spacing.md,
    borderRadius: radius.md
  },
  bannerSuccessText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "500"
  },
  bannerError: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: spacing.md,
    borderRadius: radius.md
  },
  bannerErrorText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "500"
  },
  auditCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg
  },
  auditLeft: {
    flex: 1
  },
  auditRight: {
    alignItems: "flex-end"
  },
  auditLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  auditValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 2
  },
  auditAction: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.blue,
    marginTop: 2
  },
  auditTime: {
    fontSize: 11,
    color: colors.inkMuted
  },
  sectionHeader: {
    marginTop: spacing.md
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2
  },
  integrationsGrid: {
    flexDirection: "column",
    gap: spacing.md
  },
  integrationsGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  integrationCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm
  },
  integrationCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  integrationName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  integrationProvider: {
    fontSize: 12,
    color: colors.inkMuted
  },
  integrationDetails: {
    backgroundColor: colors.paperMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 4
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  detailLabel: {
    fontSize: 11,
    color: colors.inkMuted
  },
  detailValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.ink
  },
  secretBadgeRow: {
    marginTop: 4
  },
  secretConfiguredText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600"
  },
  secretPendingText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "500"
  },
  togglesCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md
  },
  toggleInfo: {
    flex: 1
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink
  },
  toggleDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 18
  },
  policyRow: {
    paddingTop: spacing.md
  },
  policyButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  policyBtn: {
    backgroundColor: colors.paperMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  policyBtnActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  policyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  policyBtnTextActive: {
    color: "#fff"
  },
  deniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: spacing.xs
  },
  deniedText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 400
  }
});
