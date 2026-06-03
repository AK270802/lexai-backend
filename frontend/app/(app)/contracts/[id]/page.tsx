'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Clock,
  Edit3,
  Check,
  X,
  BarChart2,
  Info,
  ListX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { contractsApi } from '@/lib/api/contracts';
import { useToast } from '@/components/ui/toast';
import { cn, formatDate, riskBadgeClass, statusBadgeClass, parseErrorMessage } from '@/lib/utils';
import type { ContractClause, Document, Redline, RiskLevel } from '@/lib/types';
import { Markdown } from '@/components/ui/markdown';

// ─── Risk helpers ─────────────────────────────────────────────────────────────

const RISK_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low', 'none'];

const RISK_LABELS: Record<RiskLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
};

const RISK_WEIGHTS: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

function RiskIcon({ risk, className }: { risk: RiskLevel; className?: string }) {
  const cls = cn('w-4 h-4', className);
  switch (risk) {
    case 'critical':
      return <ShieldAlert className={cls} />;
    case 'high':
      return <AlertTriangle className={cls} />;
    case 'medium':
      return <AlertCircle className={cls} />;
    case 'low':
      return <Shield className={cls} />;
    default:
      return <ShieldCheck className={cls} />;
  }
}

function riskTextClass(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    critical: 'text-red-600 dark:text-red-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-amber-600 dark:text-amber-400',
    low: 'text-emerald-600 dark:text-emerald-400',
    none: 'text-muted-foreground',
  };
  return map[risk];
}

function riskBorderClass(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    critical: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-amber-500',
    low: 'border-l-emerald-500',
    none: 'border-l-border',
  };
  return map[risk];
}

function overallRiskLevel(clauses: ContractClause[]): RiskLevel {
  if (!clauses.length) return 'none';
  const weights = clauses.map((c) => RISK_WEIGHTS[c.risk_level]);
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  if (avg >= 3.5) return 'critical';
  if (avg >= 2.5) return 'high';
  if (avg >= 1.5) return 'medium';
  if (avg >= 0.5) return 'low';
  return 'none';
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 60
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-semibold text-foreground/80">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Left panel */}
      <div className="w-72 bg-card border border-border rounded-xl p-4 space-y-3 shrink-0">
        <Skeleton className="h-5 w-32 bg-muted" />
        <Skeleton className="h-9 w-full bg-muted rounded-lg" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-full bg-muted" />
              <Skeleton className="h-3 w-16 bg-muted" />
            </div>
          </div>
        ))}
      </div>
      {/* Right panel */}
      <div className="flex-1 bg-card border border-border rounded-xl p-6 space-y-4">
        <Skeleton className="h-6 w-48 bg-muted" />
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-3/4 bg-muted" />
        <Skeleton className="h-32 w-full bg-muted rounded-xl" />
        <Skeleton className="h-20 w-full bg-muted rounded-xl" />
      </div>
    </div>
  );
}

// ─── Risk filter tabs ─────────────────────────────────────────────────────────

