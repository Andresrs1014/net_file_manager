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
  onOpenFlowchart?: () => void;
  onOpenAnalyzer?: () => void;
  onOpenExport?: () => void;
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
  onOpenFlowchart,
  onOpenAnalyzer,
  onOpenExport,
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
    <header className="h-12 bg-[#262626] flex items-center px-3 gap-1 border-b border-[#404040] overflow-hidden">
      {/* Logo/Título */}
      <div className="flex items-center gap-1 shrink-0 pr-2">
        <span className="text-base">📁</span>
        <h1 className="text-sm font-semibold text-[#3b82f6]">NetVault</h1>
      </div>

      <div className="w-px h-5 bg-[#404040] shrink-0" />

      {/* Actions */}
      <button
        onClick={onOpenFolder}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Abrir carpeta"
      >
        <span>📂</span>
        <span className="hidden sm:inline">Abrir</span>
      </button>

      <button
        onClick={handleIndexCurrentPath}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Indexar directorio"
      >
        <span>⚡</span>
        <span className="hidden sm:inline">Indexar</span>
      </button>

      <button
        onClick={onToggleTerminal}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors shrink-0 ${
          terminalVisible 
            ? 'bg-[#3b82f6] text-white' 
            : 'text-[#e5e5e5] hover:bg-[#333]'
        }`}
        title="Alternar terminal"
      >
        <span>⌨️</span>
        <span className="hidden sm:inline">Terminal</span>
      </button>

      <button
        onClick={onToggleAI}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors shrink-0 ${
          aiVisible 
            ? 'bg-[#8b5cf6] text-white' 
            : 'text-[#e5e5e5] hover:bg-[#333]'
        }`}
        title="Alternar AI Assistant"
      >
        <span>🤖</span>
        <span className="hidden sm:inline">AI</span>
      </button>

      <button
        onClick={() => {/* Scaffolder opens from AI panel */}}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Crear nuevo proyecto"
      >
        <span>🧱</span>
        <span className="hidden lg:inline">Nuevo</span>
      </button>

      <button
        onClick={onOpenGraph}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Ver grafo de conocimiento"
      >
        <span>🕸️</span>
        <span className="hidden lg:inline">Grafo</span>
      </button>

      <button
        onClick={onOpenFlowchart}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Generar flujogramas Mermaid"
      >
        <span>📊</span>
        <span className="hidden lg:inline">Flujo</span>
      </button>

      <button
        onClick={onOpenAnalyzer}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Analizar procedimientos con IA"
      >
        <span>🔬</span>
        <span className="hidden lg:inline">Analizar</span>
      </button>

      <button
        onClick={onOpenExport}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Exportar análisis a ZIP"
      >
        <span>📦</span>
        <span className="hidden lg:inline">Exportar</span>
      </button>

      {/* Search bar */}
      <div className="shrink-0 w-48 lg:w-64">
        <SearchBar
          onResultSelect={handleSearchSelect}
          placeholder="Buscar..."
        />
      </div>

      <div className="flex-1 min-w-0" />

      {/* Clipboard status */}
      {clipboard && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1a1a] rounded border border-[#404040] shrink-0">
          <span className="text-xs text-[#a3a3a3]">
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
        className="p-1.5 text-[#737373] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Cambiar tema"
      >
        🌙
      </button>
    </header>
  );
}