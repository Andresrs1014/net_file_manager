import { useState } from 'react';
import { ContextMenu } from '../common/ContextMenu';
import type { FileEntry, ClipboardContent } from '../../types';

interface FileItemProps {
  entry: FileEntry;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  icon: string;
  clipboard: ClipboardContent | null;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onRename: () => void;
  onShowInFolder: () => void;
}

export function FileItem({
  entry,
  isSelected,
  onSelect,
  onDoubleClick,
  icon,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onShowInFolder,
}: FileItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(e);
  };

  const hasClipboard = clipboard && clipboard.paths.length > 0;

  const menuItems = [
    {
      label: entry.isDirectory ? 'Abrir' : 'Abrir',
      icon: entry.isDirectory ? '📂' : '📄',
      action: onDoubleClick,
    },
    { separator: true, label: '' } as any,
    {
      label: 'Copiar',
      icon: '📋',
      action: onCopy,
    },
    {
      label: 'Cortar',
      icon: '✂️',
      action: onCut,
    },
    ...(hasClipboard ? [{
      label: 'Pegar',
      icon: '📋',
      action: onPaste,
    }] : []),
    { separator: true, label: '' } as any,
    {
      label: 'Renombrar',
      icon: '✏️',
      action: onRename,
    },
    {
      label: 'Eliminar',
      icon: '🗑️',
      action: onDelete,
      danger: true,
    },
    { separator: true, label: '' } as any,
    {
      label: 'Mostrar en explorador',
      icon: '📍',
      action: onShowInFolder,
    },
  ];

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
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={menuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}