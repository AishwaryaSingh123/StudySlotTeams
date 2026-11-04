import { describe, it, expect } from 'vitest';
import { computeRoomUsage } from '../../lib/rules/usage';
import { Room, Booking } from '../../lib/repo/types';

describe('Room Usage Calculations', () => {
  it('computes utilisation percentage and handles zero denominator safely', () => {
    const rooms: Room[] = [
      {
        id: 'r-1',
        name: 'Room 101',
        building: 'Library',
        floor: 1,
        capacity: 4,
        opens_at: '08:00:00',
        closes_at: '18:00:00', // 10 hours daily
        status: 'active',
        equipment: [],
      },
      {
        id: 'r-closed',
        name: 'Room Closed',
        building: 'Library',
        floor: 1,
        capacity: 4,
        opens_at: '10:00:00',
        closes_at: '10:00:00', // 0 operating hours
        status: 'inactive',
        equipment: [],
      },
    ];

    const bookings: Booking[] = [
      {
        id: 'b-1',
        room_id: 'r-1',
        booked_by: 'u-1',
        team_id: null,
        starts_at: '2026-11-12T04:30:00Z',
        ends_at: '2026-11-12T06:30:00Z', // 2 hours
        purpose: 'Study',
        status: 'confirmed',
        created_at: '',
        cancelled_at: null,
      },
      {
        id: 'b-2',
        room_id: 'r-1',
        booked_by: 'u-1',
        team_id: null,
        starts_at: '2026-11-12T08:00:00Z',
        ends_at: '2026-11-12T09:00:00Z',
        purpose: 'Cancelled',
        status: 'cancelled',
        created_at: '',
        cancelled_at: '',
      },
    ];

    const usage = computeRoomUsage({
      rooms,
      bookings,
      blackouts: [],
      period: 'last_7_days',
    });

    const r1 = usage.find((u) => u.roomId === 'r-1')!;
    expect(r1.bookings).toBe(1);
    expect(r1.hoursBooked).toBe(2);
    expect(r1.cancelled).toBe(1);
    // 7 days * 10h = 70h available. 2 / 70 * 100 = 2.9%
    expect(r1.utilisationPct).toBe(2.9);

    const rClosed = usage.find((u) => u.roomId === 'r-closed')!;
    expect(rClosed.utilisationPct).toBe(0); // guarded against NaN/division by zero
  });
});
