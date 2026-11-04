// StudySlot Teams — Mock Rules and Blackout Repository

import {
  IRulesRepo,
  Rules,
  BlackoutDate,
  Result,
} from '../types';
import { getDb, withLock } from './store';
import { getCampusDateString } from '../../time/campus';

export class MockRulesRepo implements IRulesRepo {
  async getRules(): Promise<Rules> {
    const db = await getDb();
    return db.rules;
  }

  async updateRules(callerId: string, patch: Partial<Rules>): Promise<Result<Rules>> {
    return withLock((db) => {
      const user = db.profiles.find((p) => p.id === callerId);
      if (user?.role !== 'staff_admin') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only Staff Admins can update booking rules.' },
        };
      }

      if (patch.max_hours_per_day !== undefined) {
        if (patch.max_hours_per_day < 1 || patch.max_hours_per_day > 8) {
          return {
            ok: false,
            error: { code: 'VALIDATION_FAILED', message: 'Max hours per day must be between 1 and 8.' },
          };
        }
        db.rules.max_hours_per_day = patch.max_hours_per_day;
      }

      if (patch.max_booking_hours !== undefined) {
        if (patch.max_booking_hours > db.rules.max_hours_per_day) {
          return {
            ok: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Max booking length cannot exceed the daily hours limit.',
            },
          };
        }
        db.rules.max_booking_hours = patch.max_booking_hours;
      }

      return { ok: true, data: { ...db.rules } };
    });
  }

  async listBlackoutDates(): Promise<BlackoutDate[]> {
    const db = await getDb();
    return db.blackouts;
  }

  async createBlackout(
    callerId: string,
    input: Omit<BlackoutDate, 'id'>
  ): Promise<Result<BlackoutDate & { affectedBookingsCount: number }>> {
    return withLock((db) => {
      const user = db.profiles.find((p) => p.id === callerId);
      if (user?.role !== 'staff_admin') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only Staff Admins can manage blackout dates.' },
        };
      }

      if (!input.reason || input.reason.trim().length === 0) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'A reason for the blackout is required.' },
        };
      }

      if (input.end_date < input.start_date) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'End date cannot precede start date.' },
        };
      }

      const newBlackout: BlackoutDate = {
        id: `blk-${Date.now().toString(36)}`,
        room_id: input.room_id || null,
        start_date: input.start_date,
        end_date: input.end_date,
        reason: input.reason.trim(),
      };

      db.blackouts.push(newBlackout);

      // Count existing confirmed bookings that fall into this blackout range
      const affectedBookings = db.bookings.filter((b) => {
        if (b.status !== 'confirmed') return false;
        if (newBlackout.room_id && b.room_id !== newBlackout.room_id) return false;
        const bDate = getCampusDateString(b.starts_at);
        return bDate >= newBlackout.start_date && bDate <= newBlackout.end_date;
      });

      return {
        ok: true,
        data: {
          ...newBlackout,
          affectedBookingsCount: affectedBookings.length,
          affectedBookings: affectedBookings.map((b) => {
            const room = db.rooms.find((r) => r.id === b.room_id);
            const user = db.profiles.find((p) => p.id === b.booked_by);
            return {
              id: b.id,
              roomName: room?.name || 'Study Room',
              bookedByName: user?.full_name || 'Student',
              bookedByEmail: user?.email || '',
              startsAt: b.starts_at,
              endsAt: b.ends_at,
            };
          }),
        },
      };
    });
  }

  async cancelBlackoutBookings(
    callerId: string,
    blackoutId: string,
    reason: string
  ): Promise<Result<{ cancelledCount: number; notifiedUsers: string[] }>> {
    return withLock((db) => {
      const user = db.profiles.find((p) => p.id === callerId);
      if (user?.role !== 'staff_admin') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only Staff Admins can cancel blackout bookings.' },
        };
      }

      const blk = db.blackouts.find((b) => b.id === blackoutId);
      if (!blk) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Blackout date reference not found.' },
        };
      }

      const affected = db.bookings.filter((b) => {
        if (b.status !== 'confirmed') return false;
        if (blk.room_id && b.room_id !== blk.room_id) return false;
        const bDate = getCampusDateString(b.starts_at);
        return bDate >= blk.start_date && bDate <= blk.end_date;
      });

      const notifiedNames: string[] = [];

      for (const b of affected) {
        b.status = 'cancelled';
        b.cancelled_at = new Date().toISOString();

        const student = db.profiles.find((p) => p.id === b.booked_by);
        if (student && !notifiedNames.includes(student.full_name)) {
          notifiedNames.push(student.full_name);
        }
      }

      return {
        ok: true,
        data: {
          cancelledCount: affected.length,
          notifiedUsers: notifiedNames,
        },
      };
    });
  }

  async deleteBlackout(callerId: string, id: string): Promise<Result<boolean>> {
    return withLock((db) => {
      const user = db.profiles.find((p) => p.id === callerId);
      if (user?.role !== 'staff_admin') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only Staff Admins can delete blackout dates.' },
        };
      }

      db.blackouts = db.blackouts.filter((b) => b.id !== id);
      return { ok: true, data: true };
    });
  }
}
