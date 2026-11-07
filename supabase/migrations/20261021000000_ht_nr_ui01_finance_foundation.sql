-- HT-NR-UI-01: Finance & Accounting operational foundation.
-- Additive only. All finance tables are RLS-enabled with NO client grants;
-- every read/write goes through SECURITY DEFINER RPCs that enforce server-side
-- capabilities, separation of duties and audit logging.
--
-- Date semantics (documented, not mixed):
--   transaction_date  = business date a payment/expense occurred (date)
--   issue_date        = business date an invoice/order is issued (date)
--   due_date          = business date payment is due (date)
--   created_at        = system timestamp (timestamptz, UTC)
-- There is NO general ledger / posting period in this phase (see docs).

-- ---------------------------------------------------------------------------
-- 1. Capabilities
-- ---------------------------------------------------------------------------
insert into public.newsroom_capabilities(key, description) values
  ('finance.view','View the Finance workspace overview'),
  ('finance.invoice.create','Create draft invoices'),
  ('finance.invoice.approve','Approve or void invoices (separate from creator)'),
  ('finance.invoice.issue','Issue approved invoices to customers'),
  ('finance.payment.record','Record customer payments / receipts'),
  ('finance.receivable.view','View accounts receivable and aging'),
  ('finance.expense.view','View all expenses'),
  ('finance.expense.create','Submit own expenses'),
  ('finance.expense.approve','Approve or reject expenses (separate from submitter)'),
  ('finance.expense.pay','Record expense payment'),
  ('finance.statement.view','View financial statements'),
  ('finance.settings.manage','Manage finance configuration'),
  ('commercial.order.create','Create commercial (advertising) orders'),
  ('commercial.order.approve','Approve commercial orders (separate from creator)')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Roles + capability mapping
-- ---------------------------------------------------------------------------
insert into public.newsroom_roles(name, description) values
  ('Finance Manager','Owns invoicing approval, receivables, expenses and statements'),
  ('Accounts Officer','Prepares invoices, records payments and expenses')
on conflict (name) do nothing;

do $$
declare
  r record;
begin
  -- Publisher / Owner: full finance + commercial order authority.
  insert into public.newsroom_role_capabilities(role_id, capability_key)
  select ro.id, c.key
  from public.newsroom_roles ro, public.newsroom_capabilities c
  where ro.name = 'Publisher / Owner'
    and (c.key like 'finance.%' or c.key like 'commercial.order.%')
  on conflict do nothing;

  -- Finance Manager.
  insert into public.newsroom_role_capabilities(role_id, capability_key)
  select ro.id, k
  from public.newsroom_roles ro,
       unnest(array[
         'finance.view','finance.invoice.create','finance.invoice.approve','finance.invoice.issue',
         'finance.payment.record','finance.receivable.view','finance.expense.view',
         'finance.expense.create','finance.expense.approve','finance.expense.pay',
         'finance.statement.view','finance.settings.manage','commercial.order.approve',
         'ads.view','subscriber.view','analytics.view','staff.view'
       ]) k
  where ro.name = 'Finance Manager'
  on conflict do nothing;

  -- Accounts Officer (prepares, cannot approve).
  insert into public.newsroom_role_capabilities(role_id, capability_key)
  select ro.id, k
  from public.newsroom_roles ro,
       unnest(array[
         'finance.view','finance.invoice.create','finance.payment.record','finance.receivable.view',
         'finance.expense.view','finance.expense.create','finance.statement.view','ads.view'
       ]) k
  where ro.name = 'Accounts Officer'
  on conflict do nothing;

  -- Commercial Manager: order + draft-invoice handoff, read-only receivables.
  insert into public.newsroom_role_capabilities(role_id, capability_key)
  select ro.id, k
  from public.newsroom_roles ro,
       unnest(array[
         'commercial.order.create','commercial.order.approve','finance.invoice.create',
         'finance.view','finance.receivable.view','finance.expense.create'
       ]) k
  where ro.name = 'Commercial Manager'
  on conflict do nothing;

  -- Editorial staff may submit their own expenses (reporting, travel, freelance).
  insert into public.newsroom_role_capabilities(role_id, capability_key)
  select ro.id, 'finance.expense.create'
  from public.newsroom_roles ro
  where ro.name in ('Reporter / Journalist','News Editor','Section Editor','Managing Editor',
                    'Editor-in-Chief','Multimedia Editor','Social Editor','Newsletter Editor','Contributor')
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Numbering (collision-safe, atomic)
-- ---------------------------------------------------------------------------
create table if not exists public.finance_number_counters (
  doc_type text not null check (doc_type in ('invoice','payment','expense','order')),
  fiscal_year int not null,
  last_value int not null default 0 check (last_value >= 0),
  primary key (doc_type, fiscal_year)
);

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
    when 'invoice' then 'INV' when 'payment' then 'PAY'
    when 'expense' then 'EXP' when 'order' then 'ORD'
    else null end;
  if v_prefix is null then
    raise exception using errcode='22023', message='Unknown finance document type';
  end if;
  insert into public.finance_number_counters(doc_type, fiscal_year, last_value)
  values (p_type, v_year, 1)
  on conflict (doc_type, fiscal_year)
  do update set last_value = public.finance_number_counters.last_value + 1
  returning last_value into v_n;
  return v_prefix || '-' || v_year::text || '-' || lpad(v_n::text, 4, '0');
