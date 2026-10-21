import { useLocalSearchParams } from "expo-router";
import { Text, View, StyleSheet } from "react-native";
import { StudioAccessGate, StudioAnyCapabilityGate, StudioAuthorityGate, StudioPlaceholder, StudioShell } from "../../src/ui/Studio";
import { NEWSLETTER_DESK_CAPABILITIES, PUSH_DESK_CAPABILITIES, SOCIAL_DESK_CAPABILITIES, STAFF_DESK_CAPABILITIES, WHATSAPP_DESK_CAPABILITIES, type HealthTimesCapability } from "../../src/security/capabilities";
import { colors, radius, spacing } from "../../src/theme/tokens";
import { StudioInboxPanel } from "../../src/ui/StudioInbox";
import {
  StudioAssignmentDiscussionPanel,
  StudioAssignmentsPanel,
  StudioBreakingPanel,
  StudioDeskThreadsPanel,
  StudioDesksPanel,
  StudioModerationPanel,
  StudioStoryDiscussionPanel,
  StudioThreadPanel
} from "../../src/ui/StudioCommunications";
import { StudioStories } from "../../src/ui/StudioStories";
import { StudioStoryWorkspace } from "../../src/ui/StudioStoryWorkspace";
import { StudioReviewQueue } from "../../src/ui/StudioReviewQueue";
import { StudioPlanningBoard } from "../../src/ui/StudioPlanningBoard";
import { StudioEditorialCalendar } from "../../src/ui/StudioEditorialCalendar";
import { StudioHomepage } from "../../src/ui/StudioHomepage";
import { StudioMediaLibrary } from "../../src/ui/StudioMediaLibrary";
import { StudioVideoDesk } from "../../src/ui/StudioVideoDesk";
import { StudioLiveDesk } from "../../src/ui/StudioLiveDesk";
import { StudioSocialDesk } from "../../src/ui/StudioSocialDesk";
import { StudioNewsletterDesk } from "../../src/ui/StudioNewsletterDesk";
import { StudioPushAlertDesk } from "../../src/ui/StudioPushAlertDesk";
import { StudioWhatsAppDesk } from "../../src/ui/StudioWhatsAppDesk";
import { StudioAnalyticsDesk } from "../../src/ui/StudioAnalyticsDesk";
import { StudioAudienceDesk } from "../../src/ui/StudioAudienceDesk";
import { StudioSearchGrowthDesk } from "../../src/ui/StudioSearchGrowthDesk";
import { StudioStaffRolesDesk } from "../../src/ui/StudioStaffRolesDesk";
import { StudioAdvertisingDesk } from "../../src/ui/StudioAdvertisingDesk";
import { StudioSubscribersDesk } from "../../src/ui/StudioSubscribersDesk";
import { StudioPremiumDesk } from "../../src/ui/StudioPremiumDesk";
import { StudioAiDesk } from "../../src/ui/StudioAiDesk";
import { StudioAuthorsDesk } from "../../src/ui/StudioAuthorsDesk";
import { StudioSettingsDesk } from "../../src/ui/StudioSettingsDesk";
import { StudioFinanceDeskView } from "../../src/ui/StudioFinanceDesk";
import {
  ADVERTISING_DESK_CAPABILITIES,
  SUBSCRIBER_DESK_CAPABILITIES,
  PREMIUM_DESK_CAPABILITIES,
  AI_DESK_CAPABILITIES,
  AUTHORS_DESK_CAPABILITIES,
  SETTINGS_DESK_CAPABILITIES,
  FINANCE_DESK_CAPABILITIES
} from "../../src/security/capabilities";

export function generateStaticParams() {
  return [
    "inbox", "assignments", "planning", "calendar", "stories", "create-edit", "review-queue", "homepage", "live-desk", "video-desk", "desks", "breaking", "moderation", "media", "advertising", "premium", "social", "newsletters", "push-alerts", "whatsapp",
    "audience", "search-growth", "analytics", "subscribers", "authors", "staff-roles", "settings", "ai-desk",
    "finance", "finance-invoices", "finance-aging", "finance-payments", "finance-expenses", "my-expenses", "finance-statements", "finance-customers", "orders"
  ].map((module) => ({ module }));
}

