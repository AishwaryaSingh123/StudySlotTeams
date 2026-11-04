'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  Flag,
  Clock,
  Square,
  Sparkles,
} from 'lucide-react';
import { CalendarEntry, Team } from '@/lib/repo/types';
import { TeamNav } from '@/components/TeamNav';
import { Button } from '@/components/Button';
import { getCampusDateString } from '@/lib/time/campus';

export interface CalendarClientProps {
  team: Team;
  isLead: boolean;
  initialEntries: CalendarEntry[];
}

export function CalendarClient({ team, isLead, initialEntries }: CalendarClientProps) {
  const [activeView, setActiveView] = useState<'agenda' | 'week'>('agenda');

  // Base date for navigation (seed demo anchor: 2026-11-12)
  const [baseDate, setBaseDate] = useState<Date>(new Date('2026-11-12T00:00:00Z'));

  // Filters
  const [showTasks, setShowTasks] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const [showSessions, setShowSessions] = useState(true);

  // Compute Week range (Monday to Sunday)
  const currentDay = baseDate.getUTCDay(); // 0 is Sun, 1 is Mon
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(baseDate);
  monday.setUTCDate(baseDate.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const mondayStr = getCampusDateString(monday);
  const sundayStr = getCampusDateString(sunday);

  const handlePrevWeek = () => {
    const next = new Date(baseDate);
    next.setUTCDate(next.getUTCDate() - 7);
    setBaseDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(baseDate);
    next.setUTCDate(next.getUTCDate() + 7);
    setBaseDate(next);
  };

  const handleToday = () => {
    setBaseDate(new Date('2026-11-12T00:00:00Z'));
  };

  // Filter entries
  const visibleEntries = initialEntries.filter((entry) => {
    if (entry.type === 'task' && !showTasks) return false;
    if (entry.type === 'milestone' && !showMilestones) return false;
    if (entry.type === 'session' && !showSessions) return false;

    const entryDate = entry.start.slice(0, 10);
    return entryDate >= mondayStr && entryDate <= sundayStr;
  });

  // Group entries by day for Agenda view
  const daysInWeek: { dateStr: string; label: string; dateObj: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const dateStr = getCampusDateString(d);
    const label = d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
    daysInWeek.push({ dateStr, label, dateObj: d });
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <TeamNav teamId={team.id} teamName={team.name} isLead={isLead} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Unified Calendar</h2>
          <p style={{ color: 'var(--color-slate)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Combined timeline of scheduled room sessions, task due dates, and project milestones.
          </p>
        </div>

        {/* View Switcher Tabs (design.md S12 & B9.2 M9) */}
        <div
          role="tablist"
          aria-label="Calendar view selector"
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-sand)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <button
            role="tab"
            aria-selected={activeView === 'agenda'}
            aria-controls="calendar-agenda-view"
            onClick={() => setActiveView('agenda')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeView === 'agenda' ? 'var(--color-surface)' : 'transparent',
              color: activeView === 'agenda' ? 'var(--color-stacks-green-dark)' : 'var(--color-ink)',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '36px',
            }}
          >
            Agenda (List)
          </button>
          <button
            role="tab"
            aria-selected={activeView === 'week'}
            aria-controls="calendar-week-view"
            onClick={() => setActiveView('week')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeView === 'week' ? 'var(--color-surface)' : 'transparent',
              color: activeView === 'week' ? 'var(--color-stacks-green-dark)' : 'var(--color-ink)',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '36px',
            }}
          >
            Week Grid
          </button>
        </div>
      </div>

      {/* Calendar Controls & Type Filters Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          padding: '14px 20px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {/* Navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button variant="secondary" onClick={handlePrevWeek} aria-label="Previous week">
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Previous</span>
          </Button>

          <Button variant="secondary" onClick={handleToday}>
            Today (Demo)
          </Button>

          <Button variant="secondary" onClick={handleNextWeek} aria-label="Next week">
            <span>Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Button>

          <span style={{ fontWeight: 700, fontSize: '1.05rem', marginLeft: '12px' }} className="tabular-nums">
            {mondayStr} to {sundayStr}
          </span>
        </div>

        {/* Type Filter Checkboxes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-slate)' }}>Filter:</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showSessions}
              onChange={() => setShowSessions(!showSessions)}
              style={{ width: '16px', height: '16px' }}
            />
            <Clock size={16} color="var(--color-stacks-green)" aria-hidden="true" />
            <span>Room sessions</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showTasks}
              onChange={() => setShowTasks(!showTasks)}
              style={{ width: '16px', height: '16px' }}
            />
            <CheckSquare size={16} color="var(--color-info-text)" aria-hidden="true" />
            <span>Tasks</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showMilestones}
              onChange={() => setShowMilestones(!showMilestones)}
              style={{ width: '16px', height: '16px' }}
            />
            <Flag size={16} color="var(--color-brass)" aria-hidden="true" />
            <span>Milestones</span>
          </label>
        </div>
      </div>

      {/* View 1: Agenda View (Default per design.md A4 & S12) */}
      {activeView === 'agenda' && (
        <div id="calendar-agenda-view" role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {daysInWeek.map((day) => {
            const dayEntries = visibleEntries.filter((e) => e.start.slice(0, 10) === day.dateStr);

            return (
              <section
                key={day.dateStr}
                aria-labelledby={`agenda-day-${day.dateStr}`}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-rule)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px 24px',
                }}
              >
                <h3
                  id={`agenda-day-${day.dateStr}`}
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '1.2rem',
                    borderBottom: '1px solid var(--color-rule)',
                    paddingBottom: '8px',
                  }}
                >
                  {day.label}
                </h3>

                {dayEntries.length === 0 ? (
                  <p style={{ color: 'var(--color-slate)', fontSize: '0.95rem', margin: 0, fontStyle: 'italic' }}>
                    Nothing scheduled.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dayEntries.map((item) => {
                      let typeLabel = 'Task due';
                      let icon = <CheckSquare size={18} color="var(--color-info-text)" aria-hidden="true" />;
                      let bg = 'var(--color-sand)';

                      if (item.type === 'session') {
                        typeLabel = 'Room session';
                        icon = <Clock size={18} color="var(--color-stacks-green)" aria-hidden="true" />;
                        bg = 'var(--color-green-tint)';
                      } else if (item.type === 'milestone') {
                        typeLabel = 'Milestone';
                        icon = <Flag size={18} color="var(--color-brass)" aria-hidden="true" />;
                        bg = 'var(--color-warning-bg)';
                      }

                      return (
                        <li
                          key={item.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {icon}
                            <div>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>
                                {typeLabel}:
                              </span>{' '}
                              <strong style={{ fontSize: '1rem' }}>{item.title}</strong>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.9rem', color: 'var(--color-slate)' }}>
                            {item.metadata?.assigneeName && (
                              <span>Assignee: {item.metadata.assigneeName}</span>
                            )}
                            {item.metadata?.roomName && <span>Room: {item.metadata.roomName}</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* View 2: Week Grid View (7 columns Mon-Sun) */}
      {activeView === 'week' && (
        <div
          id="calendar-week-view"
          role="tabpanel"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {daysInWeek.map((day) => {
            const dayEntries = visibleEntries.filter((e) => e.start.slice(0, 10) === day.dateStr);

            return (
              <div
                key={day.dateStr}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-rule)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 8px',
                  minHeight: '380px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--color-rule)', paddingBottom: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate)' }}>
                    {day.dateObj.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    {day.dateObj.getUTCDate()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {dayEntries.map((item) => {
                    const isSession = item.type === 'session';
                    const isMilestone = item.type === 'milestone';

                    return (
                      <div
                        key={item.id}
                        tabIndex={0}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSession
                            ? 'var(--color-green-tint)'
                            : isMilestone
                            ? 'var(--color-warning-bg)'
                            : 'var(--color-sand)',
                          borderLeft: `3px solid ${
                            isSession
                              ? 'var(--color-stacks-green)'
                              : isMilestone
                              ? 'var(--color-brass)'
                              : 'var(--color-info-text)'
                          }`,
                          fontSize: '0.85rem',
                          lineHeight: 1.2,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{item.title}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
