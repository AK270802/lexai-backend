'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, ShieldAlert, ShieldCheck, ShieldMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskLevel } from './ContractViewerClauseOverlay';

export type ClauseListItem = {
  id: string;
  clause_type: string;
  page_number: number;
  confidence_score?: number | null;
  risk_level: RiskLevel;
  standard_deviation?: boolean;
};

function iconForRisk(level: RiskLevel) {
  if (level === 'critical' || level === 'high') return ShieldAlert;
  if (level === 'medium') return ShieldMinus;
  return ShieldCheck;
}

export function ClauseNavigator(props: {
  clauses: ClauseListItem[];
  activeClauseId?: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState<RiskLevel | 'all'>('all');

  const filtered = useMemo(() => {
    return props.clauses
      .filter((c) => (risk === 'all' ? true : c.risk_level === risk))
      .filter((c) => (q.trim() ? c.clause_type.toLowerCase().includes(q.toLowerCase()) : true))
      .sort((a, b) => (b.risk_level === a.risk_level ? a.page_number - b.page_number : 0));
  }, [props.clauses, q, risk]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="text-sm font-semibold">Clauses</div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search clause types"
              className="w-full h-9 pl-8 pr-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm"
            />
          </div>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value as any)}
            className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm px-2"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No clauses match your filters.</div>
        ) : (
          filtered.map((c) => {
            const Icon = iconForRisk(c.risk_level);
            return (
              <button
                key={c.id}
                onClick={() => props.onSelect(c.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
                  props.activeClauseId === c.id && 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/15'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-zinc-500" />
                      <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {c.clause_type}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="uppercase font-bold">p.{c.page_number}</span>
                      <span className="uppercase">{c.risk_level}</span>
                      {c.standard_deviation && (
                        <span className="uppercase font-bold text-blue-600 dark:text-blue-400">Deviation</span>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-semibold">
                    {c.confidence_score != null ? Math.round(c.confidence_score * 100) : 0}%
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

