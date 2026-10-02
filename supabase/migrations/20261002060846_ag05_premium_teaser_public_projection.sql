-- AG-05 Premium public-teaser authority.
-- Owner policy: exactly one editorial body paragraph for 20 seconds.
-- This migration does not expose a Premium full body and does not create payment authority.

create or replace function public.ag05_first_editorial_paragraph_html(p_body_html text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_chunk text;
  v_attrs text;
  v_inner text;
  v_text text;
begin
  if p_body_html is null or btrim(p_body_html) = '' then
    return null;
  end if;

  for v_chunk in
    select chunk
    from regexp_split_to_table(p_body_html, '</p\s*>', 'i') as chunk
  loop
    if v_chunk !~* '<p([^>]*)>' then
      continue;
    end if;

    -- Greedy prefix intentionally chooses the final opening <p> inside the
    -- current </p>-delimited chunk, so preceding headings/modules are ignored.
    v_attrs := regexp_replace(v_chunk, '^.*<p([^>]*)>(.*)$', '\1', 'is');
    v_inner := regexp_replace(v_chunk, '^.*<p([^>]*)>(.*)$', '\2', 'is');

    if lower(coalesce(v_attrs, '')) ~
       '(caption|wp-caption|advert|advertisement|(^|[^a-z])ad([_-]|[^a-z])|shortcode|embed|social|author|bio|pullquote|related)' then
      continue;
    end if;

    if lower(coalesce(v_inner, '')) ~
       '<(img|figure|figcaption|blockquote|ul|ol|li|script|style|iframe|embed|object|video|audio)([[:space:]>])' then
      continue;
    end if;

    v_text := regexp_replace(coalesce(v_inner, ''), '<br\s*/?>', ' ', 'gi');
    v_text := regexp_replace(v_text, '<[^>]+>', ' ', 'gi');
    v_text := btrim(regexp_replace(v_text, '\s+', ' ', 'g'));

    if v_text = '' then
      continue;
    end if;

    if v_text ~* '^\s*\[[a-z][a-z0-9_-]*(\s[^]]*)?\]\s*$' then
      continue;
    end if;

    if lower(v_text) ~
       '^(advertisement|sponsored|about the author|author bio|related content|related coverage)([[:space:]:-]|$)' then
      continue;
    end if;

    -- Publish only plain paragraph text. Existing entities are preserved;
    -- literal angle brackets are escaped so the teaser cannot introduce tags.
    v_text := replace(replace(v_text, '<', '&lt;'), '>', '&gt;');
    return '<p>' || v_text || '</p>';
  end loop;

  return null;
end;
$$;

revoke all on function public.ag05_first_editorial_paragraph_html(text) from public;

create or replace function public.ag05_public_story_teaser_document(p_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  v_doc jsonb;
  v_body_html text;
  v_teaser_html text;
begin
  v_doc := public.ag05_public_story_document(p_path);

  if v_doc is null then
    return null;
  end if;

  if lower(coalesce(v_doc->>'access_policy', '')) = 'public' then
    return v_doc || jsonb_build_object('premium_teaser_html', null);
  end if;

  select st.body_html
  into v_body_html
  from public.stories st
  where st.id = (v_doc->>'story_id')::uuid
  limit 1;

  v_teaser_html := public.ag05_first_editorial_paragraph_html(v_body_html);

  -- v_doc already guarantees body_html is null for non-public access policy.
  if v_doc->>'body_html' is not null then
    raise exception 'Premium public document attempted to expose body_html';
  end if;

  return v_doc || jsonb_build_object(
    'premium_teaser_html', v_teaser_html
  );
end;
$$;

revoke all on function public.ag05_public_story_teaser_document(text) from public;
grant execute on function public.ag05_public_story_teaser_document(text) to anon, authenticated;

comment on function public.ag05_first_editorial_paragraph_html(text) is
  'AG-05 owner-authorized first editorial paragraph extraction. Never returns paragraph 2 or full body HTML.';

comment on function public.ag05_public_story_teaser_document(text) is
  'AG-05 bounded public Premium projection: metadata + one sanitized editorial paragraph; protected body_html remains null.';
