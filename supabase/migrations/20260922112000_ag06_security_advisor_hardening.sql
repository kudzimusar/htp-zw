-- AG-06 cloud security-advisor hardening.
-- Removes default PUBLIC execution from internal helper SECURITY DEFINER functions.
-- Public story projection remains intentionally executable by anon/authenticated.

begin;

revoke execute on function public.newsroom_can_read_story(uuid) from public, anon;
revoke execute on function public.newsroom_can_edit_story(uuid) from public, anon;
revoke execute on function public.newsroom_current_staff_id_basic() from public, anon;
revoke execute on function public.newsroom_has_capability(text) from public, anon;
revoke execute on function public.newsroom_session_authorized() from public, anon;
revoke execute on function public.newsroom_sync_staff_from_auth() from public, anon, authenticated;

grant execute on function public.newsroom_can_read_story(uuid) to authenticated;
grant execute on function public.newsroom_can_edit_story(uuid) to authenticated;
grant execute on function public.newsroom_current_staff_id_basic() to authenticated;
grant execute on function public.newsroom_has_capability(text) to authenticated;
grant execute on function public.newsroom_session_authorized() to authenticated;

alter function public.newsroom_safe_editor_text(text) set search_path = public;

commit;
