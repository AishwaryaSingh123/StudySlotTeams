'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Booking, Room, Rules, Team } from '../../../../lib/repo/types';
import { Button } from '../../../../components/Button';
import { TextField } from '../../../../components/TextField';
import { TextArea } from '../../../../components/TextArea';
import { FormErrorSummary } from '../../../../components/FormErrorSummary';
import { BookingStamp } from '../../../../components/BookingStamp';
import { campusTimeToUtc, durationInHours, formatSlotRangeDisplay, getCampusDateString } from '../../../../lib/time/campus';

export interface BookingFormClientProps {
  room: Room;
  rules: Rules;
  initialDate: string;
  initialStartTime?: string;
  initialEndTime?: string;
  userTeams: Team[];
  dailyHoursUsed: number;
  onBook: (data: {
    roomId: string;
    startsAt: string;
    endsAt: string;
    purpose?: string;
  }) => Promise<{ ok: boolean; booking?: Booking; error?: string; nextFreeSlot?: { start: string; end: string } | null }>;
}

export function BookingFormClient({
  room,
  rules,
  initialDate,
  initialStartTime = '14:00',
  initialEndTime = '15:00',
  userTeams,
  dailyHoursUsed,
  onBook,
}: BookingFormClientProps) {
  const router = useRouter();

  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [purpose, setPurpose] = useState('');
  const [bookFor, setBookFor] = useState<'personal' | 'team'>('personal');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(userTeams[0]?.id || '');

  const [loading, setLoading] = useState(false);
  const [errorSummary, setErrorSummary] = useState<{ fieldId?: string; message: string }[]>([]);
  const [conflictFreeSlot, setConflictFreeSlot] = useState<{ start: string; end: string } | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const today = getCampusDateString(new Date());

  // Compute duration
  let duration = 0;
  try {
    const startUtc = campusTimeToUtc(date, startTime);
    const endUtc = campusTimeToUtc(date, endTime);
    duration = durationInHours(startUtc.toISOString(), endUtc.toISOString());
  } catch {
    duration = 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorSummary([]);
    setConflictFreeSlot(null);

    const errors: { fieldId?: string; message: string }[] = [];

    if (!date) {
      errors.push({ fieldId: 'booking-date', message: 'Date is required.' });
    } else if (date < today) {
      errors.push({
        fieldId: 'booking-date',
        message: 'Cannot book a room for a past date. Please select today or a future date.',
      });
    }

    if (!startTime) errors.push({ fieldId: 'booking-start', message: 'Start time is required.' });
    if (!endTime) errors.push({ fieldId: 'booking-end', message: 'End time is required.' });

    if (duration <= 0) {
      errors.push({ fieldId: 'booking-end', message: 'End time must be strictly after start time.' });
    } else if (duration > rules.max_booking_hours) {
      errors.push({
        fieldId: 'booking-end',
        message: `Booking duration cannot exceed ${rules.max_booking_hours} hours.`,
      });
    }

    // 30-minute slot alignment check
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ((sm !== undefined && sm % 30 !== 0) || (em !== undefined && em % 30 !== 0)) {
      errors.push({
        fieldId: 'booking-start',
        message: 'Bookings must align with 30-minute intervals (e.g. 14:00, 14:30).',
      });
    }

    // Operating hours check
    const open = room.opens_at.slice(0, 5);
    const close = room.closes_at.slice(0, 5);
    if (startTime < open || endTime > close) {
      errors.push({
        fieldId: 'booking-start',
        message: `Booking must be within room operating hours (${open}–${close}).`,
      });
    }

    if (purpose && purpose.length > 280) {
      errors.push({
        fieldId: 'booking-purpose',
        message: 'Purpose or note cannot exceed 280 characters.',
      });
    }

    if (dailyHoursUsed + duration > rules.max_hours_per_day) {
      errors.push({
        message: `You have booked ${dailyHoursUsed}h of ${rules.max_hours_per_day}h allowed today. Requesting ${duration}h exceeds the limit.`,
      });
    }

    if (errors.length > 0) {
      setErrorSummary(errors);
      return;
    }

    setLoading(true);
    try {
      const startUtc = campusTimeToUtc(date, startTime).toISOString();
      const endUtc = campusTimeToUtc(date, endTime).toISOString();

      const res = await onBook({
        roomId: room.id,
        startsAt: startUtc,
        endsAt: endUtc,
        purpose: purpose.trim() || undefined,
      });

      if (res.ok && res.booking) {
        setConfirmedBooking(res.booking);
      } else {
        setErrorSummary([{ message: res.error || 'Failed to complete booking.' }]);
        if (res.nextFreeSlot) {
          setConflictFreeSlot(res.nextFreeSlot);
        }
      }
    } catch (err) {
      setErrorSummary([{ message: 'Network or server error while completing booking.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUseNextFreeSlot = () => {
    if (conflictFreeSlot) {
      setStartTime(conflictFreeSlot.start);
      setEndTime(conflictFreeSlot.end);
      setConflictFreeSlot(null);
      setErrorSummary([]);
    }
  };

  if (confirmedBooking) {
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto' }}>
        <BookingStamp
          roomName={room.name}
          dateStr={date}
          timeRange={`${startTime}–${endTime}`}
        />

        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginTop: '24px',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Booking Summary</h2>
          <p style={{ margin: '6px 0' }}>
            <strong>Room:</strong> {room.name} ({room.building}, Floor {room.floor})
          </p>
          <p style={{ margin: '6px 0' }}>
            <strong>Scheduled slot:</strong> {formatSlotRangeDisplay(confirmedBooking.starts_at, confirmedBooking.ends_at)}
          </p>
          {confirmedBooking.purpose && (
            <p style={{ margin: '6px 0' }}>
              <strong>Purpose:</strong> {confirmedBooking.purpose}
            </p>
          )}

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <Link href="/bookings" style={{ textDecoration: 'none' }}>
              <Button variant="primary">View my bookings</Button>
            </Link>
            <Link href="/rooms" style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Book another room</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link
          href={`/rooms/${room.id}?date=${date}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.95rem',
            color: 'var(--color-stacks-green)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to room details</span>
        </Link>
      </div>

      <h1 style={{ marginBottom: '8px' }}>Book {room.name}</h1>
      <p style={{ color: 'var(--color-slate)', marginBottom: '24px' }}>
        Confirm slot times and purpose. Bookings are fixed in 30-minute intervals up to {rules.max_booking_hours} hours.
      </p>

      {errorSummary.length > 0 && <FormErrorSummary errors={errorSummary} />}

      {conflictFreeSlot && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--color-warning-bg)',
            color: 'var(--color-warning-text)',
            border: '2px solid var(--color-warning-text)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} aria-hidden="true" />
            <span>
              <strong>That slot was just booked by someone else.</strong> The next free slot in {room.name} is{' '}
              <span className="tabular-nums font-bold">
                {conflictFreeSlot.start}–{conflictFreeSlot.end}
              </span>.
            </span>
          </div>
          <Button variant="secondary" onClick={handleUseNextFreeSlot}>
            Use next free slot ({conflictFreeSlot.start}–{conflictFreeSlot.end})
          </Button>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '32px',
          alignItems: 'start',
        }}
        className="booking-form-layout"
      >
        {/* Main Form (Left) */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
          }}
        >
          <form onSubmit={handleSubmit} noValidate>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
              Required fields are marked <span style={{ color: 'var(--color-error-text)' }}>*</span>.
            </p>

            {/* Book For Selector */}
            <fieldset
              style={{
                border: '1px solid var(--color-control-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                marginBottom: '20px',
              }}
            >
              <legend style={{ fontWeight: 700, padding: '0 4px', fontSize: '0.95rem' }}>
                Book for
              </legend>
              <div style={{ display: 'flex', gap: '24px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="bookFor"
                    value="personal"
                    checked={bookFor === 'personal'}
                    onChange={() => setBookFor('personal')}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Just me</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="bookFor"
                    value="team"
                    checked={bookFor === 'team'}
                    onChange={() => setBookFor('team')}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>My team</span>
                </label>
              </div>
            </fieldset>

            {bookFor === 'team' && (
              <div
                style={{
                  backgroundColor: 'var(--color-info-bg)',
                  border: '1px solid var(--color-info-text)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  marginBottom: '20px',
                }}
              >
                <p style={{ color: 'var(--color-info-text)', fontSize: '0.95rem', marginBottom: '8px' }}>
                  Team sessions allow attaching agenda tasks and team member attendees.
                </p>
                {userTeams.length > 0 ? (
                  <Link
                    href={`/teams/${selectedTeamId}/sessions/new?roomId=${room.id}&date=${date}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="primary">Go to team session booking</Button>
                  </Link>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)' }}>
                    You are not currently in any project teams. You can book for yourself or create a team on the Teams tab.
                  </p>
                )}
              </div>
            )}

            <TextField
              id="booking-date"
              label="Date"
              type="date"
              min={today}
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              helperText={`Bookings can only be scheduled for today (${today}) or future dates.`}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <TextField
                id="booking-start"
                label="Start time"
                type="time"
                step={1800}
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />

              <TextField
                id="booking-end"
                label="End time"
                type="time"
                step={1800}
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <TextArea
              id="booking-purpose"
              label="Purpose (optional)"
              maxLength={120}
              currentCount={purpose.length}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Preparing midterm presentation or literature audit"
              helperText="Brief summary of session focus (max 120 chars)."
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              loadingText="Confirming booking…"
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px 24px',
                fontSize: '1.05rem',
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>Confirm and book slot</span>
            </Button>
          </form>
        </div>

        {/* Sticky Summary Panel (Right) */}
        <aside
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            position: 'sticky',
            top: '80px',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Booking Summary</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
            <div>
              <span style={{ color: 'var(--color-slate)', display: 'block' }}>Selected Room:</span>
              <strong style={{ fontSize: '1.05rem' }}>{room.name}</strong>
              <span style={{ color: 'var(--color-slate)', display: 'block' }}>
                {room.building}, Floor {room.floor}
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--color-slate)', display: 'block' }}>Date:</span>
              <strong>{date}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-slate)', display: 'block' }}>Time Slot:</span>
              <strong className="tabular-nums">
                {startTime}–{endTime} ({duration > 0 ? `${duration}h` : '0h'})
              </strong>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--color-rule)',
                paddingTop: '12px',
                marginTop: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-stacks-green-dark)' }}>
                <Clock size={16} aria-hidden="true" />
                <span>Daily Limit Allowance</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginTop: '4px' }}>
                Campus limit: <strong>{rules.max_hours_per_day}h/day</strong>
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)' }}>
                Used today: <strong>{dailyHoursUsed}h</strong> | Requested: <strong>{duration}h</strong>
              </p>
              <p
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: dailyHoursUsed + duration <= rules.max_hours_per_day ? 'var(--color-success-text)' : 'var(--color-error-text)',
                  marginTop: '4px',
                }}
              >
                {dailyHoursUsed + duration <= rules.max_hours_per_day
                  ? `✓ Within daily limit (${dailyHoursUsed + duration}/${rules.max_hours_per_day}h)`
                  : `✕ Exceeds daily limit (${dailyHoursUsed + duration}/${rules.max_hours_per_day}h)`}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