const RISK_FILTERS: { label: string; value: RiskLevel | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

// ─── Redline section ──────────────────────────────────────────────────────────

interface RedlineSectionProps {
  contractId: string;
  clause: ContractClause;
  redlines: Redline[];
  onRedlineCreated: (r: Redline) => void;
  onRedlineUpdated: (r: Redline) => void;
  onToast: (opts: { variant: 'success' | 'error'; title: string; description?: string }) => void;
}

function RedlineSection({
  contractId,
  clause,
  redlines,
  onRedlineCreated,
  onRedlineUpdated,
  onToast,
}: RedlineSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [revisedText, setRevisedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // redline id being acted on

  const pendingRedlines = redlines.filter((r) => r.status === 'pending');
  const settledRedlines = redlines.filter((r) => r.status !== 'pending');

  async function handleSubmit() {
    if (!revisedText.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const r = await contractsApi.createRedline(contractId, {
        clause_id: clause.id,
        action: 'revision',
        revised_text: revisedText,
      });
      onRedlineCreated(r);
      onToast({ variant: 'success', title: 'Redline created' });
      setIsCreating(false);
      setRevisedText('');
    } catch (err) {
      setSubmitError(parseErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAccept(redlineId: string) {
    setActionLoading(redlineId);
    setActionError(null);
    try {
      const r = await contractsApi.acceptRedline(contractId, redlineId);
      onRedlineUpdated(r);
      onToast({ variant: 'success', title: 'Redline accepted' });
    } catch (err) {
      setActionError(parseErrorMessage(err));
      onToast({ variant: 'error', title: 'Action failed', description: parseErrorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(redlineId: string) {
    setActionLoading(redlineId);
    setActionError(null);
    try {
      const r = await contractsApi.rejectRedline(contractId, redlineId);
      onRedlineUpdated(r);
      onToast({ variant: 'success', title: 'Redline rejected' });
    } catch (err) {
      setActionError(parseErrorMessage(err));
      onToast({ variant: 'error', title: 'Action failed', description: parseErrorMessage(err) });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
          <Edit3 className="w-4 h-4" />
          Redlines
        </h3>
        {!isCreating && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsCreating(true);
              setRevisedText(clause.raw_text);
            }}
            className="h-7 text-xs"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Create Redline
          </Button>
        )}
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary">Propose Revision</p>
          <textarea
            value={revisedText}
            onChange={(e) => setRevisedText(e.target.value)}
            rows={5}
            className={cn(
              'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'placeholder:text-muted-foreground',
            )}
            placeholder="Enter your revised clause text..."
          />
          {submitError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {submitError}
            </p>
          )}
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setRevisedText('');
                setSubmitError(null);
              }}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !revisedText.trim()}
              className="h-8 text-xs"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1" />
              )}
              Submit Redline
            </Button>
          </div>
        </div>
      )}

      {actionError && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {actionError}
        </p>
      )}

      {/* Existing redlines */}
      {pendingRedlines.length === 0 && settledRedlines.length === 0 && !isCreating && (
        <p className="text-xs text-muted-foreground/60 italic">
          No redlines for this clause yet.
        </p>
      )}

      {[...pendingRedlines, ...settledRedlines].map((redline) => (
        <div
          key={redline.id}
          className={cn(
            'rounded-xl border p-4 space-y-3',
            redline.status === 'accepted'
              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20'
              : redline.status === 'rejected'
              ? 'border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20'
              : 'border-border bg-muted/30',
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {redline.user.name}
              </span>
              <span className="text-[10px] text-muted-foreground/50">
                {formatDate(redline.created_at)}
              </span>
            </div>
            <span
              className={cn(
                'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                redline.status === 'accepted'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  : redline.status === 'rejected'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
              )}
            >
              {redline.status}
            </span>
          </div>

          {/* Original → Revised */}
          <div className="space-y-2 text-xs">
            {redline.original_text && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-3 py-2">
                <p className="font-semibold text-red-600 dark:text-red-400 mb-1">Original</p>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap line-through opacity-70">
                  {redline.original_text}
                </p>
              </div>
            )}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-3 py-2">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Proposed</p>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {redline.revised_text}
              </p>
            </div>
          </div>

          {/* Accept/Reject */}
          {redline.status === 'pending' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleAccept(redline.id)}
                disabled={actionLoading === redline.id}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionLoading === redline.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3 mr-1" />
                )}
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(redline.id)}
                disabled={actionLoading === redline.id}
                className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <X className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Clause detail panel ──────────────────────────────────────────────────────

interface ClauseDetailProps {
  clause: ContractClause;
  redlines: Redline[];
  contractId: string;
  onRedlineCreated: (r: Redline) => void;
  onRedlineUpdated: (r: Redline) => void;
  onToast: (opts: { variant: 'success' | 'error'; title: string; description?: string }) => void;
}

function ClauseDetail({
  clause,
  redlines,
  contractId,
  onRedlineCreated,
  onRedlineUpdated,
  onToast,
}: ClauseDetailProps) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6 space-y-6">
      {/* Title + badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground leading-tight">
            {clause.clause_type}
          </h2>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0',
              riskBadgeClass(clause.risk_level),
            )}
          >
            <RiskIcon risk={clause.risk_level} className="w-3.5 h-3.5" />
            {RISK_LABELS[clause.risk_level]} Risk
          </span>
        </div>

        {/* Confidence */}
        <ConfidenceBar score={clause.confidence_score} />
      </div>

      {/* Risk reason */}
      {clause.risk_reason && (
        <div
          className={cn(
            'rounded-xl border-l-4 px-4 py-3 space-y-1',
            riskBorderClass(clause.risk_level),
            'bg-muted/40 border border-border',
          )}
        >
          <p className={cn('text-xs font-semibold uppercase tracking-wide', riskTextClass(clause.risk_level))}>
            Risk Analysis
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {clause.risk_reason}
          </p>
        </div>
      )}

      {/* Clause text */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Clause Text
        </p>
        <div className="rounded-xl bg-muted/40 border border-border px-4 py-3">
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {clause.raw_text}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          Page {clause.page_number} &middot; Characters {clause.start_char}–{clause.end_char}
        </p>
      </div>

      {/* Standard deviation */}
      {clause.standard_deviation && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Standard Deviation
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {clause.standard_deviation}
          </p>
        </div>
      )}

      {/* AI suggested revision */}
      {clause.suggested_revision && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            AI Suggested Revision
          </p>
          <div className="ai-prose text-sm">
            <Markdown content={clause.suggested_revision} />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Redlines */}
      <RedlineSection
        contractId={contractId}
        clause={clause}
        redlines={redlines}
        onRedlineCreated={onRedlineCreated}
        onRedlineUpdated={onRedlineUpdated}
        onToast={onToast}
      />
    </div>
  );
}

