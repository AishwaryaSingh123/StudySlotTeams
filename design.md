# StudySlot Teams — design.md

Design specification for the StudySlot Teams web application (academic project). Read together with `plan.md`; feature IDs, roles, routes, entities and status values are identical in both files.

**Status of this document:** a specification. No screenshot, contrast value or test below has been taken from a running application. Contrast ratios marked **Computed** were calculated from the hex values with the WCAG 2.1 relative-luminance formula during planning; they must be re-checked against the built UI (see section F).

**Assumptions (not confirmed facts):** team of three (Member A/B/C); deadline, hosting and team experience unknown; campus time zone defaults to `Asia/Kolkata` and is configurable (`NEXT_PUBLIC_CAMPUS_TZ`).

---

## 0. Shared vocabulary (must match plan.md)

**Roles:** `Student`, `Team Lead` (a student with extra rights in one team, stored as `team_members.role = 'lead'`), `Staff Admin`.

**Features:**

| ID | Feature | Member (provisional) |
|----|---------|----------------------|
| F1 | Room search and conflict-free booking | A |
| F2 | Team session booking | A |
| F3 | Task board | B |
| F4 | Milestones and unified calendar | B |
| F5 | Contribution log and report | C |
| F6 | Staff room and rules management | C |

**Status values:**

| Entity | Values |
|--------|--------|
| `bookings.status` | `confirmed`, `cancelled` (stretch adds `checked_in`, `no_show`, `waitlisted`) |
| `tasks.status` | `todo`, `in_progress`, `in_review`, `done` |
| `milestones.status` | `open`, `completed` (“overdue” is derived from `due_date`, never stored) |
| `team_members.role` | `member`, `lead` |
| `rooms.status` | `active`, `inactive` |

**Routes:**

| Route | Access | Feature |
|-------|--------|---------|
| `/login` | public | Auth support |
| `/rooms` | Student, Team Lead, Staff Admin | F1 |
| `/rooms/[roomId]` | signed in | F1 |
| `/rooms/[roomId]/book` | Student, Team Lead | F1 |
| `/bookings` | Student, Team Lead (own bookings) | F1 |
| `/teams` | Student, Team Lead | F2 |
| `/teams/[teamId]` | team members | F2 |
| `/teams/[teamId]/sessions` | team members | F2 |
| `/teams/[teamId]/sessions/new` | Team Lead of that team | F2 |
| `/teams/[teamId]/board` | team members | F3 |
| `/teams/[teamId]/milestones` | team members (create/edit: Team Lead) | F4 |
| `/teams/[teamId]/calendar` | team members | F4 |
| `/teams/[teamId]/contributions` | team members (export: all members; see plan) | F5 |
| `/staff/rooms` | Staff Admin | F6 |
| `/staff/rooms/new` | Staff Admin | F6 |
| `/staff/rooms/[roomId]/edit` | Staff Admin | F6 |
| `/staff/rules` | Staff Admin | F6 |
| `/staff/usage` | Staff Admin | F6 |

---

## A. Product and design direction

### A1. Purpose, users and key tasks

StudySlot Teams lets student project teams plan their work (tasks, milestones) and reserve campus study rooms for the sessions that work needs, while staff control rooms and booking rules.

| User | Most important tasks |
|------|----------------------|
| Student | Find a free room that fits their group and equipment needs; book it; see their own bookings; update the status of their own tasks; see what is due. |
| Team Lead | Everything a Student does, plus: book a room for the whole team and attach agenda tasks; create/edit milestones; assign tasks; download the team contribution report. |
| Staff Admin | Add or edit rooms and equipment; set max hours per day and blackout dates; see room usage. |

### A2. Visual concept: “the reading-room ledger”

Library timetables, date-due slips and catalogue cards are the visual reference. The product reads like a well-kept ledger: warm paper background, dark ink text, one library-green action colour, and a time grid that looks like a printed timetable. The domain element that recurs everywhere is the **time slot**: a row or block with a start time, an end time and a clear state (free, booked, yours, blocked).

Concrete expressions of the concept:

- Page background is warm paper (`Paper`), content sits on white `Surface` panels separated by 1px rules, not floating cards with heavy shadows.
- Times are always set in tabular numerals (`font-variant-numeric: tabular-nums`) so columns of times align like a timetable.
- Booked slots use a diagonal hatch pattern plus the word “Booked”, like a crossed-out line in a ledger, so state never depends on colour alone.
- A confirmed booking ends with a **date-stamp** motion (see section B9), the one signature moment in the product.
- Section headings use a serif face (catalogue-card feel); controls and data use a hyper-legible sans.

### A3. Tone

Calm, plain and precise. Students use this between lectures and under deadline pressure; staff use it to administer rules. Microcopy states facts and next steps (“Room 2.04 is booked 14:00–15:00 by another team. Next free slot: 15:00.”) and never uses exclamation marks, jokes or filler. Errors say what happened and what to do.

### A4. Design principles and how they shape screens

1. **State is always written down.** Every slot, task and milestone shows its state as text plus an icon/pattern; colour reinforces, never carries. *Example:* a booked slot shows hatch + “Booked” + (if it is yours) “Your team”.
2. **One primary action per screen.** *Example:* the room detail page has a single filled green “Book this room” button; everything else is outline or link style.
3. **Lists first, grids second.** Anything that has a grid (calendar, availability) has an equivalent list/agenda that is the default on small screens and is reachable by keyboard. *Example:* `/teams/[teamId]/calendar` opens in Agenda view; Week grid is an alternate view.
4. **Dense but readable.** Data screens use tables and compact rows (but still 16px text, 44px targets); no decorative cards. *Example:* the task board is four labelled lists, not draggable sticky notes.
5. **Motion explains change, never decorates.** Animation is used only to show where something went, that something succeeded, or that content is loading (section B9). *Example:* when a task is moved to another column, the card visibly travels there; nothing loops or bounces.
6. **Recoverable by default.** Destructive actions confirm in an accessible dialog and offer “Undo” where the data model allows (section D).

### A5. What this design deliberately avoids

No gradient hero, no glass effects, no decorative charts, no invented statistics, no stock imagery, no card grid used for every data type. The product has no marketing landing page: `/` redirects to `/rooms` (signed in) or `/login`.

---

## B. Visual identity (design system)

### B1. Colour palette

