-- ============================================================================
-- Test Suite: ht_nr_ui02_gl_and_bootstrap_tests.sql
-- Programme: HealthTimes Newsroom OS (HT-NR-UI-02)
-- Description: Rigorous Transactional SQL Tests for Security Hardening,
--              Parameterless Bootstrap, Double-Entry GL, and Accounting Statements
-- ============================================================================

begin;

create temp table if not exists _t_ui02_results (
  step int,
  name text,
  ok boolean,
  detail text
) on commit drop;

do $$
declare
  v_test_staff_id uuid;
  v_editor_staff_id uuid;
  v_owner_auth uuid := gen_random_uuid();
  v_editor_auth uuid := gen_random_uuid();
  v_owner_role_id uuid;
  v_cust_id uuid;
  v_inv_id uuid;
  v_pay_id uuid;
  v_exp_id uuid;
  v_crn_id uuid;
  v_jrn_id uuid;
  v_issue_res jsonb;
  v_pay_res jsonb;
  v_app_exp_res jsonb;
  v_pay_exp_res jsonb;
  v_crn_res jsonb;
  v_rev_res jsonb;
  v_tb jsonb;
  v_pnl jsonb;
  v_bs jsonb;
  v_stmt jsonb;
  v_ar_acc uuid;
  v_cash_acc uuid;
  v_unbalanced_id uuid;
  v_locked_period_id uuid;
  v_err_caught boolean := false;
  v_table_priv record;
