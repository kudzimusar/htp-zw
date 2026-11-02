/**
 * Fail-Closed Assertion Engine
 * HealthTimes 2.0 MVP Certification Harness
 * 
 * Prevents false-positive suite exits by reconciling all entries in `results.checks`
 * against `results.failures`. If any check has `pass === false` or any required
 * sub-property has failed, it guarantees the suite records failures and exits non-zero.
 */

export function reconcileFailClosedChecks(results) {
  if (!results.failures) {
    results.failures = [];
  }
  if (!results.checks) {
    return {
      success: results.failures.length === 0,
      failureCount: results.failures.length,
      failures: results.failures
    };
  }

  for (const [checkKey, checkVal] of Object.entries(results.checks)) {
    if (checkVal && typeof checkVal === 'object') {
      if (checkVal.pass === false) {
        const alreadyReported = results.failures.some(
          f => f.check === checkKey || (f.check && f.check.startsWith(checkKey))
        );
        if (!alreadyReported) {
          results.failures.push({
            check: checkKey,
            error: `Fail-Closed Reconciler: check "${checkKey}" marked pass: false`
          });
        }
      }

      // Check critical sub-properties
      if (checkVal.draftCreatedSuccess === false) {
        const alreadyReported = results.failures.some(
          f => f.check === `${checkKey}_DraftCreatedSuccess`
        );
        if (!alreadyReported) {
          results.failures.push({
            check: `${checkKey}_DraftCreatedSuccess`,
            error: `Fail-Closed Reconciler: sub-check "${checkKey}.draftCreatedSuccess" is false`
          });
        }
      }

      if (checkVal.dbRowValid === false) {
        const alreadyReported = results.failures.some(
          f => f.check === `${checkKey}_DB_Persistence`
        );
        if (!alreadyReported) {
          results.failures.push({
            check: `${checkKey}_DB_Persistence`,
            error: `Fail-Closed Reconciler: sub-check "${checkKey}.dbRowValid" is false`
          });
        }
      }
    }
  }

  return {
    success: results.failures.length === 0,
    failureCount: results.failures.length,
    failures: results.failures
  };
}

export function enforceFailClosedExit(results) {
  const reconciliation = reconcileFailClosedChecks(results);
  if (!reconciliation.success || results.failures.length > 0) {
    console.error(`\n[FAIL-CLOSED ENFORCEMENT] Suite failed with ${results.failures.length} failure(s):`);
    for (const f of results.failures) {
      console.error(`  - [${f.check}]: ${f.error}`);
    }
    return 1;
  }
  console.log('\n[FAIL-CLOSED ENFORCEMENT] All checks verified cleanly.');
  return 0;
}
