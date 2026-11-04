import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getTeamRepo, getTaskRepo, getMilestoneRepo, getBookingRepo } from '@/lib/repo';
import { TeamOverviewClient } from './TeamOverviewClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }> | { teamId: string };
}) {
  const p = await params;
  const teamRepo = getTeamRepo();
  const team = await teamRepo.getTeam(p.teamId);
  return {
    title: team ? `${team.name} — StudySlot Teams` : 'Team Overview — StudySlot Teams',
  };
}

export default async function TeamOverviewPage({
  params,
}: {
  params: Promise<{ teamId: string }> | { teamId: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const p = await params;
  const teamRepo = getTeamRepo();
  const team = await teamRepo.getTeam(p.teamId);
  if (!team) {
    notFound();
  }

  const members = await teamRepo.listMembers(p.teamId);
  const currentMember = members.find((m) => m.user_id === user.id);
  if (!currentMember) {
    redirect('/teams');
  }

  const isLead = currentMember.role === 'lead';

  // Fetch next session
  const bookingRepo = getBookingRepo();
  const sessionsRes = await teamRepo.listTeamSessions(p.teamId);
  const allSessions = sessionsRes.ok ? sessionsRes.data : [];
  const now = new Date();
  const nextSession = allSessions
    .filter((s) => s.status === 'confirmed' && new Date(s.ends_at) > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] || null;

  // Fetch open tasks due this week
  const taskRepo = getTaskRepo();
  const tasksRes = await taskRepo.listTasks(p.teamId, { due: 'week' });
  const dueTasks = tasksRes.ok ? tasksRes.data.filter((t) => t.status !== 'done') : [];

  // Fetch next milestone
  const milestoneRepo = getMilestoneRepo();
  const msRes = await milestoneRepo.listMilestones(p.teamId);
  const openMilestones = msRes.ok ? msRes.data.filter((m) => m.status === 'open') : [];
  const nextMilestone = openMilestones.sort((a, b) => a.due_date.localeCompare(b.due_date))[0] || null;

  async function handleRemove(targetUserId: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTeamRepo();
    const res = await tRepo.removeMember(currentUser.id, p.teamId, targetUserId);
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, error: res.error.message };
  }

  return (
    <TeamOverviewClient
      team={team}
      isLead={isLead}
      nextSession={nextSession}
      dueTasks={dueTasks}
      nextMilestone={nextMilestone}
      members={members}
      currentUserId={user.id}
      onRemoveMember={handleRemove}
    />
  );
}
