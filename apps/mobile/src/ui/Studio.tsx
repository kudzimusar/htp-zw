import { useEffect, useState, type PropsWithChildren } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { breakpoints, colors, layout, radius, spacing } from "../theme/tokens";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { HealthTimesBrand } from "./Brand";
import {
  StudioPreferencesProvider,
  useStudioPreferences,
  type NewsroomRoleKey
} from "./StudioPreferencesContext";
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
  icon: string;
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
    icon: "✓",
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
    icon: "✎",
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
    icon: "◎",
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
    icon: "$",
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
    icon: "▤",
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
    icon: "🏛",
    description: "Publication governance, homepage curation, standards, and performance",
    requiredCapabilities: EXECUTIVE_DESK_CAPABILITIES,
    items: [
      { label: "Executive Dashboard", path: "/studio", requiredCapability: "analytics.view" },
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
    icon: "⚙",
    description: "RBAC security, staff provisioning, session revocation, and platform settings",
    requiredCapabilities: ADMIN_DESK_CAPABILITIES,
    items: [
      { label: "Staff & Roles (RBAC)", path: "/studio/staff-roles", requiredCapability: "staff.manage" },
      { label: "Platform Settings", path: "/studio/settings", requiredCapability: "settings.manage" },
      { label: "Active Sessions & Audit", path: "/studio/staff-roles?tab=audit", requiredCapability: "security.view_sessions" }
    ]
  }
];

