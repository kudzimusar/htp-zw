-- HT-MVP-PUBLIC-LAUNCH-01-G5 CANDIDATE (not applied anywhere): reader account deletion contract.
--
-- Two-phase, fail-closed workflow required by Apple 5.1.1(v) / Google Play account-deletion rules:
--   1. The signed-in reader requests deletion (account_request_deletion) with an exact
--      confirmation phrase. Staff identities are refused: they leave through Newsroom
--      offboarding so editorial/audit history keeps its authority trail.
--   2. After the cancellation window, a server operator holding service_role runs
--      account_deletion_process: reader personal data is erased or anonymised while
--      financial records required for accounting are retained against an anonymised
--      subscriber. The Auth identity is then deleted through the Supabase Auth Admin API
--      (existing AG-06 triggers revoke staff/sessions; push devices cascade), and
--      account_deletion_mark_identity_deleted confirms it is gone.
-- Retention, window length and communications erasure are Owner/legal decisions
-- recorded in docs/delivery/HT-MVP-G5-NEWSLETTER-AND-ACCOUNT-DELETION.md.

begin;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  status text not null default 'requested'
    check (status in ('requested','cancelled','rejected','data_erased','completed')),
  requested_at timestamptz not null default now(),
  cancel_window_ends_at timestamptz not null default (now() + interval '24 hours'),
  cancelled_at timestamptz,
  data_erased_at timestamptz,
  completed_at timestamptz,
  processed_by text,
  erasure_summary jsonb not null default '{}'::jsonb,
  check (cancel_window_ends_at >= requested_at)
);

create unique index if not exists account_deletion_requests_one_open
  on public.account_deletion_requests (auth_user_id)
  where status in ('requested','data_erased');

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from public, anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
drop policy if exists account_deletion_requests_own_read on public.account_deletion_requests;
create policy account_deletion_requests_own_read on public.account_deletion_requests
  for select to authenticated using (auth_user_id = auth.uid());

create or replace function public.account_request_deletion(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETION_REQUIRES_SIGNED_IN_READER';
  end if;
  if p_confirmation is distinct from 'DELETE MY ACCOUNT' then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETION_CONFIRMATION_REQUIRED';
  end if;
  if exists (
    select 1 from public.staff_profiles sp
    where sp.auth_user_id = v_uid and lower(coalesce(sp.status, '')) <> 'revoked'
  ) then
    raise exception using errcode = '42501', message = 'STAFF_ACCOUNT_REQUIRES_NEWSROOM_OFFBOARDING';
  end if;

  select * into v_request from public.account_deletion_requests
  where auth_user_id = v_uid and status in ('requested','data_erased')
  for update;
  if not found then
    insert into public.account_deletion_requests (auth_user_id)
    values (v_uid)
    returning * into v_request;
  end if;

  return jsonb_build_object(
    'requestId', v_request.id,
    'status', v_request.status,
    'requestedAt', v_request.requested_at,
    'cancelWindowEndsAt', v_request.cancel_window_ends_at
  );
end;
$$;

create or replace function public.account_cancel_deletion_request()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'ACCOUNT_DELETION_REQUIRES_SIGNED_IN_READER';
  end if;
  select * into v_request from public.account_deletion_requests
  where auth_user_id = v_uid and status = 'requested'
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'NO_CANCELLABLE_DELETION_REQUEST';
  end if;
  if now() >= v_request.cancel_window_ends_at then
    raise exception using errcode = '55000', message = 'DELETION_CANCEL_WINDOW_CLOSED';
  end if;
  update public.account_deletion_requests
  set status = 'cancelled', cancelled_at = now()
  where id = v_request.id
  returning * into v_request;
  return jsonb_build_object('requestId', v_request.id, 'status', v_request.status);
end;
$$;

create or replace function public.account_deletion_request_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_build_object(
      'requestId', r.id, 'status', r.status, 'requestedAt', r.requested_at,
      'cancelWindowEndsAt', r.cancel_window_ends_at, 'completedAt', r.completed_at)
    from public.account_deletion_requests r
    where r.auth_user_id = auth.uid()
    order by r.requested_at desc
    limit 1
  ), jsonb_build_object('status', 'none'));
$$;

