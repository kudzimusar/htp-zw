import { appEnvironment, type AppEnvironment } from "../platform/config";
import type {
  NewsroomAssignment,
  NewsroomMediaAsset,
  NewsroomPlanningStaff,
  NewsroomPublicAuthor,
  NewsroomSection,
  NewsroomStory,
  NewsroomStoryAutosave,
  NewsroomStoryCorrection,
  NewsroomStoryReview,
  NewsroomStoryRevision,
  NewsroomVideo,
  NewsroomLiveCoverage,
  NewsroomLiveUpdate,
  NewsroomSocialAccount,
  NewsroomSocialPost,
  NewsroomSocialPublicationAttempt,
  NewsroomCampaign,
  NewsroomContactSegment,
  NewsroomCampaignPrepareSendResult,
  NewsroomPushAlert,
  NewsroomPushAlertPrepareResult,
  NewsroomPushDispatch,
  NewsroomPushDispatchResult,
  NewsroomWhatsAppBroadcast,
  NewsroomWhatsAppDispatch,
  NewsroomWhatsAppDispatchResult,
  NewsroomEditorialIntelligence,
  NewsroomGrowthIntelligence,
  NewsroomAudienceIntelligence,
  NewsroomStaffOperationsDirectory,
  NewsroomAdvertisingOverview,
  NewsroomSubscribersDirectory,
  NewsroomPremiumOperationsOverview,
  NewsroomAiAssistOverview,
  NewsroomCitationsDirectory,
  NewsroomAuthorsDirectory,
  NewsroomTaxonomyDirectory,
  NewsroomPlatformSettingsOverview,
  StoryMediaPromotionItem,
  NewsroomCustomer,
  NewsroomCommercialOrder,
  NewsroomInvoiceItem,
  NewsroomPaymentItem,
  NewsroomReceivablesAging,
  NewsroomExpenseItem,
  NewsroomFinanceOverview,
  NewsroomFinanceStatements,
  NewsroomChartOfAccount,
  NewsroomFiscalPeriod,
  NewsroomJournalEntry,
  NewsroomCreditNote,
  NewsroomTrialBalance,
  NewsroomProfitAndLoss,
  NewsroomBalanceSheet,
  NewsroomCustomerStatement
} from "../domain/models";

export interface OwnerPreviewPersona {
  id: string;
  name: string;
  role: string;
  desk: string;
  handle: string;
  initials: string;
  description: string;
  allowedDomains: string[];
}

export const OWNER_PREVIEW_PERSONAS: OwnerPreviewPersona[] = [
  {
    id: "owner",
    name: "Kudzanai Musarurwa",
    role: "Publisher / Owner",
    desk: "Executive",
    handle: "kudzimusar",
    initials: "KM",
    description: "Full executive newsroom authority across all 7 operational domains.",
    allowedDomains: ["my-work", "editorial", "audience-marketing", "commercial", "finance", "executive", "admin"]
  },
  {
    id: "reporter",
    name: "Rutendo Shumba",
    role: "Reporter / Journalist",
    desk: "National Health",
    handle: "rshumba",
    initials: "RS",
    description: "Field reporting, story drafts, assignments, pitches, and filed expense claims.",
    allowedDomains: ["my-work", "editorial"]
  },
  {
    id: "editor",
    name: "Dr. Tawanda Chideme",
    role: "Editor-in-Chief",
    desk: "Executive Editorial",
    handle: "tchideme",
    initials: "TC",
    description: "Review queue approval, publication gatekeeper, planning board, and editorial standards.",
    allowedDomains: ["my-work", "editorial", "audience-marketing", "executive"]
  },
  {
    id: "fmgr",
    name: "Farai Moyo",
    role: "Finance Manager",
    desk: "Finance & Accounts",
    handle: "fmoyo",
    initials: "FM",
    description: "Invoicing, AR aging, payment ledger, expense approvals, and financial statements.",
    allowedDomains: ["my-work", "finance", "commercial"]
  },
  {
    id: "cmgr",
    name: "Tendai Ndebele",
    role: "Commercial Manager",
    desk: "Commercial & Advertising",
    handle: "tndebele",
    initials: "TN",
    description: "Direct advertising campaigns, insertion orders, advertiser accounts, and subscriber revenue.",
    allowedDomains: ["my-work", "commercial", "audience-marketing"]
  },
  {
    id: "audience",
    name: "Nyasha Sibanda",
    role: "Audience & Growth Lead",
    desk: "Audience & Distribution",
    handle: "nsibanda",
    initials: "NS",
    description: "Social channels, email newsletters, breaking push alerts, and WhatsApp broadcasts.",
    allowedDomains: ["my-work", "audience-marketing"]
  },
  {
    id: "admin",
    name: "Blessing Hove",
    role: "Systems Administrator",
    desk: "Administration & IT",
    handle: "bhove",
    initials: "BH",
    description: "Staff provisioning, RBAC roles, security session revocation, and platform settings.",
    allowedDomains: ["my-work", "admin", "executive"]
  }
];

export const OWNER_PREVIEW_WATERMARK =
  "OWNER VISUAL PREVIEW · SAMPLE DATA · WRITES DISABLED";

export const OWNER_PREVIEW_UNAVAILABLE_MESSAGE =
  "Owner Preview is unavailable in this build.";

export const OWNER_PREVIEW_NOTICE_SUBTITLE =
  "OWNER VISUAL PREVIEW — SAMPLE PRESENTATION DATA — WRITES DISABLED. This surface is for visual and product inspection only and does not represent live Staging or Production newsroom truth.";

export type OwnerPreviewModuleKey =
  | "today"
  | "stories"
  | "review-queue"
  | "planning"
  | "assignments"
  | "calendar"
  | "homepage"
  | "media"
  | "video-desk"
  | "live-desk"
  | "social"
  | "newsletters"
  | "push-alerts"
  | "whatsapp"
  | "analytics"
  | "audience"
  | "search-growth"
  | "staff-roles"
  | "advertising"
  | "subscribers"
  | "premium"
  | "ai-desk"
  | "authors"
  | "settings"
  | "create-edit"
  | "finance"
  | "finance-invoices"
  | "finance-aging"
  | "finance-payments"
  | "finance-expenses"
  | "my-expenses"
  | "finance-trial-balance"
  | "finance-pnl"
  | "finance-balance-sheet"
  | "finance-journals"
  | "finance-statements"
  | "finance-customers"
  | "orders";

export interface OwnerPreviewDomain {
  key: string;
  title: string;
  shortTitle: string;
  items: ReadonlyArray<{
    key: OwnerPreviewModuleKey;
    label: string;
    path: string;
  }>;
}

export const OWNER_PREVIEW_DOMAINS = [
  {
    key: "my-work",
    title: "1. MY WORK",
    shortTitle: "My Work",
    items: [
      { key: "assignments", label: "My Assignments", path: "/owner-preview/studio/assignments" },
      { key: "create-edit", label: "Story Workspace / Drafts", path: "/owner-preview/studio/create-edit" },
      { key: "my-expenses", label: "My Expenses", path: "/owner-preview/studio/my-expenses" }
    ]
  },
  {
    key: "editorial",
    title: "2. EDITORIAL",
    shortTitle: "Editorial",
    items: [
      { key: "review-queue", label: "Review Queue", path: "/owner-preview/studio/review-queue" },
      { key: "stories", label: "Story Hub", path: "/owner-preview/studio/stories" },
      { key: "planning", label: "Planning Board", path: "/owner-preview/studio/planning" },
      { key: "calendar", label: "Editorial Calendar", path: "/owner-preview/studio/calendar" },
      { key: "live-desk", label: "Live Desk", path: "/owner-preview/studio/live-desk" },
      { key: "video-desk", label: "Video Desk", path: "/owner-preview/studio/video-desk" },
      { key: "media", label: "Media Library", path: "/owner-preview/studio/media" },
      { key: "authors", label: "Authors & Taxonomy", path: "/owner-preview/studio/authors" },
      { key: "ai-desk", label: "AI Citations Desk", path: "/owner-preview/studio/ai-desk" }
    ]
  },
  {
    key: "audience-marketing",
    title: "3. AUDIENCE & MARKETING",
    shortTitle: "Audience",
    items: [
      { key: "social", label: "Social Desk", path: "/owner-preview/studio/social" },
      { key: "newsletters", label: "Newsletter Desk", path: "/owner-preview/studio/newsletters" },
      { key: "push-alerts", label: "Push Alerts", path: "/owner-preview/studio/push-alerts" },
      { key: "whatsapp", label: "WhatsApp Desk", path: "/owner-preview/studio/whatsapp" },
      { key: "audience", label: "Audience Intelligence", path: "/owner-preview/studio/audience" },
      { key: "search-growth", label: "Search & Growth", path: "/owner-preview/studio/search-growth" }
    ]
  },
  {
    key: "commercial",
    title: "4. COMMERCIAL",
    shortTitle: "Commercial",
    items: [
      { key: "advertising", label: "Ad Campaigns", path: "/owner-preview/studio/advertising" },
      { key: "orders", label: "Commercial Orders", path: "/owner-preview/studio/orders" },
      { key: "subscribers", label: "Subscribers Directory", path: "/owner-preview/studio/subscribers" },
      { key: "premium", label: "Premium Policies", path: "/owner-preview/studio/premium" }
    ]
  },
  {
    key: "finance",
    title: "5. FINANCE & ACCOUNTING",
    shortTitle: "Finance",
    items: [
      { key: "finance", label: "Financial Overview", path: "/owner-preview/studio/finance" },
      { key: "finance-invoices", label: "Invoices & Billing", path: "/owner-preview/studio/finance-invoices" },
      { key: "finance-aging", label: "Receivables Aging", path: "/owner-preview/studio/finance-aging" },
      { key: "finance-payments", label: "Payments Ledger", path: "/owner-preview/studio/finance-payments" },
      { key: "finance-expenses", label: "Expense Claims", path: "/owner-preview/studio/finance-expenses" },
      { key: "finance-trial-balance", label: "Trial Balance", path: "/owner-preview/studio/finance-trial-balance" },
      { key: "finance-pnl", label: "Profit & Loss", path: "/owner-preview/studio/finance-pnl" },
      { key: "finance-balance-sheet", label: "Balance Sheet", path: "/owner-preview/studio/finance-balance-sheet" },
      { key: "finance-journals", label: "GL Journals", path: "/owner-preview/studio/finance-journals" },
      { key: "finance-statements", label: "Financial Statements", path: "/owner-preview/studio/finance-statements" },
      { key: "finance-customers", label: "Billing Customers", path: "/owner-preview/studio/finance-customers" }
    ]
  },
  {
    key: "executive",
    title: "6. PUBLISHER / EXECUTIVE",
    shortTitle: "Executive",
    items: [
      { key: "today", label: "Executive Dashboard", path: "/owner-preview/studio" },
      { key: "homepage", label: "Homepage Curation", path: "/owner-preview/studio/homepage" },
      { key: "analytics", label: "Analytics & Intelligence", path: "/owner-preview/studio/analytics" }
    ]
  },
  {
    key: "admin",
    title: "7. ADMINISTRATION",
    shortTitle: "Administration",
    items: [
      { key: "staff-roles", label: "Staff & Roles (RBAC)", path: "/owner-preview/studio/staff-roles" },
      { key: "settings", label: "Platform Settings", path: "/owner-preview/studio/settings" }
    ]
  }
];

export const OWNER_PREVIEW_DYNAMIC_MODULE_SLUGS: readonly string[] =
  OWNER_PREVIEW_DOMAINS.flatMap((domain) => domain.items)
    .filter((item) => item.path !== "/owner-preview/studio")
    .map((item) => item.path.slice("/owner-preview/studio/".length));

export function getOwnerPreviewDomainForModuleKey(moduleKey: OwnerPreviewModuleKey) {
  return OWNER_PREVIEW_DOMAINS.find((domain) =>
    domain.items.some((item) => item.key === moduleKey)
  );
}

export function getOwnerPreviewDomainForPath(path: string) {
  const pathname = path.split("?")[0]?.split("#")[0] ?? path;
  return OWNER_PREVIEW_DOMAINS.find((domain) =>
    domain.items.some((item) => item.path === pathname)
  );
}

export function isOwnerPreviewDomainAllowed(
  persona: OwnerPreviewPersona,
  domainKey: string
) {
  return persona.allowedDomains.includes(domainKey);
}

export const OWNER_PREVIEW_NAV_ITEMS: ReadonlyArray<{
  key: OwnerPreviewModuleKey;
  label: string;
  path: string;
}> = [
  { key: "today", label: "Today", path: "/owner-preview/studio" },
  { key: "stories", label: "Stories", path: "/owner-preview/studio/stories" },
  {
    key: "review-queue",
    label: "Review Queue",
    path: "/owner-preview/studio/review-queue"
  },
  { key: "planning", label: "Planning", path: "/owner-preview/studio/planning" },
  {
    key: "assignments",
    label: "My Assignments",
    path: "/owner-preview/studio/assignments"
  },
  { key: "calendar", label: "Calendar", path: "/owner-preview/studio/calendar" },
  { key: "homepage", label: "Homepage", path: "/owner-preview/studio/homepage" },
  { key: "media", label: "Media Library", path: "/owner-preview/studio/media" },
  { key: "video-desk", label: "Video Desk", path: "/owner-preview/studio/video-desk" },
  { key: "live-desk", label: "Live Desk", path: "/owner-preview/studio/live-desk" },
  { key: "social", label: "Social Desk", path: "/owner-preview/studio/social" },
  { key: "newsletters", label: "Newsletter Desk", path: "/owner-preview/studio/newsletters" },
  { key: "push-alerts", label: "Push Alerts", path: "/owner-preview/studio/push-alerts" },
  { key: "whatsapp", label: "WhatsApp Desk", path: "/owner-preview/studio/whatsapp" },
  { key: "analytics", label: "Analytics & Intelligence", path: "/owner-preview/studio/analytics" },
  { key: "audience", label: "Audience", path: "/owner-preview/studio/audience" },
  { key: "search-growth", label: "Search & Growth", path: "/owner-preview/studio/search-growth" },
  { key: "staff-roles", label: "Staff & Roles", path: "/owner-preview/studio/staff-roles" },
  { key: "advertising", label: "Advertising", path: "/owner-preview/studio/advertising" },
  { key: "subscribers", label: "Subscribers", path: "/owner-preview/studio/subscribers" },
  { key: "premium", label: "Premium Policies", path: "/owner-preview/studio/premium" },
  { key: "ai-desk", label: "AI Desk & Citations", path: "/owner-preview/studio/ai-desk" },
  { key: "authors", label: "Authors & Taxonomy", path: "/owner-preview/studio/authors" },
  { key: "settings", label: "Platform Settings", path: "/owner-preview/studio/settings" },
  {
    key: "create-edit",
    label: "Story Workspace",
    path: "/owner-preview/studio/create-edit"
  }
] as const;

/**
 * Deterministic environment guard (Sections 6 & 7):
 * Owner Preview is enabled ONLY when:
 *   1. explicit build-time flag `EXPO_PUBLIC_HEALTHTIMES_OWNER_PREVIEW` is `"1"` or `"true"`, AND
 *   2. application environment is NEVER `"production"`.
 */
export function isOwnerPreviewEnabled(options?: {
  previewFlag?: string | undefined;
  environment?: AppEnvironment | string | undefined;
  serviceMode?: string | undefined;
}): boolean {
  const flag = (
    options?.previewFlag !== undefined
      ? options.previewFlag
      : process.env.EXPO_PUBLIC_HEALTHTIMES_OWNER_PREVIEW
  )?.trim();

  const currentEnv = (
    options?.environment !== undefined ? options.environment : appEnvironment
  )
    ?.toString()
    .trim()
    .toLowerCase();

  const currentServiceMode = (
    options?.serviceMode !== undefined
      ? options.serviceMode
      : process.env.EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE
  )
    ?.toString()
    .trim()
    .toLowerCase();

  if (currentEnv === "production" || currentServiceMode === "production") {
    return false;
  }

  return flag === "1" || flag === "true";
}

// Reference timestamp helper relative to current render so "Today", "Tomorrow", "Overdue", and "Next 7 Days"
// always populate deterministically in the live preview.
export function getPreviewReferenceTime(baseNowMs: number = Date.now()) {
  const now = new Date(baseNowMs);
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  return {
    nowIso: new Date(baseNowMs).toISOString(),
    overdue6hIso: new Date(baseNowMs - 6 * 3600 * 1000).toISOString(),
    overdue18hIso: new Date(baseNowMs - 18 * 3600 * 1000).toISOString(),
    overdue2dIso: new Date(baseNowMs - 48 * 3600 * 1000).toISOString(),
    imminent4hIso: new Date(baseNowMs + 4 * 3600 * 1000).toISOString(),
    imminent8hIso: new Date(baseNowMs + 8 * 3600 * 1000).toISOString(),
    todayLateIso: new Date(y, m, d, 23, 30, 0).toISOString(),
    tomorrowMorningIso: new Date(y, m, d + 1, 9, 0, 0).toISOString(),
    tomorrowAfternoonIso: new Date(y, m, d + 1, 15, 30, 0).toISOString(),
    dayPlus2Iso: new Date(y, m, d + 2, 14, 0, 0).toISOString(),
    dayPlus3Iso: new Date(y, m, d + 3, 11, 0, 0).toISOString(),
    dayPlus5Iso: new Date(y, m, d + 5, 16, 0, 0).toISOString(),
    dayPlus10Iso: new Date(y, m, d + 10, 12, 0, 0).toISOString(),
    past3dIso: new Date(baseNowMs - 72 * 3600 * 1000).toISOString(),
    past4dIso: new Date(baseNowMs - 96 * 3600 * 1000).toISOString()
  };
}

export const PREVIEW_STAFF_DIRECTORY: NewsroomPlanningStaff[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    displayName: "Preview Reporter (Investigations)",
    email: "preview.reporter.investigations@example.invalid",
    desk: "Investigations",
    status: "active",
    revokedAt: null
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    displayName: "Preview Reporter (Public Health)",
    email: "preview.reporter.publichealth@example.invalid",
    desk: "Public Health",
    status: "active",
    revokedAt: null
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    displayName: "Preview Reporter (Clinical & Maternal)",
    email: "preview.reporter.clinical@example.invalid",
    desk: "Clinical & Maternal",
    status: "active",
    revokedAt: null
  },
  {
    id: "00000000-0000-4000-8000-000000000201",
    displayName: "Preview Editor (News Desk)",
    email: "preview.editor@example.invalid",
    desk: "Health Policy",
    status: "active",
    revokedAt: null
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    displayName: "Preview Fact Checker",
    email: "preview.factchecker@example.invalid",
    desk: "Investigations",
    status: "active",
    revokedAt: null
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    displayName: "Preview Health Reviewer",
    email: "preview.healthreviewer@example.invalid",
    desk: "Clinical & Maternal",
    status: "active",
    revokedAt: null
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    displayName: "Preview Copy Editor",
    email: "preview.copyeditor@example.invalid",
    desk: "Public Health",
    status: "active",
    revokedAt: null
  }
];

export const PREVIEW_PUBLIC_AUTHORS: NewsroomPublicAuthor[] = [
  {
    id: "00000000-0000-4000-8000-000000000301",
    displayName: "Preview Investigative Correspondent",
    slug: "preview-investigative-correspondent",
    bio: "Sample presentation author profile for HealthTimes Owner Visual Preview."
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    displayName: "Preview Public Health Reporter",
    slug: "preview-public-health-reporter",
    bio: "Sample presentation author profile covering public health systems."
  },
  {
    id: "00000000-0000-4000-8000-000000000303",
    displayName: "Preview Clinical & Science Writer",
    slug: "preview-clinical-science-writer",
    bio: "Sample presentation author profile for clinical and maternal medicine."
  },
  {
    id: "00000000-0000-4000-8000-000000000304",
    displayName: "Preview Health Policy Analyst",
    slug: "preview-health-policy-analyst",
    bio: "Sample presentation author profile for health financing and policy."
  }
];

