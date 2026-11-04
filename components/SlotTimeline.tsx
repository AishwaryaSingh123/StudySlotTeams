'use client';

import React from 'react';
import { SlotAvailability } from '../lib/repo/types';

export interface SlotTimelineProps {
  slots: SlotAvailability[];
  selectedSlot?: { start: string; end: string } | null;
  onSelectSlot?: (slot: { start: string; end: string }) => void;
  interactive?: boolean;
}

export function SlotTimeline({
  slots,
  selectedSlot,
  onSelectSlot,
  interactive = false,
}: SlotTimelineProps) {
  // Aggregate free windows for accessible list
  const freeWindows: string[] = [];
  let currentWindowStart: string | null = null;
  let lastWindowEnd: string | null = null;

  for (const s of slots) {
    if (s.state === 'free') {
      if (!currentWindowStart) {
        currentWindowStart = s.start;
      }
      lastWindowEnd = s.end;
    } else {
      if (currentWindowStart && lastWindowEnd) {
        freeWindows.push(`${currentWindowStart}–${lastWindowEnd}`);
        currentWindowStart = null;
        lastWindowEnd = null;
      }
    }
  }
  if (currentWindowStart && lastWindowEnd) {
    freeWindows.push(`${currentWindowStart}–${lastWindowEnd}`);
  }

  return (
    <div style={{ marginTop: '16px', marginBottom: '24px' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Daily Timeline (30-minute intervals)</h3>

      {/* Visual strip grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {slots.map((s) => {
          const isSelected = selectedSlot?.start === s.start && selectedSlot?.end === s.end;
          const isFree = s.state === 'free';
          const isBooked = s.state === 'booked';
          const isYourTeam = s.state === 'your_team';
          const isBlocked = s.state === 'blocked';

          let stateLabel = 'Free';
          let bgClass = '';
          let bgStyle = 'var(--color-surface)';
          let borderStyle = '1px solid var(--color-control-border)';

          if (isSelected) {
            stateLabel = 'Selected';
            bgStyle = 'var(--color-green-tint)';
            borderStyle = '2px solid var(--color-stacks-green)';
          } else if (isYourTeam) {
            stateLabel = 'Your team';
            bgStyle = 'var(--color-green-tint)';
            borderStyle = '1px solid var(--color-stacks-green)';
          } else if (isBooked) {
            stateLabel = 'Booked';
            bgClass = 'hatch-booked';
          } else if (isBlocked) {
            stateLabel = s.reason ? `Unavailable: ${s.reason}` : 'Unavailable';
            bgClass = 'hatch-blocked';
          }

          if (interactive && isFree) {
            return (
              <button
                key={s.start}
                type="button"
                onClick={() => onSelectSlot?.({ start: s.start, end: s.end })}
                aria-label={`Select slot from ${s.start} to ${s.end}, currently Free`}
                aria-pressed={isSelected}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: bgStyle,
                  border: borderStyle,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {s.start}–{s.end}
                </span>
                <span style={{ fontSize: '0.85rem', color: isSelected ? 'var(--color-stacks-green-dark)' : 'var(--color-slate)' }}>
                  {stateLabel}
                </span>
              </button>
            );
          }

          return (
            <div
              key={s.start}
              className={bgClass}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: bgClass ? undefined : bgStyle,
                border: borderStyle,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span className="tabular-nums" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {s.start}–{s.end}
              </span>
              <span style={{ fontSize: '0.85rem', color: isYourTeam ? 'var(--color-stacks-green-dark)' : 'var(--color-slate)' }}>
                {stateLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Accessible Equivalent List (design.md S3 & D) */}
      <div style={{ backgroundColor: 'var(--color-sand)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '6px', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
          Free Availability Windows (Accessible text list)
        </h4>
        {freeWindows.length > 0 ? (
          <ul style={{ paddingLeft: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
            {freeWindows.map((win) => (
              <li key={win} className="tabular-nums" style={{ fontWeight: 600 }}>
                {win}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--color-slate)', fontSize: '0.95rem' }}>No free slots available on this date.</p>
        )}
      </div>
    </div>
  );
}
