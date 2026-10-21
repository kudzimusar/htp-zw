import { useEffect, useState, type PropsWithChildren } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { breakpoints, colors, layout, radius, spacing } from "../theme/tokens";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import {
  hasAnyServerCapability,
  hasServerCapability,
  EDITORIAL_DESK_CAPABILITIES,
  AUDIENCE_DESK_CAPABILITIES,
  COMMERCIAL_DESK_CAPABILITIES,
  FINANCE_DESK_CAPABILITIES,
  EXECUTIVE_DESK_CAPABILITIES,
  ADMIN_DESK_CAPABILITIES,
  type HealthTimesCapability
} from "../security/capabilities";

export interface StudioDomainItem {
  label: string;
  path: string;
  requiredCapability?: HealthTimesCapability;
  anyOfCapabilities?: readonly HealthTimesCapability[];
  badge?: string;
}

export interface StudioDomainDef {
  key: string;
  title: string;
  shortTitle: string;
  description: string;
  requiredCapabilities?: readonly HealthTimesCapability[];
  items: StudioDomainItem[];
}

export const LEGACY_STUDIO_MODULES = [
  ["Today","/studio"],
  ["Inbox","/studio/inbox"],
  ["Assignments","/studio/assignments"],
  ["Planning","/studio/planning"],
  ["Calendar","/studio/calendar"],
  ["Stories","/studio/stories"],
  ["Review Queue","/studio/review-queue"],
  ["Create / Edit","/studio/create-edit"],
  ["Live Desk","/studio/live-desk"],
  ["Video Desk","/studio/video-desk"],
  ["Desks","/studio/desks"],
  ["Breaking","/studio/breaking"],
  ["Moderation","/studio/moderation"],
  ["Media","/studio/media"],
  ["Homepage","/studio/homepage"],
  ["Advertising","/studio/advertising"],
  ["Premium","/studio/premium"],
  ["Social Desk","/studio/social"],
  ["Newsletter Desk","/studio/newsletters"],
  ["Push Alerts","/studio/push-alerts"],
  ["WhatsApp Desk","/studio/whatsapp"],
  ["Audience","/studio/audience"],
  ["Search & Growth","/studio/search-growth"],
  ["Analytics & Intelligence","/studio/analytics"],
  ["AI Desk & Citations","/studio/ai-desk"],
  ["Subscribers","/studio/subscribers"],
  ["Authors","/studio/authors"],
  ["Staff & Roles","/studio/staff-roles"],
  ["Platform Settings","/studio/settings"]
] as const;

