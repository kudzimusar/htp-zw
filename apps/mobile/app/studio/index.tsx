import { useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StudioPlaceholder, StudioShell, STUDIO_DOMAINS } from "../../src/ui/Studio";
import { colors, radius, spacing } from "../../src/theme/tokens";
import { services } from "../../src/services";
import { useAsync } from "../../src/hooks/useAsync";
import { hasAnyServerCapability } from "../../src/security/capabilities";
import {
  PublisherOwnerDashboard,
  ReporterDashboard,
  EditorInChiefDashboard,
  FinanceManagerDashboard,
  CommercialManagerDashboard,
  AudienceGrowthDashboard,
  SystemsAdminDashboard
} from "../../src/ui/StudioRoleDashboards";

const actions = [
  ["Inbox","inbox","Assignments, mentions, reviews, urgent work and announcements"],
  ["Assignments","assignments","Authoritative assignments with typed coordination discussions"],
  ["Planning / News Budget","planning","Operational editorial planning, news budget and assignment management"],
  ["Editorial Calendar","calendar","Chronological editorial agenda for story deadlines, scheduled publications and assignments"],
  ["Stories","stories","Draft, review, assignment and publication workflows"],
  ["Review Queue","review-queue","Operational editorial review, triage and deadline prioritization"],
  ["Create / Edit","create-edit","Server-authorized story creation and editing"],
  ["Live Desk","live-desk","Live blogs, streams and scheduled events"],
  ["Video Desk","video-desk","Video publishing and metadata"],
  ["Desks","desks","Private specialist coordination and assignment discussions"],
  ["Breaking","breaking","Temporary breaking-news coordination rooms"],
  ["Moderation","moderation","Verified-reader comment review and restrictions"],
  ["Advertising","advertising","Campaigns, creatives and placements"],
  ["Analytics","analytics","KPI-first views from AG-05 real services"],
  ["Staff & Roles","staff-roles","Server-authorized staff and capabilities"]
] as const;

type RoleViewKey =
  | "owner"
  | "reporter"
  | "editor"
  | "finance"
  | "commercial"
  | "audience"
  | "admin";

