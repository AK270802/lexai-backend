'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download, ShieldCheck } from 'lucide-react';

type AuditLog = {
  id: string;
  actor_name: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
};

export default function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditLog[]>([]);

  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = useMemo(() => {
    const p: any = {};
    if (actorId) p.actor_id = actorId;
    if (action) p.action = action;
    if (entityType) p.entity_type = entityType;
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [actorId, action, entityType, from, to]);

  const fetchAudit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/audit/', { params });
      setRows(Array.isArray(res.data.results) ? res.data.results : res.data);
    } catch (e: any) {
      setError('Failed to load audit logs (admin only).');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const exportCsv = async () => {
    try {
      setExporting(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const qs = new URLSearchParams(params).toString();
      const url = `${base}/audit/export/${qs ? `?${qs}` : ''}`;
      const token = localStorage.getItem('access_token');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'audit.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-zinc-500 mt-2">Append-only activity trail for compliance and internal review.</p>
        </div>
        <Button className="gap-2" onClick={exportCsv} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label>Actor ID</Label>
          <Input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="uuid" />
        </div>
        <div className="space-y-2">
          <Label>Action</Label>
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="comment.created" />
        </div>
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="document" />
        </div>
        <div className="space-y-2">
          <Label>From</Label>
          <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-01-01" />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-01-31" />
        </div>
        <div className="md:col-span-5 flex justify-end">
          <Button variant="outline" onClick={fetchAudit}>Apply Filters</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Events
        </div>
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="text-left py-2 px-4">Time</th>
                <th className="text-left py-2 px-4">Actor</th>
                <th className="text-left py-2 px-4">Action</th>
                <th className="text-left py-2 px-4">Entity</th>
                <th className="text-left py-2 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="p-6 text-zinc-500" colSpan={5}>No audit events found.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-50 dark:border-zinc-800/60">
                    <td className="py-2 px-4 text-zinc-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 px-4">
                      <div className="font-semibold">{r.actor_name || 'System'}</div>
                      <div className="text-xs text-zinc-500">{r.actor_email}</div>
                    </td>
                    <td className="py-2 px-4 font-semibold">{r.action}</td>
                    <td className="py-2 px-4 text-xs">
                      <div className="font-semibold">{r.entity_type}</div>
                      <div className="text-zinc-500">{r.entity_id}</div>
                    </td>
                    <td className="py-2 px-4 text-xs text-zinc-600 dark:text-zinc-300">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(r.metadata || {}, null, 2)}</pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

