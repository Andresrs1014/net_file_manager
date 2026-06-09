import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Trash2, ChevronDown } from 'lucide-react';

interface TerminalProps {
  initialCwd: string;
  onClose: () => void;
  onCwdChange?: (cwd: string) => void;
}

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error' | 'system' | 'stream-out' | 'stream-err';
  content: string;
}

const MAX_LINES = 2000;
let lineIdCounter = 0;
const nextId = () => ++lineIdCounter;

const QUICK_COMMANDS = [
  { name: 'Git Status',    command: 'git status',              category: 'Git'    },
  { name: 'Git Add All',   command: 'git add .',               category: 'Git'    },
  { name: 'Git Commit',    command: 'git commit -m ""',        category: 'Git'    },
  { name: 'Git Push',      command: 'git push',                category: 'Git'    },
  { name: 'Git Pull',      command: 'git pull',                category: 'Git'    },
  { name: 'Git Log',       command: 'git log --oneline -15',   category: 'Git'    },
  { name: 'Git Diff',      command: 'git diff --stat',         category: 'Git'    },
  { name: 'npm install',   command: 'npm install',             category: 'Node'   },
  { name: 'npm run dev',   command: 'npm run dev',             category: 'Node'   },
  { name: 'npm run build', command: 'npm run build',           category: 'Node'   },
  { name: 'npm bench',     command: 'node scripts/bench-index.mjs', category: 'Node' },
  { name: 'Docker PS',     command: 'docker ps',               category: 'Docker' },
  { name: 'dir',           command: 'dir',                     category: 'Shell'  },
  { name: 'ls',            command: 'ls',                      category: 'Shell'  },
  { name: 'cls',           command: 'cls',                     category: 'Shell'  },
];

function makeLine(type: TerminalLine['type'], content: string): TerminalLine {
  return { id: nextId(), type, content };
}

function appendLines(
  prev: TerminalLine[],
  type: TerminalLine['type'],
  text: string
): TerminalLine[] {
  const incoming = text
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => makeLine(type, l));

  if (incoming.length === 0 && text.trim() === '') return prev;

  const next = [...prev, ...incoming];
  return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
}

