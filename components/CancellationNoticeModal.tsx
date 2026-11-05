'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarX, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { Booking } from '../lib/repo/types';
import { formatSlotRangeDisplay } from '../lib/time/campus';
import { dismissCancellationNoticeAction, checkUnacknowledgedCancellationsAction } from '../app/actions/cancellation';

export interface CancellationNoticeModalProps {
  initialCancellations?: Booking[];
  userId: string;
}

const STORAGE_KEY_PREFIX = 'studyslot_ack_cancellations_';

export function CancellationNoticeModal({
  initialCancellations = [],
  userId,
}: CancellationNoticeModalProps) {
  const [cancellations, setCancellations] = useState<Booking[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const filterAndSet = (list: Booking[]) => {
      try {
        const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
        const savedAck = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
        const unacknowledged = list.filter((b) => !savedAck.includes(b.id));

        if (unacknowledged.length > 0) {
          setCancellations(unacknowledged);
          setIsOpen(true);
        } else {
          setCancellations([]);
          setIsOpen(false);
        }
      } catch {
        setCancellations(list);
        setIsOpen(list.length > 0);
      }
    };

    if (initialCancellations && initialCancellations.length > 0) {
      filterAndSet(initialCancellations);
    } else {
      checkUnacknowledgedCancellationsAction()
        .then((res) => {
          if (res.ok && res.data && res.data.length > 0) {
            filterAndSet(res.data);
          }
        })
        .catch(() => {});
    }
  }, [initialCancellations, userId]);

  const handleDismiss = async () => {
    if (dismissing) return;
    setDismissing(true);

    try {
      // Persist acknowledgment locally
      const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
      const savedAck = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
      const newAck = Array.from(new Set([...savedAck, ...cancellations.map((c) => c.id)]));
      localStorage.setItem(storageKey, JSON.stringify(newAck));

      // Call server action to mark cancellation notified in repo
      for (const booking of cancellations) {
        await dismissCancellationNoticeAction(booking.id);
      }
    } catch (err) {
      console.warn('Failed to persist dismissal to server:', err);
    } finally {
      setDismissing(false);
      setIsOpen(false);
    }
  };

  if (!isOpen || cancellations.length === 0) {
    return null;
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleDismiss}
      title="Reservation Cancellation Notice"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Banner header alert */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            backgroundColor: 'rgba(164, 66, 41, 0.08)',
            border: '1px solid var(--color-terracotta)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              color: 'var(--color-terracotta)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}
            aria-hidden="true"
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--color-terracotta)',
                fontFamily: 'var(--font-serif-ui)',
              }}
            >
              Action Required: Booking Cancelled by Campus Admin
            </h3>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '0.9rem',
                color: 'var(--color-ink)',
                lineHeight: 1.45,
              }}
            >
              A room reservation on your account was cancelled due to a campus blackout period or maintenance.
              <strong> Your daily booking allowance has been restored.</strong>
            </p>
          </div>
        </div>

        {/* List of affected bookings */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {cancellations.map((booking) => (
            <div
              key={booking.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                backgroundColor: 'var(--color-sand)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                  gap: '8px',
                }}
              >
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--color-ink)',
                      fontFamily: 'var(--font-serif-heading)',
                    }}
                  >
                    {booking.room?.name || 'Study Room'}
                  </h4>
                  {booking.room && (
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '0.85rem',
                        color: 'var(--color-ink-muted)',
                      }}
                    >
                      {booking.room.building}, Floor {booking.room.floor}
                    </p>
                  )}
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(164, 66, 41, 0.15)',
                    color: 'var(--color-terracotta)',
                    border: '1px solid rgba(164, 66, 41, 0.3)',
                  }}
                >
                  <CalendarX size={12} />
                  Cancelled
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-ink)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div>
                  <strong>Scheduled Slot:</strong>{' '}
                  <span>
                    {formatSlotRangeDisplay(booking.starts_at, booking.ends_at)}
                  </span>
                </div>

                {booking.cancellation_reason && (
                  <div style={{ color: 'var(--color-terracotta)', marginTop: '2px' }}>
                    <strong>Reason:</strong> {booking.cancellation_reason}
                  </div>
                )}

                {booking.purpose && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                    <strong>Original purpose:</strong> {booking.purpose}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <Link
            href="/rooms"
            onClick={handleDismiss}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-parchment)',
              color: 'var(--color-ink)',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              minHeight: '44px',
            }}
          >
            Find Alternative Room
            <ArrowRight size={16} />
          </Link>

          <Button
            type="button"
            variant="primary"
            onClick={handleDismiss}
            disabled={dismissing}
            style={{
              minHeight: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={16} />
            {dismissing ? 'Updating...' : 'I Understand'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
