// StudySlot Teams — Supabase Reports Repository
import { getSupabaseClient } from '../../supabase/server';
import {
  IReportRepo,
  WorkloadMemberSummary,
  RoomUsageSummary,
  Result,
  Room,
  Booking,
  BlackoutDate,
} from '../types';
import {
  computeWorkloadSummary,
  escapeCsvCell,
  filterTasksByPeriod,
} from '../../rules/contributions';
import { computeRoomUsage } from '../../rules/usage';

export class SupabaseReportRepo implements IReportRepo {
  async getWorkloadSummary(
    teamId: string,
    period: 'all' | 'last_7_days' | 'custom' = 'all',
    customStart?: string,
    customEnd?: string
  ): Promise<Result<WorkloadMemberSummary[]>> {
    const supabase = getSupabaseClient();

    const { data: membersData } = await supabase
      .from('team_members')
      .select('*, profiles(*)')
      .eq('team_id', teamId);

    const members = (membersData || []).map((m: any) => ({
      team_id: m.team_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      profile: m.profiles
        ? {
            id: m.profiles.id,
            full_name: m.profiles.full_name,
            email: m.profiles.email,
            role: m.profiles.role,
            created_at: m.profiles.created_at,
          }
        : undefined,
    }));

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('team_id', teamId)
      .is('deleted_at', null);

    const tasks = (tasksData || []).map((t: any) => ({
      id: t.id,
      team_id: t.team_id,
      title: t.title,
      description: t.description,
      assignee_id: t.assignee_id,
      due_date: t.due_date,
      points: t.estimate_points || 1,
      status: t.status,
      completed_at: t.completed_at,
      created_by: t.created_by,
      created_at: t.created_at,
      updated_at: t.updated_at,
      deleted_at: t.deleted_at,
    }));

    const filtered = filterTasksByPeriod(tasks, period, customStart, customEnd);
    const summary = computeWorkloadSummary(members, filtered);
    return { ok: true, data: summary };
  }

  async exportContributionReport(
    teamId: string,
    period: 'all' | 'last_7_days' | 'custom',
    format: 'csv' | 'html',
    customStart?: string,
    customEnd?: string
  ): Promise<Result<{ filename: string; contentType: string; content: string }>> {
    const supabase = getSupabaseClient();
    const { data: team } = await supabase.from('teams').select('*').eq('id', teamId).single();
    if (!team) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Team not found.' } };
    }

    const summaryRes = await this.getWorkloadSummary(teamId, period, customStart, customEnd);
    if (!summaryRes.ok) return summaryRes;
    const summaries = summaryRes.data;

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*, profiles!tasks_assignee_id_fkey(*)')
      .eq('team_id', teamId)
      .is('deleted_at', null);