create or replace function public.account_deletion_process(p_request_id uuid, p_processed_by text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.account_deletion_requests%rowtype;
  v_uid uuid;
  v_pseudonym uuid := gen_random_uuid();
  v_subscriber_ids uuid[];
  v_profile_ids uuid[];
  v_push int := 0;
  v_subscribers int := 0;
  v_entitlements int := 0;
  v_payments int := 0;
  v_profiles int := 0;
  v_comments int := 0;
  v_revisions int := 0;
  v_contacts int := 0;
  v_summary jsonb;
begin
  if coalesce(trim(p_processed_by), '') = '' then
    raise exception using errcode = '22023', message = 'ACCOUNT_DELETION_PROCESSOR_REQUIRED';
  end if;
  select * into v_request from public.account_deletion_requests where id = p_request_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'DELETION_REQUEST_NOT_FOUND';
  end if;
  if v_request.status <> 'requested' then
    raise exception using errcode = '55000', message = 'DELETION_REQUEST_NOT_PROCESSABLE';
  end if;
  if now() < v_request.cancel_window_ends_at then
    raise exception using errcode = '55000', message = 'DELETION_CANCEL_WINDOW_OPEN';
  end if;
  v_uid := v_request.auth_user_id;
  if exists (
    select 1 from public.staff_profiles sp
    where sp.auth_user_id = v_uid and lower(coalesce(sp.status, '')) <> 'revoked'
  ) then
    update public.account_deletion_requests set status = 'rejected', processed_by = p_processed_by where id = v_request.id;
    return jsonb_build_object('requestId', v_request.id, 'status', 'rejected', 'reason', 'STAFF_ACCOUNT_REQUIRES_NEWSROOM_OFFBOARDING');
  end if;

  -- Push devices: erased (they would also cascade with the Auth identity).
  delete from public.reader_push_devices where reader_user_id = v_uid;
  get diagnostics v_push = row_count;

  -- Subscriber: anonymised, never deleted (payment records reference it ON DELETE RESTRICT).
  select coalesce(array_agg(id), '{}') into v_subscriber_ids from public.subscribers where auth_user_id = v_uid;
  if cardinality(v_subscriber_ids) > 0 then
    select count(*) into v_contacts
    from public.contact_profiles cp
    where lower(cp.email) in (select lower(s.email) from public.subscribers s where s.id = any(v_subscriber_ids));

    update public.premium_entitlements
    set ends_at = least(coalesce(ends_at, now()), now())
    where subscriber_id = any(v_subscriber_ids);
    get diagnostics v_entitlements = row_count;

    select count(*) into v_payments from public.payment_transactions where subscriber_id = any(v_subscriber_ids);

    update public.subscribers
    set auth_user_id = null,
        email = 'deleted+' || id::text || '@account-deleted.invalid',
        display_name = null,
        status = 'deleted'
    where id = any(v_subscriber_ids);
    get diagnostics v_subscribers = row_count;
  end if;

  -- Discussion: profile anonymised under an unlinkable pseudonym; comment text removed.
  select coalesce(array_agg(id), '{}') into v_profile_ids from public.reader_comment_profiles where auth_user_id = v_uid;
  if cardinality(v_profile_ids) > 0 then
    update public.story_comments
    set body = '[removed at account deletion]',
        state = 'REMOVED',
        removed_by_author_at = coalesce(removed_by_author_at, now()),
        updated_at = now()
    where author_profile_id = any(v_profile_ids);
    get diagnostics v_comments = row_count;

    update public.reader_comment_profiles
    set auth_user_id = v_pseudonym, display_name = 'Former reader', state = 'disabled', updated_at = now()
    where id = any(v_profile_ids);
    get diagnostics v_profiles = row_count;
  end if;

  update public.story_comment_revisions
  set actor_auth_user_id = v_pseudonym, previous_body = '[removed at account deletion]'
  where actor_auth_user_id = v_uid;
  get diagnostics v_revisions = row_count;

  v_summary := jsonb_build_object(
    'pushDevicesDeleted', v_push,
    'subscribersAnonymised', v_subscribers,
    'entitlementsEnded', v_entitlements,
    'paymentRecordsRetained', v_payments,
    'commentProfilesAnonymised', v_profiles,
    'commentsRemoved', v_comments,
    'commentRevisionsScrubbed', v_revisions,
    'communicationContactsForManualReview', v_contacts
  );

  update public.account_deletion_requests
  set status = 'data_erased', data_erased_at = now(), processed_by = p_processed_by, erasure_summary = v_summary
  where id = v_request.id;

  return jsonb_build_object('requestId', v_request.id, 'status', 'data_erased',
    'nextStep', 'DELETE_AUTH_IDENTITY_VIA_ADMIN_API', 'authUserId', v_uid, 'summary', v_summary);
end;
$$;

create or replace function public.account_deletion_mark_identity_deleted(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.account_deletion_requests%rowtype;
begin
  select * into v_request from public.account_deletion_requests where id = p_request_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'DELETION_REQUEST_NOT_FOUND';
  end if;
  if v_request.status <> 'data_erased' then
    raise exception using errcode = '55000', message = 'DELETION_DATA_NOT_ERASED';
  end if;
  if exists (select 1 from auth.users u where u.id = v_request.auth_user_id) then
    raise exception using errcode = '55000', message = 'AUTH_IDENTITY_STILL_PRESENT';
  end if;
  update public.account_deletion_requests
  set status = 'completed', completed_at = now()
  where id = v_request.id
  returning * into v_request;
  return jsonb_build_object('requestId', v_request.id, 'status', v_request.status, 'completedAt', v_request.completed_at);
end;
$$;

revoke all on function public.account_request_deletion(text) from public, anon;
revoke all on function public.account_cancel_deletion_request() from public, anon;
revoke all on function public.account_deletion_request_status() from public, anon;
revoke all on function public.account_deletion_process(uuid, text) from public, anon, authenticated;
revoke all on function public.account_deletion_mark_identity_deleted(uuid) from public, anon, authenticated;
grant execute on function public.account_request_deletion(text) to authenticated;
grant execute on function public.account_cancel_deletion_request() to authenticated;
grant execute on function public.account_deletion_request_status() to authenticated;
grant execute on function public.account_deletion_process(uuid, text) to service_role;
grant execute on function public.account_deletion_mark_identity_deleted(uuid) to service_role;

commit;
