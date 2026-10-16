-- HT-NR-04B: Public Homepage Presentation Delivery RPC
-- Bounded, read-only, SECURITY DEFINER projection for editorial homepage and edition curation.
-- Exposes ONLY approved public presentation fields; never leaks full distribution or story body.

create or replace function public.newsroom_public_homepage_presentations(p_edition_slug text default null)
returns table (
  story_id uuid,
  slug text,
  title text,
  standfirst text,
  excerpt text,
  access_policy text,
  published_at timestamptz,
  modified_at timestamptz,
  canonical_url text,
  author_name text,
  author_slug text,
  section_name text,
  section_slug text,
  hero_public_url text,
  hero_alt_text text,
  hero_caption text,
  hero_credit text,
  global_placement jsonb,
  edition_placement jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_edition text := null;
begin
  if p_edition_slug is not null and btrim(p_edition_slug) <> '' then
    v_edition := lower(btrim(p_edition_slug));
    if v_edition !~ '^[a-z0-9-]+$' or length(v_edition) > 64 or v_edition = 'global' then
      v_edition := null;
    end if;
  end if;

  return query
  select
    s.id as story_id,
    s.slug,
    s.title,
    s.standfirst,
    s.excerpt,
    s.access_policy,
    s.published_at,
    coalesce(s.modified_at, s.published_at) as modified_at,
    coalesce(nullif(s.canonical_url, ''), 'https://healthtimes.co.zw/' || s.slug || '/') as canonical_url,
    a.display_name as author_name,
    a.slug as author_slug,
    sec.name as section_name,
    sec.slug as section_slug,
    fm.hero_public_url,
    fm.hero_alt_text,
    fm.hero_caption,
    fm.hero_credit,
    case
      when coalesce((s.distribution->'homepage'->>'active')::boolean, false) = true
      then s.distribution->'homepage'
      else null
    end as global_placement,
    case
      when v_edition is not null and coalesce((s.distribution->'homepage_editions'->v_edition->>'active')::boolean, false) = true
      then s.distribution->'homepage_editions'->v_edition
      else null
    end as edition_placement
  from public.stories s
  left join public.authors a on a.id = s.author_id
  left join public.sections sec on sec.id = s.primary_section_id
  left join lateral (
    select
      coalesce(ma.public_url, ma.source_url) as hero_public_url,
      ma.alt_text as hero_alt_text,
      ma.caption as hero_caption,
      ma.credit as hero_credit
    from public.media_usage mu
    join public.media_assets ma on ma.id = mu.media_id
    where mu.story_id = s.id
      and mu.usage_type = 'featured'
    order by ma.created_at desc
    limit 1
  ) fm on true
  where lower(s.status) in ('publish', 'published')
    and (s.published_at is null or s.published_at <= now())
    and lower(s.access_policy) in ('public', 'premium')
    and (
      s.legacy_source_id is not null
      or coalesce((s.distribution->>'public_reader')::boolean, false) = true
    )
    and (
      coalesce((s.distribution->'homepage'->>'active')::boolean, false) = true
      or (
        v_edition is not null
        and coalesce((s.distribution->'homepage_editions'->v_edition->>'active')::boolean, false) = true
      )
    )
  order by s.published_at desc nulls last, s.created_at desc;
end;
$$;

revoke all on function public.newsroom_public_homepage_presentations(text) from public;
grant execute on function public.newsroom_public_homepage_presentations(text) to anon, authenticated;
