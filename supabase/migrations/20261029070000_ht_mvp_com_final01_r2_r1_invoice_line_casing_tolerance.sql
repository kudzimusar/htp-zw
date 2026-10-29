-- Migration: 20261029070000_ht_mvp_com_final01_r2_r1_invoice_line_casing_tolerance.sql
-- Description: Add camelCase tolerance (unitPrice, taxRate) to finance_create_invoice and re-assert explicit execution grants.

create or replace function public.finance_create_invoice(
  p_customer_id uuid, p_order_id uuid, p_issue_date date, p_due_date date,
  p_currency text, p_lines jsonb, p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.invoice.create');
  v_cust public.finance_customers%rowtype;
  v_ord public.commercial_orders%rowtype;
  v_line jsonb;
  v_pos int := 0;
  v_qty numeric(18,4); v_price numeric(18,2); v_rate numeric(7,4); v_disc numeric(18,2);
  v_gross numeric(18,2); v_net numeric(18,2); v_tax numeric(18,2);
  v_sub numeric(18,2) := 0; v_disc_total numeric(18,2) := 0; v_tax_total numeric(18,2) := 0;
  v_id uuid; v_number text; v_total numeric(18,2);
  v_billed numeric(18,2);
begin
  perform public.finance_check_currency(p_currency);
  select * into v_cust from public.finance_customers where id = p_customer_id and status = 'active';
  if v_cust.id is null then raise exception using errcode='P0002', message='Active customer not found'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception using errcode='22023', message='At least one invoice line is required';
  end if;
  if jsonb_array_length(p_lines) > 200 then
    raise exception using errcode='22023', message='Too many invoice lines';
  end if;
  if p_order_id is not null then
    select * into v_ord from public.commercial_orders where id = p_order_id for update;
    if v_ord.id is null or v_ord.status <> 'approved' then
      raise exception using errcode='22023', message='Invoices may only reference an approved commercial order';
    end if;
    if v_ord.currency <> p_currency or v_ord.customer_id <> p_customer_id then
      raise exception using errcode='22023', message='Invoice currency/customer must match the commercial order';
    end if;
  end if;
  if p_issue_date is not null and p_due_date is not null and p_due_date < p_issue_date then
    raise exception using errcode='22023', message='Due date cannot precede issue date';
  end if;

  v_number := public.finance_next_number('invoice');
  insert into public.finance_invoices(invoice_number, customer_id, order_id, campaign_id, issue_date, due_date,
    currency, subtotal, tax_total, discount_total, total, balance_due, notes, created_by)
  values (v_number, p_customer_id, p_order_id, v_ord.campaign_id, p_issue_date, p_due_date,
    p_currency, 0, 0, 0, 0, 0, p_notes, v_actor)
  returning id into v_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_pos := v_pos + 1;
    v_qty := coalesce((v_line->>'quantity')::numeric, (v_line->>'qty')::numeric);
    v_price := round(coalesce((v_line->>'unit_price')::numeric, (v_line->>'unitPrice')::numeric), 2);
    v_rate := coalesce((v_line->>'tax_rate')::numeric, (v_line->>'taxRate')::numeric, 0);
    v_disc := round(coalesce((v_line->>'discount')::numeric, 0), 2);
    if coalesce(v_line->>'description','') = '' or v_qty is null or v_qty <= 0 or v_price is null
       or v_price < 0 or v_rate < 0 or v_rate > 1 or v_disc < 0 then
      raise exception using errcode='22023', message='Invalid invoice line ' || v_pos::text;
    end if;
    v_gross := round(v_qty * v_price, 2);
    v_net := v_gross - v_disc;
    if v_net < 0 then raise exception using errcode='22023', message='Line discount exceeds line value (line ' || v_pos::text || ')'; end if;
    v_tax := round(v_net * v_rate, 2);
    insert into public.finance_invoice_lines(invoice_id, position, description, category, quantity, unit_price,
      tax_rate, discount, line_total, campaign_id, placement, service_period_start, service_period_end)
    values (v_id, v_pos, trim(v_line->>'description'), nullif(v_line->>'category',''), v_qty, v_price, v_rate, v_disc,
      v_net, nullif(v_line->>'campaign_id','')::uuid, nullif(v_line->>'placement',''),
      nullif(v_line->>'service_period_start','')::date, nullif(v_line->>'service_period_end','')::date);
    v_sub := v_sub + v_gross; v_disc_total := v_disc_total + v_disc; v_tax_total := v_tax_total + v_tax;
  end loop;

  v_total := v_sub - v_disc_total + v_tax_total;
  update public.finance_invoices
     set subtotal = v_sub, discount_total = v_disc_total, tax_total = v_tax_total,
         total = v_total, balance_due = v_total, updated_at = now()
   where id = v_id;

  if p_order_id is not null then
    select coalesce(sum(total),0) into v_billed from public.finance_invoices
     where order_id = p_order_id and status not in ('void','cancelled');
    update public.commercial_orders
       set billing_status = case when v_billed >= total then 'billed' when v_billed > 0 then 'partially_billed' else 'unbilled' end,
           updated_at = now()
     where id = p_order_id;
  end if;

  perform public.finance_audit(v_actor,'finance.invoice.created','finance_invoices',v_id,
    jsonb_build_object('invoice_number', v_number, 'total', v_total, 'currency', p_currency));
  return jsonb_build_object('id', v_id, 'invoice_number', v_number, 'total', v_total);
end $$;

-- Privilege hardening: revoke from public/anon, grant to authenticated and service_role
revoke all on function public.finance_create_invoice(uuid, uuid, date, date, text, jsonb, text) from public;
revoke all on function public.finance_create_invoice(uuid, uuid, date, date, text, jsonb, text) from anon;
grant execute on function public.finance_create_invoice(uuid, uuid, date, date, text, jsonb, text) to authenticated, service_role;
