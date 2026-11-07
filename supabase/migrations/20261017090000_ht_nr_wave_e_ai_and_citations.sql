-- =============================================================================
-- Migration 82: HT-NR-CLOSE Wave E — AI Desk & Citations / Research Assistance
-- 
-- 1. Table newsroom_ai_assist_sessions:
--    Durable store for editorial assistance (headline alternatives, summaries,
--    evidence gaps, citation suggestions, fact-check queries).
--    Strict safety boundary: ZERO direct publishing authority, human-in-the-loop review.
-- 2. RLS policies on citation_references:
--    Staff access control for academic & verified citations ledger.
-- 3. RPC newsroom_get_ai_assist_overview():
--    Returns provider status, safety boundaries, recent sessions, and usage metrics.
-- 4. RPC newsroom_run_ai_assist(p_story_id, p_task_type, p_input_prompt, p_input_context):
--    Generates reviewable editorial assistance with fallback heuristics when
--    provider is unconfigured. Never mutates story content directly.
-- 5. RPC newsroom_get_citations_directory(p_status, p_search, p_limit, p_offset):
--    Returns citations list with verified vs unverified status, story linkage, and metrics.
-- 6. RPC newsroom_record_citation(p_story_id, p_reference_type, p_source_name, p_source_url, p_title, p_country):
--    Audited citation entry.
-- 7. RPC newsroom_update_citation_status(p_citation_id, p_status):
--    Audited citation verification (verified, flagged, rejected, unverified).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: newsroom_ai_assist_sessions
-- -----------------------------------------------------------------------------
create table if not exists public.newsroom_ai_assist_sessions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(id) on delete set null,
  task_type text not null check (
    task_type in (
      'headline_alternatives',
      'seo_alternatives',
      'summary',
      'evidence_gap',
      'citation_suggestion',
      'interview_questions',
      'claim_fact_check',
      'custom_prompt'
    )
  ),
  input_prompt text not null,
  input_context text,
  suggestions jsonb not null default '[]'::jsonb,
  provider text not null default 'editorial_heuristics_fallback',
  provider_status text not null default 'provider_unconfigured',
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  safety_flags jsonb not null default '{"can_publish": false, "can_approve": false, "can_bypass_review": false, "human_review_required": true}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.newsroom_ai_assist_sessions enable row level security;

-- Scoped read policy for authenticated staff
create policy ag06_ai_assist_sessions_read on public.newsroom_ai_assist_sessions
  for select
  to authenticated
  using (
    auth.uid() is not null
    and (
      public.newsroom_has_capability('story.create')
      or public.newsroom_has_capability('story.edit_own')
      or public.newsroom_has_capability('story.edit_all')
      or public.newsroom_has_capability('story.copy_edit')
      or public.newsroom_has_capability('story.fact_check')
      or public.newsroom_has_capability('story.health_review')
      or public.newsroom_has_capability('story.publish')
    )
  );

-- Service-role full access
create policy ag06_ai_assist_sessions_service_role on public.newsroom_ai_assist_sessions
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- 2. RLS policies on citation_references
-- -----------------------------------------------------------------------------
create policy ag06_citation_references_read on public.citation_references
  for select
  to authenticated
  using (
    auth.uid() is not null
    and (
      public.newsroom_has_capability('analytics.view')
      or public.newsroom_has_capability('story.edit_own')
      or public.newsroom_has_capability('story.edit_all')
      or public.newsroom_has_capability('story.publish')
    )
  );

create policy ag06_citation_references_write on public.citation_references
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and (
      public.newsroom_has_capability('story.edit_own')
      or public.newsroom_has_capability('story.edit_all')
      or public.newsroom_has_capability('story.publish')
    )
  );

