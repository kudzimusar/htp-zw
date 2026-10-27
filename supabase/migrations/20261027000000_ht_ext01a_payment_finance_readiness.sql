-- =============================================================================
-- Migration: 20261027000000_ht_ext01a_payment_finance_readiness.sql
-- Unit: HT-MVP-EXT-01A-RDY-01-R1 — Payment + Finance Business Transparency Foundation
-- Programme: HealthTimes External Revenue & Communications Activation
-- Disposition: Provider-Independent Payment / Finance Readiness (Fail-Closed)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Capabilities for Payment Operations, Reconciliation, Settlements & Exceptions
-- ---------------------------------------------------------------------------
insert into public.newsroom_capabilities(key, description) values
  ('finance.payment.reconcile', 'Reconcile verified provider payments and manage payment exceptions'),
  ('finance.settlement.manage', 'Record and reconcile provider settlements to bank statements'),
  ('finance.clearing.configure', 'Configure accountant-authorized provider clearing GL mappings')
on conflict (key) do nothing;

do $$
begin
  insert into public.newsroom_role_capabilities(role_id, capability_key)
  select ro.id, k
  from public.newsroom_roles ro,
       unnest(array[
         'finance.payment.reconcile',
         'finance.settlement.manage',
         'finance.clearing.configure'
       ]) k
  where ro.name in ('Publisher / Owner', 'Finance Manager')
  on conflict do nothing;

  insert into public.newsroom_role_capabilities(role_id, capability_key)
  select ro.id, 'finance.payment.reconcile'
  from public.newsroom_roles ro
  where ro.name = 'Accounts Officer'
  on conflict do nothing;
end $$;

-- Extend finance_number_counters for receipts and settlements
alter table public.finance_number_counters drop constraint if exists finance_number_counters_doc_type_check;
alter table public.finance_number_counters add constraint finance_number_counters_doc_type_check
  check (doc_type in ('invoice', 'payment', 'expense', 'order', 'journal', 'credit_note', 'receipt', 'settlement'));

create or replace function public.finance_next_number(p_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from (now() at time zone 'Africa/Harare'))::int;
  v_n int;
  v_prefix text;
begin
  v_prefix := case p_type
    when 'invoice' then 'INV'
    when 'payment' then 'PAY'
    when 'expense' then 'EXP'
    when 'order' then 'ORD'
    when 'journal' then 'JRN'
    when 'credit_note' then 'CRN'
    when 'receipt' then 'RCT'
    when 'settlement' then 'STL'
    else null end;
  if v_prefix is null then
    raise exception using errcode='22023', message='Unknown finance document type: ' || coalesce(p_type, 'null');
  end if;
  insert into public.finance_number_counters(doc_type, fiscal_year, last_value)
  values (p_type, v_year, 1)
  on conflict (doc_type, fiscal_year)
  do update set last_value = public.finance_number_counters.last_value + 1
  returning last_value into v_n;
  return v_prefix || '-' || v_year::text || '-' || lpad(v_n::text, 4, '0');
end $$;

-- ---------------------------------------------------------------------------
-- 2. Canonical Premium Plan Authority (Section 2)
-- ---------------------------------------------------------------------------
create table if not exists public.premium_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null,
  version int not null default 1 check (version > 0),
  name text not null check (length(trim(name)) > 0),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  effective_from timestamptz not null default '2026-01-01T00:00:00Z'::timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_key, version),
  check (effective_to is null or effective_to > effective_from)
);

-- Seed frozen commercial terms: healthtimes_premium_monthly ($5.00 USD / month)
insert into public.premium_plans (
  plan_key, version, name, amount, currency, billing_interval, status, effective_from, effective_to
)
values (
  'healthtimes_premium_monthly',
  1,
  'HealthTimes Premium',
  5.00,
  'USD',
  'month',
  'active',
  '2026-01-01T00:00:00Z'::timestamptz,
  null
)
on conflict (plan_key, version) do update set
  name = excluded.name,
  amount = excluded.amount,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  status = excluded.status,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Canonical Merchant Reference Generator (ULID, Zero PII) (Section 4)
-- ---------------------------------------------------------------------------
create or replace function public.payment_generate_ulid(p_timestamp timestamptz default clock_timestamp())
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_time_ms bigint := floor(extract(epoch from p_timestamp) * 1000)::bigint;
  v_time_part text := '';
  v_rand_part text := '';
  v_rem int;
  v_i int;
  v_bytes bytea := gen_random_bytes(16);
begin
  -- 10-character Crockford Base32 timestamp component (48-bit ms)
  for v_i in 1..10 loop
    v_rem := (v_time_ms % 32)::int;
    v_time_part := substr(v_alphabet, v_rem + 1, 1) || v_time_part;
    v_time_ms := v_time_ms / 32;
  end loop;

  -- 16-character Crockford Base32 randomness component
  for v_i in 0..15 loop
    v_rem := get_byte(v_bytes, v_i) % 32;
    v_rand_part := v_rand_part || substr(v_alphabet, v_rem + 1, 1);
  end loop;

  return v_time_part || v_rand_part;
end $$;

