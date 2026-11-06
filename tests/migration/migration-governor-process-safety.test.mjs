import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGovernedSqlAdapter } from "../../scripts/release/ht-migration-governor.mjs";

test("G1: governed psql invocation treats a connection URI as an argument, not shell code", () => {
  const temp = mkdtempSync(join(tmpdir(), "ht-governor-psql-"));
  try {
    const fakePsql = join(temp, "fake-psql.mjs");
    const capture = join(temp, "captured-argv.json");
    const unexpected = join(temp, "unexpected-shell-execution");
    // Fake binary is executable but never touches the database. Its only job
    // is to record its argv and return valid JSON for the read-only adapter.
    writeFileSync(
      fakePsql,
      "#!/usr/bin/env node\n" +
      'import { writeFileSync } from "node:fs";\n' +
      "writeFileSync(" + JSON.stringify(capture) + ", JSON.stringify(process.argv.slice(2)));\n" +
      'process.stdout.write("[]\\n");\n',
      { mode: 0o700 }
    );

    // The URI remains parseable by URL but includes a literal command
    // substitution. A shell interpolation would execute touch here.
    const uri = "postgres://tester:nonsecret@127.0.0.1:55432/ht_disposable?application_name=$(touch " + unexpected + ")";
    const adapter = createGovernedSqlAdapter({ pgUri: uri, psqlBin: fakePsql });
    assert.deepEqual(adapter.queryJson("SELECT 1"), []);
    assert.equal(existsSync(unexpected), false, "URI must never reach a command shell");

    const argv = JSON.parse(readFileSync(capture, "utf8"));
    assert.deepEqual(argv, [uri, "-A", "-t", "-v", "ON_ERROR_STOP=1"]);
    assert.equal(adapter.isAttested(), false);
    assert.throws(
      () => adapter.executeSqlAtomic("CREATE TABLE public.never_run (id int);"),
      /CRITICAL_FAIL_CLOSED: Governed SQL execution adapter refused execution: Database identity has not been attested/
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
