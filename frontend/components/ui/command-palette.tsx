'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUI } from '@/stores/use-ui';
import {
  LayoutDashboard, Briefcase, FileText, Search, PenTool,
  Library, BookOpen, Globe, BarChart3, ShieldCheck, Settings,
  Plus, Upload, Sparkles, ArrowRight, Scale, X, Hash,
} from 'lucide-react';

// ─── Command definitions ──────────────────────────────────────────────────────

interface Command {
  id:       string;
  label:    string;
  group:    string;
  icon:     React.ElementType;
  shortcut?: string;
  action:   (router: ReturnType<typeof useRouter>) => void;
}

const COMMANDS: Command[] = [
  // Navigation
  { id: 'nav-dashboard',   label: 'Go to Dashboard',   group: 'Navigate', icon: LayoutDashboard, action: (r) => r.push('/dashboard') },
  { id: 'nav-matters',     label: 'Go to Matters',      group: 'Navigate', icon: Briefcase,       action: (r) => r.push('/matters') },
  { id: 'nav-documents',   label: 'Go to Documents',    group: 'Navigate', icon: FileText,        action: (r) => r.push('/documents') },
  { id: 'nav-research',    label: 'Go to Research',     group: 'Navigate', icon: Search,          action: (r) => r.push('/research') },
  { id: 'nav-drafts',      label: 'Go to Drafting',     group: 'Navigate', icon: PenTool,         action: (r) => r.push('/drafts') },
  { id: 'nav-vault',       label: 'Go to Clause Vault', group: 'Navigate', icon: Library,         action: (r) => r.push('/vault') },
  { id: 'nav-playbooks',   label: 'Go to Playbooks',    group: 'Navigate', icon: BookOpen,        action: (r) => r.push('/playbooks') },
  { id: 'nav-portal',      label: 'Go to Client Portal',group: 'Navigate', icon: Globe,           action: (r) => r.push('/portal') },
  { id: 'nav-analytics',   label: 'Go to Analytics',    group: 'Navigate', icon: BarChart3,       action: (r) => r.push('/analytics') },
  { id: 'nav-audit',       label: 'Go to Audit Logs',   group: 'Navigate', icon: ShieldCheck,     action: (r) => r.push('/audit') },
  { id: 'nav-settings',    label: 'Go to Settings',     group: 'Navigate', icon: Settings,        action: (r) => r.push('/settings') },
  // Quick actions
  { id: 'act-new-matter',  label: 'New Matter',         group: 'Actions',  icon: Plus,    shortcut: 'N', action: (r) => r.push('/matters/new') },
  { id: 'act-upload',      label: 'Upload Document',    group: 'Actions',  icon: Upload,  shortcut: 'U', action: (r) => r.push('/documents/upload') },
  { id: 'act-research',    label: 'Start AI Research',  group: 'Actions',  icon: Sparkles,              action: (r) => r.push('/research') },
  { id: 'act-new-draft',   label: 'Generate New Draft', group: 'Actions',  icon: PenTool,               action: (r) => r.push('/drafts') },
];

function scoreMatch(label: string, query: string): number {
  const l = label.toLowerCase();
  const q = query.toLowerCase();
  if (l === q) return 100;
  if (l.startsWith(q)) return 80;
  if (l.includes(q)) return 60;
  // Word prefix match
  const words = l.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 50;
  return 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette } = useUI();
  const router = useRouter();

  const [query,         setQuery]         = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  // Filter + sort
  const filtered = query.trim()
    ? COMMANDS
        .map((c) => ({ cmd: c, score: scoreMatch(c.label, query.trim()) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.cmd)
    : COMMANDS;

  // Group for display
  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd);
    return acc;
  }, {});

  const flat = Object.values(groups).flat();

  // Reset on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [commandPaletteOpen]);

  const execute = useCallback(
    (cmd: Command) => {
      closeCommandPalette();
      cmd.action(router);
    },
    [closeCommandPalette, router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flat[selectedIndex]) execute(flat[selectedIndex]);
    } else if (e.key === 'Escape') {
      closeCommandPalette();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Reset selection on query change
  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!commandPaletteOpen) return null;

  let globalIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      onMouseDown={() => closeCommandPalette()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-[580px] mx-4 rounded-2xl border border-border',
          'bg-popover shadow-2xl overflow-hidden animate-scale-in',
          'ring-1 ring-border/50'
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, navigate, or take action…"
            className={cn(
              'flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground',
              'outline-none caret-primary'
            )}
          />
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-muted text-muted-foreground border border-border">
              ESC
            </kbd>
            <button
              onClick={closeCommandPalette}
              className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto scrollbar-thin py-2">
          {flat.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Hash className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No commands found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
            </div>
          ) : (
            Object.entries(groups).map(([groupLabel, cmds]) => (
              <div key={groupLabel} className="mb-1">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                  {groupLabel}
                </p>
                {cmds.map((cmd) => {
                  globalIdx++;
                  const idx = globalIdx;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                        isSelected ? 'bg-primary/15' : 'bg-muted'
                      )}>
                        <cmd.icon className={cn('w-3.5 h-3.5', isSelected && 'text-primary')} />
                      </div>
                      <span className="flex-1 text-left font-medium">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground border border-border">
                          ⌘{cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-primary/60 flex-none" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">esc</kbd>
            close
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Scale className="w-3 h-3" />
            LexAI
          </div>
        </div>
      </div>
    </div>
  );
}