create or replace function public.payment_generate_merchant_reference(p_purpose text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_prefix text;
begin
  v_prefix := case p_purpose
    when 'PREMIUM_SUBSCRIPTION' then 'HT-PREM-'
    when 'ADVERTISING_INVOICE' then 'HT-INV-'
    when 'PROVIDER_CONNECTIVITY_TEST' then 'HT-CONN-'
    else null end;

  if v_prefix is null then
    raise exception using errcode = '22023', message = 'Invalid payment purpose for merchant reference: ' || coalesce(p_purpose, 'null');
  end if;

  return v_prefix || public.payment_generate_ulid();
end $$;

-- ---------------------------------------------------------------------------
-- 4. Provider Transaction Authority, State Machine & Accounting Disposition
-- ---------------------------------------------------------------------------
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paynow' check (provider in ('paynow', 'bank_transfer')),
  purpose text not null check (purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE', 'PROVIDER_CONNECTIVITY_TEST')),
  merchant_reference text not null unique,
  subscriber_id uuid references public.subscribers(id) on delete restrict,
  invoice_id uuid references public.finance_invoices(id) on delete restrict,
  plan_key text,
  plan_version int,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  expected_amount numeric(18,2) not null check (expected_amount > 0),
  reported_amount numeric(18,2) check (reported_amount is null or reported_amount >= 0),
  provider_reference text,
  poll_url text,
  provider_status text,
  internal_status text not null default 'CREATED' check (internal_status in (
    'CREATED',
    'PROVIDER_INITIATED',
    'PROVIDER_PENDING',
    'PAYMENT_VERIFIED',
    'RECONCILIATION_PENDING',
    'RECONCILED',
    'CANCELLED',
    'FAILED',
    'EXPIRED',
    'DISPUTED',
    'REFUNDED',
    'INVALID_HASH',
    'AMOUNT_MISMATCH',
    'CURRENCY_MISMATCH',
    'UNKNOWN_REFERENCE',
    'DUPLICATE_EVENT',
    'RECONCILIATION_FAILED',
    'SETTLEMENT_MISMATCH',
    'REFUND_REQUESTED',
    'REFUND_CONFIRMED',
    'DISPUTE_OPENED',
    'DISPUTE_RESOLVED',
    'REVERSAL_REQUIRED'
  )),
  reconciliation_status text not null default 'PENDING' check (reconciliation_status in (
    'NOT_ELIGIBLE',
    'PENDING',
    'RECONCILED',
    'RECONCILIATION_FAILED',
    'REVERSED'
  )),
  accounting_status text not null default 'PENDING_ACCOUNTANT_AUTHORITY' check (accounting_status in (
    'NOT_APPLICABLE',
    'PENDING_ACCOUNTANT_AUTHORITY',
    'PENDING_POSTING',
    'POSTED',
    'REVERSED',
    'POSTING_FAILED'
  )),
  verification_authority text not null default 'NO_VERIFICATION_AUTHORITY' check (verification_authority in (
    'NO_VERIFICATION_AUTHORITY',
    'TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION'
  )),
  idempotency_key text not null unique check (length(trim(idempotency_key)) >= 8),
  payment_channel text,
  initiated_at timestamptz,
  confirmed_at timestamptz,
  reconciled_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Canonical Merchant Reference format & prefix alignment (no PII)
  check (merchant_reference ~ '^HT-(PREM|INV|CONN)-[0-9A-HJKMNP-TV-Z]{26}$'),
  check (
    (purpose = 'PREMIUM_SUBSCRIPTION' and merchant_reference like 'HT-PREM-%' and subscriber_id is not null and plan_key is not null and invoice_id is null)
    or (purpose = 'ADVERTISING_INVOICE' and merchant_reference like 'HT-INV-%' and invoice_id is not null and subscriber_id is null)
    or (purpose = 'PROVIDER_CONNECTIVITY_TEST' and merchant_reference like 'HT-CONN-%' and subscriber_id is null and invoice_id is null and reconciliation_status = 'NOT_ELIGIBLE' and accounting_status = 'NOT_APPLICABLE' and internal_status <> 'RECONCILED')
  ),
  -- Unverified events must never transition transaction to PAYMENT_VERIFIED or RECONCILED
  check (
    internal_status not in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING', 'RECONCILED')
    or verification_authority <> 'NO_VERIFICATION_AUTHORITY'
  )
);

create index if not exists idx_payment_transactions_subscriber on public.payment_transactions(subscriber_id) where subscriber_id is not null;
create index if not exists idx_payment_transactions_invoice on public.payment_transactions(invoice_id) where invoice_id is not null;
create index if not exists idx_payment_transactions_status on public.payment_transactions(internal_status, reconciliation_status, accounting_status);

-- Prevent destructive deletion of payment transactions (Section 15 & 17)
create or replace function public.payment_prevent_destructive_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception using errcode = '42501', message = 'Destructive deletion of payment authority records is prohibited';
end $$;

drop trigger if exists trg_payment_transactions_no_delete on public.payment_transactions;
create trigger trg_payment_transactions_no_delete
  before delete on public.payment_transactions
  for each row execute function public.payment_prevent_destructive_delete();

-- ---------------------------------------------------------------------------
-- 5. Extend Provider Event Authority for Paynow (Section 5 & 6)
-- ---------------------------------------------------------------------------
alter table public.provider_webhook_events
  drop constraint if exists provider_webhook_events_provider_check;

alter table public.provider_webhook_events
  add constraint provider_webhook_events_provider_check
  check (provider in ('cloudflare', 'resend', 'brevo', 'social', 'paynow'));

alter table public.provider_webhook_events
  add column if not exists transaction_id uuid references public.payment_transactions(id) on delete restrict,
  add column if not exists merchant_reference text,
  add column if not exists provider_reference text,
  add column if not exists reported_amount numeric(18,2),
  add column if not exists reported_currency text,
  add column if not exists verification_authority text not null default 'NO_VERIFICATION_AUTHORITY'
    check (verification_authority in ('NO_VERIFICATION_AUTHORITY', 'TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION')),
  add column if not exists sanitized_metadata jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 6. Extend Finance Payments for method=paynow, Provider Channel & Accounting State (Sections 8, 9, 11)
-- ---------------------------------------------------------------------------
alter table public.finance_payments
  drop constraint if exists finance_payments_method_check;

alter table public.finance_payments
  add constraint finance_payments_method_check
  check (method in ('bank_transfer', 'paynow', 'card', 'mobile_money', 'cash', 'other'));

alter table public.finance_payments
  add column if not exists provider_channel text,
  add column if not exists transaction_id uuid unique references public.payment_transactions(id) on delete restrict,
  add column if not exists merchant_reference text,
  add column if not exists business_reconciliation text not null default 'COMPLETE'
    check (business_reconciliation in ('COMPLETE', 'REVERSED')),
  add column if not exists accounting_status text not null default 'POSTED'
    check (accounting_status in ('PENDING_ACCOUNTANT_AUTHORITY', 'PENDING_POSTING', 'POSTED', 'REVERSED', 'POSTING_FAILED')),
  add column if not exists clearing_journal_id uuid references public.finance_journal_entries(id);

-- ---------------------------------------------------------------------------
-- 7. Premium Entitlement Reconciliations Ledger with Accounting State (Sections 7, 9, 10)
-- ---------------------------------------------------------------------------
create table if not exists public.premium_entitlement_reconciliations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.payment_transactions(id) on delete restrict,
  entitlement_id uuid not null references public.premium_entitlements(id) on delete restrict,
  subscriber_id uuid not null references public.subscribers(id) on delete restrict,
  plan_key text not null,
  plan_version int not null,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  previous_ends_at timestamptz,
  new_starts_at timestamptz not null,
  new_ends_at timestamptz not null,
  business_reconciliation text not null default 'COMPLETE'
    check (business_reconciliation in ('COMPLETE', 'REVERSED')),
  accounting_status text not null default 'PENDING_ACCOUNTANT_AUTHORITY'
    check (accounting_status in ('PENDING_ACCOUNTANT_AUTHORITY', 'PENDING_POSTING', 'POSTED', 'REVERSED', 'POSTING_FAILED')),
  revenue_journal_id uuid references public.finance_journal_entries(id),
  unresolved_accounting_policies jsonb not null default '["revenue_recognition_timing","deferred_revenue_treatment","vat","fiscalization"]'::jsonb,
  reconciled_at timestamptz not null default now(),
  check (new_ends_at > new_starts_at)
);

drop trigger if exists trg_premium_reconciliations_no_delete on public.premium_entitlement_reconciliations;
create trigger trg_premium_reconciliations_no_delete
  before update or delete on public.premium_entitlement_reconciliations
  for each row execute function public.payment_prevent_destructive_delete();

-- ---------------------------------------------------------------------------
-- 8. Provider Clearing Configuration & Settlement Authority (Sections 12, 13, 14)
-- ---------------------------------------------------------------------------
create table if not exists public.finance_provider_clearing_config (
  provider text primary key check (provider in ('paynow')),
  clearing_mode text not null default 'PENDING_ACCOUNTANT_AUTHORITY'
    check (clearing_mode in ('PENDING_ACCOUNTANT_AUTHORITY', 'PROVIDER_CLEARING_TWO_STEP')),
  accountant_approved boolean not null default false,
  provider_clearing_account_code text,
  provider_fee_expense_account_code text,
  bank_settlement_account_code text not null default '1000',
  accounts_receivable_account_code text not null default '1200',
  premium_revenue_account_code text not null default '4100',
  deferred_revenue_account_code text,
  premium_accounting_approved boolean not null default false,
  policy_notes text not null default 'Awaiting accountant sign-off on Paynow Clearing account code, Provider Fee expense account code, and Premium revenue recognition / deferred revenue / VAT / fiscalization policy.',
  updated_by uuid references public.staff_profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.finance_provider_clearing_config (
  provider, clearing_mode, accountant_approved, premium_accounting_approved
) values (
  'paynow', 'PENDING_ACCOUNTANT_AUTHORITY', false, false
) on conflict (provider) do nothing;

create table if not exists public.provider_settlements (
  id uuid primary key default gen_random_uuid(),
  settlement_number text not null unique,
  provider text not null default 'paynow' check (provider in ('paynow')),
  settlement_reference text not null,
  settlement_date date not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  gross_amount numeric(18,2) not null check (gross_amount >= 0),
  fee_amount numeric(18,2) not null default 0 check (fee_amount >= 0),
  net_amount numeric(18,2) not null check (net_amount >= 0),
  bank_reference text,
  status text not null default 'PENDING' check (status in (
    'PENDING',
    'MATCHED',
    'SETTLEMENT_MISMATCH',
    'RECONCILED_TO_BANK'
  )),
  accounting_status text not null default 'PENDING_ACCOUNTANT_AUTHORITY' check (accounting_status in (
    'PENDING_ACCOUNTANT_AUTHORITY',
    'PENDING_POSTING',
    'POSTED',
    'REVERSED',
    'POSTING_FAILED'
  )),
  clearing_journal_id uuid references public.finance_journal_entries(id),
  reconciled_by uuid references public.staff_profiles(id),
  reconciled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, settlement_reference),
  check (gross_amount - fee_amount = net_amount)
);

create table if not exists public.provider_settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.provider_settlements(id) on delete restrict,
  transaction_id uuid not null unique references public.payment_transactions(id) on delete restrict,
  merchant_reference text not null,
  provider_reference text,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  gross_amount numeric(18,2) not null check (gross_amount > 0),
  fee_amount numeric(18,2) not null default 0 check (fee_amount >= 0),
  net_amount numeric(18,2) not null check (net_amount >= 0),
  created_at timestamptz not null default now(),
  check (gross_amount - fee_amount = net_amount)
);

