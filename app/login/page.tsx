import { redirect } from 'next/navigation';
import { getSessionUser, setSessionUser } from '../../lib/auth/session';
import { getAuthRepo } from '../../lib/repo';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign In — StudySlot Teams',
};

async function handleSignIn(formData: FormData) {
  'use server';

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  const authRepo = getAuthRepo();
  const user = await authRepo.getUserByEmail(email.trim());

  if (!user) {
    return { error: 'Account not found. Use one of the seeded demo accounts below.' };
  }

  await setSessionUser(user.id);

  if (user.role === 'staff_admin') {
    redirect('/staff/rooms');
  } else {
    redirect('/rooms');
  }
}

async function handleQuickSignIn(userId: string): Promise<void> {
  'use server';

  const authRepo = getAuthRepo();
  const user = await authRepo.getUserById(userId);
  if (!user) {
    return;
  }

  await setSessionUser(user.id);

  if (user.role === 'staff_admin') {
    redirect('/staff/rooms');
  } else {
    redirect('/rooms');
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

  const authRepo = getAuthRepo();
  const demoUsers = await authRepo.listUsers();

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

        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            backgroundColor: 'var(--color-sand)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-rule)',
          }}
        >
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              marginBottom: '8px',
              color: 'var(--color-ink)',
            }}
          >
            Seeded Demo Accounts
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '12px' }}>
            Shared demo password: <code style={{ fontWeight: 700 }}>demo123</code>. Or select an account below to sign in instantly:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {demoUsers.map((u) => {
              const roleLabel =
                u.role === 'staff_admin'
                  ? 'Staff Admin'
                  : u.email.includes('asha')
                  ? 'Student (Team Lead)'
                  : u.email.includes('ravi')
                  ? 'Student (Team Member)'
                  : 'Student (Independent)';

              return (
                <form key={u.id} action={handleQuickSignIn.bind(null, u.id)}>
                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      minHeight: '44px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-control-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-stacks-green-dark)' }}>
                      {u.full_name}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>
                      {u.email} — {roleLabel}
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