export const PREVIEW_SECTIONS: NewsroomSection[] = [
  {
    id: "00000000-0000-4000-8000-000000000401",
    name: "Investigations",
    slug: "investigations",
    parentId: null
  },
  {
    id: "00000000-0000-4000-8000-000000000402",
    name: "Public Health",
    slug: "public-health",
    parentId: null
  },
  {
    id: "00000000-0000-4000-8000-000000000403",
    name: "Health Policy & Financing",
    slug: "health-policy-financing",
    parentId: null
  },
  {
    id: "00000000-0000-4000-8000-000000000404",
    name: "Clinical & Maternal Health",
    slug: "clinical-maternal-health",
    parentId: null
  },
  {
    id: "00000000-0000-4000-8000-000000000405",
    name: "Infectious Diseases",
    slug: "infectious-diseases",
    parentId: null
  }
];

export function buildPreviewStories(baseNowMs: number = Date.now()): NewsroomStory[] {
  const t = getPreviewReferenceTime(baseNowMs);

  return [
    {
      id: "00000000-0000-4000-8000-000000001001",
      title: "PREVIEW — Cholera response investigation in urban clinics",
      slug: "preview-cholera-response-investigation-urban-clinics",
      standfirst:
        "Sample presentation package examining municipal water testing turnarounds, oral rehydration salt buffer stocks, and rapid response deployment across metropolitan clinics.",
      excerpt:
        "Preview read-only server excerpt: Municipal water laboratory logs and clinic stock audits highlight key readiness gaps ahead of the rainy season.",
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY — NOT LIVE JOURNALISM.</strong> Field verification across sixteen metropolitan primary care clinics indicates that rapid diagnostic kits and oral rehydration points have been established in high-density wards, while bulk chlorine procurement awaits quarterly municipal disbursement.</p><p>Epidemiological surveillance teams interviewed for this sample package noted that laboratory turnaround times improved from 48 hours to 18 hours following the deployment of decentralized district testing units.</p><p>Senior public health officials emphasized that sustained borehole maintenance and real-time clinic telemetry remain the primary operational priorities for the upcoming quarter.</p>",
      bodyJson: null,
      status: "draft",
      workflowStatus: "Editor review",
      accessPolicy: "premium",
      authorId: "00000000-0000-4000-8000-000000000301",
      primarySectionId: "00000000-0000-4000-8000-000000000401",
      publishedAt: null,
      scheduledAt: t.tomorrowMorningIso,
      seoTitle: "PREVIEW — Urban Clinic Cholera Readiness & Water Surveillance Audit",
      seoDescription:
        "Sample SEO description for Owner Visual Preview of the HealthTimes Story Workspace.",
      canonicalUrl: null,
      ownerStaffId: "00000000-0000-4000-8000-000000000101",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: "00000000-0000-4000-8000-000000000202",
      healthReviewerStaffId: "00000000-0000-4000-8000-000000000203",
      copyEditorStaffId: "00000000-0000-4000-8000-000000000204",
      desk: "Investigations",
      topic: "Water & Sanitation",
      country: "Zimbabwe",
      region: "Harare Metropolitan",
      sourceNotes:
        "PREVIEW SOURCE NOTES: 1) Municipal Environmental Health Lab logbook (Sample Ref #A-14); 2) Provincial Epidemiology SitRep Annex B; 3) On-record briefing with Preview Municipal Health Director.",
      internalNotes:
        "PREVIEW INTERNAL NOTE: Fact check and clinical review signed off. Holding in Editor review for final headline check and chart caption verification.",
      deadlineAt: t.overdue6hIso,
      distribution: {
        public_reader: true,
        newsletter_brief: false,
        homepage: { section: "top-stories", rank: 2, active: true }
      },
      adSetting: "Context-Safe Health",
      commentPolicy: "read_only",
      lockVersion: 4,
      lastSavedBy: "00000000-0000-4000-8000-000000000201",
      createdAt: t.past4dIso,
      updatedAt: t.nowIso,
      modifiedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000001002",
      title: "PREVIEW — Harare hospital funding analysis & capital grant disbursement",
      slug: "preview-harare-hospital-funding-analysis",
      standfirst:
        "Sample fiscal breakdown of central hospital capital allocations, diagnostic equipment maintenance contracts, and procurement lead times.",
      excerpt:
        "Preview excerpt: Capital grant utilization reached 74% across central referral hospitals in the sample review period.",
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Budget execution tables reviewed for this sample analysis show accelerated disbursements for diagnostic imaging maintenance and intensive-care consumables.</p>",
      bodyJson: null,
      status: "draft",
      workflowStatus: "Fact check",
      accessPolicy: "public",
      authorId: "00000000-0000-4000-8000-000000000304",
      primarySectionId: "00000000-0000-4000-8000-000000000403",
      publishedAt: null,
      scheduledAt: null,
      seoTitle: "PREVIEW — Hospital Capital Grant & Procurement Analysis",
      seoDescription: "Sample policy desk story in Fact check stage.",
      canonicalUrl: null,
      ownerStaffId: "00000000-0000-4000-8000-000000000102",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: "00000000-0000-4000-8000-000000000202",
      healthReviewerStaffId: null,
      copyEditorStaffId: null,
      desk: "Health Policy",
      topic: "Health Financing",
      country: "Zimbabwe",
      region: "National",
      sourceNotes: "PREVIEW SOURCE NOTES: Sample Treasury Blue Book tables pp. 42-49.",
      internalNotes: "PREVIEW INTERNAL NOTE: Verify Table 3 inflation-adjusted column.",
      deadlineAt: t.imminent4hIso,
      distribution: {
        public_reader: true,
        homepage: { section: "public-health", rank: 1, active: true }
      },
      adSetting: "Standard",
      commentPolicy: "disabled",
      lockVersion: 2,
      lastSavedBy: "00000000-0000-4000-8000-000000000102",
      createdAt: t.past3dIso,
      updatedAt: t.nowIso,
      modifiedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000001003",
      title: "PREVIEW — HIV programme interview: Long-acting injectable prevention rollout",
      slug: "preview-hiv-programme-interview-injectable-rollout",
      standfirst:
        "Sample clinical Q&A on district clinic training, cold-storage requirements, and patient adherence counselling for long-acting prevention.",
      excerpt: null,
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Clinical coordinators outline the phased introduction of long-acting prevention regimens across thirty pilot sites.</p>",
      bodyJson: null,
      status: "draft",
      workflowStatus: "Health / Science review",
      accessPolicy: "premium",
      authorId: "00000000-0000-4000-8000-000000000303",
      primarySectionId: "00000000-0000-4000-8000-000000000405",
      publishedAt: null,
      scheduledAt: null,
      seoTitle: "PREVIEW — Long-Acting HIV Prevention Rollout Interview",
      seoDescription: "Sample clinical review story.",
      canonicalUrl: null,
      ownerStaffId: "00000000-0000-4000-8000-000000000103",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: "00000000-0000-4000-8000-000000000202",
      healthReviewerStaffId: "00000000-0000-4000-8000-000000000203",
      copyEditorStaffId: null,
      desk: "Infectious Diseases",
      topic: "HIV & Prevention",
      country: "Zimbabwe",
      region: "Bulawayo & Matabeleland",
      sourceNotes: "PREVIEW SOURCE NOTES: Sample clinical protocol v2.4 and transcript.",
      internalNotes: "PREVIEW INTERNAL NOTE: Checking dosage interval wording with Preview Health Reviewer.",
      deadlineAt: t.tomorrowAfternoonIso,
      distribution: {
        public_reader: true,
        homepage: { section: "hiv-aids", rank: 1, active: true }
      },
      adSetting: "Standard",
      commentPolicy: "disabled",
      lockVersion: 3,
      lastSavedBy: "00000000-0000-4000-8000-000000000203",
      createdAt: t.past3dIso,
      updatedAt: t.nowIso,
      modifiedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000001004",
      title: "PREVIEW — Maternal ward solar microgrid reliability audit",
      slug: "preview-maternal-ward-solar-microgrid-reliability",
      standfirst:
        "Sample engineering and clinical assessment of lithium battery autonomy across rural maternity waiting homes.",
      excerpt: null,
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Solar-plus-storage installations reduced generator fuel expenditure by 62% across surveyed district maternity wards.</p>",
      bodyJson: null,
      status: "draft",
      workflowStatus: "Copy edit",
      accessPolicy: "public",
      authorId: "00000000-0000-4000-8000-000000000303",
      primarySectionId: "00000000-0000-4000-8000-000000000404",
      publishedAt: null,
      scheduledAt: null,
      seoTitle: "PREVIEW — Maternal Ward Solar Microgrid Audit",
      seoDescription: "Sample story in Copy edit stage.",
      canonicalUrl: null,
      ownerStaffId: "00000000-0000-4000-8000-000000000103",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: null,
      healthReviewerStaffId: null,
      copyEditorStaffId: "00000000-0000-4000-8000-000000000204",
      desk: "Clinical & Maternal",
      topic: "Maternal Health Infrastructure",
      country: "Zimbabwe",
      region: "Manicaland",
      sourceNotes: "PREVIEW SOURCE NOTES: Sample rural electrification engineering report.",
      internalNotes: "PREVIEW INTERNAL NOTE: Style check on kilowatt-hour abbreviations.",
      deadlineAt: t.dayPlus3Iso,
      distribution: { public_reader: true },
      adSetting: "Standard",
      commentPolicy: "disabled",
      lockVersion: 2,
      lastSavedBy: "00000000-0000-4000-8000-000000000204",
      createdAt: t.past3dIso,
      updatedAt: t.nowIso,
      modifiedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000001005",
      title: "PREVIEW — Rural cold-chain telemetry & vaccine storage monitoring",
      slug: "preview-rural-cold-chain-telemetry-vaccine-storage",
      standfirst:
        "Sample field report on cellular temperature loggers and automated SMS alerts for district vaccine stores.",
      excerpt: null,
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Automated temperature telemetry units have been installed in 120 rural vaccine refrigerators in the sample pilot.</p>",
      bodyJson: null,
      status: "draft",
      workflowStatus: "Submitted",
      accessPolicy: "public",
      authorId: "00000000-0000-4000-8000-000000000302",
      primarySectionId: "00000000-0000-4000-8000-000000000402",
      publishedAt: null,
      scheduledAt: null,
      seoTitle: "PREVIEW — Rural Vaccine Cold-Chain Telemetry",
      seoDescription: "Sample Submitted story with overdue deadline.",
      canonicalUrl: null,
      ownerStaffId: "00000000-0000-4000-8000-000000000102",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: null,
      healthReviewerStaffId: null,
      copyEditorStaffId: null,
      desk: "Public Health",
      topic: "Immunization",
      country: "Zimbabwe",
      region: "Masvingo",
      sourceNotes: "PREVIEW SOURCE NOTES: Sample EPI logistics briefing.",
      internalNotes: "PREVIEW INTERNAL NOTE: Newly submitted by reporter; awaiting desk triage.",
      deadlineAt: t.overdue18hIso,
      distribution: { public_reader: true },
      adSetting: "Standard",
      commentPolicy: "disabled",
      lockVersion: 1,
      lastSavedBy: "00000000-0000-4000-8000-000000000102",
      createdAt: t.past3dIso,
      updatedAt: t.nowIso,
      modifiedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000001006",
      title: "PREVIEW — National essential medicines tariff & generic substitution guide",
      slug: "preview-national-essential-medicines-tariff-guide",
      standfirst:
        "Sample reader service piece detailing updated reference pricing and generic dispensing rules.",
      excerpt: null,
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Cleared through all review gates and marked Ready for publication slot assignment.</p>",
      bodyJson: null,
      status: "draft",
      workflowStatus: "Ready",
      accessPolicy: "public",
      authorId: "00000000-0000-4000-8000-000000000304",
      primarySectionId: "00000000-0000-4000-8000-000000000403",
      publishedAt: null,
      scheduledAt: t.dayPlus2Iso,
      seoTitle: "PREVIEW — Essential Medicines Tariff Guide",
      seoDescription: "Sample Ready workflow state story.",
      canonicalUrl: null,
      ownerStaffId: "00000000-0000-4000-8000-000000000102",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: "00000000-0000-4000-8000-000000000202",
      healthReviewerStaffId: "00000000-0000-4000-8000-000000000203",
      copyEditorStaffId: "00000000-0000-4000-8000-000000000204",
      desk: "Health Policy",
      topic: "Pharmaceuticals",
      country: "Zimbabwe",
      region: "National",
      sourceNotes: "PREVIEW SOURCE NOTES: Sample regulatory gazette notice.",
      internalNotes: "PREVIEW INTERNAL NOTE: All reviews complete; ready for morning edition.",
      deadlineAt: t.dayPlus2Iso,
      distribution: {
        public_reader: true,
        homepage: { section: "top-stories", rank: 1, active: true }
      },
      adSetting: "Standard",
      commentPolicy: "open",
      lockVersion: 5,
      lastSavedBy: "00000000-0000-4000-8000-000000000201",
      createdAt: t.past4dIso,
      updatedAt: t.nowIso,
      modifiedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000001007",
      title: "PREVIEW — Oncology radiotherapy linear accelerator maintenance schedule",
      slug: "preview-oncology-radiotherapy-maintenance-schedule",
      standfirst:
        "Sample scheduled briefing on biomedical engineering servicing windows and patient referral coordination.",
      excerpt: null,
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Scheduled for publication following confirmation of engineering sign-off.</p>",
      bodyJson: null,
      status: "scheduled",
      workflowStatus: "Scheduled",
      accessPolicy: "premium",
      authorId: "00000000-0000-4000-8000-000000000303",
      primarySectionId: "00000000-0000-4000-8000-000000000404",
      publishedAt: null,
      scheduledAt: t.todayLateIso,
      seoTitle: "PREVIEW — Oncology Radiotherapy Servicing Update",
      seoDescription: "Sample Scheduled workflow state story.",
      canonicalUrl: null,
      ownerStaffId: "00000000-0000-4000-8000-000000000103",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: null,
      healthReviewerStaffId: null,
      copyEditorStaffId: null,
      desk: "Clinical & Maternal",
      topic: "Oncology",
      country: "Zimbabwe",
      region: "Harare & Bulawayo",
      sourceNotes: "PREVIEW SOURCE NOTES: Sample hospital engineering bulletin.",
      internalNotes: "PREVIEW INTERNAL NOTE: Scheduled for today 23:30.",
      deadlineAt: t.todayLateIso,
      distribution: { public_reader: true },
      adSetting: "Standard",
      commentPolicy: "disabled",
      lockVersion: 3,
      lastSavedBy: "00000000-0000-4000-8000-000000000201",
      createdAt: t.past3dIso,
      updatedAt: t.nowIso,
      modifiedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000001008",
      title: "PREVIEW — Community health worker digital stipend disbursement draft",
      slug: "preview-community-health-worker-stipend-draft",
      standfirst:
        "Sample early-stage reporting draft on mobile money payment rails for village health workers.",
      excerpt: null,
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Working reporter draft in progress.</p>",
      bodyJson: null,
      status: "draft",
      workflowStatus: "Draft",
      accessPolicy: "public",
      authorId: "00000000-0000-4000-8000-000000000302",
      primarySectionId: "00000000-0000-4000-8000-000000000402",
      publishedAt: null,
      scheduledAt: null,
      seoTitle: "PREVIEW — Community Health Worker Stipend Draft",
      seoDescription: "Sample Draft workflow state story.",
      canonicalUrl: null,
      ownerStaffId: "00000000-0000-4000-8000-000000000102",
      assignedEditorStaffId: null,
      factCheckerStaffId: null,
      healthReviewerStaffId: null,
      copyEditorStaffId: null,
      desk: "Public Health",
      topic: "Primary Care Workforce",
      country: "Zimbabwe",
      region: "Midlands",
      sourceNotes: "PREVIEW SOURCE NOTES: Initial interview notes.",
      internalNotes: "PREVIEW INTERNAL NOTE: Awaiting district coordinator quotes.",
      deadlineAt: t.dayPlus5Iso,
      distribution: { public_reader: false },
      adSetting: "Standard",
      commentPolicy: "disabled",
      lockVersion: 1,
      lastSavedBy: "00000000-0000-4000-8000-000000000102",
      createdAt: t.nowIso,
      updatedAt: t.nowIso,
      modifiedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000001009",
      title: "PREVIEW — Regional malaria indoor residual spraying coverage report",
      slug: "preview-regional-malaria-spraying-coverage-report",
      standfirst:
        "Sample published report demonstrating completed workflow state and reader comment policy eligibility.",
      excerpt:
        "Preview excerpt: Seasonal vector control teams completed 91% of targeted households in sample border districts.",
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Published sample article demonstrating terminal workflow state.</p>",
      bodyJson: null,
      status: "publish",
      workflowStatus: "Published",
      accessPolicy: "public",
      authorId: "00000000-0000-4000-8000-000000000302",
      primarySectionId: "00000000-0000-4000-8000-000000000405",
      publishedAt: t.past3dIso,
      scheduledAt: null,
      seoTitle: "PREVIEW — Malaria Indoor Residual Spraying Coverage Report",
      seoDescription: "Sample Published story.",
      canonicalUrl: "https://healthtimes.co.zw/preview/malaria-spraying-coverage",
      ownerStaffId: "00000000-0000-4000-8000-000000000102",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: "00000000-0000-4000-8000-000000000202",
      healthReviewerStaffId: "00000000-0000-4000-8000-000000000203",
      copyEditorStaffId: "00000000-0000-4000-8000-000000000204",
      desk: "Infectious Diseases",
      topic: "Malaria Control",
      country: "Zimbabwe",
      region: "Mashonaland Central",
      sourceNotes: "PREVIEW SOURCE NOTES: Sample vector control bulletin.",
      internalNotes: "PREVIEW INTERNAL NOTE: Published cleanly.",
      deadlineAt: t.past4dIso,
      distribution: {
        public_reader: true,
        homepage: { section: "hero", rank: 1, active: true }
      },
      adSetting: "Standard",
      commentPolicy: "open",
      lockVersion: 6,
      lastSavedBy: "00000000-0000-4000-8000-000000000201",
      createdAt: t.past4dIso,
      updatedAt: t.past3dIso,
      modifiedAt: t.past3dIso
    },
    {
      id: "00000000-0000-4000-8000-000000001010",
      title: "PREVIEW — Zimbabwe national immunisation supply chain audit",
      slug: "preview-zimbabwe-immunisation-supply-chain-audit",
      standfirst:
        "Sample edition-specific published investigative report on cold-chain resilience across rural provincial depots.",
      excerpt:
        "Preview excerpt: Cold-chain uptime maintained at 98.4% across 10 provincial hubs.",
      bodyHtml:
        "<p><strong>PREVIEW SAMPLE COPY.</strong> Published report showcasing Zimbabwe Edition Hero override.</p>",
      bodyJson: null,
      status: "publish",
      workflowStatus: "Published",
      accessPolicy: "public",
      authorId: "00000000-0000-4000-8000-000000000301",
      primarySectionId: "00000000-0000-4000-8000-000000000401",
      publishedAt: t.past3dIso,
      scheduledAt: null,
      seoTitle: "PREVIEW — Zimbabwe Immunisation Supply Chain Audit",
      seoDescription:
        "Sample Published story with Zimbabwe Edition Hero override.",
      canonicalUrl:
        "https://healthtimes.co.zw/preview/zimbabwe-immunisation-supply-chain",
      ownerStaffId: "00000000-0000-4000-8000-000000000101",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      factCheckerStaffId: "00000000-0000-4000-8000-000000000202",
      healthReviewerStaffId: "00000000-0000-4000-8000-000000000203",
      copyEditorStaffId: "00000000-0000-4000-8000-000000000204",
      desk: "Investigations",
      topic: "Supply Chain",
      country: "Zimbabwe",
      region: "Harare",
      sourceNotes:
        "PREVIEW SOURCE NOTES: Provincial vaccine logistics audit.",
      internalNotes:
        "PREVIEW INTERNAL NOTE: Configured with Zimbabwe Edition Hero override.",
      deadlineAt: t.past3dIso,
      distribution: {
        public_reader: true,
        homepage_editions: {
          zimbabwe: {
            section: "hero",
            rank: 1,
            active: true
          }
        }
      },
      adSetting: "Standard",
      commentPolicy: "open",
      lockVersion: 3,
      lastSavedBy: "00000000-0000-4000-8000-000000000201",
      createdAt: t.past3dIso,
      updatedAt: t.past3dIso,
      modifiedAt: t.past3dIso
    }
  ];
}

