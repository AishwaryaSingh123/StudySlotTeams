// StudySlot Teams — Supabase Milestones Repository
import { getSupabaseClient } from '../../supabase/server';
import {
  IMilestoneRepo,
  Milestone,
  CalendarEntry,
  Result,
} from '../types';
import { getCampusDateString } from '../../time/campus';

export class SupabaseMilestoneRepo implements IMilestoneRepo {
  async listMilestones(teamId: string): Promise<Result<Milestone[]>> {
    const supabase = getSupabaseClient();
    const { data: milestones, error } = await supabase
      .from('milestones')
      .select('*, milestone_tasks(task_id)')
      .eq('team_id', teamId)
      .order('due_date', { ascending: true });

    if (error || !milestones) {
      return { ok: true, data: [] };
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('team_id', teamId)
      .is('deleted_at', null);

    const taskMap = new Map((tasks || []).map((t: any) => [t.id, t.status]));

    const mapped: Milestone[] = milestones.map((m: any) => {
      const taskIds = (m.milestone_tasks || []).map((mt: any) => mt.task_id);
      const total = taskIds.length;
      const done = taskIds.filter((tId: string) => taskMap.get(tId) === 'done').length;

      return {
        id: m.id,
        team_id: m.team_id,
        name: m.name,
        description: m.description,
        due_date: m.due_date,
        status: m.status,
        completed_at: m.completed_at || null,
        task_ids: taskIds,
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
    const supabase = getSupabaseClient();
    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', input.teamId)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership || membership.role !== 'lead') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Only the Team Lead can create milestones.' } };
    }

    const trimmedName = input.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 80) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'Milestone name must be between 1 and 80 characters.' },
      };
    }

    const milestoneId = `ms-${Date.now().toString(36)}`;
    const { error: insertError } = await supabase.from('milestones').insert({
      id: milestoneId,
      team_id: input.teamId,
      name: trimmedName,
      description: input.description || null,
      due_date: input.dueDate,
      status: 'open',
    });

    if (insertError) {
      return { ok: false, error: { code: 'INTERNAL', message: insertError.message } };
    }

    if (input.taskIds && input.taskIds.length > 0) {
      const taskRows = input.taskIds.map((tId) => ({ milestone_id: milestoneId, task_id: tId }));
      await supabase.from('milestone_tasks').insert(taskRows);
    }

    const newMilestone: Milestone = {
      id: milestoneId,
      team_id: input.teamId,
      name: trimmedName,
      description: input.description || null,
      due_date: input.dueDate,
      status: 'open',
      completed_at: null,
      task_ids: input.taskIds || [],
      total_tasks: (input.taskIds || []).length,
      done_tasks: 0,
    };

    return { ok: true, data: newMilestone };
  }

  async updateMilestone(
    callerId: string,
    id: string,
    patch: Partial<Milestone>,
    taskIds?: string[]
  ): Promise<Result<Milestone>> {
    const supabase = getSupabaseClient();
    const { data: milestone } = await supabase.from('milestones').select('*').eq('id', id).maybeSingle();
    if (!milestone) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Milestone not found.' } };
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', milestone.team_id)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership || membership.role !== 'lead') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Only the Team Lead can edit milestones.' } };
    }

    const updates: Record<string, any> = {};
    if (patch.name !== undefined) updates.name = patch.name.trim().slice(0, 80);
    if (patch.description !== undefined) updates.description = patch.description || null;
    if (patch.due_date !== undefined) updates.due_date = patch.due_date;
    if (patch.status !== undefined) updates.status = patch.status;

    if (Object.keys(updates).length > 0) {
      await supabase.from('milestones').update(updates).eq('id', id);
    }

    if (taskIds !== undefined) {
      await supabase.from('milestone_tasks').delete().eq('milestone_id', id);
      if (taskIds.length > 0) {
        const rows = taskIds.map((tId) => ({ milestone_id: id, task_id: tId }));
        await supabase.from('milestone_tasks').insert(rows);
      }
    }

    const listRes = await this.listMilestones(milestone.team_id);
    const updated = listRes.ok ? listRes.data.find((m) => m.id === id) : null;
    return { ok: true, data: updated! };
  }

  async completeMilestone(callerId: string, id: string): Promise<Result<Milestone>> {
    return this.updateMilestone(callerId, id, { status: 'completed' });
  }

  async getCalendarEntries(teamId: string, rangeStart: string, rangeEnd: string): Promise<Result<CalendarEntry[]>> {
    const supabase = getSupabaseClient();
    const entries: CalendarEntry[] = [];

    // 1. Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, profiles!tasks_assignee_id_fkey(*)')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .gte('due_date', rangeStart)
      .lte('due_date', rangeEnd);

    (tasks || []).forEach((t: any) => {
      entries.push({
        id: t.id,
        type: 'task',
        title: `Task due: ${t.title}`,
        start: t.due_date,
        metadata: {
          assigneeName: t.profiles?.full_name || 'Unassigned',
          points: t.estimate_points || 1,
          status: t.status,
        },
      });
    });

    // 2. Milestones
    const { data: milestones } = await supabase
      .from('milestones')
      .select('*')
      .eq('team_id', teamId)
      .gte('due_date', rangeStart)
      .lte('due_date', rangeEnd);

    (milestones || []).forEach((m: any) => {
      entries.push({
        id: m.id,
        type: 'milestone',
        title: `Milestone: ${m.name}`,
        start: m.due_date,
        metadata: {
          status: m.status,
        },
      });
    });

    // 3. Sessions
    const { data: sessions } = await supabase
      .from('bookings')
      .select('*, rooms(*)')
      .eq('team_id', teamId)
      .eq('status', 'confirmed');

    (sessions || []).forEach((s: any) => {
      const campusDate = getCampusDateString(s.starts_at);
      if (campusDate >= rangeStart && campusDate <= rangeEnd) {
        entries.push({
          id: s.id,
          type: 'session',
          title: `Room session: ${s.rooms?.name || 'Room'}`,
          start: s.starts_at,
          end: s.ends_at,
          metadata: {
            roomName: s.rooms?.name,
          },
        });
      }
    });

    entries.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return { ok: true, data: entries };
  }
}
