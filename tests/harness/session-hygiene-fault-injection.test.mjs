import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REQUIRED_CHECKS_CONTRACT,
  reconcileFailClosedChecks
} from '../../scripts/harness/fail-closed-engine.mjs';

function createBaseValidResults() {
  return {
    enforceContract: true,
    failures: [],
    checks: {
      buildInfo: { status: 200, sha: '48c2ecbf59eb75d3feb82b5984b66bb13a933480', pass: true },
      DEF001: { slugStatus: 200, slugMatch: true, pass: true },
      DEF013: { premiumDarkHeadingPass: true, premiumDarkBodyPass: true, pass: true },
      DEF002: { hasSavedItem: true, hasOfflineItem: true, fullBodyRendered: true, reloadSurvives: true, pass: true },
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
      DEF009: { detailsOpened: true, pass: true },
      discoveryAndSecurity: {
        searchDuration: 1200,
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
      DEF014: { telemetryRecorded: true, targetPassed: true, pass: true },
      sessionHygiene: {
        preTestLiveVerified: true,
        postTestLiveVerified: true,
        testNewsroomSessionsPost: 0,
        ownerNewsroomSessionsPreserved: 15,
        activeOwnerTokensPreserved: 2,
        pass: true
      }
    }
  };
}

test('FAULT INJECTION: Baseline valid session hygiene passes contract', () => {
  const results = createBaseValidResults();
  const outcome = reconcileFailClosedChecks(results);
  assert.equal(outcome.success, true, 'Valid results must pass fail-closed engine');
  assert.equal(results.failures.length, 0);
});

test('FAULT INJECTION: Test newsroom session leakage (count > 0) strictly causes fail-closed failure', () => {
  const results = createBaseValidResults();
  results.checks.sessionHygiene.testNewsroomSessionsPost = 1;
  results.checks.sessionHygiene.pass = false;

  const outcome = reconcileFailClosedChecks(results);
  assert.equal(outcome.success, false, 'Leaked test newsroom sessions must fail the contract');
  assert.ok(results.failures.some(f => f.check === 'sessionHygiene'));
});

test('FAULT INJECTION: Owner session count drift (count != 15) strictly causes fail-closed failure', () => {
  const results = createBaseValidResults();
  results.checks.sessionHygiene.ownerNewsroomSessionsPreserved = 14;
  results.checks.sessionHygiene.pass = false;

  const outcome = reconcileFailClosedChecks(results);
  assert.equal(outcome.success, false, 'Damaged owner sessions must fail the contract');
  assert.ok(results.failures.some(f => f.check === 'sessionHygiene'));
});

test('FAULT INJECTION: Missing preTestLiveVerified strictly causes fail-closed failure', () => {
  const results = createBaseValidResults();
  results.checks.sessionHygiene.preTestLiveVerified = false;
  results.checks.sessionHygiene.pass = false;

  const outcome = reconcileFailClosedChecks(results);
  assert.equal(outcome.success, false, 'Unverified pre-test session state must fail the contract');
  assert.ok(results.failures.some(f => f.check === 'sessionHygiene'));
});

test('FAULT INJECTION: Missing postTestLiveVerified strictly causes fail-closed failure', () => {
  const results = createBaseValidResults();
  results.checks.sessionHygiene.postTestLiveVerified = false;
  results.checks.sessionHygiene.pass = false;

  const outcome = reconcileFailClosedChecks(results);
  assert.equal(outcome.success, false, 'Unverified post-test session state must fail the contract');
  assert.ok(results.failures.some(f => f.check === 'sessionHygiene'));
});

test('FAULT INJECTION: Active owner refresh tokens damaged (< 2) strictly causes fail-closed failure', () => {
  const results = createBaseValidResults();
  results.checks.sessionHygiene.activeOwnerTokensPreserved = 1;
  results.checks.sessionHygiene.pass = false;

  const outcome = reconcileFailClosedChecks(results);
  assert.equal(outcome.success, false, 'Damaged owner refresh tokens must fail the contract');
  assert.ok(results.failures.some(f => f.check === 'sessionHygiene'));
});

test('FAULT INJECTION: Entire sessionHygiene check omitted strictly causes fail-closed failure', () => {
  const results = createBaseValidResults();
  delete results.checks.sessionHygiene;

  const outcome = reconcileFailClosedChecks(results);
  assert.equal(outcome.success, false, 'Omitted sessionHygiene check must fail the contract');
  assert.ok(results.failures.some(f => f.check === 'sessionHygiene'));
});
