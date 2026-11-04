'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertTriangle, X, Undo2 } from 'lucide-react';
import { Button } from './Button';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]); // keep max 3
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 9999,
          maxWidth: '420px',
          width: 'calc(100vw - 48px)',
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const startTimer = useCallback(() => {
    if (toast.type !== 'error') {
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, 8000); // 8 seconds per M16
    }
  }, [toast.type, onDismiss]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!isPaused) {
      startTimer();
    }
    return () => clearTimer();
  }, [isPaused, startTimer, clearTimer]);

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      onMouseEnter={() => {
        setIsPaused(true);
        clearTimer();
      }}
      onMouseLeave={() => {
        setIsPaused(false);
      }}
      onFocus={() => {
        setIsPaused(true);
        clearTimer();
      }}
      onBlur={() => {
        setIsPaused(false);
      }}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${isError ? 'var(--color-error-text)' : 'var(--color-rule)'}`,
        borderLeft: `4px solid ${
          isError
            ? 'var(--color-error-text)'
            : isSuccess
            ? 'var(--color-stacks-green)'
            : 'var(--color-info-text)'
        }`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-overlay)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
        {isError ? (
          <AlertTriangle size={20} color="var(--color-error-text)" aria-hidden="true" />
        ) : isSuccess ? (
          <CheckCircle size={20} color="var(--color-stacks-green)" aria-hidden="true" />
        ) : null}
        <div>
          {toast.title && <div style={{ fontWeight: 700, fontSize: '1rem' }}>{toast.title}</div>}
          <div style={{ fontSize: '0.95rem', color: 'var(--color-ink)' }}>{toast.message}</div>
          {toast.undoAction && (
            <div style={{ marginTop: '8px' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  toast.undoAction?.();
                  onDismiss();
                }}
                style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.9rem' }}
              >
                <Undo2 size={14} aria-hidden="true" />
                <span>{toast.undoLabel || 'Undo'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          color: 'var(--color-slate)',
        }}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
