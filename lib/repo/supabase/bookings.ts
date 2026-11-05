// StudySlot Teams — Supabase Booking Repository
import { getSupabaseClient } from '../../supabase/server';
import {
  IBookingRepo,
  Booking,
  CreateBookingInput,
  Result,
  Room,
  Rules,
  BlackoutDate,
} from '../types';
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

export class SupabaseBookingRepo implements IBookingRepo {
  async getBooking(id: string): Promise<Booking | null> {
    const supabase = getSupabaseClient();
    const { data: b, error } = await supabase
      .from('bookings')
      .select('*, rooms(*), profiles!bookings_created_by_fkey(*), teams(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !b) return null;

    return {
      id: b.id,
      room_id: b.room_id,
      booked_by: b.created_by,
      team_id: b.team_id || null,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      purpose: b.purpose,
      status: b.status,
      created_at: b.created_at,
      cancelled_at: b.cancelled_at || null,
      room: b.rooms
        ? {
            id: b.rooms.id,
            name: b.rooms.name,
            building: b.rooms.building,
            floor: b.rooms.floor,
            capacity: b.rooms.capacity,
            opens_at: b.rooms.opens_at || '08:00:00',
            closes_at: b.rooms.closes_at || '22:00:00',
            status: b.rooms.status || (b.rooms.is_active ? 'active' : 'inactive'),
            equipment: [],
          }
        : undefined,
      team: b.teams
        ? {
            id: b.teams.id,
            name: b.teams.name,
            project_name: b.teams.project_name || b.teams.name,
            join_code: b.teams.join_code,
            created_by: b.teams.created_by,
            created_at: b.teams.created_at,
          }
        : null,
      booker: b.profiles
        ? {
            id: b.profiles.id,
            full_name: b.profiles.full_name,
            email: b.profiles.email,
            role: b.profiles.role,
            created_at: b.profiles.created_at,
          }
        : undefined,
    };
  }

  async listMyBookings(userId: string): Promise<Result<{ upcoming: Booking[]; past: Booking[] }>> {
    const supabase = getSupabaseClient();
    const now = new Date();

    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(*), teams(*)')
      .eq('created_by', userId);

    if (error || !data) {
      return { ok: true, data: { upcoming: [], past: [] } };
    }

    const bookings: Booking[] = data.map((b: any) => ({
      id: b.id,
      room_id: b.room_id,
      booked_by: b.created_by,
      team_id: b.team_id || null,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      purpose: b.purpose,
      status: b.status,
      created_at: b.created_at,
      cancelled_at: b.cancelled_at || null,
      room: b.rooms
        ? {
            id: b.rooms.id,
            name: b.rooms.name,
            building: b.rooms.building,
            floor: b.rooms.floor,
            capacity: b.rooms.capacity,
            opens_at: b.rooms.opens_at || '08:00:00',
            closes_at: b.rooms.closes_at || '22:00:00',
            status: b.rooms.status || (b.rooms.is_active ? 'active' : 'inactive'),
            equipment: [],
          }
        : undefined,
      team: b.teams
        ? {
            id: b.teams.id,
            name: b.teams.name,
            project_name: b.teams.project_name || b.teams.name,
            join_code: b.teams.join_code,
            created_by: b.teams.created_by,
            created_at: b.teams.created_at,
          }
        : null,
    }));

    const upcoming = bookings
      .filter((b) => new Date(b.ends_at) >= now && b.status === 'confirmed')
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    const past = bookings
      .filter((b) => new Date(b.ends_at) < now || b.status === 'cancelled')
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

    return { ok: true, data: { upcoming, past } };
  }

  async createBooking(userId: string, input: CreateBookingInput): Promise<Result<Booking>> {
    const supabase = getSupabaseClient();

    // 1. Fetch room
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', input.roomId).single();
    if (!roomData) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } };
    }

    const room: Room = {
      id: roomData.id,
      name: roomData.name,
      building: roomData.building,
      floor: roomData.floor,
      capacity: roomData.capacity,
      opens_at: roomData.opens_at || '08:00:00',
      closes_at: roomData.closes_at || '22:00:00',
      status: roomData.status || (roomData.is_active ? 'active' : 'inactive'),
      equipment: [],
    };

    // 2. Fetch rules and blackouts
    const { data: rulesData } = await supabase.from('rules').select('*').limit(1).maybeSingle();
    const rules: Rules = rulesData
      ? {
          id: rulesData.id,
          max_hours_per_day: Number(rulesData.max_hours_per_day),
          max_booking_hours: rulesData.max_booking_hours || 2.0,
          slot_minutes: rulesData.slot_step_minutes || rulesData.slot_minutes || 30,
        }
      : {
          id: 1,
          max_hours_per_day: 2.0,
          max_booking_hours: 2.0,
          slot_minutes: 30,
        };

    const { data: blackoutsData } = await supabase.from('blackout_dates').select('*');
    const blackouts: BlackoutDate[] = (blackoutsData || []).map((b: any) => ({
      id: b.id,
      room_id: b.room_id || null,
      start_date: b.date || b.start_date,
      end_date: b.date || b.end_date,
      reason: b.reason,
    }));

    const { data: userBookingsData } = await supabase.from('bookings').select('*');
    const userBookings: Booking[] = (userBookingsData || []).map((b: any) => ({
      id: b.id,
      room_id: b.room_id,
      booked_by: b.created_by,
      team_id: b.team_id || null,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      purpose: b.purpose,
      status: b.status,
      created_at: b.created_at,
      cancelled_at: b.cancelled_at || null,
    }));

    const ruleCheck = validateBookingRules({
      room,
      rules,
      blackouts,
      userExistingBookings: userBookings,
      userId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });

    if (!ruleCheck.valid && ruleCheck.error) {
      return {
        ok: false,
        error: { code: 'RULE_VIOLATION', message: ruleCheck.error.message },
      };
    }

    const newId = `b-${Date.now().toString(36)}`;
    const { error: insertError } = await supabase.from('bookings').insert({
      id: newId,
      room_id: input.roomId,
      created_by: userId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      purpose: input.purpose || '',
      status: 'confirmed',
    });

    if (insertError) {
      if (
        insertError.code === '23P01' ||
        insertError.message?.toLowerCase().includes('overlap') ||
        insertError.message?.toLowerCase().includes('conflict')
      ) {
        const nextFree = findNextFreeSlot(
          room,
          getCampusDateString(input.startsAt),
          getCampusTimeString(input.endsAt),
          durationInHours(input.startsAt, input.endsAt),
          userBookings,
          blackouts
        );
        return {
          ok: false,
          error: {
            code: 'CONFLICT',
            message: 'That slot was just booked by someone else. Please choose an adjacent or later slot.',
            nextFreeSlot: nextFree,
          },
        };
      }
      return { ok: false, error: { code: 'INTERNAL', message: insertError.message } };
    }

    const created = await this.getBooking(newId);
    return { ok: true, data: created! };
  }

  async cancelBooking(userId: string, bookingId: string): Promise<Result<Booking>> {
    const supabase = getSupabaseClient();
    const existing = await this.getBooking(bookingId);
    if (!existing) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Booking not found.' } };
    }

    const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    const isStaff = userProfile?.role === 'staff_admin';

    if (existing.booked_by !== userId && !isStaff) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'You cannot cancel another user’s booking.' } };
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: nowIso,
        cancelled_by: userId,
      })
      .eq('id', bookingId);

    if (error) {
      return { ok: false, error: { code: 'INTERNAL', message: error.message } };
    }

    const updated = await this.getBooking(bookingId);
    return { ok: true, data: updated! };
  }

  async undoCancelBooking(userId: string, cancelledBookingId: string): Promise<Result<Booking>> {
    const existing = await this.getBooking(cancelledBookingId);
    if (!existing) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Original booking record not found.' } };
    }

    // Cancelled records are terminal. Undo creates a new booking validated afresh against limits and rooms.
    return this.createBooking(userId, {
      roomId: existing.room_id,
      startsAt: existing.starts_at,
      endsAt: existing.ends_at,
      purpose: existing.purpose,
    });
  }

  async listFutureBookingsForRoom(roomId: string): Promise<Booking[]> {
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('bookings')
      .select('*, profiles!bookings_created_by_fkey(*), rooms(*), teams(*)')
      .eq('room_id', roomId)
      .eq('status', 'confirmed')
      .gte('starts_at', nowIso)
      .order('starts_at');

    if (error || !data) return [];

    return data.map((b: any) => ({
      id: b.id,
      room_id: b.room_id,
      booked_by: b.created_by,
      team_id: b.team_id || null,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      purpose: b.purpose,
      status: b.status,
      created_at: b.created_at,
      cancelled_at: b.cancelled_at || null,
      booker: b.profiles
        ? {
            id: b.profiles.id,
            full_name: b.profiles.full_name,
            email: b.profiles.email,
            role: b.profiles.role,
            created_at: b.profiles.created_at,
          }
        : undefined,
      room: b.rooms
        ? {
            id: b.rooms.id,
            name: b.rooms.name,
            building: b.rooms.building,
            floor: b.rooms.floor,
            capacity: b.rooms.capacity,
            opens_at: b.rooms.opens_at || '08:00:00',
            closes_at: b.rooms.closes_at || '22:00:00',
            status: b.rooms.status || (b.rooms.is_active ? 'active' : 'inactive'),
            equipment: [],
          }
        : undefined,
    }));
  }

  async getUnacknowledgedCancellations(userId: string): Promise<Booking[]> {
    const supabase = getSupabaseClient();
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*, rooms(*), profiles!bookings_created_by_fkey(*), teams(*)')
      .eq('created_by', userId)
      .eq('status', 'cancelled');

    if (error || !bookings) return [];

    return bookings
      .filter((b: any) => {
        if (b.cancellation_notified === true) return false;
        return (
          b.cancellation_notified === false ||
          Boolean(b.cancellation_reason) ||
          (Boolean(b.cancelled_by) && b.cancelled_by !== userId)
        );
      })
      .map((b: any) => ({
        id: b.id,
        room_id: b.room_id,
        booked_by: b.created_by,
        team_id: b.team_id || null,
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        purpose: b.purpose,
        status: b.status,
        created_at: b.created_at,
        cancelled_at: b.cancelled_at || null,
        cancellation_reason: b.cancellation_reason || 'Administrative or campus blackout cancellation',
        cancellation_notified: Boolean(b.cancellation_notified),
        cancelled_by: b.cancelled_by || null,
        room: b.rooms
          ? {
              id: b.rooms.id,
              name: b.rooms.name,
              building: b.rooms.building,
              floor: b.rooms.floor,
              capacity: b.rooms.capacity,
              opens_at: b.rooms.opens_at || '08:00:00',
              closes_at: b.rooms.closes_at || '22:00:00',
              status: b.rooms.status || (b.rooms.is_active ? 'active' : 'inactive'),
              equipment: [],
            }
          : undefined,
        team: b.teams
          ? {
              id: b.teams.id,
              name: b.teams.name,
              project_name: b.teams.project_name || '',
              join_code: b.teams.join_code || '',
              created_by: b.teams.created_by,
              created_at: b.teams.created_at,
            }
          : null,
      }));
  }

  async dismissCancellationNotice(userId: string, bookingId: string): Promise<Result<void>> {
    const supabase = getSupabaseClient();
    try {
      if (bookingId === 'all') {
        await supabase
          .from('bookings')
          .update({ cancellation_notified: true })
          .eq('created_by', userId)
          .eq('status', 'cancelled');
      } else {
        await supabase
          .from('bookings')
          .update({ cancellation_notified: true })
          .eq('id', bookingId)
          .eq('created_by', userId);
      }
    } catch {
      // Ignored if column missing on remote table
    }
    return { ok: true, data: undefined };
  }
}
