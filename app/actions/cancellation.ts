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

export async function checkUnacknowledgedCancellationsAction() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'student') {
      return { ok: true, data: [] };
    }

    const bookingRepo = getBookingRepo();
    const cancellations = await bookingRepo.getUnacknowledgedCancellations(user.id);
    return { ok: true, data: cancellations };
  } catch (err: any) {
    console.error('Error checking unacknowledged cancellations:', err);
    return { ok: false, error: err?.message || 'Failed to check unacknowledged cancellations.' };
  }
}
