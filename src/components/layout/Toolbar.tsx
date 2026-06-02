import type { ClipboardContent } from '../../types';
import { SearchBar } from '../search/SearchBar';
import { searchService } from '../../services/searchService';

interface ToolbarProps {
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
  onToggleTheme: () => void;
  terminalVisible: boolean;
  clipboard: ClipboardContent | null;
  onClipboardClear: () => void;
  onNavigateToPath?: (path: string) => void;
  onToggleAI?: () => void;
  aiVisible?: boolean;
  currentPath?: string;
  onOpenGraph?: () => void;
}

interface SearchResult {
  entry: { name: string; path: string; isDirectory: boolean };
  score: number;
  source: 'index' | 'ai';
}

export function Toolbar({
  onOpenFolder,
  onToggleTerminal,
  onToggleTheme,
  terminalVisible,
  clipboard,
  onClipboardClear,
  onNavigateToPath,
  onToggleAI,
  aiVisible,
  currentPath,
  onOpenGraph,
}: ToolbarProps) {
  const handleSearchSelect = async (result: SearchResult) => {
    const dirPath = result.entry.isDirectory 
      ? result.entry.path 
      : result.entry.path.split('\\').slice(0, -1).join('\\') + '\\';
    
    onNavigateToPath?.(dirPath);
  };

  const handleIndexCurrentPath = async () => {
    if (!currentPath) return;
    
    try {
      await searchService.indexDirectory(currentPath);
    } catch (error) {
      console.error('Error indexing path:', error);
    }
  };

  return (
    <header className="h-12 bg-[#262626] flex items-center px-4 gap-2 border-b border-[#404040]">
      {/* Logo/Título */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg">📁</span>
        <h1 className="text-base font-semibold text-[#3b82f6]">NetVault</h1>
      </div>

      <div className="w-px h-6 bg-[#404040] shrink-0" />

      {/* Actions */}
      <button
        onClick={onOpenFolder}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Abrir carpeta"
      >
        <span>📂</span>
        <span>Abrir</span>
      </button>

      <button
        onClick={handleIndexCurrentPath}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Indexar directorio"
      >
        <span>⚡</span>
        <span>Indexar</span>
      </button>

      <button
        onClick={onToggleTerminal}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors shrink-0 ${
          terminalVisible 
            ? 'bg-[#3b82f6] text-white' 
            : 'text-[#e5e5e5] hover:bg-[#333]'
        }`}
        title="Alternar terminal"
      >
        <span>⌨️</span>
        <span>Terminal</span>
      </button>

      <button
        onClick={onToggleAI}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors shrink-0 ${
          aiVisible 
            ? 'bg-[#8b5cf6] text-white' 
            : 'text-[#e5e5e5] hover:bg-[#333]'
        }`}
        title="Alternar AI Assistant"
      >
        <span>🤖</span>
        <span>AI</span>
      </button>

      <button
        onClick={() => {/* Scaffolder opens from AI panel */}}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Crear nuevo proyecto"
      >
        <span>🧱</span>
        <span>Nuevo</span>
      </button>

      <button
        onClick={onOpenGraph}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Ver grafo de conocimiento"
      >
        <span>🕸️</span>
        <span>Grafo</span>
      </button>

      {/* Search bar */}
      <SearchBar
        onResultSelect={handleSearchSelect}
        placeholder="Buscar archivos..."
      />

      <div className="flex-1" />

      {/* Clipboard status */}
      {clipboard && (
        <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] rounded border border-[#404040] shrink-0">
          <span className="text-sm text-[#a3a3a3]">
            {clipboard.action === 'copy' ? '📋' : '✂️'} {clipboard.paths.length}
          </span>
          <button
            onClick={onClipboardClear}
            className="text-xs text-[#737373] hover:text-[#ef4444] transition-colors"
            title="Limpiar portapapeles"
          >
            ×
          </button>
        </div>
      )}

      {/* Actions right */}
      <button
        onClick={onToggleTheme}
        className="p-2 text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Cambiar tema"
      >
        🌙
      </button>
    </header>
  );
}