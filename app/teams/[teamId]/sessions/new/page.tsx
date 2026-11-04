import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '../../../../../lib/auth/session';
import { getTeamRepo, getRoomRepo, getTaskRepo, getRulesRepo } from '../../../../../lib/repo';
import { NewTeamSessionClient } from './NewTeamSessionClient';

export const metadata = {
  title: 'Book Team Session — StudySlot Teams',
};

export default async function NewTeamSessionPage({
  params,
  searchParams,
}: {
  params: { teamId: string };
  searchParams: { roomId?: string; date?: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const teamRepo = getTeamRepo();
  const team = await teamRepo.getTeam(params.teamId);
  if (!team) {
    notFound();
  }

  const members = await teamRepo.listMembers(params.teamId);
  const currentMember = members.find((m) => m.user_id === user.id);
  if (!currentMember || currentMember.role !== 'lead') {
    // Only lead can book team session
    redirect(`/teams/${params.teamId}/sessions`);
  }

  const roomRepo = getRoomRepo();
  const rooms = await roomRepo.listRooms(false);

  const taskRepo = getTaskRepo();
  const tasksRes = await taskRepo.listTasks(params.teamId);
  // Only non-done tasks can be agenda tasks
  const openTasks = tasksRes.ok ? tasksRes.data.filter((t) => t.status !== 'done') : [];

  const rulesRepo = getRulesRepo();
  const rules = await rulesRepo.getRules();

  async function handleBookSession(input: {
    teamId: string;
    roomId: string;
    startsAt: string;
    endsAt: string;
    taskIds: string[];
    attendeeIds: string[];
    note?: string;
  }) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTeamRepo();
    const res = await tRepo.createTeamSession(currentUser.id, input);

    if (res.ok) {
      return { ok: true, session: res.data };
    }
    return {
      ok: false,
      error: res.error.message,
      nextFreeSlot: res.error.nextFreeSlot,
    };
  }

  return (
    <NewTeamSessionClient
      team={team}
      rooms={rooms}
      tasks={openTasks}
      members={members}
      rules={rules}
      initialDate={searchParams.date || '2026-11-12'}
      initialRoomId={searchParams.roomId}
      onBookSession={handleBookSession}
    />
  );
}
