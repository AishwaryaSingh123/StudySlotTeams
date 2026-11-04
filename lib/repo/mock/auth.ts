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

  async signUp(input: { fullName: string; email: string }): Promise<Result<Profile>> {
    return withLock((db) => {
      const cleanEmail = input.email.trim().toLowerCase();
      const cleanName = input.fullName.trim();

      const existing = db.profiles.find((p) => p.email.toLowerCase() === cleanEmail);
      if (existing) {
        return {
          ok: false,
          error: { code: 'CONFLICT', message: 'An account with this email already exists. Please sign in.' },
        };
      }

      const newProfile: Profile = {
        id: `u-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        full_name: cleanName,
        email: cleanEmail,
        role: 'student', // strictly enforced student role
        created_at: new Date().toISOString(),
      };

      db.profiles.push(newProfile);
      return { ok: true, data: { ...newProfile } };
    });
  }
}
