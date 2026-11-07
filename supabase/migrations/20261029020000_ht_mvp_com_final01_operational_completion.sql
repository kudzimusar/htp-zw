-- HT-MVP-COM-FINAL-01: Finance, Accounting & Commercial Operational Completion
-- Additive enhancements:
-- 1. Correct finance_issue_invoice to account for discounts in General Ledger Revenue line and ensure idempotent re-issue
-- 2. Add commercial_list_orders(p_status) status filter overload (replacing 0-arg function)
-- 3. Add finance_list_expenses(p_status) status filter overload (replacing 0-arg function)
-- 4. Harden customer upsert to accept both corporate legal and trading names cleanly

-- 1. finance_issue_invoice: GL balancing with discounts + idempotency
create or replace function public.finance_issue_invoice(
  p_invoice_id uuid,
  p_issue_date date default null,
  p_due_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.invoice.create');
  i public.finance_invoices%rowtype;
  c public.finance_customers%rowtype;
  v_issue date;
  v_due date;
  v_ar_acc uuid;
  v_rev_acc uuid;
  v_tax_acc uuid;
  v_lines jsonb;
  v_jrn_id uuid;
  v_net_rev numeric(18,2);
begin
  select * into i from public.finance_invoices where id = p_invoice_id for update;
  if i.id is null then raise exception using errcode='P0002', message='Invoice not found'; end if;

  -- Idempotency check: if already issued, return existing issued record without double-posting
  if i.status = 'issued' then
    select id into v_jrn_id from public.finance_journal_entries
     where source_document_id = i.id and source_document_type = 'invoice'
     limit 1;
    return jsonb_build_object(
      'id', i.id,
      'status', 'issued',
      'invoice_number', i.invoice_number,
      'issue_date', i.issue_date,
      'due_date', i.due_date,
      'journal_id', v_jrn_id
    );
  end if;

  if i.status <> 'approved' then
    raise exception using errcode='22023', message='Only approved invoices can be issued (current status: ' || i.status || ')';
  end if;

  select * into c from public.finance_customers where id = i.customer_id;
  v_issue := coalesce(p_issue_date, i.issue_date, (now() at time zone 'Africa/Harare')::date);
  v_due := coalesce(p_due_date, i.due_date, v_issue + coalesce(c.payment_terms_days, 30));
  if v_due < v_issue then raise exception using errcode='22023', message='Due date cannot precede issue date'; end if;

  update public.finance_invoices
     set status = 'issued',
         issue_date = v_issue,
         due_date = v_due,
         issued_by = v_actor,
         issued_at = now(),
         updated_at = now()
   where id = i.id;

  -- Post General Ledger Journal: DR 1200 AR, CR 4000 Commercial Revenue (net of discounts), CR 2100 Tax
  select id into v_ar_acc from public.finance_chart_of_accounts where account_code = '1200';
  select id into v_rev_acc from public.finance_chart_of_accounts where account_code = '4000';
  select id into v_tax_acc from public.finance_chart_of_accounts where account_code = '2100';

  if v_ar_acc is not null and v_rev_acc is not null and i.total > 0 then
    v_net_rev := round(i.subtotal - coalesce(i.discount_total, 0), 2);

    if coalesce(i.tax_total, 0) > 0 and v_tax_acc is not null then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_id', v_ar_acc, 'debit', i.total, 'credit', 0, 'description', 'Accounts Receivable for ' || i.invoice_number),
        jsonb_build_object('account_id', v_rev_acc, 'debit', 0, 'credit', v_net_rev, 'description', 'Commercial Advertising Revenue for ' || i.invoice_number),
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

  perform public.finance_audit(
    v_actor, 'finance.invoice.issued', 'finance_invoices', i.id,
    jsonb_build_object('invoice_number', i.invoice_number, 'due_date', v_due, 'journal_id', v_jrn_id)
  );

  return jsonb_build_object(
    'id', i.id,
    'status', 'issued',
    'invoice_number', i.invoice_number,
    'issue_date', v_issue,
    'due_date', v_due,
    'journal_id', v_jrn_id
  );
end $$;

grant execute on function public.finance_issue_invoice(uuid, date, date) to authenticated, service_role;

-- 2. commercial_list_orders with optional p_status parameter
drop function if exists public.commercial_list_orders();
create or replace function public.commercial_list_orders(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not (public.newsroom_has_capability('commercial.order.create') or public.newsroom_has_capability('finance.view')) then
    raise exception using errcode='42501', message='commercial.order.create or finance.view capability required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc) from (
      select o.id, o.order_number, o.customer_id, c.legal_name as customer_name, o.campaign_id,
             o.order_date, o.start_date, o.end_date, o.currency, o.subtotal, o.tax_total,
             o.discount_total, o.total, o.status, o.billing_status, o.created_by, o.approved_by, o.created_at
      from public.commercial_orders o
      join public.finance_customers c on c.id = o.customer_id
      where (p_status is null or p_status = 'all' or o.status = p_status)
    ) q), '[]'::jsonb);