end $$;

-- ---------------------------------------------------------------------------
-- 4. Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.finance_customers (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references public.advertisers(id) on delete set null,
  legal_name text not null check (length(trim(legal_name)) > 0),
  trading_name text,
  billing_email text,
  billing_phone text,
  billing_address text,
  tax_identifier text,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  payment_terms_days int not null default 30 check (payment_terms_days between 0 and 365),
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists finance_customers_advertiser_uq
  on public.finance_customers(advertiser_id) where advertiser_id is not null;

create table if not exists public.commercial_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.finance_customers(id),
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  order_date date not null default current_date,
  start_date date,
  end_date date,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(18,2) not null check (subtotal >= 0),
  tax_total numeric(18,2) not null default 0 check (tax_total >= 0),
  discount_total numeric(18,2) not null default 0 check (discount_total >= 0),
  total numeric(18,2) not null check (total >= 0),
  status text not null default 'draft' check (status in ('draft','approved','cancelled')),
  billing_status text not null default 'unbilled' check (billing_status in ('unbilled','partially_billed','billed')),
  notes text,
  created_by uuid not null references public.staff_profiles(id),
  approved_by uuid references public.staff_profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal + tax_total - discount_total),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references public.finance_customers(id),
  order_id uuid references public.commercial_orders(id) on delete set null,
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  issue_date date,
  due_date date,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(18,2) not null check (subtotal >= 0),
  tax_total numeric(18,2) not null default 0 check (tax_total >= 0),
  discount_total numeric(18,2) not null default 0 check (discount_total >= 0),
  total numeric(18,2) not null check (total >= 0),
  amount_paid numeric(18,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(18,2) not null check (balance_due >= 0),
  status text not null default 'draft'
    check (status in ('draft','approved','issued','partially_paid','paid','overdue','void','cancelled')),
  notes text,
  created_by uuid not null references public.staff_profiles(id),
  approved_by uuid references public.staff_profiles(id),
  approved_at timestamptz,
  issued_by uuid references public.staff_profiles(id),
  issued_at timestamptz,
  voided_by uuid references public.staff_profiles(id),
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal + tax_total - discount_total),
  check (amount_paid <= total),
  check (balance_due = total - amount_paid),
  check (due_date is null or issue_date is null or due_date >= issue_date)
);
create index if not exists finance_invoices_customer_idx on public.finance_invoices(customer_id);
create index if not exists finance_invoices_status_idx on public.finance_invoices(status, due_date);

create table if not exists public.finance_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.finance_invoices(id) on delete cascade,
  position int not null check (position > 0),
  description text not null check (length(trim(description)) > 0),
  category text,
  quantity numeric(18,4) not null check (quantity > 0),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0 and tax_rate <= 1),
  discount numeric(18,2) not null default 0 check (discount >= 0),
  line_total numeric(18,2) not null check (line_total >= 0),
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  placement text,
  service_period_start date,
  service_period_end date,
  unique (invoice_id, position)
);

