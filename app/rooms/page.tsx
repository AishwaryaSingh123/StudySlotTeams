import { redirect } from 'next/navigation';
import { getSessionUser } from '../../lib/auth/session';
import { getRoomRepo } from '../../lib/repo';
import { EquipmentType, RoomSearchParams } from '../../lib/repo/types';
import { RoomSearchClient } from './RoomSearchClient';

export const metadata = {
  title: 'Find a Study Room — StudySlot Teams',
};

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    startTime?: string;
    endTime?: string;
    minCapacity?: string;
    equipment?: string;
    building?: string;
  }> | {
    date?: string;
    startTime?: string;
    endTime?: string;
    minCapacity?: string;
    equipment?: string;
    building?: string;
  };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const sp = await searchParams;

  const roomRepo = getRoomRepo();
  const allRooms = await roomRepo.listRooms(false);
  const buildings = Array.from(new Set(allRooms.map((r) => r.building))).sort();

  // Defaults per design specification: seed demo date Thu 12 Nov 2026, 14:00-15:00
  const date = sp?.date || '2026-11-12';
  const startTime = sp?.startTime || '14:00';
  const endTime = sp?.endTime || '15:00';
  const minCapacity = sp?.minCapacity ? parseInt(sp.minCapacity, 10) : undefined;
  const equipment = sp?.equipment
    ? (sp.equipment.split(',') as EquipmentType[])
    : undefined;
  const building = sp?.building || undefined;

  const searchInput: RoomSearchParams = {
    date,
    startTime,
    endTime,
    minCapacity,
    equipment,
    building,
  };

  const res = await roomRepo.searchRooms(user.id, searchInput);
  const initialRooms = res.ok ? res.data.rooms : [];

  return (
    <RoomSearchClient
      initialRooms={initialRooms}
      initialParams={{
        date,
        startTime,
        endTime,
        minCapacity,
        equipment,
        building,
      }}
      buildings={buildings}
    />
  );
}
