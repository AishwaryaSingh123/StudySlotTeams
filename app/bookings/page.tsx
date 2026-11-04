import { redirect } from 'next/navigation';
import { getSessionUser } from '../../lib/auth/session';
import { getBookingRepo } from '../../lib/repo';
import { MyBookingsClient } from './MyBookingsClient';

export const metadata = {
  title: 'My Bookings — StudySlot Teams',
};

export default async function MyBookingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const bookingRepo = getBookingRepo();
  const res = await bookingRepo.listMyBookings(user.id);

  const upcoming = res.ok ? res.data.upcoming : [];
  const past = res.ok ? res.data.past : [];

  async function handleCancel(bookingId: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const bRepo = getBookingRepo();
    const cancelRes = await bRepo.cancelBooking(currentUser.id, bookingId);
    if (cancelRes.ok) {
      return { ok: true };
    }
    return { ok: false, error: cancelRes.error.message };
  }

  async function handleUndo(bookingId: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const bRepo = getBookingRepo();
    const undoRes = await bRepo.undoCancelBooking(currentUser.id, bookingId);
    if (undoRes.ok) {
      return { ok: true, booking: undoRes.data };
    }
    return { ok: false, error: undoRes.error.message };
  }

  return (
    <MyBookingsClient
      initialUpcoming={upcoming}
      initialPast={past}
      onCancelBooking={handleCancel}
      onUndoCancel={handleUndo}
    />
  );
}
