// StudySlot Teams — Mock Auth Repository

import { IAuthRepo, Profile, Result } from '../types';
import { getDb, withLock } from './store';

export class MockAuthRepo implements IAuthRepo {
  async getUserById(id: string): Promise<Profile | null> {
    const db = await getDb();
    const user = db.profiles.find((p) => p.id === id);
    return user || null;
  }

  async getUserByEmail(email: string): Promise<Profile | null> {
    const db = await getDb();
    const user = db.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  async listUsers(): Promise<Profile[]> {
    const db = await getDb();
    return db.profiles;
  }

  async updateProfile(userId: string, patch: { full_name: string }): Promise<Result<Profile>> {
    return withLock((db) => {
      const user = db.profiles.find((p) => p.id === userId);
      if (!user) {
        return {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'User profile not found.' },
        };
      }

      if (!patch.full_name || patch.full_name.trim().length === 0) {
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', message: 'Full name cannot be blank.' },
        };
      }

      // Explicitly only update full_name. Never escalate role or touch email/id.
      user.full_name = patch.full_name.trim();

      return {
        ok: true,
        data: { ...user },
      };
    });
  }
}
