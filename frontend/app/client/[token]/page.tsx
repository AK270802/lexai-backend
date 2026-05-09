'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Loader2,
  Eye,
  MessageSquare,
  PenLine,
  ChevronRight,
} from 'lucide-react';
import { portalApi } from '@/lib/api/portal';
import type { PortalView } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function permissionLabel(mode: string): { label: string; desc: string; icon: React.ComponentType<{ className?: string }> } {
  const map: Record<string, { label: string; desc: string; icon: React.ComponentType<{ className?: string }> }> = {
    read: { label: 'Read Only', desc: 'You may view documents shared with you.', icon: Eye },
    comment: { label: 'Read & Comment', desc: 'You may view documents and add comments.', icon: MessageSquare },
    sign: { label: 'Read, Comment & Sign', desc: 'You may view, comment on, and acknowledge these documents.', icon: PenLine },
  };
  return map[mode] ?? map.read;
}

function fileTypeLabel(ft: string): string {
  if (ft.includes('pdf')) return 'PDF';
  if (ft.includes('word') || ft.includes('docx')) return 'Word';
  if (ft.includes('text')) return 'Text';
  return ft.split('/').pop()?.toUpperCase() ?? 'File';
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-zinc-200 dark:border-zinc-800" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Verifying secure link...</p>
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorScreenProps {
  message: string;
}

function ErrorScreen({ message }: ErrorScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Link unavailable</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{message}</p>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          If you believe this is an error, please contact the firm that sent you this link.
        </p>
      </div>
    </div>
  );
}

// ─── Acknowledge / Sign form ──────────────────────────────────────────────────

interface AcknowledgeFormProps {
  token: string;
  mode: string;
  onDone: () => void;
}

function AcknowledgeForm({ token, mode, onDone }: AcknowledgeFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await portalApi.recordAction(token, {
        action: mode === 'sign' ? 'sign' : 'acknowledge',
        actor_name: name || undefined,
        actor_email: email || undefined,
        metadata: { timestamp: new Date().toISOString() },
      });
      onDone();
    } catch {
      setError('Failed to record your action. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSign = mode === 'sign';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Your Name <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSign ? (
          <PenLine className="w-4 h-4" />
        ) : (
          <CheckCircle2 className="w-4 h-4" />
        )}
        {isSign ? 'Sign Document' : 'Acknowledge Receipt'}
      </button>
    </form>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  doc: PortalView['documents'][number];
  token: string;
}

function DocumentCard({ doc, token }: DocumentCardProps) {
  const label = fileTypeLabel(doc.file_type);
  const canDownload = !!doc.download_url;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{doc.file_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span
              className={cn(
                'text-xs font-medium capitalize',
                doc.parse_status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
              )}
            >
              {doc.parse_status}
            </span>
          </div>
        </div>
      </div>

      {canDownload && (
        <a
          href={doc.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      )}
    </div>
  );
}

// ─── Main Portal View ─────────────────────────────────────────────────────────

interface PortalContentProps {
  portal: PortalView;
  token: string;
}

function PortalContent({ portal, token }: PortalContentProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const perm = permissionLabel(portal.permissions.mode);
  const canAct = portal.permissions.mode === 'sign' || portal.permissions.mode === 'comment';
  const expired = new Date(portal.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header / Nav bar */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm tracking-tight">LexAI</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Secure Client Portal</span>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Encrypted &amp; Secure</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Matter info */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Matter</p>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{portal.matter.title}</h1>
              {portal.matter.description && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  {portal.matter.description}
                </p>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Access expires{' '}
                <span className={cn('font-medium', expired ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300')}>
                  {formatDate(portal.expires_at)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <perm.icon className="w-3.5 h-3.5" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{perm.label}</span>
            </div>
          </div>

          {expired && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                This portal link has expired. Please request a new link from your legal team.
              </p>
            </div>
          )}
        </div>

        {/* Permission notice */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 px-4 py-3">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">{perm.desc}</p>
        </div>

        {/* Documents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Documents
              <span className="ml-2 text-sm font-normal text-zinc-400">
                ({portal.documents.length})
              </span>
            </h2>
          </div>

          {portal.documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-10 flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No documents are available for this matter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {portal.documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} token={token} />
              ))}
            </div>
          )}
        </div>

        {/* Acknowledge / Sign section */}
        {!expired && (portal.permissions.mode === 'sign' || portal.permissions.mode === 'comment') && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              {portal.permissions.mode === 'sign' ? (
                <PenLine className="w-5 h-5 text-blue-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              )}
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
                {portal.permissions.mode === 'sign' ? 'Sign Documents' : 'Acknowledge Receipt'}
              </h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {portal.permissions.mode === 'sign'
                ? 'By signing below, you confirm that you have read and understood the documents shared with you.'
                : 'Please confirm that you have received and reviewed the documents shared with you.'}
            </p>

            {acknowledged ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {portal.permissions.mode === 'sign' ? 'Document signed' : 'Acknowledged'}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Your response has been recorded at {new Date().toLocaleString()}.
                  </p>
                </div>
              </div>
            ) : (
              <AcknowledgeForm
                token={token}
                mode={portal.permissions.mode}
                onDone={() => setAcknowledged(true)}
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            This is a secure, encrypted link. Do not share this URL with anyone.
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Powered by <span className="font-semibold text-zinc-500 dark:text-zinc-500">LexAI</span>
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [portal, setPortal] = useState<PortalView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await portalApi.validateToken(token);
      setPortal(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      const detail = err?.response?.data?.error ?? err?.response?.data?.detail;
      if (detail === 'expired') {
        setError('This portal link has expired. Please contact your legal team for a new link.');
      } else if (detail === 'invalid' || detail === 'not_found') {
        setError('This portal link is invalid or has already been used.');
      } else {
        setError('Unable to load the portal. The link may be invalid or expired.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchPortal();
  }, [fetchPortal, token]);

  if (loading) return <LoadingScreen />;
  if (error || !portal) return <ErrorScreen message={error ?? 'Unknown error.'} />;

  return <PortalContent portal={portal} token={token} />;
}
