import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

test("UX-CONV-01A: Personal Profile route /studio/me and StudioPersonalProfile component exist", () => {
  assert.ok(fs.existsSync(path.join(root, "app/studio/me.tsx")), "app/studio/me.tsx must exist");
  assert.ok(fs.existsSync(path.join(root, "src/ui/StudioPersonalProfile.tsx")), "StudioPersonalProfile.tsx must exist");

  const meRouteSource = read("app/studio/me.tsx");
  assert.ok(meRouteSource.includes("StudioShell"));
  assert.ok(meRouteSource.includes("StudioPersonalProfile"));
  assert.ok(meRouteSource.includes("Personal Station & Authority"));

  const profileSource = read("src/ui/StudioPersonalProfile.tsx");
  assert.ok(profileSource.includes("Personal Identity & Station"));
  assert.ok(profileSource.includes("Authority & Effective Capabilities"));
  assert.ok(profileSource.includes("My Work & Direct Responsibilities"));
  assert.ok(profileSource.includes("Workspace & Interface Preferences"));
  assert.ok(profileSource.includes("Security & Active Sessions"));
  assert.ok(profileSource.includes("Full organisational oversight"));
  assert.ok(profileSource.includes("DOMAINS AUTHORIZED"));
});

test("UX-CONV-01B: Staff Profile route /studio/staff/[staffId] and StudioStaffProfile component exist", () => {
  assert.ok(fs.existsSync(path.join(root, "app/studio/staff/[staffId].tsx")), "app/studio/staff/[staffId].tsx must exist");
  assert.ok(fs.existsSync(path.join(root, "src/ui/StudioStaffProfile.tsx")), "StudioStaffProfile.tsx must exist");

  const staffRouteSource = read("app/studio/staff/[staffId].tsx");
  assert.ok(staffRouteSource.includes("StudioShell"));
  assert.ok(staffRouteSource.includes("StudioStaffProfile"));
  assert.ok(staffRouteSource.includes("generateStaticParams"));

  const staffSource = read("src/ui/StudioStaffProfile.tsx");
  assert.ok(staffSource.includes("Staff Identity & Organizational Profile"));
  assert.ok(staffSource.includes("Authored & Assigned Stories"));
  assert.ok(staffSource.includes("Current & Upcoming Assignments"));
  assert.ok(staffSource.includes("Meaningful Operational Activity"));
  assert.ok(staffSource.includes("Effective Authority & Operating Rights"));
  assert.ok(staffSource.includes("Staff Notification Routing"));
  assert.ok(staffSource.includes("Active Sessions & Security Oversight"));
  assert.ok(staffSource.includes("Station & Operational Preferences"));
});

test("UX-CONV-01B: Staff directory cards provide complete identity rows, authority levels and profile navigation without fabricated numbers", () => {
  const staffDeskSource = read("src/ui/StudioStaffRolesDesk.tsx");
  assert.ok(staffDeskSource.includes("staffAvatar"));
  assert.ok(staffDeskSource.includes("HealthTimes Zimbabwe"));
  assert.ok(staffDeskSource.includes("authorityPill"));
  assert.ok(staffDeskSource.includes("certified capabilities"));
  assert.ok(!staffDeskSource.includes("27 Stories · 4 Reviews · 3 Active Assignments"), "Must not contain fabricated workload totals");
  assert.ok(staffDeskSource.includes("View Profile →"));
  assert.ok(staffDeskSource.includes("/studio/staff/"));
});