drop trigger if exists trg_provider_settlements_no_delete on public.provider_settlements;
create trigger trg_provider_settlements_no_delete
  before delete on public.provider_settlements
  for each row execute function public.payment_prevent_destructive_delete();

drop trigger if exists trg_provider_settlement_lines_no_delete on public.provider_settlement_lines;
create trigger trg_provider_settlement_lines_no_delete
  before delete on public.provider_settlement_lines
  for each row execute function public.payment_prevent_destructive_delete();

-- ---------------------------------------------------------------------------
-- 9. Refund / Dispute Model, Exception Queue & Payment Audit Trail (Sections 15, 16, 17)
-- ---------------------------------------------------------------------------
create table if not exists public.payment_reversals (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.payment_transactions(id) on delete restrict,
  merchant_reference text not null,
  reversal_type text not null check (reversal_type in ('REFUND', 'DISPUTE')),
  workflow_state text not null check (workflow_state in (
    'REFUND_REQUESTED',
    'REFUND_CONFIRMED',
    'DISPUTE_OPENED',
    'DISPUTE_RESOLVED',
    'REVERSAL_REQUIRED'
  )),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reason text not null check (length(trim(reason)) >= 3),
  provider_reference text,
  entitlement_action text not null default 'PENDING_OWNER_POLICY'
    check (entitlement_action in ('PENDING_OWNER_POLICY', 'NO_ACTION', 'REVOKED_BY_OWNER_AUTHORITY')),
  accounting_action text not null default 'PENDING_ACCOUNTANT_POLICY'
    check (accounting_action in ('PENDING_ACCOUNTANT_POLICY', 'REVERSAL_JOURNAL_POSTED', 'NO_POSTING_REQUIRED')),
  reversal_journal_id uuid references public.finance_journal_entries(id),
  opened_by uuid references public.staff_profiles(id),
  resolved_by uuid references public.staff_profiles(id),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

drop trigger if exists trg_payment_reversals_no_delete on public.payment_reversals;
create trigger trg_payment_reversals_no_delete
  before delete on public.payment_reversals
  for each row execute function public.payment_prevent_destructive_delete();

create table if not exists public.payment_exceptions (
  id uuid primary key default gen_random_uuid(),
  exception_code text not null check (exception_code in (
    'AMOUNT_MISMATCH',
    'CURRENCY_MISMATCH',
    'UNKNOWN_REFERENCE',
    'DUPLICATE_PROVIDER_EVENT',
    'RECONCILIATION_FAILED',
    'UNPAYABLE_INVOICE',
    'SETTLEMENT_MISMATCH',
    'UNMATCHED_BANK_SETTLEMENT',
    'REFUND_REVIEW',
    'DISPUTE_REVIEW'
  )),
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_REVIEW', 'RESOLVED')),
  reason text not null check (length(trim(reason)) > 0),
  transaction_id uuid references public.payment_transactions(id) on delete restrict,
  settlement_id uuid references public.provider_settlements(id) on delete restrict,
  merchant_reference text,
  provider_reference text,
  details jsonb not null default '{}'::jsonb,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.staff_profiles(id),
  resolution_note text,
  check (status <> 'RESOLVED' or (resolved_at is not null and length(trim(coalesce(resolution_note, ''))) >= 3))
);

create index if not exists idx_payment_exceptions_status on public.payment_exceptions(status, exception_code);

drop trigger if exists trg_payment_exceptions_no_delete on public.payment_exceptions;
create trigger trg_payment_exceptions_no_delete
  before delete on public.payment_exceptions
  for each row execute function public.payment_prevent_destructive_delete();

create table if not exists public.payment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_type text not null check (actor_type in ('staff', 'subscriber', 'system', 'provider_webhook')),
  action text not null check (length(trim(action)) > 0),
  source text not null check (source in (
    'server_intent',
    'provider_webhook',
    'reconciliation_engine',
    'settlement_engine',
    'manual_intervention'
  )),
  transaction_id uuid references public.payment_transactions(id) on delete restrict,
  business_object_type text not null,
  business_object_id text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  -- Manual intervention must always require a substantive reason (Section 17)
  check (source <> 'manual_intervention' or length(trim(coalesce(reason, ''))) >= 3)
);

create index if not exists idx_payment_audit_logs_tx on public.payment_audit_logs(transaction_id) where transaction_id is not null;

create or replace function public.payment_audit_logs_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception using errcode = '42501', message = 'Payment audit logs are strictly immutable';
end $$;

drop trigger if exists trg_payment_audit_logs_immutable on public.payment_audit_logs;
create trigger trg_payment_audit_logs_immutable
  before update or delete on public.payment_audit_logs
  for each row execute function public.payment_audit_logs_immutable();

-- Lock down all new payment/settlement tables with RLS and revoke direct client table access
do $$
declare
  t text;
