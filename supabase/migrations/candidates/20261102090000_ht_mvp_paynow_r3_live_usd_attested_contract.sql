-- HT-MVP-PAYNOW-USD-01-R3-ICR-LR01
-- LIVE USD monetary authority CONTRACT CANDIDATE: DISPOSABLE DATABASE ONLY.
-- NEVER deploy to Staging/Production or invoke LIVE without separate Owner +
-- independent Security and Finance authorization and merchant-specific evidence.
-- Paynow's standard signed callback/poll may NOT include currency.
-- Status signature+poll parity is necessary, not sufficient, for USD receipt.

create table if not exists public.payment_live_usd_attestations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.payment_transactions(id) on delete restrict,
  merchant_reference text not null unique,
  provider_reference text not null unique,
  integration_id text not null check (integration_id ~ '^[0-9]{1,30}$'),
  amount numeric(18,2) not null check (amount > 0),
  charge_currency text not null check (charge_currency = 'USD'),
  settlement_currency text not null check (settlement_currency = 'USD'),
  provider_evidence_source text not null check (provider_evidence_source in
    ('PAYNOW_PROVIDER_STATEMENT','PAYNOW_VERIFIED_PROVIDER_API','PAYNOW_SIGNED_USD_RECEIPT')),
  provider_evidence_sha256 text not null check (provider_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  provider_evidence_reference text not null check (length(provider_evidence_reference) between 8 and 128),
  security_reviewer text not null check (length(trim(security_reviewer)) >= 3),
  finance_reviewer text not null check (length(trim(finance_reviewer)) >= 3),
  security_approved_at timestamptz not null,
  finance_approved_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (security_reviewer <> finance_reviewer)
);

-- Attestations are created only by an independently authorized Finance/DB
-- custody procedure; NEVER by application service_role or public clients.
alter table public.payment_live_usd_attestations enable row level security;
revoke all on table public.payment_live_usd_attestations from public, anon, authenticated, service_role;

create or replace function public.payment_live_usd_attestation_immutable()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  raise exception using errcode='23514', message='LIVE_USD_ATTESTATION_IMMUTABLE';
end $$;
drop trigger if exists trg_payment_live_usd_attestation_immutable on public.payment_live_usd_attestations;
create trigger trg_payment_live_usd_attestation_immutable
  before update or delete on public.payment_live_usd_attestations
  for each row execute function public.payment_live_usd_attestation_immutable();

-- Do not weaken old authorities; add a DISTINCT LIVE proof class.
alter table public.payment_transactions
  drop constraint if exists payment_transactions_verification_authority_check;
alter table public.payment_transactions
  add constraint payment_transactions_verification_authority_check
  check (verification_authority in (
    'NO_VERIFICATION_AUTHORITY','TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION',
    'PAYNOW_TEST_SHA512_VERIFIED','PAYNOW_LIVE_USD_ATTESTED'));

alter table public.provider_webhook_events
  drop constraint if exists provider_webhook_events_verification_authority_check;
alter table public.provider_webhook_events
  add constraint provider_webhook_events_verification_authority_check
  check (verification_authority in (
    'NO_VERIFICATION_AUTHORITY','TEST_ONLY_SYNTHETIC_PROVIDER_VERIFICATION',
    'PAYNOW_TEST_SHA512_VERIFIED','PAYNOW_LIVE_USD_ATTESTED'));

