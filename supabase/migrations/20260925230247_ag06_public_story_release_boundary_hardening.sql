-- AG-06 public Reader release-boundary hardening.
-- Preserve the historical public-story listing function while preventing it from
-- bypassing the certified distribution.public_reader release marker.

begin;

create or replace function public.newsroom_public_published_stories(p_slug text default null)
returns table(
  id uuid,
  title text,
  slug text,
  standfirst text,
  excerpt text,
  body_html text,
  published_at timestamptz,
  modified_at timestamptz,
  seo_title text,
  seo_description text,
  canonical_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,s.title,s.slug,s.standfirst,s.excerpt,s.body_html,s.published_at,s.modified_at,
         s.seo_title,s.seo_description,s.canonical_url
  from public.stories s
  where s.legacy_source_id is null
    and lower(s.status) in ('publish','published')
    and lower(s.access_policy)='public'
    and coalesce((s.distribution->>'public_reader')::boolean,false)=true
    and (s.published_at is null or s.published_at <= now())
    and (p_slug is null or s.slug=p_slug)
  order by s.published_at desc nulls last, s.created_at desc;
$$;

revoke execute on function public.newsroom_public_published_stories(text) from public;
grant execute on function public.newsroom_public_published_stories(text) to anon, authenticated, service_role;

commit;
