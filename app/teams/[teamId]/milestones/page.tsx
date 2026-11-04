import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/auth/session';
import { getTeamRepo, getMilestoneRepo, getTaskRepo } from '../../../../lib/repo';
import { MilestonesClient } from './MilestonesClient';
import { Milestone } from '../../../../lib/repo/types';

export const metadata = {
  title: 'Milestones — StudySlot Teams',
};

export default async function MilestonesPage({
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

  const milestoneRepo = getMilestoneRepo();
  const msRes = await milestoneRepo.listMilestones(params.teamId);
  const milestones = msRes.ok ? msRes.data : [];

  const taskRepo = getTaskRepo();
  const tasksRes = await taskRepo.listTasks(params.teamId);
  const tasks = tasksRes.ok ? tasksRes.data : [];

  async function handleCreate(input: {
    teamId: string;
    name: string;
    description?: string;
    dueDate: string;
    taskIds: string[];
  }) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const mRepo = getMilestoneRepo();
    const res = await mRepo.createMilestone(currentUser.id, input);
    if (res.ok) {
      return { ok: true, milestone: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleUpdate(id: string, patch: Partial<Milestone>, taskIds?: string[]) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const mRepo = getMilestoneRepo();
    const res = await mRepo.updateMilestone(currentUser.id, id, patch, taskIds);
    if (res.ok) {
      return { ok: true, milestone: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleComplete(id: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const mRepo = getMilestoneRepo();
    const res = await mRepo.completeMilestone(currentUser.id, id);
    if (res.ok) {
      return { ok: true, milestone: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  return (
    <MilestonesClient
      team={team}
      isLead={isLead}
      initialMilestones={milestones}
      teamTasks={tasks}
      onCreateMilestone={handleCreate}
      onUpdateMilestone={handleUpdate}
      onCompleteMilestone={handleComplete}
    />
  );
}
