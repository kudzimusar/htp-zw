-- HELD: this is NOT a migration and must not be placed in supabase/migrations.
-- It runs only on disposable databases until the Owner separately authorizes a
-- staging change against an independently reviewed exact SHA.
--
-- Judges each stored story on its own provenance. Native stories have no legacy
-- source, so that absence is not held against them: a native story qualifies through
-- the Newsroom's release marker and a recorded staff approval instead.

create table if not exists public.story_editorial_classifications (
  story_id uuid primary key references public.stories(id) on delete cascade,
  classification text not null check (classification in ('production','test')),
  decided_by text not null,
  decided_at timestamptz not null default now(),
  basis text not null
);
alter table public.story_editorial_classifications enable row level security;
revoke all on public.story_editorial_classifications from public, anon, authenticated;

create or replace function public.ht_story_reader_lane(p_story_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_story public.stories%rowtype;
  v_source public.legacy_sources%rowtype;
  v_classification text;
  v_published boolean;
begin
  select * into v_story from public.stories where id = p_story_id;
  if not found then return 'excluded-unknown-source'; end if;
  select classification into v_classification from public.story_editorial_classifications where story_id = p_story_id;
  if v_classification = 'test' then return 'excluded-test'; end if;
  v_published := lower(coalesce(v_story.status,'')) in ('publish','published')
    and (v_story.published_at is null or v_story.published_at <= now());

  if v_story.legacy_source_id is not null then
    select * into v_source from public.legacy_sources where id = v_story.legacy_source_id;
    if v_source.system = 'wordpress' and v_source.source_type = 'page' then return 'excluded-page'; end if;
    if v_source.system is distinct from 'wordpress' or v_source.source_type is distinct from 'post'
       or coalesce(v_source.stable_key,'') !~ '^wordpress:post:[0-9]+$' then
      return 'excluded-unknown-source';
    end if;
    return case when v_published then 'wordpress-post' else 'excluded-unreleased' end;
  end if;

  if v_classification is distinct from 'production'
     and (v_story.title ~* '^\s*\[(uat|test|fixture|qa)[^]]*\]'
          or v_story.slug ~* '^(uat([0-9]+[a-z]?)?-|fixture-|test-(story|article|post|fixture)([^a-z0-9]|$))') then
    return 'excluded-test';
  end if;

  if v_published
     and coalesce((v_story.distribution->>'public_reader')::boolean, false)
     and v_story.workflow_status in ('Published','Updated / Corrected')
     and exists (select 1 from public.story_lifecycle_events e
                 where e.story_id = v_story.id and e.to_status = 'Published' and e.actor_staff_id is not null) then
    return 'native-newsroom';
  end if;
  return 'excluded-unreleased';
end;
$$;
revoke all on function public.ht_story_reader_lane(uuid) from public, anon, authenticated;

create or replace function public.newsroom_public_published_stories(p_slug text default null)
returns table(id uuid, title text, slug text, standfirst text, excerpt text, body_html text,
              published_at timestamptz, modified_at timestamptz, seo_title text, seo_description text, canonical_url text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.title, s.slug, s.standfirst, s.excerpt, s.body_html, s.published_at, s.modified_at,
         s.seo_title, s.seo_description, s.canonical_url
  from public.stories s
  where s.legacy_source_id is null
    and lower(s.access_policy) = 'public'
    and public.ht_story_reader_lane(s.id) = 'native-newsroom'
    and (p_slug is null or s.slug = p_slug)
  order by s.published_at desc nulls last, s.created_at desc;
$$;

create or replace function public.ag05_public_feed_rows(p_limit integer default 50)
returns table(title text, canonical_url text, published_at timestamptz, modified_at timestamptz, author_name text, description text)
language sql
stable
security definer
set search_path = public
as $$
  select st.title,
    coalesce(nullif(sm.canonical_url,''), nullif(st.canonical_url,''), ls.source_url),
    st.published_at,
    coalesce(st.modified_at, st.published_at),
    au.display_name,
    coalesce(nullif(sm.description,''), nullif(st.seo_description,''), nullif(st.standfirst,''), nullif(st.excerpt,''))
  from public.stories st
  join public.legacy_sources ls on ls.id = st.legacy_source_id
  left join public.seo_metadata sm on sm.legacy_source_id = ls.id
  left join public.authors au on au.id = st.author_id
  where public.ht_story_reader_lane(st.id) = 'wordpress-post'
  order by st.published_at desc nulls last, st.created_at desc
  limit least(greatest(coalesce(p_limit,50),1),200);
$$;

-- These two have long bodies that stay as they are; each is wrapped so a result
-- must also pass the lane check.
alter function public.newsroom_public_story_document(text) rename to newsroom_public_story_document_unfiltered;
revoke all on function public.newsroom_public_story_document_unfiltered(text) from public, anon, authenticated;

create function public.newsroom_public_story_document(p_path text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.ht_story_reader_lane((d.doc->>'story_id')::uuid) = 'native-newsroom' then d.doc end
  from (select public.newsroom_public_story_document_unfiltered(p_path) as doc) d;
$$;
revoke all on function public.newsroom_public_story_document(text) from public;
grant execute on function public.newsroom_public_story_document(text) to anon, authenticated, service_role;

alter function public.ag05_public_feed_documents(int, int, text) rename to ag05_public_feed_documents_unfiltered;
revoke all on function public.ag05_public_feed_documents_unfiltered(int, int, text) from public, anon, authenticated;

create function public.ag05_public_feed_documents(p_limit int default 50, p_public_limit int default 0, p_search text default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(item order by ordinal), '[]'::jsonb)
  from jsonb_array_elements(public.ag05_public_feed_documents_unfiltered(p_limit, p_public_limit, p_search)) with ordinality as t(item, ordinal)
  where public.ht_story_reader_lane((item->>'story_id')::uuid) = 'wordpress-post';
$$;
revoke all on function public.ag05_public_feed_documents(int, int, text) from public;
grant execute on function public.ag05_public_feed_documents(int, int, text) to anon, authenticated, service_role;