export function buildPreviewAssignments(baseNowMs: number = Date.now()): NewsroomAssignment[] {
  const t = getPreviewReferenceTime(baseNowMs);

  return [
    {
      id: "00000000-0000-4000-8000-000000002001",
      storyId: "00000000-0000-4000-8000-000000001001",
      title: "PREVIEW — Verify municipal water lab test logs & clinic ORS buffer stocks",
      reporterStaffId: "00000000-0000-4000-8000-000000000101",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      desk: "Investigations",
      deadlineAt: t.overdue6hIso,
      priority: "Urgent",
      notes:
        "PREVIEW BRIEF: Cross-check decentralized lab turnaround times against municipal sitrep tables before final Editor review sign-off.",
      status: "Reporting",
      assignedBy: "00000000-0000-4000-8000-000000000201",
      updatedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000002002",
      storyId: "00000000-0000-4000-8000-000000001004",
      title: "PREVIEW — Interview provincial maternal health director on solar battery autonomy",
      reporterStaffId: "00000000-0000-4000-8000-000000000103",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      desk: "Clinical & Maternal",
      deadlineAt: t.imminent8hIso,
      priority: "High",
      notes:
        "PREVIEW BRIEF: Confirm overnight inverter load figures for neonatal incubators.",
      status: "Drafting",
      assignedBy: "00000000-0000-4000-8000-000000000201",
      updatedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000002003",
      storyId: "00000000-0000-4000-8000-000000001002",
      title: "PREVIEW — Collect Treasury annex tables for central hospital capital grant",
      reporterStaffId: "00000000-0000-4000-8000-000000000102",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      desk: "Health Policy",
      deadlineAt: t.todayLateIso,
      priority: "High",
      notes:
        "PREVIEW BRIEF: Attach reconciled Q3 capital disbursement sheet to story source notes.",
      status: "Submitted",
      assignedBy: "00000000-0000-4000-8000-000000000201",
      updatedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000002004",
      storyId: null,
      title: "PREVIEW — Field visit to rural primary care dispensary cold-chain unit",
      reporterStaffId: "00000000-0000-4000-8000-000000000101",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      desk: "Public Health",
      deadlineAt: t.tomorrowAfternoonIso,
      priority: "Normal",
      notes:
        "PREVIEW BRIEF: Unlinked exploratory reporting assignment; photograph solar vaccine refrigerator telemetry display.",
      status: "Accepted",
      assignedBy: "00000000-0000-4000-8000-000000000201",
      updatedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000002005",
      storyId: "00000000-0000-4000-8000-000000001003",
      title: "PREVIEW — Fact-check regional antiretroviral procurement & cold-storage brief",
      reporterStaffId: "00000000-0000-4000-8000-000000000101",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      desk: "Infectious Diseases",
      deadlineAt: t.dayPlus3Iso,
      priority: "Urgent",
      notes:
        "PREVIEW BRIEF: Newly assigned brief awaiting reporter acceptance.",
      status: "Assigned",
      assignedBy: "00000000-0000-4000-8000-000000000201",
      updatedAt: t.nowIso
    },
    {
      id: "00000000-0000-4000-8000-000000002006",
      storyId: "00000000-0000-4000-8000-000000001009",
      title: "PREVIEW — Completed district malaria vector surveillance summary",
      reporterStaffId: "00000000-0000-4000-8000-000000000101",
      assignedEditorStaffId: "00000000-0000-4000-8000-000000000201",
      desk: "Infectious Diseases",
      deadlineAt: t.past4dIso,
      priority: "Normal",
      notes:
        "PREVIEW BRIEF: Completed assignment linked to published malaria coverage.",
      status: "Complete",
      assignedBy: "00000000-0000-4000-8000-000000000201",
      updatedAt: t.past3dIso
    }
  ];
}

export const PREVIEW_STORY_REVISIONS: NewsroomStoryRevision[] = [
  {
    id: "00000000-0000-4000-8000-000000003003",
    storyId: "00000000-0000-4000-8000-000000001001",
    revisionNumber: 3,
    title: "PREVIEW — Cholera response investigation in urban clinics",
    bodyHtml:
      "<p><strong>PREVIEW SAMPLE COPY — REVISION #3.</strong> Incorporates fact-check verification of sixteen clinics and updated lab turnaround times.</p>",
    changeSummary: "Manual save — Incorporated fact-check & clinical review notes",
    editorId: "00000000-0000-4000-8000-000000000201",
    createdAt: "2026-10-16T08:30:00.000Z"
  },
  {
    id: "00000000-0000-4000-8000-000000003002",
    storyId: "00000000-0000-4000-8000-000000001001",
    revisionNumber: 2,
    title: "PREVIEW — Urban clinic cholera readiness investigation (Draft 2)",
    bodyHtml:
      "<p><strong>PREVIEW SAMPLE COPY — REVISION #2.</strong> Added municipal environmental health laboratory turnaround figures.</p>",
    changeSummary: "Submitted for Fact Check",
    editorId: "00000000-0000-4000-8000-000000000101",
    createdAt: "2026-10-15T16:15:00.000Z"
  },
  {
    id: "00000000-0000-4000-8000-000000003001",
    storyId: "00000000-0000-4000-8000-000000001001",
    revisionNumber: 1,
    title: "PREVIEW — Initial cholera clinic readiness field notes",
    bodyHtml: "<p><strong>PREVIEW SAMPLE COPY — REVISION #1.</strong> Initial reporter draft.</p>",
    changeSummary: "Initial story creation",
    editorId: "00000000-0000-4000-8000-000000000101",
    createdAt: "2026-10-14T11:00:00.000Z"
  }
];

export const PREVIEW_STORY_AUTOSAVE: NewsroomStoryAutosave = {
  storyId: "00000000-0000-4000-8000-000000001001",
  title: "PREVIEW — Cholera response investigation in urban clinics",
  standfirst:
    "Sample presentation package examining municipal water testing turnarounds, oral rehydration salt buffer stocks, and rapid response deployment across metropolitan clinics.",
  bodyHtml:
    "<p><strong>PREVIEW SAMPLE COPY — NOT LIVE JOURNALISM.</strong> Field verification across sixteen metropolitan primary care clinics...</p>",
  lockVersion: 4,
  savedBy: "Preview Editor (News Desk)",
  savedAt: "2026-10-16T08:42:00.000Z"
};

export const PREVIEW_STORY_REVIEWS: NewsroomStoryReview[] = [
  {
    id: "00000000-0000-4000-8000-000000004001",
    storyId: "00000000-0000-4000-8000-000000001001",
    reviewType: "fact_check",
    status: "approved",
    notes:
      "PREVIEW FACT CHECK: Verified all 16 clinic buffer stock figures against Municipal SitRep Annex B.",
    assignedTo: "Preview Fact Checker",
    createdBy: "Preview Editor (News Desk)",
    completedBy: "Preview Fact Checker",
    createdAt: "2026-10-15T17:00:00.000Z",
    completedAt: "2026-10-15T19:20:00.000Z"
  },
  {
    id: "00000000-0000-4000-8000-000000004002",
    storyId: "00000000-0000-4000-8000-000000001001",
    reviewType: "health_review",
    status: "completed",
    notes:
      "PREVIEW HEALTH / SCIENCE REVIEW: Clinical terminology and oral rehydration protocol descriptions are accurate.",
    assignedTo: "Preview Health Reviewer",
    createdBy: "Preview Editor (News Desk)",
    completedBy: "Preview Health Reviewer",
    createdAt: "2026-10-15T19:30:00.000Z",
    completedAt: "2026-10-16T07:45:00.000Z"
  },
  {
    id: "00000000-0000-4000-8000-000000004003",
    storyId: "00000000-0000-4000-8000-000000001001",
    reviewType: "editor_review",
    status: "changes_requested",
    notes:
      "PREVIEW EDITOR REVIEW: Please tighten the second paragraph lead and confirm the tomorrow 09:00 publication slot.",
    assignedTo: "Preview Editor (News Desk)",
    createdBy: "Preview Editor (News Desk)",
    completedBy: "Preview Editor (News Desk)",
    createdAt: "2026-10-16T08:00:00.000Z",
    completedAt: "2026-10-16T08:25:00.000Z"
  }
];

export const PREVIEW_STORY_CORRECTIONS: NewsroomStoryCorrection[] = [
  {
    id: "00000000-0000-4000-8000-000000005001",
    storyId: "00000000-0000-4000-8000-000000001001",
    reason:
      "PREVIEW CORRECTION RECORD: Updated surveyed metropolitan clinic count from 14 to 16 following reconciliation with district environmental health ledger.",
    changedBy: "Preview Editor (News Desk)",
    changedAt: "2026-10-16T08:30:00.000Z",
    previousRevisionId: "00000000-0000-4000-8000-000000003002",
    newRevisionId: "00000000-0000-4000-8000-000000003003"
  }
];

export type PreviewDiscussionMessage = {
  id: string;
  authorLabel: string;
  roleBadge: string;
  body: string;
  createdAt: string;
  resolved: boolean;
};

export const PREVIEW_STORY_DISCUSSION: PreviewDiscussionMessage[] = [
  {
    id: "preview-disc-1",
    authorLabel: "Preview Fact Checker",
    roleBadge: "FACT CHECK",
    body: "PREVIEW DISCUSSION: Cross-checked the 18-hour water lab turnaround figure against the municipal logbook. Citations added in Source Notes.",
    createdAt: "2026-10-15T19:18:00.000Z",
    resolved: true
  },
  {
    id: "preview-disc-2",
    authorLabel: "Preview Health Reviewer",
    roleBadge: "CLINICAL REVIEW",
    body: "PREVIEW DISCUSSION: Approved clinical phrasing on oral rehydration points and district cholera treatment unit triage.",
    createdAt: "2026-10-16T07:40:00.000Z",
    resolved: true
  },
  {
    id: "preview-disc-3",
    authorLabel: "Preview Editor (News Desk)",
    roleBadge: "NEWS DESK",
    body: "PREVIEW DISCUSSION: Ready for final headline sign-off once the second paragraph lead is tightened.",
    createdAt: "2026-10-16T08:25:00.000Z",
    resolved: false
  }
];

export function buildPreviewMediaAssets(): NewsroomMediaAsset[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000007001",
      sourceUrl: null,
      storageBucket: "media",
      storageKey: "2026/10/clinical-ward-vaccination.jpg",
      publicUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80",
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      mimeType: "image/jpeg",
      filename: "clinical-ward-vaccination.jpg",
      altText: "Harare Central Hospital maternal clinic nurses reviewing child immunization registry cards",
      caption: "Maternal clinic nurses review pediatric immunization schedules during the October catchment drive.",
      credit: "HealthTimes Staff / Tafadzwa Moyo",
      width: 1920,
      height: 1080,
      status: "published",
      byteSize: 2458900,
      sourceProvenance: "uploads/2026/10/clinical-ward-vaccination.jpg",
      uploadedByStaffId: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-14T09:15:00.000Z",
      updatedAt: "2026-10-15T11:30:00.000Z",
      usage: [
        {
          storyId: "00000000-0000-4000-8000-000000001001",
          usageType: "featured",
          sourceContext: {
            preview_placement_slot: "hero_lead",
            editorial_notes: "catchment_drive"
          }
        },
        {
          storyId: "00000000-0000-4000-8000-000000001002",
          usageType: "inline",
          sourceContext: {
            preview_placement_slot: "inline_callout"
          }
        }
      ],
      typeGroup: "Images",
      storageCustodyCategory: "public"
    },
    {
      id: "00000000-0000-4000-8000-000000007002",
      sourceUrl: null,
      storageBucket: "media",
      storageKey: "2026/10/water-purification-infographic.png",
      publicUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
      checksum: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      mimeType: "image/png",
      filename: "water-purification-infographic.png",
      altText: "Diagram outlining four-step community water treatment for borehole purification",
      caption: "Step-by-step chlorine dosage and boiling guide for peri-urban household boreholes.",
      credit: "Ministry of Health and Child Care / Visual Unit",
      width: 1200,
      height: 800,
      status: "pending",
      byteSize: 1245000,
      sourceProvenance: "uploads/2026/10/water-purification-infographic.png",
      uploadedByStaffId: "00000000-0000-4000-8000-000000000002",
      createdAt: "2026-10-15T14:20:00.000Z",
      updatedAt: "2026-10-15T14:20:00.000Z",
      usage: [
        {
          storyId: "00000000-0000-4000-8000-000000001002",
          usageType: "featured",
          sourceContext: {
            preview_placement_slot: "infographic_callout"
          }
        }
      ],
      typeGroup: "Images",
      storageCustodyCategory: "public"
    },
    {
      id: "00000000-0000-4000-8000-000000007003",
      sourceUrl: null,
      storageBucket: "media",
      storageKey: "2026/10/epidemiology-monthly-bulletin.pdf",
      publicUrl: null,
      checksum: "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
      mimeType: "application/pdf",
      filename: "epidemiology-monthly-bulletin.pdf",
      altText: null,
      caption: "National Epidemiological Bulletin — Epidemiological Week 41 Official Tables",
      credit: "Department of Epidemiology & Disease Control",
      width: null,
      height: null,
      status: "private_ready",
      byteSize: 5410200,
      sourceProvenance: "uploads/2026/10/epidemiology-monthly-bulletin.pdf",
      uploadedByStaffId: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-13T16:00:00.000Z",
      updatedAt: "2026-10-13T16:00:00.000Z",
      usage: [],
      typeGroup: "Documents",
      storageCustodyCategory: "private"
    },
    {
      id: "00000000-0000-4000-8000-000000007004",
      sourceUrl: null,
      storageBucket: "media",
      storageKey: "2026/10/minister-briefing-cholera-response.mp4",
      publicUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      checksum: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      mimeType: "video/mp4",
      filename: "minister-briefing-cholera-response.mp4",
      altText: null,
      caption: "Ministerial briefing on emergency pharmaceutical procurement and provincial dispatch timelines.",
      credit: "HealthTimes Broadcast / Kudzai Zvobgo",
      width: 1920,
      height: 1080,
      status: "published",
      byteSize: 48900000,
      sourceProvenance: "uploads/2026/10/minister-briefing-cholera-response.mp4",
      uploadedByStaffId: "00000000-0000-4000-8000-000000000003",
      createdAt: "2026-10-16T08:00:00.000Z",
      updatedAt: "2026-10-16T08:15:00.000Z",
      usage: [
        {
          storyId: "00000000-0000-4000-8000-000000001001",
          usageType: "attachment",
          sourceContext: {
            preview_attachment_kind: "video_briefing"
          }
        }
      ],
      typeGroup: "Video",
      storageCustodyCategory: "public"
    },
    {
      id: "00000000-0000-4000-8000-000000007005",
      sourceUrl: null,
      storageBucket: "media",
      storageKey: "2026/10/radio-dispatch-dr-shumba-interview.mp3",
      publicUrl: null,
      checksum: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
      mimeType: "audio/mpeg",
      filename: "radio-dispatch-dr-shumba-interview.mp3",
      altText: null,
      caption: "Audio interview with Dr. Shumba regarding oral vaccine supply chain cold storage resilience.",
      credit: "HealthTimes Audio Service",
      width: null,
      height: null,
      status: "missing_from_uploads_archive",
      byteSize: 8900400,
      sourceProvenance: "uploads/2026/10/radio-dispatch-dr-shumba-interview.mp3",
      uploadedByStaffId: "00000000-0000-4000-8000-000000000002",
      createdAt: "2026-10-12T11:00:00.000Z",
      updatedAt: "2026-10-12T11:00:00.000Z",
      usage: [],
      typeGroup: "Audio",
      storageCustodyCategory: "unknown"
    }
  ];
}

export function buildPreviewStoryMediaAttachments(storyId: string): NewsroomMediaAsset[] {
  const allMedia = buildPreviewMediaAssets();
  const attached = allMedia.filter((m) => m.usage.some((u) => u.storyId === storyId));
  if (attached.length > 0) return attached;
  return allMedia.slice(0, 3);
}

export function buildPreviewPromotionPlan(storyId: string): StoryMediaPromotionItem[] {
  return [
    {
      mediaId: "00000000-0000-4000-8000-000000007001",
      usageType: "featured",
      privateBucket: "newsroom-private",
      privateKey: `story-media/${storyId}/00000000-0000-4000-8000-000000007001/clinical-ward-vaccination.jpg`,
      filename: "clinical-ward-vaccination.jpg",
      mimeType: "image/jpeg",
      byteSize: 2458900,
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      publicStorageBucket: null,
      publicStorageKey: null,
      publicUrl: null,
      mediaStatus: "private_ready"
    },
    {
      mediaId: "00000000-0000-4000-8000-000000007002",
      usageType: "inline",
      privateBucket: "newsroom-private",
      privateKey: `story-media/${storyId}/00000000-0000-4000-8000-000000007002/water-purification-infographic.png`,
      filename: "water-purification-infographic.png",
      mimeType: "image/png",
      byteSize: 1245000,
      checksum: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      publicStorageBucket: "newsroom-public",
      publicStorageKey: `story-media/${storyId}/00000000-0000-4000-8000-000000007002/ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb/water-purification-infographic.png`,
      publicUrl: `https://preview-media.local/storage/v1/object/public/newsroom-public/story-media/${storyId}/00000000-0000-4000-8000-000000007002/ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb/water-purification-infographic.png`,
      mediaStatus: "public_staged"
    }
  ];
}

export function buildPreviewVideos(): NewsroomVideo[] {
  return [
    {
      id: "c1000000-0000-4000-a000-000000000001",
      title: "Clinical Trial Insights: Maternal Care Advances in Mashonaland Central",
      sourceUrl: "https://video.healthtimes.co.zw/interviews/maternal-care-mashonaland-2026.mp4",
      thumbnailUrl: "https://cdn.healthtimes.co.zw/media/samples/maternal-interview-thumb.jpg",
      durationSeconds: 745,
      relatedStoryId: "00000000-0000-4000-8000-000000000001",
      sourceProvenance: "direct HealthTimes field production (Harare Desk)",
      status: "draft",
      publishedAt: null,
      watchFeatured: false,
      publishedByStaffId: null,
      lockVersion: 1,
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      updatedByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-15T09:00:00.000Z",
      updatedAt: "2026-10-15T10:30:00.000Z"
    },
    {
      id: "c1000000-0000-4000-a000-000000000002",
      title: "Explainer: Understanding Seasonal Typhoid Transmission Dynamics",
      sourceUrl: "https://destination.healthtimes.co.zw/explainers/typhoid-transmission-dynamics.mp4",
      thumbnailUrl: "https://cdn.healthtimes.co.zw/media/samples/typhoid-explainer-thumb.jpg",
      durationSeconds: 312,
      relatedStoryId: "00000000-0000-4000-8000-000000000002",
      sourceProvenance: "HealthTimes multimedia explainer desk",
      status: "ready",
      publishedAt: null,
      watchFeatured: false,
      publishedByStaffId: null,
      lockVersion: 2,
      createdByStaffId: "00000000-0000-4000-8000-000000000020",
      updatedByStaffId: "00000000-0000-4000-8000-000000000020",
      createdAt: "2026-10-14T14:00:00.000Z",
      updatedAt: "2026-10-16T08:15:00.000Z"
    },
    {
      id: "c1000000-0000-4000-a000-000000000003",
      title: "Press Briefing: Regional Cholera Containment Strategy Announcement",
      sourceUrl: "https://briefings.healthtimes.co.zw/feeds/regional-cholera-briefing.mp4",
      thumbnailUrl: null,
      durationSeconds: null,
      relatedStoryId: null,
      sourceProvenance: "external verified health ministry press pool destination",
      status: "draft",
      publishedAt: null,
      watchFeatured: false,
      publishedByStaffId: null,
      lockVersion: 1,
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      updatedByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-16T11:00:00.000Z",
      updatedAt: "2026-10-16T11:00:00.000Z"
    },
    {
      id: "c1000000-0000-4000-a000-000000000004",
      title: "Laboratory Walkthrough: National Reference Genomics Sequencing",
      sourceUrl: "https://labs.healthtimes.co.zw/tours/reference-genomics-walkthrough.mp4",
      thumbnailUrl: "https://cdn.healthtimes.co.zw/media/samples/lab-walkthrough-thumb.jpg",
      durationSeconds: 490,
      relatedStoryId: "00000000-0000-4000-8000-000000000003",
      sourceProvenance: "direct HealthTimes laboratory reporting",
      status: "ready",
      publishedAt: "2026-10-16T12:00:00.000Z",
      watchFeatured: true,
      publishedByStaffId: "00000000-0000-4000-8000-000000000030",
      lockVersion: 4,
      createdByStaffId: "00000000-0000-4000-8000-000000000030",
      updatedByStaffId: "00000000-0000-4000-8000-000000000030",
      createdAt: "2026-10-13T10:00:00.000Z",
      updatedAt: "2026-10-15T16:20:00.000Z"
    },
    {
      id: "c1000000-0000-4000-a000-000000000005",
      title: "Field Dispatch: Rural Mobile Clinic Outreach in Manicaland",
      sourceUrl: "https://destination.healthtimes.co.zw/dispatch/mobile-clinic-manicaland.mp4",
      thumbnailUrl: "https://cdn.healthtimes.co.zw/media/samples/mobile-clinic-thumb.jpg",
      durationSeconds: 215,
      relatedStoryId: null,
      sourceProvenance: "HealthTimes roving medical reporting unit",
      status: "ready",
      publishedAt: "2026-10-16T10:00:00.000Z",
      watchFeatured: false,
      publishedByStaffId: "00000000-0000-4000-8000-000000000020",
      lockVersion: 3,
      createdByStaffId: "00000000-0000-4000-8000-000000000020",
      updatedByStaffId: "00000000-0000-4000-8000-000000000020",
      createdAt: "2026-10-14T08:00:00.000Z",
      updatedAt: "2026-10-16T10:00:00.000Z"
    }
  ];
}

