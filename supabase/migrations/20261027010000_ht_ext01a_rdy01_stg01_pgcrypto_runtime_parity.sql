-- =============================================================================
-- Migration: 20261027010000_ht_ext01a_rdy01_stg01_pgcrypto_runtime_parity.sql
-- Unit: HT-MVP-EXT-01A-RDY-01-STG01-R1 — Supabase pgcrypto Runtime Parity
-- Programme: HealthTimes External Revenue & Communications Activation
-- Disposition: Remediate payment_generate_ulid to qualify extensions.gen_random_bytes(16)
--              while preserving SECURITY DEFINER, SET search_path = public,
--              ULID format, zero-PII merchant reference format, and service_role bounds.
-- =============================================================================

create or replace function public.payment_generate_ulid(p_timestamp timestamptz default clock_timestamp())
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_time_ms bigint := floor(extract(epoch from p_timestamp) * 1000)::bigint;
  v_time_part text := '';
  v_rand_part text := '';
  v_rem int;
  v_i int;
  v_bytes bytea := extensions.gen_random_bytes(16);
begin
  -- 10-character Crockford Base32 timestamp component (48-bit ms)
  for v_i in 1..10 loop
    v_rem := (v_time_ms % 32)::int;
    v_time_part := substr(v_alphabet, v_rem + 1, 1) || v_time_part;
    v_time_ms := v_time_ms / 32;
  end loop;

  -- 16-character Crockford Base32 randomness component
  for v_i in 0..15 loop
    v_rem := get_byte(v_bytes, v_i) % 32;
    v_rand_part := v_rand_part || substr(v_alphabet, v_rem + 1, 1);
  end loop;

  return v_time_part || v_rand_part;
end $$;

revoke all on function public.payment_generate_ulid(timestamptz) from public, anon, authenticated;
grant execute on function public.payment_generate_ulid(timestamptz) to service_role;
