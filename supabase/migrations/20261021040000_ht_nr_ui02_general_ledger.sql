-- ============================================================================
-- Migration: 20261021040000_ht_nr_ui02_general_ledger.sql
-- Programme: HealthTimes Newsroom OS (HT-NR-UI-02)
-- Description: Complete General Ledger, Double-Entry Enforcement & Statements
-- ============================================================================

-- 1. Extend sequence numbering generator for journals and credit notes
alter table public.finance_number_counters drop constraint if exists finance_number_counters_doc_type_check;
alter table public.finance_number_counters add constraint finance_number_counters_doc_type_check
  check (doc_type in ('invoice', 'payment', 'expense', 'order', 'journal', 'credit_note'));

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

-- 2. Chart of Accounts Table
create table if not exists public.finance_chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique,
  account_name text not null,
  account_type text not null check (account_type in ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  description text,
  is_active boolean not null default true,
  currency text default 'USD',
  created_at timestamptz not null default now()
);

-- Seed Canonical Chart of Accounts
insert into public.finance_chart_of_accounts (account_code, account_name, account_type, description)
values
  ('1000', 'Cash & Bank Clearing', 'ASSET', 'Cash on hand and liquid bank operating accounts'),
  ('1200', 'Accounts Receivable (Trade)', 'ASSET', 'Trade receivables from commercial advertising clients'),
  ('2000', 'Accounts Payable & Accrued Expenses', 'LIABILITY', 'Editorial, reporting and operational expenses payable'),
  ('2100', 'Tax & Statutory Payable', 'LIABILITY', 'Sales, VAT, and regulatory taxes collected/payable'),
  ('3000', 'Owner Equity & Retained Earnings', 'EQUITY', 'Accumulated operating surplus and founder capital'),
  ('4000', 'Commercial Advertising Revenue', 'REVENUE', 'Print, web, newsletter and digital advertising revenue'),
  ('4100', 'Reader Premium Subscription Revenue', 'REVENUE', 'Direct reader memberships and premium digital access'),
  ('4200', 'Sponsorship & Grants Revenue', 'REVENUE', 'Institutional health journalism sponsorships and grants'),
  ('5000', 'Newsroom Reporting & Content Expenses', 'EXPENSE', 'Direct newsgathering, journalism production, and freelance fees'),
  ('5100', 'Travel & Fieldwork Expenses', 'EXPENSE', 'Provincial and regional investigative travel and per diems'),
  ('5200', 'Technology, Hosting & Edge Infrastructure', 'EXPENSE', 'Cloud compute, edge databases, domains, and telephony APIs'),
  ('5300', 'Audience Growth & Distribution Expenses', 'EXPENSE', 'WhatsApp messaging, newsletter transport, and social distribution'),
  ('5400', 'Administrative & Professional Services', 'EXPENSE', 'Legal, accounting, compliance, and corporate operating expenses')
on conflict (account_code) do update set
  account_name = excluded.account_name,
  account_type = excluded.account_type,
  description = excluded.description;

-- 3. Fiscal Periods Table
create table if not exists public.finance_fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  period_name text not null unique,
  start_date date not null,
  end_date date not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'LOCKED')),
  locked_at timestamptz,
  locked_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- Seed standard fiscal periods for 2026
insert into public.finance_fiscal_periods (period_name, start_date, end_date, status)
values
  ('2026-Q1', '2026-01-01', '2026-03-31', 'CLOSED'),
  ('2026-Q2', '2026-04-01', '2026-06-30', 'CLOSED'),
  ('2026-Q3', '2026-07-01', '2026-09-30', 'CLOSED'),
  ('2026-Q4', '2026-10-01', '2026-12-31', 'OPEN'),
  ('2026-Annual', '2026-01-01', '2026-12-31', 'OPEN')
on conflict (period_name) do nothing;

-- 4. Journal Entries Table
create table if not exists public.finance_journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_number text not null unique,
  entry_date date not null default current_date,
  period_id uuid references public.finance_fiscal_periods(id),
  status text not null default 'draft' check (status in ('draft', 'posted', 'reversed')),
  source text not null check (source in ('invoice', 'payment', 'expense', 'expense_payment', 'credit_note', 'manual')),
  source_id uuid,
  currency text not null default 'USD',
  fx_rate numeric(16,6) not null default 1.0 check (fx_rate > 0),
  memo text not null,
  posted_at timestamptz,
  posted_by uuid references public.staff_profiles(id),
  reversed_entry_id uuid references public.finance_journal_entries(id),
  created_at timestamptz not null default now(),
  created_by uuid references public.staff_profiles(id)
);

-- 5. Journal Lines Table
create table if not exists public.finance_journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.finance_journal_entries(id) on delete cascade,
  line_number int not null,
  account_id uuid not null references public.finance_chart_of_accounts(id),
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  description text,
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create index if not exists idx_journal_lines_entry on public.finance_journal_lines(entry_id);
create index if not exists idx_journal_lines_account on public.finance_journal_lines(account_id);
create index if not exists idx_journal_entries_date on public.finance_journal_entries(entry_date);
create index if not exists idx_journal_entries_period on public.finance_journal_entries(period_id);

