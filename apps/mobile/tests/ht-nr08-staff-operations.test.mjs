import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTs } from "./ts-module-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
const TEST_OWNER_EMAIL = "owner@example.test";

const staffServiceModule = loadTs("src/services/newsroom-staff.ts", {
  mocks: {
    "expo-linking": {
      createURL: (path, options = {}) =>
        `https://healthtimes-staging.example/${path}?mode=${options.queryParams?.mode ?? ""}`
    },
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});

const {
  mapStaffMember,
  mapStaffInvitation,
  mapRole,
  mapCapability,
  mapAuditRecord,
  mapStaffOperationsDirectory,
  createNewsroomStaffService
} = staffServiceModule;

const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  hasStaffDeskAccess,
  canManageStaff,
  emptyAuthorizationSnapshot
} = capabilitiesModule;

const previewDataModule = loadTs("src/preview/newsroomPreviewData.ts", {
  mocks: {
    "expo-constants": { default: { expoConfig: { extra: {} } } }
  }
});
const {
  OWNER_PREVIEW_NAV_ITEMS,
  buildPreviewStaffOperationsDirectory
} = previewDataModule;

test("HT-NR-CLOSE Wave C: repository migration count is at least 80", () => {
  const migrationsDir = path.join(REPO_ROOT, "supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  assert.ok(files.length >= 80, `Expected at least 80 migrations, found ${files.length}`);
});

test("HT-NR-CLOSE Wave C: Migration 80 defines staff operations RPCs and strict security", () => {
  const migPath = path.join(
    REPO_ROOT,
    "supabase/migrations/20261017070000_ht_nr_wave_c_staff_operations.sql"
  );
  assert.ok(fs.existsSync(migPath), "Migration 80 file must exist");
  const sql = fs.readFileSync(migPath, "utf8");

  // Capabilities & roles
  assert.ok(sql.includes("'staff.manage'"), "Must seed staff.manage capability");
  assert.ok(sql.includes("'Contributor'"), "Must seed Contributor role");

  // Functions
  assert.ok(sql.includes("newsroom_change_staff_role"), "Must define newsroom_change_staff_role");
  assert.ok(sql.includes("newsroom_update_staff_status"), "Must define newsroom_update_staff_status");
  assert.ok(sql.includes("newsroom_revoke_session"), "Must define newsroom_revoke_session");
  assert.ok(sql.includes("newsroom_cancel_invitation"), "Must define newsroom_cancel_invitation");
  assert.ok(sql.includes("newsroom_get_staff_operations_directory"), "Must define newsroom_get_staff_operations_directory");

  // Security definitions
  assert.ok(sql.includes("revoke all on function public.newsroom_get_staff_operations_directory() from public, anon;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_get_staff_operations_directory() to authenticated, service_role;"));
  assert.ok(sql.includes("Self role changes are not permitted"));
  assert.ok(sql.includes("Self status modification is not permitted"));
});

test("HT-NR-CLOSE Wave C: mapStaffMember correctly maps database payload", () => {
  const raw = {
    id: "11111111-1111-1111-1111-111111111111",
    display_name: "Tendai Sithole",
    email: "tendai@healthtimes.co.zw",
    handle: "tendai.sithole",
    role_id: "22222222-2222-2222-2222-222222222222",
    role_name: "Reporter / Journalist",
    desk: "Public Health",
    beat: "Vaccines",
    country: "Zimbabwe",
    region: "Harare",
    status: "active",
    mfa_required: true,
    last_login_at: "2026-10-18T05:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    active_sessions_count: 3,
    capabilities: ["story.create", "story.edit_own"]
  };

  const mapped = mapStaffMember(raw);
  assert.equal(mapped.id, "11111111-1111-1111-1111-111111111111");
  assert.equal(mapped.displayName, "Tendai Sithole");
  assert.equal(mapped.email, "tendai@healthtimes.co.zw");
  assert.equal(mapped.handle, "tendai.sithole");
  assert.equal(mapped.roleName, "Reporter / Journalist");
  assert.equal(mapped.desk, "Public Health");
  assert.equal(mapped.status, "active");
  assert.equal(mapped.activeSessionsCount, 3);
  assert.deepEqual(mapped.capabilities, ["story.create", "story.edit_own"]);
});

test("HT-NR-CLOSE Wave C: mapStaffOperationsDirectory aggregates staff, invitations, roles, capabilities, and audit", () => {
  const raw = {
    staff: [
      {
        id: "s1",
        display_name: "Staff 1",
        email: "s1@example.com",
        status: "active"
      }
    ],
    invitations: [
      {
        id: "i1",
        invited_email: "invitee@example.com",
        display_name: "Invitee",
        role_name: "Contributor",
        status: "pending"
      }
    ],
    roles: [
      {
        id: "r1",
        name: "Editor-in-Chief",
        description: "Editorial head",
        capabilities: ["story.publish", "staff.manage"]
      }
    ],
    capabilities: [
      {
        key: "staff.manage",
        description: "Full staff management",
        category: "staff_admin"
      }
    ],
    audit_history: [
      {
        id: "a1",
        action: "staff.role.changed",
        target_table: "staff_profiles",
        target_id: "s1",
        metadata: { previous: "Contributor", new: "Reporter" }
      }
    ],
    can_manage_staff: true
  };

  const directory = mapStaffOperationsDirectory(raw);
  assert.equal(directory.staff.length, 1);
  assert.equal(directory.staff[0].displayName, "Staff 1");
  assert.equal(directory.invitations.length, 1);
  assert.equal(directory.invitations[0].invitedEmail, "invitee@example.com");
  assert.equal(directory.roles.length, 1);
  assert.equal(directory.roles[0].name, "Editor-in-Chief");
  assert.equal(directory.capabilities.length, 1);
  assert.equal(directory.capabilities[0].category, "staff_admin");
  assert.equal(directory.auditHistory.length, 1);
  assert.equal(directory.auditHistory[0].action, "staff.role.changed");
  assert.equal(directory.canManageStaff, true);
});

test("HT-NR-CLOSE Wave C: Security capability checks enforce staff.view and staff.manage", () => {
  const unauth = emptyAuthorizationSnapshot("anonymous", "No token");
  assert.equal(hasStaffDeskAccess(unauth), false);
  assert.equal(canManageStaff(unauth), false);

  const viewer = {
    status: "authorized",
    staffProfileId: "staff-view-01",
    capabilities: ["staff.view"],
    source: "server",
    reason: "authorized"
  };
  assert.equal(hasStaffDeskAccess(viewer), true);
  assert.equal(canManageStaff(viewer), false);

  const manager = {
    status: "authorized",
    staffProfileId: "staff-mgr-01",
    capabilities: ["staff.manage"],
    source: "server",
    reason: "authorized"
  };
  assert.equal(hasStaffDeskAccess(manager), true);
  assert.equal(canManageStaff(manager), true);
});

test("HT-NR-CLOSE Wave C: createNewsroomStaffService invokes correct RPCs and handles errors", async () => {
  const calls = [];
  const fakeClient = {
    async rpc(fn, args) {
      calls.push({ fn, args });
      if (fn === "newsroom_get_staff_operations_directory") {
        return { data: { staff: [], invitations: [], roles: [], capabilities: [], audit_history: [], can_manage_staff: true }, error: null };
      }
      if (fn === "newsroom_change_staff_role") {
        return { data: null, error: null };
      }
      if (fn === "newsroom_update_staff_status") {
        return { data: null, error: null };
      }
      if (fn === "newsroom_revoke_session") {
        return { data: 2, error: null };
      }
      if (fn === "newsroom_create_invitation") {
        return { data: { id: "new-inv-1", email: args.p_email, display_name: args.p_display_name, role: args.p_role_name }, error: null };
      }
      if (fn === "newsroom_cancel_invitation") {
        return { data: null, error: null };
      }
      return { data: null, error: { message: "Unknown RPC", code: "P0001" } };
    }
  };

  const service = createNewsroomStaffService(fakeClient);

  const dir = await service.getStaffOperationsDirectory();
  assert.equal(dir.canManageStaff, true);

  await service.changeStaffRole("staff-1", "Managing Editor");
  assert.deepEqual(calls[1], {
    fn: "newsroom_change_staff_role",
    args: { p_staff_id: "staff-1", p_role_name: "Managing Editor" }
  });

  await service.updateStaffStatus("staff-1", "suspended");
  assert.deepEqual(calls[2], {
    fn: "newsroom_update_staff_status",
    args: { p_staff_id: "staff-1", p_status: "suspended" }
  });

  const revoked = await service.revokeStaffSession("staff-1");
  assert.equal(revoked, 2);

  const inv = await service.createInvitation({
    email: "test@example.com",
    displayName: "Test User",
    roleName: "Reporter / Journalist"
  });
  assert.equal(inv.id, "new-inv-1");

  await service.cancelInvitation("new-inv-1");
  assert.deepEqual(calls[5], {
    fn: "newsroom_cancel_invitation",
    args: { p_invitation_id: "new-inv-1" }
  });
});

test("Owner signup without a confirmed session returns verification-required and never bootstraps", async () => {
  const calls = [];
  const service = createNewsroomStaffService({
    auth: {
      async getSession() {
        calls.push("getSession");
        return { data: { session: null }, error: null };
      },
      async signInWithPassword() {
        calls.push("signInWithPassword");
        return { data: { session: null }, error: { code: "invalid_credentials", message: "Invalid login credentials" } };
      },
      async signUp(input) {
        calls.push({ action: "signUp", input });
        return { data: { session: null, user: { identities: [{}] } }, error: null };
      }
    },
    async rpc() {
      calls.push("rpc");
      return { data: null, error: null };
    }
  });

  const result = await service.activateOwner({ email: TEST_OWNER_EMAIL, password: "not-persisted-password" });
  assert.equal(result.status, "verification-required");
  assert.equal(result.success, false);
  assert.equal(calls.includes("rpc"), false);
  const signUpCall = calls.find((entry) => typeof entry === "object" && entry.action === "signUp");
  assert.match(signUpCall.input.options.emailRedirectTo, /account-access\?mode=owner-activation/);
  assert.equal("invitation_id" in (signUpCall.input.options.data ?? {}), false);
  assert.equal("role" in (signUpCall.input.options.data ?? {}), false);
});

test("Existing unconfirmed Owner does not create another identity or bootstrap", async () => {
  let signUpCount = 0;
  let rpcCount = 0;
  const service = createNewsroomStaffService({
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signInWithPassword() {
        return {
          data: { session: null },
          error: { code: "email_not_confirmed", message: "Email not confirmed" }
        };
      },
      async signUp() {
        signUpCount += 1;
        return { data: { session: null }, error: null };
      }
    },
    async rpc() {
      rpcCount += 1;
      return { data: null, error: null };
    }
  });

  const result = await service.activateOwner({ email: TEST_OWNER_EMAIL, password: "not-persisted-password" });
  assert.equal(result.status, "verification-required");
  assert.equal(signUpCount, 0);
  assert.equal(rpcCount, 0);
});