export function buildPreviewLiveCoverage(baseNowMs: number = Date.now()): NewsroomLiveCoverage[] {
  const t = getPreviewReferenceTime(baseNowMs);
  return [
    {
      id: "d1000000-0000-4000-b000-000000000001",
      title: "LIVE: Zimbabwe National Health Summit 2026 — Keynote & Policy Announcements",
      kind: "live-blog",
      status: "live",
      scheduledAt: t.imminent4hIso,
      startedAt: t.nowIso,
      endedAt: null,
      relatedStoryId: "00000000-0000-4000-8000-000000000001",
      mediaId: "00000000-0000-4000-9000-000000000001",
      sourceProvenance: "HealthTimes Summit Reporting Desk",
      lockVersion: 3,
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      updatedByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: t.imminent4hIso,
      updatedAt: t.nowIso
    },
    {
      id: "d1000000-0000-4000-b000-000000000002",
      title: "Upcoming: Cholera Taskforce Emergency Briefing & Vaccine Logistics",
      kind: "live-blog",
      status: "upcoming",
      scheduledAt: t.tomorrowMorningIso,
      startedAt: null,
      endedAt: null,
      relatedStoryId: null,
      mediaId: null,
      sourceProvenance: "Ministry of Health press briefing pool",
      lockVersion: 1,
      createdByStaffId: "00000000-0000-4000-8000-000000000020",
      updatedByStaffId: "00000000-0000-4000-8000-000000000020",
      createdAt: t.nowIso,
      updatedAt: t.nowIso
    },
    {
      id: "d1000000-0000-4000-b000-000000000003",
      title: "Scheduled Event: WHO Regional Consultations on Maternal Health Financing",
      kind: "scheduled",
      status: "upcoming",
      scheduledAt: t.dayPlus2Iso,
      startedAt: null,
      endedAt: null,
      relatedStoryId: "00000000-0000-4000-8000-000000000002",
      mediaId: "00000000-0000-4000-9000-000000000002",
      sourceProvenance: "WHO Regional Africa Media Centre",
      lockVersion: 2,
      createdByStaffId: "00000000-0000-4000-8000-000000000030",
      updatedByStaffId: "00000000-0000-4000-8000-000000000030",
      createdAt: t.nowIso,
      updatedAt: t.nowIso
    },
    {
      id: "d1000000-0000-4000-b000-000000000004",
      title: "Concluded: Parliamentary Portfolio Committee on Health Public Hearings",
      kind: "live-blog",
      status: "ended",
      scheduledAt: t.past4dIso,
      startedAt: t.past4dIso,
      endedAt: t.past3dIso,
      relatedStoryId: "00000000-0000-4000-8000-000000000003",
      mediaId: "00000000-0000-4000-9000-000000000003",
      sourceProvenance: "HealthTimes parliamentary press gallery unit",
      lockVersion: 5,
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      updatedByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: t.past4dIso,
      updatedAt: t.past3dIso
    }
  ];
}

export function buildPreviewLiveUpdates(): NewsroomLiveUpdate[] {
  return [
    {
      id: "e1000000-0000-4000-b000-000000000003",
      coverageId: "d1000000-0000-4000-b000-000000000001",
      headline: "Ministerial panel confirms provincial cold-chain buffer expansion",
      body: "PREVIEW SAMPLE DISPATCH: Provincial health directors confirmed 98.4% uptime across solar-backed cold storage depots and announced an expanded Q4 essential medicines buffer.",
      mediaId: "00000000-0000-4000-8000-000000007001",
      publishedAt: "2026-10-16T09:10:00.000Z",
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-16T09:10:00.000Z"
    },
    {
      id: "e1000000-0000-4000-b000-000000000002",
      coverageId: "d1000000-0000-4000-b000-000000000001",
      headline: "Primary care financing framework tabled before delegates",
      body: "PREVIEW SAMPLE DISPATCH: Treasury and Ministry of Health technical teams presented the revised district primary care grant allocation formula for rural clinics.",
      mediaId: null,
      publishedAt: "2026-10-16T08:45:00.000Z",
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-16T08:45:00.000Z"
    },
    {
      id: "e1000000-0000-4000-b000-000000000001",
      coverageId: "d1000000-0000-4000-b000-000000000001",
      headline: "Summit plenary session opens in Harare",
      body: "PREVIEW SAMPLE DISPATCH: Delegates from all ten provinces have convened for the opening keynote of the National Health Summit 2026.",
      mediaId: null,
      publishedAt: "2026-10-16T08:20:00.000Z",
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-16T08:20:00.000Z"
    },
    {
      id: "e1000000-0000-4000-b000-000000000005",
      coverageId: "d1000000-0000-4000-b000-000000000004",
      headline: "Committee concludes public hearings and adjourns",
      body: "PREVIEW SAMPLE DISPATCH: The Parliamentary Portfolio Committee on Health concluded oral evidence sessions and locked the hearing transcript for legislative review.",
      mediaId: null,
      publishedAt: "2026-10-15T16:50:00.000Z",
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-15T16:50:00.000Z"
    },
    {
      id: "e1000000-0000-4000-b000-000000000004",
      coverageId: "d1000000-0000-4000-b000-000000000004",
      headline: "Provincial medical directors testify on referral hospital staffing",
      body: "PREVIEW SAMPLE DISPATCH: Provincial delegations submitted staffing and biomedical equipment maintenance schedules to the committee.",
      mediaId: null,
      publishedAt: "2026-10-15T11:30:00.000Z",
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-15T11:30:00.000Z"
    }
  ];
}

export function buildPreviewSocialAccounts(): NewsroomSocialAccount[] {
  return [
    {
      id: "f1000000-0000-4000-a000-000000000001",
      provider: "x",
      accountLabel: "@HealthTimesZW Official",
      providerAccountId: null,
      environment: "staging",
      status: "unconfigured",
      createdAt: "2026-10-12T08:00:00.000Z",
      updatedAt: "2026-10-16T08:00:00.000Z"
    },
    {
      id: "f1000000-0000-4000-a000-000000000002",
      provider: "facebook",
      accountLabel: "HealthTimes Zimbabwe Page",
      providerAccountId: "ht-fb-page-2026",
      environment: "staging",
      status: "ready",
      createdAt: "2026-10-12T08:00:00.000Z",
      updatedAt: "2026-10-16T08:30:00.000Z"
    },
    {
      id: "f1000000-0000-4000-a000-000000000003",
      provider: "linkedin",
      accountLabel: "HealthTimes Policy & Research",
      providerAccountId: null,
      environment: "staging",
      status: "unconfigured",
      createdAt: "2026-10-12T08:00:00.000Z",
      updatedAt: "2026-10-15T14:00:00.000Z"
    }
  ];
}

export function buildPreviewSocialPosts(): NewsroomSocialPost[] {
  return [
    {
      id: "f2000000-0000-4000-a000-000000000001",
      storyId: "00000000-0000-4000-8000-000000001001",
      socialAccountId: "f1000000-0000-4000-a000-000000000001",
      provider: "x",
      body: "PREVIEW SAMPLE COPY: Urban clinic cholera readiness investigation confirms 18-hour municipal water lab turnaround and expanded oral rehydration buffer stocks across 16 metropolitan clinics.",
      status: "approved",
      createdBy: "00000000-0000-4000-8000-000000000101",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: "00000000-0000-4000-8000-000000000201",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      approvedAt: "2026-10-16T09:00:00.000Z",
      scheduledAt: "2026-10-25T14:00:00.000Z",
      publishedAt: null,
      providerPostId: null,
      createdAt: "2026-10-16T08:15:00.000Z",
      updatedAt: "2026-10-16T09:00:00.000Z"
    },
    {
      id: "f2000000-0000-4000-a000-000000000002",
      storyId: "00000000-0000-4000-8000-000000001002",
      socialAccountId: "f1000000-0000-4000-a000-000000000002",
      provider: "facebook",
      body: "PREVIEW SAMPLE COPY: Provincial maternal health clinics roll out solar-backed vaccine cold-chain telemetry ahead of the Q4 immunization catchment drive.",
      status: "draft",
      createdBy: "00000000-0000-4000-8000-000000000101",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: null,
      approvedByName: null,
      approvedAt: null,
      scheduledAt: null,
      publishedAt: null,
      providerPostId: null,
      createdAt: "2026-10-16T09:20:00.000Z",
      updatedAt: "2026-10-16T09:20:00.000Z"
    },
    {
      id: "f2000000-0000-4000-a000-000000000003",
      storyId: "00000000-0000-4000-8000-000000001009",
      socialAccountId: "f1000000-0000-4000-a000-000000000002",
      provider: "facebook",
      body: "PREVIEW SAMPLE COPY: District malaria vector surveillance report highlights early indoor residual spraying milestones across lowveld wards.",
      status: "published",
      createdBy: "00000000-0000-4000-8000-000000000101",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: "00000000-0000-4000-8000-000000000201",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      approvedAt: "2026-10-15T14:00:00.000Z",
      scheduledAt: "2026-10-15T14:30:00.000Z",
      publishedAt: "2026-10-15T14:30:00.000Z",
      providerPostId: "fb_post_20261015_9901",
      createdAt: "2026-10-15T13:15:00.000Z",
      updatedAt: "2026-10-15T14:30:00.000Z"
    },
    {
      id: "f2000000-0000-4000-a000-000000000004",
      storyId: "00000000-0000-4000-8000-000000001003",
      socialAccountId: "f1000000-0000-4000-a000-000000000003",
      provider: "linkedin",
      body: "PREVIEW SAMPLE COPY: Regional antiretroviral procurement and cold-storage resilience briefing for public health supply chain directors.",
      status: "failed",
      createdBy: "00000000-0000-4000-8000-000000000101",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: "00000000-0000-4000-8000-000000000201",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      approvedAt: "2026-10-15T10:00:00.000Z",
      scheduledAt: null,
      publishedAt: null,
      providerPostId: null,
      createdAt: "2026-10-15T09:30:00.000Z",
      updatedAt: "2026-10-15T10:15:00.000Z"
    }
  ];
}

export function buildPreviewSocialAttempts(): Record<
  string,
  NewsroomSocialPublicationAttempt[]
> {
  return {
    "f2000000-0000-4000-a000-000000000001": [
      {
        id: "f3000000-0000-4000-a000-000000000001",
        socialPostId: "f2000000-0000-4000-a000-000000000001",
        attemptedBy: "00000000-0000-4000-8000-000000000201",
        provider: "x",
        status: "unconfigured",
        providerPostId: null,
        attemptedAt: "2026-10-16T09:05:00.000Z",
        completedAt: "2026-10-16T09:05:00.000Z",
        safeReason: "Provider account is not ready"
      }
    ],
    "f2000000-0000-4000-a000-000000000003": [
      {
        id: "f3000000-0000-4000-a000-000000000002",
        socialPostId: "f2000000-0000-4000-a000-000000000003",
        attemptedBy: "00000000-0000-4000-8000-000000000201",
        provider: "facebook",
        status: "succeeded",
        providerPostId: "fb_post_20261015_9901",
        attemptedAt: "2026-10-15T14:29:00.000Z",
        completedAt: "2026-10-15T14:30:00.000Z",
        safeReason: null
      }
    ],
    "f2000000-0000-4000-a000-000000000004": [
      {
        id: "f3000000-0000-4000-a000-000000000003",
        socialPostId: "f2000000-0000-4000-a000-000000000004",
        attemptedBy: "00000000-0000-4000-8000-000000000201",
        provider: "linkedin",
        status: "failed",
        providerPostId: null,
        attemptedAt: "2026-10-15T10:14:00.000Z",
        completedAt: "2026-10-15T10:15:00.000Z",
        safeReason: "Provider token expired or missing"
      }
    ]
  };
}

export function buildPreviewContactSegments(): NewsroomContactSegment[] {
  return [
    {
      id: "a0000000-0000-4000-a000-000000000001",
      key: "weekly-public-health-digest",
      name: "Weekly Public Health & Clinical Digest (Preview)",
      provider: "brevo",
      providerSegmentId: "brevo_list_401",
      syncState: "synced",
      createdAt: "2026-10-10T08:00:00.000Z",
      updatedAt: "2026-10-16T07:30:00.000Z"
    },
    {
      id: "a0000000-0000-4000-a000-000000000002",
      key: "maternal-research-fellowship",
      name: "Maternal & Pediatric Research Cohort (Preview)",
      provider: "brevo",
      providerSegmentId: null,
      syncState: "pending",
      createdAt: "2026-10-12T11:00:00.000Z",
      updatedAt: "2026-10-16T08:00:00.000Z"
    },
    {
      id: "a0000000-0000-4000-a000-000000000003",
      key: "regional-symposium-delegates",
      name: "Regional Health Policy Symposium Alerts (Preview)",
      provider: "brevo",
      providerSegmentId: null,
      syncState: "not_configured",
      createdAt: "2026-10-13T09:15:00.000Z",
      updatedAt: "2026-10-15T16:40:00.000Z"
    }
  ];
}

export function buildPreviewCampaigns(): NewsroomCampaign[] {
  return [
    {
      id: "a1000000-0000-4000-a000-000000000001",
      name: "PREVIEW — Harare Cholera & Maternal Vaccination Weekly Briefing",
      purpose: "NEWSLETTER",
      channel: "email",
      segmentId: "a0000000-0000-4000-a000-000000000001",
      provider: "brevo",
      providerCampaignId: null,
      status: "approved",
      createdBy: "00000000-0000-4000-8000-000000000101",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: "00000000-0000-4000-8000-000000000201",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      subject:
        "PREVIEW EDITION: 18-Hour Municipal Water Lab Turnaround & Q4 Cold-Chain Rollout",
      htmlContent:
        "<article><h1>HealthTimes Weekly Clinical Briefing (Preview)</h1><p>Metropolitan Harare polyclinics have cut municipal water microbiology turnaround to 18 hours while expanding oral rehydration buffer stocks across 16 high-density catchment wards.</p><p>In provincial maternal health news, solar-backed cold-chain telemetry units are now live ahead of the Q4 pediatric immunization drive.</p></article>",
      textContent:
        "HealthTimes Weekly Clinical Briefing (Preview)\n\nMetropolitan Harare polyclinics have cut municipal water microbiology turnaround to 18 hours while expanding oral rehydration buffer stocks across 16 high-density catchment wards.\n\nIn provincial maternal health news, solar-backed cold-chain telemetry units are now live ahead of the Q4 pediatric immunization drive.",
      approvedAt: "2026-10-16T09:10:00.000Z",
      scheduledAt: "2026-10-26T08:00:00.000Z",
      sentAt: null,
      createdAt: "2026-10-16T08:00:00.000Z",
      updatedAt: "2026-10-16T09:10:00.000Z"
    },
    {
      id: "a1000000-0000-4000-a000-000000000002",
      name: "PREVIEW — Friday Primary Care & Essential Medicines Dispatch",
      purpose: "NEWSLETTER",
      channel: "email",
      segmentId: "a0000000-0000-4000-a000-000000000001",
      provider: "brevo",
      providerCampaignId: null,
      status: "draft",
      createdBy: "00000000-0000-4000-8000-000000000101",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: null,
      approvedByName: null,
      subject:
        "PREVIEW DRAFT: Essential Medicines Buffer Stock Audit & Rural Clinic Solar Grid",
      htmlContent:
        "<article><h1>Friday Primary Care Dispatch (Preview Draft)</h1><p>Editorial draft reviewing provincial pharmacy depot dispatch timelines and district hospital laboratory reagent inventories.</p></article>",
      textContent:
        "Friday Primary Care Dispatch (Preview Draft)\n\nEditorial draft reviewing provincial pharmacy depot dispatch timelines and district hospital laboratory reagent inventories.",
      approvedAt: null,
      scheduledAt: null,
      sentAt: null,
      createdAt: "2026-10-16T09:45:00.000Z",
      updatedAt: "2026-10-16T09:45:00.000Z"
    },
    {
      id: "a1000000-0000-4000-a000-000000000003",
      name: "PREVIEW — Maternal & Neonatal Outcomes Quarterly Research Digest",
      purpose: "RESEARCH_UPDATES",
      channel: "email",
      segmentId: "a0000000-0000-4000-a000-000000000002",
      provider: "brevo",
      providerCampaignId: null,
      status: "approved",
      createdBy: "00000000-0000-4000-8000-000000000101",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: "00000000-0000-4000-8000-000000000201",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      subject:
        "PREVIEW RESEARCH: Neonatal Triage Protocols & District Telemetry Findings",
      htmlContent:
        "<article><h1>Maternal &amp; Neonatal Research Digest (Preview)</h1><p>Summary of peer-reviewed clinical audit findings across provincial maternity wards. Segment synchronization is currently pending Brevo list provisioning.</p></article>",
      textContent:
        "Maternal & Neonatal Research Digest (Preview)\n\nSummary of peer-reviewed clinical audit findings across provincial maternity wards. Segment synchronization is currently pending Brevo list provisioning.",
      approvedAt: "2026-10-16T08:40:00.000Z",
      scheduledAt: "2026-10-27T10:00:00.000Z",
      sentAt: null,
      createdAt: "2026-10-15T17:20:00.000Z",
      updatedAt: "2026-10-16T08:40:00.000Z"
    },
    {
      id: "a1000000-0000-4000-a000-000000000004",
      name: "PREVIEW — National Malaria Vector Control Flash Bulletin",
      purpose: "BREAKING_NEWS",
      channel: "email",
      segmentId: "a0000000-0000-4000-a000-000000000001",
      provider: "brevo",
      providerCampaignId: "brevo_camp_20261015_881",
      status: "sent",
      subject:
        "PREVIEW BULLETIN: Indoor Residual Spraying Mobilization Across Lowveld Districts",
      htmlContent:
        "<article><h1>Malaria Vector Surveillance Bulletin (Preview)</h1><p>Provincial environmental health teams have completed phase-one indoor residual spraying across priority lowveld wards.</p></article>",
      textContent:
        "Malaria Vector Surveillance Bulletin (Preview)\n\nProvincial environmental health teams have completed phase-one indoor residual spraying across priority lowveld wards.",
      approvedAt: "2026-10-15T11:00:00.000Z",
      scheduledAt: null,
      sentAt: "2026-10-15T11:30:00.000Z",
      createdAt: "2026-10-15T10:15:00.000Z",
      updatedAt: "2026-10-15T11:30:00.000Z"
    },
    {
      id: "a1000000-0000-4000-a000-000000000005",
      name: "PREVIEW — Annual Health Financing Roundtable Invitation",
      purpose: "EVENTS",
      channel: "email",
      segmentId: "a0000000-0000-4000-a000-000000000003",
      provider: "brevo",
      providerCampaignId: null,
      status: "failed",
      subject:
        "PREVIEW EVENT: Southern Africa Public Health Financing Convening Notice",
      htmlContent:
        "<article><h1>Health Financing Roundtable (Preview)</h1><p>Provider worker recorded a delivery handoff failure because the target regional events segment was not configured in Brevo.</p></article>",
      textContent:
        "Health Financing Roundtable (Preview)\n\nProvider worker recorded a delivery handoff failure because the target regional events segment was not configured in Brevo.",
      approvedAt: "2026-10-14T15:00:00.000Z",
      scheduledAt: null,
      sentAt: null,
      createdAt: "2026-10-14T14:00:00.000Z",
      updatedAt: "2026-10-14T15:20:00.000Z"
    }
  ];
}

