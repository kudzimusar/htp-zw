-- =============================================================================
-- Migration 81: HT-NR Wave D Commercial Operations
-- Desk coverage: /studio/advertising, /studio/subscribers, /studio/premium
-- Canonical tables: advertisers, ad_campaigns, ad_creatives, ad_placements,
--                  subscribers, premium_entitlements, stories, audit_logs
-- Capabilities: ads.view, ads.create, ads.approve, subscriber.view,
--               subscriber.manage, premium.assign, premium.manage
-- =============================================================================

-- 1. Ensure RLS read policy on ad_placements for ads.view
drop policy if exists ag06_ad_placements_read on public.ad_placements;
create policy ag06_ad_placements_read on public.ad_placements
  for select to authenticated
  using (public.newsroom_has_capability('ads.view'));

-- 2. Advertising Overview RPC
create or replace function public.newsroom_get_advertising_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.newsroom_has_capability('ads.view') then
    raise exception using errcode = '42501', message = 'ads.view capability required';
  end if;

  select jsonb_build_object(
    'advertisers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'contact_notes', a.contact_notes,
        'created_at', a.created_at,
        'active_campaigns_count', (
          select count(*)::int
          from public.ad_campaigns c
          where c.advertiser_id = a.id
            and c.status in ('active', 'approved', 'continuity_captured')
        )
      ) order by a.created_at desc)
      from public.advertisers a
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'advertiser_id', c.advertiser_id,
        'advertiser_name', coalesce(a.name, 'Unknown'),
        'name', c.name,
        'status', c.status,
        'review_status', c.review_status,
        'start_at', c.start_at,
        'end_at', c.end_at,
        'created_by', c.created_by,
        'approved_by', c.approved_by,
        'approved_at', c.approved_at,
        'created_at', c.created_at,
        'creatives_count', (
          select count(*)::int
          from public.ad_creatives cr
          where cr.campaign_id = c.id
        )
      ) order by c.created_at desc)
      from public.ad_campaigns c
      left join public.advertisers a on a.id = c.advertiser_id
    ), '[]'::jsonb),
    'creatives', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cr.id,
        'campaign_id', cr.campaign_id,
        'campaign_name', coalesce(c.name, 'Unknown'),
        'placement', cr.placement,
        'destination_url', cr.destination_url,
        'disclosure_label', cr.disclosure_label,
        'status', cr.status,
        'created_at', cr.created_at
      ) order by cr.created_at desc)
      from public.ad_creatives cr
      left join public.ad_campaigns c on c.id = cr.campaign_id
    ), '[]'::jsonb),
    'placements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'placement_key', p.placement_key,
        'name', p.name,
        'allowed_sources', p.allowed_sources,
        'default_source', p.default_source,
        'status', p.status,
        'layout_policy', p.layout_policy
      ) order by p.placement_key asc)
      from public.ad_placements p
    ), '[]'::jsonb),
    'metrics', jsonb_build_object(
      'total_advertisers', (select count(*)::int from public.advertisers),
      'total_campaigns', (select count(*)::int from public.ad_campaigns),
      'active_campaigns', (
        select count(*)::int
        from public.ad_campaigns
        where status in ('active', 'approved', 'continuity_captured')
      ),
      'pending_review_campaigns', (
        select count(*)::int
        from public.ad_campaigns
        where review_status in ('pending', 'under_review')
      ),
      'total_creatives', (select count(*)::int from public.ad_creatives),
      'total_placements', (select count(*)::int from public.ad_placements)
    )
  ) into v_result;

  return v_result;
end;
$$;

