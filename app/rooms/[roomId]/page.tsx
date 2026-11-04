import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/auth/session';
import { getRoomRepo, getRulesRepo, getBookingRepo } from '../../../lib/repo';
import { RoomDetailClient } from './RoomDetailClient';
import { calculateDailyBookedHours } from '../../../lib/rules/booking';

export async function generateMetadata({ params }: { params: { roomId: string } }) {
  const roomRepo = getRoomRepo();
  const room = await roomRepo.getRoom(params.roomId);
  return {
    title: room ? `${room.name} — StudySlot Teams` : 'Room Detail — StudySlot Teams',
  };
}

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: { roomId: string };
  searchParams: { date?: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const roomRepo = getRoomRepo();
  const room = await roomRepo.getRoom(params.roomId);
  if (!room) {
    notFound();
  }

  const rulesRepo = getRulesRepo();
  const rules = await rulesRepo.getRules();

  const targetDate = searchParams.date || '2026-11-12';

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
    />
  );
}
