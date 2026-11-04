import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getTeamRepo, getReportRepo, getTaskRepo } from '@/lib/repo';
import { ContributionsClient } from './ContributionsClient';

export const metadata = {
  title: 'Contributions — StudySlot Teams',
};

export default async function TeamContributionsPage({
  params,
}: {
  params: Promise<{ teamId: string }> | { teamId: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const p = await params;
  const teamRepo = getTeamRepo();
  const team = await teamRepo.getTeam(p.teamId);
  if (!team) {
    notFound();
  }

  const members = await teamRepo.listMembers(p.teamId);
  const currentMember = members.find((m) => m.user_id === user.id);
  if (!currentMember) {
    redirect('/teams');
  }

  const isLead = currentMember.role === 'lead';

  const reportRepo = getReportRepo();
  const taskRepo = getTaskRepo();

  const summaryRes = await reportRepo.getWorkloadSummary(p.teamId, 'all');
  const summaries = summaryRes.ok ? summaryRes.data : [];

  const activityRes = await taskRepo.listActivityLog(p.teamId, 'all');
  const activities = activityRes.ok ? activityRes.data : [];

  async function handleFetch(
    period: 'all' | 'last_7_days' | 'custom',
    start?: string,
    end?: string
  ) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const rRepo = getReportRepo();
    const tRepo = getTaskRepo();

    const sRes = await rRepo.getWorkloadSummary(p.teamId, period, start, end);
    const aRes = await tRepo.listActivityLog(p.teamId, period, start, end);

    return {
      ok: true,
      summaries: sRes.ok ? sRes.data : [],
      activities: aRes.ok ? aRes.data : [],
    };
  }

  async function handleExport(
    period: 'all' | 'last_7_days' | 'custom',
    format: 'csv' | 'html',
    start?: string,
    end?: string
  ) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const rRepo = getReportRepo();
    const res = await rRepo.exportContributionReport(p.teamId, period, format, start, end);
    if (!res.ok) {
      return { ok: false, error: res.error.message };
    }
    return {
      ok: true,
      filename: res.data.filename,
      contentType: res.data.contentType,
      content: res.data.content,
    };
  }

  return (
    <ContributionsClient
      team={team}
      isLead={isLead}
      initialSummaries={summaries}
      initialActivities={activities}
      onFetchSummary={handleFetch}
      onExportReport={handleExport}
    />
  );
}
