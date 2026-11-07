-- CA-01 fix-forward: remove recursive RLS evaluation on newsroom_desk_members.
-- The original policy queried newsroom_desk_members from its own USING clause,
-- which PostgreSQL rejects with 42P17. Delegate to the security-definer
-- newsroom_can_read_desk() predicate instead.

begin;

drop policy if exists ca01_newsroom_desk_members_read on public.newsroom_desk_members;

create policy ca01_newsroom_desk_members_read
on public.newsroom_desk_members
for select to authenticated
using (
  public.newsroom_can_read_desk(desk_id)
);

commit;
