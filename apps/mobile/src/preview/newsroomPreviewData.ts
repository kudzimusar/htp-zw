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
  StoryMediaPromotionItem
} from "../domain/models";

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
  | "create-edit";

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

export function buildPreviewLiveCoverage(): NewsroomLiveCoverage[] {
  return [
    {
      id: "d1000000-0000-4000-b000-000000000001",
      title: "LIVE: Zimbabwe National Health Summit 2026 — Keynote & Policy Announcements",
      kind: "live-blog",
      status: "live",
      scheduledAt: "2026-10-16T08:00:00.000Z",
      startedAt: "2026-10-16T08:15:00.000Z",
      endedAt: null,
      relatedStoryId: "00000000-0000-4000-8000-000000000001",
      mediaId: "00000000-0000-4000-9000-000000000001",
      sourceProvenance: "HealthTimes Summit Reporting Desk",
      lockVersion: 3,
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      updatedByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-16T07:30:00.000Z",
      updatedAt: "2026-10-16T08:15:00.000Z"
    },
    {
      id: "d1000000-0000-4000-b000-000000000002",
      title: "Upcoming: Cholera Taskforce Emergency Briefing & Vaccine Logistics",
      kind: "live-blog",
      status: "upcoming",
      scheduledAt: "2026-10-18T09:30:00.000Z",
      startedAt: null,
      endedAt: null,
      relatedStoryId: null,
      mediaId: null,
      sourceProvenance: "Ministry of Health press briefing pool",
      lockVersion: 1,
      createdByStaffId: "00000000-0000-4000-8000-000000000020",
      updatedByStaffId: "00000000-0000-4000-8000-000000000020",
      createdAt: "2026-10-16T11:00:00.000Z",
      updatedAt: "2026-10-16T11:00:00.000Z"
    },
    {
      id: "d1000000-0000-4000-b000-000000000003",
      title: "Scheduled Event: WHO Regional Consultations on Maternal Health Financing",
      kind: "scheduled",
      status: "upcoming",
      scheduledAt: "2026-10-20T10:00:00.000Z",
      startedAt: null,
      endedAt: null,
      relatedStoryId: "00000000-0000-4000-8000-000000000002",
      mediaId: "00000000-0000-4000-9000-000000000002",
      sourceProvenance: "WHO Regional Africa Media Centre",
      lockVersion: 2,
      createdByStaffId: "00000000-0000-4000-8000-000000000030",
      updatedByStaffId: "00000000-0000-4000-8000-000000000030",
      createdAt: "2026-10-15T14:00:00.000Z",
      updatedAt: "2026-10-16T09:00:00.000Z"
    },
    {
      id: "d1000000-0000-4000-b000-000000000004",
      title: "Concluded: Parliamentary Portfolio Committee on Health Public Hearings",
      kind: "live-blog",
      status: "ended",
      scheduledAt: "2026-10-15T09:00:00.000Z",
      startedAt: "2026-10-15T09:10:00.000Z",
      endedAt: "2026-10-15T17:00:00.000Z",
      relatedStoryId: "00000000-0000-4000-8000-000000000003",
      mediaId: "00000000-0000-4000-9000-000000000003",
      sourceProvenance: "HealthTimes parliamentary press gallery unit",
      lockVersion: 5,
      createdByStaffId: "00000000-0000-4000-8000-000000000010",
      updatedByStaffId: "00000000-0000-4000-8000-000000000010",
      createdAt: "2026-10-14T10:00:00.000Z",
      updatedAt: "2026-10-15T17:00:00.000Z"
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
      approvedBy: "00000000-0000-4000-8000-000000000201",
      approvedAt: "2026-10-16T09:00:00.000Z",
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
      approvedBy: null,
      approvedAt: null,
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
      approvedBy: "00000000-0000-4000-8000-000000000201",
      approvedAt: "2026-10-15T14:00:00.000Z",
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
      approvedBy: "00000000-0000-4000-8000-000000000201",
      approvedAt: "2026-10-15T10:00:00.000Z",
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
      subject:
        "PREVIEW EDITION: 18-Hour Municipal Water Lab Turnaround & Q4 Cold-Chain Rollout",
      htmlContent:
        "<article><h1>HealthTimes Weekly Clinical Briefing (Preview)</h1><p>Metropolitan Harare polyclinics have cut municipal water microbiology turnaround to 18 hours while expanding oral rehydration buffer stocks across 16 high-density catchment wards.</p><p>In provincial maternal health news, solar-backed cold-chain telemetry units are now live ahead of the Q4 pediatric immunization drive.</p></article>",
      textContent:
        "HealthTimes Weekly Clinical Briefing (Preview)\n\nMetropolitan Harare polyclinics have cut municipal water microbiology turnaround to 18 hours while expanding oral rehydration buffer stocks across 16 high-density catchment wards.\n\nIn provincial maternal health news, solar-backed cold-chain telemetry units are now live ahead of the Q4 pediatric immunization drive.",
      approvedAt: "2026-10-16T09:10:00.000Z",
      scheduledAt: null,
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
      subject:
        "PREVIEW RESEARCH: Neonatal Triage Protocols & District Telemetry Findings",
      htmlContent:
        "<article><h1>Maternal &amp; Neonatal Research Digest (Preview)</h1><p>Summary of peer-reviewed clinical audit findings across provincial maternity wards. Segment synchronization is currently pending Brevo list provisioning.</p></article>",
      textContent:
        "Maternal & Neonatal Research Digest (Preview)\n\nSummary of peer-reviewed clinical audit findings across provincial maternity wards. Segment synchronization is currently pending Brevo list provisioning.",
      approvedAt: "2026-10-16T08:40:00.000Z",
      scheduledAt: null,
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
