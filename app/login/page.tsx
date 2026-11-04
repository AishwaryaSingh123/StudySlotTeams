import { redirect } from 'next/navigation';
import { getSessionUser, setSessionUser } from '../../lib/auth/session';
import { getAuthRepo } from '../../lib/repo';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign In — StudySlot Teams',
};

async function handleSignIn(formData: FormData) {
  'use server';

  const email = (formData.get('email') as string)?.trim();
  const password = (formData.get('password') as string)?.trim();

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  const isSupabase = process.env.DATA_BACKEND === 'supabase';

  if (!isSupabase) {
    // Mock mode password verification
    if (password !== 'demo123') {
      return { error: 'Invalid password. For seeded demo accounts, use "demo123".' };
    }

    const authRepo = getAuthRepo();
    const user = await authRepo.getUserByEmail(email);

    if (!user) {
      return { error: 'Invalid email or password.' };
    }

    await setSessionUser(user.id);

    if (user.role === 'staff_admin') {
      redirect('/staff/rooms');
    } else {
      redirect('/rooms');
    }
  } else {
    // Supabase mode authentication
    try {
      const { getSupabaseClient } = await import('../../lib/supabase/server');
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        return { error: error?.message || 'Invalid email or password.' };
      }

      await setSessionUser(data.user.id);

      const authRepo = getAuthRepo();
      const profile = await authRepo.getUserById(data.user.id);

      if (profile?.role === 'staff_admin') {
        redirect('/staff/rooms');
      } else {
        redirect('/rooms');
      }
    } catch (err: any) {
      return { error: err.message || 'Authentication failed.' };
    }
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
          Sign in to StudySlot Teams
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

        <LoginForm onSignIn={handleSignIn} />
      </div>
    </div>
  );
}
