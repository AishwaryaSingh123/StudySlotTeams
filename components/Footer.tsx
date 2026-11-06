'use client';

import React from 'react';
import { useReducedMotion } from '../lib/motion/useReducedMotion';

export function Footer() {
  const { isReduced, toggle } = useReducedMotion();

  return (
    <footer className="app-footer">
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>
            StudySlot Teams — Reading-Room Ledger Academic System
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={isReduced}
            style={{
              padding: '8px 14px',
              minHeight: '44px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-control-border)',
              backgroundColor: isReduced ? 'var(--color-green-tint)' : 'var(--color-surface)',
              color: 'var(--color-ink)',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            Motion: {isReduced ? 'Reduced (Active)' : 'Standard'}
          </button>
        </div>
      </div>
    </footer>
  );
}
