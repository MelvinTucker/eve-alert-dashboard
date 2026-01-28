-- EVE Alert Dashboard schema (MVP)

create extension if not exists pgcrypto;

-- Account groups are the 3-character bundles you provided (e.g. MelTuc, MELTUC-DELTA, etc.)
create table if not exists public.eve_account_group (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eve_character (
  id bigint primary key,
  name text not null unique,
  account_group_id uuid references public.eve_account_group(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'eve_check_type') then
    create type public.eve_check_type as enum ('pi','skillq','industry','contract');
  end if;
end $$;

create table if not exists public.eve_check_run (
  id uuid primary key default gen_random_uuid(),
  check_type public.eve_check_type not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean not null default true,
  meta jsonb not null default '{}'::jsonb
);

-- One row per character per run (plus contract hits can have null character)
create table if not exists public.eve_character_check (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.eve_check_run(id) on delete cascade,
  character_id bigint references public.eve_character(id) on delete set null,
  status text not null check (status in ('pass','fail','warn','excluded')),
  checked_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index if not exists eve_character_check_run_id_idx on public.eve_character_check(run_id);
create index if not exists eve_character_check_character_id_idx on public.eve_character_check(character_id);
create index if not exists eve_check_run_type_started_idx on public.eve_check_run(check_type, started_at desc);

-- Latest stats snapshot we display on character page
create table if not exists public.eve_character_stats_latest (
  character_id bigint primary key references public.eve_character(id) on delete cascade,
  total_sp bigint,
  wallet_isk numeric,
  updated_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

-- Make read-only queries easy for now (MVP): allow anon SELECT.
-- Note: This is public data in practice; later we can add auth + RLS.
alter table public.eve_account_group enable row level security;
alter table public.eve_character enable row level security;
alter table public.eve_check_run enable row level security;
alter table public.eve_character_check enable row level security;
alter table public.eve_character_stats_latest enable row level security;

do $$ begin
  -- Policies are idempotent: create if not exists isn't available for policies pre-PG16, so catch duplicate.
  begin
    create policy "anon_select_eve_account_group" on public.eve_account_group for select to anon using (true);
  exception when duplicate_object then null; end;
  begin
    create policy "anon_select_eve_character" on public.eve_character for select to anon using (true);
  exception when duplicate_object then null; end;
  begin
    create policy "anon_select_eve_check_run" on public.eve_check_run for select to anon using (true);
  exception when duplicate_object then null; end;
  begin
    create policy "anon_select_eve_character_check" on public.eve_character_check for select to anon using (true);
  exception when duplicate_object then null; end;
  begin
    create policy "anon_select_eve_character_stats_latest" on public.eve_character_stats_latest for select to anon using (true);
  exception when duplicate_object then null; end;
end $$;
