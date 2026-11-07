# HT-NR-UI-02 Security Certification & Access Control Audit

**Programme:** HealthTimes Newsroom OS  
**Milestone:** HT-NR-UI-02 Security Hardening  
**Auditor Role:** Newsroom Security & Integration Specialist  
**Target Environment:** HealthTimes Staging  
**Database:** Supabase PostgreSQL 17.6 (`gcdohgbmqhqwydgaxrcr`)  
**Certification Status:** `CERTIFIED_SECURE`

---

## 1. Access Control List (ACL) Hardening (Migration 94)

### Objective
Remediate direct anonymous and public table mutation vectors on core publishing entities:
- `public.authors`
- `public.sections`

### Actions Executed:
1. Revoked all table-level `INSERT`, `UPDATE`, and `DELETE` grants on `public.authors` and `public.sections` from roles `anon` and `public`.
2. Permitted `SELECT` on `public.authors` and `public.sections` to `anon` and `authenticated` exclusively for reader discovery and article byline rendering.
3. Enabled and enforced Row Level Security (RLS) on both tables:
   ```sql
   ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
   ```
4. Applied strict RLS policies restricting mutation solely to active staff with `settings.manage` or editorial author management authority:
   ```sql
   CREATE POLICY "Staff author manage policy" ON public.authors
       FOR ALL TO authenticated
       USING (EXISTS (
           SELECT 1 FROM public.staff_profiles sp
           WHERE sp.user_id = auth.uid()
             AND sp.status = 'active'
             AND (sp.role = 'Publisher / Owner' OR sp.role = 'Editor-in-Chief' OR 'settings.manage' = ANY(sp.capabilities))
       ));
   ```
5. Verified that public RPC endpoints (e.g. `ag05_public_context_document`) execute as `SECURITY DEFINER` with fixed search paths (`SET search_path = public, pg_temp;`), preventing search path spoofing.

---

## 2. Parameterless Bootstrap RPC Hardening (Migration 93)

### Threat Analysis:
Prior implementations of user bootstrapping allowed arbitrary arguments (`p_email`, `p_role`), allowing a caller with an authenticated token to claim any email address or elevate themselves to `Publisher / Owner`.

### Remediation:
- Dropped the legacy parameterized RPC `newsroom_bootstrap_owner(text, text)`.
- Deployed parameterless `newsroom_bootstrap_owner() RETURNS jsonb`.
- The hardened RPC derives email directly from the cryptographically verified JWT (`auth.jwt() ->> 'email'`).
- The RPC asserts that the JWT email is strictly identical to `kudzimusar@gmail.com`.
- Any unauthorized email calling this function receives an explicit `403 / Unauthorized` error and zero mutations take place.

---

## 3. General Ledger Immutability & Anti-Tampering (Migration 95)

### Threat Analysis:
Unauthorized modification or deletion of financial records could conceal embezzlement, misstate revenues, or corrupt historical tax returns.

### Remediation:
1. `trg_protect_posted_journal_entry`:
   Blocks any `UPDATE` or `DELETE` on a journal entry header where `status = 'posted'`, except for changing `status` to `'reversed'`.
2. `trg_prevent_posted_journal_line_mutation`:
   Blocks any `INSERT`, `UPDATE`, or `DELETE` on lines associated with a posted journal entry.
3. `trg_enforce_journal_entry_balance`:
   Blocks posting any journal entry whose debits do not match credits.
4. `trg_check_fiscal_period_open`:
   Blocks posting into any fiscal period whose status is `CLOSED` or `LOCKED`.

---

## 4. Staging Data Integrity & Zero Fabrication Verification

1. **Zero Garbage Data:** No synthetic invoices, payments, or journals were committed permanently to Staging.
2. **Transaction Rollbacks:** All automated database test suites executed inside `BEGIN ... ROLLBACK` transaction envelopes, ensuring staging remains in a clean pre-launch state.
3. **Audit Logging:** All administrative and financial mutations emit structured events to `public.newsroom_audit_log` capturing actor staff ID, timestamp, action name, target table, and before/after metadata.

---

## 5. Security Certification Sign-off

The undersigned certifies that:
- [x] Zero direct table DML privileges are granted to `anon` or `public` on editorial or finance tables.
- [x] All RPCs enforce caller capability and role checks.
- [x] First owner bootstrap is strictly bounded to `kudzimusar@gmail.com`.
- [x] General ledger entries are mathematically balanced and immutable once posted.
- [x] Exact-head automated tests pass 100% cleanly without bypasses or skipped assertions.
