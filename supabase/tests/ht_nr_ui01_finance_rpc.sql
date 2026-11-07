-- HT-NR-UI-01 finance RPC verification (staging-safe).
-- Everything runs inside one transaction that ABORTS at the end via RAISE EXCEPTION,
-- so no persistent rows (staff, invoices, payments, expenses) are ever created.
-- The result JSON is carried in the exception message.
-- Run:  supabase db query --linked --project-ref <staging> -f supabase/tests/ht_nr_ui01_finance_rpc.sql
-- Expected: error text beginning "FINANCE_TEST_RESULTS" with every item ok=true.
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
  v_roles text[] := array['Publisher / Owner','Finance Manager','Accounts Officer','Commercial Manager','Reporter / Journalist','Editor-in-Chief'];
  v_keys  text[] := array['owner','fmgr','officer','cmgr','reporter','editor'];
  v_sub jsonb := '{}'::jsonb; v_sid jsonb := '{}'::jsonb;
  i int; v_auth uuid; v_staff uuid; v_role uuid;
  r jsonb; v_cust uuid; v_ord uuid; v_inv uuid; v_inv2 uuid; v_inv3 uuid; v_inv4 uuid; v_exp uuid; v_exp2 uuid; v_exp3 uuid;
  v_state text; v_msg text; v_n int; v_num1 text; v_num2 text; v_pay jsonb; v_pay2 jsonb;
  v_lines jsonb;
  v_today date := (now() at time zone 'Africa/Harare')::date;

  -- run a statement expecting failure; returns sqlstate (or 'OK' when it unexpectedly succeeded)
