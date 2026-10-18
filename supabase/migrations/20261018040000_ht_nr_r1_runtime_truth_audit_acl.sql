-- Migration 84: HT-NR-CLOSE-R1 — Runtime Truth + Canonical Audit Schema + Privileged Table ACL Hardening
-- Logical Ordinal: 84
-- Repository migration count: 84
-- Staging migration count after application: 84

-- ============================================================================
-- 1. DEFECT A: PLATFORM SETTINGS RUNTIME TRUTH & SEED RE-ALIGNMENT
-- ============================================================================

-- Align seeded platform_settings with physical Staging reality
update public.platform_settings
set value = jsonb_build_object(
  'waba_id', null,
  'phone_number_id', null,
  'webhook_configured', false
),
updated_at = now()
where key = 'whatsapp_cloud_api';

update public.platform_settings
set value = jsonb_build_object(
  'property_id', '359235319',
  'measurement_id', 'G-S39LN2KX4X'
),
updated_at = now()
where key = 'google_analytics_4';

update public.platform_settings
set value = jsonb_build_object(
  'model', 'gemini-2.5-flash',
  'quota_rpm', 60
),
updated_at = now()
where key = 'gemini_ai_api';

-- Replace newsroom_get_platform_settings with dynamic projection of canonical integration authority
create or replace function public.newsroom_get_platform_settings()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_has_access boolean;
  v_settings jsonb;
  v_integrations jsonb;
  v_audit_summary jsonb;
  v_ga record;
  v_sc record;
  v_wa jsonb;
  v_brevo jsonb;
  v_gemini jsonb;
  v_migration_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('settings.manage')
    or public.newsroom_has_capability('security.manage')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to view platform settings';
  end if;

  -- Select non-secret operational settings
  select coalesce(jsonb_agg(row_data), '[]'::jsonb) into v_settings
  from (
    select jsonb_build_object(
      'key', ps.key,
      'category', ps.category,
      'description', ps.description,
      'value', ps.value,
      'updated_at', ps.updated_at,
      'updated_by', u.email
    ) as row_data
    from public.platform_settings ps
    left join auth.users u on u.id = ps.updated_by
    where ps.is_secret = false
    order by ps.category asc, ps.key asc
  ) sub;

  -- Read canonical analytics authority
  select * into v_ga
  from public.analytics_integrations
  where provider = 'google_analytics'
  limit 1;

  select * into v_sc
  from public.analytics_integrations
  where provider = 'search_console'
  limit 1;

  -- Read platform setting overrides
  select value into v_wa from public.platform_settings where key = 'whatsapp_cloud_api';
  select value into v_brevo from public.platform_settings where key = 'brevo_marketing_api';
  select value into v_gemini from public.platform_settings where key = 'gemini_ai_api';

  -- Read migration count dynamically
  select count(*)::integer into v_migration_count
  from supabase_migrations.schema_migrations;

  -- Structured integration health statuses (truthful runtime facts, zero exposed secrets)
  v_integrations := jsonb_build_object(
    'whatsapp', jsonb_build_object(
      'name', 'Meta WhatsApp Cloud API',
      'provider', 'meta_graph_api',
      'status', case
        when (v_wa->>'phone_number_id') is not null and (v_wa->>'waba_id') is not null then 'credentials_provided'
        else 'unconfigured_credentials_pending'
      end,
      'phone_number_id', v_wa->>'phone_number_id',
      'waba_id', v_wa->>'waba_id',
      'webhook_endpoint', 'https://gcdohgbmqhqwydgaxrcr.supabase.co/functions/v1/newsroom-whatsapp-webhook',
      'webhook_configured', coalesce((v_wa->>'webhook_configured')::boolean, false),
      'rate_limit', '80 messages/sec',
      'secret_configuration_state', 'unknown',
      'secret_configured', false
    ),
    'brevo', jsonb_build_object(
      'name', 'Brevo Newsletter Service',
      'provider', 'brevo_v3_api',
      'status', 'credentials_pending',
      'sender_email', coalesce(v_brevo->>'default_sender_email', 'newsletter@healthtimes.co.zw'),
      'secret_configuration_state', 'unknown',
      'secret_configured', false
    ),
    'google_analytics', jsonb_build_object(
      'name', 'Google Analytics 4',
      'provider', 'google_ga4_data_api',
      'status', coalesce(v_ga.status, 'identity_verified_account_access_pending'),
      'property_id', coalesce(v_ga.external_property_id, '359235319'),
      'stream_id', coalesce(v_ga.external_stream_id, '4756168788'),
      'measurement_id', coalesce(v_ga.external_measurement_id, 'G-S39LN2KX4X'),
      'external_account_id', coalesce(v_ga.external_account_id, '137814020'),
      'secret_configuration_state', case
        when v_ga.credential_secret_ref is not null then 'configured'
        else 'unknown'
      end,
      'secret_configured', false,
      'data_api_configured', false
    ),
    'search_console', jsonb_build_object(
      'name', 'Google Search Console',
      'provider', 'google_search_console_api',
      'status', coalesce(v_sc.status, 'property_known_account_access_pending'),
      'site_url', coalesce(v_sc.external_property_id, 'https://healthtimes.co.zw/'),
      'secret_configuration_state', case
        when v_sc.credential_secret_ref is not null then 'configured'
        else 'unknown'
      end,
      'secret_configured', false,
      'oauth_configured', false
    ),
    'gemini_ai', jsonb_build_object(
      'name', 'Google Gemini AI',
      'provider', coalesce(v_gemini->>'model', 'gemini-2.5-flash'),
      'status', 'credentials_pending',
      'quota_rpm', coalesce((v_gemini->>'quota_rpm')::integer, 60),
      'secret_configuration_state', 'unknown',
      'secret_configured', false
    ),
    'supabase', jsonb_build_object(
      'name', 'Supabase Database & Edge Engine',
      'provider', 'supabase_postgres_v15',
      'status', 'healthy',
      'project_ref', 'gcdohgbmqhqwydgaxrcr',
      'region', 'ap-northeast-1',
      'active_migrations', v_migration_count
    )
  );

  -- Audit activity summary
  select jsonb_build_object(
    'total_audit_events_24h', count(*),
    'last_audit_action', coalesce((select action from public.audit_logs order by created_at desc limit 1), 'none'),
    'last_audit_at', coalesce((select created_at::text from public.audit_logs order by created_at desc limit 1), null)
  ) into v_audit_summary
  from public.audit_logs
  where created_at > now() - interval '24 hours';

  return jsonb_build_object(
    'settings', v_settings,
    'integrations', v_integrations,
    'audit_summary', v_audit_summary
  );
