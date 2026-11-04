import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/auth/session';
import { getTeamRepo, getMilestoneRepo } from '../../../../lib/repo';
import { CalendarClient } from './CalendarClient';

export const metadata = {
  title: 'Unified Calendar — StudySlot Teams',
};

export default async function TeamCalendarPage({
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

  // Broad range for calendar queries around November 2026
  const milestoneRepo = getMilestoneRepo();
  const calRes = await milestoneRepo.getCalendarEntries(params.teamId, '2026-11-01', '2026-11-30');
  const entries = calRes.ok ? calRes.data : [];

  return (
    <CalendarClient
      team={team}
      isLead={isLead}
      initialEntries={entries}
    />
  );
}