test("Confirmed Owner session may bootstrap and already-provisioned success remains idempotent", async () => {
  let rpcCount = 0;
  const service = createNewsroomStaffService({
    auth: {
      async getSession() {
        return {
          data: {
            session: {
              user: {
                email: TEST_OWNER_EMAIL,
                email_confirmed_at: "2026-10-23T00:00:00Z"
              }
            }
          },
          error: null
        };
      },
      async signInWithPassword() {
        throw new Error("sign in must not run for an existing confirmed session");
      },
      async signUp() {
        throw new Error("signup must not run for an existing confirmed session");
      }
    },
    async rpc(name) {
      rpcCount += 1;
      assert.equal(name, "newsroom_bootstrap_owner");
      return {
        data: {
          success: true,
          already_provisioned: true,
          staff_id: "owner-staff-id",
          role: "Publisher / Owner"
        },
        error: null
      };
    }
  });

  const result = await service.activateOwner({ email: TEST_OWNER_EMAIL, password: "not-persisted-password" });
  assert.equal(result.status, "activated");
  assert.equal(result.success, true);
  assert.equal(result.role, "Publisher / Owner");
  assert.equal(rpcCount, 1);
});

test("Different authenticated account fails closed before Owner bootstrap", async () => {
  let rpcCount = 0;
  const service = createNewsroomStaffService({
    auth: {
      async getSession() {
        return {
          data: {
            session: {
              user: {
                email: "other@example.test",
                email_confirmed_at: "2026-10-23T00:00:00Z"
              }
            }
          },
          error: null
        };
      },
      async signInWithPassword() {
        throw new Error("sign in must not run while another account is authenticated");
      },
      async signUp() {
        throw new Error("signup must not run while another account is authenticated");
      }
    },
    async rpc() {
      rpcCount += 1;
      return { data: null, error: null };
    }
  });

  const result = await service.activateOwner({ email: TEST_OWNER_EMAIL, password: "not-persisted-password" });
  assert.equal(result.status, "error");
  assert.match(result.error, /another authenticated account/i);
  assert.equal(rpcCount, 0);
});