export function buildPreviewCampaignPrepareSendResult(): NewsroomCampaignPrepareSendResult {
  return {
    campaignId: "a1000000-0000-4000-a000-000000000001",
    name: "PREVIEW — Harare Cholera & Maternal Vaccination Weekly Briefing",
    purpose: "NEWSLETTER",
    subject:
      "PREVIEW EDITION: 18-Hour Municipal Water Lab Turnaround & Q4 Cold-Chain Rollout",
    htmlContent:
      "<article><h1>HealthTimes Weekly Clinical Briefing (Preview)</h1><p>Metropolitan Harare polyclinics have cut municipal water microbiology turnaround to 18 hours while expanding oral rehydration buffer stocks across 16 high-density catchment wards.</p></article>",
    textContent:
      "HealthTimes Weekly Clinical Briefing (Preview)\n\nMetropolitan Harare polyclinics have cut municipal water microbiology turnaround to 18 hours while expanding oral rehydration buffer stocks across 16 high-density catchment wards.",
    brevoListId: "brevo_list_401",
    eligibleCount: 1420,
    noConsentCount: 94,
    suppressedCount: 18
  };
}

export function buildPreviewPushAlerts(): NewsroomPushAlert[] {
  return [
    {
      id: "d1000000-0000-4000-a000-000000000001",
      title: "PREVIEW BREAKING: Harare City Health Issues Emergency Water Quality Advisory",
      body: "Metropolitan health inspectorate directs immediate boil-water protocol across five high-density southern suburbs following rapid lab turbidity tests.",
      category: "breaking",
      status: "draft",
      destination: "/stories/preview-harare-water-emergency",
      relatedStoryId: null,
      priority: "normal",
      targetSegment: "All App Readers",
      audienceEligibility: "Devices active in last 30 days (All Wards)",
      createdBy: "e0000000-0000-4000-a000-000000000001",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      updatedBy: "e0000000-0000-4000-a000-000000000001",
      approvedBy: null,
      approvedByName: null,
      preparedBy: null,
      approvedAt: null,
      preparedAt: null,
      createdAt: "2026-10-16T10:00:00.000Z",
      updatedAt: "2026-10-16T10:00:00.000Z"
    },
    {
      id: "d1000000-0000-4000-a000-000000000002",
      title: "PREVIEW LIVE: National Malaria Vector Control Press Briefing Underway",
      body: "Director of Epidemiology is presenting district-level residual spraying coverage data live from the Ministry auditorium.",
      category: "live",
      status: "approved",
      destination: "/live",
      relatedStoryId: "00000000-0000-4000-8000-000000001001",
      priority: "high",
      targetSegment: "Breaking Health Alerts",
      audienceEligibility: "Opted-in push notification subscribers",
      scheduledAt: "2026-10-25T10:00:00.000Z",
      createdBy: "e0000000-0000-4000-a000-000000000002",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      updatedBy: "e0000000-0000-4000-a000-000000000001",
      approvedBy: "e0000000-0000-4000-a000-000000000001",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      preparedBy: null,
      approvedAt: "2026-10-16T09:30:00.000Z",
      preparedAt: null,
      createdAt: "2026-10-16T09:00:00.000Z",
      updatedAt: "2026-10-16T09:30:00.000Z"
    },
    {
      id: "d1000000-0000-4000-a000-000000000003",
      title: "PREVIEW: Maternal & Pediatric Cold-Chain Telemetry Expansion",
      body: "Provincial health leadership has commissioned 24 solar-backed vaccine refrigeration monitors in Manicaland.",
      category: "topic",
      status: "prepared",
      destination: "/topics/maternal-health",
      relatedStoryId: null,
      priority: "normal",
      targetSegment: "Maternal Health Topic",
      audienceEligibility: "Subscribers following Maternal Health topics",
      createdBy: "e0000000-0000-4000-a000-000000000003",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      updatedBy: "e0000000-0000-4000-a000-000000000001",
      approvedBy: "e0000000-0000-4000-a000-000000000001",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      preparedBy: "e0000000-0000-4000-a000-000000000001",
      approvedAt: "2026-10-15T14:00:00.000Z",
      preparedAt: "2026-10-15T14:15:00.000Z",
      createdAt: "2026-10-15T13:30:00.000Z",
      updatedAt: "2026-10-15T14:15:00.000Z"
    },
    {
      id: "d1000000-0000-4000-a000-000000000004",
      title: "PREVIEW: HealthTimes Reader App Maintenance Window Concluded",
      body: "Real-time synchronization services and offline edition cache have resumed normal operations.",
      category: "system",
      status: "prepared",
      destination: "/settings",
      relatedStoryId: null,
      priority: "normal",
      targetSegment: "System Announcements",
      audienceEligibility: "All registered active devices",
      createdBy: "e0000000-0000-4000-a000-000000000001",
      createdByName: "Newsroom Admin",
      updatedBy: "e0000000-0000-4000-a000-000000000001",
      approvedBy: "e0000000-0000-4000-a000-000000000001",
      approvedByName: "Publisher / Owner (Kudzanai Musarurwa)",
      preparedBy: "e0000000-0000-4000-a000-000000000001",
      approvedAt: "2026-10-14T02:00:00.000Z",
      preparedAt: "2026-10-14T02:05:00.000Z",
      createdAt: "2026-10-14T01:50:00.000Z",
      updatedAt: "2026-10-14T02:06:00.000Z"
    },
    {
      id: "d1000000-0000-4000-a000-000000000005",
      title: "PREVIEW: Expired Regional Health Advisory (Failed Delivery Sample)",
      body: "Simulated dispatch failure demonstration due to APNs connection timeout during regional gateway transmission.",
      category: "breaking",
      status: "prepared",
      destination: "/stories/preview-expired-advisory",
      relatedStoryId: null,
      priority: "high",
      targetSegment: "Southern Province Region",
      audienceEligibility: "Registered devices in Matabeleland and Midlands",
      createdBy: "e0000000-0000-4000-a000-000000000001",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      updatedBy: "e0000000-0000-4000-a000-000000000001",
      approvedBy: "e0000000-0000-4000-a000-000000000001",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      preparedBy: "e0000000-0000-4000-a000-000000000001",
      approvedAt: "2026-10-13T08:00:00.000Z",
      preparedAt: "2026-10-13T08:05:00.000Z",
      createdAt: "2026-10-13T07:45:00.000Z",
      updatedAt: "2026-10-13T08:10:00.000Z"
    }
  ];
}

export function buildPreviewPushAlertPrepareResult(): NewsroomPushAlertPrepareResult {
  return {
    alert_id: "d1000000-0000-4000-a000-000000000003",
    title: "PREVIEW: Maternal & Pediatric Cold-Chain Telemetry Expansion",
    body: "Provincial health leadership has commissioned 24 solar-backed vaccine refrigeration monitors in Manicaland.",
    category: "topic",
    destination: "/topics/maternal-health",
    eligible_device_count: 3840
  };
}

export function buildPreviewPushDispatchResult(
  alertId?: string
): NewsroomPushDispatchResult {
  return {
    dispatch_id: "e1000000-0000-4000-a000-000000000001",
    alert_id: alertId || "d1000000-0000-4000-a000-000000000003",
    status: "provider-accepted",
    eligible_device_count: 3840,
    provider_accepted_count: 3840,
    provider_rejected_count: 0,
    confirmed_delivery_count: 0,
    failure_reason: null,
    dispatched_at: "2026-10-15T14:20:00.000Z"
  };
}

export function buildPreviewPushDispatches(): Record<string, NewsroomPushDispatch> {
  return {
    "d1000000-0000-4000-a000-000000000004": {
      id: "e1000000-0000-4000-a000-000000000002",
      alertId: "d1000000-0000-4000-a000-000000000004",
      idempotencyKey: "preview-dispatch-key-004",
      status: "provider-accepted",
      eligibleDeviceCount: 1250,
      providerAcceptedCount: 1248,
      providerRejectedCount: 2,
      confirmedDeliveryCount: 0,
      failureReason: null,
      createdAt: "2026-10-14T02:10:00.000Z",
      updatedAt: "2026-10-14T02:10:05.000Z"
    },
    "d1000000-0000-4000-a000-000000000003": {
      id: "e1000000-0000-4000-a000-000000000003",
      alertId: "d1000000-0000-4000-a000-000000000003",
      idempotencyKey: "preview-dispatch-key-003",
      status: "dispatching",
      eligibleDeviceCount: 3840,
      providerAcceptedCount: 0,
      providerRejectedCount: 0,
      confirmedDeliveryCount: 0,
      failureReason: null,
      createdAt: "2026-10-15T14:15:00.000Z",
      updatedAt: "2026-10-15T14:15:05.000Z"
    },
    "d1000000-0000-4000-a000-000000000005": {
      id: "e1000000-0000-4000-a000-000000000005",
      alertId: "d1000000-0000-4000-a000-000000000005",
      idempotencyKey: "preview-dispatch-key-005",
      status: "delivery-failed",
      eligibleDeviceCount: 2100,
      providerAcceptedCount: 450,
      providerRejectedCount: 1650,
      confirmedDeliveryCount: 420,
      failureReason: "APNs connection timeout during regional gateway broadcast (504 Gateway Timeout).",
      createdAt: "2026-10-13T08:05:00.000Z",
      updatedAt: "2026-10-13T08:10:00.000Z"
    }
  };
}

export function buildPreviewWhatsAppBroadcasts(): NewsroomWhatsAppBroadcast[] {
  return [
    {
      id: "ba000000-0000-4000-a000-000000000001",
      title: "CHOLERA ADVISORY: Ministry of Health issues urgent water safety guidelines",
      body: "The Ministry of Health and Child Care has updated emergency treatment protocols for Harare and Chitungwiza. Residents are urged to boil drinking water and use certified treatment tablets provided at local clinics.",
      broadcastType: "breaking_alert",
      channelIdentity: "healthtimes-whatsapp-channel",
      relatedStoryId: "00000000-0000-4000-8000-000000001001",
      status: "approved",
      createdBy: "e0000000-0000-4000-a000-000000000001",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: "e0000000-0000-4000-a000-000000000001",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      rejectedBy: null,
      approvedAt: "2026-10-16T08:30:00.000Z",
      rejectedAt: null,
      sentAt: null,
      rejectionReason: null,
      createdAt: "2026-10-16T08:00:00.000Z",
      updatedAt: "2026-10-16T08:30:00.000Z",
      dispatch: null
    },
    {
      id: "ba000000-0000-4000-a000-000000000002",
      title: "HealthTimes Daily Briefing: National healthcare budget allocation highlights",
      body: "Key points from yesterday's parliamentary health portfolio committee hearings: 15% Abuja declaration target progress, domestic pharmaceutical procurement guarantees, and primary care nurse retention package.",
      broadcastType: "daily_briefing",
      channelIdentity: "healthtimes-whatsapp-channel",
      relatedStoryId: "00000000-0000-4000-8000-000000001002",
      status: "sent",
      createdBy: "e0000000-0000-4000-a000-000000000001",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: "e0000000-0000-4000-a000-000000000001",
      approvedByName: "Editor-in-Chief (Dr. Tawanda Chideme)",
      rejectedBy: null,
      approvedAt: "2026-10-15T06:00:00.000Z",
      rejectedAt: null,
      sentAt: "2026-10-15T06:05:00.000Z",
      rejectionReason: null,
      createdAt: "2026-10-15T05:30:00.000Z",
      updatedAt: "2026-10-15T06:05:00.000Z",
      dispatch: {
        id: "da000000-0000-4000-a000-000000000001",
        broadcastId: "ba000000-0000-4000-a000-000000000002",
        transportStatus: "provider-accepted",
        provider: "whatsapp_cloud_api",
        providerBroadcastId: "wamid.HBgLMjYzNzc=",
        recipientCount: 5420,
        acceptedCount: 5418,
        rejectedCount: 2,
        deliveredCount: 5120,
        readCount: 4380,
        failureReason: null,
        dispatchedAt: "2026-10-15T06:05:00.000Z"
      }
    },
    {
      id: "ba000000-0000-4000-a000-000000000003",
      title: "RESEARCH WATCH: New malaria vaccine trial begins across 4 provinces",
      body: "Phase 3 implementation studies for the R21/Matrix-M malaria vaccine are underway in high-transmission districts. Health researchers are monitoring efficacy across pediatric cohorts aged 5 to 36 months.",
      broadcastType: "story_update",
      channelIdentity: "healthtimes-whatsapp-channel",
      relatedStoryId: "00000000-0000-4000-8000-000000001003",
      status: "draft",
      createdBy: "e0000000-0000-4000-a000-000000000001",
      createdByName: "Audience Lead (Nyasha Sibanda)",
      approvedBy: null,
      rejectedBy: null,
      approvedAt: null,
      rejectedAt: null,
      sentAt: null,
      rejectionReason: null,
      createdAt: "2026-10-16T10:00:00.000Z",
      updatedAt: "2026-10-16T10:00:00.000Z",
      dispatch: null
    }
  ];
}

export function buildPreviewWhatsAppDispatchResult(
  broadcastId?: string
): NewsroomWhatsAppDispatchResult {
  return {
    dispatch_id: "da000000-0000-4000-a000-000000000002",
    broadcast_id: broadcastId || "ba000000-0000-4000-a000-000000000001",
    transport_status: "provider-accepted",
    recipient_count: 5420,
    accepted_count: 5420,
    rejected_count: 0,
    delivered_count: 0,
    read_count: 0,
    failure_reason: null,
    dispatched_at: new Date().toISOString()
  };
}

export function buildPreviewEditorialIntelligence(): NewsroomEditorialIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    storyInventory: {
      total: 5792,
      published: 5789,
      draft: 3,
      review: 3,
      scheduled: 0,
      archived: 0
    },
    publishingVelocity: {
      last24Hours: 0,
      last7Days: 0,
      last30Days: 7
    },
    reviewQueue: {
      inReviewCount: 3,
      avgAgeHours: 24.5,
      oldestAgeHours: 48.0
    },
    assignments: {
      total: 6,
      active: 5,
      overdue: 1,
      completed: 1
    },
    deskMix: [
      { desk: "Public Health", count: 2400 },
      { desk: "Policy", count: 1500 },
      { desk: "Clinical", count: 989 },
      { desk: "Investigations", count: 900 }
    ],
    distributionReach: {
      socialPostsCount: 4,
      newsletterCampaignsCount: 5,
      pushAlertsCount: 5,
      whatsappBroadcastsCount: 3
    }
  };
}

export function buildPreviewGrowthIntelligence(): NewsroomGrowthIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    integrations: [
      {
        id: "preview-ga4",
        provider: "google_analytics",
        integrationKey: "public_web",
        status: "identity_verified_account_access_pending",
        externalAccountId: "137814020",
        externalPropertyId: "359235319",
        externalMeasurementId: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastError: null,
        notes: "Property identified; awaiting service account authorization"
      },
      {
        id: "preview-gsc",
        provider: "search_console",
        integrationKey: "public_search",
        status: "property_known_account_access_pending",
        externalAccountId: null,
        externalPropertyId: "https://healthtimes.co.zw/",
        externalMeasurementId: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastError: null,
        notes: "Domain property identified; awaiting Search Console API access"
      },
      {
        id: "preview-ads",
        provider: "adsense",
        integrationKey: "public_ads",
        status: "identity_verified_reporting_access_pending",
        externalAccountId: null,
        externalPropertyId: "pub-8744434739998394",
        externalMeasurementId: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastError: null,
        notes: "Publisher ID verified; awaiting reporting API grant"
      },
      {
        id: "preview-cit",
        provider: "citations",
        integrationKey: "external_references",
        status: "provider_not_connected",
        externalAccountId: null,
        externalPropertyId: null,
        externalMeasurementId: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastError: null,
        notes: "Citation tracking provider unconfigured"
      }
    ],
    analyticsDailySummary: {
      rowsRecorded: 0,
      totalPageViews: 0,
      totalUsers: 0,
      totalSessions: 0,
      status: "pending_ingestion"
    },
    searchConsoleSummary: {
      property: "https://healthtimes.co.zw/",
      rowsRecorded: 0,
      totalClicks: 0,
      totalImpressions: 0,
      status: "pending_ingestion"
    },
    seoHealth: {
      totalStories: 5792,
      withSeoTitle: 5780,
      withSeoDescription: 5780,
      withCanonicalUrl: 5792
    },
    citationsSummary: {
      status: "provider_not_connected",
      verifiedCitationsCount: 0,
      institutionalReferencesCount: 0,
      governmentNgoMentionsCount: 0,
      notes: "Production citation tracking requires academic/cross-ref indexer API integration."
    }
  };
}

export function buildPreviewAudienceIntelligence(): NewsroomAudienceIntelligence {
  return {
    generatedAt: new Date().toISOString(),
    contacts: {
      totalProfiles: 1532,
      consentedContacts: 1420
    },
    segments: {
      totalSegments: 3,
      totalMemberships: 1420
    },
    pushSubscribers: {
      registeredDevices: 4120,
      activeDevices: 3840
    },
    whatsappDistribution: {
      totalBroadcasts: 3,
      sentBroadcasts: 1
    },
    subscribers: {
      totalSubscribers: 428,
      activeSubscribers: 395
    },
    ga4AudienceStatus: {
      propertyId: "359235319",
      accountId: "137814020",
      status: "identity_verified_account_access_pending",
      notes: "Google Analytics 4 property identified. Awaiting Data API service account grant."
    }
  };
}