test("UX-CONV-01C & UX-CONV-01D: StudioShell provides persistent Global Top Bar, Collapsible Sidebar, Environment Badge, and Breadcrumbs", () => {
  const shellSource = read("src/ui/Studio.tsx");

  // Top Utility Bar
  assert.ok(shellSource.includes("topUtilityBar"));
  assert.ok(shellSource.includes("STAGING"));
  assert.ok(shellSource.includes("+ Create"));
  assert.ok(shellSource.includes("notificationBellBtn"));
  assert.ok(shellSource.includes("Search stories, staff, invoices... (⌘K)"));

  // Collapsible Sidebar & Navigation
  assert.ok(shellSource.includes("sidebarCollapsed"));
  assert.ok(shellSource.includes("collapseToggleBtn"));
  assert.ok(shellSource.includes("Collapse Sidebar"));
  assert.ok(shellSource.includes("★ PINNED WORKSPACES"));

  // Mobile Drawer
  assert.ok(shellSource.includes("drawerSheet"));
  assert.ok(shellSource.includes("drawerNavScroll"));

  // Breadcrumb Framework
  assert.ok(shellSource.includes("breadcrumbBar"));
  assert.ok(shellSource.includes("breadcrumbTrail"));
  assert.ok(shellSource.includes("breadcrumbLink"));

  // Account Menu Popover
  assert.ok(shellSource.includes("accountMenuPopover"));
  assert.ok(shellSource.includes("My Profile & Station"));
  assert.ok(shellSource.includes("/studio/me"));
  assert.ok(shellSource.includes("Sign Out"));
});

test("UX-CONV-01E: StudioToday index renders role perspective selector and role-aware dashboards", () => {
  const todaySource = read("app/studio/index.tsx");

  assert.ok(todaySource.includes("PublisherOwnerDashboard"));
  assert.ok(todaySource.includes("ReporterDashboard"));
  assert.ok(todaySource.includes("EditorInChiefDashboard"));
  assert.ok(todaySource.includes("FinanceManagerDashboard"));
  assert.ok(todaySource.includes("CommercialManagerDashboard"));
  assert.ok(todaySource.includes("AudienceGrowthDashboard"));
  assert.ok(todaySource.includes("SystemsAdminDashboard"));

  // Role perspective bar
  assert.ok(todaySource.includes("OPERATING ROLE PERSPECTIVE:"));
  assert.ok(todaySource.includes("Publisher / Owner"));
  assert.ok(todaySource.includes("Reporter"));
  assert.ok(todaySource.includes("Editor-in-Chief"));
  assert.ok(todaySource.includes("Finance Manager"));
  assert.ok(todaySource.includes("Commercial Manager"));
  assert.ok(todaySource.includes("Audience & Growth"));
  assert.ok(todaySource.includes("Systems Admin"));

  // Required invariants preserved
  assert.ok(todaySource.includes("FINANCE & BILLING"));
  assert.ok(todaySource.includes("CP7"));
  assert.ok(todaySource.includes("NOT AUTHORIZED"));
  assert.ok(todaySource.includes("STUDIO_DOMAINS"));
  assert.ok(todaySource.includes('["Review Queue","review-queue"'));
  assert.ok(todaySource.includes('["Editorial Calendar","calendar"'));
  assert.ok(todaySource.includes('["Planning / News Budget","planning"'));
});

test("UX-CONV-01E (First Design Priority): Publisher / Owner Dashboard provides 6 structured operational domains and quick actions", () => {
  const dashboardsSource = read("src/ui/StudioRoleDashboards.tsx");

  // Executive quick actions
  assert.ok(dashboardsSource.includes("EXECUTIVE ACTIONS:"));
  assert.ok(dashboardsSource.includes("+ Create Story"));
  assert.ok(dashboardsSource.includes("+ Create Assignment"));
  assert.ok(dashboardsSource.includes("+ Start Live Coverage"));
  assert.ok(dashboardsSource.includes("+ Create Campaign"));
  assert.ok(dashboardsSource.includes("+ Create Order"));
  assert.ok(dashboardsSource.includes("+ Create Invoice"));
  assert.ok(dashboardsSource.includes("+ Invite Staff"));

  // 1. Today section
  assert.ok(dashboardsSource.includes("1. Today's Critical Attention"));
  assert.ok(dashboardsSource.includes("STORIES AWAITING APPROVAL"));
  assert.ok(dashboardsSource.includes("LIVE COVERAGE STATUS"));
  assert.ok(dashboardsSource.includes("SCHEDULED PUBLICATIONS"));

  // 2. Newsroom Health section
  assert.ok(dashboardsSource.includes("2. Newsroom Health & Editorial Velocity"));
  assert.ok(dashboardsSource.includes("Total Stories Backed"));
  assert.ok(dashboardsSource.includes("Published Today"));
  assert.ok(dashboardsSource.includes("Active Reporters"));
  assert.ok(dashboardsSource.includes("Overdue Assignments"));

  // 3. Audience & Commercial section
  assert.ok(dashboardsSource.includes("3. Audience Reach & Distribution"));
  assert.ok(dashboardsSource.includes("MULTI-CHANNEL AUDIENCE"));
  assert.ok(dashboardsSource.includes("COMMERCIAL & SUBSCRIBERS"));
  assert.ok(dashboardsSource.includes("FINANCE & BILLING"));

  // 4. People & Governance section
  assert.ok(dashboardsSource.includes("4. People, Governance & Security"));
  assert.ok(dashboardsSource.includes("Station Staff & Access Governance"));
});

