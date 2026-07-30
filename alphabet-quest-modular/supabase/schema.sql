-- Enable required extensions
create extension if not exists pgcrypto;

-- Profiles linked to Supabase auth users
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  email text,
  avatar text,
  created_at timestamptz not null default now()
);

-- Per-user game progress
create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  score integer not null default 0,
  best_score integer not null default 0,
  coins integer not null default 0,
  streak integer not null default 0,
  highest_streak integer not null default 0,
  games_played integer not null default 0,
  selected_difficulty text not null default 'medium',
  selected_theme text not null default 'light',
  sound_settings boolean not null default true,
  completed_levels jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  statistics jsonb not null default '{}'::jsonb,
  saved_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Migration-safe: add the new columns if this schema already exists in your project
alter table public.user_progress add column if not exists streak integer not null default 0;
alter table public.user_progress add column if not exists highest_streak integer not null default 0;
alter table public.user_progress add column if not exists games_played integer not null default 0;

-- Per-user achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  unlocked_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Per-user gameplay statistics
create table if not exists public.game_statistics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
