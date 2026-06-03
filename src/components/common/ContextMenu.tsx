import { useEffect, useRef } from 'react';
import type { MenuItem } from '../../types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off-screen
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menu.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menu.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#262626] border border-[#404040] rounded shadow-xl py-1 min-w-[180px] z-[100]"
      style={{ left: x, top: y }}
    >
      {items.map((item, idx) =>
        item.separator ? (
          <div key={`sep-${idx}`} className="border-t border-[#404040] my-1" />
        ) : (
          <button
            key={`item-${idx}`}
            className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors ${
              item.disabled
                ? 'text-[#737373] cursor-not-allowed'
                : item.danger
                  ? 'text-[#ef4444] hover:bg-[#ef4444]/10'
                  : 'text-[#e5e5e5] hover:bg-[#333]'
            }`}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="text-base">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}