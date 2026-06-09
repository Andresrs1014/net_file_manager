import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, Pencil } from 'lucide-react';

interface PathNavigatorProps {
  path: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
  onForward: () => void;
  onUp: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export function PathNavigator({
  path,
  onNavigate,
  onBack,
  onForward,
  onUp,
  canGoBack,
  canGoForward,
}: PathNavigatorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(path);

  useEffect(() => {
    if (path !== editValue && !isEditing) {
      setEditValue(path);
    }
  }, [path, editValue, isEditing]);

  const handleSubmit = () => {
    if (editValue.trim()) {
      onNavigate(editValue.trim());
    } else {
      setEditValue(path);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(path);
      setIsEditing(false);
    }
  };

  const handleDropdownClick = (newPath: string) => {
    onNavigate(newPath);
  };

  // Split on both \ and / for cross-platform display; normalise to /
  const normPath = path.replace(/\\/g, '/');
  const pathParts = normPath.split('/').filter(Boolean);
  const currentDrive = pathParts[0] || '';

  const navBtnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    transition: 'background-color 0.12s ease, color 0.12s ease',
    flexShrink: 0,
  };

  return (
    <div
      className="h-8 flex items-center px-2 gap-1 shrink-0"
      style={{
        backgroundColor: 'var(--bg-raised)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* ← Back */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        title="Atrás"
        style={{
          ...navBtnBase,
          color: canGoBack ? 'var(--text-secondary)' : 'var(--text-muted)',
          cursor: canGoBack ? 'pointer' : 'not-allowed',
          opacity: canGoBack ? 1 : 0.35,
        }}
        onMouseEnter={e => {
          if (canGoBack) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = canGoBack
            ? 'var(--text-secondary)'
            : 'var(--text-muted)';
        }}
      >
        <ChevronLeft size={14} />
      </button>

      {/* → Forward */}
      <button
        onClick={onForward}
        disabled={!canGoForward}
        title="Adelante"
        style={{
          ...navBtnBase,
          color: canGoForward ? 'var(--text-secondary)' : 'var(--text-muted)',
          cursor: canGoForward ? 'pointer' : 'not-allowed',
          opacity: canGoForward ? 1 : 0.35,
        }}
        onMouseEnter={e => {
          if (canGoForward) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = canGoForward
            ? 'var(--text-secondary)'
            : 'var(--text-muted)';
        }}
      >
        <ChevronRight size={14} />
      </button>

      {/* ↑ Up */}
      <button
        onClick={onUp}
        title="Carpeta superior"
        style={{
          ...navBtnBase,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          marginRight: '2px',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        }}
      >
        <ChevronUp size={14} />
      </button>

      {/* Path area */}
      <div
        className="flex-1 flex items-center rounded overflow-hidden"
        style={{
          backgroundColor: isEditing ? 'var(--bg-base)' : 'transparent',
          border: isEditing
            ? '1px solid var(--border-accent)'
            : '1px solid transparent',
          height: '24px',
          paddingLeft: '6px',
          paddingRight: '4px',
          cursor: isEditing ? 'text' : 'default',
          transition: 'border-color 0.12s ease, background-color 0.12s ease',
        }}
        onClick={() => {
          if (!isEditing) setIsEditing(true);
        }}
      >
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none font-mono text-[11px]"
            style={{ color: 'var(--text-primary)' }}
          />
        ) : (
          <div
            className="flex items-center text-[11px] min-w-0 overflow-x-auto"
            style={{ color: 'var(--text-secondary)', scrollbarWidth: 'none' }}
          >
            {/* Drive selector */}
            <div className="relative group shrink-0">
              <button
                className="font-medium whitespace-nowrap transition-colors duration-100"
                style={{ color: 'var(--text-accent)' }}
              >
                {currentDrive}
              </button>
              {/* Drive dropdown */}
              <div
                className="absolute top-full left-0 rounded shadow-lg hidden group-hover:block z-20"
                style={{
                  backgroundColor: 'var(--bg-overlay)',
                  border: '1px solid var(--border-default)',
                  minWidth: '100px',
                  marginTop: '2px',
                }}
              >
                {['C:', 'D:', 'E:'].map(drive => (
                  <button
                    key={drive}
                    onClick={e => {
                      e.stopPropagation();
                      handleDropdownClick(drive + '\\');
                    }}
                    className="block w-full px-3 py-1 text-left text-[11px] font-mono whitespace-nowrap transition-colors duration-100"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    }}
                  >
                    {drive}\
                  </button>
                ))}
              </div>
            </div>

            {/* Breadcrumb separated by / */}
            {pathParts.slice(1).map((part, index) => {
              const partialPath = pathParts.slice(0, index + 2).join('\\');
              return (
                <span key={index} className="flex items-center shrink-0">
                  <span className="mx-1" style={{ color: 'var(--text-muted)' }}>/</span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onNavigate(partialPath + '\\');
                    }}
                    className="whitespace-nowrap transition-colors duration-100 hover:underline"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-accent)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    }}
                  >
                    {part}
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit hint icon */}
      {!isEditing && (
        <button
          title="Editar ruta"
          onClick={() => setIsEditing(true)}
          style={{ ...navBtnBase, color: 'var(--text-muted)', flexShrink: 0 }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
}
