-- HT-MVP-COM-FINAL-01-R1: Security Grant Hardening & Privilege Parity
-- Remediate unintended PUBLIC & anon execution privileges on SECURITY DEFINER functions:
-- 1. commercial_list_orders(text)
-- 2. finance_list_expenses(text)
-- And comprehensively revoke public/anon access across all Newsroom Finance & Commercial management functions.

revoke execute on function public.commercial_list_orders(text) from public, anon;
grant execute on function public.commercial_list_orders(text) to authenticated, service_role;

revoke execute on function public.finance_list_expenses(text) from public, anon;
grant execute on function public.finance_list_expenses(text) to authenticated, service_role;

revoke execute on function public.finance_issue_invoice(uuid, date, date) from public, anon;
grant execute on function public.finance_issue_invoice(uuid, date, date) to authenticated, service_role;

revoke execute on function public.finance_upsert_customer(uuid, uuid, text, text, text, text, text, text, text, int) from public, anon;
grant execute on function public.finance_upsert_customer(uuid, uuid, text, text, text, text, text, text, text, int) to authenticated, service_role;

revoke execute on function public.finance_get_trial_balance(uuid, text) from public, anon;
grant execute on function public.finance_get_trial_balance(uuid, text) to authenticated, service_role;

revoke execute on function public.finance_get_profit_and_loss(date, date, text) from public, anon;
grant execute on function public.finance_get_profit_and_loss(date, date, text) to authenticated, service_role;

revoke execute on function public.finance_get_balance_sheet(date, text) from public, anon;
grant execute on function public.finance_get_balance_sheet(date, text) to authenticated, service_role;

revoke execute on function public.finance_get_customer_statement(uuid, date, date, text) from public, anon;
grant execute on function public.finance_get_customer_statement(uuid, date, date, text) to authenticated, service_role;

revoke execute on function public.finance_create_credit_note(uuid, numeric, text) from public, anon;
grant execute on function public.finance_create_credit_note(uuid, numeric, text) to authenticated, service_role;

revoke execute on function public.finance_reverse_journal_entry(uuid, text) from public, anon;
grant execute on function public.finance_reverse_journal_entry(uuid, text) to authenticated, service_role;

revoke execute on function public.finance_list_chart_of_accounts() from public, anon;
grant execute on function public.finance_list_chart_of_accounts() to authenticated, service_role;

revoke execute on function public.finance_list_fiscal_periods() from public, anon;
grant execute on function public.finance_list_fiscal_periods() to authenticated, service_role;

revoke execute on function public.finance_list_journal_entries(uuid, text, int) from public, anon;
grant execute on function public.finance_list_journal_entries(uuid, text, int) to authenticated, service_role;

revoke execute on function public.finance_record_payment(uuid, numeric, text, date, text, text, text, text) from public, anon;
grant execute on function public.finance_record_payment(uuid, numeric, text, date, text, text, text, text) to authenticated, service_role;
