// StudySlot Teams — Mock Tasks Repository

import {
  ITaskRepo,
  Task,
  TaskStatus,
  ActivityLogItem,
  Result,
} from '../types';
import { getDb, withLock } from './store';
import { getCampusDateString } from '../../time/campus';

export class MockTaskRepo implements ITaskRepo {
  async listTasks(
    teamId: string,
    filters?: { assigneeId?: string; due?: 'all' | 'week' | 'overdue' }
  ): Promise<Result<Task[]>> {
    const db = await getDb();
    const today = getCampusDateString(new Date());

    let tasks = db.tasks.filter((t) => t.team_id === teamId && t.deleted_at === null);

    if (filters?.assigneeId) {
      tasks = tasks.filter((t) => t.assignee_id === filters.assigneeId);
    }

    if (filters?.due === 'overdue') {
      tasks = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== 'done');
    } else if (filters?.due === 'week') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = getCampusDateString(nextWeek);
      tasks = tasks.filter((t) => t.due_date && t.due_date >= today && t.due_date <= nextWeekStr);
    }

    const mapped = tasks.map((t) => {
      const assignee = t.assignee_id ? db.profiles.find((p) => p.id === t.assignee_id) : null;
      const creator = db.profiles.find((p) => p.id === t.created_by);
      return {
        ...t,
        assignee,
        creator,
      };
    });

    return { ok: true, data: mapped };
  }

  async createTask(
    callerId: string,
    input: {
      teamId: string;
      title: string;
      description?: string | null;
      assigneeId?: string | null;
      dueDate?: string | null;
      points: number;
    }
  ): Promise<Result<Task>> {
    return withLock((db) => {
      // 1. Check membership and permissions
      const membership = db.team_members.find(
        (m) => m.team_id === input.teamId && m.user_id === callerId
      );
      if (!membership) {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'You are not a member of this team.' },
        };
      }

      // Member can assign to self; Lead can assign to anyone
      if (membership.role !== 'lead' && input.assigneeId && input.assigneeId !== callerId) {
        return {
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Team members may only create tasks assigned to themselves.',
          },
        };
      }

      // Validate assignee is in team
      if (input.assigneeId) {
        const isMember = db.team_members.some(
          (m) => m.team_id === input.teamId && m.user_id === input.assigneeId
        );
        if (!isMember) {
          return {
            ok: false,
            error: { code: 'VALIDATION_FAILED', message: 'Assignee must be a member of the team.' },
          };
        }
      }

      const trimmedTitle = input.title.trim();
      if (trimmedTitle.length < 1 || trimmedTitle.length > 80) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'Task title must be between 1 and 80 characters.' },
        };
      }

      const now = new Date().toISOString();
      const newTask: Task = {
        id: `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        team_id: input.teamId,
        title: trimmedTitle,
        description: input.description ? input.description.slice(0, 500) : null,
        assignee_id: input.assigneeId || null,
        due_date: input.dueDate || null,
        points: Math.min(5, Math.max(1, input.points || 1)),
        status: 'todo',
        completed_at: null,
        created_by: callerId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      db.tasks.push(newTask);

      // Log activity
      db.activity_log.push({
        id: `act-${Date.now().toString(36)}`,
        team_id: input.teamId,
        actor_id: callerId,
        task_id: newTask.id,
        action: 'task_created',
        detail: { title: newTask.title },
        created_at: now,
      });

      const assignee = newTask.assignee_id ? db.profiles.find((p) => p.id === newTask.assignee_id) : null;
      return {
        ok: true,
        data: {
          ...newTask,
          assignee,
        },
      };
    });
  }

  async updateTask(
    callerId: string,
    taskId: string,
    patch: Partial<Task>,
    seenUpdatedAt: string
  ): Promise<Result<Task>> {
    return withLock((db) => {
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task || task.deleted_at !== null) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Task not found.' },
        };
      }

      // Optimistic concurrency check
      if (task.updated_at !== seenUpdatedAt) {
        return {
          ok: false,
          error: {
            code: 'CONFLICT',
            message: 'This task was modified by someone else since you opened it. Reload to see the latest changes.',
          },
        };
      }

      const membership = db.team_members.find(
        (m) => m.team_id === task.team_id && m.user_id === callerId
      );
      if (!membership) {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'You are not a member of this team.' },
        };
      }

      const isLead = membership.role === 'lead';
      const isAssignee = task.assignee_id === callerId;

      if (!isLead && !isAssignee) {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the assignee or Team Lead can edit this task.' },
        };
      }

      // If non-lead, only allow changing status
      if (!isLead && (patch.title !== undefined || patch.points !== undefined || patch.assignee_id !== undefined)) {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can change task titles, points, or assignees.' },
        };
      }

      const now = new Date().toISOString();

      if (patch.status && patch.status !== task.status) {
        if (patch.status === 'done') {
          task.completed_at = now;
          db.activity_log.push({
            id: `act-${Date.now().toString(36)}`,
            team_id: task.team_id,
            actor_id: callerId,
            task_id: task.id,
            action: 'task_completed',
            detail: { title: task.title, points: task.points },
            created_at: now,
          });
        } else {
          task.completed_at = null;
          db.activity_log.push({
            id: `act-${Date.now().toString(36)}`,
            team_id: task.team_id,
            actor_id: callerId,
            task_id: task.id,
            action: 'task_moved',
            detail: { from: task.status, to: patch.status, title: task.title },
            created_at: now,
          });
        }
        task.status = patch.status;
      }

      if (patch.title !== undefined) task.title = patch.title.trim().slice(0, 80);
      if (patch.description !== undefined) task.description = patch.description ? patch.description.slice(0, 500) : null;
      if (patch.assignee_id !== undefined) task.assignee_id = patch.assignee_id;
      if (patch.due_date !== undefined) task.due_date = patch.due_date;
      if (patch.points !== undefined) task.points = Math.min(5, Math.max(1, patch.points));

      task.updated_at = now;

      const assignee = task.assignee_id ? db.profiles.find((p) => p.id === task.assignee_id) : null;
      return {
        ok: true,
        data: {
          ...task,
          assignee,
        },
      };
    });
  }

  async moveTask(
    callerId: string,
    taskId: string,
    newStatus: TaskStatus,
    seenUpdatedAt: string
  ): Promise<Result<Task>> {
    return this.updateTask(callerId, taskId, { status: newStatus }, seenUpdatedAt);
  }

  async deleteTask(callerId: string, taskId: string): Promise<Result<Task>> {
    return withLock((db) => {
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task || task.deleted_at !== null) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Task not found.' },
        };
      }

      const membership = db.team_members.find(
        (m) => m.team_id === task.team_id && m.user_id === callerId
      );
      if (!membership || membership.role !== 'lead') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can delete tasks.' },
        };
      }

      const now = new Date().toISOString();
      task.deleted_at = now;
      task.updated_at = now;

      db.activity_log.push({
        id: `act-${Date.now().toString(36)}`,
        team_id: task.team_id,
        actor_id: callerId,
        task_id: task.id,
        action: 'task_deleted',
        detail: { title: task.title },
        created_at: now,
      });

      return { ok: true, data: { ...task } };
    });
  }

  async restoreTask(callerId: string, taskId: string): Promise<Result<Task>> {
    return withLock((db) => {
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task || task.deleted_at === null) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Deleted task not found.' },
        };
      }

      const membership = db.team_members.find(
        (m) => m.team_id === task.team_id && m.user_id === callerId
      );
      if (!membership || membership.role !== 'lead') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can restore tasks.' },
        };
      }

      const now = new Date().toISOString();
      task.deleted_at = null;
      task.updated_at = now;

      db.activity_log.push({
        id: `act-${Date.now().toString(36)}`,
        team_id: task.team_id,
        actor_id: callerId,
        task_id: task.id,
        action: 'task_restored',
        detail: { title: task.title },
        created_at: now,
      });

      return { ok: true, data: { ...task } };
    });
  }

  async listActivityLog(
    teamId: string,
    period?: 'all' | 'last_7_days' | 'custom',
    customStart?: string,
    customEnd?: string
  ): Promise<Result<ActivityLogItem[]>> {
    const db = await getDb();
    let logs = db.activity_log.filter((a) => a.team_id === teamId);

    const now = new Date();
    if (period === 'last_7_days') {
      const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      logs = logs.filter((l) => new Date(l.created_at).getTime() >= cutoff);
    } else if (period === 'custom' && customStart && customEnd) {
      const startMs = new Date(customStart).getTime();
      const endMs = new Date(customEnd + 'T23:59:59.999Z').getTime();
      logs = logs.filter((l) => {
        const t = new Date(l.created_at).getTime();
        return t >= startMs && t <= endMs;
      });
    }

    const mapped = logs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((l) => {
        const actor = db.profiles.find((p) => p.id === l.actor_id);
        const task = l.task_id ? db.tasks.find((t) => t.id === l.task_id) : null;
        return {
          ...l,
          actor_name: actor?.full_name || 'Team Member',
          task_title: task?.title || (l.detail?.title as string | undefined),
        };
      });

    return { ok: true, data: mapped };
  }
}