type ModuleConfig={
  title:string;
  owner:string;
  description:string;
  capability:HealthTimesCapability|null;
  anyOfCapabilities?:readonly HealthTimesCapability[];
  readiness:string[];
};

const owners:Record<string,ModuleConfig>={
  "inbox":{title:"Inbox",owner:"CA-01 / AG-06",capability:null,description:"Durable assignments, mentions, reviews, urgent work and announcements. Access requires a server-authorized Newsroom session.",readiness:["Inbox RPC contract defined","No local role authority","Realtime remains event transport only"]},
  "assignments":{title:"Assignments",owner:"CA-01 / AG-06",capability:null,description:"Authoritative story assignments remain in story_assignments; discussion uses a typed assignment thread only.",readiness:["Assignment state remains specialized","Discussion does not duplicate assignment state","RLS scopes each staff session"]},
  "planning":{title:"News Budget / Planning",owner:"HT-NR-03A",capability:null,description:"Operational editorial planning, news budget and assignment management backed by canonical story assignments.",readiness:["Canonical story_assignments authority","Strict assignment.manage capability enforcement","Authoritative server progression (Assigned -> Complete)","Zero fabricated reporters or assignments","Deep workspace handoff to StudioStoryWorkspace"]},
  "calendar":{title:"Editorial Calendar",owner:"HT-NR-03B",capability:null,description:"Read-only editorial calendar and agenda derived from canonical story deadlines, scheduled publications, and server-scoped assignment deadlines.",readiness:["Derived from canonical stories.deadline_at, stories.scheduled_at, and story_assignments.deadline_at","Server-scoped via newsroom_list_stories and assignment RLS","Agenda and 7-day Week views with deterministic urgency","Zero fabricated generic events or historical publication noise","Deep handoffs to Story Workspace, Assignments, and Planning"]},
  "desks":{title:"Desks",owner:"CA-01 / AG-06",capability:null,description:"Private specialist coordination uses Newsroom desk membership and server-enforced thread access.",readiness:["Desk membership is server-owned","Thread access enforced below UI","Presence not used for authority"]},
  "breaking":{title:"Breaking",owner:"CA-01 / AG-06",capability:null,description:"Temporary breaking rooms use bounded membership, durable messages and restrained Presence.",readiness:["Breaking-room contract defined","Durable messages authoritative","Presence is non-authoritative"]},
  "moderation":{title:"Moderation",owner:"CA-01 / AG-06",capability:"comment.moderate",description:"Verified-reader comments remain a separate security domain with human moderation and restriction history.",readiness:["Reader and staff comments remain separate","Canonical story UUID required","Health misinformation requires human review"]},
  "stories":{title:"Stories",owner:"HT-NR-02A",capability:null,description:"Server-backed Newsroom stories, drafts, review states, access policies and editorial lifecycle.",readiness:["Server-backed listing active","Filtered by status, desk and policy","Gated 'New Story' creation"]},
  // In-workspace capability checks: capability:"story.create"
  "create-edit":{title:"Story Workspace",owner:"HT-NR-02A",capability:null,description:"Professional editorial workspace with writing, reporting, canonical metadata, review workflow, history and autosave.",readiness:["Route entry uses StudioAuthorityGate; creation gated inside workspace","Optimistic concurrency with lock_version","Debounced autosave (~10s)","Canonical public author and section authority","Review records and revision restoration"]},
  "review-queue":{title:"Review Queue",owner:"HT-NR-02B",capability:null,description:"Operational editorial review queue and triage desk derived from canonical server story workflow data.",readiness:["Queue derived from canonical server stories","Operational triage filtering: workflow state, desk, reporter, overdue, deadline","Deterministic priority ordering: overdue, imminent deadline, review state urgency","Canonical workspace handoff to StudioStoryWorkspace","Fail-closed empty, unauthorized and error states"]},
  "homepage":{title:"Homepage",owner:"HT-NR-04A",capability:"distribution.manage" as const,description:"Editorial homepage presentation control-plane for Hero, Top Stories, and Curated Sections backed by canonical story distribution metadata.",readiness:["Canonical stories.distribution.homepage metadata authority","Strict distribution.manage capability enforcement","Hero (max 1) and Top Stories (ranks 1-6) curation","Manual curated sections: features, public-health, research, health-business, hiv-aids, global-health, premium, further-coverage","Preserves unknown distribution keys and optimistic lock_version concurrency"]},
  "live-desk":{title:"Live Desk",owner:"HT-NR-05D-A",capability:"story.publish" as const,description:"Canonical live coverage control-plane, scheduling, related story association, and public Live projection.",readiness:["Canonical newsroom_live_coverage authority","Strict story.publish capability enforcement","Optimistic concurrency via lock_version","Upcoming, Live, and Ended lifecycle","Related story and verified public media projection"]},
  "video-desk":{title:"Video Desk",owner:"HT-NR-05C-A",capability:"media.manage" as const,description:"Canonical video desk registry, editorial metadata and readiness operations backed by server video RPCs.",readiness:["Canonical newsroom_videos authority","Strict media.manage capability enforcement","Optimistic concurrency via lock_version","Draft and Ready editorial lifecycle","Related story association and verified destination metadata"]},
  "media":{title:"Media Library",owner:"HT-NR-05A",capability:"media.manage" as const,description:"Canonical media library and metadata operations backed by server media RPCs (newsroom_list_media, newsroom_get_media_preview, newsroom_update_story_media_metadata).",readiness:["Canonical newsroom_list_media authority","Strict media.manage capability enforcement","Authoritative metadata updates via newsroom_update_story_media_metadata","Full mime type classification & storage custody transparency","Safe preview isolation & deep story usage handoff"]},
  "advertising":{title:"Advertising Manager",owner:"HT-NR-CLOSE Wave D",capability:null,anyOfCapabilities:ADVERTISING_DESK_CAPABILITIES,description:"Direct advertising campaigns, creative asset review, advertiser accounts, and layout placement governance backed by canonical server RPCs.",readiness:["Canonical advertisers, ad_campaigns, ad_creatives, and ad_placements authority","Strict ads.view read and ads.create/ads.approve mutation enforcement","Distinct creation vs editorial approval vs activation lifecycle","Immutable audit trail logging for all commercial mutations"]},
  "premium":{title:"Premium Policies & Monetization",owner:"HT-NR-CLOSE Wave D",capability:null,anyOfCapabilities:PREMIUM_DESK_CAPABILITIES,description:"Editorial access policies, meter paywall governance, AG-05 teaser authority, and subscriber entitlement channel breakdown.",readiness:["Canonical stories.access_policy and premium_entitlements authority","AG-05 teaser rule certified: exactly 1 paragraph for 20 seconds","Strict premium.assign and premium.manage capability enforcement","Real story inventory metrics: public open access vs premium subscriber works"]},
  "social":{title:"Social Desk",owner:"HT-NR-06A",capability:null,anyOfCapabilities:SOCIAL_DESK_CAPABILITIES,description:"Story-linked social draft composition, editorial approval, and provider publication handoff backed by canonical social_accounts, social_posts, and social_publication_attempts.",readiness:["Canonical social_accounts, social_posts, and social_publication_attempts authority","Scoped social.compose, social.approve, social.publish, and social.manage_accounts enforcement","Distinct editorial approval vs publication preparation handoff","Service-role provider completion remains server-only","Zero fabricated provider accounts in operational runtime"]},
  "newsletters":{title:"Newsletter Desk",owner:"HT-NR-06B",capability:null,anyOfCapabilities:NEWSLETTER_DESK_CAPABILITIES,description:"Newsletter and consented campaign composition, human approval, and Brevo send preparation handoff backed by canonical audience_campaigns and contact_segments.",readiness:["Canonical audience_campaigns and contact_segments authority","Scoped marketing.create, marketing.approve, marketing.send, and marketing.analytics enforcement","Distinct human approval vs consented send preparation handoff","Aggregate eligibility summary only; zero recipient email exposure","Service-role provider completion remains server-only"]},
  "push-alerts":{title:"Push Alert Desk",owner:"HT-NR-06C-A",capability:null,anyOfCapabilities:PUSH_DESK_CAPABILITIES,description:"Reader push alert composition, editorial approval, and notification dispatch preparation backed by canonical newsroom_push_alerts and reader_push_devices.",readiness:["Canonical newsroom_push_alerts and reader_push_devices authority","Scoped distribution.manage and story.publish enforcement","Distinct editorial approval vs dispatch preparation handoff","Aggregate eligibility summary only; zero push token or reader identity exposure","Native push dispatch provider completion remains server-only"]},
  "whatsapp":{title:"WhatsApp Desk",owner:"HT-NR-06D",capability:null,anyOfCapabilities:WHATSAPP_DESK_CAPABILITIES,description:"WhatsApp broadcast composition, editorial approval, and WhatsApp Cloud API distribution ledger backed by canonical newsroom_whatsapp_broadcasts and newsroom_whatsapp_dispatches.",readiness:["Canonical newsroom_whatsapp_broadcasts and newsroom_whatsapp_dispatches authority","Scoped distribution.manage and story.publish enforcement","Distinct editorial approval vs dispatch execution handoff","Aggregate recipient & delivery counters; zero phone number exposure","WhatsApp Cloud API provider completion with single-dispatch idempotency"]},
  "audience":{title:"Audience",owner:"HT-NR-CLOSE Wave B",capability:"analytics.view",description:"Audience intelligence uses real first-party subscriber counts, registered push devices, and GA4 property authority.",readiness:["Canonical contact_profiles, reader_push_devices and subscriber counts","GA4 property 359235319 authority verified","Truthful unconfigured states for pending Data API access","Zero fabricated audience metrics"]},
  "search-growth":{title:"Search & Growth",owner:"HT-NR-CLOSE Wave B",capability:"analytics.view",description:"Search Console, SEO health audit, and global health research citations backed by canonical server intelligence RPCs.",readiness:["Google Search Console property https://healthtimes.co.zw/ verified","Server-backed SEO health audit over 5,792 stories","Truthful unconfigured state for pending OAuth query ingestion","Zero fabricated search impressions or revenue"]},
  "analytics":{title:"Analytics & Intelligence",owner:"HT-NR-CLOSE Wave B",capability:"analytics.view",description:"Operational Newsroom KPIs, story inventory, publishing velocity, desk mix, and verified external growth integrations.",readiness:["Canonical stories inventory and velocity authority","Strict analytics.view capability enforcement","Real review queue health and active assignment tracking","External provider status tracking (GA4, Search Console, AdSense, PageSpeed)","Zero simulated revenue or fake analytics presented as truth"]},
  "subscribers":{title:"Subscribers & Entitlements",owner:"HT-NR-CLOSE Wave D",capability:null,anyOfCapabilities:SUBSCRIBER_DESK_CAPABILITIES,description:"Verified reader subscriber registry, access pass grant management, status lifecycle, and entitlement duration tracking backed by canonical server RPCs.",readiness:["Canonical subscribers and premium_entitlements database authority","Strict subscriber.view read and subscriber.manage mutation enforcement","Verified active vs expired access pass calculations","Immutable audit trail logging for subscriber status updates and grants"]},
  "authors":{title:"Authors & Taxonomy Desk",owner:"HT-NR-CLOSE Wave F",capability:null,anyOfCapabilities:AUTHORS_DESK_CAPABILITIES,description:"Public byline registry, WordPress migration provenance, staff profile reconciliation, and hierarchical taxonomy sections.",readiness:["Canonical authors, sections, and staff_profiles authority","Strict staff.view read and staff.manage mutation enforcement","Migrated WordPress author provenance and story counts","Staff profile byline binding without duplicate identities"]},
  "staff-roles":{title:"Staff & Roles",owner:"HT-NR-CLOSE Wave C",capability:null,anyOfCapabilities:STAFF_DESK_CAPABILITIES,description:"Staff directory, role assignments, capabilities, status management, session revocation, and security audit trail backed by canonical newsroom RPCs.",readiness:["Canonical staff_profiles, newsroom_roles, and newsroom_capabilities authority","Strict staff.view read and staff.manage mutation enforcement","Session revocation and status lifecycle safety with self-escalation protection","Immutable audit log integration for all administrative actions"]},
  "ai-desk":{title:"AI Editorial Assistant & Citations Desk",owner:"HT-NR-CLOSE Wave E",capability:null,anyOfCapabilities:AI_DESK_CAPABILITIES,description:"Editorial research assistance, headline alternatives, evidence gap detection, and verified citation intelligence.",readiness:["Canonical newsroom_ai_assist_sessions and citation_references authority","Strict zero direct publishing authority principle enforced","Human-in-the-loop review required for all generated copy suggestions","Audited execution logging for all assistant tasks and citation verifications"]},
  "settings":{title:"Platform & Integration Settings",owner:"HT-NR-CLOSE Wave F",capability:null,anyOfCapabilities:SETTINGS_DESK_CAPABILITIES,description:"Centralized newsroom integrations, distribution transports, editorial guardrails, and environment health.",readiness:["Canonical platform_settings database authority","Strict settings.manage and security.manage capability enforcement","Zero raw secret tokens exposed to client application","Operational toggles for review enforcement, comments, and paywall","Tamper-evident audit logging on all setting modifications"]},
  "finance":{title:"Financial Overview & KPIs",owner:"HT-NR-UI-01",capability:"finance.view" as const,description:"Operational finance overview, multi-currency invoicing, accounts receivable, and cash metrics.",readiness:["Canonical finance_invoices, finance_payments, and finance_expenses database authority","Strict finance.view capability enforcement","Exact numeric(18,2) multi-currency accounting without client-side floating point math","Immutable audit log integration for all financial transactions"]},
  "finance-invoices":{title:"Invoices & Billing",owner:"HT-NR-UI-01",capability:"finance.invoice.create" as const,description:"Commercial advertising invoicing, invoice status lifecycle, approvals, and issuance.",readiness:["Canonical finance_invoices and finance_invoice_lines authority","Strict separation of duties: creator cannot approve invoice","Sequential INV-YYYY-NNNN numbering","Status lifecycle: draft -> approved -> issued -> partially_paid -> paid / void"]},
  "finance-aging":{title:"Accounts Receivable Aging",owner:"HT-NR-UI-01",capability:"finance.receivable.view" as const,description:"Aged debtor analysis across standard aging buckets: Not Due, 1-30, 31-60, 61-90, and 90+ days.",readiness:["Real-time overdue day calculations from issue_date and payment terms","Separated per-customer balances and multi-currency totals","Zero fabricated aging numbers"]},
  "finance-payments":{title:"Payments & Cash Ledger",owner:"HT-NR-UI-01",capability:"finance.payment.record" as const,description:"Immutable payment ledger, idempotency keys, overpayment guards, and cash receipt reconciliation.",readiness:["Immutable payment rows: update and delete prohibited via database trigger","Enforced unique idempotency keys per invoice payment attempt","Overpayment prevention: payments exceeding balance due fail-closed","Sequential PAY-YYYY-NNNN numbering"]},
  "finance-expenses":{title:"Newsroom Expense Claims",owner:"HT-NR-UI-01",capability:"finance.expense.view" as const,description:"Operational editorial, field reporting, freelance, and department expense claims.",readiness:["Canonical finance_expenses and finance_expense_categories authority","Strict separation of duties: submitter cannot approve own expense","Sequential EXP-YYYY-NNNN numbering","Status lifecycle: draft -> submitted -> approved / rejected -> paid"]},
  "my-expenses":{title:"My Filed Expense Claims",owner:"HT-NR-UI-01",capability:null,description:"Personal expense claims and reimbursement status for the active staff member.",readiness:["Scoped to current authenticated staff member profile","Submit field reporting costs, travel, and freelance expenses","Real-time approval and payment status tracking"]},
  "finance-statements":{title:"Operational Financial Statements",owner:"HT-NR-UI-01",capability:"finance.statement.view" as const,description:"Operating income statement, placement revenue breakdown, cash receipts, and expense summaries.",readiness:["Truthful operational reporting per ISO currency without FX conversion","Explicitly declares Balance Sheet unavailable until full General Ledger phase","Deterministic revenue by placement aggregation"]},
  "finance-customers":{title:"Billing Customers & Directory",owner:"HT-NR-UI-01",capability:"finance.view" as const,description:"Commercial advertiser billing profiles, payment terms, currency preferences, and tax identification numbers.",readiness:["Canonical finance_customers database authority","Strict corporate profile validation","Foreign key linkage to commercial advertisers"]},
  "orders":{title:"Commercial Orders & Bookings",owner:"HT-NR-UI-01",capability:"commercial.order.create" as const,description:"Commercial advertising insertion orders, campaign bookings, and billing status.",readiness:["Canonical commercial_orders database authority","Sequential ORD-YYYY-NNNN numbering","Separation of duties: order submitter cannot self-approve","Billing status tracking: unbilled -> partially_billed -> billed"]}
};

