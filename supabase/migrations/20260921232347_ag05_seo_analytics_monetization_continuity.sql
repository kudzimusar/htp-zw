-- AG-05: SEO / analytics / monetization continuity.
-- Staging-safe only. No production Google/AdSense/DNS mutation.

create table if not exists migration_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null unique,
  source_site text not null,
  snapshot_date date not null,
  snapshot_status text not null,
  published_posts integer not null,
  published_pages integer not null,
  media_count integer,
  category_count integer,
  tag_count integer,
  author_count integer,
  database_sha256 text,
  uploads_sha256 text,
  created_at timestamptz not null default now()
);

create table if not exists legacy_url_exceptions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid references migration_source_snapshots(id) on delete cascade,
  legacy_source_id uuid references legacy_sources(id) on delete set null,
  source_url text not null,
  source_object_id text,
  source_object_type text not null,
  handling text not null,
  http_status integer,
  canonical_url text,
  reason text not null,
  verification_status text not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (snapshot_id, source_url)
);

create table if not exists analytics_event_definitions (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_version text not null,
  scope text not null default 'public_reader',
  required_parameters text[] not null default '{}',
  prohibited_parameters text[] not null default '{}',
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  unique (event_name, event_version)
);

create table if not exists ad_source_assets (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references advertisers(id) on delete set null,
  campaign_id uuid references ad_campaigns(id) on delete set null,
  creative_id uuid references ad_creatives(id) on delete set null,
  media_id uuid references media_assets(id) on delete set null,
  source_system text not null,
  source_attachment_id text not null,
  source_role text not null,
  checksum_sha256 text,
  asset_source_provenance text not null,
  byte_identity_group text,
  notes text,
  created_at timestamptz not null default now(),
  unique (source_system, source_attachment_id)
);

create table if not exists ad_placement_provenance (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references ad_placements(id) on delete cascade,
  source_system text not null,
  source_template_id text,
  source_template_title text,
  current_source_attachment_id text,
  historical_revision_ids text[] not null default '{}',
  destination_url text,
  destination_url_state text not null,
  schedule jsonb,
  schedule_state text not null,
  placement_conditions jsonb,
  placement_conditions_state text not null,
  ad_inserter_placement boolean not null default false,
  standalone_campaign_register_found boolean,
  notes text,
  created_at timestamptz not null default now(),
  unique (placement_id, source_system, source_template_id)
);

