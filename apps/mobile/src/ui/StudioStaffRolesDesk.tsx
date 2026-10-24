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
  NewsroomStaffMember,
  NewsroomStaffInvitation,
  NewsroomRole,
  NewsroomCapability,
  NewsroomAuditRecord,
  NewsroomStaffOperationsDirectory,
  NewsroomStaffInviteInput
} from "../domain/models";
import {
  canManageStaff,
  hasStaffDeskAccess,
  type AuthorizationSnapshot
} from "../security/capabilities";
import { services } from "../services";
import { breakpoints, colors, radius, spacing } from "../theme/tokens";

export type StaffDeskTab = "directory" | "roles" | "invitations" | "audit";

export interface StudioStaffRolesDeskViewProps {
  directory: NewsroomStaffOperationsDirectory | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  activeTab: StaffDeskTab;
  onChangeTab: (tab: StaffDeskTab) => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  statusFilter: string;
  onChangeStatusFilter: (status: string) => void;
  onChangeRole: (staffId: string, roleName: string) => Promise<void>;
  onUpdateStatus: (
    staffId: string,
    status: "active" | "suspended" | "revoked" | "deactivated"
  ) => Promise<void>;
  onRevokeSessions: (staffId: string) => Promise<void>;
  onInviteStaff: (input: NewsroomStaffInviteInput) => Promise<void>;
  onCancelInvite: (invitationId: string) => Promise<void>;
  canManage: boolean;
  actionMessage: string | null;
  isMutating: boolean;
  isOwnerPreview?: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#DCFCE7", text: "#166534" },
  suspended: { bg: "#FEF3C7", text: "#92400E" },
  revoked: { bg: "#FEE2E2", text: "#991B1B" },
  deactivated: { bg: "#F3F4F6", text: "#4B5563" },
  invited: { bg: "#E0F2FE", text: "#075985" },
  pending: { bg: "#FEF3C7", text: "#92400E" },
  sent: { bg: "#E0F2FE", text: "#075985" }
};

export type CapabilityDomainKey = "editorial" | "commercial" | "finance" | "audience" | "executive_admin";

export const CAPABILITY_DOMAINS_ORDER: CapabilityDomainKey[] = [
  "editorial",
  "commercial",
  "finance",
  "audience",
  "executive_admin"
];

export const CAPABILITY_DOMAIN_META: Record<CapabilityDomainKey, { title: string; subtitle: string }> = {
  editorial: {
    title: "1. Editorial Domain",
    subtitle: "Story authoring, review queue gates, copy-editing, assignments, clinical fact-checking, and newsroom desks."
  },
  commercial: {
    title: "2. Commercial Domain",
    subtitle: "Advertising campaign approvals, direct booking orders, subscriber management, and premium content entitlements."
  },
  finance: {
    title: "3. Finance & Accounting Domain",
    subtitle: "Double-entry general ledger, commercial invoicing, payment receipts, expense approvals, and GAAP financial statements."
  },
  audience: {
    title: "4. Audience & Marketing Domain",
    subtitle: "Multi-channel distribution across Social (X/Bluesky), WhatsApp broadcasts, push alerts, and contact segments."
  },
  executive_admin: {
    title: "5. Executive & Admin Domain",
    subtitle: "RBAC staff governance, active session revocation, security audits, platform settings, and KPI intelligence."
  }
};

export function resolveCapabilityDomain(cap: NewsroomCapability): CapabilityDomainKey {
  const k = cap.key.toLowerCase();
  const prefix = k.split(".")[0] ?? "";
  if (prefix === "finance") return "finance";
  if (prefix === "ads" || prefix === "commercial" || prefix === "subscriber" || prefix === "premium") return "commercial";
  if (prefix === "social" || prefix === "marketing" || prefix === "distribution") return "audience";
  if (prefix === "staff" || prefix === "security" || prefix === "settings" || prefix === "analytics") return "executive_admin";
  return "editorial"; // story, assignment, media, comment, communication, communications
}

const CATEGORY_LABELS: Record<string, string> = {
  editorial: "Editorial",
  distribution: "Distribution",
  commercial: "Commercial",
  audit: "Audit & Security",
  staff_admin: "Staff & Admin"
};

function formatIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return "—";
  }
}