-- 3. Create Advertiser RPC
create or replace function public.newsroom_create_advertiser(
  p_name text,
  p_contact_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_id uuid;
begin
  if not public.newsroom_has_capability('ads.create') then
    raise exception using errcode = '42501', message = 'ads.create capability required';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception using errcode = '22023', message = 'Advertiser name is required';
  end if;

  insert into public.advertisers(name, contact_notes)
  values(trim(p_name), nullif(trim(p_contact_notes), ''))
  returning id into v_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(v_actor, 'advertiser.created', 'advertisers', v_id, jsonb_build_object('name', trim(p_name)));

  return v_id;
end;
$$;

-- 4. Create Creative RPC
create or replace function public.newsroom_create_creative(
  p_campaign_id uuid,
  p_placement text,
  p_destination_url text default null,
  p_disclosure_label text default 'Advertisement'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_id uuid;
begin
  if not public.newsroom_has_capability('ads.create') then
    raise exception using errcode = '42501', message = 'ads.create capability required';
  end if;

  if not exists (select 1 from public.ad_campaigns where id = p_campaign_id) then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  if p_placement is null or trim(p_placement) = '' then
    raise exception using errcode = '22023', message = 'Placement identifier is required';
  end if;

  insert into public.ad_creatives(campaign_id, placement, destination_url, disclosure_label, created_by, status)
  values(p_campaign_id, trim(p_placement), nullif(trim(p_destination_url), ''), coalesce(nullif(trim(p_disclosure_label), ''), 'Advertisement'), v_actor, 'active')
  returning id into v_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(v_actor, 'creative.created', 'ad_creatives', v_id, jsonb_build_object(
    'campaign_id', p_campaign_id,
    'placement', trim(p_placement)
  ));

  return v_id;
end;
$$;

-- 5. Update Campaign Status RPC
create or replace function public.newsroom_update_campaign_status(
  p_campaign_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_valid_statuses text[] := array['draft', 'approved', 'active', 'paused', 'archived', 'rejected'];
  v_target_status text := lower(trim(p_status));
  v_old_status text;
begin
  if not (public.newsroom_has_capability('ads.create') or public.newsroom_has_capability('ads.approve')) then
    raise exception using errcode = '42501', message = 'ads.create or ads.approve capability required';
  end if;

  if not (v_target_status = any(v_valid_statuses)) then
    raise exception using errcode = '22023', message = 'Invalid campaign status';
  end if;

  select status into v_old_status
  from public.ad_campaigns
  where id = p_campaign_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Campaign not found';
  end if;

  update public.ad_campaigns
  set status = v_target_status
  where id = p_campaign_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(v_actor, 'campaign.status.updated', 'ad_campaigns', p_campaign_id, jsonb_build_object(
    'previous_status', v_old_status,
    'new_status', v_target_status
  ));

  return v_target_status;
end;
$$;

-- 6. Subscribers Directory RPC
create or replace function public.newsroom_get_subscribers_directory(
  p_status text default null,
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
  v_search_pattern text := case when p_search is not null and trim(p_search) <> '' then '%' || lower(trim(p_search)) || '%' else null end;
  v_total int;
begin
  if not public.newsroom_has_capability('subscriber.view') then
    raise exception using errcode = '42501', message = 'subscriber.view capability required';
  end if;

  select count(*)::int into v_total
  from public.subscribers s
  where (p_status is null or s.status = lower(trim(p_status)))
    and (v_search_pattern is null or (
      lower(s.email) like v_search_pattern or
      lower(coalesce(s.display_name, '')) like v_search_pattern
    ));

  select jsonb_build_object(
    'subscribers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sub.id,
        'auth_user_id', sub.auth_user_id,
        'email', sub.email,
        'display_name', sub.display_name,
        'status', sub.status,
        'created_at', sub.created_at,
        'has_active_premium', exists(
          select 1 from public.premium_entitlements pe
          where pe.subscriber_id = sub.id
            and (pe.ends_at is null or pe.ends_at > now())
            and pe.starts_at <= now()
        ),
        'entitlements', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', pe.id,
            'policy_key', pe.policy_key,
            'starts_at', pe.starts_at,
            'ends_at', pe.ends_at,
            'provider', pe.provider,
            'provider_reference', pe.provider_reference,
            'is_active', (pe.ends_at is null or pe.ends_at > now()) and pe.starts_at <= now()
          ) order by pe.starts_at desc)
          from public.premium_entitlements pe
          where pe.subscriber_id = sub.id
        ), '[]'::jsonb)
      ) order by sub.created_at desc)
      from (
        select s.id, s.auth_user_id, s.email, s.display_name, s.status, s.created_at
        from public.subscribers s
        where (p_status is null or s.status = lower(trim(p_status)))
          and (v_search_pattern is null or (
            lower(s.email) like v_search_pattern or
            lower(coalesce(s.display_name, '')) like v_search_pattern
          ))
        order by s.created_at desc
        limit coalesce(p_limit, 50)
        offset coalesce(p_offset, 0)
      ) sub
    ), '[]'::jsonb),
    'total_count', v_total,
    'metrics', jsonb_build_object(
      'total_subscribers', (select count(*)::int from public.subscribers),
      'active_subscribers', (select count(*)::int from public.subscribers where status = 'active'),
      'premium_subscribers', (
        select count(distinct pe.subscriber_id)::int
        from public.premium_entitlements pe
        where (pe.ends_at is null or pe.ends_at > now())
          and pe.starts_at <= now()
      ),
      'suspended_subscribers', (select count(*)::int from public.subscribers where status = 'suspended'),
      'canceled_subscribers', (select count(*)::int from public.subscribers where status in ('canceled', 'past_due'))
    )
  ) into v_result;

  return v_result;
end;
$$;

