-- StudySlot Teams — RLS Policies and Transactional RPCs
-- Migration 00002_rls_and_functions.sql

-- ==========================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- ==========================================
create or replace function public.is_staff_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'staff_admin'
  );
$$;

create or replace function public.is_team_member(p_team_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_lead(p_team_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and role = 'lead'
  );
$$;

-- Prevent privilege escalation on profiles
create or replace function public.prevent_self_promotion()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role is distinct from old.role then
    if not public.is_staff_admin() then
      raise exception 'Permission denied: cannot change account role';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_promotion on public.profiles;
create trigger trg_prevent_self_promotion
  before update on public.profiles
  for each row execute function public.prevent_self_promotion();

-- ==========================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ==========================================
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_equipment enable row level security;
alter table public.rules enable row level security;
alter table public.blackout_dates enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_tasks enable row level security;
alter table public.bookings enable row level security;
alter table public.session_tasks enable row level security;
alter table public.session_attendees enable row level security;
alter table public.activity_log enable row level security;

-- PROFILES POLICIES
drop policy if exists "Profiles visible to authenticated users" on public.profiles;
create policy "Profiles visible to authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update own profile name/avatar" on public.profiles;
create policy "Users can update own profile name/avatar"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ROOMS & RULES POLICIES
drop policy if exists "Rooms visible to authenticated users" on public.rooms;
create policy "Rooms visible to authenticated users"
  on public.rooms for select
  to authenticated
  using (true);

drop policy if exists "Staff can manage rooms" on public.rooms;
create policy "Staff can manage rooms"
  on public.rooms for all
  to authenticated
  using (public.is_staff_admin());

drop policy if exists "Room equipment visible to authenticated users" on public.room_equipment;
create policy "Room equipment visible to authenticated users"
  on public.room_equipment for select
  to authenticated
  using (true);

drop policy if exists "Staff can manage room equipment" on public.room_equipment;
create policy "Staff can manage room equipment"
  on public.room_equipment for all
  to authenticated
  using (public.is_staff_admin());

drop policy if exists "Rules visible to authenticated users" on public.rules;
create policy "Rules visible to authenticated users"
  on public.rules for select
  to authenticated
  using (true);

drop policy if exists "Staff can manage rules" on public.rules;
create policy "Staff can manage rules"
  on public.rules for all
  to authenticated
  using (public.is_staff_admin());

drop policy if exists "Blackouts visible to authenticated users" on public.blackout_dates;
create policy "Blackouts visible to authenticated users"
  on public.blackout_dates for select
  to authenticated
  using (true);

drop policy if exists "Staff can manage blackouts" on public.blackout_dates;
create policy "Staff can manage blackouts"
  on public.blackout_dates for all
  to authenticated
  using (public.is_staff_admin());

-- TEAMS & MEMBERS POLICIES
drop policy if exists "Team members and staff can view teams" on public.teams;
create policy "Team members and staff can view teams"
  on public.teams for select
  to authenticated
  using (public.is_team_member(id) or public.is_staff_admin());

drop policy if exists "Authenticated users can create teams" on public.teams;
create policy "Authenticated users can create teams"
  on public.teams for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "Team members and staff can view team memberships" on public.team_members;
create policy "Team members and staff can view team memberships"
  on public.team_members for select
  to authenticated
  using (public.is_team_member(team_id) or public.is_staff_admin());

drop policy if exists "Users can join teams" on public.team_members;
create policy "Users can join teams"
  on public.team_members for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_team_lead(team_id));

-- TASKS & MILESTONES POLICIES
drop policy if exists "Team members can view tasks" on public.tasks;
create policy "Team members can view tasks"
  on public.tasks for select
  to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "Team members can create and modify tasks" on public.tasks;
create policy "Team members can create and modify tasks"
  on public.tasks for all
  to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "Team members can view milestones" on public.milestones;
create policy "Team members can view milestones"
  on public.milestones for select
  to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "Team lead can manage milestones" on public.milestones;
create policy "Team lead can manage milestones"
  on public.milestones for all
  to authenticated
  using (public.is_team_lead(team_id));

