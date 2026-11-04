import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getReportRepo } from '@/lib/repo';
import { StaffUsageClient } from './StaffUsageClient';
import { PermissionDenied } from '../PermissionDenied';

export const metadata = {
  title: 'Room Usage — StudySlot Teams',
};

export default async function StaffUsagePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'staff_admin') {
    return <PermissionDenied />;
  }

  const reportRepo = getReportRepo();
  const res = await reportRepo.getUsageReport('all');
  const summaries = res.ok ? res.data : [];

  async function handleFetch(period: 'all' | 'last_7_days' | 'last_30_days') {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const rRepo = getReportRepo();
    const result = await rRepo.getUsageReport(period);
    return {
      ok: true,
      summaries: result.ok ? result.data : [],
    };
  }

  async function handleExport(period: 'all' | 'last_7_days' | 'last_30_days') {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const rRepo = getReportRepo();
    const result = await rRepo.exportUsageReportCSV(period);
    if (result.ok) {
      return {
        ok: true,
        filename: result.data.filename,
        content: result.data.content,
      };
    }
    return {
      ok: false,
      error: result.error.message,
    };
  }

  return (
    <StaffUsageClient
      initialSummaries={summaries}
      onFetchUsage={handleFetch}
      onExportCSV={handleExport}
    />
  );
}
