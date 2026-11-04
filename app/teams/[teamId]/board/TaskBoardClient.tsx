'use client';

import React, { useState } from 'react';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { Task, TaskStatus, Team, TeamMember } from '@/lib/repo/types';
import { TeamNav } from '@/components/TeamNav';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { TextArea } from '@/components/TextArea';
import { Select } from '@/components/Select';
import { Dialog } from '@/components/Dialog';
import { FormErrorSummary } from '@/components/FormErrorSummary';
import { useToast } from '@/components/Toast';
import { getCampusDateString } from '@/lib/time/campus';

const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'done', label: 'Done' },
];

export interface TaskBoardClientProps {
  team: Team;
  isLead: boolean;
  currentUserId: string;
  members: TeamMember[];
  initialTasks: Task[];
  onCreateTask: (input: {
    teamId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    points: number;
  }) => Promise<{ ok: boolean; task?: Task; error?: string }>;
  onUpdateTask: (
    taskId: string,
    patch: Partial<Task>,
    seenUpdatedAt: string
  ) => Promise<{ ok: boolean; task?: Task; error?: string }>;
  onMoveTask: (
    taskId: string,
    newStatus: TaskStatus,
    seenUpdatedAt: string
  ) => Promise<{ ok: boolean; task?: Task; error?: string }>;
  onDeleteTask: (taskId: string) => Promise<{ ok: boolean; error?: string }>;
  onRestoreTask: (taskId: string) => Promise<{ ok: boolean; task?: Task; error?: string }>;
}

