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
}: FileItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
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
          group flex items-center gap-3 px-3 py-2 cursor-pointer 
          rounded-lg transition-all duration-200 ease-out
          ${isSelected 
            ? 'bg-[#3b82f6]/15 border border-[#3b82f6]/40 shadow-sm shadow-[#3b82f6]/10' 
            : 'hover:bg-[#2d2d2d]'
          }
          ${isHovered && !isSelected ? 'bg-[#333]' : ''}
          focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-1 focus-visible:ring-offset-[#1a1a1a]
        `}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Icon with subtle animation */}
        <span className={`
          transition-all duration-200 ease-out
          ${entry.isDirectory ? 'text-[#3b82f6]' : 'text-[#a3a3a3]'}
          ${isHovered ? 'scale-110' : ''}
        `}>
          <IconComponent size={18} />
        </span>

        {/* File name */}
        <span className={`
          flex-1 truncate text-sm transition-colors duration-150
          ${isSelected ? 'text-[#e5e5e5] font-medium' : 'text-[#d4d4d4]'}
        `}>
          {entry.name}
        </span>

        {/* Hover actions */}
        <div className={`
          flex items-center gap-1 opacity-0 group-hover:opacity-100 
          transition-all duration-200 ease-out
          ${isHovered ? 'translate-x-0' : '-translate-x-2'}
        `}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            className="p-1.5 rounded-md text-[#737373] hover:text-[#a3a3a3] hover:bg-[#404040]/50 transition-colors"
            title="Copiar"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCut();
            }}
            className="p-1.5 rounded-md text-[#737373] hover:text-[#a3a3a3] hover:bg-[#404040]/50 transition-colors"
            title="Cortar"
          >
            <Scissors size={14} />
          </button>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
        )}
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
