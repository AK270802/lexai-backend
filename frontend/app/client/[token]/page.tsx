'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import { Loader2, ShieldCheck, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { ContractViewerClauseOverlay, ClauseOverlayItem, RiskLevel } from '@/components/contracts/ContractViewerClauseOverlay';
import { cn } from '@/lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();

type PortalMeta = {
  matter: { id: string; title: string };
  documents: Array<{ id: string; file_name: string; file_type: string; parse_status: string; download_url: string; clauses_count: number }>;
  permissions: any;
  expires_at: string;
};

type PortalDoc = {
  document: { id: string; file_name: string; file_type: string; download_url: string };
  clauses: Array<{
    id: string;
    clause_type: string;
    raw_text: string;
    page_number: number;
    risk_level: RiskLevel;
    risk_reason?: string;
    standard_deviation?: boolean;
    confidence_score?: number | null;
    highlights: Array<{ page_number: number; rects: Array<{ x: number; y: number; width: number; height: number }> }>;
  }>;
};

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PortalMeta | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docData, setDocData] = useState<PortalDoc | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [baseDims, setBaseDims] = useState<{ width: number; height: number } | null>(null);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [ackName, setAckName] = useState('');
  const [ackEmail, setAckEmail] = useState('');
  const [ackDone, setAckDone] = useState(false);

  const fetchMeta = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/portal/${encodeURIComponent(token)}/`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error === 'expired' ? 'This portal link has expired.' : 'This portal link is invalid.');
        setMeta(null);
        return;
      }
      setMeta(data);
      const first = data.documents?.[0]?.id || null;
      setSelectedDocId(first);
    } catch {
      setError('Unable to load portal.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);

  const fetchDoc = useCallback(async (docId: string) => {
    try {
      setDocLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/portal/${encodeURIComponent(token)}/documents/${docId}/`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError('Unable to load document.');
        return;
      }
      setDocData(data);
      setPageNumber(1);
      setActiveClauseId(null);
    } finally {
      setDocLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (selectedDocId) fetchDoc(selectedDocId);
  }, [selectedDocId, fetchDoc]);

  const overlayClauses: ClauseOverlayItem[] = useMemo(() => {
    const clauses = docData?.clauses || [];
    return clauses.map((c) => ({
      id: c.id,
      clause_type: c.clause_type,
      risk_level: c.risk_level,
      risk_reason: c.risk_reason,
      confidence_score: c.confidence_score,
      standard_deviation: c.standard_deviation,
      highlights: c.highlights || [],
    }));
  }, [docData]);

  const clauseById = useMemo(() => {
    const m: any = {};
    for (const c of docData?.clauses || []) m[c.id] = c;
    return m;
  }, [docData]);

  const activeClause = activeClauseId ? clauseById[activeClauseId] : null;

  const dims = baseDims ? { width: baseDims.width * scale, height: baseDims.height * scale } : { width: 800 * scale, height: 1100 * scale };

  const acknowledge = async () => {
    try {
      const res = await fetch(`${apiBase}/portal/${encodeURIComponent(token)}/action/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', actor_name: ackName, actor_email: ackEmail }),
      });
      if (res.ok) setAckDone(true);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div className="max-w-3xl mx-auto p-10">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="text-lg font-semibold">Portal access unavailable</div>
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{error || 'Invalid token.'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase font-bold">Client Portal</div>
          <div className="text-xl font-semibold mt-1">{meta.matter.title}</div>
          <div className="text-xs text-zinc-500 mt-1">Read-only review</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Secure link expires {new Date(meta.expires_at).toLocaleString()}
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-190px)]">
        <div className="w-[320px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 font-semibold">Documents</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {meta.documents.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDocId(d.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  selectedDocId === d.id
                    ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/15'
                    : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold line-clamp-1">{d.file_name}</div>
                    <div className="mt-1 text-[10px] text-zinc-500 uppercase font-bold flex gap-2">
                      <span>{d.file_type.includes('pdf') ? 'PDF' : d.file_type}</span>
                      <span>{d.clauses_count} clauses</span>
                    </div>
                  </div>
                  <FileText className="w-4 h-4 text-zinc-400" />
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <div className="text-sm font-semibold">Acknowledge</div>
            {ackDone ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Acknowledged
              </div>
            ) : (
              <>
                <input className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm" placeholder="Your name (optional)" value={ackName} onChange={(e) => setAckName(e.target.value)} />
                <input className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-sm" placeholder="Email (optional)" value={ackEmail} onChange={(e) => setAckEmail(e.target.value)} />
                <button className="w-full h-9 rounded-md bg-blue-600 text-white text-sm font-semibold" onClick={acknowledge}>
                  Acknowledge review
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 bg-zinc-950/95 rounded-xl border border-zinc-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-200">{docData?.document.file_name || 'Document'}</div>
            <div className="flex items-center gap-2">
              <button className="h-9 px-3 rounded-md border border-zinc-800 text-zinc-200 text-sm" onClick={() => setScale((s) => Math.max(0.7, Math.round((s - 0.1) * 10) / 10))}>-</button>
              <div className="text-xs text-zinc-300 w-[64px] text-center">{Math.round(scale * 100)}%</div>
              <button className="h-9 px-3 rounded-md border border-zinc-800 text-zinc-200 text-sm" onClick={() => setScale((s) => Math.min(2.0, Math.round((s + 0.1) * 10) / 10))}>+</button>
              <div className="w-px h-6 bg-zinc-800 mx-2" />
              <button className="h-9 px-3 rounded-md border border-zinc-800 text-zinc-200 text-sm" onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>Prev</button>
              <div className="text-xs text-zinc-300 w-[88px] text-center">Page {pageNumber}{numPages ? ` / ${numPages}` : ''}</div>
              <button className="h-9 px-3 rounded-md border border-zinc-800 text-zinc-200 text-sm" onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))}>Next</button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-start justify-center p-8">
            {docLoading ? (
              <div className="text-zinc-300 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
            ) : docData?.document.file_type.includes('pdf') ? (
              <div className="relative" style={{ width: dims.width, height: dims.height }}>
                <PdfDocument
                  file={docData.document.download_url}
                  onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
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
                  onClickClause={(id) => setActiveClauseId(id)}
                />
              </div>
            ) : (
              <div className="text-zinc-200 text-sm">Unsupported document format for portal view.</div>
            )}
          </div>
        </div>

        <div className="w-[360px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 font-semibold">Clause Highlights</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(docData?.clauses || []).length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">No clause analysis available for this document.</div>
            ) : (
              (docData?.clauses || []).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveClauseId(c.id);
                    setPageNumber(c.page_number);
                  }}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    activeClauseId === c.id
                      ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/15'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold line-clamp-1">{c.clause_type}</div>
                      <div className="mt-1 text-[10px] text-zinc-500 uppercase font-bold flex gap-2">
                        <span>p.{c.page_number}</span>
                        <span>{c.risk_level}</span>
                      </div>
                      {c.risk_reason && <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">{c.risk_reason}</div>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          {activeClause && (
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-xs uppercase font-bold text-zinc-500">Selected</div>
              <div className="mt-1 text-sm font-semibold">{activeClause.clause_type}</div>
              <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-6">{activeClause.raw_text}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