end;
$$;

revoke all on function public.newsroom_get_platform_settings() from public, anon;
grant execute on function public.newsroom_get_platform_settings() to authenticated, service_role;


-- ============================================================================
-- 2. DEFECT B: CANONICAL AUDIT LOG SCHEMA COMPLIANCE IN RPCs
-- ============================================================================

-- Canonical audit_logs schema:
-- (id, actor_staff_id, action, target_table, target_id, metadata, created_at)

-- 2.1 newsroom_record_citation
create or replace function public.newsroom_record_citation(
  p_story_id uuid,
  p_reference_type text,
  p_source_name text,
  p_source_url text default null,
  p_title text default null,
  p_country text default 'Zimbabwe'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_actor_staff uuid;
  v_has_access boolean;
  v_citation_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('story.edit_own')
    or public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.publish')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to record citation';
  end if;

  if p_story_id is null or p_source_name is null or p_reference_type is null then
    raise exception 'Invalid input: story_id, reference_type, and source_name are required';
  end if;

  v_actor_staff := public.newsroom_current_staff_id_basic();

  insert into public.citation_references (
    story_id,
    reference_type,
    source_name,
    source_url,
    title,
    country,
    status
  ) values (
    p_story_id,
    trim(p_reference_type),
    trim(p_source_name),
    nullif(trim(p_source_url), ''),
    coalesce(nullif(trim(p_title), ''), trim(p_source_name)),
    coalesce(nullif(trim(p_country), ''), 'Zimbabwe'),
    'unverified'
  ) returning id into v_citation_id;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_actor_staff,
    'citation_recorded',
    'citation_references',
    v_citation_id,
    jsonb_build_object(
      'story_id', p_story_id,
      'reference_type', trim(p_reference_type),
      'source_name', trim(p_source_name),
      'source_url', p_source_url
    )
  );

  return jsonb_build_object(
    'citation_id', v_citation_id,
    'status', 'unverified'
  );
