-- AG-05 materialized broken-link/alias ledger for completed AG-04 rehearsal.
-- Public reads are summary/exception-only through SECURITY DEFINER functions.
-- Refresh is not granted to anon/authenticated.

create table if not exists public.ag05_internal_link_audit (
  path text primary key,
  occurrences bigint not null,
  classification text not null,
  http_status integer not null,
  target_path text,
  reason text,
  refreshed_at timestamptz not null default now()
);

alter table public.ag05_internal_link_audit enable row level security;

create or replace function public.ag05_refresh_internal_link_audit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  truncate table public.ag05_internal_link_audit;

  insert into public.ag05_internal_link_audit (
    path,occurrences,classification,http_status,target_path,reason,refreshed_at
  )
  with links as (
    select (regexp_matches(coalesce(s.body_html,''), 'href=["'']([^"'']+)["'']', 'gi'))[1] as href
    from public.stories s
    where lower(s.status) in ('publish','published')
  ),
  internal as (
    select case
      when href ~ '^https?://(www\.)?healthtimes\.co\.zw/' then regexp_replace(href,'^https?://(www\.)?healthtimes\.co\.zw','')
      when href like '/%' then href
      else null
    end as raw_path
    from links
  ),
  paths as (
    select public.ag05_normalize_path(raw_path) as path,count(*)::bigint as occurrences
    from internal
    where raw_path is not null
      and raw_path !~ '^/wp-content/'
      and raw_path !~ '^/(wp-admin|wp-login\.php|feed|category|tag|author)(/|$)'
    group by public.ag05_normalize_path(raw_path)
  ),
  direct_targets as (
    select m.old_path,m.new_path,m.redirect_status,m.preservation_strategy
    from public.legacy_url_mappings m
    join public.legacy_sources ls on ls.id=m.legacy_source_id
    where ls.system='wordpress'
      and ls.source_type in ('post','page')
  ),
  slug_targets as (
    select
      st.slug,
      count(*)::integer as n,
      (array_agg(m.old_path order by m.old_path))[1] as target_path
    from public.stories st
    join public.legacy_sources ls on ls.id=st.legacy_source_id
    join public.legacy_url_mappings m on m.legacy_source_id=ls.id
    where ls.system='wordpress'
      and ls.source_type in ('post','page')
      and lower(st.status) in ('publish','published')
      and (st.published_at is null or st.published_at <= now())
      and m.redirect_status=200
      and m.preservation_strategy='preserve_directly'
    group by st.slug
  ),
  classified as (
    select
      p.path,
      p.occurrences,
      d.old_path as direct_path,
      d.new_path as direct_target,
      d.redirect_status as direct_status,
      st.n as slug_match_count,
      st.target_path as slug_target
    from paths p
    left join direct_targets d on d.old_path=p.path
    left join slug_targets st
      on st.slug=regexp_replace(p.path,'^.*/([^/]+)/$','\1')
  )
  select
    path,
    occurrences,
    case
      when path='/' then 'homepage'
      when direct_path is not null and direct_status=200 then 'preserved_direct'
      when direct_path is not null and direct_status=301 then 'redirect'
      when slug_match_count=1 then 'alias_redirect'
      else 'explicit_404_exception'
    end,
    case
      when path='/' then 200
      when direct_path is not null then direct_status
      when slug_match_count=1 then 301
      else 404
    end,
    case
      when path='/' then '/'
      when direct_path is not null then direct_target
      when slug_match_count=1 then slug_target
      else null
    end,
    case
      when path='/' then 'homepage_or_fragment_target'
      when direct_path is not null then 'canonical_public_mapping'
      when slug_match_count=1 then 'unique_story_slug_match'
      else 'no_unique_authoritative_destination'
    end,
    now()
  from classified;

  get diagnostics v_rows = row_count;

  return jsonb_build_object(
    'refreshed_rows',v_rows,
    'refreshed_at',now()
  );
end;
$$;

select public.ag05_refresh_internal_link_audit();

create or replace function public.ag05_internal_link_ledger_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_paths',count(*),
    'total_occurrences',coalesce(sum(a.occurrences),0),
    'preserved_direct_paths',count(*) filter (where a.classification='preserved_direct'),
    'redirect_paths',count(*) filter (where a.classification='redirect'),
    'alias_redirect_paths',count(*) filter (where a.classification='alias_redirect'),
    'homepage_paths',count(*) filter (where a.classification='homepage'),
    'explicit_404_exception_paths',count(*) filter (where a.classification='explicit_404_exception'),
    'redirect_chain_candidates',count(*) filter (
      where a.classification in ('redirect','alias_redirect')
        and exists (
          select 1 from public.legacy_url_mappings m
          where m.old_path=a.target_path and m.redirect_status=301
        )
    ),
    'homepage_catchall_aliases',count(*) filter (
      where a.classification in ('redirect','alias_redirect') and a.target_path='/'
    ),
    'refreshed_at',max(a.refreshed_at)
  )
  from public.ag05_internal_link_audit a;
$$;

create or replace function public.ag05_internal_link_exceptions()
returns table(path text,occurrences bigint,http_status integer,reason text)
language sql
stable
security definer
set search_path = public
as $$
  select a.path,a.occurrences,a.http_status,a.reason
  from public.ag05_internal_link_audit a
  where a.classification='explicit_404_exception'
  order by a.occurrences desc,a.path;
$$;

revoke all on function public.ag05_refresh_internal_link_audit() from public;
revoke all on function public.ag05_internal_link_ledger_summary() from public;
revoke all on function public.ag05_internal_link_exceptions() from public;

grant execute on function public.ag05_refresh_internal_link_audit() to service_role;
grant execute on function public.ag05_internal_link_ledger_summary() to anon, authenticated;
grant execute on function public.ag05_internal_link_exceptions() to anon, authenticated;
