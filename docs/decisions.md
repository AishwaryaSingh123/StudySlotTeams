# Architecture and Specification Decisions

## 1. Git Repository and Remotes
- The repository at `C:\Users\aishw\OneDrive\Desktop\webProj` is a brand-new **local Git repository** (`git init`).
- There are currently **no remote URLs / links** configured (`git remote -v` returned empty). All work is completely local.

## 2. Booking Cancellation and Undo Semantics
- In accordance with the relational schema and GiST exclusion constraints, `bookings.status = 'cancelled'` is strictly terminal for a given booking record.
- If a user cancels a booking and chooses "Undo" within the 8-second window:
  - The system creates a **new booking** through the standard validated booking operation.
  - All room availability, daily booking allowances, room active status, and blackout rules are re-evaluated in real time.
  - If the slot was rebooked in the interim or rules are violated, the user is given a clear explanation ("Slot is no longer available").
  - The cancelled record is never silently un-cancelled or reactivated.

## 3. Task Deletion and Undo Semantics
- Task deletion uses soft delete (`deleted_at` timestamp).
- Task "Undo" restores the task by setting `deleted_at = NULL` within the undo window.
- Soft-deleted tasks are excluded from board lists and active workload calculations, but remain recorded in activity logs.

## 4. Profile and Role Security
- Profiles allow updating `full_name` only.
- The `role` column (`student` | `staff_admin`) cannot be modified by users via profile updates, signup metadata, or server actions.
- The `staff_admin` role is provisioned solely via trusted admin/seed processes.
- Contract and unit tests explicitly verify that self-promotion attempts return `FORBIDDEN`.

## 5. Team Creation, Leadership, and Invariants
- Team creation and initial creator assignment as `lead` in `team_members` are executed as an atomic transaction.
- Partial unique constraint (`UNIQUE (team_id) WHERE role = 'lead'`) ensures exactly one lead per team.
- A team lead cannot be removed without transferring leadership first, preventing orphan active teams.
- Team name uniqueness per creator is strictly enforced: `(created_by, lower(name))` must be unique.
- Optional team-session note (up to 200 characters) is persisted on session bookings.

## 6. Timezone, Slot Steps, and Overlap Boundaries
- Campus timezone defaults to `Asia/Kolkata` (configurable via `NEXT_PUBLIC_CAMPUS_TZ`).
- All timestamps are stored and manipulated internally as UTC ISO strings / PostgreSQL `timestamptz`.
- Time intervals are half-open `[starts_at, ends_at)`.
- Adjacent slots (e.g. 14:00–15:00 and 15:00–16:00) do NOT overlap and are conflict-free.
- Slot step is fixed at 30 minutes in core scope.
- Daily booking allowance (default 2 hours/day) is charged to the booking creator, aggregating both personal bookings and team session bookings created by that user on that campus-local calendar date.

## 7. Blackout Dates and Affected Bookings
- Blackouts can apply to all rooms (`room_id = NULL`) or a specific room.
- Adding a new blackout date preserves existing confirmed bookings but warns staff with the count of affected bookings, providing an interface to inspect and cancel them if necessary.
- New booking attempts during a blackout are rejected with the specific blackout reason.

## 8. Contribution & Usage Reporting Semantics
- **Contribution Log**:
  - Metrics: Tasks Assigned, Tasks Done, Points Done, Open Points, Share of Completed Points.
  - Honest metric naming: completed points are calculated from current completed tasks whose `completed_at` falls within the period (or total project). Reopening a task removes its completion credit. Soft-deleted tasks are omitted from current metrics.
  - CSV exports escape formula-triggering characters (`=`, `+`, `-`, `@`) with a leading single quote `'`.
- **Room Usage Report**:
  - Booked hours: sum of hours from confirmed bookings in the period.
  - Available hours: scheduled operating hours within the period minus blackout hours.
  - Utilisation: `(booked_hours / available_hours) * 100`, guarded against zero denominator (defaults to 0.0%).
  - Cancelled count: tracks cancellations in the period.
  - Staff CSV export included.

## 9. Data Architecture: Mock First, Supabase Second
- A clean repository interface (`lib/repo/types.ts`) abstracts all backend operations.
- `DATA_BACKEND=mock` uses server-only in-memory + file-backed persistence (`data/.runtime/db.json`), with in-process mutation mutexes and atomic file replacement.
- `DATA_BACKEND=supabase` uses PostgreSQL RLS, triggers, GiST exclusion constraints, and transactional RPCs (`create_booking`, `create_team_session`).
- Client components never import filesystem or server-only code.
