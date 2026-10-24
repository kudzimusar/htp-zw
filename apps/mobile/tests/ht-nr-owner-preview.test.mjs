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

  // Verify Social, Newsletter, and Push Alert desks wire parseAndFormatPreviewSchedule and formatPreviewScheduleTimestamp
  for (const deskPath of [
    "src/ui/StudioSocialDesk.tsx",
    "src/ui/StudioNewsletterDesk.tsx",
    "src/ui/StudioPushAlertDesk.tsx"
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


