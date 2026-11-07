-- CA-01 performance hardening: cover foreign keys introduced or extended by communications.
-- No authorization semantics change.

begin;

create index if not exists idx_newsroom_announcements_created_by
  on public.newsroom_announcements(created_by);
create index if not exists idx_newsroom_announcements_desk
  on public.newsroom_announcements(desk_id);

create index if not exists idx_newsroom_communication_attachments_uploaded_by
  on public.newsroom_communication_attachments(uploaded_by);

create index if not exists idx_newsroom_desk_members_added_by
  on public.newsroom_desk_members(added_by);
create index if not exists idx_newsroom_desks_created_by
  on public.newsroom_desks(created_by);

create index if not exists idx_newsroom_messages_author
  on public.newsroom_messages(author_staff_id);
create index if not exists idx_newsroom_messages_parent
  on public.newsroom_messages(parent_message_id);

create index if not exists idx_newsroom_notifications_actor
  on public.newsroom_notifications(actor_staff_id);

create index if not exists idx_newsroom_threads_created_by
  on public.newsroom_threads(created_by);

create index if not exists idx_reader_comment_restrictions_created_by
  on public.reader_comment_restrictions(created_by_staff_id);
create index if not exists idx_reader_comment_restrictions_lifted_by
  on public.reader_comment_restrictions(lifted_by_staff_id);

create index if not exists idx_story_comment_moderation_actions_actor
  on public.story_comment_moderation_actions(actor_staff_id);

create index if not exists idx_story_comment_reports_reporter
  on public.story_comment_reports(reporter_profile_id);
create index if not exists idx_story_comment_reports_resolved_by
  on public.story_comment_reports(resolved_by_staff_id);

create index if not exists idx_story_internal_comment_revisions_edited_by
  on public.story_internal_comment_revisions(edited_by);
create index if not exists idx_story_internal_comments_author
  on public.story_internal_comments(author_staff_id);
create index if not exists idx_story_internal_comments_edited_by
  on public.story_internal_comments(edited_by);
create index if not exists idx_story_internal_comments_resolved_by
  on public.story_internal_comments(resolved_by);

commit;
