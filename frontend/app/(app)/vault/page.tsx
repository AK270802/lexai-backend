'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Library,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Save,
} from 'lucide-react';
import { vaultApi } from '@/lib/api/vault';
import type { ClauseVaultEntry } from '@/lib/types';
import { useAuth } from '@/stores/use-auth';
import { cn, formatDate, parseErrorMessage, statusBadgeClass } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'confidentiality', label: 'Confidentiality' },
  { value: 'termination', label: 'Termination' },
  { value: 'liability', label: 'Liability' },
  { value: 'payment', label: 'Payment' },
  { value: 'ip', label: 'Intellectual Property' },
  { value: 'general', label: 'General' },
];

const CATEGORY_COLORS: Record<string, string> = {
  confidentiality: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
  termination: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400',
  liability: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400',
  payment: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  ip: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
  general: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

function categoryBadge(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.general;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface ClauseForm {
  label: string;
  category: string;
  text: string;
  jurisdiction: string;
}

const emptyForm = (): ClauseForm => ({
  label: '',
  category: 'general',
  text: '',
  jurisdiction: '',
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

interface ClauseFormPanelProps {
  form: ClauseForm;
  onChange: (f: ClauseForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit: boolean;
  error: string | null;
}

function ClauseFormPanel({ form, onChange, onSubmit, onCancel, saving, isEdit, error }: ClauseFormPanelProps) {
  const set = (k: keyof ClauseForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...form, [k]: e.target.value });

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{isEdit ? 'Edit Clause' : 'Add New Clause'}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="clause-label">Label *</Label>
          <Input
            id="clause-label"
            value={form.label}
            onChange={set('label')}
            placeholder="e.g. Standard NDA Confidentiality Clause"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clause-category">Category *</Label>
          <select
            id="clause-category"
            value={form.category}
            onChange={set('category')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CATEGORIES.filter((c) => c.value).map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="clause-jurisdiction">Jurisdiction</Label>
        <Input
          id="clause-jurisdiction"
          value={form.jurisdiction}
          onChange={set('jurisdiction')}
          placeholder="e.g. Delaware, England & Wales, EU"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="clause-text">Clause Text *</Label>
        <Textarea
          id="clause-text"
          rows={8}
          resize="vertical"
          value={form.text}
          onChange={set('text')}
          placeholder="Enter the full clause language here..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save Changes' : 'Add Clause'}
        </Button>
      </div>
    </div>
  );
}

interface ClauseCardProps {
  clause: ClauseVaultEntry;
  canEdit: boolean;
  onEdit: (c: ClauseVaultEntry) => void;
  onDelete: (c: ClauseVaultEntry) => void;
}

function ClauseCard({ clause, canEdit, onEdit, onDelete }: ClauseCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card hover:border-border/80 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{clause.label}</h3>
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', categoryBadge(clause.category))}>
                {clause.category}
              </span>
              {clause.jurisdiction && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
                  {clause.jurisdiction}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Added {formatDate(clause.created_at)} by {clause.created_by?.name ?? 'unknown'}
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(clause)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(clause)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {expanded ? clause.text : `${clause.text.slice(0, 150)}${clause.text.length > 150 ? '…' : ''}`}
          </p>
        </div>

        {clause.text.length > 150 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> Show full text
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

interface DeleteConfirmProps {
  clause: ClauseVaultEntry;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirm({ clause, onConfirm, onCancel, deleting }: DeleteConfirmProps) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Delete clause?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          This will permanently delete <span className="font-medium text-foreground">{clause.label}</span>. This action cannot be undone.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} disabled={deleting} size="sm">
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={deleting} size="sm" className="gap-2">
          {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Delete Clause
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'lawyer';

  const [clauses, setClauses] = useState<ClauseVaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ClauseVaultEntry | null>(null);
  const [form, setForm] = useState<ClauseForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ClauseVaultEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClauses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vaultApi.list({ q: q || undefined, category: category || undefined });
      setClauses(data);
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [q, category]);

  useEffect(() => {
    const t = setTimeout(fetchClauses, 300);
    return () => clearTimeout(t);
  }, [fetchClauses]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormError(null);
    setDeleteTarget(null);
    setShowForm(true);
  };

  const openEdit = (c: ClauseVaultEntry) => {
    setEditTarget(c);
    setForm({ label: c.label, category: c.category, text: c.text, jurisdiction: c.jurisdiction ?? '' });
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
    if (!form.label.trim()) { setFormError('Label is required.'); return; }
    if (!form.category) { setFormError('Category is required.'); return; }
    if (!form.text.trim()) { setFormError('Clause text is required.'); return; }

    setSaving(true);
    setFormError(null);
    try {
      if (editTarget) {
        await vaultApi.update(editTarget.id, form);
      } else {
        await vaultApi.create(form);
      }
      closeForm();
      fetchClauses();
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
      await vaultApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchClauses();
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
            <Library className="w-6 h-6 text-primary" />
            Clause Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Repository of preferred legal clause language for your organization.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openAdd} className="gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Add Clause
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clauses by label or text..."
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-52"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <ClauseFormPanel
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
          clause={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : clauses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-16 flex flex-col items-center gap-3">
          <Library className="w-10 h-10 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">No clauses found</p>
          <p className="text-sm text-muted-foreground/70">
            {q || category ? 'Try adjusting your search filters.' : 'Add your first preferred clause to get started.'}
          </p>
          {canEdit && !showForm && (
            <Button variant="outline" onClick={openAdd} className="mt-2 gap-2">
              <Plus className="w-4 h-4" />
              Add First Clause
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {clauses.map((clause) => (
            <ClauseCard
              key={clause.id}
              clause={clause}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={(c) => { setDeleteTarget(c); setShowForm(false); }}
            />
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && clauses.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pb-4">
          Showing {clauses.length} clause{clauses.length !== 1 ? 's' : ''}
          {category && ` in "${CATEGORIES.find((c) => c.value === category)?.label}"`}
        </p>
      )}
    </div>
  );
}
