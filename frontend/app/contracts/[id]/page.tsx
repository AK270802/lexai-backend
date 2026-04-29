'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClauseNavigator } from '@/components/contracts/ClauseNavigator';
import { ClauseAnalysisPanel } from '@/components/contracts/ClauseAnalysisPanel';
import {
  ContractViewerClauseOverlay,
  ClauseOverlayItem,
  RiskLevel,
} from '@/components/contracts/ContractViewerClauseOverlay';
import { useMatterCollab } from '@/stores/use-matter-collab';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();

type ContractDetail = {
  id: string;
  file_name: string;
  file_type: string;
  parse_status: string;
  matter_id: string | null;
  download_url: string;
};

type ClauseApi = {
  id: string;
  clause_type: string;
  raw_text: string;
  page_number: number;
  highlights: Array<{ page_number: number; rects: Array<{ x: number; y: number; width: number; height: number }> }>;
  risk_level: RiskLevel;
  risk_reason?: string;
  standard_deviation?: boolean;
  suggested_revision?: string;
  confidence_score?: number | null;
};

type RedlineApi = {
  id: string;
  clause_id: string;
  action: string;
  original_text: string;
  revised_text: string;
  status: 'pending' | 'accepted' | 'rejected';
};

export default function ContractReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const initialPage = Number(searchParams.get('page') || '1');

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [clauses, setClauses] = useState<ClauseApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(isNaN(initialPage) ? 1 : initialPage);
  const [scale, setScale] = useState<number>(1.0);
  const [baseDims, setBaseDims] = useState<{ width: number; height: number } | null>(null);

  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [hoverClauseId, setHoverClauseId] = useState<string | null>(null);
  const [redlines, setRedlines] = useState<Record<string, RedlineApi>>({});
  const { participants, connect, fetchComments, comments, createComment, reply, resolve } = useMatterCollab();
  const [rightTab, setRightTab] = useState<'analysis' | 'comments'>('analysis');
  const [newComment, setNewComment] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractRes, clausesRes] = await Promise.all([
        api.get(`/contracts/${id}/`),
        api.get(`/contracts/${id}/clauses/`),
      ]);
      setContract(contractRes.data);
      setClauses(Array.isArray(clausesRes.data.results) ? clausesRes.data.results : clausesRes.data);

      const matterId = contractRes.data.matter_id as string | null;
      if (matterId) {
        connect(matterId);
        await fetchComments({ documentId: id, matterId });
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load contract.');
    } finally {
      setLoading(false);
    }
  }, [id, connect, fetchComments]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const clauseById = useMemo(() => {
    const m: Record<string, ClauseApi> = {};
    for (const c of clauses) m[c.id] = c;
    return m;
  }, [clauses]);

  const overlayClauses: ClauseOverlayItem[] = useMemo(() => {
    return clauses.map((c) => ({
      id: c.id,
      clause_type: c.clause_type,
      risk_level: c.risk_level,
      risk_reason: c.risk_reason,
      confidence_score: c.confidence_score,
      standard_deviation: c.standard_deviation,
      highlights: c.highlights || [],
    }));
  }, [clauses]);

  const activeClause = activeClauseId ? clauseById[activeClauseId] : null;
  const activeRedline = activeClause ? redlines[activeClause.id] || null : null;

  const handleSelectClause = (clauseId: string) => {
    const c = clauseById[clauseId];
    if (!c) return;
    setActiveClauseId(clauseId);
    setPageNumber(c.page_number || 1);
    setRightTab('analysis');
  };

  const submitComment = async () => {
    if (!contract?.matter_id) return;
    if (!newComment.trim()) return;
    await createComment({
      matterId: contract.matter_id,
      documentId: id,
      text: newComment,
      anchor: activeClauseId
        ? { clause_id: activeClauseId, page_number: activeClause?.page_number }
        : { page_number: pageNumber },
    });
    setNewComment('');
    setRightTab('comments');
  };

  const createRedline = async () => {
    if (!activeClause) return;
    const res = await api.post(`/contracts/${id}/redlines/`, {
      clause_id: activeClause.id,
      action: 'revision',
    });
    setRedlines((prev) => ({ ...prev, [activeClause.id]: res.data }));
  };

  const acceptRedline = async (redlineId: string) => {
    const res = await api.post(`/contracts/${id}/redlines/${redlineId}/accept/`);
    const updated: RedlineApi = res.data;
    setRedlines((prev) => ({ ...prev, [updated.clause_id]: updated }));
  };

  const rejectRedline = async (redlineId: string) => {
    const res = await api.post(`/contracts/${id}/redlines/${redlineId}/reject/`);
    const updated: RedlineApi = res.data;
    setRedlines((prev) => ({ ...prev, [updated.clause_id]: updated }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load contract</AlertTitle>
        <AlertDescription>{error || 'Unknown error'}</AlertDescription>
      </Alert>
    );
  }

  const dims = baseDims ? { width: baseDims.width * scale, height: baseDims.height * scale } : { width: 800 * scale, height: 1100 * scale };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      <div className="w-[320px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <ClauseNavigator
          clauses={clauses.map((c) => ({
            id: c.id,
            clause_type: c.clause_type,
            page_number: c.page_number,
            confidence_score: c.confidence_score,
            risk_level: c.risk_level,
            standard_deviation: c.standard_deviation,
          }))}
          activeClauseId={activeClauseId}
          onSelect={handleSelectClause}
        />
      </div>

      <div className="flex-1 bg-zinc-950/95 rounded-xl border border-zinc-800 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200">
            <FileText className="w-4 h-4 text-zinc-400" />
            <div className="text-sm font-semibold line-clamp-1">{contract.file_name}</div>
            <div className="ml-4 flex items-center gap-1">
              {participants.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  title={p.name}
                  className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center text-[10px] font-bold"
                >
                  {(p.name || 'U').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}
                </div>
              ))}
              {participants.length > 6 && (
                <div className="text-xs text-zinc-400 ml-1">+{participants.length - 6}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.max(0.6, Math.round((s - 0.1) * 10) / 10))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <div className="text-xs text-zinc-300 w-[64px] text-center">{Math.round(scale * 100)}%</div>
            <Button variant="outline" size="sm" onClick={() => setScale((s) => Math.min(2.0, Math.round((s + 0.1) * 10) / 10))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-zinc-800 mx-2" />
            <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-xs text-zinc-300 w-[88px] text-center">
              Page {pageNumber}{numPages ? ` / ${numPages}` : ''}
            </div>
            <Button variant="outline" size="sm" onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto flex items-start justify-center p-8">
          <div className="relative" style={{ width: dims.width, height: dims.height }}>
            <PdfDocument
              file={contract.download_url}
              onLoadSuccess={(pdf) => {
                setNumPages(pdf.numPages);
              }}
              loading={<div className="text-zinc-300 text-sm">Loading PDF...</div>}
              error={<div className="text-zinc-300 text-sm">Failed to load PDF.</div>}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                onLoadSuccess={(page) => {
                  const vp = page.getViewport({ scale: 1 });
                  setBaseDims({ width: vp.width, height: vp.height });
                }}
              />
            </PdfDocument>

            <ContractViewerClauseOverlay
              width={dims.width}
              height={dims.height}
              scale={scale}
              pageNumber={pageNumber}
              clauses={overlayClauses}
              activeClauseId={activeClauseId}
              onHoverClause={setHoverClauseId}
              onClickClause={(clauseId) => setActiveClauseId(clauseId)}
            />
          </div>
        </div>
      </div>

      <div className="w-[380px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 flex gap-2">
            <button
              className={cn(
                'flex-1 h-9 rounded-md text-sm font-semibold',
                rightTab === 'analysis'
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              )}
              onClick={() => setRightTab('analysis')}
            >
              Analysis
            </button>
            <button
              className={cn(
                'flex-1 h-9 rounded-md text-sm font-semibold',
                rightTab === 'comments'
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              )}
              onClick={() => setRightTab('comments')}
            >
              Comments
            </button>
          </div>

          {rightTab === 'analysis' ? (
            <ClauseAnalysisPanel
              clause={activeClause}
              redline={activeRedline}
              onCreateRedline={createRedline}
              onAcceptRedline={acceptRedline}
              onRejectRedline={rejectRedline}
            />
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="text-sm font-semibold">Document Comments</div>
                <div className="mt-2 text-xs text-zinc-500">
                  {activeClause ? `Anchored to: ${activeClause.clause_type}` : `Anchored to page ${pageNumber}`}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment" />
                  <Button onClick={submitComment} disabled={!newComment.trim()}>Post</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {comments.length === 0 ? (
                  <div className="p-6 text-sm text-zinc-500">No comments yet.</div>
                ) : (
                  comments
                    .filter((c) => c.document === id)
                    .map((c) => (
                      <div key={c.id} className={cn('rounded-lg border p-3', c.status === 'resolved' ? 'border-zinc-200 dark:border-zinc-800 opacity-70' : 'border-zinc-200 dark:border-zinc-800')}>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">{c.user_name}</div>
                          <div className="text-[10px] uppercase font-bold text-zinc-400">{c.status}</div>
                        </div>
                        <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{c.text}</div>
                        {c.replies?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {c.replies.map((r) => (
                              <div key={r.id} className="pl-3 border-l border-zinc-200 dark:border-zinc-800">
                                <div className="text-xs font-semibold">{r.user_name}</div>
                                <div className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{r.text}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {c.status !== 'resolved' && (
                          <div className="mt-3 flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => reply(c.id, 'Acknowledged.')}>
                              Quick reply
                            </Button>
                            <Button size="sm" onClick={() => resolve(c.id)}>Resolve</Button>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