create table if not exists public.finance_payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique,
  customer_id uuid not null references public.finance_customers(id),
  invoice_id uuid not null references public.finance_invoices(id),
  amount numeric(18,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  payment_date date not null,
  method text not null check (method in ('bank_transfer','card','mobile_money','cash','other')),
  provider_reference text,
  idempotency_key text not null unique,
  received_by uuid not null references public.staff_profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_expense_categories (
  key text primary key check (key ~ '^[a-z_]+$'),
  label text not null,
  active boolean not null default true,
  sort_order int not null default 0
);
insert into public.finance_expense_categories(key,label,sort_order) values
  ('reporting','Reporting',10),('travel','Travel',20),('freelance','Freelance',30),
  ('photography','Photography',40),('production','Production',50),('technology','Technology',60),
  ('hosting','Hosting',70),('marketing','Marketing',80),('advertising','Advertising',90),
  ('office','Office',100),('professional_services','Professional Services',110),('other','Other',999)
on conflict (key) do nothing;

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_number text not null unique,
  expense_date date not null,
  vendor text not null check (length(trim(vendor)) > 0),
  category text not null references public.finance_expense_categories(key),
  description text not null check (length(trim(description)) > 0),
  department text,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  tax_amount numeric(18,2) not null default 0 check (tax_amount >= 0 and tax_amount <= amount),
  document_ref text,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','paid','void')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  submitted_by uuid not null references public.staff_profiles(id),
  submitted_at timestamptz,
  approved_by uuid references public.staff_profiles(id),
  approved_at timestamptz,
  rejected_reason text,
  paid_by uuid references public.staff_profiles(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (approved_by is null or approved_by <> submitted_by)
);
create index if not exists finance_expenses_submitter_idx on public.finance_expenses(submitted_by);

-- ---------------------------------------------------------------------------
-- 5. Lock tables down: RLS on, no client privileges, no policies.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'finance_number_counters','finance_customers','commercial_orders','finance_invoices',
    'finance_invoice_lines','finance_payments','finance_expense_categories','finance_expenses'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
  end loop;
end $$;

-- Payments are immutable receipts.
create or replace function public.finance_payments_immutable()
returns trigger language plpgsql as $$
begin
  raise exception using errcode='42501', message='Finance payments are immutable';
end $$;
drop trigger if exists finance_payments_no_update on public.finance_payments;
create trigger finance_payments_no_update before update or delete on public.finance_payments
for each row execute function public.finance_payments_immutable();

-- ---------------------------------------------------------------------------
-- 6. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.finance_require(p_cap text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare v uuid := public.newsroom_current_staff_id_basic();
begin
  if v is null or not public.newsroom_has_capability(p_cap) then
    raise exception using errcode='42501', message = p_cap || ' capability required';
  end if;
  return v;
end $$;

create or replace function public.finance_audit(p_actor uuid, p_action text, p_table text, p_id uuid, p_meta jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values (p_actor, p_action, p_table, p_id, coalesce(p_meta, '{}'::jsonb));
$$;

create or replace function public.finance_check_currency(p_currency text)
returns text
language plpgsql
immutable
as $$
begin
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception using errcode='22023', message='Currency must be an ISO 4217 code (e.g. USD, ZWG)';
  end if;
  return p_currency;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Customers
-- ---------------------------------------------------------------------------
create or replace function public.finance_upsert_customer(
  p_id uuid, p_advertiser_id uuid, p_legal_name text, p_trading_name text,
  p_billing_email text, p_billing_phone text, p_billing_address text,
  p_tax_identifier text, p_currency text, p_payment_terms_days int
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid;
  v_id uuid;
begin
  if public.newsroom_has_capability('finance.invoice.create') then
    v_actor := public.finance_require('finance.invoice.create');
  else
    v_actor := public.finance_require('commercial.order.create');
  end if;
  perform public.finance_check_currency(p_currency);
  if p_legal_name is null or length(trim(p_legal_name)) = 0 then
    raise exception using errcode='22023', message='Legal name is required';
  end if;
  if p_id is null then
    insert into public.finance_customers(advertiser_id, legal_name, trading_name, billing_email, billing_phone,
      billing_address, tax_identifier, currency, payment_terms_days, created_by)
    values (p_advertiser_id, trim(p_legal_name), nullif(trim(p_trading_name),''), nullif(trim(p_billing_email),''),
      nullif(trim(p_billing_phone),''), nullif(trim(p_billing_address),''), nullif(trim(p_tax_identifier),''),
      p_currency, coalesce(p_payment_terms_days, 30), v_actor)
    returning id into v_id;
    perform public.finance_audit(v_actor,'finance.customer.created','finance_customers',v_id,
      jsonb_build_object('legal_name', trim(p_legal_name)));
  else
    update public.finance_customers set
      advertiser_id = p_advertiser_id, legal_name = trim(p_legal_name),
      trading_name = nullif(trim(p_trading_name),''), billing_email = nullif(trim(p_billing_email),''),
      billing_phone = nullif(trim(p_billing_phone),''), billing_address = nullif(trim(p_billing_address),''),
      tax_identifier = nullif(trim(p_tax_identifier),''), currency = p_currency,
      payment_terms_days = coalesce(p_payment_terms_days, payment_terms_days), updated_at = now()
    where id = p_id returning id into v_id;
    if v_id is null then raise exception using errcode='P0002', message='Customer not found'; end if;
    perform public.finance_audit(v_actor,'finance.customer.updated','finance_customers',v_id, '{}'::jsonb);
  end if;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.finance_list_customers()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('commercial.order.create')
          or public.newsroom_has_capability('finance.invoice.create')) then
    raise exception using errcode='42501', message='finance.view capability required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(c) order by c.legal_name) from (
      select id, advertiser_id, legal_name, trading_name, billing_email, billing_phone, billing_address,
             tax_identifier, currency, payment_terms_days, status, created_at
      from public.finance_customers
    ) c), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- 8. Commercial orders
-- ---------------------------------------------------------------------------
create or replace function public.commercial_create_order(
  p_customer_id uuid, p_campaign_id uuid, p_start_date date, p_end_date date, p_currency text,
  p_subtotal numeric, p_tax numeric, p_discount numeric, p_notes text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('commercial.order.create');
  v_id uuid;
  v_number text;
  v_total numeric(18,2);
begin
  perform public.finance_check_currency(p_currency);
  if p_subtotal is null or p_subtotal < 0 or coalesce(p_tax,0) < 0 or coalesce(p_discount,0) < 0 then
    raise exception using errcode='22023', message='Order amounts must be non-negative';
  end if;
  v_total := round(p_subtotal,2) + round(coalesce(p_tax,0),2) - round(coalesce(p_discount,0),2);
  if v_total < 0 then raise exception using errcode='22023', message='Discount exceeds order value'; end if;
  perform 1 from public.finance_customers where id = p_customer_id and status = 'active';
  if not found then raise exception using errcode='P0002', message='Active customer not found'; end if;
  v_number := public.finance_next_number('order');
  insert into public.commercial_orders(order_number, customer_id, campaign_id, start_date, end_date, currency,
    subtotal, tax_total, discount_total, total, notes, created_by)
  values (v_number, p_customer_id, p_campaign_id, p_start_date, p_end_date, p_currency,
    round(p_subtotal,2), round(coalesce(p_tax,0),2), round(coalesce(p_discount,0),2), v_total, p_notes, v_actor)
  returning id into v_id;
  perform public.finance_audit(v_actor,'commercial.order.created','commercial_orders',v_id,
    jsonb_build_object('order_number', v_number, 'total', v_total, 'currency', p_currency));
  return jsonb_build_object('id', v_id, 'order_number', v_number);
end $$;

create or replace function public.commercial_approve_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('commercial.order.approve');
  o public.commercial_orders%rowtype;
begin
  select * into o from public.commercial_orders where id = p_order_id for update;
  if o.id is null then raise exception using errcode='P0002', message='Order not found'; end if;
  if o.status <> 'draft' then raise exception using errcode='22023', message='Only draft orders can be approved'; end if;
  if o.created_by = v_actor then
    raise exception using errcode='42501', message='Order creator cannot approve their own order';
  end if;
  update public.commercial_orders set status='approved', approved_by=v_actor, approved_at=now(), updated_at=now()
  where id = o.id;
  perform public.finance_audit(v_actor,'commercial.order.approved','commercial_orders',o.id,
    jsonb_build_object('order_number', o.order_number));
  return jsonb_build_object('id', o.id, 'status', 'approved');
end $$;

create or replace function public.commercial_list_orders()
returns jsonb
language plpgsql
stable
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
      from public.commercial_orders o join public.finance_customers c on c.id = o.customer_id
    ) q), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- 9. Invoices