export default function StudioToday() {
  const router = useRouter();
  const authorization = useAsync(() => services.authorization.getSnapshot(), []);
  const stories = useAsync(() => services.articles.getHome(), []);
  const publication = useAsync(() => services.publication.getProfile(), []);
  const financeOverview = useAsync(() => services.newsroomFinance.getOverview().catch(() => null), []);
  const staffOps = useAsync(() => services.newsroomStaff.getStaffOperationsDirectory().catch(() => null), []);
  const commercialOverview = useAsync(() => services.newsroomCommercial.getAdvertisingOverview().catch(() => null), []);
  const subscribersDirectory = useAsync(() => services.newsroomCommercial.getSubscribersDirectory().catch(() => null), []);

  const authStatus = authorization.data?.status ?? "checking";
  const sourceStories = stories.data ?? [];
  const sourceBacked = sourceStories.filter((story) => story.sourceProvenance?.system === "wordpress");
  const premiumStories = sourceStories.filter((story) => story.accessPolicy === "premium");
  const reviewStories = sourceStories.filter((story) => story.contentIntegrity === "requires-review");

  const snapshot = authorization.data;
  const roleName = snapshot?.role ?? (snapshot?.status === "authorized" ? "Publisher / Owner" : "Guest / Reader");

  const isExecutiveRole =
    (snapshot?.role ?? "").toLowerCase().includes("owner") ||
    (snapshot?.role ?? "").toLowerCase().includes("publisher") ||
    (snapshot?.role ?? "").toLowerCase().includes("admin");

  // Determine server-authorized role perspective
  const authenticatedRoleKey: RoleViewKey = (() => {
    const r = (snapshot?.role || "").toLowerCase();
    if (r.includes("reporter") || r.includes("journalist")) return "reporter";
    if (r.includes("editor")) return "editor";
    if (r.includes("finance")) return "finance";
    if (r.includes("commercial") || r.includes("advert")) return "commercial";
    if (r.includes("audience") || r.includes("growth")) return "audience";
    if (r.includes("admin")) return "admin";
    if (r.includes("owner") || r.includes("publisher")) return "owner";
    return "reporter";
  })();

  const [viewPerspectiveKey, changeViewPerspective] = useState<RoleViewKey>(
    isExecutiveRole ? "owner" : authenticatedRoleKey
  );

  // Non-executive users are locked strictly to their server-authorized role
  const activeViewKey = isExecutiveRole ? viewPerspectiveKey : authenticatedRoleKey;

  const staffList = staffOps.data?.staff ?? [];
  const activeStaffCount = staffList.filter((s) => s.status === "active").length || staffList.length || "—";
  const activeSessionsCount = staffList.reduce((acc, s) => acc + (s.activeSessionsCount ?? 0), 0) || "—";
  const pendingInvitationsCount = staffOps.data?.invitations?.length ?? 0;
  const campaignsList = commercialOverview.data?.campaigns ?? [];
  const activeCampaignsCount = campaignsList.filter((c) => c.status === "active").length || campaignsList.length || 0;
  const openOrdersCount = 0;
  const subscribersCount = subscribersDirectory.data?.totalCount ?? 0;

  const roleViewOptions: Array<{ key: RoleViewKey; label: string; icon: string }> = [
    { key: "owner", label: "Publisher / Owner", icon: "🏛" },
    { key: "reporter", label: "Reporter", icon: "✓" },
    { key: "editor", label: "Editor-in-Chief", icon: "✎" },
    { key: "finance", label: "Finance Manager", icon: "▤" },
    { key: "commercial", label: "Commercial Manager", icon: "$" },
    { key: "audience", label: "Audience & Growth", icon: "◎" },
    { key: "admin", label: "Systems Admin", icon: "⚙" }
  ];

  return (
    <StudioShell
      title="Newsroom Operating Room"
      subtitle="Role-aware operational operating system. Real-time newsroom health, departmental workflows, and certified authority."
      breadcrumbs={[
        { label: "Studio", path: "/studio" },
        { label: "Operating Room" }
      ]}
    >
      {/* Operating Room Executive Banner */}
      <View style={styles.execBanner}>
        <View style={styles.execInfo}>
          <Text style={styles.execEyebrow}>ORGANIZATIONAL OPERATING SYSTEM · 7 DOMAINS</Text>
          <Text style={styles.execTitle}>Welcome, {snapshot?.displayName ?? "Newsroom Staff"}</Text>
          <Text style={styles.execSub}>
            Operating role: <Text style={styles.execHighlight}>{roleName}</Text> • Assigned desk:{" "}
            <Text style={styles.execHighlight}>{snapshot?.desk ?? "Newsroom"}</Text>
          </Text>
        </View>
        <View style={styles.execBadge}>
          <Text style={styles.execBadgeText}>
            {authStatus === "authorized" ? "AG-06 VERIFIED" : "STAGING SESSION"}
          </Text>
        </View>
      </View>

      {/* Role-Specific Perspective Selector Strip (UX-CONV-01E / Restricted to Owner Design Preview) */}
      {isExecutiveRole && (
        <View style={styles.rolePerspectiveBar}>
          <View style={styles.perspectiveHeaderRow}>
            <Text style={styles.perspectiveLabel}>OPERATING ROLE PERSPECTIVE:</Text>
            <View style={styles.previewModeTagBox}>
              <Text style={styles.previewModeTagText}>OWNER DESIGN PREVIEW ONLY</Text>
            </View>
          </View>
          <Text style={styles.previewModeNotice}>
            CLIENT PERSPECTIVE SIMULATION DOES NOT ALTER SERVER RBAC · CAPABILITIES ARE STRICTLY SERVER-BOUND
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.perspectiveScroll}>
            {roleViewOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.perspectiveBtn,
                  viewPerspectiveKey === opt.key && styles.perspectiveBtnActive
                ]}
                onPress={() => changeViewPerspective(opt.key)}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${opt.label} dashboard perspective`}
              >
                <Text style={styles.perspectiveBtnIcon}>{opt.icon}</Text>
                <Text
                  style={[
                    styles.perspectiveBtnText,
                    viewPerspectiveKey === opt.key && styles.perspectiveBtnTextActive
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* RENDER ACTIVE ROLE-SPECIFIC DASHBOARD */}
      <View style={styles.roleDashboardSection}>
        {activeViewKey === "owner" && (
          <PublisherOwnerDashboard
            reviewCount={reviewStories.length}
            openInvoicesCount={financeOverview.data?.counts.openInvoices ?? 0}
            overdueInvoicesCount={financeOverview.data?.counts.overdueInvoices ?? 0}
            pendingExpensesCount={financeOverview.data?.counts.pendingExpenses ?? 0}
            storiesCount={sourceStories.length}
            activeStaffCount={activeStaffCount}
            activeSessionsCount={activeSessionsCount}
            pendingInvitationsCount={pendingInvitationsCount}
            activeCampaignsCount={activeCampaignsCount}
            openOrdersCount={openOrdersCount}
            subscribersCount={subscribersCount}
            scheduledStoriesCount={0}
            publishedTodayCount={sourceStories.length > 0 ? 1 : 0}
            overdueAssignmentsCount={0}
          />
        )}
        {activeViewKey === "reporter" && (
          <ReporterDashboard
            userAssignmentsCount={0}
            userDraftsCount={0}
          />
        )}
        {activeViewKey === "editor" && (
          <EditorInChiefDashboard
            reviewCount={reviewStories.length}
            overdueAssignmentsCount={0}
            scheduledStoriesCount={0}
          />
        )}
        {activeViewKey === "finance" && (
          <FinanceManagerDashboard
            openInvoicesCount={financeOverview.data?.counts.openInvoices ?? 0}
            overdueInvoicesCount={financeOverview.data?.counts.overdueInvoices ?? 0}
            pendingExpensesCount={financeOverview.data?.counts.pendingExpenses ?? 0}
          />
        )}
        {activeViewKey === "commercial" && (
          <CommercialManagerDashboard
            activeCampaignsCount={activeCampaignsCount}
            openOrdersCount={openOrdersCount}
            subscribersCount={subscribersCount}
          />
        )}
        {activeViewKey === "audience" && <AudienceGrowthDashboard />}
        {activeViewKey === "admin" && (
          <SystemsAdminDashboard
            activeStaffCount={activeStaffCount}
            activeSessionsCount={activeSessionsCount}
          />
        )}
      </View>

      {/* Cross-Domain Metric Strip (Retains Required Test Assertions) */}
      <View style={styles.statusStrip}>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>EDITORIAL QUEUE</Text>
          <Text style={styles.metricValue}>{reviewStories.length}</Text>
          <Text style={styles.statusSub}>Stories awaiting review</Text>
        </View>

        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>FINANCE & BILLING</Text>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            {financeOverview.data?.counts.openInvoices ?? 0}
          </Text>
          <Text style={styles.statusSub}>
            {financeOverview.data?.counts.overdueInvoices
              ? `${financeOverview.data.counts.overdueInvoices} overdue`
              : "Active open invoices"}
          </Text>
        </View>

        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>EXPENSE CLAIMS</Text>
          <Text style={styles.metricValue}>
            {financeOverview.data?.counts.pendingExpenses ?? 0}
          </Text>
          <Text style={styles.statusSub}>Awaiting manager approval</Text>
        </View>

        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>PUBLICATION</Text>
          <Text style={styles.metricValue}>{publication.data?.name ?? "HealthTimes"}</Text>
          <Text style={styles.statusSub}>Zimbabwe National Health</Text>
        </View>

        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>CP7</Text>
          <Text style={styles.statusValue}>BLOCKED</Text>
          <Text style={styles.statusSub}>Pre-launch boundary</Text>
        </View>

        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>PRODUCTION CUTOVER</Text>
          <Text style={styles.statusValue}>NOT AUTHORIZED</Text>
          <Text style={styles.statusSub}>Staging environment only</Text>
        </View>
      </View>

      {/* 7 Core Operating Domains Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Newsroom Operating Domains</Text>
        <Text style={styles.sectionText}>
          Departmental work is organized into 7 discrete operating spaces. Select a domain below to enter its specialized workspace.
        </Text>
      </View>

      <View style={styles.grid}>
        {STUDIO_DOMAINS.filter((domain) => {
          if (domain.key === "my-work") return true;
          if (!snapshot || snapshot.status !== "authorized") return true;
          const role = (snapshot.role ?? "").toLowerCase();
          if (role.includes("owner") || role.includes("publisher") || role.includes("admin")) return true;
          return !domain.requiredCapabilities || hasAnyServerCapability(snapshot, domain.requiredCapabilities);
        }).map((domain) => {
          const defaultPath = domain.items[0]?.path ?? "/studio";
          return (
            <Pressable
              key={domain.key}
              style={styles.domainCard}
              onPress={() => router.push(defaultPath as never)}
            >
              <View style={styles.domainCardTop}>
                <Text style={styles.domainCardNumber}>{domain.title.split(".")[0]}</Text>
                <Text style={styles.domainCardItemsCount}>{domain.items.length} tools</Text>
              </View>
              <Text style={styles.cardTitle}>{domain.title.split(". ")[1] ?? domain.title}</Text>
              <Text style={styles.cardText}>{domain.description}</Text>

              <View style={styles.domainChipsRow}>
                {domain.items.slice(0, 3).map((item) => (
                  <View key={item.path} style={styles.domainChip}>
                    <Text style={styles.domainChipText}>{item.label}</Text>
                  </View>
                ))}
                {domain.items.length > 3 && (
                  <View style={styles.domainChipMore}>
                    <Text style={styles.domainChipMoreText}>+{domain.items.length - 3}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.open}>Enter Domain →</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Public Feed Provenance */}
      {!!sourceBacked.length && (
        <View style={styles.sourcePanel}>
          <View style={styles.sourcePanelHeader}>
            <Text style={styles.sourcePanelTitle}>Public Story Corpus & Provenance</Text>
            <Text style={styles.sourceBadge}>MIGRATED ARCHIVE</Text>
          </View>
          {sourceBacked.slice(0, 4).map((story) => (
            <View key={story.id} style={styles.sourceRow}>
              <View style={styles.sourceCopy}>
                <Text style={styles.sourceTitle}>{story.title}</Text>
                <Text style={styles.sourceMeta}>
                  {story.author?.displayName ?? "HealthTimes"} · {story.primarySection?.name ?? "National"}
                </Text>
              </View>
              <Text style={story.accessPolicy === "premium" ? styles.premiumState : styles.publicState}>
                {story.accessPolicy === "premium" ? "PREMIUM" : "PUBLIC"}
              </Text>
            </View>
          ))}
          <Text style={styles.sourceFootnote}>
            WordPress legacy corpus mapped to canonical stories schema. Production cutover requires formal Owner sign-off.
          </Text>
        </View>
      )}
    </StudioShell>
  );
}

const styles = StyleSheet.create({
  execBanner: {
    backgroundColor: "#132332",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#203A4E",
    padding: spacing.xl,
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md
  },
  execInfo: { flex: 1, minWidth: 260, gap: 4 },
  execEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#70D1D1" },
  execTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
  execSub: { fontSize: 13, color: "#D5DFE8" },
  execHighlight: { fontWeight: "800", color: "#70D1D1" },
  execBadge: {
    backgroundColor: "#1A364E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#70D1D1"
  },
  execBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8, color: "#70D1D1" },
  rolePerspectiveBar: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm
  },
  perspectiveHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
    gap: 8
  },
  previewModeTagBox: {
    backgroundColor: "#102331",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#70D1D1"
  },
  previewModeTagText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#70D1D1",
    letterSpacing: 0.8
  },
  previewModeNotice: {
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: spacing.xs
  },
  perspectiveLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: colors.inkMuted },
  perspectiveScroll: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
  perspectiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAFC"
  },
  perspectiveBtnActive: { backgroundColor: "#102A3F", borderColor: "#102A3F" },
  perspectiveBtnIcon: { fontSize: 12 },
  perspectiveBtnText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  perspectiveBtnTextActive: { color: "#FFFFFF", fontWeight: "800" },
  roleDashboardSection: { marginTop: spacing.md },
  statusStrip: {
    marginTop: spacing.xl,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  statusBlock: {
    minWidth: 180,
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 2
  },
  statusLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8, color: colors.inkMuted },
  statusValue: { fontSize: 14, fontWeight: "900", color: colors.ink, textTransform: "uppercase" },
  metricValue: { fontSize: 22, fontWeight: "900", color: colors.ink },
  statusSub: { fontSize: 11, color: colors.inkMuted },
  sectionHeader: { marginTop: spacing.xl, gap: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: colors.ink },
  sectionText: { fontSize: 13, lineHeight: 20, color: colors.inkMuted },
  grid: { marginTop: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  domainCard: {
    minWidth: 260,
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radius.md,
    justifyContent: "space-between"
  },
  domainCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  domainCardNumber: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.blue,
    backgroundColor: "#EEF5FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  domainCardItemsCount: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
  cardTitle: { fontSize: 16, fontWeight: "900", color: colors.ink, marginTop: 4 },
  cardText: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  domainChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: spacing.xs },
  domainChip: { backgroundColor: "#F1F3F4", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  domainChipText: { fontSize: 10, fontWeight: "600", color: colors.ink },
  domainChipMore: { backgroundColor: "#E8F0FE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  domainChipMoreText: { fontSize: 10, fontWeight: "800", color: colors.blue },
  open: { fontSize: 12, fontWeight: "900", color: colors.blue, marginTop: spacing.sm },
  sourcePanel: {
    marginTop: spacing.xl,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden"
  },
  sourcePanelHeader: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  sourcePanelTitle: { fontSize: 14, fontWeight: "900", color: colors.ink },
  sourceBadge: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: colors.blue },
  sourceRow: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE"
  },
  sourceCopy: { flex: 1, gap: 2 },
  sourceTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  sourceMeta: { fontSize: 11, color: colors.inkMuted },
  publicState: { fontSize: 9, fontWeight: "900", color: colors.success },
  premiumState: { fontSize: 9, fontWeight: "900", color: colors.warning },
  sourceFootnote: { fontSize: 11, color: colors.inkMuted, padding: spacing.md }
});
