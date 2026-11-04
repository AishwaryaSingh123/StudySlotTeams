'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, AlertTriangle } from 'lucide-react';
import { Booking, Room } from '../../../lib/repo/types';
import { Button } from '../../../components/Button';
import { DataTable, Column } from '../../../components/DataTable';
import { StatusBadge } from '../../../components/StatusBadge';
import { Dialog } from '../../../components/Dialog';
import { useToast } from '../../../components/Toast';
import { formatSlotRangeDisplay } from '../../../lib/time/campus';

export interface StaffRoomsClientProps {
  initialRooms: Room[];
  onSetRoomStatus: (
    roomId: string,
    status: 'active' | 'inactive'
  ) => Promise<{ ok: boolean; room?: Room; error?: string }>;
  onGetFutureBookings: (roomId: string) => Promise<Booking[]>;
  onCancelBooking: (bookingId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function StaffRoomsClient({
  initialRooms,
  onSetRoomStatus,
  onGetFutureBookings,
  onCancelBooking,
}: StaffRoomsClientProps) {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<Room[]>(initialRooms);

  // Deactivate dialog state
  const [deactivatingRoom, setDeactivatingRoom] = useState<Room | null>(null);
  const [futureBookings, setFutureBookings] = useState<Booking[]>([]);
  const [dialogLoading, setDialogLoading] = useState(false);

  const handleToggleStatusClick = async (room: Room) => {
    if (room.status === 'active') {
      // Check future bookings before deactivating
      setDialogLoading(true);
      setDeactivatingRoom(room);
      try {
        const bookings = await onGetFutureBookings(room.id);
        setFutureBookings(bookings);
      } finally {
        setDialogLoading(false);
      }
    } else {
      // Reactivate room directly
      try {
        const res = await onSetRoomStatus(room.id, 'active');
        if (res.ok && res.room) {
          setRooms((prev) => prev.map((r) => (r.id === room.id ? res.room! : r)));
          showToast({ type: 'success', message: `${room.name} reactivated.` });
        }
      } catch {
        showToast({ type: 'error', message: 'Failed to reactivate room.' });
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingRoom) return;
    setDialogLoading(true);

    try {
      const res = await onSetRoomStatus(deactivatingRoom.id, 'inactive');
      if (res.ok && res.room) {
        setRooms((prev) => prev.map((r) => (r.id === deactivatingRoom.id ? res.room! : r)));
        setDeactivatingRoom(null);
        showToast({
          type: 'success',
          message: `${deactivatingRoom.name} deactivated. Existing bookings remain confirmed until cancelled.`,
        });
      } else {
        showToast({ type: 'error', message: res.error || 'Failed to deactivate room.' });
      }
    } finally {
      setDialogLoading(false);
    }
  };

  const handleCancelAffectedBooking = async (bId: string) => {
    try {
      const res = await onCancelBooking(bId);
      if (res.ok) {
        setFutureBookings((prev) => prev.filter((b) => b.id !== bId));
        showToast({ type: 'success', message: 'Booking cancelled.' });
      } else {
        showToast({ type: 'error', message: res.error || 'Failed to cancel booking.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error cancelling booking.' });
    }
  };

  const columns: Column<Room>[] = [
    {
      key: 'name',
      header: 'Room',
      render: (r) => (
        <div>
          <strong style={{ fontSize: '1.05rem' }}>{r.name}</strong>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>
            Operating: <span className="tabular-nums">{r.opens_at.slice(0, 5)}–{r.closes_at.slice(0, 5)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'building',
      header: 'Building / Floor',
      render: (r) => `${r.building}, Floor ${r.floor}`,
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (r) => <span className="tabular-nums">{r.capacity} seats</span>,
    },
    {
      key: 'equipment',
      header: 'Equipment',
      render: (r) => (
        <span style={{ fontSize: '0.9rem' }}>
          {r.equipment.map((eq) => eq.replace(/_/g, ' ')).join(', ') || 'Standard'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge type="room" value={r.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/staff/rooms/${r.id}/edit`} passHref legacyBehavior>
            <Button variant="secondary" style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.9rem' }}>
              <Edit size={15} aria-hidden="true" />
              <span>Edit</span>
            </Button>
          </Link>

          <Button
            variant="secondary"
            onClick={() => handleToggleStatusClick(r)}
            style={{
              padding: '6px 12px',
              minHeight: '36px',
              fontSize: '0.9rem',
              color: r.status === 'active' ? 'var(--color-error-text)' : 'var(--color-stacks-green-dark)',
            }}
          >
            {r.status === 'active' ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>Room Management</h1>
          <p style={{ color: 'var(--color-slate)', margin: '4px 0 0 0' }}>
            Configure study rooms, operating hours, capacity, and equipment options.
          </p>
        </div>

        <Link href="/staff/rooms/new" passHref legacyBehavior>
          <Button variant="primary">
            <Plus size={18} aria-hidden="true" />
            <span>Add room</span>
          </Button>
        </Link>
      </div>

      <DataTable
        caption="Campus study rooms inventory and operational status"
        columns={columns}
        data={rooms}
        keyExtractor={(r) => r.id}
      />

      {/* Deactivate Warning & Affected Bookings Dialog (design.md S14 & gap resolution) */}
      <Dialog
        isOpen={Boolean(deactivatingRoom)}
        onClose={() => setDeactivatingRoom(null)}
        title={`Deactivate ${deactivatingRoom?.name}`}
      >
        {deactivatingRoom && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning-text)', marginBottom: '12px' }}>
              <AlertTriangle size={20} aria-hidden="true" />
              <strong style={{ fontSize: '1rem' }}>
                {futureBookings.length} future booking{futureBookings.length === 1 ? '' : 's'} affected
              </strong>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--color-ink)', marginBottom: '16px' }}>
              Deactivating <strong>{deactivatingRoom.name}</strong> prevents students from booking new slots. Existing confirmed bookings remain active until staff explicitly cancels them.
            </p>

            {futureBookings.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--color-sand)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  marginBottom: '20px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                  Future bookings on record:
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {futureBookings.map((b) => (
                    <li
                      key={b.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.9rem',
                        backgroundColor: 'var(--color-surface)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-rule)',
                      }}
                    >
                      <span>{formatSlotRangeDisplay(b.starts_at, b.ends_at)}</span>
                      <Button
                        variant="secondary"
                        onClick={() => handleCancelAffectedBooking(b.id)}
                        style={{ minHeight: '30px', padding: '2px 8px', fontSize: '0.8rem', color: 'var(--color-error-text)' }}
                      >
                        Cancel booking
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setDeactivatingRoom(null)} disabled={dialogLoading}>
                Keep active
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeactivate}
                loading={dialogLoading}
                loadingText="Deactivating…"
              >
                Confirm deactivation
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
