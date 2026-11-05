'use server';

import { getSessionUser } from '../../lib/auth/session';
import { getBookingRepo } from '../../lib/repo';

export async function dismissCancellationNoticeAction(bookingId: string) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, error: 'Unauthenticated.' };
    }

    const bookingRepo = getBookingRepo();
    const res = await bookingRepo.dismissCancellationNotice(user.id, bookingId);
    return res;
  } catch (err: any) {
    console.error('Error dismissing cancellation notice:', err);
    return { ok: false, error: err?.message || 'Failed to dismiss cancellation notice.' };
  }
}
