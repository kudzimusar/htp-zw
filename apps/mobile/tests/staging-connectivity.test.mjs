import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const eas = JSON.parse(readFileSync(join(root, "eas.json"), "utf8"));
const env = eas.build?.staging?.env ?? {};
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test("staging Expo public config exposes deterministic runtime Supabase public config", async () => {
  const { execFileSync } = await import("node:child_process");
  const raw = execFileSync("npx", ["expo", "config", "--type", "public", "--json"], {
    cwd: root,
    env: {
      ...process.env,
      APP_ENV: "staging",
      EXPO_PUBLIC_HEALTHTIMES_SERVICE_MODE: "staging",
      EXPO_PUBLIC_SUPABASE_URL: url,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key
    },
    encoding: "utf8"
  });
  const parsed = JSON.parse(raw);
  assert.equal(parsed.extra?.environment, "staging");
  assert.equal(parsed.extra?.stagingSupabaseUrl, "https://bzuvntbkevvuhfhqhkua.supabase.co");
  assert.equal(typeof parsed.extra?.stagingSupabasePublishableKey, "string");
  assert.equal(parsed.extra.stagingSupabasePublishableKey.startsWith("sb_publishable_"), true);
});

assert.equal(typeof url, "string");
assert.equal(typeof key, "string");
assert.match(url, /^https:\/\/bzuvntbkevvuhfhqhkua\.supabase\.co$/);
assert.match(key, /^sb_publishable_/);
assert.doesNotMatch(key, /service_role/i);

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`
};

test("HealthTimes Staging Auth endpoint is reachable", async () => {
  const response = await fetch(`${url}/auth/v1/settings`, { headers });
  assert.equal(response.ok, true, `Auth settings returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(typeof body, "object");
});

test("HealthTimes Staging PostgREST keeps direct story rows private and exposes the minimized public projection", async () => {
  const direct = await fetch(`${url}/rest/v1/stories?select=id&limit=1`, { headers });
  assert.equal(
    [401, 403].includes(direct.status),
    true,
    `Direct anonymous stories access should fail closed, received HTTP ${direct.status}`
  );

  const projection = await fetch(`${url}/rest/v1/rpc/newsroom_public_published_stories`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_slug: null })
  });
  assert.equal(projection.ok, true, `Public story projection returned HTTP ${projection.status}`);
  const body = await projection.json();
  assert.equal(Array.isArray(body), true);
  if (body.length > 0) {
    assert.equal(typeof body[0]?.id, "string", "Public projection items should contain a story id");
  }
});

test("HealthTimes Staging public migrated-media bucket is reachable after AG-04 migration progress", async () => {
  const response = await fetch(`${url}/storage/v1/object/list/migrated-media`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefix: "", limit: 1, offset: 0, sortBy: { column: "name", order: "asc" } })
  });
  assert.equal(response.ok, true, `Storage list returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(Array.isArray(body), true);
  assert.equal(body.length <= 1, true, "Bounded Storage probe must return at most the requested object count");
  if (body.length === 1) {
    assert.equal(typeof body[0]?.name, "string", "Migrated media list result should expose an object name");
  }
});

test("HealthTimes Staging PostgREST denies anonymous direct table access and RPC execution on push distribution endpoints (HT-NR-06C-A-R1)", async () => {
  // Direct table access must fail closed
  const devicesTable = await fetch(`${url}/rest/v1/reader_push_devices?select=*`, { headers });
  assert.equal(
    [401, 403, 404].includes(devicesTable.status),
    true,
    `Direct anonymous reader_push_devices access must fail closed, received HTTP ${devicesTable.status}`
  );

  const alertsTable = await fetch(`${url}/rest/v1/newsroom_push_alerts?select=*`, { headers });
  assert.equal(
    [401, 403, 404].includes(alertsTable.status),
    true,
    `Direct anonymous newsroom_push_alerts access must fail closed, received HTTP ${alertsTable.status}`
  );

  // All push RPCs must fail closed for anonymous / public callers
  const pushRpcs = [
    "reader_register_push_device",
    "reader_revoke_push_device",
    "newsroom_list_push_alerts",
    "newsroom_create_push_alert",
    "newsroom_save_push_alert",
    "newsroom_approve_push_alert",
    "newsroom_prepare_push_alert",
    "newsroom_get_push_alert_dispatch",
    "newsroom_prepare_dispatch_recipients",
    "newsroom_record_dispatch_result"
  ];

  for (const rpc of pushRpcs) {
    const res = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    assert.equal(
      [401, 403, 404].includes(res.status),
      true,
      `Anonymous RPC execution on ${rpc} must fail closed, received HTTP ${res.status}`
    );
  }
});

test("HealthTimes Staging PostgREST denies anonymous direct table access on push dispatch tables and verifies edge function JWT protection (HT-NR-06C-B)", async () => {
  // Direct table access on dispatch tables must fail closed
  const dispatchesTable = await fetch(`${url}/rest/v1/newsroom_push_dispatches?select=*`, { headers });
  assert.equal(
    [401, 403, 404].includes(dispatchesTable.status),
    true,
    `Direct anonymous newsroom_push_dispatches access must fail closed, received HTTP ${dispatchesTable.status}`
  );

  const ticketsTable = await fetch(`${url}/rest/v1/newsroom_push_dispatch_tickets?select=*`, { headers });
  assert.equal(
    [401, 403, 404].includes(ticketsTable.status),
    true,
    `Direct anonymous newsroom_push_dispatch_tickets access must fail closed, received HTTP ${ticketsTable.status}`
  );

  // Edge Function verify_jwt must reject unauthenticated requests with 401
  const edgeRes = await fetch(`${url}/functions/v1/newsroom-push-dispatch`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ alert_id: "00000000-0000-0000-0000-000000000000" })
  });
  assert.equal(
    edgeRes.status,
    401,
    `newsroom-push-dispatch Edge Function must require JWT and return 401 unauthenticated, received HTTP ${edgeRes.status}`
  );
});

