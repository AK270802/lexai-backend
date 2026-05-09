'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Briefcase,
  FileText,
  Search,
  Clock,
  Download,
  RefreshCw,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics';
import type { AnalyticsOverview } from '@/lib/types';
import { cn, formatRelative, parseErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
  none: '#94a3b8',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  closed: '#94a3b8',
  on_hold: '#f59e0b',
  archived: '#a78bfa',
};

const CHART_STYLE = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: 12,
    color: 'hsl(var(--foreground))',
  },
  cursor: { fill: 'hsl(var(--muted))' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  loading: boolean;
}

function KPICard({ label, value, sub, icon: Icon, iconClass, loading }: KPICardProps) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <div className={cn('p-1.5 rounded-lg', iconClass)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        {loading ? (
          <>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Custom tooltip for pie chart
function RiskTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <span className="font-medium capitalize">{name}</span>: {value}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  const fetchData = async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.overview({ range_days: days });
      setData(result);
    } catch (e) {
      setError(parseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(rangeDays);
  }, [rangeDays]);

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${rangeDays}d-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const riskData = (data?.clauses_risk_distribution ?? []).map((r) => ({
    name: r.risk_level || 'none',
    value: r.count,
    color: RISK_COLORS[r.risk_level] ?? '#94a3b8',
  }));

  const mattersData = (data?.matters_by_status ?? []).map((m) => ({
    ...m,
    fill: STATUS_COLORS[m.status] ?? '#3b82f6',
  }));

  const researchModelData = data?.research_by_model
    ? Object.entries(data.research_by_model).map(([model, count]) => ({ model, count }))
    : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organization usage metrics and risk posture overview.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range selector */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRangeDays(r.value)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  rangeDays === r.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted/50'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(rangeDays)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!data || exporting}
            className="gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Matters"
          value={data?.kpis.matters_total ?? 0}
          sub="in workspace"
          icon={Briefcase}
          iconClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          loading={loading}
        />
        <KPICard
          label="Documents"
          value={data?.kpis.documents_total ?? 0}
          sub={data ? `${data.kpis.documents_uploaded} uploaded this period` : undefined}
          icon={FileText}
          iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          loading={loading}
        />
        <KPICard
          label="Research Queries"
          value={data?.kpis.research_queries ?? 0}
          sub={`last ${rangeDays} days`}
          icon={Search}
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          loading={loading}
        />
        <KPICard
          label="Avg Close Time"
          value={data?.kpis.avg_matter_close_days != null ? `${Math.round(data.kpis.avg_matter_close_days)}d` : '—'}
          sub="closed matters"
          icon={Clock}
          iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matters by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Matters by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : mattersData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No matter data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={mattersData} barSize={40} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                  <Tooltip {...CHART_STYLE} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {mattersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Clause Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : riskData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No clause risk data yet
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={riskData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {riskData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<RiskTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 justify-center mt-1">
                  {riskData.map((r) => (
                    <div key={r.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="capitalize">{r.name}</span>
                      <span className="text-foreground font-medium">({r.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Research by model + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Research by Model */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="w-4 h-4 text-muted-foreground" />
              Research by Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : researchModelData.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No research queries recorded</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={researchModelData} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="model" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip {...CHART_STYLE} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {/* Table */}
                <div className="mt-4 border-t border-border pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground uppercase">
                        <th className="text-left pb-2 font-medium">Model</th>
                        <th className="text-right pb-2 font-medium">Queries</th>
                        <th className="text-right pb-2 font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {researchModelData.map((row) => {
                        const total = researchModelData.reduce((s, r) => s + r.count, 0);
                        const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                        return (
                          <tr key={row.model}>
                            <td className="py-2 font-mono text-xs text-foreground">{row.model}</td>
                            <td className="py-2 text-right font-medium">{row.count}</td>
                            <td className="py-2 text-right text-muted-foreground">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.recent_activity?.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No recent activity</div>
            ) : (
              <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
                {data.recent_activity.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-3 first:pt-0">
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{item.type.replace(/_/g, ' ')}</span>
                        {item.user && (
                          <span className="text-xs text-muted-foreground">· {item.user}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                      {formatRelative(item.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