-- ---------------------------------------------------------------------------
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
    v_qty := (v_line->>'quantity')::numeric;
    v_price := round((v_line->>'unit_price')::numeric, 2);
    v_rate := coalesce((v_line->>'tax_rate')::numeric, 0);
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

create or replace function public.finance_approve_invoice(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.invoice.approve');
  i public.finance_invoices%rowtype;
begin
  select * into i from public.finance_invoices where id = p_invoice_id for update;
  if i.id is null then raise exception using errcode='P0002', message='Invoice not found'; end if;
  if i.status <> 'draft' then raise exception using errcode='22023', message='Only draft invoices can be approved'; end if;
  if i.created_by = v_actor then
    raise exception using errcode='42501', message='Invoice creator cannot approve their own invoice';
  end if;
  update public.finance_invoices set status='approved', approved_by=v_actor, approved_at=now(), updated_at=now()
   where id = i.id;
  perform public.finance_audit(v_actor,'finance.invoice.approved','finance_invoices',i.id,
    jsonb_build_object('invoice_number', i.invoice_number));
  return jsonb_build_object('id', i.id, 'status', 'approved');
end $$;

create or replace function public.finance_issue_invoice(p_invoice_id uuid, p_issue_date date default null, p_due_date date default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.invoice.issue');
  i public.finance_invoices%rowtype;
  c public.finance_customers%rowtype;
  v_issue date;
  v_due date;
begin
  select * into i from public.finance_invoices where id = p_invoice_id for update;
  if i.id is null then raise exception using errcode='P0002', message='Invoice not found'; end if;
  if i.status <> 'approved' then raise exception using errcode='22023', message='Only approved invoices can be issued'; end if;
  select * into c from public.finance_customers where id = i.customer_id;
  v_issue := coalesce(p_issue_date, i.issue_date, (now() at time zone 'Africa/Harare')::date);
  v_due := coalesce(p_due_date, i.due_date, v_issue + c.payment_terms_days);
  if v_due < v_issue then raise exception using errcode='22023', message='Due date cannot precede issue date'; end if;
  update public.finance_invoices
     set status='issued', issue_date=v_issue, due_date=v_due, issued_by=v_actor, issued_at=now(), updated_at=now()
   where id = i.id;
  perform public.finance_audit(v_actor,'finance.invoice.issued','finance_invoices',i.id,
    jsonb_build_object('invoice_number', i.invoice_number, 'due_date', v_due));
  return jsonb_build_object('id', i.id, 'status', 'issued', 'issue_date', v_issue, 'due_date', v_due);
end $$;

create or replace function public.finance_void_invoice(p_invoice_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.invoice.approve');
  i public.finance_invoices%rowtype;
begin
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception using errcode='22023', message='A void reason is required';
  end if;
  select * into i from public.finance_invoices where id = p_invoice_id for update;
  if i.id is null then raise exception using errcode='P0002', message='Invoice not found'; end if;
  if i.status in ('void','cancelled','paid') or i.amount_paid > 0 then
    raise exception using errcode='22023', message='Invoice with payments or terminal status cannot be voided';
  end if;
  update public.finance_invoices
     set status='void', voided_by=v_actor, voided_at=now(), void_reason=trim(p_reason), updated_at=now()
   where id = i.id;
  if i.order_id is not null then
    update public.commercial_orders o set billing_status = (
      select case when coalesce(sum(f.total),0) >= o.total then 'billed' when coalesce(sum(f.total),0) > 0 then 'partially_billed' else 'unbilled' end
      from public.finance_invoices f where f.order_id = o.id and f.status not in ('void','cancelled')
    ), updated_at = now() where o.id = i.order_id;
  end if;
  perform public.finance_audit(v_actor,'finance.invoice.voided','finance_invoices',i.id,
    jsonb_build_object('invoice_number', i.invoice_number, 'reason', trim(p_reason)));
  return jsonb_build_object('id', i.id, 'status', 'void');
end $$;

create or replace function public.finance_list_invoices(p_status text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.receivable.view')
          or public.newsroom_has_capability('finance.invoice.create')) then
    raise exception using errcode='42501', message='finance.view capability required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc) from (
      select i.id, i.invoice_number, i.customer_id, c.legal_name as customer_name, i.order_id, i.campaign_id,
             i.issue_date, i.due_date, i.currency, i.subtotal, i.tax_total, i.discount_total, i.total,
             i.amount_paid, i.balance_due, i.status,
             case when i.status in ('issued','partially_paid') and i.due_date is not null
                       and i.due_date < (now() at time zone 'Africa/Harare')::date then 'overdue' else i.status end as effective_status,
             case when i.balance_due > 0 and i.status in ('issued','partially_paid','overdue') and i.due_date is not null
                  then greatest(0, (now() at time zone 'Africa/Harare')::date - i.due_date) else 0 end as days_overdue,
             i.created_by, i.approved_by, i.created_at
      from public.finance_invoices i join public.finance_customers c on c.id = i.customer_id
      where p_status is null or i.status = p_status
    ) q), '[]'::jsonb);