export function buildPreviewStaffOperationsDirectory(): NewsroomStaffOperationsDirectory {
  return {
    staff: [
      {
        id: "prev-staff-001",
        displayName: "Kudzai Moyo",
        email: "kudzai.moyo@preview.healthtimes.co.zw",
        handle: "kudzai.moyo",
        roleId: "prev-role-001",
        roleName: "Editor-in-Chief",
        desk: "Editorial Executive",
        beat: "National Health Policy",
        country: "Zimbabwe",
        region: "Harare",
        status: "active",
        mfaRequired: true,
        lastLoginAt: "2026-10-18T08:30:00Z",
        createdAt: "2026-01-15T09:00:00Z",
        activeSessionsCount: 2,
        capabilities: [
          "story.create",
          "story.edit_all",
          "story.publish",
          "staff.manage",
          "staff.view",
          "security.manage"
        ]
      },
      {
        id: "prev-staff-002",
        displayName: "Blessing Ndlovu",
        email: "blessing.ndlovu@preview.healthtimes.co.zw",
        handle: "blessing.ndlovu",
        roleId: "prev-role-002",
        roleName: "Managing Editor",
        desk: "News Operations",
        beat: "Healthcare Infrastructure",
        country: "Zimbabwe",
        region: "Bulawayo",
        status: "active",
        mfaRequired: true,
        lastLoginAt: "2026-10-18T07:45:00Z",
        createdAt: "2026-02-01T10:00:00Z",
        activeSessionsCount: 1,
        capabilities: [
          "story.create",
          "story.edit_all",
          "story.publish",
          "assignment.manage",
          "staff.view"
        ]
      },
      {
        id: "prev-staff-003",
        displayName: "Dr. Tariro Sithole",
        email: "dr.tariro.sithole@preview.healthtimes.co.zw",
        handle: "tariro.sithole",
        roleId: "prev-role-003",
        roleName: "Health / Science Editor",
        desk: "Clinical & Science",
        beat: "Epidemiology & Oncology",
        country: "Zimbabwe",
        region: "Harare",
        status: "active",
        mfaRequired: true,
        lastLoginAt: "2026-10-17T16:20:00Z",
        createdAt: "2026-03-10T11:00:00Z",
        activeSessionsCount: 1,
        capabilities: [
          "story.health_review",
          "story.edit_all",
          "story.submit",
          "analytics.view"
        ]
      },
      {
        id: "prev-staff-004",
        displayName: "Farai Chitepo",
        email: "farai.chitepo@preview.healthtimes.co.zw",
        handle: "farai.chitepo",
        roleId: "prev-role-004",
        roleName: "Reporter / Journalist",
        desk: "Investigations",
        beat: "Public Procurement & Pharmaceuticals",
        country: "Zimbabwe",
        region: "Manicaland",
        status: "active",
        mfaRequired: true,
        lastLoginAt: "2026-10-18T09:15:00Z",
        createdAt: "2026-04-05T08:30:00Z",
        activeSessionsCount: 1,
        capabilities: ["story.create", "story.edit_own", "story.submit"]
      },
      {
        id: "prev-staff-005",
        displayName: "Nyasha Gumbo",
        email: "nyasha.gumbo@preview.healthtimes.co.zw",
        handle: "nyasha.gumbo",
        roleId: "prev-role-005",
        roleName: "Commercial Manager",
        desk: "Commercial & Growth",
        beat: "Advertising & Partnerships",
        country: "Zimbabwe",
        region: "Harare",
        status: "active",
        mfaRequired: true,
        lastLoginAt: "2026-10-17T14:10:00Z",
        createdAt: "2026-05-12T13:00:00Z",
        activeSessionsCount: 0,
        capabilities: [
          "ads.view",
          "ads.approve",
          "subscriber.manage",
          "premium.manage"
        ]
      },
      {
        id: "prev-staff-006",
        displayName: "Tinashe Shumba",
        email: "tinashe.shumba@preview.healthtimes.co.zw",
        handle: "tinashe.shumba",
        roleId: "prev-role-006",
        roleName: "Copy Editor",
        desk: "Production",
        beat: "Fact Verification",
        country: "Zimbabwe",
        region: "Midlands",
        status: "suspended",
        mfaRequired: true,
        lastLoginAt: "2026-09-30T11:00:00Z",
        createdAt: "2026-06-20T09:00:00Z",
        activeSessionsCount: 0,
        capabilities: ["story.copy_edit", "story.edit_all", "story.submit"]
      }
    ],
    invitations: [
      {
        id: "prev-inv-001",
        invitedEmail: "guest.writer@sample-medical.zw",
        displayName: "Dr. Chengetai Mutasa",
        roleName: "Contributor",
        desk: "Guest Commentary",
        country: "Zimbabwe",
        status: "pending",
        createdAt: "2026-10-16T10:00:00Z",
        expiresAt: "2026-10-19T10:00:00Z"
      }
    ],
    roles: [
      {
        id: "prev-role-001",
        name: "Publisher / Owner",
        description: "Organization executive authority; all actions remain audited.",
        capabilities: [
          "story.publish",
          "staff.manage",
          "security.manage",
          "settings.manage"
        ]
      },
      {
        id: "prev-role-002",
        name: "Editor-in-Chief",
        description: "Senior editorial review and publishing authority.",
        capabilities: [
          "story.publish",
          "story.edit_all",
          "staff.manage",
          "staff.change_role"
        ]
      },
      {
        id: "prev-role-003",
        name: "Managing Editor",
        description: "Editorial operations, assignments, review, and publishing.",
        capabilities: [
          "story.publish",
          "assignment.manage",
          "distribution.manage"
        ]
      },
      {
        id: "prev-role-004",
        name: "Reporter / Journalist",
        description: "Create, edit own/assigned stories and submit for review.",
        capabilities: ["story.create", "story.edit_own", "story.submit"]
      },
      {
        id: "prev-role-005",
        name: "Commercial Manager",
        description: "Advertising, subscriber and Premium operations without editorial publishing.",
        capabilities: ["ads.approve", "subscriber.manage", "premium.manage"]
      },
      {
        id: "prev-role-006",
        name: "Copy Editor",
        description: "Copy-edit review and style guide verification.",
        capabilities: ["story.copy_edit", "story.edit_all", "story.submit"]
      },
      {
        id: "prev-role-007",
        name: "Contributor",
        description: "External or guest writer; can draft and submit stories for editorial review.",
        capabilities: ["story.create", "story.edit_own", "story.submit"]
      }
    ],
    capabilities: [
      {
        key: "story.create",
        description: "Create newsroom stories",
        category: "editorial"
      },
      {
        key: "story.edit_own",
        description: "Edit owned or assigned stories",
        category: "editorial"
      },
      {
        key: "story.edit_all",
        description: "Edit stories across permitted desks",
        category: "editorial"
      },
      {
        key: "story.submit",
        description: "Submit story into editorial review queue",
        category: "editorial"
      },
      {
        key: "story.publish",
        description: "Publish story after editorial review gates",
        category: "editorial"
      },
      {
        key: "story.health_review",
        description: "Perform clinical health and science review",
        category: "editorial"
      },
      {
        key: "story.copy_edit",
        description: "Perform copy-editing and proofing",
        category: "editorial"
      },
      {
        key: "assignment.manage",
        description: "Create and assign reporting tasks",
        category: "editorial"
      },
      {
        key: "distribution.manage",
        description: "Manage newsletters, social, push, and WhatsApp distribution",
        category: "distribution"
      },
      {
        key: "ads.approve",
        description: "Approve advertising campaigns and placements",
        category: "commercial"
      },
      {
        key: "subscriber.manage",
        description: "Manage paid subscriber records and policies",
        category: "commercial"
      },
      {
        key: "security.manage",
        description: "Manage security posture and session policies",
        category: "audit"
      },
      {
        key: "security.view_audit",
        description: "View immutable newsroom audit logs",
        category: "audit"
      },
      {
        key: "staff.view",
        description: "View staff directory and role mappings",
        category: "staff_admin"
      },
      {
        key: "staff.manage",
        description: "Full management of staff profiles, roles, and status",
        category: "staff_admin"
      }
    ],
    auditHistory: [
      {
        id: "prev-audit-001",
        action: "staff.role.changed",
        actorStaffId: "prev-staff-001",
        actorName: "Kudzai Moyo",
        targetTable: "staff_profiles",
        targetId: "prev-staff-004",
        metadata: { previous: "Contributor", new: "Reporter / Journalist" },
        createdAt: "2026-10-17T15:30:00Z"
      },
      {
        id: "prev-audit-002",
        action: "staff.status.suspended",
        actorStaffId: "prev-staff-001",
        actorName: "Kudzai Moyo",
        targetTable: "staff_profiles",
        targetId: "prev-staff-006",
        metadata: {
          previous_status: "active",
          new_status: "suspended",
          reason: "Annual leave security hold"
        },
        createdAt: "2026-10-15T09:12:00Z"
      }
    ],
    canManageStaff: true
  };
}

export function buildPreviewAdvertisingOverview(): NewsroomAdvertisingOverview {
  return {
    advertisers: [
      {
        id: "prev-adv-001",
        name: "HOSPAZ",
        contactNotes: "Hospice and Palliative Care Association of Zimbabwe direct sponsorship",
        createdAt: "2026-09-01T00:00:00Z",
        activeCampaignsCount: 1
      },
      {
        id: "prev-adv-002",
        name: "Ministry of Health and Child Care",
        contactNotes: "National public health immunisation and awareness partner",
        createdAt: "2026-09-10T00:00:00Z",
        activeCampaignsCount: 1
      },
      {
        id: "prev-adv-003",
        name: "Cimas Health Group",
        contactNotes: "Private medical aid and wellness commercial partner",
        createdAt: "2026-09-20T00:00:00Z",
        activeCampaignsCount: 0
      }
    ],
    campaigns: [
      {
        id: "prev-camp-001",
        advertiserId: "prev-adv-001",
        advertiserName: "HOSPAZ",
        name: "HOSPAZ source continuity",
        status: "continuity_captured",
        reviewStatus: "approved",
        startAt: "2026-09-01T00:00:00Z",
        endAt: "2026-12-31T23:59:59Z",
        createdBy: "prev-staff-001",
        approvedBy: "prev-staff-001",
        approvedAt: "2026-09-01T00:00:00Z",
        createdAt: "2026-09-01T00:00:00Z",
        creativesCount: 1
      },
      {
        id: "prev-camp-002",
        advertiserId: "prev-adv-002",
        advertiserName: "Ministry of Health and Child Care",
        name: "National Cholera Prevention Campaign",
        status: "active",
        reviewStatus: "approved",
        startAt: "2026-10-01T00:00:00Z",
        endAt: "2026-11-30T23:59:59Z",
        createdBy: "prev-staff-001",
        approvedBy: "prev-staff-002",
        approvedAt: "2026-10-01T08:00:00Z",
        createdAt: "2026-09-28T12:00:00Z",
        creativesCount: 1
      },
      {
        id: "prev-camp-003",
        advertiserId: "prev-adv-003",
        advertiserName: "Cimas Health Group",
        name: "Corporate Health Screening Drive",
        status: "draft",
        reviewStatus: "pending",
        startAt: "2026-11-01T00:00:00Z",
        endAt: "2026-12-15T23:59:59Z",
        createdBy: "prev-staff-004",
        approvedBy: null,
        approvedAt: null,
        createdAt: "2026-10-16T14:20:00Z",
        creativesCount: 1
      }
    ],
    creatives: [
      {
        id: "prev-cr-001",
        campaignId: "prev-camp-001",
        campaignName: "HOSPAZ source continuity",
        placement: "hospaz-header-direct",
        destinationUrl: "https://hospaz.org.zw/",
        disclosureLabel: "Advertisement",
        status: "active",
        createdAt: "2026-09-01T00:00:00Z"
      },
      {
        id: "prev-cr-002",
        campaignId: "prev-camp-002",
        campaignName: "National Cholera Prevention Campaign",
        placement: "article-mid-inline",
        destinationUrl: "https://mohcc.gov.zw/cholera-alert",
        disclosureLabel: "Public Health Notice",
        status: "active",
        createdAt: "2026-09-28T12:00:00Z"
      },
      {
        id: "prev-cr-003",
        campaignId: "prev-camp-003",
        campaignName: "Corporate Health Screening Drive",
        placement: "sidebar-sticky",
        destinationUrl: "https://cimas.co.zw/wellness",
        disclosureLabel: "Sponsored Content",
        status: "draft",
        createdAt: "2026-10-16T14:20:00Z"
      }
    ],
    placements: [
      {
        id: "prev-plc-001",
        placementKey: "hospaz-header-direct",
        name: "Header Leaderboard Direct",
        allowedSources: ["direct", "house"],
        defaultSource: "direct",
        status: "active",
        layoutPolicy: { maxWidth: 728, maxHeight: 90, responsive: true }
      },
      {
        id: "prev-plc-002",
        placementKey: "article-mid-inline",
        name: "Article Mid-Body Inline",
        allowedSources: ["direct", "adsense", "house"],
        defaultSource: "adsense",
        status: "active",
        layoutPolicy: { insertAfterParagraph: 4, responsive: true }
      },
      {
        id: "prev-plc-003",
        placementKey: "sidebar-sticky",
        name: "Desktop Sidebar Sticky",
        allowedSources: ["direct", "adsense", "house"],
        defaultSource: "none",
        status: "active",
        layoutPolicy: { sticky: true, topOffset: 80 }
      }
    ],
    metrics: {
      totalAdvertisers: 3,
      totalCampaigns: 3,
      activeCampaigns: 2,
      pendingReviewCampaigns: 1,
      totalCreatives: 3,
      totalPlacements: 3
    }
  };
}

export function buildPreviewSubscribersDirectory(): NewsroomSubscribersDirectory {
  return {
    subscribers: [
      {
        id: "prev-sub-001",
        authUserId: "auth-sub-001",
        email: "dr.nyasha@parirenyatwa.org",
        displayName: "Dr. Nyasha Chigumba",
        status: "active",
        createdAt: "2026-02-14T08:30:00Z",
        hasActivePremium: true,
        entitlements: [
          {
            id: "prev-ent-001",
            policyKey: "premium",
            startsAt: "2026-02-14T08:30:00Z",
            endsAt: "2027-02-14T08:30:00Z",
            provider: "stripe",
            providerReference: "sub_1Omqxyz982",
            isActive: true
          }
        ]
      },
      {
        id: "prev-sub-002",
        authUserId: "auth-sub-002",
        email: "sarah.chikwava@who.int",
        displayName: "Sarah Chikwava",
        status: "active",
        createdAt: "2026-04-10T11:00:00Z",
        hasActivePremium: true,
        entitlements: [
          {
            id: "prev-ent-002",
            policyKey: "premium",
            startsAt: "2026-04-10T11:00:00Z",
            endsAt: "2026-11-10T11:00:00Z",
            provider: "staff_grant",
            providerReference: "grant_who_desk",
            isActive: true
          }
        ]
      },
      {
        id: "prev-sub-003",
        authUserId: "auth-sub-003",
        email: "tafadzwa.moyo@healthtimes.co.zw",
        displayName: "Tafadzwa Moyo",
        status: "active",
        createdAt: "2026-05-18T14:45:00Z",
        hasActivePremium: false,
        entitlements: []
      },
      {
        id: "prev-sub-004",
        authUserId: "auth-sub-004",
        email: "blessings.mutasa@gmail.com",
        displayName: "Blessings Mutasa",
        status: "suspended",
        createdAt: "2026-01-20T09:15:00Z",
        hasActivePremium: false,
        entitlements: [
          {
            id: "prev-ent-004",
            policyKey: "premium",
            startsAt: "2026-01-20T09:15:00Z",
            endsAt: "2026-07-20T09:15:00Z",
            provider: "ecocash",
            providerReference: "txn_eco_88712",
            isActive: false
          }
        ]
      }
    ],
    totalCount: 428,
    metrics: {
      totalSubscribers: 428,
      activeSubscribers: 395,
      premiumSubscribers: 184,
      suspendedSubscribers: 12,
      canceledSubscribers: 21
    }
  };
}

export function buildPreviewPremiumOperationsOverview(): NewsroomPremiumOperationsOverview {
  return {
    policies: [
      {
        key: "public",
        name: "Public Open Access",
        description: "Unrestricted reading access for all readers across Web and App platforms.",
        isMetered: false
      },
      {
        key: "premium",
        name: "Premium Subscriber Access",
        description: "Exclusive deep health investigative reporting, clinical analyses, and member briefings.",
        isMetered: true
      }
    ],
    teaserPolicy: {
      authority: "Publisher / Editorial Access Policy",
      enabled: true,
      durationSeconds: 20,
      paragraphCount: 1,
      enforcement: "Strict reader-facing body truncation after lead paragraph and 20s preview window"
    },
    inventoryBreakdown: {
      totalStories: 5792,
      premiumStoriesCount: 842,
      publicStoriesCount: 4950
    },
    recentPremiumStories: [
      {
        id: "00000000-0000-4000-8000-000000001001",
        title: "Inside Zimbabwe's Oncology Crisis: Radiotherapy Blackouts and Drug Procurement Holes",
        status: "published",
        accessPolicy: "premium",
        publishedAt: "2026-10-15T08:00:00Z",
        updatedAt: "2026-10-15T10:30:00Z"
      },
      {
        id: "00000000-0000-4000-8000-000000001002",
        title: "Clinical Deep Dive: Pediatric Antiretroviral Rollout In Mashonaland Central",
        status: "published",
        accessPolicy: "premium",
        publishedAt: "2026-10-12T14:15:00Z",
        updatedAt: "2026-10-12T14:15:00Z"
      },
      {
        id: "00000000-0000-4000-8000-000000001003",
        title: "Cross-Border Health Finance: The True Cost of Medical Tourism to South Africa and India",
        status: "published",
        accessPolicy: "premium",
        publishedAt: "2026-10-08T09:00:00Z",
        updatedAt: "2026-10-08T11:00:00Z"
      }
    ],
    subscriberStats: {
      totalSubscribers: 428,
      activeEntitlementsCount: 184,
      totalEntitledSubscribers: 184,
      providers: [
        { provider: "stripe", count: 112 },
        { provider: "staff_grant", count: 42 },
        { provider: "ecocash", count: 22 },
        { provider: "in_app", count: 8 }
      ]
    }
  };
}

export function buildPreviewAiAssistOverview(): NewsroomAiAssistOverview {
  return {
    providerStatus: "active",
    providerModel: "HealthTimes Editorial Heuristics / Gemini 1.5 Assistant",
    safetyPolicy: {
      canPublish: false,
      canApprove: false,
      canBypassReview: false,
      humanReviewRequired: true,
      principle: "AI is restricted to reviewable suggestions and drafting assistance. Direct story publication or silent mutation is strictly prohibited."
    },
    supportedTasks: [
      { id: "headline_alternatives", name: "Headline Alternatives", description: "Generate engaging, punchy, and policy-accurate news headlines" },
      { id: "seo_alternatives", name: "SEO Alternatives", description: "Generate search-optimized titles and meta descriptions" },
      { id: "summary", name: "Executive Summary", description: "Condense complex medical or public health copy into clear standfirsts" },
      { id: "evidence_gap", name: "Evidence Gap Detection", description: "Analyze copy for missing sources, statistics, or balance" },
      { id: "citation_suggestion", name: "Citation Suggestions", description: "Identify potential academic, WHO, or MOHCC citations" },
      { id: "interview_questions", name: "Interview Questions", description: "Generate targeted questions for public health officials and experts" },
      { id: "claim_fact_check", name: "Fact-Check Claim Flagging", description: "Highlight claims requiring independent evidence verification" }
    ],
    metrics: {
      totalSessions: 18,
      taskCounts: {
        headline_alternatives: 8,
        seo_alternatives: 4,
        evidence_gap: 3,
        citation_suggestion: 2,
        summary: 1
      }
    },
    recentSessions: [
      {
        id: "prev-ai-sess-001",
        storyId: "prev-story-001",
        storyTitle: "Harare Water Treatment Chemical Stockpiles Fall Below Reserve Thresholds",
        taskType: "headline_alternatives",
        inputPrompt: "Harare water treatment chemical supply and waterborne disease risks",
        inputContext: "City council reports 12-day stockpile of chlorine gas and aluminum sulphate.",
        suggestions: [
          {
            type: "straight_news",
            text: "Harare Water Crisis: Chemical Reserves Dwindle Below Minimum Safe Thresholds",
            rationale: "Factual news lead prioritizing municipal supply vulnerability"
          },
          {
            type: "analytical",
            text: "Why Capital Water Shortages Threaten National Typhoid and Cholera Containment",
            rationale: "Systemic epidemiological framing connecting utility deficits to clinical risks"
          },
          {
            type: "impact_focused",
            text: "What Two-Week Chemical Buffer Means for Two Million Harare Residents",
            rationale: "Citizen-focused framing translating tonnage into human health exposure"
          }
        ],
        provider: "editorial_heuristics_fallback",
        providerStatus: "active",
        status: "completed",
        safetyFlags: {
          canPublish: false,
          canApprove: false,
          canBypassReview: false,
          humanReviewRequired: true
        },
        createdBy: "prev-staff-001",
        createdAt: "2026-10-17T14:30:00Z"
      },
      {
        id: "prev-ai-sess-002",
        storyId: "prev-story-002",
        storyTitle: "NatPharm Expedited Antibiotic Procurement Reaches Provincial Referral Hospitals",
        taskType: "evidence_gap",
        inputPrompt: "Checking NatPharm delivery figures against hospital pharmacy receipts",
        inputContext: "Ministry press release announces 400 metric tonnes delivered nationwide.",
        suggestions: [
          {
            type: "gap_identification",
            text: "Triangulate central warehouse dispatch manifests with district hospital store ledgers in Matabeleland South.",
            rationale: "Verification against last-mile delivery discrepancies"
          },
          {
            type: "source_balance",
            text: "Include perspective from Hospital Doctors Association regarding cold-chain integrity during distribution.",
            rationale: "Ensures frontline clinical feedback on medication efficacy"
          }
        ],
        provider: "editorial_heuristics_fallback",
        providerStatus: "active",
        status: "completed",
        safetyFlags: {
          canPublish: false,
          canApprove: false,
          canBypassReview: false,
          humanReviewRequired: true
        },
        createdBy: "prev-staff-002",
        createdAt: "2026-10-17T11:15:00Z"
      }
    ]
  };
}

