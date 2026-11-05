'use client';

import React, { useState } from 'react';
import { Flag, Plus, CheckCircle2, Edit3 } from 'lucide-react';
import { Milestone, Task, Team } from '@/lib/repo/types';
import { TeamNav } from '@/components/TeamNav';
import { Button } from '@/components/Button';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog } from '@/components/Dialog';
import { TextField } from '@/components/TextField';
import { TextArea } from '@/components/TextArea';
import { FormErrorSummary } from '@/components/FormErrorSummary';
import { useToast } from '@/components/Toast';
import { getCampusDateString } from '@/lib/time/campus';

export interface MilestonesClientProps {
  team: Team;
  isLead: boolean;
  initialMilestones: Milestone[];
  teamTasks: Task[];
  onCreateMilestone: (input: {
    teamId: string;
    name: string;
    description?: string;
    dueDate: string;
    taskIds: string[];
  }) => Promise<{ ok: boolean; milestone?: Milestone; error?: string }>;
  onUpdateMilestone: (
    id: string,
    patch: Partial<Milestone>,
    taskIds?: string[]
  ) => Promise<{ ok: boolean; milestone?: Milestone; error?: string }>;
  onCompleteMilestone: (id: string) => Promise<{ ok: boolean; milestone?: Milestone; error?: string }>;
}

