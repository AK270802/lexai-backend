'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useResearch } from '@/stores/use-research';
import { mattersApi } from '@/lib/api/matters';
import type { Matter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import { useToast } from '@/components/ui/toast';
import { cn, truncate, formatRelative, parseErrorMessage } from '@/lib/utils';
import {
  Search,
  Send,
  Loader2,
  BookOpen,
  History,
  Copy,
  Check,
  Plus,
  Scale,
  FileText,
  ChevronRight,
  Square,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

// ─── Example prompts shown in empty state ─────────────────────────────────────

const EXAMPLE_PROMPTS = [
  'What are standard indemnification clauses for SaaS agreements in California?',
  'Summarize the key obligations and risks in this NDA across all matters.',
  'What is our organization\'s preferred governing law clause for vendor contracts?',
  'Compare termination-for-convenience provisions across our active agreements.',
  'What are the typical notice periods in our employment agreements?',
];

// ─── Relevance score pill ─────────────────────────────────────────────────────

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-muted-foreground/40';
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 rounded-full bg-border overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

// ─── History skeleton ─────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

// ─── Progress steps for streaming ────────────────────────────────────────────

const RESEARCH_STEPS = [
  { id: 'analyze', label: 'Analyzing query', keywords: ['analyz', 'understanding', 'processing'] },
  { id: 'retrieve', label: 'Searching documents', keywords: ['search', 'retriev', 'scanning', 'finding'] },
  { id: 'generate', label: 'Generating response', keywords: ['generat', 'synthesiz', 'drafting', 'writing', 'token'] },
];

function ResearchProgressSteps({ statusMessage }: { statusMessage: string }) {
  const lower = statusMessage.toLowerCase();
  const activeIdx = RESEARCH_STEPS.findIndex((s) => s.keywords.some((k) => lower.includes(k)));
  const current = activeIdx >= 0 ? activeIdx : 0;

  return (
    <div className="flex items-center gap-0 px-1">
      {RESEARCH_STEPS.map((step, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={step.id} className="flex items-center gap-0 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-none text-[9px] font-bold transition-all',
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                    ? 'bg-primary/20 text-primary border border-primary/40'
                    : 'bg-muted text-muted-foreground/40'
                )}
              >
                {done ? <Check className="w-2.5 h-2.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium truncate transition-colors',
                  done ? 'text-primary' : active ? 'text-primary/80' : 'text-muted-foreground/40'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < RESEARCH_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-2 transition-colors',
                  done ? 'bg-primary/40' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const {
    history,
    currentQuery,
    currentResponse,
    currentSources,
    isStreaming,
    statusMessage,
    fetchHistory,
    startResearch,
    stopResearch,
    resetCurrent,
    loadFromHistory,
  } = useResearch();

  // Local state
  const [query, setQuery] = useState('');
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [mattersLoading, setMattersLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const responseEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchHistory().finally(() => setHistoryLoading(false));
    mattersApi
      .list({ status: 'active' })
      .then(setMatters)
      .catch(() => {/* non-fatal */})
      .finally(() => setMattersLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll response ──────────────────────────────────────────────────

  useEffect(() => {
    if (isStreaming && responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentResponse, isStreaming]);

  // ── Sync query box when loading from history ──────────────────────────────

  useEffect(() => {
    if (currentQuery) setQuery(currentQuery);
  }, [currentQuery]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = query.trim();
      if (!trimmed || isStreaming) return;
      setErrorMsg('');
      startResearch(trimmed, selectedMatterId || undefined);
    },
    [query, isStreaming, selectedMatterId, startResearch]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewResearch = () => {
    resetCurrent();
    setQuery('');
    setSelectedMatterId('');
    setErrorMsg('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleCopy = async () => {
    if (!currentResponse) return;
    await navigator.clipboard.writeText(currentResponse).catch(() => {});
    setCopied(true);
    toast({ variant: 'success', title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHistoryClick = (item: Parameters<typeof loadFromHistory>[0]) => {
    loadFromHistory(item);
    setQuery(item.query);
    setSelectedMatterId(item.matter ?? '');
    setErrorMsg('');
  };

  const handleExamplePrompt = (prompt: string) => {
    setQuery(prompt);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const hasContent = Boolean(currentQuery || currentResponse || isStreaming);
  const showError = statusMessage.startsWith('Error:');

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-0 -m-6 overflow-hidden">

      {/* ── LEFT: History Sidebar ─────────────────────────────────────────── */}
      <aside className="w-[272px] flex-none flex flex-col border-r border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-none">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <History className="w-4 h-4 text-muted-foreground" />
            Research History
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewResearch}
            className="h-7 gap-1 text-xs text-primary hover:text-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {historyLoading ? (
            <HistorySkeleton />
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
              <Search className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No research history yet.</p>
              <p className="text-xs text-muted-foreground/60">Your past queries will appear here.</p>
            </div>
          ) : (
            <div className="space-y-px px-2 py-1">
              {history.map((item) => {
                const isActive = currentQuery === item.query;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryClick(item)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg transition-colors group',
                      isActive
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <ChevronRight
                        className={cn(
                          'w-3 h-3 mt-0.5 flex-none transition-transform',
                          isActive ? 'text-primary rotate-90' : 'text-muted-foreground/40 group-hover:text-muted-foreground'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug line-clamp-2">
                          {item.query}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatRelative(item.created_at)}
                          </span>
                          {item.matter && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              Matter
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ── RIGHT: Main Workspace ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Search bar area ───────────────────────────────────────────── */}
        <div className="flex-none border-b border-border bg-background px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Textarea + submit row */}
            <div className="relative flex items-start gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  placeholder="Ask anything about your legal matters, contracts, or case law…"
                  className={cn(
                    'w-full resize-none rounded-xl border border-input bg-card px-4 py-3 pr-12',
                    'text-sm placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
                    'disabled:opacity-60 transition-colors',
                    'scrollbar-thin leading-relaxed'
                  )}
                />
                <div className="absolute right-3 bottom-2.5 text-[10px] text-muted-foreground/40 pointer-events-none select-none">
                  ⌘↵
                </div>
              </div>

              {isStreaming ? (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={stopResearch}
                  className="flex-none h-[4.5rem] px-4 rounded-xl gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={!query.trim()}
                  className="flex-none h-[4.5rem] px-5 rounded-xl gap-2"
                >
                  <Send className="w-4 h-4" />
                  Research
                </Button>
              )}
            </div>

            {/* Matter selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-none">
                <Scale className="w-3.5 h-3.5" />
                <span>Scope:</span>
              </div>
              <select
                value={selectedMatterId}
                onChange={(e) => setSelectedMatterId(e.target.value)}
                disabled={isStreaming || mattersLoading}
                className={cn(
                  'h-7 rounded-md border border-input bg-card px-2 text-xs',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  'disabled:opacity-50 text-muted-foreground hover:text-foreground',
                  'max-w-[280px] transition-colors'
                )}
              >
                <option value="">All matters &amp; documents</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>

              {selectedMatterId && (
                <button
                  type="button"
                  onClick={() => setSelectedMatterId('')}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Content area ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">

          {/* ── Empty state ─────────────────────────────────────────────── */}
          {!hasContent && (
            <div className="flex flex-col items-center justify-center gap-8 py-20 px-8 max-w-2xl mx-auto">
              {/* Icon */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-9 h-9 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-md">
                  <Scale className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </div>

              {/* Headline */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Ask anything about your legal matters</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  The AI research engine searches across all your documents, contracts, and legal knowledge base — grounded in your actual files.
                </p>
              </div>

              {/* Example prompts */}
              <div className="w-full space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  Try asking
                </p>
                <div className="grid gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleExamplePrompt(prompt)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-xl border border-border bg-card',
                        'hover:border-primary/40 hover:bg-primary/5 transition-colors',
                        'text-sm text-muted-foreground hover:text-foreground group flex items-center gap-3'
                      )}
                    >
                      <Search className="w-3.5 h-3.5 flex-none text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      <span className="line-clamp-1">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Active research content ──────────────────────────────────── */}
          {hasContent && (
            <div className="px-6 py-6 space-y-6 max-w-4xl">

              {/* Query label */}
              {currentQuery && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary flex-none flex items-center justify-center mt-0.5">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground pt-1">{currentQuery}</p>
                </div>
              )}

              {/* Status indicator with progress steps */}
              {statusMessage && !showError && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/8 border border-primary/20 text-primary text-xs font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-none" />
                    <span>{statusMessage}</span>
                  </div>
                  <ResearchProgressSteps statusMessage={statusMessage} />
                </div>
              )}

              {/* Error indicator */}
              {showError && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-none" />
                  <span>{statusMessage.replace('Error: ', '')}</span>
                </div>
              )}

              {/* Sources panel */}
              {currentSources.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Sources ({currentSources.length})
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
                    {currentSources.map((source, idx) => (
                      <div
                        key={source.id}
                        className={cn(
                          'flex-none w-[260px] rounded-xl border border-border bg-card p-4 space-y-2.5',
                          'hover:border-primary/30 transition-colors cursor-default'
                        )}
                      >
                        {/* Citation badge + score */}
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <RelevanceBar score={source.score} />
                        </div>

                        {/* Document name */}
                        <div className="flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 flex-none text-muted-foreground mt-0.5" />
                          <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                            {source.document_name}
                          </p>
                        </div>

                        {/* Excerpt */}
                        <p className="text-[11px] text-muted-foreground italic leading-relaxed line-clamp-3 border-l-2 border-primary/20 pl-2.5">
                          &ldquo;{source.excerpt}&rdquo;
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                            Page {source.page_number}
                          </span>
                          <button className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Response */}
              {(currentResponse || isStreaming) && (
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        LexAI Analysis
                      </span>
                    </div>
                    {!isStreaming && currentResponse && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Response body */}
                  <div className="rounded-xl border border-border bg-card p-6">
                    {currentResponse ? (
                      <Markdown content={currentResponse} streaming={isStreaming} />
                    ) : (
                      <div className="flex items-center gap-2.5 text-muted-foreground/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <div className="w-1 h-1 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.15s' }} />
                        <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
                        <span className="text-xs italic ml-1">Generating legal analysis…</span>
                      </div>
                    )}
                    <div ref={responseEndRef} />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