// ─── Empty clause placeholder ─────────────────────────────────────────────────

function EmptyClauseDetail() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <FileText className="w-8 h-8 text-muted-foreground/30" />
      </div>
      <p className="font-semibold text-muted-foreground">No clause selected</p>
      <p className="text-sm text-muted-foreground/60">
        Click a clause in the left panel to view its analysis and redlines.
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContractReviewPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [contract, setContract] = useState<(Document & { download_url?: string }) | null>(null);
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [redlines, setRedlines] = useState<Redline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');

  const [missingClauses, setMissingClauses] = useState<string[]>([]);
  const [missingDocType, setMissingDocType] = useState('');
  const [missingLoading, setMissingLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [contractData, clausesData] = await Promise.all([
        contractsApi.getContract(id),
        contractsApi.listClauses(id),
      ]);
      setContract(contractData);
      setClauses(clausesData);
      // Select highest-risk clause by default
      if (clausesData.length > 0 && !selectedClauseId) {
        const sorted = [...clausesData].sort(
          (a, b) => RISK_WEIGHTS[b.risk_level] - RISK_WEIGHTS[a.risk_level],
        );
        setSelectedClauseId(sorted[0].id);
      }
    } catch (err) {
      setError(parseErrorMessage(err));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Poll every 5 s while the document is still being processed
  useEffect(() => {
    if (!contract) return;
    if (contract.parse_status !== 'processing' && contract.parse_status !== 'pending') return;
    const timer = setInterval(() => fetchAll(true), 5000);
    return () => clearInterval(timer);
  }, [contract?.parse_status, fetchAll]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch missing clauses once document is complete
  useEffect(() => {
    if (!contract || contract.parse_status !== 'completed') return;
    setMissingLoading(true);
    contractsApi.getMissingClauses(id)
      .then((data) => {
        setMissingClauses(data.missing ?? []);
        setMissingDocType(data.document_type ?? '');
      })
      .catch(() => {})
      .finally(() => setMissingLoading(false));
  }, [id, contract?.parse_status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered clauses ───────────────────────────────────────────────────────

  const filteredClauses = useMemo(() => {
    let list = clauses;
    if (riskFilter !== 'all') {
      list = list.filter((c) => c.risk_level === riskFilter);
    }
    // Group by risk order
    return [...list].sort(
      (a, b) => RISK_WEIGHTS[b.risk_level] - RISK_WEIGHTS[a.risk_level],
    );
  }, [clauses, riskFilter]);

  // ── Counts ─────────────────────────────────────────────────────────────────

  const riskCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clauses.length };
    for (const c of clauses) {
      counts[c.risk_level] = (counts[c.risk_level] ?? 0) + 1;
    }
    return counts;
  }, [clauses]);

  const overallRisk = useMemo(() => overallRiskLevel(clauses), [clauses]);

  // ── Redline helpers ────────────────────────────────────────────────────────

  const clauseRedlines = useMemo(() => {
    const map: Record<string, Redline[]> = {};
    for (const r of redlines) {
      if (!map[r.clause]) map[r.clause] = [];
      map[r.clause].push(r);
    }
    return map;
  }, [redlines]);

  function handleRedlineCreated(r: Redline) {
    setRedlines((prev) => [r, ...prev]);
  }

  function handleRedlineUpdated(r: Redline) {
    setRedlines((prev) => prev.map((x) => (x.id === r.id ? r : x)));
  }

  const selectedClause = useMemo(
    () => clauses.find((c) => c.id === selectedClauseId) ?? null,
    [clauses, selectedClauseId],
  );

  // ── Render: loading ────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSkeleton />;

  // ── Render: error ──────────────────────────────────────────────────────────

  if (error || !contract) {
    return (
      <div className="max-w-xl mx-auto mt-20 space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-5">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">
              Unable to load contract
            </p>
            <p className="mt-0.5 text-sm text-red-600 dark:text-red-500">
              {error ?? 'Contract not found or failed to parse.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/documents">
            <Button variant="outline" className="flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back to Documents
            </Button>
          </Link>
          <Button onClick={() => fetchAll()} className="flex items-center gap-1.5">
            <Loader2 className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: main ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-120px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/documents">
            <button className="shrink-0 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Documents
            </button>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">
              {contract.file_name}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0',
                statusBadgeClass(contract.parse_status),
              )}
            >
              {contract.parse_status === 'processing' && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              {contract.parse_status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
              {contract.parse_status === 'failed' && <AlertCircle className="w-3 h-3" />}
              {contract.parse_status === 'pending' && <Clock className="w-3 h-3" />}
              <span className="capitalize">{contract.parse_status}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {contract.parse_status !== 'completed' && (
            <p className="text-xs text-muted-foreground/50">
              {contract.parse_status === 'processing'
                ? 'AI is analyzing this contract…'
                : contract.parse_status === 'pending'
                ? 'Queued for analysis'
                : 'Analysis failed'}
            </p>
          )}
          {contract.download_url && (
            <a href={contract.download_url} download target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Parse not complete warning */}
      {contract.parse_status !== 'completed' && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shrink-0',
            contract.parse_status === 'failed'
              ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
              : 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
          )}
        >
          {contract.parse_status === 'failed' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          )}
          <span>
            {contract.parse_status === 'failed'
              ? `Parse failed: ${contract.metadata?.error ?? 'Unknown error. Please re-upload the document.'}`
              : 'This contract is still being analyzed. Clauses will appear once complete.'}
          </span>
        </div>
      )}

      {/* Split pane */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT: Clause navigator */}
        <div className="w-72 shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          {/* Overall risk summary */}
          <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Clause Navigator
              </h2>
              <span className="text-xs text-muted-foreground/50">{clauses.length} clauses</span>
            </div>

            {/* Overall risk badge */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                  riskBadgeClass(overallRisk),
                )}
              >
                <RiskIcon risk={overallRisk} className="w-3 h-3" />
                Overall: {RISK_LABELS[overallRisk]} Risk
              </span>
            </div>

            {/* Risk count pills */}
            <div className="flex flex-wrap gap-1">
              {RISK_ORDER.filter((r) => riskCounts[r]).map((r) => (
                <span
                  key={r}
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold',
                    riskBadgeClass(r),
                  )}
                >
                  {riskCounts[r]} {RISK_LABELS[r]}
                </span>
              ))}
            </div>
          </div>

          {/* Missing clauses */}
          {(missingLoading || missingClauses.length > 0) && (
            <div className="px-4 pt-3 pb-3 border-b border-border space-y-2">
              <div className="flex items-center gap-1.5">
                <ListX className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Missing Clauses
                </span>
                {missingDocType && (
                  <span className="ml-auto text-[10px] text-muted-foreground/50">{missingDocType}</span>
                )}
              </div>
              {missingLoading ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : (
                <ul className="space-y-1">
                  {missingClauses.map((c) => (
                    <li key={c} className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Risk filter */}
          <div className="px-2 pt-2 pb-1 border-b border-border">
            <div className="flex flex-wrap gap-1">
              {RISK_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRiskFilter(f.value)}
                  className={cn(
                    'px-2 py-1 rounded-md text-[11px] font-semibold transition-colors',
                    riskFilter === f.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  {f.label}
                  {riskCounts[f.value] !== undefined && (
                    <span
                      className={cn(
                        'ml-1',
                        riskFilter === f.value ? 'opacity-70' : 'opacity-60',
                      )}
                    >
                      {riskCounts[f.value]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Clause list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filteredClauses.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground/60">
                No clauses{riskFilter !== 'all' ? ` with ${riskFilter} risk` : ''}.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredClauses.map((clause) => {
                  const isSelected = clause.id === selectedClauseId;
                  const clauseRedlineCount = clauseRedlines[clause.id]?.length ?? 0;

                  return (
                    <button
                      key={clause.id}
                      onClick={() => setSelectedClauseId(clause.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors flex items-start gap-3',
                        isSelected
                          ? 'bg-primary/8 dark:bg-primary/15 border-r-2 border-r-primary'
                          : 'hover:bg-muted/40',
                      )}
                    >
                      {/* Risk dot */}
                      <div
                        className={cn(
                          'mt-0.5 w-2 h-2 rounded-full shrink-0',
                          clause.risk_level === 'critical' && 'bg-red-500',
                          clause.risk_level === 'high' && 'bg-orange-500',
                          clause.risk_level === 'medium' && 'bg-amber-500',
                          clause.risk_level === 'low' && 'bg-emerald-500',
                          clause.risk_level === 'none' && 'bg-muted-foreground/30',
                        )}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p
                          className={cn(
                            'text-sm font-medium leading-tight truncate',
                            isSelected
                              ? 'text-primary'
                              : 'text-foreground/90',
                          )}
                        >
                          {clause.clause_type}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-[10px] font-semibold',
                              riskTextClass(clause.risk_level),
                            )}
                          >
                            {RISK_LABELS[clause.risk_level]}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">
                            {Math.round(clause.confidence_score * 100)}% conf.
                          </span>
                          {clauseRedlineCount > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                              {clauseRedlineCount} RL
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Clause detail */}
        <div className="flex-1 min-w-0 bg-card border border-border rounded-xl overflow-hidden">
          {selectedClause ? (
            <ClauseDetail
              key={selectedClause.id}
              clause={selectedClause}
              redlines={clauseRedlines[selectedClause.id] ?? []}
              contractId={id}
              onRedlineCreated={handleRedlineCreated}
              onRedlineUpdated={handleRedlineUpdated}
              onToast={toast}
            />
          ) : (
            <EmptyClauseDetail />
          )}
        </div>
      </div>
    </div>
  );
}
