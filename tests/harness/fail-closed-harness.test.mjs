import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileFailClosedChecks,
  enforceFailClosedExit,
  REQUIRED_CHECKS_CONTRACT
} from '../../scripts/harness/fail-closed-engine.mjs';
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
        scheduleDisabled: true,
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

test('HARNESS: Missing required check fails contract enforcement with exit code 1', () => {
  const incompleteResults = {
    timestamp: new Date().toISOString(),
    failures: [],
    enforceContract: true,
    checks: {
      buildInfo: { status: 200, sha: '2a11409e4edbfbc1c90081ee9c07101d2b0da49e', pass: true },
      DEF001: { slugStatus: 200, slugMatch: true, pass: true },
      DEF013: { premiumDarkHeadingPass: true, premiumDarkBodyPass: true, pass: true },
      DEF002: { hasSavedItem: true, hasOfflineItem: true, fullBodyRendered: true, reloadSurvives: true, pass: true },
      // DEF008 missing!
      DEF009: { detailsOpened: true, pass: true },
      discoveryAndSecurity: {
        searchDuration: 1800,
        foundRank51Story: true,
        foundPublicStory: true,
        negativeSearchPass: true,
        searchNavPass: true,
        rpcStatus: 200,
        premiumBodyLeaks: 0,
        draftExposure: 0,
        futureExposure: 0,
        pass: true
      },
      DEF014: { telemetryRecorded: true, targetPassed: true, pass: true }
    }
  };

  const outcome = reconcileFailClosedChecks(incompleteResults);
  assert.equal(outcome.success, false, 'Missing check DEF008 must fail contract enforcement');
  assert.ok(
    incompleteResults.failures.some(f => f.check === 'DEF008'),
    'Failures array must identify missing DEF008'
  );

  const exitCode = enforceFailClosedExit(incompleteResults);
  assert.equal(exitCode, 1, 'enforceFailClosedExit must return 1 when required check is missing');
});

test('HARNESS: Undefined or non-boolean pass property fails suite', () => {
  const undefinedPassResults = {
    timestamp: new Date().toISOString(),
    failures: [],
    checks: {
      DEF001: { slugStatus: 200, slugMatch: true /* pass omitted */ }
    }
  };

  const outcome = reconcileFailClosedChecks(undefinedPassResults);
  assert.equal(outcome.success, false, 'Check with undefined pass must fail');
  assert.ok(
    undefinedPassResults.failures.some(f => f.check === 'DEF001'),
    'Failures array must contain DEF001 failure'
  );

  const exitCode = enforceFailClosedExit(undefinedPassResults);
  assert.equal(exitCode, 1, 'Must exit with 1 on undefined pass');
});

test('HARNESS: Mandatory security sub-checks fail closed on violation', () => {
  // Test A: futureExposure > 0
  const futureViolation = {
    failures: [],
    checks: {
      discoveryAndSecurity: {
        searchDuration: 1500,
        foundRank51Story: true,
        foundPublicStory: true,
        negativeSearchPass: true,
        searchNavPass: true,
        rpcStatus: 200,
        premiumBodyLeaks: 0,
        draftExposure: 0,
        futureExposure: 1, // VIOLATION
        pass: false
      }
    }
  };
  const futureOutcome = reconcileFailClosedChecks(futureViolation);
  assert.equal(futureOutcome.success, false);
  assert.ok(futureViolation.failures.some(f => f.check === 'discoveryAndSecurity_ZeroFutureExposure'));

  // Test B: premiumBodyLeaks > 0
  const leakViolation = {
    failures: [],
    checks: {
      discoveryAndSecurity: {
        searchDuration: 1500,
        foundRank51Story: true,
        foundPublicStory: true,
        negativeSearchPass: true,
        searchNavPass: true,
        rpcStatus: 200,
        premiumBodyLeaks: 2, // VIOLATION
        draftExposure: 0,
        futureExposure: 0,
        pass: false
      }
    }
  };
  const leakOutcome = reconcileFailClosedChecks(leakViolation);
  assert.equal(leakOutcome.success, false);
  assert.ok(leakViolation.failures.some(f => f.check === 'discoveryAndSecurity_ZeroPremiumLeaks'));

  // Test C: draftExposure > 0
  const draftViolation = {
    failures: [],
    checks: {
      discoveryAndSecurity: {
        searchDuration: 1500,
        foundRank51Story: true,
        foundPublicStory: true,
        negativeSearchPass: true,
        searchNavPass: true,
        rpcStatus: 200,
        premiumBodyLeaks: 0,
        draftExposure: 1, // VIOLATION
        futureExposure: 0,
        pass: false
      }
    }
  };
  const draftOutcome = reconcileFailClosedChecks(draftViolation);
  assert.equal(draftOutcome.success, false);
  assert.ok(draftViolation.failures.some(f => f.check === 'discoveryAndSecurity_ZeroDraftExposure'));
});

