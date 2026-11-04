// StudySlot Teams — Session and Auth Resolution (Server-only)

import { cookies } from 'next/headers';
import { Profile } from '../repo/types';
import { getAuthRepo } from '../repo';

const SESSION_COOKIE_NAME = 'studyslot_session';

export async function getSessionUser(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const authRepo = getAuthRepo();
  const user = await authRepo.getUserById(sessionCookie.value);
  return user;
}

export async function setSessionUser(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
