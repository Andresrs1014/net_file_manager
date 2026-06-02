import { useState } from 'react';
import type { FileEntry } from '../../types';

interface FileItemProps {
  entry: FileEntry;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  icon: string;
  size?: string;
}

export function FileItem({ entry, isSelected, onSelect, onDoubleClick, icon, size }: FileItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    onSelect(e);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
  };

  return (
    <>
      <div
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded transition-colors ${
          isSelected 
            ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/40' 
            : 'hover:bg-[#333]'
        }`}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <span className="text-base">{icon}</span>
        <span className="flex-1 truncate text-sm text-[#e5e5e5]">{entry.name}</span>
        {size && (
          <span className="text-xs text-[#737373] w-16 text-right">{size}</span>
        )}
      </div>

      {/* Context menu placeholder */}
      {showContextMenu && (
        <div
          className="fixed bg-[#262626] border border-[#404040] rounded shadow-lg py-1 min-w-[180px] z-50"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-[#e5e5e5] hover:bg-[#333]"
            onClick={() => { onDoubleClick(); closeContextMenu(); }}
          >
            Abrir {entry.isDirectory ? 'carpeta' : 'archivo'}
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-[#e5e5e5] hover:bg-[#333]"
            onClick={closeContextMenu}
          >
            Copiar ruta
          </button>
          <div className="border-t border-[#404040] my-1" />
          <button
            className="w-full px-3 py-1.5 text-left text-sm text-[#ef4444] hover:bg-[#333]"
            onClick={closeContextMenu}
          >
            Eliminar
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}
    </>
  );
}