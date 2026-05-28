'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores/use-auth';
import { useUI } from '@/stores/use-ui';
import {
  LayoutDashboard, Briefcase, FileText, Search,
  Library, PenTool, BarChart3, ShieldCheck,
  Settings, LogOut, ChevronRight, Scale,
  BookOpen, Globe, Sparkles, ChevronLeft,
  Zap,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  highlight?: boolean;
}

const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Matters',    href: '/matters',    icon: Briefcase },
  { label: 'Documents',  href: '/documents',  icon: FileText },
  { label: 'Research',   href: '/research',   icon: Search, highlight: true },
  { label: 'Drafting',   href: '/drafts',     icon: PenTool },
];

const NAV_KNOWLEDGE: NavItem[] = [
  { label: 'Clause Vault', href: '/vault',      icon: Library },
  { label: 'Playbooks',    href: '/playbooks',  icon: BookOpen },
  { label: 'Portal',       href: '/portal',     icon: Globe },
];

const NAV_ADMIN: NavItem[] = [
  { label: 'Analytics',  href: '/analytics', icon: BarChart3 },
  { label: 'Audit Logs', href: '/audit',     icon: ShieldCheck },
  { label: 'Settings',   href: '/settings',  icon: Settings },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
        'transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-sidebar-primary',
        active
          ? 'bg-sidebar-accent text-white'
          : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60',
        collapsed && 'justify-center px-2'
      )}
    >
      {/* Active left indicator */}
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-sidebar-primary rounded-full" />
      )}

      <item.icon
        className={cn(
          'shrink-0 transition-colors',
          collapsed ? 'w-[18px] h-[18px]' : 'w-[16px] h-[16px]',
          active
            ? 'text-white'
            : 'text-sidebar-muted group-hover:text-sidebar-foreground',
          item.highlight && !active && 'text-sidebar-primary/70 group-hover:text-sidebar-primary'
        )}
      />

      {!collapsed && (
        <>
          <span className="truncate leading-none flex-1">{item.label}</span>
          {item.highlight && !active && (
            <Sparkles className="w-3 h-3 text-sidebar-primary/60 shrink-0" />
          )}
          {item.badge != null && item.badge > 0 && (
            <span className="text-[10px] font-bold bg-sidebar-primary/20 text-sidebar-primary px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function NavSection({
  label,
  items,
  collapsed,
  adminOnly = false,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  adminOnly?: boolean;
}) {
  const { user } = useAuth();
  if (adminOnly && user?.role !== 'admin') return null;

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted/50 select-none">
          {label}
        </p>
      )}
      {collapsed && <div className="h-px bg-sidebar-border/50 mx-2 mb-1.5 mt-0.5" />}
      {items.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleColors: Record<string, string> = {
    admin:     'from-violet-500 to-indigo-600',
    lawyer:    'from-blue-500 to-cyan-600',
    paralegal: 'from-emerald-500 to-teal-600',
    client:    'from-amber-500 to-orange-600',
  };
  const gradientClass = roleColors[user.role] ?? 'from-blue-500 to-violet-600';

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0',
              'bg-gradient-to-br', gradientClass
            )}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-sidebar-foreground truncate leading-none">
              {user.name}
            </span>
            <span className="text-[10px] text-sidebar-muted truncate leading-none mt-0.5 capitalize">
              {user.role} · {user.organization?.name ?? 'Workspace'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUI();

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full border-r border-sidebar-border shrink-0 overflow-hidden',
        'bg-sidebar transition-all duration-200 ease-in-out',
        sidebarCollapsed ? 'w-[60px]' : 'w-[236px]'
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-[56px] border-b border-sidebar-border shrink-0 px-4',
          sidebarCollapsed ? 'justify-center' : 'gap-3'
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
          <Scale className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white tracking-tight leading-none">LexAI</span>
            <span className="text-[10px] text-sidebar-muted leading-none mt-0.5">
              AI Legal Platform
            </span>
          </div>
        )}
      </div>

      {/* ── AI Research CTA ────────────────────────────────────────────── */}
      {!sidebarCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/research"
            className={cn(
              'group flex items-center gap-2 w-full px-3 py-2.5 rounded-lg',
              'bg-gradient-to-r from-blue-500/10 to-indigo-500/10',
              'border border-blue-500/20 hover:border-blue-500/35',
              'hover:from-blue-500/15 hover:to-indigo-500/15',
              'transition-all duration-150'
            )}
          >
            <Zap className="w-3.5 h-3.5 text-sidebar-primary shrink-0" />
            <span className="text-xs font-semibold text-sidebar-primary flex-1">AI Research</span>
            <ChevronRight className="w-3 h-3 text-sidebar-primary/50 group-hover:text-sidebar-primary group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 py-3 space-y-4">
        <NavSection label="Workspace" items={NAV_MAIN}      collapsed={sidebarCollapsed} />
        <NavSection label="Knowledge" items={NAV_KNOWLEDGE} collapsed={sidebarCollapsed} />
        <NavSection label="Admin"     items={NAV_ADMIN}     collapsed={sidebarCollapsed} adminOnly />
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 pt-2 border-t border-sidebar-border space-y-0.5 shrink-0">
        <UserFooter collapsed={sidebarCollapsed} />

        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sidebar-muted',
            'hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4 shrink-0" /><span className="text-xs">Collapse</span></>
          }
        </button>

        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sidebar-muted',
            'hover:text-red-400 hover:bg-red-500/8 transition-colors',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span className="text-xs">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
