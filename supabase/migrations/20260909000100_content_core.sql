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
  primary_section_id uuid,
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

create table if not exists media_usage (
  media_id uuid not null references media_assets(id) on delete cascade,
  story_id uuid references stories(id) on delete cascade,
  usage_type text not null,
  source_context jsonb not null default '{}'::jsonb,
  primary key (media_id, story_id, usage_type)
);
