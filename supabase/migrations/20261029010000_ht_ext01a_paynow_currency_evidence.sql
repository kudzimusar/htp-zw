-- The Paynow status protocol does not guarantee a currency field. Service
-- adapters must provide currency from a verified signed provider message;
-- integration configuration alone is not proof of transaction currency.
create or replace function public.payment_require_paynow_currency_evidence()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.provider = 'paynow' and new.verification_authority = 'PAYNOW_TEST_SHA512_VERIFIED'
     and new.signature_valid is true and
     (new.reported_currency is null or new.reported_currency !~ '^[A-Z]{3}$' or
      coalesce(new.sanitized_metadata->>'currency_source', '') <> 'SIGNED_PROVIDER_FIELD') then
    raise exception using errcode = '23514', message = 'PAYNOW_CURRENCY_UNVERIFIED';
  end if;
  return new;
end $$;

drop trigger if exists trg_paynow_currency_evidence on public.provider_webhook_events;
create trigger trg_paynow_currency_evidence before insert on public.provider_webhook_events
  for each row execute function public.payment_require_paynow_currency_evidence();

-- Correct only the connectivity test whose USD assumption conflicted with the
-- provider's displayed TEST receipt. Keep the signed-status evidence and audit.
do $$
declare v_tx public.payment_transactions%rowtype;
begin
  select * into v_tx from public.payment_transactions
   where merchant_reference = 'HT-CONN-01M61ANPB2N0Y8QYEK426TP347'
     and purpose = 'PROVIDER_CONNECTIVITY_TEST' and provider = 'paynow' for update;
  if v_tx.id is null then return; end if;
  if v_tx.internal_status = 'CURRENCY_MISMATCH' then return; end if;
  if v_tx.internal_status <> 'PAYMENT_VERIFIED' or v_tx.reconciliation_status <> 'NOT_ELIGIBLE'
     or v_tx.accounting_status <> 'NOT_APPLICABLE' then
    raise exception 'Connectivity test state does not match currency-correction preconditions';
  end if;
  update public.payment_transactions set internal_status = 'CURRENCY_MISMATCH',
    provider_metadata = provider_metadata || jsonb_build_object(
      'currency_source', 'PROVIDER_CURRENCY_DISPUTED',
      'currency_evidence', 'PAYNOW_TEST_RECEIPT_ZWG_CHECKOUT_USD'), updated_at = now()
   where id = v_tx.id;
  perform public.payment_open_exception('CURRENCY_MISMATCH',
    'Paynow TEST receipt displayed ZWG while checkout displayed USD; signed status omitted currency',
    v_tx.id, null, v_tx.merchant_reference, v_tx.provider_reference,
    jsonb_build_object('expected_currency', v_tx.currency, 'receipt_currency', 'ZWG', 'checkout_currency', 'USD'));
  perform public.payment_record_audit(null, 'system', 'payment.test.currency_evidence_corrected',
    'manual_intervention', v_tx.id, 'payment_transactions', v_tx.id::text,
    jsonb_build_object('internal_status', v_tx.internal_status, 'currency_source', v_tx.provider_metadata->>'currency_source'),
    jsonb_build_object('internal_status', 'CURRENCY_MISMATCH', 'currency_source', 'PROVIDER_CURRENCY_DISPUTED'),
    'Preserve signed status evidence while withholding currency verification', v_tx.provider_reference, '{}'::jsonb);
end $$;
