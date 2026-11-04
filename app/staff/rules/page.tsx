import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getRulesRepo, getRoomRepo } from '@/lib/repo';
import { StaffRulesClient } from './StaffRulesClient';
import { PermissionDenied } from '../PermissionDenied';
import { BlackoutDate, Rules } from '@/lib/repo/types';

export const metadata = {
  title: 'Booking Rules — StudySlot Teams',
};

export default async function StaffRulesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'staff_admin') {
    return <PermissionDenied />;
  }

  const rulesRepo = getRulesRepo();
  const rules = await rulesRepo.getRules();
  const blackouts = await rulesRepo.listBlackoutDates();

  const roomRepo = getRoomRepo();
  const rooms = await roomRepo.listRooms(false);

  async function handleUpdateRules(patch: Partial<Rules>) {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const rRepo = getRulesRepo();
    const res = await rRepo.updateRules(currentUser.id, patch);
    if (res.ok) {
      return { ok: true, rules: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleCreateBlackout(input: Omit<BlackoutDate, 'id'>) {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const rRepo = getRulesRepo();
    const res = await rRepo.createBlackout(currentUser.id, input);
    if (res.ok) {
      return { ok: true, blackout: res.data };
    }
    return { ok: false, error: res.error.message };
  }

  async function handleDeleteBlackout(id: string) {
    'use server';
    const currentUser = await getSessionUser();
    if (currentUser?.role !== 'staff_admin') return { ok: false, error: 'Unauthorized.' };

    const rRepo = getRulesRepo();
    const res = await rRepo.deleteBlackout(currentUser.id, id);
    if (res.ok) {
      return { ok: true };
    }
    return { ok: false, error: res.error.message };
  }

  return (
    <StaffRulesClient
      initialRules={rules}
      initialBlackouts={blackouts}
      rooms={rooms}
      onUpdateRules={handleUpdateRules}
      onCreateBlackout={handleCreateBlackout}
      onDeleteBlackout={handleDeleteBlackout}
    />
  );
}