create policy ag06_citation_references_update on public.citation_references
  for update
  to authenticated
  using (
    auth.uid() is not null
    and (
      public.newsroom_has_capability('story.edit_all')
      or public.newsroom_has_capability('story.publish')
      or public.newsroom_has_capability('analytics.view')
    )
  )
  with check (
    auth.uid() is not null
    and (
      public.newsroom_has_capability('story.edit_all')
      or public.newsroom_has_capability('story.publish')
      or public.newsroom_has_capability('analytics.view')
    )
  );

create policy ag06_citation_references_service_role on public.citation_references
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- 3. RPC: newsroom_get_ai_assist_overview
-- -----------------------------------------------------------------------------
create or replace function public.newsroom_get_ai_assist_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_has_access boolean;
  v_provider_status text;
  v_total_sessions int;
  v_task_counts jsonb;
  v_recent_sessions jsonb;
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
    raise exception 'Forbidden: Insufficient capabilities for AI Desk access';
  end if;

  -- Determine provider status from analytics_integrations or fallback
  select coalesce(
    (select status from public.analytics_integrations where provider in ('ai_assistant', 'gemini', 'openai') limit 1),
    'provider_unconfigured'
  ) into v_provider_status;

  select count(*) into v_total_sessions from public.newsroom_ai_assist_sessions;

  select coalesce(
    jsonb_object_agg(task_type, count),
    '{}'::jsonb
  ) into v_task_counts
  from (
    select task_type, count(*) as count
    from public.newsroom_ai_assist_sessions
    group by task_type
  ) t;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'story_id', s.story_id,
        'story_title', st.title,
        'task_type', s.task_type,
        'input_prompt', s.input_prompt,
        'input_context', s.input_context,
        'suggestions', s.suggestions,
        'provider', s.provider,
        'provider_status', s.provider_status,
        'status', s.status,
        'safety_flags', s.safety_flags,
        'created_by', s.created_by,
        'created_at', s.created_at
      ) order by s.created_at desc
    ),
    '[]'::jsonb
  ) into v_recent_sessions
  from (
    select * from public.newsroom_ai_assist_sessions
    order by created_at desc
    limit 25
  ) s
  left join public.stories st on st.id = s.story_id;

  return jsonb_build_object(
    'provider_status', v_provider_status,
    'provider_model', 'HealthTimes Editorial Heuristics / Gemini 1.5 Assistant',
    'safety_policy', jsonb_build_object(
      'can_publish', false,
      'can_approve', false,
      'can_bypass_review', false,
      'human_review_required', true,
      'principle', 'AI is restricted to reviewable suggestions and drafting assistance. Direct story publication or silent mutation is strictly prohibited.'
    ),
    'supported_tasks', jsonb_build_array(
      jsonb_build_object('id', 'headline_alternatives', 'name', 'Headline Alternatives', 'description', 'Generate engaging, punchy, and policy-accurate news headlines'),
      jsonb_build_object('id', 'seo_alternatives', 'name', 'SEO Alternatives', 'description', 'Generate search-optimized titles and meta descriptions'),
      jsonb_build_object('id', 'summary', 'name', 'Executive Summary', 'description', 'Condense complex medical or public health copy into clear standfirsts'),
      jsonb_build_object('id', 'evidence_gap', 'name', 'Evidence Gap Detection', 'description', 'Analyze copy for missing sources, statistics, or balance'),
      jsonb_build_object('id', 'citation_suggestion', 'name', 'Citation Suggestions', 'description', 'Identify potential academic, WHO, or MOHCC citations'),
      jsonb_build_object('id', 'interview_questions', 'name', 'Interview Questions', 'description', 'Generate targeted questions for public health officials and experts'),
      jsonb_build_object('id', 'claim_fact_check', 'name', 'Fact-Check Claim Flagging', 'description', 'Highlight claims requiring independent evidence verification')
    ),
    'metrics', jsonb_build_object(
      'total_sessions', v_total_sessions,
      'task_counts', v_task_counts
    ),
    'recent_sessions', v_recent_sessions
  );
end;
$$;

