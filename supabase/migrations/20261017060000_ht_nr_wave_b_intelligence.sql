-- Migration 79: HT-NR-CLOSE Wave B — Newsroom Intelligence, Analytics & Growth Authority
-- Repository migration count: 79
-- Staging migration count after application: 79

-- ============================================================================
-- 1. EDITORIAL INTELLIGENCE RPC
-- ============================================================================

create or replace function public.newsroom_get_editorial_intelligence()
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
    'story_inventory', (
      select jsonb_build_object(
        'total', count(*),
        'published', count(*) filter (where status = 'publish' or workflow_status = 'Published'),
        'draft', count(*) filter (where status = 'draft' or workflow_status = 'Draft'),
        'review', count(*) filter (where workflow_status in ('Submitted', 'In Review', 'review')),
        'scheduled', count(*) filter (where scheduled_at is not null and scheduled_at > now()),
        'archived', count(*) filter (where status = 'archived' or workflow_status = 'Archived')
      )
      from public.stories
    ),
    'publishing_velocity', (
      select jsonb_build_object(
        'last_24_hours', count(*) filter (where published_at >= now() - interval '24 hours'),
        'last_7_days', count(*) filter (where published_at >= now() - interval '7 days'),
        'last_30_days', count(*) filter (where published_at >= now() - interval '30 days')
      )
      from public.stories
    ),
    'review_queue', (
      select jsonb_build_object(
        'in_review_count', count(*) filter (where workflow_status in ('Submitted', 'In Review', 'review')),
        'avg_age_hours', round(coalesce(avg(extract(epoch from (now() - updated_at)) / 3600) filter (where workflow_status in ('Submitted', 'In Review', 'review')), 0)::numeric, 1),
        'oldest_age_hours', round(coalesce(max(extract(epoch from (now() - updated_at)) / 3600) filter (where workflow_status in ('Submitted', 'In Review', 'review')), 0)::numeric, 1)
      )
      from public.stories
    ),
    'assignments', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where status in ('assigned', 'in_progress')),
        'overdue', count(*) filter (where status in ('assigned', 'in_progress') and deadline_at is not null and deadline_at < now()),
        'completed', count(*) filter (where status = 'complete')
      )
      from public.story_assignments
    ),
    'desk_mix', (
      select coalesce(jsonb_agg(d.desk_entry order by (d.desk_entry->>'count')::int desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'desk', coalesce(desk, 'General'),
          'count', count(*)
        ) as desk_entry
        from public.stories
        group by coalesce(desk, 'General')
      ) d
    ),
    'distribution_reach', (
      select jsonb_build_object(
        'social_posts_count', (select count(*) from public.social_posts),
        'newsletter_campaigns_count', (select count(*) from public.audience_campaigns),
        'push_alerts_count', (select count(*) from public.newsroom_push_alerts),
        'whatsapp_broadcasts_count', (select count(*) from public.newsroom_whatsapp_broadcasts)
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ============================================================================
-- 2. GROWTH & SEARCH INTELLIGENCE RPC
-- ============================================================================

create or replace function public.newsroom_get_growth_intelligence()
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
    'integrations', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'provider', provider,
          'integration_key', integration_key,
          'status', status,
          'external_account_id', external_account_id,
          'external_property_id', external_property_id,
          'external_measurement_id', external_measurement_id,
          'last_success_at', last_success_at,
          'last_error_at', last_error_at,
          'last_error', last_error,
          'notes', notes
        ) order by provider, integration_key
      ), '[]'::jsonb)
      from public.analytics_integrations
    ),
    'analytics_daily_summary', (
      select jsonb_build_object(
        'rows_recorded', count(*),
        'total_page_views', coalesce(sum(page_views), 0),
        'total_users', coalesce(sum(users_count), 0),
        'total_sessions', coalesce(sum(sessions_count), 0),
        'status', case when count(*) > 0 then 'active' else 'pending_ingestion' end
      )
      from public.analytics_daily_metrics
    ),
    'search_console_summary', (
      select jsonb_build_object(
        'property', 'https://healthtimes.co.zw/',
        'rows_recorded', count(*),
        'total_clicks', coalesce(sum(clicks), 0),
        'total_impressions', coalesce(sum(impressions), 0),
        'status', case when count(*) > 0 then 'active' else 'pending_ingestion' end
      )
      from public.search_console_daily_metrics
    ),
    'seo_health', (
      select jsonb_build_object(
        'total_stories', count(*),
        'with_seo_title', count(*) filter (where seo_title is not null and length(trim(seo_title)) > 0),
        'with_seo_description', count(*) filter (where seo_description is not null and length(trim(seo_description)) > 0),
        'with_canonical_url', count(*) filter (where canonical_url is not null and length(trim(canonical_url)) > 0)
      )
      from public.stories
    ),
    'citations_summary', (
      select jsonb_build_object(
        'status', coalesce((select status from public.analytics_integrations where provider = 'citations' limit 1), 'provider_not_connected'),
        'verified_citations_count', 0,
        'institutional_references_count', 0,
        'government_ngo_mentions_count', 0,
        'notes', 'Production citation tracking requires academic/cross-ref indexer API integration.'
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ============================================================================
-- 3. AUDIENCE INTELLIGENCE RPC
-- ============================================================================

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
        'consented_contacts', (select count(*) from public.contact_consents where consent_status = 'opted_in')
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
        'active_devices', count(*) filter (where push_token is not null and length(trim(push_token)) > 0)
      )
      from public.reader_push_devices
    ),
    'whatsapp_distribution', (
      select jsonb_build_object(
        'total_broadcasts', count(*),
        'sent_broadcasts', count(*) filter (where status = 'sent')
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
    'ga4_audience_status', (
      select jsonb_build_object(
        'property_id', '359235319',
        'account_id', '137814020',
        'status', 'identity_verified_account_access_pending',
        'notes', 'Google Analytics 4 property identified. Awaiting Data API service account grant.'
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ============================================================================
-- 4. PRIVILEGES & HARDENING
-- ============================================================================

revoke all on function public.newsroom_get_editorial_intelligence() from public, anon;
grant execute on function public.newsroom_get_editorial_intelligence() to authenticated;
grant execute on function public.newsroom_get_editorial_intelligence() to service_role;

revoke all on function public.newsroom_get_growth_intelligence() from public, anon;
grant execute on function public.newsroom_get_growth_intelligence() to authenticated;
grant execute on function public.newsroom_get_growth_intelligence() to service_role;

revoke all on function public.newsroom_get_audience_intelligence() from public, anon;
grant execute on function public.newsroom_get_audience_intelligence() to authenticated;
grant execute on function public.newsroom_get_audience_intelligence() to service_role;
