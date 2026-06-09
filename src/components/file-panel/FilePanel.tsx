import { useState, useCallback, useEffect } from 'react';
import { FileItem } from './FileItem';
import { PathNavigator } from './PathNavigator';
import { InputDialog } from '../common/InputDialog';
import { fileService } from '../../services/fileService';
import { FolderPlus, FilePlus, FolderOpen } from 'lucide-react';
import type { FileEntry, ClipboardContent } from '../../types';

interface FilePanelProps {
  id: 'left' | 'right';
  path: string;
  onPathChange: (path: string) => void;
  isActive: boolean;
  onActivate: () => void;
  clipboard: ClipboardContent | null;
  onClipboardChange: (clipboard: ClipboardContent | null) => void;
  onFileOpen?: (filePath: string) => void;
  onAddFavorite?: (path: string) => void;
}

export function FilePanel({
  id,
  path,
  onPathChange,
  isActive,
  onActivate,
  clipboard,
  onClipboardChange,
  onFileOpen,
  onAddFavorite,
}: FilePanelProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([path]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  
  // Rename dialog state
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  
  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState<'file' | 'folder' | null>(null);

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
      const lastSelected = Array.from(selectedPaths).pop()!;
      const lastIndex = entries.findIndex(e => e.path === lastSelected);
      const currentIndex = entries.findIndex(e => e.path === entry.path);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      
      const rangeEntries = entries.slice(start, end + 1);
      setSelectedPaths(new Set(rangeEntries.map(e => e.path)));
    } else {
      setSelectedPaths(new Set([entry.path]));
    }
  };

  const handleDoubleClick = async (entry: FileEntry) => {
    if (entry.isDirectory) {
      handleNavigate(entry.path);
    } else if (onFileOpen) {
      onFileOpen(entry.path);
    } else {
      await fileService.openFile(entry.path);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    const paths = Array.from(selectedPaths);
    if (paths.length > 0) {
      onClipboardChange({ action: 'copy', paths });
    }
  };

  // Cut to clipboard
  const handleCut = () => {
    const paths = Array.from(selectedPaths);
    if (paths.length > 0) {
      onClipboardChange({ action: 'cut', paths });
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    if (!clipboard || clipboard.paths.length === 0) return;

    for (const srcPath of clipboard.paths) {
      const fileName = fileService.getFileName(srcPath);
      const dstPath = fileService.joinPath(path, fileName);
      
      try {
        const exists = await fileService.fileExists(dstPath);
        if (exists) {
          const result = await fileService.showOverwriteConfirmation(fileName);
          if (result === 'skip') continue;
          if (result === 'cancel') break;
        }

        if (clipboard.action === 'copy') {
          await fileService.copyFile(srcPath, dstPath);
        } else {
          await fileService.moveFile(srcPath, dstPath);
        }
      } catch (error) {
        console.error(`Error ${clipboard.action === 'copy' ? 'copying' : 'moving'} file:`, error);
      }
    }

    // Clear clipboard if it was a cut
    if (clipboard.action === 'cut') {
      onClipboardChange(null);
    }

    // Refresh directory
    loadDirectory(path);
  };

  // Delete selected files
  const handleDelete = async () => {
    const paths = Array.from(selectedPaths);
    if (paths.length === 0) return;

    for (const filePath of paths) {
      const fileName = fileService.getFileName(filePath);
      const confirmed = await fileService.showDeleteConfirmation(fileName);
      
      if (confirmed) {
        try {
          await fileService.deleteFile(filePath);
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
    }

    setSelectedPaths(new Set());
    loadDirectory(path);
  };

  // Rename file
  const handleRename = async (newName: string) => {
    if (!renameTarget) return;

    try {
      await fileService.renameFile(renameTarget.path, newName);
      loadDirectory(path);
    } catch (error) {
      console.error('Error renaming file:', error);
    }

    setRenameTarget(null);
  };

  // Show in explorer
  const handleShowInFolder = async (entry: FileEntry) => {
    await fileService.showInFolder(entry.path);
  };

  const handleOpenFolder = async () => {
    const folderPath = await fileService.showOpenFolderDialog();
    if (folderPath) {
      handleNavigate(folderPath);
    }
  };

  const hasClipboard = clipboard && clipboard.paths.length > 0;

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 transition-colors duration-200 ${
        isActive ? 'ring-1 ring-[var(--border-accent)]' : ''
      }`}
      onClick={onActivate}
    >
      {/* Header */}
      <div className={`h-8 flex items-center px-3 border-b gap-1 transition-colors duration-200 ${
        isActive ? 'bg-[var(--bg-raised)] border-[var(--border-accent)]' : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
      }`}>
        <span className={`text-[11px] font-semibold tracking-widest uppercase mr-1 ${
          isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
        }`}>
          {id === 'left' ? 'izq' : 'der'}
        </span>
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
        <div className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); setShowCreateDialog('folder'); }}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors duration-150"
          title="Nueva carpeta"
        >
          <FolderPlus size={13} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowCreateDialog('file'); }}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded transition-colors duration-150"
          title="Nuevo archivo"
        >
          <FilePlus size={13} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleOpenFolder(); }}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-hover)] rounded transition-colors duration-150"
          title="Abrir carpeta"
        >
          <FolderOpen size={13} />
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
        <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Cargando…</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-1 py-0.5">
          {entries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] h-full">
              <p className="text-xs">Carpeta vacía</p>
            </div>
          ) : (
            entries.map((entry) => (
              <FileItem
                key={entry.path}
                entry={entry}
                isSelected={selectedPaths.has(entry.path)}
                onSelect={(e) => handleSelect(entry, e)}
                onDoubleClick={() => handleDoubleClick(entry)}
                icon={fileService.getFileIcon(entry)}
                clipboard={clipboard}
                onCopy={handleCopy}
                onCut={handleCut}
                onPaste={handlePaste}
                onDelete={handleDelete}
                onRename={() => setRenameTarget(entry)}
                onShowInFolder={() => handleShowInFolder(entry)}
                onAddFavorite={onAddFavorite ? () => onAddFavorite(entry.path) : undefined}
              />
            ))
          )}
        </div>
      )}

      {/* Status bar */}
      <div className="h-5 bg-[var(--bg-base)] flex items-center px-3 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
        {entries.length} elementos
        {selectedPaths.size > 0 && ` · ${selectedPaths.size} sel.`}
        {hasClipboard && ` · ${clipboard.action === 'copy' ? 'copiar' : 'cortar'}`}
      </div>

      {/* Rename dialog */}
      {renameTarget && (
        <InputDialog
          title="Renombrar"
          label="Nuevo nombre"
          initialValue={renameTarget.name}
          placeholder="Nombre del archivo"
          onConfirm={handleRename}
          onCancel={() => setRenameTarget(null)}
          validation={fileService.isValidFileName}
        />
      )}

      {/* Create dialog */}
      {showCreateDialog && (
        <InputDialog
          title={showCreateDialog === 'folder' ? 'Nueva carpeta' : 'Nuevo archivo'}
          label="Nombre"
          initialValue=""
          placeholder={showCreateDialog === 'folder' ? 'Nombre de la carpeta' : 'Nombre del archivo'}
          onConfirm={async (name) => {
            const type = showCreateDialog;
            setShowCreateDialog(null);
            try {
              if (type === 'folder') {
                await fileService.createFolder(path, name);
              } else {
                await fileService.createFile(path, name);
              }
              loadDirectory(path);
            } catch (error) {
              console.error('Error creating:', error);
            }
          }}
          onCancel={() => setShowCreateDialog(null)}
          validation={fileService.isValidFileName}
        />
      )}
    </div>
  );
}