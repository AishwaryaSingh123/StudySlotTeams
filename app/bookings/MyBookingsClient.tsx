'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Booking } from '../../lib/repo/types';
import { DataTable, Column } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { useToast } from '../../components/Toast';
import { formatSlotRangeDisplay, getCampusDateString, getCampusTimeString } from '../../lib/time/campus';

export interface MyBookingsClientProps {
  initialUpcoming: Booking[];
  initialPast: Booking[];
  onCancelBooking: (bookingId: string) => Promise<{ ok: boolean; error?: string }>;
  onUndoCancel: (bookingId: string) => Promise<{ ok: boolean; booking?: Booking; error?: string }>;
}

export function MyBookingsClient({
  initialUpcoming,
  initialPast,
  onCancelBooking,
  onUndoCancel,
}: MyBookingsClientProps) {
  const { showToast } = useToast();

  const [upcoming, setUpcoming] = useState<Booking[]>(initialUpcoming);
  const [past, setPast] = useState<Booking[]>(initialPast);

  // Cancellation Dialog State
  const [targetBooking, setTargetBooking] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleOpenCancelDialog = (b: Booking) => {
    setTargetBooking(b);
  };

  const handleCloseCancelDialog = () => {
    if (!cancelLoading) {
      setTargetBooking(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!targetBooking) return;

    setCancelLoading(true);
    const bookingToCancel = targetBooking;

    try {
      const res = await onCancelBooking(bookingToCancel.id);
      if (res.ok) {
        // Update local state
        setUpcoming((prev) => prev.filter((b) => b.id !== bookingToCancel.id));
        setPast((prev) => [
          { ...bookingToCancel, status: 'cancelled', cancelled_at: new Date().toISOString() },
          ...prev,
        ]);

        setTargetBooking(null);

        // Show 8-second toast with Undo option (M16)
        showToast({
          type: 'success',
          title: 'Booking cancelled',
          message: `Booking for ${bookingToCancel.room?.name || 'room'} was cancelled.`,
          undoLabel: 'Undo cancellation',
          undoAction: async () => {
            const undoRes = await onUndoCancel(bookingToCancel.id);
            if (undoRes.ok && undoRes.booking) {
              const restored = undoRes.booking;
              setPast((prev) => prev.filter((b) => b.id !== bookingToCancel.id));
              setUpcoming((prev) => [...prev, restored]);
              showToast({
                type: 'success',
                message: `Booking restored for ${restored.room?.name || 'room'}.`,
              });
            } else {
              showToast({
                type: 'error',
                title: 'Cannot restore booking',
                message: undoRes.error || 'The slot is no longer available.',
              });
            }
          },
        });
      } else {
        showToast({
          type: 'error',
          title: 'Cancellation failed',
          message: res.error || 'Unable to cancel booking.',
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Network error',
        message: 'Could not reach server to cancel booking.',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const upcomingColumns: Column<Booking>[] = [
    {
      key: 'room',
      header: 'Room',
      render: (b) => (
        <div>
          <div style={{ fontWeight: 700 }}>{b.room?.name || 'Room'}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-slate)' }}>
            {b.room?.building}, Floor {b.room?.floor}
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (b) => getCampusDateString(b.starts_at),
    },
    {
      key: 'time',
      header: 'Time',
      render: (b) => (
        <span className="tabular-nums">
          {getCampusTimeString(b.starts_at)}–{getCampusTimeString(b.ends_at)}
        </span>
      ),
    },
    {
      key: 'team',
      header: 'Booking Type',
      render: (b) => (b.team ? `${b.team.name} (Team)` : 'Personal'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge type="booking" value={b.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (b) => (
        <Button
          variant="secondary"
          onClick={() => handleOpenCancelDialog(b)}
          aria-label={`Cancel booking for ${b.room?.name || 'room'}`}
        >
          Cancel
        </Button>
      ),
    },
  ];

  const pastColumns: Column<Booking>[] = [
    {
      key: 'room',
      header: 'Room',
      render: (b) => b.room?.name || 'Room',
    },
    {
      key: 'date',
      header: 'Date',
      render: (b) => getCampusDateString(b.starts_at),
    },
    {
      key: 'time',
      header: 'Time',
      render: (b) => (
        <span className="tabular-nums">
          {getCampusTimeString(b.starts_at)}–{getCampusTimeString(b.ends_at)}
        </span>
      ),
    },
    {
      key: 'team',
      header: 'Type',
      render: (b) => (b.team ? b.team.name : 'Personal'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge type="booking" value={b.status} />,
    },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1>My bookings</h1>
      <p style={{ color: 'var(--color-slate)', marginBottom: '32px' }}>
        Review your upcoming campus study room reservations and past booking history.
      </p>

      {/* Upcoming Section */}
      <section aria-labelledby="upcoming-heading" style={{ marginBottom: '48px' }}>
        <h2 id="upcoming-heading" style={{ marginBottom: '16px' }}>Upcoming Bookings</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            message="You have no upcoming bookings."
            actionText="Find a room"
            actionHref="/rooms"
          />
        ) : (
          <DataTable
            caption="List of your upcoming confirmed room bookings"
            columns={upcomingColumns}
            data={upcoming}
            keyExtractor={(b) => b.id}
          />
        )}
      </section>

      {/* Past and Cancelled Section */}
      <section aria-labelledby="past-heading">
        <h2 id="past-heading" style={{ marginBottom: '16px' }}>Past and Cancelled</h2>
        {past.length === 0 ? (
          <p style={{ color: 'var(--color-slate)', fontStyle: 'italic' }}>
            No past or cancelled bookings recorded.
          </p>
        ) : (
          <DataTable
            caption="History of past and cancelled bookings"
            columns={pastColumns}
            data={past}
            keyExtractor={(b) => b.id}
          />
        )}
      </section>

      {/* Accessible Cancel Booking Confirmation Dialog (design.md D2 & S5) */}
      <Dialog
        isOpen={Boolean(targetBooking)}
        onClose={handleCloseCancelDialog}
        title="Cancel Booking"
      >
        {targetBooking && (
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '16px' }}>
              Cancel booking for <strong>{targetBooking.room?.name || 'Room'}</strong> on{' '}
              <strong>{formatSlotRangeDisplay(targetBooking.starts_at, targetBooking.ends_at)}</strong>?
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '24px' }}>
              Cancelling will release the room slot immediately for other students. You can undo this action within 8 seconds if the slot remains unoccupied.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={handleCloseCancelDialog}
                disabled={cancelLoading}
              >
                Keep booking
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                loading={cancelLoading}
                loadingText="Cancelling…"
              >
                Cancel booking
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
