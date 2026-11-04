// StudySlot Teams — Mock Milestones and Unified Calendar Repository

import {
  IMilestoneRepo,
  Milestone,
  CalendarEntry,
  Result,
} from '../types';
import { getDb, withLock } from './store';
import { getCampusDateString } from '../../time/campus';

export class MockMilestoneRepo implements IMilestoneRepo {
  async listMilestones(teamId: string): Promise<Result<Milestone[]>> {
    const db = await getDb();
    const milestones = db.milestones.filter((m) => m.team_id === teamId);

    const mapped = milestones.map((m) => {
      const linkedTasks = db.tasks.filter((t) => m.task_ids.includes(t.id) && t.deleted_at === null);
      const total = linkedTasks.length;
      const done = linkedTasks.filter((t) => t.status === 'done').length;

      return {
        ...m,
        total_tasks: total,
        done_tasks: done,
      };
    });

    return { ok: true, data: mapped };
  }

  async createMilestone(
    callerId: string,
    input: {
      teamId: string;
      name: string;
      description?: string | null;
      dueDate: string;
      taskIds: string[];
    }
  ): Promise<Result<Milestone>> {
    return withLock((db) => {
      const membership = db.team_members.find(
        (m) => m.team_id === input.teamId && m.user_id === callerId
      );
      if (!membership || membership.role !== 'lead') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can create milestones.' },
        };
      }

      const trimmedName = input.name.trim();
      if (trimmedName.length < 1 || trimmedName.length > 80) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'Milestone name must be between 1 and 80 characters.' },
        };
      }

      if (!input.dueDate) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'Milestone due date is required.' },
        };
      }

      const newMilestone: Milestone = {
        id: `ms-${Date.now().toString(36)}`,
        team_id: input.teamId,
        name: trimmedName,
        description: input.description ? input.description.slice(0, 300) : null,
        due_date: input.dueDate,
        status: 'open',
        completed_at: null,
        task_ids: input.taskIds || [],
      };

      db.milestones.push(newMilestone);

      return {
        ok: true,
        data: {
          ...newMilestone,
          total_tasks: newMilestone.task_ids.length,
          done_tasks: 0,
        },
      };
    });
  }

  async updateMilestone(
    callerId: string,
    id: string,
    patch: Partial<Milestone>,
    taskIds?: string[]
  ): Promise<Result<Milestone>> {
    return withLock((db) => {
      const milestone = db.milestones.find((m) => m.id === id);
      if (!milestone) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Milestone not found.' },
        };
      }

      const membership = db.team_members.find(
        (m) => m.team_id === milestone.team_id && m.user_id === callerId
      );
      if (!membership || membership.role !== 'lead') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can edit milestones.' },
        };
      }

      if (patch.name !== undefined) milestone.name = patch.name.trim().slice(0, 80);
      if (patch.description !== undefined) milestone.description = patch.description ? patch.description.slice(0, 300) : null;
      if (patch.due_date !== undefined) milestone.due_date = patch.due_date;
      if (taskIds !== undefined) milestone.task_ids = taskIds;

      return { ok: true, data: { ...milestone } };
    });
  }

  async completeMilestone(callerId: string, id: string): Promise<Result<Milestone>> {
    return withLock((db) => {
      const milestone = db.milestones.find((m) => m.id === id);
      if (!milestone) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Milestone not found.' },
        };
      }

      const membership = db.team_members.find(
        (m) => m.team_id === milestone.team_id && m.user_id === callerId
      );
      if (!membership || membership.role !== 'lead') {
        return {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Only the Team Lead can mark milestones complete.' },
        };
      }

      milestone.status = 'completed';
      milestone.completed_at = new Date().toISOString();

      return { ok: true, data: { ...milestone } };
    });
  }

  async getCalendarEntries(teamId: string, rangeStart: string, rangeEnd: string): Promise<Result<CalendarEntry[]>> {
    const db = await getDb();
    const entries: CalendarEntry[] = [];

    // 1. Tasks with due dates in range
    const tasks = db.tasks.filter((t) => {
      if (t.team_id !== teamId || t.deleted_at !== null || !t.due_date) return false;
      return t.due_date >= rangeStart && t.due_date <= rangeEnd;
    });

    for (const t of tasks) {
      const assignee = t.assignee_id ? db.profiles.find((p) => p.id === t.assignee_id) : null;
      entries.push({
        id: t.id,
        type: 'task',
        title: `Task due: ${t.title}`,
        start: t.due_date!,
        metadata: {
          assigneeName: assignee?.full_name || 'Unassigned',
          points: t.points,
          status: t.status,
        },
      });
    }

    // 2. Milestones due in range
    const milestones = db.milestones.filter((m) => {
      if (m.team_id !== teamId) return false;
      return m.due_date >= rangeStart && m.due_date <= rangeEnd;
    });

    for (const m of milestones) {
      entries.push({
        id: m.id,
        type: 'milestone',
        title: `Milestone: ${m.name}`,
        start: m.due_date,
        metadata: {
          status: m.status,
        },
      });
    }

    // 3. Team room sessions in range
    const sessions = db.bookings.filter((b) => {
      if (b.team_id !== teamId || b.status !== 'confirmed') return false;
      const campusDate = getCampusDateString(b.starts_at);
      return campusDate >= rangeStart && campusDate <= rangeEnd;
    });

    for (const s of sessions) {
      const room = db.rooms.find((r) => r.id === s.room_id);
      entries.push({
        id: s.id,
        type: 'session',
        title: `Room session: ${room?.name || 'Room'}`,
        start: s.starts_at,
        end: s.ends_at,
        metadata: {
          roomName: room?.name,
        },
      });
    }

    // Sort entries chronologically
    entries.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return { ok: true, data: entries };
  }
}
