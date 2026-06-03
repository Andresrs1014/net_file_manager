import { useState, useRef, useEffect, useCallback } from 'react';

interface Command {
  name: string;
  command: string;
  description: string;
  category: string;
}

interface TerminalProps {
  initialCwd: string;
  onClose: () => void;
  onCwdChange?: (cwd: string) => void;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

const QUICK_COMMANDS: Command[] = [
  { name: 'Git Status', command: 'git status', description: 'Ver estado del repositorio', category: 'Git' },
  { name: 'Git Add All', command: 'git add .', description: 'Agregar cambios', category: 'Git' },
  { name: 'Git Push', command: 'git push', description: 'Subir cambios', category: 'Git' },
  { name: 'Git Pull', command: 'git pull', description: 'Descargar cambios', category: 'Git' },
  { name: 'Git Log', command: 'git log --oneline -10', description: 'Últimos commits', category: 'Git' },
  { name: 'npm install', command: 'npm install', description: 'Instalar dependencias', category: 'Node' },
  { name: 'npm run dev', command: 'npm run dev', description: 'Iniciar desarrollo', category: 'Node' },
  { name: 'npm run build', command: 'npm run build', description: 'Build producción', category: 'Node' },
  { name: 'Docker PS', command: 'docker ps', description: 'Ver contenedores', category: 'Docker' },
  { name: 'pip install', command: 'pip install ', description: 'Instalar paquete', category: 'Python' },
  { name: 'dir', command: 'dir', description: 'Listar archivos', category: 'Common' },
  { name: 'cls', command: 'cls', description: 'Limpiar pantalla', category: 'Common' },
];

export function Terminal({ initialCwd, onClose, onCwdChange }: TerminalProps) {
  const [cwd, setCwd] = useState(initialCwd);
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', content: `NetVault Terminal\nDirectorio: ${initialCwd}\nEscribe "help" para ver comandos o presiona Ctrl+K para comandos rápidos.\n` }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Sync cwd when it changes externally
  useEffect(() => {
    setCwd(initialCwd);
  }, [initialCwd]);

  const executeCommand = useCallback(async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    // Add to history
    setLines(prev => [...prev, { type: 'input', content: `PS ${cwd}> ${command}` }]);
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    setCurrentInput('');

    // Internal commands
    switch (trimmed.toLowerCase()) {
      case 'cls':
      case 'clear':
        setLines([{ type: 'system', content: 'Terminal limpiada.' }]);
        return;

      case 'help':
        setLines(prev => [...prev, {
          type: 'output',
          content: `Comandos disponibles:
  cls, clear     - Limpiar terminal
  cd <path>      - Cambiar directorio
  pwd            - Mostrar directorio actual
  Ctrl+K         - Abrir paleta de comandos
  Ctrl+L         - Limpiar
  ↑/↓            - Navegar historial
  
Otros comandos se ejecutan en PowerShell.`
        }]);
        return;

      case 'pwd':
        setLines(prev => [...prev, { type: 'output', content: cwd }]);
        return;

      default:
        // Handle cd command specially
        if (trimmed.toLowerCase().startsWith('cd ')) {
          const newPath = trimmed.substring(3).trim();
          try {
            // Try to parse the path
            let resolvedPath = newPath;
            if (newPath === '..') {
              const parts = cwd.split('\\').filter(Boolean);
              if (parts.length > 1) {
                resolvedPath = parts.slice(0, -1).join('\\') + '\\';
              }
            } else if (!newPath.includes(':')) {
              resolvedPath = cwd + (cwd.endsWith('\\') ? '' : '\\') + newPath;
            }
            
            setCwd(resolvedPath);
            onCwdChange?.(resolvedPath);
            setLines(prev => [...prev, { type: 'output', content: '' }]);
          } catch {
            setLines(prev => [...prev, { type: 'error', content: `No se pudo cambiar al directorio: ${newPath}` }]);
          }
          return;
        }

        // Execute external command
        try {
          const result = await window.electronAPI.executeCommand(trimmed, cwd);
          setLines(prev => [...prev, { type: 'output', content: result || '(sin salida)' }]);
          
          // Try to detect cwd change from output
          const cwdMatch = result.match(/[A-Z]:\\[^\n]*/);
          if (cwdMatch) {
            setCwd(cwdMatch[0]);
            onCwdChange?.(cwdMatch[0]);
          }
        } catch (error: any) {
          setLines(prev => [...prev, { type: 'error', content: error.message || 'Error ejecutando comando' }]);
        }
    }
  }, [cwd, onCwdChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+K: Open command palette
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      setShowPalette(true);
      setPaletteSearch('');
      setSelectedIndex(0);
      return;
    }

    // Ctrl+L: Clear
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setLines([{ type: 'system', content: 'Terminal limpiada.' }]);
      return;
    }