begin
  perform set_config('app.newsroom_rpc','1',true);
  for i in 1..array_length(v_keys,1) loop
    v_auth := gen_random_uuid();
    select id into v_role from public.newsroom_roles where name = v_roles[i];
    if v_role is null then perform pg_temp._t_rec('role exists '||v_roles[i], false); continue; end if;
    insert into public.staff_profiles(auth_user_id, display_name, email, role_id, status, handle)
    values (v_auth, 'T '||v_keys[i], 't-'||v_keys[i]||'-'||left(v_auth::text,8)||'@test.invalid', v_role, 'active', 't-'||v_keys[i]||'-'||left(v_auth::text,6))
    returning id into v_staff;
    insert into public.newsroom_sessions(auth_user_id, staff_profile_id, provider_session_id)
    values (v_auth, v_staff, 's-'||v_keys[i]);
    v_sub := v_sub || jsonb_build_object(v_keys[i], v_auth);
    v_sid := v_sid || jsonb_build_object(v_keys[i], v_staff);
  end loop;

  -- ---------------- anon / grants ----------------
  perform pg_temp._t_rec('anon cannot execute finance_overview', not has_function_privilege('anon','public.finance_overview()','execute'));
  perform pg_temp._t_rec('anon cannot execute finance_record_payment', not has_function_privilege('anon','public.finance_record_payment(uuid,numeric,text,date,text,text,text,text)','execute'));
  perform pg_temp._t_rec('anon cannot select finance_invoices', not has_table_privilege('anon','public.finance_invoices','select'));
  perform pg_temp._t_rec('authenticated cannot select finance_invoices directly', not has_table_privilege('authenticated','public.finance_invoices','select'));
  perform pg_temp._t_rec('authenticated cannot insert finance_payments directly', not has_table_privilege('authenticated','public.finance_payments','insert'));
  perform pg_temp._t_rec('RLS enabled on all finance tables',
    (select count(*) = 8 from pg_class where relnamespace='public'::regnamespace and relrowsecurity and relname in
      ('finance_customers','commercial_orders','finance_invoices','finance_invoice_lines','finance_payments','finance_expenses','finance_expense_categories','finance_number_counters')));

  -- ---------------- customer + order ----------------
  perform pg_temp._t_act((v_sub->>'cmgr')::uuid, 's-cmgr');
  r := public.finance_upsert_customer(null, null, 'Test Advertiser Ltd', 'TestAd', 'billing@test.invalid', null, null, 'TIN-1', 'USD', 30);
  v_cust := (r->>'id')::uuid;
  perform pg_temp._t_rec('commercial manager creates customer', v_cust is not null);

  r := public.commercial_create_order(v_cust, null, v_today, v_today + 30, 'USD', 1250, 135, 100, 'test');
  v_ord := (r->>'id')::uuid;
  perform pg_temp._t_rec('order number format ORD-YYYY-NNNN', (r->>'order_number') ~ '^ORD-[0-9]{4}-[0-9]{4}$', r->>'order_number');

  begin perform public.commercial_approve_order(v_ord); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('order creator cannot self-approve', v_state = '42501', v_state);

  begin perform public.commercial_create_order(v_cust, null, null, null, 'USD', -5, 0, 0, null); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('negative order amount rejected', v_state = '22023', v_state);

  perform pg_temp._t_act((v_sub->>'owner')::uuid, 's-owner');
  perform public.commercial_approve_order(v_ord);
  perform pg_temp._t_rec('different approver approves order', (select status from public.commercial_orders where id = v_ord) = 'approved');

  -- ---------------- invoices ----------------
  perform pg_temp._t_act((v_sub->>'reporter')::uuid, 's-reporter');
  begin perform public.finance_create_invoice(v_cust, v_ord, v_today, v_today+30, 'USD', '[{"description":"x","quantity":1,"unit_price":1}]'::jsonb); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('journalist cannot create invoice', v_state = '42501', v_state);

  perform pg_temp._t_act((v_sub->>'officer')::uuid, 's-officer');
  v_lines := '[{"description":"Masthead","category":"Masthead advertising","quantity":2,"unit_price":500.00,"tax_rate":0.15,"discount":100,"placement":"masthead"},
               {"description":"Newsletter slot","quantity":1,"unit_price":250.00,"tax_rate":0,"discount":0,"placement":"newsletter"}]'::jsonb;
  r := public.finance_create_invoice(v_cust, v_ord, null, null, 'USD', v_lines, 'test invoice');
  v_inv := (r->>'id')::uuid; v_num1 := r->>'invoice_number';
  perform pg_temp._t_rec('invoice total = 1285.00 (exact numeric)', (r->>'total')::numeric = 1285.00, r->>'total');
  perform pg_temp._t_rec('invoice number format INV-YYYY-NNNN', v_num1 ~ '^INV-[0-9]{4}-[0-9]{4}$', v_num1);
  r := public.finance_create_invoice(v_cust, null, null, null, 'USD', '[{"description":"y","quantity":1,"unit_price":10}]'::jsonb);
  v_inv2 := (r->>'id')::uuid; v_num2 := r->>'invoice_number';
  perform pg_temp._t_rec('invoice numbers unique/sequential', v_num1 <> v_num2, v_num1||' / '||v_num2);
  perform pg_temp._t_rec('order billing_status = billed after invoice', (select billing_status from public.commercial_orders where id = v_ord) = 'billed');

  begin perform public.finance_create_invoice(v_cust, null, null, null, 'USD', '[{"description":"neg","quantity":1,"unit_price":-5}]'::jsonb); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('negative invoice line price rejected', v_state in ('22023','23514'), v_state);

  begin perform public.finance_create_invoice(v_cust, null, null, null, 'US', '[{"description":"c","quantity":1,"unit_price":5}]'::jsonb); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('invalid currency code rejected', v_state = '22023', v_state);

  begin perform public.finance_create_invoice(v_cust, v_ord, null, null, 'ZWG', '[{"description":"c","quantity":1,"unit_price":5}]'::jsonb); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('invoice currency must match order', v_state = '22023', v_state);

  begin perform public.finance_approve_invoice(v_inv); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('accounts officer cannot approve invoice', v_state = '42501', v_state);

  begin perform public.finance_record_payment(v_inv, 100, 'USD', v_today, 'cash', null, null, 'idem-draft-0001'); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('payment on draft invoice rejected', v_state = '22023', v_state);

  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-fmgr');
  perform public.finance_approve_invoice(v_inv);
  perform pg_temp._t_rec('finance manager approves invoice', (select status from public.finance_invoices where id = v_inv) = 'approved');
  perform public.finance_issue_invoice(v_inv);
  perform pg_temp._t_rec('finance manager issues invoice', (select status from public.finance_invoices where id = v_inv) = 'issued');
  perform pg_temp._t_rec('issue sets due_date from payment terms', (select due_date - issue_date from public.finance_invoices where id = v_inv) = 30);

  r := public.finance_create_invoice(v_cust, null, null, null, 'USD', '[{"description":"self","quantity":1,"unit_price":20}]'::jsonb);
  v_inv3 := (r->>'id')::uuid;
  begin perform public.finance_approve_invoice(v_inv3); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('invoice creator cannot self-approve', v_state = '42501', v_state);

  -- ---------------- payments ----------------
  perform pg_temp._t_act((v_sub->>'cmgr')::uuid, 's-cmgr');
  begin perform public.finance_record_payment(v_inv, 100, 'USD', v_today, 'cash', null, null, 'idem-cmgr-0001'); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('commercial manager cannot record payment', v_state = '42501', v_state);

  perform pg_temp._t_act((v_sub->>'officer')::uuid, 's-officer');
  v_pay := public.finance_record_payment(v_inv, 500, 'USD', v_today, 'bank_transfer', 'REF-1', null, 'idem-officer-0001');
  perform pg_temp._t_rec('partial payment -> partially_paid', (select status from public.finance_invoices where id = v_inv) = 'partially_paid'
     and (select balance_due from public.finance_invoices where id = v_inv) = 785.00);
  perform pg_temp._t_rec('payment number format PAY-YYYY-NNNN', (v_pay->>'payment_number') ~ '^PAY-[0-9]{4}-[0-9]{4}$');
  v_pay2 := public.finance_record_payment(v_inv, 500, 'USD', v_today, 'bank_transfer', 'REF-1', null, 'idem-officer-0001');
  perform pg_temp._t_rec('duplicate payment replay is idempotent', (v_pay2->>'replayed')::boolean and (v_pay2->>'id') = (v_pay->>'id'));
  select count(*) into v_n from public.finance_payments where invoice_id = v_inv;
  perform pg_temp._t_rec('duplicate payment created no second row', v_n = 1, v_n::text);
  begin perform public.finance_record_payment(v_inv, 400, 'USD', v_today, 'bank_transfer', null, null, 'idem-officer-0001'); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('idempotency key reuse with different amount rejected', v_state = '22023', v_state);
  begin perform public.finance_record_payment(v_inv, 800, 'USD', v_today, 'cash', null, null, 'idem-officer-0002'); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('overpayment rejected', v_state = '22023', v_state);
  begin perform public.finance_record_payment(v_inv, -10, 'USD', v_today, 'cash', null, null, 'idem-officer-0003'); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('negative payment rejected', v_state = '22023', v_state);
  begin perform public.finance_record_payment(v_inv, 10, 'ZWG', v_today, 'cash', null, null, 'idem-officer-0004'); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('payment currency mismatch rejected', v_state = '22023', v_state);
  perform public.finance_record_payment(v_inv, 785, 'USD', v_today, 'bank_transfer', null, null, 'idem-officer-0005');
  perform pg_temp._t_rec('full payment -> paid, zero balance', (select status from public.finance_invoices where id = v_inv) = 'paid'
     and (select balance_due from public.finance_invoices where id = v_inv) = 0);
  begin update public.finance_payments set amount = 1 where invoice_id = v_inv; v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('payments are immutable', v_state = '42501', v_state);

  -- ---------------- overdue + aging ----------------
  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-fmgr');
  perform public.finance_approve_invoice(v_inv2);  -- created by officer
  perform public.finance_issue_invoice(v_inv2, v_today - 45, v_today - 40);
  r := public.finance_list_invoices(null);
  perform pg_temp._t_rec('past-due issued invoice shows effective overdue', exists(
     select 1 from jsonb_array_elements(r) e where e->>'id' = v_inv2::text and e->>'effective_status' = 'overdue' and (e->>'days_overdue')::int = 40));
  r := public.finance_receivables_aging();
  perform pg_temp._t_rec('AR aging puts 40-day invoice in 31-60 bucket', exists(
     select 1 from jsonb_array_elements(r->'totals') e where e->>'currency'='USD' and (e->>'d31_60')::numeric = 10.00), r->'totals'::text);
  begin perform public.finance_void_invoice(v_inv, 'oops'); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('invoice with payments cannot be voided', v_state = '22023', v_state);
  perform pg_temp._t_act((v_sub->>'officer')::uuid, 's-officer');
  r := public.finance_create_invoice(v_cust, null, null, null, 'USD', '[{"description":"void me","quantity":1,"unit_price":30}]'::jsonb);
  v_inv4 := (r->>'id')::uuid;
  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-fmgr');
  perform public.finance_void_invoice(v_inv4, 'duplicate draft');
  perform pg_temp._t_rec('draft invoice can be voided with reason', (select status from public.finance_invoices where id = v_inv4) = 'void');

  -- ---------------- expenses ----------------
  perform pg_temp._t_act((v_sub->>'reporter')::uuid, 's-reporter');
  r := public.finance_create_expense(v_today, 'Taxi Co', 'travel', 'Field trip to Mutare', 'Editorial', 45.50, 'USD', 0, 'RCPT-1', true);
  v_exp := (r->>'id')::uuid;
  perform pg_temp._t_rec('expense number format EXP-YYYY-NNNN', (r->>'expense_number') ~ '^EXP-[0-9]{4}-[0-9]{4}$');
  begin perform public.finance_create_expense(v_today, 'X', 'travel', 'neg', null, -5, 'USD', 0, null, true); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('negative expense rejected', v_state = '22023', v_state);
  begin perform public.finance_approve_expense(v_exp); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('reporter cannot approve expenses', v_state = '42501', v_state);
  begin perform public.finance_overview(); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('reporter cannot read finance overview', v_state = '42501', v_state);
  begin perform public.finance_statements(v_today - 30, v_today); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('reporter cannot read statements', v_state = '42501', v_state);
  begin perform public.finance_list_invoices(null); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('reporter cannot list invoices', v_state = '42501', v_state);

  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-fmgr');
  r := public.finance_create_expense(v_today, 'Printer Inc', 'office', 'Toner', 'Finance', 20, 'USD', 0, null, true);
  v_exp2 := (r->>'id')::uuid;
  begin perform public.finance_approve_expense(v_exp2); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('submitter cannot approve own expense', v_state = '42501', v_state);
  begin perform public.finance_pay_expense(v_exp); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('submitted (unapproved) expense cannot be paid', v_state = '22023', v_state);
  perform public.finance_approve_expense(v_exp);
  perform pg_temp._t_rec('finance manager approves reporter expense', (select status from public.finance_expenses where id = v_exp) = 'approved');
  perform public.finance_pay_expense(v_exp);
  perform pg_temp._t_rec('approved expense paid', (select status||'/'||payment_status from public.finance_expenses where id = v_exp) = 'paid/paid');

  perform pg_temp._t_act((v_sub->>'editor')::uuid, 's-editor');
  r := public.finance_create_expense(v_today, 'Freelancer', 'freelance', 'Photo set', 'Editorial', 80, 'USD', 0, null, true);
  v_exp3 := (r->>'id')::uuid;
  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-fmgr');
  begin perform public.finance_reject_expense(v_exp3, ''); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('rejection requires a reason', v_state = '22023', v_state);
  perform public.finance_reject_expense(v_exp3, 'Missing receipt');
  perform pg_temp._t_rec('expense rejection works', (select status from public.finance_expenses where id = v_exp3) = 'rejected');

  perform pg_temp._t_act((v_sub->>'reporter')::uuid, 's-reporter');
  r := public.finance_list_expenses();
  perform pg_temp._t_rec('reporter sees only own expenses', jsonb_array_length(r) = 1, jsonb_array_length(r)::text);
  perform pg_temp._t_act((v_sub->>'fmgr')::uuid, 's-fmgr');
  r := public.finance_list_expenses();
  perform pg_temp._t_rec('finance manager sees all expenses', jsonb_array_length(r) = 3, jsonb_array_length(r)::text);
  perform pg_temp._t_rec('finance manager lacks story.publish', not public.newsroom_has_capability('story.publish'));
  perform pg_temp._t_act((v_sub->>'officer')::uuid, 's-officer');
  perform pg_temp._t_rec('accounts officer lacks story.publish', not public.newsroom_has_capability('story.publish'));

  -- ---------------- statements / overview ----------------
  perform pg_temp._t_act((v_sub->>'owner')::uuid, 's-owner');
  r := public.finance_statements(v_today - 60, v_today + 1);
  perform pg_temp._t_rec('statements: balance sheet explicitly unavailable', (r->>'balance_sheet') like 'NOT AVAILABLE%');
  perform pg_temp._t_rec('statements: income statement has USD revenue', exists(
     select 1 from jsonb_array_elements(r->'income_statement') e where e->>'currency'='USD' and (e->>'revenue')::numeric > 0));
  perform pg_temp._t_rec('statements: revenue by placement present', exists(
     select 1 from jsonb_array_elements(r->'revenue_by_placement') e where e->>'placement'='masthead'));
  perform pg_temp._t_rec('statements: cash receipts by method present', jsonb_array_length(r->'cash_receipts') >= 1);
  perform pg_temp._t_rec('statements: expense summary present', jsonb_array_length(r->'expense_summary') >= 1);
  r := public.finance_overview();
  perform pg_temp._t_rec('overview: collected = 1285.00 for USD', exists(
     select 1 from jsonb_array_elements(r->'by_currency') e where e->>'currency'='USD' and (e->>'revenue_collected')::numeric = 1285.00), r->'by_currency'::text);

  -- ---------------- audit ----------------
  select count(*) into v_n from public.audit_logs where action like 'finance.%' or action like 'commercial.order.%';
  perform pg_temp._t_rec('audit events recorded for finance mutations', v_n >= 20, v_n::text);

  -- ---------------- session revocation ----------------
  update public.newsroom_sessions set revoked_at = now() where provider_session_id = 's-cmgr';
  perform pg_temp._t_act((v_sub->>'cmgr')::uuid, 's-cmgr');
  begin perform public.finance_list_customers(); v_state := 'OK';
  exception when others then v_state := sqlstate; end;
  perform pg_temp._t_rec('revoked session loses finance access', v_state = '42501', v_state);

  raise exception 'FINANCE_TEST_RESULTS %', (select jsonb_build_object(
     'total', count(*), 'passed', count(*) filter (where ok), 'failed', coalesce(jsonb_agg(jsonb_build_object('name',name,'detail',detail)) filter (where not ok), '[]'::jsonb))
     from _t_results);
end $$;
