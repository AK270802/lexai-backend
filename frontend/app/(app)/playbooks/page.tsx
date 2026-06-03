'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Loader2,
  X,
  Save,
  CheckCircle2,
  Archive,
  FileText,
} from 'lucide-react';
import { playbooksApi } from '@/lib/api/playbooks';
import type { Playbook, PlaybookStatus } from '@/lib/types';
import { useAuth } from '@/stores/use-auth';
import { cn, formatDate, parseErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: PlaybookStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...STATUS_OPTIONS,
];

function StatusBadge({ status }: { status: PlaybookStatus }) {
  const map: Record<PlaybookStatus, { cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    draft: { cls: 'bg-muted text-muted-foreground', icon: FileText },
    active: { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400', icon: CheckCircle2 },
    archived: { cls: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400', icon: Archive },
  };
  const { cls, icon: Icon } = map[status] ?? map.draft;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', cls)}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface PlaybookForm {
  name: string;
  description: string;
  status: PlaybookStatus;
  rulesJson: string;
}

function emptyForm(): PlaybookForm {
  return { name: '', description: '', status: 'draft', rulesJson: '[]' };
}

function playbookToForm(p: Playbook): PlaybookForm {
  return {
    name: p.name,
    description: p.description ?? '',
    status: p.status,
    rulesJson: JSON.stringify(p.rules ?? [], null, 2),
  };
}

interface PlaybookFormPanelProps {
  form: PlaybookForm;
  onChange: (f: PlaybookForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
  error: string | null;
}

function PlaybookFormPanel({ form, onChange, onSubmit, onCancel, saving, isEdit, error }: PlaybookFormPanelProps) {
  const [jsonError, setJsonError] = useState<string | null>(null);

  const set =
    (k: keyof PlaybookForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange({ ...form, [k]: e.target.value });

  const handleRulesChange = (val: string) => {
    onChange({ ...form, rulesJson: val });
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON — fix before saving.');
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Playbook' : 'Create Playbook'}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pb-name">Name *</Label>
          <Input
            id="pb-name"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Enterprise NDA Playbook"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pb-status">Status</Label>
          <select
            id="pb-status"
            value={form.status}
            onChange={set('status')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pb-desc">Description</Label>
        <Textarea
          id="pb-desc"
          rows={3}
          value={form.description}
          onChange={set('description')}
          placeholder="Describe the purpose and scope of this playbook..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pb-rules">Rules (JSON array)</Label>
        <Textarea
          id="pb-rules"
          rows={10}
          resize="vertical"
          value={form.rulesJson}
          onChange={(e) => handleRulesChange(e.target.value)}
          className="font-mono text-xs"
          placeholder={'[\n  {\n    "clause_type": "confidentiality",\n    "deviation_threshold": 0.3,\n    "preferred_clause_ids": []\n  }\n]'}
        />
        {jsonError && (
          <p className="text-xs text-destructive">{jsonError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Each rule may contain: <code className="font-mono">clause_type</code>, <code className="font-mono">deviation_threshold</code>, <code className="font-mono">preferred_clause_ids</code>.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={onSubmit} disabled={saving || !!jsonError} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save Changes' : 'Create Playbook'}
        </Button>
      </div>
    </div>
  );
}

// ─── Playbook Card ────────────────────────────────────────────────────────────

interface PlaybookCardProps {
  playbook: Playbook;
  canEdit: boolean;
  onEdit: (p: Playbook) => void;
  onDelete: (p: Playbook) => void;
}

function PlaybookCard({ playbook, canEdit, onEdit, onDelete }: PlaybookCardProps) {
  const [expanded, setExpanded] = useState(false);

  const ruleCount = Array.isArray(playbook.rules) ? playbook.rules.length : 0;

  return (
    <div className="rounded-xl border border-border bg-card hover:border-border/80 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{playbook.name}</h3>
              <StatusBadge status={playbook.status} />
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
                {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
              </span>
            </div>
            {playbook.description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{playbook.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Created {formatDate(playbook.created_at)} by {playbook.created_by?.name ?? 'unknown'}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Collapse rules' : 'Expand rules'}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit(playbook)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(playbook)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded rules */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-5 py-4">
          {ruleCount === 0 ? (
            <p className="text-sm text-muted-foreground italic">No rules defined yet.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Rules</p>
              {(Array.isArray(playbook.rules) ? playbook.rules : []).map((rule, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card p-3 text-sm">
                  <div className="flex items-center gap-3 flex-wrap">
                    {rule.clause_type && (
                      <span className="font-medium text-foreground">{String(rule.clause_type)}</span>
                    )}
                    {rule.deviation_threshold !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        threshold: <span className="font-mono text-foreground">{String(rule.deviation_threshold)}</span>
                      </span>
                    )}
                    {Array.isArray(rule.preferred_clause_ids) && rule.preferred_clause_ids.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {rule.preferred_clause_ids.length} preferred clause{rule.preferred_clause_ids.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Show other keys */}
                  {Object.entries(rule)
                    .filter(([k]) => !['clause_type', 'deviation_threshold', 'preferred_clause_ids'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} className="mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{k}:</span>{' '}
                        <span className="font-mono text-foreground">{JSON.stringify(v)}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  playbook: Playbook;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirm({ playbook, onConfirm, onCancel, deleting }: DeleteConfirmProps) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Delete playbook?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          This will permanently delete <span className="font-medium text-foreground">{playbook.name}</span>. This action cannot be undone.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} disabled={deleting} size="sm">Cancel</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={deleting} size="sm" className="gap-2">
          {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Delete Playbook
        </Button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaybooksPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'lawyer';

  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PlaybookStatus | ''>('');

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Playbook | null>(null);
  const [form, setForm] = useState<PlaybookForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Playbook | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlaybooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await playbooksApi.list({
        status: statusFilter as PlaybookStatus || undefined,
      });
      setPlaybooks(data);
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormError(null);
    setDeleteTarget(null);
    setShowForm(true);
  };

  const openEdit = (p: Playbook) => {
    setEditTarget(p);
    setForm(playbookToForm(p));
    setFormError(null);
    setDeleteTarget(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError('Playbook name is required.'); return; }

    let rules: Playbook['rules'];
    try {
      rules = JSON.parse(form.rulesJson);
    } catch {
      setFormError('Rules must be valid JSON.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editTarget) {
        await playbooksApi.update(editTarget.id, { name: form.name, description: form.description, status: form.status, rules });
      } else {
        await playbooksApi.create({ name: form.name, description: form.description, status: form.status, rules });
      }
      closeForm();
      fetchPlaybooks();
    } catch (e) {
      setFormError(parseErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await playbooksApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchPlaybooks();
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Playbooks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compliance rule sets used to review and score contracts automatically.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openAdd} className="gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Create Playbook
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setStatusFilter(o.value as PlaybookStatus | '')}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                statusFilter === o.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <PlaybookFormPanel
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          saving={saving}
          isEdit={!!editTarget}
          error={formError}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && !showForm && (
        <DeleteConfirm
          playbook={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : playbooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 flex flex-col items-center gap-3">
          <BookOpen className="w-10 h-10 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">No playbooks found</p>
          <p className="text-sm text-muted-foreground/70">
            {statusFilter ? `No ${statusFilter} playbooks.` : 'Create your first compliance playbook.'}
          </p>
          {canEdit && !showForm && (
            <Button variant="outline" onClick={openAdd} className="mt-2 gap-2">
              <Plus className="w-4 h-4" />
              Create First Playbook
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {playbooks.map((p) => (
            <PlaybookCard
              key={p.id}
              playbook={p}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={(pb) => { setDeleteTarget(pb); setShowForm(false); }}
            />
          ))}
        </div>
      )}

      {!loading && playbooks.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pb-4">
          {playbooks.length} playbook{playbooks.length !== 1 ? 's' : ''}
          {statusFilter && ` (${statusFilter})`}
        </p>
      )}
    </div>
  );
}