test("Owner activation and resend surface email rate limits without retrying", async () => {
  let signUpCount = 0;
  let resendCount = 0;
  const service = createNewsroomStaffService({
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signInWithPassword() {
        return { data: { session: null }, error: { code: "invalid_credentials", message: "Invalid login credentials" } };
      },
      async signUp() {
        signUpCount += 1;
        return { data: { session: null }, error: { code: "over_email_send_rate_limit", message: "email rate limit exceeded" } };
      },
      async resend() {
        resendCount += 1;
        return { data: null, error: { code: "over_email_send_rate_limit", message: "email rate limit exceeded" } };
      }
    },
    async rpc() {
      throw new Error("bootstrap must not run while email is rate limited");
    }
  });

  const activation = await service.activateOwner({ email: TEST_OWNER_EMAIL, password: "not-persisted-password" });
  assert.equal(activation.status, "email-rate-limited");
  assert.equal(signUpCount, 1);

  const resend = await service.resendOwnerVerification(TEST_OWNER_EMAIL);
  assert.equal(resend.status, "email-rate-limited");
  assert.equal(resendCount, 1);
});

test("Owner activation UI omits invitation authority and callback completes bootstrap after verification", () => {
  const activation = fs.readFileSync(path.join(REPO_ROOT, "apps/mobile/src/ui/StudioActivate.tsx"), "utf8");
  const staff = fs.readFileSync(path.join(REPO_ROOT, "apps/mobile/src/services/newsroom-staff.ts"), "utf8");
  const callback = fs.readFileSync(path.join(REPO_ROOT, "apps/mobile/app/account-access.tsx"), "utf8");
  const publicCorpus = activation + "\n" + staff;
  const ownerActivationSource = staff.slice(staff.indexOf("async activateOwner"));

  assert.equal(publicCorpus.includes("3c277c48-5319-429f-a2c3-1bf2dbae4c2a"), false);
  assert.equal(activation.includes("INVITATION TOKEN"), false);
  assert.equal(ownerActivationSource.includes("invitation_id"), false);
  assert.equal(/console\.(log|info|warn|error)\([^)]*password/i.test(publicCorpus), false);
  assert.equal(/(?:AsyncStorage|SecureStore|localStorage).*password/i.test(publicCorpus), false);
  assert.equal(/[A-Z0-9._%+-]+@gmail\.com/i.test(publicCorpus), false);
  assert.ok(callback.includes('url.includes("mode=owner-activation")'));
  assert.ok(callback.includes("services.newsroomStaff.bootstrapOwner()"));
});