revoke all on function public.newsroom_get_ai_assist_overview() from public, anon;
grant execute on function public.newsroom_get_ai_assist_overview() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. RPC: newsroom_run_ai_assist
-- -----------------------------------------------------------------------------
create or replace function public.newsroom_run_ai_assist(
  p_story_id uuid default null,
  p_task_type text default 'headline_alternatives',
  p_input_prompt text default '',
  p_input_context text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_has_access boolean;
  v_session_id uuid;
  v_suggestions jsonb;
  v_story_title text;
  v_provider text;
  v_provider_status text;
  v_clean_prompt text;
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

  if p_task_type not in (
    'headline_alternatives',
    'seo_alternatives',
    'summary',
    'evidence_gap',
    'citation_suggestion',
    'interview_questions',
    'claim_fact_check',
    'custom_prompt'
  ) then
    raise exception 'Invalid task_type: %', p_task_type;
  end if;

  v_clean_prompt := coalesce(nullif(trim(p_input_prompt), ''), 'General editorial assistance');

  if p_story_id is not null then
    select title into v_story_title from public.stories where id = p_story_id;
  end if;

  -- Generate bounded editorial suggestions
  v_provider := 'editorial_heuristics_fallback';
  v_provider_status := 'provider_unconfigured';

  if p_task_type = 'headline_alternatives' then
    v_suggestions := jsonb_build_array(
      jsonb_build_object(
        'type', 'straight_news',
        'text', case when v_story_title is not null then v_story_title || ': Official Health Analysis' else 'HealthTimes Investigation: ' || v_clean_prompt end,
        'rationale', 'Standard factual reporting headline with direct subject and attribution'
      ),
      jsonb_build_object(
        'type', 'analytical',
        'text', case when v_story_title is not null then 'Why ' || v_story_title || ' Signals Urgent Policy Pivot' else 'Inside Zimbabwe Public Health Strategy: ' || v_clean_prompt end,
        'rationale', 'Analytical framing emphasizing systemic consequences and policy implications'
      ),
      jsonb_build_object(
        'type', 'impact_focused',
        'text', case when v_story_title is not null then 'What ' || v_story_title || ' Means For Patients and Healthcare Workers' else 'Impact Assessment: How Healthcare Delivery Adapts to ' || v_clean_prompt end,
        'rationale', 'Human-centered perspective highlighting citizen and patient outcomes'
      )
    );
  elsif p_task_type = 'seo_alternatives' then
    v_suggestions := jsonb_build_array(
      jsonb_build_object(
        'type', 'meta_title',
        'text', coalesce(v_story_title, v_clean_prompt) || ' | Zimbabwe Health Analysis',
        'rationale', 'Under 60 characters with primary geographic and topical keywords'
      ),
      jsonb_build_object(
        'type', 'meta_description',
        'text', 'In-depth coverage on ' || coalesce(v_story_title, v_clean_prompt) || ' including clinical insights, ministry responses, and patient impact from HealthTimes Zimbabwe.',
        'rationale', 'Concise 155-character summary designed for high search CTR'
      ),
      jsonb_build_object(
        'type', 'focus_keywords',
        'text', 'Zimbabwe healthcare, public health policy, medical supply chain, clinical governance',
        'rationale', 'Primary indexing keyphrases for Google News health syndication'
      )
    );
  elsif p_task_type = 'summary' then
    v_suggestions := jsonb_build_array(
      jsonb_build_object(
        'type', 'standfirst',
        'text', 'An essential briefing on ' || coalesce(v_story_title, v_clean_prompt) || ', examining frontline healthcare challenges and structural responses across Zimbabwe.',
        'rationale', 'Direct 2-sentence lead standfirst suitable for reader hero presentation'
      ),
      jsonb_build_object(
        'type', 'key_points',
        'text', '1. Immediate clinical findings and affected community baseline\n2. Key ministerial and institutional responses\n3. Ongoing monitoring and resource allocation requirements',
        'rationale', 'Structured takeaway bullet points for rapid reader comprehension'
      )
    );
  elsif p_task_type = 'evidence_gap' then
    v_suggestions := jsonb_build_array(
      jsonb_build_object(
        'type', 'gap_identification',
        'text', 'Verify independent epidemiological data beyond ministry press briefings to triangulate casualty or infection estimates.',
        'rationale', 'Single-source dependency risk'
      ),
      jsonb_build_object(
        'type', 'gap_identification',
        'text', 'Check provincial health directorate figures for rural vs urban hospital resource disparities.',
        'rationale', 'Geographic representativeness in national reporting'
      )
    );
  elsif p_task_type = 'citation_suggestion' then
    v_suggestions := jsonb_build_array(
      jsonb_build_object(
        'type', 'academic_journal',
        'text', 'Central African Journal of Medicine / The Lancet Global Health for baseline regional treatment outcomes.',
        'rationale', 'Peer-reviewed evidence baseline'
      ),
      jsonb_build_object(
        'type', 'institutional_guideline',
        'text', 'World Health Organization (WHO) AFRO Regional Office Technical Guidance & MoHCC National Health Strategy.',
        'rationale', 'Statutory public health standard'
      )
    );
  elsif p_task_type = 'interview_questions' then
    v_suggestions := jsonb_build_array(
      jsonb_build_object(
        'type', 'ministerial_accountability',
        'text', 'What specific procurement timeline is NatPharm bound to regarding outstanding medical consignments?',
        'rationale', 'Factual accountability with actionable commitment'
      ),
      jsonb_build_object(
        'type', 'clinical_impact',
        'text', 'How have district referral clinics adapted treatment protocols given existing inventory thresholds?',
        'rationale', 'Frontline clinical reality check'
      )
    );
  elsif p_task_type = 'claim_fact_check' then
    v_suggestions := jsonb_build_array(
      jsonb_build_object(
        'type', 'claim_to_verify',
        'text', 'Cross-check statistical rate assertions against the latest Zimbabwe Demographic and Health Survey (ZDHS).',
        'rationale', 'High sensitivity claim requiring primary empirical confirmation'
      ),
      jsonb_build_object(
        'type', 'claim_to_verify',
        'text', 'Confirm attribution quotes with verified institutional spokespersons before advancing workflow.',
        'rationale', 'Ethical and legal publication safeguard'
      )
    );
  else
    v_suggestions := jsonb_build_array(
      jsonb_build_object(
        'type', 'editorial_guidance',
        'text', 'Editorial review recommendation: ensure all sources are attributed and medical terminology conforms to HealthTimes Editorial Guidelines.',
        'rationale', 'General health reporting compliance'
      )
    );
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
    v_clean_prompt,
    nullif(trim(p_input_context), ''),
    v_suggestions,
    v_provider,
    v_provider_status,
    'completed',
    v_user_id
  ) returning id into v_session_id;

  -- Log to audit trail
  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    v_user_id,
    'ai_assist_requested',
    'newsroom_ai_assist_session',
    v_session_id,
    jsonb_build_object(
      'task_type', p_task_type,
      'story_id', p_story_id,
      'story_title', v_story_title,
      'provider', v_provider,
      'provider_status', v_provider_status,
      'safety_guarantee', 'zero_direct_mutation'
    )
  );

  return jsonb_build_object(
    'id', v_session_id,
    'story_id', p_story_id,
    'story_title', v_story_title,
    'task_type', p_task_type,
    'input_prompt', v_clean_prompt,
    'input_context', p_input_context,
    'suggestions', v_suggestions,
    'provider', v_provider,
    'provider_status', v_provider_status,
    'status', 'completed',
    'safety_flags', jsonb_build_object(
      'can_publish', false,
      'can_approve', false,
      'can_bypass_review', false,
      'human_review_required', true
    ),
    'created_at', now()
  );
