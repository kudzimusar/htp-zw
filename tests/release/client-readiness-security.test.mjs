import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const REVOKED_BYPASS_SHA256_PREFIX = "00317e8682e5";
const ROTATED_BYPASS_SHA256_PREFIX = "0fb0100c3825";

function sha256Prefix(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

test("SECURITY: Tracked repository files contain zero exposed or rotated Vercel bypass tokens or service-role secrets", () => {
  const trackedOutput = execFileSync("git", ["ls-files"], { encoding: "utf8" });
  const files = trackedOutput
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && fs.existsSync(f));

  const tokenRegex = /\b[A-Za-z0-9]{32}\b/g;
  const hardcodedBypassAssignRegex =
    /\bVERCEL_BYPASS_TOKEN\s*=\s*["'][A-Za-z0-9_\-]{16,}["']/;

  for (const file of files) {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;
    const content = fs.readFileSync(file, "utf8");

    assert.equal(
      hardcodedBypassAssignRegex.test(content),
      false,
      `Hardcoded VERCEL_BYPASS_TOKEN assignment found in ${file}`
    );

    const matches = content.match(tokenRegex) || [];
    for (const candidate of matches) {
      const prefix = sha256Prefix(candidate);
      assert.notEqual(
        prefix,
        REVOKED_BYPASS_SHA256_PREFIX,
        `Revoked Vercel bypass secret (fingerprint ${REVOKED_BYPASS_SHA256_PREFIX}) detected in ${file}`
      );
      assert.notEqual(
        prefix,
        ROTATED_BYPASS_SHA256_PREFIX,
        `Rotated Vercel bypass secret (fingerprint ${ROTATED_BYPASS_SHA256_PREFIX}) detected in ${file}`
      );
    }
  }
});

test("DEMONSTRATION_HARNESS: owner-acceptance-demonstration.mjs enforces fail-closed exit, real RBAC capability checks, and try/finally session revocation", () => {
  const scriptPath = path.resolve(
    "scripts/release/owner-acceptance-demonstration.mjs"
  );
  const src = fs.readFileSync(scriptPath, "utf8");

  assert.equal(
    /VERCEL_BYPASS_TOKEN\s*=\s*["']/.test(src),
    false,
    "owner-acceptance-demonstration.mjs must not hardcode VERCEL_BYPASS_TOKEN"
  );
  assert.match(src, /newsroom_revoke_session/);
  assert.match(src, /auth\.signOut\(\{\s*scope:\s*["']global["']\s*\}\)/);
  assert.match(src, /finally\s*\{/);
  assert.match(src, /capability required/);
  assert.match(src, /process\.exit\(1\)/);
});

test("DOCUMENTATION_TRUTH: Client Handoff Pack and Owner UAT Pack preserve 7-column evidence separation and unsigned Owner certificates", () => {
  const handoffPath = path.resolve(
    "docs/delivery/HT-MVP-CLIENT-HANDOFF-PACK.md"
  );
  const ownerUatPath = path.resolve("docs/delivery/HT-MVP-OWNER-UAT.md");

  const handoff = fs.readFileSync(handoffPath, "utf8");
  const ownerUat = fs.readFileSync(ownerUatPath, "utf8");

  // 7-column capability matrix headers
  assert.match(handoff, /1\. Source Implemented/);
  assert.match(handoff, /2\. Automated Tests Passed/);
  assert.match(handoff, /3\. API \/ RPC Verification Completed/);
  assert.match(handoff, /4\. Physical Interactive Browser UAT Completed/);
  assert.match(handoff, /5\. Human Owner UAT Completed/);
  assert.match(handoff, /6\. Environment Ready/);
  assert.match(handoff, /7\. Production \/ Commercial Activation Authorized/);

  // Reconciled Owner & Financial truth
  assert.match(handoff, /OWNER_ACCOUNT_EXISTS=YES/);
  assert.match(handoff, /OWNER_PUBLISHER_ROLE_ACTIVE=YES/);
  assert.match(handoff, /OWNER_PHYSICAL_UAT_COMPLETED=NO/);
  assert.match(handoff, /OWNER_CLIENT_ACCEPTANCE_SIGNED=NO/);
  assert.match(handoff, /POSTED_JOURNAL_DEBITS_USD = \$22,400\.00/);
  assert.match(handoff, /POSTED_AND_REVERSED_DEBITS_USD = \$31,300\.00/);

  // Unsigned certificate checks
  assert.equal(
    handoff.includes("(X) ACCEPTED"),
    false,
    "Client acceptance certificate must not have a pre-selected (X) disposition"
  );
  assert.equal(
    /\[x\]/i.test(handoff),
    false,
    "Client handoff pack certificate checklist must not have pre-checked [x] boxes"
  );
  assert.equal(
    /\[x\]/i.test(ownerUat),
    false,
    "Owner UAT checklist must not have pre-checked [x] boxes for Human Owner UAT"
  );
  assert.equal(
    ownerUat.includes("Signed by Human Owner: Kudzai Musarurwa"),
    false,
    "Owner UAT sign-off block must not contain a pre-populated Owner signature"
  );
});
