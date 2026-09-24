-- Fix private Storage upload authorization without granting direct media_assets table access.

begin;

create or replace function public.newsroom_can_upload_prepared_media_object(
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
  v_staff uuid := public.newsroom_current_staff_id_basic();
begin
  if p_bucket<>'newsroom-private'
     or not public.newsroom_session_authorized()
     or not public.newsroom_has_capability('media.manage')
     or v_staff is null then
    return false;
  end if;

  return exists (
    select 1
    from public.media_assets ma
    where ma.storage_bucket=p_bucket
      and ma.storage_key=p_object_name
      and ma.status='upload_pending'
      and ma.uploaded_by_staff_id=v_staff
  );
end;
$$;

revoke execute on function public.newsroom_can_upload_prepared_media_object(text,text) from public,anon;
grant execute on function public.newsroom_can_upload_prepared_media_object(text,text) to authenticated;

drop policy if exists ag06_newsroom_private_prepared_insert on storage.objects;
create policy ag06_newsroom_private_prepared_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='newsroom-private'
  and public.newsroom_can_upload_prepared_media_object(bucket_id,name)
);

commit;
