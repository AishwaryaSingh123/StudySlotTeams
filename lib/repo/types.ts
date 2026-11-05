// StudySlot Teams — Core Repository and Entity Types

export type UserRole = 'student' | 'staff_admin';
export type TeamMemberRole = 'member' | 'lead';
export type BookingStatus = 'confirmed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type MilestoneStatus = 'open' | 'completed';
export type RoomStatus = 'active' | 'inactive';

export type EquipmentType =
  | 'whiteboard'
  | 'display_screen'
  | 'power_sockets'
  | 'video_conferencing'
  | 'accessible_entrance';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  opens_at: string; // HH:mm:ss
  closes_at: string; // HH:mm:ss
  status: RoomStatus;
  equipment: EquipmentType[];
}

export interface Rules {
  id: number;
  max_hours_per_day: number;
  max_booking_hours: number;
  slot_minutes: number;
}

export interface BlackoutDate {
  id: string;
  room_id: string | null; // null = all rooms
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string;
}

export interface Team {
  id: string;
  name: string;
  project_name: string;
  join_code: string;
  created_by: string;
  created_at: string;
  member_count?: number;
  lead_name?: string;
  next_session?: {
    starts_at: string;
    ends_at: string;
    room_name: string;
  } | null;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  joined_at: string;
  profile?: Profile;
}

export interface Booking {
  id: string;
  room_id: string;
  booked_by: string;
  team_id: string | null;
  starts_at: string; // ISO 8601 UTC
  ends_at: string; // ISO 8601 UTC
  purpose: string | null;
  status: BookingStatus;
  created_at: string;
  cancelled_at: string | null;
  cancellation_reason?: string | null;
  cancellation_notified?: boolean;
  cancelled_by?: string | null;
  // Joined fields for display
  room?: Room;
  team?: Team | null;
  booker?: Profile;
  tasks?: Task[];
  attendees?: Profile[];
  session_note?: string | null;
}

export interface Task {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null; // YYYY-MM-DD
  points: number; // 1-5
  status: TaskStatus;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  assignee?: Profile | null;
  creator?: Profile;
}

export interface Milestone {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  due_date: string; // YYYY-MM-DD
  status: MilestoneStatus;
  completed_at: string | null;
  task_ids: string[];
  // Calculated
  total_tasks?: number;
  done_tasks?: number;
}

export type ActivityAction =
  | 'task_created'
  | 'task_moved'
  | 'task_completed'
  | 'task_deleted'
  | 'task_restored';

export interface ActivityLogItem {
  id: string;
  team_id: string;
  actor_id: string;
  task_id: string | null;
  action: ActivityAction;
  detail: Record<string, unknown> | null;
  created_at: string;
  actor_name?: string;
  task_title?: string;
}

// Filter and input types
export interface RoomSearchParams {
  date: string; // YYYY-MM-DD campus local
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  minCapacity?: number;
  equipment?: EquipmentType[];
  building?: string;
}

export interface RoomSearchResult {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  equipment: EquipmentType[];
  availability: 'free' | 'booked' | 'blocked';
  blockedReason?: string;
  nextFreeSlot?: { start: string; end: string } | null;
}

export interface SlotAvailability {
  start: string; // HH:mm
  end: string; // HH:mm
  state: 'free' | 'booked' | 'your_team' | 'blocked';
  reason?: string;
  bookingId?: string;
}

export interface CreateBookingInput {
  roomId: string;
  startsAt: string; // ISO 8601 UTC
  endsAt: string; // ISO 8601 UTC
  purpose?: string | null;
}

export interface CreateTeamSessionInput extends CreateBookingInput {
  teamId: string;
  taskIds: string[];
  attendeeIds: string[];
  note?: string | null;
}

export interface WorkloadMemberSummary {
  userId: string;
  name: string;
  assigned: number;
  done: number;
  pointsDone: number;
  openPoints: number;
  sharePct: number;
}

export interface RoomUsageSummary {
  roomId: string;
  name: string;
  building: string;
  capacity: number;
  bookings: number;
  hoursBooked: number;
  utilisationPct: number;
  cancelled: number;
}

export interface CalendarEntry {
  id: string;
  type: 'task' | 'milestone' | 'session';
  title: string;
  start: string; // ISO 8601 or YYYY-MM-DD
  end?: string;
  metadata?: {
    assigneeName?: string;
    roomName?: string;
    points?: number;
    status?: string;
  };
}

export type Result<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code:
          | 'UNAUTHENTICATED'
          | 'FORBIDDEN'
          | 'VALIDATION_FAILED'
          | 'NOT_FOUND'
          | 'CONFLICT'
          | 'RULE_VIOLATION'
          | 'INTERNAL';
        message: string;
        fieldErrors?: Record<string, string[]>;
        nextFreeSlot?: { start: string; end: string } | null;
      };
    };

// Base Repository Contracts
export interface IAuthRepo {
  getUserById(id: string): Promise<Profile | null>;
  getUserByEmail(email: string): Promise<Profile | null>;
  listUsers(): Promise<Profile[]>;
  updateProfile(userId: string, patch: { full_name: string }): Promise<Result<Profile>>;
  signUp?(input: { fullName: string; email: string; password?: string; userId?: string }): Promise<Result<Profile>>;
}

