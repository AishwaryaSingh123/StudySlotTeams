import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/Button';

export function PermissionDenied({ message = 'This page is for Staff Admins.' }: { message?: string }) {
  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '60px auto',
        padding: '36px 32px',
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-error-text)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'var(--color-error-bg)', marginBottom: '16px' }}>
        <ShieldAlert size={36} color="var(--color-error-text)" aria-hidden="true" />
      </div>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--color-error-text)', marginBottom: '12px' }}>
        You don&apos;t have access to this page
      </h1>
      <p style={{ color: 'var(--color-slate)', fontSize: '1rem', marginBottom: '24px' }}>
        {message}
      </p>

      <Link href="/rooms" passHref legacyBehavior>
        <Button variant="primary">Return to room search</Button>
      </Link>
    </div>
  );
}
