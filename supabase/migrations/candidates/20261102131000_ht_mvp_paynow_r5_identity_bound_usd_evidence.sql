-- HT-MVP-PAYNOW-USD-01-R5-ICR-ENDGAME-LR01
-- UNDEPLOYED: apply only after R3 LIVE candidate in disposable PostgreSQL.
-- Three independent signed-in identities are required: source authenticator,
-- Security reviewer, Finance reviewer; separately enrolled from capture.
-- Valid signed-in identity alone cannot prove the Paynow merchant is genuinely USD:
-- a SOURCE reviewer must consult the real controlled provider console/out-of-band
-- merchant evidence; without that external fact LIVE approval is BLOCKED.
create table public.payment_live_usd_review_assignments(
 user_id uuid primary key,
 duty text not null check(duty in ('CAPTURE','SOURCE','SECURITY','FINANCE')),
 active boolean not null default true
);
create table public.payment_live_usd_evidence_objects(
 id uuid primary key default gen_random_uuid(),
 attestation_id uuid not null unique references public.payment_live_usd_attestations(id),
 provider_reference text not null,
 provider_evidence_reference text not null,
 protected_document bytea not null check(octet_length(protected_document) between 32 and 1048576),
 sha256 text generated always as (encode(sha256(protected_document),'hex')) stored,
 captured_by uuid not null references public.payment_live_usd_review_assignments(user_id),
 captured_at timestamptz not null default now()
);
create table public.payment_live_usd_evidence_approvals(
 evidence_id uuid not null references public.payment_live_usd_evidence_objects(id),
 role text not null check(role in ('SOURCE','SECURITY','FINANCE')),
 actor_id uuid not null references public.payment_live_usd_review_assignments(user_id),
 document_sha256 text not null check(document_sha256 ~ '^[a-f0-9]{64}$'),
 approved_at timestamptz not null default now(),
 primary key(evidence_id,role),
 unique(evidence_id,actor_id)
);
alter table public.payment_live_usd_review_assignments enable row level security;
alter table public.payment_live_usd_evidence_objects enable row level security;
alter table public.payment_live_usd_evidence_approvals enable row level security;
revoke all on public.payment_live_usd_review_assignments,public.payment_live_usd_evidence_objects,
 public.payment_live_usd_evidence_approvals from public,anon,authenticated,service_role;
create or replace function public.payment_live_usd_evidence_no_mutations()
returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception using errcode='23514',message='USD_EVIDENCE_APPEND_ONLY'; end $$;
create trigger r5_doc_immutable before update or delete
 on public.payment_live_usd_evidence_objects
 for each row execute function public.payment_live_usd_evidence_no_mutations();
create trigger r5_approval_immutable before update or delete
 on public.payment_live_usd_evidence_approvals
 for each row execute function public.payment_live_usd_evidence_no_mutations();
-- Owner-managed reviewer assignment has no public API. Changes require
-- independent governance and database custody; never let authenticated users
-- enroll themselves as reviewers through an exposed function.