-- 6. Credit Notes Table
create table if not exists public.finance_credit_notes (
  id uuid primary key default gen_random_uuid(),
  credit_note_number text not null unique,
  customer_id uuid not null references public.finance_customers(id),
  invoice_id uuid not null references public.finance_invoices(id),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD',
  reason text not null,
  status text not null default 'issued' check (status in ('draft', 'issued', 'void')),
  issued_at timestamptz not null default now(),
  issued_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now()
);

-- 7. Exchange Rates Table
create table if not exists public.finance_exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric(16,6) not null check (rate > 0),
  effective_at timestamptz not null default now(),
  source text not null default 'manual',
  created_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  unique (base_currency, quote_currency, effective_at)
);

-- Seed authoritative USD / ZiG baseline rates
insert into public.finance_exchange_rates (base_currency, quote_currency, rate, effective_at, source)
values
  ('USD', 'ZiG', 26.850000, now(), 'Reserve Bank of Zimbabwe Interbank Baseline'),
  ('ZiG', 'USD', 0.037244, now(), 'Reserve Bank of Zimbabwe Interbank Baseline')
on conflict do nothing;

-- 8. Double-Entry Balance & Locked Period Enforcement Triggers
create or replace function public.finance_check_journal_balance_and_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_status text;
  v_tot_debit numeric;
  v_tot_credit numeric;
begin
  if new.status = 'posted' and (old is null or old.status <> 'posted') then
    -- 1. Check Fiscal Period
    if new.period_id is not null then
      select status into v_period_status from public.finance_fiscal_periods where id = new.period_id;
      if v_period_status = 'LOCKED' then
        raise exception using errcode = '42501', message = 'Cannot post journal into a LOCKED fiscal period';
      end if;
    end if;

    -- 2. Verify Double-Entry Balance: SUM(debit) = SUM(credit) > 0
    select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into v_tot_debit, v_tot_credit
    from public.finance_journal_lines
    where entry_id = new.id;

    if v_tot_debit <= 0 or abs(v_tot_debit - v_tot_credit) > 0.001 then
      raise exception using errcode = '22023',
        message = 'Double-entry balance check failed: Debits (' || v_tot_debit::text || ') must equal Credits (' || v_tot_credit::text || ') for posted journal';
    end if;

    new.posted_at := coalesce(new.posted_at, now());
  end if;

  return new;
end $$;

drop trigger if exists trg_verify_journal_balance on public.finance_journal_entries;
create trigger trg_verify_journal_balance
  before update on public.finance_journal_entries
  for each row execute function public.finance_check_journal_balance_and_period();

-- 9. Immutable Posted Journal Lines Trigger
create or replace function public.finance_immutable_posted_journal_lines()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_status text;
  v_entry_id uuid;
begin
  v_entry_id := coalesce(new.entry_id, old.entry_id);
  select status into v_entry_status from public.finance_journal_entries where id = v_entry_id;
  if v_entry_status = 'posted' then
    raise exception using errcode = '42501',
      message = 'Posted journal lines are strictly immutable. Create a reversal journal entry instead.';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_immutable_journal_lines on public.finance_journal_lines;
create trigger trg_immutable_journal_lines
  before insert or update or delete on public.finance_journal_lines
  for each row execute function public.finance_immutable_posted_journal_lines();