| Name | Hex | Semantic role |
|------|-----|---------------|
| Paper | `#FAF8F3` | Page background |
| Surface | `#FFFFFF` | Panels, forms, tables, dialogs |
| Sand | `#EFEAE0` | Table headers, secondary surface, sidebar rail |
| Sand Deep | `#E4DED0` | Booked-slot fill, pressed neutral |
| Ink | `#1B2430` | Primary text |
| Slate | `#4A5565` | Secondary text, helper text, metadata |
| Control Border | `#6B665A` | Borders of inputs, checkboxes, outline buttons (non-text, needs 3:1) |
| Rule | `#D6D0C2` | Decorative dividers only (never the sole indicator of a control) |
| Hatch Line | `#8A8373` | Diagonal hatch lines on booked/blocked slots |
| Stacks Green | `#1F5C4A` | Primary action fill, links, active nav indicator |
| Stacks Green Dark | `#16453A` | Primary hover/pressed, selected text on tint |
| Green Tint | `#DCEBE4` | Selected row, “your team” slot, active filter chips |
| Focus Blue | `#0B57D0` | Focus ring (only use of blue besides Info) |
| Success | text `#14572E` on `#E4F3E9` | Success messages and “Completed/Done” badges |
| Warning | text `#6B4200` on `#FFF1D2` | Warnings, “due soon”, blackout notices |
| Error | text `#9B1C1C` on `#FCEAEA` | Error messages, “Overdue”, destructive buttons |
| Info | text `#123F7A` on `#E6EEFA` | Neutral notices (e.g., demo data, loading hints) |
| Brass | `#7A5200` | Milestone markers and milestone labels (small accent, text-safe) |

No dark mode in the MVP (stated limitation; the palette is tokenised in CSS custom properties so a dark theme can be added later).

### B2. Foreground/background pairs and contrast

All ratios below are **Computed** from the hex values during planning (WCAG 2.1 formula). They are not yet verified in the rendered application.

| Use | Foreground | Background | Ratio | Requirement | Result |
|-----|-----------|------------|-------|-------------|--------|
| Body text | Ink | Paper | 14.75:1 | 4.5:1 | Pass |
| Body text on panels | Ink | Surface | 15.65:1 | 4.5:1 | Pass |
| Body text on sand | Ink | Sand | 13.06:1 | 4.5:1 | Pass |
| Secondary text | Slate | Paper | 7.12:1 | 4.5:1 | Pass |
| Secondary text on panels | Slate | Surface | 7.56:1 | 4.5:1 | Pass |
| Secondary text on sand | Slate | Sand | 6.30:1 | 4.5:1 | Pass |
| Secondary text on booked slot | Slate | Sand Deep | 5.64:1 | 4.5:1 | Pass |
| Primary button label | White | Stacks Green | 7.81:1 | 4.5:1 | Pass |
| Primary button hover label | White | Stacks Green Dark | 10.79:1 | 4.5:1 | Pass |
| Link text | Stacks Green | Paper | 7.36:1 | 4.5:1 | Pass |
| Link text on panels | Stacks Green | Surface | 7.81:1 | 4.5:1 | Pass |
| Link text on sand | Stacks Green | Sand | 6.52:1 | 4.5:1 | Pass |
| Text on selected row | Ink | Green Tint | 12.71:1 | 4.5:1 | Pass |
| Secondary text on selected row | Slate | Green Tint | 6.14:1 | 4.5:1 | Pass |
| Dark green text on tint | Stacks Green Dark | Green Tint | 8.76:1 | 4.5:1 | Pass |
| Success message | `#14572E` | `#E4F3E9` | 7.52:1 | 4.5:1 | Pass |
| Warning message | `#6B4200` | `#FFF1D2` | 7.80:1 | 4.5:1 | Pass |
| Error message | `#9B1C1C` | `#FCEAEA` | 7.02:1 | 4.5:1 | Pass |
| Error text on panels | `#9B1C1C` | Surface | 8.15:1 | 4.5:1 | Pass |
| Error text on sand | `#9B1C1C` | Sand | 6.80:1 | 4.5:1 | Pass |
| Destructive button label | White | `#9B1C1C` | 8.15:1 | 4.5:1 | Pass |
| Info message | `#123F7A` | `#E6EEFA` | 8.91:1 | 4.5:1 | Pass |
| Milestone label (brass) | Brass | Paper | 6.52:1 | 4.5:1 | Pass |
| Milestone label on panels | Brass | Surface | 6.92:1 | 4.5:1 | Pass |
| Milestone label on sand | Brass | Sand | 5.77:1 | 4.5:1 | Pass |
| Focus ring on page | Focus Blue | Paper | 6.02:1 | 3:1 (non-text) | Pass |
| Focus ring on panels | Focus Blue | Surface | 6.39:1 | 3:1 (non-text) | Pass |
| Focus ring on sand | Focus Blue | Sand | 5.33:1 | 3:1 (non-text) | Pass |
| Focus ring on selected row | Focus Blue | Green Tint | 5.18:1 | 3:1 (non-text) | Pass |
| Input/outline border | Control Border | Surface | 5.72:1 | 3:1 (non-text) | Pass |
| Input border on page | Control Border | Paper | 5.39:1 | 3:1 (non-text) | Pass |
| Hatch lines on sand | Hatch Line | Sand | 3.14:1 | 3:1 (non-text, supplementary only) | Pass |
| Hatch lines on panels | Hatch Line | Surface | 3.77:1 | 3:1 (non-text, supplementary only) | Pass |

**Pairs awaiting verification in the built UI:** disabled controls (exempt from WCAG contrast but still to be checked for legibility), text over any hover tint introduced during implementation, and the focus ring against the primary button fill. The ring is drawn with a 2px offset so it sits on the surrounding background (Paper/Surface), not on the green fill; the Focus Blue vs Stacks Green ratio (1.22:1) is therefore not the relevant pair, and this must be confirmed visually.

**Rule:** any new colour pair introduced during implementation must be added to this table and calculated before use.

### B3. Typography

| Role | Family | Fallback stack | Notes |
|------|--------|----------------|-------|
| Headings (h1–h3) | Source Serif 4 | `Georgia, "Times New Roman", serif` | Weights 600, 700 |
| Body, UI, data | Atkinson Hyperlegible | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Weights 400, 700; chosen for character distinctiveness |

Loaded with `next/font` (self-hosted at build time, `display: swap`). *Availability of both families through `next/font/google` must be verified at setup; if either is unavailable, the fallback stack is used and this document is updated.*

| Token | Size / line height | Weight | Use |
|-------|--------------------|--------|-----|
| `text-body` | 16px (1rem) / 1.6 | 400 | Default body — **minimum anywhere in the app** |
| `text-small` | 16px / 1.5 | 400 | Metadata (no text under 16px, so small differs by colour/weight only) |
| `text-label` | 16px / 1.4 | 700 | Form labels, table headers |
| `h3` | 20px / 1.4 | 700 (serif) | Panel titles |
| `h2` | 24px / 1.3 | 600 (serif) | Section titles |
| `h1` | 32px / 1.2 (28px below 640px) | 700 (serif) | Page title, one per page |
| `time` | 16px / 1.4, tabular numerals | 700 | Times and durations |

