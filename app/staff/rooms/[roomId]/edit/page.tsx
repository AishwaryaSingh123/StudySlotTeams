import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getRoomRepo } from '@/lib/repo';
import { RoomForm } from '@/app/staff/rooms/RoomForm';
import { PermissionDenied } from '@/app/staff/PermissionDenied';
import { Room } from '@/lib/repo/types';

export const metadata = {
  title: 'Edit Room — StudySlot Teams',
};

export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }> | { roomId: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'staff_admin') {
    return <PermissionDenied />;
  }

  const p = await params;
  const roomRepo = getRoomRepo();
  const room = await roomRepo.getRoom(p.roomId);
  if (!room) {
    notFound();
  }

  async function handleUpdateRoom(data: Omit<Room, 'id'>) {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const rRepo = getRoomRepo();
    const res = await rRepo.updateRoom(p.roomId, data);
    if (res.ok) {
      return { ok: true, room: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  return <RoomForm initialRoom={room} onSave={handleUpdateRoom} />;
}