-- 10. Helper function to record and post operational journal entries
create or replace function public.finance_record_operational_journal(
  p_source text,
  p_source_id uuid,
  p_memo text,
  p_currency text,
  p_actor uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_entry_id uuid;
  v_number text;
  v_period_id uuid;
  v_line jsonb;
  v_pos int := 0;
  v_acc_id uuid;
  v_deb numeric;
  v_cred numeric;
begin
  -- Resolve active fiscal period
  select id into v_period_id
  from public.finance_fiscal_periods
  where current_date between start_date and end_date and status = 'OPEN'
  order by (end_date - start_date) asc
  limit 1;

  v_number := public.finance_next_number('journal');

  insert into public.finance_journal_entries (
    entry_number, entry_date, period_id, status, source, source_id, currency, memo, created_by
  )
  values (
    v_number, current_date, v_period_id, 'draft', p_source, p_source_id, p_currency, p_memo, p_actor
  )
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_pos := v_pos + 1;
    v_acc_id := (v_line->>'account_id')::uuid;
    v_deb := round(coalesce((v_line->>'debit')::numeric, 0), 2);
    v_cred := round(coalesce((v_line->>'credit')::numeric, 0), 2);

    insert into public.finance_journal_lines (
      entry_id, line_number, account_id, debit, credit, description
    )
    values (
      v_entry_id, v_pos, v_acc_id, v_deb, v_cred, trim(coalesce(v_line->>'description', ''))
    );
  end loop;

  -- Post the entry (will trigger double-entry validation)
  update public.finance_journal_entries
  set status = 'posted', posted_at = now(), posted_by = p_actor
  where id = v_entry_id;

  return v_entry_id;
end $$;

-- 11. Connect Operational Finance Events to General Ledger
-- A. Update finance_issue_invoice to post journal (DR 1200 AR, CR 4000 Revenue, CR 2100 Tax)
create or replace function public.finance_issue_invoice(p_invoice_id uuid, p_issue_date date default null, p_due_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.invoice.create');
  i public.finance_invoices%rowtype;
  v_issue date := coalesce(p_issue_date, (now() at time zone 'Africa/Harare')::date);
  v_due date := coalesce(p_due_date, v_issue + 30);
  v_ar_acc uuid;
  v_rev_acc uuid;
  v_tax_acc uuid;
  v_lines jsonb;
  v_jrn_id uuid;
begin
  select * into i from public.finance_invoices where id = p_invoice_id for update;
  if i.id is null then raise exception using errcode='P0002', message='Invoice not found'; end if;
  if i.status <> 'approved' then
    raise exception using errcode='22023', message='Only approved invoices can be issued (current status: ' || i.status || ')';
  end if;
  if v_due < v_issue then raise exception using errcode='22023', message='Due date cannot precede issue date'; end if;

  update public.finance_invoices
     set status='issued', issue_date=v_issue, due_date=v_due, issued_by=v_actor, issued_at=now(), updated_at=now()
   where id = i.id;

  -- Post General Ledger Journal: DR 1200 AR, CR 4000 Revenue, CR 2100 Tax
  select id into v_ar_acc from public.finance_chart_of_accounts where account_code = '1200';
  select id into v_rev_acc from public.finance_chart_of_accounts where account_code = '4000';
  select id into v_tax_acc from public.finance_chart_of_accounts where account_code = '2100';

  if v_ar_acc is not null and v_rev_acc is not null and i.total > 0 then
    if coalesce(i.tax_total, 0) > 0 and v_tax_acc is not null then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_id', v_ar_acc, 'debit', i.total, 'credit', 0, 'description', 'Accounts Receivable for ' || i.invoice_number),
        jsonb_build_object('account_id', v_rev_acc, 'debit', 0, 'credit', i.subtotal, 'description', 'Commercial Advertising Revenue for ' || i.invoice_number),
        jsonb_build_object('account_id', v_tax_acc, 'debit', 0, 'credit', i.tax_total, 'description', 'Statutory Tax Payable for ' || i.invoice_number)
      );
    else
      v_lines := jsonb_build_array(
        jsonb_build_object('account_id', v_ar_acc, 'debit', i.total, 'credit', 0, 'description', 'Accounts Receivable for ' || i.invoice_number),
        jsonb_build_object('account_id', v_rev_acc, 'debit', 0, 'credit', i.total, 'description', 'Commercial Advertising Revenue for ' || i.invoice_number)
      );
    end if;

    v_jrn_id := public.finance_record_operational_journal(
      'invoice', i.id, 'Invoice Issued: ' || i.invoice_number, i.currency, v_actor, v_lines
    );
  end if;

  perform public.finance_audit(v_actor,'finance.invoice.issued','finance_invoices',i.id,
    jsonb_build_object('invoice_number', i.invoice_number, 'due_date', v_due, 'journal_id', v_jrn_id));
  return jsonb_build_object('id', i.id, 'status', 'issued', 'issue_date', v_issue, 'due_date', v_due, 'journal_id', v_jrn_id);
end $$;

-- B. Update finance_record_payment to post journal (DR 1000 Cash, CR 1200 AR)
drop function if exists public.finance_record_payment(uuid, numeric, text, date, text, text, text, text);
create or replace function public.finance_record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_currency text,
  p_payment_date date,
  p_method text,
  p_provider_reference text default null,
  p_notes text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.payment.record');
  i public.finance_invoices%rowtype;
  v_existing public.finance_payments%rowtype;
  v_id uuid;
  v_number text;
  v_amount numeric := round(p_amount, 2);
  v_new_paid numeric;
  v_cash_acc uuid;
  v_ar_acc uuid;
  v_lines jsonb;
  v_jrn_id uuid;
begin
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select * into v_existing from public.finance_payments where idempotency_key = trim(p_idempotency_key);
    if v_existing.id is not null then
      return jsonb_build_object('id', v_existing.id, 'payment_number', v_existing.payment_number, 'replayed', true);
    end if;
  end if;

  select * into i from public.finance_invoices where id = p_invoice_id for update;
  if i.id is null then raise exception using errcode='P0002', message='Invoice not found'; end if;
  if i.status in ('draft', 'void', 'cancelled') then
    raise exception using errcode='22023', message='Cannot record payment against invoice in status: ' || i.status;
  end if;
  if v_amount <= 0 then raise exception using errcode='22023', message='Payment amount must be positive'; end if;
  if v_amount > i.balance_due then
    raise exception using errcode='22023', message='Payment amount (' || v_amount::text || ') exceeds remaining balance due (' || i.balance_due::text || ')';
  end if;
  perform public.finance_check_currency(p_currency);
  if p_currency <> i.currency then
    raise exception using errcode='22023', message='Payment currency must match invoice currency (' || i.currency || ')';
  end if;

  v_number := public.finance_next_number('payment');
  insert into public.finance_payments(payment_number, customer_id, invoice_id, amount, currency, payment_date,
    method, provider_reference, idempotency_key, received_by, notes)
  values (v_number, i.customer_id, i.id, v_amount, p_currency, p_payment_date, p_method,
    nullif(trim(p_provider_reference),''), trim(p_idempotency_key), v_actor, p_notes)
  returning id into v_id;

  v_new_paid := i.amount_paid + v_amount;
  update public.finance_invoices
     set amount_paid = v_new_paid, balance_due = total - v_new_paid,
         status = case when v_new_paid >= total then 'paid' else 'partially_paid' end,
         updated_at = now()
   where id = i.id;

  -- Post General Ledger Journal: DR 1000 Cash/Bank, CR 1200 AR
  select id into v_cash_acc from public.finance_chart_of_accounts where account_code = '1000';
  select id into v_ar_acc from public.finance_chart_of_accounts where account_code = '1200';

  if v_cash_acc is not null and v_ar_acc is not null then
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_cash_acc, 'debit', v_amount, 'credit', 0, 'description', 'Cash receipt ' || v_number || ' for ' || i.invoice_number),
      jsonb_build_object('account_id', v_ar_acc, 'debit', 0, 'credit', v_amount, 'description', 'Clear AR via ' || v_number)
    );
    v_jrn_id := public.finance_record_operational_journal(
      'payment', v_id, 'Customer Payment: ' || v_number || ' (' || i.invoice_number || ')', p_currency, v_actor, v_lines
    );
  end if;

  perform public.finance_audit(v_actor,'finance.payment.recorded','finance_payments',v_id,
    jsonb_build_object('payment_number', v_number, 'invoice_number', i.invoice_number, 'amount', v_amount, 'currency', p_currency, 'journal_id', v_jrn_id));
  return jsonb_build_object('id', v_id, 'payment_number', v_number, 'replayed', false,
    'invoice_status', case when v_new_paid >= i.total then 'paid' else 'partially_paid' end, 'journal_id', v_jrn_id);
