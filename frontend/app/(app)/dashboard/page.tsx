'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  FileText,
  Search,
  Clock,
  Plus,
  Upload,
  PenLine,
  Zap,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { analyticsApi } from '@/lib/api/analytics';
import type { AnalyticsOverview } from '@/lib/types';
import { useAuth } from '@/stores/use-auth';
import { cn, formatRelative, riskBadgeClass, parseErrorMessage } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${salutation}, ${name.split(' ')[0]}`;
}

function todayFormatted() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

const STATUS_BAR_COLOR: Record<string, string> = {
  active: '#22c55e',
  closed: '#94a3b8',
  on_hold: '#f59e0b',
  archived: '#a78bfa',
};

const RISK_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
  none: '#94a3b8',
};

const ACTIVITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  document_uploaded: FileText,
  matter_created: Briefcase,
  research_query: Search,
  task_updated: Activity,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

function KPICard({ label, value, sub, icon: Icon, iconClass }: KPICardProps) {
  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className={cn('p-1.5 rounded-lg', iconClass)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyticsApi
      .overview({ range_days: 30 })
      .then(setData)
      .catch((e) => setError(parseErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const quickActions = [
    {
      label: 'New Matter',
      icon: Plus,
      href: '/matters/new',
      description: 'Open a new legal matter',
      colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Upload Document',
      icon: Upload,
      href: '/documents/upload',
      description: 'Analyse a contract or PDF',
      colorClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Research',
      icon: Search,
      href: '/research',
      description: 'Ask the AI research engine',
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'New Draft',
      icon: PenLine,
      href: '/drafts',
      description: 'Generate a document draft',
      colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  ];

  const totalRisk =
    data?.clauses_risk_distribution.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {user ? (
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting(user.name)}
            </h1>
          ) : (
            <Skeleton className="h-7 w-48 mb-1" />
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{todayFormatted()}</p>
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

      {/* ── KPI Cards ── */}
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
            iconClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <KPICard
            label="Documents"
            value={data.kpis.documents_total}
            sub={`${data.kpis.documents_uploaded} uploaded this period`}
            icon={FileText}
            iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
          <KPICard
            label="Research Queries"
            value={data.kpis.research_queries}
            sub="last 30 days"
            icon={Search}
            iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <KPICard
            label="Avg Close Days"
            value={data.kpis.avg_matter_close_days != null ? `${Math.round(data.kpis.avg_matter_close_days)}d` : '—'}
            sub="closed matters"
            icon={Clock}
            iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
        </div>
      ) : null}

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <Link key={a.label} href={a.href}>
              <div className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-border/80 transition-all group h-full">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', a.colorClass)}>
                  <a.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {a.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">{a.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Charts + Activity ── */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matters by Status chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Matters by Status
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {data.matters_by_status.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  No matter data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.matters_by_status}
                    barSize={36}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                      fill="#3b82f6"
                    >
                      {data.matters_by_status.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_BAR_COLOR[entry.status] ?? '#3b82f6'}
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                Clause Risk
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {data.clauses_risk_distribution.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clause data yet</p>
              ) : (
                [...data.clauses_risk_distribution]
                  .sort((a, b) => {
                    const order = ['critical', 'high', 'medium', 'low', 'none'];
                    return order.indexOf(a.risk_level) - order.indexOf(b.risk_level);
                  })
                  .map((r) => {
                    const pct = totalRisk > 0 ? Math.round((r.count / totalRisk) * 100) : 0;
                    return (
                      <div key={r.risk_level}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium capitalize text-foreground">
                            {r.risk_level || 'none'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {r.count} <span className="text-muted-foreground/60">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: RISK_COLOR[r.risk_level] ?? '#94a3b8',
                            }}
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

      {/* ── Recent Activity ── */}
      {!loading && data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            ) : (
              <div className="divide-y divide-border">
                {data.recent_activity.slice(0, 10).map((item, idx) => {
                  const Icon = ACTIVITY_ICON[item.type] ?? Activity;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{item.title}</p>
                        {item.user && (
                          <p className="text-xs text-muted-foreground">{item.user}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
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

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="pt-5">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 space-y-4">
              <Skeleton className="h-5 w-32 mb-2" />
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
