-- AG-06 R5 runtime hardening: bound Publisher audit bootstrap ordering.
-- Forward-only and intentionally later than the already-applied 20260927120000 cleanup fix.

begin;

create index if not exists idx_audit_logs_created_at_desc
  on public.audit_logs(created_at desc);

commit;
