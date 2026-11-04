'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from './Button';

export interface EmptyStateProps {
  message: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionText, actionHref, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: '40px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--color-surface)',
        border: '1px dashed var(--color-rule)',
        borderRadius: 'var(--radius-sm)',
        margin: '20px 0',
      }}
    >
      <p style={{ color: 'var(--color-slate)', fontSize: '1.05rem', marginBottom: actionText ? '16px' : 0 }}>
        {message}
      </p>
      {actionText && actionHref && (
        <Link href={actionHref} passHref legacyBehavior>
          <Button variant="primary">{actionText}</Button>
        </Link>
      )}
      {actionText && onAction && !actionHref && (
        <Button variant="primary" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
