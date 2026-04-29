'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Library, Plus, Save, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type VaultClause = {
  id: string;
  label: string;
  category: string;
  text: string;
  jurisdiction?: string;
  metadata?: any;
  updated_at: string;
};

type Playbook = {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  rules: any;
  updated_at: string;
};

export default function VaultPage() {
  const [tab, setTab] = useState<'clauses' | 'playbooks'>('clauses');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const [clauses, setClauses] = useState<VaultClause[]>([]);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const activeClause = useMemo(() => clauses.find((c) => c.id === activeClauseId) || null, [clauses, activeClauseId]);

  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [activePlaybookId, setActivePlaybookId] = useState<string | null>(null);
  const activePlaybook = useMemo(() => playbooks.find((p) => p.id === activePlaybookId) || null, [playbooks, activePlaybookId]);

  const [clauseDraft, setClauseDraft] = useState<Partial<VaultClause>>({});
  const [playbookDraft, setPlaybookDraft] = useState<Partial<Playbook>>({ status: 'draft', rules: [] });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (tab === 'clauses') {
        const res = await api.get('/vault/clauses/', { params: { q: q || undefined, category: category || undefined } });
        setClauses(Array.isArray(res.data.results) ? res.data.results : res.data);
      } else {
        const res = await api.get('/playbooks/', { params: { q: q || undefined } });
        setPlaybooks(Array.isArray(res.data.results) ? res.data.results : res.data);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load vault data.');
    } finally {
      setLoading(false);
    }
  }, [tab, q, category]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (tab === 'clauses') {
      setClauseDraft(activeClause || { label: '', category: category || '', text: '', jurisdiction: '' });
    }
  }, [activeClause, tab, category]);

  useEffect(() => {
    if (tab === 'playbooks') {
      setPlaybookDraft(activePlaybook || { name: '', description: '', status: 'draft', rules: [] });
    }
  }, [activePlaybook, tab]);

  const newClause = () => {
    setActiveClauseId(null);
    setClauseDraft({ label: '', category: category || '', text: '', jurisdiction: '' });
  };

  const saveClause = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      if (!clauseDraft.label || !clauseDraft.category || !clauseDraft.text) {
        setError('Label, category, and text are required.');
        return;
      }
      if (activeClauseId) {
        await api.patch(`/vault/clauses/${activeClauseId}/`, clauseDraft);
        setSuccess('Clause updated.');
      } else {
        const res = await api.post('/vault/clauses/', clauseDraft);
        setActiveClauseId(res.data.id);
        setSuccess('Clause created.');
      }
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.error || 'Failed to save clause.');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 2500);
    }
  };

  const deleteClause = async () => {
    if (!activeClauseId) return;
    try {
      setSaving(true);
      await api.delete(`/vault/clauses/${activeClauseId}/`);
      setActiveClauseId(null);
      setClauseDraft({ label: '', category: category || '', text: '', jurisdiction: '' });
      await fetchAll();
    } catch (e: any) {
      setError('Failed to delete clause.');
    } finally {
      setSaving(false);
    }
  };

  const newPlaybook = () => {
    setActivePlaybookId(null);
    setPlaybookDraft({ name: '', description: '', status: 'draft', rules: [] });
  };

  const savePlaybook = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      if (!playbookDraft.name) {
        setError('Playbook name is required.');
        return;
      }
      const payload = {
        name: playbookDraft.name,
        description: playbookDraft.description || '',
        status: playbookDraft.status || 'draft',
        rules: playbookDraft.rules || [],
      };
      if (activePlaybookId) {
        await api.patch(`/playbooks/${activePlaybookId}/`, payload);
        setSuccess('Playbook updated.');
      } else {
        const res = await api.post('/playbooks/', payload);
        setActivePlaybookId(res.data.id);
        setSuccess('Playbook created.');
      }
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.error || 'Failed to save playbook.');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 2500);
    }
  };

  const deletePlaybook = async () => {
    if (!activePlaybookId) return;
    try {
      setSaving(true);
      await api.delete(`/playbooks/${activePlaybookId}/`);
      setActivePlaybookId(null);
      setPlaybookDraft({ name: '', description: '', status: 'draft', rules: [] });
      await fetchAll();
    } catch (e: any) {
      setError('Failed to delete playbook.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vault</h1>
          <p className="text-zinc-500 mt-2">Manage preferred clause language and organization playbooks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={tab === 'clauses' ? 'default' : 'outline'} onClick={() => setTab('clauses')}>Clauses</Button>
          <Button variant={tab === 'playbooks' ? 'default' : 'outline'} onClick={() => setTab('playbooks')}>Playbooks</Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-6 h-[calc(100vh-220px)]">
        <div className="w-[360px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2"><Library className="w-4 h-4 text-blue-600" /> {tab === 'clauses' ? 'Clause Library' : 'Playbooks'}</div>
              <Button size="sm" className="gap-2" onClick={tab === 'clauses' ? newClause : newPlaybook}>
                <Plus className="w-4 h-4" /> New
              </Button>
            </div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" />
            {tab === 'clauses' && (
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Filter category (optional)" />
            )}
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500">Loading...</div>
            ) : tab === 'clauses' ? (
              clauses.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">No clauses yet.</div>
              ) : (
                clauses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveClauseId(c.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      activeClauseId === c.id
                        ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/15'
                        : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    )}
                  >
                    <div className="text-sm font-semibold line-clamp-1">{c.label}</div>
                    <div className="mt-1 text-[10px] text-zinc-500 uppercase font-bold flex gap-2">
                      <span>{c.category}</span>
                      {c.jurisdiction && <span className="text-blue-600 dark:text-blue-400">{c.jurisdiction}</span>}
                    </div>
                  </button>
                ))
              )
            ) : (
              playbooks.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">No playbooks yet.</div>
              ) : (
                playbooks.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePlaybookId(p.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      activePlaybookId === p.id
                        ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/15'
                        : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    )}
                  >
                    <div className="text-sm font-semibold line-clamp-1">{p.name}</div>
                    <div className="mt-1 text-[10px] text-zinc-500 uppercase font-bold">{p.status}</div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="font-semibold">{tab === 'clauses' ? (activeClauseId ? 'Edit Clause' : 'New Clause') : (activePlaybookId ? 'Edit Playbook' : 'New Playbook')}</div>
            <div className="flex gap-2">
              <Button className="gap-2" onClick={tab === 'clauses' ? saveClause : savePlaybook} disabled={saving}>
                <Save className="w-4 h-4" /> Save
              </Button>
              <Button variant="outline" className="gap-2" onClick={tab === 'clauses' ? deleteClause : deletePlaybook} disabled={saving || (tab === 'clauses' ? !activeClauseId : !activePlaybookId)}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {tab === 'clauses' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input value={clauseDraft.label || ''} onChange={(e) => setClauseDraft((d) => ({ ...d, label: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input value={clauseDraft.category || ''} onChange={(e) => setClauseDraft((d) => ({ ...d, category: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Jurisdiction (optional)</Label>
                  <Input value={clauseDraft.jurisdiction || ''} onChange={(e) => setClauseDraft((d) => ({ ...d, jurisdiction: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Clause Text</Label>
                  <textarea
                    className="w-full min-h-[320px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm"
                    value={clauseDraft.text || ''}
                    onChange={(e) => setClauseDraft((d) => ({ ...d, text: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={playbookDraft.name || ''} onChange={(e) => setPlaybookDraft((d) => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select
                      className="h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm"
                      value={playbookDraft.status || 'draft'}
                      onChange={(e) => setPlaybookDraft((d) => ({ ...d, status: e.target.value as any }))}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    className="w-full min-h-[90px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm"
                    value={playbookDraft.description || ''}
                    onChange={(e) => setPlaybookDraft((d) => ({ ...d, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rules (JSON)</Label>
                  <textarea
                    className="w-full min-h-[320px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 font-mono text-xs"
                    value={typeof playbookDraft.rules === 'string' ? playbookDraft.rules : JSON.stringify(playbookDraft.rules || [], null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setPlaybookDraft((d) => ({ ...d, rules: parsed }));
                      } catch {
                        setPlaybookDraft((d) => ({ ...d, rules: e.target.value } as any));
                      }
                    }}
                  />
                  <div className="text-xs text-zinc-500">
                    Suggested schema: an array of rules with category, preferred_clause_ids, fallback_text, escalation_guidance.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
