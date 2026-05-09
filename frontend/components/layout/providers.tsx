'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useUI } from '@/stores/use-ui';
import { ToastProvider } from '@/components/ui/toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUI((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (t: string) => {
      root.classList.remove('light', 'dark');
      if (t === 'system') {
        root.classList.add(mq.matches ? 'dark' : 'light');
      } else {
        root.classList.add(t);
      }
    };

    apply(theme);

    if (theme === 'system') {
      const handler = () => apply('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
