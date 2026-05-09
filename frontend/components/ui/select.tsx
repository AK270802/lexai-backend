'use client';

import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      onChange,
      options,
      placeholder = 'Select…',
      disabled = false,
      className,
      id,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLUListElement>(null);

    const selected = options.find((o) => o.value === value);

    // Close on outside click
    React.useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown' && open) {
        e.preventDefault();
        const items = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled])');
        if (items?.length) {
          const idx = Array.from(items).findIndex((el) => el.dataset.value === value);
          const next = items[Math.min(idx + 1, items.length - 1)];
          next?.focus();
        }
      } else if (e.key === 'ArrowUp' && open) {
        e.preventDefault();
        const items = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled])');
        if (items?.length) {
          const idx = Array.from(items).findIndex((el) => el.dataset.value === value);
          const prev = items[Math.max(idx - 1, 0)];
          prev?.focus();
        }
      }
    };

    const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, optValue: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(optValue);
        setOpen(false);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={ref}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background',
            'px-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            className
          )}
        >
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-150',
              open && 'rotate-180'
            )}
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            role="listbox"
            className={cn(
              'absolute z-50 mt-1.5 w-full overflow-auto rounded-md',
              'border border-border bg-popover text-popover-foreground shadow-lg',
              'py-1 text-sm',
              'animate-slide-down',
              'max-h-60'
            )}
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-muted-foreground text-sm">No options available.</li>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    data-value={opt.value}
                    tabIndex={opt.disabled ? -1 : 0}
                    onKeyDown={(e) => !opt.disabled && handleOptionKeyDown(e, opt.value)}
                    onClick={() => {
                      if (opt.disabled) return;
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between px-3 py-2',
                      'select-none transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                      isSelected && 'bg-accent/50 font-medium text-foreground',
                      opt.disabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
