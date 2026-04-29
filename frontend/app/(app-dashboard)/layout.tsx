'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/stores/use-auth';
import { useNotifications } from '@/stores/use-notifications';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Search, 
  Library, 
  PenTool, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Menu,
  X,
  User,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Matters', href: '/matters', icon: Briefcase },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Research', href: '/research', icon: Search },
  { name: 'Vault', href: '/vault', icon: Library },
  { name: 'Drafting', href: '/draft', icon: PenTool },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const adminItems = [
  { name: 'Audit Logs', href: '/admin/audit', icon: ShieldCheck },
  { name: 'Settings', href: '/settings/llm', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount, items, fetch, connect, markRead, markAllRead } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch();
    connect();
  }, [isAuthenticated, fetch, connect]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-zinc-100 dark:border-zinc-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
              {isSidebarOpen && <span className="font-bold text-xl tracking-tight">LexAI</span>}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <p className={cn("text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-2", !isSidebarOpen && "hidden")}>
              Main
            </p>
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
                  pathname === item.href 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <item.icon className="w-5 h-5" />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            ))}

            {user?.role === 'admin' && (
              <div className="pt-6 space-y-1">
                <p className={cn("text-xs font-semibold text-zinc-400 uppercase tracking-wider px-2 mb-2", !isSidebarOpen && "hidden")}>
                  Admin
                </p>
                {adminItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
                      pathname === item.href 
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {isSidebarOpen && <span className="font-medium">{item.name}</span>}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Footer / User */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors group"
            >
              <LogOut className="w-5 h-5" />
              {isSidebarOpen && <span className="font-medium">Log out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
            <h2 className="font-semibold text-lg truncate">
              {navItems.find(i => pathname.startsWith(i.href))?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsNotifOpen((v) => !v)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-[360px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="font-semibold text-sm">Notifications</div>
                    <button
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold"
                      onClick={() => markAllRead()}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="p-6 text-sm text-zinc-500">No notifications yet.</div>
                    ) : (
                      items.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          className={cn(
                            'w-full text-left p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40',
                            !n.read_at && 'bg-blue-50/40 dark:bg-blue-900/10'
                          )}
                          onClick={() => markRead(n.id)}
                        >
                          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{n.title}</div>
                          {n.body && <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{n.body}</div>}
                          <div className="mt-2 text-[10px] text-zinc-400 uppercase font-bold">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs text-zinc-500 mt-1 capitalize">{user?.role} @ {user?.organization?.name}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                <User className="w-5 h-5 text-zinc-500" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
