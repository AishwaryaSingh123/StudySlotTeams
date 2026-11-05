'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface FormErrorItem {
  fieldId?: string;
  message: string;
}

export interface FormErrorSummaryProps {
  title?: string;
  errors: FormErrorItem[];
}

export function FormErrorSummary({
  title = 'There was a problem submitting your form',
  errors,
}: FormErrorSummaryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevErrorsKeyRef = useRef<string>('');

  const currentErrorsKey = (errors || [])
    .map((e) => `${e.fieldId || ''}:${e.message}`)
    .join('|');

  useEffect(() => {
    // Only focus the summary when errors are newly introduced or changed,
    // not on every parent re-render caused by typing in an input field.
    if (errors && errors.length > 0 && currentErrorsKey !== prevErrorsKeyRef.current) {
      prevErrorsKeyRef.current = currentErrorsKey;
      containerRef.current?.focus();
    } else if (!errors || errors.length === 0) {
      prevErrorsKeyRef.current = '';
    }
  }, [errors, currentErrorsKey]);

  if (!errors || errors.length === 0) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      style={{
        border: '2px solid var(--color-error-text)',
        backgroundColor: 'var(--color-error-bg)',
        color: 'var(--color-error-text)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '24px',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <AlertTriangle size={20} aria-hidden="true" />
        <h3 id="error-summary-title" style={{ color: 'var(--color-error-text)', margin: 0, fontSize: '1.15rem' }}>
          {title}
        </h3>
      </div>
      <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {errors.map((err, i) => (
          <li key={i}>
            {err.fieldId ? (
              <a
                href={`#${err.fieldId}`}
                style={{ color: 'var(--color-error-text)', fontWeight: 600, textDecoration: 'underline' }}
              >
                {err.message}
              </a>
            ) : (
              <span>{err.message}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
