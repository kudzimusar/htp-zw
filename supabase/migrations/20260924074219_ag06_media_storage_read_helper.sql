-- Remove direct media_assets table references from Storage RLS while preserving private object authority.

begin;

create or replace function public.newsroom_can_read_media_object(
  p_bucket text,
  p_object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_media_id uuid;
begin
  if p_bucket<>'newsroom-private' then
    return false;
  end if;

  select ma.id into v_media_id
  from public.media_assets ma
  where ma.storage_bucket=p_bucket
    and ma.storage_key=p_object_name
  limit 1;

  if v_media_id is null then
    return false;
  end if;

  return public.newsroom_can_read_media(v_media_id);
end;
$$;

revoke execute on function public.newsroom_can_read_media_object(text,text) from public,anon;
grant execute on function public.newsroom_can_read_media_object(text,text) to authenticated;

drop policy if exists ag06_newsroom_private_read on storage.objects;
create policy ag06_newsroom_private_read on storage.objects
for select to authenticated
using (
  bucket_id='newsroom-private'
  and public.newsroom_can_read_media_object(bucket_id,name)
);

commit;
