// HT-NR-05C Live Staging Read-Only Contract (separated from offline G5 CI under N5).
// Explicitly rejects HTTP 402 (staging egress restriction) so a quota block can
// never satisfy an anonymous-authorization denial check for the wrong reason.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

export function classifyAnonymousRpcDenial(status, bodyText = "") {
  if (status === 402) {
    return {
      ok: false,
      classification: "BLOCKED_STAGING_402",
      reason: "Staging returned HTTP 402 (quota restricted); 402 does not prove anonymous RPC authorization denial."
    };
  }
  if (status === 401 || status === 403) {
    return { ok: true, classification: "AUTH_DENIED" };
  }
  if (status === 400 && /permission denied|unauthorized|session|42501|P0001/i.test(bodyText)) {
    return { ok: true, classification: "RPC_PERMISSION_DENIED" };
  }
  return {
    ok: false,
    classification: "UNEXPECTED_STATUS_" + status,
    reason: `Expected 401/403 or explicit permission denial, received HTTP ${status}.`
  };
}

test("HT-NR-05C Staging Read-Only: newsroom_list_videos RPC fails closed with genuine auth denial (never 402)", async () => {
  const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
  const stagingEnv = eas.build?.staging?.env ?? {};
  const supabaseUrl = stagingEnv.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = stagingEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  assert.ok(supabaseUrl, "Staging Supabase URL must be configured in eas.json");
  assert.ok(anonKey, "Staging Supabase key must be configured in eas.json");

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/newsroom_list_videos`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_status: null, p_search: null, p_limit: 10 })
  });

  const bodyText = await response.text();
  const verdict = classifyAnonymousRpcDenial(response.status, bodyText);
  assert.equal(
    verdict.ok,
    true,
    `newsroom_list_videos anonymous check failed [${verdict.classification}]: ${verdict.reason || bodyText}`
  );
});
