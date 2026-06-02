import type { ClipboardContent } from '../../types';
import { SearchBar } from '../search/SearchBar';
import { searchService } from '../../services/searchService';
import type { SearchResult } from '../../services/searchService';

interface ToolbarProps {
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
  onToggleTheme: () => void;
  terminalVisible: boolean;
  clipboard: ClipboardContent | null;
  onClipboardClear: () => void;
  onNavigateToPath?: (path: string) => void;
  currentPath?: string;
}

export function Toolbar({
  onOpenFolder,
  onToggleTerminal,
  onToggleTheme,
  terminalVisible,
  clipboard,
  onClipboardClear,
  onNavigateToPath,
  currentPath,
}: ToolbarProps) {
  const handleSearchSelect = async (result: SearchResult) => {
    // Index the directory containing the result
    const parentPath = result.entry.path.split('\\').slice(0, -1).join('\\') + '\\';
    try {
      const entries = await window.electronAPI.readDirectory(parentPath);
      await searchService.indexDirectory(parentPath, entries);
    } catch (error) {
      console.error('Error indexing directory:', error);
    }
    
    // Navigate to the result
    const dirPath = result.entry.isDirectory 
      ? result.entry.path 
      : result.entry.path.split('\\').slice(0, -1).join('\\') + '\\';
    
    onNavigateToPath?.(dirPath);
  };

  const handleIndexCurrentPath = async () => {
    if (!currentPath) return;
    
    try {
      const entries = await window.electronAPI.readDirectory(currentPath);
      await searchService.indexDirectory(currentPath, entries);
    } catch (error) {
      console.error('Error indexing path:', error);
    }
  };

  return (
    <header className="h-12 bg-[#262626] flex items-center px-4 gap-3 border-b border-[#404040]">
      {/* Logo/Título */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg">📁</span>
        <h1 className="text-base font-semibold text-[#3b82f6]">NetVault</h1>
      </div>

      <div className="w-px h-6 bg-[#404040] shrink-0" />

      {/* Acciones */}
      <button
        onClick={onOpenFolder}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Abrir carpeta (Ctrl+O)"
      >
        <span>📂</span>
        <span>Abrir</span>
      </button>

      <button
        onClick={handleIndexCurrentPath}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#e5e5e5] hover:bg-[#333] rounded transition-colors shrink-0"
        title="Indexar directorio actual"
      >
        <span>📇</span>
        <span>Indexar</span>
      </button>

      <button
        onClick={onToggleTerminal}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors shrink-0 ${
          terminalVisible 
            ? 'bg-[#3b82f6] text-white' 
            : 'text-[#e5e5e5] hover:bg-[#333]'
        }`}
        title="Alternar terminal (Ctrl+`)"
      >
        <span>⌨️</span>
        <span>Terminal</span>
      </button>

      {/* Search bar */}
      <SearchBar
        onResultSelect={handleSearchSelect}
        placeholder="Buscar archivos... (Ctrl+F)"
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

      {/* Acciones derechas */}
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