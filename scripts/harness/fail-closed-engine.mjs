import fs from 'node:fs';
import path from 'node:path';

/**
 * Fail-Closed Assertion Engine & Required-Check Contract
 * HealthTimes 2.0 MVP Certification Harness
 * 
 * Prevents false-positive suite exits by reconciling all entries in `results.checks`
 * against `results.failures` and verifying against `REQUIRED_CHECKS_CONTRACT`.
 * If any check has `pass !== true`, any required check is missing, or any mandatory
 * sub-property has failed, it guarantees the suite records failures and exits non-zero.
 */

export const REQUIRED_CHECKS_CONTRACT = {
  buildInfo: {
    requiredProps: ['status', 'sha', 'pass'],
    validator: (c) => c.status === 200 && Boolean(c.sha)
  },
  DEF001: {
    requiredProps: ['slugStatus', 'slugMatch', 'pass'],
    validator: (c) => c.slugStatus === 200 && c.slugMatch === true
  },
  DEF013: {
    requiredProps: ['premiumDarkHeadingPass', 'premiumDarkBodyPass', 'pass'],
    validator: (c) => c.premiumDarkHeadingPass === true && c.premiumDarkBodyPass === true
  },
  DEF002: {
    requiredProps: ['hasSavedItem', 'hasOfflineItem', 'fullBodyRendered', 'reloadSurvives', 'pass'],
    validator: (c) => c.hasSavedItem === true && c.hasOfflineItem === true && c.fullBodyRendered === true && c.reloadSurvives === true
  },
  DEF008: {
    requiredProps: [
      'canOpenCreateForm',
      'noticeVisible',
      'hasDeferredBadge',
      'scheduleDisabled',
      'draftCreatedSuccess',
      'dbRowValid',
      'zeroDispatches',
      'commercialBlocked',
      'pass'
    ],
    validator: (c) =>
      c.canOpenCreateForm === true &&
      c.noticeVisible === true &&
      c.hasDeferredBadge === true &&
      c.scheduleDisabled === true &&
      c.draftCreatedSuccess === true &&
      c.dbRowValid === true &&
      c.zeroDispatches === true &&
      c.commercialBlocked === true
  },
  DEF009: {
    requiredProps: ['detailsOpened', 'pass'],
    validator: (c) => c.detailsOpened === true
  },
  discoveryAndSecurity: {
    requiredProps: [
      'searchDuration',
      'foundRank51Story',
      'foundPublicStory',
      'negativeSearchPass',
      'searchNavPass',
      'rpcStatus',
      'premiumBodyLeaks',
      'draftExposure',
      'futureExposure',
      'pass'
    ],
    validator: (c) =>
      c.searchDuration <= 2500 &&
      c.foundRank51Story === true &&
      c.foundPublicStory === true &&
      c.negativeSearchPass === true &&
      c.searchNavPass === true &&
      c.rpcStatus === 200 &&
      c.premiumBodyLeaks === 0 &&
      c.draftExposure === 0 &&
      c.futureExposure === 0
  },
  DEF014: {
    requiredProps: ['telemetryRecorded', 'targetPassed', 'pass'],
    validator: (c) => c.telemetryRecorded === true && c.targetPassed === true
  }
};

