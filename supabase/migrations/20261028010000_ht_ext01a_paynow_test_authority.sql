-- Paynow TEST authority uses the accepted payment_transactions ledger.
-- Cryptographic verification runs in the trusted server before these service-role-only RPCs.

alter table public.payment_transactions
  drop constraint if exists payment_transactions_verification_authority_check;
alter table public.payment_transactions
  add constraint payment_transactions_verification_authority_check
  check (verification_authority in (
    'NO_VERIFICATION_AUTHORITY', 'TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION',
    'PAYNOW_TEST_SHA512_VERIFIED'
  ));

alter table public.provider_webhook_events
  drop constraint if exists provider_webhook_events_verification_authority_check;
alter table public.provider_webhook_events
  add constraint provider_webhook_events_verification_authority_check
  check (verification_authority in (
    'NO_VERIFICATION_AUTHORITY', 'TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION',
    'PAYNOW_TEST_SHA512_VERIFIED'
  ));

create or replace function public.payment_claim_paynow_initiation(p_merchant_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tx public.payment_transactions%rowtype;
begin
  select * into v_tx from public.payment_transactions
    where merchant_reference = p_merchant_reference and provider = 'paynow' for update;
  if v_tx.id is null then raise exception using errcode = 'P0002', message = 'Payment intent not found'; end if;
  if v_tx.internal_status = 'PROVIDER_PENDING' and v_tx.initiated_at < now() - interval '5 minutes' then
    update public.payment_transactions set internal_status = 'CREATED', updated_at = now() where id = v_tx.id;
    v_tx.internal_status := 'CREATED';
  end if;
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

create or replace function public.payment_get_paynow_poll_target(p_merchant_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tx public.payment_transactions%rowtype;
begin
  select * into v_tx from public.payment_transactions
    where merchant_reference = p_merchant_reference and provider = 'paynow';
  if v_tx.id is null or nullif(v_tx.poll_url, '') is null then
    raise exception using errcode = 'P0002', message = 'Paynow poll target not found';
  end if;
  return jsonb_build_object('transaction_id', v_tx.id, 'poll_url', v_tx.poll_url);
end $$;

create or replace function public.payment_get_paynow_transaction_status(p_merchant_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tx public.payment_transactions%rowtype;
begin
  select * into v_tx from public.payment_transactions
    where merchant_reference = p_merchant_reference and provider = 'paynow';
  if v_tx.id is null then raise exception using errcode = 'P0002', message = 'Payment not found'; end if;
  return jsonb_build_object(
    'merchant_reference', v_tx.merchant_reference,
    'purpose', v_tx.purpose,
    'provider_status', v_tx.provider_status,
    'internal_status', v_tx.internal_status,
    'reconciliation_status', v_tx.reconciliation_status,
    'accounting_status', v_tx.accounting_status,
    'payment_verified', v_tx.internal_status in ('PAYMENT_VERIFIED','RECONCILIATION_PENDING','RECONCILED'),
    'updated_at', v_tx.updated_at
  );
end $$;

create or replace function public.payment_record_paynow_initiation(
  p_merchant_reference text, p_poll_url text, p_browser_url text,
  p_provider_reference text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_tx public.payment_transactions%rowtype;
begin
  select * into v_tx from public.payment_transactions
    where merchant_reference = p_merchant_reference and provider = 'paynow' for update;
  if v_tx.id is null then raise exception using errcode = 'P0002', message = 'Payment intent not found'; end if;
  if v_tx.internal_status = 'PROVIDER_INITIATED' and v_tx.poll_url = p_poll_url then
    return jsonb_build_object('recorded', true, 'replayed', true, 'transaction_id', v_tx.id);
  end if;
  if v_tx.internal_status <> 'PROVIDER_PENDING' or nullif(p_poll_url, '') is null or
     nullif(p_browser_url, '') is null then
    raise exception using errcode = '22023', message = 'Paynow initiation state or URLs invalid';
  end if;
  update public.payment_transactions set internal_status = 'PROVIDER_INITIATED',
    provider_status = 'Ok', poll_url = p_poll_url,
    provider_reference = nullif(p_provider_reference, ''),
    provider_metadata = provider_metadata || jsonb_build_object('browser_url', p_browser_url,
      'currency_source', 'USD_ONLY_MERCHANT_INTEGRATION'), updated_at = now()
    where id = v_tx.id;
  perform public.payment_record_audit(null, 'system', 'payment.provider.initiated',
    'server_intent', v_tx.id, 'payment_transactions', v_tx.id::text,
    jsonb_build_object('internal_status', v_tx.internal_status),
    jsonb_build_object('internal_status', 'PROVIDER_INITIATED',
      'reconciliation_status', v_tx.reconciliation_status,
      'accounting_status', v_tx.accounting_status),
    'Verified Paynow TEST initiation response', p_provider_reference, '{}'::jsonb);
  return jsonb_build_object('recorded', true, 'replayed', false, 'transaction_id', v_tx.id);
end $$;

create or replace function public.payment_record_paynow_status(
  p_merchant_reference text, p_provider_reference text, p_amount numeric,
  p_currency text, p_provider_status text, p_poll_url text,
  p_event_id text, p_payload_hash text, p_metadata jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tx public.payment_transactions%rowtype;
  v_event uuid;
  v_new_status text;
  v_exception text;
begin
  if p_event_id !~ '^[0-9a-f]{64}$' or p_payload_hash !~ '^[0-9a-f]{64}$' or
     nullif(p_provider_reference, '') is null or nullif(p_poll_url, '') is null then
    raise exception using errcode = '22023', message = 'Paynow event identity invalid';
  end if;
  select * into v_tx from public.payment_transactions
    where merchant_reference = p_merchant_reference and provider = 'paynow' for update;
  if v_tx.id is null then
    perform public.payment_open_exception('UNKNOWN_REFERENCE', 'Paynow status has unknown reference',
      null, null, p_merchant_reference, p_provider_reference, '{}'::jsonb);
    return jsonb_build_object('accepted', false, 'code', 'UNKNOWN_REFERENCE');
  end if;
  insert into public.provider_webhook_events(
    provider, provider_event_id, event_type, signature_valid, payload_hash,
    payload, status, transaction_id, merchant_reference, provider_reference,
    reported_amount, reported_currency, verification_authority, sanitized_metadata,
    processed_at
  ) values (
    'paynow', p_event_id, p_provider_status, true, p_payload_hash,
    coalesce(p_metadata, '{}'::jsonb), 'received', v_tx.id, p_merchant_reference,
    p_provider_reference, p_amount, p_currency, 'PAYNOW_TEST_SHA512_VERIFIED',
    coalesce(p_metadata, '{}'::jsonb), now()
  ) on conflict (provider, provider_event_id) do nothing returning id into v_event;
  if v_event is null then
    return jsonb_build_object('accepted', true, 'duplicate', true,
      'transaction_id', v_tx.id, 'purpose', v_tx.purpose,
      'internal_status', v_tx.internal_status,
      'reconciliation_status', v_tx.reconciliation_status,
      'accounting_status', v_tx.accounting_status);
  end if;

  if v_tx.poll_url is not null and v_tx.poll_url <> p_poll_url then
    v_exception := 'RECONCILIATION_FAILED';
  elsif v_tx.provider_reference is not null and v_tx.provider_reference <> p_provider_reference then
    v_exception := 'RECONCILIATION_FAILED';
  elsif p_currency <> v_tx.currency then
    v_exception := 'CURRENCY_MISMATCH';
  elsif p_amount <> v_tx.expected_amount then
    v_exception := 'AMOUNT_MISMATCH';
  end if;
  if v_exception is not null then
    update public.provider_webhook_events set status = 'failed', error = v_exception where id = v_event;
    perform public.payment_open_exception(v_exception, 'Verified Paynow status conflicts with payment intent',
      v_tx.id, null, p_merchant_reference, p_provider_reference,
      jsonb_build_object('expected_amount', v_tx.expected_amount,
        'reported_amount', p_amount, 'expected_currency', v_tx.currency,
        'reported_currency', p_currency));
    return jsonb_build_object('accepted', false, 'code', v_exception,
      'transaction_id', v_tx.id, 'internal_status', v_tx.internal_status);
  end if;

  v_new_status := case lower(p_provider_status)
    when 'paid' then 'PAYMENT_VERIFIED'
    when 'awaiting delivery' then 'PAYMENT_VERIFIED'
    when 'delivered' then 'PAYMENT_VERIFIED'
    when 'created' then 'PROVIDER_PENDING'
    when 'sent' then 'PROVIDER_PENDING'
    when 'pending' then 'PROVIDER_PENDING'
    when 'cancelled' then 'CANCELLED'
    when 'failed' then 'FAILED'
    when 'error' then 'FAILED'
    when 'disputed' then 'DISPUTED'
    when 'refunded' then 'REFUNDED'
    else null end;
  if v_new_status is null then
    update public.provider_webhook_events set status = 'failed', error = 'UNKNOWN_STATUS' where id = v_event;
    perform public.payment_open_exception('RECONCILIATION_FAILED', 'Unknown Paynow status',
      v_tx.id, null, p_merchant_reference, p_provider_reference,
      jsonb_build_object('status', p_provider_status));
    return jsonb_build_object('accepted', false, 'code', 'UNKNOWN_STATUS', 'transaction_id', v_tx.id);
  end if;
  -- A later pending notification cannot undo a verified payment or reconciliation.
  if v_tx.internal_status in ('PAYMENT_VERIFIED', 'RECONCILIATION_PENDING', 'RECONCILED')
     and v_new_status = 'PROVIDER_PENDING' then v_new_status := v_tx.internal_status; end if;
  if v_tx.internal_status = 'RECONCILED' and v_new_status = 'PAYMENT_VERIFIED' then
    v_new_status := 'RECONCILED'; end if;
  update public.payment_transactions set
    internal_status = v_new_status, provider_status = p_provider_status,
    provider_reference = p_provider_reference, reported_amount = p_amount,
    poll_url = p_poll_url, verification_authority = 'PAYNOW_TEST_SHA512_VERIFIED',
    payment_channel = nullif(p_metadata->>'payment_channel', ''),
    provider_metadata = provider_metadata || jsonb_build_object(
      'currency_source', 'USD_ONLY_MERCHANT_INTEGRATION',
      'last_status_source', coalesce(p_metadata->>'source', 'paynow_verified_status')
    ),
    confirmed_at = case when v_new_status in ('PAYMENT_VERIFIED', 'RECONCILED')
      then coalesce(confirmed_at, now()) else confirmed_at end,
    updated_at = now()
    where id = v_tx.id;
  update public.provider_webhook_events set status = 'processed' where id = v_event;
  perform public.payment_record_audit(null, 'provider_webhook', 'payment.provider.status_verified',
    'provider_webhook', v_tx.id, 'payment_transactions', v_tx.id::text,
    jsonb_build_object('internal_status', v_tx.internal_status),
    jsonb_build_object('internal_status', v_new_status,
      'verification_authority', 'PAYNOW_TEST_SHA512_VERIFIED',
      'reconciliation_status', v_tx.reconciliation_status,
      'accounting_status', v_tx.accounting_status),
    'Paynow TEST SHA-512 verified and provider poll confirmed', p_provider_reference,
    jsonb_build_object('event_id', p_event_id));
  return jsonb_build_object('accepted', true, 'duplicate', false,
    'transaction_id', v_tx.id, 'purpose', v_tx.purpose,
    'internal_status', v_new_status,
    'reconciliation_status', v_tx.reconciliation_status,
    'accounting_status', v_tx.accounting_status);
end $$;

revoke all on function public.payment_claim_paynow_initiation(text) from public, anon, authenticated;
grant execute on function public.payment_claim_paynow_initiation(text) to service_role;
revoke all on function public.payment_release_paynow_initiation(text, text) from public, anon, authenticated;
grant execute on function public.payment_release_paynow_initiation(text, text) to service_role;
revoke all on function public.payment_record_paynow_initiation(text, text, text, text) from public, anon, authenticated;
grant execute on function public.payment_record_paynow_initiation(text, text, text, text) to service_role;
revoke all on function public.payment_record_paynow_status(text, text, numeric, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.payment_record_paynow_status(text, text, numeric, text, text, text, text, text, jsonb) to service_role;
revoke all on function public.payment_get_paynow_poll_target(text) from public, anon, authenticated;
grant execute on function public.payment_get_paynow_poll_target(text) to service_role;
revoke all on function public.payment_get_paynow_transaction_status(text) from public, anon, authenticated;
grant execute on function public.payment_get_paynow_transaction_status(text) to service_role;
