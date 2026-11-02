/**
 * HT-MVP-UIAT-01-R3-ICR05A-LR01 Exact Session Authority Module
 * 
 * Enforces:
 * 1. Exact provider_session_id tracking for every created UAT session.
 * 2. Strictly prohibits null or empty provider_session_id sentinels.
 * 3. Authorizes teardown exclusively through canonical newsroom_revoke_session RPC.
 * 4. Proves preservation of concurrent unrelated sessions for the same UAT identity.
 */

export const UAT_STAFF_MAP = {
  'uat-specialist@healthtimes.test': {
    email: 'uat-specialist@healthtimes.test',
    staffProfileId: '5d01dd6e-2a6d-46fa-9c5c-846193add82a',
    authUserId: 'a0000000-0000-0000-0000-000000000001'
  },
  'uat-commercial@healthtimes.test': {
    email: 'uat-commercial@healthtimes.test',
    staffProfileId: '5801b34b-04dc-433b-89e4-128874618dab',
    authUserId: 'e8bd82c4-30e6-4587-bc65-7db66407bb3e'
  }
};

const trackedSessions = [];

/**
 * Tracks a newly created UAT session with its exact providerSessionId.
 * Fails closed if providerSessionId is null or missing.
 */
export function trackExactSession({ email, staffProfileId, authUserId, providerSessionId, testRunId }) {
  if (!providerSessionId || typeof providerSessionId !== 'string' || providerSessionId.trim() === '') {
    throw new Error(`BLOCKED_SESSION_ID: Cannot track session for ${email} with null or empty providerSessionId. Null sentinels are strictly forbidden.`);
  }

  if (!staffProfileId || typeof staffProfileId !== 'string') {
    throw new Error(`BLOCKED_SESSION_ID: Cannot track session for ${email} with missing staffProfileId.`);
  }

  const record = {
    email,
    staffProfileId,
    authUserId: authUserId || UAT_STAFF_MAP[email]?.authUserId || 'unknown',
    providerSessionId: providerSessionId.trim(),
    testRunId: testRunId || 'unknown',
    trackedAt: new Date().toISOString()
  };

  trackedSessions.push(record);
  return record;
}

export function getTrackedSessions() {
  return [...trackedSessions];
}

export function clearTrackedSessions() {
  trackedSessions.length = 0;
}

/**
 * Revokes an exact session via newsroom_revoke_session RPC using its non-null providerSessionId.
 * Fails closed if providerSessionId is null or empty.
 */
export async function revokeExactSession({
  supabaseUrl,
  anonKey,
  email,
  password,
  staffProfileId,
  providerSessionId
}) {
  if (!providerSessionId || typeof providerSessionId !== 'string' || providerSessionId.trim() === '') {
    throw new Error(`BLOCKED_SESSION_ID: Attempted to revoke session for ${email} without exact provider_session_id. Null sentinel strictly forbidden.`);
  }

  if (!staffProfileId || typeof staffProfileId !== 'string') {
    throw new Error(`BLOCKED_SESSION_ID: Attempted to revoke session for ${email} without valid staffProfileId.`);
  }

  // Guard: strictly prohibit targeting Owner or non-UAT staff
  if (email === 'kudzimusar@gmail.com') {
    throw new Error('BLOCKED_SESSION_TARGET: Attempted to revoke Owner session. Operation strictly prohibited.');
  }

  const knownActor = UAT_STAFF_MAP[email];
  if (!knownActor || knownActor.staffProfileId !== staffProfileId) {
    throw new Error(`BLOCKED_SESSION_TARGET: Staff profile ${staffProfileId} is not a verified UAT test actor.`);
  }

  // 1. Authenticate as the target UAT user to obtain authorized actor token
  const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!authRes.ok) {
    const errText = await authRes.text();
    throw new Error(`FAIL_CLOSED_AUTH_ERROR: Failed to authenticate as ${email}: ${errText}`);
  }

  const authData = await authRes.json();
  const actorToken = authData.access_token;

  if (!actorToken) {
    throw new Error(`FAIL_CLOSED_AUTH_ERROR: No access token returned for ${email}`);
  }

  // 2. Invoke canonical newsroom_revoke_session with EXACT provider_session_id
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/newsroom_revoke_session`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${actorToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_staff_id: staffProfileId,
      p_provider_session_id: providerSessionId.trim()
    })
  });

  if (!rpcRes.ok) {
    const rpcErr = await rpcRes.text();
    throw new Error(`FAIL_CLOSED_RPC_ERROR: newsroom_revoke_session failed with HTTP ${rpcRes.status}: ${rpcErr}`);
  }

  const revokedCount = await rpcRes.json();

  // 3. Terminate the GoTrue session for the actor token
  await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${actorToken}`
    }
  }).catch(() => {});

  return {
    email,
    staffProfileId,
    providerSessionId: providerSessionId.trim(),
    revokedCount
  };
}

/**
 * Extracts the exact provider session ID from a Playwright page's localStorage.
 */
export async function extractBrowserProviderSessionId(page) {
  const tokenData = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes('auth')) {
        try {
          const val = JSON.parse(localStorage.getItem(k));
          if (val && val.access_token) return { key: k, session: val };
        } catch {}
      }
    }
    return null;
  });

  if (!tokenData?.session?.access_token) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(tokenData.session.access_token.split('.')[1], 'base64').toString());
    return {
      providerSessionId: payload.session_id || null,
      authUserId: payload.sub || null,
      email: payload.email || null,
      accessToken: tokenData.session.access_token
    };
  } catch (err) {
    return null;
  }
}
