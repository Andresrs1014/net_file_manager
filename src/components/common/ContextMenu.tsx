import { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '../../types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    requestAnimationFrame(() => {
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
        setTimeout(onClose, 150);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setVisible(false);
        setTimeout(onClose, 150);
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

      let newX = x;
      let newY = y;

      if (rect.right > viewportWidth) {
        newX = x - rect.width;
      }
      if (rect.bottom > viewportHeight) {
        newY = y - rect.height;
      }

      // Ensure menu stays within viewport
      newX = Math.max(4, newX);
      newY = Math.max(4, newY);

      setPosition({ x: newX, y: newY });
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className={`
        fixed bg-[#262626]/95 backdrop-blur-sm border border-[#404040] rounded-lg 
        shadow-xl shadow-black/30 py-1 min-w-[180px] z-[100]
        ${visible 
          ? 'opacity-100 scale-100' 
          : 'opacity-0 scale-95'
        }
        transition-all duration-150 ease-out
      `}
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-orientation="vertical"
    >
      {items.map((item, idx) =>
        item.separator ? (
          <div key={`sep-${idx}`} className="border-t border-[#404040] my-1 mx-2" />
        ) : (
          <button
            key={`item-${idx}`}
            role="menuitem"
            className={`
              w-full px-3 py-2 text-left text-sm flex items-center gap-3 
              transition-all duration-150 ease-out
              ${item.disabled
                ? 'text-[#737373] cursor-not-allowed opacity-50'
                : item.danger
                  ? 'text-[#ef4444] hover:bg-[#ef4444]/10 hover:translate-x-1'
                  : 'text-[#d4d4d4] hover:bg-[#333] hover:text-[#e5e5e5] hover:translate-x-1'
              }
            `}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                setVisible(false);
                setTimeout(onClose, 150);
              }
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.classList.add('bg-[#333]');
              }
            }}
            onMouseLeave={(e) => {
              if (!item.disabled && !item.danger) {
                e.currentTarget.classList.remove('bg-[#333]');
              }
            }}
            disabled={item.disabled}
            tabIndex={item.disabled ? -1 : 0}
          >
            {item.icon && (
              <span className={`
                w-5 h-5 flex items-center justify-center
                ${item.danger ? 'text-[#ef4444]' : 'text-[#a3a3a3]'}
                transition-colors duration-150
              `}>
                {item.icon}
              </span>
            )}
            <span className="flex-1 font-medium">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-[#737373] font-mono ml-2">
                {item.shortcut}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}
