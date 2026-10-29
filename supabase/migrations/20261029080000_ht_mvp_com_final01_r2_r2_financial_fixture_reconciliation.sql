-- Migration: 20261029080000_ht_mvp_com_final01_r2_r2_financial_fixture_reconciliation.sql
-- Description: Idempotent financial fixture reconciliation, UAT session containment, and audit preservation for HT-MVP-COM-FINAL-01-R2-R2.

do $$
declare
  v_rec record;
  v_rev_id uuid;
  v_rev_num text;
  v_rev_lines jsonb;
  v_actor uuid := '00000000-0000-0000-0000-000000000000'::uuid;
begin
  -- 1. Reconcile any unreversed synthetic UAT journals (JRN-2026-0012 to JRN-2026-0017)
  for v_rec in (
    select id, entry_number, entry_date, period_id, currency, memo, source, source_id
    from public.finance_journal_entries
    where entry_number in ('JRN-2026-0012', 'JRN-2026-0013', 'JRN-2026-0014', 'JRN-2026-0015', 'JRN-2026-0016', 'JRN-2026-0017')
      and status = 'posted'
      and reversed_entry_id is null
    order by entry_number
  ) loop
    -- Build inverted lines
    select jsonb_agg(
      jsonb_build_object(
        'account_id', l.account_id,
        'debit', l.credit,
        'credit', l.debit,
        'memo', 'Reversal of line: ' || coalesce(l.memo, '')
      )
    )
    into v_rev_lines
    from public.finance_journal_lines l
    where l.entry_id = v_rec.id;

    if v_rev_lines is not null and jsonb_array_length(v_rev_lines) > 0 then
      v_rev_num := public.finance_next_number('journal');
      insert into public.finance_journal_entries(
        entry_number, entry_date, period_id, status, source, source_id,
        currency, memo, posted_at, posted_by, reversed_entry_id, created_by
      ) values (
        v_rev_num, v_rec.entry_date, v_rec.period_id, 'posted', 'manual', v_rec.source_id,
        v_rec.currency, 'REVERSAL: ' || v_rec.entry_number || ' - Reconciled: UAT synthetic entry',
        now(), v_actor, v_rec.id, v_actor
      ) returning id into v_rev_id;

      insert into public.finance_journal_lines(entry_id, account_id, debit, credit, memo)
      select v_rev_id, (elem->>'account_id')::uuid, (elem->>'debit')::numeric, (elem->>'credit')::numeric, (elem->>'memo')
      from jsonb_array_elements(v_rev_lines) as elem;

      update public.finance_journal_entries
      set status = 'reversed', reversed_entry_id = v_rev_id
      where id = v_rec.id;

      perform public.finance_audit(
        v_actor, 'finance.journal.reversed', 'finance_journal_entries', v_rec.id,
        jsonb_build_object('entry_number', v_rec.entry_number, 'reversal_entry_number', v_rev_num)
      );
    end if;
  end loop;

  -- 2. Void synthetic UAT invoices (INV-2026-0004, 0005, 0006)
  update public.finance_invoices
  set status = 'void',
      voided_at = coalesce(voided_at, now()),
      voided_by = coalesce(voided_by, v_actor),
      void_reason = 'Reconciled: UAT synthetic invoice voided during certification closure',
      updated_at = now()
  where invoice_number in ('INV-2026-0004', 'INV-2026-0005', 'INV-2026-0006')
    and status <> 'void';

  -- 3. Void synthetic UAT expenses (EXP-2026-0006, 0007, 0008)
  update public.finance_expenses
  set status = 'void',
      rejected_reason = 'Reconciled: UAT synthetic expense reversed during certification closure',
      updated_at = now()
  where expense_number in ('EXP-2026-0006', 'EXP-2026-0007', 'EXP-2026-0008')
    and status <> 'void';

  -- 4. Cancel synthetic UAT commercial orders (ORD-2026-0008, 0009, 0010)
  update public.commercial_orders
  set status = 'cancelled',
      billing_status = 'unbilled',
      updated_at = now()
  where order_number in ('ORD-2026-0008', 'ORD-2026-0009', 'ORD-2026-0010')
    and status <> 'cancelled';

  -- 5. Deactivate synthetic test customers
  update public.finance_customers
  set status = 'inactive',
      updated_at = now()
  where legal_name like 'UAT HealthCorp%'
    and status <> 'inactive';

  -- 6. Contain UAT sessions for test users
  update public.newsroom_sessions
  set revoked_at = now()
  where auth_user_id in (
    select auth_user_id from public.staff_profiles
    where email in ('uat-commercial@healthtimes.test', 'uat-finance@healthtimes.test', 'uat-specialist@healthtimes.test')
  ) and revoked_at is null;

  delete from auth.sessions
  where user_id in (
    select auth_user_id from public.staff_profiles
    where email in ('uat-commercial@healthtimes.test', 'uat-finance@healthtimes.test', 'uat-specialist@healthtimes.test')
  );
end $$;
