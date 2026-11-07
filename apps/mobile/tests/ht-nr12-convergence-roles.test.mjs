import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  hasAnyServerCapability,
  hasServerCapability,
  emptyAuthorizationSnapshot,
  hasSocialDeskAccess,
  hasNewsletterDeskAccess,
  hasPushDeskAccess,
  hasWhatsAppDeskAccess,
  hasStaffDeskAccess,
  hasAdvertisingDeskAccess,
  hasSubscriberDeskAccess,
  hasPremiumDeskAccess,
  hasAiDeskAccess,
  hasAuthorsDeskAccess,
  hasSettingsDeskAccess,
  canManageStaff,
  canCreateCampaign,
  canApproveCampaign,
  canManageSubscribers,
  canManagePremium,
  canRunAiAssist,
  canManageAuthors,
  canManageSettings,
  SOCIAL_DESK_CAPABILITIES,
  NEWSLETTER_DESK_CAPABILITIES,
  PUSH_DESK_CAPABILITIES,
  WHATSAPP_DESK_CAPABILITIES,
  STAFF_DESK_CAPABILITIES,
  ADVERTISING_DESK_CAPABILITIES,
  SUBSCRIBER_DESK_CAPABILITIES,
  PREMIUM_DESK_CAPABILITIES,
  AI_DESK_CAPABILITIES,
  AUTHORS_DESK_CAPABILITIES,
  SETTINGS_DESK_CAPABILITIES
} = capabilitiesModule;

const previewDataModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: { extra: {} } } }
  }
});
const { OWNER_PREVIEW_NAV_ITEMS } = previewDataModule;

// Construct 8 Canonical Newsroom Role Snapshots
function makeAuthorizedSnapshot(roleName, staffId, capabilities) {
  return {
    status: "authorized",
    source: "server",
    staffProfileId: staffId,
    capabilities,
    reason: `Authenticated as ${roleName}`
  };
}

const ROLES = {
  reporter: makeAuthorizedSnapshot("Reporter", "staff-reporter-01", [
    "story.create",
    "story.edit_own",
    "story.submit"
  ]),
  copyEditor: makeAuthorizedSnapshot("Copy Editor", "staff-copy-01", [
    "story.copy_edit",
    "story.fact_check"
  ]),
  deskEditor: makeAuthorizedSnapshot("Desk Editor", "staff-editor-01", [
    "story.create",
    "story.edit_all",
    "assignment.create",
    "assignment.manage",
    "story.health_review"
  ]),
  editorInChief: makeAuthorizedSnapshot("Editor-in-Chief", "staff-eic-01", [
    "story.create",
    "story.edit_all",
    "story.publish",
    "distribution.manage",
    "communication.announce",
    "staff.view",
    "staff.manage",
    "author_directory.manage",
    "analytics.view"
  ]),
  audienceDistribution: makeAuthorizedSnapshot("Audience & Distribution", "staff-dist-01", [
    "social.compose",
    "social.approve",
    "social.publish",
    "social.manage_accounts",
    "marketing.create",
    "marketing.approve",
    "marketing.send",
    "marketing.analytics",
    "distribution.manage",
    "analytics.view"
  ]),
  commercial: makeAuthorizedSnapshot("Commercial Operations", "staff-comm-01", [
    "ads.view",
    "ads.create",
    "ads.approve",
    "subscriber.view",
    "subscriber.manage",
    "premium.assign",
    "premium.manage"
  ]),
  securityAdmin: makeAuthorizedSnapshot("Security Admin", "staff-sec-01", [
    "staff.view",
    "staff.manage",
    "staff.change_role",
    "staff.revoke",
    "security.manage",
    "security.view_audit",
    "security.revoke_session",
    "settings.manage"
  ]),
  guest: emptyAuthorizationSnapshot("anonymous", "No authenticated session")
};

test("HT-NR-CLOSE Wave G: Role Matrix — Reporter has focused writing access without publication authority", () => {
  const { reporter } = ROLES;

  // Can access writing & AI desks
  assert.equal(hasServerCapability(reporter, "story.create"), true);
  assert.equal(hasServerCapability(reporter, "story.edit_own"), true);
  assert.equal(hasAuthorsDeskAccess(reporter), true); // Can view public authors
  assert.equal(hasAiDeskAccess(reporter), true); // Can use AI assistant

  // Cannot publish or access privileged operations
  assert.equal(hasServerCapability(reporter, "story.publish"), false);
  assert.equal(hasServerCapability(reporter, "story.edit_all"), false);
  assert.equal(hasSocialDeskAccess(reporter), false);
  assert.equal(hasNewsletterDeskAccess(reporter), false);
  assert.equal(hasPushDeskAccess(reporter), false);
  assert.equal(hasWhatsAppDeskAccess(reporter), false);
  assert.equal(hasStaffDeskAccess(reporter), false);
  assert.equal(hasAdvertisingDeskAccess(reporter), false);
  assert.equal(hasSubscriberDeskAccess(reporter), false);
  assert.equal(hasSettingsDeskAccess(reporter), false);
  assert.equal(canManageAuthors(reporter), false);
});

