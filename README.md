# StudySlot Teams

> A conflict-free academic room booking, team session coordination, task board, and transparent workload accounting application built with Next.js, TypeScript, and a distinctive **reading-room ledger** aesthetic. 

---

## 1. Project Overview & Features

StudySlot Teams implements the complete university team study room reservation and project tracking workflow across 6 core functional modules:
Vercel link - https://study-slot-teams.vercel.app/login
- **F1: Room Search & Conflict-Free Booking** 
  - Search by campus date, start/end time, capacity, equipment, and building.
  - Interactive 30-minute slot timeline with half-open intervals `[start, end)`.
  - Next-available slot suggestion upon conflict (M5) and rubber-stamp confirmation (M6).
  - 8-second accessible Undo window upon booking cancellation; cancelled records remain terminal.
- **F2: Team Session Booking** 
  - Team lead reservation linking upcoming non-completed tasks as meeting agendas.
  - Team member attendance tracking with invite/accept states and optional 200-char session note.
- **F3: Task Board**
  - 4-column kanban board (`todo`, `in_progress`, `in_review`, `done`).
  - Accessible keyboard-driven "Move to" button workflow (zero drag-and-drop dependency).
  - Soft deletion with reverse-chronological activity log audit trail and 8-second Undo restore.
- **F4: Milestones & Unified Calendar** 
  - Milestone progress tracking with automatic task completion percentages.
  - Dual-mode calendar: Accessible **Agenda list view** (default) and **Week grid view**.
- **F5: Contribution Log & Report** (Demonstrated by Member C)
  - Transparent workload accounting (assigned tasks, points done, open points, share %).
  - Formula injection sanitized CSV download (`=`, `+`, `-`, `@` escaped with single quote).
  - Printable HTML report formatted for academic assessment.
- **F6: Staff Room & Rules Management** 
  - Room inventory, operating hours, and equipment management.
  - Deactivation safety inspection: view and cancel affected future bookings with warning count.
  - Blackout date calendar and utilization ledger with CSV export.

---

## 2. Design System: Reading-Room Ledger

The user interface adheres to the archival **reading-room ledger** visual identity specified in `design.md`:
- **Color Palette:** Warm aged paper background (`#FAF8F3`), crisp surface cards (`#FFFFFF`), archival ink text (`#1C1917`), stacks green action buttons (`#1F5C4A`), restrained brass accents (`#8C6D23`), and warning red (`#8C2D19`).
- **Typography:** Source Serif 4 for authoritative headings and Atkinson Hyperlegible for readable controls and data tables.
- **Tabular Numerals:** Fixed-width tabular digits (`tabular-nums`) for timestamps, dates, and metric scores.
- **Accessibility:** Semantic landmarks, visible 2px focus rings (`#1F5C4A` offset by 2px), diagonal hatch patterns supplementing status badges, 16px minimum font size, and `prefers-reduced-motion` compliance.

---

## 3. Architecture & Repository Abstraction Layer

StudySlot Teams uses an identical repository contract (`lib/repo/types.ts`) supporting dual backend configurations:

1. **`DATA_BACKEND=mock` (Local MVP & Offline Evaluation)**
   - File-backed atomic persistence in `data/.runtime/db.json`.
   - In-process mutation queue with mutex lock preventing concurrent corruption.
   - Seeded with 5 realistic academic profiles, 6 rooms, 2 teams, tasks, and historical activity logs.
2. **`DATA_BACKEND=supabase` (Production Cloud Database)**
   - PostgreSQL schema with Row-Level Security (RLS) on all tables.
   - Postgres GiST exclusion constraint (`btree_gist` extension, `no_room_overlap`) enforcing zero double-booking at the database level.
   - Security-definer transactional RPCs preventing client role escalation.

---

## 4. Getting Started

### Prerequisites
- Node.js v18.17+ or v20+
- npm v9+

### Installation & Quick Start (Local Mock Mode)
```bash
# 1. Clone repository & install dependencies
git clone <repository-url>
cd webProj
npm install

# 2. Configure environment variables (defaults to mock mode)
cp .env.example .env.local

# 3. Seed mock runtime database
npm run seed:mock

# 4. Start local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quick-Login Demo Accounts
Click any demo button on `/login` to sign in instantly:
- **Priya Sharma (Staff Admin):** `staff.demo@example.test` (Access to `/staff/*`)
- **Asha Roy (Team Alpha Lead):** `asha.demo@example.test`
- **Ravi Kumar (Team Alpha Member):** `ravi.demo@example.test`
- **Dev Nair (Team Alpha Member):** `dev.demo@example.test`
- **Meera Patel (HCI Project Lead):** `meera.demo@example.test`

---

## 5. Supabase Integration Setup (Phase 2)

To connect a live Supabase instance:
1. Create a Supabase project at [https://database.new](https://database.new).
2. Run the SQL migrations located in `supabase/migrations/`:
   - `00001_initial_schema.sql` (Tables, types, GiST exclusion constraints).
   - `00002_rls_and_functions.sql` (RLS policies, triggers, atomic RPCs).
3. Seed test data:
   - Execute `supabase/seed.sql` in the Supabase SQL Editor.
4. Update `.env.local`:
   ```env
   DATA_BACKEND=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. Restart the Next.js server (`npm run dev`).

---

## 6. Testing & Quality Verification

Run the automated test suite verifying booking rules, contribution calculations, usage reports, and contract security:
```bash
# Run unit and contract tests (14 passing tests)
npm test

# Run TypeScript typecheck
npm run typecheck

# Production build validation
npm run build
```

---

## 7. Provisional Demonstration Mapping

| Team Member | Features Assigned | Key Demonstration Workflow |
| :--- | :--- | :--- |
| **Member A** | **F1 & F2** | Room conflict detection timeline, next-available slot suggestion, rubber stamp confirmation, team session booking with linked agenda. |
| **Member B** | **F3 & F4** | 4-column task board, keyboard "Move to" menu, soft delete with 8s Undo, milestone completion bars, Agenda & Week calendar views. |
| **Member C** | **F5 & F6** | Formula injection protected CSV report, printable HTML report, room deactivation safety inspection, blackout date management. |
