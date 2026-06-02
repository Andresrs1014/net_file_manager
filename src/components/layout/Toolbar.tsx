interface ToolbarProps {
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
  onToggleTheme: () => void;
  terminalVisible: boolean;
}

export function Toolbar({ onOpenFolder, onToggleTerminal, onToggleTheme, terminalVisible }: ToolbarProps) {
  return (
    <header className="h-12 bg-[#262626] flex items-center px-4 gap-2 border-b border-[#404040]">
      {/* Logo/Título */}
      <div className="flex items-center gap-2">
        <span className="text-lg">📁</span>
        <h1 className="text-base font-semibold text-[#3b82f6]">NetVault</h1>
      </div>

      <div className="w-px h-6 bg-[#404040] mx-2" />

      {/* Acciones */}
      <button
        onClick={onOpenFolder}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#e5e5e5] hover:bg-[#333] rounded transition-colors"
        title="Abrir carpeta (Ctrl+O)"
      >
        <span>📂</span>
        <span>Abrir</span>
      </button>

      <button
        onClick={onToggleTerminal}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
          terminalVisible 
            ? 'bg-[#3b82f6] text-white' 
            : 'text-[#e5e5e5] hover:bg-[#333]'
        }`}
        title="Alternar terminal (Ctrl+`)"
      >
        <span>⌨️</span>
        <span>Terminal</span>
      </button>

      <div className="flex-1" />

      {/* Acciones derechas */}
      <button
        onClick={onToggleTheme}
        className="p-2 text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors"
        title="Cambiar tema"
      >
        🌙
      </button>
    </header>
  );
}