    const tasks = (tasksData || []).map((t: any) => ({
      id: t.id,
      team_id: t.team_id,
      title: t.title,
      description: t.description,
      assignee_id: t.assignee_id,
      due_date: t.due_date,
      points: t.estimate_points || 1,
      status: t.status,
      completed_at: t.completed_at,
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

    const filtered = filterTasksByPeriod(tasks, period, customStart, customEnd);
    const safeTeamName = team.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const rows: string[] = [];
      rows.push(['# StudySlot Teams - Member Workload & Contribution Ledger'].join(','));
      rows.push([`# Team: ${team.name} | Period: ${period}`].join(','));
      rows.push('');
      rows.push(['Member', 'Assigned', 'Done', 'Points Done', 'Open Points', 'Share (%)'].join(','));

      for (const s of summaries) {
        rows.push([
          escapeCsvCell(s.name),
          s.assigned,
          s.done,
          s.pointsDone,
          s.openPoints,
          s.sharePct,
        ].join(','));
      }

      rows.push('');
      rows.push(['# Task Breakdown'].join(','));
      rows.push(['Task ID', 'Title', 'Assignee', 'Status', 'Points', 'Due Date', 'Completed At'].join(','));

      for (const t of filtered) {
        rows.push([
          t.id,
          escapeCsvCell(t.title),
          escapeCsvCell(t.assignee?.full_name || 'Unassigned'),
          t.status,
          t.points,
          t.due_date || '',
          t.completed_at || '',
        ].join(','));
      }

      return {
        ok: true,
        data: {
          filename: `contributions_${safeTeamName}_${timestamp}.csv`,
          contentType: 'text/csv; charset=utf-8',
          content: rows.join('\r\n'),
        },
      };
    } else {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Contribution Report — ${team.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1C1917; background: #FAF8F3; }
    h1 { font-family: "Source Serif 4", Georgia, serif; color: #16453A; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 32px; background: #FFFFFF; border: 1px solid #D9D2C5; }
    th, td { padding: 10px 14px; text-align: left; border: 1px solid #D9D2C5; font-size: 15px; }
    th { background: #EFEAE0; font-weight: bold; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 14px; background: #DCEBE4; color: #16453A; }
    @media print { body { background: #FFFFFF; margin: 20px; } }
  </style>
</head>
<body>
  <h1>StudySlot Teams — Contribution Report</h1>
  <p><strong>Team:</strong> ${team.name} | <strong>Project:</strong> ${team.project_name || team.name}</p>
  <p><strong>Reporting Period:</strong> ${period} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  
  <h2>Member Workload Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Member</th>
        <th>Assigned</th>
        <th>Done</th>
        <th>Points Done</th>
        <th>Open Points</th>
        <th>Share (%)</th>
      </tr>
    </thead>
    <tbody>
      ${summaries
        .map(
          (s) => `<tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.assigned}</td>
          <td>${s.done}</td>
          <td>${s.pointsDone} pts</td>
          <td>${s.openPoints} pts</td>
          <td>${s.sharePct}%</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>Task Detail Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Title</th>
        <th>Assignee</th>
        <th>Status</th>
        <th>Points</th>
        <th>Due Date</th>
        <th>Completed</th>
      </tr>
    </thead>
    <tbody>
      ${filtered
        .map((t) => `<tr>
          <td>${t.title}</td>
          <td>${t.assignee?.full_name || 'Unassigned'}</td>
          <td><span class="badge">${t.status}</span></td>
          <td>${t.points} pts</td>
          <td>${t.due_date || '—'}</td>
          <td>${t.completed_at ? t.completed_at.slice(0, 10) : '—'}</td>
        </tr>`)
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

      return {
        ok: true,
        data: {
          filename: `contributions_${safeTeamName}_${timestamp}.html`,
          contentType: 'text/html; charset=utf-8',
          content: html,
        },
      };
    }
  }

  async getUsageReport(period: 'all' | 'last_7_days' | 'last_30_days'): Promise<Result<RoomUsageSummary[]>> {
    const supabase = getSupabaseClient();
    const { data: roomsData } = await supabase.from('rooms').select('*');
    const { data: bookingsData } = await supabase.from('bookings').select('*');
    const { data: blackoutsData } = await supabase.from('blackout_dates').select('*');

    const rooms: Room[] = (roomsData || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      building: r.building,
      floor: r.floor,
      capacity: r.capacity,
      opens_at: r.opens_at || '08:00:00',
      closes_at: r.closes_at || '22:00:00',
      status: r.status || (r.is_active ? 'active' : 'inactive'),
      equipment: [],
    }));

    const bookings: Booking[] = (bookingsData || []).map((b: any) => ({
      id: b.id,
      room_id: b.room_id,
      booked_by: b.created_by,
      team_id: b.team_id || null,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      purpose: b.purpose,
      status: b.status,
      created_at: b.created_at,
      cancelled_at: b.cancelled_at || null,
    }));

    const blackouts: BlackoutDate[] = (blackoutsData || []).map((b: any) => ({
      id: b.id,
      room_id: b.room_id || null,
      start_date: b.date || b.start_date,
      end_date: b.date || b.end_date,
      reason: b.reason,
    }));

    const summaries = computeRoomUsage({
      rooms,
      bookings,
      blackouts,
      period,
    });

    return { ok: true, data: summaries };
  }

  async exportUsageReportCSV(period: 'all' | 'last_7_days' | 'last_30_days'): Promise<Result<{ filename: string; content: string }>> {
    const summaryRes = await this.getUsageReport(period);
    if (!summaryRes.ok) return summaryRes;
    const summaries = summaryRes.data;

    const rows: string[] = [];
    rows.push(['# StudySlot Teams - Campus Room Usage and Capacity Ledger'].join(','));
    rows.push([`# Period: ${period} | Exported: ${new Date().toISOString()}`].join(','));
    rows.push('');
    rows.push(['Room ID', 'Room Name', 'Building', 'Capacity', 'Bookings', 'Hours Booked', 'Utilisation (%)', 'Cancellations'].join(','));

    for (const s of summaries) {
      rows.push([
        s.roomId,
        escapeCsvCell(s.name),
        escapeCsvCell(s.building),
        s.capacity,
        s.bookings,
        s.hoursBooked,
        s.utilisationPct,
        s.cancelled,
      ].join(','));
    }

    return {
      ok: true,
      data: {
        filename: `room_usage_${period}_${new Date().toISOString().slice(0, 10)}.csv`,
        content: rows.join('\r\n'),
      },
    };
  }
}
