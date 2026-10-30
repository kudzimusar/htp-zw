-- Migration: 20261030100000_ht_mvp_rel_com01_production_migration_safety.sql
-- Module: Unified Release Integration & Production Migration Safety (HT-MVP-REL-COM-01)
-- Scope:
--   1. Permanently drop UAT-only fixture reconciler function from schema.
--   2. Register production migration safety policy in platform_settings.
--   3. Ensure zero residue of UAT-only functions in the unified release candidate baseline.

-- 1. Remove UAT-only fixture reconciler function from schema
drop function if exists public.finance_reconcile_uat_fixtures(text, text);

-- 2. Register production migration safety policy in platform_settings
insert into public.platform_settings (key, category, description, value, is_secret)
values (
  'production_migration_policy',
  'infrastructure',
  'Authoritative migration categorization for release cutover: specifies staging-only UAT migrations',
  jsonb_build_object(
    'canonical_ddl_migrations', jsonb_build_array(
      '20261029020000_ht_mvp_com_final01_operational_completion.sql',
      '20261029040000_ht_mvp_com_final01_r1_privilege_hardening.sql',
      '20261029050000_ht_mvp_com_final01_r1_idempotency_fix.sql',
      '20261029060000_ht_mvp_com_final01_r2_r1_statement_reversal_parity.sql',
      '20261029070000_ht_mvp_com_final01_r2_r1_invoice_line_casing_tolerance.sql',
      '20261030100000_ht_mvp_rel_com01_production_migration_safety.sql'
    ),
    'staging_only_uat_migrations', jsonb_build_array(
      '20261029080000_ht_mvp_com_final01_r2_r2_financial_fixture_reconciliation.sql',
      '20261029090000_ht_mvp_com_final01_r2_r3_security_privilege_remediation.sql'
    ),
    'production_replay_action', 'EXCLUDE_STAGING_UAT_RECONCILIATION',
    'uat_reconciler_function_status', 'DROPPED',
    'updated_at', now()
  ),
  false
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
