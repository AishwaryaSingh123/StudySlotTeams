// StudySlot Teams — Pure Booking Rules and Validation

import { Room, Rules, BlackoutDate, Booking } from '../repo/types';
import {
  durationInHours,
  getCampusDateString,
  getCampusTimeString,
  intervalsOverlap,
} from '../time/campus';

export interface BookingRuleViolation {
  code:
    | 'INVALID_STEP'
    | 'OUTSIDE_HOURS'
    | 'EXCEEDS_MAX_DURATION'
    | 'EXCEEDS_DAILY_LIMIT'
    | 'BLACKOUT_DATE'
    | 'ROOM_INACTIVE'
    | 'CAPACITY_EXCEEDED'
    | 'CONFLICT'
    | 'PAST_DATE';
  message: string;
}

/**
 * Validate that time strings adhere to the 30-minute step requirement.
 */
export function validateSlotStep(timeStr: string, slotMinutes = 30): boolean {
  const parts = timeStr.split(':');
  if (parts.length < 2) return false;
  const minutes = parseInt(parts[1], 10);
  return minutes % slotMinutes === 0;
}

/**
 * Validate that a slot is entirely within a room's daily opening hours.
 */
export function isWithinOpeningHours(
  slotStartTime: string, // HH:mm
  slotEndTime: string, // HH:mm
  opensAt: string, // HH:mm:ss or HH:mm
  closesAt: string // HH:mm:ss or HH:mm
): boolean {
  const open = opensAt.slice(0, 5);
  const close = closesAt.slice(0, 5);
  return slotStartTime >= open && slotEndTime <= close && slotStartTime < slotEndTime;
}

/**
 * Check if a date string falls inside any applicable blackout dates for a room.
 */
export function checkBlackout(
  dateStr: string, // YYYY-MM-DD
  roomId: string,
  blackouts: BlackoutDate[]
): { isBlackout: boolean; reason?: string } {
  for (const b of blackouts) {
    if (b.room_id === null || b.room_id === roomId) {
      if (dateStr >= b.start_date && dateStr <= b.end_date) {
        return { isBlackout: true, reason: b.reason };
      }
    }
  }
  return { isBlackout: false };
}

/**
 * Calculate user's total booked hours for a given campus date.
 */
export function calculateDailyBookedHours(
  userId: string,
  targetDateStr: string, // YYYY-MM-DD campus local
  allBookings: Booking[]
): number {
  return allBookings
    .filter(
      (b) =>
        b.status === 'confirmed' &&
        b.booked_by === userId &&
        getCampusDateString(b.starts_at) === targetDateStr
    )
    .reduce((sum, b) => sum + durationInHours(b.starts_at, b.ends_at), 0);
}

/**
 * Comprehensive pre-booking rule validation.
 */