create table if not exists http_resolution_events (
  id uuid primary key default gen_random_uuid(),
  requested_path text not null,
  referrer_host text,
  response_status integer not null,
  resolution text not null,
  legacy_url_mapping_id uuid references legacy_url_mappings(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_http_resolution_events_path_time
  on http_resolution_events(requested_path, occurred_at desc);

create unique index if not exists uq_ad_campaigns_advertiser_name
  on ad_campaigns(advertiser_id, name);

create unique index if not exists uq_ad_creatives_campaign_placement
  on ad_creatives(campaign_id, placement);

alter table migration_source_snapshots enable row level security;
alter table legacy_url_exceptions enable row level security;
alter table analytics_event_definitions enable row level security;
alter table ad_source_assets enable row level security;
alter table ad_placement_provenance enable row level security;
alter table http_resolution_events enable row level security;

insert into migration_source_snapshots (
  snapshot_key, source_site, snapshot_date, snapshot_status,
  published_posts, published_pages, media_count, category_count, tag_count, author_count,
  database_sha256, uploads_sha256
) values (
  'cp3-2026-09-21',
  'https://healthtimes.co.zw',
  date '2026-09-21',
  'AUTHORITATIVE_REHEARSAL',
  5737, 49, 3277, 83, 10283, 3,
  '16d525727bb451318a6658e710b20098213c846579b7601338a9c9dc91ad4060',
  '4e15b3eddcdb4106380224b521501a1197f0596a37bacdac6e0f0ac1c84f820c'
)
on conflict (snapshot_key) do update set
  published_posts = excluded.published_posts,
  published_pages = excluded.published_pages,
  media_count = excluded.media_count,
  category_count = excluded.category_count,
  tag_count = excluded.tag_count,
  author_count = excluded.author_count,
  database_sha256 = excluded.database_sha256,
  uploads_sha256 = excluded.uploads_sha256;

insert into analytics_integrations (
  provider, integration_key, status, public_identifier,
  external_account_id, external_property_id, external_stream_id, external_measurement_id,
  configuration, notes
) values
  (
    'google_analytics', 'public_web',
    'identity_verified_account_access_pending',
    'GT-PLTTGPL', '137814020', '359235319', '4756168788', 'G-S39LN2KX4X',
    '{"staging_external_delivery":false,"protected_newsroom_tracking":false}'::jsonb,
    'IDs verified from Site Kit/source capture. Ownership/settings/history remain account-level pending.'
  ),
  (
    'search_console', 'public_search',
    'property_known_account_access_pending',
    'https://healthtimes.co.zw/', null, 'https://healthtimes.co.zw/', null, null,
    '{"property_type":"UNKNOWN","staging_submission":false}'::jsonb,
    'Property identity known. Property type, verified owners and history availability are not account-level verified.'
  ),
  (
    'adsense', 'public_ads',
    'identity_verified_reporting_access_pending',
    'ca-pub-8744434739998394', null, 'pub-8744434739998394', null, null,
    '{"known_slot":"7971959240","site_kit_account_status":"ready","site_kit_site_status":"ready","site_kit_snippet_enabled":false}'::jsonb,
    'Publisher/client/slot known. Account ownership/reporting/history remain pending.'
  ),
  (
    'pagespeed', 'public_web',
    'connected_source_baseline_pending',
    'site-kit-pagespeed', null, null, null, null,
    '{"staging_url":"https://healthtimes-staging.vercel.app"}'::jsonb,
    'Site Kit source continuity is known; staging baseline belongs to AG-05.'
  ),
  (
    'google_ads', 'public_acquisition',
    'incomplete',
    'site-kit-google-ads', null, null, null, null,
    '{"conversion_id":null,"customer_id":null,"external_customer_id":null}'::jsonb,
    'Site Kit module detected but setup incomplete; no active spend inferred.'
  ),
  (
    'citations', 'external_references',
    'provider_not_connected',
    null, null, null, null, null,
    '{"providers":[]}'::jsonb,
    'Citation/backlink model ready; no automated provider coverage is claimed.'
  )
on conflict (provider, integration_key) do update set
  status = excluded.status,
  public_identifier = excluded.public_identifier,
  external_account_id = excluded.external_account_id,
  external_property_id = excluded.external_property_id,
  external_stream_id = excluded.external_stream_id,
  external_measurement_id = excluded.external_measurement_id,
  configuration = excluded.configuration,
  notes = excluded.notes,
  updated_at = now();

insert into analytics_event_definitions (event_name, event_version, required_parameters, prohibited_parameters, notes)
values
  ('page_view','2026-09-09',array['path','title','referrer','device'],array['draft_content','internal_comments','staff_email','permission_details','private_source_document'],'Public reader only.'),
  ('article_view','2026-09-09',array['story_id','legacy_wp_id','section','author','premium_state'],array['draft_content','internal_comments','staff_email'],'Public reader only.'),
  ('article_25_percent','2026-09-09',array['story_id','scroll_depth'],array['draft_content','internal_comments'],'Public reader only.'),
  ('article_50_percent','2026-09-09',array['story_id','scroll_depth'],array['draft_content','internal_comments'],'Public reader only.'),
  ('article_75_percent','2026-09-09',array['story_id','scroll_depth'],array['draft_content','internal_comments'],'Public reader only.'),
  ('article_complete','2026-09-09',array['story_id','read_time_seconds'],array['draft_content','internal_comments'],'Public reader only.'),
  ('listen_started','2026-09-09',array['story_id','premium_state'],array['draft_content','internal_comments'],'Public reader only.'),
  ('listen_completed','2026-09-09',array['story_id','listen_seconds'],array['draft_content','internal_comments'],'Public reader only.'),
  ('story_saved','2026-09-09',array['story_id','reader_state'],array['staff_email'],'Public reader only.'),
  ('story_shared','2026-09-09',array['story_id','channel'],array['staff_email'],'Public reader only.'),
  ('whatsapp_share','2026-09-09',array['story_id','page_path'],array['phone_number','message_body'],'Never send WhatsApp phone/message content to public analytics.'),
  ('search_performed','2026-09-09',array['query','result_count'],array['staff_email'],'Public search only; no protected Newsroom search.'),
  ('topic_followed','2026-09-09',array['topic_id','topic_name'],array['staff_email'],'Public reader only.'),
  ('citation_copied','2026-09-09',array['story_id','access_state'],array['citation_body'],'Track action, not copied body text.'),
  ('reference_opened','2026-09-09',array['story_id','reference_url_host'],array['reference_url_query'],'Host only where possible.'),
  ('premium_preview_started','2026-09-09',array['story_id','reader_state'],array['payment_details'],'No payment data.'),
  ('premium_warning_shown','2026-09-09',array['story_id','seconds_elapsed'],array['payment_details'],'No payment data.'),
  ('premium_locked','2026-09-09',array['story_id','seconds_elapsed'],array['payment_details'],'No payment data.'),
  ('subscription_started','2026-09-09',array['plan_key','source_path'],array['payment_details'],'No payment data.'),
  ('subscription_completed','2026-09-09',array['plan_key','provider','value'],array['payment_details','customer_email'],'Aggregate conversion event only.'),
  ('newsletter_signup','2026-09-09',array['source_path','consent_version'],array['email_address'],'Never send subscriber email to public analytics.'),
  ('push_opt_in','2026-09-09',array['source_path','consent_version'],array['push_token'],'Never send push tokens.'),
  ('ad_impression','2026-09-09',array['campaign_id','creative_id','placement','provider','story_id_or_path'],array['revenue','staff_email'],'Direct-campaign delivery only; separate from AdSense reporting.'),
  ('ad_click','2026-09-09',array['campaign_id','creative_id','placement','provider','story_id_or_path'],array['revenue','staff_email'],'Direct-campaign delivery only; separate from AdSense reporting.')
on conflict (event_name, event_version) do update set
  required_parameters = excluded.required_parameters,
  prohibited_parameters = excluded.prohibited_parameters,
  notes = excluded.notes;

insert into monetization_settings (
  provider, public_identifier, placement_key, status,
  seller_account_id, ad_client_id, ad_slot_id, source_plugin, configuration
) values (
  'adsense',
  'pub-8744434739998394',
  'legacy-ad-inserter-slot-7971959240',
  'continuity_captured',
  'pub-8744434739998394',
  'ca-pub-8744434739998394',
  '7971959240',
  'Ad Inserter',
  '{"seller_line":"google.com, pub-8744434739998394, DIRECT, f08c47fec0942fa0","auto_ads_status":"UNKNOWN","reporting_access":"PENDING"}'::jsonb
)
on conflict (provider, placement_key) do update set
  public_identifier = excluded.public_identifier,
  status = excluded.status,
  seller_account_id = excluded.seller_account_id,
  ad_client_id = excluded.ad_client_id,
  ad_slot_id = excluded.ad_slot_id,
  source_plugin = excluded.source_plugin,
  configuration = excluded.configuration;

insert into advertisers (name, contact_notes)
values (
  'HOSPAZ',
  'DIRECT_AD_CONTINUITY_CAPTURED. Destination URL, schedule and placement conditions remain UNKNOWN. No standalone campaign register found in captured source.'
)
on conflict (name) do update set contact_notes = excluded.contact_notes;

with advertiser as (
  select id from advertisers where name = 'HOSPAZ'
)
insert into ad_campaigns (advertiser_id, name, status, review_status)
select id, 'HOSPAZ source continuity', 'continuity_captured', 'source_evidence_verified'
from advertiser
on conflict (advertiser_id, name) do update set
  status = excluded.status,
  review_status = excluded.review_status;

insert into ad_placements (
  placement_key, name, allowed_sources, default_source, status, layout_policy
) values (
  'hospaz-header-direct',
  'HOSPAZ header direct-ad placement',
  array['direct','none'],
  'direct',
  'awaiting_migrated_asset',
  '{"reserve_space":true,"prevent_layout_shift":true,"source_dimensions_required":true,"fallback":"none"}'::jsonb
)
on conflict (placement_key) do update set
  name = excluded.name,
  allowed_sources = excluded.allowed_sources,
  default_source = excluded.default_source,
  status = excluded.status,
  layout_policy = excluded.layout_policy;

with campaign as (
  select c.id
  from ad_campaigns c
  join advertisers a on a.id = c.advertiser_id
  where a.name = 'HOSPAZ' and c.name = 'HOSPAZ source continuity'
)
insert into ad_creatives (campaign_id, media_id, placement, destination_url, disclosure_label)
select id, null, 'hospaz-header-direct', null, 'Advertisement'
from campaign
on conflict (campaign_id, placement) do update set
  destination_url = null,
  disclosure_label = excluded.disclosure_label;

with refs as (
  select
    a.id advertiser_id,
    c.id campaign_id,
    cr.id creative_id
  from advertisers a
  join ad_campaigns c on c.advertiser_id = a.id and c.name = 'HOSPAZ source continuity'
  join ad_creatives cr on cr.campaign_id = c.id and cr.placement = 'hospaz-header-direct'
  where a.name = 'HOSPAZ'
)
insert into ad_source_assets (
  advertiser_id, campaign_id, creative_id, media_id,
  source_system, source_attachment_id, source_role,
  checksum_sha256, asset_source_provenance, byte_identity_group, notes
)
select advertiser_id, campaign_id, creative_id, null, 'wordpress', source_attachment_id, source_role,
       checksum_sha256, asset_source_provenance, byte_identity_group, notes
from refs
cross join (
  values
    ('32960','commercial_creative_historical','50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f','DIRECT_AD','hospaz-50d7b7363c35df79','Byte-identical with attachment 32971; preserve both source identities.'),
    ('32971','commercial_creative_historical','50d7b7363c35df79a17102c81e0d5d37db1abe6c780f4ba189df09f26cd8456f','DIRECT_AD','hospaz-50d7b7363c35df79','Byte-identical with attachment 32960; preserve both source identities.'),
    ('33005','current_placement_asset',null,'EDITORIAL',null,'Ordinary WordPress/editorial asset; placement usage provenance is DIRECT_AD / HEADER_PLACEMENT.')
) v(source_attachment_id,source_role,checksum_sha256,asset_source_provenance,byte_identity_group,notes)
on conflict (source_system, source_attachment_id) do update set
  advertiser_id = excluded.advertiser_id,
  campaign_id = excluded.campaign_id,
  creative_id = excluded.creative_id,
  checksum_sha256 = excluded.checksum_sha256,
  asset_source_provenance = excluded.asset_source_provenance,
  byte_identity_group = excluded.byte_identity_group,
  notes = excluded.notes;

with placement as (
  select id from ad_placements where placement_key = 'hospaz-header-direct'
)
insert into ad_placement_provenance (
  placement_id, source_system, source_template_id, source_template_title,
  current_source_attachment_id, historical_revision_ids,
  destination_url, destination_url_state,
  schedule, schedule_state,
  placement_conditions, placement_conditions_state,
  ad_inserter_placement, standalone_campaign_register_found, notes
)
select
  id, 'wordpress_elementor', '21', 'main',
  '33005', array['32974','32975','32976','32977','32979','32980'],
  null, 'UNKNOWN',
  null, 'UNKNOWN',
  null, 'UNKNOWN',
  false, false,
  'Current placement uses attachment 33005. Historical revisions reference the commercial creative. HOSPAZ_AD_INSERTER_PLACEMENT: NO.'
from placement
on conflict (placement_id, source_system, source_template_id) do update set
  current_source_attachment_id = excluded.current_source_attachment_id,
  historical_revision_ids = excluded.historical_revision_ids,
  destination_url = null,
  destination_url_state = 'UNKNOWN',
  schedule = null,
  schedule_state = 'UNKNOWN',
  placement_conditions = null,
  placement_conditions_state = 'UNKNOWN',
  ad_inserter_placement = false,
  standalone_campaign_register_found = false,
  notes = excluded.notes;

create or replace view ag05_url_coverage_status as
with snapshot as (
  select *
  from migration_source_snapshots
  where snapshot_key = 'cp3-2026-09-21'
),
source_rows as (
  select count(*)::integer as source_rows
  from legacy_sources
  where system = 'wordpress'
    and source_type in ('post','page')
),
mapping_rows as (
  select count(*)::integer as mapping_rows
  from legacy_url_mappings m
  join legacy_sources s on s.id = m.legacy_source_id
  where s.system = 'wordpress'
    and s.source_type in ('post','page')
),
exception_rows as (
  select count(*)::integer as exception_rows
  from legacy_url_exceptions e
  join snapshot s on s.id = e.snapshot_id
)
select
  snapshot.snapshot_key,
  snapshot.published_posts + snapshot.published_pages as expected_public_objects,
  source_rows.source_rows,
  mapping_rows.mapping_rows,
  exception_rows.exception_rows,
  greatest((snapshot.published_posts + snapshot.published_pages) - mapping_rows.mapping_rows - exception_rows.exception_rows, 0) as unresolved,
  case
    when source_rows.source_rows = snapshot.published_posts + snapshot.published_pages
     and mapping_rows.mapping_rows + exception_rows.exception_rows = snapshot.published_posts + snapshot.published_pages
    then 'COVERED'
    else 'BLOCKED'
  end as coverage_status
from snapshot, source_rows, mapping_rows, exception_rows;
