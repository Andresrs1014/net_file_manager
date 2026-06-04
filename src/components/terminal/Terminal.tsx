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
  { name: 'Git Status',   command: 'git status',              category: 'Git' },
  { name: 'Git Add All',  command: 'git add .',               category: 'Git' },
  { name: 'Git Commit',   command: 'git commit -m ""',        category: 'Git' },
  { name: 'Git Push',     command: 'git push',                category: 'Git' },
  { name: 'Git Pull',     command: 'git pull',                category: 'Git' },
  { name: 'Git Log',      command: 'git log --oneline -15',   category: 'Git' },
  { name: 'Git Diff',     command: 'git diff --stat',         category: 'Git' },
  { name: 'npm install',  command: 'npm install',             category: 'Node' },
  { name: 'npm run dev',  command: 'npm run dev',             category: 'Node' },
  { name: 'npm run build',command: 'npm run build',           category: 'Node' },
  { name: 'npm bench',    command: 'node scripts/bench-index.mjs', category: 'Node' },
  { name: 'Docker PS',    command: 'docker ps',               category: 'Docker' },
  { name: 'dir',          command: 'dir',                     category: 'Shell' },
  { name: 'ls',           command: 'ls',                      category: 'Shell' },
  { name: 'cls',          command: 'cls',                     category: 'Shell' },
];

function makeLine(type: TerminalLine['type'], content: string): TerminalLine {
  return { id: nextId(), type, content };
}

/** Append text lines to the buffer, keeping MAX_LINES */
function appendLines(
  prev: TerminalLine[],
  type: TerminalLine['type'],
  text: string
): TerminalLine[] {
  const incoming = text
    .split('\n')
    .filter(l => l !== '')          // skip blank lines between chunks (keep intentional ones below)
    .map(l => makeLine(type, l));

  if (incoming.length === 0 && text.trim() === '') {
    // empty chunk — skip
    return prev;
  }

  const next = [...prev, ...incoming];
  return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
}

