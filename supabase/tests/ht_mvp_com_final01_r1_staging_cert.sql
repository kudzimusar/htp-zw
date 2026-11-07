-- HT-MVP-COM-FINAL-01-R1: Staging Financial Integrity & Privilege Hardening Regression
-- Runs inside a single transaction that aborts at the end, returning structured JSON results.
begin;

create temp table _t_results(name text, ok boolean, detail text) on commit drop;

create or replace function pg_temp._t_rec(p_name text, p_ok boolean, p_detail text default null)
returns void language sql as $$ insert into _t_results values (p_name, coalesce(p_ok,false), p_detail) $$;

create or replace function pg_temp._t_act(p_sub uuid, p_sess text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_sub, 'session_id', p_sess, 'role','authenticated')::text, true);
end $$;

do $$
declare
  v_roles text[] := array['Publisher / Owner','Finance Manager','Accounts Officer','Commercial Manager','Reporter / Journalist','Analyst'];
  v_keys  text[] := array['owner','fmgr','officer','cmgr','reporter','analyst'];
  v_sub jsonb := '{}'::jsonb; v_sid jsonb := '{}'::jsonb;
  i int; v_auth uuid; v_staff uuid; v_role uuid;
  r jsonb; v_cust uuid; v_ord uuid; v_inv1 uuid; v_inv2 uuid; v_exp1 uuid; v_exp2 uuid;
  v_jrn1 uuid; v_jrn2 uuid; v_jrn1_re uuid;
  v_deb numeric; v_cred numeric;
  v_state text; v_msg text;
  v_today date := (now() at time zone 'Africa/Harare')::date;
