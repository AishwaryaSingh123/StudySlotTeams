// StudySlot Teams — Mock Room Repository

import {
  IRoomRepo,
  Room,
  RoomSearchParams,
  RoomSearchResult,
  RoomStatus,
  SlotAvailability,
  Result,
} from '../types';
import { getDb, withLock } from './store';
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

export class MockRoomRepo implements IRoomRepo {
  async listRooms(includeInactive = false): Promise<Room[]> {
    const db = await getDb();
    if (includeInactive) return db.rooms;
    return db.rooms.filter((r) => r.status === 'active');
  }

  async getRoom(id: string): Promise<Room | null> {
    const db = await getDb();
    const room = db.rooms.find((r) => r.id === id);
    return room || null;
  }

  async createRoom(input: Omit<Room, 'id'>): Promise<Result<Room>> {
    return withLock((db) => {
      // Validate unique (building, name)
      const existing = db.rooms.find(
        (r) =>
          r.building.toLowerCase() === input.building.toLowerCase() &&
          r.name.toLowerCase() === input.name.toLowerCase()
      );
      if (existing) {
        return {
          ok: false,
          error: {
            code: 'CONFLICT',
            message: `A room named "${input.name}" already exists in "${input.building}".`,
          },
        };
      }

      const newRoom: Room = {
        id: `r-${Date.now().toString(36)}`,
        ...input,
      };

      db.rooms.push(newRoom);
      return { ok: true, data: { ...newRoom } };
    });
  }

  async updateRoom(id: string, patch: Partial<Omit<Room, 'id'>>): Promise<Result<Room>> {
    return withLock((db) => {
      const roomIndex = db.rooms.findIndex((r) => r.id === id);
      if (roomIndex === -1) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Room not found.' },
        };
      }

      const current = db.rooms[roomIndex];
      const targetBuilding = (patch.building || current.building).toLowerCase();
      const targetName = (patch.name || current.name).toLowerCase();

      // Check conflict with other rooms
      const duplicate = db.rooms.find(
        (r) =>
          r.id !== id &&
          r.building.toLowerCase() === targetBuilding &&
          r.name.toLowerCase() === targetName
      );
      if (duplicate) {
        return {
          ok: false,
          error: {
            code: 'CONFLICT',
            message: `A room named "${patch.name || current.name}" already exists in "${patch.building || current.building}".`,
          },
        };
      }

      const updated = {
        ...current,
        ...patch,
      };

      db.rooms[roomIndex] = updated;
      return { ok: true, data: { ...updated } };
    });
  }

  async setRoomStatus(id: string, status: RoomStatus): Promise<Result<Room>> {
    return withLock((db) => {
      const room = db.rooms.find((r) => r.id === id);
      if (!room) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Room not found.' },
        };
      }
      room.status = status;
      return { ok: true, data: { ...room } };
    });
  }

  async searchRooms(userId: string, params: RoomSearchParams): Promise<Result<{ rooms: RoomSearchResult[] }>> {
    const db = await getDb();
    const { date, startTime, endTime, minCapacity, equipment, building } = params;

    const requestedStartUtc = campusTimeToUtc(date, startTime);
    const requestedEndUtc = campusTimeToUtc(date, endTime);
    const requestedDuration = durationInHours(
      requestedStartUtc.toISOString(),
      requestedEndUtc.toISOString()
    );

    // Filter active rooms matching capacity, equipment, and building
    const candidateRooms = db.rooms.filter((room) => {
      if (room.status !== 'active') return false;
      if (minCapacity !== undefined && room.capacity < minCapacity) return false;
      if (building && room.building.toLowerCase() !== building.toLowerCase()) return false;
      if (equipment && equipment.length > 0) {
        const hasAllEquipment = equipment.every((eq) => room.equipment.includes(eq));
        if (!hasAllEquipment) return false;
      }
      return true;
    });

    const results: RoomSearchResult[] = candidateRooms.map((room) => {
      // 1. Check operating hours
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

      // 2. Check blackout dates
      const blackout = checkBlackout(date, room.id, db.blackouts);
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

      // 3. Check booking conflict
      const conflictingBooking = db.bookings.find((b) => {
        if (b.status !== 'confirmed' || b.room_id !== room.id) return false;
        return intervalsOverlap(
          requestedStartUtc,
          requestedEndUtc,
          new Date(b.starts_at),
          new Date(b.ends_at)
        );
      });

      if (conflictingBooking) {
        const nextFree = findNextFreeSlot(
          room,
          date,
          endTime,
          requestedDuration,
          db.bookings,
          db.blackouts
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
    const db = await getDb();
    const room = db.rooms.find((r) => r.id === roomId);
    if (!room) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Room not found.' },
      };
    }

    const opens = room.opens_at.slice(0, 5);
    const closes = room.closes_at.slice(0, 5);
    const [openH, openM] = opens.split(':').map(Number);
    const [closeH, closeM] = closes.split(':').map(Number);

    // Get user's teams
    const userTeams = db.team_members.filter((m) => m.user_id === userId).map((m) => m.team_id);

    // Filter confirmed bookings for this room on this date
    const dayBookings = db.bookings.filter((b) => {
      if (b.status !== 'confirmed' || b.room_id !== roomId) return false;
      return getCampusDateString(b.starts_at) === date;
    });

    const blackout = checkBlackout(date, room.id, db.blackouts);

    const slots: SlotAvailability[] = [];
    let currentMins = openH * 60 + openM;
    const endMins = closeH * 60 + closeM;

    while (currentMins < endMins) {
      const nextMins = Math.min(currentMins + 30, endMins);
      const startStr = `${String(Math.floor(currentMins / 60)).padStart(2, '0')}:${String(currentMins % 60).padStart(2, '0')}`;
      const endStr = `${String(Math.floor(nextMins / 60)).padStart(2, '0')}:${String(nextMins % 60).padStart(2, '0')}`;

      if (room.status !== 'active') {
        slots.push({ start: startStr, end: endStr, state: 'blocked', reason: 'Room inactive' });
      } else if (blackout.isBlackout) {
        slots.push({ start: startStr, end: endStr, state: 'blocked', reason: blackout.reason });
      } else {
        const slotStartUtc = campusTimeToUtc(date, startStr);
        const slotEndUtc = campusTimeToUtc(date, endStr);

        const overlapping = dayBookings.find((b) =>
          intervalsOverlap(slotStartUtc, slotEndUtc, new Date(b.starts_at), new Date(b.ends_at))
        );

        if (!overlapping) {
          slots.push({ start: startStr, end: endStr, state: 'free' });
        } else {
          const isYourBooking =
            overlapping.booked_by === userId ||
            (overlapping.team_id !== null && userTeams.includes(overlapping.team_id));

          slots.push({
            start: startStr,
            end: endStr,
            state: isYourBooking ? 'your_team' : 'booked',
            bookingId: overlapping.id,
          });
        }
      }

      currentMins = nextMins;
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
