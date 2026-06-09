import { useState, useEffect, useRef } from 'react';
import { Search, FolderOpen, BarChart2, RefreshCw, Terminal, GitBranch, Zap } from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      filtered[selectedIdx].action();
      onClose();
    }
  };

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  // Group commands
  const groups = new Map<string, Command[]>();
  for (const cmd of filtered) {
    const g = cmd.group ?? 'General';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(cmd);
  }

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-[560px] max-h-[440px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border-subtle)]">
          <Search size={14} className="text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar comandos…"
            className="flex-1 bg-transparent text-[var(--text-primary)] outline-none text-sm placeholder-[var(--text-muted)]"
          />
          <kbd className="text-[10px] text-[var(--text-muted)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">
              Sin resultados para "{query}"
            </div>
          ) : (
            Array.from(groups.entries()).map(([group, cmds]) => (
              <div key={group}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                  {group}
                </div>
                {cmds.map(cmd => {
                  const idx = flatIdx++;
                  const isSelected = idx === selectedIdx;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => { cmd.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-100
                        ${isSelected ? 'bg-[var(--bg-raised)]' : 'hover:bg-[var(--bg-hover)]'}
                      `}
                    >
                      <span className={`shrink-0 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                        {cmd.icon ?? <Zap size={14} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-[var(--text-primary)]">{cmd.label}</div>
                        {cmd.description && (
                          <div className="text-xs text-[var(--text-muted)] truncate">{cmd.description}</div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] text-[var(--text-muted)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 shrink-0 font-mono">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-[var(--border-subtle)] flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
          <span className="font-mono">↑↓</span><span>navegar</span>
          <span>·</span>
          <span className="font-mono">↵</span><span>ejecutar</span>
          <span>·</span>
          <span className="font-mono">Esc</span><span>cerrar</span>
        </div>
      </div>
    </div>
  );
}

// Icon helpers re-exported for use in App.tsx commands
export { FolderOpen, BarChart2, RefreshCw, Terminal, GitBranch, Search };
