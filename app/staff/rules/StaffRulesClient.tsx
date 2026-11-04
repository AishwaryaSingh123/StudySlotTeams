'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Shield, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AffectedBookingSummary, BlackoutDate, Room, Rules } from '../../../lib/repo/types';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { Select } from '../../../components/Select';
import { DataTable, Column } from '../../../components/DataTable';
import { Dialog } from '../../../components/Dialog';
import { FormErrorSummary } from '../../../components/FormErrorSummary';
import { useToast } from '../../../components/Toast';
import { formatSlotRangeDisplay } from '../../../lib/time/campus';

export interface StaffRulesClientProps {
  initialRules: Rules;
  initialBlackouts: BlackoutDate[];
  rooms: Room[];
  onUpdateRules: (patch: Partial<Rules>) => Promise<{ ok: boolean; rules?: Rules; error?: string }>;
  onCreateBlackout: (input: Omit<BlackoutDate, 'id'>) => Promise<{
    ok: boolean;
    blackout?: BlackoutDate & { affectedBookingsCount: number; affectedBookings?: AffectedBookingSummary[] };
    error?: string;
  }>;
  onDeleteBlackout: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onCancelBlackoutBookings?: (blackoutId: string, reason: string) => Promise<{
    ok: boolean;
    cancelledCount?: number;
    notifiedUsers?: string[];
    error?: string;
  }>;
}

