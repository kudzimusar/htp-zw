-- AG-05 / AG-04 shared-staging coordination guard.
-- Exposes only bounded, non-sensitive readiness counts needed by public certification.
-- AG-05 must not certify while an AG-04 rehearsal import is actively rebuilding URL mappings.

create or replace function public.ag05_rehearsal_readiness_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with state as (
    select
      (select count(*)::integer
       from public.legacy_sources ls
       join public.stories st on st.legacy_source_id=ls.id
       where ls.system='wordpress'
         and ls.source_type in ('post','page')) as public_objects,
      (select count(*)::integer
       from public.legacy_url_mappings m
       join public.legacy_sources ls on ls.id=m.legacy_source_id
       where ls.system='wordpress'
         and ls.source_type in ('post','page')) as mapping_rows,
      (select count(distinct m.legacy_source_id)::integer
       from public.legacy_url_mappings m
       join public.legacy_sources ls on ls.id=m.legacy_source_id
       where ls.system='wordpress'
         and ls.source_type in ('post','page')) as distinct_mapped_sources,
      (select count(*)::integer
       from public.migration_runs mr
       where mr.source_system='wordpress'
         and mr.mode='ag04_rehearsal_import'
         and lower(mr.status)='started'
         and mr.finished_at is null) as active_ag04_runs
  )
  select jsonb_build_object(
    'expected_public_objects',5786,
    'public_objects',public_objects,
    'mapping_rows',mapping_rows,
    'distinct_mapped_sources',distinct_mapped_sources,
    'active_ag04_runs',active_ag04_runs,
    'ready',
      public_objects=5786
      and mapping_rows=5786
      and distinct_mapped_sources=5786
      and active_ag04_runs=0
  )
  from state;
$$;

revoke all on function public.ag05_rehearsal_readiness_status() from public;
grant execute on function public.ag05_rehearsal_readiness_status() to anon, authenticated;
