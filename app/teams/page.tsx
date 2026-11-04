import { redirect } from 'next/navigation';
import { getSessionUser } from '../../lib/auth/session';
import { getTeamRepo } from '../../lib/repo';
import { TeamsClient } from './TeamsClient';

export const metadata = {
  title: 'Your Teams — StudySlot Teams',
};

export default async function TeamsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const teamRepo = getTeamRepo();
  const rawTeams = await teamRepo.listTeamsForUser(user.id);

  // Map user role for each team
  const teams = await Promise.all(
    rawTeams.map(async (t) => {
      const members = await teamRepo.listMembers(t.id);
      const userMember = members.find((m) => m.user_id === user.id);
      return {
        ...t,
        userRole: (userMember?.role || 'member') as 'lead' | 'member',
      };
    })
  );

  async function handleCreate(name: string, project: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTeamRepo();
    const res = await tRepo.createTeam(currentUser.id, name, project);
    if (res.ok) {
      return { ok: true, team: res.data.team };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleJoin(code: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (!currentUser) return { ok: false, error: 'Unauthenticated.' };

    const tRepo = getTeamRepo();
    const res = await tRepo.joinTeam(currentUser.id, code);
    if (res.ok) {
      return { ok: true, team: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  return <TeamsClient initialTeams={teams} onCreateTeam={handleCreate} onJoinTeam={handleJoin} />;
}