export function validateBookingRules(params: {
  room: Room;
  rules: Rules;
  blackouts: BlackoutDate[];
  userExistingBookings: Booking[];
  userId: string;
  startsAt: string; // ISO UTC
  endsAt: string; // ISO UTC
  attendeeCount?: number;
}): { valid: boolean; error?: BookingRuleViolation } {
  const { room, rules, blackouts, userExistingBookings, userId, startsAt, endsAt, attendeeCount } = params;

  if (room.status !== 'active') {
    return {
      valid: false,
      error: { code: 'ROOM_INACTIVE', message: `Room ${room.name} is currently inactive and cannot be booked.` },
    };
  }

  const campusDate = getCampusDateString(startsAt);
  const startTime = getCampusTimeString(startsAt);
  const endTime = getCampusTimeString(endsAt);

  // Past date check
  const todayStr = getCampusDateString(new Date());
  if (campusDate < todayStr) {
    return {
      valid: false,
      error: { code: 'PAST_DATE', message: 'Cannot book a study room for a past date.' },
    };
  }

  // 1. Step check
  if (!validateSlotStep(startTime, rules.slot_minutes) || !validateSlotStep(endTime, rules.slot_minutes)) {
    return {
      valid: false,
      error: { code: 'INVALID_STEP', message: `Bookings must align to ${rules.slot_minutes}-minute increments (e.g. 14:00, 14:30).` },
    };
  }

  // 2. Opening hours check
  if (!isWithinOpeningHours(startTime, endTime, room.opens_at, room.closes_at)) {
    return {
      valid: false,
      error: {
        code: 'OUTSIDE_HOURS',
        message: `Booking must be within operating hours (${room.opens_at.slice(0, 5)}–${room.closes_at.slice(0, 5)}).`,
      },
    };
  }

  // 3. Blackout check
  const blackoutCheck = checkBlackout(campusDate, room.id, blackouts);
  if (blackoutCheck.isBlackout) {
    return {
      valid: false,
      error: {
        code: 'BLACKOUT_DATE',
        message: `Room ${room.name} is unavailable on ${campusDate}: ${blackoutCheck.reason}.`,
      },
    };
  }

  // 4. Max booking duration check
  const requestedDuration = durationInHours(startsAt, endsAt);
  if (requestedDuration <= 0) {
    return {
      valid: false,
      error: { code: 'EXCEEDS_MAX_DURATION', message: 'End time must be strictly after start time.' },
    };
  }
  if (requestedDuration > rules.max_booking_hours) {
    return {
      valid: false,
      error: {
        code: 'EXCEEDS_MAX_DURATION',
        message: `Booking duration of ${requestedDuration}h exceeds the limit of ${rules.max_booking_hours}h per booking.`,
      },
    };
  }

  // 5. Daily booking hours limit
  const currentDailyUsed = calculateDailyBookedHours(userId, campusDate, userExistingBookings);
  if (currentDailyUsed + requestedDuration > rules.max_hours_per_day) {
    return {
      valid: false,
      error: {
        code: 'EXCEEDS_DAILY_LIMIT',
        message: `You have booked ${currentDailyUsed}h of ${rules.max_hours_per_day}h allowed today. Requesting ${requestedDuration}h exceeds your daily limit.`,
      },
    };
  }

  // 6. Capacity check (for team sessions)
  if (attendeeCount !== undefined && attendeeCount > room.capacity) {
    return {
      valid: false,
      error: {
        code: 'CAPACITY_EXCEEDED',
        message: `Session has ${attendeeCount} attendees, but ${room.name} only accommodates up to ${room.capacity} people.`,
      },
    };
  }

  return { valid: true };
}

/**
 * Find the next available free slot for a room of a given duration on that day.
 */
export function findNextFreeSlot(
  room: Room,
  requestedDate: string, // YYYY-MM-DD
  afterTime: string, // HH:mm
  durationHours: number,
  existingBookings: Booking[],
  blackouts: BlackoutDate[]
): { start: string; end: string } | null {
  const open = room.opens_at.slice(0, 5);
  const close = room.closes_at.slice(0, 5);
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  const totalMinutesClose = closeH * 60 + closeM;

  const [afterH, afterM] = afterTime.split(':').map(Number);
  let currentMinutes = Math.max(openH * 60 + openM, afterH * 60 + afterM);
  // Round up to nearest 30 min
  if (currentMinutes % 30 !== 0) {
    currentMinutes += 30 - (currentMinutes % 30);
  }

  const durationMinutes = Math.round(durationHours * 60);

  while (currentMinutes + durationMinutes <= totalMinutesClose) {
    const slotStartH = Math.floor(currentMinutes / 60);
    const slotStartM = currentMinutes % 60;
    const slotEndH = Math.floor((currentMinutes + durationMinutes) / 60);
    const slotEndM = (currentMinutes + durationMinutes) % 60;

    const startStr = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;
    const endStr = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;

    // Check conflict
    const hasConflict = existingBookings.some((b) => {
      if (b.status !== 'confirmed' || b.room_id !== room.id) return false;
      const bDate = getCampusDateString(b.starts_at);
      if (bDate !== requestedDate) return false;
      const bStart = getCampusTimeString(b.starts_at);
      const bEnd = getCampusTimeString(b.ends_at);
      return intervalsOverlap(startStr, endStr, bStart, bEnd);
    });

    if (!hasConflict) {
      return { start: startStr, end: endStr };
    }

    currentMinutes += 30;
  }

  return null;
}
