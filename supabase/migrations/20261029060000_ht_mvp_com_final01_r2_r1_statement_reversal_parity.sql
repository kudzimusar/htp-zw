-- HT-MVP-COM-FINAL-01-R2-R1: Statement Reversal Parity & GAAP Aggregation
-- Remediates reporting omission where reversed journal entries and offsetting reversals were
-- excluded from income statement and balance sheet calculations due to strict 'posted' filter.
-- Ensures GAAP double-entry parity: e.status in ('posted', 'reversed') so counter-reversal
-- entries net out to zero across Trial Balance, Profit & Loss, and Balance Sheet.

-- 1. Trial Balance RPC
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
    left join (
      public.finance_journal_lines l
      join public.finance_journal_entries e on e.id = l.entry_id
        and e.status in ('posted', 'reversed')
        and e.currency = p_currency
        and (p_period_id is null or e.period_id = p_period_id)
    ) on l.account_id = a.id
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

-- 2. Profit and Loss Statement RPC
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
      and e.status in ('posted', 'reversed')
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
      and e.status in ('posted', 'reversed')
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

-- 3. Balance Sheet Statement RPC
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
      and e.status in ('posted', 'reversed')
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
      and e.status in ('posted', 'reversed')
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
      and e.status in ('posted', 'reversed')
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
    and e.status in ('posted', 'reversed')
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

-- 4. Explicit privilege hardening
revoke execute on function public.finance_get_trial_balance(uuid, text) from public, anon;
grant execute on function public.finance_get_trial_balance(uuid, text) to authenticated, service_role;

revoke execute on function public.finance_get_profit_and_loss(date, date, text) from public, anon;
grant execute on function public.finance_get_profit_and_loss(date, date, text) to authenticated, service_role;

revoke execute on function public.finance_get_balance_sheet(date, text) from public, anon;
grant execute on function public.finance_get_balance_sheet(date, text) to authenticated, service_role;
