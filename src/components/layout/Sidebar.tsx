import { useState } from 'react';
import { ContextMenu } from '../common/ContextMenu';
import type { ClipboardContent } from '../../types';
import {
  Star,
  ChevronLeft,
  Menu,
  Folder,
  Copy,
  Scissors,
  Clipboard,
  Link,
  ExternalLink,
  Clock,
} from 'lucide-react';

interface SidebarProps {
  recentPaths?: string[];
  favorites: string[];
  onNavigate: (path: string) => void;
  onToggle: () => void;
  isOpen: boolean;
  clipboard: ClipboardContent | null;
  onCopy: (path: string) => void;
  onCut: (path: string) => void;
  onPaste: (path: string) => void;
  onRemoveFavorite: (path: string) => void;
  // Kept optional for App.tsx compatibility — not rendered
  quickAccess?: { icon: string; path: string; label: string }[];
  onRemoveFromQuickAccess?: (path: string) => void;
  onReorderQuickAccess?: (items: { icon: string; path: string; label: string }[]) => void;
}

function pathLabel(p: string): string {
  return p.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? p;
}

export function Sidebar({
  recentPaths = [],
  favorites,
  onNavigate,
  onToggle,
  isOpen,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onRemoveFavorite,
}: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    type: 'recent' | 'favorite';
  } | null>(null);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="h-full px-2.5 flex items-center justify-center
                   text-[var(--text-muted)] hover:text-[var(--text-primary)]
                   hover:bg-[var(--bg-hover)] transition-colors duration-150"
        title="Mostrar barra lateral"
      >
        <Menu size={16} />
      </button>
    );
  }

  const handleContextMenu = (
    e: React.MouseEvent,
    path: string,
    type: 'recent' | 'favorite'
  ) => {
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

  const contextMenuItems = contextMenu
    ? [
        {
          label: 'Abrir',
          icon: <Folder size={13} />,
          action: () => onNavigate(contextMenu.path),
        },
        { separator: true, label: '' } as any,
        {
          label: 'Copiar',
          icon: <Copy size={13} />,
          action: () => onCopy(contextMenu.path),
        },
        {
          label: 'Cortar',
          icon: <Scissors size={13} />,
          action: () => onCut(contextMenu.path),
        },
        ...(hasClipboard
          ? [
              {
                label: 'Pegar',
                icon: <Clipboard size={13} />,
                action: () => onPaste(contextMenu.path),
              },
            ]
          : []),
        { separator: true, label: '' } as any,
        {
          label: 'Copiar dirección',
          icon: <Link size={13} />,
          action: () => handleCopyPath(contextMenu.path),
        },
        {
          label: 'Abrir en el explorador',
          icon: <ExternalLink size={13} />,
          action: () => handleOpenInExplorer(contextMenu.path),
        },
        ...(contextMenu.type === 'favorite'
          ? [
              { separator: true, label: '' } as any,
              {
                label: 'Quitar de favoritos',
                icon: <Star size={13} />,
                action: () => onRemoveFavorite(contextMenu.path),
              },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <aside
        className="w-full h-full flex flex-col
                   bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]"
      >
        {/* Header */}
        <div className="h-8 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] shrink-0">
          <span className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
            Explorador
          </span>
          <button
            onClick={onToggle}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]
                       hover:bg-[var(--bg-hover)] p-1 rounded transition-colors duration-150"
            title="Ocultar barra lateral"
          >
            <ChevronLeft size={13} />
          </button>
        </div>

        {/* Recientes */}
        <div className="shrink-0 pt-2 pb-1">
          <span className="text-[9px] font-semibold tracking-widest uppercase text-[var(--text-muted)] px-3 py-1.5 block">
            Recientes
          </span>

          {recentPaths.length === 0 ? (
            <p className="text-[10px] text-[var(--text-muted)] px-3 py-1">
              Sin recientes
            </p>
          ) : (
            <div className="space-y-px">
              {recentPaths.map((rp) => (
                <button
                  key={rp}
                  onClick={() => onNavigate(rp)}
                  onContextMenu={(e) => handleContextMenu(e, rp, 'recent')}
                  onMouseEnter={() => setHoveredItem(rp)}
                  onMouseLeave={() => setHoveredItem(null)}
                  title={rp}
                  className={`w-full flex items-center gap-2 h-7 px-2.5 text-xs transition-colors duration-100
                    ${hoveredItem === rp
                      ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]'
                    }`}
                >
                  <Clock
                    size={11}
                    className="shrink-0 text-[var(--text-muted)]"
                  />
                  <span className="truncate">{pathLabel(rp)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="mx-3 border-t border-[var(--border-subtle)]" />

        {/* Favoritos */}
        <div className="flex-1 overflow-auto pt-2 pb-1">
          <span className="text-[9px] font-semibold tracking-widest uppercase text-[var(--text-muted)] px-3 py-1.5 block">
            Favoritos
          </span>

          {favorites.length === 0 ? (
            <p className="text-[10px] text-[var(--text-muted)] px-3 py-1">
              Sin favoritos
            </p>
          ) : (
            <div className="space-y-px">
              {favorites.map((fav) => (
                <button
                  key={fav}
                  onClick={() => onNavigate(fav)}
                  onContextMenu={(e) => handleContextMenu(e, fav, 'favorite')}
                  onMouseEnter={() => setHoveredItem(fav)}
                  onMouseLeave={() => setHoveredItem(null)}
                  title={fav}
                  className={`w-full flex items-center gap-2 h-7 px-2.5 text-xs transition-colors duration-100
                    ${hoveredItem === fav
                      ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]'
                    }`}
                >
                  <Star
                    size={11}
                    className="shrink-0 text-[#d4a017] fill-[#d4a017]"
                  />
                  <span className="truncate">{pathLabel(fav)}</span>
                </button>
              ))}
            </div>
          )}
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