function useHydratedStudioWidth() {
  const { width } = useWindowDimensions();
  const [responsiveReady, setResponsiveReady] = useState(Platform.OS !== "web");
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

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function StudioShell(props: PropsWithChildren<{
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  subtitle?: string;
  actions?: React.ReactNode;
}>) {
  return (
    <StudioPreferencesProvider>
      <StudioShellInner {...props} />
    </StudioPreferencesProvider>
  );
}

function StudioShellInner({
  children,
  title,
  breadcrumbs,
  subtitle,
  actions
}: PropsWithChildren<{
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  subtitle?: string;
  actions?: React.ReactNode;
}>) {
  const width = useHydratedStudioWidth();
  const router = useRouter();
  const pathname = usePathname();
  const desktop = width >= breakpoints.tablet;
  const tablet = width >= 640 && width < breakpoints.tablet;

  // Preferences & Layout State
  const {
    sidebarCollapsed,
    toggleSidebar,
    tableDensity,
    toggleTableDensity,
    pinnedPaths,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isQuickCreateOpen,
    setQuickCreateOpen,
    isNotificationsOpen,
    setNotificationsOpen,
    isMobileDrawerOpen,
    setMobileDrawerOpen
  } = useStudioPreferences();

  const [isAccountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedHoverDomain, setCollapsedHoverDomain] = useState<StudioDomainDef | null>(null);

  const authorization = useAsync(() => services.authorization.getSnapshot(), []);
  const inbox = useAsync(() => services.newsroomCommunication.listInbox("all", 20).catch(() => null), []);
  const unreadCount = inbox.data?.summary?.unreadTotal ?? 0;
  const notificationItems = inbox.data?.items ?? [];
  const active = (path: string) => (path === "/studio" ? pathname === "/studio" : pathname === path);
  const status = authorizationLabel(authorization.data?.status);
  const snapshot = authorization.data;

  const roleName = snapshot?.role ?? (snapshot?.status === "authorized" ? "Publisher / Owner" : "Guest / Reader");
  const displayName = snapshot?.displayName ?? snapshot?.email ?? "Kudzanai Musarurwa";
  const email = snapshot?.email ?? "kudzimusar@gmail.com";
  const deskName = snapshot?.desk ?? "Executive Desk";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "KM";

  // Keyboard shortcut listener for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setQuickCreateOpen(false);
        setNotificationsOpen(false);
        setAccountMenuOpen(false);
        setMobileDrawerOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSignOut() {
    try {
      await services.auth.signOut();
      router.push("/" as never);
    } catch {
      router.push("/" as never);
    }
  }

  // Derive default breadcrumbs if none provided
  const resolvedBreadcrumbs: BreadcrumbItem[] = breadcrumbs ?? [
    { label: "Studio", path: "/studio" },
    { label: title }
  ];

  // Role-Aware quick create options
  const isOwnerOrEditor =
    roleName.toLowerCase().includes("owner") ||
    roleName.toLowerCase().includes("publisher") ||
    roleName.toLowerCase().includes("editor");
  const isFinance = roleName.toLowerCase().includes("finance") || roleName.toLowerCase().includes("owner");
  const isCommercial = roleName.toLowerCase().includes("commercial") || roleName.toLowerCase().includes("owner");

  const quickCreateOptions = [
    { label: "New Story Draft", path: "/studio/create-edit", allowed: true, icon: "✎" },
    { label: "New Assignment", path: "/studio/planning", allowed: isOwnerOrEditor, icon: "📋" },
    { label: "Start Live Coverage", path: "/studio/live-desk", allowed: isOwnerOrEditor, icon: "🔴" },
    { label: "New Ad Campaign", path: "/studio/advertising", allowed: isCommercial, icon: "📢" },
    { label: "New Booking Order", path: "/studio/orders", allowed: isCommercial, icon: "📝" },
    { label: "New Customer Invoice", path: "/studio/finance-invoices", allowed: isFinance, icon: "💵" },
    { label: "New Newsletter Campaign", path: "/studio/newsletters", allowed: isOwnerOrEditor, icon: "✉" },
    { label: "New Push Alert", path: "/studio/push-alerts", allowed: isOwnerOrEditor, icon: "🔔" },
    { label: "WhatsApp Broadcast", path: "/studio/whatsapp", allowed: isOwnerOrEditor, icon: "💬" },
    { label: "Invite Staff Member", path: "/studio/staff-roles", allowed: isOwnerOrEditor, icon: "👤" }
  ].filter((opt) => opt.allowed);

  // Command palette navigation items
  const commandPaletteItems = [
    { label: "Go to Dashboard", path: "/studio", category: "Navigation" },
    { label: "Review Queue", path: "/studio/review-queue", category: "Editorial" },
    { label: "Story Hub", path: "/studio/stories", category: "Editorial" },
    { label: "Planning / News Budget", path: "/studio/planning", category: "Editorial" },
    { label: "Editorial Calendar", path: "/studio/calendar", category: "Editorial" },
    { label: "Live Desk", path: "/studio/live-desk", category: "Editorial" },
    { label: "Media Library", path: "/studio/media", category: "Editorial" },
    { label: "Advertising Desk", path: "/studio/advertising", category: "Commercial" },
    { label: "Commercial Orders", path: "/studio/orders", category: "Commercial" },
    { label: "Subscribers Directory", path: "/studio/subscribers", category: "Commercial" },
    { label: "Invoices & Billing", path: "/studio/finance-invoices", category: "Finance" },
    { label: "Aged Receivables", path: "/studio/finance-aging", category: "Finance" },
    { label: "Payments Ledger", path: "/studio/finance-payments", category: "Finance" },
    { label: "Expense Claims", path: "/studio/finance-expenses", category: "Finance" },
    { label: "Staff & Roles (RBAC)", path: "/studio/staff-roles", category: "Administration" },
    { label: "Platform Settings", path: "/studio/settings", category: "Administration" },
    { label: "My Profile & Authority", path: "/studio/me", category: "Personal" }
  ].filter((item) =>
    searchQuery ? item.label.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 1. GLOBAL TOP UTILITY BAR (UX-CONV-01D) */}
      <View style={styles.topUtilityBar}>
        <View style={styles.topBarLeft}>
          {/* Hamburger button for navigation sidebar / drawer */}
          <Pressable
            style={styles.menuIconBtn}
            onPress={() => {
              if (desktop) {
                toggleSidebar();
              } else {
                setMobileDrawerOpen(true);
              }
            }}
            accessibilityLabel="Toggle navigation sidebar"
            accessibilityRole="button"
          >
            <Text style={styles.menuIconText}>☰</Text>
          </Pressable>

          {/* HealthTimes Brand */}
          <Pressable
            style={styles.topBrandPressable}
            onPress={() => router.push("/studio" as never)}
            accessibilityRole="button"
          >
            <HealthTimesBrand inverse compact studio />
          </Pressable>

          {/* Staging / Production Environment Indicator (UX-CONV-01Q) */}
          <View style={styles.envIndicatorBadge}>
            <Text style={styles.envIndicatorText}>STAGING</Text>
          </View>
        </View>

        {/* Global Search / Command Bar Launcher (UX-CONV-01H & UX-CONV-01I) */}
        <Pressable
          style={styles.searchBarTrigger}
          onPress={() => setCommandPaletteOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Search or trigger command palette"
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search stories, staff, invoices... (⌘K)</Text>
          <View style={styles.kbdKey}>
            <Text style={styles.kbdText}>⌘K</Text>
          </View>
        </Pressable>

        <View style={styles.topBarRight}>
          {/* Quick Create (+ Create) Menu (UX-CONV-01J) */}
          <Pressable
            style={styles.quickCreateBtn}
            onPress={() => setQuickCreateOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Create new record"
          >
            <Text style={styles.quickCreateText}>+ Create</Text>
          </Pressable>

          {/* Operational Notification Bell Inbox (UX-CONV-01K) */}
          <Pressable
            style={styles.notificationBellBtn}
            onPress={() => setNotificationsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open Notification Centre"
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadgeDot}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Table Density Toggle (UX-CONV-01O) */}
          {desktop && (
            <Pressable
              style={styles.densityToggleBtn}
              onPress={toggleTableDensity}
              accessibilityRole="button"
              accessibilityLabel="Toggle table density"
            >
              <Text style={styles.densityToggleText}>
                {tableDensity === "compact" ? "Compact" : "Comfortable"}
              </Text>
            </Pressable>
          )}

          {/* User Profile / Avatar Trigger (Section 9) */}
          <Pressable
            style={styles.userProfileTrigger}
            onPress={() => setAccountMenuOpen(!isAccountMenuOpen)}
            accessibilityRole="button"
            accessibilityLabel="Open personal account menu"
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{initials}</Text>
            </View>
            {desktop && (
              <View style={styles.userMeta}>
                <Text style={styles.userNameText} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.userRoleText} numberOfLines={1}>
                  {roleName}
                </Text>
              </View>
            )}
            <Text style={styles.caretIcon}>▾</Text>
          </Pressable>
        </View>
      </View>

      {/* Account Menu Popover (Section 9) */}
      {isAccountMenuOpen && (
        <View style={styles.accountMenuPopover}>
          <View style={styles.accountMenuHeader}>
            <Text style={styles.accountMenuName}>{displayName}</Text>
            <Text style={styles.accountMenuEmail}>{email}</Text>
            <View style={styles.accountBadgeRow}>
              <View style={styles.accountRoleBadge}>
                <Text style={styles.accountRoleBadgeText}>{roleName.toUpperCase()}</Text>
              </View>
              <View style={styles.accountDeskBadge}>
                <Text style={styles.accountDeskBadgeText}>{deskName.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.accountMenuList}>
            <Pressable
              style={styles.accountMenuItem}
              onPress={() => {
                setAccountMenuOpen(false);
                router.push("/studio/me" as never);
              }}
            >
              <Text style={styles.accountMenuIcon}>👤</Text>
              <Text style={styles.accountMenuLabel}>My Profile & Station</Text>
            </Pressable>

            <Pressable
              style={styles.accountMenuItem}
              onPress={() => {
                setAccountMenuOpen(false);
                router.push("/studio/stories" as never);
              }}
            >
              <Text style={styles.accountMenuIcon}>✎</Text>
              <Text style={styles.accountMenuLabel}>My Stories</Text>
            </Pressable>

            <Pressable
              style={styles.accountMenuItem}
              onPress={() => {
                setAccountMenuOpen(false);
                router.push("/studio/assignments" as never);
              }}
            >
              <Text style={styles.accountMenuIcon}>📋</Text>
              <Text style={styles.accountMenuLabel}>My Assignments</Text>
            </Pressable>

            <Pressable
              style={styles.accountMenuItem}
              onPress={() => {
                setAccountMenuOpen(false);
                router.push("/studio/me?tab=preferences" as never);
              }}
            >
              <Text style={styles.accountMenuIcon}>⚙</Text>
              <Text style={styles.accountMenuLabel}>Workspace Preferences</Text>
            </Pressable>

            <Pressable
              style={styles.accountMenuItem}
              onPress={() => {
                setAccountMenuOpen(false);
                router.push("/studio/me?tab=security" as never);
              }}
            >
              <Text style={styles.accountMenuIcon}>🔒</Text>
              <Text style={styles.accountMenuLabel}>Security & Active Sessions</Text>
            </Pressable>

            <View style={styles.accountMenuDivider} />

            <Pressable
              style={styles.accountMenuItem}
              onPress={() => {
                setAccountMenuOpen(false);
                handleSignOut();
              }}
            >
              <Text style={[styles.accountMenuIcon, { color: colors.live }]}>🚪</Text>
              <Text style={[styles.accountMenuLabel, { color: colors.live, fontWeight: "800" }]}>
                Sign Out
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Main Studio Shell Container */}
      <View style={styles.shell}>
        {/* 2. COLLAPSIBLE RESPONSIVE NAVIGATION SIDEBAR (UX-CONV-01C) */}
        {desktop && (
          <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
            {/* Pinned Workspaces (UX-CONV-01M) */}
            {!sidebarCollapsed && pinnedPaths.length > 0 && (
              <View style={styles.pinnedSection}>
                <Text style={styles.pinnedTitle}>★ PINNED WORKSPACES</Text>
                {pinnedPaths.map((path) => (
                  <Pressable
                    key={path}
                    style={[styles.pinnedItem, active(path) && styles.navItemActive]}
                    onPress={() => router.push(path as never)}
                  >
                    <Text style={styles.pinnedItemText} numberOfLines={1}>
                      {path.replace("/studio/", "").replace("-", " ").toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* 7-Domain Grouped Navigation Scroll */}
            <ScrollView contentContainerStyle={styles.navScroll} showsVerticalScrollIndicator={false}>
              {STUDIO_DOMAINS.map((domain) => {
                const isExecutiveRole =
                  (snapshot?.role ?? "").toLowerCase().includes("owner") ||
                  (snapshot?.role ?? "").toLowerCase().includes("publisher") ||
                  (snapshot?.role ?? "").toLowerCase().includes("admin");

                const domainAllowed =
                  domain.key === "my-work" ||
                  isExecutiveRole ||
                  !domain.requiredCapabilities ||
                  (snapshot ? hasAnyServerCapability(snapshot, domain.requiredCapabilities) : false);

                if (sidebarCollapsed) {
                  return (
                    <Pressable
                      key={domain.key}
                      style={styles.collapsedIconBtn}
                      onPress={() => {
                        const firstItem = domain.items[0];
                        if (firstItem) router.push(firstItem.path as never);
                      }}
                      accessibilityLabel={domain.title}
                    >
                      <Text style={styles.collapsedDomainIcon}>{domain.icon}</Text>
                    </Pressable>
                  );
                }

                return (
                  <View key={domain.key} style={styles.domainSection}>
                    <View style={styles.domainHeader}>
                      <Text style={styles.domainIcon}>{domain.icon}</Text>
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
            {!sidebarCollapsed && (
              <View style={styles.securityPanel}>
                <Text style={styles.securityLabel}>STAGING RUNTIME · AG-06 BOUNDED</Text>
                <Text style={styles.security}>
                  Authority: AG-06 server roles only · Zero client-side role simulation.
                </Text>
              </View>
            )}

            {/* Collapse / Expand Toggle Button at Bottom of Sidebar */}
            <Pressable
              style={styles.collapseToggleBtn}
              onPress={toggleSidebar}
              accessibilityRole="button"
              accessibilityLabel={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Text style={styles.collapseToggleText}>
                {sidebarCollapsed ? "▶" : "◀ Collapse Sidebar"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* 3. MAIN WORKSPACE WITH BREADCRUMBS LAYER */}
        <ScrollView style={styles.workspace} contentContainerStyle={styles.workspaceContent}>
          {/* Breadcrumb Navigation Bar (UX-CONV-01G) */}
          <View style={styles.breadcrumbBar}>
            <View style={styles.breadcrumbTrail}>
              {resolvedBreadcrumbs.map((crumb, idx) => {
                const isLast = idx === resolvedBreadcrumbs.length - 1;
                return (
                  <View key={crumb.label + idx} style={styles.breadcrumbSegment}>
                    {idx > 0 && <Text style={styles.breadcrumbSep}>/</Text>}
                    {crumb.path && !isLast ? (
                      <Pressable onPress={() => router.push(crumb.path as never)}>
                        <Text style={styles.breadcrumbLink}>{crumb.label}</Text>
                      </Pressable>
                    ) : (
                      <Text style={[styles.breadcrumbText, isLast && styles.breadcrumbActive]}>
                        {crumb.label}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Optional Header Actions */}
            {actions && <View style={styles.headerActionsStrip}>{actions}</View>}
          </View>

          {/* Workspace Body */}
          <View style={styles.content}>
            <View style={styles.pageHeaderBox}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {subtitle ??
                  "Operational workspace. Production metrics, permissions, and publishing authority appear only from certified services."}
              </Text>
            </View>

            {children}
          </View>
        </ScrollView>
      </View>

      {/* 4. MOBILE OFF-CANVAS NAVIGATION DRAWER (UX-CONV-01C) */}
      <Modal visible={isMobileDrawerOpen} transparent animationType="fade">
        <View style={styles.drawerBackdrop}>
          <Pressable
            style={styles.drawerBackdropPress}
            onPress={() => setMobileDrawerOpen(false)}
          />
          <View style={styles.drawerSheet}>
            <View style={styles.drawerHeader}>
              <HealthTimesBrand inverse compact studio />
              <Pressable onPress={() => setMobileDrawerOpen(false)}>
                <Text style={styles.drawerCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.drawerNavScroll}>
              {STUDIO_DOMAINS.map((domain) => (
                <View key={domain.key} style={styles.drawerDomainGroup}>
                  <Text style={styles.drawerDomainTitle}>
                    {domain.icon} {domain.shortTitle.toUpperCase()}
                  </Text>
                  {domain.items.map((item) => (
                    <Pressable
                      key={item.path}
                      style={[styles.drawerNavItem, active(item.path) && styles.drawerNavItemActive]}
                      onPress={() => {
                        setMobileDrawerOpen(false);
                        router.push(item.path as never);
                      }}
                    >
                      <Text
                        style={[
                          styles.drawerNavText,
                          active(item.path) && styles.drawerNavTextActive
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. COMMAND PALETTE MODAL (UX-CONV-01I) */}
      <Modal visible={isCommandPaletteOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.commandPaletteBox}>
            <View style={styles.commandSearchRow}>
              <Text style={styles.commandSearchIcon}>🔍</Text>
              <TextInput
                style={styles.commandSearchInput}
                placeholder="Type a command or search workspace... (Esc to close)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <Pressable onPress={() => setCommandPaletteOpen(false)}>
                <Text style={styles.commandCloseText}>Esc</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.commandResultsScroll}>
              <Text style={styles.commandSectionHeader}>QUICK ACTIONS & NAVIGATION</Text>
              {commandPaletteItems.map((item) => (
                <Pressable
                  key={item.path + item.label}
                  style={styles.commandResultItem}
                  onPress={() => {
                    setCommandPaletteOpen(false);
                    setSearchQuery("");
                    router.push(item.path as never);
                  }}
                >
                  <View style={styles.commandItemInfo}>
                    <Text style={styles.commandItemTitle}>{item.label}</Text>
                    <Text style={styles.commandItemCategory}>{item.category}</Text>
                  </View>
                  <Text style={styles.commandJumpText}>Jump →</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. QUICK CREATE MODAL (UX-CONV-01J) */}
      <Modal visible={isQuickCreateOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.quickCreateBox}>
            <View style={styles.quickCreateHeader}>
              <Text style={styles.quickCreateTitle}>+ Quick Create</Text>
              <Pressable onPress={() => setQuickCreateOpen(false)}>
                <Text style={styles.quickCreateClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.quickCreateSub}>Select a record to initiate in HealthTimes Studio.</Text>

            <View style={styles.quickCreateGrid}>
              {quickCreateOptions.map((opt) => (
                <Pressable
                  key={opt.path}
                  style={styles.quickCreateOptionCard}
                  onPress={() => {
                    setQuickCreateOpen(false);
                    router.push(opt.path as never);
                  }}
                >
                  <Text style={styles.quickCreateOptionIcon}>{opt.icon}</Text>
                  <Text style={styles.quickCreateOptionLabel}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. NOTIFICATION CENTRE DRAWER (UX-CONV-01K) */}
      <Modal visible={isNotificationsOpen} transparent animationType="fade">
        <View style={styles.modalBackdropRight}>
          <Pressable
            style={styles.modalBackdropPress}
            onPress={() => setNotificationsOpen(false)}
          />
          <View style={styles.notificationDrawerSheet}>
            <View style={styles.notificationHeader}>
              <View>
                <Text style={styles.notificationDrawerTitle}>Operational Notifications</Text>
                <Text style={styles.notificationDrawerSub}>Newsroom pipeline & critical alerts</Text>
              </View>
              <Pressable onPress={() => setNotificationsOpen(false)}>
                <Text style={styles.notificationClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.notificationListScroll}>
              {inbox.error ? (
                <View style={styles.notificationEmptyBox}>
                  <Text style={styles.notificationEmptyTitle}>Notification service unavailable</Text>
                  <Text style={styles.notificationEmptySub}>
                    Unable to retrieve operational notifications from server.
                  </Text>
                </View>
              ) : notificationItems.length === 0 ? (
                <View style={styles.notificationEmptyBox}>
                  <Text style={styles.notificationEmptyTitle}>No unread notifications</Text>
                  <Text style={styles.notificationEmptySub}>
                    Your operational newsroom inbox is clear.
                  </Text>
                </View>
              ) : (
                notificationItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.notificationCard}
                    onPress={() => {
                      setNotificationsOpen(false);
                      router.push("/studio/inbox" as never);
                    }}
                  >
                    <View style={styles.notificationPillRow}>
                      <Text style={styles.notifPillBlue}>{item.category.toUpperCase()}</Text>
                      <Text style={styles.notifTime}>{item.priority.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.notifTitle}>{item.eventType}</Text>
                    <Text style={styles.notifDesc}>
                      {item.readAt ? "Read" : "Unread"} · Registered newsroom event
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  const allowed = snapshot?.status === "authorized" && snapshot.source === "server";
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
  safe: { flex: 1, backgroundColor: "#0E1A24" },
  topUtilityBar: {
    height: 56,
    backgroundColor: "#0E1A24",
    borderBottomWidth: 1,
    borderBottomColor: "#1F3243",
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    zIndex: 100
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  menuIconBtn: { padding: 6 },
  menuIconText: { fontSize: 20, color: "#FFFFFF" },
  topBrandPressable: { flexDirection: "row", alignItems: "center" },
  envIndicatorBadge: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  envIndicatorText: { fontSize: 9, fontWeight: "900", color: "#92400E", letterSpacing: 0.8 },
  searchBarTrigger: {
    flex: 1,
    maxWidth: 420,
    height: 36,
    backgroundColor: "#162837",
    borderWidth: 1,
    borderColor: "#243E54",
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.sm
  },
  searchIcon: { fontSize: 13 },
  searchPlaceholder: { fontSize: 12, color: "#8FA2B5", flex: 1 },
  kbdKey: {
    backgroundColor: "#1F384C",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  kbdText: { fontSize: 10, fontWeight: "700", color: "#A7BDCE" },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  quickCreateBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  quickCreateText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  notificationBellBtn: { position: "relative", padding: 6 },
  bellIcon: { fontSize: 16 },
  notificationBadgeDot: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: colors.live,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  notificationBadgeText: { fontSize: 9, fontWeight: "900", color: "#FFFFFF" },
  densityToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#243E54",
    backgroundColor: "#162837"
  },
  densityToggleText: { fontSize: 11, fontWeight: "700", color: "#A7BDCE" },
  userProfileTrigger: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: 4 },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#70D1D1",
    alignItems: "center",
    justifyContent: "center"
  },
  userAvatarText: { fontSize: 12, fontWeight: "900", color: "#0E1A24" },
  userMeta: { gap: 1 },
  userNameText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF", maxWidth: 140 },
  userRoleText: { fontSize: 10, color: "#8FA2B5", maxWidth: 140 },
  caretIcon: { fontSize: 11, color: "#8FA2B5" },
  accountMenuPopover: {
    position: "absolute",
    top: 58,
    right: 16,
    width: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 200
  },
  accountMenuHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    gap: 3
  },
  accountMenuName: { fontSize: 15, fontWeight: "900", color: colors.ink },
  accountMenuEmail: { fontSize: 12, color: colors.inkMuted },
  accountBadgeRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  accountRoleBadge: {
    backgroundColor: "#102A3F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  accountRoleBadgeText: { fontSize: 9, fontWeight: "900", color: "#70D1D1" },
  accountDeskBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  accountDeskBadgeText: { fontSize: 9, fontWeight: "800", color: colors.ink },
  accountMenuList: { gap: 2 },
  accountMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.sm
  },
  accountMenuIcon: { fontSize: 14 },
  accountMenuLabel: { fontSize: 13, fontWeight: "700", color: colors.ink },
  accountMenuDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  shell: { flex: 1, flexDirection: "row", backgroundColor: colors.paperMuted },
  sidebar: {
    width: 260,
    backgroundColor: "#0E1A24",
    borderRightWidth: 1,
    borderRightColor: "#1F3243",
    padding: spacing.md,
    justifyContent: "space-between"
  },
  sidebarCollapsed: { display: "none" },
  pinnedSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#1F3243",
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    gap: 4
  },
  pinnedTitle: { fontSize: 9, fontWeight: "900", letterSpacing: 1, color: "#FBBC04" },
  pinnedItem: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: radius.sm },
  pinnedItemText: { fontSize: 11, fontWeight: "800", color: "#D5DFE8" },
  collapsedIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4
  },
  collapsedDomainIcon: { fontSize: 18, color: "#70D1D1" },
  navScroll: { paddingVertical: spacing.xs, gap: spacing.md },
  domainSection: { gap: 3 },
  domainHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    marginBottom: 2
  },
  domainIcon: { fontSize: 11, color: "#70D1D1" },
  domainTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: "#70D1D1", flex: 1 },
  domainTitleLocked: { color: "#546A7D" },
  domainLockedBadge: {
    fontSize: 8,
    fontWeight: "900",
    color: "#546A7D",
    backgroundColor: "#102331",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4
  },
  domainItems: { gap: 1 },
  navItem: {
    minHeight: 30,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderLeftWidth: 2,
    borderLeftColor: "transparent"
  },
  navItemActive: { backgroundColor: "#162837", borderLeftColor: "#70D1D1" },
  navItemLocked: { opacity: 0.45 },
  navText: { fontSize: 12, fontWeight: "600", color: "#D5DFE8" },
  navTextActive: { color: "#FFFFFF", fontWeight: "800" },
  navTextLocked: { color: "#8FA2B5" },
  itemLockIcon: { fontSize: 9 },
  securityPanel: {
    borderTopWidth: 1,
    borderTopColor: "#1F3243",
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    gap: 2
  },
  securityLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8, color: "#70D1D1" },
  security: { fontSize: 9, lineHeight: 13, color: "#8FA2B5" },
  collapseToggleBtn: {
    borderTopWidth: 1,
    borderTopColor: "#1F3243",
    paddingTop: spacing.sm,
    paddingVertical: 6,
    alignItems: "center"
  },
  collapseToggleText: { fontSize: 11, fontWeight: "800", color: "#8FA2B5" },
  workspace: { flex: 1, backgroundColor: colors.paperMuted },
  workspaceContent: { minHeight: "100%" },
  breadcrumbBar: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  breadcrumbTrail: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  breadcrumbSegment: { flexDirection: "row", alignItems: "center" },
  breadcrumbSep: { marginHorizontal: 6, fontSize: 12, color: colors.inkMuted },
  breadcrumbLink: { fontSize: 12, fontWeight: "700", color: colors.blue },
  breadcrumbText: { fontSize: 12, color: colors.inkMuted },
  breadcrumbActive: { fontWeight: "800", color: colors.ink },
  headerActionsStrip: { flexDirection: "row", gap: spacing.sm },
  content: { width: "100%", maxWidth: 1400, alignSelf: "center", padding: spacing.xl },
  pageHeaderBox: { marginBottom: spacing.lg },
  title: { fontSize: 26, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 20, color: colors.inkMuted, maxWidth: 760, marginTop: 4 },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", flexDirection: "row" },
  drawerBackdropPress: { flex: 1 },
  drawerSheet: {
    width: 300,
    backgroundColor: "#0E1A24",
    padding: spacing.lg,
    gap: spacing.lg
  },
  drawerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  drawerCloseText: { fontSize: 18, color: "#FFFFFF", padding: 4 },
  drawerNavScroll: { gap: spacing.lg },
  drawerDomainGroup: { gap: 6 },
  drawerDomainTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: "#70D1D1" },
  drawerNavItem: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.sm },
  drawerNavItemActive: { backgroundColor: "#162837" },
  drawerNavText: { fontSize: 13, fontWeight: "700", color: "#D5DFE8" },
  drawerNavTextActive: { color: "#FFFFFF", fontWeight: "900" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  commandPaletteBox: {
    width: "100%",
    maxWidth: 580,
    maxHeight: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  commandSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm
  },
  commandSearchIcon: { fontSize: 16 },
  commandSearchInput: { flex: 1, fontSize: 15, color: colors.ink, outlineStyle: "none" } as any,
  commandCloseText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.inkMuted,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  commandResultsScroll: { padding: spacing.md },
  commandSectionHeader: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: colors.inkMuted,
    marginBottom: spacing.xs
  },
  commandResultItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm
  },
  commandItemInfo: { gap: 2 },
  commandItemTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  commandItemCategory: { fontSize: 11, color: colors.inkMuted },
  commandJumpText: { fontSize: 12, fontWeight: "800", color: colors.blue },
  quickCreateBox: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  quickCreateHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quickCreateTitle: { fontSize: 18, fontWeight: "900", color: colors.ink },
  quickCreateClose: { fontSize: 16, color: colors.inkMuted, padding: 4 },
  quickCreateSub: { fontSize: 13, color: colors.inkMuted, marginTop: -6 },
  quickCreateGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  quickCreateOptionCard: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  quickCreateOptionIcon: { fontSize: 16 },
  quickCreateOptionLabel: { fontSize: 12, fontWeight: "800", color: colors.ink },
  modalBackdropRight: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", flexDirection: "row" },
  modalBackdropPress: { flex: 1 },
  notificationDrawerSheet: {
    width: 360,
    backgroundColor: "#FFFFFF",
    padding: spacing.xl,
    gap: spacing.lg
  },
  notificationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  notificationDrawerTitle: { fontSize: 16, fontWeight: "900", color: colors.ink },
  notificationDrawerSub: { fontSize: 12, color: colors.inkMuted },
  notificationClose: { fontSize: 16, color: colors.inkMuted, padding: 4 },
  notificationListScroll: { gap: spacing.md },
  notificationCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: 4,
    marginBottom: spacing.sm
  },
  notificationPillRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  notifPillRed: { fontSize: 9, fontWeight: "900", color: "#C5221F", letterSpacing: 0.8 },
  notifPillAmber: { fontSize: 9, fontWeight: "900", color: "#B06000", letterSpacing: 0.8 },
  notifPillBlue: { fontSize: 9, fontWeight: "900", color: colors.blue, letterSpacing: 0.8 },
  notifPillGreen: { fontSize: 9, fontWeight: "900", color: "#137333", letterSpacing: 0.8 },
  notifTime: { fontSize: 10, color: colors.inkMuted },
  notifTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  notifDesc: { fontSize: 11, color: colors.inkMuted },
  notificationEmptyBox: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md
  },
  notificationEmptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 4
  },
  notificationEmptySub: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: "center"
  },
  placeholder: {
    marginTop: spacing.xl,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    borderRadius: radius.md
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    flexWrap: "wrap"
  },
  placeholderOwner: { fontSize: 11, fontWeight: "900", color: colors.blue, letterSpacing: 1 },
  integrationBadge: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: colors.inkMuted },
  placeholderText: { fontSize: 18, lineHeight: 25, fontWeight: "800", color: colors.ink, maxWidth: 760 },
  placeholderState: { fontSize: 13, lineHeight: 20, color: colors.inkMuted },
  accessGate: {
    marginTop: spacing.xl,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.live,
    padding: spacing.xl,
    gap: spacing.sm,
    borderRadius: radius.md
  },
  accessGateEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: colors.live },
  accessGateTitle: { fontSize: 20, fontWeight: "900", color: colors.ink },
  capabilityRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  capabilityLabel: { fontSize: 11, fontWeight: "800", color: colors.inkMuted },
  capabilityValue: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.ink,
    backgroundColor: colors.paperMuted,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  accessGateText: { fontSize: 14, lineHeight: 21, color: colors.inkMuted, maxWidth: 760 }
});
