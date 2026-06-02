import { useState, useRef, useEffect } from 'react';

interface TerminalProps {
  initialCwd: string;
  onClose: () => void;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

export function Terminal({ initialCwd, onClose }: TerminalProps) {
  const [cwd, setCwd] = useState(initialCwd);
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', content: `NetVault Terminal\nDirectorio: ${initialCwd}\nEscribe "help" para ver comandos disponibles.\n` }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [lines]);

  const executeCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setLines(prev => [...prev, { type: 'input', content: `PS ${cwd}> ${command}` }]);
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    setCurrentInput('');

    if (['cls', 'clear'].includes(trimmed.toLowerCase())) {
      setLines([{ type: 'system', content: 'Terminal limpiada.' }]);
      return;
    }

    if (trimmed.toLowerCase() === 'help') {
      setLines(prev => [...prev, {
        type: 'output',
        content: `Comandos disponibles:
  cls, clear     - Limpiar terminal
  cd <path>      - Cambiar directorio
  dir            - Listar archivos
  pwd            - Mostrar directorio actual
  echo <text>    - Imprimir texto`
      }]);
      return;
    }

    if (trimmed.toLowerCase() === 'pwd') {
      setLines(prev => [...prev, { type: 'output', content: cwd }]);
      return;
    }

    // Ejecutar comando vía IPC de Electron (placeholder)
    try {
      const result = await window.electronAPI.executeCommand(trimmed, cwd);
      setLines(prev => [...prev, { type: 'output', content: result }]);
      // Extraer nuevo cwd del resultado si cambió
      const newCwdMatch = result.match(/C:\\[^\n]+/);
      if (newCwdMatch) setCwd(newCwdMatch[0]);
    } catch (error: any) {
      setLines(prev => [...prev, { type: 'error', content: error.message }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0c0c0c] border-l border-[#404040]">
      {/* Header */}
      <div className="h-8 bg-[#1a1a1a] flex items-center justify-between px-3 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#a3a3a3]">⌨️ Terminal</span>
          <span className="text-xs text-[#737373]">{cwd}</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#737373] hover:text-[#ef4444] text-lg leading-none px-2"
          title="Cerrar terminal"
        >
          ×
        </button>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-2 font-mono text-sm"
        onClick={() => document.getElementById('terminal-input')?.focus()}
      >
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`whitespace-pre-wrap ${
              line.type === 'input' ? 'text-[#a3a3a3]' :
              line.type === 'error' ? 'text-[#ef4444]' :
              line.type === 'system' ? 'text-[#60a5fa]' :
              'text-[#e5e5e5]'
            }`}
          >
            {line.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-[#333] p-2 flex items-center bg-[#1a1a1a]">
        <span className="text-[#60a5fa] mr-2 font-mono text-sm">{cwd}{'>'}</span>
        <input
          id="terminal-input"
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comando..."
          className="flex-1 bg-transparent outline-none text-[#e5e5e5] font-mono text-sm placeholder-[#737373]"
          autoFocus
        />
      </div>
    </div>
  );
}