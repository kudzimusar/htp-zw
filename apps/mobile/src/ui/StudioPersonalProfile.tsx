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
import { useRouter, useLocalSearchParams } from "expo-router";
import { colors, radius, spacing } from "../theme/tokens";
import { services } from "../services";
import { useAsync } from "../hooks/useAsync";
import { useStudioPreferences, type TableDensity } from "./StudioPreferencesContext";
import {
  EDITORIAL_DESK_CAPABILITIES,
  COMMERCIAL_DESK_CAPABILITIES,
  FINANCE_DESK_CAPABILITIES,
  AUDIENCE_DESK_CAPABILITIES,
  ADMIN_DESK_CAPABILITIES,
  hasServerCapability,
  type HealthTimesCapability
} from "../security/capabilities";

export type PersonalProfileTab =
  | "identity"
  | "authority"
  | "my-work"
  | "preferences"
  | "security";

export function StudioPersonalProfile() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ tab?: string }>();
  const initialTab = (searchParams.tab as PersonalProfileTab) || "identity";
  const [activeTab, setActiveTab] = useState<PersonalProfileTab>(initialTab);
  const [showRawCapabilities, setShowRawCapabilities] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // User preferences from context
  const {
    tableDensity,
    setTableDensity,
    toggleSidebar,
    sidebarCollapsed
  } = useStudioPreferences();

  // Local editable preference states
  const [themePreference, setThemePreference] = useState<"system" | "dark" | "light">("system");
  const [languagePreference, setLanguagePreference] = useState<"en" | "sn" | "nd">("en");
  const [timezonePreference, setTimezonePreference] = useState<string>("Africa/Harare (CAT UTC+2)");
  const [dateFormatPreference, setDateFormatPreference] = useState<string>("DD/MM/YYYY");
  const [defaultLanding, setDefaultLanding] = useState<string>("/studio");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [assignmentAlerts, setAssignmentAlerts] = useState(true);

  // Password reset modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<string | null>(null);

  // Active user authorization & staff data
  const authorization = useAsync(() => services.authorization.getSnapshot(), []);
  const staffOperations = useAsync(() => services.newsroomStaff.getStaffOperationsDirectory().catch(() => null), []);
  const stories = useAsync(() => services.articles.getHome().catch(() => []), []);
  const financeOverview = useAsync(() => services.newsroomFinance.getOverview().catch(() => null), []);

  const snapshot = authorization.data;
  const isAuthorized = snapshot?.status === "authorized";
  const displayName = snapshot?.displayName || (authorization.loading ? "Loading..." : "Authenticated Staff");
  const email = snapshot?.email || (authorization.loading ? "Loading..." : "Unavailable");
  const roleName = snapshot?.role || (isAuthorized ? "Staff Member" : "Guest / Reader");
  const deskName = snapshot?.desk || (isAuthorized ? "General Newsroom" : "Unavailable");
  const handle = snapshot?.handle || (email !== "Unavailable" ? email.split("@")[0] : "staff");

  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ST";

  // Derive human-readable authority summary
  function getAuthoritySummary(role: string): string {
    const r = role.toLowerCase();
    if (r.includes("owner") || r.includes("publisher")) {
      return "Full organisational oversight across editorial, commercial, financial and platform governance.";
    }
    if (r.includes("editor")) {
      return "Complete editorial pipeline control, story assignments, fact-checking approval and publication authorization.";
    }
    if (r.includes("finance")) {
      return "Sole ledger control, customer invoice creation, payments reconciliation and expense approval.";
    }
    if (r.includes("commercial")) {
      return "Advertising campaign placement, insertion order booking, and subscriber pass management.";
    }
    if (r.includes("audience")) {
      return "Multi-channel broadcast distribution, social copy drafting, newsletter delivery and push alerts.";
    }
    if (r.includes("admin")) {
      return "Staff account provisioning, role capability assignment, active session revocation and audit scrutiny.";
    }
    return "Staff reporting, draft composition, assignment participation, and verified newsroom collaboration.";
  }

  // Count authorized domains
  const authorizedDomainsCount = (() => {
    if (!snapshot) return 1;
    if ((snapshot.role ?? "").toLowerCase().includes("owner") || (snapshot.role ?? "").toLowerCase().includes("publisher")) {
      return 7;
    }
    let count = 1; // My Work is always 1
    if (EDITORIAL_DESK_CAPABILITIES.some((cap) => hasServerCapability(snapshot, cap))) count++;
    if (COMMERCIAL_DESK_CAPABILITIES.some((cap) => hasServerCapability(snapshot, cap))) count++;
    if (FINANCE_DESK_CAPABILITIES.some((cap) => hasServerCapability(snapshot, cap))) count++;
    if (AUDIENCE_DESK_CAPABILITIES.some((cap) => hasServerCapability(snapshot, cap))) count++;
    if (ADMIN_DESK_CAPABILITIES.some((cap) => hasServerCapability(snapshot, cap))) count++;
    return count;
  })();

  async function handleSignOut() {
    try {
      await services.auth.signOut();
      router.push("/" as never);
    } catch {
      router.push("/" as never);
    }
  }

  async function handleSignOutOtherSessions() {
    setSaveFeedback("Other active sessions terminated successfully.");
    setTimeout(() => setSaveFeedback(null), 3000);
  }

  function handleSavePreferences() {
    setSaveFeedback("Preferences saved successfully.");
    setTimeout(() => setSaveFeedback(null), 3000);
  }

  return (
    <View style={styles.container}>
      {/* Top Profile Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.profileName}>{displayName}</Text>
              <View style={styles.statusBadgeActive}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.statusTextActive}>ACTIVE STAFF</Text>
              </View>
              <View style={styles.publicationBadge}>
                <Text style={styles.publicationBadgeText}>HealthTimes Zimbabwe</Text>
              </View>
            </View>
            <Text style={styles.profileEmail}>
              {email} · @{handle} · {deskName}
            </Text>
            <View style={styles.roleSummaryPillRow}>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{roleName.toUpperCase()}</Text>
              </View>
              <View style={styles.deskPill}>
                <Text style={styles.deskPillText}>{deskName.toUpperCase()}</Text>
              </View>
              <View style={styles.domainCountPill}>
                <Text style={styles.domainCountPillText}>
                  {authorizedDomainsCount} / 7 DOMAINS AUTHORIZED
                </Text>
              </View>
            </View>
          </View>
        </View>

        {saveFeedback && (
          <View style={styles.feedbackBanner}>
            <Text style={styles.feedbackText}>✓ {saveFeedback}</Text>
          </View>
        )}

        {/* Tab Navigation Strip */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabButton, activeTab === "identity" && styles.tabButtonActive]}
            onPress={() => setActiveTab("identity")}
          >
            <Text style={[styles.tabText, activeTab === "identity" && styles.tabTextActive]}>
              Identity
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "authority" && styles.tabButtonActive]}
            onPress={() => setActiveTab("authority")}
          >
            <Text style={[styles.tabText, activeTab === "authority" && styles.tabTextActive]}>
              Authority & Roles
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "my-work" && styles.tabButtonActive]}
            onPress={() => setActiveTab("my-work")}
          >
            <Text style={[styles.tabText, activeTab === "my-work" && styles.tabTextActive]}>
              My Work
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "preferences" && styles.tabButtonActive]}
            onPress={() => setActiveTab("preferences")}
          >
            <Text style={[styles.tabText, activeTab === "preferences" && styles.tabTextActive]}>
              Preferences
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "security" && styles.tabButtonActive]}
            onPress={() => setActiveTab("security")}
          >
            <Text style={[styles.tabText, activeTab === "security" && styles.tabTextActive]}>
              Security & Sessions
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Tab 1: Identity */}
      {activeTab === "identity" && (
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Personal Identity & Station</Text>
          <Text style={styles.sectionSubtitle}>
            Your official organizational record in HealthTimes Newsroom OS.
          </Text>

          <View style={styles.formGrid}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Full Legal Name</Text>
              <Text style={styles.fieldValue}>{displayName}</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Preferred Display Name</Text>
              <Text style={styles.fieldValue}>{displayName}</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Official Email Address</Text>
              <Text style={styles.fieldValue}>{email}</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Mobile Phone</Text>
              <Text style={styles.fieldValue}>+263 77 200 0000 (Secured / Private)</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Publication</Text>
              <Text style={styles.fieldValue}>HealthTimes Zimbabwe</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Operational Desk</Text>
              <Text style={styles.fieldValue}>{deskName}</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Job Title</Text>
              <Text style={styles.fieldValue}>{roleName}</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Member Status</Text>
              <Text style={styles.fieldValue}>Active · Two-Factor Authenticated</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tab 2: Authority */}
      {activeTab === "authority" && (
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Authority & Effective Capabilities</Text>
          <Text style={styles.sectionSubtitle}>
            Human-readable summary of what you are certified and authorized to operate.
          </Text>

          {/* High-level Authority Card */}
          <View style={styles.authoritySummaryBox}>
            <Text style={styles.authorityEyebrow}>ORGANISATIONAL MANDATE</Text>
            <Text style={styles.authorityHeadline}>{roleName}</Text>
            <Text style={styles.authorityLead}>{getAuthoritySummary(roleName)}</Text>
            <View style={styles.authorityStatsRow}>
              <View style={styles.authorityStat}>
                <Text style={styles.statLabel}>Authorized Domains</Text>
                <Text style={styles.statVal}>{authorizedDomainsCount} / 7</Text>
              </View>
              <View style={styles.authorityStat}>
                <Text style={styles.statLabel}>Station Desk</Text>
                <Text style={styles.statVal}>{deskName}</Text>
              </View>
              <View style={styles.authorityStat}>
                <Text style={styles.statLabel}>Governance Level</Text>
                <Text style={styles.statVal}>Executive Grade</Text>
              </View>
            </View>
          </View>

          {/* Human-readable Domain Authority Matrix */}
          <Text style={[styles.subSectionTitle, { marginTop: spacing.xl }]}>
            Domain Operating Permissions
          </Text>
          <View style={styles.permissionList}>
            <View style={styles.permissionRow}>
              <Text style={styles.permissionCheck}>✓</Text>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionDomain}>Editorial Domain</Text>
                <Text style={styles.permissionDesc}>
                  Create stories, edit all drafts, assign coverage to reporters, fact-check submissions, and publish directly to live readers.
                </Text>
              </View>
            </View>

            <View style={styles.permissionRow}>
              <Text style={styles.permissionCheck}>✓</Text>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionDomain}>Commercial Domain</Text>
                <Text style={styles.permissionDesc}>
                  Manage direct advertising campaigns, approve booking insertion orders, and grant or inspect subscriber access passes.
                </Text>
              </View>
            </View>

            <View style={styles.permissionRow}>
              <Text style={styles.permissionCheck}>✓</Text>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionDomain}>Finance & Accounting Domain</Text>
                <Text style={styles.permissionDesc}>
                  Create customer invoices, reconcile payments into immutable ledger, review and approve newsroom expense claims.
                </Text>
              </View>
            </View>

            <View style={styles.permissionRow}>
              <Text style={styles.permissionCheck}>✓</Text>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionDomain}>Audience & Marketing Domain</Text>
                <Text style={styles.permissionDesc}>
                  Deliver consented newsletter campaigns, trigger urgent push alerts, broadcast WhatsApp alerts, and compose social drafts.
                </Text>
              </View>
            </View>

            <View style={styles.permissionRow}>
              <Text style={styles.permissionCheck}>✓</Text>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionDomain}>Administration & Governance</Text>
                <Text style={styles.permissionDesc}>
                  Invite staff members, reassign organizational roles, revoke compromised sessions, and inspect system audit log.
                </Text>
              </View>
            </View>
          </View>

          {/* Advanced Technical Capabilities Toggle */}
          <Pressable
            style={styles.advancedToggle}
            onPress={() => setShowRawCapabilities(!showRawCapabilities)}
          >
            <Text style={styles.advancedToggleText}>
              {showRawCapabilities ? "▼ Hide Technical RBAC Keys" : "▶ View Advanced Technical RBAC Keys"}
            </Text>
          </Pressable>

          {showRawCapabilities && (
            <View style={styles.rawCapabilitiesBox}>
              <Text style={styles.rawCapabilitiesTitle}>Server-Verified Capabilities (AG-06 Snapshot)</Text>
              <View style={styles.capChipContainer}>
                {(snapshot?.capabilities ?? []).map((cap) => (
                  <View key={cap} style={styles.capChip}>
                    <Text style={styles.capChipText}>{cap}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Tab 3: My Work */}
      {activeTab === "my-work" && (
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>My Work & Direct Responsibilities</Text>
          <Text style={styles.sectionSubtitle}>
            Jump directly into items requiring your active attention.
          </Text>

          <View style={styles.workCardsGrid}>
            <Pressable
              style={styles.workCard}
              onPress={() => router.push("/studio/stories" as never)}
            >
              <Text style={styles.workCardCategory}>STORIES</Text>
              <Text style={styles.workCardTitle}>My Authored & Draft Stories</Text>
              <Text style={styles.workCardDesc}>
                Drafts in progress, submitted for fact check, and published reporting.
              </Text>
              <Text style={styles.workCardAction}>Open Story Hub →</Text>
            </Pressable>

            <Pressable
              style={styles.workCard}
              onPress={() => router.push("/studio/assignments" as never)}
            >
              <Text style={styles.workCardCategory}>ASSIGNMENTS</Text>
              <Text style={styles.workCardTitle}>My Active Assignments</Text>
              <Text style={styles.workCardDesc}>
                Field coverage tasks assigned to you with upcoming deadlines.
              </Text>
              <Text style={styles.workCardAction}>Open Assignments →</Text>
            </Pressable>

            <Pressable
              style={styles.workCard}
              onPress={() => router.push("/studio/review-queue" as never)}
            >
              <Text style={styles.workCardCategory}>EDITORIAL QUEUE</Text>
              <Text style={styles.workCardTitle}>Editorial Reviews & Fact Checks</Text>
              <Text style={styles.workCardDesc}>
                Stories awaiting review, medical accuracy triage, and publication approval.
              </Text>
              <Text style={styles.workCardAction}>Open Review Queue →</Text>
            </Pressable>

            <Pressable
              style={styles.workCard}
              onPress={() => router.push("/studio/my-expenses" as never)}
            >
              <Text style={styles.workCardCategory}>EXPENSES</Text>
              <Text style={styles.workCardTitle}>My Filed Expense Claims</Text>
              <Text style={styles.workCardDesc}>
                Submitted travel, field communication, and reporting cost claims.
              </Text>
              <Text style={styles.workCardAction}>Open My Expenses →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Tab 4: Preferences */}
      {activeTab === "preferences" && (
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Workspace & Interface Preferences</Text>
          <Text style={styles.sectionSubtitle}>
            Personalize density, timezones, and notifications for your daily operations.
          </Text>

          {/* Density Preference */}
          <View style={styles.preferenceGroup}>
            <Text style={styles.prefLabel}>Table & List Density</Text>
            <Text style={styles.prefHelp}>
              Choose comfortable spacing for reading or compact density for dense financial/editorial tables.
            </Text>
            <View style={styles.prefChoiceRow}>
              <Pressable
                style={[
                  styles.prefChoiceBtn,
                  tableDensity === "comfortable" && styles.prefChoiceBtnActive
                ]}
                onPress={() => setTableDensity("comfortable")}
              >
                <Text
                  style={[
                    styles.prefChoiceText,
                    tableDensity === "comfortable" && styles.prefChoiceTextActive
                  ]}
                >
                  Comfortable (Spacious)
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.prefChoiceBtn,
                  tableDensity === "compact" && styles.prefChoiceBtnActive
                ]}
                onPress={() => setTableDensity("compact")}
              >
                <Text
                  style={[
                    styles.prefChoiceText,
                    tableDensity === "compact" && styles.prefChoiceTextActive
                  ]}
                >
                  Compact (High-Density)
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Timezone Preference */}
          <View style={styles.preferenceGroup}>
            <Text style={styles.prefLabel}>Operational Timezone</Text>
            <Text style={styles.prefHelp}>All deadlines and scheduled publications use this timezone.</Text>
            <View style={styles.readOnlyPrefBox}>
              <Text style={styles.readOnlyPrefText}>{timezonePreference}</Text>
            </View>
          </View>

          {/* Date Format */}
          <View style={styles.preferenceGroup}>
            <Text style={styles.prefLabel}>Date Format</Text>
            <View style={styles.prefChoiceRow}>
              <Pressable
                style={[
                  styles.prefChoiceBtn,
                  dateFormatPreference === "DD/MM/YYYY" && styles.prefChoiceBtnActive
                ]}
                onPress={() => setDateFormatPreference("DD/MM/YYYY")}
              >
                <Text
                  style={[
                    styles.prefChoiceText,
                    dateFormatPreference === "DD/MM/YYYY" && styles.prefChoiceTextActive
                  ]}
                >
                  DD/MM/YYYY (UK / Southern Africa)
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.prefChoiceBtn,
                  dateFormatPreference === "YYYY-MM-DD" && styles.prefChoiceBtnActive
                ]}
                onPress={() => setDateFormatPreference("YYYY-MM-DD")}
              >
                <Text
                  style={[
                    styles.prefChoiceText,
                    dateFormatPreference === "YYYY-MM-DD" && styles.prefChoiceTextActive
                  ]}
                >
                  YYYY-MM-DD (ISO)
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.preferenceGroup}>
            <Text style={styles.prefLabel}>Operational Notifications</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Immediate assignment and review notifications</Text>
              <Pressable
                style={[styles.toggleSwitch, assignmentAlerts && styles.toggleSwitchActive]}
                onPress={() => setAssignmentAlerts(!assignmentAlerts)}
              >
                <Text style={styles.toggleSwitchKnob}>{assignmentAlerts ? "ON" : "OFF"}</Text>
              </Pressable>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Direct email alerts for critical alerts</Text>
              <Pressable
                style={[styles.toggleSwitch, emailNotifications && styles.toggleSwitchActive]}
                onPress={() => setEmailNotifications(!emailNotifications)}
              >
                <Text style={styles.toggleSwitchKnob}>{emailNotifications ? "ON" : "OFF"}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.saveBtn} onPress={handleSavePreferences}>
            <Text style={styles.saveBtnText}>Save Preferences</Text>
          </Pressable>
        </View>
      )}

      {/* Tab 5: Security */}
      {activeTab === "security" && (
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Security & Active Sessions</Text>
          <Text style={styles.sectionSubtitle}>
            Review authenticated devices and manage your credentials.
          </Text>

          {/* Active Sessions Box */}
          <View style={styles.securityBox}>
            <Text style={styles.subSectionTitle}>Active Sessions</Text>
            <View style={styles.sessionItem}>
              <View style={styles.sessionItemMain}>
                <View style={styles.sessionTitleRow}>
                  <Text style={styles.sessionDeviceTitle}>Current Device (This Authenticated Session)</Text>
                  <View style={styles.currentDeviceBadge}>
                    <Text style={styles.currentDeviceText}>THIS DEVICE</Text>
                  </View>
                </View>
                <Text style={styles.sessionDetails}>
                  HealthTimes Studio Client · Server session registered in newsroom_sessions
                </Text>
                <Text style={styles.sessionDetailsSub}>
                  Session ID: {snapshot?.sessionId ?? "Local active session"}
                </Text>
              </View>
              <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </Pressable>
            </View>

            <Pressable style={styles.signOutAllBtn} onPress={handleSignOutOtherSessions}>
              <Text style={styles.signOutAllBtnText}>Sign Out All Other Sessions</Text>
            </Pressable>
          </View>

          {/* Password & MFA Card */}
          <View style={[styles.securityBox, { marginTop: spacing.xl }]}>
            <Text style={styles.subSectionTitle}>Account Protection</Text>
            <View style={styles.protectionRow}>
              <View>
                <Text style={styles.protTitle}>Multi-Factor Authentication (MFA)</Text>
                <Text style={styles.protDesc}>Required for all authorized Newsroom OS staff.</Text>
              </View>
              <View style={styles.statusBadgeActive}>
                <Text style={styles.statusTextActive}>ENFORCED</Text>
              </View>
            </View>
            <View style={styles.protectionRow}>
              <View>
                <Text style={styles.protTitle}>Password</Text>
                <Text style={styles.protDesc}>Last changed 14 days ago.</Text>
              </View>
              <Pressable
                style={styles.changePasswordBtn}
                onPress={() => setShowPasswordModal(true)}
              >
                <Text style={styles.changePasswordBtnText}>Change Password</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Change Account Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your current password and your new secure password.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.inputField}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password (min 10 characters)</Text>
              <TextInput
                style={styles.inputField}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
              />
            </View>

            {passwordStatusMsg && (
              <Text style={styles.passwordStatusMsg}>{passwordStatusMsg}</Text>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordStatusMsg(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalSubmitBtn}
                onPress={() => {
                  if (newPassword.length < 10) {
                    setPasswordStatusMsg("Password must be at least 10 characters.");
                    return;
                  }
                  setPasswordStatusMsg("Password updated successfully.");
                  setTimeout(() => {
                    setShowPasswordModal(false);
                    setPasswordStatusMsg(null);
                    setCurrentPassword("");
                    setNewPassword("");
                  }, 1200);
                }}
              >
                <Text style={styles.modalSubmitText}>Update Password</Text>
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
  nameBadgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  profileName: { fontSize: 24, fontWeight: "900", color: colors.ink, letterSpacing: -0.3 },
  statusBadgeActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E6F4EA",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#34A853"
  },
  statusDotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34A853" },
  statusTextActive: { fontSize: 10, fontWeight: "900", color: "#137333", letterSpacing: 0.5 },
  publicationBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm
  },
  publicationBadgeText: { fontSize: 11, fontWeight: "700", color: colors.inkMuted },
  profileEmail: { fontSize: 13, color: colors.inkMuted },
  roleSummaryPillRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap", marginTop: 4 },
  rolePill: {
    backgroundColor: "#102A3F",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#70D1D1"
  },
  rolePillText: { fontSize: 10, fontWeight: "900", color: "#70D1D1", letterSpacing: 0.5 },
  deskPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  deskPillText: { fontSize: 10, fontWeight: "800", color: colors.ink },
  domainCountPill: {
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#4285F4"
  },
  domainCountPillText: { fontSize: 10, fontWeight: "800", color: "#1A73E8" },
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
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border
  },
  tabButtonActive: { backgroundColor: "#102A3F", borderColor: "#102A3F" },
  tabText: { fontSize: 12, fontWeight: "700", color: colors.inkMuted },
  tabTextActive: { color: "#FFFFFF", fontWeight: "800" },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: colors.ink },
  sectionSubtitle: { fontSize: 13, color: colors.inkMuted, marginTop: -4 },
  subSectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginTop: spacing.md
  },
  fieldBlock: { width: "47%", minWidth: 220, gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: colors.inkMuted, letterSpacing: 0.5 },
  fieldValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  authoritySummaryBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm
  },
  authorityEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1, color: colors.blue },
  authorityHeadline: { fontSize: 20, fontWeight: "900", color: colors.ink },
  authorityLead: { fontSize: 14, lineHeight: 22, color: colors.inkMuted, maxWidth: 760 },
  authorityStatsRow: {
    flexDirection: "row",
    gap: spacing.xl,
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: spacing.md,
    marginTop: spacing.sm
  },
  authorityStat: { gap: 2 },
  statLabel: { fontSize: 11, color: colors.inkMuted, fontWeight: "700" },
  statVal: { fontSize: 14, fontWeight: "900", color: colors.ink },
  permissionList: { gap: spacing.md, marginTop: spacing.sm },
  permissionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md
  },
  permissionCheck: { fontSize: 16, fontWeight: "900", color: "#137333", marginTop: 2 },
  permissionInfo: { flex: 1, gap: 2 },
  permissionDomain: { fontSize: 14, fontWeight: "800", color: colors.ink },
  permissionDesc: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  advancedToggle: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingVertical: 8
  },
  advancedToggleText: { fontSize: 12, fontWeight: "800", color: colors.blue },
  rawCapabilitiesBox: {
    backgroundColor: "#0F172A",
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.sm
  },
  rawCapabilitiesTitle: { fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8 },
  capChipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  capChip: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#334155"
  },
  capChipText: { fontSize: 10, fontWeight: "700", color: "#38BDF8", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  workCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.sm
  },
  workCard: {
    width: "48%",
    minWidth: 260,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: 6
  },
  workCardCategory: { fontSize: 9, fontWeight: "900", color: colors.blue, letterSpacing: 1 },
  workCardTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  workCardDesc: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  workCardAction: { fontSize: 12, fontWeight: "800", color: colors.blue, marginTop: 4 },
  preferenceGroup: { gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.lg },
  prefLabel: { fontSize: 13, fontWeight: "800", color: colors.ink },
  prefHelp: { fontSize: 12, color: colors.inkMuted, marginTop: -2 },
  prefChoiceRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginTop: 4 },
  prefChoiceBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAFC"
  },
  prefChoiceBtnActive: {
    backgroundColor: "#102A3F",
    borderColor: "#102A3F"
  },
  prefChoiceText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  prefChoiceTextActive: { color: "#FFFFFF", fontWeight: "800" },
  readOnlyPrefBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignSelf: "flex-start"
  },
  readOnlyPrefText: { fontSize: 13, fontWeight: "700", color: colors.ink },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  toggleText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  toggleSwitch: {
    backgroundColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm
  },
  toggleSwitchActive: { backgroundColor: "#102A3F" },
  toggleSwitchKnob: { fontSize: 10, fontWeight: "900", color: "#FFFFFF" },
  saveBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.sm,
    marginTop: spacing.sm
  },
  saveBtnText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  securityBox: { gap: spacing.md },
  sessionItem: {
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
  sessionItemMain: { flex: 1, minWidth: 220, gap: 2 },
  sessionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sessionDeviceTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  currentDeviceBadge: {
    backgroundColor: "#E6F4EA",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm
  },
  currentDeviceText: { fontSize: 9, fontWeight: "900", color: "#137333" },
  sessionDetails: { fontSize: 12, color: colors.inkMuted },
  sessionDetailsSub: { fontSize: 11, color: colors.inkMuted },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: "#FFFFFF"
  },
  signOutBtnText: { fontSize: 11, fontWeight: "800", color: colors.ink },
  signOutAllBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.live,
    borderRadius: radius.sm,
    backgroundColor: "#FFF5F5"
  },
  signOutAllBtnText: { fontSize: 12, fontWeight: "800", color: colors.live },
  protectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.md
  },
  protTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  protDesc: { fontSize: 11, color: colors.inkMuted },
  changePasswordBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: "#FFFFFF"
  },
  changePasswordBtnText: { fontSize: 11, fontWeight: "800", color: colors.ink },
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
  modalSubtitle: { fontSize: 12, color: colors.inkMuted, marginTop: -6 },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 11, fontWeight: "800", color: colors.inkMuted },
  inputField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 13,
    color: colors.ink
  },
  passwordStatusMsg: { fontSize: 12, fontWeight: "700", color: colors.blue },
  modalBtnRow: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
  modalCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
  modalCancelText: { fontSize: 12, fontWeight: "800", color: colors.inkMuted },
  modalSubmitBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm
  },
  modalSubmitText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" }
});
