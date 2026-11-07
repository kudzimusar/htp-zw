-- AG-02 staging security baseline.
-- Deny-by-default until AG-06 introduces verified staff/capability policies.

alter table public.ad_campaigns enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_events enable row level security;
alter table public.ad_placements enable row level security;
alter table public.adsense_daily_metrics enable row level security;
alter table public.advertisers enable row level security;
alter table public.analytics_daily_metrics enable row level security;
alter table public.analytics_ingestion_runs enable row level security;
alter table public.analytics_integrations enable row level security;
alter table public.audience_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.authors enable row level security;
alter table public.citation_references enable row level security;
alter table public.editorial_desks enable row level security;
alter table public.geographic_zones enable row level security;
alter table public.legacy_sources enable row level security;
alter table public.legacy_url_mappings enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_usage enable row level security;
alter table public.migration_runs enable row level security;
alter table public.monetization_settings enable row level security;
alter table public.newsroom_capabilities enable row level security;
alter table public.newsroom_role_capabilities enable row level security;
alter table public.newsroom_roles enable row level security;
alter table public.premium_entitlements enable row level security;
alter table public.search_console_daily_metrics enable row level security;
alter table public.sections enable row level security;
alter table public.seo_metadata enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.stories enable row level security;
alter table public.story_lifecycle_events enable row level security;
alter table public.story_revisions enable row level security;
alter table public.story_tags enable row level security;
alter table public.subscribers enable row level security;
alter table public.tags enable row level security;
alter table public.web_vitals_daily_metrics enable row level security;

-- Preserve public read for migrated editorial media, but remove generic authenticated mutation.
drop policy if exists migrated_media_authenticated_insert on storage.objects;
drop policy if exists migrated_media_authenticated_update on storage.objects;
drop policy if exists migrated_media_authenticated_delete on storage.objects;

-- Keep newsroom-private server/service-role only until AG-06 RBAC lands.
drop policy if exists newsroom_private_read on storage.objects;
drop policy if exists newsroom_private_insert on storage.objects;
drop policy if exists newsroom_private_update on storage.objects;
drop policy if exists newsroom_private_delete on storage.objects;