end $$;

create or replace function public.finance_get_invoice(p_invoice_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare r jsonb;
begin
  if not (public.newsroom_has_capability('finance.view') or public.newsroom_has_capability('finance.receivable.view')
          or public.newsroom_has_capability('finance.invoice.create')) then
    raise exception using errcode='42501', message='finance.view capability required';
  end if;
  select to_jsonb(i) || jsonb_build_object(
    'customer_name', c.legal_name,
    'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.position) from public.finance_invoice_lines l where l.invoice_id = i.id), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('payment_number', p.payment_number, 'amount', p.amount,
        'currency', p.currency, 'payment_date', p.payment_date, 'method', p.method, 'provider_reference', p.provider_reference)
        order by p.created_at) from public.finance_payments p where p.invoice_id = i.id), '[]'::jsonb))
  into r
  from public.finance_invoices i join public.finance_customers c on c.id = i.customer_id
  where i.id = p_invoice_id;
  if r is null then raise exception using errcode='P0002', message='Invoice not found'; end if;
  return r;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Payments / receipts
-- ---------------------------------------------------------------------------
create or replace function public.finance_record_payment(
  p_invoice_id uuid, p_amount numeric, p_currency text, p_payment_date date, p_method text,
  p_provider_reference text, p_notes text, p_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.payment.record');
  i public.finance_invoices%rowtype;
  v_amount numeric(18,2);
  v_existing public.finance_payments%rowtype;
  v_number text;
  v_id uuid;
  v_new_paid numeric(18,2);
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception using errcode='22023', message='An idempotency key of at least 8 characters is required';
  end if;
  select * into v_existing from public.finance_payments where idempotency_key = trim(p_idempotency_key);
  if v_existing.id is not null then
    if v_existing.invoice_id <> p_invoice_id or v_existing.amount <> round(p_amount,2) then
      raise exception using errcode='22023', message='Idempotency key already used for a different payment';
    end if;
    return jsonb_build_object('id', v_existing.id, 'payment_number', v_existing.payment_number, 'replayed', true);
  end if;
  perform public.finance_check_currency(p_currency);
  v_amount := round(p_amount, 2);
  if v_amount is null or v_amount <= 0 then
    raise exception using errcode='22023', message='Payment amount must be positive';
  end if;
  if p_method not in ('bank_transfer','card','mobile_money','cash','other') then
    raise exception using errcode='22023', message='Unsupported payment method';
  end if;
  if p_payment_date is null then raise exception using errcode='22023', message='Payment date is required'; end if;
  select * into i from public.finance_invoices where id = p_invoice_id for update;
  if i.id is null then raise exception using errcode='P0002', message='Invoice not found'; end if;
  if i.status not in ('issued','partially_paid','overdue') then
    raise exception using errcode='22023', message='Payments can only be recorded against issued invoices';
  end if;
  if i.currency <> p_currency then
    raise exception using errcode='22023', message='Payment currency must match invoice currency';
  end if;
  if v_amount > i.balance_due then
    raise exception using errcode='22023', message='Payment exceeds invoice balance due';
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

  perform public.finance_audit(v_actor,'finance.payment.recorded','finance_payments',v_id,
    jsonb_build_object('payment_number', v_number, 'invoice_number', i.invoice_number, 'amount', v_amount, 'currency', p_currency));
  return jsonb_build_object('id', v_id, 'payment_number', v_number, 'replayed', false,
    'invoice_status', case when v_new_paid >= i.total then 'paid' else 'partially_paid' end);
end $$;

create or replace function public.finance_list_payments()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not (public.newsroom_has_capability('finance.payment.record') or public.newsroom_has_capability('finance.view')) then
    raise exception using errcode='42501', message='finance.view capability required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc) from (
      select p.id, p.payment_number, p.customer_id, c.legal_name as customer_name, p.invoice_id, i.invoice_number,
             p.amount, p.currency, p.payment_date, p.method, p.provider_reference, p.created_at
      from public.finance_payments p
      join public.finance_customers c on c.id = p.customer_id
      join public.finance_invoices i on i.id = p.invoice_id
    ) q), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- 11. Receivables aging
