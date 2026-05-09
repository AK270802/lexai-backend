'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Briefcase,
  Users,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { mattersApi } from '@/lib/api/matters';
import type { Matter, MatterStatus } from '@/lib/types';
import { cn, formatDate, statusBadgeClass, parseErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { label: string; value: 'all' | MatterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Archived', value: 'archived' },
];

// ─── Skeleton Cards ───────────────────────────────────────────────────────────

function MatterCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Matter Card ──────────────────────────────────────────────────────────────

function MatterCard({ matter }: { matter: Matter }) {
  const router = useRouter();
  return (
    <Card
      className="group cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
      onClick={() => router.push(`/matters/${matter.id}`)}
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
            {matter.title.charAt(0).toUpperCase()}
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none',
              statusBadgeClass(matter.status)
            )}
          >
            {matter.status.replace('_', ' ')}
          </span>
        </div>

        <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {matter.title}
        </h3>

        {matter.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {matter.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/60">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {matter.parties.length} {matter.parties.length === 1 ? 'party' : 'parties'}
          </span>
          {matter._document_count != null && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {matter._document_count} doc{matter._document_count !== 1 ? 's' : ''}
            </span>
          )}
          <span className="ml-auto">{formatDate(matter.created_at)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  const router = useRouter();
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Briefcase className="w-7 h-7 text-muted-foreground" />
      </div>
      {filtered ? (
        <>
          <p className="text-sm font-medium text-foreground">No matters match your search</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different query or tab</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">No matters yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Create your first matter to get started
          </p>
          <Button size="sm" onClick={() => router.push('/matters/new')} className="gap-2">
            <Plus className="w-4 h-4" />
            Create your first matter
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MattersPage() {
  const router = useRouter();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | MatterStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    mattersApi
      .list()
      .then(setMatters)
      .catch((e) => setError(parseErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = matters;
    if (activeTab !== 'all') {
      list = list.filter((m) => m.status === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(q));
    }
    return list;
  }, [matters, activeTab, search]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: matters.length };
    for (const m of matters) {
      counts[m.status] = (counts[m.status] ?? 0) + 1;
    }
    return counts;
  }, [matters]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Matters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your legal matters and cases
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/matters/new')}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Matter
        </Button>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search matters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tabCounts[tab.value] != null && (
              <span
                className={cn(
                  'text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none',
                  activeTab === tab.value
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {tabCounts[tab.value] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MatterCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <EmptyState filtered={search.trim().length > 0 || activeTab !== 'all'} />
          ) : (
            filtered.map((matter) => <MatterCard key={matter.id} matter={matter} />)
          )}
        </div>
      )}
    </div>
  );
}
