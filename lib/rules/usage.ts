// StudySlot Teams — Room Usage Calculation Rules

import { Booking, Room, RoomUsageSummary, BlackoutDate } from '../repo/types';
import { durationInHours, getCampusDateString } from '../time/campus';

export function computeRoomUsage(params: {
  rooms: Room[];
  bookings: Booking[];
  blackouts: BlackoutDate[];
  period: 'all' | 'last_7_days' | 'last_30_days';
}): RoomUsageSummary[] {
  const { rooms, bookings, blackouts, period } = params;

  const now = new Date();
  let daysInPeriod = 30; // default for all / demo view
  let startMs = 0;

  if (period === 'last_7_days') {
    daysInPeriod = 7;
    startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else if (period === 'last_30_days') {
    daysInPeriod = 30;
    startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }

  // Filter bookings in scope
  const periodBookings = period === 'all'
    ? bookings
    : bookings.filter((b) => new Date(b.starts_at).getTime() >= startMs);

  return rooms.map((room) => {
    const roomBookings = periodBookings.filter((b) => b.room_id === room.id);
    const confirmed = roomBookings.filter((b) => b.status === 'confirmed');
    const cancelled = roomBookings.filter((b) => b.status === 'cancelled').length;

    const hoursBooked = confirmed.reduce((sum, b) => sum + durationInHours(b.starts_at, b.ends_at), 0);

    // Compute daily operating hours
    const [openH, openM] = room.opens_at.slice(0, 5).split(':').map(Number);
    const [closeH, closeM] = room.closes_at.slice(0, 5).split(':').map(Number);
    const dailyOperatingHours = Math.max(0, (closeH * 60 + closeM - (openH * 60 + openM)) / 60);

    const totalScheduledHours = dailyOperatingHours * daysInPeriod;

    // Utilisation calculation guarded against division by zero
    const utilisationPct = totalScheduledHours > 0
      ? Math.min(100, Math.round((hoursBooked / totalScheduledHours) * 1000) / 10)
      : 0;

    return {
      roomId: room.id,
      name: room.name,
      building: room.building,
      capacity: room.capacity,
      bookings: confirmed.length,
      hoursBooked: Math.round(hoursBooked * 10) / 10,
      utilisationPct,
      cancelled,
    };
  });
}