export function TaskBoardClient({
  team,
  isLead,
  currentUserId,
  members,
  initialTasks,
  onCreateTask,
  onUpdateTask,
  onMoveTask,
  onDeleteTask,
  onRestoreTask,
}: TaskBoardClientProps) {
  const { showToast } = useToast();
  const today = getCampusDateString(new Date());

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterDue, setFilterDue] = useState<'all' | 'week' | 'overdue'>('all');
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Dialogs
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalErrors, setModalErrors] = useState<{ fieldId?: string; message: string }[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAssignee, setFormAssignee] = useState<string>(currentUserId);
  const [formDueDate, setFormDueDate] = useState('');
  const [formPoints, setFormPoints] = useState<number>(1);

  // Delete Confirmation Dialog
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openCreateDialog = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormAssignee(currentUserId);
    setFormDueDate('');
    setFormPoints(1);
    setModalErrors([]);
    setTaskModalOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormAssignee(task.assignee_id || '');
    setFormDueDate(task.due_date || '');
    setFormPoints(task.points);
    setModalErrors([]);
    setTaskModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalErrors([]);

    if (!formTitle.trim()) {
      setModalErrors([{ fieldId: 'task-title-input', message: 'Task title is required.' }]);
      return;
    }

    setModalLoading(true);

    try {
      if (editingTask) {
        // Update task
        const res = await onUpdateTask(
          editingTask.id,
          {
            title: formTitle,
            description: formDesc,
            assignee_id: formAssignee || null,
            due_date: formDueDate || null,
            points: formPoints,
          },
          editingTask.updated_at
        );

        if (res.ok && res.task) {
          setTasks((prev) => prev.map((t) => (t.id === res.task!.id ? res.task! : t)));
          setTaskModalOpen(false);
          setLiveAnnouncement(`Task "${res.task.title}" updated.`);
          showToast({ type: 'success', message: 'Task updated successfully.' });
        } else {
          setModalErrors([{ message: res.error || 'Failed to update task.' }]);
        }
      } else {
        // Create task
        const res = await onCreateTask({
          teamId: team.id,
          title: formTitle,
          description: formDesc,
          assigneeId: formAssignee || undefined,
          dueDate: formDueDate || undefined,
          points: formPoints,
        });

        if (res.ok && res.task) {
          setTasks((prev) => [...prev, res.task!]);
          setTaskModalOpen(false);
          setLiveAnnouncement(`Task "${res.task.title}" created.`);
          showToast({ type: 'success', message: 'Task created successfully.' });
        } else {
          setModalErrors([{ message: res.error || 'Failed to create task.' }]);
        }
      }
    } catch {
      setModalErrors([{ message: 'Network error saving task.' }]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleMoveStatus = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;

    try {
      const res = await onMoveTask(task.id, newStatus, task.updated_at);
      if (res.ok && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === res.task!.id ? res.task! : t)));
        const colLabel = STATUS_COLUMNS.find((c) => c.id === newStatus)?.label || newStatus;
        setLiveAnnouncement(`Task "${task.title}" moved to ${colLabel}.`);
        showToast({
          type: 'success',
          message: `Moved "${task.title}" to ${colLabel}.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Cannot move task',
          message: res.error || 'Failed to update task status.',
        });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Network error updating task.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setDeleteLoading(true);

    const target = taskToDelete;
    try {
      const res = await onDeleteTask(target.id);
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== target.id));
        setTaskToDelete(null);
        setLiveAnnouncement(`Task "${target.title}" deleted.`);

        // 8-second soft-delete Undo option (plan.md F3 & design.md D2)
        showToast({
          type: 'success',
          title: 'Task deleted',
          message: `"${target.title}" was moved to trash.`,
          undoLabel: 'Undo delete',
          undoAction: async () => {
            const undoRes = await onRestoreTask(target.id);
            if (undoRes.ok && undoRes.task) {
              setTasks((prev) => [...prev, undoRes.task!]);
              setLiveAnnouncement(`Task "${undoRes.task.title}" restored.`);
              showToast({ type: 'success', message: `Restored "${undoRes.task.title}".` });
            } else {
              showToast({ type: 'error', message: 'Could not restore task.' });
            }
          },
        });
      } else {
        showToast({ type: 'error', message: res.error || 'Failed to delete task.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error deleting task.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterAssignee !== 'all' && t.assignee_id !== filterAssignee) return false;

    if (filterDue === 'overdue') {
      return t.due_date && t.due_date < today && t.status !== 'done';
    }
    if (filterDue === 'week') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = getCampusDateString(nextWeek);
      return t.due_date && t.due_date >= today && t.due_date <= nextWeekStr;
    }
    return true;
  });

  return (
    <div>
      <TeamNav teamId={team.id} teamName={team.name} isLead={isLead} />

      {/* Screen Reader Live Region for Announcements (design.md E2 & B9.2) */}
      <div aria-live="polite" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
        {liveAnnouncement}
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-rule)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Assignee Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filter-assignee" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              Assignee:
            </label>
            <select
              id="filter-assignee"
              value={filterAssignee}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterAssignee(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-control-border)',
                background: 'var(--color-surface)',
                fontSize: '0.95rem',
              }}
            >
              <option value="all">All members</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || 'Member'}
                </option>
              ))}
            </select>
          </div>

          {/* Due Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="filter-due" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              Due:
            </label>
            <select
              id="filter-due"
              value={filterDue}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterDue(e.target.value as 'all' | 'week' | 'overdue')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-control-border)',
                background: 'var(--color-surface)',
                fontSize: '0.95rem',
              }}
            >
              <option value="all">All due dates</option>
              <option value="week">Due this week</option>
              <option value="overdue">Overdue only</option>
            </select>
          </div>
        </div>

        <Button variant="primary" onClick={openCreateDialog}>
          <Plus size={18} aria-hidden="true" />
          <span>New task</span>
        </Button>
      </div>

      {/* 4 Column Task Board (design.md S10) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(240px, 1fr))',
          gap: '16px',
          alignItems: 'start',
        }}
        className="task-board-columns"
      >
        {STATUS_COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <section
              key={col.id}
              aria-labelledby={`col-heading-${col.id}`}
              style={{
                backgroundColor: 'var(--color-sand)',
                border: '1px solid var(--color-rule)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '400px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 id={`col-heading-${col.id}`} style={{ margin: 0, fontSize: '1.15rem' }}>
                  {col.label}
                </h2>
                <span
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {colTasks.length}
                </span>
              </div>

              {colTasks.length === 0 ? (
                <div
                  style={{
                    padding: '24px 12px',
                    textAlign: 'center',
                    color: 'var(--color-slate)',
                    fontSize: '0.9rem',
                    fontStyle: 'italic',
                  }}
                >
                  No tasks in {col.label.toLowerCase()}.
                </div>
              ) : (
                colTasks.map((task) => {
                  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
                  const canEdit = isLead || task.assignee_id === currentUserId;
                  const canDelete = isLead;

                  return (
                    <div
                      key={task.id}
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: isOverdue ? '2px solid var(--color-error-text)' : '1px solid var(--color-rule)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Title button for modal edit */}
                      <button
                        type="button"
                        onClick={() => openEditDialog(task)}
                        style={{
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: 'var(--color-ink)',
                            textDecoration: 'underline',
                            display: 'block',
                          }}
                        >
                          {task.title}
                        </span>
                      </button>

                      <div style={{ fontSize: '0.85rem', color: 'var(--color-slate)' }}>
                        Assignee: <strong>{task.assignee?.full_name || 'Unassigned'}</strong>
                      </div>

                      {/* Due date & points */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        {task.due_date ? (
                          isOverdue ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'var(--color-error-text)',
                                fontWeight: 700,
                              }}
                            >
                              <AlertTriangle size={14} aria-hidden="true" />
                              <span>Overdue ({task.due_date})</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-slate)' }}>Due: {task.due_date}</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--color-slate)', fontStyle: 'italic' }}>No deadline</span>
                        )}

                        <span
                          style={{
                            backgroundColor: 'var(--color-sand)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                          }}
                        >
                          {task.points} pts
                        </span>
                      </div>

                      {/* Accessible Keyboard-friendly "Move to" Select Control (design.md S10) */}
                      <div
                        style={{
                          borderTop: '1px solid var(--color-rule)',
                          paddingTop: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                          <label
                            htmlFor={`move-select-${task.id}`}
                            style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate)' }}
                          >
                            Move to:
                          </label>
                          <select
                            id={`move-select-${task.id}`}
                            value={task.status}
                            disabled={!canEdit}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleMoveStatus(task, e.target.value as TaskStatus)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-control-border)',
                              fontSize: '0.85rem',
                              background: 'var(--color-surface)',
                              flex: 1,
                            }}
                          >
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="in_review">In review</option>
                            <option value="done">Done</option>
                          </select>
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setTaskToDelete(task)}
                            aria-label={`Delete task ${task.title}`}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '4px',
                              cursor: 'pointer',
                              color: 'var(--color-error-text)',
                            }}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          );
        })}
      </div>

      {/* Create / Edit Task Dialog */}
      <Dialog
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'New Task'}
      >
        <form onSubmit={handleModalSubmit} noValidate>
          {modalErrors.length > 0 && <FormErrorSummary errors={modalErrors} />}

          <TextField
            id="task-title-input"
            label="Title"
            required
            maxLength={80}
            placeholder="e.g. Draft questionnaire for library study rooms"
            value={formTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTitle(e.target.value)}
          />

          <TextArea
            id="task-desc-input"
            label="Description (optional)"
            maxLength={500}
            currentCount={formDesc.length}
            placeholder="Details, acceptance criteria, or links"
            value={formDesc}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormDesc(e.target.value)}
          />

          <Select
            id="task-assignee-select"
            label="Assignee"
            value={formAssignee}
            disabled={!isLead && editingTask !== null}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormAssignee(e.target.value)}
            options={[
              { value: '', label: 'Unassigned' },
              ...members.map((m) => ({
                value: m.user_id,
                label: m.profile?.full_name || 'Member',
              })),
            ]}
            helperText={!isLead ? 'Members can assign tasks to themselves.' : undefined}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <TextField
              id="task-due-date"
              label="Due date"
              type="date"
              value={formDueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDueDate(e.target.value)}
            />

            <Select
              id="task-points-select"
              label="Effort points"
              value={formPoints.toString()}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormPoints(parseInt(e.target.value, 10))}
              options={[
                { value: '1', label: '1 pt — Very small task' },
                { value: '2', label: '2 pts — Small task' },
                { value: '3', label: '3 pts — Medium task' },
                { value: '4', label: '4 pts — Large task' },
                { value: '5', label: '5 pts — Major milestone' },
              ]}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setTaskModalOpen(false)} disabled={modalLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading} loadingText="Saving…">
              {editingTask ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Task Confirmation Dialog (design.md D2) */}
      <Dialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        title="Delete Task"
      >
        {taskToDelete && (
          <div>
            <p style={{ fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '16px' }}>
              Are you sure you want to delete <strong>&quot;{taskToDelete.title}&quot;</strong>?
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate)', marginBottom: '24px' }}>
              The task will be soft-deleted and removed from the active board. You can undo this deletion within 8 seconds.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setTaskToDelete(null)} disabled={deleteLoading}>
                Keep task
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                loading={deleteLoading}
                loadingText="Deleting…"
              >
                Delete task
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