end $$;

grant execute on function public.commercial_list_orders(text) to authenticated, service_role;

-- 3. finance_list_expenses with optional p_status parameter
drop function if exists public.finance_list_expenses();
create or replace function public.finance_list_expenses(p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_is_mgr boolean;
begin
  if not (public.newsroom_has_capability('finance.expense.view') or public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.expense.create')) then
    raise exception using errcode='42501', message='finance.expense.view capability required';
  end if;
  v_is_mgr := public.newsroom_has_capability('finance.expense.approve') or public.newsroom_has_capability('finance.view');
  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc) from (
      select e.id, e.expense_number, e.expense_date, e.vendor as vendor_name, e.category,
             e.description, e.department, e.amount, e.currency, e.tax_amount,
             e.document_ref as receipt_reference, e.status, e.payment_status,
             e.submitted_by, sp.display_name as submitted_by_name,
             e.approved_by, ap.display_name as approved_by_name,
             e.approved_at, e.paid_at, e.rejection_reason, e.created_at
      from public.finance_expenses e
      left join public.staff_profiles sp on sp.id = e.submitted_by
      left join public.staff_profiles ap on ap.id = e.approved_by
      where (v_is_mgr or e.submitted_by = v_actor)
        and (p_status is null or p_status = 'all' or e.status = p_status)
    ) q), '[]'::jsonb);
end $$;

grant execute on function public.finance_list_expenses(text) to authenticated, service_role;

-- 4. finance_upsert_customer: robust legal & trading name handling
create or replace function public.finance_upsert_customer(
  p_id uuid,
  p_advertiser_id uuid,
  p_legal_name text,
  p_trading_name text,
  p_billing_email text,
  p_billing_phone text,
  p_billing_address text,
  p_tax_identifier text,
  p_currency text,
  p_payment_terms_days int
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_resolved_legal text;
  v_resolved_trading text;
begin
  if public.newsroom_has_capability('finance.invoice.create') then
    v_actor := public.finance_require('finance.invoice.create');
  else
    v_actor := public.finance_require('commercial.order.create');
  end if;
  perform public.finance_check_currency(p_currency);

  v_resolved_legal := coalesce(nullif(trim(p_legal_name),''), nullif(trim(p_trading_name),''));
  v_resolved_trading := coalesce(nullif(trim(p_trading_name),''), v_resolved_legal);

  if v_resolved_legal is null or length(v_resolved_legal) = 0 then
    raise exception using errcode='22023', message='Legal name is required';
  end if;

  if p_id is null then
    insert into public.finance_customers(
      advertiser_id, legal_name, trading_name, billing_email, billing_phone,
      billing_address, tax_identifier, currency, payment_terms_days, created_by
    )
    values (
      p_advertiser_id, v_resolved_legal, v_resolved_trading,
      nullif(trim(p_billing_email),''), nullif(trim(p_billing_phone),''),
      nullif(trim(p_billing_address),''), nullif(trim(p_tax_identifier),''),
      p_currency, coalesce(p_payment_terms_days, 30), v_actor
    )
    returning id into v_id;

    perform public.finance_audit(
      v_actor, 'finance.customer.created', 'finance_customers', v_id,
      jsonb_build_object('legal_name', v_resolved_legal, 'currency', p_currency)
    );
  else
    update public.finance_customers
       set advertiser_id = coalesce(p_advertiser_id, advertiser_id),
           legal_name = v_resolved_legal,
           trading_name = v_resolved_trading,
           billing_email = nullif(trim(p_billing_email),''),
           billing_phone = nullif(trim(p_billing_phone),''),
           billing_address = nullif(trim(p_billing_address),''),
           tax_identifier = nullif(trim(p_tax_identifier),''),
           currency = p_currency,
           payment_terms_days = coalesce(p_payment_terms_days, payment_terms_days),
           updated_at = now()
     where id = p_id
     returning id into v_id;

    if v_id is null then
      raise exception using errcode='P0002', message='Customer not found';
    end if;

    perform public.finance_audit(
      v_actor, 'finance.customer.updated', 'finance_customers', v_id,
      jsonb_build_object('legal_name', v_resolved_legal, 'currency', p_currency)
    );
  end if;

  return jsonb_build_object('id', v_id, 'legal_name', v_resolved_legal);
end $$;

grant execute on function public.finance_upsert_customer(uuid, uuid, text, text, text, text, text, text, text, int) to authenticated, service_role;
