'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase, FileText, Search, Clock, Plus, Upload, PenLine,
  Zap, Activity, TrendingUp, ArrowUpRight, ArrowRight,
  Shield, AlertTriangle, CheckCircle2, Sparkles,
} from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '@/lib/api/analytics';
import type { AnalyticsOverview } from '@/lib/types';
import { useAuth } from '@/stores/use-auth';
import { cn, formatRelative, parseErrorMessage } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${salutation}, ${name.split(' ')[0]}`;
}

function todayFormatted() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date());
}

const STATUS_COLORS: Record<string, string> = {
  active:   '#3b82f6',
  closed:   '#94a3b8',
  on_hold:  '#f59e0b',
  archived: '#a78bfa',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#22c55e',
  none:     '#94a3b8',
};

const RISK_ORDER = ['critical', 'high', 'medium', 'low', 'none'];

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  document_uploaded: FileText,
  matter_created:    Briefcase,
  research_query:    Search,
  task_updated:      Activity,
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label:      string;
  value:      string | number;
  sub?:       string;
  icon:       React.ComponentType<{ className?: string }>;
  gradient:   string;
  iconBg:     string;
  iconColor:  string;
  trend?:     number;
}

function KPICard({ label, value, sub, icon: Icon, gradient, iconBg, iconColor, trend }: KPICardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl p-5 border border-border/60',
      'bg-card hover:border-border transition-all duration-200 group',
      'hover:-translate-y-px',
    )}>
      {/* Subtle gradient wash */}
      <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300', gradient)} />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold tracking-tight text-foreground leading-none">
            {value}
          </p>
          {trend != null && trend !== 0 && (
            <div className={cn(
              'flex items-center gap-0.5 text-xs font-semibold mb-0.5',
              trend > 0 ? 'text-emerald-500' : 'text-red-500'
            )}>
              <ArrowUpRight className={cn('w-3.5 h-3.5', trend < 0 && 'rotate-90')} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {sub && (
          <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{sub}</p>
        )}
      </div>
    </div>
  );
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

// ─── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label:       'New Matter',
    description: 'Open a new legal matter',
    icon:        Plus,
    href:        '/matters/new',
    bg:          'bg-blue-500/10 dark:bg-blue-500/10',
    iconColor:   'text-blue-600 dark:text-blue-400',
    border:      'hover:border-blue-500/30',
  },
  {
    label:       'Upload Document',
    description: 'Process a contract or PDF',
    icon:        Upload,
    href:        '/documents/upload',
    bg:          'bg-violet-500/10 dark:bg-violet-500/10',
    iconColor:   'text-violet-600 dark:text-violet-400',
    border:      'hover:border-violet-500/30',
  },
  {
    label:       'AI Research',
    description: 'Ask the legal AI engine',
    icon:        Sparkles,
    href:        '/research',
    bg:          'bg-primary/10',
    iconColor:   'text-primary',
    border:      'hover:border-primary/30',
  },
  {
    label:       'New Draft',
    description: 'Generate a legal document',
    icon:        PenLine,
    href:        '/drafts',
    bg:          'bg-amber-500/10 dark:bg-amber-500/10',
    iconColor:   'text-amber-600 dark:text-amber-400',
    border:      'hover:border-amber-500/30',
  },
];

// ─── Risk legend for distribution chart ──────────────────────────────────────

function RiskLegendDot({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ background: color }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData]       = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    analyticsApi
      .overview({ range_days: 30 })
      .then(setData)
      .catch((e) => setError(parseErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const totalRisk = data?.clauses_risk_distribution.reduce((s, r) => s + r.count, 0) ?? 0;

  const sortedRisk = data?.clauses_risk_distribution
    ? [...data.clauses_risk_distribution].sort(
        (a, b) => RISK_ORDER.indexOf(a.risk_level) - RISK_ORDER.indexOf(b.risk_level)
      )
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {user ? (
            <h1 className="text-[1.6rem] font-bold tracking-tight text-foreground">
              {greeting(user.name)}
            </h1>
          ) : (
            <Skeleton className="h-8 w-52 mb-1" />
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{todayFormatted()}</p>
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/matters/new')}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New Matter
        </Button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      {loading ? (
        <KPISkeleton />
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Active Matters"
            value={data.kpis.matters_total}
            sub="total in workspace"
            icon={Briefcase}
            gradient="bg-gradient-to-br from-blue-500/5 to-transparent"
            iconBg="bg-blue-500/10"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <KPICard
            label="Documents"
            value={data.kpis.documents_total}
            sub={`${data.kpis.documents_uploaded} uploaded this period`}
            icon={FileText}
            gradient="bg-gradient-to-br from-violet-500/5 to-transparent"
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <KPICard
            label="Research Queries"
            value={data.kpis.research_queries}
            sub="last 30 days"
            icon={Search}
            gradient="bg-gradient-to-br from-primary/5 to-transparent"
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <KPICard
            label="Avg Close Time"
            value={
              data.kpis.avg_matter_close_days != null
                ? `${Math.round(data.kpis.avg_matter_close_days)}d`
                : '—'
            }
            sub="closed matters"
            icon={Clock}
            gradient="bg-gradient-to-br from-amber-500/5 to-transparent"
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </div>
      ) : null}

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} href={a.href}>
              <div className={cn(
                'flex flex-col gap-3 p-4 rounded-xl border border-border bg-card',
                'hover:bg-muted/30 transition-all duration-150 group h-full',
                a.border
              )}>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', a.bg)}>
                  <a.icon className={cn('w-4.5 h-4.5', a.iconColor)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {a.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{a.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Charts + Activity ────────────────────────────────────────────── */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Matters by Status */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Matters by Status
                </CardTitle>
                <Link
                  href="/matters"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {data.matters_by_status.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <Briefcase className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No matter data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data.matters_by_status}
                    barSize={32}
                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '10px',
                        fontSize: 12,
                        boxShadow: '0 4px 12px hsl(var(--foreground) / 0.06)',
                        color: 'hsl(var(--foreground))',
                      }}
                      cursor={{ fill: 'hsl(var(--muted) / 0.5)', radius: 4 }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {data.matters_by_status.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Clause Risk Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Clause Risk
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              {sortedRisk.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500/50" />
                  <p className="text-xs text-muted-foreground">No clause data yet</p>
                </div>
              ) : (
                sortedRisk.map((r) => {
                  const pct = totalRisk > 0 ? Math.round((r.count / totalRisk) * 100) : 0;
                  const color = RISK_COLORS[r.risk_level] ?? '#94a3b8';
                  return (
                    <div key={r.risk_level} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <RiskLegendDot color={color} />
                          <span className="text-xs font-medium capitalize text-foreground">
                            {r.risk_level || 'none'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground tabular-nums">
                            {r.count}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            ({pct}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      {!loading && data && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-muted-foreground" />
                Recent Activity
              </CardTitle>
              <Link
                href="/audit"
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                View audit log <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {data.recent_activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Zap className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground/60">
                  Actions across matters, documents, and research will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {data.recent_activity.slice(0, 8).map((item, idx) => {
                  const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group"
                    >
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate leading-snug">{item.title}</p>
                        {item.user && (
                          <p className="text-xs text-muted-foreground truncate">{item.user}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground/60 flex-shrink-0 tabular-nums">
                        {formatRelative(item.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Loading skeleton for charts ──────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="pt-5">
              <Skeleton className="h-5 w-40 mb-5" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 space-y-4">
              <Skeleton className="h-5 w-32 mb-3" />
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