create or replace function public.payment_record_paynow_live_status(
 p_merchant_reference text, p_provider_reference text, p_amount numeric,
 p_currency text, p_provider_status text, p_poll_url text,
 p_event_id text, p_payload_hash text, p_metadata jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
 v_tx public.payment_transactions%rowtype;
 v_proof public.payment_live_usd_attestations%rowtype;
 v_event uuid;
begin
  -- Server verifies cryptographic Paynow status and a separate fresh poll
  -- before invoking this privileged function. No source-supplied "USD" claim
  -- can substitute for the separate, independently approved provider record.
  if p_event_id is null or p_event_id !~ '^[0-9a-f]{64}$'
     or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
     or coalesce(p_provider_reference,'') = ''
     or coalesce(p_poll_url,'') = ''
     or coalesce(p_metadata->>'signature_verified','') <> 'true'
     or coalesce(p_metadata->>'poll_confirmed','') <> 'true'
     or coalesce(p_metadata->>'provider_mode','') <> 'LIVE' then
    return jsonb_build_object('accepted',false,'code','LIVE_CRYPTO_POLL_AUTHORITY_REQUIRED');
  end if;

  if lower(coalesce(p_provider_status,'')) <> 'paid' then
    -- No optimistic cancellation, refund, reversal or disputed payout.
    -- A real provider refund requires independent reversal evidence and
    -- entitlement-revocation policy; do not modify paid ledger here.
    return jsonb_build_object('accepted',false,'code','LIVE_NON_PAYMENT_STATUS_REQUIRES_REVIEW');
  end if;
  if p_currency is not null and p_currency <> 'USD' then
    return jsonb_build_object('accepted',false,'code','LIVE_SIGNED_NON_USD_CURRENCY');
  end if;

  select * into v_tx from public.payment_transactions
   where merchant_reference=p_merchant_reference and provider='paynow' for update;
  if v_tx.id is null then return jsonb_build_object('accepted',false,'code','UNKNOWN_REFERENCE'); end if;
  if v_tx.purpose='PROVIDER_CONNECTIVITY_TEST' or v_tx.currency <> 'USD' or
     v_tx.internal_status not in ('PROVIDER_INITIATED','PAYMENT_VERIFIED','RECONCILED') or
     v_tx.verification_authority not in ('NO_VERIFICATION_AUTHORITY','PAYNOW_LIVE_USD_ATTESTED') or
     p_amount is distinct from v_tx.expected_amount or
     v_tx.poll_url is distinct from p_poll_url or
     (v_tx.provider_reference is not null and v_tx.provider_reference <> p_provider_reference) then
    return jsonb_build_object('accepted',false,'code','LIVE_LEDGER_AMOUNT_REFERENCE_STATE_MISMATCH');
  end if;

  select * into v_proof from public.payment_live_usd_attestations
    where transaction_id=v_tx.id and merchant_reference=v_tx.merchant_reference and
      provider_reference=p_provider_reference and amount=p_amount and
      charge_currency='USD' and settlement_currency='USD'
    for share;
  if v_proof.id is null then
    return jsonb_build_object('accepted',false,'code','INDEPENDENT_PROVIDER_USD_ATTESTATION_REQUIRED');
  end if;
  if coalesce(p_metadata->>'integration_id','') <> v_proof.integration_id then
    return jsonb_build_object('accepted',false,'code','LIVE_INTEGRATION_EVIDENCE_MISMATCH');
  end if;

  insert into public.provider_webhook_events (
    provider, provider_event_id, event_type, signature_valid, payload_hash,
    payload, status, transaction_id, merchant_reference, provider_reference,
    reported_amount, reported_currency, verification_authority, sanitized_metadata,
    processed_at
  ) values (
    'paynow',p_event_id,p_provider_status,true,p_payload_hash,
    jsonb_build_object('source','paynow_live_signed_callback_poll'), 'processed',v_tx.id,
    p_merchant_reference,p_provider_reference,p_amount,p_currency,'PAYNOW_LIVE_USD_ATTESTED',
    jsonb_build_object(
      'currency_source','PROVIDER_USD_ATTESTATION',
      'attestation_id',v_proof.id,
      'provider_evidence_sha256',v_proof.provider_evidence_sha256,
      'provider_evidence_source',v_proof.provider_evidence_source,
      'signed_currency_present',p_currency is not null,
      'poll_confirmed',true, 'provider_mode','LIVE',
      'merchant_settlement_evidence','USD_ATTESTED_PENDING_BANK_SETTLEMENT'
    ),now()
  ) on conflict(provider,provider_event_id) do nothing returning id into v_event;
  if v_event is null then
    return jsonb_build_object('accepted',true,'duplicate',true,'transaction_id',v_tx.id,
      'purpose',v_tx.purpose,'internal_status',v_tx.internal_status,
      'attestation_id',v_proof.id);
  end if;

  update public.payment_transactions set
    internal_status=case when v_tx.internal_status='RECONCILED' then 'RECONCILED' else 'PAYMENT_VERIFIED' end,
    provider_status='Paid', provider_reference=p_provider_reference,
    reported_amount=p_amount, verification_authority='PAYNOW_LIVE_USD_ATTESTED',
    provider_metadata=provider_metadata || jsonb_build_object(
      'currency_source','PROVIDER_USD_ATTESTATION',
      'attestation_id',v_proof.id,'signed_currency_present',p_currency is not null,
      'provider_receipt_verified',true,'bank_settlement_confirmed',false),
    confirmed_at=coalesce(confirmed_at,now()),updated_at=now()
    where id=v_tx.id;

  return jsonb_build_object('accepted',true,'duplicate',false,'transaction_id',v_tx.id,
    'purpose',v_tx.purpose,
    'internal_status',case when v_tx.internal_status='RECONCILED' then 'RECONCILED' else 'PAYMENT_VERIFIED' end,
    'attestation_id',v_proof.id,'bank_settled',false);
end $$;

revoke all on function public.payment_record_paynow_live_status(text,text,numeric,text,text,text,text,text,jsonb)
 from public,anon,authenticated;
grant execute on function public.payment_record_paynow_live_status(text,text,numeric,text,text,text,text,text,jsonb)
 to service_role;
