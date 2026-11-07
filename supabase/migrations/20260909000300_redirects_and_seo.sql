create table if not exists legacy_url_mappings (
  id uuid primary key default gen_random_uuid(),
  legacy_source_id uuid references legacy_sources(id),
  old_path text not null unique,
  new_path text not null,
  redirect_status integer not null default 301,
  preservation_strategy text not null default 'preserve',
  verified_at timestamptz
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

create index if not exists idx_citation_references_story_type on citation_references(story_id, reference_type);
