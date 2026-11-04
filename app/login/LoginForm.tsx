'use client';

import React, { useState } from 'react';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { FormErrorSummary } from '../../components/FormErrorSummary';

export interface LoginFormProps {
  onSignIn: (formData: FormData) => Promise<{ ok: boolean; error?: string; redirectUrl?: string }>;
  onSignUp: (formData: FormData) => Promise<{ ok: boolean; error?: string; redirectUrl?: string }>;
}

export function LoginForm({ onSignIn, onSignUp }: LoginFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string)?.trim() || '';
    const password = (formData.get('password') as string)?.trim() || '';
    const fullName = (formData.get('full_name') as string)?.trim() || '';

    // Client-side pre-validation
    if (mode === 'signup') {
      if (!fullName || fullName.length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (fullName.length > 60) {
        setError('Full name cannot exceed 60 characters.');
        return;
      }
    }

    if (!email) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email format is invalid. Please enter a valid address (e.g. name@university.edu).');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = mode === 'signin' ? await onSignIn(formData) : await onSignUp(formData);
      if (res.ok && res.redirectUrl) {
        // Direct browser navigation bypasses NEXT_REDIRECT thrown exceptions
        window.location.href = res.redirectUrl;
      } else {
        setError(res.error || (mode === 'signin' ? 'Sign in failed.' : 'Registration failed.'));
        setLoading(false);
      }
    } catch (err: any) {
      // In Next.js, if a redirect exception is thrown, don't show an error
      if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
        return;
      }
      setError('An unexpected network error occurred. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Tab Switcher: Sign in vs Create Account */}
      <div
        role="tablist"
        aria-label="Authentication options"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          padding: '4px',
          backgroundColor: 'var(--color-sand)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          onClick={() => {
            setMode('signin');
            setError(null);
          }}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            backgroundColor: mode === 'signin' ? 'var(--color-surface)' : 'transparent',
            color: mode === 'signin' ? 'var(--color-stacks-green-dark)' : 'var(--color-slate)',
            boxShadow: mode === 'signin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            minHeight: '38px',
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          onClick={() => {
            setMode('signup');
            setError(null);
          }}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            backgroundColor: mode === 'signup' ? 'var(--color-surface)' : 'transparent',
            color: mode === 'signup' ? 'var(--color-stacks-green-dark)' : 'var(--color-slate)',
            boxShadow: mode === 'signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            minHeight: '38px',
          }}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {error && <FormErrorSummary errors={[{ message: error }]} />}

        <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
          Fields marked <span style={{ color: 'var(--color-error-text)' }}>*</span> are required.
        </p>

        {mode === 'signup' && (
          <TextField
            id="full_name"
            name="full_name"
            type="text"
            label="Full name"
            required
            autoComplete="name"
            placeholder="e.g. Ananya Sen"
          />
        )}

        <TextField
          id="email"
          name="email"
          type="email"
          label="Email address"
          required
          autoComplete="email"
          placeholder="e.g. your.name@university.edu"
        />

        <TextField
          id="password"
          name="password"
          type="password"
          label={mode === 'signup' ? 'Create password (min. 6 characters)' : 'Password'}
          required
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder="••••••••"
        />

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          loadingText={mode === 'signin' ? 'Signing in…' : 'Creating account…'}
          style={{ width: '100%', marginTop: '8px' }}
        >
          {mode === 'signin' ? 'Sign in' : 'Create student account'}
        </Button>
      </form>
    </div>
  );
}
