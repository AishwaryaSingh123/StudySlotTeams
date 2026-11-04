// StudySlot Teams — Supabase Tasks Repository
import { getSupabaseClient } from '../../supabase/server';
import {
  ITaskRepo,
  Task,
  TaskStatus,
  ActivityLogItem,
  Result,
} from '../types';
import { getCampusDateString } from '../../time/campus';

export class SupabaseTaskRepo implements ITaskRepo {
  async listTasks(
    teamId: string,
    filters?: { assigneeId?: string; due?: 'all' | 'week' | 'overdue' }
  ): Promise<Result<Task[]>> {
    const supabase = getSupabaseClient();
    const today = getCampusDateString(new Date());

    let query = supabase
      .from('tasks')
      .select('*, profiles!tasks_assignee_id_fkey(*)')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (filters?.assigneeId) {
      query = query.eq('assignee_id', filters.assigneeId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return { ok: true, data: [] };
    }

    let tasks: Task[] = data.map((t: any) => ({
      id: t.id,
      team_id: t.team_id,
      title: t.title,
      description: t.description,
      assignee_id: t.assignee_id,
      due_date: t.due_date,
      points: t.estimate_points || t.points || 1,
      status: t.status as TaskStatus,
      completed_at: t.completed_at || null,
      created_by: t.created_by,
      created_at: t.created_at,
      updated_at: t.updated_at,
      deleted_at: t.deleted_at,
      assignee: t.profiles
        ? {
            id: t.profiles.id,
            full_name: t.profiles.full_name,
            email: t.profiles.email,
            role: t.profiles.role,
            created_at: t.profiles.created_at,
          }
        : null,
    }));

    if (filters?.due === 'overdue') {
      tasks = tasks.filter((t) => t.due_date && t.due_date < today && t.status !== 'done');
    } else if (filters?.due === 'week') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = getCampusDateString(nextWeek);
      tasks = tasks.filter((t) => t.due_date && t.due_date >= today && t.due_date <= nextWeekStr);
    }

    return { ok: true, data: tasks };
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
    const supabase = getSupabaseClient();

    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', input.teamId)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this team.' } };
    }

    if (membership.role !== 'lead' && input.assigneeId && input.assigneeId !== callerId) {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Team members may only create tasks assigned to themselves.' },
      };
    }

    const trimmedTitle = input.title.trim();
    if (trimmedTitle.length < 1 || trimmedTitle.length > 80) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'Task title must be between 1 and 80 characters.' },
      };
    }

    const taskId = `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const nowIso = new Date().toISOString();

    const { error: insertError } = await supabase.from('tasks').insert({
      id: taskId,
      team_id: input.teamId,
      title: trimmedTitle,
      description: input.description || null,
      assignee_id: input.assigneeId || null,
      due_date: input.dueDate || null,
      estimate_points: Math.min(5, Math.max(1, input.points || 1)),
      status: 'todo',
      created_by: callerId,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (insertError) {
      return { ok: false, error: { code: 'INTERNAL', message: insertError.message } };
    }

    const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', callerId).single();
    await supabase.from('activity_log').insert({
      id: `act-${Date.now().toString(36)}`,
      team_id: input.teamId,
      actor_id: callerId,
      actor_name: userProfile?.full_name || 'Team Member',
      task_id: taskId,
      task_title: trimmedTitle,
      action: 'task_created',
      detail: { title: trimmedTitle },
      created_at: nowIso,
    });

    const created = await this.listTasks(input.teamId);
    const createdTask = created.ok ? created.data.find((t) => t.id === taskId) : null;
    return { ok: true, data: createdTask! };
  }

  async updateTask(
    callerId: string,
    taskId: string,
    patch: Partial<Task>,
    seenUpdatedAt: string
  ): Promise<Result<Task>> {
    const supabase = getSupabaseClient();
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (error || !task || task.deleted_at !== null) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } };
    }

    if (task.updated_at !== seenUpdatedAt) {
      return {
        ok: false,
        error: {
          code: 'CONFLICT',
          message: 'This task was modified by someone else since you opened it. Reload to see the latest changes.',
        },
      };
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', task.team_id)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'You are not a member of this team.' } };
    }

    const isLead = membership.role === 'lead';
    const isAssignee = task.assignee_id === callerId;
    if (!isLead && !isAssignee) {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Only the assignee or Team Lead can edit this task.' } };
    }

    if (!isLead && (patch.title !== undefined || patch.points !== undefined || patch.assignee_id !== undefined)) {
      return {
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Only the Team Lead can change task titles, points, or assignees.' },
      };
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = { updated_at: nowIso };

    if (patch.status !== undefined) {
      updates.status = patch.status;
      if (patch.status === 'done') {
        updates.completed_at = nowIso;
      } else {
        updates.completed_at = null;
      }
    }

    if (patch.title !== undefined) updates.title = patch.title.trim().slice(0, 80);
    if (patch.description !== undefined) updates.description = patch.description ? patch.description.slice(0, 500) : null;
    if (patch.assignee_id !== undefined) updates.assignee_id = patch.assignee_id;
    if (patch.due_date !== undefined) updates.due_date = patch.due_date;
    if (patch.points !== undefined) updates.estimate_points = Math.min(5, Math.max(1, patch.points));

    const { error: updateError } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (updateError) {
      return { ok: false, error: { code: 'INTERNAL', message: updateError.message } };
    }

    const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', callerId).single();
    if (patch.status && patch.status !== task.status) {
      const action = patch.status === 'done' ? 'task_completed' : 'task_moved';
      await supabase.from('activity_log').insert({
        id: `act-${Date.now().toString(36)}`,
        team_id: task.team_id,
        actor_id: callerId,
        actor_name: userProfile?.full_name || 'Team Member',
        task_id: taskId,
        task_title: task.title,
        action,
        detail: { from: task.status, to: patch.status, title: task.title },
        created_at: nowIso,
      });
    }

    const tasksRes = await this.listTasks(task.team_id);
    const updatedTask = tasksRes.ok ? tasksRes.data.find((t) => t.id === taskId) : null;
    return { ok: true, data: updatedTask! };
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
    const supabase = getSupabaseClient();
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (!task || task.deleted_at !== null) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } };
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', task.team_id)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership || membership.role !== 'lead') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Only the Team Lead can delete tasks.' } };
    }

    const nowIso = new Date().toISOString();
    await supabase.from('tasks').update({ deleted_at: nowIso, updated_at: nowIso }).eq('id', taskId);

    const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', callerId).single();
    await supabase.from('activity_log').insert({
      id: `act-${Date.now().toString(36)}`,
      team_id: task.team_id,
      actor_id: callerId,
      actor_name: userProfile?.full_name || 'Team Member',
      task_id: taskId,
      task_title: task.title,
      action: 'task_deleted',
      detail: { title: task.title },
      created_at: nowIso,
    });

    return {
      ok: true,
      data: {
        ...task,
        deleted_at: nowIso,
        updated_at: nowIso,
        points: task.estimate_points || 1,
      },
    };
  }

  async restoreTask(callerId: string, taskId: string): Promise<Result<Task>> {
    const supabase = getSupabaseClient();
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
    if (!task || task.deleted_at === null) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Deleted task not found.' } };
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', task.team_id)
      .eq('user_id', callerId)
      .maybeSingle();

    if (!membership || membership.role !== 'lead') {
      return { ok: false, error: { code: 'FORBIDDEN', message: 'Only the Team Lead can restore tasks.' } };
    }

    const nowIso = new Date().toISOString();
    await supabase.from('tasks').update({ deleted_at: null, updated_at: nowIso }).eq('id', taskId);

    const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', callerId).single();
    await supabase.from('activity_log').insert({
      id: `act-${Date.now().toString(36)}`,
      team_id: task.team_id,
      actor_id: callerId,
      actor_name: userProfile?.full_name || 'Team Member',
      task_id: taskId,
      task_title: task.title,
      action: 'task_restored',
      detail: { title: task.title },
      created_at: nowIso,
    });

    return {
      ok: true,
      data: {
        ...task,
        deleted_at: null,
        updated_at: nowIso,
        points: task.estimate_points || 1,
      },
    };
  }

  async listActivityLog(
    teamId: string,
    period?: 'all' | 'last_7_days' | 'custom',
    customStart?: string,
    customEnd?: string
  ): Promise<Result<ActivityLogItem[]>> {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (period === 'last_7_days') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', sevenDaysAgo);
    } else if (period === 'custom' && customStart && customEnd) {
      query = query.gte('created_at', `${customStart}T00:00:00Z`).lte('created_at', `${customEnd}T23:59:59Z`);
    }

    const { data, error } = await query;
    if (error || !data) return { ok: true, data: [] };

    return {
      ok: true,
      data: data.map((a: any) => ({
        id: a.id,
        team_id: a.team_id,
        actor_id: a.actor_id,
        actor_name: a.actor_name,
        action: a.action,
        task_id: a.task_id || null,
        task_title: a.task_title || (a.detail?.title as string | undefined),
        detail: a.detail || null,
        created_at: a.created_at,
      })),
    };
  }
}
