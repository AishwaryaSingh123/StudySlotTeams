// StudySlot Teams — Mock Booking Repository

import { IBookingRepo, Booking, CreateBookingInput, Result } from '../types';
import { getDb, withLock } from './store';
import {
  durationInHours,
  getCampusDateString,
  getCampusTimeString,
  intervalsOverlap,
} from '../../time/campus';
import {
  findNextFreeSlot,
  validateBookingRules,
} from '../../rules/booking';

export class MockBookingRepo implements IBookingRepo {
  async getBooking(id: string): Promise<Booking | null> {
    const db = await getDb();
    const b = db.bookings.find((item) => item.id === id);
    if (!b) return null;

    // Join room, team, booker
    const room = db.rooms.find((r) => r.id === b.room_id);
    const team = b.team_id ? db.teams.find((t) => t.id === b.team_id) : null;
    const booker = db.profiles.find((p) => p.id === b.booked_by);

    return {
      ...b,
      room,
      team,
      booker,
    };
  }

  async listMyBookings(userId: string): Promise<Result<{ upcoming: Booking[]; past: Booking[] }>> {
    const db = await getDb();
    const now = new Date();

    const userBookings = db.bookings
      .filter((b) => b.booked_by === userId)
      .map((b) => {
        const room = db.rooms.find((r) => r.id === b.room_id);
        const team = b.team_id ? db.teams.find((t) => t.id === b.team_id) : null;
        return {
          ...b,
          room,
          team,
        };
      });

    const upcoming = userBookings
      .filter((b) => new Date(b.ends_at) >= now && b.status === 'confirmed')
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    const past = userBookings
      .filter((b) => new Date(b.ends_at) < now || b.status === 'cancelled')
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

    return { ok: true, data: { upcoming, past } };
  }

  async createBooking(userId: string, input: CreateBookingInput): Promise<Result<Booking>> {
    return withLock((db) => {
      const room = db.rooms.find((r) => r.id === input.roomId);
      if (!room) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Room not found.' },
        };
      }

      // Check rules: step, hours, daily limit, blackout, max duration
      const ruleCheck = validateBookingRules({
        room,
        rules: db.rules,
        blackouts: db.blackouts,
        userExistingBookings: db.bookings,
        userId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      });

      if (!ruleCheck.valid && ruleCheck.error) {
        return {
          ok: false,
          error: {
            code: 'RULE_VIOLATION',
            message: ruleCheck.error.message,
          },
        };
      }

      const reqStart = new Date(input.startsAt);
      const reqEnd = new Date(input.endsAt);

      // Check overlap under mutex lock (Postgres exclusion constraint emulation)
      const conflict = db.bookings.find((b) => {
        if (b.status !== 'confirmed' || b.room_id !== input.roomId) return false;
        return intervalsOverlap(reqStart, reqEnd, new Date(b.starts_at), new Date(b.ends_at));
      });

      if (conflict) {
        const reqDate = getCampusDateString(input.startsAt);
        const reqEndTime = getCampusTimeString(input.endsAt);
        const requestedDuration = durationInHours(input.startsAt, input.endsAt);

        const nextFree = findNextFreeSlot(
          room,
          reqDate,
          reqEndTime,
          requestedDuration,
          db.bookings,
          db.blackouts
        );

        return {
          ok: false,
          error: {
            code: 'CONFLICT',
            message: `That slot was just booked by someone else.${
              nextFree
                ? ` Next free slot in ${room.name}: ${nextFree.start}–${nextFree.end}.`
                : ''
            }`,
            nextFreeSlot: nextFree,
          },
        };
      }

      const newBooking: Booking = {
        id: `b-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        room_id: input.roomId,
        booked_by: userId,
        team_id: null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        purpose: input.purpose ? input.purpose.slice(0, 120) : null,
        status: 'confirmed',
        created_at: new Date().toISOString(),
        cancelled_at: null,
      };

      db.bookings.push(newBooking);

      const booker = db.profiles.find((p) => p.id === userId);
      return {
        ok: true,
        data: {
          ...newBooking,
          room,
          booker,
        },
      };
    });
  }

  async cancelBooking(userId: string, bookingId: string): Promise<Result<Booking>> {
    return withLock((db) => {
      const booking = db.bookings.find((b) => b.id === bookingId);
      if (!booking) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Booking not found.' },
        };
      }

      if (booking.status === 'cancelled') {
        return {
          ok: false,
          error: { code: 'RULE_VIOLATION', message: 'Booking is already cancelled.' },
        };
      }

      // Check authorization: must be booker, team lead (for team sessions), or staff_admin
      const caller = db.profiles.find((p) => p.id === userId);
      const isStaff = caller?.role === 'staff_admin';
      const isOwner = booking.booked_by === userId;

      let isTeamLead = false;
      if (booking.team_id) {
        const membership = db.team_members.find(
          (m) => m.team_id === booking.team_id && m.user_id === userId
        );
        isTeamLead = membership?.role === 'lead';
      }

      if (!isOwner && !isTeamLead && !isStaff) {
        return {
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to cancel this booking.',
          },
        };
      }

      booking.status = 'cancelled';
      booking.cancelled_at = new Date().toISOString();

      const room = db.rooms.find((r) => r.id === booking.room_id);
      return {
        ok: true,
        data: {
          ...booking,
          room,
        },
      };
    });
  }

  async undoCancelBooking(userId: string, cancelledBookingId: string): Promise<Result<Booking>> {
    // Re-book via standard validation (never un-cancel the terminal record)
    const db = await getDb();
    const old = db.bookings.find((b) => b.id === cancelledBookingId);
    if (!old) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Cancelled booking reference not found.' },
      };
    }

    if (old.booked_by !== userId) {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Cannot undo a booking made by another user.' },
      };
    }

    // Try creating a new booking with the exact same slot
    return this.createBooking(userId, {
      roomId: old.room_id,
      startsAt: old.starts_at,
      endsAt: old.ends_at,
      purpose: old.purpose,
    });
  }

  async listFutureBookingsForRoom(roomId: string): Promise<Booking[]> {
    const db = await getDb();
    const now = new Date();
    return db.bookings.filter(
      (b) => b.room_id === roomId && b.status === 'confirmed' && new Date(b.ends_at) > now
    );
  }
}
