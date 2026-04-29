'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type HighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ClauseHighlight = {
  page_number: number;
  rects: HighlightRect[];
};

export type ClauseOverlayItem = {
  id: string;
  clause_type: string;
  risk_level: RiskLevel;
  risk_reason?: string;
  confidence_score?: number | null;
  standard_deviation?: boolean;
  highlights: ClauseHighlight[];
};

function colorForRisk(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'rgba(34,197,94,0.25)';
    case 'medium':
      return 'rgba(234,179,8,0.30)';
    case 'high':
      return 'rgba(239,68,68,0.35)';
    case 'critical':
      return 'rgba(220,38,38,0.50)';
    default:
      return 'rgba(59,130,246,0.12)';
  }
}

export function ContractViewerClauseOverlay(props: {
  width: number;
  height: number;
  scale: number;
  pageNumber: number;
  clauses: ClauseOverlayItem[];
  activeClauseId?: string | null;
  onHoverClause?: (clauseId: string | null) => void;
  onClickClause?: (clauseId: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = useState<{ clause: ClauseOverlayItem; rect: HighlightRect; x: number; y: number } | null>(null);

  const rectIndex = useMemo(() => {
    const items: Array<{ clause: ClauseOverlayItem; rect: HighlightRect }> = [];
    for (const c of props.clauses) {
      const hl = c.highlights?.find((h) => h.page_number === props.pageNumber);
      if (!hl) continue;
      for (const r of hl.rects || []) {
        items.push({ clause: c, rect: r });
      }
    }
    return items;
  }, [props.clauses, props.pageNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.round(props.width);
    canvas.height = Math.round(props.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const { clause, rect } of rectIndex) {
      const x = rect.x * props.scale;
      const y = rect.y * props.scale;
      const w = rect.width * props.scale;
      const h = rect.height * props.scale;

      ctx.fillStyle = colorForRisk(clause.risk_level);
      ctx.fillRect(x, y, w, h);

      const isActive = props.activeClauseId && clause.id === props.activeClauseId;
      if (clause.standard_deviation) {
        ctx.save();
        ctx.strokeStyle = 'rgba(59,130,246,0.75)';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.restore();
      }
      if (isActive) {
        ctx.save();
        ctx.strokeStyle = clause.risk_level === 'critical' ? 'rgba(220,38,38,0.9)' : 'rgba(59,130,246,0.9)';
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.restore();
      }
    }
  }, [props.width, props.height, props.scale, rectIndex, props.activeClauseId]);

  const hitTest = (px: number, py: number) => {
    for (let i = rectIndex.length - 1; i >= 0; i--) {
      const { clause, rect } = rectIndex[i];
      const x = rect.x * props.scale;
      const y = rect.y * props.scale;
      const w = rect.width * props.scale;
      const h = rect.height * props.scale;
      if (px >= x && px <= x + w && py >= y && py <= y + h) {
        return { clause, rect };
      }
    }
    return null;
  };

  return (
    <div className="absolute inset-0" style={{ width: props.width, height: props.height }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseMove={(e) => {
          const target = e.currentTarget;
          const rect = target.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const hit = hitTest(x, y);
          if (!hit) {
            setHover(null);
            props.onHoverClause?.(null);
            return;
          }
          setHover({ clause: hit.clause, rect: hit.rect, x, y });
          props.onHoverClause?.(hit.clause.id);
        }}
        onMouseLeave={() => {
          setHover(null);
          props.onHoverClause?.(null);
        }}
        onClick={() => {
          if (hover) props.onClickClause?.(hover.clause.id);
        }}
      />

      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute z-20 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-lg px-3 py-2 text-xs max-w-[320px]"
            style={{ left: Math.min(hover.x + 12, props.width - 340), top: Math.max(hover.y - 8, 8) }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                {hover.clause.clause_type}
              </div>
              <div className="text-[10px] uppercase font-bold text-zinc-500">
                {hover.clause.risk_level}
              </div>
            </div>
            {hover.clause.standard_deviation && (
              <div className="mt-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
                Deviation
              </div>
            )}
            {hover.clause.risk_reason && (
              <div className="mt-1 text-zinc-600 dark:text-zinc-300 line-clamp-3">{hover.clause.risk_reason}</div>
            )}
            <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
              <div>
                Confidence:{' '}
                {hover.clause.confidence_score != null ? Math.round(hover.clause.confidence_score * 100) : 0}%
              </div>
              <div className="font-semibold text-blue-600 dark:text-blue-400">View Redline</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