end $$;

-- C. Update finance_approve_expense to post journal (DR Expense 5000-5400, CR 2000 AP)
create or replace function public.finance_approve_expense(p_expense_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.expense.approve');
  e public.finance_expenses%rowtype;
  v_exp_acc_code text;
  v_exp_acc uuid;
  v_ap_acc uuid;
  v_lines jsonb;
  v_jrn_id uuid;
begin
  select * into e from public.finance_expenses where id = p_expense_id for update;
  if e.id is null then raise exception using errcode='P0002', message='Expense not found'; end if;
  if e.status <> 'submitted' then
    raise exception using errcode='22023', message='Only submitted expenses can be approved';
  end if;
  if e.submitted_by = v_actor then
    raise exception using errcode='42501', message='Expense submitter cannot approve their own expense claim';
  end if;

  update public.finance_expenses
     set status = 'approved', approved_by = v_actor, approved_at = now(), updated_at = now()
   where id = e.id;

  -- Map expense category to chart of accounts
  v_exp_acc_code := case e.category
    when 'reporting' then '5000'
    when 'travel' then '5100'
    when 'technology' then '5200'
    when 'production' then '5200'
    when 'marketing' then '5300'
    else '5400' end;

  select id into v_exp_acc from public.finance_chart_of_accounts where account_code = v_exp_acc_code;
  select id into v_ap_acc from public.finance_chart_of_accounts where account_code = '2000';

  if v_exp_acc is not null and v_ap_acc is not null and e.amount > 0 then
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_exp_acc, 'debit', e.amount, 'credit', 0, 'description', 'Approved expense ' || e.expense_number || ' (' || e.category || ')'),
      jsonb_build_object('account_id', v_ap_acc, 'debit', 0, 'credit', e.amount, 'description', 'Accrued payable for ' || e.expense_number)
    );
    v_jrn_id := public.finance_record_operational_journal(
      'expense', e.id, 'Expense Approved: ' || e.expense_number, e.currency, v_actor, v_lines
    );
  end if;

  perform public.finance_audit(v_actor,'finance.expense.approved','finance_expenses',e.id,
    jsonb_build_object('expense_number', e.expense_number, 'amount', e.amount, 'journal_id', v_jrn_id));
  return jsonb_build_object('id', e.id, 'status', 'approved', 'journal_id', v_jrn_id);
end $$;

-- D. Update finance_pay_expense to post journal (DR 2000 AP, CR 1000 Cash)
create or replace function public.finance_pay_expense(p_expense_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.expense.pay');
  e public.finance_expenses%rowtype;
  v_ap_acc uuid;
  v_cash_acc uuid;
  v_lines jsonb;
  v_jrn_id uuid;
begin
  select * into e from public.finance_expenses where id = p_expense_id for update;
  if e.id is null then raise exception using errcode='P0002', message='Expense not found'; end if;
  if e.status <> 'approved' then
    raise exception using errcode='22023', message='Only approved expenses can be paid';
  end if;
  if e.payment_status = 'paid' then
    raise exception using errcode='22023', message='Expense has already been marked paid';
  end if;

  update public.finance_expenses
     set payment_status = 'paid', paid_at = now(), updated_at = now()
   where id = e.id;

  select id into v_ap_acc from public.finance_chart_of_accounts where account_code = '2000';
  select id into v_cash_acc from public.finance_chart_of_accounts where account_code = '1000';

  if v_ap_acc is not null and v_cash_acc is not null and e.amount > 0 then
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_ap_acc, 'debit', e.amount, 'credit', 0, 'description', 'Clear payable for ' || e.expense_number),
      jsonb_build_object('account_id', v_cash_acc, 'debit', 0, 'credit', e.amount, 'description', 'Cash disbursement for ' || e.expense_number)
    );
    v_jrn_id := public.finance_record_operational_journal(
      'expense_payment', e.id, 'Expense Disbursed: ' || e.expense_number, e.currency, v_actor, v_lines
    );
  end if;

  perform public.finance_audit(v_actor,'finance.expense.paid','finance_expenses',e.id,
    jsonb_build_object('expense_number', e.expense_number, 'journal_id', v_jrn_id));
  return jsonb_build_object('id', e.id, 'payment_status', 'paid', 'journal_id', v_jrn_id);