export function StudioStaffRolesDeskView({
  directory,
  isLoading,
  error,
  onRefresh,
  activeTab,
  onChangeTab,
  searchQuery,
  onChangeSearchQuery,
  statusFilter,
  onChangeStatusFilter,
  onChangeRole,
  onUpdateStatus,
  onRevokeSessions,
  onInviteStaff,
  onCancelInvite,
  canManage,
  actionMessage,
  isMutating,
  isOwnerPreview = false
}: StudioStaffRolesDeskViewProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.tablet;

  // Local state for role assignment picker
  const [selectedStaffForRole, setSelectedStaffForRole] = useState<string | null>(null);
  const [targetRoleName, setTargetRoleName] = useState<string>("");

  // Local state for invite modal/form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("Reporter / Journalist");
  const [inviteDesk, setInviteDesk] = useState("");
  const [inviteCountry, setInviteCountry] = useState("Zimbabwe");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Filtered staff members
  const filteredStaff = useMemo(() => {
    if (!directory?.staff) return [];
    return directory.staff.filter((member) => {
      const matchesStatus =
        statusFilter === "all" ||
        member.status.toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        member.displayName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.roleName.toLowerCase().includes(q) ||
        member.handle.toLowerCase().includes(q) ||
        (member.desk && member.desk.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [directory?.staff, statusFilter, searchQuery]);

  // Grouped capabilities by the 5 Core Newsroom Domains
  const domainGroupedCapabilities = useMemo(() => {
    const groups: Record<CapabilityDomainKey, NewsroomCapability[]> = {
      editorial: [],
      commercial: [],
      finance: [],
      audience: [],
      executive_admin: []
    };
    if (!directory?.capabilities) return groups;
    for (const cap of directory.capabilities) {
      const domain = resolveCapabilityDomain(cap);
      groups[domain].push(cap);
    }
    return groups;
  }, [directory?.capabilities]);

  const handleSendInvite = async () => {
    setInviteError(null);
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setInviteError("A valid email address is required.");
      return;
    }
    if (!inviteName.trim()) {
      setInviteError("A display name is required.");
      return;
    }
    try {
      await onInviteStaff({
        email: inviteEmail.trim(),
        displayName: inviteName.trim(),
        roleName: inviteRole,
        desk: inviteDesk.trim() || null,
        country: inviteCountry.trim() || null
      });
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteName("");
      setInviteDesk("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Staff & Roles Administration</Text>
          <Text style={styles.headerSubtitle}>
            Authoritative directory, role collections, capability assignments, and security lifecycle.
          </Text>
        </View>
        <View style={styles.headerBadges}>
          <View
            style={[
              styles.rbacBadge,
              canManage ? styles.rbacBadgeManager : styles.rbacBadgeReadOnly
            ]}
          >
            <Text
              style={[
                styles.rbacBadgeText,
                canManage ? styles.rbacBadgeTextManager : styles.rbacBadgeTextReadOnly
              ]}
            >
              {isOwnerPreview
                ? canManage
                  ? "Governance Authority (Simulated)"
                  : "Directory Viewer (Read-Only)"
                : canManage
                  ? "Full Authority (staff.manage)"
                  : "Read-Only (staff.view)"}
            </Text>
          </View>
          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
            disabled={isLoading}
          >
            <Text style={styles.refreshBtnText}>
              {isLoading ? "Refreshing..." : "Refresh"}
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
          testID="staff-roles-preview-banner"
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E" }}>
            ℹ️ Sample Staff Directory & RBAC Simulation (Owner Preview): Role assignments, account suspensions, session revocations, and invitations below update local Preview memory only. They do not alter real `/studio` authentication or send live invitation emails.
          </Text>
        </View>
      )}

      {/* Global alert messages */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {actionMessage && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{actionMessage}</Text>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => onChangeTab("directory")}
          style={[styles.tabBtn, activeTab === "directory" && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "directory" && styles.tabBtnTextActive
            ]}
          >
            Directory ({directory?.staff?.length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeTab("roles")}
          style={[styles.tabBtn, activeTab === "roles" && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "roles" && styles.tabBtnTextActive
            ]}
          >
            Roles & Capabilities ({directory?.roles?.length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeTab("invitations")}
          style={[styles.tabBtn, activeTab === "invitations" && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "invitations" && styles.tabBtnTextActive
            ]}
          >
            Invitations ({directory?.invitations?.length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeTab("audit")}
          style={[styles.tabBtn, activeTab === "audit" && styles.tabBtnActive]}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "audit" && styles.tabBtnTextActive
            ]}
          >
            Security Audit ({directory?.auditHistory?.length ?? 0})
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
        {/* TAB 1: DIRECTORY */}
        {activeTab === "directory" && (
          <View style={styles.tabPane}>
            {/* Search and Filters */}
            <View style={[styles.filterBar, isDesktop && styles.filterBarDesktop]}>
              <View style={styles.searchInputWrap}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search staff by name, email, role, or desk..."
                  placeholderTextColor={colors.inkMuted}
                  value={searchQuery}
                  onChangeText={onChangeSearchQuery}
                />
              </View>
              <View style={styles.statusFilters}>
                {["all", "active", "suspended", "revoked"].map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => onChangeStatusFilter(st)}
                    style={[
                      styles.filterChip,
                      statusFilter === st && styles.filterChipActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === st && styles.filterChipTextActive
                      ]}
                    >
                      {st.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Staff list cards */}
            {filteredStaff.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No staff members found</Text>
                <Text style={styles.emptyDesc}>
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search query or status filter."
                    : "No staff profiles have been enrolled or retrieved from the server."}
                </Text>
              </View>
            ) : (
              filteredStaff.map((member) => {
                const sc = STATUS_COLORS[member.status.toLowerCase()] ?? {
                  bg: "#F3F4F6",
                  text: "#4B5563"
                };
                const isSelectedForRole = selectedStaffForRole === member.id;

                return (
                  <View key={member.id} style={styles.staffCard}>
                    <View style={styles.staffCardHeader}>
                      <View style={styles.staffMainInfo}>
                        <View style={styles.staffNameRow}>
                          <Text style={styles.staffName}>{member.displayName}</Text>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: sc.bg }
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                { color: sc.text }
                              ]}
                            >
                              {member.status.toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{member.roleName}</Text>
                          </View>
                        </View>
                        <Text style={styles.staffEmail}>
                          {member.email} · @{member.handle}
                          {member.desk ? ` · Desk: ${member.desk}` : ""}
                          {member.country ? ` · ${member.country}` : ""}
                        </Text>
                      </View>
                      <View style={styles.sessionPill}>
                        <Text style={styles.sessionPillText}>
                          {member.activeSessionsCount} active{" "}
                          {member.activeSessionsCount === 1 ? "session" : "sessions"}
                        </Text>
                      </View>
                    </View>

                    {/* Metadata & Capabilities */}
                    <View style={styles.staffMetaRow}>
                      <Text style={styles.metaLabel}>
                        MFA:{" "}
                        <Text style={styles.metaValue}>
                          {member.mfaRequired ? "Enforced" : "Optional"}
                        </Text>
                      </Text>
                      <Text style={styles.metaLabel}>
                        Joined:{" "}
                        <Text style={styles.metaValue}>
                          {formatIso(member.createdAt).slice(0, 10)}
                        </Text>
                      </Text>
                      <Text style={styles.metaLabel}>
                        Capabilities:{" "}
                        <Text style={styles.metaValue}>
                          {member.capabilities.length} granted
                        </Text>
                      </Text>
                    </View>

                    {/* Capability Tags preview */}
                    {member.capabilities.length > 0 && (
                      <View style={styles.capsRow}>
                        {member.capabilities.slice(0, 8).map((cap) => (
                          <View key={cap} style={styles.capTag}>
                            <Text style={styles.capTagText}>{cap}</Text>
                          </View>
                        ))}
                        {member.capabilities.length > 8 && (
                          <View style={styles.capTagMore}>
                            <Text style={styles.capTagMoreText}>
                              +{member.capabilities.length - 8} more
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Actions bar (enabled if canManage) */}
                    {canManage ? (
                      <View style={styles.actionsBar}>
                        {!isSelectedForRole ? (
                          <Pressable
                            onPress={() => {
                              setSelectedStaffForRole(member.id);
                              setTargetRoleName(member.roleName);
                            }}
                            style={styles.actionBtnOutline}
                            disabled={isMutating}
                          >
                            <Text style={styles.actionBtnOutlineText}>
                              Change Role
                            </Text>
                          </Pressable>
                        ) : (
                          <View style={styles.rolePickerBox}>
                            <Text style={styles.rolePickerTitle}>
                              Assign new role:
                            </Text>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              style={styles.rolesScroll}
                            >
                              {(directory?.roles ?? []).map((r) => (
                                <Pressable
                                  key={r.id}
                                  onPress={() => setTargetRoleName(r.name)}
                                  style={[
                                    styles.roleOptionChip,
                                    targetRoleName === r.name &&
                                      styles.roleOptionChipActive
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.roleOptionChipText,
                                      targetRoleName === r.name &&
                                        styles.roleOptionChipTextActive
                                    ]}
                                  >
                                    {r.name}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                            <View style={styles.rolePickerActions}>
                              <Pressable
                                onPress={async () => {
                                  if (targetRoleName && targetRoleName !== member.roleName) {
                                    await onChangeRole(member.id, targetRoleName);
                                  }
                                  setSelectedStaffForRole(null);
                                }}
                                style={styles.actionBtnPrimary}
                                disabled={isMutating || targetRoleName === member.roleName}
                              >
                                <Text style={styles.actionBtnPrimaryText}>
                                  Confirm Role
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => setSelectedStaffForRole(null)}
                                style={styles.actionBtnCancel}
                              >
                                <Text style={styles.actionBtnCancelText}>Cancel</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}

                        {member.status.toLowerCase() === "active" ? (
                          <Pressable
                            onPress={() => onUpdateStatus(member.id, "suspended")}
                            style={styles.actionBtnWarning}
                            disabled={isMutating}
                          >
                            <Text style={styles.actionBtnWarningText}>
                              Suspend Access
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            onPress={() => onUpdateStatus(member.id, "active")}
                            style={styles.actionBtnSuccess}
                            disabled={isMutating}
                          >
                            <Text style={styles.actionBtnSuccessText}>
                              Activate Staff
                            </Text>
                          </Pressable>
                        )}

                        <Pressable
                          onPress={() => onRevokeSessions(member.id)}
                          style={styles.actionBtnDanger}
                          disabled={isMutating}
                        >
                          <Text style={styles.actionBtnDangerText}>
                            Revoke Sessions
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.readOnlyNotice}>
                        <Text style={styles.readOnlyNoticeText}>
                          Read-Only · staff.manage capability required to reassign roles or modify status.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: ROLES & CAPABILITIES */}
        {activeTab === "roles" && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionHeader}>Newsroom Role Catalogue</Text>
            <Text style={styles.sectionSub}>
              Configured roles and their granted capability collections.
            </Text>

            <View style={styles.rolesGrid}>
              {(directory?.roles ?? []).map((role) => (
                <View key={role.id} style={styles.roleCard}>
                  <View style={styles.roleCardTop}>
                    <Text style={styles.roleCardName}>{role.name}</Text>
                    <View style={styles.capsCountBadge}>
                      <Text style={styles.capsCountBadgeText}>
                        {role.capabilities.length} capabilities
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.roleCardDesc}>
                    {role.description ?? "Standard newsroom role."}
                  </Text>
                  <View style={styles.roleCapsWrap}>
                    {role.capabilities.map((c) => (
                      <View key={c} style={styles.roleCapChip}>
                        <Text style={styles.roleCapChipText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionHeader}>Master Capability Matrix (74 Operations · 5 Domains)</Text>
            <Text style={styles.sectionSub}>
              Fine-grained privileges governing newsroom operations partitioned cleanly across the 5 core operating domains.
            </Text>

            {CAPABILITY_DOMAINS_ORDER.map((domainKey) => {
              const caps = domainGroupedCapabilities[domainKey];
              const meta = CAPABILITY_DOMAIN_META[domainKey];
              return (
                <View key={domainKey} style={styles.categoryBlock}>
                  <View style={{ marginBottom: spacing.xs }}>
                    <Text style={styles.categoryTitle}>
                      {meta.title} ({caps.length} capabilities)
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.inkMuted, marginTop: 2 }}>{meta.subtitle}</Text>
                  </View>
                  <View style={styles.capsList}>
                    {caps.map((cap) => (
                      <View key={cap.key} style={styles.capItem}>
                        <Text style={styles.capKey}>{cap.key}</Text>
                        <Text style={styles.capDesc}>{cap.description}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 3: INVITATIONS */}
        {activeTab === "invitations" && (
          <View style={styles.tabPane}>
            <View style={styles.inviteHeaderRow}>
              <View>
                <Text style={styles.sectionHeader}>Newsroom Invitations</Text>
                <Text style={styles.sectionSub}>
                  Pending and open invitations to join HealthTimes Newsroom.
                </Text>
              </View>
              {canManage && (
                <Pressable
                  onPress={() => setShowInviteForm(!showInviteForm)}
                  style={styles.actionBtnPrimary}
                >
                  <Text style={styles.actionBtnPrimaryText}>
                    {showInviteForm ? "Close Form" : "+ Invite Staff"}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Invite Form */}
            {showInviteForm && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Invite New Staff Member</Text>
                {inviteError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{inviteError}</Text>
                  </View>
                )}

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. journalist@healthtimes.co.zw"
                    placeholderTextColor={colors.inkMuted}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Full Name / Display Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Rudo Moyo"
                    placeholderTextColor={colors.inkMuted}
                    value={inviteName}
                    onChangeText={setInviteName}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Assigned Newsroom Role *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.rolesScroll}
                  >
                    {[
                      "Reporter / Journalist",
                      "Section Editor",
                      "Copy Editor",
                      "Managing Editor",
                      "Editor-in-Chief",
                      "Contributor",
                      "Commercial Manager",
                      "Publisher / Owner"
                    ].map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => setInviteRole(r)}
                        style={[
                          styles.roleOptionChip,
                          inviteRole === r && styles.roleOptionChipActive
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleOptionChipText,
                            inviteRole === r && styles.roleOptionChipTextActive
                          ]}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formField, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Desk (Optional)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Investigation, Public Health"
                      placeholderTextColor={colors.inkMuted}
                      value={inviteDesk}
                      onChangeText={setInviteDesk}
                    />
                  </View>
                  <View style={[styles.formField, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Country</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Zimbabwe"
                      placeholderTextColor={colors.inkMuted}
                      value={inviteCountry}
                      onChangeText={setInviteCountry}
                    />
                  </View>
                </View>

                <View style={styles.formActions}>
                  <Pressable
                    onPress={handleSendInvite}
                    style={styles.actionBtnPrimary}
                    disabled={isMutating}
                  >
                    <Text style={styles.actionBtnPrimaryText}>
                      {isMutating ? "Sending..." : "Create & Send Invitation"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowInviteForm(false)}
                    style={styles.actionBtnCancel}
                  >
                    <Text style={styles.actionBtnCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* List invitations */}
            {(directory?.invitations ?? []).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending invitations</Text>
                <Text style={styles.emptyDesc}>
                  All staff invitations have either been accepted, expired, or none are currently open.
                </Text>
              </View>
            ) : (
              (directory?.invitations ?? []).map((inv) => (
                <View key={inv.id} style={styles.invitationCard}>
                  <View style={styles.invitationMain}>
                    <View style={styles.staffNameRow}>
                      <Text style={styles.staffName}>{inv.displayName}</Text>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{inv.roleName}</Text>
                      </View>
                      <View style={styles.badgePending}>
                        <Text style={styles.badgePendingText}>
                          {inv.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.staffEmail}>
                      {inv.invitedEmail}
                      {inv.desk ? ` · Desk: ${inv.desk}` : ""}
                      {inv.country ? ` · ${inv.country}` : ""}
                    </Text>
                    <Text style={styles.metaLabel}>
                      Sent: {formatIso(inv.createdAt)} · Expires: {formatIso(inv.expiresAt)}
                    </Text>
                  </View>

                  {canManage && (
                    <Pressable
                      onPress={() => onCancelInvite(inv.id)}
                      style={styles.actionBtnDanger}
                      disabled={isMutating}
                    >
                      <Text style={styles.actionBtnDangerText}>Cancel</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: AUDIT HISTORY */}
        {activeTab === "audit" && (
          <View style={styles.tabPane}>
            <Text style={styles.sectionHeader}>Security & Staff Audit Trail</Text>
            <Text style={styles.sectionSub}>
              Immutable log of role updates, status changes, session revocations, and staff invitations.
            </Text>

            {(directory?.auditHistory ?? []).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No audit records logged</Text>
                <Text style={styles.emptyDesc}>
                  No staff or security administration events have been recorded in the current window.
                </Text>
              </View>
            ) : (
              <View style={styles.auditTable}>
                {(directory?.auditHistory ?? []).map((rec) => (
                  <View key={rec.id} style={styles.auditRow}>
                    <View style={styles.auditRowHeader}>
                      <View style={styles.actionPill}>
                        <Text style={styles.actionPillText}>{rec.action}</Text>
                      </View>
                      <Text style={styles.auditTime}>{formatIso(rec.createdAt)}</Text>
                    </View>
                    <Text style={styles.auditDetails}>
                      Actor:{" "}
                      <Text style={styles.metaValue}>
                        {rec.actorName ?? "System / Staff"}
                      </Text>{" "}
                      · Scope:{" "}
                      <Text style={styles.metaValue}>
                        {isOwnerPreview
                          ? rec.targetTable.replace(/_/g, " ")
                          : `${rec.targetTable} (${rec.targetId ? rec.targetId.slice(0, 8) : "—"})`}
                      </Text>
                    </Text>
                    {rec.metadata && Object.keys(rec.metadata).length > 0 && (
                      <View style={styles.metadataBox}>
                        <Text style={styles.metadataText}>
                          {isOwnerPreview
                            ? Object.entries(rec.metadata)
                                .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`)
                                .join(" · ")
                            : JSON.stringify(rec.metadata)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export function StudioStaffRolesDesk() {
  const [directory, setDirectory] = useState<NewsroomStaffOperationsDirectory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const [activeTab, setActiveTab] = useState<StaffDeskTab>("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadDirectory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await services.newsroomStaff.getStaffOperationsDirectory();
      setDirectory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const handleChangeRole = async (staffId: string, roleName: string) => {
    setIsMutating(true);
    setActionMessage(null);
    setError(null);
    try {
      await services.newsroomStaff.changeStaffRole(staffId, roleName);
      setActionMessage(`Role successfully updated to "${roleName}".`);
      await loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateStatus = async (
    staffId: string,
    status: "active" | "suspended" | "revoked" | "deactivated"
  ) => {
    setIsMutating(true);
    setActionMessage(null);
    setError(null);
    try {
      await services.newsroomStaff.updateStaffStatus(staffId, status);
      setActionMessage(`Staff status updated to "${status}".`);
      await loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleRevokeSessions = async (staffId: string) => {
    setIsMutating(true);
    setActionMessage(null);
    setError(null);
    try {
      const count = await services.newsroomStaff.revokeStaffSession(staffId);
      setActionMessage(`Revoked ${count} active session(s).`);
      await loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleInviteStaff = async (input: NewsroomStaffInviteInput) => {
    setIsMutating(true);
    setActionMessage(null);
    setError(null);
    try {
      const res = await services.newsroomStaff.createInvitation(input);
      setActionMessage(`Invitation sent to ${res.email} as ${res.role}.`);
      await loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setIsMutating(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    setIsMutating(true);
    setActionMessage(null);
    setError(null);
    try {
      await services.newsroomStaff.cancelInvitation(invitationId);
      setActionMessage("Invitation cancelled.");
      await loadDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <StudioStaffRolesDeskView
      directory={directory}
      isLoading={isLoading}
      error={error}
      onRefresh={loadDirectory}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      searchQuery={searchQuery}
      onChangeSearchQuery={setSearchQuery}
      statusFilter={statusFilter}
      onChangeStatusFilter={setStatusFilter}
      onChangeRole={handleChangeRole}
      onUpdateStatus={handleUpdateStatus}
      onRevokeSessions={handleRevokeSessions}
      onInviteStaff={handleInviteStaff}
      onCancelInvite={handleCancelInvite}
      canManage={directory?.canManageStaff ?? false}
      actionMessage={actionMessage}
      isMutating={isMutating}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB"
  },
  header: {
    padding: spacing.lg,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md
  },
  headerDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  rbacBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  rbacBadgeManager: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC"
  },
  rbacBadgeReadOnly: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB"
  },
  rbacBadgeText: {
    fontSize: 12,
    fontWeight: "700"
  },
  rbacBadgeTextManager: {
    color: "#166534"
  },
  rbacBadgeTextReadOnly: {
    color: "#4B5563"
  },
  refreshBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  pressed: {
    opacity: 0.7
  },
  errorBox: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: "#FEE2E2",
    borderRadius: radius.sm,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444"
  },
  errorText: {
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "600"
  },
  successBox: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: "#DCFCE7",
    borderRadius: radius.sm,
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E"
  },
  successText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "600"
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md
  },
  tabBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabBtnActive: {
    borderBottomColor: colors.blue
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkMuted
  },
  tabBtnTextActive: {
    color: colors.blue,
    fontWeight: "700"
  },
  tabContent: {
    flex: 1
  },
  tabContentInner: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  tabPane: {
    gap: spacing.md
  },
  filterBar: {
    gap: spacing.sm
  },
  filterBarDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  searchInputWrap: {
    flex: 1,
    maxWidth: 400
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink
  },
  statusFilters: {
    flexDirection: "row",
    gap: spacing.xs
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF"
  },
  filterChipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted
  },
  filterChipTextActive: {
    color: "#FFFFFF"
  },
  emptyCard: {
    padding: spacing.xxl,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 400
  },
  staffCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  staffCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  staffMainInfo: {
    flex: 1,
    gap: 4
  },
  staffNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  staffName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  staffEmail: {
    fontSize: 13,
    color: colors.inkMuted
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800"
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E"
  },
  roleBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF"
  },
  sessionPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  sessionPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563"
  },
  staffMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: spacing.sm
  },
  metaLabel: {
    fontSize: 12,
    color: colors.inkMuted
  },
  metaValue: {
    fontWeight: "700",
    color: colors.ink
  },
  capsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  capTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  capTagText: {
    fontSize: 10,
    color: "#334155",
    fontWeight: "600"
  },
  capTagMore: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  capTagMoreText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "700"
  },
  actionsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  readOnlyNotice: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm
  },
  readOnlyNoticeText: {
    fontSize: 11,
    fontStyle: "italic",
    color: colors.inkMuted
  },
  actionBtnOutline: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: "#FFFFFF"
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue
  },
  actionBtnPrimary: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.blue
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  actionBtnWarning: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D"
  },
  actionBtnWarningText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E"
  },
  actionBtnSuccess: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC"
  },
  actionBtnSuccessText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534"
  },
  actionBtnDanger: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5"
  },
  actionBtnDangerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B"
  },
  actionBtnCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#F3F4F6"
  },
  actionBtnCancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink
  },
  rolePickerBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm
  },
  rolePickerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  rolesScroll: {
    flexDirection: "row",
    gap: spacing.xs
  },
  roleOptionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs
  },
  roleOptionChipActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  roleOptionChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.ink
  },
  roleOptionChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  rolePickerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink
  },
  sectionSub: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: spacing.xs
  },
  rolesGrid: {
    gap: spacing.md
  },
  roleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  roleCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  roleCardName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink
  },
  capsCountBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  capsCountBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569"
  },
  roleCardDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    lineHeight: 18
  },
  roleCapsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  roleCapChip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  roleCapChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1D4ED8"
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md
  },
  categoryBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink
  },
  capsList: {
    gap: 6
  },
  capItem: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  capKey: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
    width: 180
  },
  capDesc: {
    fontSize: 12,
    color: colors.inkMuted,
    flex: 1
  },
  inviteHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink
  },
  formField: {
    gap: 4
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  formInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.ink
  },
  formActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  invitationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  invitationMain: {
    flex: 1,
    gap: 4
  },
  auditTable: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  auditRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 4
  },
  auditRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  actionPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155"
  },
  auditTime: {
    fontSize: 11,
    color: colors.inkMuted
  },
  auditDetails: {
    fontSize: 12,
    color: colors.inkMuted
  },
  metadataBox: {
    backgroundColor: "#F8FAFC",
    padding: spacing.xs,
    borderRadius: 4,
    marginTop: 2
  },
  metadataText: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: "Courier", default: "monospace" }),
    color: "#64748B"
  }
});
