import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../theme/tokens";
import type { TableDensity } from "./StudioPreferencesContext";

export interface DashboardProps {
  density?: TableDensity;
  reviewCount?: number;
  openInvoicesCount?: number;
  overdueInvoicesCount?: number;
  pendingExpensesCount?: number;
  storiesCount?: number;
  activeStaffCount?: number | string;
  activeSessionsCount?: number | string;
  pendingInvitationsCount?: number;
  activeCampaignsCount?: number;
  openOrdersCount?: number;
  subscribersCount?: number;
  scheduledStoriesCount?: number;
  publishedTodayCount?: number;
  overdueAssignmentsCount?: number;
  userAssignmentsCount?: number;
  userDraftsCount?: number;
}

// 1. PUBLISHER / OWNER DASHBOARD (First Design Priority)
export function PublisherOwnerDashboard({
  reviewCount = 0,
  openInvoicesCount = 0,
  overdueInvoicesCount = 0,
  pendingExpensesCount = 0,
  storiesCount,
  activeStaffCount = "—",
  activeSessionsCount = "—",
  pendingInvitationsCount = 0,
  activeCampaignsCount = 0,
  openOrdersCount = 0,
  subscribersCount = 0,
  scheduledStoriesCount = 0,
  publishedTodayCount = 0,
  overdueAssignmentsCount = 0
}: DashboardProps) {
  const router = useRouter();

  return (
    <View style={styles.dashboardContainer}>
      {/* Executive Quick Actions Bar */}
      <View style={styles.quickActionsStrip}>
        <Text style={styles.quickActionsLabel}>EXECUTIVE ACTIONS:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
          <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/create-edit" as never)}>
            <Text style={styles.quickActionText}>+ Create Story</Text>
          </Pressable>
          <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/planning" as never)}>
            <Text style={styles.quickActionText}>+ Create Assignment</Text>
          </Pressable>
          <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/live-desk" as never)}>
            <Text style={styles.quickActionText}>+ Start Live Coverage</Text>
          </Pressable>
          <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/advertising" as never)}>
            <Text style={styles.quickActionText}>+ Create Campaign</Text>
          </Pressable>
          <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/orders" as never)}>
            <Text style={styles.quickActionText}>+ Create Order</Text>
          </Pressable>
          <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/finance-invoices" as never)}>
            <Text style={styles.quickActionText}>+ Create Invoice</Text>
          </Pressable>
          <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/staff-roles" as never)}>
            <Text style={styles.quickActionText}>+ Invite Staff</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Grid Section 1: TODAY & IMMEDIATE ATTENTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>1. Today's Critical Attention</Text>
        <Text style={styles.sectionTag}>REAL-TIME NEWSROOM PULSE</Text>
      </View>
      <View style={styles.gridRow}>
        <View style={[styles.card, reviewCount > 0 ? styles.alertBorder : null]}>
          <Text style={styles.cardEyebrow}>STORIES AWAITING APPROVAL</Text>
          <Text style={styles.cardHeroNumber}>{reviewCount}</Text>
          <Text style={styles.cardDesc}>
            {reviewCount > 0
              ? "Investigations and clinical reports currently awaiting editorial sign-off."
              : "Review queue is clear. No stories currently awaiting editorial sign-off."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/review-queue" as never)}>
            <Text style={styles.cardLinkText}>Open Review Queue →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>LIVE COVERAGE STATUS</Text>
          <View style={styles.liveIndicatorRow}>
            <View style={[styles.pulseLiveDot, { backgroundColor: colors.inkMuted }]} />
            <Text style={[styles.liveHeadline, { color: colors.ink }]}>STANDBY MODE</Text>
          </View>
          <Text style={styles.cardDesc}>
            No live coverage event currently streaming. Click below to launch real-time updates.
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/live-desk" as never)}>
            <Text style={styles.cardLinkText}>Manage Live Desk →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>SCHEDULED PUBLICATIONS</Text>
          <Text style={styles.cardHeroNumber}>{scheduledStoriesCount}</Text>
          <Text style={styles.cardDesc}>
            {scheduledStoriesCount > 0
              ? "Stories queued for automated release across scheduled editions."
              : "No stories currently scheduled for automated release in this cycle."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/calendar" as never)}>
            <Text style={styles.cardLinkText}>View Agenda →</Text>
          </Pressable>
        </View>
      </View>

      {/* Grid Section 2: NEWSROOM HEALTH */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>2. Newsroom Health & Editorial Velocity</Text>
        <Text style={styles.sectionTag}>EDITORIAL INTEGRITY</Text>
      </View>
      <View style={styles.gridRow}>
        <View style={styles.statMetricCard}>
          <Text style={styles.metricLabel}>Total Stories Backed</Text>
          <Text style={styles.metricBig}>{storiesCount !== undefined ? String(storiesCount) : "Unavailable"}</Text>
          <Text style={styles.metricSub}>Corpus verified</Text>
        </View>
        <View style={styles.statMetricCard}>
          <Text style={styles.metricLabel}>Published Today</Text>
          <Text style={[styles.metricBig, { color: colors.blue }]}>{publishedTodayCount}</Text>
          <Text style={styles.metricSub}>Last 24h velocity</Text>
        </View>
        <View style={styles.statMetricCard}>
          <Text style={styles.metricLabel}>Active Reporters</Text>
          <Text style={styles.metricBig}>{String(activeStaffCount)}</Text>
          <Text style={styles.metricSub}>Certified staff members</Text>
        </View>
        <View style={styles.statMetricCard}>
          <Text style={styles.metricLabel}>Overdue Assignments</Text>
          <Text style={[styles.metricBig, { color: overdueAssignmentsCount > 0 ? "#C5221F" : colors.ink }]}>
            {overdueAssignmentsCount}
          </Text>
          <Text style={styles.metricSub}>{overdueAssignmentsCount > 0 ? "Needs editor escalation" : "All deadlines on track"}</Text>
        </View>
      </View>

      {/* Grid Section 3: AUDIENCE & COMMERCIAL PERFORMANCE */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>3. Audience Reach & Distribution</Text>
        <Text style={styles.sectionTag}>CITIZEN & PROFESSIONAL REACH</Text>
      </View>
      <View style={styles.gridRow}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>MULTI-CHANNEL AUDIENCE</Text>
          <View style={styles.audienceStatsGrid}>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>Provider Pending</Text>
              <Text style={styles.audLbl}>Newsletter Subs</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>0</Text>
              <Text style={styles.audLbl}>Push Subscribers</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>0</Text>
              <Text style={styles.audLbl}>WhatsApp Readers</Text>
            </View>
          </View>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/audience" as never)}>
            <Text style={styles.cardLinkText}>Audience Intelligence →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>COMMERCIAL & SUBSCRIBERS</Text>
          <View style={styles.audienceStatsGrid}>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>{activeCampaignsCount}</Text>
              <Text style={styles.audLbl}>Active Campaigns</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>{openOrdersCount}</Text>
              <Text style={styles.audLbl}>Open Orders</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>{subscribersCount}</Text>
              <Text style={styles.audLbl}>Premium Passes</Text>
            </View>
          </View>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/advertising" as never)}>
            <Text style={styles.cardLinkText}>Commercial Desk →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>FINANCE & BILLING</Text>
          <View style={styles.audienceStatsGrid}>
            <View style={styles.audItem}>
              <Text style={[styles.audVal, { color: colors.blue }]}>{openInvoicesCount}</Text>
              <Text style={styles.audLbl}>Open Invoices</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={[styles.audVal, { color: overdueInvoicesCount > 0 ? "#C5221F" : colors.ink }]}>
                {overdueInvoicesCount}
              </Text>
              <Text style={styles.audLbl}>Overdue</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>{pendingExpensesCount}</Text>
              <Text style={styles.audLbl}>Pending Expenses</Text>
            </View>
          </View>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/finance" as never)}>
            <Text style={styles.cardLinkText}>Financial Ledger →</Text>
          </Pressable>
        </View>
      </View>

      {/* Grid Section 4: PEOPLE & GOVERNANCE */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>4. People, Governance & Security</Text>
        <Text style={styles.sectionTag}>SECURITY BOUNDARIES</Text>
      </View>
      <View style={styles.gridRow}>
        <View style={styles.cardWide}>
          <View style={styles.peopleHeaderRow}>
            <View>
              <Text style={styles.peopleTitle}>Station Staff & Access Governance</Text>
              <Text style={styles.peopleSub}>Certified roles, authenticated sessions and audit events.</Text>
            </View>
            <Pressable style={styles.peopleBtn} onPress={() => router.push("/studio/staff-roles" as never)}>
              <Text style={styles.peopleBtnText}>Manage Staff Directory →</Text>
            </Pressable>
          </View>
          <View style={styles.peopleStatusStrip}>
            <View style={styles.peoplePill}>
              <Text style={styles.peoplePillVal}>{String(activeStaffCount)}</Text>
              <Text style={styles.peoplePillLbl}>Active Staff Profiles</Text>
            </View>
            <View style={styles.peoplePill}>
              <Text style={styles.peoplePillVal}>{pendingInvitationsCount}</Text>
              <Text style={styles.peoplePillLbl}>Pending Invitations</Text>
            </View>
            <View style={styles.peoplePill}>
              <Text style={styles.peoplePillVal}>0</Text>
              <Text style={styles.peoplePillLbl}>Security Violations</Text>
            </View>
            <View style={styles.peoplePill}>
              <Text style={styles.peoplePillVal}>MFA status unavailable</Text>
              <Text style={styles.peoplePillLbl}>MFA Enforcement</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// 2. REPORTER / JOURNALIST DASHBOARD (Section 12)
export function ReporterDashboard({
  userAssignmentsCount = 0,
  userDraftsCount = 0
}: {
  userAssignmentsCount?: number;
  userDraftsCount?: number;
}) {
  const router = useRouter();

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.roleHeaderBanner}>
        <Text style={styles.roleHeaderEyebrow}>REPORTER WORKSPACE</Text>
        <Text style={styles.roleHeaderTitle}>My Assignments & Reporting Queue</Text>
        <Text style={styles.roleHeaderDesc}>Focus on reporting, drafting, field verification, and assignment deadlines.</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsStrip}>
        <Pressable style={styles.quickActionBtnPrimary} onPress={() => router.push("/studio/create-edit" as never)}>
          <Text style={styles.quickActionTextPrimary}>+ New Story Draft</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/assignments" as never)}>
          <Text style={styles.quickActionText}>Open My Assignments</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/media" as never)}>
          <Text style={styles.quickActionText}>Upload Media</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/my-expenses" as never)}>
          <Text style={styles.quickActionText}>Submit Expense Claim</Text>
        </Pressable>
      </View>

      {/* Today's Assignments */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today's Assignments & Deadlines</Text>
      </View>
      <View style={styles.gridRow}>
        <View style={[styles.card, { minWidth: "100%" }]}>
          <Text style={styles.cardEyebrow}>ASSIGNMENT QUEUE</Text>
          <Text style={styles.cardTitle}>
            {userAssignmentsCount > 0 ? `${userAssignmentsCount} Active Field Assignments` : "No Active Field Assignments"}
          </Text>
          <Text style={styles.cardDesc}>
            {userAssignmentsCount > 0
              ? "You have assignments scheduled on the news budget."
              : "You have no pending assignments with deadlines assigned to your desk. Inspect the Planning Board to pick up new assignments or pitch a story."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/planning" as never)}>
            <Text style={styles.cardLinkText}>Inspect News Budget & Planning Board →</Text>
          </Pressable>
        </View>
      </View>

      {/* Drafts in Progress */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>My Drafts & Recent Stories</Text>
      </View>
      <View style={styles.gridRow}>
        <View style={[styles.card, { minWidth: "100%" }]}>
          <Text style={styles.cardEyebrow}>AUTHOR WORKSPACE</Text>
          <Text style={styles.cardTitle}>
            {userDraftsCount > 0 ? `${userDraftsCount} Drafts in Progress` : "Story Drafting Workspace"}
          </Text>
          <Text style={styles.cardDesc}>
            {userDraftsCount > 0
              ? "Draft stories ready for further reporting and medical source verification."
              : "No unpublished drafts found for your author profile. Start a new investigation or clinical report."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/create-edit" as never)}>
            <Text style={styles.cardLinkText}>+ Start New Story Draft →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 3. EDITOR-IN-CHIEF DASHBOARD (Section 13)
export function EditorInChiefDashboard({
  reviewCount = 0,
  overdueAssignmentsCount = 0,
  scheduledStoriesCount = 0
}: {
  reviewCount?: number;
  overdueAssignmentsCount?: number;
  scheduledStoriesCount?: number;
}) {
  const router = useRouter();

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.roleHeaderBanner}>
        <Text style={styles.roleHeaderEyebrow}>EDITORIAL LEADERSHIP</Text>
        <Text style={styles.roleHeaderTitle}>Newsroom Flow & Review Pipeline</Text>
        <Text style={styles.roleHeaderDesc}>Fact checking, medical verification, copy editing, and publication queue triage.</Text>
      </View>

      <View style={styles.quickActionsStrip}>
        <Pressable style={styles.quickActionBtnPrimary} onPress={() => router.push("/studio/review-queue" as never)}>
          <Text style={styles.quickActionTextPrimary}>Open Review Queue ({reviewCount})</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/planning" as never)}>
          <Text style={styles.quickActionText}>Assign Story / News Budget</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/calendar" as never)}>
          <Text style={styles.quickActionText}>Editorial Calendar</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/live-desk" as never)}>
          <Text style={styles.quickActionText}>Start Live Desk</Text>
        </Pressable>
      </View>

      <View style={styles.gridRow}>
        <View style={[styles.card, reviewCount > 0 ? styles.alertBorder : null]}>
          <Text style={styles.cardEyebrow}>REVIEW QUEUE (HIGH PRIORITY)</Text>
          <Text style={styles.cardHeroNumber}>{reviewCount}</Text>
          <Text style={styles.cardDesc}>
            {reviewCount > 0
              ? "Stories awaiting clinical accuracy checks, legal triage, and headline polishing."
              : "Review queue is clear. No stories currently awaiting triage."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/review-queue" as never)}>
            <Text style={styles.cardLinkText}>Open Review Queue →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>OVERDUE ASSIGNMENTS</Text>
          <Text style={[styles.cardHeroNumber, { color: overdueAssignmentsCount > 0 ? "#C5221F" : colors.ink }]}>
            {overdueAssignmentsCount}
          </Text>
          <Text style={styles.cardDesc}>
            {overdueAssignmentsCount > 0
              ? "Field report past stated deadline requiring editor follow-up."
              : "No overdue assignments on the planning board."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/planning" as never)}>
            <Text style={styles.cardLinkText}>Inspect News Budget →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>READY TO PUBLISH</Text>
          <Text style={styles.cardHeroNumber}>{scheduledStoriesCount}</Text>
          <Text style={styles.cardDesc}>
            {scheduledStoriesCount > 0
              ? "Approved stories scheduled for automated newsroom distribution."
              : "No stories currently scheduled for release."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/calendar" as never)}>
            <Text style={styles.cardLinkText}>View Agenda →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 4. FINANCE MANAGER DASHBOARD (Section 14)
export function FinanceManagerDashboard({
  openInvoicesCount = 0,
  overdueInvoicesCount = 0,
  pendingExpensesCount = 0
}: {
  openInvoicesCount?: number;
  overdueInvoicesCount?: number;
  pendingExpensesCount?: number;
}) {
  const router = useRouter();

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.roleHeaderBanner}>
        <Text style={styles.roleHeaderEyebrow}>FINANCE & LEDGER OPERATIONS</Text>
        <Text style={styles.roleHeaderTitle}>Billing, Accounts Receivable & Newsroom Cashflow</Text>
        <Text style={styles.roleHeaderDesc}>Multi-currency advertising invoicing, payment reconciliation, and reporter expenses.</Text>
      </View>

      <View style={styles.quickActionsStrip}>
        <Pressable style={styles.quickActionBtnPrimary} onPress={() => router.push("/studio/finance-invoices" as never)}>
          <Text style={styles.quickActionTextPrimary}>+ Create New Invoice</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/finance-payments" as never)}>
          <Text style={styles.quickActionText}>Record Incoming Payment</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/finance-expenses" as never)}>
          <Text style={styles.quickActionText}>Review Expense Claims ({pendingExpensesCount})</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/finance-aging" as never)}>
          <Text style={styles.quickActionText}>Aged Debtors</Text>
        </Pressable>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>OPEN INVOICES</Text>
          <Text style={[styles.cardHeroNumber, { color: colors.blue }]}>{openInvoicesCount}</Text>
          <Text style={styles.cardDesc}>Commercial advertising invoices awaiting advertiser settlement.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/finance-invoices" as never)}>
            <Text style={styles.cardLinkText}>Open Invoices →</Text>
          </Pressable>
        </View>

        <View style={[styles.card, overdueInvoicesCount > 0 ? styles.alertBorder : null]}>
          <Text style={styles.cardEyebrow}>OVERDUE RECEIVABLES</Text>
          <Text style={[styles.cardHeroNumber, { color: overdueInvoicesCount > 0 ? "#C5221F" : colors.ink }]}>
            {overdueInvoicesCount}
          </Text>
          <Text style={styles.cardDesc}>Invoices past 30+ day credit terms requiring reminder issuance.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/finance-aging" as never)}>
            <Text style={styles.cardLinkText}>Review Aging Buckets →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PENDING EXPENSE CLAIMS</Text>
          <Text style={styles.cardHeroNumber}>{pendingExpensesCount}</Text>
          <Text style={styles.cardDesc}>Field reporter travel and communication reimbursements awaiting approval.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/finance-expenses" as never)}>
            <Text style={styles.cardLinkText}>Approve Expenses →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 5. COMMERCIAL MANAGER DASHBOARD (Section 15)
export function CommercialManagerDashboard({
  activeCampaignsCount = 0,
  openOrdersCount = 0,
  subscribersCount = 0
}: {
  activeCampaignsCount?: number;
  openOrdersCount?: number;
  subscribersCount?: number;
}) {
  const router = useRouter();

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.roleHeaderBanner}>
        <Text style={styles.roleHeaderEyebrow}>COMMERCIAL & MONETISATION</Text>
        <Text style={styles.roleHeaderTitle}>Advertising Campaigns, Insertion Orders & Subscribers</Text>
        <Text style={styles.roleHeaderDesc}>Sponsor relationships, insertion booking lifecycle, and reader revenue.</Text>
      </View>

      <View style={styles.quickActionsStrip}>
        <Pressable style={styles.quickActionBtnPrimary} onPress={() => router.push("/studio/advertising" as never)}>
          <Text style={styles.quickActionTextPrimary}>+ New Campaign</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/orders" as never)}>
          <Text style={styles.quickActionText}>+ New Booking Order</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/subscribers" as never)}>
          <Text style={styles.quickActionText}>Subscribers Directory</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/premium" as never)}>
          <Text style={styles.quickActionText}>Premium Entitlements</Text>
        </Pressable>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>ACTIVE AD CAMPAIGNS</Text>
          <Text style={styles.cardHeroNumber}>{activeCampaignsCount}</Text>
          <Text style={styles.cardDesc}>
            {activeCampaignsCount > 0
              ? "Direct sponsor campaigns live across editorial slots."
              : "No direct sponsor campaigns currently active. Create a new campaign to schedule placements."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/advertising" as never)}>
            <Text style={styles.cardLinkText}>View Campaigns →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>ORDERS AWAITING APPROVAL</Text>
          <Text style={styles.cardHeroNumber}>{openOrdersCount}</Text>
          <Text style={styles.cardDesc}>
            {openOrdersCount > 0
              ? "Commercial booking orders requiring management sign-off before scheduling."
              : "All commercial insertion orders have been triaged."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/orders" as never)}>
            <Text style={styles.cardLinkText}>Approve Orders →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>SUBSCRIBER ACCESS PASSES</Text>
          <Text style={styles.cardHeroNumber}>{subscribersCount}</Text>
          <Text style={styles.cardDesc}>
            {subscribersCount > 0
              ? "Active premium reader passes under AG-05 meter authority."
              : "No active subscriber passes registered in this environment."}
          </Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/subscribers" as never)}>
            <Text style={styles.cardLinkText}>Inspect Subscribers →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 6. AUDIENCE & GROWTH DASHBOARD (Section 16)
export function AudienceGrowthDashboard() {
  const router = useRouter();

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.roleHeaderBanner}>
        <Text style={styles.roleHeaderEyebrow}>AUDIENCE DISTRIBUTION & GROWTH</Text>
        <Text style={styles.roleHeaderTitle}>Newsletters, Push Alerts, WhatsApp & Social Channels</Text>
        <Text style={styles.roleHeaderDesc}>Cross-channel dispatch coordination, reader engagement, and search console health.</Text>
      </View>

      <View style={styles.quickActionsStrip}>
        <Pressable style={styles.quickActionBtnPrimary} onPress={() => router.push("/studio/newsletters" as never)}>
          <Text style={styles.quickActionTextPrimary}>+ Create Newsletter</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/push-alerts" as never)}>
          <Text style={styles.quickActionText}>+ Create Push Alert</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/whatsapp" as never)}>
          <Text style={styles.quickActionText}>+ WhatsApp Broadcast</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/social" as never)}>
          <Text style={styles.quickActionText}>+ Social Post</Text>
        </Pressable>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>NEWSLETTER DISTRIBUTION</Text>
          <Text style={styles.cardHeroNumber}>Provider Setup Pending</Text>
          <Text style={styles.cardDesc}>Brevo transactional & campaign dispatch configuration pending in staging.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/newsletters" as never)}>
            <Text style={styles.cardLinkText}>Manage Newsletters →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PUSH ALERTS</Text>
          <Text style={styles.cardHeroNumber}>0 Devices</Text>
          <Text style={styles.cardDesc}>No mobile or web notification device tokens currently registered in staging.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/push-alerts" as never)}>
            <Text style={styles.cardLinkText}>Manage Push Alerts →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>WHATSAPP CHANNEL</Text>
          <Text style={styles.cardHeroNumber}>0 Broadcasts</Text>
          <Text style={styles.cardDesc}>No broadcast dispatches recorded through Meta Cloud API in staging.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/whatsapp" as never)}>
            <Text style={styles.cardLinkText}>Broadcast Desk →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 7. SYSTEMS ADMINISTRATOR DASHBOARD (Section 17)
export function SystemsAdminDashboard({
  activeStaffCount = "—",
  activeSessionsCount = "—"
}: {
  activeStaffCount?: number | string;
  activeSessionsCount?: number | string;
}) {
  const router = useRouter();

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.roleHeaderBanner}>
        <Text style={styles.roleHeaderEyebrow}>PLATFORM GOVERNANCE & SECURITY</Text>
        <Text style={styles.roleHeaderTitle}>Staff RBAC, Active Sessions, Integrations & Audit</Text>
        <Text style={styles.roleHeaderDesc}>Identity verification, credential rotation, session revocation, and security audit log.</Text>
      </View>

      <View style={styles.quickActionsStrip}>
        <Pressable style={styles.quickActionBtnPrimary} onPress={() => router.push("/studio/staff-roles" as never)}>
          <Text style={styles.quickActionTextPrimary}>+ Invite Staff Member</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/staff-roles" as never)}>
          <Text style={styles.quickActionText}>Inspect Active Sessions</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/settings" as never)}>
          <Text style={styles.quickActionText}>Platform Settings</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/system-status" as never)}>
          <Text style={styles.quickActionText}>Infrastructure Health</Text>
        </Pressable>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>ACTIVE STAFF ACCOUNTS</Text>
          <Text style={styles.cardHeroNumber}>{String(activeStaffCount)}</Text>
          <Text style={styles.cardDesc}>Certified newsroom staff accounts registered in directory.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/staff-roles" as never)}>
            <Text style={styles.cardLinkText}>Review Staff Directory →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>ACTIVE SESSIONS</Text>
          <Text style={styles.cardHeroNumber}>{String(activeSessionsCount)}</Text>
          <Text style={styles.cardDesc}>Server-registered sessions tracked in newsroom_sessions.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/staff-roles" as never)}>
            <Text style={styles.cardLinkText}>Inspect Sessions →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PROVIDER INTEGRATIONS</Text>
          <Text style={[styles.cardHeroNumber, { color: "#137333" }]}>OPERATIONAL</Text>
          <Text style={styles.cardDesc}>Staging Supabase Auth, Storage, and newsroom bridges verified.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/settings" as never)}>
            <Text style={styles.cardLinkText}>Platform Settings →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardContainer: { gap: spacing.xl },
  roleHeaderBanner: {
    backgroundColor: "#102A3F",
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: 4
  },
  roleHeaderEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#70D1D1" },
  roleHeaderTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  roleHeaderDesc: { fontSize: 13, color: "#A7BDCE", maxWidth: 720 },
  quickActionsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    flexWrap: "wrap"
  },
  quickActionsLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 0.8, color: colors.inkMuted },
  quickActionsScroll: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  quickActionBtn: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.sm
  },
  quickActionText: { fontSize: 12, fontWeight: "800", color: colors.ink },
  quickActionBtnPrimary: {
    backgroundColor: colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm
  },
  quickActionTextPrimary: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: colors.ink },
  sectionTag: { fontSize: 9, fontWeight: "900", letterSpacing: 1, color: colors.inkMuted },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  card: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    justifyContent: "space-between"
  },
  cardWide: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  alertBorder: { borderLeftWidth: 4, borderLeftColor: colors.blue },
  cardEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1, color: colors.inkMuted },
  cardHeroNumber: { fontSize: 32, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  cardDesc: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  cardLink: { alignSelf: "flex-start", marginTop: spacing.sm },
  cardLinkText: { fontSize: 12, fontWeight: "800", color: colors.blue },
  liveIndicatorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: 4 },
  pulseLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
  liveHeadline: { fontSize: 13, fontWeight: "900", color: colors.live, letterSpacing: 0.5 },
  statMetricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2
  },
  metricLabel: { fontSize: 11, fontWeight: "700", color: colors.inkMuted },
  metricBig: { fontSize: 24, fontWeight: "900", color: colors.ink },
  metricSub: { fontSize: 11, color: colors.inkMuted },
  audienceStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginVertical: spacing.sm
  },
  audItem: { gap: 2 },
  audVal: { fontSize: 16, fontWeight: "900", color: colors.ink },
  audLbl: { fontSize: 10, fontWeight: "700", color: colors.inkMuted },
  peopleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md
  },
  peopleTitle: { fontSize: 15, fontWeight: "900", color: colors.ink },
  peopleSub: { fontSize: 12, color: colors.inkMuted },
  peopleBtn: { paddingVertical: 4 },
  peopleBtnText: { fontSize: 12, fontWeight: "800", color: colors.blue },
  peopleStatusStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  peoplePill: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#F8FAFC",
    padding: spacing.md,
    borderRadius: radius.sm,
    gap: 2
  },
  peoplePillVal: { fontSize: 18, fontWeight: "900", color: colors.ink },
  peoplePillLbl: { fontSize: 11, fontWeight: "700", color: colors.inkMuted }
});
