import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getRoomRepo, getBookingRepo } from '@/lib/repo';
import { StaffRoomsClient } from './StaffRoomsClient';
import { PermissionDenied } from '../PermissionDenied';
import { RoomStatus } from '@/lib/repo/types';

export const metadata = {
  title: 'Room Management — StudySlot Teams',
};

export default async function StaffRoomsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'staff_admin') {
    return <PermissionDenied message="Access to room administration is restricted to Staff Admins." />;
  }

  const roomRepo = getRoomRepo();
  const rooms = await roomRepo.listRooms(true); // include inactive

  async function handleSetStatus(roomId: string, status: RoomStatus) {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const rRepo = getRoomRepo();
    const res = await rRepo.setRoomStatus(roomId, status);
    if (res.ok) {
      return { ok: true, room: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleGetFutureBookings(roomId: string) {
    'use server';
    const bRepo = getBookingRepo();
    return bRepo.listFutureBookingsForRoom(roomId);
  }

  async function handleCancel(bookingId: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const bRepo = getBookingRepo();
    const res = await bRepo.cancelBooking(currentUser.id, bookingId);
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, error: res.error.message };
  }

  return (
    <StaffRoomsClient
      initialRooms={rooms}
      onSetRoomStatus={handleSetStatus}
      onGetFutureBookings={handleGetFutureBookings}
      onCancelBooking={handleCancel}
    />
  );
}
