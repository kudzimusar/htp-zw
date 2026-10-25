import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../theme/tokens";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { canManageStaff } from "../security/capabilities";
import type { NewsroomStaffMember, NewsroomStaffOperationsDirectory } from "../domain/models";

export type StaffProfileTab =
  | "overview"
  | "stories"
  | "assignments"
  | "activity"
  | "permissions"
  | "notifications"
  | "security"
  | "preferences";

export function StudioStaffProfile({ staffId }: { staffId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StaffProfileTab>("overview");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Administrative modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"active" | "suspended" | "revoked" | "deactivated">("active");
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  // Load staff operations directory & authorization
  const staffOps = useAsync<NewsroomStaffOperationsDirectory>(
    () => services.newsroomStaff.getStaffOperationsDirectory(),
    [refreshKey]
  );
  const authSnapshot = useAsync(() => services.authorization.getSnapshot(), []);

  const directory: NewsroomStaffOperationsDirectory | null = staffOps.data;
  const isManager = authSnapshot.data ? canManageStaff(authSnapshot.data) : false;

  // Find target staff member or synthesize fallback for owner/reporter if loading
  const staffMember: NewsroomStaffMember =
    directory?.staff.find((s: NewsroomStaffMember) => s.id === staffId || s.email.includes(staffId)) || {
      id: staffId,
      displayName: staffId === "staff-reporter-01" ? "Rukudzo Gota" : staffId.includes("editor") ? "Michael Gwarisa" : "Kudzanai Musarurwa",
      email: staffId === "staff-reporter-01" ? "rukudzo@healthtimes.co.zw" : staffId.includes("editor") ? "michael@healthtimes.co.zw" : "kudzimusar@gmail.com",
      handle: staffId === "staff-reporter-01" ? "rukudzog" : staffId.includes("editor") ? "mgwarisa" : "kudzimusar",
      roleId: "role-01",
      roleName: staffId === "staff-reporter-01" ? "Reporter / Journalist" : staffId.includes("editor") ? "Editor-in-Chief" : "Publisher / Owner",
      desk: staffId === "staff-reporter-01" ? "Health & Science Desk" : staffId.includes("editor") ? "Editorial Board" : "Executive Desk",
      beat: "Public Health Policy & Epidemiology",
      country: "Zimbabwe",
      region: "Harare",
      status: "active",
      mfaRequired: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: "2026-01-15T08:00:00Z",
      activeSessionsCount: 1,
      capabilities: [
        "story.create",
        "story.edit",
        "story.submit",
        "assignment.participate"
      ]
    };

  const displayName = staffMember.displayName;
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ST";

  async function handleRoleChange() {
    if (!selectedRoleName) return;
    try {
      await services.newsroomStaff.changeStaffRole(staffMember.id, selectedRoleName);
      setActionFeedback(`Role updated to ${selectedRoleName} successfully.`);
      setShowRoleModal(false);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    }
  }

  async function handleStatusChange() {
    try {
      await services.newsroomStaff.updateStaffStatus(staffMember.id, selectedStatus);
      setActionFeedback(`Status updated to ${selectedStatus.toUpperCase()} successfully.`);
      setShowStatusModal(false);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    }
  }

  async function handleRevokeSessions() {
    try {
      await services.newsroomStaff.revokeStaffSession(staffMember.id);
      setActionFeedback("Active sessions revoked successfully.");
      setShowRevokeModal(false);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header Back & Breadcrumb Link */}
      <View style={styles.topBackBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.push("/studio/staff-roles" as never)}
        >
          <Text style={styles.backBtnText}>← Back to Staff Directory</Text>
        </Pressable>
      </View>

      {/* Staff Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.staffName}>{displayName}</Text>
              <View
                style={[
                  styles.statusBadge,
                  staffMember.status === "active" ? styles.statusBadgeActive : styles.statusBadgeWarn
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    staffMember.status === "active" ? styles.statusTextActive : styles.statusTextWarn
                  ]}
                >
                  {staffMember.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.deskTag}>
                <Text style={styles.deskTagText}>{staffMember.desk || "General Newsroom"}</Text>
              </View>
            </View>

            <Text style={styles.staffMeta}>
              {staffMember.email} · @{staffMember.handle} · {staffMember.roleName}
            </Text>

            <View style={styles.workloadStrip}>
              <View style={styles.workloadItem}>
                <Text style={styles.workloadVal}>27</Text>
                <Text style={styles.workloadLabel}>Stories Authored</Text>
              </View>
              <View style={styles.workloadItem}>
                <Text style={styles.workloadVal}>4</Text>
                <Text style={styles.workloadLabel}>Reviews Completed</Text>
              </View>
              <View style={styles.workloadItem}>
                <Text style={styles.workloadVal}>3</Text>
                <Text style={styles.workloadLabel}>Active Assignments</Text>
              </View>
              <View style={styles.workloadItem}>
                <Text style={styles.workloadVal}>{staffMember.activeSessionsCount}</Text>
                <Text style={styles.workloadLabel}>Active Sessions</Text>
              </View>
            </View>
          </View>

          {/* Manager Action Buttons */}
          {isManager && (
            <View style={styles.managerActionCol}>
              <Pressable
                style={styles.actionBtnPrimary}
                onPress={() => {
                  setSelectedRoleName(staffMember.roleName);
                  setShowRoleModal(true);
                }}
              >
                <Text style={styles.actionBtnPrimaryText}>Change Role</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtnOutline}
                onPress={() => {
                  setSelectedStatus(staffMember.status as any);
                  setShowStatusModal(true);
                }}
              >
                <Text style={styles.actionBtnOutlineText}>Update Status</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtnDanger}
                onPress={() => setShowRevokeModal(true)}
              >
                <Text style={styles.actionBtnDangerText}>Revoke Sessions</Text>
              </Pressable>
            </View>
          )}
        </View>

        {actionFeedback && (
          <View style={styles.feedbackBanner}>
            <Text style={styles.feedbackText}>{actionFeedback}</Text>
          </View>
        )}

        {/* Tab Navigation Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {(
            [
              ["overview", "Overview"],
              ["stories", "Stories"],
              ["assignments", "Assignments"],
              ["activity", "Activity"],
              ["permissions", "Permissions"],
              ["notifications", "Notifications"],
              ["security", "Security"],
              ["preferences", "Preferences"]
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.tabBtn, activeTab === key && styles.tabBtnActive]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabHeading}>Staff Identity & Organizational Profile</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{staffMember.displayName}</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Official Email</Text>
              <Text style={styles.detailValue}>{staffMember.email}</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Role Title</Text>
              <Text style={styles.detailValue}>{staffMember.roleName}</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Department / Desk</Text>
              <Text style={styles.detailValue}>{staffMember.desk || "Newsroom"}</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Reporting Beat</Text>
              <Text style={styles.detailValue}>{staffMember.beat || "General Healthcare"}</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Region / Country</Text>
              <Text style={styles.detailValue}>{staffMember.region || "Harare"}, Zimbabwe</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Station Date</Text>
              <Text style={styles.detailValue}>{staffMember.createdAt.slice(0, 10)}</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>MFA Enforcement</Text>
              <Text style={styles.detailValue}>
                {staffMember.mfaRequired ? "Enforced · Active" : "Optional"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Tab 2: Stories */}
      {activeTab === "stories" && (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabHeading}>Authored & Assigned Stories</Text>
          <Text style={styles.tabSubheading}>
            Editorial contributions across review and publication workflows.
          </Text>

          <View style={styles.recordList}>
            <View style={styles.recordRow}>
              <View style={styles.recordInfo}>
                <Text style={styles.recordTitle}>
                  Zimbabwe Strengthens National Social Contracting as Donor Funds Shift
                </Text>
                <Text style={styles.recordMeta}>
                  Desk: Health Policy · Published 2 days ago · Verified by Michael Gwarisa
                </Text>
              </View>
              <View style={styles.recordStatusBadgePublished}>
                <Text style={styles.recordStatusTextPublished}>PUBLISHED</Text>
              </View>
            </View>

            <View style={styles.recordRow}>
              <View style={styles.recordInfo}>
                <Text style={styles.recordTitle}>
                  Parirenyatwa Pediatric Dialysis Wing Reaches 90% Clinical Capacity
                </Text>
                <Text style={styles.recordMeta}>
                  Desk: Public Health · In Editorial Review · Submitted yesterday
                </Text>
              </View>
              <View style={styles.recordStatusBadgeReview}>
                <Text style={styles.recordStatusTextReview}>IN REVIEW</Text>
              </View>
            </View>

            <View style={styles.recordRow}>
              <View style={styles.recordInfo}>
                <Text style={styles.recordTitle}>
                  Harare Municipal Water Chlorination and Cholera Surveillance Report
                </Text>
                <Text style={styles.recordMeta}>
                  Desk: Epidemiology · Draft in progress · Autosaved 40 mins ago
                </Text>
              </View>
              <View style={styles.recordStatusBadgeDraft}>
                <Text style={styles.recordStatusTextDraft}>DRAFT</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tab 3: Assignments */}
      {activeTab === "assignments" && (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabHeading}>Current & Upcoming Assignments</Text>
          <Text style={styles.tabSubheading}>Field reporting deadlines and coverage targets.</Text>

          <View style={styles.recordList}>
            <View style={styles.recordRow}>
              <View style={styles.recordInfo}>
                <Text style={styles.recordTitle}>Coverage: National AIDS Council Q3 Board Briefing</Text>
                <Text style={styles.recordMeta}>
                  Deadline: Tomorrow 14:00 CAT · Location: Rainbow Towers, Harare
                </Text>
              </View>
              <View style={styles.recordStatusBadgeActive}>
                <Text style={styles.recordStatusTextActive}>CURRENT</Text>
              </View>
            </View>

            <View style={styles.recordRow}>
              <View style={styles.recordInfo}>
                <Text style={styles.recordTitle}>Field Investigation: Bulawayo Clinic Medicine Stocks</Text>
                <Text style={styles.recordMeta}>
                  Deadline: Friday 18:00 CAT · Desk: Health Logistics
                </Text>
              </View>
              <View style={styles.recordStatusBadgeUpcoming}>
                <Text style={styles.recordStatusTextUpcoming}>UPCOMING</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tab 4: Activity */}
      {activeTab === "activity" && (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabHeading}>Meaningful Operational Activity</Text>
          <Text style={styles.tabSubheading}>
            Timestamped actions recorded in the newsroom audit trail.
          </Text>

          <View style={styles.timelineList}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Story Submitted for Fact Check</Text>
                <Text style={styles.timelineDetails}>
                  "Parirenyatwa Pediatric Dialysis Wing Reaches 90% Clinical Capacity"
                </Text>
                <Text style={styles.timelineTime}>Yesterday at 16:42 CAT</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Assignment Accepted</Text>
                <Text style={styles.timelineDetails}>
                  "Coverage: National AIDS Council Q3 Board Briefing"
                </Text>
                <Text style={styles.timelineTime}>24 Oct 2026, 09:15 CAT</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Expense Claim EXP-2026-0038 Submitted</Text>
                <Text style={styles.timelineDetails}>
                  Travel & Fuel for Chitungwiza Community Clinic Coverage ($45.00 USD)
                </Text>
                <Text style={styles.timelineTime}>22 Oct 2026, 17:30 CAT</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tab 5: Permissions */}
      {activeTab === "permissions" && (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabHeading}>Effective Authority & Operating Rights</Text>
          <Text style={styles.tabSubheading}>
            Clear domain-level permissions derived from assigned roles.
          </Text>

          <View style={styles.permissionDomainsList}>
            {/* Editorial */}
            <View style={styles.permissionDomainBox}>
              <Text style={styles.permDomainHeader}>Editorial Domain</Text>
              <View style={styles.permCheckItem}>
                <Text style={styles.permCheckMark}>✓</Text>
                <Text style={styles.permCheckLabel}>Create story drafts and submit to review</Text>
              </View>
              <View style={styles.permCheckItem}>
                <Text style={styles.permCheckMark}>✓</Text>
                <Text style={styles.permCheckLabel}>Upload media assets and tag byline metadata</Text>
              </View>
              <View style={styles.permCheckItem}>
                <Text style={styles.permCheckMark}>✓</Text>
                <Text style={styles.permCheckLabel}>Participate in assignment coverage threads</Text>
              </View>
            </View>

            {/* Commercial */}
            <View style={styles.permissionDomainBox}>
              <Text style={styles.permDomainHeader}>Commercial & Advertising</Text>
              <View style={styles.permCheckItem}>
                <Text style={styles.permCrossMark}>✕</Text>
                <Text style={styles.permCrossLabel}>Create advertising campaigns (Restricted to Commercial)</Text>
              </View>
              <View style={styles.permCheckItem}>
                <Text style={styles.permCrossMark}>✕</Text>
                <Text style={styles.permCrossLabel}>Manage subscriber access passes (Restricted to Commercial)</Text>
              </View>
            </View>

            {/* Finance */}
            <View style={styles.permissionDomainBox}>
              <Text style={styles.permDomainHeader}>Finance & Ledger</Text>
              <View style={styles.permCheckItem}>
                <Text style={styles.permCheckMark}>✓</Text>
                <Text style={styles.permCheckLabel}>Submit personal field reporting expense claims</Text>
              </View>
              <View style={styles.permCheckItem}>
                <Text style={styles.permCrossMark}>✕</Text>
                <Text style={styles.permCrossLabel}>Create commercial invoices (Restricted to Finance Manager)</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tab 6: Notifications */}
      {activeTab === "notifications" && (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabHeading}>Staff Notification Routing</Text>
          <Text style={styles.tabSubheading}>
            Configure how editorial notices and assignment alerts reach this staff member.
          </Text>

          <View style={styles.prefList}>
            <View style={styles.prefRow}>
              <Text style={styles.prefRowLabel}>Email alerts for new story assignments</Text>
              <Text style={styles.prefRowValue}>Enabled</Text>
            </View>
            <View style={styles.prefRow}>
              <Text style={styles.prefRowLabel}>Push alerts for editor review comments</Text>
              <Text style={styles.prefRowValue}>Enabled</Text>
            </View>
            <View style={styles.prefRow}>
              <Text style={styles.prefRowLabel}>Breaking news desk emergency broadcast</Text>
              <Text style={styles.prefRowValue}>Enabled</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tab 7: Security */}
      {activeTab === "security" && (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabHeading}>Active Sessions & Security Oversight</Text>
          <Text style={styles.tabSubheading}>
            Review active browser and device sessions authenticated with this staff profile.
          </Text>

          <View style={styles.sessionItem}>
            <View style={styles.sessionItemMain}>
              <Text style={styles.sessionTitle}>Web Studio Session (Chrome / macOS)</Text>
              <Text style={styles.sessionSub}>IP: 197.221.254.12 · Last active 10 mins ago</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>ONLINE</Text>
            </View>
          </View>

          {isManager && (
            <Pressable
              style={styles.revokeFullBtn}
              onPress={() => setShowRevokeModal(true)}
            >
              <Text style={styles.revokeFullBtnText}>
                Revoke All Active Sessions for this Staff Member
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Tab 8: Preferences */}
      {activeTab === "preferences" && (
        <View style={styles.tabContentCard}>
          <Text style={styles.tabHeading}>Station & Operational Preferences</Text>
          <View style={styles.prefList}>
            <View style={styles.prefRow}>
              <Text style={styles.prefRowLabel}>Default Newsroom Desk</Text>
              <Text style={styles.prefRowValue}>{staffMember.desk || "Health & Science Desk"}</Text>
            </View>
            <View style={styles.prefRow}>
              <Text style={styles.prefRowLabel}>Timezone</Text>
              <Text style={styles.prefRowValue}>Africa/Harare (CAT UTC+2)</Text>
            </View>
            <View style={styles.prefRow}>
              <Text style={styles.prefRowLabel}>Table Density</Text>
              <Text style={styles.prefRowValue}>Comfortable</Text>
            </View>
          </View>
        </View>
      )}

      {/* Change Role Modal */}
      <Modal visible={showRoleModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reassign Staff Role</Text>
            <Text style={styles.modalSub}>
              Change organizational role for {staffMember.displayName}.
            </Text>

            <View style={styles.roleOptions}>
              {((directory?.roles && directory.roles.length > 0)
                ? directory.roles
                : [
                    { id: "1", name: "Publisher / Owner" },
                    { id: "2", name: "Editor-in-Chief" },
                    { id: "3", name: "Desk Editor" },
                    { id: "4", name: "Reporter / Journalist" },
                    { id: "5", name: "Finance Manager" },
                    { id: "6", name: "Commercial Manager" },
                    { id: "7", name: "Audience & Growth Lead" },
                    { id: "8", name: "Systems Administrator" }
                  ]
              ).map((role: { id: string; name: string }) => (
                <Pressable
                  key={role.id}
                  style={[
                    styles.roleOptBtn,
                    selectedRoleName === role.name && styles.roleOptBtnActive
                  ]}
                  onPress={() => setSelectedRoleName(role.name)}
                >
                  <Text
                    style={[
                      styles.roleOptText,
                      selectedRoleName === role.name && styles.roleOptTextActive
                    ]}
                  >
                    {role.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancel} onPress={() => setShowRoleModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={handleRoleChange}>
                <Text style={styles.modalConfirmText}>Save Role Change</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Status Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Staff Status</Text>
            <Text style={styles.modalSub}>Set account state for {staffMember.displayName}.</Text>

            <View style={styles.roleOptions}>
              {(["active", "suspended", "revoked", "deactivated"] as const).map((st) => (
                <Pressable
                  key={st}
                  style={[
                    styles.roleOptBtn,
                    selectedStatus === st && styles.roleOptBtnActive
                  ]}
                  onPress={() => setSelectedStatus(st)}
                >
                  <Text
                    style={[
                      styles.roleOptText,
                      selectedStatus === st && styles.roleOptTextActive
                    ]}
                  >
                    {st.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancel} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={handleStatusChange}>
                <Text style={styles.modalConfirmText}>Save Status</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Revoke Sessions Modal */}
      <Modal visible={showRevokeModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, { color: colors.live }]}>Revoke All Sessions</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to terminate all active sessions for {staffMember.displayName}? They will be immediately signed out from all devices.
            </Text>

            <View style={styles.modalBtnRow}>
              <Pressable style={styles.modalCancel} onPress={() => setShowRevokeModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, { backgroundColor: colors.live }]}
                onPress={handleRevokeSessions}
              >
                <Text style={styles.modalConfirmText}>Confirm Revocation</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  topBackBar: { paddingVertical: spacing.xs },
  backBtn: { alignSelf: "flex-start", paddingVertical: 4 },
  backBtnText: { fontSize: 13, fontWeight: "800", color: colors.blue },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xl, flexWrap: "wrap" },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#102A3F",
    borderWidth: 2,
    borderColor: "#70D1D1",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarTextLarge: { fontSize: 24, fontWeight: "900", color: "#70D1D1" },
  heroInfo: { flex: 1, minWidth: 260, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  staffName: { fontSize: 24, fontWeight: "900", color: colors.ink, letterSpacing: -0.3 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  statusBadgeActive: { backgroundColor: "#E6F4EA", borderColor: "#34A853" },
  statusBadgeWarn: { backgroundColor: "#FEF7E0", borderColor: "#FBBC04" },
  statusBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  statusTextActive: { color: "#137333" },
  statusTextWarn: { color: "#B06000" },
  deskTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  deskTagText: { fontSize: 11, fontWeight: "700", color: colors.inkMuted },
  staffMeta: { fontSize: 13, color: colors.inkMuted },
  workloadStrip: {
    flexDirection: "row",
    gap: spacing.lg,
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs
  },
  workloadItem: { gap: 2 },
  workloadVal: { fontSize: 18, fontWeight: "900", color: colors.ink },
  workloadLabel: { fontSize: 11, fontWeight: "700", color: colors.inkMuted },
  managerActionCol: { gap: spacing.xs, alignSelf: "flex-start" },
  actionBtnPrimary: {
    backgroundColor: colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  actionBtnPrimaryText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#FFFFFF"
  },
  actionBtnOutlineText: { fontSize: 11, fontWeight: "800", color: colors.ink },
  actionBtnDanger: {
    borderWidth: 1,
    borderColor: colors.live,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "#FFF5F5"
  },
  actionBtnDangerText: { fontSize: 11, fontWeight: "800", color: colors.live },
  feedbackBanner: {
    backgroundColor: "#E6F4EA",
    borderWidth: 1,
    borderColor: "#34A853",
    padding: spacing.md,
    borderRadius: radius.sm
  },
  feedbackText: { fontSize: 13, fontWeight: "700", color: "#137333" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border
  },
  tabBtnActive: { backgroundColor: "#102A3F", borderColor: "#102A3F" },
  tabText: { fontSize: 12, fontWeight: "700", color: colors.inkMuted },
  tabTextActive: { color: "#FFFFFF", fontWeight: "800" },
  tabContentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md
  },
  tabHeading: { fontSize: 18, fontWeight: "900", color: colors.ink },
  tabSubheading: { fontSize: 13, color: colors.inkMuted, marginTop: -4 },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginTop: spacing.md
  },
  detailBlock: { width: "47%", minWidth: 220, gap: 4 },
  detailLabel: { fontSize: 11, fontWeight: "800", color: colors.inkMuted, letterSpacing: 0.5 },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  recordList: { gap: spacing.sm, marginTop: spacing.sm },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.md,
    flexWrap: "wrap"
  },
  recordInfo: { flex: 1, minWidth: 240, gap: 2 },
  recordTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  recordMeta: { fontSize: 12, color: colors.inkMuted },
  recordStatusBadgePublished: {
    backgroundColor: "#E6F4EA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  recordStatusTextPublished: { fontSize: 10, fontWeight: "900", color: "#137333" },
  recordStatusBadgeReview: {
    backgroundColor: "#FEF7E0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  recordStatusTextReview: { fontSize: 10, fontWeight: "900", color: "#B06000" },
  recordStatusBadgeDraft: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  recordStatusTextDraft: { fontSize: 10, fontWeight: "800", color: colors.inkMuted },
  recordStatusBadgeActive: {
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  recordStatusTextActive: { fontSize: 10, fontWeight: "900", color: "#1A73E8" },
  recordStatusBadgeUpcoming: {
    backgroundColor: "#F3E8FD",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  recordStatusTextUpcoming: { fontSize: 10, fontWeight: "900", color: "#7B1FA2" },
  timelineList: { gap: spacing.md, marginTop: spacing.sm },
  timelineItem: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.blue,
    marginTop: 4
  },
  timelineContent: { flex: 1, gap: 2 },
  timelineTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  timelineDetails: { fontSize: 12, color: colors.inkMuted },
  timelineTime: { fontSize: 11, color: colors.inkMuted },
  permissionDomainsList: { gap: spacing.md, marginTop: spacing.sm },
  permissionDomainBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.sm
  },
  permDomainHeader: { fontSize: 14, fontWeight: "900", color: colors.ink },
  permCheckItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  permCheckMark: { fontSize: 14, fontWeight: "900", color: "#137333" },
  permCheckLabel: { fontSize: 13, fontWeight: "600", color: colors.ink },
  permCrossMark: { fontSize: 14, fontWeight: "900", color: colors.inkMuted },
  permCrossLabel: { fontSize: 13, color: colors.inkMuted },
  prefList: { gap: spacing.sm, marginTop: spacing.sm },
  prefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  prefRowLabel: { fontSize: 13, fontWeight: "700", color: colors.ink },
  prefRowValue: { fontSize: 13, fontWeight: "700", color: colors.blue },
  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  sessionItemMain: { gap: 2 },
  sessionTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  sessionSub: { fontSize: 11, color: colors.inkMuted },
  activePill: {
    backgroundColor: "#E6F4EA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  activePillText: { fontSize: 10, fontWeight: "900", color: "#137333" },
  revokeFullBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: colors.live,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginTop: spacing.sm
  },
  revokeFullBtnText: { fontSize: 12, fontWeight: "800", color: colors.live },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  modalBox: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: colors.ink },
  modalSub: { fontSize: 12, color: colors.inkMuted, marginTop: -6 },
  roleOptions: { gap: spacing.xs, maxHeight: 280 },
  roleOptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: "#F8FAFC"
  },
  roleOptBtnActive: { backgroundColor: "#102A3F", borderColor: "#102A3F" },
  roleOptText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  roleOptTextActive: { color: "#FFFFFF", fontWeight: "800" },
  modalBtnRow: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  modalCancelText: { fontSize: 12, fontWeight: "800", color: colors.inkMuted },
  modalConfirm: {
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm
  },
  modalConfirmText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" }
});
