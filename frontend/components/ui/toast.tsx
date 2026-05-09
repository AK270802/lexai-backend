'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Defaults to 4000. Pass 0 to disable. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  /** True while exiting (for slide-out animation) */
  exiting?: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  toast: () => {},
  dismiss: () => {},
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const variantIcon: Record<ToastVariant, React.ElementType> = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
};

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-card text-foreground',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
};

const variantIconStyles: Record<ToastVariant, string> = {
  default: 'text-muted-foreground',
  success: 'text-emerald-400',
  error: 'text-destructive',
  warning: 'text-amber-400',
};

// ─── Individual Toast ─────────────────────────────────────────────────────────

interface ToastItemProps extends ToastItem {
  onDismiss: (id: string) => void;
}

function Toast({ id, title, description, variant = 'default', exiting, onDismiss }: ToastItemProps) {
  const Icon = variantIcon[variant];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg',
        'transition-all duration-300',
        exiting
          ? 'translate-x-full opacity-0'
          : 'translate-x-0 opacity-100 slide-in-from-bottom',
        variantStyles[variant]
      )}
    >
      <Icon
        className={cn('mt-0.5 h-4 w-4 flex-shrink-0', variantIconStyles[variant])}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs opacity-80 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className={cn(
          'flex-shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  React.useEffect(() => {
    setMounted(true);
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const dismiss = React.useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after animation
    const remove = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 320);
    timers.current.set(`exit-${id}`, remove);
  }, []);

  const toast = React.useCallback(
    (opts: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = opts.duration ?? 4000;

      setToasts((prev) => [...prev, { ...opts, id }]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss]
  );

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-label="Notifications"
            className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
          >
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto">
                <Toast {...t} onDismiss={dismiss} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
