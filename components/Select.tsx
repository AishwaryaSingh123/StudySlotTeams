'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, options, helperText, error, required, style, ...props }, ref) => {
    const helperId = helperText ? `${id}-helper` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
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

        <select
          ref={ref}
          id={id}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          style={{
            minHeight: '44px',
            padding: '8px 12px',
            fontSize: '1rem',
            borderRadius: 'var(--radius-sm)',
            border: error
              ? '2px solid var(--color-error-text)'
              : '1px solid var(--color-control-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-ink)',
            outline: 'none',
            ...style,
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

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

Select.displayName = 'Select';
