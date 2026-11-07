-- HT-MVP-PAYNOW-USD-01-R5-ICR-ENDGAME-LR01
-- Atomic shared rate authority; CANDIDATE ONLY, run in disposable database.
-- Not Staging or Production approved. Once deployed and a private HMAC key is
-- installed server-side, payment API fail-closed rate control becomes operable.
create table if not exists public.payment_rate_windows (
 bucket_hash text primary key check (bucket_hash ~ '^[0-9a-f]{64}$'),
 window_started_at timestamptz not null,
 attempts integer not null check (attempts >= 1),
 last_seen_at timestamptz not null default clock_timestamp()
);
alter table public.payment_rate_windows enable row level security;
revoke all on table public.payment_rate_windows from public, anon, authenticated, service_role;
create or replace function public.payment_rate_limit_take(
 p_bucket_hash text, p_limit integer, p_window_seconds integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_started timestamptz;
 v_attempts integer;
 v_now timestamptz := clock_timestamp();
 v_wait integer;
begin
 if p_bucket_hash is null or p_bucket_hash !~ '^[0-9a-f]{64}$' or
    p_limit not between 1 and 500 or p_window_seconds not between 10 and 3600 then
   raise exception using errcode='22023', message='RATE_POLICY_INVALID';
 end if;
 -- INSERT ... ON CONFLICT obtains a PostgreSQL row lock across instances,
 -- even across independent PostgREST pools and serverless cold starts.
 insert into public.payment_rate_windows(bucket_hash,window_started_at,attempts,last_seen_at)
 values(p_bucket_hash,v_now,1,v_now)
 on conflict(bucket_hash) do update set
   attempts = case when public.payment_rate_windows.window_started_at +
      make_interval(secs=>p_window_seconds) <= excluded.last_seen_at
      then 1 else public.payment_rate_windows.attempts+1 end,
   window_started_at = case when public.payment_rate_windows.window_started_at +
      make_interval(secs=>p_window_seconds) <= excluded.last_seen_at
      then excluded.last_seen_at else public.payment_rate_windows.window_started_at end,
   last_seen_at = excluded.last_seen_at
 returning window_started_at,attempts into v_started,v_attempts;
 v_wait=greatest(0,ceil(extract(epoch from
   (v_started+make_interval(secs=>p_window_seconds)-v_now)))::integer);
 return jsonb_build_object('allowed',v_attempts<=p_limit,
   'retry_after_seconds',case when v_attempts>p_limit then v_wait else 0 end);
end $$;
revoke all on function public.payment_rate_limit_take(text,integer,integer)
 from public,anon,authenticated;
grant execute on function public.payment_rate_limit_take(text,integer,integer)
 to service_role;
-- Operators must clean expired buckets in a separate approved maintenance job;
-- never let anonymous clients enumerate or reset abuse history.
