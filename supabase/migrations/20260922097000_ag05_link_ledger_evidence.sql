-- AG-05 compact public URL exception evidence for CP5 certification.

create or replace function public.ag05_internal_link_ledger_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_paths',count(*),
    'total_occurrences',coalesce(sum(occurrences),0),
    'preserved_direct_paths',count(*) filter (where classification='preserved_direct'),
    'alias_redirect_paths',count(*) filter (where classification='alias_redirect'),
    'homepage_paths',count(*) filter (where classification='homepage'),
    'explicit_404_exception_paths',count(*) filter (where classification='explicit_404_exception'),
    'redirect_chain_candidates',count(*) filter (
      where classification='alias_redirect'
        and exists (
          select 1 from public.legacy_url_mappings m
          where m.old_path=target_path and m.redirect_status=301
        )
    ),
    'homepage_catchall_aliases',count(*) filter (
      where classification='alias_redirect' and target_path='/'
    )
  )
  from public.ag05_internal_link_ledger();
$$;

create or replace function public.ag05_internal_link_exceptions()
returns table(path text,occurrences bigint,http_status integer,reason text)
language sql
stable
security definer
set search_path = public
as $$
  select l.path,l.occurrences,l.http_status,l.reason
  from public.ag05_internal_link_ledger() l
  where l.classification='explicit_404_exception'
  order by l.occurrences desc,l.path;
$$;

revoke all on function public.ag05_internal_link_ledger_summary() from public;
revoke all on function public.ag05_internal_link_exceptions() from public;
grant execute on function public.ag05_internal_link_ledger_summary() to anon, authenticated;
grant execute on function public.ag05_internal_link_exceptions() to anon, authenticated;
