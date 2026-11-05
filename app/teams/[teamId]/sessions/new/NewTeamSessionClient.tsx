'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckSquare, Users, AlertTriangle } from 'lucide-react';
import { Booking, Room, Rules, Task, Team, TeamMember } from '@/lib/repo/types';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { TextArea } from '@/components/TextArea';
import { FormErrorSummary } from '@/components/FormErrorSummary';
import { BookingStamp } from '@/components/BookingStamp';
import { campusTimeToUtc, durationInHours, formatSlotRangeDisplay, getCampusDateString } from '@/lib/time/campus';

export interface NewTeamSessionClientProps {
  team: Team;
  rooms: Room[];
  tasks: Task[];
  members: TeamMember[];
  rules: Rules;
  initialDate?: string;
  initialRoomId?: string;
  onBookSession: (input: {
    teamId: string;
    roomId: string;
    startsAt: string;
    endsAt: string;
    taskIds: string[];
    attendeeIds: string[];
    note?: string;
  }) => Promise<{ ok: boolean; session?: Booking; error?: string; nextFreeSlot?: { start: string; end: string } | null }>;
}

export function NewTeamSessionClient({
  team,
  rooms,
  tasks,
  members,
  rules,
  initialDate = '2026-11-12',
  initialRoomId,
  onBookSession,
}: NewTeamSessionClientProps) {
  const router = useRouter();

  const today = getCampusDateString(new Date());

  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId || rooms[0]?.id || '');

  // Selected Agenda Tasks
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sessionNote, setSessionNote] = useState('');

  // Selected Attendees (default to all)
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>(
    members.map((m) => m.user_id)
  );

  const [loading, setLoading] = useState(false);
  const [errorSummary, setErrorSummary] = useState<{ fieldId?: string; message: string }[]>([]);
  const [conflictFreeSlot, setConflictFreeSlot] = useState<{ start: string; end: string } | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const handleTaskToggle = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleAttendeeToggle = (userId: string) => {
    setSelectedAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorSummary([]);
    setConflictFreeSlot(null);

    const errors: { fieldId?: string; message: string }[] = [];

    if (!selectedRoomId) errors.push({ message: 'Select a study room.' });
    if (!date) {
      errors.push({ fieldId: 'session-date', message: 'Date is required.' });
    } else if (date < today) {
      errors.push({ fieldId: 'session-date', message: 'Cannot schedule a team session for a past date.' });
    }
    if (!startTime) errors.push({ fieldId: 'session-start', message: 'Start time is required.' });
    if (!endTime) errors.push({ fieldId: 'session-end', message: 'End time is required.' });

    if (selectedAttendeeIds.length === 0) {
      errors.push({ message: 'Select at least one attendee for the session.' });
    }

    if (selectedRoom && selectedAttendeeIds.length > selectedRoom.capacity) {
      errors.push({
        message: `${selectedAttendeeIds.length} attendees selected, but ${selectedRoom.name} holds ${selectedRoom.capacity} people.`,
      });
    }

    let duration = 0;
    try {
      const s = campusTimeToUtc(date, startTime);
      const en = campusTimeToUtc(date, endTime);
      duration = durationInHours(s.toISOString(), en.toISOString());
    } catch {
      duration = 0;
    }

    if (duration <= 0) {
      errors.push({ fieldId: 'session-end', message: 'End time must be after start time.' });
    } else if (duration > rules.max_booking_hours) {
      errors.push({
        fieldId: 'session-end',
        message: `Session duration cannot exceed ${rules.max_booking_hours} hours.`,
      });
    }

    // 30-minute slot alignment check
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ((sm !== undefined && sm % 30 !== 0) || (em !== undefined && em % 30 !== 0)) {
      errors.push({
        fieldId: 'session-start',
        message: 'Sessions must align with 30-minute intervals (e.g. 14:00, 14:30).',
      });
    }

    // Operating hours check
    if (selectedRoom) {
      const open = selectedRoom.opens_at.slice(0, 5);
      const close = selectedRoom.closes_at.slice(0, 5);
      if (startTime < open || endTime > close) {
        errors.push({
          fieldId: 'session-start',
          message: `Session must be within room operating hours (${open}–${close}).`,
        });
      }
    }

    // Note limit check (280 chars)
    if (sessionNote && sessionNote.length > 280) {
      errors.push({
        fieldId: 'session-note',
        message: 'Session note cannot exceed 280 characters.',
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

      const res = await onBookSession({
        teamId: team.id,
        roomId: selectedRoomId,
        startsAt: startUtc,
        endsAt: endUtc,
        taskIds: selectedTaskIds,
        attendeeIds: selectedAttendeeIds,
        note: sessionNote.trim() || undefined,
      });

      if (res.ok && res.session) {
        setConfirmedBooking(res.session);
      } else {
        setErrorSummary([{ message: res.error || 'Failed to book session.' }]);
        if (res.nextFreeSlot) {
          setConflictFreeSlot(res.nextFreeSlot);
        }
      }
    } catch {
      setErrorSummary([{ message: 'Network error booking team session.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (confirmedBooking) {
    return (
      <div style={{ maxWidth: '700px', margin: '40px auto' }}>
        <BookingStamp
          roomName={selectedRoom?.name || 'Room'}
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
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Team Session Booked</h2>
          <p style={{ margin: '6px 0' }}>
            <strong>Team:</strong> {team.name}
          </p>
          <p style={{ margin: '6px 0' }}>
            <strong>Room:</strong> {selectedRoom?.name} ({selectedRoom?.building})
          </p>
          <p style={{ margin: '6px 0' }}>
            <strong>Scheduled slot:</strong> {formatSlotRangeDisplay(confirmedBooking.starts_at, confirmedBooking.ends_at)}
          </p>
          <p style={{ margin: '6px 0' }}>
            <strong>Attendees:</strong> {selectedAttendeeIds.length} members confirmed
          </p>
          <p style={{ margin: '6px 0' }}>
            <strong>Agenda tasks:</strong> {selectedTaskIds.length} attached
          </p>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <Link href={`/teams/${team.id}/sessions`} style={{ textDecoration: 'none' }}>
              <Button variant="primary">View team sessions</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link
          href={`/teams/${team.id}/sessions`}
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
          <span>Back to team sessions</span>
        </Link>
      </div>

      <h1>Book a team study session</h1>
      <p style={{ color: 'var(--color-slate)', marginBottom: '24px' }}>
        Reserve a study room for {team.name}, designate meeting agenda items, and track member attendance.
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
              <strong>That slot was just booked by another group.</strong> Next free slot in {selectedRoom?.name}:{' '}
              <span className="tabular-nums font-bold">
                {conflictFreeSlot.start}–{conflictFreeSlot.end}
              </span>.
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setStartTime(conflictFreeSlot.start);
              setEndTime(conflictFreeSlot.end);
              setConflictFreeSlot(null);
              setErrorSummary([]);
            }}
          >
            Use next free slot ({conflictFreeSlot.start}–{conflictFreeSlot.end})
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Section 1: When and where */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginBottom: '28px',
          }}
          aria-labelledby="section-when-where"
        >
          <h2 id="section-when-where" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
            1. When and where
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <TextField
              id="session-date"
              label="Date"
              type="date"
              min={today}
              required
              value={date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
            />

            <TextField
              id="session-start"
              label="Start time"
              type="time"
              step={1800}
              required
              value={startTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
            />

            <TextField
              id="session-end"
              label="End time"
              type="time"
              step={1800}
              required
              value={endTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
            />
          </div>

          <fieldset
            style={{
              border: '1px solid var(--color-control-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              marginTop: '16px',
            }}
          >
            <legend style={{ fontWeight: 700, padding: '0 4px', fontSize: '0.95rem' }}>
              Select Room ({rooms.length} available)
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '8px' }}>
              {rooms.map((r) => {
                const isSelected = selectedRoomId === r.id;
                const capacityOk = r.capacity >= selectedAttendeeIds.length;

                return (
                  <label
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '2px solid var(--color-stacks-green)' : '1px solid var(--color-rule)',
                      backgroundColor: isSelected ? 'var(--color-green-tint)' : 'var(--color-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="roomId"
                      value={r.id}
                      checked={isSelected}
                      onChange={() => setSelectedRoomId(r.id)}
                      style={{ width: '18px', height: '18px', marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>
                        {r.building}, Fl {r.floor} • Holds {r.capacity}
                      </div>
                      {!capacityOk && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-error-text)', fontWeight: 600 }}>
                          Too small for {selectedAttendeeIds.length} attendees
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        {/* Section 2: Agenda */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginBottom: '28px',
          }}
          aria-labelledby="section-agenda"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckSquare size={20} color="var(--color-stacks-green)" aria-hidden="true" />
            <h2 id="section-agenda" style={{ margin: 0, fontSize: '1.25rem' }}>
              2. Agenda Tasks
            </h2>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
            Attach unfinished team tasks to review during this study session.
          </p>

          {tasks.length === 0 ? (
            <p style={{ color: 'var(--color-slate)', fontStyle: 'italic' }}>
              No open tasks available on the board. You can add tasks on the Board tab.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {tasks.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    border: '1px solid var(--color-rule)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: selectedTaskIds.includes(t.id) ? 'var(--color-sand)' : 'var(--color-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(t.id)}
                    onChange={() => handleTaskToggle(t.id)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{t.title}</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-slate)', marginLeft: '8px' }}>
                        ({t.points} pts)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>
                      Assignee: {t.assignee?.full_name || 'Unassigned'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <TextArea
            id="session-note"
            label="Session note (optional)"
            maxLength={200}
            currentCount={sessionNote.length}
            value={sessionNote}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSessionNote(e.target.value)}
            placeholder="e.g. Bring survey drafts and printed questionnaire templates."
            helperText="Preparation notes or room access instructions (max 200 chars)."
          />
        </section>

        {/* Section 3: Attendees */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            marginBottom: '32px',
          }}
          aria-labelledby="section-attendees"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Users size={20} color="var(--color-stacks-green)" aria-hidden="true" />
            <h2 id="section-attendees" style={{ margin: 0, fontSize: '1.25rem' }}>
              3. Attendees
            </h2>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--color-sand)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          >
            {selectedAttendeeIds.length} attendee{selectedAttendeeIds.length === 1 ? '' : 's'} selected;{' '}
            {selectedRoom ? (
              <span>
                {selectedRoom.name} accommodates up to <strong>{selectedRoom.capacity} people</strong>.
              </span>
            ) : (
              'Choose a room above.'
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m) => (
              <label
                key={m.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  border: '1px solid var(--color-rule)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: selectedAttendeeIds.includes(m.user_id)
                    ? 'var(--color-green-tint)'
                    : 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAttendeeIds.includes(m.user_id)}
                  onChange={() => handleAttendeeToggle(m.user_id)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: 600 }}>{m.profile?.full_name || 'Member'}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>({m.profile?.email})</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-slate)' }}>
                  {m.role === 'lead' ? 'Team Lead' : 'Member'}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Button type="submit" variant="primary" loading={loading} loadingText="Booking session…">
            Book session
          </Button>
          <Link href={`/teams/${team.id}/sessions`} style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
