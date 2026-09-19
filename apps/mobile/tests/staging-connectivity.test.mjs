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

test("HealthTimes Staging PostgREST is reachable behind RLS", async () => {
  const response = await fetch(`${url}/rest/v1/stories?select=id&limit=1`, { headers });
  assert.equal(response.ok, true, `PostgREST returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(Array.isArray(body), true);
  assert.equal(body.length, 0, "NM-02 expects no publicly readable staging story rows before AG-04/AG-06");
});

test("HealthTimes Staging public migrated-media bucket is reachable", async () => {
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
  assert.equal(body.length, 0, "NM-02 expects the staging media bucket to remain empty before AG-04");
});