begin
  foreach t in array array[
    'premium_plans',
    'payment_transactions',
    'premium_entitlement_reconciliations',
    'finance_provider_clearing_config',
    'provider_settlements',
    'provider_settlement_lines',
    'payment_reversals',
    'payment_exceptions',
    'payment_audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Audit & Exception Recording Helpers
-- ---------------------------------------------------------------------------
create or replace function public.payment_record_audit(
  p_actor_id uuid,
  p_actor_type text,
  p_action text,
  p_source text,
  p_transaction_id uuid,
  p_business_object_type text,
  p_business_object_id text,
  p_before_state jsonb,
  p_after_state jsonb,
  p_reason text default null,
  p_provider_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.payment_audit_logs (
    actor_id, actor_type, action, source, transaction_id,
    business_object_type, business_object_id, before_state, after_state,
    reason, provider_reference, metadata
  )
  values (
    p_actor_id, p_actor_type, p_action, p_source, p_transaction_id,
    p_business_object_type, p_business_object_id, p_before_state, p_after_state,
    nullif(trim(p_reason), ''), nullif(trim(p_provider_reference), ''), coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end $$;

create or replace function public.payment_open_exception(
  p_exception_code text,
  p_reason text,
  p_transaction_id uuid default null,
  p_settlement_id uuid default null,
  p_merchant_reference text default null,
  p_provider_reference text default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.payment_exceptions (
    exception_code, status, reason, transaction_id, settlement_id,
    merchant_reference, provider_reference, details
  )
  values (
    p_exception_code, 'OPEN', trim(p_reason), p_transaction_id, p_settlement_id,
    nullif(trim(p_merchant_reference), ''), nullif(trim(p_provider_reference), ''), coalesce(p_details, '{}'::jsonb)
  )
  returning id into v_id;

  perform public.payment_record_audit(
    null, 'system', 'payment.exception.opened', 'reconciliation_engine', p_transaction_id,
    'payment_exceptions', v_id::text, null,
    jsonb_build_object('exception_code', p_exception_code, 'status', 'OPEN', 'reason', trim(p_reason)),
    trim(p_reason), p_provider_reference, coalesce(p_details, '{}'::jsonb)
  );

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Server Payment Intent Authority (Section 8)
-- ---------------------------------------------------------------------------
create or replace function public.payment_create_intent(
  p_purpose text,
  p_idempotency_key text,
  p_subscriber_id uuid default null,
  p_invoice_id uuid default null,
  p_plan_key text default 'healthtimes_premium_monthly',
  p_client_supplied_amount numeric default null,
  p_client_supplied_currency text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing public.payment_transactions%rowtype;
  v_plan public.premium_plans%rowtype;
  v_inv public.finance_invoices%rowtype;
  v_sub public.subscribers%rowtype;
  v_expected_amount numeric(18,2);
  v_currency text;
  v_merchant_ref text;
  v_reconciliation_status text := 'PENDING';
  v_accounting_status text := 'PENDING_ACCOUNTANT_AUTHORITY';
  v_tx_id uuid;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception using errcode = '22023', message = 'An idempotency key of at least 8 characters is required';
  end if;

  select * into v_existing
  from public.payment_transactions
  where idempotency_key = trim(p_idempotency_key);

  if v_existing.id is not null then
    if v_existing.purpose <> p_purpose
       or coalesce(v_existing.subscriber_id::text, '') <> coalesce(p_subscriber_id::text, '')
       or coalesce(v_existing.invoice_id::text, '') <> coalesce(p_invoice_id::text, '') then
      raise exception using errcode = '22023', message = 'Idempotency key already used for different payment intent parameters';
    end if;

    return jsonb_build_object(
      'transaction_id', v_existing.id,
      'merchant_reference', v_existing.merchant_reference,
      'purpose', v_existing.purpose,
      'expected_amount', v_existing.expected_amount,
      'currency', v_existing.currency,
      'internal_status', v_existing.internal_status,
      'reconciliation_status', v_existing.reconciliation_status,
      'accounting_status', v_existing.accounting_status,
      'replayed', true
    );
  end if;

  if p_purpose = 'PREMIUM_SUBSCRIPTION' then
    if p_subscriber_id is null then
      raise exception using errcode = '22023', message = 'subscriber_id is required for PREMIUM_SUBSCRIPTION intent';
    end if;
    select * into v_sub from public.subscribers where id = p_subscriber_id;
    if v_sub.id is null then
      raise exception using errcode = 'P0002', message = 'Subscriber not found';
    end if;
    select * into v_plan
    from public.premium_plans
    where plan_key = coalesce(nullif(trim(p_plan_key), ''), 'healthtimes_premium_monthly')
      and status = 'active'
      and effective_from <= now()
      and (effective_to is null or effective_to > now())
    order by version desc
    limit 1;

    if v_plan.id is null then
      raise exception using errcode = 'P0002', message = 'Active canonical Premium plan not found';
    end if;

    v_expected_amount := v_plan.amount;
    v_currency := v_plan.currency;

  elsif p_purpose = 'ADVERTISING_INVOICE' then
    if p_invoice_id is null then
      raise exception using errcode = '22023', message = 'invoice_id is required for ADVERTISING_INVOICE intent';
    end if;
    select * into v_inv from public.finance_invoices where id = p_invoice_id;
    if v_inv.id is null then
      raise exception using errcode = 'P0002', message = 'Invoice not found';
    end if;
    if v_inv.status not in ('issued', 'partially_paid', 'overdue') or v_inv.balance_due <= 0 then
      raise exception using errcode = '22023', message = 'UNPAYABLE_INVOICE: Invoice is not in an explicitly payable state (status: ' || v_inv.status || ')';
    end if;

    v_expected_amount := v_inv.balance_due;
    v_currency := v_inv.currency;

  elsif p_purpose = 'PROVIDER_CONNECTIVITY_TEST' then
    if p_subscriber_id is not null or p_invoice_id is not null then
      raise exception using errcode = '22023', message = 'PROVIDER_CONNECTIVITY_TEST cannot reference subscriber_id or invoice_id';
    end if;
    v_expected_amount := 1.00;
    v_currency := 'USD';
    v_reconciliation_status := 'NOT_ELIGIBLE';
    v_accounting_status := 'NOT_APPLICABLE';

  else
    raise exception using errcode = '22023', message = 'Unsupported payment purpose: ' || coalesce(p_purpose, 'null');
  end if;

  -- Reject client-supplied amount or currency tampering at intent creation
  if p_client_supplied_currency is not null and upper(trim(p_client_supplied_currency)) <> v_currency then
    raise exception using errcode = '22023',
      message = 'CURRENCY_MISMATCH: Client-supplied currency (' || trim(p_client_supplied_currency) || ') does not match canonical currency (' || v_currency || ')';
  end if;

  if p_client_supplied_amount is not null and round(p_client_supplied_amount, 2) <> v_expected_amount then
    raise exception using errcode = '22023',
      message = 'AMOUNT_MISMATCH: Client-supplied amount (' || round(p_client_supplied_amount, 2)::text || ') does not match canonical expected amount (' || v_expected_amount::text || ')';
  end if;

  v_merchant_ref := public.payment_generate_merchant_reference(p_purpose);

  insert into public.payment_transactions (
    provider, purpose, merchant_reference, subscriber_id, invoice_id,
    plan_key, plan_version, currency, expected_amount,
    internal_status, reconciliation_status, accounting_status,
    verification_authority, idempotency_key
  )
  values (
    'paynow',
    p_purpose,
    v_merchant_ref,
    p_subscriber_id,
    p_invoice_id,
    case when p_purpose = 'PREMIUM_SUBSCRIPTION' then v_plan.plan_key else null end,
    case when p_purpose = 'PREMIUM_SUBSCRIPTION' then v_plan.version else null end,
    v_currency,
    v_expected_amount,
    'CREATED',
    v_reconciliation_status,
    v_accounting_status,
    'NO_VERIFICATION_AUTHORITY',
    trim(p_idempotency_key)
  )
  returning id into v_tx_id;

  perform public.payment_record_audit(
    coalesce(p_subscriber_id, public.newsroom_current_staff_id_basic()),
    case when p_subscriber_id is not null then 'subscriber' else 'system' end,
    'payment.intent.created',
    'server_intent',
    v_tx_id,
    'payment_transactions',
    v_tx_id::text,
    null,
    jsonb_build_object(
      'merchant_reference', v_merchant_ref,
      'purpose', p_purpose,
      'expected_amount', v_expected_amount,
      'currency', v_currency,
      'internal_status', 'CREATED',
      'reconciliation_status', v_reconciliation_status,
      'accounting_status', v_accounting_status
    ),
    'Canonical server payment intent created',
    null,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'transaction_id', v_tx_id,
    'merchant_reference', v_merchant_ref,
    'purpose', p_purpose,
    'expected_amount', v_expected_amount,
    'currency', v_currency,
    'internal_status', 'CREATED',
    'reconciliation_status', v_reconciliation_status,
    'accounting_status', v_accounting_status,
    'replayed', false
  );
end $$;

-- ---------------------------------------------------------------------------
-- 12. Premium Payment Reconciliation Primitive (Section 9 & 10)
-- ---------------------------------------------------------------------------
create or replace function public.payment_reconcile_premium_transaction(
  p_transaction_id uuid,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tx public.payment_transactions%rowtype;
  v_plan public.premium_plans%rowtype;
  v_existing_rec public.premium_entitlement_reconciliations%rowtype;
  v_clearing_cfg public.finance_provider_clearing_config%rowtype;
  v_current_end timestamptz;
  v_base timestamptz;
  v_new_end timestamptz;
  v_entitlement_id uuid;
  v_rec_id uuid;
  v_exc_id uuid;
  v_accounting_status text := 'PENDING_ACCOUNTANT_AUTHORITY';
begin
  select * into v_tx from public.payment_transactions where id = p_transaction_id for update;
  if v_tx.id is null then
    raise exception using errcode = 'P0002', message = 'Payment transaction not found';
  end if;

  if v_tx.purpose = 'PROVIDER_CONNECTIVITY_TEST' then
    raise exception using errcode = '22023', message = 'PROVIDER_CONNECTIVITY_TEST transactions can never be reconciled into Premium';
  end if;

  if v_tx.purpose <> 'PREMIUM_SUBSCRIPTION' then
    raise exception using errcode = '22023', message = 'Transaction purpose is not PREMIUM_SUBSCRIPTION';
  end if;

  -- Idempotency: check if already reconciled
  select * into v_existing_rec
  from public.premium_entitlement_reconciliations
  where transaction_id = v_tx.id;

  if v_existing_rec.id is not null or v_tx.reconciliation_status = 'RECONCILED' then
    return jsonb_build_object(
      'reconciled', true,
      'replayed', true,
      'entitlement_changed', false,
      'business_reconciliation', coalesce(v_existing_rec.business_reconciliation, 'COMPLETE'),
      'accounting_status', coalesce(v_existing_rec.accounting_status, v_tx.accounting_status),
      'revenue_journal_id', v_existing_rec.revenue_journal_id,
      'entitlement_id', v_existing_rec.entitlement_id,
      'new_starts_at', v_existing_rec.new_starts_at,
      'new_ends_at', v_existing_rec.new_ends_at
    );
  end if;

  if v_tx.verification_authority = 'NO_VERIFICATION_AUTHORITY'
     or v_tx.internal_status not in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING') then
    v_exc_id := public.payment_open_exception(
      'RECONCILIATION_FAILED',
      'Premium reconciliation requires verified payment authority and PAYMENT_VERIFIED/RECONCILIATION_PENDING state (current: ' || v_tx.internal_status || ', verification: ' || v_tx.verification_authority || ')',
      v_tx.id, null, v_tx.merchant_reference, v_tx.provider_reference,
      jsonb_build_object('internal_status', v_tx.internal_status, 'verification_authority', v_tx.verification_authority)
    );
    update public.payment_transactions
       set internal_status = 'RECONCILIATION_FAILED',
           reconciliation_status = 'RECONCILIATION_FAILED',
           updated_at = now()
     where id = v_tx.id;
    raise exception using errcode = '22023', message = 'Transaction is not verified for Premium reconciliation';
  end if;

  select * into v_plan
  from public.premium_plans
  where plan_key = v_tx.plan_key and version = coalesce(v_tx.plan_version, 1);

  if v_plan.id is null then
    raise exception using errcode = 'P0002', message = 'Canonical Premium plan not found for transaction';
  end if;

  if v_tx.currency <> v_plan.currency then
    v_exc_id := public.payment_open_exception(
      'CURRENCY_MISMATCH',
      'Transaction currency (' || v_tx.currency || ') does not match canonical plan currency (' || v_plan.currency || ')',
      v_tx.id, null, v_tx.merchant_reference, v_tx.provider_reference, '{}'::jsonb
    );
    update public.payment_transactions
       set internal_status = 'CURRENCY_MISMATCH',
           reconciliation_status = 'RECONCILIATION_FAILED',
           updated_at = now()
     where id = v_tx.id;
    raise exception using errcode = '22023', message = 'Currency mismatch against canonical Premium plan';
  end if;

  if coalesce(v_tx.reported_amount, -1) <> v_plan.amount or v_tx.expected_amount <> v_plan.amount then
    v_exc_id := public.payment_open_exception(
      'AMOUNT_MISMATCH',
      'Reported amount (' || coalesce(v_tx.reported_amount::text, 'null') || ') does not match canonical plan amount (' || v_plan.amount::text || ')',
      v_tx.id, null, v_tx.merchant_reference, v_tx.provider_reference, '{}'::jsonb
    );
    update public.payment_transactions
       set internal_status = 'AMOUNT_MISMATCH',
           reconciliation_status = 'RECONCILIATION_FAILED',
           updated_at = now()
     where id = v_tx.id;
    raise exception using errcode = '22023', message = 'Amount mismatch against canonical Premium plan';
  end if;

  if not exists (select 1 from public.subscribers where id = v_tx.subscriber_id) then
    raise exception using errcode = 'P0002', message = 'Subscriber not found for Premium reconciliation';
  end if;

  -- Determine existing active/latest entitlement end for this subscriber
  select max(ends_at) into v_current_end
  from public.premium_entitlements
  where subscriber_id = v_tx.subscriber_id
    and policy_key = 'premium';

  -- Renewal rule (Section 9):
  -- first purchase or expired: base = now
  -- early renewal: base = max(now, current_end)
  -- new_end = base + 1 billing month
  if v_current_end is not null and v_current_end > p_now then
    v_base := v_current_end;
  else
    v_base := p_now;
  end if;

  v_new_end := v_base + interval '1 month';

  insert into public.premium_entitlements (
    subscriber_id, policy_key, starts_at, ends_at, provider, provider_reference
  )
  values (
    v_tx.subscriber_id,
    'premium',
    p_now,
    v_new_end,
    v_tx.provider,
    v_tx.merchant_reference
  )
  returning id into v_entitlement_id;

  -- Section 10: Premium accounting state remains PENDING_ACCOUNTANT_AUTHORITY until
  -- revenue recognition timing, deferred revenue treatment, VAT, and fiscalization are signed off.
  select * into v_clearing_cfg from public.finance_provider_clearing_config where provider = 'paynow';
  if v_clearing_cfg.accountant_approved and v_clearing_cfg.premium_accounting_approved then
    v_accounting_status := 'PENDING_POSTING';
  else
    v_accounting_status := 'PENDING_ACCOUNTANT_AUTHORITY';
  end if;

  insert into public.premium_entitlement_reconciliations (
    transaction_id, entitlement_id, subscriber_id, plan_key, plan_version,
    amount, currency, previous_ends_at, new_starts_at, new_ends_at,
    business_reconciliation, accounting_status, revenue_journal_id
  )
  values (
    v_tx.id, v_entitlement_id, v_tx.subscriber_id, v_plan.plan_key, v_plan.version,
    v_plan.amount, v_plan.currency, v_current_end, p_now, v_new_end,
    'COMPLETE', v_accounting_status, null
  )
  returning id into v_rec_id;

  update public.payment_transactions
     set internal_status = 'RECONCILED',
         reconciliation_status = 'RECONCILED',
         accounting_status = v_accounting_status,
         reconciled_at = p_now,
         updated_at = p_now
   where id = v_tx.id;

  perform public.payment_record_audit(
    v_tx.subscriber_id,
    'system',
    'payment.premium.reconciled',
    'reconciliation_engine',
    v_tx.id,
    'premium_entitlements',
    v_entitlement_id::text,
    jsonb_build_object('internal_status', v_tx.internal_status, 'previous_ends_at', v_current_end),
    jsonb_build_object(
      'internal_status', 'RECONCILED',
      'business_reconciliation', 'COMPLETE',
      'accounting_status', v_accounting_status,
      'revenue_journal_id', null,
      'new_starts_at', p_now,
      'new_ends_at', v_new_end
    ),
    'Verified Premium subscription payment reconciled (accounting pending accountant policy)',
    v_tx.provider_reference,
    jsonb_build_object('plan_key', v_plan.plan_key, 'amount', v_plan.amount, 'currency', v_plan.currency)
  );

  return jsonb_build_object(
    'reconciled', true,
    'replayed', false,
    'entitlement_changed', true,
    'business_reconciliation', 'COMPLETE',
    'accounting_status', v_accounting_status,
    'revenue_journal_id', null,
    'entitlement_id', v_entitlement_id,
    'reconciliation_id', v_rec_id,
    'previous_ends_at', v_current_end,
    'new_starts_at', p_now,
    'new_ends_at', v_new_end
  );
end $$;

-- ---------------------------------------------------------------------------
-- 13. Advertising Invoice Payment Reconciliation Primitive (Sections 8, 9, 10)
-- ---------------------------------------------------------------------------
create or replace function public.payment_reconcile_advertising_invoice(
  p_transaction_id uuid,
  p_actor_staff_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tx public.payment_transactions%rowtype;
  v_inv public.finance_invoices%rowtype;
  v_existing_payment public.finance_payments%rowtype;
  v_actor uuid := coalesce(p_actor_staff_id, public.newsroom_current_staff_id_basic());
  v_payment_number text;
  v_payment_id uuid;
  v_new_paid numeric(18,2);
  v_new_status text;
  v_clearing_cfg public.finance_provider_clearing_config%rowtype;
  v_debit_acc uuid;
  v_ar_acc uuid;
  v_jrn_id uuid := null;
  v_accounting_status text := 'PENDING_ACCOUNTANT_AUTHORITY';
  v_exc_id uuid;
begin
  select * into v_tx from public.payment_transactions where id = p_transaction_id for update;
  if v_tx.id is null then
    raise exception using errcode = 'P0002', message = 'Payment transaction not found';
  end if;

  if v_tx.purpose = 'PROVIDER_CONNECTIVITY_TEST' then
    raise exception using errcode = '22023', message = 'PROVIDER_CONNECTIVITY_TEST transactions can never be reconciled into Finance';
  end if;

  if v_tx.purpose <> 'ADVERTISING_INVOICE' then
    raise exception using errcode = '22023', message = 'Transaction purpose is not ADVERTISING_INVOICE';
  end if;

  -- Idempotency: check if finance_payments already has this transaction_id or idempotency_key
  select * into v_existing_payment
  from public.finance_payments
  where transaction_id = v_tx.id
     or idempotency_key = 'paynow-tx-' || v_tx.id::text;

  if v_existing_payment.id is not null or v_tx.reconciliation_status = 'RECONCILED' then
    return jsonb_build_object(
      'reconciled', true,
      'replayed', true,
      'business_reconciliation', coalesce(v_existing_payment.business_reconciliation, 'COMPLETE'),
      'accounting_status', coalesce(v_existing_payment.accounting_status, v_tx.accounting_status),
      'clearing_journal_id', v_existing_payment.clearing_journal_id,
      'payment_id', v_existing_payment.id,
      'payment_number', v_existing_payment.payment_number
    );
  end if;

  if v_tx.verification_authority = 'NO_VERIFICATION_AUTHORITY'
     or v_tx.internal_status not in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING') then
    v_exc_id := public.payment_open_exception(
      'RECONCILIATION_FAILED',
      'Advertising invoice reconciliation requires verified payment authority and PAYMENT_VERIFIED/RECONCILIATION_PENDING state',
      v_tx.id, null, v_tx.merchant_reference, v_tx.provider_reference,
      jsonb_build_object('internal_status', v_tx.internal_status, 'verification_authority', v_tx.verification_authority)
    );
    update public.payment_transactions
       set internal_status = 'RECONCILIATION_FAILED',
           reconciliation_status = 'RECONCILIATION_FAILED',
           updated_at = now()
     where id = v_tx.id;
    raise exception using errcode = '22023', message = 'Transaction is not verified for Finance reconciliation';
  end if;

  select * into v_inv from public.finance_invoices where id = v_tx.invoice_id for update;
  if v_inv.id is null then
    raise exception using errcode = 'P0002', message = 'Referenced Finance invoice not found';
  end if;

  -- Section 10: Paynow may settle ONLY an invoice in an explicitly payable state (issued, partially_paid, overdue).
  -- Reject draft, approved (approved-but-not-issued), void, cancelled, paid.
  if v_inv.status not in ('issued', 'partially_paid', 'overdue') then
    v_exc_id := public.payment_open_exception(
      'UNPAYABLE_INVOICE',
      'Invoice ' || v_inv.invoice_number || ' is in non-payable status: ' || v_inv.status,
      v_tx.id, null, v_tx.merchant_reference, v_tx.provider_reference,
      jsonb_build_object('invoice_id', v_inv.id, 'invoice_number', v_inv.invoice_number, 'invoice_status', v_inv.status)
    );
    update public.payment_transactions
       set internal_status = 'RECONCILIATION_FAILED',
           reconciliation_status = 'RECONCILIATION_FAILED',
           updated_at = now()
     where id = v_tx.id;
    raise exception using errcode = '22023', message = 'UNPAYABLE_INVOICE: Cannot reconcile provider payment against invoice in status ' || v_inv.status;
  end if;

  if v_tx.currency <> v_inv.currency then
    v_exc_id := public.payment_open_exception(
      'CURRENCY_MISMATCH',
      'Transaction currency (' || v_tx.currency || ') does not match invoice currency (' || v_inv.currency || ')',
      v_tx.id, null, v_tx.merchant_reference, v_tx.provider_reference, '{}'::jsonb
    );
    update public.payment_transactions
       set internal_status = 'CURRENCY_MISMATCH',
           reconciliation_status = 'RECONCILIATION_FAILED',
           updated_at = now()
     where id = v_tx.id;
    raise exception using errcode = '22023', message = 'Currency mismatch against invoice';
  end if;

  if v_tx.reported_amount is null or v_tx.reported_amount <= 0 or v_tx.reported_amount > v_inv.balance_due then
    v_exc_id := public.payment_open_exception(
      'AMOUNT_MISMATCH',
      'Reported payment amount (' || coalesce(v_tx.reported_amount::text, 'null') || ') invalid or exceeds invoice balance due (' || v_inv.balance_due::text || ')',
      v_tx.id, null, v_tx.merchant_reference, v_tx.provider_reference,
      jsonb_build_object('balance_due', v_inv.balance_due, 'reported_amount', v_tx.reported_amount)
    );
    update public.payment_transactions
       set internal_status = 'AMOUNT_MISMATCH',
           reconciliation_status = 'RECONCILIATION_FAILED',
           updated_at = now()
     where id = v_tx.id;
    raise exception using errcode = '22023', message = 'Amount mismatch or overpayment against invoice balance due';
  end if;

  if v_actor is null then
    select coalesce(v_inv.issued_by, v_inv.approved_by, v_inv.created_by) into v_actor;
  end if;

  -- Provider Clearing GL Posting (Sections 8, 9, 12):
  -- Determine accounting_status and whether clearing journal can be posted.
  select * into v_clearing_cfg from public.finance_provider_clearing_config where provider = 'paynow';
  if v_clearing_cfg.accountant_approved and v_clearing_cfg.provider_clearing_account_code is not null then
    select id into v_debit_acc from public.finance_chart_of_accounts where account_code = v_clearing_cfg.provider_clearing_account_code;
    select id into v_ar_acc from public.finance_chart_of_accounts where account_code = v_clearing_cfg.accounts_receivable_account_code;
    if v_debit_acc is not null and v_ar_acc is not null then
      v_accounting_status := 'POSTED';
    else
      v_accounting_status := 'PENDING_POSTING';
    end if;
  else
    v_accounting_status := 'PENDING_ACCOUNTANT_AUTHORITY';
  end if;

  v_payment_number := public.finance_next_number('payment');

  -- If accounting_status is POSTED, post the clearing journal first so finance_payments (which is immutable) records clearing_journal_id
  if v_accounting_status = 'POSTED' then
    v_jrn_id := public.finance_record_operational_journal(
      'payment',
      v_tx.id,
      'Paynow Provider Clearing Receipt: ' || v_payment_number || ' (' || v_inv.invoice_number || ')',
      v_tx.currency,
      v_actor,
      jsonb_build_array(
        jsonb_build_object('account_id', v_debit_acc, 'debit', v_tx.reported_amount, 'credit', 0, 'description', 'DR Provider Clearing for ' || v_tx.merchant_reference),
        jsonb_build_object('account_id', v_ar_acc, 'debit', 0, 'credit', v_tx.reported_amount, 'description', 'CR Accounts Receivable for ' || v_inv.invoice_number)
      )
    );
  end if;

  insert into public.finance_payments (
    payment_number, customer_id, invoice_id, amount, currency, payment_date,
    method, provider_channel, provider_reference, merchant_reference, transaction_id,
    business_reconciliation, accounting_status, clearing_journal_id,
    idempotency_key, received_by, notes
  )
  values (
    v_payment_number,
    v_inv.customer_id,
    v_inv.id,
    v_tx.reported_amount,
    v_tx.currency,
    (coalesce(v_tx.confirmed_at, now()) at time zone 'Africa/Harare')::date,
    'paynow',
    v_tx.payment_channel,
    coalesce(v_tx.provider_reference, v_tx.merchant_reference),
    v_tx.merchant_reference,
    v_tx.id,
    'COMPLETE',
    v_accounting_status,
    v_jrn_id,
    'paynow-tx-' || v_tx.id::text,
    v_actor,
    'Reconciled from verified Paynow transaction ' || v_tx.merchant_reference
  )
  returning id into v_payment_id;

  v_new_paid := v_inv.amount_paid + v_tx.reported_amount;
  v_new_status := case when v_new_paid >= v_inv.total then 'paid' else 'partially_paid' end;

  update public.finance_invoices
     set amount_paid = v_new_paid,
         balance_due = total - v_new_paid,
         status = v_new_status,
         updated_at = now()
   where id = v_inv.id;

  update public.payment_transactions
     set internal_status = 'RECONCILED',
         reconciliation_status = 'RECONCILED',
         accounting_status = v_accounting_status,
         reconciled_at = now(),
         updated_at = now()
   where id = v_tx.id;

  perform public.payment_record_audit(
    v_actor,
    'system',
    'payment.advertising.reconciled',
    'reconciliation_engine',
    v_tx.id,
    'finance_payments',
    v_payment_id::text,
    jsonb_build_object('invoice_status', v_inv.status, 'balance_due', v_inv.balance_due),
    jsonb_build_object(
      'invoice_status', v_new_status,
      'balance_due', v_inv.total - v_new_paid,
      'payment_number', v_payment_number,
      'business_reconciliation', 'COMPLETE',
      'accounting_status', v_accounting_status,
      'clearing_journal_id', v_jrn_id
    ),
    'Verified Paynow invoice payment reconciled',
    v_tx.provider_reference,
    jsonb_build_object('invoice_id', v_inv.id, 'invoice_number', v_inv.invoice_number)
  );

  return jsonb_build_object(
    'reconciled', true,
    'replayed', false,
    'business_reconciliation', 'COMPLETE',
    'accounting_status', v_accounting_status,
    'clearing_journal_id', v_jrn_id,
    'payment_id', v_payment_id,
    'payment_number', v_payment_number,
    'invoice_id', v_inv.id,
    'invoice_status', v_new_status,
    'balance_due', v_inv.total - v_new_paid
  );
end $$;

-- ---------------------------------------------------------------------------
-- 14. Business Receipt Model (Section 23)
-- ---------------------------------------------------------------------------
create or replace function public.payment_get_business_receipt(p_transaction_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_tx public.payment_transactions%rowtype;
  v_sub public.subscribers%rowtype;
  v_inv public.finance_invoices%rowtype;
  v_cust public.finance_customers%rowtype;
  v_pay public.finance_payments%rowtype;
begin
  select * into v_tx from public.payment_transactions where id = p_transaction_id;
  if v_tx.id is null then
    raise exception using errcode = 'P0002', message = 'Transaction not found';
  end if;

  -- Never fabricate a receipt before payment verification (Section 23)
  if v_tx.verification_authority = 'NO_VERIFICATION_AUTHORITY'
     or v_tx.internal_status not in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING', 'RECONCILED') then
    raise exception using errcode = '22023',
      message = 'Receipt unavailable: Payment has not been verified (current status: ' || v_tx.internal_status || ')';
  end if;

  if v_tx.purpose = 'PREMIUM_SUBSCRIPTION' then
    select * into v_sub from public.subscribers where id = v_tx.subscriber_id;
    return jsonb_build_object(
      'healthtimes_reference', v_tx.merchant_reference,
      'business_purpose', v_tx.purpose,
      'customer_or_subscriber_id', v_tx.subscriber_id,
      'customer_or_subscriber_name', coalesce(v_sub.display_name, v_sub.email, 'Subscriber'),
      'amount', coalesce(v_tx.reported_amount, v_tx.expected_amount),
      'currency', v_tx.currency,
      'payment_date', coalesce(v_tx.confirmed_at, v_tx.updated_at),
      'payment_method', v_tx.provider,
      'payment_channel', v_tx.payment_channel,
      'provider_reference', v_tx.provider_reference,
      'invoice_or_plan_reference', v_tx.plan_key,
      'internal_status', v_tx.internal_status,
      'reconciliation_status', v_tx.reconciliation_status,
      'accounting_status', v_tx.accounting_status
    );
  elsif v_tx.purpose = 'ADVERTISING_INVOICE' then
    select * into v_inv from public.finance_invoices where id = v_tx.invoice_id;
    select * into v_cust from public.finance_customers where id = v_inv.customer_id;
    select * into v_pay from public.finance_payments where transaction_id = v_tx.id;
    return jsonb_build_object(
      'healthtimes_reference', coalesce(v_pay.payment_number, v_tx.merchant_reference),
      'merchant_reference', v_tx.merchant_reference,
      'business_purpose', v_tx.purpose,
      'customer_or_subscriber_id', v_inv.customer_id,
      'customer_or_subscriber_name', coalesce(v_cust.legal_name, 'Commercial Advertiser'),
      'amount', coalesce(v_tx.reported_amount, v_tx.expected_amount),
      'currency', v_tx.currency,
      'payment_date', coalesce(v_tx.confirmed_at, v_tx.updated_at),
      'payment_method', v_tx.provider,
      'payment_channel', v_tx.payment_channel,
      'provider_reference', v_tx.provider_reference,
      'invoice_or_plan_reference', v_inv.invoice_number,
      'internal_status', v_tx.internal_status,
      'reconciliation_status', v_tx.reconciliation_status,
      'accounting_status', v_tx.accounting_status
    );
  else
    raise exception using errcode = '22023', message = 'Connectivity test transactions do not produce business receipts';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 15. Finance Transparency, Daily Control & Month-End Control RPCs (Sections 11, 18, 19, 24, 25)
-- ---------------------------------------------------------------------------
create or replace function public.finance_get_payment_transparency(p_currency text default 'USD')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_ar numeric(18,2);
  v_verified_pending_rec numeric(18,2);
  v_business_reconciled numeric(18,2);
  v_accounting_pending_authority numeric(18,2);
  v_accounting_pending_posting numeric(18,2);
  v_accounting_posted numeric(18,2);
  v_clearing_pending_settlement numeric(18,2);
  v_bank_settlements numeric(18,2);
  v_provider_fees numeric(18,2);
  v_refunds_disputes numeric(18,2);
  v_open_exceptions int;
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.statement.view')) then
    raise exception using errcode = '42501', message = 'finance.view capability required';
  end if;

  -- 1. Accounts Receivable
  select coalesce(sum(balance_due), 0) into v_ar
  from public.finance_invoices
  where currency = p_currency
    and status in ('issued', 'partially_paid', 'overdue')
    and balance_due > 0;

  -- 2. Verified Provider Payments Pending Reconciliation
  select coalesce(sum(coalesce(reported_amount, expected_amount)), 0) into v_verified_pending_rec
  from public.payment_transactions
  where currency = p_currency
    and purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
    and internal_status in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING')
    and reconciliation_status = 'PENDING';

  -- 3. Business Reconciled Total (reconciled provider transactions across Premium & Advertising)
  select coalesce(sum(reported_amount), 0) into v_business_reconciled
  from public.payment_transactions
  where currency = p_currency
    and purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
    and reconciliation_status = 'RECONCILED';

  -- 4. Accounting Pending Authority
  select coalesce(sum(reported_amount), 0) into v_accounting_pending_authority
  from public.payment_transactions
  where currency = p_currency
    and purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
    and reconciliation_status = 'RECONCILED'
    and accounting_status = 'PENDING_ACCOUNTANT_AUTHORITY';

  -- 5. Accounting Pending Posting
  select coalesce(sum(reported_amount), 0) into v_accounting_pending_posting
  from public.payment_transactions
  where currency = p_currency
    and purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
    and reconciliation_status = 'RECONCILED'
    and accounting_status = 'PENDING_POSTING';

  -- 6. Accounting Posted
  select coalesce(sum(reported_amount), 0) into v_accounting_posted
  from public.payment_transactions
  where currency = p_currency
    and purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
    and reconciliation_status = 'RECONCILED'
    and accounting_status = 'POSTED';

  -- 7. Provider Clearing Pending Settlement
  select coalesce(sum(t.reported_amount), 0) into v_clearing_pending_settlement
  from public.payment_transactions t
  where t.currency = p_currency
    and t.provider = 'paynow'
    and t.purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
    and t.reconciliation_status = 'RECONCILED'
    and not exists (
      select 1
      from public.provider_settlement_lines sl
      join public.provider_settlements s on s.id = sl.settlement_id
      where sl.transaction_id = t.id
        and s.status = 'RECONCILED_TO_BANK'
    );

  -- 8. Bank Settled
  select coalesce(sum(net_amount), 0) into v_bank_settlements
  from public.provider_settlements
  where currency = p_currency
    and status = 'RECONCILED_TO_BANK';

  -- 9. Provider Fees
  select coalesce(sum(fee_amount), 0) into v_provider_fees
  from public.provider_settlements
  where currency = p_currency
    and status in ('MATCHED', 'RECONCILED_TO_BANK');

  -- 10. Refunds / Disputes
  select coalesce(sum(amount), 0) into v_refunds_disputes
  from public.payment_reversals
  where currency = p_currency;

  -- 11. Open Payment Exceptions
  select count(*)::int into v_open_exceptions
  from public.payment_exceptions
  where status in ('OPEN', 'IN_REVIEW');

  return jsonb_build_object(
    'currency', p_currency,
    'accounts_receivable', v_ar,
    'verified_provider_payments_pending_reconciliation', v_verified_pending_rec,
    'business_reconciled', v_business_reconciled,
    'accounting_pending_authority', v_accounting_pending_authority,
    'accounting_pending_posting', v_accounting_pending_posting,
    'accounting_posted', v_accounting_posted,
    'provider_clearing_pending_settlement', v_clearing_pending_settlement,
    'bank_settled', v_bank_settlements,
    'bank_settlements', v_bank_settlements,
    'provider_fees', v_provider_fees,
    'refunds_and_disputes', v_refunds_disputes,
    'open_payment_exceptions_count', v_open_exceptions
  );
end $$;

create or replace function public.finance_get_commercial_revenue_transparency(
  p_from_date date default null,
  p_to_date date default null,
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_from date := coalesce(p_from_date, date_trunc('year', current_date)::date);
  v_to date := coalesce(p_to_date, current_date);
  v_premium_rev numeric(18,2);
  v_direct_ad_rev numeric(18,2);
  v_adsense_rev numeric(18,2);
  v_other_rev numeric(18,2);
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.statement.view')) then
    raise exception using errcode = '42501', message = 'finance.view capability required';
  end if;

  select coalesce(sum(amount), 0) into v_premium_rev
  from public.premium_entitlement_reconciliations
  where currency = p_currency
    and (reconciled_at at time zone 'Africa/Harare')::date between v_from and v_to;

  select coalesce(sum(amount), 0) into v_direct_ad_rev
  from public.finance_payments
  where currency = p_currency
    and payment_date between v_from and v_to;

  select coalesce(sum(ad_revenue), 0) into v_adsense_rev
  from public.analytics_daily_metrics
  where source_system = 'google_adsense'
    and metric_date between v_from and v_to;

  select coalesce(sum(l.credit - l.debit), 0) into v_other_rev
  from public.finance_chart_of_accounts a
  join public.finance_journal_lines l on l.account_id = a.id
  join public.finance_journal_entries e on e.id = l.entry_id
  where a.account_code = '4200'
    and e.status = 'posted'
    and e.currency = p_currency
    and e.entry_date between v_from and v_to;

  return jsonb_build_object(
    'from_date', v_from,
    'to_date', v_to,
    'currency', p_currency,
    'premium_revenue', v_premium_rev,
    'direct_advertising_revenue', v_direct_ad_rev,
    'adsense_revenue', v_adsense_rev,
    'other_commercial_revenue', v_other_rev
  );
end $$;

create or replace function public.finance_get_daily_clearing_control(
  p_control_date date default current_date,
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_opening numeric(18,2);
  v_collections numeric(18,2);
  v_settlements numeric(18,2);
  v_fees numeric(18,2);
  v_refunds numeric(18,2);
  v_closing numeric(18,2);
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.statement.view')) then
    raise exception using errcode = '42501', message = 'finance.view capability required';
  end if;

  select
    coalesce((
      select sum(reported_amount)
      from public.payment_transactions
      where provider = 'paynow'
        and currency = p_currency
        and purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
        and internal_status in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING', 'RECONCILED')
        and (confirmed_at at time zone 'Africa/Harare')::date < p_control_date
    ), 0)
    - coalesce((
      select sum(net_amount + fee_amount)
      from public.provider_settlements
      where provider = 'paynow'
        and currency = p_currency
        and status = 'RECONCILED_TO_BANK'
        and settlement_date < p_control_date
    ), 0)
    - coalesce((
      select sum(amount)
      from public.payment_reversals
      where currency = p_currency
        and workflow_state in ('REFUND_CONFIRMED', 'REVERSAL_REQUIRED')
        and (opened_at at time zone 'Africa/Harare')::date < p_control_date
    ), 0)
  into v_opening;

  select coalesce(sum(reported_amount), 0) into v_collections
  from public.payment_transactions
  where provider = 'paynow'
    and currency = p_currency
    and purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
    and internal_status in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING', 'RECONCILED')
    and (confirmed_at at time zone 'Africa/Harare')::date = p_control_date;

  select coalesce(sum(net_amount), 0), coalesce(sum(fee_amount), 0)
  into v_settlements, v_fees
  from public.provider_settlements
  where provider = 'paynow'
    and currency = p_currency
    and status = 'RECONCILED_TO_BANK'
    and settlement_date = p_control_date;

  select coalesce(sum(amount), 0) into v_refunds
  from public.payment_reversals
  where currency = p_currency
    and workflow_state in ('REFUND_CONFIRMED', 'REVERSAL_REQUIRED')
    and (opened_at at time zone 'Africa/Harare')::date = p_control_date;

  v_closing := v_opening + v_collections - v_settlements - v_fees - v_refunds;

  return jsonb_build_object(
    'control_date', p_control_date,
    'currency', p_currency,
    'opening_provider_clearing', v_opening,
    'verified_provider_collections', v_collections,
    'settlements_to_bank', v_settlements,
    'provider_fees', v_fees,
    'refunds_and_reversals', v_refunds,
    'closing_provider_clearing', v_closing
  );
end $$;

create or replace function public.finance_get_month_end_payment_control(
  p_year int default null,
  p_month int default null,
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_year int := coalesce(p_year, extract(year from current_date)::int);
  v_month int := coalesce(p_month, extract(month from current_date)::int);
  v_start date := make_date(v_year, v_month, 1);
  v_end date := (v_start + interval '1 month' - interval '1 day')::date;
  v_transparency jsonb;
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.statement.view')) then
    raise exception using errcode = '42501', message = 'finance.view capability required';
  end if;

  v_transparency := public.finance_get_payment_transparency(p_currency);

  return jsonb_build_object(
    'period_start', v_start,
    'period_end', v_end,
    'currency', p_currency,
    'provider_collections', coalesce((
      select sum(reported_amount)
      from public.payment_transactions
      where provider = 'paynow'
        and currency = p_currency
        and purpose in ('PREMIUM_SUBSCRIPTION', 'ADVERTISING_INVOICE')
        and internal_status in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING', 'RECONCILED')
        and (confirmed_at at time zone 'Africa/Harare')::date between v_start and v_end
    ), 0),
    'provider_settlements', coalesce((
      select sum(net_amount)
      from public.provider_settlements
      where provider = 'paynow'
        and currency = p_currency
        and status = 'RECONCILED_TO_BANK'
        and settlement_date between v_start and v_end
    ), 0),
    'provider_fees', coalesce((
      select sum(fee_amount)
      from public.provider_settlements
      where provider = 'paynow'
        and currency = p_currency
        and status in ('MATCHED', 'RECONCILED_TO_BANK')
        and settlement_date between v_start and v_end
    ), 0),
    'outstanding_clearing', (v_transparency ->> 'provider_clearing_pending_settlement')::numeric,
    'outstanding_ar', (v_transparency ->> 'accounts_receivable')::numeric,
    'refunds', coalesce((
      select sum(amount)
      from public.payment_reversals
      where currency = p_currency
        and reversal_type = 'REFUND'
        and (opened_at at time zone 'Africa/Harare')::date between v_start and v_end
    ), 0),
    'disputes', coalesce((
      select sum(amount)
      from public.payment_reversals
      where currency = p_currency
        and reversal_type = 'DISPUTE'
        and (opened_at at time zone 'Africa/Harare')::date between v_start and v_end
    ), 0),
    'premium_receipts', coalesce((
      select sum(amount)
      from public.premium_entitlement_reconciliations
      where currency = p_currency
        and (reconciled_at at time zone 'Africa/Harare')::date between v_start and v_end
    ), 0),
    'advertising_receipts', coalesce((
      select sum(amount)
      from public.finance_payments
      where currency = p_currency
        and method = 'paynow'
        and payment_date between v_start and v_end
    ), 0),
    'bank_transfer_receipts', coalesce((
      select sum(amount)
      from public.finance_payments
      where currency = p_currency
        and method = 'bank_transfer'
        and payment_date between v_start and v_end
    ), 0)
  );
end $$;

-- ---------------------------------------------------------------------------
-- 16. Privilege Grants
-- ---------------------------------------------------------------------------
revoke all on function public.payment_generate_ulid(timestamptz) from public, anon, authenticated;
grant execute on function public.payment_generate_ulid(timestamptz) to service_role;

revoke all on function public.payment_generate_merchant_reference(text) from public, anon, authenticated;
grant execute on function public.payment_generate_merchant_reference(text) to service_role;

revoke all on function public.payment_record_audit(uuid, text, text, text, uuid, text, text, jsonb, jsonb, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.payment_record_audit(uuid, text, text, text, uuid, text, text, jsonb, jsonb, text, text, jsonb) to service_role;

revoke all on function public.payment_open_exception(text, text, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.payment_open_exception(text, text, uuid, uuid, text, text, jsonb) to service_role;

revoke all on function public.payment_create_intent(text, text, uuid, uuid, text, numeric, text) from public, anon, authenticated;
grant execute on function public.payment_create_intent(text, text, uuid, uuid, text, numeric, text) to service_role;

revoke all on function public.payment_reconcile_premium_transaction(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.payment_reconcile_premium_transaction(uuid, timestamptz) to service_role;

revoke all on function public.payment_reconcile_advertising_invoice(uuid, uuid) from public, anon, authenticated;
grant execute on function public.payment_reconcile_advertising_invoice(uuid, uuid) to service_role;

revoke all on function public.payment_get_business_receipt(uuid) from public, anon;
grant execute on function public.payment_get_business_receipt(uuid) to authenticated, service_role;

revoke all on function public.finance_get_payment_transparency(text) from public, anon;
grant execute on function public.finance_get_payment_transparency(text) to authenticated, service_role;

revoke all on function public.finance_get_commercial_revenue_transparency(date, date, text) from public, anon;
grant execute on function public.finance_get_commercial_revenue_transparency(date, date, text) to authenticated, service_role;

revoke all on function public.finance_get_daily_clearing_control(date, text) from public, anon;
grant execute on function public.finance_get_daily_clearing_control(date, text) to authenticated, service_role;

revoke all on function public.finance_get_month_end_payment_control(int, int, text) from public, anon;
grant execute on function public.finance_get_month_end_payment_control(int, int, text) to authenticated, service_role;
