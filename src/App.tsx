import { useState, useEffect } from 'react';
import { Toolbar } from './components/layout/Toolbar';
import { Sidebar } from './components/layout/Sidebar';
import { FilePanel } from './components/file-panel/FilePanel';
import { Terminal } from './components/terminal/Terminal';
import { fileService, getConfig as getAppConfig, setConfig as setAppConfig } from './services/fileService';
import type { ClipboardContent } from './types';

function App() {
  const [ready, setReady] = useState(false);
  const [leftPath, setLeftPath] = useState('C:\\');
  const [rightPath, setRightPath] = useState('C:\\');
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left');
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardContent | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      setReady(true);
      loadConfig();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            // Copy handled in FilePanel
            break;
          case 'x':
            // Cut handled in FilePanel
            break;
          case 'v':
            // Paste handled in FilePanel
            break;
          case 'o':
            e.preventDefault();
            handleOpenFolder();
            break;
          case 'a':
            e.preventDefault();
            // Select all handled in FilePanel
            break;
        }
      } else if (e.key === 'Delete') {
        // Delete handled in FilePanel
      } else if (e.key === 'F2') {
        // Rename handled in FilePanel
      } else if (e.key === '`') {
        e.preventDefault();
        setTerminalVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getAppConfig();
      if (config.lastLeftPath) setLeftPath(config.lastLeftPath);
      if (config.lastRightPath) setRightPath(config.lastRightPath);
      if (config.favorites) setFavorites(config.favorites);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const savePath = async (side: 'left' | 'right', path: string) => {
    try {
      await setAppConfig(side === 'left' ? 'lastLeftPath' : 'lastRightPath', path);
    } catch (error) {
      console.error('Error saving path:', error);
    }
  };

  const handleLeftPathChange = (path: string) => {
    setLeftPath(path);
    savePath('left', path);
  };

  const handleRightPathChange = (path: string) => {
    setRightPath(path);
    savePath('right', path);
  };

  const handleOpenFolder = async () => {
    const folderPath = await fileService.showOpenFolderDialog();
    if (folderPath) {
      if (activePanel === 'left') {
        handleLeftPathChange(folderPath);
      } else {
        handleRightPathChange(folderPath);
      }
    }
  };

  const handleToggleTerminal = () => {
    setTerminalVisible(!terminalVisible);
  };

  const handleToggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  const handleSidebarNavigate = (path: string) => {
    if (activePanel === 'left') {
      handleLeftPathChange(path);
    } else {
      handleRightPathChange(path);
    }
  };

  const currentPath = activePanel === 'left' ? leftPath : rightPath;

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📁</div>
          <p className="text-lg">Cargando NetVault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a] text-[#e5e5e5] overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        onOpenFolder={handleOpenFolder}
        onToggleTerminal={handleToggleTerminal}
        onToggleTheme={handleToggleTheme}
        terminalVisible={terminalVisible}
        clipboard={clipboard}
        onClipboardClear={() => setClipboard(null)}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          favorites={favorites}
          onNavigate={handleSidebarNavigate}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isOpen={sidebarOpen}
        />

        {/* Panels */}
        <div className="flex flex-1">
          {/* Left panel */}
          <FilePanel
            id="left"
            path={leftPath}
            onPathChange={handleLeftPathChange}
            isActive={activePanel === 'left'}
            onActivate={() => setActivePanel('left')}
            clipboard={clipboard}
            onClipboardChange={setClipboard}
          />

          {/* Divider */}
          <div className="w-1 bg-[#333] cursor-col-resize hover:bg-[#3b82f6] transition-colors" />

          {/* Right panel or Terminal */}
          {terminalVisible ? (
            <Terminal
              initialCwd={currentPath}
              onClose={() => setTerminalVisible(false)}
            />
          ) : (
            <FilePanel
              id="right"
              path={rightPath}
              onPathChange={handleRightPathChange}
              isActive={activePanel === 'right'}
              onActivate={() => setActivePanel('right')}
              clipboard={clipboard}
              onClipboardChange={setClipboard}
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <footer className="h-6 bg-[#262626] flex items-center px-4 text-xs text-[#737373] border-t border-[#404040]">
        <span>NetVault listo</span>
        <div className="flex-1" />
        {clipboard && (
          <span className="mr-4">
            {clipboard.action === 'copy' ? '📋 Copiar' : '✂️ Cortar'}: {clipboard.paths.length} archivo(s)
          </span>
        )}
        <span>{activePanel === 'left' ? 'Panel izquierdo' : 'Panel derecho'} activo</span>
      </footer>
    </div>
  );
}

export default App;