-- AG-06 staging hardening: preserve story authorization semantics while avoiding
-- per-row capability/session RPC expansion across the migrated story corpus.

begin;

create index if not exists idx_story_assignments_story_reporter
  on public.story_assignments(story_id, reporter_staff_id);

drop policy if exists ag06_stories_read on public.stories;
create policy ag06_stories_read on public.stories
for select to authenticated
using (
  (select public.newsroom_session_authorized())
  and (
    (select public.newsroom_has_capability('story.edit_all'))
    or (select public.newsroom_has_capability('story.publish'))
    or (select public.newsroom_has_capability('story.fact_check'))
    or (select public.newsroom_has_capability('story.health_review'))
    or (select public.newsroom_has_capability('story.copy_edit'))
    or owner_staff_id = (select public.newsroom_current_staff_id_basic())
    or exists (
      select 1
      from public.story_assignments a
      where a.story_id = stories.id
        and a.reporter_staff_id = (select public.newsroom_current_staff_id_basic())
    )
  )
);

drop policy if exists ag06_stories_update on public.stories;
create policy ag06_stories_update on public.stories
for update to authenticated
using (
  (select public.newsroom_session_authorized())
  and (
    (select public.newsroom_has_capability('story.edit_all'))
    or (
      (select public.newsroom_has_capability('story.edit_own'))
      and (
        owner_staff_id = (select public.newsroom_current_staff_id_basic())
        or exists (
          select 1
          from public.story_assignments a
          where a.story_id = stories.id
            and a.reporter_staff_id = (select public.newsroom_current_staff_id_basic())
        )
      )
    )
  )
)
with check (
  (select public.newsroom_session_authorized())
  and (
    (select public.newsroom_has_capability('story.edit_all'))
    or (
      (select public.newsroom_has_capability('story.edit_own'))
      and (
        owner_staff_id = (select public.newsroom_current_staff_id_basic())
        or exists (
          select 1
          from public.story_assignments a
          where a.story_id = stories.id
            and a.reporter_staff_id = (select public.newsroom_current_staff_id_basic())
        )
      )
    )
  )
);

commit;
