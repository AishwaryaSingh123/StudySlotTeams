import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/auth/session';
import { getRoomRepo } from '../../../../lib/repo';
import { RoomForm } from '../RoomForm';
import { PermissionDenied } from '../../PermissionDenied';
import { Room } from '../../../../lib/repo/types';

export const metadata = {
  title: 'Add Room — StudySlot Teams',
};

export default async function NewRoomPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'staff_admin') {
    return <PermissionDenied />;
  }

  async function handleCreateRoom(data: Omit<Room, 'id'>) {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const rRepo = getRoomRepo();
    const res = await rRepo.createRoom(data);
    if (res.ok) {
      return { ok: true, room: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  return <RoomForm onSave={handleCreateRoom} />;
}
