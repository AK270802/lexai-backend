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
  BookOpen, Users, Globe, Sparkles, ChevronLeft,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
}

const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Matters', href: '/matters', icon: Briefcase },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Research', href: '/research', icon: Search },
  { label: 'Drafting', href: '/drafts', icon: PenTool },
];

const NAV_KNOWLEDGE: NavItem[] = [
  { label: 'Clause Vault', href: '/vault', icon: Library },
  { label: 'Playbooks', href: '/playbooks', icon: BookOpen },
  { label: 'Portal', href: '/portal', icon: Globe },
];

const NAV_ADMIN: NavItem[] = [
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Audit Logs', href: '/audit', icon: ShieldCheck },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100 relative',
        active
          ? 'bg-sidebar-accent text-white'
          : 'text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon className={cn('shrink-0 w-[18px] h-[18px]', active ? 'text-white' : 'text-sidebar-muted group-hover:text-sidebar-foreground')} />
      {!collapsed && (
        <span className="truncate leading-none">{item.label}</span>
      )}
      {!collapsed && item.badge != null && item.badge > 0 && (
        <span className="ml-auto text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
      {active && !collapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
      )}
    </Link>
  );
}

function NavSection({ label, items, collapsed, adminOnly = false }: {
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
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/60">
          {label}
        </p>
      )}
      {items.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUI();

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-out shrink-0',
        sidebarCollapsed ? 'w-[64px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-[56px] border-b border-sidebar-border px-4 shrink-0',
        sidebarCollapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Scale className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white tracking-tight leading-none">LexAI</span>
            <span className="text-[10px] text-sidebar-muted leading-none mt-0.5 truncate">
              {user?.organization?.name ?? 'Legal Platform'}
            </span>
          </div>
        )}
      </div>

      {/* AI Quick Action */}
      {!sidebarCollapsed && (
        <div className="px-3 pt-3">
          <Link
            href="/research"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors group"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary">Ask AI Researcher</span>
            <ChevronRight className="w-3 h-3 text-primary/50 ml-auto group-hover:text-primary transition-colors" />
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-4">
        <NavSection label="Workspace" items={NAV_MAIN} collapsed={sidebarCollapsed} />
        <NavSection label="Knowledge" items={NAV_KNOWLEDGE} collapsed={sidebarCollapsed} />
        <NavSection label="Admin" items={NAV_ADMIN} collapsed={sidebarCollapsed} adminOnly />
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 pt-2 border-t border-sidebar-border space-y-1 shrink-0">
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
              'bg-gradient-to-br from-blue-500 to-violet-600'
            )}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-sidebar-foreground truncate leading-none">{user.name}</span>
              <span className="text-[10px] text-sidebar-muted truncate leading-none mt-0.5 capitalize">{user.role}</span>
            </div>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors',
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
            'flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-sidebar-muted hover:text-red-400 hover:bg-red-500/10 transition-colors',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? 'Log out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span className="text-xs">Log out</span>}
        </button>
      </div>
    </aside>
  );
}