test("UX-CONV-01E: Specialized dashboards are present for Reporter, Editor, Finance, Commercial, Audience, and SysAdmin", () => {
  const dashboardsSource = read("src/ui/StudioRoleDashboards.tsx");

  // Reporter Dashboard
  assert.ok(dashboardsSource.includes("REPORTER WORKSPACE"));
  assert.ok(dashboardsSource.includes("My Assignments & Reporting Queue"));
  assert.ok(dashboardsSource.includes("+ New Story Draft"));

  // Editor-in-Chief Dashboard
  assert.ok(dashboardsSource.includes("EDITORIAL LEADERSHIP"));
  assert.ok(dashboardsSource.includes("Newsroom Flow & Review Pipeline"));
  assert.ok(dashboardsSource.includes("REVIEW QUEUE (HIGH PRIORITY)"));

  // Finance Manager Dashboard
  assert.ok(dashboardsSource.includes("FINANCE & LEDGER OPERATIONS"));
  assert.ok(dashboardsSource.includes("Billing, Accounts Receivable & Newsroom Cashflow"));
  assert.ok(dashboardsSource.includes("OPEN INVOICES"));
  assert.ok(dashboardsSource.includes("OVERDUE RECEIVABLES"));
  assert.ok(dashboardsSource.includes("PENDING EXPENSE CLAIMS"));

  // Commercial Manager Dashboard
  assert.ok(dashboardsSource.includes("COMMERCIAL & MONETISATION"));
  assert.ok(dashboardsSource.includes("ACTIVE AD CAMPAIGNS"));
  assert.ok(dashboardsSource.includes("ORDERS AWAITING APPROVAL"));

  // Audience Dashboard
  assert.ok(dashboardsSource.includes("AUDIENCE DISTRIBUTION & GROWTH"));
  assert.ok(dashboardsSource.includes("NEWSLETTER DISTRIBUTION"));
  assert.ok(dashboardsSource.includes("PUSH ALERTS"));
  assert.ok(dashboardsSource.includes("WHATSAPP CHANNEL"));

  // Systems Administrator Dashboard
  assert.ok(dashboardsSource.includes("PLATFORM GOVERNANCE & SECURITY"));
  assert.ok(dashboardsSource.includes("ACTIVE STAFF ACCOUNTS"));
  assert.ok(dashboardsSource.includes("ACTIVE SESSIONS"));
  assert.ok(dashboardsSource.includes("PROVIDER INTEGRATIONS"));
});

