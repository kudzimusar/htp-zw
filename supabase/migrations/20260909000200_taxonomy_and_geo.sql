create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references sections(id),
  wordpress_source_id text,
  created_at timestamptz not null default now()
);

alter table stories 
  add constraint fk_stories_primary_section 
  foreign key (primary_section_id) references sections(id) on delete set null;

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  wordpress_source_id text,
  created_at timestamptz not null default now()
);

create table if not exists story_tags (
  story_id uuid not null references stories(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (story_id, tag_id)
);

create table if not exists editorial_desks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists geographic_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  code text unique,
  parent_zone_id uuid references geographic_zones(id),
  created_at timestamptz not null default now()
);

insert into editorial_desks (name, slug, description) values
  ('Global Health', 'global-health', 'International health trends, pandemics, and multilateral initiatives'),
  ('Africa', 'africa', 'Cross-border African public health and regional policy'),
  ('Research', 'research', 'Clinical trials, epidemiology, scientific publications, and findings'),
  ('Policy', 'policy', 'National legislation, Ministry of Health directives, and regulatory frameworks'),
  ('Investigations', 'investigations', 'Deep-dive investigative health reporting and accountability journalism'),
  ('Public Health', 'public-health', 'Community health initiatives, sanitation, nutrition, and disease outbreaks'),
  ('Health Systems', 'health-systems', 'Hospital management, supply chain (NatPharm), clinical infrastructure'),
  ('Health Business', 'health-business', 'Pharmaceutical trade, health financing, and medical enterprise')
on conflict (slug) do nothing;

insert into geographic_zones (name, slug, code) values
  ('Global', 'global', 'GLB'),
  ('Africa', 'africa', 'AFR'),
  ('Southern Africa', 'southern-africa', 'SAF'),
  ('East Africa', 'east-africa', 'EAF'),
  ('West Africa', 'west-africa', 'WAF'),
  ('Central Africa', 'central-africa', 'CAF'),
  ('North Africa', 'north-africa', 'NAF'),
  ('Zimbabwe', 'zimbabwe', 'ZWE')
on conflict (slug) do nothing;