end $$;

-- 12. Credit Note RPC (Issue Credit Note & Reverse Revenue/AR)
create or replace function public.finance_create_credit_note(
  p_invoice_id uuid,
  p_amount numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.invoice.approve');
  i public.finance_invoices%rowtype;
  v_amount numeric := round(p_amount, 2);
  v_crn_id uuid;
  v_number text;
  v_rev_acc uuid;
  v_ar_acc uuid;
  v_lines jsonb;
  v_jrn_id uuid;
begin
  select * into i from public.finance_invoices where id = p_invoice_id for update;
  if i.id is null then raise exception using errcode='P0002', message='Invoice not found'; end if;
  if i.status in ('draft', 'void', 'cancelled') then
    raise exception using errcode='22023', message='Cannot issue credit note against invoice in status: ' || i.status;
  end if;
  if v_amount <= 0 then raise exception using errcode='22023', message='Credit note amount must be positive'; end if;
  if v_amount > i.total then raise exception using errcode='22023', message='Credit note amount cannot exceed invoice total'; end if;

  v_number := public.finance_next_number('credit_note');

  insert into public.finance_credit_notes (
    credit_note_number, customer_id, invoice_id, amount, currency, reason, status, issued_at, issued_by
  )
  values (
    v_number, i.customer_id, i.id, v_amount, i.currency, trim(p_reason), 'issued', now(), v_actor
  )
  returning id into v_crn_id;

  -- Post Journal: DR 4000 Revenue, CR 1200 AR
  select id into v_rev_acc from public.finance_chart_of_accounts where account_code = '4000';
  select id into v_ar_acc from public.finance_chart_of_accounts where account_code = '1200';

  if v_rev_acc is not null and v_ar_acc is not null then
    v_lines := jsonb_build_array(
      jsonb_build_object('account_id', v_rev_acc, 'debit', v_amount, 'credit', 0, 'description', 'Credit adjustment via ' || v_number || ' for ' || i.invoice_number),
      jsonb_build_object('account_id', v_ar_acc, 'debit', 0, 'credit', v_amount, 'description', 'Reduce AR via ' || v_number)
    );
    v_jrn_id := public.finance_record_operational_journal(
      'credit_note', v_crn_id, 'Credit Note Issued: ' || v_number, i.currency, v_actor, v_lines
    );
  end if;

  perform public.finance_audit(v_actor, 'finance.credit_note.issued', 'finance_credit_notes', v_crn_id,
    jsonb_build_object('credit_note_number', v_number, 'invoice_number', i.invoice_number, 'amount', v_amount, 'journal_id', v_jrn_id));

  return jsonb_build_object('id', v_crn_id, 'credit_note_number', v_number, 'amount', v_amount, 'journal_id', v_jrn_id);
end $$;

-- 13. Reverse Journal Entry RPC (Immutability Preserved)
create or replace function public.finance_reverse_journal_entry(
  p_entry_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.statement.view');
  orig public.finance_journal_entries%rowtype;
  v_rev_id uuid;
  v_number text;
  v_period_id uuid;
  v_lines jsonb;
begin
  select * into orig from public.finance_journal_entries where id = p_entry_id for update;
  if orig.id is null then raise exception using errcode='P0002', message='Journal entry not found'; end if;
  if orig.status <> 'posted' then
    raise exception using errcode='22023', message='Only posted journal entries can be reversed';
  end if;

  -- Build reversed lines (switch debit and credit)
  select jsonb_agg(
    jsonb_build_object(
      'account_id', account_id,
      'debit', credit,
      'credit', debit,
      'description', 'Reversal of ' || orig.entry_number || ': ' || coalesce(description, '')
    ) order by line_number asc
  ) into v_lines
  from public.finance_journal_lines
  where entry_id = orig.id;

  v_rev_id := public.finance_record_operational_journal(
    'manual', orig.id, 'REVERSAL: ' || orig.entry_number || ' - ' || trim(p_reason), orig.currency, v_actor, v_lines
  );

  update public.finance_journal_entries
     set status = 'reversed', reversed_entry_id = v_rev_id
   where id = orig.id;

  update public.finance_journal_entries
     set reversed_entry_id = orig.id
   where id = v_rev_id;

  perform public.finance_audit(v_actor, 'finance.journal.reversed', 'finance_journal_entries', orig.id,
    jsonb_build_object('original_number', orig.entry_number, 'reversal_id', v_rev_id, 'reason', trim(p_reason)));

  return jsonb_build_object('id', orig.id, 'status', 'reversed', 'reversal_entry_id', v_rev_id);
end $$;

-- 14. Accounting Statements RPCs
-- A. Trial Balance RPC
create or replace function public.finance_get_trial_balance(
  p_period_id uuid default null,
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.statement.view');
  v_res jsonb;
  v_tot_deb numeric := 0;
  v_tot_cred numeric := 0;
begin
  select
    coalesce(jsonb_agg(to_jsonb(r) order by r.account_code asc), '[]'::jsonb),
    coalesce(sum(r.debit_total), 0),
    coalesce(sum(r.credit_total), 0)
  into v_res, v_tot_deb, v_tot_cred
  from (
    select
      a.id as account_id,
      a.account_code,
      a.account_name,
      a.account_type,
      coalesce(sum(l.debit), 0) as debit_total,
      coalesce(sum(l.credit), 0) as credit_total,
      case
        when a.account_type in ('ASSET', 'EXPENSE') then coalesce(sum(l.debit), 0) - coalesce(sum(l.credit), 0)
        else coalesce(sum(l.credit), 0) - coalesce(sum(l.debit), 0)
      end as net_balance
    from public.finance_chart_of_accounts a
    left join public.finance_journal_lines l on l.account_id = a.id
    left join public.finance_journal_entries e on e.id = l.entry_id
      and e.status = 'posted'
      and e.currency = p_currency
      and (p_period_id is null or e.period_id = p_period_id)
    group by a.id, a.account_code, a.account_name, a.account_type
  ) r;

  return jsonb_build_object(
    'period_id', p_period_id,
    'currency', p_currency,
    'accounts', v_res,
    'total_debits', v_tot_deb,
    'total_credits', v_tot_cred,
    'is_balanced', (abs(v_tot_deb - v_tot_cred) < 0.001)
  );
end $$;

-- B. Profit and Loss Statement RPC (Income Statement from posted journals)
create or replace function public.finance_get_profit_and_loss(
  p_from_date date default null,
  p_to_date date default null,
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.statement.view');
  v_from date := coalesce(p_from_date, (date_trunc('year', current_date))::date);
  v_to date := coalesce(p_to_date, current_date);
  v_rev_lines jsonb;
  v_exp_lines jsonb;
  v_tot_rev numeric := 0;
  v_tot_exp numeric := 0;
begin
  -- Revenues (Account Type = REVENUE)
  select
    coalesce(jsonb_agg(to_jsonb(r) order by r.account_code), '[]'::jsonb),
    coalesce(sum(r.amount), 0)
  into v_rev_lines, v_tot_rev
  from (
    select
      a.account_code,
      a.account_name,
      coalesce(sum(l.credit - l.debit), 0) as amount
    from public.finance_chart_of_accounts a
    join public.finance_journal_lines l on l.account_id = a.id
    join public.finance_journal_entries e on e.id = l.entry_id
    where a.account_type = 'REVENUE'
      and e.status = 'posted'
      and e.currency = p_currency
      and e.entry_date between v_from and v_to
    group by a.account_code, a.account_name
  ) r;

  -- Expenses (Account Type = EXPENSE)
  select
    coalesce(jsonb_agg(to_jsonb(e_row) order by e_row.account_code), '[]'::jsonb),
    coalesce(sum(e_row.amount), 0)
  into v_exp_lines, v_tot_exp
  from (
    select
      a.account_code,
      a.account_name,
      coalesce(sum(l.debit - l.credit), 0) as amount
    from public.finance_chart_of_accounts a
    join public.finance_journal_lines l on l.account_id = a.id
    join public.finance_journal_entries e on e.id = l.entry_id
    where a.account_type = 'EXPENSE'
      and e.status = 'posted'
      and e.currency = p_currency
      and e.entry_date between v_from and v_to
    group by a.account_code, a.account_name
  ) e_row;

  return jsonb_build_object(
    'from_date', v_from,
    'to_date', v_to,
    'currency', p_currency,
    'revenues', v_rev_lines,
    'total_revenue', v_tot_rev,
    'expenses', v_exp_lines,
    'total_expenses', v_tot_exp,
    'net_operating_surplus', (v_tot_rev - v_tot_exp)
  );
end $$;

-- C. Balance Sheet Statement RPC (from posted journals)
create or replace function public.finance_get_balance_sheet(
  p_as_of_date date default null,
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.statement.view');
  v_as_of date := coalesce(p_as_of_date, current_date);
  v_assets jsonb;
  v_liabs jsonb;
  v_equity jsonb;
  v_tot_asset numeric := 0;
  v_tot_liab numeric := 0;
  v_tot_equity numeric := 0;
  v_retained_earnings numeric := 0;
begin
  -- Assets (1000-1999)
  select
    coalesce(jsonb_agg(to_jsonb(r) order by r.account_code), '[]'::jsonb),
    coalesce(sum(r.amount), 0)
  into v_assets, v_tot_asset
  from (
    select
      a.account_code,
      a.account_name,
      coalesce(sum(l.debit - l.credit), 0) as amount
    from public.finance_chart_of_accounts a
    join public.finance_journal_lines l on l.account_id = a.id
    join public.finance_journal_entries e on e.id = l.entry_id
    where a.account_type = 'ASSET'
      and e.status = 'posted'
      and e.currency = p_currency
      and e.entry_date <= v_as_of
    group by a.account_code, a.account_name
  ) r;

  -- Liabilities (2000-2999)
  select
    coalesce(jsonb_agg(to_jsonb(r) order by r.account_code), '[]'::jsonb),
    coalesce(sum(r.amount), 0)
  into v_liabs, v_tot_liab
  from (
    select
      a.account_code,
      a.account_name,
      coalesce(sum(l.credit - l.debit), 0) as amount
    from public.finance_chart_of_accounts a
    join public.finance_journal_lines l on l.account_id = a.id
    join public.finance_journal_entries e on e.id = l.entry_id
    where a.account_type = 'LIABILITY'
      and e.status = 'posted'
      and e.currency = p_currency
      and e.entry_date <= v_as_of
    group by a.account_code, a.account_name
  ) r;

  -- Equity Base (3000-3999)
  select
    coalesce(jsonb_agg(to_jsonb(r) order by r.account_code), '[]'::jsonb),
    coalesce(sum(r.amount), 0)
  into v_equity, v_tot_equity
  from (
    select
      a.account_code,
      a.account_name,
      coalesce(sum(l.credit - l.debit), 0) as amount
    from public.finance_chart_of_accounts a
    join public.finance_journal_lines l on l.account_id = a.id
    join public.finance_journal_entries e on e.id = l.entry_id
    where a.account_type = 'EQUITY'
      and e.status = 'posted'
      and e.currency = p_currency
      and e.entry_date <= v_as_of
    group by a.account_code, a.account_name
  ) r;

  -- Net Operating Income to Retained Earnings (Revenues - Expenses)
  select coalesce(sum(
    case when a.account_type = 'REVENUE' then l.credit - l.debit
         when a.account_type = 'EXPENSE' then -(l.debit - l.credit)
         else 0 end
  ), 0) into v_retained_earnings
  from public.finance_chart_of_accounts a
  join public.finance_journal_lines l on l.account_id = a.id
  join public.finance_journal_entries e on e.id = l.entry_id
  where a.account_type in ('REVENUE', 'EXPENSE')
    and e.status = 'posted'
    and e.currency = p_currency
    and e.entry_date <= v_as_of;

  -- Add Retained Earnings line to Equity
  v_equity := v_equity || jsonb_build_array(
    jsonb_build_object(
      'account_code', '3999',
      'account_name', 'Current Period Operating Surplus / Retained Earnings',
      'amount', v_retained_earnings
    )
  );
  v_tot_equity := v_tot_equity + v_retained_earnings;

  return jsonb_build_object(
    'as_of_date', v_as_of,
    'currency', p_currency,
    'assets', v_assets,
    'total_assets', v_tot_asset,
    'liabilities', v_liabs,
    'total_liabilities', v_tot_liab,
    'equity', v_equity,
    'total_equity', v_tot_equity,
    'total_liabilities_and_equity', (v_tot_liab + v_tot_equity),
    'is_balanced', (abs(v_tot_asset - (v_tot_liab + v_tot_equity)) < 0.001)
  );
end $$;

-- D. Customer Statement RPC
create or replace function public.finance_get_customer_statement(
  p_customer_id uuid,
  p_from_date date default null,
  p_to_date date default null,
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.view');
  c public.finance_customers%rowtype;
  v_from date := coalesce(p_from_date, (date_trunc('year', current_date))::date);
  v_to date := coalesce(p_to_date, current_date);
  v_opening numeric := 0;
  v_invoiced_before numeric := 0;
  v_paid_before numeric := 0;
  v_credit_before numeric := 0;
  v_activity jsonb;
  v_total_invoiced numeric := 0;
  v_total_paid numeric := 0;
  v_total_credits numeric := 0;
begin
  select * into c from public.finance_customers where id = p_customer_id;
  if c.id is null then raise exception using errcode='P0002', message='Customer not found'; end if;

  -- Calculate Opening Balance (Prior to v_from)
  select coalesce(sum(total), 0) into v_invoiced_before
  from public.finance_invoices
  where customer_id = c.id and currency = p_currency and status in ('issued', 'partially_paid', 'paid') and issue_date < v_from;

  select coalesce(sum(amount), 0) into v_paid_before
  from public.finance_payments
  where customer_id = c.id and currency = p_currency and payment_date < v_from;

  select coalesce(sum(amount), 0) into v_credit_before
  from public.finance_credit_notes
  where customer_id = c.id and currency = p_currency and status = 'issued' and issued_at::date < v_from;

  v_opening := v_invoiced_before - v_paid_before - v_credit_before;

  -- Chronological activity in range
  select coalesce(jsonb_agg(to_jsonb(act) order by act.activity_date asc, act.reference asc), '[]'::jsonb),
         coalesce(sum(case when act.type = 'invoice' then act.amount else 0 end), 0),
         coalesce(sum(case when act.type = 'payment' then act.amount else 0 end), 0),
         coalesce(sum(case when act.type = 'credit_note' then act.amount else 0 end), 0)
  into v_activity, v_total_invoiced, v_total_paid, v_total_credits
  from (
    select
      'invoice' as type,
      invoice_number as reference,
      issue_date as activity_date,
      total as amount,
      notes as memo
    from public.finance_invoices
    where customer_id = c.id and currency = p_currency and status in ('issued', 'partially_paid', 'paid')
      and issue_date between v_from and v_to

    union all

    select
      'payment' as type,
      payment_number as reference,
      payment_date as activity_date,
      amount,
      coalesce(notes, 'Payment via ' || method) as memo
    from public.finance_payments
    where customer_id = c.id and currency = p_currency
      and payment_date between v_from and v_to

    union all

    select
      'credit_note' as type,
      credit_note_number as reference,
      issued_at::date as activity_date,
      amount,
      reason as memo
    from public.finance_credit_notes
    where customer_id = c.id and currency = p_currency and status = 'issued'
      and issued_at::date between v_from and v_to
  ) act;

  return jsonb_build_object(
    'customer_id', c.id,
    'customer_name', c.legal_name,
    'currency', p_currency,
    'from_date', v_from,
    'to_date', v_to,
    'opening_balance', v_opening,
    'total_invoiced', v_total_invoiced,
    'total_paid', v_total_paid,
    'total_credits', v_total_credits,
    'closing_balance', (v_opening + v_total_invoiced - v_total_paid - v_total_credits),
    'activity', v_activity
  );
end $$;

-- E. Supporting query RPCs for General Ledger
create or replace function public.finance_list_chart_of_accounts()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.statement.view')) then
    raise exception using errcode='42501', message='finance.view capability required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(a) order by a.account_code asc)
    from public.finance_chart_of_accounts a
  ), '[]'::jsonb);
end $$;

create or replace function public.finance_list_fiscal_periods()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.statement.view')) then
    raise exception using errcode='42501', message='finance.view capability required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(p) order by p.start_date desc)
    from public.finance_fiscal_periods p
  ), '[]'::jsonb);
end $$;

create or replace function public.finance_list_journal_entries(
  p_period_id uuid default null,
  p_status text default null,
  p_limit int default 100
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.statement.view')) then
    raise exception using errcode='42501', message='finance.view capability required';
  end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'entry_number', e.entry_number,
        'entry_date', e.entry_date,
        'period_id', e.period_id,
        'status', e.status,
        'source', e.source,
        'source_id', e.source_id,
        'currency', e.currency,
        'memo', e.memo,
        'posted_at', e.posted_at,
        'created_at', e.created_at,
        'lines', (
          select jsonb_agg(to_jsonb(l) order by l.line_number asc)
          from (
            select jl.line_number, jl.account_id, ca.account_code, ca.account_name, jl.debit, jl.credit, jl.description
            from public.finance_journal_lines jl
            join public.finance_chart_of_accounts ca on ca.id = jl.account_id
            where jl.entry_id = e.id
          ) l
        )
      ) order by e.entry_date desc, e.created_at desc
    )
    from (
      select * from public.finance_journal_entries
      where (p_period_id is null or period_id = p_period_id)
        and (p_status is null or status = p_status)
      order by entry_date desc, created_at desc
      limit coalesce(p_limit, 100)
    ) e
  ), '[]'::jsonb);