end;
$$;

revoke all on function public.newsroom_record_citation(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.newsroom_record_citation(uuid, text, text, text, text, text) to authenticated, service_role;

-- 2.2 newsroom_update_citation_status
create or replace function public.newsroom_update_citation_status(
  p_citation_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_actor_staff uuid;
  v_has_access boolean;
  v_old_status text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.publish')
    or public.newsroom_has_capability('analytics.view')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to update citation status';
  end if;

  if p_status not in ('verified', 'unverified', 'flagged', 'rejected') then
    raise exception 'Invalid status: %', p_status;
  end if;

  select status into v_old_status from public.citation_references where id = p_citation_id;
  if not found then
    raise exception 'Citation reference not found: %', p_citation_id;
  end if;

  v_actor_staff := public.newsroom_current_staff_id_basic();

  update public.citation_references
  set status = p_status
  where id = p_citation_id;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_actor_staff,
    'citation_status_updated',
    'citation_references',
    p_citation_id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_status
    )
  );

  return jsonb_build_object(
    'citation_id', p_citation_id,
    'status', p_status,
    'updated', true
  );
end;
$$;

revoke all on function public.newsroom_update_citation_status(uuid, text) from public, anon;
grant execute on function public.newsroom_update_citation_status(uuid, text) to authenticated, service_role;

