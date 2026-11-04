'use client';

import React, { useState } from 'react';
import { TextField } from '../../components/TextField';
import { Button } from '../../components/Button';
import { FormErrorSummary } from '../../components/FormErrorSummary';

export interface LoginFormProps {
  onSignIn: (formData: FormData) => Promise<{ error?: string } | void>;
}

export function LoginForm({ onSignIn }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await onSignIn(formData);
      if (res && res.error) {
        setError(res.error);
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <FormErrorSummary errors={[{ message: error }]} />}

      <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
        Fields marked <span style={{ color: 'var(--color-error-text)' }}>*</span> are required.
      </p>

      <TextField
        id="email"
        name="email"
        type="email"
        label="Email address"
        required
        autoComplete="email"
        placeholder="e.g. asha.demo@example.test"
      />

      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />

      <Button
        type="submit"
        variant="primary"
        loading={loading}
        loadingText="Signing in…"
        style={{ width: '100%', marginTop: '8px' }}
      >
        Sign in
      </Button>
    </form>
  );
}
