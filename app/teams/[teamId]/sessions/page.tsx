import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/auth/session';
import { getTeamRepo } from '../../../../lib/repo';
import { TeamSessionsClient } from './TeamSessionsClient';

export const metadata = {
  title: 'Team Sessions — StudySlot Teams',
};

export default async function TeamSessionsPage({
  params,
}: {
  params: { teamId: string };
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
  if (!currentMember) {
    redirect('/teams');
  }

  const isLead = currentMember.role === 'lead';

  const sessionsRes = await teamRepo.listTeamSessions(params.teamId);
  const sessions = sessionsRes.ok ? sessionsRes.data : [];

  async function handleCancel(bookingId: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTeamRepo();
    const res = await tRepo.cancelTeamSession(currentUser.id, params.teamId, bookingId);
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, error: res.error.message };
  }

  return (
    <TeamSessionsClient
      team={team}
      isLead={isLead}
      initialSessions={sessions}
      onCancelSession={handleCancel}
    />
  );
}
