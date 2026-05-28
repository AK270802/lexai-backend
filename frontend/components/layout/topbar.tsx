'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn, formatRelative } from '@/lib/utils';
import { useAuth } from '@/stores/use-auth';
import { useNotifications } from '@/stores/use-notifications';
import { useUI } from '@/stores/use-ui';
import {
  Bell, Search, Sun, Moon, Monitor,
  ChevronDown, Check, X, Command,
} from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/matters': 'Matters',
  '/documents': 'Documents',
  '/research': 'Legal Research',
  '/drafts': 'Document Drafting',
  '/vault': 'Clause Vault',
  '/playbooks': 'Playbooks',
  '/analytics': 'Analytics',
  '/audit': 'Audit Logs',
  '/settings': 'Settings',
  '/portal': 'Client Portal',
};

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-slide-down"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs text-primary hover:underline font-medium"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[440px] overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <Bell className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              You&apos;ll be notified of comments, assignments, and updates
            </p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors',
                !n.read_at && 'bg-primary/5'
              )}
            >
              <div className="flex items-start gap-3">
                {!n.read_at && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                )}
                <div className={cn('flex flex-col gap-0.5', !n.read_at ? 'ml-0' : 'ml-4')}>
                  <span className="text-xs font-semibold text-foreground line-clamp-1">{n.title}</span>
                  {n.body && (
                    <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {formatRelative(n.created_at)}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  const current = options.find((o) => o.value === theme) ?? options[1];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <current.icon className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-scale-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setTheme(opt.value); setOpen(false); }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors',
                theme === opt.value ? 'text-primary font-medium' : 'text-foreground'
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
              {theme === opt.value && <Check className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { openCommandPalette } = useUI();
  const [notifOpen, setNotifOpen] = useState(false);

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? 'LexAI';

  return (
    <header className="h-[56px] flex items-center justify-between px-6 border-b border-border bg-background/95 backdrop-blur-sm shrink-0 z-40">
      {/* Left: page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        {pathname.includes('/matters/') && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">/</span>
            <span className="text-xs">Matter Detail</span>
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Command palette trigger */}
        <button
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-transparent hover:border-border"
          title="Open command palette"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search…</span>
          <kbd className="flex items-center gap-0.5 ml-1 px-1 py-0.5 text-[10px] font-medium rounded bg-muted border border-border">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
        <button
          onClick={openCommandPalette}
          className="flex md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className={cn(
              'relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
              notifOpen && 'bg-accent text-foreground'
            )}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* User avatar */}
        {user && (
          <div className="ml-1 flex items-center gap-2 pl-2 border-l border-border">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium leading-none text-foreground">{user.name}</span>
              <span className="text-[10px] leading-none mt-0.5 text-muted-foreground capitalize">{user.role}</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
