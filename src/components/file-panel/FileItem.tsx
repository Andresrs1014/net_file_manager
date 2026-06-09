import { useState, useRef, useEffect } from 'react';
import { ContextMenu } from '../common/ContextMenu';
import type { FileEntry, ClipboardContent } from '../../types';
import {
  Folder,
  File,
  Copy,
  Scissors,
  Clipboard,
  Pencil,
  Trash2,
  MapPin,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  Star,
  type LucideIcon
} from 'lucide-react';

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
  onAddFavorite?: () => void;
}

// Get appropriate icon based on file type
function getFileIcon(entry: FileEntry): LucideIcon {
  if (entry.isDirectory) return Folder;
  
  const ext = entry.name.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, LucideIcon> = {
    // Documents
    'pdf': FileText,
    'doc': FileText,
    'docx': FileText,
    'txt': FileText,
    'md': FileText,
    // Images
    'jpg': Image,
    'jpeg': Image,
    'png': Image,
    'gif': Image,
    'svg': Image,
    'webp': Image,
    // Videos
    'mp4': Video,
    'avi': Video,
    'mov': Video,
    'mkv': Video,
    // Audio
    'mp3': Music,
    'wav': Music,
    'flac': Music,
    // Archives
    'zip': Archive,
    'rar': Archive,
    '7z': Archive,
    'tar': Archive,
    // Code
    'js': Code,
    'ts': Code,
    'tsx': Code,
    'jsx': Code,
    'py': Code,
    'rs': Code,
    'go': Code,
    'java': Code,
    'cpp': Code,
    'c': Code,
    'html': Code,
    'css': Code,
  };
  
  return iconMap[ext] || File;
}

export function FileItem({
  entry,
  isSelected,
  onSelect,
  onDoubleClick,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onShowInFolder,
  onAddFavorite,
}: FileItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [_isHovered, setIsHovered] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const IconComponent = getFileIcon(entry);
  const hasClipboard = clipboard && clipboard.paths.length > 0;

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDoubleClick();
    } else if (e.key === 'Delete') {
      e.preventDefault();
      onDelete();
    } else if (e.key === 'F2') {
      e.preventDefault();
      onRename();
    }
  };

  const menuItems = [
    {
      label: entry.isDirectory ? 'Abrir' : 'Abrir con...',
      icon: <Folder size={14} />,
      action: onDoubleClick,
    },
    ...(onAddFavorite ? [{
      label: 'Agregar a favoritos',
      icon: <Star size={14} />,
      action: onAddFavorite,
    }] : []),
    { separator: true, label: '' } as any,
    {
      label: 'Copiar',
      icon: <Copy size={14} />,
      action: onCopy,
      shortcut: 'Ctrl+C',
    },
    {
      label: 'Cortar',
      icon: <Scissors size={14} />,
      action: onCut,
      shortcut: 'Ctrl+X',
    },
    ...(hasClipboard ? [{
      label: 'Pegar',
      icon: <Clipboard size={14} />,
      action: onPaste,
      shortcut: 'Ctrl+V',
    }] : []),
    { separator: true, label: '' } as any,
    {
      label: 'Renombrar',
      icon: <Pencil size={14} />,
      action: onRename,
      shortcut: 'F2',
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} />,
      action: onDelete,
      shortcut: 'Del',
      danger: true,
    },
    { separator: true, label: '' } as any,
    {
      label: 'Mostrar en explorador',
      icon: <MapPin size={14} />,
      action: onShowInFolder,
    },
  ];

  return (
    <>
      <div
        ref={itemRef}
        role="listitem"
        tabIndex={0}
        aria-selected={isSelected}
        className={`
          group flex items-center gap-2 px-2 py-1 cursor-pointer
          rounded transition-colors duration-150 ease-out
          ${isSelected
            ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]'
            : 'border border-transparent hover:bg-[var(--bg-hover)]'
          }
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]
        `}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Icon */}
        <span className={`shrink-0 transition-colors duration-150 ${entry.isDirectory ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
          <IconComponent size={15} />
        </span>

        {/* File name */}
        <span className={`flex-1 truncate text-[13px] transition-colors duration-150 ${isSelected ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
          {entry.name}
        </span>

        {/* Hover quick-copy action */}
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-all duration-150"
          title="Copiar"
        >
          <Copy size={12} />
        </button>
      </div>

      {/* Context Menu */}
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