export function Terminal({ initialCwd, onClose, onCwdChange }: TerminalProps) {
  const [cwd, setCwd]                   = useState(initialCwd);
  const [lines, setLines]               = useState<TerminalLine[]>([
    makeLine('system', `NetVault Terminal  —  ${initialCwd}`),
    makeLine('system', 'Ctrl+K comandos rapidos  ·  Ctrl+L limpiar  ·  flechas historial'),
    makeLine('system', '─'.repeat(60)),
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPalette, setShowPalette]   = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [running, setRunning]           = useState(false);
  const [isAtBottom, setIsAtBottom]     = useState(true);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const unsubRef  = useRef<(() => void) | null>(null);

  // ── Scroll helpers ─────────────────────────────────────────────────────────

  const scrollToBottom = useCallback((smooth = false) => {
    if (outputRef.current) {
      outputRef.current.scrollTo({
        top: outputRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      });
    }
  }, []);

  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [lines, isAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = outputRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsAtBottom(atBottom);
  }, []);

  // ── Sync external cwd ──────────────────────────────────────────────────────

  useEffect(() => {
    setCwd(initialCwd);
  }, [initialCwd]);

  // ── Stream listener ────────────────────────────────────────────────────────

  const subscribeStream = useCallback(() => {
    unsubRef.current?.();

    const api = window.electronAPI as typeof window.electronAPI & {
      onTerminalStream?: (
        cb: (data: { type: string; text?: string; code?: number }) => void
      ) => () => void;
    };

    if (!api.onTerminalStream) return;

    const unsub = api.onTerminalStream((data) => {
      if (data.type === 'stdout' && data.text) {
        setLines((prev) => appendLines(prev, 'stream-out', data.text!));
        if (isAtBottom) scrollToBottom();
      } else if (data.type === 'stderr' && data.text) {
        setLines((prev) => appendLines(prev, 'stream-err', data.text!));
        if (isAtBottom) scrollToBottom();
      } else if (data.type === 'done') {
        setRunning(false);
        setLines((prev) => [
          ...prev,
          makeLine('system', `Listo (exit ${data.code ?? 0})`),
        ]);
      }
    });
    unsubRef.current = unsub;
  }, [isAtBottom, scrollToBottom]);

  useEffect(() => {
    return () => { unsubRef.current?.(); };
  }, []);

  // ── Execute command ────────────────────────────────────────────────────────

  const executeCommand = useCallback(
    async (command: string) => {
      const trimmed = command.trim();
      if (!trimmed || running) return;

      setLines((prev) => [...prev, makeLine('input', `› ${trimmed}`)]);
      setCommandHistory((prev) => {
        const deduped = prev.filter((c) => c !== command);
        return [...deduped, command].slice(-100);
      });
      setHistoryIndex(-1);
      setCurrentInput('');

      switch (trimmed.toLowerCase()) {
        case 'cls':
        case 'clear':
          setLines([makeLine('system', 'Terminal limpiada.')]);
          return;
        case 'help':
          setLines((prev) => [
            ...prev,
            makeLine(
              'output',
              [
                'Comandos internos:',
                '  cls / clear   — limpiar pantalla',
                '  cd <ruta>     — cambiar directorio',
                '  pwd           — directorio actual',
                '  Ctrl+K        — paleta de comandos',
                '  Ctrl+L        — limpiar',
                '  flechas       — historial',
                '',
                'Todo lo demas se ejecuta en PowerShell.',
              ].join('\n')
            ),
          ]);
          return;
        case 'pwd':
          setLines((prev) => [...prev, makeLine('output', cwd)]);
          return;
      }

      if (trimmed.toLowerCase().startsWith('cd ')) {
        const arg = trimmed.substring(3).trim();
        let resolved = arg;
        if (arg === '..') {
          const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
          resolved = parts.length > 1
            ? parts.slice(0, -1).join('\\') + '\\'
            : cwd;
        } else if (!arg.includes(':')) {
          resolved = cwd.replace(/\\$/, '') + '\\' + arg;
        }
        setCwd(resolved);
        onCwdChange?.(resolved);
        setLines((prev) => [...prev, makeLine('output', resolved)]);
        return;
      }

      setRunning(true);
      subscribeStream();

      try {
        await window.electronAPI.executeCommand(trimmed, cwd);
      } catch (err: any) {
        setLines((prev) => [
          ...prev,
          makeLine('error', err?.message ?? 'Error desconocido'),
        ]);
        setRunning(false);
      }
    },
    [cwd, onCwdChange, running, subscribeStream]
  );

  // ── Keyboard ───────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowPalette((p) => !p);
        setPaletteSearch('');
        setSelectedIndex(0);
        return;
      }
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setLines([makeLine('system', 'Terminal limpiada.')]);
        return;
      }
      if (showPalette) {
        const filtered = filteredCommands();
        switch (e.key) {
          case 'Escape':
            setShowPalette(false);
            inputRef.current?.focus();
            break;
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
            break;
          case 'Enter':
            e.preventDefault();
            if (filtered[selectedIndex]) {
              executeCommand(filtered[selectedIndex].command);
              setShowPalette(false);
            }
            break;
        }
        return;
      }
      switch (e.key) {
        case 'Enter':
          executeCommand(currentInput);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (commandHistory.length > 0) {
            const ni =
              historyIndex < commandHistory.length - 1
                ? historyIndex + 1
                : historyIndex;
            setHistoryIndex(ni);
            setCurrentInput(commandHistory[commandHistory.length - 1 - ni] ?? '');
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (historyIndex > 0) {
            const ni = historyIndex - 1;
            setHistoryIndex(ni);
            setCurrentInput(commandHistory[commandHistory.length - 1 - ni] ?? '');
          } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setCurrentInput('');
          }
          break;
      }
    },
    [showPalette, currentInput, commandHistory, historyIndex, executeCommand, selectedIndex]
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const filteredCommands = () =>
    QUICK_COMMANDS.filter(
      (c) =>
        c.name.toLowerCase().includes(paletteSearch.toLowerCase()) ||
        c.command.toLowerCase().includes(paletteSearch.toLowerCase()) ||
        c.category.toLowerCase().includes(paletteSearch.toLowerCase())
    );

  const lineClass = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input':      return 'text-[var(--accent)]';
      case 'error':      return 'text-[var(--danger)]';
      case 'stream-err': return 'text-[var(--warning)]';
      case 'system':     return 'text-[var(--text-muted)] italic';
      case 'stream-out': return 'text-[#8bafd4]';
      default:           return 'text-[#8bafd4]';
    }
  };

  const fc = filteredCommands();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-[#050810] h-full overflow-hidden">
      {/* Header */}
      <div
        className="h-8 shrink-0 flex items-center justify-between px-3
                   bg-[#050810] border-b border-[var(--border-subtle)]"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[9px] font-semibold tracking-widest uppercase
                       text-[var(--text-muted)]"
          >
            Terminal
          </span>
          {running && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--warning)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-pulse" />
              ejecutando
            </span>
          )}
          <span
            className="text-[10px] text-[#2a3a50] font-[JetBrains_Mono,monospace]
                       truncate max-w-[220px]"
            title={cwd}
          >
            {cwd}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setLines([makeLine('system', 'Terminal limpiada.')])}
            title="Limpiar (Ctrl+L)"
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                       hover:bg-[#0c1220] rounded transition-colors"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={onClose}
            title="Cerrar terminal"
            className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]
                       hover:bg-[#0c1220] rounded transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-3 bg-[#070b14] cursor-text
                   font-[JetBrains_Mono,monospace] text-[11px] leading-[1.6]"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={`${lineClass(line.type)} whitespace-pre-wrap break-words`}
          >
            {line.type === 'input' ? (
              <span>
                <span className="text-[var(--text-muted)] mr-1">›</span>
                {line.content.replace(/^›\s?/, '')}
              </span>
            ) : (
              line.content
            )}
          </div>
        ))}
      </div>

      {/* Scroll-to-bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => { setIsAtBottom(true); scrollToBottom(true); }}
          className="absolute bottom-20 right-4 z-10
                     bg-[#0c1220] border border-[var(--border-subtle)]
                     rounded-full p-1.5 text-[var(--text-muted)]
                     hover:text-[var(--accent)] hover:border-[var(--accent)]
                     shadow-lg transition-all"
          title="Ir al final"
        >
          <ChevronDown size={13} />
        </button>
      )}

      {/* Buffer warning */}
      {lines.length >= MAX_LINES * 0.9 && (
        <div
          className="shrink-0 px-3 py-0.5 bg-[#1a0f00] text-[10px]
                     text-[var(--warning)] border-t border-[var(--border-subtle)]"
        >
          Buffer al {Math.round((lines.length / MAX_LINES) * 100)}% — lineas antiguas descartadas
        </div>
      )}

      {/* Input */}
      <div
        className="shrink-0 border-t border-[var(--border-subtle)]
                   px-3 py-2 flex items-center bg-[#050810] gap-2"
      >
        <span
          className="text-[var(--accent)] font-[JetBrains_Mono,monospace]
                     text-[11px] shrink-0 select-none"
        >
          ›
        </span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={running}
          placeholder={running ? 'ejecutando...' : 'comando...'}
          className="flex-1 bg-transparent outline-none
                     text-[#8bafd4] font-[JetBrains_Mono,monospace] text-[11px]
                     placeholder-[#2a3a50] disabled:opacity-40"
          autoFocus
        />

        {/* Quick command chips */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setShowPalette(true); setPaletteSearch(''); setSelectedIndex(0); }}
            className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-raised)]
                       border border-[var(--border-subtle)] rounded
                       text-[var(--text-secondary)]
                       hover:border-[var(--accent)] hover:text-[var(--accent)]
                       transition-colors font-[JetBrains_Mono,monospace]"
            title="Paleta de comandos (Ctrl+K)"
          >
            Ctrl+K
          </button>
        </div>
      </div>

      {/* Quick command palette */}
      {showPalette && (
        <div
          className="absolute inset-0 bg-black/70 flex items-start justify-center pt-10 z-20"
          onClick={(e) => e.target === e.currentTarget && setShowPalette(false)}
        >
          <div
            className="bg-[#070b14] border border-[var(--border-default)] rounded
                       shadow-2xl w-[480px] max-h-[360px] flex flex-col overflow-hidden"
          >
            {/* Palette search */}
            <div className="p-2 border-b border-[var(--border-subtle)]">
              <input
                type="text"
                value={paletteSearch}
                onChange={(e) => { setPaletteSearch(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar comando..."
                className="w-full px-3 py-2 bg-[#050810] border border-[var(--border-default)]
                           rounded text-[#8bafd4] text-[11px] outline-none
                           focus:border-[var(--border-accent)]
                           font-[JetBrains_Mono,monospace] placeholder-[#2a3a50]"
                autoFocus
              />
            </div>

            {/* Palette results */}
            <div className="flex-1 overflow-auto">
              {fc.length === 0 ? (
                <div className="p-4 text-center text-[var(--text-muted)] text-[11px]">
                  Sin resultados
                </div>
              ) : (
                fc.map((cmd, idx) => (
                  <button
                    key={`${cmd.category}-${cmd.name}`}
                    onClick={() => { executeCommand(cmd.command); setShowPalette(false); }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-3
                                text-[11px] transition-colors
                                ${idx === selectedIndex
                                  ? 'bg-[var(--accent)]/10'
                                  : 'hover:bg-[#0c1220]'
                                }`}
                  >
                    <span
                      className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-raised)]
                                 border border-[var(--border-subtle)] rounded
                                 text-[var(--text-secondary)]
                                 font-[JetBrains_Mono,monospace] shrink-0"
                    >
                      {cmd.category}
                    </span>
                    <span className="flex-1 text-[var(--text-secondary)]">{cmd.name}</span>
                    <span
                      className="text-[var(--text-muted)] font-[JetBrains_Mono,monospace]
                                 truncate max-w-[140px] text-[10px]"
                    >
                      {cmd.command}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Palette footer */}
            <div
              className="px-3 py-1.5 border-t border-[var(--border-subtle)]
                         text-[10px] text-[var(--text-muted)] flex justify-between
                         font-[JetBrains_Mono,monospace]"
            >
              <span>flechas navegar · Enter ejecutar · Esc cerrar</span>
              <span>{fc.length} comandos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
