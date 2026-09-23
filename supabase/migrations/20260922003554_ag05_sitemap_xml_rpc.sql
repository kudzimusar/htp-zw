-- AG-05 complete sitemap XML helper.
create or replace function public.ag05_public_sitemap_xml()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select '<?xml version="1.0" encoding="UTF-8"?>' || E'\n' ||
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' || E'\n' ||
         coalesce(string_agg(
           xmlserialize(content xmlelement(
             name url,
             xmlelement(name loc, r.canonical_url),
             case when r.modified_at is not null
                  then xmlelement(name lastmod, to_char(r.modified_at at time zone 'UTC','YYYY-MM-DD'))
                  else null end
           ) as text),
           E'\n'
         ),'') || E'\n</urlset>\n'
  from public.ag05_public_sitemap_rows() r;
$$;

revoke all on function public.ag05_public_sitemap_xml() from public;
grant execute on function public.ag05_public_sitemap_xml() to anon, authenticated;
