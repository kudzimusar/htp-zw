create table if not exists legacy_sources (
  id uuid primary key default gen_random_uuid(),
  system text not null,
  site_url text not null,
  source_type text not null,
  source_id text not null,
  stable_key text not null unique,
  source_url text,
  checksum text,
  raw jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists newsroom_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists newsroom_capabilities (
  key text primary key,
  description text not null
);

create table if not exists newsroom_role_capabilities (
  role_id uuid not null references newsroom_roles(id) on delete cascade,
  capability_key text not null references newsroom_capabilities(key) on delete cascade,
  primary key (role_id, capability_key)
);

create table if not exists staff_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  email text not null unique,
  role_id uuid references newsroom_roles(id),
  desk text,
  status text not null default 'invited',
  mfa_required boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists authors (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug text not null unique,
  bio text,
  wordpress_source_id text,
  created_at timestamptz not null default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references sections(id),
  wordpress_source_id text,
  created_at timestamptz not null default now()
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  wordpress_source_id text,
  created_at timestamptz not null default now()
);

create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id uuid references legacy_sources(id),
  title text not null,
  slug text not null,
  standfirst text,
  excerpt text,
  body_html text,
  body_json jsonb,
  status text not null default 'draft',
  access_policy text not null default 'public',
  author_id uuid references authors(id),
  primary_section_id uuid references sections(id),
  published_at timestamptz,
  modified_at timestamptz,
  scheduled_at timestamptz,
  seo_title text,
  seo_description text,
  canonical_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_source_id),
  unique (slug)
);

create table if not exists story_revisions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  legacy_source_id uuid references legacy_sources(id),
  revision_number integer not null,
  title text,
  body_html text,
  body_json jsonb,
  editor_id uuid references staff_profiles(id),
  change_summary text,
  created_at timestamptz not null default now(),
  unique (story_id, revision_number)
);

create table if not exists story_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_staff_id uuid references staff_profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists story_tags (
  story_id uuid not null references stories(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (story_id, tag_id)
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id uuid references legacy_sources(id),
  source_url text,
  storage_bucket text,
  storage_key text,
  public_url text,
  checksum text,
  mime_type text,
  filename text not null,
  alt_text text,
  caption text,
  credit text,
  width integer,
  height integer,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (legacy_source_id)
);

create table if not exists media_usage (
  media_id uuid not null references media_assets(id) on delete cascade,
  story_id uuid references stories(id) on delete cascade,
  usage_type text not null,
  source_context jsonb not null default '{}'::jsonb,
  primary key (media_id, story_id, usage_type)
);

create table if not exists legacy_url_mappings (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id uuid references legacy_sources(id),
  old_path text not null unique,
  new_path text not null,
  redirect_status integer not null default 301,
  preservation_strategy text not null default 'preserve',
  verified_at timestamptz
);

create table if not exists advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_notes text,
  created_at timestamptz not null default now()
);

create table if not exists ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references advertisers(id),
  name text not null,
  status text not null default 'draft',
  start_at timestamptz,
  end_at timestamptz,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references ad_campaigns(id) on delete cascade,
  media_id uuid references media_assets(id),
  placement text not null,
  destination_url text,
  disclosure_label text not null default 'Advertisement',
  created_at timestamptz not null default now()
);

create table if not exists analytics_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  integration_key text not null,
  status text not null default 'needs_client_access',
  public_identifier text,
  external_account_id text,
  external_property_id text,
  external_stream_id text,
  external_measurement_id text,
  credential_secret_ref text,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  configuration jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, integration_key)
);

create table if not exists analytics_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references analytics_integrations(id) on delete cascade,
  job_key text not null,
  source_system text not null,
  source_property_id text,
  range_start date,
  range_end date,
  status text not null default 'started',
  checkpoint jsonb not null default '{}'::jsonb,
  rows_processed integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (integration_id, job_key, range_start, range_end)
);

create table if not exists analytics_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references analytics_integrations(id) on delete cascade,
  ingestion_run_id uuid references analytics_ingestion_runs(id) on delete set null,
  source_system text not null default 'google_analytics',
  source_property_id text,
  metric_date date not null,
  path text,
  story_id uuid references stories(id) on delete set null,
  source text,
  medium text,
  campaign text,
  device_category text,
  country text,
  region text,
  page_views integer,
  users_count integer,
  sessions_count integer,
  engaged_sessions integer,
  bounce_rate numeric,
  average_engagement_seconds numeric,
  event_name text,
  event_count integer,
  conversion_count integer,
  ad_impressions integer,
  ad_clicks integer,
  ad_revenue numeric,
  imported_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  unique (integration_id, source_property_id, metric_date, path, event_name, source, medium, campaign, device_category, country, region)
);

