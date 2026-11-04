# StudySlot Teams — plan.md

Implementation plan for StudySlot Teams. Read together with `design.md`; feature IDs, roles, routes, entities and status values are identical in both files.

**Status of this document:** a plan. Nothing below has been built, run or tested. Every check is marked *planned* until it is actually executed and recorded in section H5.

---

## A. Scope and success criteria

### A1. Problem and users

Students working on group projects book study rooms ad hoc, so rooms get double-booked or hogged, and team work (tasks, deadlines, who did what) is scattered across chat apps with no visible record. Staff lack a simple way to set room rules and see usage.

| Role | Description |
|------|-------------|
| Student | Searches rooms, books for themselves, belongs to zero or more teams, updates own tasks |
| Team Lead | A student with `team_members.role = 'lead'` in one team: books team sessions, manages milestones, assigns and edits tasks, manages members |
| Staff Admin | Manages rooms, rules and views usage; has no team membership |

**Main workflows:** (1) find and book a room; (2) book a team session with agenda tasks; (3) plan tasks and milestones and see them on one calendar; (4) review contributions and export a report; (5) staff set rules and review usage.

### A2. Confirmed constraints and explicit assumptions

**Confirmed (from the brief):** full-stack web app; at least six meaningful features; each member demonstrates two; GitHub link submitted; report contains screenshots and division of work; if PostgreSQL is used, use Supabase; the accessibility rubric in section H6 applies; Next.js + Supabase stack; **first MVP uses mock data/files instead of Supabase, then Supabase is added.**

**Assumptions (not facts):** three members (Member A/B/C) until names are supplied; deadline, budget, hosting and team experience are unknown, so milestones are ordered, not dated; campus time zone `Asia/Kolkata`; demo data is fictional.

**Important honesty note on the mock phase:** a mock-data MVP is a stepping stone, not the final submission. The brief requires persistent data and backend authorization. Phase 1 therefore still runs server-side logic behind a repository interface and persists to a local JSON file; Phase 2 swaps in Supabase. The submitted project must be Phase 2 complete (see K2).

### A3. Scope

**Core (F1–F6):** see section B.
**Supporting (not counted as features):** sign-in/sign-out, demo accounts, layout shell.
**Stretch (cut first, in this order):** (1) anonymous peer feedback rounds, (2) check-in and no-show tracking, (3) waitlist with auto-promotion on cancellation, (4) room photos. Stretch features are not required for completion and are not in the traceability table.
**Exclusions:** email notifications, payments, native apps, AI features, drag-and-drop board, dark mode, external calendar sync, real student data.

### A4. Definition of completion

The project is complete when every item in section K2 is ticked with evidence: all six features work end to end on Supabase, every member can demo two features, authorization is enforced by the database and server (not just the UI), the rubric items in H6 are verified, setup is reproducible from the README, and the GitHub link and report evidence are ready.

---

## B. Feature specifications and team ownership

Shared vocabulary:
- `bookings.status`: `confirmed`, `cancelled`
- `tasks.status`: `todo`, `in_progress`, `in_review`, `done`
- `milestones.status`: `open`, `completed`
- `team_members.role`: `member`, `lead`
- `rooms.status`: `active`, `inactive`

Ownership (provisional): **Member A: F1 + F2 · Member B: F3 + F4 · Member C: F5 + F6.** Each member owns their features' UI, repository/server logic, database objects and tests. Shared setup is section G (milestone M0 and shared tasks).

### F1 — Room search and conflict-free booking (Member A)

