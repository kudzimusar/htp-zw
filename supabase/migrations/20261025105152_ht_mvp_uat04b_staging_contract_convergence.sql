-- HT-MVP-RL-01-UAT-04B-STG01-R1
-- Forward-only convergence for the exact Studio/Data API contracts verified on
-- HealthTimes Staging. Historical migrations remain immutable.

-- ---------------------------------------------------------------------------
-- Finance: retain the canonical domain fields while preserving the original
-- seven-argument invoice function for existing callers and SQL tests.
-- ---------------------------------------------------------------------------
alter table public.finance_invoices
  add column if not exists terms text;

create or replace function public.finance_create_invoice(
  p_customer_id uuid,
  p_order_id uuid,
  p_issue_date date,
  p_due_date date,
  p_currency text,
  p_lines jsonb,
  p_notes text,
  p_terms text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
  v_invoice_id uuid;
begin
  v_result := public.finance_create_invoice(
    p_customer_id,
    p_order_id,
    p_issue_date,
    p_due_date,
    p_currency,
    p_lines,
    p_notes
  );
  v_invoice_id := (v_result ->> 'id')::uuid;

  update public.finance_invoices
     set terms = nullif(trim(p_terms), ''),
         updated_at = now()
   where id = v_invoice_id;

  return v_result || jsonb_build_object('terms', nullif(trim(p_terms), ''));
end;
$$;

revoke all on function public.finance_create_invoice(uuid, uuid, date, date, text, jsonb, text, text)
  from public, anon;
grant execute on function public.finance_create_invoice(uuid, uuid, date, date, text, jsonb, text, text)
  to authenticated, service_role;

-- The accepted application contract carries an optional story relationship
-- and uses staff-facing parameter names. Keep the original ten-argument RPC
-- available for historical callers and expose an exact eleven-argument
-- Data API overload for Studio.
alter table public.finance_expenses
  add column if not exists story_id uuid references public.stories(id) on delete set null;

create index if not exists finance_expenses_story_idx
  on public.finance_expenses(story_id)
  where story_id is not null;

create or replace function public.finance_create_expense(
  p_expense_date date,
  p_vendor_name text,
  p_category text,
  p_description text,
  p_department text,
  p_amount numeric,
  p_currency text,
  p_tax_amount numeric,
  p_receipt_reference text,
  p_submit boolean,
  p_story_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
  v_expense_id uuid;
begin
  if p_story_id is not null and not exists (
    select 1 from public.stories where id = p_story_id
  ) then
    raise exception using errcode = '23503', message = 'Referenced story not found';
  end if;

  v_result := public.finance_create_expense(
    p_expense_date,
    p_vendor_name,
    p_category,
    p_description,
    p_department,
    p_amount,
    p_currency,
    p_tax_amount,
    p_receipt_reference,
    p_submit
  );
  v_expense_id := (v_result ->> 'id')::uuid;

  update public.finance_expenses
     set story_id = p_story_id,
         updated_at = now()
   where id = v_expense_id;

  return v_result || jsonb_build_object('story_id', p_story_id);
end;
$$;

revoke all on function public.finance_create_expense(date, text, text, text, text, numeric, text, numeric, text, boolean, uuid)
  from public, anon;
grant execute on function public.finance_create_expense(date, text, text, text, text, numeric, text, numeric, text, boolean, uuid)
  to authenticated, service_role;

-- Enforce the same positive unit-price rule in the database as in Studio.
alter table public.finance_invoice_lines
  drop constraint if exists finance_invoice_lines_unit_price_check;
alter table public.finance_invoice_lines
  add constraint finance_invoice_lines_unit_price_check check (unit_price > 0);

-- ---------------------------------------------------------------------------
-- Taxonomy: stories.primary_section_id is the canonical story-to-section
-- relationship. There is no story_sections table in the accepted schema.
-- ---------------------------------------------------------------------------
create or replace function public.newsroom_get_taxonomy_directory(
  p_parent_id uuid default null,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_has_access boolean;
  v_total_sections bigint;
  v_root_count bigint;
  v_sections jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('staff.view')
    or public.newsroom_has_capability('story.create')
    or public.newsroom_has_capability('story.edit_own')
    or public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.publish')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to view taxonomy';
  end if;

  select count(*) into v_total_sections from public.sections;
  select count(*) into v_root_count from public.sections where parent_id is null;

  select coalesce(jsonb_agg(row_data), '[]'::jsonb) into v_sections
  from (
    select jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'slug', s.slug,
      'parent_id', s.parent_id,
      'parent_name', ps.name,
      'wordpress_source_id', s.wordpress_source_id,
      'created_at', s.created_at,
      'story_count', (
        select count(*)
        from public.stories st
        where st.primary_section_id = s.id
      )
    ) as row_data
    from public.sections s
    left join public.sections ps on ps.id = s.parent_id
    where (
      (p_parent_id is null or s.parent_id = p_parent_id)
      and (
        p_search is null
        or p_search = ''
        or s.name ilike '%' || p_search || '%'
        or s.slug ilike '%' || p_search || '%'
      )
    )
    order by s.name asc
  ) sub;

  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'total_sections', v_total_sections,
      'root_sections_count', v_root_count
    ),
    'sections', v_sections
  );