export function StaffRulesClient({
  initialRules,
  initialBlackouts,
  rooms,
  onUpdateRules,
  onCreateBlackout,
  onDeleteBlackout,
  onCancelBlackoutBookings,
}: StaffRulesClientProps) {
  const { showToast } = useToast();

  const [rules, setRules] = useState<Rules>(initialRules);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>(initialBlackouts);

  // Limits form
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<string>(initialRules.max_hours_per_day.toString());
  const [maxBookingHours, setMaxBookingHours] = useState<string>(initialRules.max_booking_hours.toString());
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsStatusText, setLimitsStatusText] = useState<string | null>(null);
  const [limitsErrors, setLimitsErrors] = useState<{ message: string }[]>([]);

  // Add Blackout Form
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [roomId, setRoomId] = useState('');
  const [blackoutLoading, setBlackoutLoading] = useState(false);
  const [blackoutErrors, setBlackoutErrors] = useState<{ fieldId?: string; message: string }[]>([]);

  // Delete dialog
  const [blackoutToDelete, setBlackoutToDelete] = useState<BlackoutDate | null>(null);

  // Impact Warning Dialog State (for affected bookings)
  const [impactModal, setImpactModal] = useState<{
    blackout: BlackoutDate;
    affectedBookings: AffectedBookingSummary[];
  } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancelAffectedAndNotify = async () => {
    if (!impactModal || !onCancelBlackoutBookings) return;
    setCancelLoading(true);
    try {
      const res = await onCancelBlackoutBookings(impactModal.blackout.id, impactModal.blackout.reason);
      if (res.ok) {
        const notifiedNames =
          res.notifiedUsers && res.notifiedUsers.length > 0
            ? res.notifiedUsers.join(', ')
            : 'respective booking holders';
        showToast({
          type: 'success',
          title: 'Bookings Cancelled & Students Notified',
          message: `${res.cancelledCount} booking(s) cancelled due to blackout. Notification sent to: ${notifiedNames}.`,
        });
        setImpactModal(null);
      } else {
        showToast({ type: 'error', message: res.error || 'Failed to cancel affected bookings.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error cancelling affected bookings.' });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleKeepAsExceptions = () => {
    showToast({
      type: 'info',
      title: 'Blackout Applied',
      message: 'Blackout date saved. Existing confirmed bookings kept as approved exceptions.',
    });
    setImpactModal(null);
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setLimitsErrors([]);
    setLimitsStatusText(null);

    const perDay = parseFloat(maxHoursPerDay);
    const perBooking = parseFloat(maxBookingHours);

    if (isNaN(perDay) || perDay < 1 || perDay > 8) {
      setLimitsErrors([{ message: 'Max hours per day must be between 1 and 8.' }]);
      return;
    }
    if (isNaN(perBooking) || perBooking > perDay) {
      setLimitsErrors([{ message: 'Max booking length cannot exceed daily hours allowance.' }]);
      return;
    }

    setLimitsLoading(true);
    try {
      const res = await onUpdateRules({
        max_hours_per_day: perDay,
        max_booking_hours: perBooking,
      });

      if (res.ok && res.rules) {
        setRules(res.rules);
        setLimitsStatusText('Rules saved. New limits apply to bookings made from now on.');
        showToast({ type: 'success', message: 'Booking limits updated.' });
      } else {
        setLimitsErrors([{ message: res.error || 'Failed to update rules.' }]);
      }
    } catch {
      setLimitsErrors([{ message: 'Network error saving rules.' }]);
    } finally {
      setLimitsLoading(false);
    }
  };

  const handleAddBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlackoutErrors([]);

    const errs: { fieldId?: string; message: string }[] = [];
    if (!startDate) errs.push({ fieldId: 'blk-start-date', message: 'Start date is required.' });
    if (!endDate) errs.push({ fieldId: 'blk-end-date', message: 'End date is required.' });
    if (!reason.trim()) errs.push({ fieldId: 'blk-reason', message: 'Reason is required.' });

    if (startDate && endDate && endDate < startDate) {
      errs.push({ fieldId: 'blk-end-date', message: 'End date cannot precede start date.' });
    }

    if (errs.length > 0) {
      setBlackoutErrors(errs);
      return;
    }

    setBlackoutLoading(true);
    try {
      const res = await onCreateBlackout({
        room_id: roomId || null,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });

      if (res.ok && res.blackout) {
        setBlackouts((prev) => [...prev, res.blackout!]);
        setStartDate('');
        setEndDate('');
        setReason('');
        setRoomId('');

        const affected = res.blackout.affectedBookingsCount;
        if (affected > 0 && res.blackout.affectedBookings && res.blackout.affectedBookings.length > 0) {
          setImpactModal({
            blackout: res.blackout,
            affectedBookings: res.blackout.affectedBookings,
          });
        } else {
          showToast({
            type: 'success',
            title: 'Blackout date added',
            message: 'Blackout date saved successfully.',
          });
        }
      } else {
        setBlackoutErrors([{ message: res.error || 'Failed to add blackout date.' }]);
      }
    } catch {
      setBlackoutErrors([{ message: 'Network error adding blackout.' }]);
    } finally {
      setBlackoutLoading(false);
    }
  };

  const handleConfirmDeleteBlackout = async () => {
    if (!blackoutToDelete) return;

    try {
      const res = await onDeleteBlackout(blackoutToDelete.id);
      if (res.ok) {
        setBlackouts((prev) => prev.filter((b) => b.id !== blackoutToDelete.id));
        setBlackoutToDelete(null);
        showToast({ type: 'success', message: 'Blackout date removed.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Failed to remove blackout date.' });
    }
  };

  const blackoutColumns: Column<BlackoutDate>[] = [
    {
      key: 'dates',
      header: 'Date / Range',
      render: (b) => (
        <span className="tabular-nums font-bold">
          {b.start_date === b.end_date ? b.start_date : `${b.start_date} to ${b.end_date}`}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (b) => b.reason,
    },
    {
      key: 'applies_to',
      header: 'Applies To',
      render: (b) => {
        if (!b.room_id) return <strong>All campus rooms</strong>;
        const targetRoom = rooms.find((r) => r.id === b.room_id);
        return targetRoom ? `${targetRoom.name} (${targetRoom.building})` : 'Specific room';
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (b) => (
        <Button
          variant="secondary"
          onClick={() => setBlackoutToDelete(b)}
          aria-label={`Delete blackout ${b.reason}`}
          style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.85rem', color: 'var(--color-error-text)' }}
        >
          <Trash2 size={15} aria-hidden="true" />
          <span>Delete</span>
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <h1>Booking rules</h1>
      <p style={{ color: 'var(--color-slate)', marginBottom: '32px' }}>
        Configure campus daily study allowances, slot increments, and blackout dates.
      </p>

      {/* Section 1: Limits (design.md S15) */}
      <section
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
          marginBottom: '40px',
        }}
        aria-labelledby="section-limits-heading"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Shield size={20} color="var(--color-stacks-green)" aria-hidden="true" />
          <h2 id="section-limits-heading" style={{ margin: 0, fontSize: '1.25rem' }}>
            Campus Booking Limits
          </h2>
        </div>

        {limitsErrors.length > 0 && <FormErrorSummary errors={limitsErrors} />}

        {limitsStatusText && (
          <div
            role="status"
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success-text)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{limitsStatusText}</span>
          </div>
        )}

        <form onSubmit={handleSaveLimits} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <TextField
              id="limits-max-day"
              label="Max hours per day per student"
              type="number"
              min={1}
              max={8}
              step={0.5}
              required
              value={maxHoursPerDay}
              onChange={(e) => setMaxHoursPerDay(e.target.value)}
              helperText="Enforced across personal and team bookings."
            />

            <TextField
              id="limits-max-booking"
              label="Max booking length (hours)"
              type="number"
              min={0.5}
              max={8}
              step={0.5}
              required
              value={maxBookingHours}
              onChange={(e) => setMaxBookingHours(e.target.value)}
              helperText="Maximum duration allowed per reservation."
            />

            <TextField
              id="limits-slot-step"
              label="Slot step in minutes"
              type="number"
              disabled
              value={rules.slot_minutes}
              helperText="Fixed at 30-minute intervals in core scope."
            />
          </div>

          <div style={{ marginTop: '8px' }}>
            <Button type="submit" variant="primary" loading={limitsLoading} loadingText="Saving rules…">
              Save limits
            </Button>
          </div>
        </form>
      </section>

      {/* Section 2: Blackout Dates (design.md S15) */}
      <section
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
        }}
        aria-labelledby="section-blackouts-heading"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Calendar size={20} color="var(--color-stacks-green)" aria-hidden="true" />
          <h2 id="section-blackouts-heading" style={{ margin: 0, fontSize: '1.25rem' }}>
            Blackout Dates
          </h2>
        </div>
        <p style={{ color: 'var(--color-slate)', fontSize: '0.95rem', marginBottom: '20px' }}>
          Rooms during blackout dates will display as &quot;Unavailable&quot; and reject any new booking attempts.
        </p>

        {/* Add Blackout Form */}
        <div
          style={{
            backgroundColor: 'var(--color-sand)',
            padding: '20px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '28px',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Schedule New Blackout</h3>

          {blackoutErrors.length > 0 && <FormErrorSummary errors={blackoutErrors} />}

          <form onSubmit={handleAddBlackout} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <TextField
                id="blk-start-date"
                label="Start date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <TextField
                id="blk-end-date"
                label="End date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <Select
                id="blk-room"
                label="Applies to"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                options={[
                  { value: '', label: 'All campus rooms' },
                  ...rooms.map((r) => ({
                    value: r.id,
                    label: `${r.name} (${r.building})`,
                  })),
                ]}
              />
            </div>

            <TextField
              id="blk-reason"
              label="Blackout reason"
              required
              placeholder="e.g. Electrical maintenance, campus exams, or deep sanitisation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <Button type="submit" variant="primary" loading={blackoutLoading} loadingText="Adding blackout…">
              <Plus size={16} aria-hidden="true" />
              <span>Add blackout date</span>
            </Button>
          </form>
        </div>

        {/* Existing Blackouts Table */}
        <DataTable
          caption="Current campus blackout dates"
          columns={blackoutColumns}
          data={blackouts}
          keyExtractor={(b) => b.id}
          emptyMessage="No blackout dates currently scheduled."
        />
      </section>

      {/* Delete Blackout Dialog (design.md D2) */}
      <Dialog
        isOpen={Boolean(blackoutToDelete)}
        onClose={() => setBlackoutToDelete(null)}
        title="Remove Blackout Date"
      >
        {blackoutToDelete && (
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '16px' }}>
              Remove blackout for <strong>{blackoutToDelete.reason}</strong> (
              {blackoutToDelete.start_date} to {blackoutToDelete.end_date})?
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '24px' }}>
              The affected dates will become available again for study room bookings.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setBlackoutToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteBlackout}>
                Remove blackout
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      {/* Interactive Impact Warning & Notification Dialog */}
      <Dialog
        isOpen={Boolean(impactModal)}
        onClose={() => setImpactModal(null)}
        title="Impact Warning: Affected Confirmed Bookings"
      >
        {impactModal && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                color: 'var(--color-warning-text)',
                backgroundColor: 'var(--color-warning-bg)',
                border: '1px solid rgba(107, 66, 0, 0.25)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '0.95rem',
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Action Required: </strong>
                {impactModal.affectedBookings.length} confirmed booking{impactModal.affectedBookings.length === 1 ? '' : 's'} fall within this blackout period ({impactModal.blackout.start_date} to {impactModal.blackout.end_date}).
              </div>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--color-ink)', marginBottom: '16px' }}>
              Reason for blackout: <strong>{impactModal.blackout.reason}</strong>
            </p>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate)', marginBottom: '8px' }}>
                Affected Student Bookings:
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {impactModal.affectedBookings.map((b) => (
                  <li
                    key={b.id}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--color-sand)',
                      border: '1px solid var(--color-rule)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <strong>{b.roomName} — {formatSlotRangeDisplay(b.startsAt, b.endsAt)}</strong>
                    <span style={{ color: 'var(--color-slate)', fontSize: '0.85rem' }}>
                      Booked by: {b.bookedByName} {b.bookedByEmail ? `(${b.bookedByEmail})` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
              Choose how you want to handle these appointments:
            </p>

            {/* Action buttons in 1 horizontal line with standard visual hierarchy & high contrast */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--color-rule)',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                disabled={cancelLoading}
                onClick={handleKeepAsExceptions}
              >
                Keep existing bookings
              </Button>

              <Button
                type="button"
                variant="destructive"
                loading={cancelLoading}
                loadingText="Cancelling..."
                onClick={handleCancelAffectedAndNotify}
              >
                Cancel all affected bookings
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
