-- Historical staging migration identity adoption.
--
-- HealthTimes Staging records version 20260927040923 with the logical name
-- ag06_certification_active_binding_cleanup. That live migration was applied
-- after later-version cleanup migrations already existed in staging, so
-- replaying its original CREATE OR REPLACE body here in lexical/version order
-- would collide with 20260927113000, which historically uses CREATE FUNCTION.
--
-- Repository replay therefore adopts this exact live identity as an intentional
-- no-op. The authoritative executable final cleanup definition is reaffirmed
-- later by:
--   20260927123000_ag06_certification_active_binding_cleanup.sql
--
-- Do not remove this identity and do not add schema mutations here. Its purpose
-- is migration-ledger parity while preserving deterministic from-zero replay.

begin;

-- Intentionally no-op: historical live identity adoption only.

commit;
