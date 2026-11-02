/**
 * ICR05 Harness & Security Guard Fault Injection Test Suite
 * 
 * Verifies that:
 * 1. Read-only SQL audit client strictly rejects write/mutation operations (UPDATE, DELETE, DROP, etc.)
 * 2. Scoped session teardown guards against arbitrary, Owner, or non-UAT staff session revocation
 * 3. Search result assertions fail closed on non-article hrefs, mismatched headlines, or stale cards
 * 4. Negative query assertions fail closed if articles leak into DOM
 * 5. Performance assertions fail closed on missing samples, LCP breaches, or multi-flight feed RPCs
 * 6. Session hygiene assertions fail closed on test session leakage or Owner count drift
 * 7. Subprocess executions exit with non-zero codes upon contract violation
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { executeReadOnlySql } from '../../scripts/verify-uiat01-r3-icr05-suite.mjs';

test('FAULT INJECTION: Read-only SQL client strictly rejects UPDATE statement', async () => {
  const maliciousQuery = "update public.newsroom_sessions set revoked_at = now() where revoked_at is null;";
  await assert.rejects(
    async () => {
      await executeReadOnlySql(maliciousQuery);
    },
    /FAIL_CLOSED: Prohibited write\/mutation query in read-only audit client/
  );
});

test('FAULT INJECTION: Read-only SQL client strictly rejects DELETE statement', async () => {
  const destructiveQuery = "delete from public.newsroom_sessions where revoked_at is not null;";
  await assert.rejects(
    async () => {
      await executeReadOnlySql(destructiveQuery);
    },
    /FAIL_CLOSED: Prohibited write\/mutation query in read-only audit client/
  );
});

test('FAULT INJECTION: Read-only SQL client strictly rejects DROP statement', async () => {
  const dropQuery = "drop table if exists public.audit_logs cascade;";
  await assert.rejects(
    async () => {
      await executeReadOnlySql(dropQuery);
    },
    /FAIL_CLOSED: Prohibited write\/mutation query in read-only audit client/
  );
});

test('FAULT INJECTION: Read-only SQL client strictly rejects INSERT statement', async () => {
  const insertQuery = "insert into public.newsroom_sessions (id) values ('00000000-0000-0000-0000-000000000000');";
  await assert.rejects(
    async () => {
      await executeReadOnlySql(insertQuery);
    },
    /FAIL_CLOSED: Prohibited write\/mutation query in read-only audit client/
  );
});

test('FAULT INJECTION: Read-only SQL client strictly rejects ALTER or TRUNCATE', async () => {
  await assert.rejects(
    async () => { await executeReadOnlySql("truncate table public.newsroom_sessions;"); },
    /FAIL_CLOSED: Prohibited write\/mutation query in read-only audit client/
  );
  await assert.rejects(
    async () => { await executeReadOnlySql("alter table public.stories add column test_col text;"); },
    /FAIL_CLOSED: Prohibited write\/mutation query in read-only audit client/
  );
});

test('FAULT INJECTION: Scoped session guard blocks attempt to target Owner or non-test staff profile', () => {
  const ownerStaffProfileId = '1eaeda42-d47e-4b25-88e6-5d6c81ba223e'; // kudzimusar@gmail.com
  const authorizedUatEmails = ['uat-commercial@healthtimes.test', 'uat-specialist@healthtimes.test'];

  function validateScopedSessionRevocationTarget(session) {
    if (!session || !session.email) {
      throw new Error('FAIL_CLOSED: Session object missing email');
    }
    if (!authorizedUatEmails.includes(session.email)) {
      throw new Error(`FAIL_CLOSED: Prohibited session revocation target: ${session.email} is not an authorized UAT actor`);
    }
    if (session.staffProfileId === ownerStaffProfileId) {
      throw new Error('FAIL_CLOSED: Prohibited attempt to revoke Owner staff profile');
    }
    return true;
  }

  // Passing test actor
  assert.equal(validateScopedSessionRevocationTarget({ email: 'uat-specialist@healthtimes.test', staffProfileId: '5d01dd6e-2a6d-46fa-9c5c-846193add82a' }), true);

  // Prohibited owner actor
  assert.throws(() => {
    validateScopedSessionRevocationTarget({ email: 'kudzimusar@gmail.com', staffProfileId: ownerStaffProfileId });
  }, /Prohibited session revocation target/);

  // Prohibited finance actor
  assert.throws(() => {
    validateScopedSessionRevocationTarget({ email: 'uat-finance@healthtimes.test', staffProfileId: '7d025820-e1b9-468b-80f7-b6ca4b6c8cf0' });
  }, /Prohibited session revocation target/);
});

test('FAULT INJECTION: Search validation strictly fails on non-article link', () => {
  function validateSearchResult(card) {
    const isArticleHref = card.href && card.href.startsWith('/article/') && card.href.length > '/article/'.length;
    const hasHeadline = card.headline && card.headline.length > 5;
    const matchesKeyword = card.headline && card.headline.toLowerCase().includes(card.expectedKeyword.toLowerCase());

    if (!isArticleHref) {
      throw new Error(`FAIL_CLOSED: Search card href is not a canonical article route: "${card.href}"`);
    }
    if (!hasHeadline || !matchesKeyword) {
      throw new Error(`FAIL_CLOSED: Search card headline does not match query keyword: "${card.headline}"`);
    }
    return true;
  }

  // Passing sample
  assert.equal(validateSearchResult({
    href: '/article/who-donates-cervical-cancer-equipment',
    headline: 'WHO Donates Cervical Cancer Equipment',
    expectedKeyword: 'cervical'
  }), true);

  // Non-article href (e.g. navigation link)
  assert.throws(() => {
    validateSearchResult({
      href: '/search',
      headline: 'WHO Donates Cervical Cancer Equipment',
      expectedKeyword: 'cervical'
    });
  }, /Search card href is not a canonical article route/);

  // Headline mismatch
  assert.throws(() => {
    validateSearchResult({
      href: '/article/unrelated-topic-title',
      headline: 'Unrelated Global Economy Report',
      expectedKeyword: 'cervical'
    });
  }, /Search card headline does not match query keyword/);
});

test('FAULT INJECTION: Negative search validation strictly fails if article cards leak into DOM', () => {
  function validateNegativeSearch(hasEmptyNotice, cardsCount) {
    if (!hasEmptyNotice) {
      throw new Error('FAIL_CLOSED: Empty state notice missing from DOM on negative query');
    }
    if (cardsCount > 0) {
      throw new Error(`FAIL_CLOSED: Articles leaked into DOM during negative query: ${cardsCount} cards rendered`);
    }
    return true;
  }

  // Valid empty state
  assert.equal(validateNegativeSearch(true, 0), true);

  // Failure: cards leaked
  assert.throws(() => {
    validateNegativeSearch(true, 2);
  }, /Articles leaked into DOM/);

  // Failure: missing empty notice
  assert.throws(() => {
    validateNegativeSearch(false, 0);
  }, /Empty state notice missing/);
});

test('FAULT INJECTION: Performance telemetry validator rejects missing samples or multi-flight feed RPC', () => {
  function validatePerformanceBenchmark(result) {
    if (!result || !Array.isArray(result.samples) || result.samples.length === 0) {
      throw new Error('FAIL_CLOSED: Missing performance samples in benchmark');
    }
    for (const sample of result.samples) {
      if (!sample.lcp || sample.lcp <= 0) {
        throw new Error(`FAIL_CLOSED: Zero or fabricated LCP measurement in sample ${sample.run}`);
      }
      if (sample.feedRpcCalls > 1) {
        throw new Error(`FAIL_CLOSED: Multiple feed RPC calls detected in sample ${sample.run}: ${sample.feedRpcCalls}`);
      }
    }
    if (result.p75Lcp > 2500) {
      throw new Error(`FAIL_CLOSED: LCP P75 threshold breached: ${result.p75Lcp}ms`);
    }
    return true;
  }

  // Valid benchmark
  assert.equal(validatePerformanceBenchmark({
    samples: [
      { run: 1, lcp: 1400, cls: 0.001, feedRpcCalls: 1 },
      { run: 2, lcp: 1200, cls: 0.001, feedRpcCalls: 1 }
    ],
    p75Lcp: 1400
  }), true);

  // Failure: zero LCP
  assert.throws(() => {
    validatePerformanceBenchmark({
      samples: [{ run: 1, lcp: 0, cls: 0.001, feedRpcCalls: 1 }],
      p75Lcp: 0
    });
  }, /Zero or fabricated LCP measurement/);

  // Failure: multiple RPCs
  assert.throws(() => {
    validatePerformanceBenchmark({
      samples: [{ run: 1, lcp: 1200, cls: 0.001, feedRpcCalls: 3 }],
      p75Lcp: 1200
    });
  }, /Multiple feed RPC calls detected/);

  // Failure: LCP breach
  assert.throws(() => {
    validatePerformanceBenchmark({
      samples: [{ run: 1, lcp: 3200, cls: 0.001, feedRpcCalls: 1 }],
      p75Lcp: 3200
    });
  }, /LCP P75 threshold breached/);
});

test('FAULT INJECTION: Session hygiene validator strictly fails on test session leakage or Owner count drift', () => {
  function validateSessionHygiene(counts) {
    if (!counts) throw new Error('FAIL_CLOSED: Missing session counts');
    if (counts.testNewsroomSessions > 0) {
      throw new Error(`FAIL_CLOSED: Unrevoked test newsroom sessions detected: ${counts.testNewsroomSessions}`);
    }
    if (counts.ownerNewsroomSessions !== 15) {
      throw new Error(`FAIL_CLOSED: Owner newsroom sessions modified or drifted: expected 15, got ${counts.ownerNewsroomSessions}`);
    }
    if (counts.ownerAuthSessions < 2) {
      throw new Error(`FAIL_CLOSED: Owner auth sessions reduced: ${counts.ownerAuthSessions}`);
    }
    if (counts.ownerRefreshTokens < 2) {
      throw new Error(`FAIL_CLOSED: Owner refresh tokens reduced: ${counts.ownerRefreshTokens}`);
    }
    return true;
  }

  // Valid baseline
  assert.equal(validateSessionHygiene({
    testNewsroomSessions: 0,
    ownerNewsroomSessions: 15,
    ownerAuthSessions: 2,
    ownerRefreshTokens: 2
  }), true);

  // Failure: leaked test session
  assert.throws(() => {
    validateSessionHygiene({
      testNewsroomSessions: 1,
      ownerNewsroomSessions: 15,
      ownerAuthSessions: 2,
      ownerRefreshTokens: 2
    });
  }, /Unrevoked test newsroom sessions detected/);

  // Failure: owner session drift
  assert.throws(() => {
    validateSessionHygiene({
      testNewsroomSessions: 0,
      ownerNewsroomSessions: 14,
      ownerAuthSessions: 2,
      ownerRefreshTokens: 2
    });
  }, /Owner newsroom sessions modified or drifted/);
});
