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
  params: { teamId: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const teamRepo = getTeamRepo();
  const team = await teamRepo.getTeam(params.teamId);
  if (!team) {
    notFound();
  }

  const members = await teamRepo.listMembers(params.teamId);
  const currentMember = members.find((m) => m.user_id === user.id);
  if (!currentMember) {
    redirect('/teams');
  }

  const isLead = currentMember.role === 'lead';

  const reportRepo = getReportRepo();
  const taskRepo = getTaskRepo();

  const summaryRes = await reportRepo.getWorkloadSummary(params.teamId, 'all');
  const summaries = summaryRes.ok ? summaryRes.data : [];

  const activityRes = await taskRepo.listActivityLog(params.teamId, 'all');
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

    const sRes = await rRepo.getWorkloadSummary(params.teamId, period, start, end);
    const aRes = await tRepo.listActivityLog(params.teamId, period, start, end);

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
    const res = await rRepo.exportContributionReport(params.teamId, period, format, start, end);
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
