'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Plus, Users, CheckSquare } from 'lucide-react';
import { Booking, Profile, Task, Team } from '@/lib/repo/types';
import { TeamNav } from '@/components/TeamNav';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog } from '@/components/Dialog';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { formatSlotRangeDisplay } from '@/lib/time/campus';

export interface TeamSessionsClientProps {
  team: Team;
  isLead: boolean;
  initialSessions: Booking[];
  onCancelSession: (bookingId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function TeamSessionsClient({
  team,
  isLead,
  initialSessions,
  onCancelSession,
}: TeamSessionsClientProps) {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Booking[]>(initialSessions);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Cancel dialog
  const [sessionToCancel, setSessionToCancel] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleConfirmCancel = async () => {
    if (!sessionToCancel) return;
    setCancelLoading(true);

    try {
      const res = await onCancelSession(sessionToCancel.id);
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionToCancel.id ? { ...s, status: 'cancelled' } : s))
        );
        setSessionToCancel(null);
        showToast({
          type: 'success',
          message: 'Team session booking cancelled.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Cancellation failed',
          message: res.error || 'Failed to cancel session.',
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Network error cancelling session.',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <TeamNav teamId={team.id} teamName={team.name} isLead={isLead} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Team Study Sessions</h2>
          <p style={{ color: 'var(--color-slate)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Scheduled study room sessions with designated agenda tasks and attendees.
          </p>
        </div>

        {isLead ? (
          <Link href={`/teams/${team.id}/sessions/new`} passHref legacyBehavior>
            <Button variant="primary">
              <Plus size={18} aria-hidden="true" />
              <span>Book a team session</span>
            </Button>
          </Link>
        ) : (
          <span style={{ fontSize: '0.9rem', color: 'var(--color-slate)', fontStyle: 'italic' }}>
            Only your Team Lead can book team sessions.
          </span>
        )}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          message="No study sessions booked yet for this team."
          actionText={isLead ? 'Book a team session' : undefined}
          actionHref={isLead ? `/teams/${team.id}/sessions/new` : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sessions.map((s) => {
            const isExpanded = expandedId === s.id;
            const attendeeCount = s.attendees?.length || 0;
            const taskCount = s.tasks?.length || 0;

            return (
              <div
                key={s.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-rule)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px 24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-stacks-green-dark)' }}>
                        {s.room?.name || 'Room'}
                      </span>
                      <StatusBadge type="booking" value={s.status} />
                    </div>
                    <div style={{ fontSize: '1rem', color: 'var(--color-ink)', marginTop: '4px' }}>
                      {formatSlotRangeDisplay(s.starts_at, s.ends_at)}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginTop: '4px' }}>
                      {s.room?.building}, Floor {s.room?.floor} | {attendeeCount} attendees | {taskCount} agenda tasks
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Button
                      variant="secondary"
                      onClick={() => toggleExpand(s.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`session-details-${s.id}`}
                    >
                      <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                      {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                    </Button>

                    {isLead && s.status === 'confirmed' && (
                      <Button
                        variant="secondary"
                        onClick={() => setSessionToCancel(s)}
                        style={{ color: 'var(--color-error-text)' }}
                      >
                        Cancel session
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Disclosure Panel (M20) */}
                {isExpanded && (
                  <div
                    id={`session-details-${s.id}`}
                    style={{
                      borderTop: '1px solid var(--color-rule)',
                      marginTop: '16px',
                      paddingTop: '16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '24px',
                    }}
                  >
                    {/* Attendees Column */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '8px' }}>
                        <Users size={18} color="var(--color-stacks-green)" aria-hidden="true" />
                        <span>Attendees ({attendeeCount})</span>
                      </div>
                      <ul style={{ paddingLeft: '20px', fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                        {s.attendees?.map((a: Profile) => (
                          <li key={a.id} style={{ margin: '4px 0' }}>
                            {a.full_name} ({a.email})
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Agenda Tasks Column */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '8px' }}>
                        <CheckSquare size={18} color="var(--color-stacks-green)" aria-hidden="true" />
                        <span>Agenda Tasks ({taskCount})</span>
                      </div>
                      {taskCount > 0 ? (
                        <ul style={{ paddingLeft: '20px', fontSize: '0.95rem' }}>
                          {s.tasks?.map((t: Task) => (
                            <li key={t.id} style={{ margin: '4px 0' }}>
                              <strong>{t.title}</strong> ({t.points} pts)
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: '0.95rem', color: 'var(--color-slate)', fontStyle: 'italic' }}>
                          No specific agenda tasks attached.
                        </p>
                      )}

                      {s.session_note && (
                        <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: 'var(--color-sand)', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'block', color: 'var(--color-slate)' }}>
                            Session Note:
                          </span>
                          <span style={{ fontSize: '0.95rem' }}>{s.session_note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Session Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(sessionToCancel)}
        onClose={() => setSessionToCancel(null)}
        title="Cancel Team Session"
      >
        {sessionToCancel && (
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '16px' }}>
              Cancel session for <strong>{team.name}</strong> at <strong>{sessionToCancel.room?.name}</strong> on{' '}
              <strong>{formatSlotRangeDisplay(sessionToCancel.starts_at, sessionToCancel.ends_at)}</strong>?
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '24px' }}>
              The room slot will be released back to the campus pool.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setSessionToCancel(null)} disabled={cancelLoading}>
                Keep session
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancel}
                loading={cancelLoading}
                loadingText="Cancelling…"
              >
                Cancel session
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
