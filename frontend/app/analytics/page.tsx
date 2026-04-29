'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { Loader2, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

type Overview = {
  range: { from: string; to: string; days: number };
  kpis: {
    matters_total: number;
    documents_total: number;
    documents_uploaded: number;
    research_queries: number;
    avg_matter_close_days: number | null;
  };
  matters_by_status: Array<{ status: string; count: number }>;
  clauses_risk_distribution: Array<{ risk_level: string | null; count: number }>;
  research_by_model: Array<{ model_used: string; count: number }>;
  recent_activity: Array<{ type: string; title: string; created_at: string; data: any }>;
};

const RISK_COLORS: Record<string, string> = {
  none: '#94a3b8',
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
  critical: '#dc2626',
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/analytics/overview/');
        setData(res.data);
      } catch (e: any) {
        setError('Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const riskData = useMemo(() => {
    return (data?.clauses_risk_distribution || []).map((r) => ({
      name: r.risk_level || 'none',
      value: r.count,
      color: RISK_COLORS[r.risk_level || 'none'] || '#64748b',
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Analytics unavailable</AlertTitle>
        <AlertDescription>{error || 'Unknown error'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-zinc-500 mt-2">
          Organization usage and risk posture for the last {data.range.days} days.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs uppercase font-bold text-zinc-500">Matters</div>
          <div className="mt-2 text-2xl font-semibold">{data.kpis.matters_total}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs uppercase font-bold text-zinc-500">Documents</div>
          <div className="mt-2 text-2xl font-semibold">{data.kpis.documents_total}</div>
          <div className="mt-1 text-xs text-zinc-500">{data.kpis.documents_uploaded} uploaded in range</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs uppercase font-bold text-zinc-500">Research</div>
          <div className="mt-2 text-2xl font-semibold">{data.kpis.research_queries}</div>
          <div className="mt-1 text-xs text-zinc-500">queries in range</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="text-xs uppercase font-bold text-zinc-500">Avg Close Time</div>
          <div className="mt-2 text-2xl font-semibold">{data.kpis.avg_matter_close_days ?? '—'}</div>
          <div className="mt-1 text-xs text-zinc-500">days (closed matters)</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold text-zinc-500">Range</div>
            <div className="mt-2 text-sm font-semibold">{new Date(data.range.from).toLocaleDateString()} → {new Date(data.range.to).toLocaleDateString()}</div>
          </div>
          <BarChart3 className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="font-semibold">Matters by status</div>
          <div className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.matters_by_status}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="font-semibold">Clause risk distribution</div>
          <div className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {riskData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="font-semibold">Research model usage</div>
          <div className="h-[280px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.research_by_model}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model_used" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-zinc-500">Shows top models recorded in research history.</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="font-semibold">Recent activity</div>
          <div className="mt-4 overflow-auto max-h-[320px]">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Event</th>
                  <th className="text-left py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_activity.map((a, idx) => (
                  <tr key={idx} className="border-b border-zinc-50 dark:border-zinc-800/60">
                    <td className="py-2 font-semibold">{a.type}</td>
                    <td className="py-2">{a.title}</td>
                    <td className="py-2 text-zinc-500">{new Date(a.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

