// Replays the migrations applied on staging into a disposable local database.
// Refuses any non-loopback target, so these helpers cannot touch a hosted project.
import assert from "node:assert/strict";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const BASE = process.env.HT_DISPOSABLE_PG_BASE_URI ?? "postgres://postgres:ephemeral-ci-only@127.0.0.1:55432";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(BASE).hostname), "disposable database tests run on loopback only");
const PSQL = ["/opt/homebrew/opt/postgresql@16/bin/psql", "/opt/homebrew/opt/libpq/bin/psql"].find((path) => fs.existsSync(path)) ?? "psql";
// Held for G2, or fail-closed staging-only fixtures whose guard needs an authorization these tests do not have.
const EXCLUDED = /^(20261102160000|20261107130000|20261029080000|20261029090000)_/;
const ROLES = ["anon", "authenticated", "service_role", "authenticator", "supabase_admin", "supabase_auth_admin", "supabase_storage_admin", "dashboard_user"];
const SUPABASE_STUBS = `
  create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;
  create extension if not exists "uuid-ossp" with schema extensions;
  create extension if not exists pg_trgm with schema extensions;
  create schema if not exists auth;
  create table auth.users (id uuid primary key default extensions.gen_random_uuid(), email text unique, phone text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean default false, created_at timestamptz default now(), updated_at timestamptz default now(), raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
  create table auth.sessions (id uuid primary key default extensions.gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now(), updated_at timestamptz default now(), not_after timestamptz, aal text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create schema if not exists storage;
  create table storage.buckets (id text primary key, name text, owner uuid, public boolean default false, file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now());
  create table storage.objects (id uuid primary key default extensions.gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz default now(), metadata jsonb);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
  create schema if not exists supabase_migrations;
  create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
  create schema if not exists realtime;
  create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb, event text, private boolean, inserted_at timestamptz default now());
  alter table realtime.messages enable row level security;
  create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language sql as $$ select $$;
  create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
`;

export function disposableDatabase(name) {
  const run = (database, input, vars = {}) => execFileSync(
    PSQL,
    [`${BASE}/${database}`, "-At", "-q", "-v", "ON_ERROR_STOP=1", ...Object.entries(vars).flatMap(([k, v]) => ["-v", `${k}=${v}`])],
    { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }
  ).trim();
  const sql = (input, vars) => run(name, input, vars);
  const applyFile = (file) => execFileSync(PSQL, [`${BASE}/${name}`, "-q", "-v", "ON_ERROR_STOP=1", "-1", "-f", file], { stdio: "pipe" });
  return {
    sql,
    applyFile,
    failure(fn) { try { fn(); } catch (error) { return String(error.stderr ?? error.message); } return null; },
    createCanonical() {
      run("postgres", `DROP DATABASE IF EXISTS ${name};`);
      run("postgres", `CREATE DATABASE ${name};`);
      for (const role of ROLES) run("postgres", `DO $$ BEGIN CREATE ROLE ${role} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
      run("postgres", `ALTER DATABASE ${name} SET search_path = public, extensions;`);
      sql(SUPABASE_STUBS);
      const migrations = join(ROOT, "supabase/migrations");
      for (const file of fs.readdirSync(migrations).filter((entry) => entry.endsWith(".sql") && !EXCLUDED.test(entry)).sort()) applyFile(join(migrations, file));
    }
  };
}