create table if not exists search_console_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references analytics_integrations(id) on delete cascade,
  ingestion_run_id uuid references analytics_ingestion_runs(id) on delete set null,
  source_property_id text,
  metric_date date not null,
  query text,
  page text,
  story_id uuid references stories(id) on delete set null,
  country text,
  device text,
  search_appearance text,
  clicks integer,
  impressions integer,
  ctr numeric,
  average_position numeric,
  imported_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  unique (integration_id, source_property_id, metric_date, query, page, country, device, search_appearance)
);

create table if not exists seo_metadata (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  legacy_source_id uuid references legacy_sources(id),
  canonical_url text,
  title text,
  description text,
  robots text,
  open_graph_title text,
  open_graph_description text,
  open_graph_image text,
  index_policy text,
  structured_data_type text,
  review_status text not null default 'pending',
  reviewed_at timestamptz,
  open_graph jsonb not null default '{}'::jsonb,
  twitter_card jsonb not null default '{}'::jsonb,
  schema_org jsonb not null default '{}'::jsonb,
  source_plugin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id),
  unique (legacy_source_id)
);

create table if not exists monetization_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  public_identifier text,
  placement_key text not null,
  status text not null default 'active',
  seller_account_id text,
  ad_client_id text,
  ad_slot_id text,
  source_plugin text,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, placement_key)
);

create table if not exists ad_placements (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null unique,
  name text not null,
  allowed_sources text[] not null default array['direct','adsense','house','none'],
  default_source text not null default 'none',
  status text not null default 'active',
  layout_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ad_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  campaign_id uuid references ad_campaigns(id) on delete set null,
  creative_id uuid references ad_creatives(id) on delete set null,
  placement_id uuid references ad_placements(id) on delete set null,
  story_id uuid references stories(id) on delete set null,
  page_path text,
  device_category text,
  country text,
  occurred_at timestamptz not null,
  anonymous_actor_id text,
  raw jsonb not null default '{}'::jsonb,
  unique (event_name, campaign_id, creative_id, placement_id, story_id, page_path, occurred_at, anonymous_actor_id)
);

create table if not exists adsense_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references analytics_integrations(id) on delete cascade,
  ingestion_run_id uuid references analytics_ingestion_runs(id) on delete set null,
  metric_date date not null,
  publisher_id text,
  ad_client_id text,
  ad_slot_id text,
  page_path text,
  device_category text,
  country text,
  ad_impressions integer,
  clicks integer,
  estimated_earnings numeric,
  page_rpm numeric,
  ad_rpm numeric,
  cpc numeric,
  viewability numeric,
  imported_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  unique (integration_id, metric_date, publisher_id, ad_client_id, ad_slot_id, page_path, device_category, country)
);

create table if not exists web_vitals_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references analytics_integrations(id) on delete cascade,
  ingestion_run_id uuid references analytics_ingestion_runs(id) on delete set null,
  metric_date date not null,
  page_path text not null,
  strategy text not null,
  lcp_ms numeric,
  inp_ms numeric,
  cls numeric,
  performance_score numeric,
  field_data_available boolean not null default false,
  expensive_assets jsonb not null default '[]'::jsonb,
  imported_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  unique (integration_id, metric_date, page_path, strategy)
);

create table if not exists audience_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_version text not null default '2026-09-09',
  story_id uuid references stories(id) on delete set null,
  subscriber_id uuid references subscribers(id) on delete set null,
  page_path text,
  source text,
  medium text,
  campaign text,
  device_category text,
  country text,
  region text,
  occurred_at timestamptz not null,
  anonymous_actor_id text,
  parameters jsonb not null default '{}'::jsonb
);

create table if not exists citation_references (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  reference_type text not null,
  source_name text,
  source_url text,
  title text,
  cited_at date,
  country text,
  authority_score numeric,
  provider text,
  provider_reference text,
  status text not null default 'unverified',
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (story_id, reference_type, source_url, provider, provider_reference)
);

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  display_name text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists premium_entitlements (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  policy_key text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  provider text,
  provider_reference text,
  unique (subscriber_id, policy_key, provider, provider_reference)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_staff_id uuid references staff_profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists migration_runs (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  mode text not null,
  dry_run boolean not null default true,
  manifest_checksum text,
  status text not null default 'started',
  counts jsonb not null default '{}'::jsonb,
  exceptions jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_analytics_daily_metrics_story_date on analytics_daily_metrics(story_id, metric_date);
create index if not exists idx_analytics_daily_metrics_country_date on analytics_daily_metrics(country, metric_date);
create index if not exists idx_search_console_page_date on search_console_daily_metrics(page, metric_date);
create index if not exists idx_search_console_query_date on search_console_daily_metrics(query, metric_date);
create index if not exists idx_ad_events_campaign_time on ad_events(campaign_id, occurred_at);
create index if not exists idx_audience_events_name_time on audience_events(event_name, occurred_at);
create index if not exists idx_web_vitals_page_date on web_vitals_daily_metrics(page_path, metric_date);
create index if not exists idx_citation_references_story_type on citation_references(story_id, reference_type);
