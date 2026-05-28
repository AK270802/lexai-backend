'use client';

import { useEffect, useState } from 'react';
import {
  Link2,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Globe,
  Clock,
  ToggleLeft,
  Eye,
} from 'lucide-react';
import { portalApi } from '@/lib/api/portal';
import { mattersApi } from '@/lib/api/matters';
import type { Matter, PortalToken } from '@/lib/types';
import { cn, formatDate, parseErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPIRES_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '72 hours', value: 72 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
];

const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Read Only', desc: 'Client can view documents' },
  { value: 'comment', label: 'Comment', desc: 'Client can view and add comments' },
  { value: 'sign', label: 'Sign', desc: 'Client can view, comment, and acknowledge/sign' },
] as const;

type PermissionMode = 'read' | 'comment' | 'sign';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

// ─── Token URL Builder ────────────────────────────────────────────────────────

function buildTokenUrl(token: string): string {
  const base = APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/client/${token}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
        copied
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface TokenResultProps {
  token: PortalToken;
  onDismiss: () => void;
}

function TokenResult({ token, onDismiss }: TokenResultProps) {
  const url = buildTokenUrl(token.token);

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Portal link created</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Expires {formatDate(token.expires_at)} &middot; {token.permissions.mode} access
              {token.single_use && ' · Single use'}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Dismiss
        </button>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
          This link will only be shown once. Copy it now and share it securely with your client.
        </p>
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <Label className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Portal URL</Label>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-card px-3 py-3">
          <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="flex-1 text-sm font-mono text-foreground break-all">{url}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <CopyButton text={url} />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [mattersLoading, setMattersLoading] = useState(true);

  const [matterId, setMatterId] = useState('');
  const [expiresHours, setExpiresHours] = useState(72);
  const [singleUse, setSingleUse] = useState(false);
  const [permMode, setPermMode] = useState<PermissionMode>('read');

  const [generating, setGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<PortalToken | null>(null);
  const [sessionTokens, setSessionTokens] = useState<PortalToken[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch matters for selector
  useEffect(() => {
    mattersApi.list({ status: 'active' })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as unknown as Matter[]);
        setMatters(list);
        if (list.length > 0) setMatterId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setMattersLoading(false));
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matterId) { setError('Please select a matter.'); return; }

    setGenerating(true);
    setError(null);
    setGeneratedToken(null);

    try {
      const token = await portalApi.createToken({
        matter_id: matterId,
        expires_hours: expiresHours,
        single_use: singleUse,
        permissions: { mode: permMode },
      });
      setGeneratedToken(token);
      setSessionTokens((prev) => [token, ...prev]);
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Link2 className="w-6 h-6 text-primary" />
          Client Portal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate secure, time-limited links for clients to access matter documents.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: ShieldCheck,
            title: 'Secure by default',
            desc: 'Tokens are cryptographically signed and expire automatically.',
            iconClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
          },
          {
            icon: Clock,
            title: 'Time-limited access',
            desc: 'Choose exactly how long your client can access the link.',
            iconClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
          },
          {
            icon: Eye,
            title: 'Granular permissions',
            desc: 'Control whether clients can read, comment, or sign documents.',
            iconClass: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-card p-4 flex gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', item.iconClass)}>
              <item.icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Generated token result */}
      {generatedToken && (
        <TokenResult
          token={generatedToken}
          onDismiss={() => setGeneratedToken(null)}
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="w-4 h-4 text-muted-foreground" />
            Generate New Portal Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Matter selector */}
            <div className="space-y-1.5">
              <Label htmlFor="portal-matter">Matter *</Label>
              {mattersLoading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : matters.length === 0 ? (
                <div className="flex items-center gap-2 h-10 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  No active matters found. Create a matter first.
                </div>
              ) : (
                <select
                  id="portal-matter"
                  value={matterId}
                  onChange={(e) => setMatterId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {matters.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              )}
              <p className="text-xs text-muted-foreground">The client will be able to see documents within this matter.</p>
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label>Link Expires In</Label>
              <div className="flex flex-wrap gap-2">
                {EXPIRES_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpiresHours(opt.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      expiresHours === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission mode */}
            <div className="space-y-2">
              <Label>Permission Level</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PERMISSION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPermMode(opt.value)}
                    className={cn(
                      'rounded-xl border p-4 text-left transition-colors',
                      permMode === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/30'
                    )}
                  >
                    <p className={cn('text-sm font-semibold', permMode === opt.value ? 'text-primary' : 'text-foreground')}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Single use toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Single Use</p>
                  <p className="text-xs text-muted-foreground">Link becomes invalid after the first access.</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={singleUse}
                onClick={() => setSingleUse((v) => !v)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  singleUse ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                    singleUse ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={generating || mattersLoading || matters.length === 0}
                className="gap-2 min-w-[160px]"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Generate Portal Link
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Session tokens */}
      {sessionTokens.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links Generated This Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessionTokens.map((t, idx) => {
                if (idx === 0) return null; // already shown above
                const url = buildTokenUrl(t.token);
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-muted-foreground truncate">{url}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.permissions.mode} · expires {formatDate(t.expires_at)}
                        {t.single_use && ' · single use'}
                      </p>
                    </div>
                    <CopyButton text={url} />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              These links are only visible for this session. Store them securely.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
