import { redirect } from 'next/navigation';
import { getSessionUser, setSessionUser } from '../../lib/auth/session';
import { getAuthRepo } from '../../lib/repo';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign In — StudySlot Teams',
};

async function handleSignIn(formData: FormData): Promise<{ ok: boolean; error?: string; redirectUrl?: string }> {
  'use server';

  try {
    const email = (formData.get('email') as string)?.trim();
    const password = (formData.get('password') as string)?.trim();

    if (!email || !password) {
      return { ok: false, error: 'Please enter both email and password.' };
    }

    const isSupabase = process.env.DATA_BACKEND === 'supabase';

    if (!isSupabase) {
      const authRepo = getAuthRepo();
      const user = await authRepo.getUserByEmail(email);

      if (!user) {
        return { ok: false, error: 'Account not found. Please check your email or click "Create account".' };
      }

      // Check user password if saved, else default demo123
      const { getDb } = await import('../../lib/repo/mock/store');
      const db = await getDb();
      const savedPass = db.passwords?.[user.id];
      if (savedPass) {
        if (password !== savedPass && password !== 'demo123') {
          return { ok: false, error: 'Invalid password. Please check your password and try again.' };
        }
      } else {
        if (password !== 'demo123') {
          return { ok: false, error: 'Invalid password. For seeded accounts, use "demo123".' };
        }
      }

      await setSessionUser(user.id);
      const redirectUrl = user.role === 'staff_admin' ? '/staff/rooms' : '/rooms';
      return { ok: true, redirectUrl };
    } else {
      // Supabase mode
      try {
        const { getSupabaseClient } = await import('../../lib/supabase/server');
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error || !data.user) {
          return { ok: false, error: error?.message || 'Invalid email or password.' };
        }

        await setSessionUser(data.user.id);

        const authRepo = getAuthRepo();
        const profile = await authRepo.getUserById(data.user.id);
        const redirectUrl = profile?.role === 'staff_admin' ? '/staff/rooms' : '/rooms';
        return { ok: true, redirectUrl };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Authentication service error.' };
      }
    }
  } catch (err: any) {
    console.error('Sign in error:', err);
    return { ok: false, error: err?.message || 'Authentication service unavailable.' };
  }
}

async function handleSignUp(formData: FormData): Promise<{ ok: boolean; error?: string; redirectUrl?: string; message?: string }> {
  'use server';

  try {
    const fullName = (formData.get('full_name') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const password = (formData.get('password') as string)?.trim();

    if (!fullName || fullName.length < 2) {
      return { ok: false, error: 'Please enter your full name (at least 2 characters).' };
    }
    if (!email) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters long.' };
    }

    const isSupabase = process.env.DATA_BACKEND === 'supabase';

    if (!isSupabase) {
      const authRepo = getAuthRepo();
      if (authRepo.signUp) {
        const res = await authRepo.signUp({ fullName, email, password });
        if (!res.ok) {
          return { ok: false, error: res.error.message };
        }

        return { ok: true, message: 'Account created successfully.' };
      } else {
        return { ok: false, error: 'Sign up is not configured in this mode.' };
      }
    } else {
      // Supabase mode
      try {
        const { getSupabaseClient } = await import('../../lib/supabase/server');
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        if (data.user?.identities && data.user.identities.length === 0) {
          return { ok: false, error: 'An account with this email already exists. Please sign in.' };
        }

        if (!data.user) {
          return { ok: false, error: 'Registration failed. No user was returned.' };
        }

        const authRepo = getAuthRepo();
        if (authRepo.signUp) {
          await authRepo.signUp({ fullName, email, userId: data.user.id });
        }

        return { ok: true, message: 'Account created successfully.' };
      } catch (err: any) {
        return { ok: false, error: err.message || 'Registration service error.' };
      }
    }
  } catch (err: any) {
    console.error('Sign up error:', err);
    return { ok: false, error: err?.message || 'Server error during registration.' };
  }
}

export default async function LoginPage() {
  const currentUser = await getSessionUser();
  if (currentUser) {
    if (currentUser.role === 'staff_admin') {
      redirect('/staff/rooms');
    }
    redirect('/rooms');
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        minHeight: '70vh',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '32px 28px',
          boxShadow: 'var(--shadow-overlay)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.75rem',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          StudySlot Teams
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-slate)',
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          Campus study room reservations and team milestone ledger.
        </p>

        <LoginForm onSignIn={handleSignIn} onSignUp={handleSignUp} />
      </div>
    </div>
  );
}
