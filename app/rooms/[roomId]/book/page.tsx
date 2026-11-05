import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/auth/session';
import { getRoomRepo, getRulesRepo, getBookingRepo, getTeamRepo } from '../../../../lib/repo';
import { BookingFormClient } from './BookingFormClient';
import { calculateDailyBookedHours } from '../../../../lib/rules/booking';
import { Booking } from '../../../../lib/repo/types';

export const metadata = {
  title: 'Book Room — StudySlot Teams',
};

export default async function BookRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }> | { roomId: string };
  searchParams: Promise<{ date?: string; startTime?: string; endTime?: string }> | { date?: string; startTime?: string; endTime?: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const p = await params;
  const sp = await searchParams;

  const roomRepo = getRoomRepo();
  const room = await roomRepo.getRoom(p.roomId);
  if (!room) {
    notFound();
  }

  const rulesRepo = getRulesRepo();
  const rules = await rulesRepo.getRules();

  const teamRepo = getTeamRepo();
  const userTeams = await teamRepo.listTeamsForUser(user.id);

  const targetDate = sp?.date || '2026-11-12';
  const startTime = sp?.startTime || '14:00';
  const endTime = sp?.endTime || '15:00';

  const bookingRepo = getBookingRepo();
  const myBookingsRes = await bookingRepo.listMyBookings(user.id);
  const allUserBookings = myBookingsRes.ok
    ? [...myBookingsRes.data.upcoming, ...myBookingsRes.data.past]
    : [];

  const dailyHoursUsed = calculateDailyBookedHours(user.id, targetDate, allUserBookings);

  async function handleBook(input: {
    roomId: string;
    startsAt: string;
    endsAt: string;
    purpose?: string;
  }) {
    'use server';

    const currentUser = await getSessionUser();
    if (!currentUser) {
      return { ok: false, error: 'User must be signed in to book.' };
    }

    const bRepo = getBookingRepo();
    const result = await bRepo.createBooking(currentUser.id, input);

    if (result.ok) {
      return { ok: true, booking: result.data };
    }

    return {
      ok: false,
      error: result.error.message,
      nextFreeSlot: result.error.nextFreeSlot,
    };
  }

  return (
    <BookingFormClient
      room={room}
      rules={rules}
      initialDate={targetDate}
      initialStartTime={startTime}
      initialEndTime={endTime}
      userTeams={userTeams}
      dailyHoursUsed={dailyHoursUsed}
      userBookings={allUserBookings}
      userId={user.id}
      onBook={handleBook}
    />
  );
}