test('HARNESS: Search latency boundary enforcement (<= 2500ms)', () => {
  // 2501ms boundary violation
  const failingLatency = {
    failures: [],
    checks: {
      discoveryAndSecurity: {
        searchDuration: 2501, // 1ms over target
        pass: false
      }
    }
  };
  const failOutcome = reconcileFailClosedChecks(failingLatency);
  assert.equal(failOutcome.success, false);
  assert.ok(failingLatency.failures.some(f => f.check === 'discoveryAndSecurity_SearchLatency'));

  // 2500ms exact target boundary pass
  const passingLatency = {
    failures: [],
    checks: {
      discoveryAndSecurity: {
        searchDuration: 2500, // exactly at threshold
        pass: true
      }
    }
  };
  const passOutcome = reconcileFailClosedChecks(passingLatency);
  assert.equal(passOutcome.success, true);
  assert.equal(passingLatency.failures.length, 0);
});

test('HARNESS: Role authorization & schedule input sub-check enforcement', () => {
  // Commercial user not blocked
  const rbacViolation = {
    failures: [],
    checks: {
      DEF008: {
        commercialBlocked: false, // VIOLATION
        pass: false
      }
    }
  };
  const rbacOutcome = reconcileFailClosedChecks(rbacViolation);
  assert.equal(rbacOutcome.success, false);
  assert.ok(rbacViolation.failures.some(f => f.check === 'DEF008_CommercialBlocked'));

  // Schedule date input not disabled
  const scheduleViolation = {
    failures: [],
    checks: {
      DEF008: {
        scheduleDisabled: false, // VIOLATION
        pass: false
      }
    }
  };
  const scheduleOutcome = reconcileFailClosedChecks(scheduleViolation);
  assert.equal(scheduleOutcome.success, false);
  assert.ok(scheduleViolation.failures.some(f => f.check === 'DEF008_ScheduleDisabled'));
});