create or replace function public.payment_live_usd_capture_evidence(
 p_attestation_id uuid,p_document bytea
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_att public.payment_live_usd_attestations%rowtype; v_id uuid;
begin
 if v_actor is null or not exists(
  select 1 from public.payment_live_usd_review_assignments
  where user_id=v_actor and duty='CAPTURE' and active
 ) then raise exception using errcode='42501',message='EVIDENCE_CAPTURE_AUTHORITY_REQUIRED'; end if;
 select * into v_att from public.payment_live_usd_attestations where id=p_attestation_id;
 if v_att.id is null or p_document is null or
    octet_length(p_document) not between 32 and 1048576 or
    encode(sha256(p_document),'hex')<>v_att.provider_evidence_sha256 then
   raise exception using errcode='23514',message='EVIDENCE_DOCUMENT_HASH_MISMATCH';
 end if;
 insert into public.payment_live_usd_evidence_objects(
  attestation_id,provider_reference,provider_evidence_reference,protected_document,captured_by
 ) values(v_att.id,v_att.provider_reference,v_att.provider_evidence_reference,p_document,v_actor)
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.payment_live_usd_get_evidence(
 p_evidence_id uuid
) returns bytea language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_data bytea;
begin
 if v_actor is null or not exists(
  select 1 from public.payment_live_usd_review_assignments
  where user_id=v_actor and active and duty in ('SOURCE','SECURITY','FINANCE')
 ) then raise exception using errcode='42501',message='EVIDENCE_REVIEW_AUTHORITY_REQUIRED'; end if;
 select protected_document into v_data from public.payment_live_usd_evidence_objects where id=p_evidence_id;
 if v_data is null then raise exception using errcode='22023',message='EVIDENCE_NOT_FOUND'; end if;
 return v_data;
end $$;

create or replace function public.payment_live_usd_approve_evidence(
 p_evidence_id uuid,p_role text,p_document_sha256 text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_object public.payment_live_usd_evidence_objects%rowtype;
begin
 if v_actor is null or p_role not in ('SOURCE','SECURITY','FINANCE') or
    not exists(select 1 from public.payment_live_usd_review_assignments
       where user_id=v_actor and duty=p_role and active) then
    raise exception using errcode='42501',message='INDEPENDENT_REVIEWER_AUTHORITY_REQUIRED';
 end if;
 select * into v_object from public.payment_live_usd_evidence_objects
   where id=p_evidence_id for share;
 if v_object.id is null or v_object.sha256 is distinct from p_document_sha256 then
   raise exception using errcode='23514',message='REVIEWER_DOCUMENT_HASH_MISMATCH';
 end if;
 if v_actor=v_object.captured_by then
   raise exception using errcode='42501',message='CAPTURE_SELF_APPROVAL_FORBIDDEN'; end if;
 insert into public.payment_live_usd_evidence_approvals(evidence_id,role,actor_id,document_sha256)
 values(p_evidence_id,p_role,v_actor,p_document_sha256);
 return jsonb_build_object('accepted',true,'reviewer',v_actor,'role',p_role);
end $$;

revoke all on function public.payment_live_usd_capture_evidence(uuid,bytea) from public,anon,service_role;
revoke all on function public.payment_live_usd_get_evidence(uuid) from public,anon,service_role;
revoke all on function public.payment_live_usd_approve_evidence(uuid,text,text) from public,anon,service_role;
grant execute on function public.payment_live_usd_capture_evidence(uuid,bytea) to authenticated;
grant execute on function public.payment_live_usd_get_evidence(uuid) to authenticated;
grant execute on function public.payment_live_usd_approve_evidence(uuid,text,text) to authenticated;

-- Replace R3 LIVE RPC with the *same* cryptographic/poll and ledger contract,
-- plus mandatory R5 externally authenticated source proof and reviewer checks.

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
  -- R5 insists on actual protected document bytes and two distinct JWT-bound
  -- reviewers plus a separate provider source verifier. Manually typed reviewer
  -- names and arbitrary 64-character hashes in the R3 attestation are NOT proof.
  if not exists (
    select 1 from public.payment_live_usd_evidence_objects e
    where e.attestation_id=v_proof.id
      and e.sha256= v_proof.provider_evidence_sha256
      and e.provider_evidence_reference=v_proof.provider_evidence_reference
      and e.provider_reference=v_proof.provider_reference
      and exists (
        select 1 from public.payment_live_usd_evidence_approvals src
        where src.evidence_id=e.id and src.role='SOURCE'
          and src.actor_id <> e.captured_by
      )
      and exists (
        select 1 from public.payment_live_usd_evidence_approvals sec
        where sec.evidence_id=e.id and sec.role='SECURITY'
          and sec.actor_id <> e.captured_by
      )
      and exists (
        select 1 from public.payment_live_usd_evidence_approvals fin
        where fin.evidence_id=e.id and fin.role='FINANCE'
          and fin.actor_id <> e.captured_by
      )
  ) then
    return jsonb_build_object('accepted',false,
      'code','AUTHENTICATED_EVIDENCE_AND_DUAL_REVIEW_REQUIRED');
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