-- ---------------------------------------------------------------------------
create or replace function public.finance_receivables_aging()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_today date := (now() at time zone 'Africa/Harare')::date;
begin
  if not (public.newsroom_has_capability('finance.receivable.view') or public.newsroom_has_capability('finance.view')) then
    raise exception using errcode='42501', message='finance.receivable.view capability required';
  end if;
  return jsonb_build_object(
    'as_of', v_today,
    'totals', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.currency) from (
        select currency,
          sum(balance_due) as total,
          coalesce(sum(balance_due) filter (where due_date is null or due_date >= v_today),0) as not_due,
          coalesce(sum(balance_due) filter (where due_date < v_today and v_today - due_date between 1 and 30),0) as d1_30,
          coalesce(sum(balance_due) filter (where v_today - due_date between 31 and 60),0) as d31_60,
          coalesce(sum(balance_due) filter (where v_today - due_date between 61 and 90),0) as d61_90,
          coalesce(sum(balance_due) filter (where v_today - due_date > 90),0) as d90_plus
        from public.finance_invoices
        where balance_due > 0 and status in ('issued','partially_paid','overdue')
        group by currency) t), '[]'::jsonb),
    'customers', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.balance desc) from (
        select c.id as customer_id, c.legal_name, i.currency,
          count(*) as open_invoices, sum(i.balance_due) as balance,
          min(i.due_date) as oldest_due_date,
          coalesce(max(greatest(0, v_today - i.due_date)),0) as max_days_overdue,
          (select max(p.payment_date) from public.finance_payments p where p.customer_id = c.id) as last_payment_date
        from public.finance_invoices i join public.finance_customers c on c.id = i.customer_id
        where i.balance_due > 0 and i.status in ('issued','partially_paid','overdue')
        group by c.id, c.legal_name, i.currency) t), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------------