Rules: measure (line length) capped at 70ch for prose and form instructions; no ALL CAPS anywhere (no `text-transform: uppercase`); badges use sentence case (“In review”); letter-spacing unchanged; italic only for emphasis within prose; text never blinks or scrolls automatically.

### B4. Spacing, layout and shape

| Token | Value |
|-------|-------|
| Spacing scale | 4, 8, 12, 16, 24, 32, 48, 64 px (`space-1`…`space-8`) |
| Content max width | 1200px (app shell); forms and prose 640px; tables full width of container |
| Page gutter | 16px below 640px; 24px 640–1023px; 32px from 1024px |
| Grid | 12 columns from 1024px, 8px–24px gap; single column below 640px |
| Breakpoints | `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px |
| Border | 1px `Rule` for dividers; 1px `Control Border` for interactive controls; 2px `Control Border` for control focus-within container |
| Radius | 4px (controls, badges), 8px (panels, dialogs); no pill shapes except filter chips (999px) |
| Shadow | None on panels. Dialogs and toasts: `0 4px 16px rgba(27,36,48,0.18)`. No other shadows |
| Touch targets | Minimum 44×44px for buttons, icon buttons, nav links, checkboxes (hit area) |

### B5. Icons and imagery

- **Icons:** one set only, outline style, 2px stroke, 20px default (24px for icon-only buttons), `currentColor`, sourced from a single library (Lucide via `lucide-react`; *package availability to verify at setup*). Icons accompany text; an icon never stands alone except for icon-only buttons with an accessible name (section E).
- **Imagery:** the product contains **no photographs or illustrations in the MVP**. Room detail pages may show an optional room photo uploaded by Staff Admin (stretch); if present it needs informative `alt` text written by the admin (required field when a photo is attached). All decorative SVGs (hatch pattern, divider flourish, stamp graphic) carry `aria-hidden="true"` and `alt=""` where `<img>` is used.
- **Audio/video:** none planned. Captions/transcripts requirement is **conditional** and not applicable unless media is added.

### B6. Interaction state tokens (summary)

| State | Treatment |
|-------|-----------|
| Hover | Background shifts one step (Green → Green Dark; outline → Sand); cursor pointer; transition 120ms |
| Focus-visible | 3px solid Focus Blue outline, 2px offset, never removed; applies to links, buttons, inputs, tabs, list items |
| Active/pressed | Darkest background step, `translateY(1px)` |
| Disabled | `aria-disabled="true"` or `disabled`, 60% opacity text plus dashed border; reason shown in adjacent text when the user might wonder why |
| Loading | Button label replaced by “Saving…” with a 16px spinner; button `aria-busy="true"` and not re-clickable |
| Selected | Green Tint background, 4px Stacks Green left bar, and `aria-current`/`aria-selected` as appropriate |

### B7. Slot state vocabulary (used by F1, F2, F4)

| State | Visual | Text label | When |
|-------|--------|-----------|------|
| Free | White fill, Control Border outline | “Free” | No booking, within opening hours, not blackout |
| Booked | Sand Deep fill + diagonal hatch | “Booked” | Another booking overlaps |
| Your team | Green Tint fill + 4px green left bar | “Your team” | Booking belongs to the user's team |
| Blocked | Sand fill + cross-hatch | “Unavailable: {reason}” | Blackout date, outside hours, daily-limit reached |
| Selected | 2px Stacks Green border + check icon | “Selected” | Candidate slot in booking form |

### B8. Layout shell

```
┌────────────────────────────────────────────────────────────┐
│ <header>  StudySlot Teams   [Team switcher]   [User menu]  │
├────────────┬───────────────────────────────────────────────┤
│ <nav>      │ <main id="main">                              │
│ (rail ≥lg) │   h1 + page actions                           │
│            │   content                                     │
├────────────┴───────────────────────────────────────────────┤
│ <footer>  Demo data notice · Help · Reduce motion toggle   │
└────────────────────────────────────────────────────────────┘
```

- First focusable element is a “Skip to main content” link (visible on focus).
- Below `lg` the nav rail becomes a bottom-aligned “Menu” disclosure button in the header that opens a full-width `<nav>` panel (not a hover menu).
- Page content width and gutters per B4.

### B9. Motion and animated UI

Motion in StudySlot Teams has three jobs: **show where something went**, **confirm that something succeeded**, and **signal that content is loading**. It is implemented with CSS transitions/keyframes and a small FLIP helper (no animation library dependency in the MVP; the optional browser View Transitions API may be used as progressive enhancement only).

#### B9.1 Motion tokens

| Token | Value | Use |
|-------|-------|-----|
| `--motion-instant` | 80ms | Press feedback |
| `--motion-fast` | 120ms | Hover, colour changes |
| `--motion-base` | 200ms | Dialogs, toasts, expanding panels, reorder |
| `--motion-slow` | 400ms | Stamp, bar growth (max duration for any single animation: 600ms) |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Entrances |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Movement between positions |
| `--stagger` | 40ms per item, max 8 items | List entrances |

Only `transform` and `opacity` are animated (plus `background-color`/`border-color` transitions for hover/focus), so layout never jumps and performance stays smooth on low-end devices.

#### B9.2 Animation catalogue

| ID | Where | Behaviour | Duration | Purpose |
|----|-------|-----------|----------|---------|
| M1 | Route change (all pages) | `<main>` content fades from 0→1 opacity and rises 8px; after the change, focus moves to the page `h1` | 200ms | Orient the user after navigation |
| M2 | F1 room results | When filters change, result rows fade/slide in with staggered 40ms delay (max 8; the rest appear together). Result count text updates in an `aria-live="polite"` region | 200ms + stagger | Show that the list changed |
| M3 | F1 availability timeline (room detail and booking form) | Free slots are drawn left-to-right as the timeline mounts: each slot block scales on X from 0→1 (origin left); a vertical “now” marker is static, never pulsing | 300ms | Make the day readable as time passing |
| M4 | F1 slot selection | Chosen slot's border thickens and the check icon fades/scales in (0.8→1); the booking summary panel highlights its changed row with a single background flash to Green Tint that fades out | 200ms + 600ms fade | Connect the click to the summary |
| M5 | F1 conflict | If a booking attempt fails because the slot was just taken, the offending slot in the timeline gets a **single** outline pulse (Error colour, one pass) and the error text appears with `role="alert"`; the next free slot is offered as a button. No shaking | 600ms, once | Draw attention to the exact slot, without distress |
| M6 | F1/F2 booking confirmed — **date-stamp** | A circular “Booked” stamp (SVG, `aria-hidden`) scales from 1.4→1.0 with a slight rotation (−8°→−4°) and opacity 0→1, settling like a rubber stamp; it sits beside the visible text “Booking confirmed: Room 2.04, Thu 12 Nov, 14:00–15:00” | 400ms, once | The product's signature moment; reinforces success |
| M7 | F3 task “Move to” | After choosing a status in the “Move to” select, the card travels from the old list to the new one using FLIP (measure → invert → play) while the old column closes the gap; the card then keeps keyboard focus on its “Move to” control and an `aria-live` message says “Task ‘Draft survey questions’ moved to In review” | 200ms | Show where the task went without drag-and-drop |
| M8 | F3 status badge change | Badge crossfades between old and new text/colour | 120ms | Confirm the status changed |
| M9 | F4 view switch (Agenda ⇄ Week) | Outgoing view fades out, incoming fades in; the selected tab's underline slides to the new tab | 200ms | Preserve context between views |
| M10 | F4 week navigation | Week grid slides 16px in the direction of travel (earlier/later) while fading | 200ms | Indicate direction in time |
| M11 | F4 milestone completion | Milestone's marker (brass diamond) fills with Success colour via a check icon drawing in (stroke-dashoffset) | 300ms | Reward completion, quietly |
| M12 | F5 contribution bars | Workload bars grow from 0 to their value on first view of the page, ordered by member. Each bar always has the numeric value as text beside it (“6 of 14 tasks done”). Not repeated on re-render | 400ms | Draw the eye to proportions that are real data |
| M13 | F5 report export | The “Download report” button shows a spinner, then a check icon for 2 seconds, plus text “Report downloaded” | spinner until done | Clear feedback |
| M14 | F6 usage table | Sorting a column crossfades rows (no reordering travel) | 120ms | Avoid motion sickness on long tables |
| M15 | Dialogs | Backdrop fades 0→0.5; dialog scales 0.98→1 and fades in; on close, reverse in 120ms; focus returns to the opener | 160ms | Accessible dialog entrance/exit |
| M16 | Toasts | Slide up 12px + fade in at bottom-left (bottom-center on mobile). Success toasts stay for at least 8 seconds, pause on hover and focus, and have a close button. **Error toasts never auto-dismiss.** | 200ms | Non-blocking feedback |
| M17 | Skeleton loading | Placeholder rows with a soft light sweep across them. The sweep runs for at most 3 passes (≈4.5s total) then holds static; the region has `aria-busy="true"` and visually-hidden text “Loading rooms” | 1.5s per pass, max 3 | Show structure while data loads, no endless motion |
| M18 | Buttons and links | Hover colour transition, 1px press translate | 80–120ms | Direct feedback |
| M19 | Form validation | Inline error text expands in (height 0→auto via `grid-template-rows` transition) and the field's border switches to Error colour; the error summary at the top of the form receives focus | 160ms | Make errors discoverable without relying on movement |
| M20 | Disclosure panels (filters, mobile menu, “agenda tasks” list) | Panel expands with height + opacity; chevron icon rotates 180° | 200ms | Show open/closed |

#### B9.3 Motion rules (accessibility and restraint)

1. **Respect `prefers-reduced-motion: reduce`.** Under this setting M1–M20 are replaced by instant state changes or opacity-only crossfades of ≤80ms: no transforms, no sliding, no stamp scale/rotation (the stamp simply appears), no bar growth (bars render at full length), no skeleton sweep (static placeholder).
2. **In-app “Reduce motion” toggle** in the footer sets `data-motion="reduced"` on `<html>` (persisted in `localStorage`, defaulting to the OS preference) and triggers the same rules, so reviewers can demonstrate the behaviour without changing OS settings.
3. **No flashing:** nothing flashes more than once per second, and no element flashes at all more than once per action (the M4 highlight and M5 pulse each run once).
4. **No auto-playing motion longer than 5 seconds**; no looping animations anywhere except spinners shown during an active request (a spinner has a text equivalent and is removed when the request ends).
5. **No moving or blinking text**, no marquee, no typewriter effects, no parallax, no scroll-jacking, no scroll-triggered animation of core content.
6. **Motion never replaces information.** Every animated change is also communicated as text (visible text and/or `aria-live` announcement).
7. **Focus is never lost during animation.** FLIP and view transitions must not unmount the focused element; if an element must be re-created, focus is restored programmatically to its equivalent.
8. **Interaction during animation:** controls stay operable while animating (no `pointer-events: none` locks longer than 120ms).
9. **Performance budget:** animations use only `transform`/`opacity`; no animation may drop below ~50fps on a mid-range laptop in the review checklist (F1 item: check with browser performance panel; *to be measured, not assumed*).

#### B9.4 Implementation notes for developers

- Define the tokens as CSS custom properties in `globals.css`; wrap all keyframes/transitions in a single `@media (prefers-reduced-motion: no-preference)` block and gate the in-app toggle with `html:not([data-motion="reduced"])`.
- Provide one reusable `useReducedMotion()` hook (reads media query and the toggle) for the FLIP helper and for JS-driven animations (stamp, bar growth).
- The FLIP helper (`lib/motion/flip.ts`) takes a container ref and animates children by `data-flip-id`; it does nothing when reduced motion is active.
- The stamp, check-draw and bar growth are plain SVG/CSS; no GIF/video/Lottie.

---

## C. Information architecture and screen specifications

### C1. Navigation

**Primary navigation (Student / Team Lead):** Rooms · My bookings · Teams. When a team is selected (header team switcher), a secondary tab bar appears on team pages: Overview · Sessions · Board · Milestones · Calendar · Contributions.

**Primary navigation (Staff Admin):** Rooms · Rules · Usage (all under `/staff/...`). Staff Admin does not see Teams links.

**Small screens (<1024px):** nav collapses into a “Menu” disclosure button in the header; the team tab bar becomes a horizontally scrollable `<nav aria-label="Team sections">` list with visible scroll affordance (fade + the current tab auto-scrolled into view); no hover-only behaviour.

**Access restrictions:** enforced on the server for every route in the table of section 0. Students visiting `/staff/*` see a permission-denied page (state in section D). Non-members visiting `/teams/[teamId]/*` see the same.

### C2. Main user journeys

| # | Journey | Route sequence | Features |
|---|---------|----------------|----------|
| J1 | Student books a room | `/login` → `/rooms` (filter) → `/rooms/[roomId]` → `/rooms/[roomId]/book` → confirmation → `/bookings` | F1 |
| J2 | Team Lead books a session for the team | `/teams/[teamId]/sessions/new` → select slot (reuses F1 availability) → attach agenda tasks and attendees → confirmation → `/teams/[teamId]/sessions` | F2 (uses F1, F3) |
| J3 | Team plans work | `/teams/[teamId]/board` (create/assign task, “Move to”) → `/teams/[teamId]/milestones` (create milestone) → `/teams/[teamId]/calendar` (see all) | F3, F4 |
| J4 | Team Lead exports contribution report | `/teams/[teamId]/contributions` → Download report | F5 |
| J5 | Staff Admin sets rules | `/staff/rules` (max hours/day, blackout) → `/staff/rooms` (edit room) → `/staff/usage` | F6 |
| J6 | New student joins a team | `/teams` → “Join with code” → `/teams/[teamId]` | F2 |

### C3. Screen specifications

Each screen uses the layout shell (B8): one `h1`, optional `h2` sections, `h3` inside panels.

#### S1. `/login` — Sign in (supporting)

- **Purpose:** authenticate as Student, Team Lead or Staff Admin.
- **Layout:** centered 400px panel on Paper; `h1` “Sign in to StudySlot Teams”; fields Email, Password; primary button “Sign in”. Below, a Sand-coloured “Demo accounts” disclosure listing the seeded demo emails and the shared demo password (non-sensitive demo data).
- **Data:** none beyond credentials.
- **Actions:** primary “Sign in”; secondary link “Use a demo account”.
- **Related:** all features (gate).

#### S2. `/rooms` — Room search (F1) — *key screen*

- **Purpose:** find a suitable, free room quickly.
- **Hierarchy:** `h1` “Find a study room” → filter panel → results count → results table/list.
- **Layout (≥lg):** two columns: left 320px filter panel (`<form role="search">`), right results. Below `lg`: filters collapse into a “Filters (n active)” disclosure above the results.
- **Filter fields (all with visible labels):** Date (date input, required), Start time (time, required), End time (time, required), Minimum capacity (number, optional), Equipment (checkbox group: Whiteboard, Display screen, Power sockets, Video-conferencing, Accessible entrance), Building (select, optional). Instructions line: “Fields marked * are required. Times use campus time (Asia/Kolkata).”
- **Results presentation:** a **table** on ≥md (columns: Room, Building / floor, Capacity, Equipment, Availability for your time, Action) and a stacked row list below md. Availability cell states “Free” / “Booked” / “Unavailable: Blackout date” with the state icon from B7. Primary row action: link-button “View and book”.
- **Secondary actions:** “Clear filters”; sort select (Capacity, Name, Earliest free).
- **Empty / no-results:** “No rooms match these filters for Thu 12 Nov, 14:00–15:00. Try a shorter time, a smaller capacity, or remove an equipment filter.” with “Clear filters” button.
- **Motion:** M2 stagger on result change; M17 skeleton on first load.
- **Related:** F6 (rooms and rules feed this screen), F2 (reuses availability).

#### S3. `/rooms/[roomId]` — Room detail (F1)

- **Purpose:** show one room's attributes and its day timeline before booking.
- **Hierarchy:** breadcrumb → `h1` room name (“Room 2.04 — Library, Level 2”) → attributes list (capacity, equipment, opening hours, rules summary: “Max 2 hours per day per student”) → `h2` “Availability on {date}” with date picker → timeline (M3) and a text list of the same slots → primary button “Book this room”.
- **Presentation:** timeline strip (08:00–22:00 hourly ticks) *and* an adjacent `<ul>` of free windows (“09:00–10:30”, “14:00–18:00”); the list is the accessible equivalent.
- **Actions:** primary “Book this room” (disabled with reason if user already reached daily limit); secondary “Back to results”.

#### S4. `/rooms/[roomId]/book` — Booking form (F1) — *key screen*

- **Purpose:** book a time slot with no double-booking.
- **Layout:** two columns on ≥lg (form 640px; sticky summary panel 320px on the right); single column with the summary above the submit button on smaller screens.
- **Fields:** Date*, Start time*, End time*, Purpose (optional text, max 120 characters with live character count), “Book for” (radio: Just me / My team) — selecting “My team” shows Team select* and the message “Team sessions use the team booking form” with a link to F2 (`/teams/[teamId]/sessions/new`).
- **Instructions:** “Required fields are marked *. Bookings are in 30-minute steps, up to 2 hours.” (values read from rules).
- **Validation:** inline text errors (“End time must be after start time”, “This room is booked 14:00–15:00. Next free slot: 15:00–16:00”); an error summary (`role="alert"`) at top lists all errors as links to the fields.
- **Summary panel:** room, date, times, duration, rule check results (“Within your 2-hour daily limit: 1 h used, 1 h requested”).
- **Success:** M6 stamp + confirmation text and two links: “View my bookings”, “Book another room”.
- **Failure:** M5 for conflict; network failure state (section D).

#### S5. `/bookings` — My bookings (F1)

- **Purpose:** see and manage own bookings.
- **Layout:** `h1` “My bookings”; `h2` “Upcoming” and `h2` “Past and cancelled”. Table: Room, Date, Time, Team (or “Personal”), Status badge (Confirmed / Cancelled), Actions (Cancel). Past rows have no actions.
- **Actions:** “Cancel” opens the confirmation dialog (section D); after cancelling, an “Undo” toast is available for 8 seconds *only if the slot is still free* (otherwise toast says “Cancelled”).
- **Empty:** “You have no upcoming bookings. Find a room” (link to `/rooms`).

#### S6. `/teams` — Teams (F2)

- **Purpose:** create or join a team.
- **Layout:** `h1` “Your teams”; list of teams (name, your role as text badge “Team Lead”/“Member”, member count, next session). Beside it, two panels: “Create a team” (Team name*, Project name*) and “Join with a code” (Join code*, 6 characters).
- **Errors:** invalid code, name already used by you.
- **Empty:** “You are not in a team yet. Create one or join with a code from your Team Lead.”

#### S7. `/teams/[teamId]` — Team overview (F2)

- **Purpose:** one landing view of the team's state.
- **Layout:** `h1` team name; `h2` “Next session”; `h2` “Open tasks due this week” (max 5 rows, link “All tasks”); `h2` “Next milestone”; `h2` “Members” (name, role badge; join code visible to Team Lead only).
- **Presentation:** plain lists separated by rules, not cards.

#### S8. `/teams/[teamId]/sessions` — Team sessions (F2)

- **Purpose:** see booked team sessions and their agenda.
- **Layout:** table: Date/time, Room, Attendees (count), Agenda tasks (count), Status. Row expands (disclosure, M20) to show agenda tasks and attendees.
- **Actions:** primary “Book a team session” (visible to the Team Lead only; members see the list read-only with a note “Only your Team Lead can book team sessions”); row action “Cancel session” (Team Lead only).

#### S9. `/teams/[teamId]/sessions/new` — Book a team session (F2) — *key screen*

- **Purpose:** book a room for the whole team and attach what the session will cover.
- **Layout:** step-less single form, three `h2` sections: “1. When and where” (date, start, end, minimum capacity auto-set to number of selected attendees, equipment checkboxes, then a list of matching free rooms as radio group with the same availability labels as S2), “2. Agenda” (checkbox list of the team's open tasks, with titles and assignees; optional free-text note ≤200 chars), “3. Attendees” (checkbox list of team members, defaulting to all, with capacity check message “6 attendees; Room 2.04 holds 8”).
- **Primary action:** “Book session”. **Secondary:** “Cancel”.
- **Failure:** same conflict handling as S4 (M5); capacity exceeded error in text.
- **Success:** M6 stamp, session summary, link to `/teams/[teamId]/sessions`.

#### S10. `/teams/[teamId]/board` — Task board (F3) — *key screen*

- **Purpose:** manage tasks without drag-and-drop.
- **Layout:** `h1` “Task board”; toolbar (primary “New task”; filters: Assignee select, Due: All / This week / Overdue). Four lists in a responsive row (4 columns ≥lg, 2×2 at md, single column below md), each an `<section>` with `h2`: To do, In progress, In review, Done, plus a task count in text (“To do (3)”).
- **Task item (compact row, not a card):** title (link to open detail dialog), assignee name, due date with state text (“Due Fri 14 Nov”, “Overdue by 2 days” with Error colour and warning icon), points (“3 pts”), and the **“Move to” select** (label visible: “Move to”, options: To do, In progress, In review, Done; changing it applies immediately and announces the result). Keyboard: Tab reaches title then Move to; Arrow keys change the select value; no hidden gestures.
- **New/edit task dialog:** Title*, Description (≤500), Assignee (select of team members), Due date, Points (1–5), Status (create defaults to To do).
- **Permissions:** any member can move their own tasks; Team Lead can edit/assign/move any task.
- **Motion:** M7, M8, M15.
- **Empty list:** “No tasks in review.” (plain text, no illustration).

#### S11. `/teams/[teamId]/milestones` — Milestones (F4)

- **Purpose:** track project deadlines.
- **Layout:** `h1` “Milestones”; table: Milestone, Due date, Progress (“3 of 5 linked tasks done” as text; thin bar is supplementary), Status (Open / Completed, with “Overdue” text badge derived from date). Team Lead sees “New milestone” and row actions Edit / Mark completed.
- **Milestone form (dialog):** Name*, Due date*, Description (≤300), Linked tasks (checkbox list).
- **Motion:** M11 on completion.

#### S12. `/teams/[teamId]/calendar` — Unified calendar (F4) — *key screen*

- **Purpose:** see tasks (due dates), milestones and room bookings on one schedule.
- **Views:** tabs (role `tablist`): **Agenda** (default, grouped by day) and **Week** (grid). Controls: Previous / Today / Next week buttons, a range label “10–16 Nov 2026”, and a type filter (checkboxes: Tasks, Milestones, Room sessions).
- **Agenda view:** `h2` per day (“Thursday 12 November”), then a list of entries, each with a text type label and icon: “Task due — Draft survey questions (Asha)”, “Milestone — Prototype review”, “Room session — Room 2.04, 14:00–15:00”. Always keyboard- and screen-reader-friendly.
- **Week view:** 7 columns × time rows. Each event is a focusable button/link opening a detail dialog; arrow keys do not trap focus (Tab moves through events in chronological order). Events use distinct shapes plus text labels, not just colours: task = square icon, milestone = brass diamond, room session = clock icon.
- **Motion:** M9, M10.
- **Empty:** “Nothing scheduled for this week.”

#### S13. `/teams/[teamId]/contributions` — Contribution log and report (F5) — *key screen*

- **Purpose:** make each member's completed work and workload visible and exportable.
- **Layout:** `h1` “Contributions”; period selector (Whole project / Last 7 days / Custom dates); `h2` “Workload summary” (table: Member, Tasks assigned, Tasks done, Points done, Open points, Share of completed points as percentage text; thin bars (M12) are supplementary to the numbers); `h2` “Activity log” (reverse-chronological list: “Thu 12 Nov, 16:20 — Ravi marked ‘Write survey questions’ as Done”); primary button “Download report”.
- **Report format:** CSV and printable HTML (decision recorded in plan.md); every team member can view and download it. It contains member totals, task list by member with completion dates and the period covered.
- **Wording rule:** the screen shows what was recorded; it does not rank or label members as “top” or “low”.

#### S14. `/staff/rooms` — Room management (F6)

- **Purpose:** add, edit and deactivate rooms.
- **Layout:** `h1` “Rooms”; primary “Add room”; table: Room, Building / floor, Capacity, Equipment, Status (Active/Inactive), Actions (Edit, Deactivate).
- **S14b `/staff/rooms/new` and `/staff/rooms/[roomId]/edit`:** form with Name*, Building*, Floor*, Capacity* (1–30), Equipment (checkbox group), Opening time*, Closing time*, Status (radio: Active / Inactive). Deactivating a room with future bookings shows a warning dialog listing the count and requires confirmation; existing bookings remain confirmed until cancelled by staff (decision in plan.md).

#### S15. `/staff/rules` — Booking rules (F6)

- **Purpose:** configure limits.
- **Layout:** `h1` “Booking rules”; `h2` “Limits” (Max hours per day per student*, Max booking length in hours*, Slot step in minutes (read-only: 30)); `h2` “Blackout dates” (table: Date or range, Reason, Applies to: All rooms / one room; “Add blackout” form with Start date*, End date*, Reason*, Room select).
- **Feedback:** save confirmation as `role="status"` text “Rules saved. New limits apply to bookings made from now on.”

#### S16. `/staff/usage` — Usage (F6)

- **Purpose:** show how rooms are used.
- **Layout:** `h1` “Room usage”; period selector; table: Room, Bookings, Hours booked, Utilisation (hours booked ÷ opening hours, as percentage text), Cancelled bookings. A CSV export link. **No decorative charts**: the table is the content; a single bar per row is permitted only as a supplement to the percentage.
- **Stretch (cut first):** no-show column once check-in exists.

---

## D. Components and interaction states

Reusable components (implemented under `components/`):

| Component | Variants | Rules |
|-----------|----------|-------|
| `Button` | primary (green fill), secondary (outline), destructive (error fill), link-button | One primary per view; destructive only inside confirmation dialogs or clearly named (“Cancel booking”); minimum 44px height |
| `IconButton` | default, destructive | Must have `aria-label`; 44×44 hit area; tooltip on hover/focus (not the only label source) |
| `TextField`, `TextArea`, `NumberField`, `DateField`, `TimeField`, `Select` | default, error, disabled | Visible `<label>` above the field; helper text linked by `aria-describedby`; `*` required marker plus `required` attribute; placeholder used only for format hints (“e.g. 14:30”) |
| `CheckboxGroup`, `RadioGroup` | default | `<fieldset>` + `<legend>`; items ≥44px tall |
| `FormErrorSummary` | — | Appears at top of form on submit failure, `role="alert"`, receives focus, lists errors as anchor links |
| `StatusBadge` | booking, task, milestone, room | Icon + text (sentence case) + tinted background from B1; never colour-only |
| `SlotTimeline` | availability, selectable | Visual strip plus text list equivalent; slots are buttons with accessible names (“Free, 14:00 to 15:00”) |
| `DataTable` | sortable, with row actions | `<table>` with `<caption>` (visually hidden if redundant), `<th scope>`; sortable headers are buttons with `aria-sort` |
| `TaskRow` | default, overdue | Includes `MoveToSelect` |
| `MoveToSelect` | — | Native `<select>` with visible label; change applies immediately and announces via live region |
| `Dialog` | default, confirmation | Native `<dialog>` or ARIA modal pattern: `aria-labelledby`, focus trapped *within* dialog while open (Escape closes; this is not a keyboard trap), focus returns to opener |
| `Toast` | success, info, error | See M16; stack max 3; role `status` (success/info) or `alert` (error) |
| `Tabs` | page tabs, view tabs | `role="tablist"`; arrow keys move between tabs; links used instead where tabs navigate routes |
| `Disclosure` | filters, row expand | `<button aria-expanded>` controlling a region |
| `EmptyState` | no data, no results | Plain text, one sentence about what's missing and one about the next step; no illustration |
| `Skeleton` | rows, table | See M17; `aria-busy` region |
| `BookingStamp` | — | Decorative SVG, `aria-hidden`, paired with visible confirmation text (M6) |

### D1. State matrix

| State | Treatment |
|-------|-----------|
| Default / hover / focus / active / disabled / loading | As B6 |
| **Validation error** | Field border becomes Error colour 2px, error icon + text below the field in Error colour, `aria-invalid="true"`, `aria-describedby` references error id; error summary at top. Errors are never colour-only |
| **Empty** | `EmptyState` text per screen (see C3) |
| **No results** | “No rooms match…” plus suggestions and a “Clear filters” action |
| **Success** | Toast (`role="status"`) *and* an inline text confirmation on the page where the action happened; booking uses M6 |
| **Permission denied** | Full-page message under the layout shell: `h1` “You don't have access to this page”, text “This page is for {Staff Admins / members of this team}.”, link to a safe page (`/rooms`) |
| **Network failure** | Inline error panel: “We couldn't reach the server. Your changes were not saved.” with “Try again” button; form data kept in place; no auto-retry loop beyond one automatic retry for read requests |
| **Conflict (concurrent change)** | Booking: M5 + text “That slot was just booked by someone else.” and next-free-slot button. Task: “This task changed since you opened it. Reload to see the latest.” with reload action |
| **Not found** | “We couldn't find that room/team” with link back |

### D2. Destructive actions

| Action | Confirmation | Recovery |
|--------|--------------|----------|
| Cancel booking (S5, S8) | Dialog: “Cancel booking for Room 2.04 on Thu 12 Nov, 14:00–15:00?” Buttons: “Keep booking” (default focus) / “Cancel booking” (destructive) | “Undo” toast for 8 seconds if slot still free; otherwise the user rebooks |
| Delete task (S10) | Dialog with task title; default focus on “Keep task” | Task status stored as removed only after confirmation; “Undo” toast for 8 seconds (soft-delete flag in data model; see plan.md) |
| Deactivate room (S14) | Dialog showing number of future bookings affected | Staff can reactivate; bookings unaffected |
| Remove member from team (Team Lead) | Dialog naming the member and the tasks that will become unassigned | Member can rejoin with the code |
| Delete blackout date | Dialog | Re-add manually |

### D3. Microcopy samples

- Button labels: “Book this room”, “Book session”, “Move to”, “Download report”, “Mark completed”.
- Success: “Booking confirmed: Room 2.04, Thu 12 Nov, 14:00–15:00.”
- Conflict: “That slot was just booked by someone else. The next free slot in Room 2.04 is 15:00–16:00.”
- Limit: “You have booked 2 of 2 hours allowed today. Choose another date or cancel an existing booking.”
- Blackout: “Room 2.04 is unavailable on Mon 17 Nov: building maintenance.”
- Validation: “Enter a start time. Use the format 14:30.”
- Permission: “Only the Team Lead can create milestones.”
- Seeded demo content (names, rooms, tasks) is realistic but fictional and contains no real personal data.

---

## E. Accessibility and responsiveness

### E1. Mapping of the evaluation rubric

| Rubric item | Design / implementation rule |
|-------------|------------------------------|
| Proper HTML document structure (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`) | Next.js App Router generates the document shell from `app/layout.tsx`, which renders `<html lang="en">` and `<body>`; the doctype and `<head>` (title, meta viewport, charset) are emitted by the framework. Each route sets a unique `<title>` via the metadata API. *To be verified by viewing page source of a built page.* |
| Semantic landmarks | Layout renders `<header>`, `<nav aria-label="Main">`, `<main id="main">`, `<footer>`; secondary navs have distinct `aria-label`s; search form uses `role="search"`; no layout built solely from `<div>`s |
| Logical heading hierarchy | Exactly one `h1` per page (page title); sections `h2`; panel titles `h3`; no skipped levels; headings are not chosen for size (visual size comes from classes) |
| Text contrast (4.5:1 / 3:1) | Only palette pairs in B2; no text lighter than Slate on Paper/Surface/Sand; non-text UI (borders, focus) ≥3:1 |
| Minimum 16px body text, line height, spacing | `html` font-size 100% (16px); no text token under 16px; body line-height 1.6; paragraph spacing 16px; max line length 70ch; users can zoom to 200% and text resize without loss of content |
| Avoid excessive ALL CAPS, blinking, moving text | No `text-transform: uppercase`; sentence-case badges; no blink/marquee; motion rules B9.3 |
| Images: informative alt text, decorative `alt=""` | No photos in MVP; optional room photo requires admin-written alt text; decorative SVGs `aria-hidden="true"` / `alt=""` |
| Audio/video captions or transcripts | **Conditional / not applicable:** no audio or video used |
| Every input has a label | Visible `<label for>` for each field; `fieldset/legend` for groups; icon-only controls use `aria-label`; search inputs also visibly labelled |
| Placeholders are hints, not labels | Placeholders only for formats (“e.g. 14:30”); every field keeps its label |
| Errors explained in text | Error summary + inline text with icon; border colour is supplementary |
| Clear instructions, required fields marked | Instruction line at top of every form (“Fields marked * are required.”); `*` plus `required`/`aria-required`; helper text for formats and limits |
| All fields usable with Tab | Native form controls only; custom widgets (SlotTimeline, Tabs) implement standard keyboard patterns; tab order follows visual order |
| Visible keyboard focus, no keyboard traps, accessible dialogs | Global focus-visible style (B6); dialog focus management (D); Escape closes; no `tabindex` > 0 |
| Meaningful loading/success/failure feedback | Skeleton + `aria-busy`, toasts + inline text, network failure panel (D1) |

### E2. Keyboard and focus handling

- Skip link first; after route change focus moves to `h1` (M1).
- Dialogs: focus to first meaningful control (or “Keep…” button for destructive); return to opener on close.
- Task board: all actions available via Tab/Enter/Space and select arrows; no drag-and-drop in the MVP.
- Calendar Week grid: events are in DOM chronological order; Tab traverses them; Agenda view is the default and the complete alternative.
- Live regions: one `aria-live="polite"` region per page for result counts and moves; `role="alert"` only for blocking errors.
- Tooltips appear on focus as well as hover and are dismissible with Escape.

### E3. Accessible names for icon-only controls

Close dialog (“Close”), Previous/Next week (“Previous week”, “Next week”), menu button (“Open menu”), toast close (“Dismiss notification”), row overflow (“Actions for {item}”), sort toggles (“Sort by capacity”). Icons inside text buttons are `aria-hidden="true"`.

### E4. Responsive behaviour

| Width | Layout |
|-------|--------|
| 360–639px (mobile) | Single column; nav in disclosure; tables become stacked row lists (each row a `<li>` with labelled values: “Capacity: 8”); filters in disclosure; booking summary above submit; board lists stacked; team tab bar scrolls horizontally |
| 640–1023px (tablet) | Single/two-column content; tables stay tables if ≤6 columns, else stack; board 2×2; nav still disclosure |
| ≥1024px (desktop) | Nav rail visible, two-column forms with sticky summary, board 4 columns, full tables |

Long content rules: long room/team/task names wrap (`overflow-wrap: anywhere`), never truncate without a full-text accessible alternative; tables inside a `overflow-x: auto` wrapper with `tabindex="0"` and an accessible label only when they cannot stack; no fixed pixel heights on text containers; the app must work at 320px width and 200% zoom (WCAG reflow).

### E5. Feedback not dependent on colour

Every status/state has text and an icon or pattern: Overdue = warning icon + “Overdue by 2 days”; Booked = hatch + “Booked”; Error = icon + message; Selected = check icon + “Selected”; Completed = check icon + “Completed”.

---

## F. Design verification and screenshot plan

### F1. Design review checklist (to run on the built app; none executed yet)

1. Every page has `<!DOCTYPE html>`, `lang`, unique `<title>`, header/nav/main/footer landmarks.
2. One `h1` per page, no skipped heading levels (check with a heading outline tool).
3. All text ≥16px; computed contrast re-measured on rendered pages with a contrast checker, including hover/selected/disabled states.
4. Every input labelled; required marked; errors in text; verify with an accessibility scanner *and* manual screen-reader spot check (one screen reader, named in the report).
5. Complete each core journey (J1–J6) using only the keyboard.
6. Focus ring visible on every interactive element on every background.
7. Dialogs: open, Escape, focus return; no trap.
8. Motion: each animation M1–M20 present with motion on; with OS “reduce motion” on and with the in-app toggle, verify the reduced behaviour; verify nothing flashes more than once and no animation loops past 5 seconds.
9. Zoom to 200% and 320px width: no horizontal page scroll, no clipped content.
10. Check consistency: icon style, radii, spacing tokens, status badge wording against sections 0 and B.
11. Failure states: simulate network error, conflict and permission denied for each relevant screen.

### F2. Width checks

Mobile 375px, tablet 768px, desktop 1280px (browser dev tools responsive mode), plus 320px and 200% zoom as extremes.

### F3. Screenshot plan (captured from the implemented application only)

| # | Screen / state | Demonstrates | Feature |
|---|----------------|--------------|---------|
| 1 | `/login` with demo accounts open | Labels, required markers, instructions | Auth support |
| 2 | `/rooms` with filters applied (desktop) | Search, filters, availability states in text + hatch | F1 |
| 3 | `/rooms` at 375px with filters disclosure | Responsive stacked results | F1 |
| 4 | `/rooms` no-results state | Empty/no-results microcopy | F1 |
| 5 | `/rooms/[roomId]/book` with validation errors | Error summary + inline text errors, not colour-only | F1 |
| 6 | Conflict state (M5) | Database-enforced conflict message and next-free-slot | F1 |
| 7 | Booking confirmation with stamp (M6) | Success feedback | F1 / F2 |
| 8 | `/bookings` with cancel dialog | Accessible destructive confirmation | F1 |
| 9 | `/teams/[teamId]/sessions/new` complete form | Team booking with agenda tasks and attendees | F2 |
| 10 | `/teams/[teamId]/sessions` with expanded row | Session agenda and attendees | F2 |
| 11 | `/teams/[teamId]/board` desktop | Four lists, Move to controls | F3 |
| 12 | Board during/after “Move to” with live message visible | Keyboard-friendly status change | F3 |
| 13 | Task dialog with required fields | Form accessibility | F3 |
| 14 | `/teams/[teamId]/milestones` | Milestones, overdue text | F4 |
| 15 | Calendar Agenda view | Unified schedule, text equivalents | F4 |
| 16 | Calendar Week view | Grid alternative | F4 |
| 17 | `/teams/[teamId]/contributions` | Workload summary + activity log | F5 |
| 18 | Downloaded report opened | Export result | F5 |
| 19 | `/staff/rooms` and edit form | Room management | F6 |
| 20 | `/staff/rules` with blackout dates | Rules management | F6 |
| 21 | `/staff/usage` | Usage view | F6 |
| 22 | Permission-denied page (Student on `/staff/rooms`) | Access control feedback | F6 / security |
| 23 | Keyboard focus visible on a booking form field and a button | Focus visibility | Rubric |
| 24 | Reduced-motion toggle on and a motion-on comparison note | Motion rules compliance | Rubric / B9 |

Motion cannot be shown in a still screenshot; the report should describe M6/M7 and may include a short screen recording or a before/after frame pair, clearly labelled as such.

### F4. Remaining design assumptions and decisions to validate

- Atkinson Hyperlegible, Source Serif 4 and the icon library are available through the chosen build pipeline (verify at setup).
- Contrast values are computed from hex values only; re-verify in the rendered UI.
- Campus time zone default (`Asia/Kolkata`) is an assumption; confirm with the project context.
- Report format (CSV + printable HTML) and the exact rights of non-lead members to export are recorded in `plan.md`; confirm with the team.
- Dark mode, room photos, waitlist, check-in/no-show and anonymous peer feedback are out of scope for the core (stretch only).
- Whether the animation catalogue is too rich for the available time: the minimum set to implement first is M1, M6, M7, M15, M16 and M17; the others are enhancements.
