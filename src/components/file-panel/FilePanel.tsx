import { useState, useCallback, useEffect } from 'react';
import { FileList } from './FileList';
import { PathNavigator } from './PathNavigator';
import { fileService } from '../../services/fileService';
import type { FileEntry } from '../../types';

interface FilePanelProps {
  id: 'left' | 'right';
  path: string;
  onPathChange: (path: string) => void;
  isActive: boolean;
  onActivate: () => void;
}

export function FilePanel({ id, path, onPathChange, isActive, onActivate }: FilePanelProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([path]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    setSelectedPaths(new Set());
    try {
      const files = await fileService.readDirectory(dirPath);
      setEntries(files);
    } catch (error) {
      console.error('Error loading directory:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(path);
  }, [path, loadDirectory]);

  const handleNavigate = (newPath: string) => {
    onPathChange(newPath);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newPath]);
    setHistoryIndex(prev => prev + 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onPathChange(history[newIndex]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onPathChange(history[newIndex]);
    }
  };

  const goUp = () => {
    const parentPath = fileService.getParentPath(path);
    if (parentPath) {
      handleNavigate(parentPath + '\\');
    }
  };

  const handleSelect = (entry: FileEntry, e: React.MouseEvent) => {
    if (e.ctrlKey) {
      // Multi-selección con Ctrl
      setSelectedPaths(prev => {
        const next = new Set(prev);
        if (next.has(entry.path)) {
          next.delete(entry.path);
        } else {
          next.add(entry.path);
        }
        return next;
      });
    } else if (e.shiftKey && selectedPaths.size > 0) {
      // Range selection con Shift
      const lastSelected = Array.from(selectedPaths).pop()!;
      const lastIndex = entries.findIndex(e => e.path === lastSelected);
      const currentIndex = entries.findIndex(e => e.path === entry.path);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      
      const rangeEntries = entries.slice(start, end + 1);
      setSelectedPaths(new Set(rangeEntries.map(e => e.path)));
    } else {
      // Selección simple
      setSelectedPaths(new Set([entry.path]));
    }
  };

  const handleDoubleClick = async (entry: FileEntry) => {
    if (entry.isDirectory) {
      handleNavigate(entry.path);
    } else {
      await fileService.openFile(entry.path);
    }
  };

  const handleOpenFolder = async () => {
    const folderPath = await fileService.showOpenFolderDialog();
    if (folderPath) {
      handleNavigate(folderPath);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 ${
        isActive ? 'ring-1 ring-[#3b82f6]/50' : ''
      }`}
      onClick={onActivate}
    >
      {/* Header con título y acciones */}
      <div className="h-8 bg-[#262626] flex items-center px-3 border-b border-[#404040]">
        <span className="text-xs font-medium text-[#a3a3a3] uppercase">
          Panel {id === 'left' ? 'izquierdo' : 'derecho'}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleOpenFolder}
          className="px-2 py-0.5 text-xs text-[#a3a3a3] hover:text-[#3b82f6] hover:bg-[#333] rounded transition-colors"
          title="Abrir carpeta"
        >
          📂
        </button>
      </div>

      {/* Navigator */}
      <PathNavigator
        path={path}
        onNavigate={handleNavigate}
        onBack={goBack}
        onForward={goForward}
        onUp={goUp}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
      />

      {/* File list */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#737373]">
          <div className="text-center">
            <div className="animate-pulse text-2xl mb-2">📂</div>
            <p className="text-sm">Cargando...</p>
          </div>
        </div>
      ) : (
        <FileList
          entries={entries}
          selectedPaths={selectedPaths}
          onSelect={handleSelect}
          onDoubleClick={handleDoubleClick}
          getIcon={fileService.getFileIcon}
        />
      )}

      {/* Status bar */}
      <div className="h-6 bg-[#1a1a1a] flex items-center px-3 text-xs text-[#737373] border-t border-[#333]">
        {entries.length} elementos
        {selectedPaths.size > 0 && ` · ${selectedPaths.size} seleccionado(s)`}
      </div>
    </div>
  );
}