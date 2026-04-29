'use client';

import { 
  Briefcase, 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const stats = [
  { name: 'Active Matters', value: '24', icon: Briefcase, trend: '+12%', color: 'text-blue-600' },
  { name: 'Pending Documents', value: '18', icon: FileText, trend: '-2%', color: 'text-amber-600' },
  { name: 'AI Research Queries', value: '142', icon: Search, trend: '+24%', color: 'text-purple-600' },
  { name: 'Tasks Completed', value: '86', icon: CheckCircle2, trend: '+8%', color: 'text-emerald-600' },
];

const quickActions = [
  { name: 'Create Matter', href: '/matters/new', icon: Plus, description: 'Start a new legal matter' },
  { name: 'Upload Document', href: '/documents/upload', icon: FileText, description: 'Analyze a contract or PDF' },
  { name: 'Legal Research', href: '/research', icon: Search, description: 'Ask the AI research engine' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Welcome back. Here&apos;s an overview of your legal workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Activity
          </Button>
          <Button className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              )}>
                {stat.trend}
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{stat.value}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 font-medium">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-bold tracking-tight px-1">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <div className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
                      {action.name}
                      <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Matters */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight">Recent Matters</h2>
            <Link href="/matters" className="text-sm text-blue-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Matter</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                          M{i}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50">Matter Name Example {i}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">ID: MAT-2024-{100 + i}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      Apr {10 + i}, 2024
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 transition-colors ml-auto" />
                    </td>
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
