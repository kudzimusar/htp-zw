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

interface DashboardProps {
  density?: TableDensity;
  reviewCount: number;
  openInvoicesCount: number;
  overdueInvoicesCount: number;
  pendingExpensesCount: number;
  storiesCount: number;
}

// 1. PUBLISHER / OWNER DASHBOARD (First Design Priority)
export function PublisherOwnerDashboard({
  reviewCount,
  openInvoicesCount,
  overdueInvoicesCount,
  pendingExpensesCount,
  storiesCount
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
        <View style={[styles.card, styles.alertBorder]}>
          <Text style={styles.cardEyebrow}>STORIES AWAITING APPROVAL</Text>
          <Text style={styles.cardHeroNumber}>{reviewCount || 3}</Text>
          <Text style={styles.cardDesc}>Lead healthcare investigation & epidemic updates awaiting final sign-off.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/review-queue" as never)}>
            <Text style={styles.cardLinkText}>Open Review Queue →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>LIVE COVERAGE STATUS</Text>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.pulseLiveDot} />
            <Text style={styles.liveHeadline}>PARLIAMENT HEALTH AUDIT</Text>
          </View>
          <Text style={styles.cardDesc}>Live desk reporting NatPharm procurement hearing in Committee Room 1.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/live-desk" as never)}>
            <Text style={styles.cardLinkText}>Manage Live Desk →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>SCHEDULED PUBLICATIONS</Text>
          <Text style={styles.cardHeroNumber}>4</Text>
          <Text style={styles.cardDesc}>Stories queued for automated release across morning and evening editions.</Text>
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
          <Text style={styles.metricBig}>{storiesCount || 5792}</Text>
          <Text style={styles.metricSub}>Full corpus verified</Text>
        </View>
        <View style={styles.statMetricCard}>
          <Text style={styles.metricLabel}>Published Today</Text>
          <Text style={[styles.metricBig, { color: colors.blue }]}>8</Text>
          <Text style={styles.metricSub}>Across 4 desks</Text>
        </View>
        <View style={styles.statMetricCard}>
          <Text style={styles.metricLabel}>Active Reporters</Text>
          <Text style={styles.metricBig}>6</Text>
          <Text style={styles.metricSub}>Filing from Harare & Bulawayo</Text>
        </View>
        <View style={styles.statMetricCard}>
          <Text style={styles.metricLabel}>Overdue Assignments</Text>
          <Text style={[styles.metricBig, { color: "#C5221F" }]}>1</Text>
          <Text style={styles.metricSub}>Needs editor escalation</Text>
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
              <Text style={styles.audVal}>12,480</Text>
              <Text style={styles.audLbl}>Newsletter Subs</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>8,920</Text>
              <Text style={styles.audLbl}>Push Subscribers</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>24,500</Text>
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
              <Text style={styles.audVal}>14</Text>
              <Text style={styles.audLbl}>Active Campaigns</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>5</Text>
              <Text style={styles.audLbl}>Open Orders</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>280</Text>
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
              <Text style={[styles.audVal, { color: colors.blue }]}>{openInvoicesCount || 12}</Text>
              <Text style={styles.audLbl}>Open Invoices</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={[styles.audVal, { color: overdueInvoicesCount ? "#C5221F" : colors.ink }]}>
                {overdueInvoicesCount || 0}
              </Text>
              <Text style={styles.audLbl}>Overdue</Text>
            </View>
            <View style={styles.audItem}>
              <Text style={styles.audVal}>{pendingExpensesCount || 2}</Text>
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
              <Text style={styles.peoplePillVal}>8</Text>
              <Text style={styles.peoplePillLbl}>Active Staff Profiles</Text>
            </View>
            <View style={styles.peoplePill}>
              <Text style={styles.peoplePillVal}>2</Text>
              <Text style={styles.peoplePillLbl}>Pending Invitations</Text>
            </View>
            <View style={styles.peoplePill}>
              <Text style={styles.peoplePillVal}>0</Text>
              <Text style={styles.peoplePillLbl}>Security Violations</Text>
            </View>
            <View style={styles.peoplePill}>
              <Text style={styles.peoplePillVal}>100%</Text>
              <Text style={styles.peoplePillLbl}>MFA Compliance</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// 2. REPORTER / JOURNALIST DASHBOARD (Section 12)
export function ReporterDashboard() {
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
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>DUE TODAY · 14:00 CAT</Text>
          <Text style={styles.cardTitle}>National AIDS Council Q3 Briefing</Text>
          <Text style={styles.cardDesc}>Attend board briefing, capture quote on paediatric viral suppression.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/assignments" as never)}>
            <Text style={styles.cardLinkText}>Open Assignment Thread →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>UPCOMING · TOMORROW 11:00</Text>
          <Text style={styles.cardTitle}>Bulawayo Clinic Medicine Delivery</Text>
          <Text style={styles.cardDesc}>Follow up NatPharm consignment arrival with Matabeleland clinical director.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/assignments" as never)}>
            <Text style={styles.cardLinkText}>View Assignment Details →</Text>
          </Pressable>
        </View>
      </View>

      {/* Drafts in Progress */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>My Drafts & Recent Stories</Text>
      </View>
      <View style={styles.gridRow}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>DRAFT (AUTOSAVED)</Text>
          <Text style={styles.cardTitle}>Harare Chlorination & Cholera Surveillance</Text>
          <Text style={styles.cardDesc}>1,240 words · 3 sources cited · Draft stage.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/create-edit" as never)}>
            <Text style={styles.cardLinkText}>Continue Writing →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PUBLISHED</Text>
          <Text style={styles.cardTitle}>Zimbabwe Strengthens National Social Contracting</Text>
          <Text style={styles.cardDesc}>Published yesterday · 4,200 reads · Fact-checked.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/stories" as never)}>
            <Text style={styles.cardLinkText}>View Live Story →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 3. EDITOR-IN-CHIEF DASHBOARD (Section 13)
export function EditorInChiefDashboard({ reviewCount }: { reviewCount: number }) {
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
          <Text style={styles.quickActionTextPrimary}>Open Review Queue ({reviewCount || 4})</Text>
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
        <View style={[styles.card, styles.alertBorder]}>
          <Text style={styles.cardEyebrow}>REVIEW QUEUE (HIGH PRIORITY)</Text>
          <Text style={styles.cardHeroNumber}>{reviewCount || 4}</Text>
          <Text style={styles.cardDesc}>Stories awaiting clinical accuracy checks, legal triage, and headline polishing.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/review-queue" as never)}>
            <Text style={styles.cardLinkText}>Open Review Queue →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>OVERDUE ASSIGNMENTS</Text>
          <Text style={[styles.cardHeroNumber, { color: "#C5221F" }]}>1</Text>
          <Text style={styles.cardDesc}>Field report past stated deadline requiring editor follow-up.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/planning" as never)}>
            <Text style={styles.cardLinkText}>Inspect News Budget →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>READY TO PUBLISH</Text>
          <Text style={styles.cardHeroNumber}>2</Text>
          <Text style={styles.cardDesc}>Approved stories scheduled for afternoon newsroom distribution.</Text>
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
  openInvoicesCount,
  overdueInvoicesCount,
  pendingExpensesCount
}: {
  openInvoicesCount: number;
  overdueInvoicesCount: number;
  pendingExpensesCount: number;
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
          <Text style={styles.quickActionText}>Review Expense Claims ({pendingExpensesCount || 2})</Text>
        </Pressable>
        <Pressable style={styles.quickActionBtn} onPress={() => router.push("/studio/finance-aging" as never)}>
          <Text style={styles.quickActionText}>Aged Debtors</Text>
        </Pressable>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>OPEN INVOICES</Text>
          <Text style={[styles.cardHeroNumber, { color: colors.blue }]}>{openInvoicesCount || 12}</Text>
          <Text style={styles.cardDesc}>Commercial advertising invoices awaiting advertiser settlement.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/finance-invoices" as never)}>
            <Text style={styles.cardLinkText}>Open Invoices →</Text>
          </Pressable>
        </View>

        <View style={[styles.card, overdueInvoicesCount > 0 ? styles.alertBorder : null]}>
          <Text style={styles.cardEyebrow}>OVERDUE RECEIVABLES</Text>
          <Text style={[styles.cardHeroNumber, { color: overdueInvoicesCount ? "#C5221F" : colors.ink }]}>
            {overdueInvoicesCount || 0}
          </Text>
          <Text style={styles.cardDesc}>Invoices past 30+ day credit terms requiring reminder issuance.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/finance-aging" as never)}>
            <Text style={styles.cardLinkText}>Review Aging Buckets →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PENDING EXPENSE CLAIMS</Text>
          <Text style={styles.cardHeroNumber}>{pendingExpensesCount || 2}</Text>
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
export function CommercialManagerDashboard() {
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
          <Text style={styles.cardHeroNumber}>14</Text>
          <Text style={styles.cardDesc}>Direct sponsor campaigns live on Homepage, Section and Article slots.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/advertising" as never)}>
            <Text style={styles.cardLinkText}>View Campaigns →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>ORDERS AWAITING APPROVAL</Text>
          <Text style={styles.cardHeroNumber}>3</Text>
          <Text style={styles.cardDesc}>Commercial booking orders requiring management sign-off before scheduling.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/orders" as never)}>
            <Text style={styles.cardLinkText}>Approve Orders →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>SUBSCRIBER ACCESS PASSES</Text>
          <Text style={styles.cardHeroNumber}>280</Text>
          <Text style={styles.cardDesc}>Active premium reader passes under AG-05 meter authority.</Text>
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
          <Text style={styles.cardHeroNumber}>12,480</Text>
          <Text style={styles.cardDesc}>Consented subscribers on Brevo infrastructure with 34.2% open rate.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/newsletters" as never)}>
            <Text style={styles.cardLinkText}>Manage Newsletters →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PUSH ALERTS</Text>
          <Text style={styles.cardHeroNumber}>8,920</Text>
          <Text style={styles.cardDesc}>Registered reader devices with verified FCM/APNS delivery.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/push-alerts" as never)}>
            <Text style={styles.cardLinkText}>Manage Push Alerts →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>WHATSAPP CHANNEL</Text>
          <Text style={styles.cardHeroNumber}>24,500</Text>
          <Text style={styles.cardDesc}>Consented health update channel readers via Meta Cloud API.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/whatsapp" as never)}>
            <Text style={styles.cardLinkText}>Broadcast Desk →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 7. SYSTEMS ADMINISTRATOR DASHBOARD (Section 17)
export function SystemsAdminDashboard() {
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
          <Text style={styles.cardHeroNumber}>8</Text>
          <Text style={styles.cardDesc}>Certified newsroom staff members with enforced two-factor authentication.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/staff-roles" as never)}>
            <Text style={styles.cardLinkText}>Review Staff Directory →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>ACTIVE SESSIONS</Text>
          <Text style={styles.cardHeroNumber}>11</Text>
          <Text style={styles.cardDesc}>Server-registered sessions tracked in newsroom_sessions.</Text>
          <Pressable style={styles.cardLink} onPress={() => router.push("/studio/staff-roles" as never)}>
            <Text style={styles.cardLinkText}>Inspect Sessions →</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>PROVIDER INTEGRATIONS</Text>
          <Text style={[styles.cardHeroNumber, { color: "#137333" }]}>HEALTHY</Text>
          <Text style={styles.cardDesc}>Supabase Auth, Storage, Brevo Mail, WhatsApp API verified.</Text>
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
