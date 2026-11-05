// StudySlot Teams — Session and Auth Resolution (Server-only)

import { cookies } from 'next/headers';
import { Profile } from '../repo/types';
import { getAuthRepo, isUsingSupabase } from '../repo';

const SESSION_COOKIE_NAME = 'studyslot_session';

export async function getSessionUser(): Promise<Profile | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const rawVal = sessionCookie.value;

  // If the cookie contains encoded profile data (for resilient serverless sessions)
  if (rawVal.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawVal);
      if (parsed.id && parsed.email && parsed.role) {
        // Sync into mock in-memory DB so local queries find the user
        if (!isUsingSupabase()) {
          try {
            const { getDb } = await import('../repo/mock/store');
            const db = await getDb();
            if (!db.profiles.find((p) => p.id === parsed.id)) {
              db.profiles.push(parsed);
            }
          } catch {}
        }
        return parsed as Profile;
      }
    } catch {}
  }

  const authRepo = getAuthRepo();
  const user = await authRepo.getUserById(rawVal);
  return user;
}

export async function setSessionUser(userOrId: string | Profile): Promise<void> {
  const cookieStore = await cookies();
  let cookieVal: string;

  if (typeof userOrId === 'object' && userOrId !== null) {
    cookieVal = JSON.stringify({
      id: userOrId.id,
      email: userOrId.email,
      full_name: userOrId.full_name,
      role: userOrId.role,
      created_at: userOrId.created_at,
    });
  } else {
    // If only an ID was provided, fetch profile to serialize if possible
    try {
      const authRepo = getAuthRepo();
      const user = await authRepo.getUserById(userOrId);
      if (user) {
        cookieVal = JSON.stringify({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          created_at: user.created_at,
        });
      } else {
        cookieVal = userOrId;
      }
    } catch {
      cookieVal = userOrId;
    }
  }

  cookieStore.set(SESSION_COOKIE_NAME, cookieVal, {
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