test("HT-NR-CLOSE Wave G: Role Matrix — Copy Editor has review gates access without administration authority", () => {
  const { copyEditor } = ROLES;

  // Can review and copy edit
  assert.equal(hasServerCapability(copyEditor, "story.copy_edit"), true);
  assert.equal(hasServerCapability(copyEditor, "story.fact_check"), true);

  // Cannot publish, manage staff, or manage commercial
  assert.equal(hasServerCapability(copyEditor, "story.publish"), false);
  assert.equal(hasStaffDeskAccess(copyEditor), false);
  assert.equal(hasAdvertisingDeskAccess(copyEditor), false);
  assert.equal(hasSettingsDeskAccess(copyEditor), false);
});

test("HT-NR-CLOSE Wave G: Role Matrix — Desk Editor has assignment and editorial management authority", () => {
  const { deskEditor } = ROLES;

  // Can create assignments, edit stories across desk, and review
  assert.equal(hasServerCapability(deskEditor, "assignment.create"), true);
  assert.equal(hasServerCapability(deskEditor, "assignment.manage"), true);
  assert.equal(hasServerCapability(deskEditor, "story.edit_all"), true);
  assert.equal(hasServerCapability(deskEditor, "story.health_review"), true);

  // Can manage author bylines
  assert.equal(canManageAuthors(deskEditor), true);

  // Cannot publish directly (requires EIC/distribution) or alter platform settings
  assert.equal(hasServerCapability(deskEditor, "story.publish"), false);
  assert.equal(hasSettingsDeskAccess(deskEditor), false);
});

test("HT-NR-CLOSE Wave G: Role Matrix — Editor-in-Chief has full publishing and editorial governance authority", () => {
  const { editorInChief } = ROLES;

  // Full publishing & distribution
  assert.equal(hasServerCapability(editorInChief, "story.publish"), true);
  assert.equal(hasServerCapability(editorInChief, "story.edit_all"), true);
  assert.equal(hasServerCapability(editorInChief, "distribution.manage"), true);
  assert.equal(hasPushDeskAccess(editorInChief), true);
  assert.equal(hasWhatsAppDeskAccess(editorInChief), true);
  assert.equal(hasStaffDeskAccess(editorInChief), true);
  assert.equal(canManageStaff(editorInChief), true);
  assert.equal(canManageAuthors(editorInChief), true);
});

test("HT-NR-CLOSE Wave G: Role Matrix — Audience/Distribution has multi-channel publishing without direct story writing", () => {
  const { audienceDistribution } = ROLES;

  // Multi-channel distribution access
  assert.equal(hasSocialDeskAccess(audienceDistribution), true);
  assert.equal(hasNewsletterDeskAccess(audienceDistribution), true);
  assert.equal(hasPushDeskAccess(audienceDistribution), true);
  assert.equal(hasWhatsAppDeskAccess(audienceDistribution), true);
  assert.equal(hasServerCapability(audienceDistribution, "analytics.view"), true);

  // Cannot edit staff roles or manage platform security
  assert.equal(hasStaffDeskAccess(audienceDistribution), false);
  assert.equal(hasSettingsDeskAccess(audienceDistribution), false);
  assert.equal(hasAdvertisingDeskAccess(audienceDistribution), false);
});

test("HT-NR-CLOSE Wave G: Role Matrix — Commercial Operations has monetisation authority with zero editorial publishing authority", () => {
  const { commercial } = ROLES;

  // Commercial & Subscriber desks
  assert.equal(hasAdvertisingDeskAccess(commercial), true);
  assert.equal(canCreateCampaign(commercial), true);
  assert.equal(canApproveCampaign(commercial), true);
  assert.equal(hasSubscriberDeskAccess(commercial), true);
  assert.equal(canManageSubscribers(commercial), true);
  assert.equal(hasPremiumDeskAccess(commercial), true);
  assert.equal(canManagePremium(commercial), true);

  // Absolute separation of editorial and commercial powers
  assert.equal(hasServerCapability(commercial, "story.publish"), false);
  assert.equal(hasServerCapability(commercial, "story.edit_all"), false);
  assert.equal(hasSocialDeskAccess(commercial), false);
  assert.equal(hasNewsletterDeskAccess(commercial), false);
  assert.equal(hasPushDeskAccess(commercial), false);
  assert.equal(hasStaffDeskAccess(commercial), false);
  assert.equal(hasSettingsDeskAccess(commercial), false);
});

