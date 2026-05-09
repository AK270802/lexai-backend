'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  FileType,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { documentsApi } from '@/lib/api/documents';
import { mattersApi } from '@/lib/api/matters';
import { cn, formatFileSize, parseErrorMessage } from '@/lib/utils';
import type { Document, Matter } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

interface FileEntry {
  file: File;
  id: string; // local uid
  status: FileStatus;
  progress: number; // 0-100 (simulated)
  error?: string;
  document?: Document;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function isAcceptedType(file: File): boolean {
  return (
    Object.keys(ACCEPTED_TYPES).includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
}

function FileIcon({ file }: { file: File }) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  return (
    <div
      className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
        isPdf
          ? 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400'
          : 'bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400',
      )}
    >
      {isPdf ? <FileText className="w-5 h-5" /> : <FileType className="w-5 h-5" />}
    </div>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter(isAcceptedType);
      if (files.length) onFiles(files);
    },
    [onFiles, disabled],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(isAcceptedType);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5 dark:bg-primary/10'
          : 'border-zinc-300 dark:border-zinc-700 hover:border-primary/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-3 pointer-events-none">
        <div
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
            isDragging
              ? 'bg-primary/10 text-primary'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500',
          )}
        >
          <Upload className="w-8 h-8" />
        </div>

        <div>
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            or{' '}
            <span className="text-primary font-medium underline underline-offset-2">browse</span>
          </p>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Supported formats: PDF, DOCX &middot; Max size: 50 MB per file
        </p>
      </div>
    </div>
  );
}

// ─── File row ─────────────────────────────────────────────────────────────────

interface FileRowProps {
  entry: FileEntry;
  onRemove: (id: string) => void;
  onView: (doc: Document) => void;
}

function FileRow({ entry, onRemove, onView }: FileRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-colors',
        entry.status === 'error'
          ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20'
          : entry.status === 'success'
          ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
      )}
    >
      <FileIcon file={entry.file} />

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
          {entry.file.name}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatFileSize(entry.file.size)}
        </p>

        {/* Progress bar */}
        {entry.status === 'uploading' && (
          <div className="mt-2 h-1 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${entry.progress}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {entry.status === 'error' && entry.error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{entry.error}</p>
        )}
      </div>

      {/* Status indicator */}
      <div className="shrink-0 flex items-center gap-2">
        {entry.status === 'uploading' && (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        )}
        {entry.status === 'success' && (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {entry.document && (
              <button
                onClick={() => onView(entry.document!)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                View
              </button>
            )}
          </>
        )}
        {entry.status === 'error' && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
        {(entry.status === 'pending' || entry.status === 'error') && (
          <button
            onClick={() => onRemove(entry.id)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Matter selector ──────────────────────────────────────────────────────────

interface MatterSelectProps {
  value: string;
  onChange: (id: string) => void;
  matters: Matter[];
  isLoading: boolean;
}

function MatterSelect({ value, onChange, matters, isLoading }: MatterSelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className={cn(
          'w-full h-10 rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm',
          'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
        )}
      >
        <option value="">No matter (unassigned)</option>
        {matters.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [matterId, setMatterId] = useState('');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [mattersLoading, setMattersLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ── Fetch matters ──────────────────────────────────────────────────────────

  useEffect(() => {
    mattersApi
      .list({ status: 'active' })
      .then((data) => setMatters(data))
      .catch(() => {
        /* non-critical; just leave empty */
      })
      .finally(() => setMattersLoading(false));
  }, []);

  // ── File management ────────────────────────────────────────────────────────

  function addFiles(files: File[]) {
    const newEntries: FileEntry[] = files.map((file) => ({
      file,
      id: uid(),
      status: 'pending',
      progress: 0,
    }));
    setEntries((prev) => {
      // Deduplicate by name
      const existingNames = new Set(prev.map((e) => e.file.name));
      return [...prev, ...newEntries.filter((e) => !existingNames.has(e.file.name))];
    });
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function updateEntry(id: string, patch: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function handleUpload() {
    const pending = entries.filter((e) => e.status === 'pending' || e.status === 'error');
    if (!pending.length) return;

    setIsUploading(true);
    setGlobalError(null);

    await Promise.allSettled(
      pending.map(async (entry) => {
        updateEntry(entry.id, { status: 'uploading', progress: 10, error: undefined });

        // Simulate incremental progress while awaiting
        const tick = setInterval(() => {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id && e.status === 'uploading'
                ? { ...e, progress: Math.min(e.progress + 15, 85) }
                : e,
            ),
          );
        }, 400);

        try {
          const doc = await documentsApi.upload(entry.file, matterId || undefined);
          clearInterval(tick);
          updateEntry(entry.id, { status: 'success', progress: 100, document: doc });
        } catch (err) {
          clearInterval(tick);
          updateEntry(entry.id, {
            status: 'error',
            progress: 0,
            error: parseErrorMessage(err),
          });
        }
      }),
    );

    setIsUploading(false);
  }

  // ── Computed states ────────────────────────────────────────────────────────

  const hasPending = entries.some((e) => e.status === 'pending' || e.status === 'error');
  const allDone = entries.length > 0 && entries.every((e) => e.status === 'success');
  const successCount = entries.filter((e) => e.status === 'success').length;

  function handleViewDocument(doc: Document) {
    router.push(`/contracts/${doc.id}`);
  }

  function handleUploadMore() {
    setEntries([]);
    setGlobalError(null);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <button className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Upload Documents
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Upload PDF or DOCX files for AI analysis and contract review.
        </p>
      </div>

      {/* All-done success state */}
      {allDone ? (
        <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {successCount} file{successCount !== 1 ? 's' : ''} uploaded
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Your documents are queued for AI parsing. This may take a moment.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            {successCount === 1 && entries[0]?.document && (
              <Button onClick={() => handleViewDocument(entries[0].document!)}>
                View Document
              </Button>
            )}
            <Button variant="outline" onClick={handleUploadMore}>
              Upload More
            </Button>
            <Link href="/documents">
              <Button variant="ghost">Back to Documents</Button>
            </Link>
          </div>

          {/* List of uploaded files */}
          <div className="mt-2 space-y-2 text-left">
            {entries.map((e) => (
              <FileRow key={e.id} entry={e} onRemove={removeEntry} onView={handleViewDocument} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Drop zone */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
            <DropZone onFiles={addFiles} disabled={isUploading} />

            {/* File list */}
            {entries.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Files ({entries.length})
                </p>
                <div className="space-y-2">
                  {entries.map((e) => (
                    <FileRow
                      key={e.id}
                      entry={e}
                      onRemove={removeEntry}
                      onView={handleViewDocument}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Matter selector */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3">
            <div>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Associate with Matter
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Optionally link these documents to an active matter.
              </p>
            </div>
            <MatterSelect
              value={matterId}
              onChange={setMatterId}
              matters={matters}
              isLoading={mattersLoading}
            />
          </div>

          {/* Global error */}
          {globalError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {globalError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <Link href="/documents">
              <Button variant="outline">Cancel</Button>
            </Link>

            <Button
              onClick={handleUpload}
              disabled={!hasPending || isUploading}
              className="flex items-center gap-2 min-w-[140px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload{entries.filter((e) => e.status === 'pending' || e.status === 'error').length > 0
                    ? ` ${entries.filter((e) => e.status === 'pending' || e.status === 'error').length} file${entries.filter((e) => e.status === 'pending' || e.status === 'error').length !== 1 ? 's' : ''}`
                    : ''}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
