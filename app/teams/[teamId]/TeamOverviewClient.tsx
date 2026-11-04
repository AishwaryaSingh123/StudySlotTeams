'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, CheckSquare, Flag, Users, Key, Trash2 } from 'lucide-react';
import { Booking, Milestone, Task, Team, TeamMember } from '../../../lib/repo/types';
import { TeamNav } from '../../../components/TeamNav';
import { Button } from '../../../components/Button';
import { StatusBadge } from '../../../components/StatusBadge';
import { Dialog } from '../../../components/Dialog';
import { useToast } from '../../../components/Toast';
import { formatSlotRangeDisplay } from '../../../lib/time/campus';

export interface TeamOverviewClientProps {
  team: Team;
  isLead: boolean;
  nextSession: Booking | null;
  dueTasks: Task[];
  nextMilestone: Milestone | null;
  members: TeamMember[];
  currentUserId: string;
  onRemoveMember: (targetUserId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function TeamOverviewClient({
  team,
  isLead,
  nextSession,
  dueTasks,
  nextMilestone,
  members: initialMembers,
  currentUserId,
  onRemoveMember,
}: TeamOverviewClientProps) {
  const { showToast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setRemoveLoading(true);

    try {
      const res = await onRemoveMember(memberToRemove.user_id);
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user_id !== memberToRemove.user_id));
        setMemberToRemove(null);
        showToast({
          type: 'success',
          message: `Removed ${memberToRemove.profile?.full_name || 'member'} from team.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Cannot remove member',
          message: res.error || 'Failed to remove member.',
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Network error removing member.',
      });
    } finally {
      setRemoveLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <TeamNav teamId={team.id} teamName={team.name} isLead={isLead} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
        {/* Next Session Section */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
          }}
          aria-labelledby="overview-session-heading"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="var(--color-stacks-green)" aria-hidden="true" />
              <h2 id="overview-session-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Next Session</h2>
            </div>
            {isLead && (
              <Link href={`/teams/${team.id}/sessions/new`} style={{ textDecoration: 'none' }}>
                <Button variant="secondary" style={{ minHeight: '36px', padding: '6px 14px' }}>
                  Book a session
                </Button>
              </Link>
            )}
          </div>

          {nextSession ? (
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-stacks-green-dark)' }}>
                {nextSession.room?.name || 'Room'} — {nextSession.room?.building}
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--color-ink)', marginTop: '4px' }}>
                {formatSlotRangeDisplay(nextSession.starts_at, nextSession.ends_at)}
              </div>
              {nextSession.purpose && (
                <div style={{ fontSize: '0.95rem', color: 'var(--color-slate)', marginTop: '4px' }}>
                  Agenda focus: {nextSession.purpose}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--color-slate)', margin: '8px 0' }}>
              No upcoming study sessions booked for this team.{' '}
              {isLead && 'You can book a room for the group on the Sessions tab.'}
            </p>
          )}
        </section>

        {/* Open Tasks Due Soon */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
          }}
          aria-labelledby="overview-tasks-heading"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={20} color="var(--color-stacks-green)" aria-hidden="true" />
              <h2 id="overview-tasks-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Open Tasks Due Soon</h2>
            </div>
            <Link href={`/teams/${team.id}/board`} style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              View task board →
            </Link>
          </div>

          {dueTasks.length === 0 ? (
            <p style={{ color: 'var(--color-slate)' }}>No open tasks due this week.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
              {dueTasks.slice(0, 5).map((task, idx) => (
                <li
                  key={task.id}
                  style={{
                    padding: '12px 0',
                    borderTop: idx > 0 ? '1px solid var(--color-rule)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{task.title}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-slate)' }}>
                      Assignee: {task.assignee?.full_name || 'Unassigned'} | Due: {task.due_date || 'No due date'} | {task.points} pts
                    </div>
                  </div>
                  <StatusBadge type="task" value={task.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Next Milestone */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
          }}
          aria-labelledby="overview-milestone-heading"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flag size={20} color="var(--color-brass)" aria-hidden="true" />
              <h2 id="overview-milestone-heading" style={{ margin: 0, fontSize: '1.25rem' }}>Next Milestone</h2>
            </div>
            <Link href={`/teams/${team.id}/milestones`} style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              All milestones →
            </Link>
          </div>

          {nextMilestone ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>{nextMilestone.name}</span>
                <StatusBadge type="milestone" value={nextMilestone.status} />
              </div>
              <p style={{ color: 'var(--color-slate)', margin: '4px 0 8px 0', fontSize: '0.95rem' }}>
                Due on <strong>{nextMilestone.due_date}</strong> • Progress:{' '}
                <strong>
                  {nextMilestone.done_tasks || 0} of {nextMilestone.total_tasks || 0} linked tasks done
                </strong>
              </p>
              {nextMilestone.description && (
                <p style={{ fontSize: '0.95rem', color: 'var(--color-ink)' }}>{nextMilestone.description}</p>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--color-slate)' }}>No upcoming project milestones open.</p>
          )}
        </section>

        {/* Team Members */}
        <section
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-rule)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
          }}
          aria-labelledby="overview-members-heading"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--color-stacks-green)" aria-hidden="true" />
              <h2 id="overview-members-heading" style={{ margin: 0, fontSize: '1.25rem' }}>
                Team Members ({members.length})
              </h2>
            </div>

            {isLead && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--color-sand)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem',
                }}
              >
                <Key size={16} color="var(--color-stacks-green-dark)" aria-hidden="true" />
                <span>Join code: <strong style={{ letterSpacing: '1px' }}>{team.join_code}</strong></span>
              </div>
            )}
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
            {members.map((m, idx) => {
              const isSelf = m.user_id === currentUserId;
              const canRemove = isLead && m.role !== 'lead';

              return (
                <li
                  key={m.user_id}
                  style={{
                    padding: '12px 0',
                    borderTop: idx > 0 ? '1px solid var(--color-rule)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {m.profile?.full_name || 'Member'} {isSelf && '(You)'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>{m.profile?.email}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: m.role === 'lead' ? 'var(--color-green-tint)' : 'var(--color-sand)',
                        color: m.role === 'lead' ? 'var(--color-stacks-green-dark)' : 'var(--color-ink)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                      }}
                    >
                      {m.role === 'lead' ? 'Team Lead' : 'Member'}
                    </span>

                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(m)}
                        aria-label={`Remove ${m.profile?.full_name || 'member'} from team`}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '6px',
                          color: 'var(--color-error-text)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Remove Member Confirmation Dialog (design.md D2) */}
      <Dialog
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        title="Remove Team Member"
      >
        {memberToRemove && (
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '16px' }}>
              Remove <strong>{memberToRemove.profile?.full_name || 'this member'}</strong> from{' '}
              <strong>{team.name}</strong>?
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '24px' }}>
              Any tasks currently assigned to this member will remain in the project but become unassigned. The student can rejoin later with the team join code.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setMemberToRemove(null)} disabled={removeLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmRemove}
                loading={removeLoading}
                loadingText="Removing…"
              >
                Remove member
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
