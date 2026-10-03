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

assert.equal(typeof url, "string");
assert.equal(typeof key, "string");
assert.match(url, /^https:\/\/gcdohgbmqhqwydgaxrcr\.supabase\.co$/);
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
  assert.equal(body.length > 0, true, "Current staging should expose canonical published public stories only through the bounded projection");
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
