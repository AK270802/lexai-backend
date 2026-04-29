'use client';

import { useState, useEffect, useRef } from 'react';
import { useResearch, Source } from '@/stores/use-research';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Search, 
  Send, 
  Loader2, 
  BookOpen, 
  History, 
  Copy, 
  Bookmark, 
  ChevronRight,
  ExternalLink,
  Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    resetCurrent
  } = useResearch();

  const [query, setQuery] = useState('');
  const [selectedMatter, setSelectedMatter] = useState('');
  const [matters, setMatters] = useState<any[]>([]);
  const responseEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
    fetchMatters();
  }, [fetchHistory]);

  useEffect(() => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentResponse]);

  const fetchMatters = async () => {
    try {
      const response = await api.get('/matters/');
      setMatters(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to fetch matters:', err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isStreaming) return;
    startResearch(query, selectedMatter || undefined);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentResponse);
  };

  const loadFromHistory = (item: any) => {
    useResearch.setState({
      currentQuery: item.query,
      currentResponse: item.response,
      currentSources: item.sources,
      isStreaming: false,
      statusMessage: ''
    });
    setQuery(item.query);
    setSelectedMatter(item.matter || '');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Legal Research</h1>
          <p className="text-zinc-500 mt-1">
            Query your organization&apos;s knowledge base with AI-powered research and citations.
          </p>
        </div>
        <Button variant="outline" onClick={resetCurrent} className="gap-2">
          <History className="w-4 h-4" />
          New Research
        </Button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left Column: Query Composer & History */}
        <div className="w-1/3 flex flex-col gap-6">
          {/* Query Form */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query">Your Question</Label>
                <textarea
                  id="query"
                  className="flex min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
                  placeholder="e.g., What are the standard indemnification clauses for software SaaS agreements in California?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={isStreaming}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="matter">Matter (Optional)</Label>
                <select
                  id="matter"
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus-visible:ring-zinc-300"
                  value={selectedMatter}
                  onChange={(e) => setSelectedMatter(e.target.value)}
                  disabled={isStreaming}
                >
                  <option value="">All Matters</option>
                  {matters.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isStreaming || !query.trim()}>
                {isStreaming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Run Research
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* History Sidebar */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 font-semibold">
              <History className="w-4 h-4 text-zinc-500" />
              Recent Queries
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {history.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm italic">
                  No research history yet.
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="w-full text-left p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800"
                  >
                    <p className="text-sm font-medium line-clamp-1 text-zinc-900 dark:text-zinc-100">
                      {item.query}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      {item.matter_title && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800 line-clamp-1">
                          {item.matter_title}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Answer & Sources */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Answer Panel */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <Scale className="w-4 h-4 text-blue-600" />
                Legal Intelligence Answer
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!currentResponse}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" disabled={!currentResponse}>
                  <Bookmark className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 prose dark:prose-invert max-w-none">
              {!currentQuery && !isStreaming ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Ready to Research</h3>
                    <p className="text-sm max-w-xs">
                      Enter a legal question on the left to begin your research process.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {statusMessage && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 animate-pulse bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {statusMessage}
                    </div>
                  )}
                  
                  <div className="text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                    {currentResponse || (isStreaming && 'Thinking...')}
                  </div>
                  <div ref={responseEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Sources Panel */}
          {currentSources.length > 0 && (
            <div className="h-1/3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 font-semibold text-sm">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Grounded Citations ({currentSources.length})
              </div>
              <div className="flex-1 overflow-x-auto p-4 flex gap-4">
                {currentSources.map((source, idx) => (
                  <div 
                    key={source.id} 
                    className="min-w-[300px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                        SOURCE {idx + 1}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Score: {(source.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      <Scale className="w-3 h-3" />
                      {source.document_name}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-3 italic">
                      &quot;{source.excerpt}&quot;
                    </p>
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase">Page {source.page_number}</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
                        View Doc <ExternalLink className="w-2 h-2" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
