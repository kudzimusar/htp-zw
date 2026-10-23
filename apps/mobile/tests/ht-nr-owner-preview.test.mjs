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
