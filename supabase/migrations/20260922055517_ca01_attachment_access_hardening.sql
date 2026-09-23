-- CA-01 attachment access hardening and server handoff helpers.
-- Fix-forward after initial staging application.

begin;

create or replace function public.newsroom_get_communication_attachment(p_attachment_id uuid)
returns table(
  id uuid,
  storage_bucket text,
  storage_path text,
  filename text,
  mime_type text,
  byte_size bigint,
  status text
)
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if not public.newsroom_can_read_communication_attachment(p_attachment_id) then
    raise exception using errcode='42501',message='Attachment access required';
  end if;

  return query
  select a.id,a.storage_bucket,a.storage_path,a.filename,a.mime_type,a.byte_size,a.status
  from public.newsroom_communication_attachments a
  where a.id=p_attachment_id
    and a.status<>'deleted';
end;
$$;

revoke execute on function public.newsroom_get_communication_attachment(uuid) from public,anon;
grant execute on function public.newsroom_get_communication_attachment(uuid) to authenticated;

commit;
