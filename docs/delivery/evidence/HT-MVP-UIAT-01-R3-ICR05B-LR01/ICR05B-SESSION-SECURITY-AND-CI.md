# ICR05B exact-session security and non-waivable credential gate

## Engineering source

`scripts/session-authority.mjs` now requires an explicitly opened UUID test run, a known test staff email+profile, a non-placeholder authenticated subject UUID, an exact provider-session UUID, and the **original browser JWT** (ephemeral in memory, omitted from evidence). JWT claims for subject/email/session/expiration must match the registered record.

Before revocation, the helper authenticates the **same original JWT** through the actual Supabase `auth/v1/user` endpoint; rejects mismatched subject/email; performs a bounded UUID-only SQL readback of `newsroom_sessions` joined to `staff_profiles`; checks auth user/staff/provider session/email, current-run creation window, and existing unrevoked status. It invokes the unchanged canonical `newsroom_revoke_session` with a non-null session ID, requires integer `revokedCount === 1`, verifies exact target row now revoked, and demands a successful GoTrue logout using the original token. No management token or JWT is saved in the governed records.

**Privilege disclosure:** the exact readback uses the privileged Supabase Management API token through a code-constructed, validated UUID-only SELECT. This is an **application-level query restriction** and is NOT a genuinely DB-role read-only connection. There is no direct arbitrary caller SQL entrypoint in the helper; reliance on a privileged token remains a security trust boundary.

Historical live Staging evidence from ICR05A: three tracked session IDs existed and were revoked, no UAT session active, 15 Owner Newsroom sessions preserved. These historical facts do **not** independently certify every new ICR05B guard in real Staging.

## CI attribution and blockers

- `.github/workflows/ht-mvp-uiat01-r3-icr05b-certification.yml` explicitly separates **10 ICR05A evidence-consistency checks** plus **12 ICR05B deterministic session negative tests** from the **original 10 ICR05A fault tests**, including the live two-session staging exercise.
- The deterministic job establishes real helper calls using fake network transport (test fixtures, not physical Supabase staff logins). It refuses 0 and 2+ RPC row counts, null ID, owner target, expired/foreign/unknown users, mismatched sub/session ID, untracked run, token leakage, and preserves a fixture same-account sibling session.
- The credential-bearing job requires Owner-authorized `HEALTHTIMES_UAT_ACTORS_JSON` and `HEALTHTIMES_STAGING_MANAGEMENT_AUDIT_TOKEN` GitHub secrets. Missing credentials make the job **FAIL with `BLOCKED_OWNER_UAT_CREDENTIALS`**, not SKIPPED or fake PASS. Do not expose secrets in artifact/logs or push a token.
- `newsroom_revoke_session` in the live database still permits null as a parameter; the new helper refuses null and has not changed that schema. Never assert the RPC's parameter is now non-null by database contract.
- **Independent reviewer:** not assigned. Automated/deterministic engineering results must never be described as independent Security certification.

The original 30 canonical UAT IDs/personas/case scopes and all seven blocked cases remain untouched. The 14 supplemental tests are separate. The unapproved story-title migration must remain absent.
