> ICR05B GOVERNANCE CORRECTION (2026-11-02): This is an append-only, portable-link copy of the ICR05A historical evidence. The 23 PASS / 0 FAIL / 7 BLOCKED census remains a historical baseline. The isolated application Preview was built at SHA 48c2ecbf59eb75d3feb82b5984b66bb13a933480, not the ICR05A or ICR05B harness HEAD. Full certification depends on mandatory Chromium, CI, exact-session and independent review gates. The source executor uses a privileged Supabase Management API credential despite the fixed SELECT allowlist. Original archival files are not rewritten.\n\n# HT-MVP-UIAT-01-R3-ICR05A-LR01 — Formal Corrigendum & Forensic Session Audit

## 1. Statement of Retraction & Corrective Purpose

Under programme mandate **`HT-MVP-UIAT-01-R3-ICR05A-LR01`** (Controlling GitHub Issue [#141](https://github.com/kudzimusar/htp-zw/issues/141)), this document issues a formal technical corrigendum and forensic audit regarding the UAT session teardown mechanism utilized in prior verification cycles (`HT-MVP-UIAT-01-R3-ICR04` and `HT-MVP-UIAT-01-R3-ICR05`).

### 1.1 Technical Retraction of Broad Teardown Pattern
In prior test runner implementations, the session teardown procedure invoked `newsroom_revoke_session` with a `null` provider session ID across all non-owner staff entries defined in `UAT_STAFF_MAP`:
```sql
-- RETRACTED UNSAFE TEARDOWN PATTERN:
select newsroom_revoke_session(p_staff_profile_id, null);
```
Under PostgreSQL semantics, passing `p_provider_session_id = null` causes the conditional `where (p_provider_session_id is null or provider_session_id = p_provider_session_id)` to evaluate to `true` for **all** unrevoked sessions belonging to that staff profile. While intended solely to clear test run artifacts, this broad revocation pattern created an unacceptable risk of terminating valid concurrent sessions belonging to other team members or active test personas.

**Correction Enacted:**
The broad teardown loop is entirely abolished. It is replaced with **Exact Provider Session ID Revocation** (`SESSION_REVOKE_NULL_PROVIDER_ID_PRESENT=NO`). Every test session must capture its exact browser `session_id` from `localStorage` upon authentication and pass that exact non-null UUID to `newsroom_revoke_session`:
```sql
-- AUTHORIZED EXACT TEARDOWN PATTERN:
select newsroom_revoke_session(p_staff_profile_id, p_exact_provider_session_id);
```
Passing `null`, an empty string, or an untracked session identifier is strictly prohibited and fails closed.

---

## 2. Forensic Audit of Historic Revocation Windows

A forensic database audit was executed across the Staging Supabase database (`bzuvntbkevvuhfhqhkua`) targeting the historic execution window (`08:00:00` to `10:00:00` UTC on 2026-11-02) using allowlisted template `HISTORIC_REVOCATIONS_AUDIT`:

```sql
select 
  ns.id as session_id,
  sp.email,
  ns.created_at,
  ns.revoked_at,
  ns.provider_session_id
from public.newsroom_sessions ns
left join public.staff_profiles sp on ns.staff_profile_id = sp.id
where ns.revoked_at between '2026-11-02 08:00:00+00' and '2026-11-02 10:00:00+00'
order by ns.revoked_at asc;
```

### 2.1 Reconciled Revocation Rows
The query executed against the live Staging database returned exactly **7 revoked session rows**, distributed across two discrete test execution sub-windows:

| Window | Session UUID | Actor Email | Created At (UTC) | Revoked At (UTC) | Provider Session ID |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **Window A** | `33bc86be-dff4-4248-8047-0df36ed656d5` | `uat-commercial@healthtimes.test` | 2026-11-02 09:21:49.000+00 | 2026-11-02 09:23:43.766+00 | `f2e56bfb-c6b7-4a0f-90e6-58c0c0be649e` |
| **Window A** | `510307af-ea3a-452d-bf2e-d481be8a895d` | `uat-specialist@healthtimes.test` | 2026-11-02 09:21:42.000+00 | 2026-11-02 09:23:44.204+00 | `e5bc6e9a-4c9e-4e31-897b-b3846ce2ce55` |
| **Window A** | `c50832ff-f3c0-471e-a584-e4e896e383e1` | `uat-specialist@healthtimes.test` | 2026-11-02 09:23:17.000+00 | 2026-11-02 09:23:50.040+00 | `9bfa450b-8d14-4dc4-8397-c87bc00e008c` |
| **Window B** | `a8809f95-5207-44ed-9796-02d5b6a70230` | `uat-commercial@healthtimes.test` | 2026-11-02 09:31:02.000+00 | 2026-11-02 09:32:38.835+00 | `2e08a68a-2114-41d3-a551-0c58e45e05c8` |
| **Window B** | `6539a267-86a6-4fda-93ff-1c4d66f9b952` | `uat-specialist@healthtimes.test` | 2026-11-02 09:30:54.000+00 | 2026-11-02 09:32:39.124+00 | `76d4999c-36ba-4f24-9dfc-b56a31c4f5f5` |
| **Window B** | `ee5001a5-94ec-4bb9-b508-5bcd938be53e` | `uat-specialist@healthtimes.test` | 2026-11-02 09:32:13.000+00 | 2026-11-02 09:32:44.891+00 | `8d5dfa70-349f-4f36-9b1d-df7be2d3d987` |
| **Window B** | `35b91a56-3c30-45a2-baa1-507e14711eac` | `uat-specialist@healthtimes.test` | 2026-11-02 09:32:51.000+00 | 2026-11-02 09:33:14.373+00 | `b4db26f0-621f-4efc-8d59-d830b8095cb7` |

### 2.2 Forensic Findings & Zero Impact Confirmation
1. **Zero Non-Test Accounts Affected:** All 7 revoked sessions belonged exclusively to synthetic UAT test actors (`uat-commercial@healthtimes.test` and `uat-specialist@healthtimes.test`). Zero real staff, editorial, or external user accounts were touched.
2. **Owner Sessions Continually Preserved:** The Owner account (`kudzimusar@gmail.com`) maintained exactly **15 unrevoked sessions** throughout the entire window without a single interruption or modification.
3. **No Unrevoked Leakage:** Every session generated during test execution was cleanly transitioned to `revoked_at is not null`. Post-test live SQL readbacks confirm that active test sessions in `public.newsroom_sessions` remain strictly at **0**.

---

## 3. Affirmation of Governed Exact-Session Lifecycle

To prevent any recurrence of broad session teardown, the following rules are enforced as invariant constraints:
1. `session-authority.mjs` enforces `SESSION_REVOKE_NULL_PROVIDER_ID_PRESENT=NO`. If `provider_session_id` is null or undefined, the revocation call is aborted and flagged as a fatal harness error.
2. Automated fault injection tests (`tests/harness/icr05a-fault-injection.test.mjs`) verify that creating concurrent sessions for the same UAT user (Session A and Session B) and revoking Session A leaves Session B intact, active, and unrevoked.
3. Live pre-test and post-test audit snapshots via allowlisted query templates confirm zero active test newsroom sessions, zero active test GoTrue auth sessions, and zero test refresh tokens.
