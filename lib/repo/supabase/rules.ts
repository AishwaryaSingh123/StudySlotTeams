// StudySlot Teams — Supabase Rules and Blackout Repository
import { getSupabaseClient } from '../../supabase/server';
import {
  IRulesRepo,
  Rules,
  BlackoutDate,
  Result,
} from '../types';
import { getCampusDateString } from '../../time/campus';

export class SupabaseRulesRepo implements IRulesRepo {
  async getRules(): Promise<Rules> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.from('rules').select('*').limit(1).maybeSingle();

    if (!data) {
      return {
        id: 1,
        max_hours_per_day: 2.0,
        max_booking_hours: 2.0,
        slot_minutes: 30,
      };
    }

    return {
      id: typeof data.id === 'number' ? data.id : 1,
      max_hours_per_day: Number(data.max_hours_per_day),
      max_booking_hours: Number(data.max_booking_hours || 2.0),
      slot_minutes: Number(data.slot_step_minutes || data.slot_minutes || 30),
    };
  }

  async updateRules(callerId: string, patch: Partial<Rules>): Promise<Result<Rules>> {
    const supabase = getSupabaseClient();
    const { data: user } = await supabase.from('profiles').select('role').eq('id', callerId).single();
    if (user?.role !== 'staff_admin') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Only Staff Admins can update booking rules.' } };
    }

    const current = await this.getRules();
    const updates: Record<string, any> = {};

    if (patch.max_hours_per_day !== undefined) {
      if (patch.max_hours_per_day < 1 || patch.max_hours_per_day > 8) {
        return { ok: false, error: { code: 'VALIDATION_FAILED', message: 'Max hours per day must be between 1 and 8.' } };
      }
      updates.max_hours_per_day = patch.max_hours_per_day;
    }

    if (patch.max_booking_hours !== undefined) {
      const maxDay = patch.max_hours_per_day || current.max_hours_per_day;
      if (patch.max_booking_hours > maxDay) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'Max booking length cannot exceed the daily hours limit.' },
        };
      }
      updates.max_booking_hours = patch.max_booking_hours;
    }

    await supabase.from('rules').update(updates).eq('id', 'default');
    const updated = await this.getRules();
    return { ok: true, data: updated };
  }

  async listBlackoutDates(): Promise<BlackoutDate[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('blackout_dates').select('*');
    if (error || !data) return [];

    return data.map((b: any) => ({
      id: b.id,
      room_id: b.room_id || null,
      start_date: b.date || b.start_date,
      end_date: b.date || b.end_date,
      reason: b.reason,
    }));
  }

  async createBlackout(
    callerId: string,
    input: Omit<BlackoutDate, 'id'>
  ): Promise<Result<BlackoutDate & { affectedBookingsCount: number }>> {
    const supabase = getSupabaseClient();
    const { data: user } = await supabase.from('profiles').select('role').eq('id', callerId).single();
    if (user?.role !== 'staff_admin') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Only Staff Admins can manage blackout dates.' } };
    }

    if (!input.reason || input.reason.trim().length === 0) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: 'A reason for the blackout is required.' } };
    }

    if (input.end_date < input.start_date) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: 'End date cannot precede start date.' } };
    }

    const id = `blk-${Date.now().toString(36)}`;
    const { error: insertError } = await supabase.from('blackout_dates').insert({
      id,
      room_id: input.room_id || null,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason.trim(),
    });

    if (insertError) {
      return { ok: false, error: { code: 'INTERNAL', message: insertError.message } };
    }

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed');

    const affectedBookings = (bookingsData || []).filter((b: any) => {
      if (input.room_id && b.room_id !== input.room_id) return false;
      const bDate = getCampusDateString(b.starts_at);
      return bDate >= input.start_date && bDate <= input.end_date;
    });

    return {
      ok: true,
      data: {
        id,
        room_id: input.room_id || null,
        start_date: input.start_date,
        end_date: input.end_date,
        reason: input.reason.trim(),
        affectedBookingsCount: affectedBookings.length,
      },
    };
  }

  async deleteBlackout(callerId: string, id: string): Promise<Result<boolean>> {
    const supabase = getSupabaseClient();
    const { data: user } = await supabase.from('profiles').select('role').eq('id', callerId).single();
    if (user?.role !== 'staff_admin') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Only Staff Admins can delete blackout dates.' } };
    }

    await supabase.from('blackout_dates').delete().eq('id', id);
    return { ok: true, data: true };
  }
}
