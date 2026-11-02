import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileFailClosedChecks, enforceFailClosedExit } from '../../scripts/harness/fail-closed-engine.mjs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

test('HARNESS: Reconciles discrepancy where checks.DEF008.pass is false and failures list is empty', () => {
  const simulatedR3R1Results = {
    timestamp: new Date().toISOString(),
    failures: [], // Empty failures list as occurred in R3-R1
    checks: {
      DEF001: { pass: true },
      DEF002: { pass: true },
      DEF008: {
        canOpenCreateForm: true,
        noticeVisible: true,
        hasDeferredBadge: true,
        draftCreatedSuccess: false, // UI banner race condition
        dbRowValid: true,
        zeroDispatches: true,
        commercialBlocked: true,
        pass: false // Check marked false
      },
      DEF009: { pass: true }
    }
  };

  const outcome = reconcileFailClosedChecks(simulatedR3R1Results);

  // Assert fail-closed engine caught the discrepancy
  assert.equal(outcome.success, false, 'Suite must not report success when checks.DEF008.pass is false');
  assert.ok(outcome.failureCount >= 1, 'Failure count must be at least 1');
  assert.ok(
    simulatedR3R1Results.failures.some(f => f.check === 'DEF008'),
    'Failures array must contain DEF008 failure'
  );
  assert.ok(
    simulatedR3R1Results.failures.some(f => f.check === 'DEF008_DraftCreatedSuccess'),
    'Failures array must contain DEF008_DraftCreatedSuccess failure'
  );

  const exitCode = enforceFailClosedExit(simulatedR3R1Results);
  assert.equal(exitCode, 1, 'enforceFailClosedExit must return 1 on failed assertions');
});

test('HARNESS: Clean results with all checks passed report success and exit 0', () => {
  const cleanResults = {
    timestamp: new Date().toISOString(),
    failures: [],
    checks: {
      DEF001: { pass: true },
      DEF002: { pass: true },
      DEF008: {
        canOpenCreateForm: true,
        noticeVisible: true,
        hasDeferredBadge: true,
        draftCreatedSuccess: true,
        dbRowValid: true,
        zeroDispatches: true,
        commercialBlocked: true,
        pass: true
      },
      DEF009: { pass: true },
      DEF013: { pass: true },
      DEF014: { pass: true }
    }
  };

  const outcome = reconcileFailClosedChecks(cleanResults);

  assert.equal(outcome.success, true, 'Clean results must report success: true');
  assert.equal(outcome.failureCount, 0, 'Clean results must have 0 failures');
  assert.equal(cleanResults.failures.length, 0, 'Failures array must remain empty');

  const exitCode = enforceFailClosedExit(cleanResults);
  assert.equal(exitCode, 0, 'enforceFailClosedExit must return 0 on all-passed results');
});

test('HARNESS: Negative child-process execution verifies process exits with code 1 on failed assertion', () => {
  const fixturePath = path.resolve('/tmp/test-fail-closed-fixture.mjs');
  const fixtureCode = `
    import { enforceFailClosedExit } from '${path.resolve('scripts/harness/fail-closed-engine.mjs')}';
    const failingData = {
      failures: [],
      checks: {
        DEF008: { pass: false, draftCreatedSuccess: false }
      }
    };
    const code = enforceFailClosedExit(failingData);
    process.exit(code);
  `;
  fs.writeFileSync(fixturePath, fixtureCode, 'utf8');

  let processExitedWithError = false;
  let exitStatus = null;
  try {
    execSync(`node "${fixturePath}"`, { stdio: 'pipe' });
  } catch (err) {
    processExitedWithError = true;
    exitStatus = err.status;
  } finally {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);
  }

  assert.equal(processExitedWithError, true, 'Process must exit with error code');
  assert.equal(exitStatus, 1, 'Exit code must be exactly 1');
});
