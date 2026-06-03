'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/use-auth';
import { useNotifications } from '@/stores/use-notifications';
import { useUI } from '@/stores/use-ui';
import { authApi } from '@/lib/api/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/ui/command-palette';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, setLoading, logout } = useAuth();
  const { fetch: fetchNotifications, connect } = useNotifications();
  const { openCommandPalette } = useUI();
  const router = useRouter();

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCommandPalette]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      logout();
      router.push('/auth/login');
      return;
    }

    if (!isAuthenticated) {
      authApi.me()
        .then((user) => {
          const refresh = localStorage.getItem('refresh_token') ?? '';
          setAuth(user, token, refresh);
        })
        .catch(() => {
          logout();
          router.push('/auth/login');
        });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    connect();
  }, [isAuthenticated]);

  if (!isAuthenticated && typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