test('HARNESS: Clean results adhering to contract report success and exit 0', () => {
  const cleanResults = {
    timestamp: new Date().toISOString(),
    failures: [],
    enforceContract: true,
    checks: {
      buildInfo: {
        status: 200,
        sha: '2a11409e4edbfbc1c90081ee9c07101d2b0da49e',
        pass: true
      },
      DEF001: {
        slugStatus: 200,
        slugMatch: true,
        pass: true
      },
      DEF013: {
        premiumDarkHeadingPass: true,
        premiumDarkBodyPass: true,
        pass: true
      },
      DEF002: {
        hasSavedItem: true,
        hasOfflineItem: true,
        fullBodyRendered: true,
        reloadSurvives: true,
        pass: true
      },
      DEF008: {
        canOpenCreateForm: true,
        noticeVisible: true,
        hasDeferredBadge: true,
        scheduleDisabled: true,
        draftCreatedSuccess: true,
        dbRowValid: true,
        zeroDispatches: true,
        commercialBlocked: true,
        pass: true
      },
      DEF009: {
        detailsOpened: true,
        pass: true
      },
      discoveryAndSecurity: {
        searchDuration: 1850,
        foundRank51Story: true,
        foundPublicStory: true,
        negativeSearchPass: true,
        searchNavPass: true,
        rpcStatus: 200,
        premiumBodyLeaks: 0,
        draftExposure: 0,
        futureExposure: 0,
        pass: true
      },
      DEF014: {
        telemetryRecorded: true,
        targetPassed: true,
        pass: true
      }
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
  const outJsonPath = path.resolve('/tmp/test-fail-closed-output.json');
  const fixtureCode = `
    import { writeAndEnforceResults } from '${path.resolve('scripts/harness/fail-closed-engine.mjs')}';
    const failingData = {
      failures: [],
      checks: {
        DEF008: { pass: false, draftCreatedSuccess: false }
      }
    };
    writeAndEnforceResults(failingData, '${outJsonPath}');
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
  assert.ok(fs.existsSync(outJsonPath), 'Results JSON must be written before process exit');
  const savedData = JSON.parse(fs.readFileSync(outJsonPath, 'utf8'));
  assert.ok(savedData.failures.length >= 1, 'Saved JSON must contain failure details');
  fs.unlinkSync(outJsonPath);
});

test('HARNESS: Child process exits with code 1 on missing required contract check', () => {
  const fixturePath = path.resolve('/tmp/test-missing-contract-fixture.mjs');
  const outJsonPath = path.resolve('/tmp/test-missing-contract-output.json');
  const fixtureCode = `
    import { writeAndEnforceResults } from '${path.resolve('scripts/harness/fail-closed-engine.mjs')}';
    const incompleteData = {
      enforceContract: true,
      failures: [],
      checks: {
        buildInfo: { status: 200, sha: 'test-sha', pass: true }
      }
    };
    writeAndEnforceResults(incompleteData, '${outJsonPath}');
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

  assert.equal(processExitedWithError, true, 'Missing contract check must exit non-zero');
  assert.equal(exitStatus, 1, 'Exit code must be 1');
  assert.ok(fs.existsSync(outJsonPath), 'Results JSON must be saved even on contract failure');
  const savedData = JSON.parse(fs.readFileSync(outJsonPath, 'utf8'));
  assert.ok(savedData.failures.some(f => f.error.includes('Required check')), 'Must record missing contract check');
  fs.unlinkSync(outJsonPath);
});

test('HARNESS: Child process exits with code 1 on malformed check object', () => {
  const fixturePath = path.resolve('/tmp/test-malformed-fixture.mjs');
  const outJsonPath = path.resolve('/tmp/test-malformed-output.json');
  const fixtureCode = `
    import { writeAndEnforceResults } from '${path.resolve('scripts/harness/fail-closed-engine.mjs')}';
    const malformedData = {
      failures: [],
      checks: {
        DEF001: null
      }
    };
    writeAndEnforceResults(malformedData, '${outJsonPath}');
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

  assert.equal(processExitedWithError, true, 'Malformed check must exit non-zero');
  assert.equal(exitStatus, 1, 'Exit code must be 1');
  assert.ok(fs.existsSync(outJsonPath), 'Results JSON must be saved on malformed response');
  fs.unlinkSync(outJsonPath);
});

test('HARNESS: Child process exits with code 1 on teardown session hygiene failure', () => {
  const fixturePath = path.resolve('/tmp/test-teardown-fixture.mjs');
  const outJsonPath = path.resolve('/tmp/test-teardown-output.json');
  const fixtureCode = `
    import { writeAndEnforceResults } from '${path.resolve('scripts/harness/fail-closed-engine.mjs')}';
    const teardownFailureData = {
      failures: [{ check: 'SessionHygieneTeardown', error: 'Unrevoked test session detected post-test' }],
      checks: {
        DEF001: { pass: true }
      }
    };
    writeAndEnforceResults(teardownFailureData, '${outJsonPath}');
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

  assert.equal(processExitedWithError, true, 'Teardown failure must exit non-zero');
  assert.equal(exitStatus, 1, 'Exit code must be 1');
  assert.ok(fs.existsSync(outJsonPath), 'Results JSON must be saved on teardown failure');
  fs.unlinkSync(outJsonPath);
});