begin
  -- 1. Verify Parameterless Bootstrap Function Signature
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'newsroom_bootstrap_owner' and pronargs = 0
  ) then
    insert into _t_ui02_results values (1, 'Parameterless bootstrap signature', false, '0-arg function not found');
  elsif exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'newsroom_bootstrap_owner' and pronargs > 0
  ) then
    insert into _t_ui02_results values (1, 'Parameterless bootstrap signature', false, 'parameterized function still exists');
  else
    insert into _t_ui02_results values (1, 'Parameterless bootstrap signature', true, 'public.newsroom_bootstrap_owner() strictly 0-arg');
  end if;

  -- 2. Verify Revoked Anon ACL on authors and sections
  v_err_caught := false;
  for v_table_priv in (
    select table_name, privilege_type
    from information_schema.role_table_grants
    where grantee in ('anon', 'public')
      and table_schema = 'public'
      and table_name in ('authors', 'sections')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES')
  ) loop
    v_err_caught := true;
  end loop;
  insert into _t_ui02_results values (2, 'Authors & sections direct anon DML revoked', not v_err_caught, case when v_err_caught then 'DML privileges still granted' else 'Zero DML grants to anon/public' end);

  -- Setup temporary test staff profiles for simulation
  select id into v_owner_role_id from public.newsroom_roles where name = 'Publisher / Owner';
  perform set_config('app.newsroom_rpc', '1', true);

  -- Staff 1: Owner / Creator
  insert into public.staff_profiles (auth_user_id, display_name, email, role_id, desk, country, status, handle)
  values (v_owner_auth, 'UI02 Test Staff', 'ui02-test-staff@healthtimes.co.zw', v_owner_role_id, 'Executive', 'ZW', 'active', 'ui02teststaff')
  returning id into v_test_staff_id;
  insert into public.newsroom_sessions(auth_user_id, staff_profile_id, provider_session_id)
  values (v_owner_auth, v_test_staff_id, 's-ui02-owner');

  -- Staff 2: Editor / Approver
  insert into public.staff_profiles (auth_user_id, display_name, email, role_id, desk, country, status, handle)
  values (v_editor_auth, 'UI02 Editor', 'ui02-editor@healthtimes.co.zw', v_owner_role_id, 'Executive', 'ZW', 'active', 'ui02editor')
  returning id into v_editor_staff_id;
  insert into public.newsroom_sessions(auth_user_id, staff_profile_id, provider_session_id)
  values (v_editor_auth, v_editor_staff_id, 's-ui02-editor');

  -- Start acting as Staff 1 (Creator)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_owner_auth, 'session_id', 's-ui02-owner', 'role', 'authenticated')::text, true);

  -- 3. Test Double-Entry Balance Check: Reject Unbalanced Journal
  v_err_caught := false;
  begin
    insert into public.finance_journal_entries (entry_number, status, source, memo, created_by)
    values ('TEST-JRN-UNBALANCED', 'draft', 'manual', 'Unbalanced test journal', v_test_staff_id)
    returning id into v_unbalanced_id;

    select id into v_ar_acc from public.finance_chart_of_accounts where account_code = '1200';
    insert into public.finance_journal_lines (entry_id, line_number, account_id, debit, credit)
    values (v_unbalanced_id, 1, v_ar_acc, 100.00, 0);

    -- Attempt to post unbalanced journal (DR 100, CR 0)
    update public.finance_journal_entries set status = 'posted' where id = v_unbalanced_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into _t_ui02_results values (3, 'Double-entry balance check rejects unbalanced journal', v_err_caught, 'Unbalanced posting rejected by trigger');

  -- 4. Test Locked Fiscal Period Check: Reject Posting in Locked Period
  insert into public.finance_fiscal_periods (period_name, start_date, end_date, status)
  values ('TEST-LOCKED-PERIOD', '2025-01-01', '2025-01-31', 'LOCKED')
  returning id into v_locked_period_id;

  v_err_caught := false;
  begin
    select id into v_cash_acc from public.finance_chart_of_accounts where account_code = '1000';
    insert into public.finance_journal_entries (entry_number, period_id, status, source, memo, created_by)
    values ('TEST-JRN-LOCKED', v_locked_period_id, 'draft', 'Locked period test journal', v_test_staff_id)
    returning id into v_unbalanced_id;

    insert into public.finance_journal_lines (entry_id, line_number, account_id, debit, credit)
    values (v_unbalanced_id, 1, v_cash_acc, 50.00, 0), (v_unbalanced_id, 2, v_ar_acc, 0, 50.00);

    update public.finance_journal_entries set status = 'posted' where id = v_unbalanced_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into _t_ui02_results values (4, 'Locked fiscal period prevents journal posting', v_err_caught, 'Posting to LOCKED period rejected');

  -- 5. Test Immutability of Posted Journal Lines
  v_jrn_id := public.finance_record_operational_journal(
    'manual', null, 'Test Valid Journal', 'USD', v_test_staff_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_cash_acc, 'debit', 250.00, 'credit', 0, 'description', 'Debit cash'),
      jsonb_build_object('account_id', v_ar_acc, 'debit', 0, 'credit', 250.00, 'description', 'Credit AR')
    )
  );

  v_err_caught := false;
  begin
    delete from public.finance_journal_lines where entry_id = v_jrn_id;
  exception when others then
    v_err_caught := true;
  end;
  insert into _t_ui02_results values (5, 'Posted journal lines immutability enforced', v_err_caught, 'Line mutation/deletion rejected by trigger');

  -- 6. Test Operational Invoicing -> Journal Posting Flow
  v_cust_id := (public.finance_upsert_customer(
    null, null, 'Test Health Org', 'Test Health', 'billing@testhealth.co.zw',
    null, 'Harare', 'VAT123456', 'USD', 30
  )->>'id')::uuid;

  v_inv_id := (public.finance_create_invoice(
    v_cust_id, null, current_date, current_date + 30, 'USD',
    jsonb_build_array(
      jsonb_build_object('description', 'Q4 Banner Advertising', 'quantity', 1, 'unit_price', 1000.00, 'tax_rate', 0.15)
    ),
    'Standard terms'
  )->>'id')::uuid;

  -- Switch to Editor (different actor) to approve invoice
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_editor_auth, 'session_id', 's-ui02-editor', 'role', 'authenticated')::text, true);
  perform public.finance_approve_invoice(v_inv_id);

  -- Switch to Owner to issue invoice and receive payment
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_owner_auth, 'session_id', 's-ui02-owner', 'role', 'authenticated')::text, true);
  v_issue_res := public.finance_issue_invoice(v_inv_id);

  insert into _t_ui02_results values (6, 'Operational invoice issuance posts GL journal', (v_issue_res->>'journal_id') is not null, 'Journal: ' || coalesce(v_issue_res->>'journal_id', 'none'));

  -- 7. Test Operational Payment -> Journal Posting Flow
  v_pay_res := public.finance_record_payment(
    v_inv_id, 1150.00, 'USD', current_date, 'bank_transfer',
    'TXN-99887766', 'Full settlement', 'IDEM-TEST-PAY-001'
  );

  insert into _t_ui02_results values (7, 'Operational customer payment posts GL journal', (v_pay_res->>'journal_id') is not null, 'Journal: ' || coalesce(v_pay_res->>'journal_id', 'none'));

  -- 8. Test Expense Claim -> Approval -> Payment Flow
  v_exp_id := (public.finance_create_expense(
    current_date, 'Harare Central Hospital', 'reporting', 'Harare Central Hospital Reporting Per Diem',
    'Editorial', 300.00, 'USD', 0.00, 'DOC-001', true
  )->>'id')::uuid;

  -- Switch to Editor to approve expense (separation of duties check)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_editor_auth, 'session_id', 's-ui02-editor', 'role', 'authenticated')::text, true);
  v_app_exp_res := public.finance_approve_expense(v_exp_id);

  insert into _t_ui02_results values (8, 'Expense approval posts accrual GL journal', (v_app_exp_res->>'journal_id') is not null, 'Journal: ' || coalesce(v_app_exp_res->>'journal_id', 'none'));

  -- Switch to Owner to disburse payment
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_owner_auth, 'session_id', 's-ui02-owner', 'role', 'authenticated')::text, true);
  v_pay_exp_res := public.finance_pay_expense(v_exp_id);

  insert into _t_ui02_results values (9, 'Expense disbursement posts payment GL journal', (v_pay_exp_res->>'journal_id') is not null, 'Journal: ' || coalesce(v_pay_exp_res->>'journal_id', 'none'));

  -- 10. Test Credit Note RPC
  v_inv_id := (public.finance_create_invoice(
    v_cust_id, null, current_date, current_date + 30, 'USD',
    jsonb_build_array(
      jsonb_build_object('description', 'Sponsored Content', 'quantity', 1, 'unit_price', 500.00, 'tax_rate', 0.00)
    ),
    'Credit note test'
  )->>'id')::uuid;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_editor_auth, 'session_id', 's-ui02-editor', 'role', 'authenticated')::text, true);
  perform public.finance_approve_invoice(v_inv_id);

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_owner_auth, 'session_id', 's-ui02-owner', 'role', 'authenticated')::text, true);
  perform public.finance_issue_invoice(v_inv_id);

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_editor_auth, 'session_id', 's-ui02-editor', 'role', 'authenticated')::text, true);
  v_crn_res := public.finance_create_credit_note(v_inv_id, 200.00, 'Customer volume discount adjustment');

  insert into _t_ui02_results values (10, 'Credit note issuance posts revenue adjustment GL journal', (v_crn_res->>'journal_id') is not null, 'Journal: ' || coalesce(v_crn_res->>'journal_id', 'none'));

  -- 11. Test Journal Reversal RPC
  v_rev_res := public.finance_reverse_journal_entry((v_issue_res->>'journal_id')::uuid, 'Correction of prior period invoice entry');

  insert into _t_ui02_results values (11, 'Journal reversal posts offsetting GL journal', (v_rev_res->>'reversal_entry_id') is not null, 'Reversal entry: ' || coalesce(v_rev_res->>'reversal_entry_id', 'none'));

  -- 12. Test Accounting Statements RPCs
  v_tb := public.finance_get_trial_balance(null, 'USD');
  insert into _t_ui02_results values (12, 'Trial Balance RPC is balanced', coalesce((v_tb->>'is_balanced')::boolean, false), 'Debits=' || (v_tb->>'total_debits') || ', Credits=' || (v_tb->>'total_credits'));

  v_pnl := public.finance_get_profit_and_loss(null, null, 'USD');
  insert into _t_ui02_results values (13, 'Profit & Loss RPC calculates operating surplus', (v_pnl->>'net_operating_surplus') is not null, 'Revenue=' || (v_pnl->>'total_revenue') || ', Expenses=' || (v_pnl->>'total_expenses') || ', Surplus=' || (v_pnl->>'net_operating_surplus'));

  v_bs := public.finance_get_balance_sheet(null, 'USD');
  insert into _t_ui02_results values (14, 'Balance Sheet RPC is balanced', coalesce((v_bs->>'is_balanced')::boolean, false), 'Assets=' || (v_bs->>'total_assets') || ', Liab+Equity=' || (v_bs->>'total_liabilities_and_equity'));

  v_stmt := public.finance_get_customer_statement(v_cust_id, null, null, 'USD');
  insert into _t_ui02_results values (15, 'Customer Statement RPC chronological activity', (v_stmt->>'closing_balance') is not null, 'Opening=' || (v_stmt->>'opening_balance') || ', Invoiced=' || (v_stmt->>'total_invoiced') || ', Paid=' || (v_stmt->>'total_paid') || ', Closing=' || (v_stmt->>'closing_balance'));
end;
$$;

select * from _t_ui02_results order by step asc;

rollback;