begin
  perform set_config('app.newsroom_rpc','1',true);

  -- 1. Create temporary staff profiles and sessions
  for i in 1..array_length(v_keys,1) loop
    v_auth := gen_random_uuid();
    select id into v_role from public.newsroom_roles where name = v_roles[i];
    if v_role is null then
      perform pg_temp._t_rec('role exists '||v_roles[i], false);
      continue;
    end if;
    insert into public.staff_profiles(auth_user_id, display_name, email, role_id, status, handle)
    values (v_auth, 'Cert '||v_keys[i], 'cert-'||v_keys[i]||'-'||left(v_auth::text,8)||'@test.invalid', v_role, 'active', 'c-'||v_keys[i]||'-'||left(v_auth::text,6))
    returning id into v_staff;
    insert into public.newsroom_sessions(auth_user_id, staff_profile_id, provider_session_id)
    values (v_auth, v_staff, 's-cert-'||v_keys[i]);
    v_sub := v_sub || jsonb_build_object(v_keys[i], v_auth);
    v_sid := v_sid || jsonb_build_object(v_keys[i], v_staff);
  end loop;

  -- ---------------- 1. Privilege Grants Verification ----------------
  perform pg_temp._t_rec('commercial_list_orders: anon execute revoked', not has_function_privilege('anon', 'public.commercial_list_orders(text)', 'execute'));
  perform pg_temp._t_rec('commercial_list_orders: public execute revoked', not has_function_privilege('public', 'public.commercial_list_orders(text)', 'execute'));
  perform pg_temp._t_rec('commercial_list_orders: authenticated execute granted', has_function_privilege('authenticated', 'public.commercial_list_orders(text)', 'execute'));

  perform pg_temp._t_rec('finance_list_expenses: anon execute revoked', not has_function_privilege('anon', 'public.finance_list_expenses(text)', 'execute'));
  perform pg_temp._t_rec('finance_list_expenses: public execute revoked', not has_function_privilege('public', 'public.finance_list_expenses(text)', 'execute'));
  perform pg_temp._t_rec('finance_list_expenses: authenticated execute granted', has_function_privilege('authenticated', 'public.finance_list_expenses(text)', 'execute'));

  perform pg_temp._t_rec('finance_issue_invoice: anon execute revoked', not has_function_privilege('anon', 'public.finance_issue_invoice(uuid,date,date)', 'execute'));
  perform pg_temp._t_rec('finance_issue_invoice: authenticated execute granted', has_function_privilege('authenticated', 'public.finance_issue_invoice(uuid,date,date)', 'execute'));

  perform pg_temp._t_rec('finance_upsert_customer: anon execute revoked', not has_function_privilege('anon', 'public.finance_upsert_customer(uuid,uuid,text,text,text,text,text,text,text,int)', 'execute'));
  perform pg_temp._t_rec('finance_upsert_customer: authenticated execute granted', has_function_privilege('authenticated', 'public.finance_upsert_customer(uuid,uuid,text,text,text,text,text,text,text,int)', 'execute'));

  -- ---------------- 2. Customer & Commercial Order Workflows ----------------
  -- Act as Commercial Manager
  perform pg_temp._t_act((v_sub->>'cmgr')::uuid, 's-cert-cmgr');
  r := public.finance_upsert_customer(null, null, 'Zimbabwe Medical Supplies Ltd', 'ZimMed', 'accounts@zimmed.co.zw', '+263772111222', '10 Enterprise Rd, Harare', 'BP-998877', 'USD', 30);
  v_cust := (r->>'id')::uuid;
  perform pg_temp._t_rec('customer created with valid ID', v_cust is not null, v_cust::text);

  -- Create order as Commercial Manager
  r := public.commercial_create_order(v_cust, null, v_today, v_today + 30, 'USD', 1200.00, 180.00, 100.00, 'Q4 Sponsoring Booking');
  v_ord := (r->>'id')::uuid;
  perform pg_temp._t_rec('commercial order created in draft', (select status from public.commercial_orders where id = v_ord) = 'draft', (select status from public.commercial_orders where id = v_ord));

  -- Separation of duties: Commercial Manager cannot self-approve order
  begin
    perform public.commercial_approve_order(v_ord);
    v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('order submitter cannot self-approve order', v_state = '42501', v_state);

  -- Publisher / Owner approves order
  perform pg_temp._t_act((v_sub->>'owner')::uuid, 's-cert-owner');
  perform public.commercial_approve_order(v_ord);
  perform pg_temp._t_rec('owner approves order successfully', (select status from public.commercial_orders where id = v_ord) = 'approved');

  -- ---------------- 3. Invoice with Discount & Tax GL Balancing ----------------
  -- Act as Accounts Officer
  perform pg_temp._t_act((v_sub->>'officer')::uuid, 's-cert-officer');
  r := public.finance_create_invoice(
    v_cust, v_ord, v_today, v_today + 30, 'USD',
    jsonb_build_array(
      jsonb_build_object('description', 'Sponsored Section', 'quantity', 1, 'unit_price', 1200.00, 'tax_rate', 0.15, 'tax_amount', 165.00, 'discount', 100.00, 'total', 1265.00)
    ),
    'Sponsorship Inv with Tax and Discount'
  );
  v_inv1 := (r->>'id')::uuid;
  perform pg_temp._t_rec('invoice created with tax and discount', v_inv1 is not null);

  -- Separation of duties: Accounts Officer cannot self-approve invoice
  begin
    perform public.finance_approve_invoice(v_inv1);
    v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('invoice creator cannot self-approve invoice', v_state = '42501', v_state);

  -- Finance Manager approves and issues invoice
  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-cert-fmgr');
  perform public.finance_approve_invoice(v_inv1);
  r := public.finance_issue_invoice(v_inv1);
  v_jrn1 := (r->>'journal_id')::uuid;
  perform pg_temp._t_rec('invoice issued successfully', v_jrn1 is not null);

  -- Check General Ledger Balancing for invoice with discount and tax
  select sum(debit), sum(credit) into v_deb, v_cred
  from public.finance_journal_lines where entry_id = v_jrn1;
  perform pg_temp._t_rec('discount+tax GL journal balances: debits equal credits', v_deb = v_cred, 'DR: '||v_deb||', CR: '||v_cred);
  perform pg_temp._t_rec('discount+tax GL total matches invoice total (1265.00)', v_deb = 1265.00, v_deb::text);

  -- Invoice re-issuance idempotency
  r := public.finance_issue_invoice(v_inv1);
  v_jrn1_re := (r->>'journal_id')::uuid;
  perform pg_temp._t_rec('invoice issuance is idempotent without error', v_jrn1 = v_jrn1_re);

  -- ---------------- 4. Invoice with Discount and NO Tax GL Balancing ----------------
  perform pg_temp._t_act((v_sub->>'officer')::uuid, 's-cert-officer');
  r := public.finance_create_invoice(
    v_cust, null, v_today, v_today + 30, 'USD',
    jsonb_build_array(
      jsonb_build_object('description', 'Educational Series', 'quantity', 1, 'unit_price', 900.00, 'tax_rate', 0, 'tax_amount', 0, 'discount', 150.00, 'total', 750.00)
    ),
    'Exempt Inv with Discount Only'
  );
  v_inv2 := (r->>'id')::uuid;
  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-cert-fmgr');
  perform public.finance_approve_invoice(v_inv2);
  r := public.finance_issue_invoice(v_inv2);
  v_jrn2 := (r->>'journal_id')::uuid;

  select sum(debit), sum(credit) into v_deb, v_cred
  from public.finance_journal_lines where entry_id = v_jrn2;
  perform pg_temp._t_rec('discount-only GL journal balances: debits equal credits', v_deb = v_cred, 'DR: '||v_deb||', CR: '||v_cred);
  perform pg_temp._t_rec('discount-only GL total matches invoice total (750.00)', v_deb = 750.00, v_deb::text);

  -- ---------------- 5. Payment & Overpayment Integrity ----------------
  -- Overpayment rejection
  perform pg_temp._t_act((v_sub->>'officer')::uuid, 's-cert-officer');
  begin
    perform public.finance_record_payment(v_inv1, 1500.00, 'USD', v_today, 'bank_transfer', 'WIRE-OVER', 'Attempt overpay', 'IDEMP-1');
    v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('overpayment exceeding invoice balance is rejected', v_state = '22023', v_state);

  -- Partial payment
  r := public.finance_record_payment(v_inv1, 500.00, 'USD', v_today, 'bank_transfer', 'WIRE-PART', 'Part payment', 'IDEMP-PART');
  perform pg_temp._t_rec('partial payment updates balance due to 765.00', (select balance_due from public.finance_invoices where id = v_inv1) = 765.00, (select balance_due::text from public.finance_invoices where id = v_inv1));

  -- Final payment
  r := public.finance_record_payment(v_inv1, 765.00, 'USD', v_today, 'bank_transfer', 'WIRE-FINAL', 'Final payment', 'IDEMP-FINAL');
  perform pg_temp._t_rec('full payment clears balance due to 0.00', (select balance_due from public.finance_invoices where id = v_inv1) = 0.00, (select balance_due::text from public.finance_invoices where id = v_inv1));

  -- ---------------- 6. Newsroom Expense Claims & RBAC ----------------
  -- Reporter submits expense
  perform pg_temp._t_act((v_sub->>'reporter')::uuid, 's-cert-reporter');
  r := public.finance_create_expense(v_today, 'Harare Transport', 'travel', 'Field taxi to Parirenyatwa Hospital', 'Editorial', 45.00, 'USD', 0, 'REC-TX-1', true);
  v_exp1 := (r->>'id')::uuid;

  -- Reporter cannot approve own expense
  begin
    perform public.finance_approve_expense(v_exp1);
    v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('reporter cannot self-approve own expense claim', v_state = '42501', v_state);

  -- Finance Manager creates expense
  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-cert-fmgr');
  r := public.finance_create_expense(v_today, 'Stationery Hub', 'office', 'Audit ledger folders', 'Finance', 35.00, 'USD', 5.25, 'REC-AUD-1', true);
  v_exp2 := (r->>'id')::uuid;

  -- Finance Manager cannot self-approve own expense
  begin
    perform public.finance_approve_expense(v_exp2);
    v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('finance manager cannot self-approve own expense claim', v_state = '42501', v_state);

  -- Finance Manager approves reporter expense
  perform public.finance_approve_expense(v_exp1);
  perform pg_temp._t_rec('finance manager approves reporter expense', (select status from public.finance_expenses where id = v_exp1) = 'approved');

  -- Finance Manager pays approved expense
  perform public.finance_pay_expense(v_exp1);
  perform pg_temp._t_rec('approved expense marked paid', (select status||'/'||payment_status from public.finance_expenses where id = v_exp1) = 'approved/paid');

  -- Staff-scoped expense visibility: reporter only sees own expenses
  perform pg_temp._t_act((v_sub->>'reporter')::uuid, 's-cert-reporter');
  r := public.finance_list_expenses();
  perform pg_temp._t_rec('reporter sees only own submitted expense', jsonb_array_length(r) = 1, jsonb_array_length(r)::text);

  -- Finance Manager sees all expenses
  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-cert-fmgr');
  r := public.finance_list_expenses();
  perform pg_temp._t_rec('finance manager sees all newsroom expenses', jsonb_array_length(r) = 2, jsonb_array_length(r)::text);

  -- ---------------- 7. Unprivileged Access Rejection ----------------
  perform pg_temp._t_act((v_sub->>'analyst')::uuid, 's-cert-analyst');
  begin perform public.commercial_list_orders(); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('unprivileged user cannot list commercial orders', v_state = '42501', v_state);

  begin perform public.finance_list_expenses(); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('unprivileged user without expense.view cannot list expenses', v_state = '42501', v_state);

  -- ---------------- 8. Currency Integrity & Immutability ----------------
  begin
    perform public.finance_check_currency('INVALID');
    v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('unsupported currency format INVALID is rejected', v_state = '22023', v_state);

  begin
    update public.finance_journal_lines set debit = debit + 50 where entry_id = v_jrn1;
    v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('posted journal lines cannot be mutated', v_state in ('22023','42501'), v_state);

  -- ---------------- Return Results Summary ----------------
  raise exception 'FINANCE_R1_TEST_RESULTS %', (
    select jsonb_build_object(
      'total', count(*),
      'passed', count(*) filter (where ok),
      'failed', coalesce(jsonb_agg(jsonb_build_object('name',name,'detail',detail)) filter (where not ok), '[]'::jsonb)
    )
    from _t_results
  );
end $$;
rollback;