- **User outcome / story:** As a Student, I find a room by capacity, equipment and time and book it, and the system never lets two confirmed bookings overlap.
- **Screens/components:** S2 `/rooms`, S3 `/rooms/[roomId]`, S4 `/rooms/[roomId]/book`, S5 `/bookings`; `SlotTimeline`, `DataTable`, filter form, `BookingStamp`, `Dialog`.
- **Backend operations:** `searchRooms(filters)`, `getRoomAvailability(roomId, date)`, `createBooking(input)`, `cancelBooking(bookingId)`, `listMyBookings()`.
- **Data:** `rooms`, `room_equipment`, `bookings`, `rules`, `blackout_dates`.
- **Permissions:** any signed-in Student/Team Lead can search and book for themselves; only the booking owner (or the team's lead for team bookings, or Staff Admin) can cancel. Staff Admin can search but not book.
- **Validation:** end after start; both within room opening hours; 30-minute steps; duration ≤ `rules.max_booking_hours`; user's total hours that day ≤ `rules.max_hours_per_day`; no blackout overlap; room `active`; start in the future; purpose ≤120 chars.
- **Happy path:** filter → pick room → pick slot → submit → stamp + confirmation → appears in My bookings.
- **Failure cases:** slot taken concurrently (conflict error with next free slot); daily limit reached; blackout date; room inactive; network failure; unauthenticated.
- **Dependencies:** M0 shell and auth; F6 supplies rooms and rules (seeded early so F1 does not wait).
- **Acceptance criteria:**
  1. Filtering by capacity ≥6 and “Whiteboard” returns only matching active rooms.
  2. Booking an overlapping slot is rejected; the rejection comes from the data layer, not only the UI (Phase 1: store-level check under a lock; Phase 2: Postgres exclusion constraint).
  3. Two simultaneous requests for the same slot yield exactly one confirmed booking.
  4. Daily limit and blackout rules reject with specific text messages.
  5. Cancelling frees the slot immediately.
  6. A user cannot cancel another user's booking (verified by test).
- **Demo scenario:** Student searches “capacity 6, whiteboard, Thu 14:00–15:00”, books Room 2.04, then a second browser tries the same slot and sees the conflict message with the next free slot.

### F2 — Team session booking (Member A)

- **User outcome / story:** As a Team Lead, I create/join a team and book a room for the whole team, attaching agenda tasks and attendees.
- **Screens/components:** S6 `/teams`, S7 `/teams/[teamId]`, S8 `/teams/[teamId]/sessions`, S9 `/teams/[teamId]/sessions/new`; team forms, join-code form, agenda/attendee checkbox lists, availability radio list (reuses F1 components).
- **Backend operations:** `createTeam(input)`, `joinTeam(code)`, `getTeam(teamId)`, `listTeamSessions(teamId)`, `createTeamSession(input)` (creates a `bookings` row with `team_id` plus `session_tasks`/`session_attendees`), `cancelTeamSession(bookingId)`, `removeMember(teamId, userId)`.
- **Data:** `teams`, `team_members`, `bookings` (with `team_id`), `session_tasks`, `session_attendees`.
- **Permissions:** any Student can create a team (becomes `lead`) or join with a code (becomes `member`); only the lead books/cancels team sessions and removes members; attendees and agenda tasks must belong to the same team.
- **Validation:** team name 3–60 chars, unique per creator; join code valid (6 chars) and not already a member; room capacity ≥ number of attendees; all F1 booking rules apply; agenda tasks must be non-`done` tasks of that team (a `done` task is rejected).
- **Happy path:** lead opens new session → picks time → chooses room → ticks agenda tasks and attendees → booked → appears in team sessions.
- **Failure cases:** capacity exceeded; conflict (same as F1); non-lead attempts booking; invalid join code; attendee not in team.
- **Dependencies:** F1 booking engine; F3 tasks (agenda list). Early milestone uses a few seeded tasks so F2 is not blocked by F3.
- **Acceptance criteria:**
  1. Creating a team makes the creator `lead` and generates a join code.
  2. Joining with a valid code adds a `member`; an invalid code shows a text error.
  3. Team session booking creates one booking that blocks the room for everyone (verified by F1 search showing “Booked”).
  4. Agenda tasks and attendees are stored and shown in the sessions table.
  5. A `member` cannot book a team session (UI hides, server/database rejects).
  6. Capacity < attendees is rejected.
- **Demo scenario:** Team Lead books Room 2.04 for 5 attendees with two agenda tasks; sessions list shows the expanded agenda; a non-lead team member sees the session read-only.

### F3 — Task board (Member B)

- **User outcome / story:** As a team member, I create and assign tasks with due dates and move them through statuses using a keyboard-friendly “Move to” control.
- **Screens/components:** S10 `/teams/[teamId]/board`; `TaskRow`, `MoveToSelect`, task dialog, filter toolbar, `StatusBadge`.
- **Backend operations:** `listTasks(teamId, filters)`, `createTask(input)`, `updateTask(taskId, patch)`, `moveTask(taskId, status)`, `deleteTask(taskId)` (soft delete), `restoreTask(taskId)`.
- **Data:** `tasks` (including `points`, `due_date`, `assignee_id`, `completed_at`, `deleted_at`), `activity_log` (written on create/move/complete).
- **Permissions:** team members read all team tasks; members may move tasks assigned to them; the lead may create, edit, assign, move and delete any task. (A member can create a task assigned to themselves.)
- **Validation:** title 1–80 chars; description ≤500; assignee must be a team member; due date optional and not before today on creation; points 1–5; status in allowed values and allowed transition (see below).
- **Status transitions:** any status may move to any other (small board; avoids blocking users) except that `completed_at` is set when entering `done` and cleared when leaving it.
- **Happy path:** create task → assign → Move to “In progress” → “In review” → “Done”; activity logged.
- **Failure cases:** non-assignee non-lead tries to move; stale update (task changed since opened → conflict message using `updated_at` check); assignee not in team.
- **Dependencies:** F2 teams/members (seeded teams for early work).
- **Acceptance criteria:**
  1. Tasks can be created with title, assignee, due date, points.
  2. “Move to” changes status, updates the badge, and announces the result in a live region.
  3. Board is fully operable via keyboard with no drag-and-drop.
  4. Overdue tasks show “Overdue by N days” in text.
  5. Unauthorised moves are rejected server-side/by policy.
  6. Delete is soft with an Undo option for 8 seconds.
- **Demo scenario:** lead creates “Draft survey questions” for Asha, Asha moves it to In review via keyboard only, and the live message and badge update.

### F4 — Milestones and unified calendar (Member B)

- **User outcome / story:** As a team member, I track project deadlines and see tasks, milestones and room sessions on a single schedule.
- **Screens/components:** S11 `/teams/[teamId]/milestones`, S12 `/teams/[teamId]/calendar`; milestone dialog, Agenda view, Week grid, type filters, view tabs.
- **Backend operations:** `listMilestones(teamId)`, `createMilestone(input)`, `updateMilestone(id, patch)`, `completeMilestone(id)`, `getCalendarEntries(teamId, rangeStart, rangeEnd)` (merges tasks with due dates, milestones, team sessions).
- **Data:** `milestones`, `milestone_tasks`, and read access to `tasks` and `bookings`.
- **Permissions:** members read; only the lead creates/edits/completes milestones.
- **Validation:** name 1–80 chars; due date required; description ≤300; linked tasks belong to the team.
- **Happy path:** lead creates “Prototype review” due 20 Nov linked to three tasks → appears in milestones and calendar; completes it later.
- **Failure cases:** non-lead attempts creation; invalid date; empty calendar range; network failure.
- **Dependencies:** F3 (tasks), F2 (sessions) for calendar content; F1 bookings table.
- **Acceptance criteria:**
  1. Milestones list shows progress as text (“3 of 5 linked tasks done”) and derived “Overdue” status.
  2. Calendar Agenda view lists tasks (due), milestones and room sessions grouped by day, each with a text type label.
  3. Week view shows the same entries; both views reachable and operable by keyboard.
  4. Filters hide/show entry types.
  5. Only the lead can create or complete milestones (server-side).
- **Demo scenario:** open Agenda view showing a task due Thursday, the Room 2.04 session that day and the milestone on Friday; switch to Week view with the keyboard.

### F5 — Contribution log and report (Member C)

- **User outcome / story:** As a team member, I see each member's completed work and workload and export a team report for our division-of-work section.
- **Screens/components:** S13 `/teams/[teamId]/contributions`; workload table, activity list, period selector, export button.
- **Backend operations:** `getWorkloadSummary(teamId, period)`, `listActivity(teamId, period)`, `exportContributionReport(teamId, period, format)` returning CSV or printable HTML.
- **Data:** read access to `tasks`, `activity_log`, `team_members`, `profiles`. (No new tables; summary is derived by query/view.)
- **Permissions:** team members only; cross-team access is denied.
- **Validation:** period ∈ {`all`, `last_7_days`, `custom`}; custom start ≤ end; `format` ∈ {`csv`, `html`}.
- **Happy path:** choose Whole project → view totals → download CSV.
- **Failure cases:** empty team/no completed tasks (empty-state text); invalid dates; export failure (retry message); non-member access (denied).
- **Dependencies:** F3 data (`completed_at`, `points`, `activity_log`).
- **Acceptance criteria:**
  1. Summary shows per member: assigned, done, points done, open points, share of completed points (percentage text).
  2. Numbers match the underlying tasks (verified by a unit test on seeded data).
  3. Activity list shows who changed what and when, newest first.
  4. CSV report contains the same totals and a task list per member with completion dates.
  5. A member of team X cannot read team Y's contributions (tested).
- **Demo scenario:** after tasks were completed during the demo, open Contributions, show the numbers changing, and download the report.

### F6 — Staff room and rules management (Member C)

- **User outcome / story:** As Staff Admin, I add or edit rooms, set limits and blackout dates, and view usage.
- **Screens/components:** S14 `/staff/rooms`, `/staff/rooms/new`, `/staff/rooms/[roomId]/edit`, S15 `/staff/rules`, S16 `/staff/usage`; room form, rules form, blackout table, usage table.
- **Backend operations:** `listRoomsAdmin()`, `createRoom(input)`, `updateRoom(id, patch)`, `setRoomStatus(id, status)`, `getRules()`, `updateRules(input)`, `createBlackout(input)`, `deleteBlackout(id)`, `getUsageReport(period)`.
- **Data:** `rooms`, `room_equipment`, `rules`, `blackout_dates`, read access to `bookings`.
- **Permissions:** Staff Admin only (role stored in `profiles.role = 'staff_admin'`); all other roles denied at server/RLS level.
- **Validation:** name 1–60 chars, unique per building; capacity 1–30; opening before closing; max hours per day 1–8; max booking length ≤ max hours per day; blackout end ≥ start; reason required.
- **Happy path:** add Room 3.01 → set max hours per day to 2 → add blackout 17 Nov → check usage.
- **Failure cases:** non-staff access; invalid ranges; deactivating a room with future bookings (warning, confirm; bookings stay confirmed until cancelled).
- **Dependencies:** M0 auth/roles; seeded rooms/rules unblock F1.
- **Acceptance criteria:**
  1. Staff can create and edit a room; it appears in F1 search immediately.
  2. Changing max hours per day changes F1 validation for new bookings.
  3. A blackout date makes the room show “Unavailable: {reason}” and rejects bookings.
  4. Usage table shows bookings, hours booked, utilisation and cancellations per room, matching seed data (unit-tested).
  5. A Student visiting `/staff/rooms` sees permission-denied, and direct calls to staff operations are rejected.
- **Demo scenario:** staff adds a blackout for Mon 17 Nov; student then fails to book that day with the clear message.

### B-summary: ownership and balance

| Member | Features | UI | Backend/data | Tests |
|--------|----------|----|--------------|-------|
| A | F1, F2 | S2–S9 | booking engine, teams, sessions | booking rules, concurrency, team RLS |
| B | F3, F4 | S10–S12 | tasks, milestones, calendar merge | task permissions, calendar merge |
| C | F5, F6 | S13–S16 | summary queries, export, rooms/rules | summary math, staff access |
| Shared | M0 setup, Supabase migration phase, accessibility pass, README, report | | | |

Balance note: A's features are the most complex (concurrency); to compensate, B takes the shared design-system component library tasks (G, M0.3) and C takes the CI/README and Supabase seed script tasks (M0.5, M4.1).

---

## C. Architecture and stack

### C1. Recommended stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js (App Router) + TypeScript | One codebase for UI and server logic; server components and server actions keep privileged code off the browser; generates the HTML shell required by the rubric |
| Styling | CSS custom properties + CSS Modules (or plain CSS in `globals.css`) | Direct mapping of `design.md` tokens; no extra design framework to fight |
| Phase 1 data | **Mock repository** over JSON seed files in `data/` with file-backed persistence (`data/.runtime/db.json`, git-ignored) | Meets the instruction to start without Supabase; still goes through server-only code |
| Phase 2 data | **Supabase** (Postgres, Auth, Row Level Security) | Required for PostgreSQL; exclusion constraint for double-booking; RLS for authorization |
| Validation | Zod | Same schemas validate server action input in both phases |
| Testing | Vitest (unit/integration), Playwright (E2E, keyboard checks), axe-core via Playwright (automated a11y), pgTAP or SQL test scripts (RLS/constraints, Phase 2) | Standard, no paid services |
| Hosting (suggested, not fixed) | Vercel for the Next.js app + Supabase cloud project | Common pairing; *hosting preference is unknown, so confirm; local run via README is the guaranteed path* |

*Version-sensitive items* (Next.js major version, Supabase SSR package name/API, `next/font` availability of chosen fonts) **must be verified against official documentation at M0 and recorded in the README.** No version numbers are claimed here.

### C2. Data-access abstraction (the key to “mock first, Supabase second”)

All UI and server actions call a **repository interface** defined in `lib/repo/types.ts` (for example `RoomRepo`, `BookingRepo`, `TeamRepo`, `TaskRepo`, `MilestoneRepo`, `ReportRepo`, `AuthRepo`). Two implementations exist:

- `lib/repo/mock/*` — reads/writes `data/seed/*.json` copied to `data/.runtime/db.json`; enforces the same business rules (overlap check under an in-process lock, role checks) so tests are meaningful.
- `lib/repo/supabase/*` — Supabase client calls and RPC functions.

Selection is by `DATA_BACKEND=mock | supabase` in the environment. Server actions and tests run against whichever backend is selected; **the same Vitest contract tests run against both implementations** (the shared test suite is parameterised by backend). This is the mechanism that proves Phase 2 did not change behaviour.

Limitations of the mock phase (stated for the report): single process only, no real concurrency across servers, file system must be writable (works locally, not on typical serverless hosting), mock auth is not a security boundary. These are why Phase 2 exists.

### C3. Request flow and trust boundaries

```
Browser (React UI, no secrets)
   │  form submit / fetch to Server Action or Route Handler
   ▼
Next.js server (trusted)  ── validate (Zod) ── authorise (role, team membership)
   │
   ├─ Phase 1: repository/mock ──► data/.runtime/db.json
   └─ Phase 2: repository/supabase ──► Supabase Postgres (RLS + constraints + RPC)
                                        ▲
Browser may read via Supabase anon key only through RLS-protected tables (optional, Phase 2)
```

| Runs in the browser | Runs on the trusted server |
|---------------------|----------------------------|
| Rendering, filter UI state, optimistic UI hints, motion | Session/identity resolution, validation, authorisation checks, booking creation, cancellation, report generation, any use of the service-role key |

Trust boundaries: (1) browser ↔ Next.js server; (2) Next.js server ↔ Supabase (user-scoped JWT for normal operations, service role only in server-only admin code); (3) Supabase RLS/constraints are the last line of defence even if server code is wrong. UI hiding of buttons is a convenience, not enforcement.

### C4. Responsibilities by service

| Concern | Phase 1 (mock) | Phase 2 (Supabase) |
|---------|----------------|--------------------|
| Auth | Mock sign-in with seeded demo users, signed HTTP-only cookie holding user id (clearly labelled as non-production) | Supabase Auth (email/password); session via SSR cookie helpers |
| Authorisation | Role/membership checks in repository layer | RLS policies + server checks |
| Persistence | JSON file | Postgres |
| Conflict prevention | Overlap check under lock | `EXCLUDE USING gist` on room + time range, filtered to `confirmed` |
| Storage | None | None (no file uploads in core scope; if room photos are added, a private bucket with size/type limits and RLS) |
| Deployment | `npm run dev` / `npm run build && npm start` locally | Vercel + Supabase project; auth redirect URLs configured |

### C5. Repository structure

```
studyslot-teams/
├─ README.md
├─ .env.example
├─ package.json
├─ design.md  plan.md            # kept in /docs if preferred
├─ app/
│  ├─ layout.tsx                 # <html lang>, <body>, header/nav/main/footer, skip link
│  ├─ globals.css                # design tokens, motion tokens, reduced-motion rules
│  ├─ login/
│  ├─ rooms/ …                   # F1
│  ├─ bookings/
│  ├─ teams/[teamId]/…           # F2–F5
│  └─ staff/…                    # F6
├─ components/                   # Button, TextField, DataTable, SlotTimeline, Dialog, Toast, …
├─ lib/
│  ├─ repo/types.ts
│  ├─ repo/mock/
│  ├─ repo/supabase/
│  ├─ auth/
│  ├─ validation/                # Zod schemas
│  ├─ rules/                     # pure booking-rule functions (shared)
│  ├─ motion/                    # useReducedMotion, flip.ts
│  └─ time/                      # campus time zone helpers
├─ data/seed/                    # JSON seed (Phase 1) + seed.sql source data
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql
├─ tests/
│  ├─ unit/
│  ├─ contract/                  # run against both backends
│  ├─ db/                        # SQL/RLS tests (Phase 2)
│  └─ e2e/
└─ docs/screenshots/             # captured from the real app only
```

---

## D. Data model

Types are Postgres-oriented (Phase 2). The Phase 1 JSON store mirrors table and column names.

### D1. Tables

**`profiles`** — one row per user  
`id uuid PK (= auth.users.id)`, `full_name text NOT NULL`, `email text NOT NULL UNIQUE`, `role text NOT NULL CHECK (role IN ('student','staff_admin')) DEFAULT 'student'`, `created_at timestamptz DEFAULT now()`.  
(“Team Lead” is not a global role; it is `team_members.role = 'lead'`.)

**`rooms`**  
`id uuid PK`, `name text NOT NULL`, `building text NOT NULL`, `floor int NOT NULL`, `capacity int NOT NULL CHECK (capacity BETWEEN 1 AND 30)`, `opens_at time NOT NULL`, `closes_at time NOT NULL CHECK (closes_at > opens_at)`, `status text NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active'`, `UNIQUE (building, name)`.

**`room_equipment`**  
`room_id uuid FK→rooms ON DELETE CASCADE`, `equipment text NOT NULL CHECK (equipment IN ('whiteboard','display_screen','power_sockets','video_conferencing','accessible_entrance'))`, `PRIMARY KEY (room_id, equipment)`.

**`rules`** (single-row table: `id int PK CHECK (id = 1)`)  
`max_hours_per_day numeric NOT NULL CHECK (max_hours_per_day BETWEEN 1 AND 8) DEFAULT 2`, `max_booking_hours numeric NOT NULL DEFAULT 2`, `slot_minutes int NOT NULL DEFAULT 30`, `CHECK (max_booking_hours <= max_hours_per_day)`.

**`blackout_dates`**  
`id uuid PK`, `room_id uuid NULL FK→rooms ON DELETE CASCADE` (NULL = all rooms), `start_date date NOT NULL`, `end_date date NOT NULL CHECK (end_date >= start_date)`, `reason text NOT NULL`.

**`teams`**  
`id uuid PK`, `name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60)`, `project_name text NOT NULL`, `join_code char(6) NOT NULL UNIQUE`, `created_by uuid FK→profiles`, `created_at timestamptz`.

**`team_members`**  
`team_id uuid FK→teams ON DELETE CASCADE`, `user_id uuid FK→profiles ON DELETE CASCADE`, `role text NOT NULL CHECK (role IN ('member','lead')) DEFAULT 'member'`, `joined_at timestamptz`, `PRIMARY KEY (team_id, user_id)`. A partial unique index enforces **one lead per team**: `UNIQUE (team_id) WHERE role = 'lead'`.

**`bookings`**  
`id uuid PK`, `room_id uuid NOT NULL FK→rooms`, `booked_by uuid NOT NULL FK→profiles`, `team_id uuid NULL FK→teams`, `starts_at timestamptz NOT NULL`, `ends_at timestamptz NOT NULL`, `purpose text CHECK (char_length(purpose) <= 120)`, `status text NOT NULL CHECK (status IN ('confirmed','cancelled')) DEFAULT 'confirmed'`, `created_at`, `cancelled_at`, `CHECK (ends_at > starts_at)`.  
**Double-booking prevention:** `EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed')` (requires the `btree_gist` extension).  
Status transition: `confirmed → cancelled` only; `cancelled` is terminal (enforced by trigger/RPC).

**`session_tasks`**  
`booking_id uuid FK→bookings ON DELETE CASCADE`, `task_id uuid FK→tasks ON DELETE CASCADE`, `PRIMARY KEY (booking_id, task_id)`.

**`session_attendees`**  
`booking_id uuid FK→bookings ON DELETE CASCADE`, `user_id uuid FK→profiles ON DELETE CASCADE`, `PRIMARY KEY (booking_id, user_id)`.

**`tasks`**  
`id uuid PK`, `team_id uuid NOT NULL FK→teams ON DELETE CASCADE`, `title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80)`, `description text CHECK (char_length(description) <= 500)`, `assignee_id uuid NULL FK→profiles ON DELETE SET NULL`, `due_date date NULL`, `points int NOT NULL DEFAULT 1 CHECK (points BETWEEN 1 AND 5)`, `status text NOT NULL CHECK (status IN ('todo','in_progress','in_review','done')) DEFAULT 'todo'`, `completed_at timestamptz NULL`, `created_by uuid FK→profiles`, `created_at`, `updated_at`, `deleted_at timestamptz NULL` (soft delete).  
`CHECK ((status = 'done') = (completed_at IS NOT NULL))`.

**`milestones`**  
`id uuid PK`, `team_id uuid FK→teams ON DELETE CASCADE`, `name text NOT NULL`, `description text`, `due_date date NOT NULL`, `status text NOT NULL CHECK (status IN ('open','completed')) DEFAULT 'open'`, `completed_at timestamptz NULL`.

**`milestone_tasks`**  
`milestone_id uuid FK→milestones ON DELETE CASCADE`, `task_id uuid FK→tasks ON DELETE CASCADE`, `PRIMARY KEY (milestone_id, task_id)`.

**`activity_log`**  
`id uuid PK`, `team_id uuid FK→teams ON DELETE CASCADE`, `actor_id uuid FK→profiles`, `task_id uuid NULL`, `action text NOT NULL CHECK (action IN ('task_created','task_moved','task_completed','task_deleted','task_restored'))`, `detail jsonb`, `created_at timestamptz DEFAULT now()`.

### D2. Indexes (tied to queries)

| Index | Query served |
|-------|--------------|
| GiST exclusion index on `bookings` (above) | Conflict check and overlap lookups for F1/F2 |
| `bookings (booked_by, starts_at)` | `listMyBookings`, daily-hours sum |
| `bookings (team_id, starts_at)` WHERE `team_id IS NOT NULL` | Team sessions list, calendar |
| `room_equipment (equipment, room_id)` | Equipment filter |
| `tasks (team_id, status) WHERE deleted_at IS NULL` | Board lists |
| `tasks (team_id, due_date) WHERE deleted_at IS NULL` | Calendar and overdue |
| `activity_log (team_id, created_at DESC)` | Activity list |
| `blackout_dates (start_date, end_date)` | Blackout overlap checks |

### D3. Deletion behaviour

Deleting a team cascades to members, tasks, milestones and log; bookings keep history by `team_id` being set to NULL (`ON DELETE SET NULL`) — decision: teams are not deleted in the MVP UI, so this is a safety net. Profiles are not deleted in the MVP. Tasks use soft delete (`deleted_at`) so contribution history remains consistent; permanently removing is out of scope. Bookings are cancelled, never deleted.

### D4. Transactions and constraints required

| Risk | Mechanism |
|------|-----------|
| Double booking | Exclusion constraint (Phase 2); lock + overlap check (Phase 1); contract test fires parallel requests |
| Daily-hours limit race | `create_booking` RPC takes an advisory lock keyed on user and date, sums existing confirmed hours, then inserts in the same transaction |
| Invalid state transitions | Trigger/RPC rejects `cancelled → confirmed`; `done ↔ completed_at` CHECK |
| Team session consistency | `create_team_session` RPC inserts booking + `session_tasks` + `session_attendees` in one transaction; verifies lead role, same-team tasks/attendees, and capacity |
| Inconsistent task update | `updated_at` compared in `UPDATE … WHERE updated_at = :seen` (optimistic concurrency) |

---

## E. Backend and API contracts

Next.js **server actions** are the main interface (no separate REST API). Each returns a discriminated result `{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }`. In Phase 2 the heavy operations call **Postgres RPC functions**; simple reads use the Supabase client under RLS.

Common errors: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `RULE_VIOLATION`, `NETWORK` (client-side).

| Operation | Inputs (validated by Zod) | Success response | Auth / authorisation | Specific errors | Effect |
|-----------|---------------------------|------------------|----------------------|-----------------|--------|
| `searchRooms` | `date`, `startTime`, `endTime`, `minCapacity?`, `equipment[]?`, `building?` | `{ rooms: [{id,name,building,floor,capacity,equipment[],availability: 'free'|'booked'|'blocked', blockedReason?, nextFreeSlot?}] }` | Signed in | `VALIDATION_FAILED` | None |
| `getRoomAvailability` | `roomId`, `date` | `{ openingHours, slots:[{start,end,state}] }` | Signed in | `NOT_FOUND` | None |
| `createBooking` (RPC `create_booking`) | `roomId`, `startsAt`, `endsAt`, `purpose?` | `{ booking }` | Student/Team Lead; booker = caller (never taken from input) | `CONFLICT` (+`nextFreeSlot`), `RULE_VIOLATION` (daily limit, max length, blackout, outside hours, inactive room) | Inserts `bookings` row |
| `cancelBooking` | `bookingId` | `{ booking }` | Owner, team lead (team bookings) or Staff Admin | `FORBIDDEN`, `NOT_FOUND`, `RULE_VIOLATION` (past or already cancelled) | status → `cancelled`, `cancelled_at` set |
| `listMyBookings` | none | `{ upcoming[], past[] }` | Signed in; own rows only | — | None |
| `createTeam` | `name`, `projectName` | `{ team, joinCode }` | Student | `VALIDATION_FAILED` | Inserts team + lead membership |
| `joinTeam` | `code` | `{ team }` | Student | `NOT_FOUND` (code), `CONFLICT` (already member) | Inserts membership |
| `createTeamSession` (RPC `create_team_session`) | `teamId`, `roomId`, `startsAt`, `endsAt`, `taskIds[]`, `attendeeIds[]`, `note?` | `{ booking, tasks[], attendees[] }` | Team lead of `teamId` | `FORBIDDEN`, `CONFLICT`, `RULE_VIOLATION` (capacity, rules), `VALIDATION_FAILED` | Booking + session rows in one transaction |
| `listTeamSessions` | `teamId` | `{ sessions[] }` | Team member | `FORBIDDEN` | None |
| `removeMember` | `teamId`, `userId` | `{ ok }` | Team lead | `FORBIDDEN`, `RULE_VIOLATION` (cannot remove the lead) | Deletes membership; unassigns tasks (assignee NULL) |
| `listTasks` | `teamId`, `assigneeId?`, `due?` | `{ tasks[] }` | Team member | `FORBIDDEN` | None |
| `createTask` | `teamId`, `title`, `description?`, `assigneeId?`, `dueDate?`, `points` | `{ task }` | Lead (any assignee) / member (self only) | `VALIDATION_FAILED`, `FORBIDDEN` | Inserts task; logs `task_created` |
| `updateTask` | `taskId`, `patch`, `seenUpdatedAt` | `{ task }` | Lead; assignee for own task's status only | `CONFLICT` (stale), `FORBIDDEN` | Updates row |
| `moveTask` | `taskId`, `status`, `seenUpdatedAt` | `{ task }` | Assignee or lead | `CONFLICT`, `FORBIDDEN` | Sets status, `completed_at`; logs `task_moved`/`task_completed` |
| `deleteTask` / `restoreTask` | `taskId` | `{ task }` | Lead | `FORBIDDEN` | Sets/clears `deleted_at`; logs |
| `listMilestones` | `teamId` | `{ milestones[] with progress }` | Team member | `FORBIDDEN` | None |
| `createMilestone` / `updateMilestone` / `completeMilestone` | fields as in D1, `taskIds[]` | `{ milestone }` | Lead | `FORBIDDEN`, `VALIDATION_FAILED` | Writes `milestones`, `milestone_tasks` |
| `getCalendarEntries` | `teamId`, `rangeStart`, `rangeEnd` | `{ entries: [{type:'task'|'milestone'|'session', title, start, end?, link}] }` | Team member | `FORBIDDEN` | None |
| `getWorkloadSummary` | `teamId`, `period` | `{ members:[{userId,name,assigned,done,pointsDone,openPoints,sharePct}] }` | Team member | `FORBIDDEN` | None |
| `listActivity` | `teamId`, `period`, `cursor?` | `{ items[], next? }` | Team member | `FORBIDDEN` | None |
| `exportContributionReport` | `teamId`, `period`, `format` | file response (CSV or HTML) with `Content-Disposition` | Team member | `FORBIDDEN`, `VALIDATION_FAILED` | None; CSV cells escaped against formula injection (leading `=`, `+`, `-`, `@` prefixed with `'`) |
| `createRoom` / `updateRoom` / `setRoomStatus` | room fields | `{ room }` | Staff Admin | `FORBIDDEN`, `VALIDATION_FAILED`, `CONFLICT` (duplicate name) | Writes `rooms`, `room_equipment` |
| `getRules` / `updateRules` | rule fields | `{ rules }` | Staff Admin (write); signed in (read) | `FORBIDDEN`, `VALIDATION_FAILED` | Updates `rules` |
| `createBlackout` / `deleteBlackout` | blackout fields / id | `{ blackout }` | Staff Admin | `FORBIDDEN`, `VALIDATION_FAILED` | Writes `blackout_dates` |
| `getUsageReport` | `period` | `{ rooms:[{roomId,name,bookings,hoursBooked,utilisationPct,cancelled}] }` | Staff Admin | `FORBIDDEN` | None |

---

## F. Security and reliability

| Concern | Measure |
|---------|---------|
| Authentication | Phase 1: mock sign-in (documented as not secure, local only). Phase 2: Supabase Auth email/password; protected routes check the session on the server (middleware plus per-action checks) |
| Authorisation | Role and team membership checked on the server for every operation; Phase 2 adds RLS as the enforcing layer; UI hiding is not relied on |
| RLS (Phase 2) | `profiles`: user reads own and teammates' names, updates own; staff read all. `rooms`, `room_equipment`, `rules`, `blackout_dates`: read for authenticated; write for `staff_admin`. `bookings`: read own, own team's, and (for availability) a view exposing only `room_id, starts_at, ends_at` for all confirmed bookings; insert only via RPC; cancel via RPC. `teams`/`team_members`: read if member; insert via RPC. `tasks`, `milestones`, `milestone_tasks`, `activity_log`, `session_*`: read if member of the team; write per rules in section B enforced via policies using a `is_team_member()` / `is_team_lead()` security-definer helper. `staff_admin` has read on `bookings` for the usage report |
| Constraints | CHECKs, FKs and the exclusion constraint in section D are authoritative; server validation duplicates them for good messages |
| Secrets | `.env.local` git-ignored; `.env.example` has placeholders only; the Supabase **service-role key is never exposed to browser code** (no `NEXT_PUBLIC_` prefix) and is used only in server-only seed/admin scripts; the browser only ever sees the anon key and URL |
| Safe rendering | React escaping by default; no `dangerouslySetInnerHTML`; user text is plain text; CSV export escapes formula-leading characters; HTML report is generated with escaped values |
| File uploads | None in core scope. If room photos are added (stretch): private bucket, 2 MB limit, image MIME allow-list, storage policies restricted to Staff Admin, required alt text |
| Duplicate submissions | Submit buttons disabled while pending; server-side constraints guarantee idempotent outcomes (a repeated booking returns `CONFLICT`, not a second row); optional client-generated idempotency key stored on `bookings` is a stretch |
| Concurrent changes | Exclusion constraint for bookings; advisory lock for daily limit; `updated_at` optimistic check for tasks |
| Loading/retry/failure | Skeletons for reads; one automatic retry for failed reads; failed writes keep form data and show “Try again”; no silent failures (see design D1) |
| Privacy and demo data | All seed names and emails are fictional (e.g., `asha.demo@example.test`); no real student data; footer notes demo data; demo passwords are only for the seeded demo project |

---

## G. Implementation sequence

Milestones are ordered by dependency, not dated (deadline unknown). Effort ranges below are rough **assumptions** (a student team of three working part-time, moderate experience with React/TypeScript, little prior Supabase experience); re-estimate after M0.

### M0 — Shared setup (all; ~2–4 person-days)
| Task | Owner |
|------|-------|
| M0.1 Create GitHub repo, branch protection (PR + 1 review), issue labels per feature | Shared (A leads) |
| M0.2 Next.js + TypeScript project, lint, formatting, Vitest, Playwright, axe set-up; verify current versions from official docs and record in README | A |
| M0.3 Design tokens in `globals.css`, layout shell (header/nav/main/footer, skip link), core components (Button, fields, Dialog, Toast, StatusBadge, DataTable), motion tokens + reduced-motion toggle | B |
| M0.4 Repository interfaces, mock backend, seed JSON, mock auth with 4 demo users | A (interfaces), C (seed data) |
| M0.5 CI workflow (lint, typecheck, unit tests), README skeleton, `.env.example` | C |
**Exit criteria:** `npm run dev` shows the shell; signing in as each demo role works; one end-to-end vertical slice (list rooms from mock repo through a server action to the page) is demonstrated; CI green.

### M1 — Thin end-to-end flows on mock data (~5–8 person-days total)
| Task | Owner | Depends on |
|------|-------|-----------|
| M1.1 F6 rooms list + create/edit room (mock) | C | M0 |
| M1.2 F1 search + availability + `createBooking` with overlap check and rule validation | A | M0, M1.1 seed |
| M1.3 F2 create/join team, team overview | A | M0 |
| M1.4 F3 board: create task, Move to, activity log | B | M1.3 seed |
| M1.5 F4 milestones list + Agenda calendar (tasks + milestones) | B | M1.4 |
| M1.6 F5 workload summary from tasks | C | M1.4 |
**Deliverable:** a thin path for each feature. **Exit:** each feature has one working happy path in the browser, contract tests exist for booking conflict and task permissions.

### M2 — Complete features on mock (~8–12 person-days total)
| Task | Owner |
|------|-------|
| M2.1 F1: My bookings, cancel dialog + undo, daily-limit and blackout rules, conflict message with next free slot | A |
| M2.2 F2: team session booking with agenda/attendees, sessions list, capacity check | A |
| M2.3 F3: edit/assign/delete+undo, filters, overdue text, optimistic concurrency | B |
| M2.4 F4: Week grid, view tabs, milestone create/complete, calendar includes sessions | B |
| M2.5 F5: activity log, period selector, CSV and HTML export | C |
| M2.6 F6: rules form, blackout dates, usage report | C |
| M2.7 Motion catalogue minimum set (M1, M6, M7, M15, M16, M17) | each member for own screens |
**Exit criteria:** all acceptance criteria in section B pass on the mock backend (planned: contract + E2E tests), demo script runs end to end.

### M3 — Accessibility and responsive pass (shared; ~3–5 person-days)
Run the design review checklist (design.md F1), fix issues, add remaining motions (M2–M5, M8–M14, M18–M20) as time allows, test reduced motion, test 320px / 200% zoom. **Exit:** axe scan shows no serious/critical violations on listed pages, all journeys completed by keyboard only (results recorded in H5).

### M4 — Supabase integration (~8–12 person-days total)
| Task | Owner | Depends on |
|------|-------|-----------|
| M4.1 Create Supabase project (verify docs), `supabase/migrations` for all tables, constraints, indexes; `seed.sql` mirroring JSON seed; reproducible reset script | C | M2 |
| M4.2 Auth: Supabase Auth, profile creation trigger, session middleware replacing mock auth, demo users seeded | A | M4.1 |
| M4.3 RLS policies + helper functions; SQL tests for cross-user/cross-team access | C (F5/F6 tables), A (bookings/teams), B (tasks/milestones) | M4.1 |
| M4.4 `lib/repo/supabase/*` for F1/F2 incl. `create_booking` and `create_team_session` RPCs, exclusion constraint | A | M4.1–M4.3 |
| M4.5 `lib/repo/supabase/*` for F3/F4 incl. optimistic concurrency | B | M4.1–M4.3 |
| M4.6 `lib/repo/supabase/*` for F5/F6 incl. usage and summary queries | C | M4.1–M4.3 |
| M4.7 Run the shared contract tests against `DATA_BACKEND=supabase`; fix divergences | all | M4.4–M4.6 |
**Exit:** same test suite passes on both backends; concurrency test confirms exactly one booking wins on Postgres; RLS tests prove a Student cannot read another team's tasks or staff pages data.

### M5 — Hardening, evidence and submission (shared; ~3–5 person-days)
Deploy (if hosting chosen), set Supabase auth redirect URLs, run full E2E, take screenshots from the real app (design.md F3 list), write report, finalise README, tick section K2. Cut stretch work first if time is short (section K1).

**Early working frontend-to-database flow:** the vertical slice at M0 is frontend→server action→repository (mock). The first real frontend→Supabase flow is the first M4 slice (rooms list), done before the rest of M4 so integration risk surfaces early; if the schedule is tight, a spike of that single flow may be done in parallel during M2 by Member C.

---

## H. Testing and rubric traceability

### H1. Planned test types

| Type | Examples | Tooling |
|------|----------|---------|
| Business-rule unit tests | Daily-hours calculation, blackout overlap, 30-minute steps, capacity check, utilisation maths, workload percentages, CSV escaping | Vitest on pure functions in `lib/rules` |
| Backend/database integration (contract) tests | Overlapping booking rejected; two parallel `createBooking` calls → exactly one succeeds; team session creates booking + children atomically; task move sets `completed_at` | Vitest, run against both backends |
| Authorisation tests | Student cannot call staff operations; member of team X cannot read/modify team Y; non-lead cannot create milestone or team session; user cannot cancel another user's booking; unauthenticated access rejected | Vitest contract tests + SQL/RLS tests (Phase 2) |
| End-to-end | J1–J6 journeys | Playwright |
| Keyboard and accessibility | Keyboard-only run of every journey; focus-visible; dialog focus return; axe-core scan per page; manual screen-reader spot check | Playwright + axe + manual |
| Responsive | 320, 375, 768, 1280px; 200% zoom | Playwright viewport tests + manual |
| Failure-state | Simulated network error, conflict, permission denied, empty states | Playwright with route interception; unit tests |
| Motion | Reduced-motion media emulation and in-app toggle disable transforms | Playwright `reducedMotion: 'reduce'` |

### H2. Business-rule test list (starting set)

1. 30-minute step enforcement; end > start; within opening hours.
2. Daily limit: 1 h + 1 h allowed at limit 2; +30 min rejected.
3. Overlap detection with adjacent slots allowed (14:00–15:00 and 15:00–16:00 both OK).
4. Blackout single day and range; room-specific vs all-rooms.
5. Task status ↔ `completed_at` invariant.
6. Workload shares sum to 100% when any points are done.
7. Capacity vs attendees.

### H3. Cross-user access tests (starting set)

Student → `/staff/*` and staff operations: denied. User B cancelling user A's booking: denied. Member of team Y reading team X tasks/contributions/calendar: denied. Non-lead creating a team session/milestone/removing a member: denied. Direct database calls with a Student JWT (Phase 2) to insert a booking bypassing the RPC: denied by RLS.

### H4. Rubric traceability

Status column values: *Planned* (nothing executed), *In progress*, *Verified* (with evidence reference). **All rows start as Planned.**

| # | Requirement / rubric item | Feature or screen | Implementation approach | Verification | Report evidence | Status |
|---|---------------------------|-------------------|-------------------------|--------------|-----------------|--------|
| R1 | ≥6 meaningful features | F1–F6 | Section B | Demo script covers all six | Features section + screenshots 2–21 | Planned |
| R2 | Each member demonstrates two features | A: F1+F2, B: F3+F4, C: F5+F6 | Ownership in B | Demo roster (section J) | Division-of-work table | Planned |
| R3 | Full stack with persistent data | All | Server actions + Mock→Supabase repository | Restart app; data persists; contract tests on both backends | Architecture section, test log | Planned |
| R4 | Supabase if PostgreSQL | Data layer | Phase 2 migrations, Auth, RLS | Migration applies on fresh project; seed runs | Architecture section | Planned |
| R5 | GitHub link submitted | — | Repo created at M0 | Link opens, README renders | Report cover/section | Planned |
| R6 | Report has screenshots + division of work | — | Capture list design.md F3; table in section J | Checklist K2 | Report | Planned |
| R7 | Proper HTML structure | All pages | Next.js shell in `app/layout.tsx` (`<html lang>`, `<body>`; doctype and `<head>` generated by framework; per-page titles) | View source of built pages; axe | Explanation paragraph + screenshot of source | Planned |
| R8 | Semantic landmarks | All pages | header/nav/main/footer in layout; labelled navs | axe + manual landmark list in a screen reader/browser extension | Screenshot of landmark outline | Planned |
| R9 | Heading hierarchy | All pages | One `h1`, nested `h2`/`h3` | Heading outline tool per page | Outline screenshot | Planned |
| R10 | Text contrast 4.5:1 / 3:1 | Design system | Only pairs in design.md B2 | Re-measure on rendered pages (including hover/selected/disabled) | Table of measured ratios | Planned (palette ratios **computed** on paper only) |
| R11 | ≥16px body, line height, spacing | Design system | Tokens in B3 | Computed-style check in browser; 200% zoom | Note + screenshot | Planned |
| R12 | No excessive caps, blinking, moving text | All | No uppercase transforms; motion rules B9.3 | Grep for `text-transform`; review animation list; reduced-motion tests | Motion section | Planned |
| R13 | Informative images with alt; decorative `alt=""` / `aria-hidden` | S4/S5 stamp, icons | No photos in MVP; decorative SVGs `aria-hidden` | Automated alt check; manual review | Short statement | Planned |
| R14 | Audio/video captions/transcripts | — | **Conditional: no audio/video used** | N/A confirmation | Statement in report | N/A unless media added |
| R15 | Every input labelled; placeholders not labels | All forms | `TextField` etc. enforce `<label>` | axe + manual form audit | Form screenshots 1, 5, 9, 13 | Planned |
| R16 | Errors in text, not colour alone | All forms | `FormErrorSummary`, inline text + icon | Manual + Playwright assertions | Screenshots 5, 6 | Planned |
| R17 | Instructions and required fields marked | All forms | Instruction line + `*` + `required` | Manual audit | Screenshots 5, 9 | Planned |
| R18 | All fields usable with Tab | All | Native controls; standard keyboard patterns | Keyboard-only journeys J1–J6 | Keyboard test table | Planned |
| R19 | Visible focus, logical order, accessible dialogs, no traps | All | Global focus style; dialog pattern | Playwright focus tests + manual | Screenshot 23 | Planned |
| R20 | Loading/success/failure feedback | All | Skeletons, toasts, error panels | Failure-state tests | Screenshots 6, 7 | Planned |
| R21 | Database-enforced no double-booking | F1 | Exclusion constraint (Phase 2) | Parallel booking test | Test log + screenshot 6 | Planned |
| R22 | Backend authorisation | F1–F6 | Server checks + RLS | Cross-user test list H3 | Test log | Planned |
| R23 | Reproducible setup | — | README, `.env.example`, migrations, seed | Fresh-clone run by a teammate who did not write it | README + checklist | Planned |
| R24 | Responsive layout | All | Breakpoints in design B4 | 320/375/768/1280px checks | Screenshot 3 | Planned |

### H5. Test execution log (to be filled in; no entries are pre-filled)

| Date | Test / check | Executed by | Result | Evidence link |
|------|--------------|-------------|--------|---------------|
| — | — | — | — | — |

Rule: a test is only recorded as passed here after it was actually run; failures are recorded too.

### H6. Rubric items → acceptance statement

The rubric items R7–R20 above are acceptance requirements; the project is not complete until each is Verified or explicitly marked N/A with a reason.

---

## I. GitHub, deployment and reproducibility

- **Repository setup:** one repository; `main` protected; feature branches named `f1-room-search`, `f3-task-board`, `shared/setup-ci`, etc.; PRs need one review from another member; Conventional-style commit messages; issues labelled by feature ID; each member commits their own features so the history supports the division-of-work table.
- **README must contain:** project description; stack; prerequisites; quick start for **mock mode** (works with no accounts); Supabase setup steps; demo accounts; test and build commands; known limitations; link to design.md/plan.md; and a placeholder line: `GitHub repository: <to be added when created>`.
- **`.env.example` (placeholders only):**
  ```
  DATA_BACKEND=mock
  NEXT_PUBLIC_CAMPUS_TZ=Asia/Kolkata
  SESSION_SECRET=replace-with-long-random-string      # mock auth cookie signing
  NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key     # server only, never exposed
  ```
- **Migrations and seed:** `supabase/migrations/*.sql` in order; `supabase/seed.sql` creates fictional rooms, rules, demo users (via a server-only seed script using the service-role key), a team with tasks, milestones and sample bookings; a documented reset command re-applies migrations and seed. Phase 1 seed is `data/seed/*.json`, copied to `data/.runtime/db.json` by `npm run seed:mock`.
- **Commands (to be confirmed against the generated project):** `npm install`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm start`, `npm run seed:mock`, plus Supabase CLI commands for migrations once installed (verify in official docs).
- **Hosting configuration (if hosted):** set the environment variables in the host; add the deployed URL and `/auth/callback` to Supabase Auth redirect/site URL settings; use `DATA_BACKEND=supabase`. Mock mode is not deployed to serverless hosting.
- **How an evaluator runs it:** (a) clone, `cp .env.example .env.local`, `npm install`, `npm run seed:mock`, `npm run dev` for mock mode; (b) for Supabase mode, follow the README section or use the hosted URL if provided.
- **Recording the real links:** the real GitHub URL and (if any) deployed URL are recorded in the README and in the report cover section only when they exist. Nothing is invented in advance.

---

## J. Demonstration and report preparation

### J1. Demo accounts and seed data (all fictional)

| Account | Role | Notes |
|---------|------|-------|
| `staff.demo@example.test` | Staff Admin | Manages rooms, rules, usage |
| `asha.demo@example.test` | Student, Team Lead of “Survey Project Team” | Owns most demo actions |
| `ravi.demo@example.test` | Student, member of “Survey Project Team” | Moves own tasks |
| `meera.demo@example.test` | Student, no team | Used for conflict and join-code demo |

Seed content: 6 rooms (capacities 4–12, varied equipment), default rules (2 h/day, 2 h max booking), one blackout date, one team with 8 tasks across all four statuses (one overdue), two milestones, three bookings including one team session, and an activity log. Passwords documented in the README as demo-only.

### J2. Demonstration sequence (all six features)

| Step | Presenter | Feature | Expected visible result |
|------|-----------|---------|-------------------------|
| 1 | A | F1 search + book as Meera | Filtered results; booking confirmed with stamp; appears in My bookings |
| 2 | A | F1 conflict (second browser, same slot) | Conflict message with next free slot |
| 3 | A | F2 team session as Asha | Session booked with agenda tasks and attendees; room shows “Booked” in search |
| 4 | B | F3 task board as Ravi (keyboard only) | Task moved with “Move to”, live message and badge update |
| 5 | B | F4 calendar as Asha | Agenda shows task due, milestone and room session; Week view opens |
| 6 | C | F5 contributions | Workload numbers reflect step 4; report downloads |
| 7 | C | F6 staff adds blackout date | Student booking on that date is rejected with reason; usage table updates |
| 8 | Any | Denied access: Student opens `/staff/rooms` | Permission-denied page |

**Per-member demo features:** Member A — F1, F2 (steps 1–3). Member B — F3, F4 (steps 4–5). Member C — F5, F6 (steps 6–7).

### J3. Screenshot checklist

Use the 24-item table in design.md section F3; capture from the running application (final Supabase mode preferred; note which backend was used), at the widths in design.md F2. File names: `docs/screenshots/NN-short-name.png`. None exist yet.

### J4. Report outline

1. Problem and objectives
2. Users and roles
3. Technology stack and rationale (including the mock-first approach and its migration to Supabase)
4. Architecture (diagram from C3, trust boundaries)
5. Data model (ER diagram from D)
6. Features F1–F6 (each with screenshots and short description)
7. Accessibility and design (how each rubric item is satisfied; contrast table; motion and reduced motion)
8. Testing (tests planned vs executed, with the H5 log; honest limitations)
9. Limitations and future work (stretch features not implemented)
10. GitHub link and how to run
11. Division of work

### J5. Division-of-work table (to be completed with real names and actual contributions)

| Member | Name | Features demonstrated | UI | Backend/data | Tests | Shared contributions |
|--------|------|-----------------------|----|--------------|-------|----------------------|
| A | *to be supplied* | F1, F2 | S2–S9 | booking engine, teams, sessions | booking/concurrency/team access | M0.2 setup, M4.2 auth |
| B | *to be supplied* | F3, F4 | S10–S12 | tasks, milestones, calendar | task permissions, calendar | M0.3 design system, accessibility pass lead |
| C | *to be supplied* | F5, F6 | S13–S16 | summary/export, rooms/rules | summary maths, staff access | M0.4 seed data, M0.5 CI/README, M4.1 migrations |

The table is updated from the Git history before submission so it reflects reality, not just the plan.

---

## K. Risks and completion checklist

### K1. Risks and mitigations

| Risk | Likelihood / impact | Mitigation |
|------|--------------------|------------|
| Scope (effectively 1.5 apps) | High / High | Strict core vs stretch split; cut stretch in the order in A3; thin vertical slices first (M1) |
| Cross-feature dependencies (F2, F5, F4 depend on F3 data) | High / Medium | Shared seed data from M0; thin F3 slice early; contracts defined in section E |
| Mock-to-Supabase divergence | Medium / High | Repository interface + the same contract tests run on both backends; keep business rules in pure functions |
| Concurrency and time zones | Medium / High | Store UTC `timestamptz`; helper for campus time; test boundary cases (midnight, DST-free zone assumption); parallel booking test |
| RLS mistakes | Medium / High | Write RLS tests alongside policies; test with real user JWTs, not the service role |
| Accessible calendar | Medium / Medium | Agenda view is the default and complete; Week grid is an enhancement |
| Animation work eating time or hurting accessibility | Medium / Medium | Minimum motion set first (design.md F4); all motion behind reduced-motion gate; remaining motions are optional |
| Unknown deadline / experience | — | Ordered milestones; re-estimate after M0; confirm team size and ownership before building |
| Supabase/Next.js version changes | Medium / Low | Verify versions in official docs at M0; pin in `package.json`; record in README |
| Mock mode not deployable on serverless hosting | Medium / Low | Mock mode is local-only; hosted demo uses Supabase mode |

**Cut first if time is short:** (1) in-app motion beyond the minimum set, (2) peer feedback, (3) check-in/no-show, (4) waitlist, (5) room photos, (6) Week grid (keep Agenda). Never cut: the exclusion constraint, RLS, accessibility rubric items, or the demonstration of any core feature.

### K2. Final completion checklist (all unchecked until verified)

- [ ] F1–F6 each work end to end in the browser on **Supabase mode**
- [ ] Every member can demonstrate their two features without help from others
- [ ] Data persists across restart; backend authorisation works (H3 tests pass on Supabase)
- [ ] Double-booking is rejected by the database (parallel test recorded)
- [ ] Accessibility rubric R7–R20 verified or explicitly N/A with evidence
- [ ] Rendered colour contrast re-measured; any failing pair fixed
- [ ] Reduced-motion behaviour verified (OS setting and in-app toggle)
- [ ] UI matches design.md (design review checklist completed)
- [ ] Setup reproducible: a teammate ran README steps from a fresh clone successfully
- [ ] `.env.example` has placeholders only; no secrets in Git history
- [ ] Screenshots captured from the real app per J3
- [ ] Test execution log (H5) filled in honestly
- [ ] GitHub repository link recorded in README and report
- [ ] Report complete, including division-of-work table with real names

### K3. Open questions to confirm before building

1. Team size and real names (affects feature ownership; if more than three members, add features so everyone owns two).
2. Deadline, so M0–M5 can be scheduled.
3. Hosting preference (affects whether a deployed URL is provided).
4. Whether the university gives a preferred campus time zone and room naming scheme.
5. Whether the report must show the final Supabase-backed screenshots (assumed yes).
