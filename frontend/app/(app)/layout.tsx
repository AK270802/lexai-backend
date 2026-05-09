'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/use-auth';
import { useNotifications } from '@/stores/use-notifications';
import { authApi } from '@/lib/api/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, setLoading, logout } = useAuth();
  const { fetch: fetchNotifications, connect } = useNotifications();
  const router = useRouter();

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
    </div>
  );
}