test("UX-CONV-01 Productivity Layer: Command Palette (⌘K), Quick Create, Notification Centre, and Preferences Context exist", () => {
  const shellSource = read("src/ui/Studio.tsx");

  // Command Palette
  assert.ok(shellSource.includes("commandPaletteBox"));
  assert.ok(shellSource.includes("QUICK ACTIONS & NAVIGATION"));
  assert.ok(shellSource.includes("Type a command or search workspace... (Esc to close)"));

  // Quick Create
  assert.ok(shellSource.includes("quickCreateBox"));
  assert.ok(shellSource.includes("quickCreateGrid"));

  // Notification Centre
  assert.ok(shellSource.includes("notificationDrawerSheet"));
  assert.ok(shellSource.includes("Operational Notifications"));
  assert.ok(shellSource.includes("EDITORIAL REVIEW"));

  // Studio Preferences Context
  assert.ok(fs.existsSync(path.join(root, "src/ui/StudioPreferencesContext.tsx")));
  const prefSource = read("src/ui/StudioPreferencesContext.tsx");
  assert.ok(prefSource.includes("useStudioPreferences"));
  assert.ok(prefSource.includes("tableDensity"));
  assert.ok(prefSource.includes("sidebarCollapsed"));
  assert.ok(prefSource.includes("pinnedPaths"));
});

test("UX-CONV-01-R1 Real Data Truth: Zero invented numbers in role dashboards and staff profiles", () => {
  const dashboardsSource = read("src/ui/StudioRoleDashboards.tsx");
  assert.ok(!dashboardsSource.includes("5792"), "Must not contain invented stories count 5792");
  assert.ok(!dashboardsSource.includes("12,480"), "Must not contain invented newsletter count 12,480");
  assert.ok(!dashboardsSource.includes("8,920"), "Must not contain invented push count 8,920");
  assert.ok(!dashboardsSource.includes("24,500"), "Must not contain invented whatsapp count 24,500");
  assert.ok(!dashboardsSource.includes("4,200 reads"), "Must not contain invented story reads");

  const staffProfileSource = read("src/ui/StudioStaffProfile.tsx");
  assert.ok(!staffProfileSource.includes("27</Text>"), "Staff profile must not contain hardcoded 27 stories");
  assert.ok(staffProfileSource.includes("Staff Profile Not Found"), "Must contain helpful not-found state for unknown staff IDs");
  assert.ok(staffProfileSource.includes("Access Denied"), "Unauthorized access must fail closed");

  const personalProfileSource = read("src/ui/StudioPersonalProfile.tsx");
  assert.ok(!personalProfileSource.includes('displayName || "Kudzanai Musarurwa"'), "Must not hardcode Kudzanai Musarurwa as fallback identity");
});

test("UX-CONV-01-R1 Role Dashboard Authority: Non-executive users cannot switch perspectives or escalate authority", () => {
  const indexSource = read("app/studio/index.tsx");
  assert.ok(indexSource.includes("isExecutiveRole"), "Must gate perspective selector behind executive role check");
  assert.ok(indexSource.includes("OWNER DESIGN PREVIEW ONLY"), "Perspective selector must be explicitly labelled as preview only");
  assert.ok(indexSource.includes("CLIENT PERSPECTIVE SIMULATION DOES NOT ALTER SERVER RBAC"), "Must display prominent disclaimer that simulation does not modify server RBAC");
});

test("UX-CONV-01-R2: Dynamic Staff Profile rewrite rule and deep-link routing contract (UAT04B-STG02-001)", () => {
  const repoRoot = path.resolve(root, "../..");
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8"));
  assert.equal(vercelConfig.cleanUrls, true, "cleanUrls must be true");
  assert.ok(Array.isArray(vercelConfig.rewrites), "vercel.json must define rewrites");
  const staffRewrite = vercelConfig.rewrites.find((r) => r.source === "/studio/staff/:staffId");
  assert.ok(staffRewrite, "Must contain rewrite rule for /studio/staff/:staffId");
  assert.ok(
    staffRewrite.destination === "/studio/staff/fallback.html" ||
    staffRewrite.destination === "/studio/staff/[staffId].html",
    "Destination must serve the dynamic staff route HTML fallback"
  );

  // Verify /studio/me route exists independently and is not affected by dynamic staff rewrites
  assert.ok(fs.existsSync(path.join(root, "app/studio/me.tsx")), "app/studio/me.tsx must exist");
  assert.ok(fs.existsSync(path.join(root, "app/studio/staff/[staffId].tsx")), "app/studio/staff/[staffId].tsx must exist");
});