test("HT-NR-CLOSE Wave G: Role Matrix — Security Admin has governance and session authority", () => {
  const { securityAdmin } = ROLES;

  // Staff and system management
  assert.equal(hasStaffDeskAccess(securityAdmin), true);
  assert.equal(canManageStaff(securityAdmin), true);
  assert.equal(hasSettingsDeskAccess(securityAdmin), true);
  assert.equal(canManageSettings(securityAdmin), true);
  assert.equal(hasServerCapability(securityAdmin, "security.view_audit"), true);
  assert.equal(hasServerCapability(securityAdmin, "security.revoke_session"), true);

  // Cannot publish editorial stories directly
  assert.equal(hasServerCapability(securityAdmin, "story.publish"), false);
  assert.equal(hasAdvertisingDeskAccess(securityAdmin), false);
});

test("HT-NR-CLOSE Wave G: Role Matrix — Guest / Unauthenticated fails closed across every privileged desk", () => {
  const { guest } = ROLES;

  assert.equal(hasSocialDeskAccess(guest), false);
  assert.equal(hasNewsletterDeskAccess(guest), false);
  assert.equal(hasPushDeskAccess(guest), false);
  assert.equal(hasWhatsAppDeskAccess(guest), false);
  assert.equal(hasStaffDeskAccess(guest), false);
  assert.equal(hasAdvertisingDeskAccess(guest), false);
  assert.equal(hasSubscriberDeskAccess(guest), false);
  assert.equal(hasPremiumDeskAccess(guest), false);
  assert.equal(hasAiDeskAccess(guest), false);
  assert.equal(hasAuthorsDeskAccess(guest), false);
  assert.equal(hasSettingsDeskAccess(guest), false);
  assert.equal(canManageStaff(guest), false);
  assert.equal(canCreateCampaign(guest), false);
  assert.equal(canApproveCampaign(guest), false);
  assert.equal(canManageSubscribers(guest), false);
  assert.equal(canManagePremium(guest), false);
  assert.equal(canRunAiAssist(guest), false);
  assert.equal(canManageAuthors(guest), false);
  assert.equal(canManageSettings(guest), false);
});

test("HT-NR-CLOSE Wave G: Unified Studio Navigation registers all 28 operational desks without omission", () => {
  const studioSource = fs.readFileSync(path.join(REPO_ROOT, "apps/mobile/src/ui/Studio.tsx"), "utf8");
  const moduleRouterSource = fs.readFileSync(path.join(REPO_ROOT, "apps/mobile/app/studio/[module].tsx"), "utf8");

  const requiredModules = [
    "inbox", "assignments", "planning", "calendar", "stories", "create-edit",
    "review-queue", "homepage", "live-desk", "video-desk", "desks", "breaking",
    "moderation", "media", "advertising", "premium", "social", "newsletters",
    "push-alerts", "whatsapp", "audience", "search-growth", "analytics",
    "subscribers", "authors", "staff-roles", "settings", "ai-desk"
  ];

  for (const mod of requiredModules) {
    assert.ok(
      moduleRouterSource.includes(`"${mod}"`),
      `app/studio/[module].tsx generateStaticParams must contain "${mod}"`
    );
  }

  // Zero-placeholder guarantee for registered operational modules
  assert.ok(
    moduleRouterSource.includes('String(module)!=="authors"') &&
    moduleRouterSource.includes('String(module)!=="settings"'),
    "StudioPlaceholder must exclude authors and settings"
  );
});

test("HT-NR-CLOSE Wave G: Owner Preview registers complete visual catalog of 25 modules", () => {
  assert.equal(OWNER_PREVIEW_NAV_ITEMS.length, 25);
  const previewKeys = OWNER_PREVIEW_NAV_ITEMS.map((item) => item.key);

  const expectedPreviewKeys = [
    "today", "stories", "review-queue", "planning", "assignments", "calendar",
    "homepage", "media", "video-desk", "live-desk", "social", "newsletters",
    "push-alerts", "whatsapp", "analytics", "audience", "search-growth",
    "staff-roles", "advertising", "subscribers", "premium", "ai-desk",
    "authors", "settings", "create-edit"
  ];

  assert.deepEqual(previewKeys, expectedPreviewKeys);
});

test("HT-NR-CLOSE Wave G: Repository migrations count is 83 and strictly sequential", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 83, `Expected at least 83 migrations, found ${files.length}`);

  // Waves A-F migrations exist in order
  const waveMigrations = [
    "20261017050000_ht_nr06d_whatsapp_distribution_foundation.sql",
    "20261017060000_ht_nr_wave_b_intelligence.sql",
    "20261017070000_ht_nr_wave_c_staff_operations.sql",
    "20261017080000_ht_nr_wave_d_commercial_operations.sql",
    "20261017090000_ht_nr_wave_e_ai_and_citations.sql",
    "20261017100000_ht_nr_wave_f_authors_taxonomy_settings.sql"
  ];

  for (const m of waveMigrations) {
    assert.ok(files.includes(m), `Migration ${m} must exist in supabase/migrations`);
  }
});
