import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadTs } from "./ts-module-loader.mjs";
import { handleWhatsAppDispatchRequest } from "../../../supabase/functions/newsroom-whatsapp-dispatch/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileRoot, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(mobileRoot, relPath), "utf8");
}

function readRepo(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

// =============================================================================
// 1. DOMAIN MODELS & VALIDATION (HT-NR-06D)
// =============================================================================

const modelsModule = loadTs("src/domain/models.ts");
const {
  NEWSROOM_WHATSAPP_BROADCAST_TYPES,
  NEWSROOM_WHATSAPP_BROADCAST_STATUSES,
  NEWSROOM_WHATSAPP_DISPATCH_STATUSES,
  validateWhatsAppBroadcastType,
  validateWhatsAppBroadcastStatus,
  validateWhatsAppDispatchStatus,
  validateWhatsAppBroadcastCreateInput
} = modelsModule;

test("HT-NR-06D: NEWSROOM_WHATSAPP_BROADCAST_TYPES defines all 4 canonical broadcast types", () => {
  assert.deepEqual([...NEWSROOM_WHATSAPP_BROADCAST_TYPES], [
    "breaking_alert",
    "daily_briefing",
    "story_update",
    "health_alert"
  ]);

  for (const t of NEWSROOM_WHATSAPP_BROADCAST_TYPES) {
    assert.equal(validateWhatsAppBroadcastType(t), true);
  }
  assert.equal(validateWhatsAppBroadcastType("marketing"), false);
  assert.equal(validateWhatsAppBroadcastType("promo"), false);
  assert.equal(validateWhatsAppBroadcastType(null), false);
  assert.equal(validateWhatsAppBroadcastType(123), false);
});

test("HT-NR-06D: NEWSROOM_WHATSAPP_BROADCAST_STATUSES defines all 4 canonical statuses", () => {
  assert.deepEqual([...NEWSROOM_WHATSAPP_BROADCAST_STATUSES], [
    "draft",
    "approved",
    "sent",
    "rejected"
  ]);

  for (const st of NEWSROOM_WHATSAPP_BROADCAST_STATUSES) {
    assert.equal(validateWhatsAppBroadcastStatus(st), true);
  }
  assert.equal(validateWhatsAppBroadcastStatus("pending"), false);
  assert.equal(validateWhatsAppBroadcastStatus("dispatched"), false);
  assert.equal(validateWhatsAppBroadcastStatus(undefined), false);
});

test("HT-NR-06D: NEWSROOM_WHATSAPP_DISPATCH_STATUSES defines all 6 canonical dispatch transport states", () => {
  assert.deepEqual([...NEWSROOM_WHATSAPP_DISPATCH_STATUSES], [
    "submitted",
    "provider-accepted",
    "provider-rejected",
    "partially-accepted",
    "unconfigured",
    "delivery-failed"
  ]);

  for (const st of NEWSROOM_WHATSAPP_DISPATCH_STATUSES) {
    assert.equal(validateWhatsAppDispatchStatus(st), true);
  }
  assert.equal(validateWhatsAppDispatchStatus("sent"), false);
  assert.equal(validateWhatsAppDispatchStatus("delivered"), false);
});

test("HT-NR-06D: validateWhatsAppBroadcastCreateInput enforces title, body, and UUID constraints", () => {
  // Valid input
  const valid = validateWhatsAppBroadcastCreateInput({
    title: "Cholera Outbreak Alert",
    body: "Ministry of Health issues immediate water boiling advisory for Harare South.",
    broadcast_type: "breaking_alert",
    channel_identity: "healthtimes-whatsapp-channel",
    related_story_id: "11111111-1111-4111-a111-111111111111"
  });
  assert.equal(valid.valid, true);

  // Short title
  const shortTitle = validateWhatsAppBroadcastCreateInput({
    title: "AB",
    body: "Valid body text that is long enough.",
    broadcast_type: "breaking_alert"
  });
  assert.equal(shortTitle.valid, false);
  assert.ok(shortTitle.error.includes("at least 3 characters"));

  // Short body
  const shortBody = validateWhatsAppBroadcastCreateInput({
    title: "Valid Title",
    body: "Too short",
    broadcast_type: "breaking_alert"
  });
  assert.equal(shortBody.valid, false);
  assert.ok(shortBody.error.includes("at least 10 characters"));

  // Invalid type
  const badType = validateWhatsAppBroadcastCreateInput({
    title: "Valid Title",
    body: "Valid body text that is long enough.",
    broadcast_type: "commercial_promo"
  });
  assert.equal(badType.valid, false);
  assert.ok(badType.error.includes("Invalid broadcast type"));

  // Invalid related_story_id (not a UUID)
  const badStory = validateWhatsAppBroadcastCreateInput({
    title: "Valid Title",
    body: "Valid body text that is long enough.",
    broadcast_type: "breaking_alert",
    related_story_id: "not-a-uuid"
  });
  assert.equal(badStory.valid, false);
  assert.ok(badStory.error.includes("valid UUID"));

  // Unexpected fields
  const extraField = validateWhatsAppBroadcastCreateInput({
    title: "Valid Title",
    body: "Valid body text that is long enough.",
    broadcast_type: "breaking_alert",
    phone_numbers: ["+263771234567"]
  });
  assert.equal(extraField.valid, false);
  assert.ok(extraField.error.includes("Unexpected field"));
});

// =============================================================================
// 2. CAPABILITY GATING & ACCESS MATRIX
// =============================================================================

const capabilitiesModule = loadTs("src/security/capabilities.ts");
const {
  WHATSAPP_DESK_CAPABILITIES,
  hasWhatsAppDeskAccess,
  resolveWhatsAppDeskCapabilityState
} = capabilitiesModule;

test("HT-NR-06D: WHATSAPP_DESK_CAPABILITIES requires distribution.manage or story.publish", () => {
  assert.deepEqual([...WHATSAPP_DESK_CAPABILITIES], [
    "distribution.manage",
    "story.publish"
  ]);
});

test("HT-NR-06D: hasWhatsAppDeskAccess correctly enforces server authorization and capabilities", () => {
  // Non-authorized snapshot -> denied
  assert.equal(
    hasWhatsAppDeskAccess({
      status: "authenticated-no-staff-authority",
      source: "client",
      capabilities: ["distribution.manage"]
    }),
    false
  );

  // Authorized with distribution.manage -> allowed
  assert.equal(
    hasWhatsAppDeskAccess({
      status: "authorized",
      source: "server",
      capabilities: ["distribution.manage"]
    }),
    true
  );

  // Authorized with story.publish -> allowed
  assert.equal(
    hasWhatsAppDeskAccess({
      status: "authorized",
      source: "server",
      capabilities: ["story.publish"]
    }),
    true
  );

  // Authorized with unrelated capability -> denied
  assert.equal(
    hasWhatsAppDeskAccess({
      status: "authorized",
      source: "server",
      capabilities: ["comment.moderate"]
    }),
    false
  );
});

test("HT-NR-06D: resolveWhatsAppDeskCapabilityState enforces granular action gates", () => {
  // Editor with distribution.manage: can create & reject, cannot approve or dispatch
  const editorState = resolveWhatsAppDeskCapabilityState({
    status: "authorized",
    source: "server",
    capabilities: ["distribution.manage"]
  });
  assert.equal(editorState.hasDeskAccess, true);
  assert.equal(editorState.canCreate, true);
  assert.equal(editorState.canReject, true);
  assert.equal(editorState.canApprove, false);
  assert.equal(editorState.canDispatch, false);

  // Publisher with story.publish: can approve, reject, dispatch
  const publisherState = resolveWhatsAppDeskCapabilityState({
    status: "authorized",
    source: "server",
    capabilities: ["story.publish"]
  });
  assert.equal(publisherState.hasDeskAccess, true);
  assert.equal(publisherState.canCreate, false);
  assert.equal(publisherState.canApprove, true);
  assert.equal(publisherState.canReject, true);
  assert.equal(publisherState.canDispatch, true);

  // Senior editor with both capabilities
  const fullState = resolveWhatsAppDeskCapabilityState({
    status: "authorized",
    source: "server",
    capabilities: ["distribution.manage", "story.publish"]
  });
  assert.equal(fullState.hasDeskAccess, true);
  assert.equal(fullState.canCreate, true);
  assert.equal(fullState.canApprove, true);
  assert.equal(fullState.canReject, true);
  assert.equal(fullState.canDispatch, true);
});

// =============================================================================
// 3. MIGRATION 78 AUTHORITY & SCHEMA INTEGRITY
// =============================================================================

test("HT-NR-06D: repository migration count is at least 78 (80 at Wave C)", () => {
  const migrationsDir = path.join(repoRoot, "supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  assert.ok(
    migrationFiles.length >= 78,
    `Expected at least 78 migrations in supabase/migrations, found ${migrationFiles.length}`
  );
  assert.ok(
    migrationFiles.includes(
      "20261017050000_ht_nr06d_whatsapp_distribution_foundation.sql"
    ),
    "Expected migration 20261017050000_ht_nr06d_whatsapp_distribution_foundation.sql to be present"
  );
});

test("HT-NR-06D: Migration 78 declares broadcast and dispatch tables with single-dispatch constraints", () => {
  const sql = readRepo(
    "supabase/migrations/20261017050000_ht_nr06d_whatsapp_distribution_foundation.sql"
  );

  // Tables
  assert.ok(sql.includes("create table if not exists public.newsroom_whatsapp_broadcasts"));
  assert.ok(sql.includes("create table if not exists public.newsroom_whatsapp_dispatches"));
  assert.ok(sql.includes("create table if not exists public.newsroom_whatsapp_dispatch_messages"));

  // Single-dispatch database constraint
  assert.ok(sql.includes("constraint uq_newsroom_whatsapp_dispatches_broadcast_id unique (broadcast_id)"));
  assert.ok(sql.includes("idx_newsroom_whatsapp_dispatches_idempotency"));

  // Privacy invariant: zero phone number columns
  assert.ok(!sql.includes("phone_number text"));
  assert.ok(!sql.includes("recipient_phone text"));
  assert.ok(sql.includes("recipient_identity_hash text not null"));

  // RLS and privilege revoking
  assert.ok(sql.includes("revoke all on public.newsroom_whatsapp_broadcasts from public, anon, authenticated;"));
  assert.ok(sql.includes("revoke all on public.newsroom_whatsapp_dispatches from public, anon, authenticated;"));
  assert.ok(sql.includes("revoke all on public.newsroom_whatsapp_dispatch_messages from public, anon, authenticated;"));

  // RPC grants
  assert.ok(sql.includes("grant execute on function public.newsroom_prepare_whatsapp_dispatch(uuid, text, uuid) to service_role;"));
  assert.ok(sql.includes("grant execute on function public.newsroom_record_whatsapp_dispatch_result(uuid, text, text, integer, integer, integer, text, text, jsonb, jsonb) to service_role;"));
});

// =============================================================================
// 4. SERVICE LAYER MAPPERS & CONTRACTS
// =============================================================================

const serviceModule = loadTs("src/services/newsroom-whatsapp.ts", {
  mocks: {
    "../platform/supabase": {
      getStagingSupabaseClient: () => ({
        from: () => ({}),
        rpc: () => Promise.resolve({ data: null, error: null })
      })
    }
  }
});
const {
  mapNewsroomWhatsAppBroadcastRow,
  mapNewsroomWhatsAppDispatchRow,
  mapNewsroomWhatsAppDispatchResult,
  createNewsroomWhatsAppService
} = serviceModule;

test("HT-NR-06D: mapNewsroomWhatsAppBroadcastRow correctly parses valid row and rejects malformed rows", () => {
  const validRow = {
    id: "ba000000-0000-4000-a000-000000000001",
    title: "Health Ministry Alert",
    body: "Official update regarding public clinic service hours.",
    broadcast_type: "breaking_alert",
    channel_identity: "healthtimes-whatsapp-channel",
    related_story_id: null,
    status: "approved",
    created_by: "u1000000-0000-4000-a000-000000000001",
    approved_by: "u2000000-0000-4000-a000-000000000002",
    approved_at: "2026-10-16T12:00:00.000Z",
    created_at: "2026-10-16T11:00:00.000Z",
    updated_at: "2026-10-16T12:00:00.000Z",
    dispatch: {
      id: "d1000000-0000-4000-a000-000000000001",
      broadcast_id: "ba000000-0000-4000-a000-000000000001",
      transport_status: "provider-accepted",
      provider: "whatsapp_cloud_api",
      recipient_count: 500,
      accepted_count: 498,
      rejected_count: 2,
      delivered_count: 450,
      read_count: 380,
      dispatched_at: "2026-10-16T12:05:00.000Z"
    }
  };

  const parsed = mapNewsroomWhatsAppBroadcastRow(validRow);
  assert.ok(parsed);
  assert.equal(parsed.id, validRow.id);
  assert.equal(parsed.title, validRow.title);
  assert.equal(parsed.status, "approved");
  assert.ok(parsed.dispatch);
  assert.equal(parsed.dispatch.recipientCount, 500);
  assert.equal(parsed.dispatch.deliveredCount, 450);

  // Missing or non-UUID id
  assert.equal(mapNewsroomWhatsAppBroadcastRow({ ...validRow, id: "invalid" }), null);

  // Invalid broadcast type
  assert.equal(mapNewsroomWhatsAppBroadcastRow({ ...validRow, broadcast_type: "invalid_type" }), null);

  // Invalid status
  assert.equal(mapNewsroomWhatsAppBroadcastRow({ ...validRow, status: "pending" }), null);

  // Non-object
  assert.equal(mapNewsroomWhatsAppBroadcastRow(null), null);
  assert.equal(mapNewsroomWhatsAppBroadcastRow([]), null);
});

test("HT-NR-06D: mapNewsroomWhatsAppDispatchResult maps aggregate transport counts correctly", () => {
  const result = mapNewsroomWhatsAppDispatchResult({
    dispatch_id: "d1000000-0000-4000-a000-000000000001",
    broadcast_id: "ba000000-0000-4000-a000-000000000001",
    transport_status: "provider-accepted",
    recipient_count: 1000,
    accepted_count: 995,
    rejected_count: 5,
    delivered_count: 0,
    read_count: 0,
    dispatched_at: "2026-10-16T14:00:00.000Z"
  });

  assert.ok(result);
  assert.equal(result.dispatch_id, "d1000000-0000-4000-a000-000000000001");
  assert.equal(result.transport_status, "provider-accepted");
  assert.equal(result.recipient_count, 1000);
  assert.equal(result.accepted_count, 995);
  assert.equal(result.rejected_count, 5);

  // Malformed result
  assert.equal(mapNewsroomWhatsAppDispatchResult({}), null);
});

// =============================================================================
// 5. EDGE FUNCTION DISPATCH EXECUTION & IDEMPOTENCY
// =============================================================================

test("HT-NR-06D: newsroom-whatsapp-dispatch edge function enforces method, auth and capability", async () => {
  // OPTIONS returns CORS
  const optionsRes = await handleWhatsAppDispatchRequest(
    new Request("https://edge.supabase.com/functions/v1/newsroom-whatsapp-dispatch", {
      method: "OPTIONS"
    })
  );
  assert.equal(optionsRes.status, 200);

  // GET rejected
  const getRes = await handleWhatsAppDispatchRequest(
    new Request("https://edge.supabase.com/functions/v1/newsroom-whatsapp-dispatch", {
      method: "GET"
    })
  );
  assert.equal(getRes.status, 405);

  // Missing Authorization header
  const noAuthRes = await handleWhatsAppDispatchRequest(
    new Request("https://edge.supabase.com/functions/v1/newsroom-whatsapp-dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcast_id: "ba000000-0000-4000-a000-000000000001" })
    })
  );
  assert.equal(noAuthRes.status, 401);

  // Mock userClient without story.publish capability
  const userClientNoCap = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "u1000000-0000-4000-a000-000000000001" } },
        error: null
      })
    },
    rpc: async (name, params) => {
      if (name === "newsroom_has_capability") {
        return { data: false, error: null }; // Lacks story.publish
      }
      return { data: null, error: null };
    }
  };

  const forbiddenRes = await handleWhatsAppDispatchRequest(
    new Request("https://edge.supabase.com/functions/v1/newsroom-whatsapp-dispatch", {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ broadcast_id: "ba000000-0000-4000-a000-000000000001" })
    }),
    {
      supabaseUrl: "https://mock.supabase.co",
      serviceRoleKey: "mock-service-role",
      userClient: userClientNoCap
    }
  );
  assert.equal(forbiddenRes.status, 403);
  const forbiddenBody = await forbiddenRes.json();
  assert.ok(forbiddenBody.error.includes("story.publish capability required"));
});

