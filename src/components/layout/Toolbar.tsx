import { useState, useCallback, useRef, useEffect } from 'react';
import { SearchBar } from '../search/SearchBar';
import { searchService } from '../../services/searchService';
import { 
  FolderOpen, 
  Zap, 
  Terminal, 
  Bot, 
  Grid3X3, 
  Network, 
  GitBranch, 
  FlaskConical, 
  Package, 
  Moon,
  ChevronDown
} from 'lucide-react';
import type { ClipboardContent } from '../../types';

interface ToolbarProps {
  onOpenFolder: () => void;
  onToggleTerminal: () => void;
  onToggleTheme: () => void;
  terminalVisible: boolean;
  clipboard: ClipboardContent | null;
  onClipboardClear: () => void;
  onNavigateToPath?: (path: string) => void;
  onToggleAI?: () => void;
  aiVisible?: boolean;
  currentPath?: string;
  onOpenGraph?: () => void;
  onOpenFlowchart?: () => void;
  onOpenAnalyzer?: () => void;
  onOpenExport?: () => void;
}

interface SearchResult {
  entry: { name: string; path: string; isDirectory: boolean };
  score: number;
  source: 'index' | 'ai';
}

interface ToolGroup {
  label?: string;
  tools: {
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
    active?: boolean;
    onClick: () => void;
  }[];
}

