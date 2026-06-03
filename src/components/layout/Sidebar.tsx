import { useState } from 'react';
import { ContextMenu } from '../common/ContextMenu';
import type { ClipboardContent } from '../../types';

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
        className="h-full px-2 flex items-center text-[#737373] hover:text-[#e5e5e5] hover:bg-[#262626] transition-colors"
        title="Mostrar barra lateral"
      >
        ☰
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
      icon: '📂',
      action: () => onNavigate(contextMenu.path),
    },
    { separator: true, label: '' } as any,
    {
      label: 'Copiar',
      icon: '📋',
      action: () => onCopy(contextMenu.path),
    },
    {
      label: 'Cortar',
      icon: '✂️',
      action: () => onCut(contextMenu.path),
    },
    ...(hasClipboard ? [{
      label: 'Pegar',
      icon: '📋',
      action: () => onPaste(contextMenu.path),
    }] : []),
    { separator: true, label: '' } as any,
    {
      label: 'Copiar dirección',
      icon: '🔗',
      action: () => handleCopyPath(contextMenu.path),
    },
    {
      label: 'Abrir en el explorador',
      icon: '📍',
      action: () => handleOpenInExplorer(contextMenu.path),
    },
    { separator: true, label: '' } as any,
    ...(contextMenu.type === 'favorite' ? [{
      label: 'Quitar de favoritos',
      icon: '⭐',
      action: () => onRemoveFavorite(contextMenu.path),
    }] : contextMenu.type === 'quickAccess' ? [{
      label: 'Quitar de acceso rápido',
      icon: '🗑️',
      action: () => onRemoveFromQuickAccess(contextMenu.path),
    }] : []),
  ] : [];

  return (
    <>
      <aside className="w-56 h-full bg-[#1a1a1a] border-r border-[#404040] flex flex-col">
        {/* Header */}
        <div className="h-10 flex items-center justify-between px-3 border-b border-[#333]">
          <span className="text-xs font-medium text-[#a3a3a3] uppercase">Explorador</span>
          <button
            onClick={onToggle}
            className="text-[#737373] hover:text-[#e5e5e5] text-sm"
            title="Ocultar barra lateral"
          >
            ←
          </button>
        </div>

        {/* Quick Access */}
        <div className="p-2">
          <div className="text-xs text-[#737373] uppercase mb-2 px-2">Acceso rápido</div>
          <div className="space-y-1">
            {quickAccess.map((item) => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                onContextMenu={(e) => handleContextMenu(e, item.path, 'quickAccess')}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  hoveredItem === item.path 
                    ? 'bg-[#333] text-[#e5e5e5]' 
                    : 'text-[#a3a3a3] hover:bg-[#262626] hover:text-[#e5e5e5]'
                }`}
                title={item.path}
              >
                <span>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Favorites */}
        <div className="p-2 flex-1 overflow-auto">
          <div className="text-xs text-[#737373] uppercase mb-2 px-2">Favoritos</div>
          {favorites.length === 0 ? (
            <div className="px-2 py-4 text-center text-[#606060] text-xs">
              <p>Sin favoritos</p>
              <p className="mt-1 text-[#505050]">Usa el menú contextual para agregar</p>
            </div>
          ) : (
            <div className="space-y-1">
              {favorites.map((fav) => (
                <button
                  key={fav}
                  onClick={() => onNavigate(fav)}
                  onContextMenu={(e) => handleContextMenu(e, fav, 'favorite')}
                  onMouseEnter={() => setHoveredItem(fav)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    hoveredItem === fav 
                      ? 'bg-[#333] text-[#e5e5e5]' 
                      : 'text-[#a3a3a3] hover:bg-[#262626] hover:text-[#e5e5e5]'
                  }`}
                  title={fav}
                >
                  <span>⭐</span>
                  <span className="truncate">{fav.split('\\').pop()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-8 flex items-center justify-center border-t border-[#333]">
          <span className="text-xs text-[#737373]">NetVault v1.0</span>
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