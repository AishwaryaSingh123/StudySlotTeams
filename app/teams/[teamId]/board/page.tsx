import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '../../../../lib/auth/session';
import { getTeamRepo, getTaskRepo } from '../../../../lib/repo';
import { TaskBoardClient } from './TaskBoardClient';
import { Task, TaskStatus } from '../../../../lib/repo/types';

export const metadata = {
  title: 'Task Board — StudySlot Teams',
};

export default async function TaskBoardPage({
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

  const taskRepo = getTaskRepo();
  const tasksRes = await taskRepo.listTasks(p.teamId);
  const tasks = tasksRes.ok ? tasksRes.data : [];

  async function handleCreate(input: {
    teamId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    points: number;
  }) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTaskRepo();
    const res = await tRepo.createTask(currentUser.id, input);
    if (res.ok) {
      return { ok: true, task: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleUpdate(taskId: string, patch: Partial<Task>, seenUpdatedAt: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTaskRepo();
    const res = await tRepo.updateTask(currentUser.id, taskId, patch, seenUpdatedAt);
    if (res.ok) {
      return { ok: true, task: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleMove(taskId: string, newStatus: TaskStatus, seenUpdatedAt: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTaskRepo();
    const res = await tRepo.moveTask(currentUser.id, taskId, newStatus, seenUpdatedAt);
    if (res.ok) {
      return { ok: true, task: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleDelete(taskId: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTaskRepo();
    const res = await tRepo.deleteTask(currentUser.id, taskId);
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleRestore(taskId: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTaskRepo();
    const res = await tRepo.restoreTask(currentUser.id, taskId);
    if (res.ok) {
      return { ok: true, task: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  return (
    <TaskBoardClient
      team={team}
      isLead={isLead}
      currentUserId={user.id}
      members={members}
      initialTasks={tasks}
      onCreateTask={handleCreate}
      onUpdateTask={handleUpdate}
      onMoveTask={handleMove}
      onDeleteTask={handleDelete}
      onRestoreTask={handleRestore}
    />
  );
}