test("HT-NR-06D: newsroom-whatsapp-dispatch unconfigured provider fallback records ledger", async () => {
  const broadcastId = "ba000000-0000-4000-a000-000000000001";
  const dispatchId = "d1000000-0000-4000-a000-000000000001";

  const userClientAuthorized = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "u1000000-0000-4000-a000-000000000001" } },
        error: null
      })
    },
    rpc: async (name) => {
      if (name === "newsroom_has_capability") {
        return { data: true, error: null };
      }
      return { data: null, error: null };
    }
  };

  let recordedParams = null;
  const adminClientMock = {
    rpc: async (name, params) => {
      if (name === "newsroom_prepare_whatsapp_dispatch") {
        return {
          data: {
            is_duplicate: false,
            dispatch_id: dispatchId,
            status: "submitted",
            broadcast: {
              id: broadcastId,
              title: "Cholera Advisory",
              body: "Water treatment guidance for Harare.",
              broadcast_type: "breaking_alert",
              channel_identity: "healthtimes-whatsapp-channel"
            }
          },
          error: null
        };
      }
      if (name === "newsroom_record_whatsapp_dispatch_result") {
        recordedParams = params;
        return { data: { dispatch_id: dispatchId, transport_status: params.p_transport_status }, error: null };
      }
      return { data: null, error: null };
    }
  };

  const res = await handleWhatsAppDispatchRequest(
    new Request("https://edge.supabase.com/functions/v1/newsroom-whatsapp-dispatch", {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ broadcast_id: broadcastId })
    }),
    {
      supabaseUrl: "https://mock.supabase.co",
      serviceRoleKey: "mock-service-role",
      userClient: userClientAuthorized,
      adminClient: adminClientMock
      // whatsappApiToken & whatsappPhoneNumberId omitted -> unconfigured
    }
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.status, "unconfigured");
  assert.equal(body.transport_status, "unconfigured");
  assert.equal(body.recipient_count, 0);
  assert.ok(recordedParams);
  assert.equal(recordedParams.p_transport_status, "unconfigured");
  assert.equal(recordedParams.p_status, "sent");
});

