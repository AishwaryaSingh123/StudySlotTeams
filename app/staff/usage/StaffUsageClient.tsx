'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { RoomUsageSummary } from '../../../lib/repo/types';
import { Button } from '../../../components/Button';
import { DataTable, Column } from '../../../components/DataTable';
import { useToast } from '../../../components/Toast';

export interface StaffUsageClientProps {
  initialSummaries: RoomUsageSummary[];
  onFetchUsage: (period: 'all' | 'last_7_days' | 'last_30_days') => Promise<{
    ok: boolean;
    summaries?: RoomUsageSummary[];
    error?: string;
  }>;
  onExportCSV: (period: 'all' | 'last_7_days' | 'last_30_days') => Promise<{
    ok: boolean;
    filename?: string;
    content?: string;
    error?: string;
  }>;
}

export function StaffUsageClient({
  initialSummaries,
  onFetchUsage,
  onExportCSV,
}: StaffUsageClientProps) {
  const { showToast } = useToast();

  const [period, setPeriod] = useState<'all' | 'last_7_days' | 'last_30_days'>('all');
  const [summaries, setSummaries] = useState<RoomUsageSummary[]>(initialSummaries);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handlePeriodChange = async (newPeriod: 'all' | 'last_7_days' | 'last_30_days') => {
    setPeriod(newPeriod);
    setLoading(true);
    try {
      const res = await onFetchUsage(newPeriod);
      if (res.ok && res.summaries) {
        setSummaries(res.summaries);
      }
    } catch {
      showToast({ type: 'error', message: 'Failed to reload usage metrics.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await onExportCSV(period);
      if (res.ok && res.content && res.filename) {
        const blob = new Blob([res.content], { type: 'text/csv; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast({ type: 'success', message: 'Room usage CSV downloaded.' });
      } else {
        showToast({ type: 'error', message: res.error || 'Failed to export CSV.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error exporting usage.' });
    } finally {
      setExportLoading(false);
    }
  };

  const columns: Column<RoomUsageSummary>[] = [
    {
      key: 'name',
      header: 'Room',
      render: (r) => (
        <div>
          <strong>{r.name}</strong>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>{r.building}</div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.capacity}</span>,
    },
    {
      key: 'bookings',
      header: 'Bookings',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.bookings}</span>,
    },
    {
      key: 'hoursBooked',
      header: 'Hours Booked',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.hoursBooked}h</span>,
    },
    {
      key: 'utilisationPct',
      header: 'Utilisation',
      render: (r) => (
        <div style={{ minWidth: '150px' }}>
          <span className="tabular-nums font-bold">{r.utilisationPct}%</span>
          {/* Supplementary bar */}
          <div
            style={{
              height: '6px',
              width: '100%',
              backgroundColor: 'var(--color-sand)',
              borderRadius: '3px',
              marginTop: '4px',
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, r.utilisationPct)}%`,
                backgroundColor: 'var(--color-stacks-green)',
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'cancelled',
      header: 'Cancelled Bookings',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.cancelled}</span>,
    },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Room usage</h1>
          <p style={{ color: 'var(--color-slate)', margin: '4px 0 0 0' }}>
            Aggregated utilization and booking statistics across campus study facilities.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleExport}
          loading={exportLoading}
          loadingText="Exporting…"
        >
          <Download size={18} aria-hidden="true" />
          <span>Export usage CSV</span>
        </Button>
      </div>

      {/* Period Selector (design.md S16) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 18px',
          backgroundColor: 'var(--color-sand)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Reporting Scope:</span>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="usagePeriod"
            value="all"
            checked={period === 'all'}
            onChange={() => handlePeriodChange('all')}
            style={{ width: '16px', height: '16px' }}
          />
          <span>All recorded bookings</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="usagePeriod"
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
            name="usagePeriod"
            value="last_30_days"
            checked={period === 'last_30_days'}
            onChange={() => handlePeriodChange('last_30_days')}
            style={{ width: '16px', height: '16px' }}
          />
          <span>Last 30 days</span>
        </label>
      </div>

      <DataTable
        caption="Campus room utilization rates and hours booked"
        columns={columns}
        data={summaries}
        keyExtractor={(r) => r.roomId}
      />
    </div>
  );
}
