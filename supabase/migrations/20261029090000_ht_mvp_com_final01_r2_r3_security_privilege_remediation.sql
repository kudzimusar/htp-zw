-- Migration: 20261029090000_ht_mvp_com_final01_r2_r3_security_privilege_remediation.sql
-- Module: Commercial Security & Finance Privilege Hardening (HT-MVP-COM-FINAL-01-R2-R3)
-- Scope:
--   1. Revoke ordinary authenticated execution on finance_reconcile_uat_fixtures (P0 Permission Defect Closure).
--   2. Strictly isolate destructive UAT fixture cleanup to service_role and postgres only.
--   3. Idempotently resolve outstanding synthetic commercial order (ORD-2026-0011) and customer records (HealthCorp 272105, 895254).

-- 1. P0 Permission Defect Remediation: Revoke execute on finance_reconcile_uat_fixtures from authenticated and anon
revoke all on function public.finance_reconcile_uat_fixtures(text, text) from public, anon, authenticated;
grant execute on function public.finance_reconcile_uat_fixtures(text, text) to service_role;

-- 2. Resolve outstanding synthetic commercial orders
update public.commercial_orders
set status = 'cancelled',
    billing_status = 'unbilled',
    notes = concat(coalesce(notes, ''), ' [Cancelled: R2-R3 final synthetic order resolution]')
where status != 'cancelled'
  and (
    order_number = 'ORD-2026-0011'
    or notes ilike '%UAT%'
    or customer_id in (
      select id from public.finance_customers 
      where trading_name ilike '%HealthCorp%' or legal_name ilike '%HealthCorp%'
    )
  );

-- 3. Resolve outstanding synthetic customers
update public.finance_customers
set status = 'inactive'
where status = 'active'
  and (
    trading_name in ('HealthCorp 272105', 'HealthCorp 895254')
    or trading_name ilike '%HealthCorp%'
    or legal_name ilike '%HealthCorp%'
  );

-- 4. Defensive session revocation: ensure all test account newsroom & auth sessions remain closed
update public.newsroom_sessions
set revoked_at = coalesce(revoked_at, now())
where staff_profile_id in (
  select id from public.staff_profiles
  where email in ('uat-commercial@healthtimes.test', 'uat-finance@healthtimes.test', 'uat-specialist@healthtimes.test')
) and revoked_at is null;

delete from auth.sessions
where user_id in (
  select auth_user_id from public.staff_profiles
  where email in ('uat-commercial@healthtimes.test', 'uat-finance@healthtimes.test', 'uat-specialist@healthtimes.test')
);
