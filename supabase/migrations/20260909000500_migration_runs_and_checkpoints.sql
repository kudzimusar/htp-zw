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
