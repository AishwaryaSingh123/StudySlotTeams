'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { FormErrorSummary } from '../../components/FormErrorSummary';

export interface LoginFormProps {
  onSignIn: (formData: FormData) => Promise<{ ok: boolean; error?: string; redirectUrl?: string }>;
  onSignUp: (formData: FormData) => Promise<{ ok: boolean; error?: string; redirectUrl?: string; message?: string }>;
}

export function LoginForm({ onSignIn, onSignUp }: LoginFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Form field state for smooth pre-fill between tabs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanFullName = fullName.trim();

    // Client-side pre-validation
    if (mode === 'signup') {
      if (!cleanFullName || cleanFullName.length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (cleanFullName.length > 60) {
        setError('Full name cannot exceed 60 characters.');
        return;
      }
    }

    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Email format is invalid. Please enter a valid address (e.g. name@university.edu).');
      return;
    }

    if (!cleanPassword) {
      setError('Password is required.');
      return;
    }
    if (cleanPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('email', cleanEmail);
      formData.set('password', cleanPassword);
      if (mode === 'signup') {
        formData.set('full_name', cleanFullName);
      }

      if (mode === 'signup') {
        const res = await onSignUp(formData);
        if (res.ok) {
          // Direct back to sign-in tab with clear success message and email prefilled
          setMode('signin');
          setPassword('');
          setSuccessMessage('Account created successfully! Please sign in with your email and password.');
          setError(null);
          setLoading(false);
          return;
        } else {
          setError(res.error || 'Registration failed.');
          setLoading(false);
          return;
        }
      }

      // mode === 'signin'
      const res = await onSignIn(formData);
      if (res.ok && res.redirectUrl) {
        // Direct browser navigation bypasses NEXT_REDIRECT thrown exceptions
        window.location.href = res.redirectUrl;
      } else {
        setError(res.error || 'Sign in failed.');
        setLoading(false);
      }
    } catch (err: any) {
      if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
        return;
      }
      setError(err?.message || 'An unexpected network error occurred. Please check your connection and try again.');
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
            setSuccessMessage(null);
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
            setSuccessMessage(null);
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

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success-text)',
            border: '1px solid var(--color-success-text)',
            marginBottom: '16px',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          id="password"
          name="password"
          type="password"
          label={mode === 'signup' ? 'Create password (min. 6 characters)' : 'Password'}
          required
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
