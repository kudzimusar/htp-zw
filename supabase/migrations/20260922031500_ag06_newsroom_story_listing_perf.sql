-- AG-06 live-certification performance hardening.
-- Avoid per-row capability/RLS expansion across the imported story corpus during Newsroom bootstrap.

begin;

create or replace function public.newsroom_list_stories(p_limit integer default 200)
returns setof public.stories
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_staff_id uuid;
  v_can_read_all boolean;
  v_limit integer := least(greatest(coalesce(p_limit,200),1),500);
begin
  if not public.newsroom_session_authorized() then
    raise exception using errcode='42501', message='Active Newsroom session required';
  end if;

  v_staff_id := public.newsroom_current_staff_id_basic();
  v_can_read_all :=
    public.newsroom_has_capability('story.edit_all')
    or public.newsroom_has_capability('story.publish')
    or public.newsroom_has_capability('story.fact_check')
    or public.newsroom_has_capability('story.health_review')
    or public.newsroom_has_capability('story.copy_edit');

  return query
  select s.*
  from public.stories s
  where v_can_read_all
     or s.owner_staff_id = v_staff_id
     or exists (
       select 1
       from public.story_assignments a
       where a.story_id = s.id
         and a.reporter_staff_id = v_staff_id
     )
  order by s.updated_at desc nulls last, s.created_at desc
  limit v_limit;
end;
$$;

revoke execute on function public.newsroom_list_stories(integer) from public, anon;
grant execute on function public.newsroom_list_stories(integer) to authenticated;

commit;
