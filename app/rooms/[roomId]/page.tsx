import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/auth/session';
import { getRoomRepo, getRulesRepo, getBookingRepo } from '../../../lib/repo';
import { RoomDetailClient } from './RoomDetailClient';
import { calculateDailyBookedHours } from '../../../lib/rules/booking';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }> | { roomId: string };
}) {
  const p = await params;
  const roomRepo = getRoomRepo();
  const room = await roomRepo.getRoom(p.roomId);
  return {
    title: room ? `${room.name} — StudySlot Teams` : 'Room Detail — StudySlot Teams',
  };
}

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }> | { roomId: string };
  searchParams: Promise<{ date?: string }> | { date?: string };
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

  const targetDate = sp?.date || '2026-11-12';

  const availRes = await roomRepo.getRoomAvailability(user.id, room.id, targetDate);
  const slots = availRes.ok ? availRes.data.slots : [];

  const bookingRepo = getBookingRepo();
  const myBookingsRes = await bookingRepo.listMyBookings(user.id);
  const allUserBookings = myBookingsRes.ok
    ? [...myBookingsRes.data.upcoming, ...myBookingsRes.data.past]
    : [];

  const dailyHoursUsed = calculateDailyBookedHours(user.id, targetDate, allUserBookings);

  return (
    <RoomDetailClient
      room={room}
      rules={rules}
      initialDate={targetDate}
      initialSlots={slots}
      dailyHoursUsed={dailyHoursUsed}
      userBookings={allUserBookings}
      userId={user.id}
    />
  );
}
