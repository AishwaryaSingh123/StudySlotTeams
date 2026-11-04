'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
  currentCount?: number;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ id, label, helperText, error, required, maxLength, currentCount, style, ...props }, ref) => {
    const helperId = helperText ? `${id}-helper` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label
            htmlFor={id}
            style={{
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--color-ink)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {label}
            {required && <span style={{ color: 'var(--color-error-text)' }} aria-hidden="true">*</span>}
          </label>
          {maxLength !== undefined && currentCount !== undefined && (
            <span style={{ fontSize: '0.9rem', color: 'var(--color-slate)' }}>
              {currentCount}/{maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={id}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          maxLength={maxLength}
          style={{
            minHeight: '88px',
            padding: '10px 12px',
            fontSize: '1rem',
            fontFamily: 'inherit',
            borderRadius: 'var(--radius-sm)',
            border: error
              ? '2px solid var(--color-error-text)'
              : '1px solid var(--color-control-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink)',
            outline: 'none',
            resize: 'vertical',
            ...style,
          }}
          {...props}
        />

        {helperText && !error && (
          <span id={helperId} style={{ fontSize: '0.95rem', color: 'var(--color-slate)' }}>
            {helperText}
          </span>
        )}

        {error && (
          <div
            id={errorId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-error-text)',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
