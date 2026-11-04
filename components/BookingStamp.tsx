'use client';

import React from 'react';

export interface BookingStampProps {
  roomName: string;
  dateStr: string;
  timeRange: string;
}

export function BookingStamp({ roomName, dateStr, timeRange }: BookingStampProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '24px',
        padding: '20px 24px',
        border: '2px solid var(--color-stacks-green)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-surface)',
        margin: '20px 0',
      }}
    >
      {/* Rubber Stamp graphic (M6) */}
      <div
        className="booking-stamp"
        aria-hidden="true"
        style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          border: '3px dashed var(--color-stacks-green)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-stacks-green)',
          textTransform: 'none',
          userSelect: 'none',
          padding: '4px',
          textAlign: 'center',
          lineHeight: 1.1,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>STUDYSLOT</span>
        <span style={{ fontSize: '1.05rem', fontWeight: 800, margin: '2px 0' }}>CONFIRMED</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>CAMPUS LEDGER</span>
      </div>

      <div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-stacks-green-dark)' }}>
          Booking confirmed: {roomName}
        </div>
        <div style={{ fontSize: '1.05rem', color: 'var(--color-ink)', marginTop: '4px' }}>
          {dateStr}, <span className="tabular-nums">{timeRange}</span>
        </div>
      </div>
    </div>
  );
}
