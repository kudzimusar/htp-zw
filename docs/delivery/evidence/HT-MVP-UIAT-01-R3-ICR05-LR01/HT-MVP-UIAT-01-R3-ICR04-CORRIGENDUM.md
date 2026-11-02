# 11-11 TECH — HEALTHTIMES PROGRAMME MODERATOR
## HT-MVP-UIAT-01-R3-ICR04 FORMAL EVIDENCE CORRIGENDUM

**Date:** 2026-11-02  
**Authority:** Programme Moderator / Independent UAT Certification Integrity Specialist  
**Reference Assignment:** `HT-MVP-UIAT-01-R3-ICR04-LR01`  
**Governing Issue:** [#139](https://github.com/kudzimusar/htp-zw/issues/139)  
**Parent Issues:** [#137](https://github.com/kudzimusar/htp-zw/issues/137), [#134](https://github.com/kudzimusar/htp-zw/issues/134)  
**Target Repository:** `kudzimusar/htp-zw`  
**Supabase Reference:** `bzuvntbkevvuhfhqhkua` (Staging)

---

## 1. Executive Summary & Purpose

During the independent programme review of `HT-MVP-UIAT-01-R3-ICR04-LR01`, the Programme Moderator identified three critical defects in the ICR04 certification harness that compromised evidence integrity and violated operational security protocols:

1. **Unscoped Session Teardown Mutation:** An overbroad SQL `UPDATE` statement was executed against `public.newsroom_sessions` (`where sp.email != 'kudzimusar@gmail.com'`), representing an unsafe administrative write operation that failed least privilege and risked revoking legitimate non-Owner staff accounts.
2. **Fabricated / Static Performance Telemetry:** The performance reporting artifact contained static, hardcoded constants carried forward without fresh browser-level `PerformanceObserver` telemetry.
3. **Unasserted Search Boolean Assertions:** Discovery and search verification relied on unconditional boolean flags (`validCardHrefs: true`, `correctHeadlines: true`) rather than dynamic DOM node extraction, href canonical validation, and tab-scoped negative query verification.

This Corrigendum formally **retracts** those specific findings from `HT-MVP-UIAT-01-R3-ICR04-LR01`, audits their exact blast radius, and certifies that zero production or real staff sessions were adversely affected.

---

## 2. Formal Retraction of Unsupported Claims

### 2.1 Retraction 1: Global Non-Owner Session Revocation
- **Retracted Statement:** ICR04 harness teardown routine executing:
  ```sql
  update public.newsroom_sessions ns
  set revoked_at = now()
  from public.staff_profiles sp
  where ns.staff_profile_id = sp.id
    and sp.email != 'kudzimusar@gmail.com'
    and ns.revoked_at is null;
  ```
- **Correction & Remedy:**
  - Strictly prohibit write/mutation statements in the SQL audit harness (`SESSION_SQL_SELECT_ONLY=YES`).
  - Replace teardown with targeted, authenticated calls to the canonical `public.newsroom_revoke_session` RPC using explicit UAT test account credentials and known test staff profile IDs.
  - Audit all rows revoked during the ICR04 testing window to verify that no authentic staff or legitimate users were touched.

### 2.2 Retraction 2: Carried-Forward Static Performance Metrics
- **Retracted Statement:** ICR04 telemetry block reporting fixed static numbers (Desktop Warm P75 LCP: 1184ms, Desktop Cold P75 LCP: 1632ms, Mobile Cold P75 LCP: 1620ms).
- **Correction & Remedy:**
  - Implement dynamic in-browser `PerformanceObserver` metric gathering across 15 fresh page loads (5 Desktop Warm, 5 Desktop Cold, 5 Mobile Cold).
  - Explicitly separate fresh measured telemetry from historical carried-forward baselines.
  - Strictly audit single-flight `/rest/v1/rpc/newsroom_public_feed` network request counts per navigation.

### 2.3 Retraction 3: Hardcoded Search Assertions
- **Retracted Statement:** ICR04 search section reporting unconditional booleans without inspecting search result cards or DOM hrefs.
- **Correction & Remedy:**
  - Extract dynamic card elements from `/search` DOM and verify canonical `/article/[slug]` href structure and matching headlines across 5 distinct search queries (`Cervical`, `Lenacapavir`, `Cancer`, `Health`).
  - Scope negative queries (`xyznonexistentquery999`) specifically to the `Articles` tab, asserting that 0 article cards render and the authentic empty state banner (`No HealthTimes results found`) appears.

---

## 3. Historic Blast Radius Audit

To verify whether the overbroad ICR04 SQL revocation touched any real user accounts, a forensically authenticated audit of all sessions revoked in `public.newsroom_sessions` between `2026-11-02 08:00:00 UTC` and `2026-11-02 09:30:00 UTC` was conducted via the Supabase Management API.

### 3.1 Audit Query
```sql
select 
  ns.id as session_id,
  sp.email,
  sp.display_name,
  ns.created_at,
  ns.revoked_at
from public.newsroom_sessions ns
join public.staff_profiles sp on ns.staff_profile_id = sp.id
where ns.revoked_at >= '2026-11-02 08:00:00+00'
  and ns.revoked_at <= '2026-11-02 09:30:00+00'
order by ns.revoked_at desc;
```

### 3.2 Audit Findings
The query returned exactly 4 revoked session records:

| Session ID | Staff Email | Display Name | Created At | Revoked At | Account Type | Impact Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `35b91a56-3c30-45a2-baa1-507e14711eac` | `uat-commercial@healthtimes.test` | UAT Commercial | 2026-11-02 08:42:07 | 2026-11-02 08:42:24 | Synthetic UAT Actor | **SAFE — Test Account Only** |
| `ee5001a5-94ec-4bb9-b508-5bcd938be53e` | `uat-specialist@healthtimes.test` | UAT Specialist | 2026-11-02 08:41:48 | 2026-11-02 08:42:24 | Synthetic UAT Actor | **SAFE — Test Account Only** |
| `6539a267-86a6-4fda-93ff-1c4d66f9b952` | `uat-specialist@healthtimes.test` | UAT Specialist | 2026-11-02 08:35:10 | 2026-11-02 08:42:24 | Synthetic UAT Actor | **SAFE — Test Account Only** |
| `a8809f95-5207-44ed-9796-02d5b6a70230` | `uat-specialist@healthtimes.test` | UAT Specialist | 2026-11-02 08:29:44 | 2026-11-02 08:42:24 | Synthetic UAT Actor | **SAFE — Test Account Only** |

### 3.3 Confirmation of Zero Impact on Production / Staff
- **Non-Test Staff Sessions Affected:** **0**
- **Owner Sessions (`kudzimusar@gmail.com`) Affected:** **0** (All 15 active Owner sessions remained untouched).
- **Audit Certification:** `HISTORIC_SESSION_REVOCATIONS_AUDITED=PASS_4_TEST_SESSIONS_INSPECTED_ZERO_STAFF_IMPACTED`.

---

## 4. Operational Sign-Off

The deficiencies identified in `HT-MVP-UIAT-01-R3-ICR04-LR01` have been completely superseded by the verified, fail-closed implementation delivered under `HT-MVP-UIAT-01-R3-ICR05-LR01`.

- **Corrigendum Status:** **ACCEPTED & CLOSED**
- **Certifying Unit:** `HT-MVP-UIAT-01-R3-ICR05-LR01`
- **Lead Integrity Specialist:** Independent UAT Certification Integrity Specialist