export default function StudioModule(){
  const {module,deskId,threadId,assignmentId,storyId}=useLocalSearchParams<{module:string;deskId?:string;threadId?:string;assignmentId?:string;storyId?:string}>();
  const config=owners[String(module)] ?? {
    title:"Studio",
    owner:"AG-06",
    capability:"staff.view" as const,
    description:"This module requires an AG-owned backend contract.",
    readiness:["Backend contract required"]
  };

  const content=(
    <>
      {String(module)!=="stories" && String(module)!=="create-edit" && String(module)!=="review-queue" && String(module)!=="planning" && String(module)!=="calendar" && String(module)!=="homepage" && String(module)!=="media" && String(module)!=="video-desk" && String(module)!=="live-desk" && String(module)!=="social" && String(module)!=="newsletters" && String(module)!=="push-alerts" && String(module)!=="whatsapp" && String(module)!=="analytics" && String(module)!=="audience" && String(module)!=="search-growth" && String(module)!=="staff-roles" && String(module)!=="advertising" && String(module)!=="subscribers" && String(module)!=="premium" && String(module)!=="ai-desk" && String(module)!=="authors" && String(module)!=="settings" && String(module)!=="inbox" && String(module)!=="assignments" && String(module)!=="desks" && String(module)!=="breaking" && String(module)!=="moderation" && String(module)!=="finance" && String(module)!=="finance-invoices" && String(module)!=="finance-aging" && String(module)!=="finance-payments" && String(module)!=="finance-expenses" && String(module)!=="my-expenses" && String(module)!=="finance-statements" && String(module)!=="finance-customers" && String(module)!=="orders" && (
        <StudioPlaceholder owner={config.owner} description={config.description} />
      )}
      {String(module)==="inbox" && <StudioInboxPanel />}
      {String(module)==="assignments" && (assignmentId ? <StudioAssignmentDiscussionPanel assignmentId={String(assignmentId)} /> : <StudioAssignmentsPanel />)}
      {String(module)==="planning" && <StudioPlanningBoard />}
      {String(module)==="calendar" && <StudioEditorialCalendar />}
      {String(module)==="stories" && <StudioStories />}
      {String(module)==="create-edit" && <StudioStoryWorkspace storyId={storyId ? String(storyId) : undefined} />}
      {String(module)==="review-queue" && <StudioReviewQueue />}
      {String(module)==="homepage" && <StudioHomepage />}
      {String(module)==="media" && <StudioMediaLibrary />}
      {String(module)==="video-desk" && <StudioVideoDesk />}
      {String(module)==="live-desk" && <StudioLiveDesk />}
      {String(module)==="social" && <StudioSocialDesk />}
      {String(module)==="newsletters" && <StudioNewsletterDesk />}
      {String(module)==="push-alerts" && <StudioPushAlertDesk />}
      {String(module)==="whatsapp" && <StudioWhatsAppDesk />}
      {String(module)==="analytics" && <StudioAnalyticsDesk />}
      {String(module)==="audience" && <StudioAudienceDesk />}
      {String(module)==="search-growth" && <StudioSearchGrowthDesk />}
      {String(module)==="staff-roles" && <StudioStaffRolesDesk />}
      {String(module)==="advertising" && <StudioAdvertisingDesk />}
      {String(module)==="subscribers" && <StudioSubscribersDesk />}
      {String(module)==="premium" && <StudioPremiumDesk />}
      {String(module)==="ai-desk" && <StudioAiDesk />}
      {String(module)==="authors" && <StudioAuthorsDesk />}
      {String(module)==="settings" && <StudioSettingsDesk />}
      {String(module)==="desks" && (threadId ? <StudioThreadPanel threadId={String(threadId)} /> : deskId ? <StudioDeskThreadsPanel deskId={String(deskId)} /> : <StudioDesksPanel />)}
      {String(module)==="breaking" && (threadId ? <StudioThreadPanel threadId={String(threadId)} /> : <StudioBreakingPanel />)}
      {String(module)==="moderation" && <StudioModerationPanel />}
      {String(module)==="finance" && <StudioFinanceDeskView initialTab="overview" />}
      {String(module)==="finance-invoices" && <StudioFinanceDeskView initialTab="invoices" />}
      {String(module)==="finance-aging" && <StudioFinanceDeskView initialTab="aging" />}
      {String(module)==="finance-payments" && <StudioFinanceDeskView initialTab="payments" />}
      {String(module)==="finance-expenses" && <StudioFinanceDeskView initialTab="expenses" />}
      {String(module)==="my-expenses" && <StudioFinanceDeskView initialTab="expenses" />}
      {String(module)==="finance-statements" && <StudioFinanceDeskView initialTab="statements" />}
      {String(module)==="finance-customers" && <StudioFinanceDeskView initialTab="customers" />}
      {String(module)==="orders" && <StudioFinanceDeskView initialTab="customers" />}
      <View style={styles.readiness}>
        <Text style={styles.readinessTitle}>Implementation readiness</Text>
        {config.readiness.map((item)=><View style={styles.readinessRow} key={item}><View style={styles.dot} /><Text style={styles.readinessText}>{item}</Text></View>)}
      </View>
    </>
  );

  return (
    <StudioShell title={config.title}>
      {config.anyOfCapabilities
        ? <StudioAnyCapabilityGate capabilities={config.anyOfCapabilities}>{content}</StudioAnyCapabilityGate>
        : config.capability
          ? <StudioAccessGate capability={config.capability}>{content}</StudioAccessGate>
          : <StudioAuthorityGate>{content}</StudioAuthorityGate>}
    </StudioShell>
  );
}

const styles=StyleSheet.create({
  readiness:{marginTop:spacing.lg,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:spacing.xl,gap:spacing.sm},
  readinessTitle:{fontSize:16,fontWeight:"900",color:colors.ink,marginBottom:spacing.xs},
  readinessRow:{flexDirection:"row",gap:spacing.sm,alignItems:"flex-start"},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:colors.blue,marginTop:6},
  readinessText:{fontSize:13,lineHeight:20,color:colors.inkMuted,flex:1}
});
