-- StudySlot Teams — Database Schema & Security
-- Migration 00001_initial_schema.sql

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "btree_gist";

-- ==========================================
-- 1. PROFILES & ROLES
-- ==========================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text not null,
  avatar_url text,
  role text not null check (role in ('student', 'staff_admin')) default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================
-- 2. ROOMS & INVENTORY
-- ==========================================
create table if not exists public.rooms (
  id text primary key,
  name text not null,
  building text not null,
  floor integer not null,
  capacity integer not null check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_equipment (
  room_id text references public.rooms(id) on delete cascade,
  item text not null,
  primary key (room_id, item)
);

-- ==========================================
-- 3. RULES & BLACKOUT DATES
-- ==========================================
create table if not exists public.rules (
  id text primary key default 'default',
  slot_step_minutes integer not null default 30,
  min_lead_minutes integer not null default 30,
  max_advance_days integer not null default 14,
  max_hours_per_day numeric(4,2) not null default 2.0,
  operating_start time not null default '08:00:00',
  operating_end time not null default '22:00:00',
  updated_at timestamptz not null default now()
);

create table if not exists public.blackout_dates (
  id text primary key,
  date date not null unique,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ==========================================
-- 4. TEAMS & MEMBERSHIP
-- ==========================================
create table if not exists public.teams (
  id text primary key,
  name text not null,
  join_code text not null unique,
  created_by uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_team_creator_name unique (created_by, name)
);

create table if not exists public.team_members (
  team_id text references public.teams(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null check (role in ('lead', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- ==========================================
-- 5. TASKS & MILESTONES
-- ==========================================
create table if not exists public.tasks (
  id text primary key,
  team_id text references public.teams(id) on delete cascade,
  title text not null,
  description text,
  status text not null check (status in ('backlog', 'in_progress', 'in_review', 'done')) default 'backlog',
  assignee_id uuid references public.profiles(id) on delete set null,
  estimate_points integer not null default 1 check (estimate_points >= 0),
  due_date date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestones (
  id text primary key,
  team_id text references public.teams(id) on delete cascade,
  name text not null,
  description text,
  due_date date not null,
  status text not null check (status in ('open', 'completed')) default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestone_tasks (
  milestone_id text references public.milestones(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  primary key (milestone_id, task_id)
);

-- ==========================================
-- 6. BOOKINGS & SESSIONS
-- ==========================================
create table if not exists public.bookings (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  team_id text references public.teams(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  purpose text not null,
  status text not null check (status in ('confirmed', 'cancelled')) default 'confirmed',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  constraint valid_booking_interval check (ends_at > starts_at)
);

-- GiST exclusion constraint preventing overlapping active bookings for the same room
-- Half-open range [starts_at, ends_at) enables adjacent bookings without conflict
alter table public.bookings drop constraint if exists no_room_overlap;
alter table public.bookings add constraint no_room_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed');

create table if not exists public.session_tasks (
  booking_id text references public.bookings(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  primary key (booking_id, task_id)
);

create table if not exists public.session_attendees (
  booking_id text references public.bookings(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text not null check (status in ('invited', 'accepted', 'declined')) default 'invited',
  primary key (booking_id, user_id)
);

-- ==========================================
-- 7. ACTIVITY LOG
-- ==========================================
create table if not exists public.activity_log (
  id text primary key,
  team_id text references public.teams(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  actor_name text not null,
  action text not null,
  task_id text,
  task_title text,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ==========================================
-- 8. INDEXES FOR HIGH-TRAFFIC QUERIES
-- ==========================================
create index if not exists idx_bookings_room_starts on public.bookings (room_id, starts_at);
create index if not exists idx_bookings_user_starts on public.bookings (created_by, starts_at);
create index if not exists idx_bookings_team on public.bookings (team_id);
create index if not exists idx_tasks_team on public.tasks (team_id) where (deleted_at is null);
create index if not exists idx_activity_team_created on public.activity_log (team_id, created_at desc);
create index if not exists idx_milestones_team on public.milestones (team_id);