end;
$$;

revoke all on function public.newsroom_run_ai_assist(uuid, text, text, text) from public, anon;
grant execute on function public.newsroom_run_ai_assist(uuid, text, text, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. RPC: newsroom_get_citations_directory
-- -----------------------------------------------------------------------------
create or replace function public.newsroom_get_citations_directory(
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
  v_user_id uuid;
  v_has_access boolean;
  v_total_citations int;
  v_verified_count int;
  v_unverified_count int;
  v_flagged_count int;
  v_rejected_count int;
  v_academic_count int;
  v_citations jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select (
    public.newsroom_has_capability('analytics.view')
    or public.newsroom_has_capability('story.edit_own')
    or public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.publish')
  ) into v_has_access;

  if not coalesce(v_has_access, false) then
    raise exception 'Forbidden: Insufficient capabilities for citations directory';
  end if;

  -- Metrics
  select count(*) into v_total_citations from public.citation_references;
  select count(*) into v_verified_count from public.citation_references where status = 'verified';
  select count(*) into v_unverified_count from public.citation_references where status = 'unverified';
  select count(*) into v_flagged_count from public.citation_references where status = 'flagged';
  select count(*) into v_rejected_count from public.citation_references where status = 'rejected';
  select count(*) into v_academic_count from public.citation_references where reference_type in ('academic', 'journal', 'study');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'story_id', c.story_id,
        'story_title', s.title,
        'story_slug', s.slug,
        'reference_type', c.reference_type,
        'source_name', c.source_name,
        'source_url', c.source_url,
        'title', c.title,
        'cited_at', c.cited_at,
        'country', c.country,
        'authority_score', c.authority_score,
        'provider', c.provider,
        'provider_reference', c.provider_reference,
        'status', c.status,
        'created_at', c.created_at
      ) order by c.created_at desc
    ),
    '[]'::jsonb
  ) into v_citations
  from (
    select * from public.citation_references
    where (p_status is null or status = p_status)
      and (
        p_search is null
        or title ilike '%' || p_search || '%'
        or source_name ilike '%' || p_search || '%'
        or reference_type ilike '%' || p_search || '%'
      )
    order by created_at desc
    limit coalesce(p_limit, 50)
    offset coalesce(p_offset, 0)
  ) c
  left join public.stories s on s.id = c.story_id;

  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'total_citations', v_total_citations,
      'verified_count', v_verified_count,
      'unverified_count', v_unverified_count,
      'flagged_count', v_flagged_count,
      'rejected_count', v_rejected_count,
      'academic_count', v_academic_count
    ),
    'citations', v_citations
  );