-- 7. Update Subscriber Status RPC
create or replace function public.newsroom_update_subscriber_status(
  p_subscriber_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_valid_statuses text[] := array['active', 'suspended', 'canceled', 'past_due'];
  v_target_status text := lower(trim(p_status));
  v_old_status text;
begin
  if not public.newsroom_has_capability('subscriber.manage') then
    raise exception using errcode = '42501', message = 'subscriber.manage capability required';
  end if;

  if not (v_target_status = any(v_valid_statuses)) then
    raise exception using errcode = '22023', message = 'Invalid subscriber status';
  end if;

  select status into v_old_status
  from public.subscribers
  where id = p_subscriber_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Subscriber not found';
  end if;

  update public.subscribers
  set status = v_target_status
  where id = p_subscriber_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(v_actor, 'subscriber.status.updated', 'subscribers', p_subscriber_id, jsonb_build_object(
    'previous_status', v_old_status,
    'new_status', v_target_status
  ));

  return v_target_status;
end;
$$;

-- 8. Grant Subscriber Entitlement RPC
create or replace function public.newsroom_grant_subscriber_entitlement(
  p_subscriber_id uuid,
  p_policy_key text default 'premium',
  p_duration_days int default 30,
  p_provider text default 'staff_grant'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := public.newsroom_current_staff_id_basic();
  v_id uuid;
  v_policy text := lower(trim(coalesce(p_policy_key, 'premium')));
  v_provider text := lower(trim(coalesce(p_provider, 'staff_grant')));
  v_ends_at timestamptz := case when p_duration_days > 0 then now() + (p_duration_days || ' days')::interval else null end;
begin
  if not (public.newsroom_has_capability('subscriber.manage') or public.newsroom_has_capability('premium.manage')) then
    raise exception using errcode = '42501', message = 'subscriber.manage or premium.manage capability required';
  end if;

  if not exists (select 1 from public.subscribers where id = p_subscriber_id) then
    raise exception using errcode = 'P0002', message = 'Subscriber not found';
  end if;

  insert into public.premium_entitlements(subscriber_id, policy_key, starts_at, ends_at, provider, provider_reference)
  values(p_subscriber_id, v_policy, now(), v_ends_at, v_provider, 'grant_' || gen_random_uuid())
  returning id into v_id;

  insert into public.audit_logs(actor_staff_id, action, target_table, target_id, metadata)
  values(v_actor, 'entitlement.granted', 'premium_entitlements', v_id, jsonb_build_object(
    'subscriber_id', p_subscriber_id,
    'policy_key', v_policy,
    'duration_days', p_duration_days,
    'provider', v_provider
  ));

  return v_id;
end;
$$;

-- 9. Premium Operations Overview RPC
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
        where (ends_at is null or ends_at > now())
          and starts_at <= now()
      ),
      'total_entitled_subscribers', (
        select count(distinct subscriber_id)::int
        from public.premium_entitlements
        where (ends_at is null or ends_at > now())
          and starts_at <= now()
      ),
      'providers', coalesce((
        select jsonb_agg(jsonb_build_object(
          'provider', coalesce(provider, 'unknown'),
          'count', count(*)::int
        ))
        from public.premium_entitlements
        group by provider
      ), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;

-- 10. Security grants
revoke execute on function public.newsroom_get_advertising_overview() from anon, public;
grant execute on function public.newsroom_get_advertising_overview() to authenticated, service_role;

revoke execute on function public.newsroom_create_advertiser(text, text) from anon, public;
grant execute on function public.newsroom_create_advertiser(text, text) to authenticated, service_role;

revoke execute on function public.newsroom_create_creative(uuid, text, text, text) from anon, public;
grant execute on function public.newsroom_create_creative(uuid, text, text, text) to authenticated, service_role;

revoke execute on function public.newsroom_update_campaign_status(uuid, text) from anon, public;
grant execute on function public.newsroom_update_campaign_status(uuid, text) to authenticated, service_role;

revoke execute on function public.newsroom_get_subscribers_directory(text, text, int, int) from anon, public;
grant execute on function public.newsroom_get_subscribers_directory(text, text, int, int) to authenticated, service_role;

revoke execute on function public.newsroom_update_subscriber_status(uuid, text) from anon, public;
grant execute on function public.newsroom_update_subscriber_status(uuid, text) to authenticated, service_role;

revoke execute on function public.newsroom_grant_subscriber_entitlement(uuid, text, int, text) from anon, public;
grant execute on function public.newsroom_grant_subscriber_entitlement(uuid, text, int, text) to authenticated, service_role;

revoke execute on function public.newsroom_get_premium_operations_overview() from anon, public;
grant execute on function public.newsroom_get_premium_operations_overview() to authenticated, service_role;