export function reconcileFailClosedChecks(results, options = {}) {
  if (!results.failures) {
    results.failures = [];
  }

  const addFailure = (checkName, errorMsg) => {
    const alreadyReported = results.failures.some(
      f => f.check === checkName
    );
    if (!alreadyReported) {
      results.failures.push({
        check: checkName,
        error: errorMsg
      });
    }
  };

  if (!results.checks || typeof results.checks !== 'object') {
    addFailure('results.checks', 'Fail-Closed Reconciler: results.checks is missing or not an object');
    return {
      success: false,
      failureCount: results.failures.length,
      failures: results.failures
    };
  }

  // 1. Audit every present check in results.checks
  for (const [checkKey, checkVal] of Object.entries(results.checks)) {
    if (!checkVal || typeof checkVal !== 'object') {
      addFailure(checkKey, `Fail-Closed Reconciler: check "${checkKey}" is not an object`);
      continue;
    }

    // Check pass property: must be boolean true (not false, undefined, null, etc.)
    if (checkVal.pass !== true) {
      addFailure(
        checkKey,
        `Fail-Closed Reconciler: check "${checkKey}" marked pass: ${checkVal.pass} (expected true)`
      );
    }

    // Critical sub-properties audits
    if (checkVal.draftCreatedSuccess === false) {
      addFailure(`${checkKey}_DraftCreatedSuccess`, `Fail-Closed Reconciler: sub-check "${checkKey}.draftCreatedSuccess" is false`);
    }

    if (checkVal.dbRowValid === false) {
      addFailure(`${checkKey}_DB_Persistence`, `Fail-Closed Reconciler: sub-check "${checkKey}.dbRowValid" is false`);
    }

    if (checkVal.commercialBlocked === false) {
      addFailure(`${checkKey}_CommercialBlocked`, `Fail-Closed Reconciler: sub-check "${checkKey}.commercialBlocked" is false`);
    }

    if (checkVal.scheduleDisabled === false) {
      addFailure(`${checkKey}_ScheduleDisabled`, `Fail-Closed Reconciler: sub-check "${checkKey}.scheduleDisabled" is false`);
    }

    if (typeof checkVal.futureExposure === 'number' && checkVal.futureExposure > 0) {
      addFailure(`${checkKey}_ZeroFutureExposure`, `Fail-Closed Reconciler: futureExposure is ${checkVal.futureExposure} (expected 0)`);
    }

    if (typeof checkVal.premiumBodyLeaks === 'number' && checkVal.premiumBodyLeaks > 0) {
      addFailure(`${checkKey}_ZeroPremiumLeaks`, `Fail-Closed Reconciler: premiumBodyLeaks is ${checkVal.premiumBodyLeaks} (expected 0)`);
    }

    if (typeof checkVal.draftExposure === 'number' && checkVal.draftExposure > 0) {
      addFailure(`${checkKey}_ZeroDraftExposure`, `Fail-Closed Reconciler: draftExposure is ${checkVal.draftExposure} (expected 0)`);
    }

    if (typeof checkVal.searchDuration === 'number' && checkVal.searchDuration > 2500) {
      addFailure(`${checkKey}_SearchLatency`, `Fail-Closed Reconciler: searchDuration is ${checkVal.searchDuration}ms (exceeds <= 2500ms target)`);
    }

    if (checkVal.negativeSearchPass === false) {
      addFailure(`${checkKey}_NegativeSearch`, `Fail-Closed Reconciler: sub-check "${checkKey}.negativeSearchPass" is false`);
    }

    if (checkVal.searchNavPass === false) {
      addFailure(`${checkKey}_SearchNav`, `Fail-Closed Reconciler: sub-check "${checkKey}.searchNavPass" is false`);
    }

    if (checkVal.coldLcpPass === false) {
      addFailure(`${checkKey}_DesktopColdLCP`, `Fail-Closed Reconciler: sub-check "${checkKey}.coldLcpPass" is false`);
    }

    if (checkVal.rpcPass === false) {
      addFailure(`${checkKey}_RPC`, `Fail-Closed Reconciler: sub-check "${checkKey}.rpcPass" is false`);
    }

    if (checkVal.mobileClsPass === false) {
      addFailure(`${checkKey}_MobileCLS`, `Fail-Closed Reconciler: sub-check "${checkKey}.mobileClsPass" is false`);
    }

    if (checkVal.desktopClsPass === false) {
      addFailure(`${checkKey}_DesktopCLS`, `Fail-Closed Reconciler: sub-check "${checkKey}.desktopClsPass" is false`);
    }
  }

  // 2. Enforce Required-Check Contract if requested or if contract is supplied
  const contractToEnforce = options.contract || (options.enforceContract || results.enforceContract ? REQUIRED_CHECKS_CONTRACT : null);
  if (contractToEnforce) {
    for (const [reqKey, reqSpec] of Object.entries(contractToEnforce)) {
      if (!results.checks[reqKey]) {
        addFailure(reqKey, `Fail-Closed Contract Violation: Required check "${reqKey}" is missing from verification results`);
        continue;
      }

      const checkVal = results.checks[reqKey];
      if (reqSpec.requiredProps) {
        for (const prop of reqSpec.requiredProps) {
          if (checkVal[prop] === undefined) {
            addFailure(`${reqKey}_Missing_${prop}`, `Fail-Closed Contract Violation: Check "${reqKey}" is missing required property "${prop}"`);
          }
        }
      }

      if (typeof reqSpec.validator === 'function') {
        const valid = reqSpec.validator(checkVal);
        if (!valid) {
          addFailure(`${reqKey}_ContractValidator`, `Fail-Closed Contract Violation: Check "${reqKey}" failed contract validator logic`);
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

export function enforceFailClosedExit(results, options = {}) {
  const reconciliation = reconcileFailClosedChecks(results, options);
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

export function writeAndEnforceResults(results, outFilePath, options = {}) {
  const reconciliation = reconcileFailClosedChecks(results, options);

  if (outFilePath) {
    try {
      const dir = path.dirname(outFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outFilePath, JSON.stringify(results, null, 2), 'utf8');
      console.log(`\n[FAIL-CLOSED HARNESS] Results record safely persisted to: ${outFilePath}`);
    } catch (err) {
      console.error(`[FAIL-CLOSED HARNESS] Failed to persist results JSON to ${outFilePath}:`, err);
      process.exit(1);
    }
  }

  if (!reconciliation.success || (results.failures && results.failures.length > 0)) {
    console.error(`\n[FAIL-CLOSED ENFORCEMENT] Suite failed with ${results.failures.length} failure(s):`);
    for (const f of results.failures) {
      console.error(`  - [${f.check}]: ${f.error}`);
    }
    process.exit(1);
  }

  console.log('\n[FAIL-CLOSED ENFORCEMENT] All checks verified cleanly.');
  return 0;
}
