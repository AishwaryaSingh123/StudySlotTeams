import { describe, it, expect } from 'vitest';
import {
  computeWorkloadSummary,
  escapeCsvCell,
  filterTasksByPeriod,
} from '../../lib/rules/contributions';
import { Task, TeamMember } from '../../lib/repo/types';

describe('Contribution & CSV Rules', () => {
  it('escapes cells against CSV formula injection', () => {
    expect(escapeCsvCell('=SUM(A1:A10)')).toBe(`"'=SUM(A1:A10)"`);
    expect(escapeCsvCell('+cmd|')).toBe(`"'+cmd|"`);
    expect(escapeCsvCell('-2+3')).toBe(`"'-2+3"`);
    expect(escapeCsvCell('@test')).toBe(`"'@test"`);
    expect(escapeCsvCell('Regular text')).toBe(`"Regular text"`);
    expect(escapeCsvCell('Text with, comma')).toBe(`"Text with, comma"`);
    expect(escapeCsvCell('Text with "quotes"')).toBe(`"Text with ""quotes"""`);
  });

  it('computes workload summaries and percentage shares', () => {
    const members: TeamMember[] = [
      { team_id: 't-1', user_id: 'u-1', role: 'lead', joined_at: '2026-11-01', profile: { id: 'u-1', full_name: 'Asha', email: 'a@test.com', role: 'student', created_at: '' } },
      { team_id: 't-1', user_id: 'u-2', role: 'member', joined_at: '2026-11-01', profile: { id: 'u-2', full_name: 'Ravi', email: 'r@test.com', role: 'student', created_at: '' } },
    ];

    const tasks: Task[] = [
      {
        id: 't1',
        team_id: 't-1',
        title: 'Task 1',
        description: '',
        assignee_id: 'u-1',
        due_date: '2026-11-10',
        points: 4,
        status: 'done',
        completed_at: '2026-11-04T10:00:00Z',
        created_by: 'u-1',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-04T10:00:00Z',
        deleted_at: null,
      },
      {
        id: 't2',
        team_id: 't-1',
        title: 'Task 2',
        description: '',
        assignee_id: 'u-2',
        due_date: '2026-11-12',
        points: 6, // 4 + 6 = 10 total done points
        status: 'done',
        completed_at: '2026-11-04T11:00:00Z',
        created_by: 'u-1',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-04T11:00:00Z',
        deleted_at: null,
      },
      {
        id: 't3',
        team_id: 't-1',
        title: 'Task 3 (Open)',
        description: '',
        assignee_id: 'u-1',
        due_date: '2026-11-15',
        points: 3,
        status: 'in_progress',
        completed_at: null,
        created_by: 'u-1',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
        deleted_at: null,
      },
      {
        id: 't4',
        team_id: 't-1',
        title: 'Task 4 (Deleted)',
        description: '',
        assignee_id: 'u-2',
        due_date: '2026-11-15',
        points: 5,
        status: 'done',
        completed_at: '2026-11-02T00:00:00Z',
        created_by: 'u-1',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-02T00:00:00Z',
        deleted_at: '2026-11-03T00:00:00Z', // soft deleted, must be excluded!
      },
    ];

    const summary = computeWorkloadSummary(members, tasks);

    const asha = summary.find((s) => s.userId === 'u-1')!;
    const ravi = summary.find((s) => s.userId === 'u-2')!;

    expect(asha.done).toBe(1);
    expect(asha.pointsDone).toBe(4);
    expect(asha.openPoints).toBe(3);
    expect(asha.sharePct).toBe(40); // 4 / 10 = 40%

    expect(ravi.done).toBe(1);
    expect(ravi.pointsDone).toBe(6);
    expect(ravi.sharePct).toBe(60); // 6 / 10 = 60%

    expect(asha.sharePct + ravi.sharePct).toBe(100);
  });
});
