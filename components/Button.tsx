'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'link';
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      loading = false,
      loadingText = 'Saving…',
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      minHeight: '44px',
      padding: '10px 20px',
      borderRadius: 'var(--radius-sm)',
      fontSize: '1rem',
      fontWeight: 600,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'background-color var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard), transform var(--motion-instant) var(--ease-standard)',
      textDecoration: 'none',
      border: 'none',
    };

    let variantStyle: React.CSSProperties = {};

    if (variant === 'primary') {
      variantStyle = {
        backgroundColor: 'var(--color-stacks-green)',
        color: '#FFFFFF',
      };
    } else if (variant === 'destructive') {
      variantStyle = {
        backgroundColor: 'var(--color-error-text)',
        color: '#FFFFFF',
      };
    } else if (variant === 'link') {
      variantStyle = {
        backgroundColor: 'transparent',
        color: 'var(--color-stacks-green)',
        padding: '8px 12px',
        textDecoration: 'underline',
        minHeight: '44px',
      };
    } else {
      // secondary / outline
      variantStyle = {
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-control-border)',
      };
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        style={{ ...baseStyle, ...variantStyle }}
        className={`ss-btn ss-btn-${variant} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            <span>{loadingText}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