export function MilestonesClient({
  team,
  isLead,
  initialMilestones,
  teamTasks,
  onCreateMilestone,
  onUpdateMilestone,
  onCompleteMilestone,
}: MilestonesClientProps) {
  const { showToast } = useToast();
  const today = getCampusDateString(new Date());

  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [modalErrors, setModalErrors] = useState<{ fieldId?: string; message: string }[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const openCreateDialog = () => {
    setEditingMilestone(null);
    setName('');
    setDescription('');
    setDueDate('');
    setSelectedTaskIds([]);
    setModalErrors([]);
    setModalOpen(true);
  };

  const openEditDialog = (ms: Milestone) => {
    setEditingMilestone(ms);
    setName(ms.name);
    setDescription(ms.description || '');
    setDueDate(ms.due_date);
    setSelectedTaskIds(ms.task_ids || []);
    setModalErrors([]);
    setModalOpen(true);
  };

  const handleTaskCheckbox = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalErrors([]);

    const errs: { fieldId?: string; message: string }[] = [];
    if (!name.trim()) {
      errs.push({ fieldId: 'ms-name-input', message: 'Milestone name is required.' });
    } else if (name.trim().length > 100) {
      errs.push({ fieldId: 'ms-name-input', message: 'Milestone name cannot exceed 100 characters.' });
    }

    if (!dueDate) {
      errs.push({ fieldId: 'ms-due-date-input', message: 'Due date is required.' });
    } else if (dueDate < today) {
      errs.push({ fieldId: 'ms-due-date-input', message: 'Milestone due date cannot be in the past.' });
    }

    if (description && description.length > 500) {
      errs.push({ fieldId: 'ms-desc-input', message: 'Description cannot exceed 500 characters.' });
    }

    if (errs.length > 0) {
      setModalErrors(errs);
      return;
    }

    setModalLoading(true);
    try {
      if (editingMilestone) {
        const res = await onUpdateMilestone(
          editingMilestone.id,
          {
            name: name.trim(),
            description: description.trim() || null,
            due_date: dueDate,
          },
          selectedTaskIds
        );

        if (res.ok && res.milestone) {
          setMilestones((prev) => prev.map((m) => (m.id === res.milestone!.id ? res.milestone! : m)));
          setModalOpen(false);
          showToast({ type: 'success', message: 'Milestone updated successfully.' });
        } else {
          setModalErrors([{ message: res.error || 'Failed to update milestone.' }]);
        }
      } else {
        const res = await onCreateMilestone({
          teamId: team.id,
          name: name.trim(),
          description: description.trim() || undefined,
          dueDate,
          taskIds: selectedTaskIds,
        });

        if (res.ok && res.milestone) {
          setMilestones((prev) => [...prev, res.milestone!]);
          setModalOpen(false);
          showToast({ type: 'success', message: 'Milestone created successfully.' });
        } else {
          setModalErrors([{ message: res.error || 'Failed to create milestone.' }]);
        }
      }
    } catch {
      setModalErrors([{ message: 'Network error saving milestone.' }]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleComplete = async (ms: Milestone) => {
    try {
      const res = await onCompleteMilestone(ms.id);
      if (res.ok && res.milestone) {
        setMilestones((prev) => prev.map((m) => (m.id === ms.id ? res.milestone! : m)));
        showToast({
          type: 'success',
          message: `Milestone "${ms.name}" marked as completed.`,
        });
      } else {
        showToast({ type: 'error', message: res.error || 'Failed to complete milestone.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error completing milestone.' });
    }
  };

  const columns: Column<Milestone>[] = [
    {
      key: 'name',
      header: 'Milestone',
      render: (m) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-ink)' }}>
            {m.name}
          </div>
          {m.description && (
            <div style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginTop: '2px' }}>
              {m.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (m) => m.due_date,
    },
    {
      key: 'progress',
      header: 'Task Progress',
      render: (m) => {
        const total = m.total_tasks || m.task_ids.length;
        const done = m.done_tasks || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <div style={{ minWidth: '160px' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              {done} of {total} linked tasks done
            </div>
            {/* Supplementary thin bar */}
            <div
              style={{
                height: '6px',
                width: '100%',
                backgroundColor: 'var(--color-sand-deep)',
                borderRadius: '3px',
                marginTop: '6px',
                overflow: 'hidden',
              }}
              aria-hidden="true"
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: 'var(--color-stacks-green)',
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => {
        const isOverdue = m.status === 'open' && m.due_date < today;
        return <StatusBadge type="milestone" value={isOverdue ? 'overdue' : m.status} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (m) => {
        if (!isLead) return <span style={{ color: 'var(--color-slate)', fontSize: '0.9rem' }}>Read-only</span>;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {m.status === 'open' && (
              <Button
                variant="secondary"
                onClick={() => handleComplete(m)}
                style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.9rem' }}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Mark completed</span>
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => openEditDialog(m)}
              style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.9rem' }}
            >
              <Edit3 size={16} aria-hidden="true" />
              <span>Edit</span>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <TeamNav teamId={team.id} teamName={team.name} isLead={isLead} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Project Milestones</h2>
          <p style={{ color: 'var(--color-slate)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Major project deadlines and aggregate completion of associated tasks.
          </p>
        </div>

        {isLead ? (
          <Button variant="primary" onClick={openCreateDialog}>
            <Plus size={18} aria-hidden="true" />
            <span>New milestone</span>
          </Button>
        ) : (
          <span style={{ fontSize: '0.9rem', color: 'var(--color-slate)', fontStyle: 'italic' }}>
            Only your Team Lead can create or edit milestones.
          </span>
        )}
      </div>

      <DataTable
        caption="Team Project Milestones and progress summary"
        columns={columns}
        data={milestones}
        keyExtractor={(m) => m.id}
        emptyMessage="No milestones configured yet for this team."
      />

      {/* Create / Edit Milestone Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMilestone ? 'Edit Milestone' : 'New Milestone'}
      >
        <form onSubmit={handleModalSubmit} noValidate>
          {modalErrors.length > 0 && <FormErrorSummary errors={modalErrors} />}

          <TextField
            id="ms-name-input"
            label="Milestone name"
            required
            maxLength={80}
            placeholder="e.g. Survey Instrument & Methodology Freeze"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField
            id="ms-due-date-input"
            label="Due date"
            type="date"
            min={today}
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <TextArea
            id="ms-desc-input"
            label="Description (optional)"
            maxLength={300}
            currentCount={description.length}
            placeholder="Expected deliverables and completion criteria"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <fieldset
            style={{
              border: '1px solid var(--color-control-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              marginTop: '16px',
              marginBottom: '20px',
            }}
          >
            <legend style={{ fontWeight: 700, padding: '0 4px', fontSize: '0.95rem' }}>
              Link team tasks ({teamTasks.length} available)
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {teamTasks.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(t.id)}
                    onChange={() => handleTaskCheckbox(t.id)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>
                    <strong>{t.title}</strong> ({t.status})
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading} loadingText="Saving…">
              {editingMilestone ? 'Save changes' : 'Create milestone'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