test("HT-NR-CLOSE Wave C: Studio [module].tsx renders StudioStaffRolesDesk and omits placeholder", () => {
  const moduleFile = path.join(REPO_ROOT, "apps/mobile/app/studio/[module].tsx");
  const content = fs.readFileSync(moduleFile, "utf8");

  assert.ok(content.includes('String(module)!=="staff-roles"'), "Must exclude staff-roles from StudioPlaceholder");
  assert.match(content, /<StudioStaffRolesDesk\b/, "Must render StudioStaffRolesDesk component");
  assert.ok(content.includes('STAFF_DESK_CAPABILITIES'), "Must gate staff-roles using STAFF_DESK_CAPABILITIES");
});

test("HT-NR-CLOSE Wave C: Owner Preview registers staff-roles in navigation and static export", () => {
  const previewNav = OWNER_PREVIEW_NAV_ITEMS.find((item) => item.key === "staff-roles");
  assert.ok(previewNav, "staff-roles must be in OWNER_PREVIEW_NAV_ITEMS");
  assert.equal(previewNav.path, "/owner-preview/studio/staff-roles");

  const previewData = buildPreviewStaffOperationsDirectory();
  assert.ok(previewData.staff.length >= 5, "Preview staff must have sample profiles");
  assert.ok(previewData.roles.length >= 5, "Preview roles must have sample roles");
  assert.ok(previewData.canManageStaff, "Preview canManageStaff must be true");

  const ownerPreviewModule = path.join(
    REPO_ROOT,
    "apps/mobile/app/owner-preview/studio/[module].tsx"
  );
  const staticParams = fs.readFileSync(ownerPreviewModule, "utf8");
  assert.ok(staticParams.includes('"staff-roles"'), "generateStaticParams must include staff-roles");
});