end $$;

-- 15. Security & RLS on all General Ledger Tables
alter table public.finance_chart_of_accounts enable row level security;
alter table public.finance_fiscal_periods enable row level security;
alter table public.finance_journal_entries enable row level security;
alter table public.finance_journal_lines enable row level security;
alter table public.finance_credit_notes enable row level security;
alter table public.finance_exchange_rates enable row level security;

-- Revoke all direct table access from public, anon, authenticated
revoke all on table public.finance_chart_of_accounts from public, anon, authenticated;
revoke all on table public.finance_fiscal_periods from public, anon, authenticated;
revoke all on table public.finance_journal_entries from public, anon, authenticated;
revoke all on table public.finance_journal_lines from public, anon, authenticated;
revoke all on table public.finance_credit_notes from public, anon, authenticated;
revoke all on table public.finance_exchange_rates from public, anon, authenticated;

-- Grant execute on new RPCs to authenticated (with internal capability gates)
grant execute on function public.finance_get_trial_balance(uuid, text) to authenticated;
grant execute on function public.finance_get_profit_and_loss(date, date, text) to authenticated;
grant execute on function public.finance_get_balance_sheet(date, text) to authenticated;
grant execute on function public.finance_get_customer_statement(uuid, date, date, text) to authenticated;
grant execute on function public.finance_create_credit_note(uuid, numeric, text) to authenticated;
grant execute on function public.finance_reverse_journal_entry(uuid, text) to authenticated;
grant execute on function public.finance_list_chart_of_accounts() to authenticated;
grant execute on function public.finance_list_fiscal_periods() to authenticated;
grant execute on function public.finance_list_journal_entries(uuid, text, int) to authenticated;

revoke all on function public.finance_record_operational_journal(text, uuid, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.finance_record_operational_journal(text, uuid, text, text, uuid, jsonb) to service_role;
