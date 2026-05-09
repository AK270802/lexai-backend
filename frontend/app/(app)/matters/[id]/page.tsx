'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Users,
  CheckSquare,
  Flag,
  Activity,
  Calendar,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { mattersApi } from '@/lib/api/matters';
import { documentsApi } from '@/lib/api/documents';
import type { Matter, Task, TaskStatus, Milestone, Document, MatterStatus } from '@/lib/types';
import {
  cn,
  formatDate,
  formatRelative,
  statusBadgeClass,
  parseErrorMessage,
  initials,
  avatarColor,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Tab definition ───────────────────────────────────────────────────────────

type TabId = 'overview' | 'documents' | 'tasks' | 'milestones';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'milestones', label: 'Milestones', icon: Flag },
];

const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PARSE_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none',
        statusBadgeClass(status)
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ matter }: { matter: Matter }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {matter.description ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {matter.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Parties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Parties ({matter.parties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matter.parties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No parties listed.</p>
          ) : (
            <div className="divide-y divide-border">
              {matter.parties.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                      avatarColor(p.name)
                    )}
                  >
                    {initials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    {p.email && (
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    )}
                  </div>
                  {p.role && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {p.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Created
              </p>
              <p className="text-foreground">{formatDate(matter.created_at)}</p>
              <p className="text-xs text-muted-foreground">{formatRelative(matter.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Last Updated
              </p>
              <p className="text-foreground">{formatDate(matter.updated_at)}</p>
              <p className="text-xs text-muted-foreground">{formatRelative(matter.updated_at)}</p>
            </div>
            {matter.created_by && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Created By
                </p>
                <p className="text-foreground">{matter.created_by.name}</p>
                <p className="text-xs text-muted-foreground">{matter.created_by.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ matterId }: { matterId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    documentsApi
      .list({ matter_id: matterId })
      .then(setDocs)
      .catch((e) => setError(parseErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [matterId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Documents ({docs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No documents linked to this matter</p>
            <Link href="/documents/upload">
              <Button size="sm" variant="outline" className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Upload Document
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {docs.map((doc) => (
              <Link
                key={doc.id}
                href={`/contracts/${doc.id}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:text-primary transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary truncate transition-colors">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none flex-shrink-0',
                    statusBadgeClass(doc.parse_status)
                  )}
                >
                  {PARSE_STATUS_LABEL[doc.parse_status] ?? doc.parse_status}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ matterId }: { matterId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New task form
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDue, setNewDue] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    mattersApi
      .listTasks(matterId)
      .then(setTasks)
      .catch((e) => setError(parseErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const task = await mattersApi.createTask({
        matter: matterId,
        title: newTitle.trim(),
        assigned_to: newAssignee.trim() || undefined,
        due_date: newDue || undefined,
        status: 'todo',
      });
      setTasks((prev) => [...prev, task]);
      setNewTitle('');
      setNewAssignee('');
      setNewDue('');
      setShowForm(false);
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const cycleStatus = async (task: Task) => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    try {
      const updated = await mattersApi.updateTask(task.id, { status: next });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      setError(parseErrorMessage(e));
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await mattersApi.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(parseErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const grouped = TASK_STATUSES.map((s) => ({
    ...s,
    tasks: tasks.filter((t) => t.status === s.value),
  }));

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add task */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Task
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Task title *</label>
              <Input
                placeholder="Task description…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={adding}
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assigned to</label>
                <Input
                  placeholder="Name or email"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  disabled={adding}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Due date</label>
                <Input
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  disabled={adding}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setNewTitle('');
                }}
                disabled={adding}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={addTask}
                disabled={adding || !newTitle.trim()}
                className="gap-1.5"
              >
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Add Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {grouped.map((col) => (
          <div key={col.value} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {col.label}
              </p>
              <span className="text-xs text-muted-foreground">{col.tasks.length}</span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {col.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-card p-3 text-sm space-y-2 hover:border-border/80 transition-colors"
                >
                  <p className="font-medium text-foreground leading-snug">{task.title}</p>
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(task.due_date)}
                    </div>
                  )}
                  {task.assigned_to && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white',
                          avatarColor(task.assigned_to.name)
                        )}
                      >
                        {initials(task.assigned_to.name)}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {task.assigned_to.name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => cycleStatus(task)}
                      className="hover:opacity-80 transition-opacity"
                      title="Click to advance status"
                    >
                      <TaskStatusBadge status={task.status} />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {col.tasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border h-20 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Empty</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Milestones Tab ───────────────────────────────────────────────────────────

function MilestonesTab({ matterId }: { matterId: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    mattersApi
      .listMilestones(matterId)
      .then((ms) =>
        setMilestones(ms.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')))
      )
      .catch((e) => setError(parseErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  const addMilestone = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const ms = await mattersApi.createMilestone({
        matter: matterId,
        title: newTitle.trim(),
        due_date: newDue || undefined,
      });
      setMilestones((prev) =>
        [...prev, ms].sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
      );
      setNewTitle('');
      setNewDue('');
      setShowForm(false);
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const toggleComplete = async (ms: Milestone) => {
    try {
      const updated = await mattersApi.updateMilestone(ms.id, {
        is_completed: !ms.is_completed,
      });
      setMilestones((prev) => prev.map((m) => (m.id === ms.id ? updated : m)));
    } catch (e) {
      setError(parseErrorMessage(e));
    }
  };

  const deleteMilestone = async (id: string) => {
    try {
      await mattersApi.deleteMilestone(id);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError(parseErrorMessage(e));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const upcoming = milestones.filter((m) => !m.is_completed);
  const completed = milestones.filter((m) => m.is_completed);

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Milestone
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Milestone title *</label>
              <Input
                placeholder="e.g., Filing deadline"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={adding}
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Due date</label>
              <Input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                disabled={adding}
                className="h-8 text-sm w-full"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setNewTitle('');
                }}
                disabled={adding}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={addMilestone}
                disabled={adding || !newTitle.trim()}
                className="gap-1.5"
              >
                {adding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {milestones.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Flag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No milestones yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Upcoming
              </p>
              <Card>
                <CardContent className="py-2">
                  <div className="divide-y divide-border">
                    {upcoming.map((ms) => (
                      <MilestoneRow
                        key={ms.id}
                        milestone={ms}
                        onToggle={() => toggleComplete(ms)}
                        onDelete={() => deleteMilestone(ms.id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Completed
              </p>
              <Card>
                <CardContent className="py-2">
                  <div className="divide-y divide-border">
                    {completed.map((ms) => (
                      <MilestoneRow
                        key={ms.id}
                        milestone={ms}
                        onToggle={() => toggleComplete(ms)}
                        onDelete={() => deleteMilestone(ms.id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MilestoneRow({
  milestone,
  onToggle,
  onDelete,
}: {
  milestone: Milestone;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isOverdue =
    !milestone.is_completed &&
    milestone.due_date &&
    new Date(milestone.due_date) < new Date();

  return (
    <div className="flex items-center gap-3 py-3 first:pt-2 last:pb-2">
      <button
        onClick={onToggle}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
          milestone.is_completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-border hover:border-primary'
        )}
      >
        {milestone.is_completed && <Check className="w-3 h-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            milestone.is_completed
              ? 'line-through text-muted-foreground'
              : 'text-foreground'
          )}
        >
          {milestone.title}
        </p>
        {milestone.due_date && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs mt-0.5',
              isOverdue ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            <Clock className="w-3 h-3" />
            {formatDate(milestone.due_date)}
            {isOverdue && ' — overdue'}
          </div>
        )}
      </div>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Inline Edit Header ───────────────────────────────────────────────────────

function MatterHeader({
  matter,
  onUpdated,
}: {
  matter: Matter;
  onUpdated: (updated: Matter) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(matter.title);
  const [status, setStatus] = useState<MatterStatus>(matter.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await mattersApi.update(matter.id, {
        title: title.trim(),
        status,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setTitle(matter.title);
    setStatus(matter.status);
    setEditing(false);
    setError(null);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {editing ? (
          <div className="flex-1 space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold h-10"
              autoFocus
              disabled={saving}
            />
            <div className="flex items-center gap-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MatterStatus)}
                disabled={saving}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={save}
                  disabled={saving || !title.trim()}
                  className="gap-1.5 h-8"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancel}
                  disabled={saving}
                  className="h-8"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-start gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
              {matter.title}
            </h1>
            <span
              className={cn(
                'mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-none flex-shrink-0',
                statusBadgeClass(matter.status)
              )}
            >
              {matter.status.replace('_', ' ')}
            </span>
          </div>
        )}

        {!editing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            className="gap-1.5 self-start"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        )}
      </div>

      {/* Parties summary */}
      {matter.parties.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {matter.parties.map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white',
                  avatarColor(p.name)
                )}
              >
                {initials(p.name)}
              </div>
              {p.name}
              {p.role && ` · ${p.role}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [matter, setMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    mattersApi
      .get(id)
      .then(setMatter)
      .catch((e) => setError(parseErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-7 w-64" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !matter) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/matters">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Matter not found</h1>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error ?? 'The matter could not be loaded.'}
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/matters')}>
          Back to Matters
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/matters" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Matters
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium truncate max-w-xs">{matter.title}</span>
      </div>

      {/* Header */}
      <MatterHeader matter={matter} onUpdated={setMatter} />

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab matter={matter} />}
        {activeTab === 'documents' && <DocumentsTab matterId={id} />}
        {activeTab === 'tasks' && <TasksTab matterId={id} />}
        {activeTab === 'milestones' && <MilestonesTab matterId={id} />}
      </div>
    </div>
  );
}
