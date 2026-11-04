-- StudySlot Teams — Database Seed Script
-- Imports fixture records matching data/seed/*.json

-- 1. Profiles
insert into public.profiles (id, email, full_name, avatar_url, role)
values
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'staff.demo@example.test', 'Priya Sharma (Staff)', 'https://api.dicebear.com/7.x/bottts/svg?seed=Priya', 'staff_admin'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'asha.demo@example.test', 'Asha Roy (Lead)', 'https://api.dicebear.com/7.x/bottts/svg?seed=Asha', 'student'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'ravi.demo@example.test', 'Ravi Kumar', 'https://api.dicebear.com/7.x/bottts/svg?seed=Ravi', 'student'),
  ('d4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a', 'meera.demo@example.test', 'Meera Patel', 'https://api.dicebear.com/7.x/bottts/svg?seed=Meera', 'student'),
  ('e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'dev.demo@example.test', 'Dev Nair', 'https://api.dicebear.com/7.x/bottts/svg?seed=Dev', 'student')
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role;

-- 2. Rooms
insert into public.rooms (id, name, building, floor, capacity, is_active)
values
  ('r-seminar-201', 'Seminar Room 201', 'Library East Wing', 2, 8, true),
  ('r-collab-104', 'Collaboration Pod 104', 'Library West Wing', 1, 4, true),
  ('r-group-305', 'Group Study 305', 'Main Library', 3, 6, true),
  ('r-project-412', 'Project Lab 412', 'Technology Centre', 4, 12, true),
  ('r-quiet-102', 'Quiet Discussion 102', 'Library East Wing', 1, 2, true),
  ('r-media-210', 'Media Studio 210 (Maintenance)', 'Library East Wing', 2, 6, false)
on conflict (id) do nothing;

insert into public.room_equipment (room_id, item)
values
  ('r-seminar-201', 'Whiteboard'),
  ('r-seminar-201', 'Display Monitor'),
  ('r-seminar-201', 'Webcam / Mic'),
  ('r-collab-104', 'Whiteboard'),
  ('r-collab-104', 'Display Monitor'),
  ('r-group-305', 'Whiteboard'),
  ('r-group-305', 'Power Outlets at Table'),
  ('r-project-412', 'Dual Projectors'),
  ('r-project-412', 'Whiteboards (All Walls)'),
  ('r-project-412', 'Conference Phone'),
  ('r-quiet-102', 'Whiteboard'),
  ('r-media-210', 'Soundproof Paneling'),
  ('r-media-210', 'Podcast Mics')
on conflict (room_id, item) do nothing;

-- 3. Rules & Blackouts
insert into public.rules (id, slot_step_minutes, min_lead_minutes, max_advance_days, max_hours_per_day, operating_start, operating_end)
values ('default', 30, 30, 14, 2.0, '08:00:00', '22:00:00')
on conflict (id) do nothing;

insert into public.blackout_dates (id, date, reason)
values
  ('bo-diwali-2026', '2026-11-08', 'Diwali Campus Holiday'),
  ('bo-maint-2026', '2026-11-22', 'Library HVAC Scheduled Maintenance')
on conflict (id) do nothing;

-- 4. Teams & Membership
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

-- 5. Tasks & Milestones
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

-- 6. Bookings
insert into public.bookings (id, room_id, created_by, team_id, starts_at, ends_at, purpose, status)
values
  ('b-demo-01', 'r-seminar-201', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'team-alpha', '2026-11-13T04:30:00Z', '2026-11-13T06:00:00Z', 'Team Alpha Sprint Planning & Methodology Review', 'confirmed'),
  ('b-demo-02', 'r-collab-104', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', null, '2026-11-14T08:30:00Z', '2026-11-14T09:30:00Z', 'Autonomous Reading & Notes Synthesis', 'confirmed')
on conflict (id) do nothing;

insert into public.session_tasks (booking_id, task_id)
values
  ('b-demo-01', 't-02'),
  ('b-demo-01', 't-03')
on conflict (booking_id, task_id) do nothing;

insert into public.session_attendees (booking_id, user_id, status)
values
  ('b-demo-01', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'accepted'),
  ('b-demo-01', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'accepted'),
  ('b-demo-01', 'e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'accepted')
on conflict (booking_id, user_id) do nothing;

-- 7. Activity Log
insert into public.activity_log (id, team_id, actor_id, actor_name, action, task_id, task_title, detail)
values
  ('act-01', 'team-alpha', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Asha Roy (Lead)', 'task_created', 't-01', 'User Research Protocol & Questionnaire', '{"estimate": 3}'::jsonb),
  ('act-02', 'team-alpha', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Asha Roy (Lead)', 'task_completed', 't-01', 'User Research Protocol & Questionnaire', '{}'::jsonb),
  ('act-03', 'team-alpha', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Ravi Kumar', 'task_created', 't-05', 'Formula Injection Escaping for CSV Exports', '{"estimate": 2}'::jsonb),
  ('act-04', 'team-alpha', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Ravi Kumar', 'task_completed', 't-05', 'Formula Injection Escaping for CSV Exports', '{}'::jsonb)
on conflict (id) do nothing;
