import { describe, it, expect } from 'vitest';
import {
  validateSlotStep,
  isWithinOpeningHours,
  checkBlackout,
  calculateDailyBookedHours,
  validateBookingRules,
} from '../../lib/rules/booking';
import { intervalsOverlap } from '../../lib/time/campus';
import { Booking, Room, Rules } from '../../lib/repo/types';

describe('Booking Business Rules', () => {
  it('enforces 30-minute slot step', () => {
    expect(validateSlotStep('14:00', 30)).toBe(true);
    expect(validateSlotStep('14:30', 30)).toBe(true);
    expect(validateSlotStep('14:15', 30)).toBe(false);
    expect(validateSlotStep('14:45', 30)).toBe(false);
  });

  it('validates operating hours correctly', () => {
    expect(isWithinOpeningHours('08:00', '10:00', '08:00:00', '22:00:00')).toBe(true);
    expect(isWithinOpeningHours('21:00', '22:00', '08:00:00', '22:00:00')).toBe(true);
    // Outside
    expect(isWithinOpeningHours('07:30', '08:30', '08:00:00', '22:00:00')).toBe(false);
    expect(isWithinOpeningHours('21:30', '22:30', '08:00:00', '22:00:00')).toBe(false);
    // End before start
    expect(isWithinOpeningHours('15:00', '14:00', '08:00:00', '22:00:00')).toBe(false);
  });

  it('allows adjacent non-overlapping slots (14:00-15:00 and 15:00-16:00)', () => {
    const slot1Start = '2026-11-12T08:30:00Z'; // 14:00 IST
    const slot1End = '2026-11-12T09:30:00Z';   // 15:00 IST

    const slot2Start = '2026-11-12T09:30:00Z'; // 15:00 IST
    const slot2End = '2026-11-12T10:30:00Z';   // 16:00 IST

    expect(intervalsOverlap(slot1Start, slot1End, slot2Start, slot2End)).toBe(false);

    // Overlapping slot
    const overlapStart = '2026-11-12T09:00:00Z'; // 14:30 IST
    const overlapEnd = '2026-11-12T10:00:00Z';   // 15:30 IST
    expect(intervalsOverlap(slot1Start, slot1End, overlapStart, overlapEnd)).toBe(true);
  });

  it('detects blackout dates for all rooms vs specific room', () => {
    const blackouts = [
      {
        id: 'b1',
        room_id: null, // all rooms
        start_date: '2026-11-17',
        end_date: '2026-11-17',
        reason: 'Maintenance',
      },
      {
        id: 'b2',
        room_id: 'room-spec',
        start_date: '2026-11-20',
        end_date: '2026-11-21',
        reason: 'Painting',
      },
    ];

    expect(checkBlackout('2026-11-17', 'room-other', blackouts).isBlackout).toBe(true);
    expect(checkBlackout('2026-11-20', 'room-spec', blackouts).isBlackout).toBe(true);
    expect(checkBlackout('2026-11-20', 'room-other', blackouts).isBlackout).toBe(false);
    expect(checkBlackout('2026-11-15', 'room-spec', blackouts).isBlackout).toBe(false);
  });

  it('enforces daily booking limits (1h + 1h allowed at limit 2, +30m rejected)', () => {
    const userId = 'user-1';
    const targetDate = '2026-11-12';

    const existingBookings: Booking[] = [
      {
        id: 'b-1',
        room_id: 'r-1',
        booked_by: userId,
        team_id: null,
        starts_at: '2026-11-12T04:30:00Z', // 10:00 IST
        ends_at: '2026-11-12T05:30:00Z',   // 11:00 IST (1 hour)
        purpose: 'Study',
        status: 'confirmed',
        created_at: '2026-11-01T00:00:00Z',
        cancelled_at: null,
      },
    ];

    const currentUsed = calculateDailyBookedHours(userId, targetDate, existingBookings);
    expect(currentUsed).toBe(1);

    const testRoom: Room = {
      id: 'r-1',
      name: 'Room 101',
      building: 'Library',
      floor: 1,
      capacity: 6,
      opens_at: '08:00:00',
      closes_at: '22:00:00',
      status: 'active',
      equipment: ['whiteboard'],
    };

    const rules: Rules = {
      id: 1,
      max_hours_per_day: 2,
      max_booking_hours: 2,
      slot_minutes: 30,
    };

    // Another 1 hour -> total 2 hours (allowed)
    const validCheck = validateBookingRules({
      room: testRoom,
      rules,
      blackouts: [],
      userExistingBookings: existingBookings,
      userId,
      startsAt: '2026-11-12T08:30:00Z', // 14:00 IST
      endsAt: '2026-11-12T09:30:00Z',   // 15:00 IST (1h)
    });
    expect(validCheck.valid).toBe(true);

    // 1.5 hours -> total 2.5 hours (rejected)
    const invalidCheck = validateBookingRules({
      room: testRoom,
      rules,
      blackouts: [],
      userExistingBookings: existingBookings,
      userId,
      startsAt: '2026-11-12T08:30:00Z', // 14:00 IST
      endsAt: '2026-11-12T10:00:00Z',   // 15:30 IST (1.5h)
    });
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.error?.code).toBe('EXCEEDS_DAILY_LIMIT');
  });
});