export const STUDIO_DOMAINS: readonly StudioDomainDef[] = [
  {
    key: "my-work",
    title: "1. MY WORK",
    shortTitle: "My Work",
    description: "Personal tasks, assignments, drafts, and filed expense claims",
    items: [
      { label: "My Assignments", path: "/studio/assignments" },
      { label: "Story Workspace (Create / Edit)", path: "/studio/create-edit" },
      { label: "My Inbox & Notices", path: "/studio/inbox" },
      { label: "My Expenses", path: "/studio/my-expenses" }
    ]
  },
  {
    key: "editorial",
    title: "2. EDITORIAL",
    shortTitle: "Editorial",
    description: "Core newsroom journalism, editing, review queue, and publishing",
    requiredCapabilities: EDITORIAL_DESK_CAPABILITIES,
    items: [
      { label: "Review Queue", path: "/studio/review-queue", requiredCapability: "story.fact_check" },
      { label: "Story Hub", path: "/studio/stories", requiredCapability: "story.create" },
      { label: "Planning Board", path: "/studio/planning", requiredCapability: "assignment.manage" },
      { label: "Editorial Calendar", path: "/studio/calendar", requiredCapability: "assignment.manage" },
      { label: "Live Desk", path: "/studio/live-desk", requiredCapability: "story.publish" },
      { label: "Video Desk", path: "/studio/video-desk", requiredCapability: "media.manage" },
      { label: "Media Library", path: "/studio/media", requiredCapability: "media.manage" },
      { label: "Editorial Desks", path: "/studio/desks", requiredCapability: "communication.desk.manage" },
      { label: "Breaking Desk", path: "/studio/breaking", requiredCapability: "communication.breaking.manage" },
      { label: "Authors & Bylines", path: "/studio/authors" },
      { label: "AI Citations Desk", path: "/studio/ai-desk" }
    ]
  },
  {
    key: "audience-marketing",
    title: "3. AUDIENCE & MARKETING",
    shortTitle: "Audience",
    description: "Multi-channel distribution, newsletters, social, alerts, and reader growth",
    requiredCapabilities: AUDIENCE_DESK_CAPABILITIES,
    items: [
      { label: "Social Desk", path: "/studio/social", requiredCapability: "social.compose" },
      { label: "Newsletter Desk", path: "/studio/newsletters", requiredCapability: "marketing.create" },
      { label: "Push Alerts", path: "/studio/push-alerts", requiredCapability: "distribution.manage" },
      { label: "WhatsApp Desk", path: "/studio/whatsapp", requiredCapability: "distribution.manage" },
      { label: "Audience Intelligence", path: "/studio/audience", requiredCapability: "analytics.view" },
      { label: "Search & Growth", path: "/studio/search-growth", requiredCapability: "analytics.view" }
    ]
  },
  {
    key: "commercial",
    title: "4. COMMERCIAL",
    shortTitle: "Commercial",
    description: "Direct advertising campaigns, booking orders, and subscriber revenue",
    requiredCapabilities: COMMERCIAL_DESK_CAPABILITIES,
    items: [
      { label: "Ad Campaigns", path: "/studio/advertising", requiredCapability: "ads.view" },
      { label: "Commercial Orders", path: "/studio/orders", requiredCapability: "commercial.order.create" },
      { label: "Subscribers Directory", path: "/studio/subscribers", requiredCapability: "subscriber.view" },
      { label: "Premium Policies", path: "/studio/premium", requiredCapability: "subscriber.manage" }
    ]
  },
  {
    key: "finance",
    title: "5. FINANCE & ACCOUNTING",
    shortTitle: "Finance",
    description: "Invoicing, AR aging, payment ledger, expenses, and operational statements",
    requiredCapabilities: FINANCE_DESK_CAPABILITIES,
    items: [
      { label: "Financial Overview", path: "/studio/finance", requiredCapability: "finance.view" },
      { label: "Invoices & Billing", path: "/studio/finance-invoices", requiredCapability: "finance.invoice.create" },
      { label: "Receivables Aging", path: "/studio/finance-aging", requiredCapability: "finance.receivable.view" },
      { label: "Payments Ledger", path: "/studio/finance-payments", requiredCapability: "finance.payment.record" },
      { label: "Expense Claims", path: "/studio/finance-expenses", requiredCapability: "finance.expense.view" },
      { label: "Financial Statements", path: "/studio/finance-statements", requiredCapability: "finance.statement.view" },
      { label: "Billing Customers", path: "/studio/finance-customers", requiredCapability: "finance.view" }
    ]
  },
  {
    key: "executive",
    title: "6. PUBLISHER / EXECUTIVE",
    shortTitle: "Executive",
    description: "Publication governance, homepage curation, standards, and performance",
    requiredCapabilities: EXECUTIVE_DESK_CAPABILITIES,
    items: [
      { label: "Executive Dashboard", path: "/studio/executive", requiredCapability: "analytics.view" },
      { label: "Homepage Curation", path: "/studio/homepage", requiredCapability: "story.publish" },
      { label: "Analytics & Intelligence", path: "/studio/analytics", requiredCapability: "analytics.view" },
      { label: "Staff Governance", path: "/studio/staff-roles", requiredCapability: "staff.view" },
      { label: "Comment Moderation", path: "/studio/moderation", requiredCapability: "comment.moderate" }
    ]
  },
  {
    key: "admin",
    title: "7. ADMINISTRATION",
    shortTitle: "Administration",
    description: "RBAC security, staff provisioning, session revocation, and platform settings",
    requiredCapabilities: ADMIN_DESK_CAPABILITIES,
    items: [
      { label: "Staff & Roles (RBAC)", path: "/studio/staff-roles", requiredCapability: "staff.manage" },
      { label: "Platform Settings", path: "/studio/settings", requiredCapability: "settings.manage" },
      { label: "Active Sessions & Audit", path: "/studio/admin-sessions", requiredCapability: "security.view_sessions" }
    ]
  }
];

