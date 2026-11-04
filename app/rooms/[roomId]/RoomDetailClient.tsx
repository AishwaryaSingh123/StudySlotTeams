'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Clock, ShieldCheck, Check } from 'lucide-react';
import { Room, Rules, SlotAvailability } from '../../../lib/repo/types';
import { Button } from '../../../components/Button';
import { SlotTimeline } from '../../../components/SlotTimeline';
import { TextField } from '../../../components/TextField';

export interface RoomDetailClientProps {
  room: Room;
  rules: Rules;
  initialDate: string;
  initialSlots: SlotAvailability[];
  dailyHoursUsed: number;
}

export function RoomDetailClient({
  room,
  rules,
  initialDate,
  initialSlots,
  dailyHoursUsed,
}: RoomDetailClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    router.push(`/rooms/${room.id}?date=${newDate}`);
  };

  const isLimitReached = dailyHoursUsed >= rules.max_hours_per_day;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          href={`/rooms?date=${selectedDate}`}
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
          <span>Back to room search</span>
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1>{room.name} — {room.building}, Floor {room.floor}</h1>
          <p style={{ color: 'var(--color-slate)', fontSize: '1.05rem' }}>
            {room.building} academic complex
          </p>
        </div>

        <Link
          href={`/rooms/${room.id}/book?date=${selectedDate}`}
          passHref
          legacyBehavior
        >
          <Button
            variant="primary"
            disabled={isLimitReached || room.status !== 'active'}
          >
            Book this room
          </Button>
        </Link>
      </div>

      {isLimitReached && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--color-warning-bg)',
            color: 'var(--color-warning-text)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-rule)',
            marginBottom: '24px',
            fontWeight: 600,
          }}
        >
          You have booked {dailyHoursUsed} of {rules.max_hours_per_day} hours allowed today. Choose another date or cancel an existing booking.
        </div>
      )}

      {/* Room Specification Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-stacks-green-dark)', fontWeight: 700 }}>
            <Users size={18} aria-hidden="true" />
            <span>Capacity</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '8px' }}>
            {room.capacity} students
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-stacks-green-dark)', fontWeight: 700 }}>
            <Clock size={18} aria-hidden="true" />
            <span>Opening Hours</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '8px' }} className="tabular-nums">
            {room.opens_at.slice(0, 5)}–{room.closes_at.slice(0, 5)}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-stacks-green-dark)', fontWeight: 700 }}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Campus Rules</span>
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--color-ink)', marginTop: '8px' }}>
            Max {rules.max_hours_per_day}h/day, up to {rules.max_booking_hours}h per booking
          </div>
        </div>
      </div>

      {/* Equipment list */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          marginBottom: '32px',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Installed Equipment</h2>
        <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {room.equipment.map((eq) => (
            <li
              key={eq}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: 'var(--color-sand)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              <Check size={16} color="var(--color-stacks-green)" aria-hidden="true" />
              <span>{eq.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Day Availability & Timeline */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <h2>Availability on {selectedDate}</h2>
          <div style={{ width: '200px' }}>
            <TextField
              id="room-date-picker"
              label="Select date"
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        <SlotTimeline slots={initialSlots} />
      </div>
    </div>
  );
}
