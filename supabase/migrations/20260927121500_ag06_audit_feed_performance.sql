-- AG-06 R5 certification hardening: newest-audit lookup must be index-backed.
-- This does not alter audit RLS or visibility; it only supports the existing
-- Publisher bootstrap query ordered by created_at DESC LIMIT 200.

begin;

create index if not exists idx_audit_logs_created_at_desc
  on public.audit_logs(created_at desc,id desc);

commit;
