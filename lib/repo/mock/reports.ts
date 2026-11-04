// StudySlot Teams — Mock Reports and Exports Repository

import {
  IReportRepo,
  WorkloadMemberSummary,
  RoomUsageSummary,
  Result,
} from '../types';
import { getDb } from './store';
import {
  computeWorkloadSummary,
  escapeCsvCell,
  filterTasksByPeriod,
} from '../../rules/contributions';
import { computeRoomUsage } from '../../rules/usage';

export class MockReportRepo implements IReportRepo {
  async getWorkloadSummary(
    teamId: string,
    period: 'all' | 'last_7_days' | 'custom' = 'all',
    customStart?: string,
    customEnd?: string
  ): Promise<Result<WorkloadMemberSummary[]>> {
    const db = await getDb();
    const members = db.team_members
      .filter((m) => m.team_id === teamId)
      .map((m) => ({
        ...m,
        profile: db.profiles.find((p) => p.id === m.user_id),
      }));

    const teamTasks = db.tasks.filter((t) => t.team_id === teamId);
    const filteredTasks = filterTasksByPeriod(teamTasks, period, customStart, customEnd);
    const summary = computeWorkloadSummary(members, filteredTasks);

    return { ok: true, data: summary };
  }

  async exportContributionReport(
    teamId: string,
    period: 'all' | 'last_7_days' | 'custom',
    format: 'csv' | 'html',
    customStart?: string,
    customEnd?: string
  ): Promise<Result<{ filename: string; contentType: string; content: string }>> {
    const db = await getDb();
    const team = db.teams.find((t) => t.id === teamId);
    if (!team) {
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Team not found.' },
      };
    }

    const summaryRes = await this.getWorkloadSummary(teamId, period, customStart, customEnd);
    if (!summaryRes.ok) return summaryRes;
    const summaries = summaryRes.data;

    const teamTasks = db.tasks.filter((t) => t.team_id === teamId && t.deleted_at === null);
    const filteredTasks = filterTasksByPeriod(teamTasks, period, customStart, customEnd);

    const safeTeamName = team.name.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const rows: string[] = [];
      rows.push(['StudySlot Teams — Team Contribution Report'].map(escapeCsvCell).join(','));
      rows.push(['Team:', team.name].map(escapeCsvCell).join(','));
      rows.push(['Project:', team.project_name].map(escapeCsvCell).join(','));
      rows.push(['Period:', period].map(escapeCsvCell).join(','));
      rows.push(['Generated At:', new Date().toISOString()].map(escapeCsvCell).join(','));
      rows.push('');

      // Section 1: Workload Summary
      rows.push(['MEMBER WORKLOAD SUMMARY'].map(escapeCsvCell).join(','));
      rows.push(
        [
          'Member Name',
          'Tasks Assigned',
          'Tasks Done',
          'Points Done',
          'Open Points',
          'Share of Done Points (%)',
        ]
          .map(escapeCsvCell)
          .join(',')
      );

      for (const s of summaries) {
        rows.push(
          [
            s.name,
            s.assigned,
            s.done,
            s.pointsDone,
            s.openPoints,
            `${s.sharePct}%`,
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }

      rows.push('');

      // Section 2: Task Detail Breakdown
      rows.push(['TASK BREAKDOWN'].map(escapeCsvCell).join(','));
      rows.push(
        ['Task Title', 'Assignee', 'Status', 'Points', 'Due Date', 'Completed Date']
          .map(escapeCsvCell)
          .join(',')
      );

      for (const t of filteredTasks) {
        const assignee = t.assignee_id ? db.profiles.find((p) => p.id === t.assignee_id) : null;
        rows.push(
          [
            t.title,
            assignee?.full_name || 'Unassigned',
            t.status,
            t.points,
            t.due_date || 'None',
            t.completed_at ? t.completed_at.slice(0, 10) : 'Not completed',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
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
      // Printable HTML format
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Contribution Report — ${team.name}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 40px; color: #1B2430; background: #FAF8F3; line-height: 1.5; }
    h1 { font-family: serif; color: #1F5C4A; border-bottom: 2px solid #1F5C4A; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 32px; background: #FFFFFF; }
    th, td { border: 1px solid #D6D0C2; padding: 10px 12px; text-align: left; }
    th { background: #EFEAE0; font-weight: bold; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 14px; background: #DCEBE4; color: #16453A; }
    @media print { body { background: #FFFFFF; margin: 20px; } }
  </style>
</head>
<body>
  <h1>StudySlot Teams — Contribution Report</h1>
  <p><strong>Team:</strong> ${team.name} | <strong>Project:</strong> ${team.project_name}</p>
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
      ${filteredTasks
        .map((t) => {
          const assignee = t.assignee_id ? db.profiles.find((p) => p.id === t.assignee_id) : null;
          return `<tr>
            <td>${t.title}</td>
            <td>${assignee?.full_name || 'Unassigned'}</td>
            <td><span class="badge">${t.status}</span></td>
            <td>${t.points} pts</td>
            <td>${t.due_date || '—'}</td>
            <td>${t.completed_at ? t.completed_at.slice(0, 10) : '—'}</td>
          </tr>`;
        })
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
    const db = await getDb();
    const summaries = computeRoomUsage({
      rooms: db.rooms,
      bookings: db.bookings,
      blackouts: db.blackouts,
      period,
    });
    return { ok: true, data: summaries };
  }

  async exportUsageReportCSV(period: 'all' | 'last_7_days' | 'last_30_days'): Promise<Result<{ filename: string; content: string }>> {
    const db = await getDb();
    const summaries = computeRoomUsage({
      rooms: db.rooms,
      bookings: db.bookings,
      blackouts: db.blackouts,
      period,
    });

    const rows: string[] = [];
    rows.push(['StudySlot Teams — Staff Room Usage Report'].map(escapeCsvCell).join(','));
    rows.push(['Period:', period].map(escapeCsvCell).join(','));
    rows.push(['Generated At:', new Date().toISOString()].map(escapeCsvCell).join(','));
    rows.push('');

    rows.push(
      ['Room Name', 'Building', 'Capacity', 'Confirmed Bookings', 'Hours Booked', 'Utilisation (%)', 'Cancellations']
        .map(escapeCsvCell)
        .join(',')
    );

    for (const r of summaries) {
      rows.push(
        [r.name, r.building, r.capacity, r.bookings, `${r.hoursBooked}h`, `${r.utilisationPct}%`, r.cancelled]
          .map(escapeCsvCell)
          .join(',')
      );
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      data: {
        filename: `room_usage_${period}_${timestamp}.csv`,
        content: rows.join('\r\n'),
      },
    };
  }
}
