'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Key, Calendar, ArrowRight } from 'lucide-react';
import { Team } from '../../lib/repo/types';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { FormErrorSummary } from '../../components/FormErrorSummary';
import { EmptyState } from '../../components/EmptyState';

export interface TeamsClientProps {
  initialTeams: (Team & { userRole: 'lead' | 'member' })[];
  onCreateTeam: (name: string, project: string) => Promise<{ ok: boolean; team?: Team; error?: string }>;
  onJoinTeam: (code: string) => Promise<{ ok: boolean; team?: Team; error?: string }>;
}

export function TeamsClient({ initialTeams, onCreateTeam, onJoinTeam }: TeamsClientProps) {
  const router = useRouter();
  const [teams, setTeams] = useState(initialTeams);

  // Create team form state
  const [teamName, setTeamName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createErrors, setCreateErrors] = useState<{ fieldId?: string; message: string }[]>([]);

  // Join team form state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinErrors, setJoinErrors] = useState<{ fieldId?: string; message: string }[]>([]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrors([]);

    const errs: { fieldId?: string; message: string }[] = [];
    if (!teamName.trim()) errs.push({ fieldId: 'team-name-input', message: 'Team name is required.' });
    if (!projectName.trim()) errs.push({ fieldId: 'project-name-input', message: 'Project name is required.' });

    if (errs.length > 0) {
      setCreateErrors(errs);
      return;
    }

    setCreateLoading(true);
    try {
      const res = await onCreateTeam(teamName, projectName);
      if (res.ok && res.team) {
        setTeams((prev) => [...prev, { ...res.team!, userRole: 'lead' }]);
        setTeamName('');
        setProjectName('');
        router.push(`/teams/${res.team.id}`);
      } else {
        setCreateErrors([{ message: res.error || 'Failed to create team.' }]);
      }
    } catch {
      setCreateErrors([{ message: 'Network error creating team.' }]);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinErrors([]);

    if (!joinCode.trim()) {
      setJoinErrors([{ fieldId: 'join-code-input', message: 'Enter a 6-character team join code.' }]);
      return;
    }
    if (joinCode.trim().length !== 6) {
      setJoinErrors([{ fieldId: 'join-code-input', message: 'Team join code must be exactly 6 characters.' }]);
      return;
    }

    setJoinLoading(true);
    try {
      const res = await onJoinTeam(joinCode.trim());
      if (res.ok && res.team) {
        setTeams((prev) => [...prev, { ...res.team!, userRole: 'member' }]);
        setJoinCode('');
        router.push(`/teams/${res.team.id}`);
      } else {
        setJoinErrors([{ message: res.error || 'Invalid team join code.' }]);
      }
    } catch {
      setJoinErrors([{ message: 'Network error joining team.' }]);
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <h1>Your teams</h1>
      <p style={{ color: 'var(--color-slate)', marginBottom: '32px' }}>
        Collaborate with peers on course projects, manage tasks, and coordinate room study sessions.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)',
          gap: '32px',
          alignItems: 'start',
        }}
        className="teams-grid-layout"
      >
        {/* Teams List (Left) */}
        <section aria-labelledby="teams-list-heading">
          <h2 id="teams-list-heading" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
            Active Projects ({teams.length})
          </h2>

          {teams.length === 0 ? (
            <EmptyState message="You are not in a team yet. Create one or join with a code from your Team Lead." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {teams.map((t) => (
                <div
                  key={t.id}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-rule)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{t.name}</h3>
                      <p style={{ color: 'var(--color-slate)', fontSize: '0.95rem', margin: '2px 0 0 0' }}>
                        Project: <strong>{t.project_name}</strong>
                      </p>
                    </div>

                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: t.userRole === 'lead' ? 'var(--color-green-tint)' : 'var(--color-sand)',
                        color: t.userRole === 'lead' ? 'var(--color-stacks-green-dark)' : 'var(--color-ink)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                      }}
                    >
                      {t.userRole === 'lead' ? 'Team Lead' : 'Member'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '20px',
                      fontSize: '0.95rem',
                      color: 'var(--color-slate)',
                      borderTop: '1px solid var(--color-rule)',
                      paddingTop: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} aria-hidden="true" />
                      <span>{t.member_count || 1} members</span>
                    </div>

                    {t.next_session ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} aria-hidden="true" />
                        <span>Next: {t.next_session.room_name}</span>
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic' }}>No session booked</span>
                    )}
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <Link href={`/teams/${t.id}`} style={{ textDecoration: 'none' }}>
                      <Button variant="secondary" style={{ width: '100%', justifyContent: 'space-between' }}>
                        <span>Open team workspace</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Action Panels (Right) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Create Team Panel */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Plus size={20} color="var(--color-stacks-green)" aria-hidden="true" />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Create a team</h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
              You will automatically become the Team Lead and receive a 6-character code for your peers.
            </p>

            {createErrors.length > 0 && <FormErrorSummary errors={createErrors} />}

            <form onSubmit={handleCreateSubmit} noValidate>
              <TextField
                id="team-name-input"
                label="Team name"
                required
                placeholder="e.g. Survey Project Team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />

              <TextField
                id="project-name-input"
                label="Course / project title"
                required
                placeholder="e.g. Campus Accessibility Survey"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                loading={createLoading}
                loadingText="Creating team…"
                style={{ width: '100%' }}
              >
                Create team
              </Button>
            </form>
          </div>

          {/* Join with Code Panel */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-rule)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Key size={20} color="var(--color-stacks-green)" aria-hidden="true" />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Join with a code</h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '16px' }}>
              Enter the 6-character code provided by your Team Lead (e.g. <span style={{ fontWeight: 700 }}>SURV26</span>).
            </p>

            {joinErrors.length > 0 && <FormErrorSummary errors={joinErrors} />}

            <form onSubmit={handleJoinSubmit} noValidate>
              <TextField
                id="join-code-input"
                label="Team join code"
                required
                maxLength={6}
                placeholder="e.g. SURV26"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
              />

              <Button
                type="submit"
                variant="secondary"
                loading={joinLoading}
                loadingText="Joining team…"
                style={{ width: '100%' }}
              >
                Join team
              </Button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
