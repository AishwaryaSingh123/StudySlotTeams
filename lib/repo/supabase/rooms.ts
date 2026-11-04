// StudySlot Teams — Supabase Room Repository
import { getSupabaseClient } from '../../supabase/server';
import {
  IRoomRepo,
  Room,
  RoomSearchParams,
  RoomSearchResult,
  RoomStatus,
  SlotAvailability,
  Result,
  EquipmentType,
  BlackoutDate,
  Booking,
} from '../types';
import {
  checkBlackout,
  findNextFreeSlot,
  isWithinOpeningHours,
} from '../../rules/booking';
import {
  campusTimeToUtc,
  durationInHours,
  getCampusDateString,
  getCampusTimeString,
  intervalsOverlap,
} from '../../time/campus';

export class SupabaseRoomRepo implements IRoomRepo {
  async listRooms(includeInactive = false): Promise<Room[]> {
    const supabase = getSupabaseClient();
    let query = supabase.from('rooms').select('*, room_equipment(item)').order('name');
    if (!includeInactive) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      building: r.building,
      floor: r.floor,
      capacity: r.capacity,
      opens_at: r.opens_at || '08:00:00',
      closes_at: r.closes_at || '22:00:00',
      status: (r.status as RoomStatus) || (r.is_active ? 'active' : 'inactive'),
      equipment: (r.room_equipment || []).map((eq: any) => eq.item as EquipmentType),
    }));
  }

  async getRoom(id: string): Promise<Room | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('rooms')
      .select('*, room_equipment(item)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      building: data.building,
      floor: data.floor,
      capacity: data.capacity,
      opens_at: data.opens_at || '08:00:00',
      closes_at: data.closes_at || '22:00:00',
      status: (data.status as RoomStatus) || (data.is_active ? 'active' : 'inactive'),
      equipment: (data.room_equipment || []).map((eq: any) => eq.item as EquipmentType),
    };
  }

  async createRoom(input: Omit<Room, 'id'>): Promise<Result<Room>> {
    const supabase = getSupabaseClient();
    const id = `r-${Date.now().toString(36)}`;

    const { error: roomError } = await supabase.from('rooms').insert({
      id,
      name: input.name,
      building: input.building,
      floor: input.floor,
      capacity: input.capacity,
      is_active: input.status === 'active',
      status: input.status,
      opens_at: input.opens_at,
      closes_at: input.closes_at,
    });

    if (roomError) {
      return { ok: false, error: { code: 'INTERNAL', message: roomError.message } };
    }

    if (input.equipment && input.equipment.length > 0) {
      const eqRows = input.equipment.map((item) => ({ room_id: id, item }));
      await supabase.from('room_equipment').insert(eqRows);
    }

    const created = await this.getRoom(id);
    return { ok: true, data: created! };
  }

  async updateRoom(id: string, patch: Partial<Omit<Room, 'id'>>): Promise<Result<Room>> {
    const supabase = getSupabaseClient();
    const existing = await this.getRoom(id);
    if (!existing) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } };
    }

    const roomUpdates: Record<string, any> = {};
    if (patch.name !== undefined) roomUpdates.name = patch.name;
    if (patch.building !== undefined) roomUpdates.building = patch.building;
    if (patch.floor !== undefined) roomUpdates.floor = patch.floor;
    if (patch.capacity !== undefined) roomUpdates.capacity = patch.capacity;
    if (patch.status !== undefined) {
      roomUpdates.status = patch.status;
      roomUpdates.is_active = patch.status === 'active';
    }
    if (patch.opens_at !== undefined) roomUpdates.opens_at = patch.opens_at;
    if (patch.closes_at !== undefined) roomUpdates.closes_at = patch.closes_at;

    if (Object.keys(roomUpdates).length > 0) {
      const { error } = await supabase.from('rooms').update(roomUpdates).eq('id', id);
      if (error) {
        return { ok: false, error: { code: 'INTERNAL', message: error.message } };
      }
    }

    if (patch.equipment !== undefined) {
      await supabase.from('room_equipment').delete().eq('room_id', id);
      if (patch.equipment.length > 0) {
        const eqRows = patch.equipment.map((item) => ({ room_id: id, item }));
        await supabase.from('room_equipment').insert(eqRows);
      }
    }

    const updated = await this.getRoom(id);
    return { ok: true, data: updated! };
  }

  async setRoomStatus(id: string, status: RoomStatus): Promise<Result<Room>> {
    return this.updateRoom(id, { status });
  }

  async searchRooms(userId: string, params: RoomSearchParams): Promise<Result<{ rooms: RoomSearchResult[] }>> {
    const supabase = getSupabaseClient();
    const { date, startTime, endTime, minCapacity, equipment, building } = params;

    const requestedStartUtc = campusTimeToUtc(date, startTime);
    const requestedEndUtc = campusTimeToUtc(date, endTime);
    const requestedDuration = durationInHours(
      requestedStartUtc.toISOString(),
      requestedEndUtc.toISOString()
    );

    const rooms = await this.listRooms(false);

    // Fetch blackouts and confirmed bookings for this date
    const { data: blackoutsData } = await supabase.from('blackout_dates').select('*');
    const blackouts: BlackoutDate[] = (blackoutsData || []).map((b: any) => ({
      id: b.id,
      room_id: b.room_id || null,
      start_date: b.date || b.start_date,
      end_date: b.date || b.end_date,
      reason: b.reason,
    }));

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed');

    const bookings: Booking[] = (bookingsData || []).map((b: any) => ({
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

    const candidateRooms = rooms.filter((room) => {
      if (room.status !== 'active') return false;
      if (minCapacity !== undefined && room.capacity < minCapacity) return false;
      if (building && room.building.toLowerCase() !== building.toLowerCase()) return false;
      if (equipment && equipment.length > 0) {
        const hasAll = equipment.every((eq) => room.equipment.includes(eq));
        if (!hasAll) return false;
      }
      return true;
    });

    const results: RoomSearchResult[] = candidateRooms.map((room) => {
      if (!isWithinOpeningHours(startTime, endTime, room.opens_at, room.closes_at)) {
        return {
          id: room.id,
          name: room.name,
          building: room.building,
          floor: room.floor,
          capacity: room.capacity,
          equipment: room.equipment,
          availability: 'blocked',
          blockedReason: `Outside operating hours (${room.opens_at.slice(0, 5)}–${room.closes_at.slice(0, 5)})`,
          nextFreeSlot: null,
        };
      }

      const blackout = checkBlackout(date, room.id, blackouts);
      if (blackout.isBlackout) {
        return {
          id: room.id,
          name: room.name,
          building: room.building,
          floor: room.floor,
          capacity: room.capacity,
          equipment: room.equipment,
          availability: 'blocked',
          blockedReason: `Unavailable: ${blackout.reason}`,
          nextFreeSlot: null,
        };
      }

      const conflict = bookings.find((b) => {
        if (b.room_id !== room.id) return false;
        return intervalsOverlap(
          requestedStartUtc,
          requestedEndUtc,
          new Date(b.starts_at),
          new Date(b.ends_at)
        );
      });

      if (conflict) {
        const nextFree = findNextFreeSlot(
          room,
          date,
          endTime,
          requestedDuration,
          bookings,
          blackouts
        );
        return {
          id: room.id,
          name: room.name,
          building: room.building,
          floor: room.floor,
          capacity: room.capacity,
          equipment: room.equipment,
          availability: 'booked',
          blockedReason: 'Booked for this time slot',
          nextFreeSlot: nextFree,
        };
      }

      return {
        id: room.id,
        name: room.name,
        building: room.building,
        floor: room.floor,
        capacity: room.capacity,
        equipment: room.equipment,
        availability: 'free',
        nextFreeSlot: null,
      };
    });

    return { ok: true, data: { rooms: results } };
  }

  async getRoomAvailability(
    userId: string,
    roomId: string,
    date: string
  ): Promise<Result<{ openingHours: { opens_at: string; closes_at: string }; slots: SlotAvailability[] }>> {
    const supabase = getSupabaseClient();
    const room = await this.getRoom(roomId);
    if (!room) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Room not found.' } };
    }

    const opens = room.opens_at.slice(0, 5);
    const closes = room.closes_at.slice(0, 5);
    const [openH, openM] = opens.split(':').map(Number);
    const [closeH, closeM] = closes.split(':').map(Number);

    const { data: memberData } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);
    const userTeams = (memberData || []).map((m: any) => m.team_id);

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'confirmed');

    const dayBookings: Booking[] = (bookingsData || []).filter(
      (b: any) => getCampusDateString(b.starts_at) === date
    ).map((b: any) => ({
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

    const { data: blackoutsData } = await supabase.from('blackout_dates').select('*');
    const blackouts: BlackoutDate[] = (blackoutsData || []).map((b: any) => ({
      id: b.id,
      room_id: b.room_id || null,
      start_date: b.date || b.start_date,
      end_date: b.date || b.end_date,
      reason: b.reason,
    }));

    const blackout = checkBlackout(date, roomId, blackouts);

    const slots: SlotAvailability[] = [];
    let curH = openH;
    let curM = openM;

    while (curH < closeH || (curH === closeH && curM < closeM)) {
      const nextM = curM + 30;
      let nextH = curH;
      let actualNextM = nextM;
      if (nextM >= 60) {
        nextH += 1;
        actualNextM = nextM - 60;
      }

      if (nextH > closeH || (nextH === closeH && actualNextM > closeM)) {
        break;
      }

      const slotStart = `${curH.toString().padStart(2, '0')}:${curM.toString().padStart(2, '0')}`;
      const slotEnd = `${nextH.toString().padStart(2, '0')}:${actualNextM.toString().padStart(2, '0')}`;

      if (blackout.isBlackout) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          state: 'blocked',
          reason: blackout.reason,
        });
      } else {
        const slotStartUtc = campusTimeToUtc(date, slotStart);
        const slotEndUtc = campusTimeToUtc(date, slotEnd);

        const activeBooking = dayBookings.find((b) =>
          intervalsOverlap(slotStartUtc, slotEndUtc, new Date(b.starts_at), new Date(b.ends_at))
        );

        if (!activeBooking) {
          slots.push({
            start: slotStart,
            end: slotEnd,
            state: 'free',
          });
        } else {
          const isYourBooking = activeBooking.booked_by === userId;
          const isYourTeamBooking =
            activeBooking.team_id !== null && userTeams.includes(activeBooking.team_id);

          slots.push({
            start: slotStart,
            end: slotEnd,
            state: isYourBooking || isYourTeamBooking ? 'your_team' : 'booked',
            reason: isYourBooking || isYourTeamBooking ? 'Your reservation' : 'Booked',
            bookingId: activeBooking.id,
          });
        }
      }

      curH = nextH;
      curM = actualNextM;
    }

    return {
      ok: true,
      data: {
        openingHours: { opens_at: room.opens_at, closes_at: room.closes_at },
        slots,
      },
    };
  }
}