-- 12. Expenses
-- ---------------------------------------------------------------------------
create or replace function public.finance_create_expense(
  p_expense_date date, p_vendor text, p_category text, p_description text, p_department text,
  p_amount numeric, p_currency text, p_tax_amount numeric, p_document_ref text, p_submit boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.expense.create');
  v_number text;
  v_id uuid;
  v_amount numeric(18,2) := round(p_amount, 2);
  v_tax numeric(18,2) := round(coalesce(p_tax_amount,0), 2);
begin
  perform public.finance_check_currency(p_currency);
  if v_amount is null or v_amount <= 0 then raise exception using errcode='22023', message='Expense amount must be positive'; end if;
  if v_tax < 0 or v_tax > v_amount then raise exception using errcode='22023', message='Invalid tax amount'; end if;
  perform 1 from public.finance_expense_categories where key = p_category and active;
  if not found then raise exception using errcode='22023', message='Unknown expense category'; end if;
  v_number := public.finance_next_number('expense');
  insert into public.finance_expenses(expense_number, expense_date, vendor, category, description, department,
    amount, currency, tax_amount, document_ref, status, submitted_by, submitted_at)
  values (v_number, p_expense_date, trim(p_vendor), p_category, trim(p_description), nullif(trim(p_department),''),
    v_amount, p_currency, v_tax, nullif(trim(p_document_ref),''),
    case when p_submit then 'submitted' else 'draft' end, v_actor, case when p_submit then now() end)
  returning id into v_id;
  perform public.finance_audit(v_actor,'finance.expense.created','finance_expenses',v_id,
    jsonb_build_object('expense_number', v_number, 'amount', v_amount, 'currency', p_currency, 'submitted', p_submit));
  return jsonb_build_object('id', v_id, 'expense_number', v_number);
end $$;

create or replace function public.finance_submit_expense(p_expense_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.expense.create');
  e public.finance_expenses%rowtype;
begin
  select * into e from public.finance_expenses where id = p_expense_id for update;
  if e.id is null or e.submitted_by <> v_actor then raise exception using errcode='P0002', message='Expense not found'; end if;
  if e.status <> 'draft' then raise exception using errcode='22023', message='Only draft expenses can be submitted'; end if;
  update public.finance_expenses set status='submitted', submitted_at=now(), updated_at=now() where id = e.id;
  perform public.finance_audit(v_actor,'finance.expense.submitted','finance_expenses',e.id,
    jsonb_build_object('expense_number', e.expense_number));
  return jsonb_build_object('id', e.id, 'status', 'submitted');
end $$;

create or replace function public.finance_approve_expense(p_expense_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.expense.approve');
  e public.finance_expenses%rowtype;
begin
  select * into e from public.finance_expenses where id = p_expense_id for update;
  if e.id is null then raise exception using errcode='P0002', message='Expense not found'; end if;
  if e.status <> 'submitted' then raise exception using errcode='22023', message='Only submitted expenses can be approved'; end if;
  if e.submitted_by = v_actor then
    raise exception using errcode='42501', message='Submitter cannot approve their own expense';
  end if;
  update public.finance_expenses set status='approved', approved_by=v_actor, approved_at=now(), updated_at=now() where id = e.id;
  perform public.finance_audit(v_actor,'finance.expense.approved','finance_expenses',e.id,
    jsonb_build_object('expense_number', e.expense_number, 'amount', e.amount, 'currency', e.currency));
  return jsonb_build_object('id', e.id, 'status', 'approved');
end $$;

create or replace function public.finance_reject_expense(p_expense_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.expense.approve');
  e public.finance_expenses%rowtype;
begin
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception using errcode='22023', message='A rejection reason is required';
  end if;
  select * into e from public.finance_expenses where id = p_expense_id for update;
  if e.id is null then raise exception using errcode='P0002', message='Expense not found'; end if;
  if e.status <> 'submitted' then raise exception using errcode='22023', message='Only submitted expenses can be rejected'; end if;
  if e.submitted_by = v_actor then
    raise exception using errcode='42501', message='Submitter cannot reject their own expense';
  end if;
  update public.finance_expenses set status='rejected', rejected_reason=trim(p_reason), approved_by=null, updated_at=now() where id = e.id;
  perform public.finance_audit(v_actor,'finance.expense.rejected','finance_expenses',e.id,
    jsonb_build_object('expense_number', e.expense_number, 'reason', trim(p_reason)));
  return jsonb_build_object('id', e.id, 'status', 'rejected');
end $$;

create or replace function public.finance_pay_expense(p_expense_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.finance_require('finance.expense.pay');
  e public.finance_expenses%rowtype;
begin
  select * into e from public.finance_expenses where id = p_expense_id for update;
  if e.id is null then raise exception using errcode='P0002', message='Expense not found'; end if;
  if e.status <> 'approved' or e.payment_status <> 'unpaid' then
    raise exception using errcode='22023', message='Only approved, unpaid expenses can be paid';
  end if;
  update public.finance_expenses
     set status='paid', payment_status='paid', paid_by=v_actor, paid_at=now(), updated_at=now()
   where id = e.id;
  perform public.finance_audit(v_actor,'finance.expense.paid','finance_expenses',e.id,
    jsonb_build_object('expense_number', e.expense_number, 'amount', e.amount, 'currency', e.currency));
  return jsonb_build_object('id', e.id, 'status', 'paid');
end $$;

create or replace function public.finance_list_expenses()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_me uuid := public.newsroom_current_staff_id_basic();
  v_all boolean := public.newsroom_has_capability('finance.expense.view');
begin
  if v_me is null or not (v_all or public.newsroom_has_capability('finance.expense.create')) then
    raise exception using errcode='42501', message='finance.expense.create or finance.expense.view capability required';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc) from (
      select e.id, e.expense_number, e.expense_date, e.vendor, e.category, e.description, e.department, e.amount,
             e.currency, e.tax_amount, e.document_ref, e.status, e.payment_status, e.submitted_by,
             sp.display_name as submitted_by_name, e.approved_by, e.rejected_reason, e.created_at
      from public.finance_expenses e left join public.staff_profiles sp on sp.id = e.submitted_by
      where v_all or e.submitted_by = v_me
    ) q), '[]'::jsonb);
end $$;

create or replace function public.finance_list_expense_categories()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select case when public.newsroom_current_staff_id_basic() is null then '[]'::jsonb else coalesce((
    select jsonb_agg(jsonb_build_object('key', key, 'label', label) order by sort_order, label)
    from public.finance_expense_categories where active), '[]'::jsonb) end;
$$;

-- ---------------------------------------------------------------------------
-- 13. Overview + statements (read-only, per currency, no FX conversion)
-- ---------------------------------------------------------------------------
create or replace function public.finance_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_today date := (now() at time zone 'Africa/Harare')::date;
begin
  if not public.newsroom_has_capability('finance.view') then
    raise exception using errcode='42501', message='finance.view capability required';
  end if;
  return jsonb_build_object(
    'as_of', v_today,
    'by_currency', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.currency) from (
        select cur.currency,
          coalesce((select sum(subtotal - discount_total) from public.finance_invoices i
                    where i.currency = cur.currency and i.status in ('issued','partially_paid','paid','overdue')),0) as revenue_invoiced,
          coalesce((select sum(amount) from public.finance_payments p where p.currency = cur.currency),0) as revenue_collected,
          coalesce((select sum(balance_due) from public.finance_invoices i
                    where i.currency = cur.currency and i.status in ('issued','partially_paid','overdue')),0) as outstanding_receivables,
          coalesce((select sum(balance_due) from public.finance_invoices i
                    where i.currency = cur.currency and i.status in ('issued','partially_paid','overdue') and i.due_date < v_today),0) as overdue_receivables,
          coalesce((select sum(amount) from public.finance_expenses e
                    where e.currency = cur.currency and e.status in ('approved','paid')),0) as expenses
        from (select currency from public.finance_invoices union select currency from public.finance_expenses
              union select currency from public.finance_payments) cur
      ) t), '[]'::jsonb),
    'counts', jsonb_build_object(
      'customers', (select count(*) from public.finance_customers),
      'draft_invoices', (select count(*) from public.finance_invoices where status = 'draft'),
      'invoices_awaiting_issue', (select count(*) from public.finance_invoices where status = 'approved'),
      'open_invoices', (select count(*) from public.finance_invoices where status in ('issued','partially_paid','overdue')),
      'orders_awaiting_approval', (select count(*) from public.commercial_orders where status = 'draft'),
      'expenses_awaiting_approval', (select count(*) from public.finance_expenses where status = 'submitted'),
      'expenses_awaiting_payment', (select count(*) from public.finance_expenses where status = 'approved')
    )
  );