test("HT-NR-06D: newsroom-whatsapp-dispatch single-dispatch idempotency replays existing dispatch", async () => {
  const broadcastId = "ba000000-0000-4000-a000-000000000001";
  const dispatchId = "d1000000-0000-4000-a000-000000000001";

  const userClientAuthorized = {
    auth: {
      getUser: async () => ({
        data: { user: { id: "u1000000-0000-4000-a000-000000000001" } },
        error: null
      })
    },
    rpc: async () => ({ data: true, error: null })
  };

  const adminClientDuplicateMock = {
    rpc: async (name, params) => {
      if (name === "newsroom_prepare_whatsapp_dispatch") {
        return {
          data: {
            is_duplicate: true,
            dispatch_id: dispatchId,
            status: "provider-accepted"
          },
          error: null
        };
      }
      if (name === "newsroom_get_whatsapp_broadcast_dispatch") {
        return {
          data: {
            id: dispatchId,
            broadcast_id: broadcastId,
            transport_status: "provider-accepted",
            recipient_count: 5400,
            accepted_count: 5400,
            rejected_count: 0,
            delivered_count: 5000,
            read_count: 4200,
            failure_reason: null,
            dispatched_at: "2026-10-16T10:00:00.000Z"
          },
          error: null
        };
      }
      return { data: null, error: null };
    }
  };

  const res = await handleWhatsAppDispatchRequest(
    new Request("https://edge.supabase.com/functions/v1/newsroom-whatsapp-dispatch", {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ broadcast_id: broadcastId })
    }),
    {
      supabaseUrl: "https://mock.supabase.co",
      serviceRoleKey: "mock-service-role",
      userClient: userClientAuthorized,
      adminClient: adminClientDuplicateMock
    }
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.is_duplicate, true);
  assert.equal(body.transport_status, "provider-accepted");
  assert.equal(body.recipient_count, 5400);
});

// =============================================================================
// 6. PRIVACY & SANITIZED CLIENT ENVELOPE (ZERO RECIPIENT PHONE LEAKAGE)
// =============================================================================

test("HT-NR-06D: client responses never contain phone numbers or user identities", () => {
  const serviceCode = read("src/services/newsroom-whatsapp.ts");
  assert.ok(!serviceCode.includes("phone_number"));
  assert.ok(!serviceCode.includes("recipient_phone"));
  assert.ok(!serviceCode.includes("msisdn"));

  const uiCode = read("src/ui/StudioWhatsAppDesk.tsx");
  assert.ok(!uiCode.includes("phone_number"));
  assert.ok(!uiCode.includes("recipient_phone"));
});