export function Terminal({ initialCwd, onClose, onCwdChange }: TerminalProps) {
  const [cwd, setCwd] = useState(initialCwd);
  const [lines, setLines] = useState<TerminalLine[]>([
    makeLine('system', `NetVault Terminal  —  ${initialCwd}`),
    makeLine('system', 'Ctrl+K comandos rápidos · Ctrl+L limpiar · ↑↓ historial'),
    makeLine('system', '─'.repeat(60)),
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // ─── Scroll helpers ────────────────────────────────────────────────────────

  const scrollToBottom = useCallback((smooth = false) => {
    if (outputRef.current) {
      outputRef.current.scrollTo({
        top: outputRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      });
    }
  }, []);

  // Only auto-scroll when user is at the bottom already
  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [lines, isAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = outputRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setIsAtBottom(atBottom);
  }, []);

  // ─── Sync external cwd ────────────────────────────────────────────────────

  useEffect(() => {
    setCwd(initialCwd);
  }, [initialCwd]);

  // ─── Stream listener ──────────────────────────────────────────────────────

  const subscribeStream = useCallback(() => {
    // Unsubscribe any previous listener
    unsubRef.current?.();

    const api = window.electronAPI as typeof window.electronAPI & {
      onTerminalStream?: (
        cb: (data: { type: string; text?: string; code?: number }) => void
      ) => () => void;
    };

    if (!api.onTerminalStream) return;

    const unsub = api.onTerminalStream((data) => {
      if (data.type === 'stdout' && data.text) {
        setLines(prev => appendLines(prev, 'stream-out', data.text!));
        if (isAtBottom) scrollToBottom();
      } else if (data.type === 'stderr' && data.text) {
        setLines(prev => appendLines(prev, 'stream-err', data.text!));
        if (isAtBottom) scrollToBottom();
      } else if (data.type === 'done') {
        setRunning(false);
        setLines(prev => [...prev, makeLine('system', `✔ Listo (exit ${data.code ?? 0})`)]);
      }
    });
    unsubRef.current = unsub;
  }, [isAtBottom, scrollToBottom]);

  useEffect(() => {
    return () => { unsubRef.current?.(); };
  }, []);

  // ─── Execute command ──────────────────────────────────────────────────────

  const executeCommand = useCallback(async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed || running) return;

    setLines(prev => [...prev, makeLine('input', `PS ${cwd}> ${command}`)]);
    setCommandHistory(prev => {
      const deduped = prev.filter(c => c !== command);
      return [...deduped, command].slice(-100);
    });
    setHistoryIndex(-1);
    setCurrentInput('');

    // Built-in commands
    switch (trimmed.toLowerCase()) {
      case 'cls':
      case 'clear':
        setLines([makeLine('system', 'Terminal limpiada.')]);
        return;
      case 'help':
        setLines(prev => [...prev, makeLine('output', [
          'Comandos internos:',
          '  cls / clear   — limpiar pantalla',
          '  cd <ruta>     — cambiar directorio',
          '  pwd           — directorio actual',
          '  Ctrl+K        — paleta de comandos',
          '  Ctrl+L        — limpiar',
          '  ↑/↓           — historial',
          '',
          'Todo lo demás se ejecuta en PowerShell.',
        ].join('\n'))]);
        return;
      case 'pwd':
        setLines(prev => [...prev, makeLine('output', cwd)]);
        return;
    }

    if (trimmed.toLowerCase().startsWith('cd ')) {
      const arg = trimmed.substring(3).trim();
      let resolved = arg;
      if (arg === '..') {
        const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
        if (parts.length > 1) resolved = parts.slice(0, -1).join('\\') + '\\';
        else resolved = cwd;
      } else if (!arg.includes(':')) {
        resolved = cwd.replace(/\\$/, '') + '\\' + arg;
      }
      setCwd(resolved);
      onCwdChange?.(resolved);
      setLines(prev => [...prev, makeLine('output', resolved)]);
      return;
    }

    // External: stream via PowerShell
    setRunning(true);
    subscribeStream();

    try {
      await window.electronAPI.executeCommand(trimmed, cwd);
    } catch (err: any) {
      setLines(prev => [...prev, makeLine('error', err?.message ?? 'Error desconocido')]);
      setRunning(false);
    }
    // setRunning(false) is called in the 'done' stream event
  }, [cwd, onCwdChange, running, subscribeStream]);

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      setShowPalette(p => !p);
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
        case 'Escape':   setShowPalette(false); inputRef.current?.focus(); break;
        case 'ArrowDown': e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); break;
        case 'ArrowUp':   e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); break;
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
          const ni = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
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
  }, [showPalette, currentInput, commandHistory, historyIndex, executeCommand, selectedIndex]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const filteredCommands = () =>
    QUICK_COMMANDS.filter(c =>
      c.name.toLowerCase().includes(paletteSearch.toLowerCase()) ||
      c.command.toLowerCase().includes(paletteSearch.toLowerCase()) ||
      c.category.toLowerCase().includes(paletteSearch.toLowerCase())
    );

  const lineClass = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input':      return 'text-[#a3a3a3]';
      case 'error':      return 'text-[#ef4444]';
      case 'stream-err': return 'text-[#f97316]';
      case 'system':     return 'text-[#60a5fa]';
      case 'stream-out': return 'text-[#d4d4d4]';
      default:           return 'text-[#e5e5e5]';
    }
  };

  const fc = filteredCommands();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-[#0c0c0c] h-full overflow-hidden">
      {/* Header */}
      <div className="h-8 shrink-0 bg-[#111111] flex items-center justify-between px-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[#505050] uppercase tracking-wide">Terminal</span>
          {running && (
            <span className="flex items-center gap-1 text-[10px] text-[#f59e0b]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
              ejecutando…
            </span>
          )}
          <span className="text-[10px] text-[#383838] font-mono truncate max-w-[220px]" title={cwd}>
            {cwd}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setLines([makeLine('system', 'Terminal limpiada.')])}
            title="Limpiar (Ctrl+L)"
            className="p-1 text-[#505050] hover:text-[#a3a3a3] hover:bg-[#1e1e1e] rounded transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onClose}
            title="Cerrar terminal"
            className="p-1 text-[#505050] hover:text-[#ef4444] hover:bg-[#1e1e1e] rounded transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-3 font-mono text-xs leading-5 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map(line => (
          <div key={line.id} className={`${lineClass(line.type)} whitespace-pre-wrap break-words`}>
            {line.content}
          </div>
        ))}
      </div>

      {/* Scroll-to-bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => { setIsAtBottom(true); scrollToBottom(true); }}
          className="absolute bottom-20 right-6 z-10 bg-[#262626] border border-[#404040] rounded-full p-1.5 text-[#a3a3a3] hover:text-white hover:bg-[#333] shadow-lg transition-all"
          title="Ir al final"
        >
          <ChevronDown size={14} />
        </button>
      )}

      {/* Line count */}
      {lines.length >= MAX_LINES * 0.9 && (
        <div className="shrink-0 px-3 py-0.5 bg-[#1a1100] text-[10px] text-[#f59e0b] border-t border-[#2a2a2a]">
          Buffer al {Math.round(lines.length / MAX_LINES * 100)}% — las líneas más antiguas se están descartando
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-[#2a2a2a] px-3 py-2 flex items-center bg-[#111111] gap-2">
        <span className="text-[#3b82f6] font-mono text-xs shrink-0 truncate max-w-[180px]"
          title={cwd}>{cwd}{running ? '…' : '>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={e => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={running}
          placeholder={running ? 'ejecutando…' : 'Comando… (Ctrl+K para accesos rápidos)'}
          className="flex-1 bg-transparent outline-none text-[#e5e5e5] font-mono text-xs placeholder-[#383838] disabled:opacity-40"
          autoFocus
        />
        <button
          onClick={() => { setShowPalette(true); setPaletteSearch(''); setSelectedIndex(0); }}
          className="shrink-0 text-[10px] text-[#383838] hover:text-[#a3a3a3] border border-[#2a2a2a] rounded px-1.5 py-0.5 hover:border-[#404040] transition-colors"
          title="Paleta de comandos (Ctrl+K)"
        >
          ⌘K
        </button>
      </div>

      {/* Quick command palette */}
      {showPalette && (
        <div className="absolute inset-0 bg-black/60 flex items-start justify-center pt-12 z-20"
          onClick={e => e.target === e.currentTarget && setShowPalette(false)}>
          <div className="bg-[#1a1a1a] border border-[#404040] rounded-lg shadow-2xl w-[480px] max-h-[360px] flex flex-col overflow-hidden">
            <div className="p-2 border-b border-[#333]">
              <input
                type="text"
                value={paletteSearch}
                onChange={e => { setPaletteSearch(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar comando rápido…"
                className="w-full px-3 py-2 bg-[#262626] border border-[#404040] rounded text-[#e5e5e5] text-xs outline-none focus:border-[#3b82f6] font-mono"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-auto">
              {fc.length === 0 ? (
                <div className="p-4 text-center text-[#505050] text-xs">Sin resultados</div>
              ) : fc.map((cmd, idx) => (
                <button
                  key={`${cmd.category}-${cmd.name}`}
                  onClick={() => { executeCommand(cmd.command); setShowPalette(false); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-3 text-xs transition-colors ${idx === selectedIndex ? 'bg-[#3b82f6]/20' : 'hover:bg-[#252525]'}`}
                >
                  <span className="text-[10px] text-[#60a5fa] bg-[#1e2a3a] px-1.5 py-0.5 rounded font-mono shrink-0">
                    {cmd.category}
                  </span>
                  <span className="flex-1 text-[#e5e5e5]">{cmd.name}</span>
                  <span className="text-[#505050] font-mono truncate max-w-[140px]">{cmd.command}</span>
                </button>
              ))}
            </div>
            <div className="px-3 py-1.5 border-t border-[#333] text-[10px] text-[#505050] flex justify-between">
              <span>↑↓ navegar · Enter ejecutar · Esc cerrar</span>
              <span>{fc.length} comandos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
