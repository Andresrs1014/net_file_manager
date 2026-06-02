import { useState, useEffect } from 'react';

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

  const pathParts = path.split('\\').filter(Boolean);
  const currentDrive = pathParts[0] || '';

  return (
    <div className="h-10 bg-[#262626] flex items-center px-2 border-b border-[#404040]">
      {/* Botones de navegación */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`px-2 py-1 mr-1 rounded hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed`}
        title="Atrás"
      >
        ←
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className={`px-2 py-1 mr-1 rounded hover:bg-[#333] disabled:opacity-30 disabled:cursor-not-allowed`}
        title="Adelante"
      >
        →
      </button>
      <button
        onClick={onUp}
        className="px-2 py-1 mr-2 rounded hover:bg-[#333]"
        title="Carpeta superior"
      >
        ↑
      </button>

      {/* Barra de ruta */}
      <div className="flex-1 flex items-center bg-[#1a1a1a] rounded px-2 py-1 overflow-x-auto">
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-sm text-[#f5f5f5] font-mono"
          />
        ) : (
          <div 
            className="flex items-center text-sm text-[#a3a3a3] cursor-pointer min-w-0"
            onDoubleClick={() => setIsEditing(true)}
          >
            {/* Drive selector */}
            <div className="relative group">
              <button className="hover:text-[#3b82f6] font-semibold whitespace-nowrap">
                {currentDrive}
              </button>
              <div className="absolute top-full left-0 bg-[#262626] border border-[#404040] rounded shadow-lg hidden group-hover:block z-10 min-w-[120px]">
                <button
                  onClick={() => handleDropdownClick('C:\\')}
                  className="block w-full px-3 py-1 text-left hover:bg-[#333] whitespace-nowrap"
                >
                  C:\
                </button>
                <button
                  onClick={() => handleDropdownClick('D:\\')}
                  className="block w-full px-3 py-1 text-left hover:bg-[#333] whitespace-nowrap"
                >
                  D:\
                </button>
              </div>
            </div>

            {/* Breadcrumb */}
            {pathParts.slice(1).map((part, index) => {
              const partialPath = pathParts.slice(0, index + 2).join('\\');
              return (
                <span key={index} className="flex items-center">
                  <span className="mx-1 text-[#505050]">\</span>
                  <button
                    onClick={() => onNavigate(partialPath + '\\')}
                    className="hover:text-[#3b82f6] whitespace-nowrap"
                  >
                    {part}
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}