export function Toolbar({
  onOpenFolder,
  onToggleTerminal,
  onToggleTheme,
  terminalVisible,
  clipboard,
  onClipboardClear,
  onNavigateToPath,
  onToggleAI,
  aiVisible,
  currentPath,
  onOpenGraph,
  onOpenFlowchart,
  onOpenAnalyzer,
  onOpenExport,
}: ToolbarProps) {
  const [indexing, setIndexing] = useState(false);
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAiDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnterDropdown = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setAiDropdownOpen(true);
  };

  const handleMouseLeaveDropdown = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setAiDropdownOpen(false);
    }, 150);
  };

  const handleSearchSelect = async (result: SearchResult) => {
    const dirPath = result.entry.isDirectory 
      ? result.entry.path 
      : result.entry.path.split('\\').slice(0, -1).join('\\') + '\\';
    
    onNavigateToPath?.(dirPath);
  };

  const handleIndexCurrentPath = useCallback(async () => {
    if (!currentPath || indexing) return;
    
    setIndexing(true);
    try {
      await searchService.indexDirectory(currentPath);
      // Success feedback could be added here
    } catch (error) {
      console.error('Error indexing path:', error);
    } finally {
      setTimeout(() => setIndexing(false), 500);
    }
  }, [currentPath, indexing]);

  // Define tool groups for better visual hierarchy
  const primaryTools: ToolGroup = {
    tools: [
      { 
        icon: <FolderOpen size={16} />, 
        label: 'Abrir', 
        shortcut: 'Ctrl+O',
        onClick: onOpenFolder 
      },
      { 
        icon: <Zap size={16} className={indexing ? 'animate-pulse' : ''} />, 
        label: indexing ? 'Indexando...' : 'Indexar', 
        onClick: handleIndexCurrentPath 
      },
    ]
  };

  const viewTools: ToolGroup = {
    label: 'Vista',
    tools: [
      { 
        icon: <Terminal size={16} />, 
        label: 'Terminal', 
        shortcut: '`',
        active: terminalVisible,
        onClick: onToggleTerminal 
      },
      { 
        icon: <Bot size={16} />, 
        label: 'AI Assistant',
        active: aiVisible,
        onClick: onToggleAI ?? (() => {}) 
      },
    ]
  };

  const aiTools: ToolGroup = {
    label: 'Herramientas IA',
    tools: [
      { 
        icon: <Grid3X3 size={16} />, 
        label: 'Scaffolder',
        onClick: () => {} 
      },
      { 
        icon: <Network size={16} />, 
        label: 'Grafo',
        onClick: onOpenGraph ?? (() => {}) 
      },
      { 
        icon: <GitBranch size={16} />, 
        label: 'Flujograma',
        onClick: onOpenFlowchart ?? (() => {}) 
      },
      { 
        icon: <FlaskConical size={16} />, 
        label: 'Analizador',
        onClick: onOpenAnalyzer ?? (() => {}) 
      },
      { 
        icon: <Package size={16} />, 
        label: 'Exportar',
        onClick: onOpenExport ?? (() => {}) 
      },
    ]
  };

  return (
    <header className="relative h-12 bg-[#262626] flex items-center px-3 gap-1 border-b border-[#404040] overflow-visible">
      {/* Logo/Brand */}
      <div className="flex items-center gap-2 shrink-0 pr-3 mr-2 border-r border-[#404040]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-[#3b82f6]/20">
          <span className="text-white text-sm font-bold">N</span>
        </div>
        <h1 className="text-sm font-semibold text-[#e5e5e5] hidden md:block">NetVault</h1>
      </div>

      {/* Primary Actions */}
      <div className="flex items-center gap-1">
        {primaryTools.tools.map((tool, idx) => (
          <button
            key={idx}
            onClick={tool.onClick}
            className="group flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg
                       text-[#a3a3a3] hover:text-[#e5e5e5] 
                       transition-all duration-200 ease-out
                       hover:bg-[#333]
                       active:scale-[0.97]"
            title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
          >
            <span className={`transition-transform duration-200 ${tool.label === 'Indexar' && indexing ? 'animate-pulse' : 'group-hover:scale-110'}`}>
              {tool.icon}
            </span>
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-[#404040] shrink-0 mx-1" />

      {/* View Toggle */}
      <div className="flex items-center gap-1">
        {viewTools.tools.map((tool, idx) => (
          <button
            key={idx}
            onClick={tool.onClick}
            className={`group flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg
                       transition-all duration-200 ease-out
                       ${tool.active 
                         ? 'bg-[#3b82f6] text-white shadow-lg shadow-[#3b82f6]/30' 
                         : 'text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#333]'
                       }
                       active:scale-[0.97]`}
            title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
          >
            <span className={`transition-transform duration-200 ${tool.active ? 'scale-110' : 'group-hover:scale-110'}`}>
              {tool.icon}
            </span>
            <span className="hidden sm:inline">{tool.label}</span>
            {tool.active && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse ml-0.5" />
            )}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-[#404040] shrink-0 mx-1" />

      {/* AI Tools Dropdown */}
      <div 
        ref={dropdownRef}
        className="relative"
        onMouseEnter={handleMouseEnterDropdown}
        onMouseLeave={handleMouseLeaveDropdown}
      >
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg
                     transition-all duration-200 ease-out
                     ${aiDropdownOpen 
                       ? 'bg-[#8b5cf6]/20 text-[#e5e5e5]' 
                       : 'text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#333]'
                     }`}
        >
          <span className="text-[#8b5cf6]">
            <FlaskConical size={16} />
          </span>
          <span className="hidden lg:inline">Herramientas IA</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${aiDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {aiDropdownOpen && (
          <div 
            className="absolute top-full left-0 mt-1 w-48 py-1 bg-[#262626] rounded-lg 
                           border border-[#404040] shadow-xl shadow-black/30
                           animate-fade-in-scale z-[60]"
            onMouseEnter={handleMouseEnterDropdown}
            onMouseLeave={handleMouseLeaveDropdown}
          >
            {aiTools.tools.map((tool, idx) => (
              <button
                key={idx}
                onClick={() => {
                  tool.onClick();
                  setAiDropdownOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm
                           text-[#a3a3a3] hover:text-[#e5e5e5] 
                           hover:bg-[#333]
                           transition-colors duration-150
                           first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="text-[#8b5cf6]">{tool.icon}</span>
                {tool.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="shrink-0 w-48 lg:w-64 ml-auto mr-2">
        <SearchBar
          onResultSelect={handleSearchSelect}
          placeholder="Buscar..."
          currentPath={currentPath}
        />
      </div>

      {/* Clipboard status */}
      {clipboard && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] rounded-lg 
                       border border-[#404040] shrink-0
                       animate-fade-in">
          <span className="text-xs text-[#a3a3a3] flex items-center gap-1.5">
            <span className="text-[#3b82f6]">
              {clipboard.action === 'copy' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
              )}
            </span>
            {clipboard.paths.length}
          </span>
          <button
            onClick={onClipboardClear}
            className="text-[#737373] hover:text-[#ef4444] transition-colors duration-200
                       p-0.5 rounded hover:bg-[#ef4444]/10"
            title="Limpiar portapapeles"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className="p-2 text-[#737373] hover:text-[#e5e5e5] 
                   hover:bg-[#333] rounded-lg
                   transition-all duration-200 ease-out
                   active:scale-90"
        title="Cambiar tema"
      >
        <Moon size={18} />
      </button>
    </header>
  );
}