end $$;

create or replace function public.finance_statements(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.newsroom_has_capability('finance.statement.view') then
    raise exception using errcode='42501', message='finance.statement.view capability required';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception using errcode='22023', message='Valid statement period required';
  end if;
  return jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'basis', 'Operational (invoice-issue and approved-expense basis). Not a statutory ledger. No FX conversion.',
    'balance_sheet', 'NOT AVAILABLE UNTIL GENERAL LEDGER AUTHORITY EXISTS',
    'income_statement', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.currency) from (
        select cur.currency,
          coalesce((select sum(subtotal - discount_total) from public.finance_invoices i
            where i.currency = cur.currency and i.status in ('issued','partially_paid','paid','overdue') and i.issue_date between p_from and p_to),0) as revenue,
          coalesce((select sum(tax_total) from public.finance_invoices i
            where i.currency = cur.currency and i.status in ('issued','partially_paid','paid','overdue') and i.issue_date between p_from and p_to),0) as tax_invoiced,
          coalesce((select sum(amount) from public.finance_expenses e
            where e.currency = cur.currency and e.status in ('approved','paid') and e.expense_date between p_from and p_to),0) as expenses,
          coalesce((select sum(subtotal - discount_total) from public.finance_invoices i
            where i.currency = cur.currency and i.status in ('issued','partially_paid','paid','overdue') and i.issue_date between p_from and p_to),0)
          - coalesce((select sum(amount) from public.finance_expenses e
            where e.currency = cur.currency and e.status in ('approved','paid') and e.expense_date between p_from and p_to),0) as net_operational
        from (select currency from public.finance_invoices union select currency from public.finance_expenses) cur
      ) t), '[]'::jsonb),
    'revenue_by_advertiser', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.revenue desc) from (
        select c.legal_name as advertiser, i.currency, sum(i.subtotal - i.discount_total) as revenue
        from public.finance_invoices i join public.finance_customers c on c.id = i.customer_id
        where i.status in ('issued','partially_paid','paid','overdue') and i.issue_date between p_from and p_to
        group by c.legal_name, i.currency) t), '[]'::jsonb),
    'revenue_by_campaign', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.revenue desc) from (
        select coalesce(ac.name, 'Unattributed') as campaign, i.currency, sum(l.line_total) as revenue
        from public.finance_invoice_lines l
        join public.finance_invoices i on i.id = l.invoice_id
        left join public.ad_campaigns ac on ac.id = coalesce(l.campaign_id, i.campaign_id)
        where i.status in ('issued','partially_paid','paid','overdue') and i.issue_date between p_from and p_to
        group by coalesce(ac.name, 'Unattributed'), i.currency) t), '[]'::jsonb),
    'revenue_by_placement', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.revenue desc) from (
        select coalesce(l.placement, 'Unspecified') as placement, i.currency, sum(l.line_total) as revenue
        from public.finance_invoice_lines l join public.finance_invoices i on i.id = l.invoice_id
        where i.status in ('issued','partially_paid','paid','overdue') and i.issue_date between p_from and p_to
        group by coalesce(l.placement, 'Unspecified'), i.currency) t), '[]'::jsonb),
    'expense_summary', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.total desc) from (
        select e.category, e.currency, count(*) as count, sum(e.amount) as total
        from public.finance_expenses e
        where e.status in ('approved','paid') and e.expense_date between p_from and p_to
        group by e.category, e.currency) t), '[]'::jsonb),
    'cash_receipts', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.total desc) from (
        select p.method, p.currency, count(*) as count, sum(p.amount) as total
        from public.finance_payments p where p.payment_date between p_from and p_to
        group by p.method, p.currency) t), '[]'::jsonb),
    'receivables_aging', public.finance_receivables_aging()
  );
end $$;

-- ---------------------------------------------------------------------------
-- 14. Privileges: RPCs only for authenticated sessions; never anon / PUBLIC.
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'finance_next_number(text)','finance_audit(uuid,text,text,uuid,jsonb)','finance_check_currency(text)',
    'finance_payments_immutable()'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'finance_require(text)',
    'finance_upsert_customer(uuid,uuid,text,text,text,text,text,text,text,integer)',
    'finance_list_customers()',
    'commercial_create_order(uuid,uuid,date,date,text,numeric,numeric,numeric,text)',
    'commercial_approve_order(uuid)','commercial_list_orders()',
    'finance_create_invoice(uuid,uuid,date,date,text,jsonb,text)',
    'finance_approve_invoice(uuid)','finance_issue_invoice(uuid,date,date)','finance_void_invoice(uuid,text)',
    'finance_list_invoices(text)','finance_get_invoice(uuid)',
    'finance_record_payment(uuid,numeric,text,date,text,text,text,text)','finance_list_payments()',
    'finance_receivables_aging()',
    'finance_create_expense(date,text,text,text,text,numeric,text,numeric,text,boolean)',
    'finance_submit_expense(uuid)','finance_approve_expense(uuid)','finance_reject_expense(uuid,text)',
    'finance_pay_expense(uuid)','finance_list_expenses()','finance_list_expense_categories()',
    'finance_overview()','finance_statements(date,date)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
