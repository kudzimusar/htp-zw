// Roles belong to the whole Postgres cluster, and node --test runs the database suites
// in parallel against one server. This reproduces the interleaving that failed in CI:
// one bootstrap has created a role but not yet committed when a second one starts.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import test from "node:test";
import { BASE, PSQL, clusterRolesSql, ensureClusterRoles } from "./support/canonical-schema.mjs";

const probe = `ht_role_race_probe_${process.pid}`;
const admin = (input) => execFileSync(PSQL, [`${BASE}/postgres`, "-At", "-q", "-v", "ON_ERROR_STOP=1"], {
  encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"]
}).trim();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test.after(() => admin(`DROP ROLE IF EXISTS ${probe};`));

test("a role bootstrap that overlaps an uncommitted one waits for it instead of failing", async () => {
  admin(`DROP ROLE IF EXISTS ${probe};`);
  const holder = spawn(PSQL, [`${BASE}/postgres?application_name=${probe}`, "-q", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "ignore", "pipe"] });
  let holderError = "";
  holder.stderr.on("data", (chunk) => { holderError += chunk; });
  const holderExit = new Promise((resolve) => holder.on("exit", resolve));
  holder.stdin.end(`BEGIN;\n${clusterRolesSql([probe])}\nSELECT pg_sleep(2);\nCOMMIT;\n`);

  let holding = false;
  for (let attempt = 0; attempt < 100 && !holding; attempt += 1) {
    holding = admin(`SELECT count(*) FROM pg_stat_activity WHERE application_name = '${probe}' AND wait_event = 'PgSleep';`) === "1";
    if (!holding) await pause(50);
  }
  assert.ok(holding, "the first bootstrap has created the role and is holding its transaction open");

  assert.doesNotThrow(() => ensureClusterRoles([probe]));
  assert.equal(await holderExit, 0, holderError);
  assert.equal(admin(`SELECT count(*) FROM pg_roles WHERE rolname = '${probe}';`), "1");
});

test("role names that are not plain identifiers are refused", () => {
  assert.throws(() => clusterRolesSql(["anon; DROP ROLE postgres"]), /unsafe role name/);
});
