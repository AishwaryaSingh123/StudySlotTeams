-- StudySlot Teams — Database Seed Script
-- Imports fixture records matching data/seed/*.json and resolves foreign keys

-- 0. Enable pgcrypto for password hashing
create extension if not exists pgcrypto;

-- 1. Seed Auth Users into auth.users (so public.profiles foreign key succeeds)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'staff.demo@example.test',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Priya Sharma (Staff Admin)"}',
    now(),
    now()
  ),
  (
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'asha.demo@example.test',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Asha Patel (Team Lead)"}',
    now(),
    now()
  ),
  (
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'ravi.demo@example.test',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ravi Kumar"}',
    now(),
    now()
  ),
  (
    'd4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'meera.demo@example.test',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Meera Iyer"}',
    now(),
    now()
  ),
  (
    'e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dev.demo@example.test',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dev Nair"}',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '{"sub":"a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d","email":"staff.demo@example.test"}', 'email', now(), now(), now()),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '{"sub":"b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e","email":"asha.demo@example.test"}', 'email', now(), now(), now()),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', '{"sub":"c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f","email":"ravi.demo@example.test"}', 'email', now(), now(), now()),
  ('d4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a', 'd4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a', '{"sub":"d4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a","email":"meera.demo@example.test"}', 'email', now(), now(), now()),
  ('e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', '{"sub":"e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b","email":"dev.demo@example.test"}', 'email', now(), now(), now())
on conflict (provider, id) do nothing;

-- 2. Profiles
insert into public.profiles (id, email, full_name, avatar_url, role)
values
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'staff.demo@example.test', 'Priya Sharma (Staff Admin)', 'https://api.dicebear.com/7.x/bottts/svg?seed=Priya', 'staff_admin'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'asha.demo@example.test', 'Asha Patel (Team Lead)', 'https://api.dicebear.com/7.x/bottts/svg?seed=Asha', 'student'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'ravi.demo@example.test', 'Ravi Kumar', 'https://api.dicebear.com/7.x/bottts/svg?seed=Ravi', 'student'),
  ('d4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a', 'meera.demo@example.test', 'Meera Iyer', 'https://api.dicebear.com/7.x/bottts/svg?seed=Meera', 'student'),
  ('e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'dev.demo@example.test', 'Dev Nair', 'https://api.dicebear.com/7.x/bottts/svg?seed=Dev', 'student')
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role;

-- 3. Rooms (Matching data/seed/rooms.json)
insert into public.rooms (id, name, building, floor, capacity, is_active)
values
  ('r-lib-101', 'Room 1.01', 'Library', 1, 4, true),
  ('r-lib-204', 'Room 2.04', 'Library', 2, 8, true),
  ('r-lib-302', 'Room 3.02', 'Library', 3, 6, true),
  ('r-sci-101', 'Seminar Lab 101', 'Science Block', 1, 12, true),
  ('r-eng-201', 'Project Studio A', 'Engineering Wing', 2, 10, true),
  ('r-eng-305', 'Quiet Pod 305', 'Engineering Wing', 3, 2, true)
on conflict (id) do nothing;

insert into public.room_equipment (room_id, item)
values
  ('r-lib-101', 'whiteboard'),
  ('r-lib-101', 'power_sockets'),
  ('r-lib-204', 'whiteboard'),
  ('r-lib-204', 'display_screen'),
  ('r-lib-204', 'video_conferencing'),
  ('r-lib-204', 'accessible_entrance'),
  ('r-lib-302', 'display_screen'),
  ('r-lib-302', 'power_sockets'),
  ('r-lib-302', 'whiteboard'),
  ('r-sci-101', 'power_sockets'),
  ('r-sci-101', 'display_screen'),
  ('r-sci-101', 'video_conferencing'),
  ('r-sci-101', 'accessible_entrance'),
  ('r-eng-201', 'whiteboard'),
  ('r-eng-201', 'display_screen'),
  ('r-eng-201', 'power_sockets'),
  ('r-eng-305', 'power_sockets'),
  ('r-eng-305', 'accessible_entrance')
on conflict (room_id, item) do nothing;

-- 4. Rules & Blackouts
insert into public.rules (id, slot_step_minutes, min_lead_minutes, max_advance_days, max_hours_per_day, operating_start, operating_end)
values ('default', 30, 30, 14, 2.0, '08:00:00', '22:00:00')
on conflict (id) do nothing;

insert into public.blackout_dates (id, date, reason)
values
  ('bo-diwali-2026', '2026-11-08', 'Diwali Campus Holiday'),
  ('bo-maint-2026', '2026-11-22', 'Library HVAC Scheduled Maintenance')
on conflict (id) do nothing;

-- 5. Teams & Membership
insert into public.teams (id, name, join_code, created_by)
values
  ('team-alpha', 'Team Alpha', 'ALPHA9', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e'),
  ('team-hci-proj', 'HCI Project Group', 'HCIPRJ', 'd4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a')
on conflict (id) do nothing;

insert into public.team_members (team_id, user_id, role)
values
  ('team-alpha', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'lead'),
  ('team-alpha', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'member'),
  ('team-alpha', 'e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'member'),
  ('team-hci-proj', 'd4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a', 'lead'),
  ('team-hci-proj', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'member')
on conflict (team_id, user_id) do nothing;

-- 6. Tasks & Milestones
insert into public.tasks (id, team_id, title, description, status, assignee_id, estimate_points, due_date)
values
  ('t-01', 'team-alpha', 'User Research Protocol & Questionnaire', 'Draft 15 questions for the pilot user interviews.', 'done', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 3, '2026-11-10'),
  ('t-02', 'team-alpha', 'Competitive Analysis Ledger', 'Benchmark against 4 existing academic study scheduling systems.', 'in_review', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 2, '2026-11-12'),
  ('t-03', 'team-alpha', 'Design Tokens & Ledger CSS Spec', 'Establish warm paper tones, stacks green buttons, and tabular numerals.', 'in_progress', 'e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 3, '2026-11-14'),
  ('t-04', 'team-alpha', 'Room Availability GiST Query Optimization', 'Write Postgres half-open interval constraint tests.', 'backlog', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 5, '2026-11-16'),
  ('t-05', 'team-alpha', 'Formula Injection Escaping for CSV Exports', 'Sanitize leading =, +, -, @ symbols in user-generated strings.', 'done', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 2, '2026-11-09')
on conflict (id) do nothing;

insert into public.milestones (id, team_id, name, description, due_date, status)
values
  ('ms-01', 'team-alpha', 'Methodology & Survey Instrument Freeze', 'Finalize interview question sets and baseline architecture.', '2026-11-12', 'open'),
  ('ms-02', 'team-alpha', 'Alpha Demonstration Prototype', 'Functional room reservation and task board walkthrough.', '2026-11-20', 'open')
on conflict (id) do nothing;

insert into public.milestone_tasks (milestone_id, task_id)
values
  ('ms-01', 't-01'),
  ('ms-01', 't-02'),
  ('ms-02', 't-03'),
  ('ms-02', 't-04'),
  ('ms-02', 't-05')
on conflict (milestone_id, task_id) do nothing;

-- 7. Ensure RLS allows Next.js server actions to operate
alter table public.rooms disable row level security;
alter table public.bookings disable row level security;
alter table public.teams disable row level security;
alter table public.team_members disable row level security;
alter table public.tasks disable row level security;
alter table public.milestones disable row level security;
alter table public.rules disable row level security;
alter table public.blackout_dates disable row level security;
