-- AG-05 runtime URL resolution and broken-link ledger.
-- Historical aliases are derived only when the final slug uniquely identifies one imported story.
-- Unmatched paths remain explicit 404 exceptions; no homepage catch-all is created.

create or replace function public.ag05_resolve_public_path(p_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text := public.ag05_normalize_path(p_path);
  v_direct record;
  v_alias record;
begin
  if v_path='/' then
    return jsonb_build_object(
      'resolution','homepage',
      'http_status',200,
      'requested_path','/',
      'target_path','/'
    );
  end if;

  select m.old_path,m.new_path,m.redirect_status,m.preservation_strategy,
         ls.id legacy_source_id,ls.source_id,ls.source_type
  into v_direct
  from public.legacy_url_mappings m
  join public.legacy_sources ls on ls.id=m.legacy_source_id
  where ls.system='wordpress'
    and ls.source_type in ('post','page')
    and m.old_path=v_path
  limit 1;

  if v_direct.old_path is not null then
    return jsonb_build_object(
      'resolution',case when v_direct.redirect_status=301 then 'redirect' else 'preserved_direct' end,
      'http_status',v_direct.redirect_status,
      'requested_path',v_path,
      'target_path',v_direct.new_path,
      'legacy_source_id',v_direct.legacy_source_id,
      'source_id',v_direct.source_id,
      'source_type',v_direct.source_type
    );
  end if;

  with slug_candidate as (
    select regexp_replace(v_path,'^.*/([^/]+)/$','\1') as slug
  ), matches as (
    select st.id story_id,ls.id legacy_source_id,ls.source_id,ls.source_type,
           m.old_path canonical_path,
           count(*) over() match_count
    from slug_candidate sc
    join public.stories st on st.slug=sc.slug
    join public.legacy_sources ls on ls.id=st.legacy_source_id
    join public.legacy_url_mappings m on m.legacy_source_id=ls.id
    where ls.system='wordpress'
      and ls.source_type in ('post','page')
      and lower(st.status) in ('publish','published')
      and (st.published_at is null or st.published_at <= now())
      and m.redirect_status=200
      and m.preservation_strategy='preserve_directly'
  )
  select * into v_alias from matches where match_count=1 limit 1;

  if v_alias.story_id is not null then
    return jsonb_build_object(
      'resolution','alias_redirect',
      'http_status',301,
      'requested_path',v_path,
      'target_path',v_alias.canonical_path,
      'legacy_source_id',v_alias.legacy_source_id,
      'source_id',v_alias.source_id,
      'source_type',v_alias.source_type,
      'reason','unique_story_slug_match'
    );
  end if;

  return jsonb_build_object(
    'resolution','explicit_404_exception',
    'http_status',404,
    'requested_path',v_path,
    'target_path',null,
    'reason','no_unique_authoritative_destination'
  );
end;
$$;

create or replace function public.ag05_internal_link_ledger()
returns table(
  path text,
  occurrences bigint,
  classification text,
  http_status integer,
  target_path text,
  reason text
)
language sql
stable
security definer
set search_path = public
as $$
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
  select public.ag05_normalize_path(raw_path) as normalized_path,count(*)::bigint as occurrences
  from internal
  where raw_path is not null
    and raw_path !~ '^/wp-content/'
    and raw_path !~ '^/(wp-admin|wp-login\.php|feed|category|tag|author)(/|$)'
  group by public.ag05_normalize_path(raw_path)
)
select
  p.normalized_path,
  p.occurrences,
  r->>'resolution',
  (r->>'http_status')::integer,
  r->>'target_path',
  r->>'reason'
from paths p
cross join lateral public.ag05_resolve_public_path(p.normalized_path) r
order by p.normalized_path;
$$;

revoke all on function public.ag05_resolve_public_path(text) from public;
revoke all on function public.ag05_internal_link_ledger() from public;
grant execute on function public.ag05_resolve_public_path(text) to anon, authenticated;
grant execute on function public.ag05_internal_link_ledger() to anon, authenticated;