end;
$$;

revoke all on function public.newsroom_get_taxonomy_directory(uuid, text) from public, anon;
grant execute on function public.newsroom_get_taxonomy_directory(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Audience intelligence: use the accepted consent and push-device columns and
-- count consented people, not duplicated purpose/channel consent rows.
-- ---------------------------------------------------------------------------
create or replace function public.newsroom_get_audience_intelligence()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.newsroom_has_capability('analytics.view') then
    raise exception 'unauthorized: analytics.view required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'contacts', (
      select jsonb_build_object(
        'total_profiles', count(*),
        'consented_contacts', (
          select count(distinct contact_id)
          from public.contact_consents
          where status = 'granted'
        )
      )
      from public.contact_profiles
    ),
    'segments', (
      select jsonb_build_object(
        'total_segments', count(*),
        'total_memberships', (select count(*) from public.contact_segment_members)
      )
      from public.contact_segments
    ),
    'push_subscribers', (
      select jsonb_build_object(
        'registered_devices', count(*),
        'active_devices', count(*) filter (
          where status = 'active'
            and revoked_at is null
            and length(trim(expo_push_token)) > 0
        )
      )
      from public.reader_push_devices
    ),
    'whatsapp_distribution', (
      select jsonb_build_object(
        'total_broadcasts', count(*),
        'sent_broadcasts', count(*) filter (where sent_at is not null)
      )
      from public.newsroom_whatsapp_broadcasts
    ),
    'subscribers', (
      select jsonb_build_object(
        'total_subscribers', count(*),
        'active_subscribers', count(*) filter (where status = 'active')
      )
      from public.subscribers
    ),
    'ga4_audience_status', jsonb_build_object(
      'property_id', '359235319',
      'account_id', '137814020',
      'status', 'identity_verified_account_access_pending',
      'notes', 'Google Analytics 4 property identified. Awaiting Data API service account grant.'
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.newsroom_get_audience_intelligence() from public, anon;
grant execute on function public.newsroom_get_audience_intelligence() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Premium: pre-aggregate active entitlement providers before JSON aggregation.
-- The provider breakdown now reconciles to active_entitlements_count.
-- ---------------------------------------------------------------------------
create or replace function public.newsroom_get_premium_operations_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not (
    public.newsroom_has_capability('premium.manage') or
    public.newsroom_has_capability('premium.assign') or
    public.newsroom_has_capability('subscriber.view')
  ) then
    raise exception using errcode = '42501', message = 'premium.manage or subscriber.view capability required';
  end if;

  select jsonb_build_object(
    'policies', jsonb_build_array(
      jsonb_build_object(
        'key', 'public',
        'name', 'Public Open Access',
        'description', 'Unrestricted reading access for all readers across Web and App platforms.',
        'is_metered', false
      ),
      jsonb_build_object(
        'key', 'premium',
        'name', 'Premium Subscriber Access',
        'description', 'Exclusive deep health investigative reporting, clinical analyses, and member briefings.',
        'is_metered', true
      )
    ),
    'teaser_policy', jsonb_build_object(
      'authority', 'AG-05 / Owner Policy',
      'enabled', true,
      'duration_seconds', 20,
      'paragraph_count', 1,
      'enforcement', 'Strict server-side body truncation with timer cutoff'
    ),
    'inventory_breakdown', jsonb_build_object(
      'total_stories', (select count(*)::int from public.stories),
      'premium_stories_count', (select count(*)::int from public.stories where access_policy = 'premium'),
      'public_stories_count', (select count(*)::int from public.stories where access_policy = 'public' or access_policy is null)
    ),
    'recent_premium_stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'status', s.status,
        'access_policy', coalesce(s.access_policy, 'public'),
        'published_at', s.published_at,
        'updated_at', s.updated_at
      ) order by coalesce(s.published_at, s.updated_at) desc)
      from (
        select id, title, status, access_policy, published_at, updated_at
        from public.stories
        where access_policy = 'premium'
        order by coalesce(published_at, updated_at) desc
        limit 20
      ) s
    ), '[]'::jsonb),
    'subscriber_stats', jsonb_build_object(
      'total_subscribers', (select count(*)::int from public.subscribers),
      'active_entitlements_count', (
        select count(*)::int
        from public.premium_entitlements
        where starts_at <= now() and (ends_at is null or ends_at > now())
      ),
      'total_entitled_subscribers', (
        select count(distinct subscriber_id)::int
        from public.premium_entitlements
        where starts_at <= now() and (ends_at is null or ends_at > now())
      ),
      'providers', coalesce((
        select jsonb_agg(
          jsonb_build_object('provider', provider_key, 'count', provider_count)
          order by provider_key
        )
        from (
          select coalesce(provider, 'unknown') as provider_key, count(*)::int as provider_count
          from public.premium_entitlements
          where starts_at <= now() and (ends_at is null or ends_at > now())
          group by coalesce(provider, 'unknown')
        ) provider_totals
      ), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.newsroom_get_premium_operations_overview() from anon, public;
grant execute on function public.newsroom_get_premium_operations_overview() to authenticated, service_role;
