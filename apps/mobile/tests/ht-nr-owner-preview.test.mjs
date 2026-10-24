import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function loadTsModule(relPath, stubs = {}) {
  const fullPath = path.join(root, relPath);
  const source = fs.readFileSync(fullPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText;

  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id in stubs) return stubs[id];
    if (id === "../platform/config") {
      return { appEnvironment: "staging" };
    }
    if (id.startsWith(".")) {
      const resolved = path.resolve(path.dirname(fullPath), id);
      for (const ext of [".ts", ".tsx", ".js"]) {
        if (fs.existsSync(resolved + ext)) {
          return loadTsModule(path.relative(root, resolved + ext), stubs);
        }
      }
    }
    throw new Error(`Unexpected require in unit test: ${id}`);
  };

  const fn = new Function("exports", "require", "module", "process", transpiled);
  fn(mod.exports, customRequire, mod, process);
  return mod.exports;
}

const previewData = loadTsModule("src/preview/newsroomPreviewData.ts");

test("HT-NR-VIS-01: visible Owner Preview routes exactly match generated static module routes", () => {
  assert.ok(
    fs.existsSync(path.join(root, "app/owner-preview/studio/index.tsx")),
    "app/owner-preview/studio/index.tsx must exist"
  );
  assert.ok(
    fs.existsSync(path.join(root, "app/owner-preview/studio/[module].tsx")),
    "app/owner-preview/studio/[module].tsx must exist"
  );

  const moduleRouteSource = read("app/owner-preview/studio/[module].tsx");
  assert.match(moduleRouteSource, /OWNER_PREVIEW_DYNAMIC_MODULE_SLUGS/);

  const visiblePreviewRoutes = previewData.OWNER_PREVIEW_DOMAINS.flatMap(
    (domain) => domain.items.map((item) => item.path)
  );
  const dynamicPreviewRoutes = visiblePreviewRoutes.filter(
    (route) => route !== "/owner-preview/studio"
  );
  const dynamicPreviewSlugs = dynamicPreviewRoutes.map((route) =>
    route.slice("/owner-preview/studio/".length)
  );

  assert.equal(visiblePreviewRoutes.length, 38);
  assert.equal(dynamicPreviewRoutes.length, 37);
  assert.equal(new Set(visiblePreviewRoutes).size, visiblePreviewRoutes.length);
  assert.deepEqual(
    previewData.OWNER_PREVIEW_DYNAMIC_MODULE_SLUGS,
    dynamicPreviewSlugs
  );

  for (const requiredFinanceSlug of [
    "finance-trial-balance",
    "finance-pnl",
    "finance-balance-sheet",
    "finance-journals"
  ]) {
    assert.ok(dynamicPreviewSlugs.includes(requiredFinanceSlug));
  }
});
test("HT-NR-VIS-01: Environment & Production Guard fails closed when flag is absent or in production", () => {
  const { isOwnerPreviewEnabled, OWNER_PREVIEW_UNAVAILABLE_MESSAGE } =
    previewData;

  assert.equal(
    OWNER_PREVIEW_UNAVAILABLE_MESSAGE,
    "Owner Preview is unavailable in this build."
  );

  // Flag absent / empty / 0 / false -> disabled
  assert.equal(
    isOwnerPreviewEnabled({ previewFlag: undefined, environment: "staging" }),
    false
  );
  assert.equal(
    isOwnerPreviewEnabled({ previewFlag: "", environment: "staging" }),
    false
  );
  assert.equal(
    isOwnerPreviewEnabled({ previewFlag: "0", environment: "staging" }),
    false
  );
  assert.equal(
    isOwnerPreviewEnabled({ previewFlag: "false", environment: "development" }),
    false
  );

  // Production environment -> ALWAYS disabled even if previewFlag is "1" or "true"
  assert.equal(
    isOwnerPreviewEnabled({ previewFlag: "1", environment: "production" }),
    false
  );
  assert.equal(
    isOwnerPreviewEnabled({ previewFlag: "true", environment: "production" }),
    false
  );
  assert.equal(
    isOwnerPreviewEnabled({
      previewFlag: "1",
      environment: "staging",
      serviceMode: "production"
    }),
    false
  );

  // Non-production + explicit "1" or "true" -> enabled
  assert.equal(
    isOwnerPreviewEnabled({
      previewFlag: "1",
      environment: "staging",
      serviceMode: "staging"
    }),
    true
  );
  assert.equal(
    isOwnerPreviewEnabled({
      previewFlag: "true",
      environment: "development",
      serviceMode: "local"
    }),
    true
  );

  const studioPreviewSource = read("src/preview/OwnerPreviewStudio.tsx");
  assert.ok(studioPreviewSource.includes("isOwnerPreviewEnabled()"));
  assert.ok(studioPreviewSource.includes("OWNER_PREVIEW_UNAVAILABLE_MESSAGE"));
});

test("HT-NR-VIS-01: Persistent watermark and explicit preview labels are present on every preview page", () => {
  assert.equal(
    previewData.OWNER_PREVIEW_WATERMARK,
    "OWNER VISUAL PREVIEW · SAMPLE DATA · WRITES DISABLED"
  );
  const studioPreviewSource = read("src/preview/OwnerPreviewStudio.tsx");
  assert.ok(studioPreviewSource.includes("OWNER_PREVIEW_WATERMARK"));
  assert.ok(studioPreviewSource.includes("OWNER VISUAL PREVIEW"));
  assert.ok(studioPreviewSource.includes("SAMPLE PRESENTATION DATA"));
  assert.ok(studioPreviewSource.includes("WRITES DISABLED"));
});

test("HT-NR-VIS-01: Sample preview data covers all required workflow stages, assignment stages, and fictional staff without impersonating real identities", () => {
  const fixedNow = Date.parse("2026-10-16T10:00:00.000Z");
  const stories = previewData.buildPreviewStories(fixedNow);
  const assignments = previewData.buildPreviewAssignments(fixedNow);

  assert.ok(stories.length >= 9, "Must provide at least 9 sample stories");
  assert.ok(
    assignments.length >= 6,
    "Must provide at least 6 sample assignments"
  );

  // Every sample story title starts with PREVIEW —
  for (const s of stories) {
    assert.ok(
      s.title.startsWith("PREVIEW —"),
      `Story title must be explicitly labeled PREVIEW: ${s.title}`
    );
  }

  // Every workflow state is represented
  const workflowStates = new Set(stories.map((s) => s.workflowStatus));
  for (const requiredState of [
    "Draft",
    "Submitted",
    "Fact check",
    "Health / Science review",
    "Copy edit",
    "Editor review",
    "Ready",
    "Scheduled",
    "Published"
  ]) {
    assert.ok(
      workflowStates.has(requiredState),
      `Sample stories must cover workflow state: ${requiredState}`
    );
  }

  // Public and Premium access policies both represented
  assert.ok(stories.some((s) => s.accessPolicy === "public"));
  assert.ok(stories.some((s) => s.accessPolicy === "premium"));

  // Every assignment status is represented
  const assignmentStatuses = new Set(assignments.map((a) => a.status));
  for (const st of [
    "Assigned",
    "Accepted",
    "Reporting",
    "Drafting",
    "Submitted",
    "Complete"
  ]) {
    assert.ok(
      assignmentStatuses.has(st),
      `Sample assignments must cover status: ${st}`
    );
  }

  // Fictional staff profiles use @example.invalid and Preview names
  for (const staff of previewData.PREVIEW_STAFF_DIRECTORY) {
    assert.ok(staff.displayName.startsWith("Preview "));
    assert.ok(staff.email.endsWith("@example.invalid"));
  }
});

