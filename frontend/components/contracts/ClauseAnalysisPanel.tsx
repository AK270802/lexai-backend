'use client';

import { Button } from '@/components/ui/button';
import { diffWords } from '@/lib/diff';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Wand2, AlertTriangle } from 'lucide-react';
import type { RiskLevel } from './ContractViewerClauseOverlay';

export type ClauseDetail = {
  id: string;
  clause_type: string;
  raw_text: string;
  page_number: number;
  risk_level: RiskLevel;
  risk_reason?: string;
  standard_deviation?: boolean;
  suggested_revision?: string;
  confidence_score?: number | null;
};

export type Redline = {
  id: string;
  clause_id: string;
  action: string;
  original_text: string;
  revised_text: string;
  status: 'pending' | 'accepted' | 'rejected';
};

function badgeForRisk(level: RiskLevel) {
  const base = 'text-[10px] uppercase font-bold px-2 py-1 rounded border';
  if (level === 'critical') return cn(base, 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900');
  if (level === 'high') return cn(base, 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900');
  if (level === 'medium') return cn(base, 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900');
  if (level === 'low') return cn(base, 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900');
  return cn(base, 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800');
}

export function ClauseAnalysisPanel(props: {
  clause: ClauseDetail | null;
  redline: Redline | null;
  onCreateRedline: () => Promise<void>;
  onAcceptRedline: (id: string) => Promise<void>;
  onRejectRedline: (id: string) => Promise<void>;
}) {
  if (!props.clause) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 text-sm text-zinc-500">Select a clause to view analysis.</div>
      </div>
    );
  }

  const hasRevision = Boolean(props.clause.suggested_revision && props.clause.suggested_revision.trim());
  const diff = props.redline ? diffWords(props.redline.original_text, props.redline.revised_text) : hasRevision ? diffWords(props.clause.raw_text, props.clause.suggested_revision || '') : [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{props.clause.clause_type}</div>
            <div className="mt-1 text-[10px] text-zinc-500 uppercase font-bold">Page {props.clause.page_number}</div>
          </div>
          <div className={badgeForRisk(props.clause.risk_level)}>{props.clause.risk_level}</div>
        </div>
        {props.clause.standard_deviation && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
            <AlertTriangle className="w-4 h-4" />
            Deviation from playbook language
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase">Clause Text</div>
          <div className="mt-2 text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
            {props.clause.raw_text}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase">Risk Rationale</div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {props.clause.risk_reason || 'No risk rationale provided.'}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-zinc-500 uppercase">Suggested Revision</div>
            <div className="text-[10px] text-zinc-500 font-semibold">
              Confidence: {props.clause.confidence_score != null ? Math.round(props.clause.confidence_score * 100) : 0}%
            </div>
          </div>

          {hasRevision ? (
            <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
              <div className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">{props.clause.suggested_revision}</div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-zinc-500">No suggested revision available.</div>
          )}
        </div>

        {diff.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase">Redline Diff</div>
            <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-3 text-sm leading-relaxed">
              {diff.map((t, idx) => {
                if (t.type === 'equal') return <span key={idx}>{t.text}</span>;
                if (t.type === 'delete') {
                  return (
                    <span key={idx} className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 line-through">
                      {t.text}
                    </span>
                  );
                }
                return (
                  <span key={idx} className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {t.text}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
        {!props.redline ? (
          <Button className="w-full gap-2" onClick={props.onCreateRedline} disabled={!hasRevision}>
            <Wand2 className="w-4 h-4" />
            Create Redline
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => props.onRejectRedline(props.redline!.id)}
              disabled={props.redline.status !== 'pending'}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => props.onAcceptRedline(props.redline!.id)}
              disabled={props.redline.status !== 'pending'}
            >
              <CheckCircle2 className="w-4 h-4" />
              Accept
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