    if (showPalette) {
      switch (e.key) {
        case 'Escape':
          setShowPalette(false);
          inputRef.current?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex].command);
            setShowPalette(false);
          }
          break;
      }
      return;
    }

    // Normal input handling
    switch (e.key) {
      case 'Enter':
        executeCommand(currentInput);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setCurrentInput('');
        }
        break;
    }
  };

  const filteredCommands = QUICK_COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().includes(paletteSearch.toLowerCase()) ||
    cmd.command.toLowerCase().includes(paletteSearch.toLowerCase()) ||
    cmd.category.toLowerCase().includes(paletteSearch.toLowerCase())
  );

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-[#a3a3a3]';
      case 'error': return 'text-[#ef4444]';
      case 'system': return 'text-[#60a5fa]';
      default: return 'text-[#e5e5e5]';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0c0c0c] border-l border-[#404040]">
      {/* Header */}
      <div className="h-8 bg-[#1a1a1a] flex items-center justify-between px-3 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#a3a3a3]">⌨️ Terminal</span>
          <button
            onClick={() => setCwd('C:\\')}
            className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors"
            title="Ir a C:\\"
          >
            🏠
          </button>
          <span className="text-xs text-[#737373] font-mono truncate max-w-[200px]" title={cwd}>
            {cwd}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLines([{ type: 'system', content: 'Terminal limpiada.' }]);
            }}
            className="text-[#737373] hover:text-[#e5e5e5] text-sm px-2"
            title="Limpiar terminal (Ctrl+L)"
          >
            🧹
          </button>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#ef4444] text-lg leading-none px-2"
            title="Cerrar terminal"
          >
            ×
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-2 font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, idx) => (
          <div key={idx} className={`whitespace-pre-wrap ${getLineColor(line.type)}`}>
            {line.content}
          </div>
        ))}
      </div>

      {/* Command Palette Overlay */}
      {showPalette && (
        <div className="absolute inset-0 bg-black/50 flex items-start justify-center pt-20 z-10">
          <div className="bg-[#1a1a1a] border border-[#404040] rounded-lg shadow-xl w-[500px] max-h-[400px] overflow-hidden">
            <div className="p-2 border-b border-[#333]">
              <input
                type="text"
                value={paletteSearch}
                onChange={(e) => {
                  setPaletteSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar comando..."
                className="w-full px-3 py-2 bg-[#262626] border border-[#404040] rounded text-[#e5e5e5] outline-none focus:border-[#3b82f6]"
                autoFocus
              />
            </div>
            <div className="overflow-auto max-h-[320px]">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-[#737373]">
                  No se encontraron comandos
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={`${cmd.category}-${cmd.name}`}
                    onClick={() => {
                      executeCommand(cmd.command);
                      setShowPalette(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-3 ${
                      idx === selectedIndex ? 'bg-[#3b82f6]/20' : 'hover:bg-[#333]'
                    }`}
                  >
                    <span className="text-xs text-[#60a5fa] bg-[#262626] px-2 py-0.5 rounded">
                      {cmd.category}
                    </span>
                    <span className="flex-1 text-[#e5e5e5]">{cmd.name}</span>
                    <span className="text-xs text-[#737373] font-mono">{cmd.command}</span>
                  </button>
                ))
              )}
            </div>
            <div className="p-2 border-t border-[#333] text-xs text-[#737373] flex justify-between">
              <span>↑↓ Navegar · Enter Ejecutar · Esc Cerrar</span>
              <span>{filteredCommands.length} comandos</span>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#333] p-2 flex items-center bg-[#1a1a1a]">
        <span className="text-[#60a5fa] mr-2 font-mono text-sm">{cwd}{'>'}</span>
        <input
          ref={inputRef}
          id="terminal-input"
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comando... (Ctrl+K para comandos rápidos)"
          className="flex-1 bg-transparent outline-none text-[#e5e5e5] font-mono text-sm placeholder-[#737373]"
          autoFocus
        />
        <button
          onClick={() => setShowPalette(true)}
          className="ml-2 px-2 py-1 text-xs text-[#737373] hover:text-[#e5e5e5] bg-[#262626] rounded hover:bg-[#333]"
          title="Comandos rápidos (Ctrl+K)"
        >
          ⌘K
        </button>
      </div>
    </div>
  );
}