export function buildPreviewCitationsDirectory(): NewsroomCitationsDirectory {
  return {
    metrics: {
      totalCitations: 24,
      verifiedCount: 16,
      unverifiedCount: 5,
      flaggedCount: 2,
      rejectedCount: 1,
      academicCount: 14
    },
    citations: [
      {
        id: "prev-cit-001",
        storyId: "prev-story-001",
        storyTitle: "Harare Water Treatment Chemical Stockpiles Fall Below Reserve Thresholds",
        storySlug: "harare-water-treatment-stockpiles",
        referenceType: "academic",
        sourceName: "Central African Journal of Medicine (Sample Preview Source)",
        sourceUrl: "https://sample-citation.preview.invalid/cajm/2025/04/12 (Sample Non-Live URL)",
        title: "Vibrio cholerae Transmission Dynamics Across Urban Harare Wetlands (2022-2025) [Sample Study]",
        citedAt: "2026-10-12",
        country: "Zimbabwe",
        authorityScore: 92,
        provider: "crossref",
        providerReference: "10.1052/sample.cajm.2025.04.12",
        status: "verified",
        verifiedBy: "Dr. Tawanda Chideme",
        verifiedAt: "2026-10-13T14:00:00Z",
        verificationBasis: "Sample peer-reviewed journal citation record (Volume 71 — Preview Only)",
        excerpt: "Sample excerpt: Water sampling conducted between November 2024 and March 2025 indicated detectable Vibrio strains in 34% of unlined shallow wells in Highfield and Glen View.",
        doi: "10.1052/sample.cajm.2025.04.12 (Sample Non-Live DOI)",
        authorsOrOrganization: "Dr. R. Chikwanda, Prof. T. Moyo — University of Zimbabwe Public Health Unit (Sample Authors)",
        publicationDate: "2025-04-12",
        createdAt: "2026-10-12T10:00:00Z"
      },
      {
        id: "prev-cit-002",
        storyId: "prev-story-002",
        storyTitle: "NatPharm Expedited Antibiotic Procurement Reaches Provincial Referral Hospitals",
        storySlug: "natpharm-expedited-procurement",
        referenceType: "institutional",
        sourceName: "Ministry of Health and Child Care (MoHCC — Sample Preview Bulletin)",
        sourceUrl: "https://sample-citation.preview.invalid/mohcc/essential-medicines-2026-q3.pdf (Sample Non-Live URL)",
        title: "National Essential Medicines List and Standard Treatment Guidelines (Sample Preview Edition)",
        citedAt: "2026-10-14",
        country: "Zimbabwe",
        authorityScore: 98,
        provider: "gov_repository",
        providerReference: "MOHCC-EML-2026-03-SAMPLE",
        status: "verified",
        verifiedBy: "Farai Moyo",
        verifiedAt: "2026-10-14T11:00:00Z",
        verificationBasis: "Sample MoHCC Gazette and NatPharm delivery schedule fixture (Preview Only)",
        excerpt: "Sample excerpt: Consolidated procurement tables show Q3 distribution of second-line injectables reached 94% coverage across provincial central medical stores.",
        doi: "10.1000/sample.mohcc.eml.2026.03 (Sample Non-Live DOI)",
        authorsOrOrganization: "Directorate of Pharmacy Services, Ministry of Health and Child Care (Sample Organization)",
        publicationDate: "2026-09-30",
        createdAt: "2026-10-14T08:30:00Z"
      },
      {
        id: "prev-cit-003",
        storyId: null,
        storyTitle: null,
        storySlug: null,
        referenceType: "ngo",
        sourceName: "Doctors Without Borders (MSF — Sample Preview Report)",
        sourceUrl: "https://sample-citation.preview.invalid/msf/zimbabwe-maternal-health-review-2025 (Sample Non-Live URL)",
        title: "Community-Led Maternal Health Delivery in Rural Epworth and Chipinge [Sample Report]",
        citedAt: "2026-10-16",
        country: "Zimbabwe",
        authorityScore: 85,
        provider: "msf_index",
        providerReference: "MSF-ZW-2025-08-SAMPLE",
        status: "unverified",
        verifiedBy: null,
        verifiedAt: null,
        verificationBasis: "Awaiting field report verification (Sample Preview Record)",
        excerpt: "Sample excerpt: Decentralized mobile clinics operated in Manicaland demonstrated a 42% reduction in postpartum travel times for rural expectant mothers.",
        doi: "10.5281/sample.zenodo.msf-zw-2025 (Sample Non-Live DOI)",
        authorsOrOrganization: "MSF Southern Africa Medical Unit (Sample Organization)",
        publicationDate: "2025-08-19",
        createdAt: "2026-10-16T15:20:00Z"
      }
    ]
  };
}

export function buildPreviewAuthorsDirectory(): NewsroomAuthorsDirectory {
  return {
    metrics: {
      totalAuthors: 8,
      migratedAuthorsCount: 5,
      boundAuthorsCount: 4,
      unboundAuthorsCount: 4
    },
    authors: [
      {
        id: "auth-001",
        displayName: "Dr. Kudzai Musarurwa",
        slug: "kudzai-musarurwa",
        bio: "Health systems specialist and editor-in-chief covering southern African public health policy.",
        wordpressSourceId: "wp-author-12",
        role: "Editor-in-Chief",
        desk: "Executive Editorial",
        status: "Active",
        createdAt: "2024-01-15T09:00:00Z",
        storyCount: 42,
        boundStaffId: "staff-001",
        boundStaffName: "Kudzai Musarurwa",
        boundStaffEmail: "kudzai@healthtimes.co.zw"
      },
      {
        id: "auth-002",
        displayName: "Catherine Murombedzi",
        slug: "catherine-murombedzi",
        bio: "Senior health journalist focusing on HIV/TB epidemiology and maternal healthcare.",
        wordpressSourceId: "wp-author-14",
        role: "Senior Correspondent",
        desk: "Epidemiology & Maternal",
        status: "Active",
        createdAt: "2024-02-10T10:00:00Z",
        storyCount: 38,
        boundStaffId: "staff-002",
        boundStaffName: "Catherine Murombedzi",
        boundStaffEmail: "catherine@healthtimes.co.zw"
      },
      {
        id: "auth-003",
        displayName: "Michael Gwarisa",
        slug: "michael-gwarisa",
        bio: "Investigative reporter reporting on pharmaceuticals, healthcare financing, and health governance.",
        wordpressSourceId: "wp-author-19",
        role: "Investigative Reporter",
        desk: "Pharmaceuticals & Finance",
        status: "Active",
        createdAt: "2024-03-01T11:00:00Z",
        storyCount: 29,
        boundStaffId: "staff-003",
        boundStaffName: "Michael Gwarisa",
        boundStaffEmail: "michael@healthtimes.co.zw"
      },
      {
        id: "auth-004",
        displayName: "Tafadzwa Chigandiwa",
        slug: "tafadzwa-chigandiwa",
        bio: "Desk editor and public health researcher specializing in non-communicable diseases.",
        wordpressSourceId: "wp-author-22",
        role: "Desk Editor",
        desk: "Non-Communicable Diseases",
        status: "Active",
        createdAt: "2024-04-12T08:30:00Z",
        storyCount: 19,
        boundStaffId: "staff-004",
        boundStaffName: "Tafadzwa Chigandiwa",
        boundStaffEmail: "tafadzwa@healthtimes.co.zw"
      },
      {
        id: "auth-005",
        displayName: "HealthTimes Editorial Board",
        slug: "healthtimes-editorial-board",
        bio: "Official institutional byline for consensus editorial positions and public health notices.",
        wordpressSourceId: "wp-author-01",
        role: "Editorial Collective",
        desk: "Institutional Desk",
        status: "Active",
        createdAt: "2023-11-01T00:00:00Z",
        storyCount: 56,
        boundStaffId: null,
        boundStaffName: null,
        boundStaffEmail: null
      },
      {
        id: "auth-006",
        displayName: "Dr. Rutendo Mashonganyika",
        slug: "dr-rutendo-mashonganyika",
        bio: "Guest clinical contributor, consultant pediatrician at Parirenyatwa Group of Hospitals.",
        wordpressSourceId: null,
        role: "Guest Contributor",
        desk: "Pediatrics & Clinical",
        status: "External",
        createdAt: "2025-05-18T14:15:00Z",
        storyCount: 7,
        boundStaffId: null,
        boundStaffName: null,
        boundStaffEmail: null
      },
      {
        id: "auth-007",
        displayName: "Farai Muringani",
        slug: "farai-muringani",
        bio: "Digital content and broadcast reporter reporting from Midlands and Matabeleland.",
        wordpressSourceId: null,
        role: "Provincial Reporter",
        desk: "Midlands & Matabeleland",
        status: "Active",
        createdAt: "2025-08-20T11:00:00Z",
        storyCount: 12,
        boundStaffId: null,
        boundStaffName: null,
        boundStaffEmail: null
      },
      {
        id: "auth-008",
        displayName: "Memory Ndlovu",
        slug: "memory-ndlovu",
        bio: "Community reporter focusing on rural WASH access, clinic infrastructure, and nutritional health.",
        wordpressSourceId: null,
        createdAt: "2025-09-04T16:00:00Z",
        storyCount: 15,
        boundStaffId: null,
        boundStaffName: null,
        boundStaffEmail: null
      }
    ]
  };
}

export function buildPreviewTaxonomyDirectory(): NewsroomTaxonomyDirectory {
  return {
    metrics: {
      totalSections: 8,
      rootSectionsCount: 6
    },
    sections: [
      {
        id: "sec-001",
        name: "Public Health",
        slug: "public-health",
        parentId: null,
        parentName: null,
        wordpressSourceId: "wp-cat-101",
        createdAt: "2024-01-01T00:00:00Z",
        storyCount: 84
      },
      {
        id: "sec-002",
        name: "Epidemiology & Outbreaks",
        slug: "epidemiology-outbreaks",
        parentId: "sec-001",
        parentName: "Public Health",
        wordpressSourceId: "wp-cat-102",
        createdAt: "2024-01-01T00:00:00Z",
        storyCount: 36
      },
      {
        id: "sec-003",
        name: "Maternal & Child Health",
        slug: "maternal-child-health",
        parentId: "sec-001",
        parentName: "Public Health",
        wordpressSourceId: "wp-cat-103",
        createdAt: "2024-01-01T00:00:00Z",
        storyCount: 28
      },
      {
        id: "sec-004",
        name: "Pharmaceuticals & Supplies",
        slug: "pharmaceuticals-supplies",
        parentId: null,
        parentName: null,
        wordpressSourceId: "wp-cat-104",
        createdAt: "2024-01-01T00:00:00Z",
        storyCount: 41
      },
      {
        id: "sec-005",
        name: "Health Financing & Policy",
        slug: "health-financing-policy",
        parentId: null,
        parentName: null,
        wordpressSourceId: "wp-cat-105",
        createdAt: "2024-01-01T00:00:00Z",
        storyCount: 32
      },
      {
        id: "sec-006",
        name: "Clinical Practice",
        slug: "clinical-practice",
        parentId: null,
        parentName: null,
        wordpressSourceId: "wp-cat-106",
        createdAt: "2024-01-01T00:00:00Z",
        storyCount: 25
      },
      {
        id: "sec-007",
        name: "Mental Health",
        slug: "mental-health",
        parentId: null,
        parentName: null,
        wordpressSourceId: "wp-cat-107",
        createdAt: "2024-01-01T00:00:00Z",
        storyCount: 18
      },
      {
        id: "sec-008",
        name: "Nutrition & Food Safety",
        slug: "nutrition-food-safety",
        parentId: null,
        parentName: null,
        wordpressSourceId: "wp-cat-108",
        createdAt: "2024-01-01T00:00:00Z",
        storyCount: 21
      }
    ]
  };
}

export function buildPreviewPlatformSettingsOverview(): NewsroomPlatformSettingsOverview {
  return {
    settings: [
      {
        key: "editorial_require_review",
        category: "editorial",
        description: "Enforce two-person editorial gate before publishing",
        value: { enabled: true, min_approvals: 1 },
        updatedAt: "2026-10-18T00:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "paywall_hard_enforcement",
        category: "monetization",
        description: "Enforce meter limit across all reader devices",
        value: { enabled: true, free_monthly_quota: 5 },
        updatedAt: "2026-10-17T18:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "ai_editorial_assist_enabled",
        category: "editorial",
        description: "Allow Gemini AI assistant in story workspace",
        value: { enabled: true, model: "gemini-2.5-flash", require_source_grounding: true },
        updatedAt: "2026-10-18T02:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "maintenance_mode",
        category: "infrastructure",
        description: "Put reader public client into maintenance mode",
        value: { enabled: false, message: null },
        updatedAt: "2026-10-15T12:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "comment_policy",
        category: "security",
        description: "Moderation policy for public reader discussions",
        value: { policy: "pre_moderated", allow_anonymous: false },
        updatedAt: "2026-10-16T10:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "whatsapp_distribution",
        category: "distribution",
        description: "Meta WhatsApp Cloud API distribution configuration",
        value: { phone_number_id: "10984729182371", waba_id: "9827361829102", default_channel: "healthtimes-daily" },
        updatedAt: "2026-10-17T14:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "brevo_email_distribution",
        category: "distribution",
        description: "Brevo transactional and newsletter campaign settings",
        value: { sender_email: "newsdesk@healthtimes.co.zw", sender_name: "HealthTimes Zimbabwe", list_id: 4 },
        updatedAt: "2026-10-16T09:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "google_analytics_4",
        category: "analytics",
        description: "GA4 reader traffic measurement ID",
        value: { measurement_id: "GA4-SAMPLE", property_id: "492817291" },
        updatedAt: "2026-10-14T11:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "search_console_growth",
        category: "analytics",
        description: "Google Search Console domain verification",
        value: { site_url: "sc-domain:healthtimes.co.zw", verified: true },
        updatedAt: "2026-10-14T11:00:00Z",
        updatedBy: "staff-001"
      },
      {
        key: "push_fcm_apns",
        category: "distribution",
        description: "Push notification dispatch configuration",
        value: { apns_topic: "zw.co.healthtimes.reader", fcm_project: "htp-zw-staging" },
        updatedAt: "2026-10-17T12:00:00Z",
        updatedBy: "staff-001"
      }
    ],
    integrations: {
      whatsapp: {
        name: "WhatsApp Cloud API",
        provider: "Meta Graph API",
        status: "unconfigured",
        secretConfigured: false,
        phoneNumberId: "10984729182371",
        wabaId: "9827361829102",
        webhookUrl: "https://bzuvntbkevvuhfhqhkua.edge.internal/functions/v1/whatsapp-webhook"
      },
      brevo: {
        name: "Brevo Email API",
        provider: "Brevo API v3",
        status: "configured",
        secretConfigured: true,
        senderEmail: "newsdesk@healthtimes.co.zw",
        senderName: "HealthTimes Zimbabwe"
      },
      ga4: {
        name: "Google Analytics 4",
        provider: "Google Analytics Data API v1beta",
        status: "property_verified",
        secretConfigured: false,
        propertyId: "492817291",
        measurementId: "GA4-SAMPLE"
      },
      search_console: {
        name: "Google Search Console",
        provider: "Google Search Console API v1",
        status: "healthy",
        secretConfigured: false,
        siteUrl: "sc-domain:healthtimes.co.zw",
        verified: true
      },
      gemini_ai: {
        name: "Google Gemini 2.5",
        provider: "Google Generative AI API",
        status: "active",
        secretConfigured: true,
        defaultModel: "gemini-2.5-flash",
        edgeFunction: "newsroom-ai-assist"
      },
      database_backend: {
        name: "Staging Database Cluster",
        provider: "PostgreSQL 15 / PostgREST / GoTrue / Storage",
        status: "healthy",
        secretConfigured: true,
        projectRef: "bzuvntbkevvuhfhqhkua",
        appliedMigrations: 83,
        region: "ap-northeast-1"
      }
    },
    auditSummary: {
      totalAuditEvents24h: 47,
      lastAuditAction: "platform_setting_updated",
      lastAuditAt: "2026-10-18T03:15:00Z"
    }
  };
}

// ============================================================================
// Sample Finance & Accounting Data Builders (Owner Visual Preview)
// ============================================================================

export function buildPreviewCustomers(): NewsroomCustomer[] {
  return [
    {
      id: "cust-sample-1",
      advertiserId: "adv-1",
      name: "Health Corp Zimbabwe Ltd",
      legalName: "Health Corporation of Zimbabwe Private Limited",
      billingEmail: "accounts@healthcorp.co.zw",
      billingPhone: "+263 242 700100",
      billingAddress: "124 Samora Machel Ave, Harare, Zimbabwe",
      taxNumber: "TIN-ZW-20019283",
      currency: "USD",
      paymentTermsDays: 30,
      status: "active",
      metadata: { sample: true },
      createdAt: "2026-09-01T08:00:00Z",
      updatedAt: "2026-10-15T10:00:00Z"
    },
    {
      id: "cust-sample-2",
      advertiserId: "adv-2",
      name: "PharmaCare International",
      legalName: "PharmaCare Global Holdings Inc",
      billingEmail: "finance@pharmacare.co.zw",
      billingPhone: "+263 242 880200",
      billingAddress: "45 Borrowdale Rd, Harare, Zimbabwe",
      taxNumber: "TIN-ZW-99201123",
      currency: "USD",
      paymentTermsDays: 30,
      status: "active",
      metadata: { sample: true },
      createdAt: "2026-09-10T09:00:00Z",
      updatedAt: "2026-10-18T12:00:00Z"
    },
    {
      id: "cust-sample-3",
      advertiserId: "adv-3",
      name: "UNICEF Zimbabwe Public Health",
      legalName: "United Nations Children's Fund - Harare Country Office",
      billingEmail: "zw-billing@unicef.org",
      billingPhone: "+263 242 703941",
      billingAddress: "6 Fairbridge Ave, Belgravia, Harare, Zimbabwe",
      taxNumber: "UN-DIPLOMATIC-EXEMPT",
      currency: "USD",
      paymentTermsDays: 60,
      status: "active",
      metadata: { sample: true },
      createdAt: "2026-09-15T11:00:00Z",
      updatedAt: "2026-10-20T14:00:00Z"
    }
  ];
}

export function buildPreviewCommercialOrders(): NewsroomCommercialOrder[] {
  return [
    {
      id: "ord-sample-1",
      orderNumber: "ORD-2026-0001",
      customerId: "cust-sample-1",
      customerName: "Health Corp Zimbabwe Ltd",
      campaignId: "camp-1",
      campaignName: "National Vaccination Awareness Q4",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      currency: "USD",
      subtotal: 1500.0,
      taxAmount: 225.0,
      discountAmount: 100.0,
      total: 1625.0,
      status: "approved",
      billingStatus: "billed",
      notes: "Masthead banner + weekly newsletter sponsorship slot.",
      submittedBy: "staff-commercial-1",
      approvedBy: "staff-owner-1",
      approvedAt: "2026-09-28T10:00:00Z",
      createdAt: "2026-09-25T08:00:00Z",
      updatedAt: "2026-09-28T10:00:00Z"
    },
    {
      id: "ord-sample-2",
      orderNumber: "ORD-2026-0002",
      customerId: "cust-sample-2",
      customerName: "PharmaCare International",
      campaignId: "camp-2",
      campaignName: "Essential Medicines Directory Campaign",
      startDate: "2026-10-15",
      endDate: "2026-11-15",
      currency: "USD",
      subtotal: 900.0,
      taxAmount: 135.0,
      discountAmount: 0.0,
      total: 1035.0,
      status: "approved",
      billingStatus: "billed",
      notes: "Sponsored content in-article placements across policy and pharma desks.",
      submittedBy: "staff-commercial-1",
      approvedBy: "staff-owner-1",
      approvedAt: "2026-10-12T14:30:00Z",
      createdAt: "2026-10-10T11:00:00Z",
      updatedAt: "2026-10-12T14:30:00Z"
    }
  ];
}

