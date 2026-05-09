'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  FileType,
  Search,
  Upload,
  Trash2,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { documentsApi } from '@/lib/api/documents';
import { cn, formatDate, formatFileSize, parseErrorMessage, statusBadgeClass } from '@/lib/utils';
import type { Document, ParseStatus } from '@/lib/types';

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: ParseStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseStatusIcon(status: ParseStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'processing':
      return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    case 'failed':
      return <AlertCircle className="w-3.5 h-3.5" />;
    default:
      return <Clock className="w-3.5 h-3.5" />;
  }
}

function fileTypeLabel(fileType: string): string {
  if (fileType.includes('pdf')) return 'PDF';
  if (fileType.includes('wordprocessingml') || fileType.includes('msword')) return 'DOCX';
  if (fileType.includes('text/plain')) return 'TXT';
  return fileType.split('/').pop()?.toUpperCase() ?? fileType;
}

function FileIcon({ fileType }: { fileType: string }) {
  const isPdf = fileType.includes('pdf');
  return (
    <div
      className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
        isPdf
          ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
      )}
    >
      {isPdf ? <FileText className="w-5 h-5" /> : <FileType className="w-5 h-5" />}
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800" />
          </td>
          <td className="px-4 py-3" />
        </tr>
      ))}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ParseStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await documentsApi.list();
      setDocuments(data);
    } catch (err) {
      setError(parseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = documents;
    if (statusFilter !== 'all') {
      list = list.filter((d) => d.parse_status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.file_name.toLowerCase().includes(q));
    }
    return list;
  }, [documents, statusFilter, search]);

  // ── Selection ──────────────────────────────────────────────────────────────

  const allSelected = filtered.length > 0 && filtered.every((d) => selected.has(d.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleBulkDelete() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} document(s)? This cannot be undone.`)) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await Promise.all([...selected].map((id) => documentsApi.delete(id)));
      setSelected(new Set());
      await fetchDocuments();
    } catch (err) {
      setDeleteError(parseErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function handleRowClick(doc: Document) {
    if (doc.parse_status === 'completed') {
      router.push(`/contracts/${doc.id}`);
    } else {
      // Non-completed: just show document (contracts page handles not-found gracefully)
      router.push(`/contracts/${doc.id}`);
    }
  }

  // ── Status counts ──────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    for (const d of documents) {
      counts[d.parse_status] = (counts[d.parse_status] ?? 0) + 1;
    }
    return counts;
  }, [documents]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Documents</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage and analyze your legal documents
          </p>
        </div>
        <Link href="/documents/upload">
          <Button className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Search documents..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {selected.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            )}
          >
            {f.label}
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[10px] font-bold',
                statusFilter === f.value
                  ? 'bg-white/20 text-white'
                  : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
              )}
            >
              {statusCounts[f.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Error banners */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={fetchDocuments} className="ml-auto underline text-xs font-medium">
            Retry
          </button>
        </div>
      )}
      {deleteError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {deleteError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={isLoading || filtered.length === 0}
                  className="rounded border-zinc-300 dark:border-zinc-600 cursor-pointer accent-primary"
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Document
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Matter
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Uploaded
              </th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FolderOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
                    <p className="font-semibold text-zinc-500 dark:text-zinc-400">
                      {search || statusFilter !== 'all'
                        ? 'No documents match your filters'
                        : 'No documents yet'}
                    </p>
                    {!search && statusFilter === 'all' && (
                      <Link href="/documents/upload">
                        <Button size="sm" className="mt-1">
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Upload your first document
                        </Button>
                      </Link>
                    )}
                    {(search || statusFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setStatusFilter('all');
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr
                  key={doc.id}
                  className={cn(
                    'group transition-colors cursor-pointer',
                    selected.has(doc.id)
                      ? 'bg-primary/5'
                      : 'hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40',
                  )}
                  onClick={() => handleRowClick(doc)}
                >
                  {/* Checkbox */}
                  <td
                    className="px-4 py-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOne(doc.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(doc.id)}
                      onChange={() => toggleOne(doc.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-zinc-300 dark:border-zinc-600 cursor-pointer accent-primary"
                    />
                  </td>

                  {/* Name + size */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileIcon fileType={doc.file_type} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate max-w-xs">
                          {doc.file_name}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {formatFileSize(doc.file_size)}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* File type */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {fileTypeLabel(doc.file_type)}
                    </span>
                  </td>

                  {/* Parse status */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize',
                        statusBadgeClass(doc.parse_status),
                      )}
                    >
                      {parseStatusIcon(doc.parse_status)}
                      {doc.parse_status}
                    </span>
                  </td>

                  {/* Matter */}
                  <td className="px-4 py-3">
                    {doc.matter_title ? (
                      <Link
                        href={`/matters/${doc.matter}`}
                        className="text-xs text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {doc.matter_title}
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {formatDate(doc.created_at)}
                  </td>

                  {/* Arrow */}
                  <td className="px-4 py-3">
                    <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors ml-auto" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-800/20">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Showing {filtered.length} of {documents.length} document
              {documents.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
