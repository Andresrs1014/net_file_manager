import { useState } from 'react';
import { ContextMenu } from '../common/ContextMenu';
import type { ClipboardContent } from '../../types';
import { 
  Computer, 
  Download, 
  FileText, 
  HardDrive,
  Star,
  ChevronLeft,
  Menu,
  Folder,
  Copy,
  Scissors,
  Clipboard,
  Link,
  ExternalLink,
  Trash2,
  Plus
} from 'lucide-react';

interface SidebarProps {
  quickAccess: { icon: string; path: string; label: string }[];
  favorites: string[];
  onNavigate: (path: string) => void;
  onToggle: () => void;
  isOpen: boolean;
  clipboard: ClipboardContent | null;
  onCopy: (path: string) => void;
  onCut: (path: string) => void;
  onPaste: (path: string) => void;
  onRemoveFavorite: (path: string) => void;
  onRemoveFromQuickAccess: (path: string) => void;
  onReorderQuickAccess?: (items: { icon: string; path: string; label: string }[]) => void;
}

// Map emoji icons to Lucide icons
function getQuickAccessIcon(emoji: string) {
  switch (emoji) {
    case '💻': return <Computer size={16} />;
    case '📥': return <Download size={16} />;
    case '📁': return <FileText size={16} />;
    case '🖥️': return <HardDrive size={16} />;
    default: return <Folder size={16} />;
  }
}

export function Sidebar({
  quickAccess,
  favorites,
  onNavigate,
  onToggle,
  isOpen,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onRemoveFavorite,
  onRemoveFromQuickAccess,
}: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; type: 'quickAccess' | 'favorite' } | null>(null);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="h-full px-3 flex items-center justify-center
                   text-[#737373] hover:text-[#e5e5e5] hover:bg-[#262626] 
                   transition-all duration-200 ease-out
                   active:scale-95"
        title="Mostrar barra lateral"
      >
        <Menu size={20} />
      </button>
    );
  }

  const handleContextMenu = (e: React.MouseEvent, path: string, type: 'quickAccess' | 'favorite') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path, type });
  };

  const handleOpenInExplorer = async (path: string) => {
    try {
      await window.electronAPI.showInFolder(path);
    } catch (error) {
      console.error('Error opening in explorer:', error);
    }
  };

  const handleCopyPath = async (path: string) => {
    try {
      await window.electronAPI.setClipboard(path);
    } catch (error) {
      console.error('Error copying path:', error);
    }
  };

  const hasClipboard = clipboard && clipboard.paths.length > 0;

  const contextMenuItems = contextMenu ? [
    {
      label: 'Abrir',
      icon: <Folder size={14} />,
      action: () => onNavigate(contextMenu.path),
    },
    { separator: true, label: '' } as any,
    {
      label: 'Copiar',
      icon: <Copy size={14} />,
      action: () => onCopy(contextMenu.path),
    },
    {
      label: 'Cortar',
      icon: <Scissors size={14} />,
      action: () => onCut(contextMenu.path),
    },
    ...(hasClipboard ? [{
      label: 'Pegar',
      icon: <Clipboard size={14} />,
      action: () => onPaste(contextMenu.path),
    }] : []),
    { separator: true, label: '' } as any,
    {
      label: 'Copiar dirección',
      icon: <Link size={14} />,
      action: () => handleCopyPath(contextMenu.path),
    },
    {
      label: 'Abrir en el explorador',
      icon: <ExternalLink size={14} />,
      action: () => handleOpenInExplorer(contextMenu.path),
    },
    { separator: true, label: '' } as any,
    ...(contextMenu.type === 'favorite' ? [{
      label: 'Quitar de favoritos',
      icon: <Star size={14} />,
      action: () => onRemoveFavorite(contextMenu.path),
    }] : contextMenu.type === 'quickAccess' ? [{
      label: 'Quitar de acceso rápido',
      icon: <Trash2 size={14} />,
      action: () => onRemoveFromQuickAccess(contextMenu.path),
    }] : []),
  ] : [];

  return (
    <>
      <aside className="w-56 h-full bg-[#1a1a1a] border-r border-[#404040] flex flex-col
                       animate-slide-right">
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-3 border-b border-[#333]
                       group">
          <span className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
            Explorador
          </span>
          <button
            onClick={onToggle}
            className="text-[#737373] hover:text-[#e5e5e5] transition-colors duration-200
                       p-1 rounded hover:bg-[#333]
                       active:scale-90"
            title="Ocultar barra lateral"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Quick Access */}
        <div className="p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs text-[#737373] uppercase tracking-wide font-medium">
              Acceso rápido
            </span>
            <button
              className="p-1 text-[#737373] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 
                         rounded transition-all duration-200"
              title="Agregar a acceso rápido"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-0.5">
            {quickAccess.map((item, index) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                onContextMenu={(e) => handleContextMenu(e, item.path, 'quickAccess')}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                  transition-all duration-200 ease-out
                  ${hoveredItem === item.path 
                    ? 'bg-[#333] text-[#e5e5e5] transform translate-x-1' 
                    : 'text-[#a3a3a3] hover:bg-[#262626] hover:text-[#e5e5e5]'
                  }
                  animate-slide-up
                `}
                style={{ animationDelay: `${index * 50}ms` }}
                title={item.path}
              >
                <span className={`
                  transition-transform duration-200
                  ${hoveredItem === item.path ? 'scale-110' : ''}
                `}>
                  {getQuickAccessIcon(item.icon)}
                </span>
                <span className="truncate font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Favorites */}
        <div className="p-2 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs text-[#737373] uppercase tracking-wide font-medium">
              Favoritos
            </span>
            <button
              className="p-1 text-[#737373] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 
                         rounded transition-all duration-200"
              title="Agregar a favoritos"
            >
              <Plus size={14} />
            </button>
          </div>
          
          {favorites.length === 0 ? (
            <div className="px-3 py-6 text-center animate-fade-in">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#262626] flex items-center justify-center">
                <Star size={18} className="text-[#505050]" />
              </div>
              <p className="text-xs text-[#606060]">Sin favoritos</p>
              <p className="mt-1 text-[10px] text-[#505050]">Usa el menú contextual para agregar</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {favorites.map((fav, index) => (
                <button
                  key={fav}
                  onClick={() => onNavigate(fav)}
                  onContextMenu={(e) => handleContextMenu(e, fav, 'favorite')}
                  onMouseEnter={() => setHoveredItem(fav)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                    transition-all duration-200 ease-out
                    ${hoveredItem === fav 
                      ? 'bg-[#333] text-[#e5e5e5] transform translate-x-1' 
                      : 'text-[#a3a3a3] hover:bg-[#262626] hover:text-[#e5e5e5]'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                  title={fav}
                >
                  <span className={`
                    text-[#f59e0b] transition-transform duration-200
                    ${hoveredItem === fav ? 'scale-110' : ''}
                  `}>
                    <Star size={16} />
                  </span>
                  <span className="truncate font-medium">{fav.split('\\').pop()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-10 flex items-center justify-center border-t border-[#333]
                       bg-gradient-to-t from-[#1a1a1a] to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] 
                          flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">N</span>
            </div>
            <span className="text-xs text-[#737373] font-medium">NetVault v1.0</span>
          </div>
        </div>
      </aside>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
