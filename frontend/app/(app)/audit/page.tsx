'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lock,
  Filter,
} from 'lucide-react';
import { auditApi } from '@/lib/api/audit';
import type { AuditLog } from '@/lib/types';
import { useAuth } from '@/stores/use-auth';
import { cn, formatDate, parseErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  '', 'document', 'matter', 'clause', 'playbook', 'research_query',
  'portal_token', 'user', 'task', 'comment', 'redline',
];

const PAGE_SIZE = 25;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function actorDisplay(actor: AuditLog['actor']) {
  if (!actor) return { name: 'System', email: '' };
  return { name: actor.name || actor.email, email: actor.email };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-b border-border">
      {[180, 140, 100, 110, 100].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

interface AuditRowProps {
  log: AuditLog;
}

function AuditRow({ log }: AuditRowProps) {
  const [expanded, setExpanded] = useState(false);
  const actor = actorDisplay(log.actor);
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <>
      <tr
        className={cn(
          'border-b border-border transition-colors',
          hasMetadata && 'cursor-pointer hover:bg-muted/30',
          expanded && 'bg-muted/20'
        )}
        onClick={() => hasMetadata && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          <div>{formatDate(log.created_at, 'MMM d, yyyy')}</div>
          <div className="text-muted-foreground/60">{new Date(log.created_at).toLocaleTimeString()}</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-foreground">{actor.name}</div>
          {actor.email && <div className="text-xs text-muted-foreground">{actor.email}</div>}
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono font-medium text-primary">
            {log.action}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="text-xs font-semibold text-foreground capitalize">{log.entity_type}</div>
          <div className="text-xs font-mono text-muted-foreground truncate max-w-[120px]" title={log.entity_id}>
            {log.entity_id}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          {hasMetadata && (
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasMetadata && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={5} className="px-4 pb-3 pt-1">
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Metadata</p>
              <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const { user } = useAuth();

  // Access guard
  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto pt-20 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Access Restricted</h2>
          <p className="text-muted-foreground mt-2">
            Audit logs are only accessible to organization administrators.
          </p>
        </div>
      </div>
    );
  }

  return <AuditContent />;
}

function AuditContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = useMemo(() => ({
    entity_type: entityType || undefined,
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
  }), [entityType, action, from, to, page]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await auditApi.list(params);
      if (Array.isArray(result)) {
        setLogs(result);
        setTotal(result.length);
      } else {
        setLogs(result.results);
        setTotal(result.count);
      }
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = () => {
    auditApi.exportCSV({
      entity_type: entityType || undefined,
      action: action || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  };

  const applyFilters = () => {
    setPage(1);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Append-only activity trail for compliance and internal review.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting || loading}
          className="gap-2 self-start sm:self-auto"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Entity Type</Label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t || 'All Types'}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Action</Label>
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. document.uploaded"
            />
          </div>
          <div className="space-y-1.5">
            <Label>From Date</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>To Date</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEntityType('');
              setAction('');
              setFrom('');
              setTo('');
              setPage(1);
            }}
          >
            Clear
          </Button>
          <Button size="sm" onClick={applyFilters}>
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">Events</span>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                ({total} total)
              </span>
            )}
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {['Timestamp', 'Actor', 'Action', 'Entity', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No audit events found for the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => <AuditRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} &middot; {total} events
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
