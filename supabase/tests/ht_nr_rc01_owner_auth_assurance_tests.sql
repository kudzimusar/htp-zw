-- ============================================================================
-- Test Suite: ht_nr_rc01_owner_auth_assurance_tests.sql
-- Programme: HealthTimes Newsroom OS (HT-MVP-RC-01)
-- Description: Verifies the physical First-Owner security states under Migration 96:
--              1. Anonymous invocation fails closed (42501)
--              2. Wrong authenticated email fails closed (42501)
--              3. Unconfirmed Owner identity fails closed (42501)
--              4. Confirmed exact Owner identity activates Publisher / Owner
--              5. Subsequent bootstrap attempt by unauthorized actor fails closed
--              6. Subsequent bootstrap by Owner returns idempotent success
-- ============================================================================

begin;

create temp table if not exists _t_rc01_results (
  step int,
  name text,
  ok boolean,
  detail text
) on commit drop;

do $$
declare
  v_fake_user_id uuid := gen_random_uuid();
  v_fake_email text := 'attacker@malicious.invalid';
  v_owner_uid uuid := gen_random_uuid();
  v_res jsonb;
  v_err_caught boolean := false;
  v_err_msg text;
begin
  -- 1. Anonymous invocation must fail closed (42501)
  perform set_config('request.jwt.claims', '', true);
  v_err_caught := false;
  begin
    perform public.newsroom_bootstrap_owner();
  exception when others then
    v_err_caught := true;
    v_err_msg := SQLERRM;
  end;
  insert into _t_rc01_results values (
    1,
    'Anonymous invocation fails closed',
    v_err_caught and v_err_msg ilike '%Authenticated session required%',
    coalesce(v_err_msg, 'No error thrown')
  );

  -- 2. Wrong authenticated email must fail closed (42501)
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_fake_user_id,
    'email', v_fake_email,
    'role', 'authenticated'
  )::text, true);
  v_err_caught := false;
  begin
    perform public.newsroom_bootstrap_owner();
  exception when others then
    v_err_caught := true;
    v_err_msg := SQLERRM;
  end;
  insert into _t_rc01_results values (
    2,
    'Wrong authenticated email fails closed',
    v_err_caught and v_err_msg ilike '%strictly restricted to kudzimusar@gmail.com%',
    coalesce(v_err_msg, 'No error thrown')
  );

  -- 3. Unconfirmed identity must fail closed (42501)
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values (v_owner_uid, 'kudzimusar@gmail.com', '{}'::jsonb, null, now(), now());

  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_owner_uid,
    'email', 'kudzimusar@gmail.com',
    'role', 'authenticated'
  )::text, true);
  v_err_caught := false;
  begin
    perform public.newsroom_bootstrap_owner();
  exception when others then
    v_err_caught := true;
    v_err_msg := SQLERRM;
  end;
  insert into _t_rc01_results values (
    3,
    'Unconfirmed Owner identity fails closed',
    v_err_caught and v_err_msg ilike '%Email address is registered but has not been confirmed%',
    coalesce(v_err_msg, 'No error thrown')
  );

  -- 4. Confirmed exact Owner identity succeeds and activates Publisher / Owner
  update auth.users set email_confirmed_at = now() where id = v_owner_uid;

  v_err_caught := false;
  begin
    v_res := public.newsroom_bootstrap_owner();
  exception when others then
    v_err_caught := true;
    v_err_msg := SQLERRM;
  end;
  insert into _t_rc01_results values (
    4,
    'Confirmed exact Owner identity activates Publisher',
    (not v_err_caught) and ((v_res->>'success')::boolean = true) and (v_res->>'role' = 'Publisher / Owner'),
    coalesce(v_res::text, v_err_msg)
  );

  -- 5. Subsequent bootstrap attempt by attacker permanently disabled
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_fake_user_id,
    'email', v_fake_email,
    'role', 'authenticated'
  )::text, true);
  v_err_caught := false;
  begin
    perform public.newsroom_bootstrap_owner();
  exception when others then
    v_err_caught := true;
    v_err_msg := SQLERRM;
  end;
  insert into _t_rc01_results values (
    5,
    'Subsequent bootstrap by unauthorized actor permanently disabled',
    v_err_caught and v_err_msg ilike '%Active Publisher / Owner already provisioned%',
    coalesce(v_err_msg, 'No error thrown')
  );

  -- 6. Subsequent bootstrap by confirmed owner returns idempotent success
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_owner_uid,
    'email', 'kudzimusar@gmail.com',
    'role', 'authenticated'
  )::text, true);
  v_err_caught := false;
  begin
    v_res := public.newsroom_bootstrap_owner();
  exception when others then
    v_err_caught := true;
    v_err_msg := SQLERRM;
  end;
  insert into _t_rc01_results values (
    6,
    'Subsequent bootstrap by Owner returns idempotent success',
    (not v_err_caught) and ((v_res->>'success')::boolean = true) and ((v_res->>'already_provisioned')::boolean = true),
    coalesce(v_res::text, v_err_msg)
  );
end $$;

select step, name, ok, detail from _t_rc01_results order by step;

rollback;