-- 2.3 newsroom_create_author
create or replace function public.newsroom_create_author(
  p_display_name text,
  p_slug text default null,
  p_bio text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_actor_staff uuid;
  v_has_access boolean;
  v_author_id uuid;
  v_slug text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('staff.manage')
    or public.newsroom_has_capability('story.edit_all')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to create an author';
  end if;

  if p_display_name is null or trim(p_display_name) = '' then
    raise exception 'Display name cannot be empty';
  end if;

  if p_slug is null or trim(p_slug) = '' then
    v_slug := lower(regexp_replace(trim(p_display_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then
      v_slug := 'author-' || substr(md5(random()::text), 1, 8);
    end if;
  else
    v_slug := lower(trim(p_slug));
  end if;

  if exists (select 1 from public.authors where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;

  v_actor_staff := public.newsroom_current_staff_id_basic();

  insert into public.authors (
    display_name,
    slug,
    bio
  ) values (
    trim(p_display_name),
    v_slug,
    p_bio
  ) returning id into v_author_id;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_actor_staff,
    'author_created',
    'authors',
    v_author_id,
    jsonb_build_object(
      'display_name', trim(p_display_name),
      'slug', v_slug
    )
  );

  return jsonb_build_object(
    'author_id', v_author_id,
    'slug', v_slug,
    'created', true
  );
end;
$$;

revoke all on function public.newsroom_create_author(text, text, text) from public, anon;
grant execute on function public.newsroom_create_author(text, text, text) to authenticated, service_role;

-- 2.4 newsroom_update_author
create or replace function public.newsroom_update_author(
  p_author_id uuid,
  p_display_name text,
  p_bio text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_actor_staff uuid;
  v_has_access boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('staff.manage')
    or public.newsroom_has_capability('story.edit_all')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to update an author';
  end if;

  if not exists (select 1 from public.authors where id = p_author_id) then
    raise exception 'Author not found: %', p_author_id;
  end if;

  v_actor_staff := public.newsroom_current_staff_id_basic();

  update public.authors
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    bio = p_bio
  where id = p_author_id;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_actor_staff,
    'author_updated',
    'authors',
    p_author_id,
    jsonb_build_object(
      'display_name', trim(p_display_name),
      'has_bio', p_bio is not null
    )
  );

  return jsonb_build_object(
    'author_id', p_author_id,
    'updated', true
  );
end;
$$;

revoke all on function public.newsroom_update_author(uuid, text, text) from public, anon;
grant execute on function public.newsroom_update_author(uuid, text, text) to authenticated, service_role;

-- 2.5 newsroom_bind_staff_author
create or replace function public.newsroom_bind_staff_author(
  p_staff_id uuid,
  p_author_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_actor_staff uuid;
  v_has_access boolean;
  v_staff_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select public.newsroom_has_capability('staff.manage') into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to bind staff to public author';
  end if;

  select display_name into v_staff_name from public.staff_profiles where id = p_staff_id;
  if not found then
    raise exception 'Staff profile not found: %', p_staff_id;
  end if;

  if p_author_id is not null and not exists (select 1 from public.authors where id = p_author_id) then
    raise exception 'Public author not found: %', p_author_id;
  end if;

  v_actor_staff := public.newsroom_current_staff_id_basic();

  update public.staff_profiles
  set public_author_id = p_author_id
  where id = p_staff_id;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_actor_staff,
    case when p_author_id is not null then 'staff_author_bound' else 'staff_author_unbound' end,
    'staff_profiles',
    p_staff_id,
    jsonb_build_object(
      'staff_id', p_staff_id,
      'author_id', p_author_id,
      'staff_name', v_staff_name
    )
  );

  return jsonb_build_object(
    'staff_id', p_staff_id,
    'author_id', p_author_id,
    'bound', (p_author_id is not null)
  );
end;
$$;

revoke all on function public.newsroom_bind_staff_author(uuid, uuid) from public, anon;
grant execute on function public.newsroom_bind_staff_author(uuid, uuid) to authenticated, service_role;

-- 2.6 newsroom_create_section
create or replace function public.newsroom_create_section(
  p_name text,
  p_slug text default null,
  p_parent_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_actor_staff uuid;
  v_has_access boolean;
  v_section_id uuid;
  v_slug text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('staff.manage')
    or public.newsroom_has_capability('story.edit_all')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to create section';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Section name cannot be empty';
  end if;

  if p_slug is null or trim(p_slug) = '' then
    v_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then
      v_slug := 'section-' || substr(md5(random()::text), 1, 8);
    end if;
  else
    v_slug := lower(trim(p_slug));
  end if;

  if exists (select 1 from public.sections where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;

  v_actor_staff := public.newsroom_current_staff_id_basic();

  insert into public.sections (
    name,
    slug,
    parent_id
  ) values (
    trim(p_name),
    v_slug,
    p_parent_id
  ) returning id into v_section_id;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_actor_staff,
    'section_created',
    'sections',
    v_section_id,
    jsonb_build_object(
      'name', trim(p_name),
      'slug', v_slug,
      'parent_id', p_parent_id
    )
  );

  return jsonb_build_object(
    'section_id', v_section_id,
    'slug', v_slug,
    'created', true
  );
end;
$$;

revoke all on function public.newsroom_create_section(text, text, uuid) from public, anon;
grant execute on function public.newsroom_create_section(text, text, uuid) to authenticated, service_role;

-- 2.7 newsroom_update_platform_setting
create or replace function public.newsroom_update_platform_setting(
  p_key text,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_actor_staff uuid;
  v_has_access boolean;
  v_is_secret boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select public.newsroom_has_capability('settings.manage') into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to update platform settings';
  end if;

  select is_secret into v_is_secret from public.platform_settings where key = p_key;
  if not found then
    raise exception 'Platform setting not found: %', p_key;
  end if;

  if v_is_secret then
    raise exception 'Cannot modify secret setting via client RPC';
  end if;

  v_actor_staff := public.newsroom_current_staff_id_basic();

  update public.platform_settings
  set
    value = p_value,
    updated_at = now(),
    updated_by = v_user_id
  where key = p_key;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_actor_staff,
    'platform_setting_updated',
    'platform_settings',
    null,
    jsonb_build_object(
      'key', p_key,
      'new_value', p_value
    )
  );

  return jsonb_build_object(
    'key', p_key,
    'updated', true
  );
end;
$$;

revoke all on function public.newsroom_update_platform_setting(text, jsonb) from public, anon;
grant execute on function public.newsroom_update_platform_setting(text, jsonb) to authenticated, service_role;

-- 2.8 newsroom_run_ai_assist (deprecate synthetic text generation)
create or replace function public.newsroom_run_ai_assist(
  p_story_id uuid default null,
  p_task_type text default 'headline_alternatives',
  p_input_prompt text default '',
  p_input_context text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_has_access boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('story.create')
    or public.newsroom_has_capability('story.edit_own')
    or public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.copy_edit')
    or public.newsroom_has_capability('story.fact_check')
    or public.newsroom_has_capability('story.health_review')
    or public.newsroom_has_capability('story.publish')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities to run AI assist';
  end if;

  -- Deprecated: Direct database RPC does not synthesize heuristic content
  return jsonb_build_object(
    'id', null,
    'story_id', p_story_id,
    'story_title', null,
    'task_type', p_task_type,
    'input_prompt', p_input_prompt,
    'input_context', p_input_context,
    'suggestions', '[]'::jsonb,
    'provider', 'gemini',
    'provider_status', 'deprecated_use_edge_function',
    'status', 'failed',
    'note', 'newsroom_run_ai_assist database RPC is deprecated. AI assistance must be invoked via the newsroom-ai-assist Edge Function.'
  );
end;
$$;

revoke all on function public.newsroom_run_ai_assist(uuid, text, text, text) from public, anon;
grant execute on function public.newsroom_run_ai_assist(uuid, text, text, text) to authenticated, service_role;

-- 2.9 Atomic AI assist session persistence and audit logging helper for Edge Function
create or replace function public.newsroom_record_ai_assist_session(
  p_story_id uuid,
  p_task_type text,
  p_input_prompt text,
  p_input_context text,
  p_suggestions jsonb,
  p_provider text,
  p_provider_status text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_staff_id uuid;
  v_session_id uuid;
begin
  -- Resolve canonical staff profile for actor
  select sp.id into v_staff_id
  from public.staff_profiles sp
  where sp.auth_user_id = p_actor_user_id
    and lower(sp.status) = 'active'
  limit 1;

  if v_staff_id is null then
    select sp.id into v_staff_id
    from public.staff_profiles sp
    where sp.auth_user_id = p_actor_user_id
    limit 1;
  end if;

  insert into public.newsroom_ai_assist_sessions (
    story_id,
    task_type,
    input_prompt,
    input_context,
    suggestions,
    provider,
    provider_status,
    status,
    created_by
  ) values (
    p_story_id,
    p_task_type,
    p_input_prompt,
    p_input_context,
    coalesce(p_suggestions, '[]'::jsonb),
    p_provider,
    p_provider_status,
    'completed',
    p_actor_user_id
  ) returning id into v_session_id;

  -- Canonical audit log write
  insert into public.audit_logs (
    actor_staff_id,
    action,
    target_table,
    target_id,
    metadata
  ) values (
    v_staff_id,
    'ai.assist.completed',
    'newsroom_ai_assist_sessions',
    v_session_id,
    jsonb_build_object(
      'task_type', p_task_type,
      'provider', p_provider,
      'provider_status', p_provider_status,
      'story_id', p_story_id,
      'suggestion_count', jsonb_array_length(coalesce(p_suggestions, '[]'::jsonb))
    )
  );

  return jsonb_build_object(
    'session_id', v_session_id,
    'status', 'completed'
  );
end;
$$;

revoke all on function public.newsroom_record_ai_assist_session(uuid, text, text, text, jsonb, text, text, uuid) from public, anon, authenticated;
grant execute on function public.newsroom_record_ai_assist_session(uuid, text, text, text, jsonb, text, text, uuid) to service_role;


-- ============================================================================
-- 3. DEFECT C: DIRECT PRIVILEGED TABLE MUTATION REVOCATION
-- ============================================================================

-- Explicitly revoke unnecessary direct mutation privileges from anon and authenticated
revoke insert, update, delete, truncate, references, trigger on table
  public.platform_settings,
  public.citation_references,
  public.newsroom_ai_assist_sessions,
  public.subscribers,
  public.premium_entitlements,
  public.advertisers,
  public.ad_campaigns,
  public.ad_creatives,
  public.ad_placements
from anon, authenticated;

-- Revoke direct table read from anon on private newsroom and reader identity tables
revoke select on table
  public.platform_settings,
  public.citation_references,
  public.newsroom_ai_assist_sessions,
  public.subscribers,
  public.premium_entitlements
from anon;
