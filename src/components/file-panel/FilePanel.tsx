import { useState, useCallback, useEffect } from 'react';
import { FileItem } from './FileItem';
import { PathNavigator } from './PathNavigator';
import { InputDialog } from '../common/InputDialog';
import { fileService } from '../../services/fileService';
import type { FileEntry, ClipboardContent } from '../../types';

interface FilePanelProps {
  id: 'left' | 'right';
  path: string;
  onPathChange: (path: string) => void;
  isActive: boolean;
  onActivate: () => void;
  clipboard: ClipboardContent | null;
  onClipboardChange: (clipboard: ClipboardContent | null) => void;
}

export function FilePanel({
  id,
  path,
  onPathChange,
  isActive,
  onActivate,
  clipboard,
  onClipboardChange,
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
  const [createName, setCreateName] = useState('');

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

  // Create new file/folder
  const handleCreate = async () => {
    if (!createName.trim()) return;

    try {
      if (showCreateDialog === 'folder') {
        await fileService.createFolder(path, createName);
      } else {
        await fileService.createFile(path, createName);
      }
      loadDirectory(path);
    } catch (error) {
      console.error('Error creating:', error);
    }

    setShowCreateDialog(null);
    setCreateName('');
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
      className={`flex-1 flex flex-col min-w-0 ${
        isActive ? 'ring-1 ring-[#3b82f6]/50' : ''
      }`}
      onClick={onActivate}
    >
      {/* Header */}
      <div className="h-8 bg-[#262626] flex items-center px-3 border-b border-[#404040] gap-1">
        <span className="text-xs font-medium text-[#a3a3a3] uppercase">
          Panel {id === 'left' ? 'izquierdo' : 'derecho'}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setShowCreateDialog('folder')}
          className="px-2 py-0.5 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors"
          title="Nueva carpeta"
        >
          📁+
        </button>
        <button
          onClick={() => setShowCreateDialog('file')}
          className="px-2 py-0.5 text-xs text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors"
          title="Nuevo archivo"
        >
          📄+
        </button>
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
        <div className="flex-1 overflow-auto p-1">
          {entries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[#737373] h-full">
              <div className="text-center">
                <div className="text-4xl mb-2">📂</div>
                <p className="text-sm">Carpeta vacía</p>
              </div>
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
              />
            ))
          )}
        </div>
      )}

      {/* Status bar */}
      <div className="h-6 bg-[#1a1a1a] flex items-center px-3 text-xs text-[#737373] border-t border-[#333]">
        {entries.length} elementos
        {selectedPaths.size > 0 && ` · ${selectedPaths.size} seleccionado(s)`}
        {hasClipboard && ` · ${clipboard.action === 'copy' ? '📋 Copiar' : '✂️ Cortar'}`}
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
          onConfirm={() => {
            setCreateName('');
            handleCreate();
          }}
          onCancel={() => {
            setShowCreateDialog(null);
            setCreateName('');
          }}
          validation={fileService.isValidFileName}
        />
      )}
    </div>
  );
}