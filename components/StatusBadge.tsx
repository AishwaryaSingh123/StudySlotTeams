'use client';

import React from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Circle,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Slash,
} from 'lucide-react';
import { BookingStatus, MilestoneStatus, RoomStatus, TaskStatus } from '../lib/repo/types';

export interface StatusBadgeProps {
  type: 'booking' | 'task' | 'milestone' | 'room';
  value: BookingStatus | TaskStatus | MilestoneStatus | RoomStatus | 'overdue';
  labelOverride?: string;
}

export function StatusBadge({ type, value, labelOverride }: StatusBadgeProps) {
  let text = labelOverride || value;
  let bg = 'var(--color-sand)';
  let color = 'var(--color-ink)';
  let Icon = Circle;

  if (type === 'booking') {
    if (value === 'confirmed') {
      text = labelOverride || 'Confirmed';
      bg = 'var(--color-success-bg)';
      color = 'var(--color-success-text)';
      Icon = CheckCircle;
    } else if (value === 'cancelled') {
      text = labelOverride || 'Cancelled';
      bg = 'var(--color-error-bg)';
      color = 'var(--color-error-text)';
      Icon = XCircle;
    }
  } else if (type === 'task') {
    if (value === 'todo') {
      text = labelOverride || 'To do';
      bg = 'var(--color-sand)';
      color = 'var(--color-ink)';
      Icon = Circle;
    } else if (value === 'in_progress') {
      text = labelOverride || 'In progress';
      bg = 'var(--color-info-bg)';
      color = 'var(--color-info-text)';
      Icon = Clock;
    } else if (value === 'in_review') {
      text = labelOverride || 'In review';
      bg = 'var(--color-warning-bg)';
      color = 'var(--color-warning-text)';
      Icon = Eye;
    } else if (value === 'done') {
      text = labelOverride || 'Done';
      bg = 'var(--color-success-bg)';
      color = 'var(--color-success-text)';
      Icon = CheckCircle2;
    }
  } else if (type === 'milestone') {
    if (value === 'completed') {
      text = labelOverride || 'Completed';
      bg = 'var(--color-success-bg)';
      color = 'var(--color-success-text)';
      Icon = CheckCircle2;
    } else if (value === 'overdue') {
      text = labelOverride || 'Overdue';
      bg = 'var(--color-error-bg)';
      color = 'var(--color-error-text)';
      Icon = AlertTriangle;
    } else {
      text = labelOverride || 'Open';
      bg = 'var(--color-sand)';
      color = 'var(--color-brass)';
      Icon = Clock;
    }
  } else if (type === 'room') {
    if (value === 'active') {
      text = labelOverride || 'Active';
      bg = 'var(--color-success-bg)';
      color = 'var(--color-success-text)';
      Icon = CheckCircle;
    } else {
      text = labelOverride || 'Inactive';
      bg = 'var(--color-sand)';
      color = 'var(--color-slate)';
      Icon = Slash;
    }
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: bg,
        color,
        fontSize: '0.95rem',
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      <Icon size={14} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}
