// StudySlot Teams — Supabase Auth Repository
import { getSupabaseClient } from '../../supabase/server';
import { IAuthRepo, Profile, Result } from '../types';

export class SupabaseAuthRepo implements IAuthRepo {
  async getUserById(id: string): Promise<Profile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data as Profile;
  }

  async getUserByEmail(email: string): Promise<Profile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('profiles').select('*').ilike('email', email).maybeSingle();
    if (error || !data) return null;
    return data as Profile;
  }

  async listUsers(): Promise<Profile[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error || !data) return [];
    return data as Profile[];
  }

  async updateProfile(userId: string, patch: { full_name: string }): Promise<Result<Profile>> {
    const supabase = getSupabaseClient();

    if (!patch.full_name || patch.full_name.trim().length === 0) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: 'Full name cannot be blank.' },
      };
    }

    // Explicitly update only full_name; never mutate role
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: patch.full_name.trim() })
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: { code: 'INTERNAL', message: error?.message || 'Failed to update profile.' },
      };
    }

    return { ok: true, data: data as Profile };
  }
}