function useHydratedStudioWidth() {
  const { width } = useWindowDimensions();
  const [responsiveReady, setResponsiveReady] = useState(Platform.OS!=="web");
  useEffect(() => {
    if (Platform.OS === "web") setResponsiveReady(true);
  }, []);
  return responsiveReady ? width : 0;
}

function authorizationLabel(status: string | undefined) {
  if (status === "authorized") return "AG-06 VERIFIED";
  if (status === "authenticated-no-staff-authority") return "READER ONLY";
  if (status === "server-policy-unavailable") return "SERVER POLICY PENDING";
  return "NO STAFF AUTHORITY";
}

export function StudioShell({ children, title }: PropsWithChildren<{ title: string }>) {
  const width = useHydratedStudioWidth();
  const router = useRouter();
  const pathname = usePathname();
  const desktop=width>=breakpoints.tablet;
  const authorization = useAsync(() => services.authorization.getSnapshot(), []);
  const active = (path: string) => (path === "/studio" ? pathname === "/studio" : pathname === path);
  const status = authorizationLabel(authorization.data?.status);
  const snapshot = authorization.data;

  const roleName = snapshot?.role ?? (snapshot?.status === "authorized" ? "Staff Member" : "Guest / Reader");
  const displayName = snapshot?.displayName ?? snapshot?.email ?? "Newsroom Staff";
  const deskName = snapshot?.desk ?? "Newsroom";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "HT";

  async function handleSignOut() {
    try {
      await services.auth.signOut();
      router.push("/" as never);
    } catch {
      router.push("/" as never);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.shell}>
        {/* Desktop Sidebar with Persistent Identity Header & 7-Domain Navigation */}
        {desktop && <View style={styles.sidebar}>
            {/* Brand Header */}
            <Pressable onPress={() => router.push("/studio" as never)} accessibilityRole="button">
              <Text style={styles.brand}>HealthTimes</Text>
              <Text style={styles.studioLabel}>NEWSROOM OS · ROLE DOMAINS</Text>
            </Pressable>

            {/* Persistent Staff Identity Header */}
            <View style={styles.identityCard}>
              <View style={styles.identityRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.identityInfo}>
                  <Text style={styles.identityName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.identityHandle} numberOfLines={1}>
                    {snapshot?.handle ? `@${snapshot.handle}` : deskName}
                  </Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, getRoleBadgeStyle(roleName)]}>
                  <Text style={styles.roleBadgeText}>{roleName.toUpperCase()}</Text>
                </View>
                <View style={styles.deskBadge}>
                  <Text style={styles.deskBadgeText}>{deskName.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.sessionStatusRow}>
                <View style={[styles.statusDot, snapshot?.status === "authorized" ? styles.statusDotGreen : styles.statusDotAmber]} />
                <Text style={styles.sessionStatusText}>{status}</Text>
                <Pressable style={styles.signOutLink} onPress={handleSignOut}>
                  <Text style={styles.signOutLinkText}>Sign Out</Text>
                </Pressable>
              </View>
            </View>

            {/* 7-Domain Grouped Navigation Scroll */}
            <ScrollView contentContainerStyle={styles.navScroll} showsVerticalScrollIndicator={false}>
              {STUDIO_DOMAINS.map((domain) => {
                const domainAllowed =
                  !domain.requiredCapabilities ||
                  (snapshot ? hasAnyServerCapability(snapshot, domain.requiredCapabilities) : false);

                return (
                  <View key={domain.key} style={styles.domainSection}>
                    <View style={styles.domainHeader}>
                      <Text style={[styles.domainTitle, !domainAllowed && styles.domainTitleLocked]}>
                        {domain.title}
                      </Text>
                      {!domainAllowed && <Text style={styles.domainLockedBadge}>LOCKED</Text>}
                    </View>

                    <View style={styles.domainItems}>
                      {domain.items.map((item) => {
                        const itemAllowed =
                          domainAllowed &&
                          (!item.requiredCapability ||
                            (snapshot ? hasServerCapability(snapshot, item.requiredCapability) : false));

                        const isCurrent = active(item.path);

                        return (
                          <Pressable
                            key={item.path}
                            style={[
                              styles.navItem,
                              isCurrent && styles.navItemActive,
                              !itemAllowed && styles.navItemLocked
                            ]}
                            onPress={() => router.push(item.path as never)}
                            accessibilityState={{ selected: isCurrent }}
                          >
                            <Text
                              style={[
                                styles.navText,
                                isCurrent && styles.navTextActive,
                                !itemAllowed && styles.navTextLocked
                              ]}
                            >
                              {item.label}
                            </Text>
                            {!itemAllowed && <Text style={styles.itemLockIcon}>🔒</Text>}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Bottom Security Authority Box */}
            <View style={styles.securityPanel}>
              <Text style={styles.securityLabel}>STAGING RUNTIME · AG-06 BOUNDED</Text>
              <Text style={styles.security}>Authority: AG-06 server roles only · Zero client-side role simulation.</Text>
            </View>
          </View>}

        {/* Main Workspace Area */}
        <ScrollView style={styles.workspace} contentContainerStyle={styles.workspaceContent}>
          {/* Top Mobile Bar with Identity */}
          <View style={styles.mobileBar}>
            <View style={styles.workspaceIdentity}>
              <Text style={styles.workspaceBrand}>HealthTimes Newsroom OS</Text>
              <Text style={styles.environment}>
                {roleName.toUpperCase()} • {deskName.toUpperCase()}
              </Text>
            </View>
            <View style={styles.topActions}>
              {!desktop && <Text style={styles.mobileStatus}>{status}</Text>}
              <Pressable style={styles.back} onPress={() => router.push("/" as never)}>
                <Text style={styles.backText}>Reader</Text>
              </Pressable>
            </View>
          </View>

          {/* Workspace Body */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Operational workspace. Production metrics, permissions, and publishing authority appear only from certified services.
            </Text>

            {/* Mobile Horizontal Navigation */}
            {!desktop && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileNav}>
                {STUDIO_DOMAINS.map((domain) => (
                  <View key={domain.key} style={styles.mobileDomainGroup}>
                    <Text style={styles.mobileDomainTitle}>{domain.shortTitle}</Text>
                    <View style={styles.mobileDomainRow}>
                      {domain.items.map((item) => (
                        <Pressable
                          key={item.path}
                          style={[styles.mobileNavItem, active(item.path) && styles.mobileNavItemActive]}
                          onPress={() => router.push(item.path as never)}
                        >
                          <Text style={[styles.mobileNavText, active(item.path) && styles.mobileNavTextActive]}>
                            {item.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>}

            {children}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function getRoleBadgeStyle(role: string) {
  if (role.includes("Owner") || role.includes("Publisher")) {
    return { backgroundColor: "#102A3F", borderColor: "#70D1D1" };
  }
  if (role.includes("Finance") || role.includes("Accounts")) {
    return { backgroundColor: "#0D331E", borderColor: "#34A853" };
  }
  if (role.includes("Editor")) {
    return { backgroundColor: "#0E2442", borderColor: "#4285F4" };
  }
  if (role.includes("Commercial")) {
    return { backgroundColor: "#381E02", borderColor: "#FBBC04" };
  }
  if (role.includes("Admin")) {
    return { backgroundColor: "#28123B", borderColor: "#A142F4" };
  }
  return { backgroundColor: "#1C2B38", borderColor: "#8FA2B5" };
}

export function StudioAuthorityGate({ children }: PropsWithChildren) {
  const authorization = useAsync(() => services.authorization.getSnapshot(), []);
  if (authorization.loading) {
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY</Text>
        <Text style={styles.accessGateTitle}>Checking Newsroom session…</Text>
      </View>
    );
  }
  const snapshot = authorization.data;
  const allowed = snapshot?.status==="authorized" && snapshot.source==="server";
  if (!allowed) {
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY REQUIRED</Text>
        <Text style={styles.accessGateTitle}>This Studio communication module is locked.</Text>
        <Text style={styles.accessGateText}>
          {snapshot?.reason ?? authorization.error?.message ?? "No server-authorized Newsroom session is available."}
        </Text>
        <Text style={styles.accessGateText}>
          Reader authentication, local role labels, client state, or direct navigation cannot create Newsroom authority.
        </Text>
      </View>
    );
  }
  return <>{children}</>;
}

export function StudioAccessGate({
  capability,
  children
}: PropsWithChildren<{ capability: HealthTimesCapability }>) {
  const authorization = useAsync(() => services.authorization.getSnapshot(), [capability]);

  if (authorization.loading) {
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY</Text>
        <Text style={styles.accessGateTitle}>Checking capability…</Text>
      </View>
    );
  }

  const snapshot = authorization.data;
  const allowed = snapshot ? hasServerCapability(snapshot, capability) : false;
  if (!allowed) {
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY REQUIRED</Text>
        <Text style={styles.accessGateTitle}>This Studio module is locked.</Text>
        <View style={styles.capabilityRow}>
          <Text style={styles.capabilityLabel}>Required capability</Text>
          <Text style={styles.capabilityValue}>{capability}</Text>
        </View>
        <Text style={styles.accessGateText}>
          {snapshot?.reason ?? authorization.error?.message ?? "No server capability snapshot is available."}
        </Text>
        <Text style={styles.accessGateText}>
          Signing in, changing local state, editing the client, or navigating directly to this route cannot grant this capability.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function StudioAnyCapabilityGate({
  capabilities,
  children
}: PropsWithChildren<{ capabilities: readonly HealthTimesCapability[] }>) {
  const capabilityKey = capabilities.join(",");
  const authorization = useAsync(() => services.authorization.getSnapshot(), [capabilityKey]);

  if (authorization.loading) {
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY</Text>
        <Text style={styles.accessGateTitle}>Checking capability…</Text>
      </View>
    );
  }

  const snapshot = authorization.data;
  const allowed = snapshot ? hasAnyServerCapability(snapshot, capabilities) : false;
  if (!allowed) {
    return (
      <View style={styles.accessGate}>
        <Text style={styles.accessGateEyebrow}>SERVER AUTHORITY REQUIRED</Text>
        <Text style={styles.accessGateTitle}>This Studio module is locked.</Text>
        <View style={styles.capabilityRow}>
          <Text style={styles.capabilityLabel}>Required capability (any of)</Text>
          {capabilities.map((cap) => (
            <Text key={cap} style={styles.capabilityValue}>
              {cap}
            </Text>
          ))}
        </View>
        <Text style={styles.accessGateText}>
          {snapshot?.reason ?? authorization.error?.message ?? "No server capability snapshot is available."}
        </Text>
        <Text style={styles.accessGateText}>
          Signing in, changing local state, editing the client, or navigating directly to this route cannot grant this capability.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function StudioPlaceholder({ owner, description }: { owner: string; description: string }) {
  return (
    <View style={styles.placeholder}>
      <View style={styles.ownerRow}>
        <Text style={styles.placeholderOwner}>{owner}</Text>
        <Text style={styles.integrationBadge}>SERVICE-OWNED</Text>
      </View>
      <Text style={styles.placeholderText}>{description}</Text>
      <Text style={styles.placeholderState}>
        No fabricated production metrics, permissions, revenue, audience totals, or workflow authority are shown.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  shell: { flex: 1, flexDirection: "row", backgroundColor: colors.paperMuted },
  sidebar: { width: 280, backgroundColor: colors.navy, padding: spacing.lg, justifyContent: "space-between" },
  brand: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  studioLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.4, color: "#70D1D1", marginTop: 2 },
  identityCard: {
    backgroundColor: "#132332",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#203A4E",
    padding: spacing.sm,
    marginTop: spacing.md,
    gap: 6
  },
  identityRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#70D1D1",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { fontSize: 12, fontWeight: "900", color: colors.navy },
  identityInfo: { flex: 1 },
  identityName: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  identityHandle: { fontSize: 10, color: "#8FA2B5" },
  badgeRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  roleBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, color: "#FFFFFF" },
  deskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: "#1A3245"
  },
  deskBadgeText: { fontSize: 9, fontWeight: "800", color: "#A7BDCE" },
  sessionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#1C3142",
    paddingTop: 6,
    marginTop: 2
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusDotGreen: { backgroundColor: "#34A853" },
  statusDotAmber: { backgroundColor: "#FBBC04" },
  sessionStatusText: { fontSize: 9, fontWeight: "800", color: "#8FA2B5", flex: 1 },
  signOutLink: { paddingHorizontal: 6, paddingVertical: 2 },
  signOutLinkText: { fontSize: 10, fontWeight: "700", color: "#D5DFE8" },
  navScroll: { paddingVertical: spacing.md, gap: spacing.md },
  domainSection: { gap: 3 },
  domainHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 6, marginBottom: 2 },
  domainTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: "#70D1D1" },
  domainTitleLocked: { color: "#546A7D" },
  domainLockedBadge: { fontSize: 8, fontWeight: "900", color: "#546A7D", backgroundColor: "#102331", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  domainItems: { gap: 1 },
  navItem: {
    minHeight: 32,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderLeftWidth: 2,
    borderLeftColor: "transparent"
  },
  navItemActive: { backgroundColor: "#102A3F", borderLeftColor: "#70D1D1" },
  navItemLocked: { opacity: 0.45 },
  navText: { fontSize: 12, fontWeight: "600", color: "#D5DFE8" },
  navTextActive: { color: "#FFFFFF", fontWeight: "800" },
  navTextLocked: { color: "#8FA2B5" },
  itemLockIcon: { fontSize: 9 },
  securityPanel: { borderTopWidth: 1, borderTopColor: "#234057", paddingTop: spacing.sm, gap: 2 },
  securityLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8, color: "#70D1D1" },
  security: { fontSize: 9, lineHeight: 13, color: "#8FA2B5" },
  workspace: { flex: 1, backgroundColor: colors.paperMuted },
  workspaceContent: { minHeight: "100%" },
  mobileBar: {
    minHeight: 64,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  workspaceIdentity: { flex: 1 },
  workspaceBrand: { fontSize: 15, fontWeight: "900", color: colors.ink },
  environment: { fontSize: 9, fontWeight: "900", color: colors.live, letterSpacing: 0.6, marginTop: 1 },
  topActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  mobileStatus: { fontSize: 9, fontWeight: "900", color: colors.inkMuted },
  back: { minHeight: layout.touchMin, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  backText: { fontWeight: "800", color: colors.ink },
  content: { width: "100%", maxWidth: 1180, alignSelf: "center", padding: spacing.xl },
  title: { fontSize: 28, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 20, color: colors.inkMuted, maxWidth: 760, marginTop: spacing.xs },
  mobileNav: { gap: spacing.lg, paddingVertical: spacing.md },
  mobileDomainGroup: { gap: 6 },
  mobileDomainTitle: { fontSize: 11, fontWeight: "900", color: colors.inkMuted, letterSpacing: 0.8 },
  mobileDomainRow: { flexDirection: "row", gap: spacing.xs },
  mobileNavItem: { minHeight: 36, justifyContent: "center", paddingHorizontal: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  mobileNavItemActive: { borderColor: colors.blue, backgroundColor: "#EEF5FF" },
  mobileNavText: { fontSize: 11, fontWeight: "700", color: colors.ink },
  mobileNavTextActive: { color: colors.blue },
  placeholder: { marginTop: spacing.xl, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.sm, borderRadius: radius.md },
  ownerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, flexWrap: "wrap" },
  placeholderOwner: { fontSize: 11, fontWeight: "900", color: colors.blue, letterSpacing: 1 },
  integrationBadge: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: colors.inkMuted },
  placeholderText: { fontSize: 18, lineHeight: 25, fontWeight: "800", color: colors.ink, maxWidth: 760 },
  placeholderState: { fontSize: 13, lineHeight: 20, color: colors.inkMuted },
  accessGate: { marginTop: spacing.xl, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.live, padding: spacing.xl, gap: spacing.sm, borderRadius: radius.md },
  accessGateEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: colors.live },
  accessGateTitle: { fontSize: 20, fontWeight: "900", color: colors.ink },
  capabilityRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  capabilityLabel: { fontSize: 11, fontWeight: "800", color: colors.inkMuted },
  capabilityValue: { fontSize: 11, fontWeight: "900", color: colors.ink, backgroundColor: colors.paperMuted, paddingHorizontal: 8, paddingVertical: 5 },
  accessGateText: { fontSize: 14, lineHeight: 21, color: colors.inkMuted, maxWidth: 760 }
});