export function buildPreviewInvoices(): NewsroomInvoiceItem[] {
  return [
    {
      id: "inv-sample-1",
      invoiceNumber: "INV-2026-0001",
      customerId: "cust-sample-1",
      customerName: "Health Corp Zimbabwe Ltd",
      orderId: "ord-sample-1",
      orderNumber: "ORD-2026-0001",
      status: "paid",
      effectiveStatus: "paid",
      issueDate: "2026-10-01",
      dueDate: "2026-10-31",
      currency: "USD",
      subtotal: 1500.0,
      taxTotal: 225.0,
      discountTotal: 100.0,
      total: 1625.0,
      amountPaid: 1625.0,
      balanceDue: 0.0,
      daysOverdue: 0,
      paymentTermsDays: 30,
      paymentCount: 1,
      notes: "Settled in full via Stanbic RTGS/USD transfer.",
      createdBy: "staff-accounts-1",
      approvedBy: "staff-fmgr-1",
      approvedAt: "2026-10-01T09:00:00Z",
      createdAt: "2026-10-01T08:30:00Z",
      updatedAt: "2026-10-05T11:00:00Z"
    },
    {
      id: "inv-sample-2",
      invoiceNumber: "INV-2026-0002",
      customerId: "cust-sample-2",
      customerName: "PharmaCare International",
      orderId: "ord-sample-2",
      orderNumber: "ORD-2026-0002",
      status: "partially_paid",
      effectiveStatus: "partially_paid",
      issueDate: "2026-10-10",
      dueDate: "2026-11-09",
      currency: "USD",
      subtotal: 900.0,
      taxTotal: 135.0,
      discountTotal: 0.0,
      total: 1035.0,
      amountPaid: 500.0,
      balanceDue: 535.0,
      daysOverdue: 0,
      paymentTermsDays: 30,
      paymentCount: 1,
      notes: "50% upfront deposit received.",
      createdBy: "staff-accounts-1",
      approvedBy: "staff-fmgr-1",
      approvedAt: "2026-10-10T10:00:00Z",
      createdAt: "2026-10-10T09:15:00Z",
      updatedAt: "2026-10-15T16:00:00Z"
    },
    {
      id: "inv-sample-3",
      invoiceNumber: "INV-2026-0003",
      customerId: "cust-sample-3",
      customerName: "UNICEF Zimbabwe Public Health",
      orderId: null,
      orderNumber: null,
      status: "issued",
      effectiveStatus: "overdue",
      issueDate: "2026-08-15",
      dueDate: "2026-09-15",
      currency: "USD",
      subtotal: 750.0,
      taxTotal: 0.0,
      discountTotal: 0.0,
      total: 750.0,
      amountPaid: 0.0,
      balanceDue: 750.0,
      daysOverdue: 36,
      paymentTermsDays: 30,
      paymentCount: 0,
      notes: "Public Health Bulletin joint sponsorship (36 days overdue).",
      createdBy: "staff-accounts-1",
      approvedBy: "staff-fmgr-1",
      approvedAt: "2026-08-15T10:00:00Z",
      createdAt: "2026-08-15T09:00:00Z",
      updatedAt: "2026-09-16T00:00:00Z"
    }
  ];
}

export function buildPreviewPayments(): NewsroomPaymentItem[] {
  return [
    {
      id: "pay-sample-1",
      paymentNumber: "PAY-2026-0001",
      invoiceId: "inv-sample-1",
      invoiceNumber: "INV-2026-0001",
      customerId: "cust-sample-1",
      customerName: "Health Corp Zimbabwe Ltd",
      amount: 1625.0,
      currency: "USD",
      paymentDate: "2026-10-05",
      paymentMethod: "bank_transfer",
      reference: "STANBIC-TRF-90281",
      notes: "Full payment for INV-2026-0001",
      recordedBy: "staff-accounts-1",
      recordedByName: "Accounts Officer",
      createdAt: "2026-10-05T11:00:00Z"
    },
    {
      id: "pay-sample-2",
      paymentNumber: "PAY-2026-0002",
      invoiceId: "inv-sample-2",
      invoiceNumber: "INV-2026-0002",
      customerId: "cust-sample-2",
      customerName: "PharmaCare International",
      amount: 500.0,
      currency: "USD",
      paymentDate: "2026-10-15",
      paymentMethod: "bank_transfer",
      reference: "CABS-USD-11928",
      notes: "Initial deposit for INV-2026-0002",
      recordedBy: "staff-accounts-1",
      recordedByName: "Accounts Officer",
      createdAt: "2026-10-15T16:00:00Z"
    }
  ];
}

export function buildPreviewExpenses(): NewsroomExpenseItem[] {
  return [
    {
      id: "exp-sample-1",
      expenseNumber: "EXP-2026-0001",
      expenseDate: "2026-10-14",
      vendorName: "Harare Express Cabs",
      category: "travel",
      description: "Field reporting travel to Parirenyatwa General Hospital",
      department: "Editorial",
      storyId: null,
      amount: 45.0,
      currency: "USD",
      taxAmount: 0.0,
      receiptReference: "RCPT-HC-1092",
      receiptUrl: null,
      status: "paid",
      paymentStatus: "paid",
      paidAt: "2026-10-16T12:00:00Z",
      paymentReference: "CASH-DISB-082",
      rejectionReason: null,
      submittedBy: "staff-reporter-1",
      submittedByName: "Rutendo Shumba",
      approvedBy: "staff-fmgr-1",
      approvedByName: "Farai Moyo",
      approvedAt: "2026-10-15T09:00:00Z",
      createdAt: "2026-10-14T17:00:00Z",
      updatedAt: "2026-10-16T12:00:00Z"
    },
    {
      id: "exp-sample-2",
      expenseNumber: "EXP-2026-0002",
      expenseDate: "2026-10-18",
      vendorName: "Freelance Photojournalist (K. Ndlovu)",
      category: "freelance",
      description: "Photo essay on rural clinic solar power installations in Manicaland",
      department: "Editorial",
      storyId: null,
      amount: 120.0,
      currency: "USD",
      taxAmount: 0.0,
      receiptReference: "INV-NDLOVU-04",
      receiptUrl: null,
      status: "approved",
      paymentStatus: "unpaid",
      paidAt: null,
      paymentReference: null,
      rejectionReason: null,
      submittedBy: "staff-editor-1",
      submittedByName: "Dr. Tawanda Chideme",
      approvedBy: "staff-fmgr-1",
      approvedByName: "Farai Moyo",
      approvedAt: "2026-10-19T10:00:00Z",
      createdAt: "2026-10-18T14:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z"
    },
    {
      id: "exp-sample-3",
      expenseNumber: "EXP-2026-0003",
      expenseDate: "2026-10-20",
      vendorName: "Stationery Depot Harare",
      category: "office",
      description: "Newsroom printer toner cartridges & reporting notepads",
      department: "Finance",
      storyId: null,
      amount: 65.0,
      currency: "USD",
      taxAmount: 9.75,
      receiptReference: "REC-SD-9921",
      receiptUrl: null,
      status: "submitted",
      paymentStatus: "unpaid",
      paidAt: null,
      paymentReference: null,
      rejectionReason: null,
      submittedBy: "staff-accounts-1",
      submittedByName: "Accounts Officer",
      approvedBy: null,
      approvedByName: null,
      approvedAt: null,
      createdAt: "2026-10-20T11:00:00Z",
      updatedAt: "2026-10-20T11:00:00Z"
    },
    {
      id: "exp-sample-4",
      expenseNumber: "EXP-2026-0004",
      expenseDate: "2026-10-22",
      vendorName: "Rainbow Towers Hotel",
      category: "travel",
      description: "Executive travel & venue hosting for Southern Africa Health Summit",
      department: "Executive",
      storyId: null,
      amount: 250.0,
      currency: "USD",
      taxAmount: 0.0,
      receiptReference: "RCPT-RT-8841",
      receiptUrl: "https://healthtimes.co.zw/receipts/RT-8841.pdf",
      status: "submitted",
      paymentStatus: "unpaid",
      paidAt: null,
      paymentReference: null,
      rejectionReason: null,
      submittedBy: "staff-owner-1",
      submittedByName: "Kudzanai Musarurwa",
      approvedBy: null,
      approvedByName: null,
      approvedAt: null,
      createdAt: "2026-10-22T09:30:00Z",
      updatedAt: "2026-10-22T09:30:00Z"
    }
  ];
}

export function buildPreviewReceivablesAging(): NewsroomReceivablesAging {
  return {
    totals: [
      {
        currency: "USD",
        notDue: 535.0,
        d1_30: 0.0,
        d31_60: 750.0,
        d61_90: 0.0,
        d90Plus: 0.0,
        totalOutstanding: 1285.0
      }
    ],
    customers: [
      {
        customerId: "cust-sample-2",
        customerName: "PharmaCare International",
        currency: "USD",
        notDue: 535.0,
        d1_30: 0.0,
        d31_60: 0.0,
        d61_90: 0.0,
        d90Plus: 0.0,
        totalOutstanding: 535.0,
        invoiceCount: 1
      },
      {
        customerId: "cust-sample-3",
        customerName: "UNICEF Zimbabwe Public Health",
        currency: "USD",
        notDue: 0.0,
        d1_30: 0.0,
        d31_60: 750.0,
        d61_90: 0.0,
        d90Plus: 0.0,
        totalOutstanding: 750.0,
        invoiceCount: 1
      }
    ]
  };
}

export function buildPreviewFinanceOverview(): NewsroomFinanceOverview {
  return {
    byCurrency: [
      {
        currency: "USD",
        invoicedTotal: 3410.0,
        revenueCollected: 2125.0,
        receivablesOutstanding: 1285.0,
        receivablesOverdue: 750.0,
        expensesApproved: 165.0,
        expensesPaid: 45.0,
        operatingCashNet: 2080.0,
        openInvoicesCount: 2,
        overdueInvoicesCount: 1
      }
    ],
    counts: {
      openInvoices: 2,
      overdueInvoices: 1,
      pendingExpenses: 1,
      approvedUnpaidExpenses: 1,
      activeCustomers: 3,
      pendingOrders: 0
    }
  };
}

export function buildPreviewFinanceStatements(): NewsroomFinanceStatements {
  return {
    period: {
      startDate: "2026-10-01",
      endDate: "2026-10-31"
    },
    balanceSheet:
      "Reconciled with General Ledger Statement of Financial Position (Total Assets: USD 3,365.00 = Total Liabilities: USD 564.78 + Total Equity: USD 2,800.22). Sample presentation data only.",
    incomeStatement: [
      {
        currency: "USD",
        revenue: 2965.22,
        expenses: 165.0,
        netOperatingSurplus: 2800.22
      }
    ],
    revenueByPlacement: [
      { placement: "masthead", currency: "USD", revenue: 1847.83 },
      { placement: "newsletter", currency: "USD", revenue: 465.22 },
      { placement: "sponsored_content", currency: "USD", revenue: 652.17 }
    ],
    cashReceipts: [
      { method: "bank_transfer", currency: "USD", totalAmount: 2125.0, receiptsCount: 1 }
    ],
    expenseSummary: [
      { category: "travel", currency: "USD", totalAmount: 45.0, count: 1 },
      { category: "freelance", currency: "USD", totalAmount: 120.0, count: 1 }
    ]
  };
}

export function buildPreviewChartOfAccounts(): NewsroomChartOfAccount[] {
  return [
    { id: "coa-1000", accountCode: "1000", accountName: "Operating Cash / Bank", accountType: "ASSET", description: "Main operational bank accounts", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-1200", accountCode: "1200", accountName: "Accounts Receivable (Trade)", accountType: "ASSET", description: "Trade receivables from advertising and sponsors", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-2000", accountCode: "2000", accountName: "Accounts Payable (Trade)", accountType: "LIABILITY", description: "Trade payables to vendors, contributors, stringers", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-2100", accountCode: "2100", accountName: "VAT Output Tax Payable", accountType: "LIABILITY", description: "15% Zimbabwe VAT collected on advertising invoices", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-3000", accountCode: "3000", accountName: "Retained Earnings / Initial Capital", accountType: "EQUITY", description: "Accumulated operational surplus", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-4000", accountCode: "4000", accountName: "Direct Advertising Revenue", accountType: "REVENUE", description: "Direct banner, display, and bespoke campaigns", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-4100", accountCode: "4100", accountName: "Subscription & Reader Revenue", accountType: "REVENUE", description: "Direct reader premium recurring subscriptions", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-5000", accountCode: "5000", accountName: "Editorial & Reporting Expenses", accountType: "EXPENSE", description: "Stringer fees, story commissioning, fact-checking", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-5100", accountCode: "5100", accountName: "Travel & Field Investigation", accountType: "EXPENSE", description: "Provincial clinic visits, field travel, transport", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-5200", accountCode: "5200", accountName: "Technology & Platform Hosting", accountType: "EXPENSE", description: "Cloud database, Cloud Run, Vercel, Expo EAS, telephony", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-5300", accountCode: "5300", accountName: "Marketing & Audience Acquisition", accountType: "EXPENSE", description: "WhatsApp push, newsletters, social campaigns", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" },
    { id: "coa-5400", accountCode: "5400", accountName: "Administrative & Office Expenses", accountType: "EXPENSE", description: "Newsroom workspace, utilities, legal, compliance", isActive: true, currency: "USD", createdAt: "2026-01-01T00:00:00Z" }
  ];
}

export function buildPreviewFiscalPeriods(): NewsroomFiscalPeriod[] {
  return [
    { id: "fp-2026-q4", periodName: "FY2026-Q4", startDate: "2026-10-01", endDate: "2026-12-31", status: "OPEN", lockedAt: null, lockedBy: null, createdAt: "2026-01-01T00:00:00Z" },
    { id: "fp-2026-q3", periodName: "FY2026-Q3", startDate: "2026-07-01", endDate: "2026-09-30", status: "CLOSED", lockedAt: null, lockedBy: null, createdAt: "2026-01-01T00:00:00Z" },
    { id: "fp-2026-q2", periodName: "FY2026-Q2", startDate: "2026-04-01", endDate: "2026-06-30", status: "LOCKED", lockedAt: "2026-07-15T00:00:00Z", lockedBy: "Publisher / Owner", createdAt: "2026-01-01T00:00:00Z" },
    { id: "fp-2026-q1", periodName: "FY2026-Q1", startDate: "2026-01-01", endDate: "2026-03-31", status: "LOCKED", lockedAt: "2026-04-15T00:00:00Z", lockedBy: "Publisher / Owner", createdAt: "2026-01-01T00:00:00Z" }
  ];
}

export function buildPreviewTrialBalance(): NewsroomTrialBalance {
  return {
    periodId: "fp-2026-q4",
    currency: "USD",
    accounts: [
      { accountId: "coa-1000", accountCode: "1000", accountName: "Operating Cash / Bank", accountType: "ASSET", debitTotal: 2125.0, creditTotal: 45.0, netBalance: 2080.0 },
      { accountId: "coa-1200", accountCode: "1200", accountName: "Accounts Receivable (Trade)", accountType: "ASSET", debitTotal: 3410.0, creditTotal: 2125.0, netBalance: 1285.0 },
      { accountId: "coa-2000", accountCode: "2000", accountName: "Accounts Payable (Trade)", accountType: "LIABILITY", debitTotal: 45.0, creditTotal: 165.0, netBalance: 120.0 },
      { accountId: "coa-2100", accountCode: "2100", accountName: "VAT Output Tax Payable", accountType: "LIABILITY", debitTotal: 0.0, creditTotal: 444.78, netBalance: 444.78 },
      { accountId: "coa-4000", accountCode: "4000", accountName: "Direct Advertising Revenue", accountType: "REVENUE", debitTotal: 0.0, creditTotal: 2965.22, netBalance: 2965.22 },
      { accountId: "coa-5000", accountCode: "5000", accountName: "Editorial & Reporting Expenses", accountType: "EXPENSE", debitTotal: 120.0, creditTotal: 0.0, netBalance: 120.0 },
      { accountId: "coa-5100", accountCode: "5100", accountName: "Travel & Field Investigation", accountType: "EXPENSE", debitTotal: 45.0, creditTotal: 0.0, netBalance: 45.0 }
    ],
    totalDebits: 5745.0,
    totalCredits: 5745.0,
    isBalanced: true
  };
}

export function buildPreviewProfitAndLoss(): NewsroomProfitAndLoss {
  return {
    fromDate: "2026-10-01",
    toDate: "2026-10-31",
    currency: "USD",
    revenues: [
      { accountCode: "4000", accountName: "Direct Advertising Revenue", amount: 2965.22 }
    ],
    totalRevenue: 2965.22,
    expenses: [
      { accountCode: "5000", accountName: "Editorial & Reporting Expenses", amount: 120.0 },
      { accountCode: "5100", accountName: "Travel & Field Investigation", amount: 45.0 }
    ],
    totalExpenses: 165.0,
    netOperatingSurplus: 2800.22
  };
}

export function buildPreviewBalanceSheet(): NewsroomBalanceSheet {
  return {
    asOfDate: "2026-10-31",
    currency: "USD",
    assets: [
      { accountCode: "1000", accountName: "Operating Cash / Bank", amount: 2080.0 },
      { accountCode: "1200", accountName: "Accounts Receivable (Trade)", amount: 1285.0 }
    ],
    totalAssets: 3365.0,
    liabilities: [
      { accountCode: "2000", accountName: "Accounts Payable (Trade)", amount: 120.0 },
      { accountCode: "2100", accountName: "VAT Output Tax Payable", amount: 444.78 }
    ],
    totalLiabilities: 564.78,
    equity: [
      { accountCode: "3999", accountName: "Current Period Operating Surplus / Retained Earnings", amount: 2800.22 }
    ],
    totalEquity: 2800.22,
    totalLiabilitiesAndEquity: 3365.0,
    isBalanced: true
  };
}

export function buildPreviewCustomerStatement(customerId?: string): NewsroomCustomerStatement {
  return {
    customerId: customerId ?? "cust-sample-1",
    customerName: "Health Corp Zimbabwe Ltd",
    currency: "USD",
    fromDate: "2026-10-01",
    toDate: "2026-10-31",
    openingBalance: 0.0,
    totalInvoiced: 2125.0,
    totalPaid: 2125.0,
    totalCredits: 0.0,
    closingBalance: 0.0,
    activity: [
      { type: "invoice", reference: "INV-2026-0001", activityDate: "2026-10-02", amount: 2125.0, memo: "Cholera Awareness Campaign Masthead Sponsorship" },
      { type: "payment", reference: "PAY-2026-0001", activityDate: "2026-10-08", amount: 2125.0, memo: "Settlement via Bank Wire Ref #BW-8829" }
    ]
  };
}

export function buildPreviewJournals(): NewsroomJournalEntry[] {
  return [
    {
      id: "jrn-sample-1",
      entryNumber: "JRN-2026-0001",
      entryDate: "2026-10-02",
      periodId: "fp-2026-q4",
      status: "posted",
      source: "invoice",
      sourceId: "inv-sample-1",
      currency: "USD",
      memo: "Operational Invoice Issued: INV-2026-0001",
      postedAt: "2026-10-02T10:00:00Z",
      createdAt: "2026-10-02T10:00:00Z",
      lines: [
        { lineNumber: 1, accountId: "coa-1200", accountCode: "1200", accountName: "Accounts Receivable", debit: 2125.0, credit: 0.0, description: "Customer receivable for INV-2026-0001" },
        { lineNumber: 2, accountId: "coa-4000", accountCode: "4000", accountName: "Advertising Revenue", debit: 0.0, credit: 1847.83, description: "Net advertising revenue" },
        { lineNumber: 3, accountId: "coa-2100", accountCode: "2100", accountName: "VAT Output Tax", debit: 0.0, credit: 277.17, description: "15% VAT output tax" }
      ]
    },
    {
      id: "jrn-sample-2",
      entryNumber: "JRN-2026-0002",
      entryDate: "2026-10-08",
      periodId: "fp-2026-q4",
      status: "posted",
      source: "payment",
      sourceId: "pay-sample-1",
      currency: "USD",
      memo: "Customer Payment: PAY-2026-0001 (INV-2026-0001)",
      postedAt: "2026-10-08T14:30:00Z",
      createdAt: "2026-10-08T14:30:00Z",
      lines: [
        { lineNumber: 1, accountId: "coa-1000", accountCode: "1000", accountName: "Operating Cash / Bank", debit: 2125.0, credit: 0.0, description: "Cash receipt for INV-2026-0001" },
        { lineNumber: 2, accountId: "coa-1200", accountCode: "1200", accountName: "Accounts Receivable", debit: 0.0, credit: 2125.0, description: "Clear AR via PAY-2026-0001" }
      ]
    }
  ];
}


