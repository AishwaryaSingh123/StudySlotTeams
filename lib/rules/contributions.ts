// StudySlot Teams — Contribution Calculation and CSV Escaping Rules

import { Task, TeamMember, WorkloadMemberSummary } from '../repo/types';

/**
 * Filter tasks by period based on task's completed_at or created_at.
 */
export function filterTasksByPeriod(
  tasks: Task[],
  period: 'all' | 'last_7_days' | 'custom',
  customStart?: string,
  customEnd?: string
): Task[] {
  if (period === 'all') return tasks;

  const now = new Date();
  let startMs = 0;
  let endMs = Infinity;

  if (period === 'last_7_days') {
    startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    endMs = now.getTime();
  } else if (period === 'custom' && customStart && customEnd) {
    startMs = new Date(customStart).getTime();
    endMs = new Date(customEnd + 'T23:59:59.999Z').getTime();
  }

  return tasks.filter((t) => {
    // If completed, check completion date; otherwise check creation date
    const timestamp = t.completed_at ? new Date(t.completed_at).getTime() : new Date(t.created_at).getTime();
    return timestamp >= startMs && timestamp <= endMs;
  });
}

/**
 * Compute workload summary for each team member.
 */
export function computeWorkloadSummary(members: TeamMember[], tasks: Task[]): WorkloadMemberSummary[] {
  // Only non-deleted tasks count towards active metrics
  const activeTasks = tasks.filter((t) => t.deleted_at === null);

  // Total completed points across all members for share calculation
  const totalCompletedPoints = activeTasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.points || 0), 0);

  return members.map((member) => {
    const userId = member.user_id;
    const name = member.profile?.full_name || 'Member';

    const memberTasks = activeTasks.filter((t) => t.assignee_id === userId);
    const assigned = memberTasks.length;

    const doneTasks = memberTasks.filter((t) => t.status === 'done');
    const done = doneTasks.length;
    const pointsDone = doneTasks.reduce((sum, t) => sum + (t.points || 0), 0);

    const openTasks = memberTasks.filter((t) => t.status !== 'done');
    const openPoints = openTasks.reduce((sum, t) => sum + (t.points || 0), 0);

    const sharePct = totalCompletedPoints > 0 ? Math.round((pointsDone / totalCompletedPoints) * 1000) / 10 : 0;

    return {
      userId,
      name,
      assigned,
      done,
      pointsDone,
      openPoints,
      sharePct,
    };
  });
}

/**
 * Escape strings for CSV export to prevent Formula Injection (CSV Injection).
 * If a cell begins with '=', '+', '-', or '@', prefix with a single quote.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Guard formula triggers
  if (/^[=+\-@]/.test(str)) {
    str = `'` + str;
  }

  // Quote if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  } else {
    str = `"${str}"`;
  }

  return str;
}