export interface IRoomRepo {
  listRooms(includeInactive?: boolean): Promise<Room[]>;
  getRoom(id: string): Promise<Room | null>;
  createRoom(input: Omit<Room, 'id'>): Promise<Result<Room>>;
  updateRoom(id: string, patch: Partial<Omit<Room, 'id'>>): Promise<Result<Room>>;
  setRoomStatus(id: string, status: RoomStatus): Promise<Result<Room>>;
  searchRooms(userId: string, params: RoomSearchParams): Promise<Result<{ rooms: RoomSearchResult[] }>>;
  getRoomAvailability(userId: string, roomId: string, date: string): Promise<Result<{ openingHours: { opens_at: string; closes_at: string }; slots: SlotAvailability[] }>>;
}

export interface IBookingRepo {
  getBooking(id: string): Promise<Booking | null>;
  listMyBookings(userId: string): Promise<Result<{ upcoming: Booking[]; past: Booking[] }>>;
  createBooking(userId: string, input: CreateBookingInput): Promise<Result<Booking>>;
  cancelBooking(userId: string, bookingId: string): Promise<Result<Booking>>;
  undoCancelBooking(userId: string, cancelledBookingId: string): Promise<Result<Booking>>;
  listFutureBookingsForRoom(roomId: string): Promise<Booking[]>;
  getUnacknowledgedCancellations(userId: string): Promise<Booking[]>;
  dismissCancellationNotice(userId: string, bookingId: string): Promise<Result<void>>;
}

export interface ITeamRepo {
  getTeam(teamId: string): Promise<Team | null>;
  listTeamsForUser(userId: string): Promise<Team[]>;
  createTeam(userId: string, name: string, projectName: string): Promise<Result<{ team: Team; joinCode: string }>>;
  joinTeam(userId: string, joinCode: string): Promise<Result<Team>>;
  listMembers(teamId: string): Promise<TeamMember[]>;
  removeMember(callerId: string, teamId: string, targetUserId: string): Promise<Result<boolean>>;
  createTeamSession(callerId: string, input: CreateTeamSessionInput): Promise<Result<Booking>>;
  listTeamSessions(teamId: string): Promise<Result<Booking[]>>;
  cancelTeamSession(callerId: string, teamId: string, bookingId: string): Promise<Result<Booking>>;
}

export interface ITaskRepo {
  listTasks(teamId: string, filters?: { assigneeId?: string; due?: 'all' | 'week' | 'overdue' }): Promise<Result<Task[]>>;
  createTask(callerId: string, input: { teamId: string; title: string; description?: string | null; assigneeId?: string | null; dueDate?: string | null; points: number }): Promise<Result<Task>>;
  updateTask(callerId: string, taskId: string, patch: Partial<Task>, seenUpdatedAt: string): Promise<Result<Task>>;
  moveTask(callerId: string, taskId: string, newStatus: TaskStatus, seenUpdatedAt: string): Promise<Result<Task>>;
  deleteTask(callerId: string, taskId: string): Promise<Result<Task>>;
  restoreTask(callerId: string, taskId: string): Promise<Result<Task>>;
  listActivityLog(teamId: string, period?: 'all' | 'last_7_days' | 'custom', customStart?: string, customEnd?: string): Promise<Result<ActivityLogItem[]>>;
}

export interface IMilestoneRepo {
  listMilestones(teamId: string): Promise<Result<Milestone[]>>;
  createMilestone(callerId: string, input: { teamId: string; name: string; description?: string | null; dueDate: string; taskIds: string[] }): Promise<Result<Milestone>>;
  updateMilestone(callerId: string, id: string, patch: Partial<Milestone>, taskIds?: string[]): Promise<Result<Milestone>>;
  completeMilestone(callerId: string, id: string): Promise<Result<Milestone>>;
  getCalendarEntries(teamId: string, rangeStart: string, rangeEnd: string): Promise<Result<CalendarEntry[]>>;
}

export interface IReportRepo {
  getWorkloadSummary(teamId: string, period?: 'all' | 'last_7_days' | 'custom', customStart?: string, customEnd?: string): Promise<Result<WorkloadMemberSummary[]>>;
  exportContributionReport(teamId: string, period: 'all' | 'last_7_days' | 'custom', format: 'csv' | 'html', customStart?: string, customEnd?: string): Promise<Result<{ filename: string; contentType: string; content: string }>>;
  getUsageReport(period: 'all' | 'last_7_days' | 'last_30_days'): Promise<Result<RoomUsageSummary[]>>;
  exportUsageReportCSV(period: 'all' | 'last_7_days' | 'last_30_days'): Promise<Result<{ filename: string; content: string }>>;
}

export interface AffectedBookingSummary {
  id: string;
  roomName: string;
  bookedByName: string;
  bookedByEmail: string;
  startsAt: string;
  endsAt: string;
}

export interface IRulesRepo {
  getRules(): Promise<Rules>;
  updateRules(callerId: string, patch: Partial<Rules>): Promise<Result<Rules>>;
  listBlackoutDates(): Promise<BlackoutDate[]>;
  createBlackout(callerId: string, input: Omit<BlackoutDate, 'id'>): Promise<Result<BlackoutDate & { affectedBookingsCount: number; affectedBookings?: AffectedBookingSummary[] }>>;
  deleteBlackout(callerId: string, id: string): Promise<Result<boolean>>;
  cancelBlackoutBookings?(callerId: string, blackoutId: string, reason: string): Promise<Result<{ cancelledCount: number; notifiedUsers: string[] }>>;
}