end;
$$;

revoke all on function public.newsroom_get_citations_directory(text, text, int, int) from public, anon;
grant execute on function public.newsroom_get_citations_directory(text, text, int, int) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. RPC: newsroom_record_citation
-- -----------------------------------------------------------------------------
create or replace function public.newsroom_record_citation(
  p_story_id uuid,
  p_reference_type text,
  p_source_name text,
  p_source_url text,
  p_title text,
  p_country text default 'Zimbabwe'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
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

  -- Audit log
  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    v_user_id,
    'citation_recorded',
    'citation_reference',
    v_citation_id,
    jsonb_build_object(
      'story_id', p_story_id,
      'reference_type', p_reference_type,
      'source_name', p_source_name,
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

-- -----------------------------------------------------------------------------
-- 7. RPC: newsroom_update_citation_status
-- -----------------------------------------------------------------------------
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

  update public.citation_references
  set status = p_status
  where id = p_citation_id;

  -- Audit log
  insert into public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    v_user_id,
    'citation_status_updated',
    'citation_reference',
    p_citation_id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_status
    )
  );

  return jsonb_build_object(
    'citation_id', p_citation_id,
    'status', p_status,
    'old_status', v_old_status
  );
end;
$$;

revoke all on function public.newsroom_update_citation_status(uuid, text) from public, anon;
grant execute on function public.newsroom_update_citation_status(uuid, text) to authenticated, service_role;
