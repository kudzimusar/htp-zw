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

create index if not exists idx_analytics_daily_metrics_story_date on analytics_daily_metrics(story_id, metric_date);
create index if not exists idx_analytics_daily_metrics_country_date on analytics_daily_metrics(country, metric_date);
create index if not exists idx_search_console_page_date on search_console_daily_metrics(page, metric_date);
create index if not exists idx_search_console_query_date on search_console_daily_metrics(query, metric_date);
create index if not exists idx_ad_events_campaign_time on ad_events(campaign_id, occurred_at);
create index if not exists idx_audience_events_name_time on audience_events(event_name, occurred_at);
create index if not exists idx_web_vitals_page_date on web_vitals_daily_metrics(page_path, metric_date);
