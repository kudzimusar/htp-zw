-- ============================================================================
-- Migration: 20261021030000_ht_nr_ui02_acl_hardening.sql
-- Programme: HealthTimes Newsroom OS (HT-NR-UI-02 / HT-NR-SEC-ACL-01)
-- Description: Revoke Inherited Direct Anon DML ACL Privileges on Authors & Sections
-- ============================================================================

-- 1. Revoke dangerous DML and administrative privileges from anon
revoke insert, update, delete, truncate, trigger, references
  on table public.authors, public.sections
  from anon;

-- 2. Revoke dangerous DML and administrative privileges from public role
revoke insert, update, delete, truncate, trigger, references
  on table public.authors, public.sections
  from public;

-- 3. Confirm RLS is enabled on both tables
alter table public.authors enable row level security;
alter table public.sections enable row level security;

-- 4. Audit trail entry for HT-NR-SEC-ACL-01 closure
insert into public.audit_logs (
  actor_staff_id, action, target_table, target_id, metadata
)
values (
  null,
  'security.acl.hardened',
  'database_tables',
  null,
  jsonb_build_object(
    'tables', jsonb_build_array('authors', 'sections'),
    'revoked_privileges', jsonb_build_array('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'),
    'revoked_from', jsonb_build_array('anon', 'public'),
    'programme', 'HT-NR-SEC-ACL-01',
    'certified_at', now()
  )
);
