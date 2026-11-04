'use client';

import React, { useState } from 'react';
import { Download, FileText, History, BarChart2 } from 'lucide-react';
import { ActivityLogItem, Team, WorkloadMemberSummary } from '@/lib/repo/types';
import { TeamNav } from '@/components/TeamNav';
import { Button } from '@/components/Button';
import { DataTable, Column } from '@/components/DataTable';
import { useToast } from '@/components/Toast';

export interface ContributionsClientProps {
  team: Team;
  isLead: boolean;
  initialSummaries: WorkloadMemberSummary[];
  initialActivities: ActivityLogItem[];
  onFetchSummary: (
    period: 'all' | 'last_7_days' | 'custom',
    start?: string,
    end?: string
  ) => Promise<{ ok: boolean; summaries?: WorkloadMemberSummary[]; activities?: ActivityLogItem[]; error?: string }>;
  onExportReport: (
    period: 'all' | 'last_7_days' | 'custom',
    format: 'csv' | 'html',
    start?: string,
    end?: string
  ) => Promise<{ ok: boolean; filename?: string; contentType?: string; content?: string; error?: string }>;
}

export function ContributionsClient({
  team,
  isLead,
  initialSummaries,
  initialActivities,
  onFetchSummary,
  onExportReport,
}: ContributionsClientProps) {
  const { showToast } = useToast();

  const [period, setPeriod] = useState<'all' | 'last_7_days' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('2026-11-01');
  const [customEnd, setCustomEnd] = useState('2026-11-30');

  const [summaries, setSummaries] = useState<WorkloadMemberSummary[]>(initialSummaries);
  const [activities, setActivities] = useState<ActivityLogItem[]>(initialActivities);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handlePeriodChange = async (newPeriod: 'all' | 'last_7_days' | 'custom') => {
    setPeriod(newPeriod);
    setLoading(true);

    try {
      const res = await onFetchSummary(newPeriod, customStart, customEnd);
      if (res.ok && res.summaries && res.activities) {
        setSummaries(res.summaries);
        setActivities(res.activities);
      }
    } catch {
      showToast({ type: 'error', message: 'Failed to reload contribution data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'csv' | 'html') => {
    setExportLoading(true);

    try {
      const res = await onExportReport(period, format, customStart, customEnd);
      if (res.ok && res.content && res.filename) {
        const blob = new Blob([res.content], { type: res.contentType || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast({
          type: 'success',
          message: `Downloaded contribution report (${format.toUpperCase()}).`,
        });
      } else {
        showToast({ type: 'error', message: res.error || 'Failed to generate report.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error generating report.' });
    } finally {
      setExportLoading(false);
    }
  };

  const columns: Column<WorkloadMemberSummary>[] = [
    {
      key: 'name',
      header: 'Member',
      render: (s: WorkloadMemberSummary) => <strong>{s.name}</strong>,
    },
    {
      key: 'assigned',
      header: 'Tasks Assigned',
      align: 'center',
      render: (s: WorkloadMemberSummary) => <span className="tabular-nums">{s.assigned}</span>,
    },
    {
      key: 'done',
      header: 'Tasks Done',
      align: 'center',
      render: (s: WorkloadMemberSummary) => (
        <span className="tabular-nums font-bold" style={{ color: 'var(--color-success-text)' }}>
          {s.done}
        </span>
      ),
    },
    {
      key: 'pointsDone',
      header: 'Points Done',
      align: 'center',
      render: (s: WorkloadMemberSummary) => <span className="tabular-nums font-bold">{s.pointsDone} pts</span>,
    },
    {
      key: 'openPoints',
      header: 'Open Points',
      align: 'center',
      render: (s: WorkloadMemberSummary) => <span className="tabular-nums">{s.openPoints} pts</span>,
    },
    {
      key: 'sharePct',
      header: 'Share of Completed Points',
      render: (s: WorkloadMemberSummary) => (
        <div style={{ minWidth: '160px' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700 }} className="tabular-nums">
            {s.sharePct}%
          </div>
          {/* Supplementary bar (design.md B9.2 M12) */}
          <div
            style={{
              height: '8px',
              width: '100%',
              backgroundColor: 'var(--color-sand)',
              borderRadius: '4px',
              marginTop: '4px',
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >
            <div
              style={{
                height: '100%',
                width: `${s.sharePct}%`,
                backgroundColor: 'var(--color-stacks-green)',
                transition: 'width var(--motion-slow) var(--ease-out)',
              }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <TeamNav teamId={team.id} teamName={team.name} isLead={isLead} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Contribution Log and Report</h2>
          <p style={{ color: 'var(--color-slate)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Transparent workload accounting derived from verified tasks and status logs.
          </p>
        </div>

        {/* Download Report Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="primary"
            onClick={() => handleDownload('csv')}
            loading={exportLoading}
            loadingText="Exporting…"
          >
            <Download size={18} aria-hidden="true" />
            <span>Download CSV</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleDownload('html')}
            loading={exportLoading}
            loadingText="Exporting…"
          >
            <FileText size={18} aria-hidden="true" />
            <span>Printable HTML</span>
          </Button>
        </div>
      </div>

      {/* Period Selector (design.md S13) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: 'var(--color-sand)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Reporting Period:</span>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="periodSelector"
            value="all"
            checked={period === 'all'}
            onChange={() => handlePeriodChange('all')}
            style={{ width: '16px', height: '16px' }}
          />
          <span>Whole project</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="periodSelector"
            value="last_7_days"
            checked={period === 'last_7_days'}
            onChange={() => handlePeriodChange('last_7_days')}
            style={{ width: '16px', height: '16px' }}
          />
          <span>Last 7 days</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="periodSelector"
            value="custom"
            checked={period === 'custom'}
            onChange={() => handlePeriodChange('custom')}
            style={{ width: '16px', height: '16px' }}
          />
          <span>Custom dates</span>
        </label>

        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-control-border)',
                background: 'var(--color-surface)',
              }}
            />
            <span>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-control-border)',
                background: 'var(--color-surface)',
              }}
            />
            <Button
              variant="secondary"
              onClick={() => handlePeriodChange('custom')}
              style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.85rem' }}
            >
              Update
            </Button>
          </div>
        )}
      </div>

      {/* Workload Summary Table */}
      <section aria-labelledby="workload-summary-heading" style={{ marginBottom: '40px' }}>
        <h3 id="workload-summary-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
          Member Workload Summary
        </h3>

        <DataTable
          caption="Aggregate task points and workload percentages by team member"
          columns={columns}
          data={summaries}
          keyExtractor={(s: WorkloadMemberSummary) => s.userId}
          emptyMessage="No tasks found for the selected reporting period."
        />
      </section>

      {/* Reverse-Chronological Activity Log (design.md S13) */}
      <section
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
        }}
        aria-labelledby="activity-log-heading"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <History size={20} color="var(--color-stacks-green)" aria-hidden="true" />
          <h3 id="activity-log-heading" style={{ margin: 0, fontSize: '1.2rem' }}>
            Activity Log
          </h3>
        </div>

        {activities.length === 0 ? (
          <p style={{ color: 'var(--color-slate)', fontStyle: 'italic' }}>
            No team activity recorded during this period.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
            {activities.map((act, idx) => {
              const dateStr = new Date(act.created_at).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              let actionText = '';
              if (act.action === 'task_created') {
                actionText = `created task "${act.task_title || 'New task'}"`;
              } else if (act.action === 'task_completed') {
                actionText = `marked "${act.task_title}" as Done`;
              } else if (act.action === 'task_moved') {
                actionText = `moved "${act.task_title}" to ${act.detail?.to || 'new column'}`;
              } else if (act.action === 'task_deleted') {
                actionText = `deleted task "${act.task_title}"`;
              } else if (act.action === 'task_restored') {
                actionText = `restored task "${act.task_title}"`;
              }

              return (
                <li
                  key={act.id}
                  style={{
                    padding: '12px 0',
                    borderTop: idx > 0 ? '1px solid var(--color-rule)' : 'none',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '12px',
                    fontSize: '0.95rem',
                  }}
                >
                  <span className="tabular-nums" style={{ color: 'var(--color-slate)', fontSize: '0.85rem', minWidth: '150px' }}>
                    {dateStr}
                  </span>
                  <div>
                    <strong>{act.actor_name}</strong> {actionText}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
