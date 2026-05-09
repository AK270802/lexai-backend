'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Context ──────────────────────────────────────────────────────────────────

interface DialogContextValue {
  open: boolean;
  onClose: () => void;
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  onClose: () => {},
});

// ─── DialogRoot ───────────────────────────────────────────────────────────────

interface DialogRootProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function DialogRoot({ open, onClose, children }: DialogRootProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ open, onClose }}>
      {children}
    </DialogContext.Provider>
  );
}

// ─── DialogPortal / Overlay ───────────────────────────────────────────────────

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Max width class, e.g. "max-w-lg". Defaults to "max-w-lg". */
  size?: string;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, size = 'max-w-lg', children, ...props }, ref) => {
    const { onClose } = React.useContext(DialogContext);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
        {/* Panel */}
        <div
          ref={ref}
          className={cn(
            'relative z-10 w-full rounded-2xl border border-border/60 bg-card shadow-xl',
            'animate-scale-in',
            size,
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);
DialogContent.displayName = 'DialogContent';

// ─── DialogHeader ─────────────────────────────────────────────────────────────

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showClose?: boolean;
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, showClose = true, children, ...props }, ref) => {
    const { onClose } = React.useContext(DialogContext);

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between gap-4 border-b border-border/50 px-6 py-5',
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">{children}</div>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
DialogHeader.displayName = 'DialogHeader';

// ─── DialogTitle ──────────────────────────────────────────────────────────────

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

// ─── DialogDescription ────────────────────────────────────────────────────────

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('mt-1.5 text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

// ─── DialogBody ───────────────────────────────────────────────────────────────

const DialogBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-5', className)} {...props} />
  )
);
DialogBody.displayName = 'DialogBody';

// ─── DialogFooter ─────────────────────────────────────────────────────────────

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-end gap-3 border-t border-border/50 px-6 py-4',
        className
      )}
      {...props}
    />
  )
);
DialogFooter.displayName = 'DialogFooter';

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
};
