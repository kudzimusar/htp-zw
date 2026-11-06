-- HT-MVP-PAYNOW-USD-01-R1 — non-destructive TEST initiation recovery safety.
-- Parent authority: c6abb2f11aa3d0deffd1b512d795e5b2da8b306d
-- Does not mutate payment, provider, Premium or Finance rows.
-- No automatic five-minute replay after a possible provider acceptance.
-- Only service_role can invoke these existing privileged functions.
-- Manual merchanttrace recovery must be separately authorized and evidenced.

create or replace function public.payment_claim_paynow_initiation(p_merchant_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tx public.payment_transactions%rowtype;
begin
  select * into v_tx from public.payment_transactions
    where merchant_reference = p_merchant_reference and provider = 'paynow' for update;
  if v_tx.id is null then raise exception using errcode = 'P0002', message = 'Payment intent not found'; end if;
  -- PAYNOW-USD01: an expired initiation lease is NOT evidence that Paynow
  -- declined the request. Preserve PROVIDER_PENDING for trace-led recovery.
  if v_tx.internal_status <> 'CREATED' then
    return jsonb_build_object('claimed', false, 'transaction_id', v_tx.id,
      'merchant_reference', v_tx.merchant_reference, 'internal_status', v_tx.internal_status,
      'poll_url', v_tx.poll_url, 'browser_url', v_tx.provider_metadata->>'browser_url');
  end if;
  update public.payment_transactions set internal_status = 'PROVIDER_PENDING',
    initiated_at = now(), updated_at = now(),
    provider_metadata = provider_metadata || jsonb_build_object('merchant_trace', right(v_tx.merchant_reference, 26))
    where id = v_tx.id;
  perform public.payment_record_audit(null, 'system', 'payment.provider.claimed',
    'server_intent', v_tx.id, 'payment_transactions', v_tx.id::text,
    jsonb_build_object('internal_status', 'CREATED'),
    jsonb_build_object('internal_status', 'PROVIDER_PENDING'),
    'Claimed Paynow TEST initiation once', null, '{}'::jsonb);
  return jsonb_build_object('claimed', true, 'transaction_id', v_tx.id,
    'merchant_reference', v_tx.merchant_reference, 'expected_amount', v_tx.expected_amount,
    'currency', v_tx.currency, 'purpose', v_tx.purpose, 'merchant_trace', right(v_tx.merchant_reference, 26));
end $$;

create or replace function public.payment_release_paynow_initiation(
  p_merchant_reference text, p_failure_code text
)
returns void language plpgsql security definer set search_path = public as $$
declare v_tx public.payment_transactions%rowtype;
begin
  -- Only a cryptographically verified Paynow rejection is a definitive
  -- non-transaction. Network errors, timeouts and malformed replies must
  -- never reopen the original merchant reference for another initiation.
  if p_failure_code is distinct from 'PAYNOW_INITIATION_REJECTED' then
    raise exception using errcode = '22023', message = 'PAYNOW_AMBIGUOUS_INITIATION_CANNOT_RELEASE';
  end if;
  select * into v_tx from public.payment_transactions
    where merchant_reference = p_merchant_reference and provider = 'paynow' for update;
  if v_tx.id is null or v_tx.internal_status <> 'PROVIDER_PENDING' then return; end if;
  update public.payment_transactions set internal_status = 'CREATED', initiated_at = null,
    updated_at = now(), provider_metadata = provider_metadata ||
      jsonb_build_object('last_initiation_failure', left(coalesce(p_failure_code, 'UNKNOWN'), 80))
    where id = v_tx.id;
  perform public.payment_record_audit(null, 'system', 'payment.provider.initiation_released',
    'server_intent', v_tx.id, 'payment_transactions', v_tx.id::text,
    jsonb_build_object('internal_status', 'PROVIDER_PENDING'),
    jsonb_build_object('internal_status', 'CREATED'),
    'Released failed Paynow initiation for a safe retry', null,
    jsonb_build_object('failure_code', left(coalesce(p_failure_code, 'UNKNOWN'), 80)));
end $$;


-- Reassert the existing service-only grants on function replacement.
revoke all on function public.payment_claim_paynow_initiation(text) from public, anon, authenticated;
grant execute on function public.payment_claim_paynow_initiation(text) to service_role;
revoke all on function public.payment_release_paynow_initiation(text, text) from public, anon, authenticated;
grant execute on function public.payment_release_paynow_initiation(text, text) to service_role;