test("HT-NR-VIS-01: Preview surfaces reuse canonical UI/domain logic and never invoke real write services or Supabase write RPCs", () => {
  const studioPreviewSource = read("src/preview/OwnerPreviewStudio.tsx");
  const workspacePreviewSource = read(
    "src/preview/OwnerPreviewStoryWorkspace.tsx"
  );
  const previewDataSource = read("src/preview/newsroomPreviewData.ts");
  const combined =
    studioPreviewSource + "\n" + workspacePreviewSource + "\n" + previewDataSource;

  // Reuses real exported helpers from StudioStories, StudioReviewQueue, StudioPlanningBoard, StudioEditorialCalendar
  assert.ok(studioPreviewSource.includes('from "../ui/StudioStories"'));
  assert.ok(studioPreviewSource.includes('from "../ui/StudioReviewQueue"'));
  assert.ok(studioPreviewSource.includes('from "../ui/StudioPlanningBoard"'));
  assert.ok(
    studioPreviewSource.includes('from "../ui/StudioEditorialCalendar"')
  );

  // Never imports services or supabase client in preview modules
  assert.equal(/from ["']\.\.\/services["']/.test(combined), false);
  assert.equal(/supabase/i.test(combined), false);

  // Never calls any newsroom write RPC
  for (const rpc of [
    "newsroom_create_story",
    "newsroom_save_story",
    "newsroom_autosave_story",
    "newsroom_submit_story_for_review",
    "newsroom_request_story_changes",
    "newsroom_record_story_review",
    "newsroom_transition_story_workflow",
    "newsroom_publish_story",
    "newsroom_schedule_story",
    "newsroom_restore_story_revision",
    "newsroom_create_assignment",
    "newsroom_progress_assignment"
  ]) {
    assert.equal(
      combined.includes(rpc),
      false,
      `Preview code must never invoke ${rpc}`
    );
  }

  // Includes explicit non-persistence feedback
  assert.ok(combined.includes("Preview state only — not saved"));
});

test("HT-NR-VIS-01: Unfinished placeholder modules are omitted from Owner Preview navigation and Today dashboard has zero AG-04/AG-05/AG-06/CP7 archaeology", () => {
  const navLabels = previewData.OWNER_PREVIEW_NAV_ITEMS.map((i) => i.label);
  assert.deepEqual(navLabels, [
    "Today",
    "Stories",
    "Review Queue",
    "Planning",
    "My Assignments",
    "Calendar",
    "Homepage",
    "Media Library",
    "Video Desk",
    "Live Desk",
    "Social Desk",
    "Newsletter Desk",
    "Push Alerts",
    "WhatsApp Desk",
    "Analytics & Intelligence",
    "Audience",
    "Search & Growth",
    "Staff & Roles",
    "Advertising",
    "Subscribers",
    "Premium Policies",
    "AI Desk & Citations",
    "Authors & Taxonomy",
    "Platform Settings",
    "Story Workspace"
  ]);

  for (const unfinished of [
    "Inbox",
    "Desks",
    "Breaking"
  ]) {
    assert.equal(
      navLabels.includes(unfinished),
      false,
      `Owner Preview navigation must omit unfinished module: ${unfinished}`
    );
  }

  const studioPreviewSource = read("src/preview/OwnerPreviewStudio.tsx");
  for (const forbidden of [
    "AG-04",
    "AG-05",
    "AG-06",
    "CP7",
    "PRODUCTION CUTOVER",
    "CERTIFIED PARENT / CLIENT PROJECTION PENDING"
  ]) {
    assert.equal(
      studioPreviewSource.includes(forbidden),
      false,
      `OwnerPreviewStudio must not contain programme archaeology: ${forbidden}`
    );
  }

  // Real /studio/[module].tsx remains protected by StudioAccessGate and StudioAuthorityGate
  const realModuleSource = read("app/studio/[module].tsx");
  assert.ok(realModuleSource.includes("<StudioAccessGate"));
  assert.ok(realModuleSource.includes("<StudioAuthorityGate>"));
});

test("HT-NR-UI-01: Real /studio landing provides 7 operating domains navigation and role gates", () => {
  const content = fs.readFileSync(path.join(root, "app/studio/index.tsx"), "utf8");
  assert.ok(content.includes("STUDIO_DOMAINS"));
  assert.ok(content.includes("StudioShell"));
  assert.ok(content.includes("FINANCE & BILLING"));
});

test("HT-NR-UI-01: Owner Preview persona boundary uses one route-aware navigation mechanism", () => {
  const previewSource = read("src/preview/OwnerPreviewStudio.tsx");
  const byId = Object.fromEntries(
    previewData.OWNER_PREVIEW_PERSONAS.map((persona) => [persona.id, persona])
  );

  assert.equal(previewData.OWNER_PREVIEW_PERSONAS.length, 7);
  assert.equal(previewData.isOwnerPreviewDomainAllowed(byId.reporter, "finance"), false);
  assert.equal(previewData.isOwnerPreviewDomainAllowed(byId.reporter, "admin"), false);
  assert.equal(previewData.isOwnerPreviewDomainAllowed(byId.fmgr, "editorial"), false);
  assert.equal(previewData.isOwnerPreviewDomainAllowed(byId.fmgr, "finance"), true);
  assert.equal(previewData.isOwnerPreviewDomainAllowed(byId.cmgr, "finance"), false);
  assert.equal(previewData.isOwnerPreviewDomainAllowed(byId.cmgr, "commercial"), true);
  assert.equal(previewData.isOwnerPreviewDomainAllowed(byId.audience, "finance"), false);
  assert.equal(
    previewData.isOwnerPreviewDomainAllowed(byId.audience, "audience-marketing"),
    true
  );
  assert.equal(previewData.isOwnerPreviewDomainAllowed(byId.admin, "editorial"), false);

  for (const domain of previewData.OWNER_PREVIEW_DOMAINS) {
    assert.equal(
      previewData.isOwnerPreviewDomainAllowed(byId.owner, domain.key),
      true,
      `Owner must retain Preview access to ${domain.key}`
    );
  }

  // UAT04A-003 policy hold: preserve current Administrator declaration.
  assert.deepEqual(byId.admin.allowedDomains, ["my-work", "admin", "executive"]);

  assert.ok(previewSource.includes("selectedPersonaId"));
  assert.ok(previewSource.includes("previewNavigate"));
  assert.ok(previewSource.includes("router.setParams({ persona: nextPersona.id })"));
  assert.ok(previewSource.includes('testID="owner-preview-current-module-restricted"'));
  assert.equal(previewSource.includes('router.push("/owner-preview/studio/'), false);
  assert.ok(previewSource.includes("StudioFinanceDeskView"));
  assert.ok(previewSource.includes("OwnerPreviewFinanceView"));
});

test("HT-NR-UAT04A-R1: primary Preview copy uses business language instead of implementation terminology", () => {
  const previewSource = read("src/preview/OwnerPreviewStudio.tsx").toLowerCase();
  for (const forbidden of [
    "social.approve",
    "social.publish",
    "marketing.create",
    "marketing.approve",
    "marketing.send",
    "canonical newsroom_push_alerts",
    "canonical newsroom_whatsapp_broadcasts",
    "idempotency verification",
    "zero-secret disclosure contract",
    "control plane"
  ]) {
    assert.equal(
      previewSource.includes(forbidden),
      false,
      `Primary Preview copy must not expose implementation term: ${forbidden}`
    );
  }
});
test("HT-NR-VIS-01-R1: Defect B — Shared presentation views are exported from canonical UI files", () => {
  const storiesSource = read("src/ui/StudioStories.tsx");
  const workspaceSource = read("src/ui/StudioStoryWorkspace.tsx");
  const reviewQueueSource = read("src/ui/StudioReviewQueue.tsx");
  const planningSource = read("src/ui/StudioPlanningBoard.tsx");
  const commsSource = read("src/ui/StudioCommunications.tsx");
  const calendarSource = read("src/ui/StudioEditorialCalendar.tsx");
  const homepageSource = read("src/ui/StudioHomepage.tsx");
  const mediaSource = read("src/ui/StudioMediaLibrary.tsx");
  const videoSource = read("src/ui/StudioVideoDesk.tsx");
  const socialSource = read("src/ui/StudioSocialDesk.tsx");
  const newsletterSource = read("src/ui/StudioNewsletterDesk.tsx");

  assert.ok(storiesSource.includes("export function StudioStoriesView"));
  assert.ok(storiesSource.includes("export function StudioStories"));

  assert.ok(workspaceSource.includes("export function StudioStoryWorkspaceView"));
  assert.ok(workspaceSource.includes("export function StudioStoryWorkspace"));

  assert.ok(reviewQueueSource.includes("export function StudioReviewQueueView"));
  assert.ok(reviewQueueSource.includes("export function StudioReviewQueue"));

  assert.ok(planningSource.includes("export function StudioPlanningBoardView"));
  assert.ok(planningSource.includes("export function StudioPlanningBoard"));

  assert.ok(commsSource.includes("export function StudioAssignmentsView"));
  assert.ok(commsSource.includes("export function StudioAssignmentsPanel"));

  assert.ok(calendarSource.includes("export function StudioEditorialCalendarView"));
  assert.ok(calendarSource.includes("export function StudioEditorialCalendar"));

  assert.ok(homepageSource.includes("export function StudioHomepageView"));
  assert.ok(homepageSource.includes("export function StudioHomepage"));

  assert.ok(mediaSource.includes("export function StudioMediaLibraryView"));
  assert.ok(mediaSource.includes("export function StudioMediaLibrary"));

  assert.ok(videoSource.includes("export function StudioVideoDeskView"));
  assert.ok(videoSource.includes("export function StudioVideoDesk"));

  assert.ok(socialSource.includes("export function StudioSocialDeskView"));
  assert.ok(socialSource.includes("export function StudioSocialDesk"));

  assert.ok(newsletterSource.includes("export function StudioNewsletterDeskView"));
  assert.ok(newsletterSource.includes("export function StudioNewsletterDesk"));
});

test("HT-NR-VIS-01-R1: Defect B — Owner Preview imports and renders shared Studio views without duplicate UI", () => {
  const studioPreviewSource = read("src/preview/OwnerPreviewStudio.tsx");
  const workspacePreviewSource = read("src/preview/OwnerPreviewStoryWorkspace.tsx");

  // OwnerPreviewStudio imports and renders shared views
  assert.ok(studioPreviewSource.includes("StudioStoriesView"));
  assert.ok(studioPreviewSource.includes("<StudioStoriesView"));

  assert.ok(studioPreviewSource.includes("StudioReviewQueueView"));
  assert.ok(studioPreviewSource.includes("<StudioReviewQueueView"));

  assert.ok(studioPreviewSource.includes("StudioPlanningBoardView"));
  assert.ok(studioPreviewSource.includes("<StudioPlanningBoardView"));

  assert.ok(studioPreviewSource.includes("StudioAssignmentsView"));
  assert.ok(studioPreviewSource.includes("<StudioAssignmentsView"));

  assert.ok(studioPreviewSource.includes("StudioEditorialCalendarView"));
  assert.ok(studioPreviewSource.includes("<StudioEditorialCalendarView"));

  assert.ok(studioPreviewSource.includes("StudioHomepageView"));
  assert.ok(studioPreviewSource.includes("<StudioHomepageView"));

  assert.ok(studioPreviewSource.includes("StudioMediaLibraryView"));
  assert.ok(studioPreviewSource.includes("<StudioMediaLibraryView"));

  assert.ok(studioPreviewSource.includes("StudioVideoDeskView"));
  assert.ok(studioPreviewSource.includes("<StudioVideoDeskView"));

  assert.ok(studioPreviewSource.includes("StudioSocialDeskView"));
  assert.ok(studioPreviewSource.includes("<StudioSocialDeskView"));

  assert.ok(studioPreviewSource.includes("StudioNewsletterDeskView"));
  assert.ok(studioPreviewSource.includes("<StudioNewsletterDeskView"));

  // OwnerPreviewStoryWorkspace imports and renders shared view
  assert.ok(workspacePreviewSource.includes("StudioStoryWorkspaceView"));
  assert.ok(workspacePreviewSource.includes("<StudioStoryWorkspaceView"));

  // Operational wrappers retain backend service bindings
  const storiesSource = read("src/ui/StudioStories.tsx");
  const workspaceSource = read("src/ui/StudioStoryWorkspace.tsx");
  const reviewQueueSource = read("src/ui/StudioReviewQueue.tsx");
  const planningSource = read("src/ui/StudioPlanningBoard.tsx");
  const commsSource = read("src/ui/StudioCommunications.tsx");
  const calendarSource = read("src/ui/StudioEditorialCalendar.tsx");
  const homepageSource = read("src/ui/StudioHomepage.tsx");
  const mediaSource = read("src/ui/StudioMediaLibrary.tsx");
  const videoSource = read("src/ui/StudioVideoDesk.tsx");
  const socialSource = read("src/ui/StudioSocialDesk.tsx");
  const newsletterSource = read("src/ui/StudioNewsletterDesk.tsx");

  assert.ok(storiesSource.includes("services.newsroomStories"));
  assert.ok(workspaceSource.includes("services.newsroomStories"));
  assert.ok(reviewQueueSource.includes("services.newsroomStories"));
  assert.ok(planningSource.includes("services.newsroomCommunication"));
  assert.ok(commsSource.includes("services.newsroomCommunication"));
  assert.ok(
    calendarSource.includes("services.newsroomStories") ||
      calendarSource.includes("services.newsroomCommunication")
  );
  assert.ok(homepageSource.includes("services.newsroomStories"));
  assert.ok(mediaSource.includes("services.newsroomMedia"));
  assert.ok(videoSource.includes("services.newsroomVideo"));
  assert.ok(socialSource.includes("services.newsroomSocial"));
  assert.ok(newsletterSource.includes("services.newsroomCampaigns"));
});

// =============================================================================
// HT-MVP-RL-01-UAT-04A-R2: 54 PROVEN OWNER PREVIEW DEFECT CONVERGENCE
// =============================================================================

test("HT-NR-UAT04A-R2: My Work domain defect convergence (UAT04A-005 through 013)", () => {
  const commsSource = read("src/ui/StudioCommunications.tsx");
  const workspaceSource = read("src/ui/StudioStoryWorkspace.tsx");
  const workspacePreviewSource = read("src/preview/OwnerPreviewStoryWorkspace.tsx");
  const financeSource = read("src/ui/StudioFinanceDesk.tsx");
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");

  // UAT04A-005: Assignments discussion targeting
  assert.ok(commsSource.includes("selectedAssignmentId"));
  assert.ok(commsSource.includes("Internal Assignment Discussion"));
  assert.ok(commsSource.includes("isTargeted"));
  assert.ok(previewStudioSource.includes("selectedAssignmentId={selectedAssignmentId}"));

  // UAT04A-006: Assignments technical copy removal
  assert.ok(!commsSource.includes('"StudioAssignmentsView"'));
  assert.ok(!commsSource.includes("Direct database mutations disabled"));

  // UAT04A-007: Story save truthfulness
  assert.ok(
    workspaceSource.includes(
      "Preview state saved locally (non-persistent)"
    )
  );

  // UAT04A-008: Story Workspace technical copy
  assert.ok(!workspaceSource.includes("server-backed RPC"));
  assert.ok(!workspaceSource.includes("canonical kernel"));
  assert.ok(
    workspacePreviewSource.includes(
      "Interactive editorial story workspace rendered with non-persistent preview data"
    )
  );

  // UAT04A-009: Story tab-count consistency (7 tabs derived dynamically)
  const modelsSource = read("src/domain/models.ts");
  assert.ok(workspaceSource.includes("STORY_WORKSPACE_TABS"));
  assert.ok(workspacePreviewSource.includes("STORY_WORKSPACE_TABS.length"));

  // UAT04A-010: Expense completeness (date and receipt evidence)
  assert.ok(financeSource.includes("expDate"));
  assert.ok(financeSource.includes("expReceiptEvidence"));
  assert.ok(financeSource.includes("Receipt / Supporting Evidence"));
  assert.ok(financeSource.includes("Expense Date"));

  // UAT04A-011: My Claims ownership filtering
  assert.ok(financeSource.includes('expenseScope === "my"'));
  assert.ok(financeSource.includes("e.submittedByName"));

  // UAT04A-012: Expense local progression
  assert.ok(financeSource.includes('status: "submitted"'));
  assert.ok(
    financeSource.includes(
      "Expense claim created in local Preview memory"
    )
  );

  // UAT04A-013: Expense separation of duties
  assert.ok(
    financeSource.includes(
      "SEPARATION OF DUTIES · EXPENSE GOVERNANCE"
    )
  );
  assert.ok(
    financeSource.includes(
      "Self-approval is strictly prohibited in live operations."
    )
  );
});

test("HT-NR-UAT04A-R2: Editorial Stories, Planning, Calendar, Live Desk (UAT04A-014 through 025)", () => {
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");
  const storiesSource = read("src/ui/StudioStories.tsx");
  const workspacePreviewSource = read("src/preview/OwnerPreviewStoryWorkspace.tsx");
  const planningSource = read("src/ui/StudioPlanningBoard.tsx");
  const calendarSource = read("src/ui/StudioEditorialCalendar.tsx");
  const liveDeskSource = read("src/ui/StudioLiveDesk.tsx");
  const previewDataSource = read("src/preview/newsroomPreviewData.ts");

  // UAT04A-014: Review Queue technical copy
  assert.ok(!previewStudioSource.includes("StudioReviewQueueView:"));
  assert.ok(previewStudioSource.includes("Editorial review queue rendered with sample stories"));

  // UAT04A-015: Review Queue lifecycle actions (contextual next-actions)
  assert.ok(workspacePreviewSource.includes("transitionOptions"));
  assert.ok(workspacePreviewSource.includes("currentStory.workflowStatus"));

  // UAT04A-016: Story Hub ownership
  assert.ok(storiesSource.includes("Author / Lead:"));
  assert.ok(storiesSource.includes("story.authorId"));

  // UAT04A-017: New Story action in preview
  assert.ok(previewStudioSource.includes('storyId: "new"'));
  assert.ok(workspacePreviewSource.includes('initialStoryId === "new"'));

  // UAT04A-018: Story Hub technical copy
  assert.ok(!storiesSource.includes('"StudioStoriesView"'));
  assert.ok(
    storiesSource.includes(
      "Editorial stories, drafts, reviews, and published coverage."
    )
  );

  // UAT04A-019: Planning technical copy
  assert.ok(!planningSource.includes('"StudioPlanningBoardView"'));
  assert.ok(!planningSource.includes("Shared presentation view"));

  // UAT04A-020: Calendar ownership
  assert.ok(calendarSource.includes("Responsible:"));

  // UAT04A-021: Calendar targeted assignment handoff
  assert.ok(calendarSource.includes("handleOpenAssignment"));
  assert.ok(calendarSource.includes("onOpenAssignment"));
  assert.ok(
    previewStudioSource.includes(
      'pathname: "/owner-preview/studio/assignments"'
    )
  );
  assert.ok(previewStudioSource.includes("params: { assignmentId }"));

  // UAT04A-022: Calendar technical copy
  assert.ok(!previewStudioSource.includes("StudioEditorialCalendarView:"));
  assert.ok(!calendarSource.includes("Shared presentation view"));

  // UAT04A-023: Live Desk date/status consistency (relative deterministic dates)
  assert.ok(previewDataSource.includes("getPreviewReferenceTime"));
  assert.ok(previewDataSource.includes("tomorrowMorningIso"));
  assert.ok(previewDataSource.includes("dayPlus2Iso"));
  assert.ok(previewDataSource.includes("past4dIso"));

  // UAT04A-024: Live Desk Preview truthfulness
  assert.ok(
    liveDeskSource.includes("Simulated public presentation (preview state only).")
  );
  assert.ok(
    liveDeskSource.includes(
      "Live coverage metadata saved locally (preview state only)."
    )
  );

  // UAT04A-025: Live Desk technical leakage removal
  assert.ok(!liveDeskSource.includes("Live Desk Control Plane"));
  assert.ok(!liveDeskSource.includes("05D-A"));
  assert.ok(liveDeskSource.includes("Live Desk Operations"));
});

test("HT-NR-UAT04A-R2: Editorial Video, Media Library, Taxonomy, Authors (UAT04A-026 through 038)", () => {
  const videoSource = read("src/ui/StudioVideoDesk.tsx");
  const mediaSource = read("src/ui/StudioMediaLibrary.tsx");
  const authorsSource = read("src/ui/StudioAuthorsDesk.tsx");

  // UAT04A-026: Video visual inspection
  assert.ok(videoSource.includes("visualInspectionCard"));
  assert.ok(videoSource.includes("visualInspectionThumbnailWrap"));
  assert.ok(videoSource.includes("Visual Inspection & Media Slate"));

  // UAT04A-027: Video save feedback
  assert.ok(
    videoSource.includes(
      "Preview state saved: Video metadata and story association updated locally (non-persistent)"
    )
  );

  // UAT04A-028: Video publication truthfulness
  assert.ok(
    videoSource.includes(
      "Publication readiness recorded in preview memory"
    )
  );
  assert.ok(
    videoSource.includes(
      "live reader publication requires production release"
    )
  );

  // UAT04A-029: Video technical copy
  assert.ok(videoSource.includes('isOwnerPreview ? "VIDEO INSPECTOR" : "VIDEO REGISTRY INSPECTOR"'));
  assert.ok(videoSource.includes("Visual Inspection & Media Slate"));

  // UAT04A-030: Media non-image inspection
  assert.ok(mediaSource.includes("Video Asset Inspection"));
  assert.ok(mediaSource.includes("Audio Asset Inspection"));
  assert.ok(mediaSource.includes("Document Inspection Viewer"));

  // UAT04A-031: Media rights governance
  assert.ok(mediaSource.includes("Rights & Licensing Governance"));
  assert.ok(mediaSource.includes("Rights Status"));
  assert.ok(mediaSource.includes("Licensing Basis"));
  assert.ok(mediaSource.includes("Permitted Use"));
  assert.ok(mediaSource.includes("Provenance"));

  // UAT04A-032: Media search
  assert.ok(mediaSource.includes("searchInput.toLowerCase().trim()"));
  assert.ok(mediaSource.includes("asset.filename?.toLowerCase().includes(q)"));

  // UAT04A-033: Media stale inspector state
  assert.ok(
    mediaSource.includes(
      "filteredAssets.find((a) => a.id === selectedAssetId)"
    )
  );

  // UAT04A-034: Media technical leakage
  assert.ok(
    mediaSource.includes(
      "isOwnerPreview ? `Asset: ${selectedAsset.filename}` : `ID: ${selectedAsset.id}`"
    )
  );
  assert.ok(mediaSource.includes("Newsroom Managed Media"));

  // UAT04A-035: Taxonomy duplicates validation
  assert.ok(authorsSource.includes('A section with the slug "'));
  assert.ok(authorsSource.includes("already exists. Slugs must be unique"));
  assert.ok(authorsSource.includes("already exists. Section names must be unique"));

  // UAT04A-036: Author structure (role, desk, status)
  assert.ok(authorsSource.includes("roleBadge"));
  assert.ok(authorsSource.includes("deskBadge"));
  assert.ok(authorsSource.includes("statusBadge"));

  // UAT04A-037: Section parent selection (picker instead of raw UUID)
  assert.ok(authorsSource.includes("parentOptionChip"));
  assert.ok(authorsSource.includes("Top Level (No Parent)"));

  // UAT04A-038: Author WordPress technical leakage
  assert.ok(authorsSource.includes("Slug & Publication Identifier"));
  assert.ok(authorsSource.includes("!isOwnerPreview &&"));
});

test("HT-NR-UAT04A-R2: AI & Intelligence defect convergence (UAT04A-039 through 042)", () => {
  const aiSource = read("src/ui/StudioAiDesk.tsx");
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");

  // UAT04A-039: AI citation auditability
  assert.ok(aiSource.includes("Verified by"));
  assert.ok(aiSource.includes("cit.verifiedBy"));
  assert.ok(aiSource.includes("cit.verificationBasis"));

  // UAT04A-040: AI task differentiation
  assert.ok(previewStudioSource.includes('selectedTask === "evidence_gap"'));
  assert.ok(previewStudioSource.includes("gap_identification"));
  assert.ok(previewStudioSource.includes("Unverified Claim:"));

  // UAT04A-041: AI grounding truthfulness
  assert.ok(aiSource.includes("GROUNDED IN VERIFIED SOURCES"));
  assert.ok(aiSource.includes("UNVERIFIED CLAIM / EVIDENCE GAP"));
  assert.ok(aiSource.includes("confidenceText"));

  // UAT04A-042: AI inference provider truthfulness
  assert.ok(
    aiSource.includes(
      'isOwnerPreview ? "SIMULATED INFERENCE ENGINE" : "ACTIVE ASSISTANT MODEL"'
    )
  );
  assert.ok(
    aiSource.includes(
      "Gemini 1.5 Pro (Simulated non-production preview configuration · Writes & Live API disabled)"
    )
  );
});

test("HT-NR-UAT04A-R2: Social Desk defect convergence (UAT04A-043 through 047)", () => {
  const socialSource = read("src/ui/StudioSocialDesk.tsx");

  // UAT04A-043: Social story status disentanglement
  assert.ok(socialSource.includes("Post Distribution Status:"));
  assert.ok(socialSource.includes("Linked Story Workflow Status:"));

  // UAT04A-044: Social duplicate prepare prevention
  assert.ok(socialSource.includes("Distribution In-Flight"));
  assert.ok(socialSource.includes('"pending"') || socialSource.includes('"dispatching"'));

  // UAT04A-045: Social post ownership
  assert.ok(socialSource.includes("post.createdByName"));
  assert.ok(socialSource.includes("selectedPost.createdByName"));
  assert.ok(socialSource.includes("selectedPost.approvedByName"));

  // UAT04A-046: Social technical copy
  assert.ok(socialSource.includes("isPreview ?"));
  assert.ok(socialSource.includes("Editorial Approval Authority"));
  assert.ok(socialSource.includes("Channel Distribution Authority"));

  // UAT04A-047: Social scheduling controls
  assert.ok(socialSource.includes("draftScheduleDate"));
  assert.ok(socialSource.includes("draftScheduleTime"));
  assert.ok(socialSource.includes("draftScheduleTz"));
  assert.ok(socialSource.includes("scheduledTag"));
});

test("HT-NR-UAT04A-R2: Newsletter Desk defect convergence (UAT04A-048 through 051)", () => {
  const newsletterSource = read("src/ui/StudioNewsletterDesk.tsx");

  // UAT04A-048: Newsletter campaign ownership
  assert.ok(newsletterSource.includes("campaign.createdByName"));
  assert.ok(newsletterSource.includes("selectedCampaign.createdByName"));
  assert.ok(newsletterSource.includes("selectedCampaign.approvedByName"));
  assert.ok(newsletterSource.includes("campaignRowAuthorText"));

  // UAT04A-049: Newsletter duplicate prepare prevention
  assert.ok(newsletterSource.includes("Send Handoff Ready"));
  assert.ok(newsletterSource.includes("Boolean(activeHandoff)"));

  // UAT04A-050: Newsletter scheduling controls
  assert.ok(newsletterSource.includes("composerScheduleDate"));
  assert.ok(newsletterSource.includes("composerScheduleTime"));
  assert.ok(newsletterSource.includes("composerTimezone"));
  assert.ok(newsletterSource.includes("campaignRowScheduledText"));

  // UAT04A-051: Newsletter technical copy
  assert.ok(!newsletterSource.includes("RPC communications_create_campaign"));
  assert.ok(!newsletterSource.includes("public.audience_campaigns"));
  assert.ok(newsletterSource.includes("AUDIENCE CAMPAIGN REGISTRY"));
  assert.ok(newsletterSource.includes("automated dispatch service"));
});

test("HT-NR-UAT04A-R2: Push Alert Desk defect convergence (UAT04A-052 through 058)", () => {
  const pushSource = read("src/ui/StudioPushAlertDesk.tsx");
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");

  // UAT04A-052: Push alert audience targeting
  assert.ok(pushSource.includes("composerTargetSegment"));
  assert.ok(pushSource.includes("Target Audience Segment *"));
  assert.ok(pushSource.includes("selectedAlert.targetSegment"));
  assert.ok(pushSource.includes("selectedAlert.audienceEligibility"));

  // UAT04A-053: Push alert priority selector
  assert.ok(pushSource.includes("composerPriority"));
  assert.ok(pushSource.includes("Alert Priority *"));
  assert.ok(pushSource.includes("HIGH PRIORITY"));
  assert.ok(pushSource.includes("priorityBadge"));

  // UAT04A-054: Push alert scheduling controls
  assert.ok(pushSource.includes("composerScheduleDate"));
  assert.ok(pushSource.includes("composerScheduleTime"));
  assert.ok(pushSource.includes("composerTimezone"));
  assert.ok(pushSource.includes("Scheduled For"));

  // UAT04A-055: Push alert creator and approver identities
  assert.ok(pushSource.includes("selectedAlert.createdByName"));
  assert.ok(pushSource.includes("selectedAlert.approvedByName"));
  assert.ok(pushSource.includes("alertCardAuthorText"));

  // UAT04A-056: Push alert story navigation
  assert.ok(pushSource.includes("openStoryButton"));
  assert.ok(pushSource.includes("Open Linked Story Workspace →"));
  assert.ok(pushSource.includes("Unlinked Story Alert"));
  assert.ok(previewStudioSource.includes("Targeted story workspace handoff"));

  // UAT04A-057: Push alert delivery history
  assert.ok(pushSource.includes("dispatchRecord.failureReason"));
  assert.ok(pushSource.includes("DISPATCH_STATUS_STYLES"));
  assert.ok(pushSource.includes("formatDispatchStatusLabel"));

  // UAT04A-058: Push alert technical copy
  assert.ok(!pushSource.includes("DISTRIBUTION · CONTROL PLANE"));
  assert.ok(pushSource.includes("DISTRIBUTION · PUSH ALERT OPERATIONS"));
  assert.ok(!pushSource.includes("DELIVERY LEDGER · CANONICAL DISPATCH RECORD"));
  assert.ok(pushSource.includes("DELIVERY LEDGER · DISPATCH & AUDIT RECORD"));
  assert.ok(!pushSource.includes("PROVIDER SEND HANDOFF · SERVICE-ROLE BOUNDARY"));
  assert.ok(pushSource.includes("PROVIDER SEND HANDOFF · SECURE DISPATCH BOUNDARY"));
});

test("HT-NR-UAT04A-R2-R2: Behavioral schedule parsing and timezone differentiation (UAT04A-047, 050, 054)", () => {
  const modelsMod = loadTsModule("src/domain/models.ts");
  const {
    SUPPORTED_PREVIEW_TIMEZONES,
    normalizePreviewTimezone,
    parseAndFormatPreviewSchedule,
    formatPreviewScheduleTimestamp
  } = modelsMod;

  assert.deepEqual(SUPPORTED_PREVIEW_TIMEZONES, ["Africa/Harare", "UTC"]);
  assert.equal(normalizePreviewTimezone("Africa/Harare"), "Africa/Harare");
  assert.equal(normalizePreviewTimezone("UTC"), "UTC");
  assert.equal(normalizePreviewTimezone("gmt"), "UTC");
  assert.equal(normalizePreviewTimezone("cat"), "Africa/Harare");

  // Unscheduled when date and time are blank
  const unscheduled = parseAndFormatPreviewSchedule("", "", "Africa/Harare");
  assert.equal(unscheduled.valid, true);
  assert.equal(unscheduled.utcIso, null);
  assert.equal(unscheduled.displayLabel, null);

  // Date required when time is entered
  const timeWithoutDate = parseAndFormatPreviewSchedule("", "08:00", "Africa/Harare");
  assert.equal(timeWithoutDate.valid, false);
  assert.match(timeWithoutDate.error, /Schedule date.*is required/i);

  // Reject invalid calendar dates and 24-hour times
  const invalidDate = parseAndFormatPreviewSchedule("2026-02-30", "08:00", "Africa/Harare");
  assert.equal(invalidDate.valid, false);
  const invalidTime = parseAndFormatPreviewSchedule("2026-10-25", "25:99", "Africa/Harare");
  assert.equal(invalidTime.valid, false);

  // Prove Africa/Harare (UTC+2) vs UTC produce distinct UTC timestamps and distinct display labels
  const harareSchedule = parseAndFormatPreviewSchedule(
    "2026-10-25",
    "08:00",
    "Africa/Harare"
  );
  const utcSchedule = parseAndFormatPreviewSchedule(
    "2026-10-25",
    "08:00",
    "UTC"
  );

  assert.equal(harareSchedule.valid, true);
  assert.equal(utcSchedule.valid, true);
  assert.equal(harareSchedule.utcIso, "2026-10-25T06:00:00.000Z");
  assert.equal(utcSchedule.utcIso, "2026-10-25T08:00:00.000Z");
  assert.notEqual(
    harareSchedule.utcIso,
    utcSchedule.utcIso,
    "08:00 Africa/Harare and 08:00 UTC must not produce the same UTC timestamp"
  );
  assert.equal(
    harareSchedule.displayLabel,
    "2026-10-25 08:00 Africa/Harare (CAT, UTC+2)"
  );
  assert.equal(utcSchedule.displayLabel, "2026-10-25 08:00 UTC");

  // Prove round-trip formatting preserves local wall-clock time and timezone label
  assert.equal(
    formatPreviewScheduleTimestamp("2026-10-25T06:00:00.000Z", "Africa/Harare"),
    "2026-10-25 08:00 Africa/Harare (CAT, UTC+2)"
  );
  assert.equal(
    formatPreviewScheduleTimestamp("2026-10-25T08:00:00.000Z", "UTC"),
    "2026-10-25 08:00 UTC"
  );

  // Verify Social, Newsletter, Push Alert, and WhatsApp desks wire parseAndFormatPreviewSchedule and formatPreviewScheduleTimestamp
  for (const deskPath of [
    "src/ui/StudioSocialDesk.tsx",
    "src/ui/StudioNewsletterDesk.tsx",
    "src/ui/StudioPushAlertDesk.tsx",
    "src/ui/StudioWhatsAppDesk.tsx"
  ]) {
    const deskSource = read(deskPath);
    assert.ok(
      deskSource.includes("parseAndFormatPreviewSchedule"),
      `${deskPath} must use parseAndFormatPreviewSchedule`
    );
    assert.ok(
      deskSource.includes("formatPreviewScheduleTimestamp"),
      `${deskPath} must use formatPreviewScheduleTimestamp`
    );
    assert.ok(
      deskSource.includes("Africa/Harare (CAT, UTC+2)"),
      `${deskPath} must expose Africa/Harare (CAT, UTC+2) timezone selection`
    );
  }
});

test("HT-NR-UAT04A-R2-R2: Push Alert human-readable story selection & consent governance (UAT04A-052, 058)", () => {
  const pushSource = read("src/ui/StudioPushAlertDesk.tsx");
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");

  const stories = previewData.buildPreviewStories();
  const alerts = previewData.buildPreviewPushAlerts();
  assert.ok(stories.length >= 2);
  assert.ok(alerts.length >= 2);

  // Verify linked alerts resolve to human-readable story titles in preview data
  const linkedAlerts = alerts.filter((a) => a.relatedStoryId);
  assert.ok(linkedAlerts.length >= 1);
  for (const alert of linkedAlerts) {
    const matchedStory = stories.find((s) => s.id === alert.relatedStoryId);
    assert.ok(
      matchedStory && matchedStory.title.length > 5,
      `Push alert ${alert.id} relatedStoryId must resolve to a human-readable preview story title`
    );
  }

  // Verify StudioPushAlertDesk replaces raw UUID story input with human-readable selector in composer and edit mode
  assert.ok(!pushSource.includes("Optional story UUID"));
  assert.ok(!pushSource.includes("Related Story ID (Optional UUID)"));
  assert.ok(pushSource.includes("Linked Editorial Story (Optional)"));
  assert.ok(pushSource.includes("Standalone Alert (No Linked Story)"));
  assert.ok(pushSource.includes("composer-story-selector"));
  assert.ok(pushSource.includes("composer-story-option-${st.id}"));
  assert.ok(pushSource.includes("edit-story-option-${st.id}"));
  assert.ok(previewStudioSource.includes("stories={stories}"));

  // Verify UAT04A-052 explicit consent & opt-in governance in composer and inspector
  assert.ok(pushSource.includes("Audience Consent & Opt-In Governance"));
  assert.ok(pushSource.includes("✓ Push notifications enabled"));
  assert.ok(pushSource.includes("✓ Reader opt-in required"));
  assert.ok(pushSource.includes("✓ Suppressed/disabled devices excluded"));
  assert.ok(pushSource.includes("Consented & Eligible Sample Devices:"));
  assert.ok(pushSource.includes("composer-consent-governance-box"));
  assert.ok(pushSource.includes("inspector-consent-governance-box"));
});

test("HT-NR-UAT04A-R2-R2: Citation independent verification & AI audit truthfulness (UAT04A-039, 042)", () => {
  const citations = previewData.buildPreviewCitationsDirectory();
  assert.ok(citations.citations.length >= 2);

  for (const cit of citations.citations) {
    assert.ok(
      cit.authorsOrOrganization && cit.authorsOrOrganization.length > 3,
      `Citation ${cit.id} must expose authorsOrOrganization`
    );
    assert.ok(
      cit.publicationDate && cit.publicationDate.length >= 4,
      `Citation ${cit.id} must expose publicationDate`
    );
    assert.ok(
      cit.sourceUrl && cit.sourceUrl.includes("Sample Non-Live URL"),
      `Citation ${cit.id} must expose clearly marked sample non-live sourceUrl`
    );
    assert.ok(
      cit.doi && cit.doi.includes("Sample Non-Live DOI"),
      `Citation ${cit.id} must expose clearly marked sample non-live DOI`
    );
  }

  const aiSource = read("src/ui/StudioAiDesk.tsx");
  assert.ok(aiSource.includes("Author / Organization:"));
  assert.ok(aiSource.includes("Publication Date:"));
  assert.ok(aiSource.includes("Source Destination:"));
  assert.ok(aiSource.includes("Inspect Source"));
  assert.ok(aiSource.includes("inspect-citation-source-${cit.id}"));
  assert.ok(aiSource.includes("INDEPENDENT SOURCE VERIFICATION RECORD"));
  assert.ok(aiSource.includes("citation-source-inspector-${cit.id}"));

  // UAT04A-042: AI audit truthfulness in Preview
  assert.ok(
    aiSource.includes(
      'isOwnerPreview ? "✓ Simulated Audit Record (Preview)" : "✓ Audited Execution Log"'
    )
  );
});

test("HT-NR-UAT04A-R2-R2: Residual technical copy sweep across Live, Video, Media, Authors, Social, Newsletter, and Push Desks (UAT04A-025, 029, 034, 038, 046, 051, 058)", () => {
  const liveSource = read("src/ui/StudioLiveDesk.tsx");
  const videoSource = read("src/ui/StudioVideoDesk.tsx");
  const mediaSource = read("src/ui/StudioMediaLibrary.tsx");
  const authorsSource = read("src/ui/StudioAuthorsDesk.tsx");
  const socialSource = read("src/ui/StudioSocialDesk.tsx");
  const newsletterSource = read("src/ui/StudioNewsletterDesk.tsx");
  const pushSource = read("src/ui/StudioPushAlertDesk.tsx");
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");

  // UAT04A-025: Live Desk Preview copy
  assert.ok(
    liveSource.includes(
      "Showing up to 100 coverage records matching the current filters."
    )
  );
  assert.ok(liveSource.includes("!isOwnerPreview && ("));
  assert.ok(
    liveSource.includes(
      'Asset: ${selectedMediaAsset.filename || "Editorial Media"}'
    )
  );

  // UAT04A-029: Video Desk Preview copy
  assert.ok(
    videoSource.includes(
      "Video Library · Editorial Metadata · Publication Readiness"
    )
  );
  assert.ok(
    videoSource.includes(
      "Showing up to 100 videos matching the current filters. Results reflect current query criteria."
    )
  );
  assert.ok(videoSource.includes('isOwnerPreview ? "Video Library" : "Video Registry"'));
  assert.ok(videoSource.includes('"Editorial Video Asset"'));

  // UAT04A-034: Media Library Preview copy
  assert.ok(mediaSource.includes('isOwnerPreview ? "Media Management" : "Storage Custody"'));
  assert.ok(mediaSource.includes('isOwnerPreview ? "Integrity Status" : "Checksum"'));
  assert.ok(mediaSource.includes('isOwnerPreview ? "Verified" : (selectedAsset.checksum ?? "None")'));
  assert.ok(!mediaSource.includes("Verified (SHA-256)"));
  assert.ok(
    previewStudioSource.includes(
      "Visual inspection of newsroom media assets, editorial metadata, safe preview sandboxing, and story usage handoffs."
    )
  );

  // UAT04A-038: Authors & Taxonomy Preview copy and human-readable staff selector
  assert.ok(
    authorsSource.includes(
      "Public byline directory, staff author assignments, and hierarchical editorial taxonomy sections."
    )
  );
  assert.ok(authorsSource.includes('isOwnerPreview ? "Editorial Status" : "Provenance"'));
  assert.ok(authorsSource.includes('<Text style={styles.nativeBadge}>Active Section</Text>'));
  assert.ok(authorsSource.includes("Select Newsroom Staff Member *"));
  assert.ok(authorsSource.includes("bind-staff-option-${staff.id}"));
  assert.ok(previewStudioSource.includes("staffOptions={PREVIEW_STAFF_DIRECTORY.map"));

  // UAT04A-046: Social Desk Preview copy
  assert.ok(socialSource.includes('"AUDIENCE DISTRIBUTION • SOCIAL DESK"'));
  assert.ok(
    socialSource.includes('"COMPOSE SOCIAL DRAFT • EDITORIAL COMPOSER"')
  );

  // UAT04A-051: Newsletter Desk Preview copy
  assert.ok(
    newsletterSource.includes("AUDIENCE DISTRIBUTION • NEWSLETTER DESK")
  );
  assert.ok(
    newsletterSource.includes("Newsletter & Audience Campaign Desk")
  );
  assert.ok(
    newsletterSource.includes("CAMPAIGN PERMISSIONS:")
  );
  assert.ok(
    newsletterSource.includes(
      "Showing up to 100 campaigns matching the current filters."
    )
  );
  assert.ok(
    newsletterSource.includes('"CAMPAIGN REGISTRY NOTICE"')
  );
  assert.ok(
    newsletterSource.includes('previewMode ? "PROVIDER STATUS" : "BREVO SEGMENT SYNC"')
  );
  assert.ok(
    newsletterSource.includes('"DELIVERY REFERENCE"')
  );

  // UAT04A-058: Push Alert Desk Preview copy
  assert.ok(
    pushSource.includes(
      "Showing up to 100 push alerts matching the current filters."
    )
  );
});

test("HT-NR-FINAL-R1-01: Audience & Marketing modules (WhatsApp, Audience Intelligence, Search & Growth) meet full Preview completion & truthfulness", () => {
  const whatsappSource = read("src/ui/StudioWhatsAppDesk.tsx");
  const audienceSource = read("src/ui/StudioAudienceDesk.tsx");
  const searchSource = read("src/ui/StudioSearchGrowthDesk.tsx");
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");

  // WhatsApp governance & lifecycle states
  assert.ok(whatsappSource.includes("WhatsApp Broadcast Governance & Delivery Lifecycle"));
  assert.ok(whatsappSource.includes("1. Outbound Draft & Preparation:"));
  assert.ok(whatsappSource.includes("2. Editorial Approval Gate:"));
  assert.ok(whatsappSource.includes("3. Template & Governance State:"));
  assert.ok(whatsappSource.includes("4. Audience Consent / Opt-In:"));
  assert.ok(whatsappSource.includes("5. Provider Dispatch & Delivery State:"));
  assert.ok(whatsappSource.includes("6. Inbound Conversation / Reply Capability:"));
  assert.ok(whatsappSource.includes("Open Linked Story Workspace →"));
  assert.ok(whatsappSource.includes("Simulate WhatsApp Broadcast (Preview)"));
  assert.ok(!whatsappSource.includes("Related Story UUID (Optional)"));

  // Audience Intelligence sample analytics disclosure & segment trends
  const audData = previewData.buildPreviewAudienceIntelligence();
  assert.equal(audData.contacts.consentedContacts, 1420);
  assert.equal(audData.segments.totalSegments, 3);
  assert.equal(audData.pushSubscribers.activeDevices, 3840);
  assert.equal(audData.whatsappDistribution.totalBroadcasts, 3);
  assert.equal(audData.subscribers.activeSubscribers, 395);
  assert.ok(audienceSource.includes("Sample Audience & Segment Figures (Owner Preview)"));
  assert.ok(audienceSource.includes("Audience Segments & 30-Day Engagement Trends"));

  // Search & Growth SEO vs Headline guide & no raw table name
  assert.ok(searchSource.includes("Editorial SEO vs. Reader Headline & Discoverability"));
  assert.ok(!searchSource.includes("search_console_daily_metrics"));
  assert.ok(previewStudioSource.includes("OwnerPreviewWhatsAppDeskView"));
  assert.ok(previewStudioSource.includes("OwnerPreviewAudienceView"));
  assert.ok(previewStudioSource.includes("OwnerPreviewSearchGrowthView"));
});

test("HT-NR-FINAL-R1-02: Commercial & Finance modules reconcile internally and simulate mutations in local Preview state", () => {
  const adSource = read("src/ui/StudioAdvertisingDesk.tsx");
  const subSource = read("src/ui/StudioSubscribersDesk.tsx");
  const premSource = read("src/ui/StudioPremiumDesk.tsx");
  const finSource = read("src/ui/StudioFinanceDesk.tsx");

  // Commercial Preview banners, cross-desk links, and no AG-05 phase code leakage
  assert.ok(adSource.includes("Sample Commercial Inventory (Owner Preview)"));
  assert.ok(adSource.includes("Commercial Orders →"));
  assert.ok(subSource.includes("Sample Subscriber & Entitlement Registry (Owner Preview)"));
  assert.ok(subSource.includes("Premium Access Policies →"));
  assert.ok(premSource.includes("Sample Monetization & Access Policy State (Owner Preview)"));
  assert.ok(premSource.includes("Reader Public Teaser Policy"));
  assert.ok(!premSource.includes("AG-05"));

  const premOverview = previewData.buildPreviewPremiumOperationsOverview();
  assert.equal(premOverview.teaserPolicy.authority, "Publisher / Editorial Access Policy");

  // Finance & Accounting internal reconciliation
  const overview = previewData.buildPreviewFinanceOverview();
  const aging = previewData.buildPreviewReceivablesAging();
  const invoices = previewData.buildPreviewInvoices();
  const payments = previewData.buildPreviewPayments();
  const expenses = previewData.buildPreviewExpenses();
  const tb = previewData.buildPreviewTrialBalance();
  const pnl = previewData.buildPreviewProfitAndLoss();
  const bs = previewData.buildPreviewBalanceSheet();
  const stmts = previewData.buildPreviewFinanceStatements();

  const usdOverview = overview.byCurrency[0];
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOpenAr = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const approvedExpensesTotal = expenses
    .filter((e) => e.status === "approved" || e.status === "paid")
    .reduce((sum, e) => sum + e.amount, 0);

  assert.equal(usdOverview.invoicedTotal, totalInvoiced);
  assert.equal(usdOverview.revenueCollected, totalCollected);
  assert.equal(usdOverview.receivablesOutstanding, totalOpenAr);
  assert.equal(aging.totals[0].totalOutstanding, totalOpenAr);
  assert.equal(usdOverview.expensesApproved, approvedExpensesTotal);

  assert.equal(tb.isBalanced, true);
  assert.equal(tb.totalDebits, tb.totalCredits);
  assert.equal(pnl.totalRevenue - pnl.totalExpenses, pnl.netOperatingSurplus);
  assert.equal(bs.isBalanced, true);
  assert.equal(bs.totalAssets, bs.totalLiabilitiesAndEquity);
  assert.equal(stmts.incomeStatement[0].netOperatingSurplus, pnl.netOperatingSurplus);
  assert.ok(!stmts.balanceSheet.includes("NOT AVAILABLE UNTIL GENERAL LEDGER AUTHORITY EXISTS"));

  // Finance Preview local state mutations & document watermarks
  assert.ok(finSource.includes("Sample Financial & General Ledger Figures (Owner Preview)"));
  assert.ok(finSource.includes("SAMPLE PREVIEW DOCUMENT — NOT A VALID COMMERCIAL TAX INVOICE"));
  assert.ok(finSource.includes("SAMPLE PREVIEW RECEIPT — SIMULATED SETTLEMENT RECORD ONLY"));
  assert.ok(finSource.includes("SAMPLE PREVIEW STATEMENT OF ACCOUNT — FOR INTERFACE REVIEW ONLY"));
  assert.ok(finSource.includes("+ New Commercial Order"));
  assert.ok(finSource.includes("Generate Invoice"));
});

test("HT-NR-FINAL-R1-03: Executive, Administration & 7-Persona Matrix boundaries hold across all 38 module routes", () => {
  const homepageSource = read("src/ui/StudioHomepage.tsx");
  const analyticsSource = read("src/ui/StudioAnalyticsDesk.tsx");
  const staffSource = read("src/ui/StudioStaffRolesDesk.tsx");
  const settingsSource = read("src/ui/StudioSettingsDesk.tsx");
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");

  // Executive Dashboard & Homepage Curation & Analytics
  assert.ok(previewStudioSource.includes("5. EXECUTIVE PERFORMANCE & COMMERCIAL SNAPSHOT"));
  assert.ok(homepageSource.includes("HealthTimes Newsroom OS • Editorial Homepage Desk"));
  assert.ok(homepageSource.includes("EDITORIAL STORY INVENTORY"));
  assert.ok(analyticsSource.includes("Sample Executive & Editorial Intelligence (Owner Preview)"));

  const edIntel = previewData.buildPreviewEditorialIntelligence();
  assert.equal(edIntel.assignments.total, 6);
  assert.equal(edIntel.distributionReach.socialPostsCount, 4);
  assert.equal(edIntel.distributionReach.newsletterCampaignsCount, 5);
  assert.equal(edIntel.distributionReach.pushAlertsCount, 5);
  assert.equal(edIntel.distributionReach.whatsappBroadcastsCount, 3);

  // Staff & Roles + Platform Settings
  assert.ok(staffSource.includes("Sample Staff Directory & RBAC Simulation (Owner Preview)"));
  assert.ok(settingsSource.includes("Sample Platform Configuration (Owner Preview)"));
  const settingsOverview = previewData.buildPreviewPlatformSettingsOverview();
  assert.equal(settingsOverview.integrations.database_backend.appliedMigrations, 83);

  // 7 Personas & Direct-Route Boundary Verification
  const personas = previewData.OWNER_PREVIEW_PERSONAS;
  assert.equal(personas.length, 7);
  const byId = Object.fromEntries(personas.map((p) => [p.id, p]));

  // Publisher / Owner has all 7 domains
  assert.equal(byId.owner.allowedDomains.length, 7);
  // Editor-in-Chief has my-work, editorial, audience-marketing, executive (no finance, no admin)
  assert.ok(!byId.editor.allowedDomains.includes("finance"));
  assert.ok(!byId.editor.allowedDomains.includes("admin"));
  // Reporter has my-work, editorial (no commercial, finance, executive, admin)
  assert.deepEqual(byId.reporter.allowedDomains, ["my-work", "editorial"]);
  // Finance Manager has my-work, finance, commercial
  assert.ok(byId.fmgr.allowedDomains.includes("finance"));
  assert.ok(!byId.fmgr.allowedDomains.includes("editorial"));
  // Commercial Manager has my-work, commercial, audience-marketing
  assert.ok(byId.cmgr.allowedDomains.includes("commercial"));
  assert.ok(!byId.cmgr.allowedDomains.includes("finance"));
  // Audience & Growth Lead has my-work, audience-marketing
  assert.ok(byId.audience.allowedDomains.includes("audience-marketing"));
  assert.ok(!byId.audience.allowedDomains.includes("commercial"));
  // Systems Administrator has my-work, admin, executive (OWNER_POLICY_REVIEW preserved)
  assert.deepEqual(byId.admin.allowedDomains, ["my-work", "admin,executive".split(",")].flat());
});

test("HT-FINAL-UI-RES-01: Platform Settings Owner Preview uses sample audit, sample credential, and preview-only policy copy", () => {
  const settingsSource = read("src/ui/StudioSettingsDesk.tsx");
  const previewStudioSource = read("src/preview/OwnerPreviewStudio.tsx");

  // StudioSettingsDeskView is invoked with isOwnerPreview={true} from OwnerPreviewStudio
  assert.ok(previewStudioSource.includes("<StudioSettingsDeskView"));
  assert.ok(previewStudioSource.includes("isOwnerPreview={true}"));

  // Audit summary uses sample labels in Owner Preview
  assert.ok(
    settingsSource.includes(
      'isOwnerPreview ? "Sample Audit Activity" : "Audit Trail Activity (24h)"'
    )
  );
  assert.ok(
    settingsSource.includes(
      'isOwnerPreview ? "Sample Last Security Event" : "Last Security Event"'
    )
  );
  assert.ok(settingsSource.includes("sample audit events"));

  // Credential presentation uses sample configuration labels in Owner Preview
  assert.ok(
    settingsSource.includes("✓ Sample configuration: credential present")
  );
  assert.ok(
    settingsSource.includes("⏳ Sample configuration: credential pending")
  );

  // Operational policy subtitle uses Preview-only language in Owner Preview
  assert.ok(
    settingsSource.includes(
      "Preview-only policy controls. Changes update local Preview memory and are not written to staging, Production, or the live security audit trail."
    )
  );

  // If static export exists on disk, verify exported settings.html rendered Preview copy
  const exportedSettingsPath = path.join(
    root,
    "dist/owner-preview/studio/settings.html"
  );
  if (fs.existsSync(exportedSettingsPath)) {
    const html = fs.readFileSync(exportedSettingsPath, "utf8");
    assert.ok(html.includes("Sample Audit Activity"));
    assert.ok(html.includes("Sample Last Security Event"));
    assert.ok(html.includes("Sample configuration: credential present"));
    assert.ok(
      html.includes(
        "Preview-only policy controls. Changes update local Preview memory and are not written to staging, Production, or the live security audit trail."
      )
    );
    assert.ok(
      !html.includes(
        "Changes are immediately recorded in the tamper-evident audit log"
      )
    );
    assert.ok(!html.includes("Credentials Active in Vault"));
  }
});

test("HT-NR-UAT04A-FINAL-R2: finance transaction lineage reconciles from source records", () => {
  const orders = previewData.buildPreviewCommercialOrders();
  const invoices = previewData.buildPreviewInvoices();
  const payments = previewData.buildPreviewPayments();
  const statement = previewData.buildPreviewCustomerStatement("cust-sample-1");
  const journals = previewData.buildPreviewJournals();
  const trialBalance = previewData.buildPreviewTrialBalance();
  const pnl = previewData.buildPreviewProfitAndLoss();
  const balanceSheet = previewData.buildPreviewBalanceSheet();

  const order = orders.find((item) => item.orderNumber === "ORD-2026-0001");
  const invoice = invoices.find((item) => item.invoiceNumber === "INV-2026-0001");
  const payment = payments.find((item) => item.paymentNumber === "PAY-2026-0001");
  assert.ok(order && invoice && payment);
  assert.equal(order.total, 1625);
  assert.equal(order.total, invoice.total);
  assert.equal(payment.amount, invoice.amountPaid);
  assert.equal(invoice.total - invoice.amountPaid, invoice.balanceDue);
  assert.equal(statement.totalInvoiced, invoice.total);
  assert.equal(statement.totalPaid, payment.amount);
  assert.equal(statement.closingBalance, invoice.balanceDue);

  for (const candidateInvoice of invoices) {
    const invoicePayments = payments
      .filter((candidate) => candidate.invoiceId === candidateInvoice.id)
      .reduce((sum, candidate) => sum + candidate.amount, 0);
    assert.equal(invoicePayments, candidateInvoice.amountPaid);
    assert.equal(candidateInvoice.total - candidateInvoice.amountPaid, candidateInvoice.balanceDue);
    if (candidateInvoice.orderId) {
      assert.equal(orders.find((candidate) => candidate.id === candidateInvoice.orderId)?.total, candidateInvoice.total);
    }
  }

  for (const journal of journals) {
    const debit = journal.lines.reduce((sum, line) => sum + line.debit, 0);
    const credit = journal.lines.reduce((sum, line) => sum + line.credit, 0);
    assert.equal(debit, credit);
    if (journal.source === "invoice") assert.ok(invoices.some((candidate) => candidate.id === journal.sourceId));
    if (journal.source === "payment") assert.ok(payments.some((candidate) => candidate.id === journal.sourceId));
  }

  const derivedDebits = trialBalance.accounts.reduce((sum, account) => sum + account.debitTotal, 0);
  const derivedCredits = trialBalance.accounts.reduce((sum, account) => sum + account.creditTotal, 0);
  assert.equal(derivedDebits, trialBalance.totalDebits);
  assert.equal(derivedCredits, trialBalance.totalCredits);
  assert.equal(derivedDebits, derivedCredits);
  assert.equal(pnl.totalRevenue - pnl.totalExpenses, pnl.netOperatingSurplus);
  assert.equal(balanceSheet.totalAssets, balanceSheet.totalLiabilities + balanceSheet.totalEquity);
});

test("HT-NR-UAT04A-FINAL-R2: Finance Manager authority, entitlement totals, advertising and invitations are coherent", () => {
  const directory = previewData.buildPreviewStaffOperationsDirectory();
  const financeStaff = directory.staff.find((item) => item.roleName === "Finance Manager");
  const financeRole = directory.roles.find((item) => item.name === "Finance Manager");
  const financeCapabilities = directory.capabilities.filter((item) => item.key.startsWith("finance."));
  assert.ok(financeStaff && financeRole);
  assert.ok(financeRole.capabilities.length > 0);
  assert.deepEqual(financeStaff.capabilities, financeRole.capabilities);
  assert.equal(financeCapabilities.length, financeRole.capabilities.length);
  assert.ok(directory.invitations.every((item) => Date.parse(item.expiresAt) >= previewData.OWNER_PREVIEW_REFERENCE_MS || item.status === "expired"));

  const premium = previewData.buildPreviewPremiumOperationsOverview();
  const channelTotal = premium.subscriberStats.providers.reduce((sum, item) => sum + item.count, 0);
  assert.equal(channelTotal, premium.subscriberStats.activeEntitlementsCount);
  assert.equal(channelTotal, premium.subscriberStats.totalEntitledSubscribers);

  const advertising = previewData.buildPreviewAdvertisingOverview();
  assert.equal(advertising.metrics.activeCampaigns, advertising.campaigns.filter((item) => item.status === "active").length);
  assert.ok(advertising.creatives.some((item) => item.assetUrl && item.mimeType?.startsWith("image/")));
});

test("HT-NR-UAT04A-FINAL-R2: form validation, analytics controls, provider truthfulness and deterministic rendering are guarded", () => {
  const financeSource = read("src/ui/StudioFinanceDesk.tsx");
  const whatsappSource = read("src/ui/StudioWhatsAppDesk.tsx");
  const audienceSource = read("src/ui/StudioAudienceDesk.tsx");
  const analyticsSource = read("src/ui/StudioAnalyticsDesk.tsx");
  const settingsSource = read("src/ui/StudioSettingsDesk.tsx");
  const searchSource = read("src/ui/StudioSearchGrowthDesk.tsx");
  const premiumSource = read("src/ui/StudioPremiumDesk.tsx");
  const previewSource = read("src/preview/newsroomPreviewData.ts");

  assert.ok(financeSource.includes("Quantity must be greater than zero."));
  assert.ok(financeSource.includes("Unit price must be greater than zero."));
  assert.ok(financeSource.includes("Payment cannot exceed the outstanding balance."));
  assert.ok(financeSource.includes('testID="finance-invoice-detail"'));
  assert.ok(financeSource.includes('testID="finance-order-detail"'));
  assert.ok(whatsappSource.includes("Scheduled send timezone"));
  assert.ok(whatsappSource.includes("Suppressed and opted-out contacts are excluded"));
  assert.ok(whatsappSource.includes("Approved template"));
  assert.ok(audienceSource.includes('testID="audience-segment-drilldown"'));
  assert.ok(analyticsSource.includes('testID="analytics-metric-drilldown"'));
  assert.ok(settingsSource.includes("DNS verification pending") || previewSource.includes("prepared_dns_verification_pending"));
  assert.ok(previewSource.includes("identity_verified_account_access_pending"));
  assert.ok(previewSource.includes("sample_simulation_only"));
  assert.ok(searchSource.includes("toFixed(1)"));
  assert.ok(premiumSource.includes(".filter((provider)"));
  assert.ok(previewSource.includes('OWNER_PREVIEW_REFERENCE_ISO = "2026-10-24T12:00:00.000Z"'));
  assert.deepEqual(previewData.buildPreviewStories(), previewData.buildPreviewStories());
});

test("HT-NR-UAT04A-FINAL-R2: critical Preview controls expose accessible semantics and the root shell is width-bounded", () => {
  const financeSource = read("src/ui/StudioFinanceDesk.tsx");
  const whatsappSource = read("src/ui/StudioWhatsAppDesk.tsx");
  const staffSource = read("src/ui/StudioStaffRolesDesk.tsx");
  const settingsSource = read("src/ui/StudioSettingsDesk.tsx");
  const shellSource = read("src/preview/OwnerPreviewStudio.tsx");
  const htmlSource = read("app/+html.tsx");

  for (const label of ["Invoice description", "Invoice quantity", "Invoice unit price", "Payment amount", "Record customer payment"]) {
    assert.ok(financeSource.includes(`accessibilityLabel="${label}"`));
  }
  for (const label of ["Broadcast title", "WhatsApp message body", "Scheduled send date", "Scheduled send timezone"]) {
    assert.ok(whatsappSource.includes(`accessibilityLabel="${label}"`));
  }
  assert.ok(staffSource.includes('accessibilityLabel="Staff invitation email address"'));
  assert.ok(settingsSource.includes('accessibilityRole="switch"'));
  assert.ok(settingsSource.includes("accessibilityState={{ selected: isSelected"));
  assert.ok(shellSource.includes('accessibilityLabel={`Switch preview persona to ${p.role}`}'));
  assert.ok(shellSource.includes("accessibilityState={{ selected: isSelected }}"));
  assert.ok(shellSource.includes("aria-pressed={isSelected}"));
  assert.ok(shellSource.includes("const isDesktop = hasHydrated && width >= breakpoints.desktop"));
  assert.ok(shellSource.includes("nowMs={OWNER_PREVIEW_REFERENCE_MS}"));
  assert.match(shellSource, /pageRoot:\s*\{[\s\S]*?maxWidth:\s*"100%"[\s\S]*?overflow:\s*"hidden"/);
  assert.match(shellSource, /mainScroll:\s*\{[\s\S]*?minWidth:\s*0[\s\S]*?maxWidth:\s*"100%"/);
  assert.ok(htmlSource.includes("html,body,#root{max-width:100%;overflow-x:hidden}"));
});

test("HT-FINAL-UAT-RES-01: WhatsApp Desk scheduling uses shared Preview timezone authority and rejects invalid inputs", () => {
  const models = loadTsModule("src/domain/models.ts");
  const whatsappModule = loadTsModule("src/ui/StudioWhatsAppDesk.tsx", {
    react: {
      useCallback: (fn) => fn,
      useEffect: () => {},
      useMemo: (fn) => fn(),
      useState: (init) => [typeof init === "function" ? init() : init, () => {}]
    },
    "react-native": {
      Platform: { OS: "web" },
      Pressable: "Pressable",
      ScrollView: "ScrollView",
      StyleSheet: { create: (s) => s },
      Text: "Text",
      TextInput: "TextInput",
      useWindowDimensions: () => ({ width: 1280, height: 800 }),
      View: "View"
    },
    "react/jsx-runtime": {
      jsx: () => null,
      jsxs: () => null,
      Fragment: "Fragment"
    },
    "../services": {
      services: {}
    }
  });

  const { resolveWhatsAppBroadcastScheduleInput } = whatsappModule;
  const { formatPreviewScheduleTimestamp, SUPPORTED_PREVIEW_TIMEZONES } = models;

  assert.equal(typeof resolveWhatsAppBroadcastScheduleInput, "function");
  assert.deepEqual([...SUPPORTED_PREVIEW_TIMEZONES], ["Africa/Harare", "UTC"]);

  // 1. Semantic proof: 2026-10-25 08:00 Africa/Harare -> 2026-10-25T06:00:00.000Z
  const harareSchedule = resolveWhatsAppBroadcastScheduleInput(
    "2026-10-25",
    "08:00",
    "Africa/Harare"
  );
  assert.equal(harareSchedule.valid, true);
  assert.equal(harareSchedule.utcIso, "2026-10-25T06:00:00.000Z");
  assert.equal(harareSchedule.timezone, "Africa/Harare");
  assert.equal(
    harareSchedule.displayLabel,
    "2026-10-25 08:00 Africa/Harare (CAT, UTC+2)"
  );

  // Also prove the UI pill label "Africa/Harare (CAT, UTC+2)" resolves identically
  const hararePillSchedule = resolveWhatsAppBroadcastScheduleInput(
    "2026-10-25",
    "08:00",
    "Africa/Harare (CAT, UTC+2)"
  );
  assert.equal(hararePillSchedule.valid, true);
  assert.equal(hararePillSchedule.utcIso, "2026-10-25T06:00:00.000Z");

  // 2. Semantic proof: 2026-10-25 08:00 UTC -> 2026-10-25T08:00:00.000Z
  const utcSchedule = resolveWhatsAppBroadcastScheduleInput(
    "2026-10-25",
    "08:00",
    "UTC"
  );
  assert.equal(utcSchedule.valid, true);
  assert.equal(utcSchedule.utcIso, "2026-10-25T08:00:00.000Z");
  assert.equal(utcSchedule.timezone, "UTC");
  assert.equal(utcSchedule.displayLabel, "2026-10-25 08:00 UTC");

  // Those two values must not be equal
  assert.notEqual(harareSchedule.utcIso, utcSchedule.utcIso);

  // 3. Display round-trip proof using formatPreviewScheduleTimestamp
  assert.equal(
    formatPreviewScheduleTimestamp(harareSchedule.utcIso, harareSchedule.timezone),
    "2026-10-25 08:00 Africa/Harare (CAT, UTC+2)"
  );
  assert.equal(
    formatPreviewScheduleTimestamp(utcSchedule.utcIso, utcSchedule.timezone),
    "2026-10-25 08:00 UTC"
  );

  // 4. Optional blank schedule allowed
  const blankSchedule = resolveWhatsAppBroadcastScheduleInput("", "", "Africa/Harare");
  assert.equal(blankSchedule.valid, true);
  assert.equal(blankSchedule.utcIso, null);

  // 5. Validation failures:
  // - time with no date -> rejected
  const timeWithoutDate = resolveWhatsAppBroadcastScheduleInput("", "08:00", "Africa/Harare");
  assert.equal(timeWithoutDate.valid, false);
  assert.equal(timeWithoutDate.utcIso, null);

  // - date with no time -> rejected
  const dateWithoutTime = resolveWhatsAppBroadcastScheduleInput("2026-10-25", "", "Africa/Harare");
  assert.equal(dateWithoutTime.valid, false);
  assert.equal(dateWithoutTime.utcIso, null);

  // - invalid date -> rejected
  const invalidDateFormat = resolveWhatsAppBroadcastScheduleInput("25-10-2026", "08:00", "Africa/Harare");
  assert.equal(invalidDateFormat.valid, false);
  const invalidCalendarDay = resolveWhatsAppBroadcastScheduleInput("2026-02-30", "08:00", "Africa/Harare");
  assert.equal(invalidCalendarDay.valid, false);

  // - invalid time -> rejected
  const invalidTimeFormat = resolveWhatsAppBroadcastScheduleInput("2026-10-25", "8am", "Africa/Harare");
  assert.equal(invalidTimeFormat.valid, false);
  const invalidTimeBounds = resolveWhatsAppBroadcastScheduleInput("2026-10-25", "25:99", "Africa/Harare");
  assert.equal(invalidTimeBounds.valid, false);

  // - unsupported timezone -> rejected
  const unsupportedTz = resolveWhatsAppBroadcastScheduleInput("2026-10-25", "08:00", "America/New_York");
  assert.equal(unsupportedTz.valid, false);
  assert.ok(unsupportedTz.error?.includes("Unsupported schedule timezone"));

  // 6. Verify StudioWhatsAppDesk composer wires resolveWhatsAppBroadcastScheduleInput and SUPPORTED_PREVIEW_TIMEZONES without naive string concatenation
  const whatsappSource = read("src/ui/StudioWhatsAppDesk.tsx");
  assert.ok(!whatsappSource.includes("${newScheduledDate}T${newScheduledTime}:00"));
  assert.ok(whatsappSource.includes("resolveWhatsAppBroadcastScheduleInput"));
  assert.ok(whatsappSource.includes("SUPPORTED_PREVIEW_TIMEZONES.map"));
  assert.ok(whatsappSource.includes("whatsapp-schedule-tz-${tz.replace(\"/\", \"-\")}"));
});