drop policy if exists "Team members can view milestone tasks" on public.milestone_tasks;
create policy "Team members can view milestone tasks"
  on public.milestone_tasks for select
  to authenticated
  using (
    exists (
      select 1 from public.milestones m
      where m.id = milestone_id and public.is_team_member(m.team_id)
    )
  );

drop policy if exists "Team lead can manage milestone tasks" on public.milestone_tasks;
create policy "Team lead can manage milestone tasks"
  on public.milestone_tasks for all
  to authenticated
  using (
    exists (
      select 1 from public.milestones m
      where m.id = milestone_id and public.is_team_lead(m.team_id)
    )
  );

-- BOOKINGS POLICIES
drop policy if exists "Authenticated users can view bookings" on public.bookings;
create policy "Authenticated users can view bookings"
  on public.bookings for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can create personal or team bookings" on public.bookings;
create policy "Authenticated users can create personal or team bookings"
  on public.bookings for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and (team_id is null or public.is_team_member(team_id))
  );

drop policy if exists "Booking creator or staff can cancel booking" on public.bookings;
create policy "Booking creator or staff can cancel booking"
  on public.bookings for update
  to authenticated
  using (auth.uid() = created_by or public.is_staff_admin());

drop policy if exists "Team members can view session tasks" on public.session_tasks;
create policy "Team members can view session tasks"
  on public.session_tasks for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and (b.team_id is null or public.is_team_member(b.team_id))
    )
  );

drop policy if exists "Team members can view session attendees" on public.session_attendees;
create policy "Team members can view session attendees"
  on public.session_attendees for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and (b.team_id is null or public.is_team_member(b.team_id))
    )
  );

drop policy if exists "Team members can view activity log" on public.activity_log;
create policy "Team members can view activity log"
  on public.activity_log for select
  to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "Team members can append activity log" on public.activity_log;
create policy "Team members can append activity log"
  on public.activity_log for insert
  to authenticated
  with check (public.is_team_member(team_id) and auth.uid() = actor_id);

-- ==========================================
-- 3. TRANSACTIONAL RPC FUNCTIONS
-- ==========================================

-- Atomic booking creation with exclusion constraint handling
create or replace function public.rpc_create_booking(
  p_id text,
  p_room_id text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_purpose text,
  p_team_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_new_booking public.bookings%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED', 'message', 'Unauthenticated request.');
  end if;

  -- Ensure room exists and is active
  if not exists (select 1 from public.rooms where id = p_room_id and is_active = true) then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Selected room is not active or does not exist.');
  end if;

  -- Insert booking (database GiST exclusion constraint guarantees no room conflict)
  begin
    insert into public.bookings (id, room_id, created_by, team_id, starts_at, ends_at, purpose, status)
    values (p_id, p_room_id, v_user_id, p_team_id, p_starts_at, p_ends_at, p_purpose, 'confirmed')
    returning * into v_new_booking;
  exception
    when exclusion_violation then
      return jsonb_build_object(
        'ok', false,
        'code', 'CONFLICT',
        'message', 'That slot was just booked by someone else. Please choose an adjacent or later slot.'
      );
  end;

  return jsonb_build_object('ok', true, 'data', to_jsonb(v_new_booking));
end;
$$;

-- Atomic team creation with initial lead member
create or replace function public.rpc_create_team(
  p_team_id text,
  p_name text,
  p_join_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_team public.teams%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED', 'message', 'Unauthenticated request.');
  end if;

  -- Check team name uniqueness per creator
  if exists (select 1 from public.teams where created_by = v_user_id and lower(name) = lower(p_name)) then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT', 'message', 'You already lead a team with this name.');
  end if;

  -- Insert team
  insert into public.teams (id, name, join_code, created_by)
  values (p_team_id, p_name, p_join_code, v_user_id)
  returning * into v_team;

  -- Atomically insert creator as lead
  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, v_user_id, 'lead');

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object('team', to_jsonb(v_team), 'joinCode', p_join_code)
  );
end;
$$;
