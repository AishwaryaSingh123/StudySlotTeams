'use client';

import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 'aria-label': ariaLabel, variant = 'default', children, style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          minWidth: '44px',
          minHeight: '44px',
          padding: '8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-control-border)',
          backgroundColor: 'var(--color-surface)',
          color: variant === 'destructive' ? 'var(--color-error-text)' : 'var(--color-ink)',
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
