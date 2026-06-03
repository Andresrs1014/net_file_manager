import { useState, useEffect } from 'react';
import { Toolbar } from './components/layout/Toolbar';
import { Sidebar } from './components/layout/Sidebar';
import { FilePanel } from './components/file-panel/FilePanel';
import { Terminal } from './components/terminal/Terminal';
import { AIChat } from './components/ai/AIChat';
import { Scaffolder } from './components/ai/Scaffolder';
import { DocumentViewer } from './components/document/DocumentViewer';
import { GraphPanel } from './components/graph/GraphPanel';
import { FlowchartPanel } from './components/flowchart/FlowchartPanel';
import { AnalyzerPanel } from './components/analyzer/AnalyzerPanel';
import { ExportPanel, createSampleExportData } from './components/export/ExportPanel';
import { fileService, getConfig as getAppConfig, setConfig as setAppConfig } from './services/fileService';
import { isSupported } from './services/documentService';
import type { ClipboardContent } from './types';

function App() {
  const [ready, setReady] = useState(false);
  const [leftPath, setLeftPath] = useState('C:\\');
  const [rightPath, setRightPath] = useState('C:\\');
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left');
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [quickAccess, setQuickAccess] = useState<{ icon: string; path: string; label: string }[]>([
    { icon: '💻', path: 'C:\\', label: 'Este equipo' },
    { icon: '📥', path: 'C:\\Users\\User\\Downloads', label: 'Descargas' },
    { icon: '📁', path: 'C:\\Users\\User\\Documents', label: 'Documentos' },
    { icon: '🖥️', path: 'D:\\', label: 'Disco D:' },
  ]);
  const [clipboard, setClipboard] = useState<ClipboardContent | null>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [showScaffolder, setShowScaffolder] = useState(false);
  const [documentViewerPath, setDocumentViewerPath] = useState<string | null>(null);
  const [showGraphPanel, setShowGraphPanel] = useState(false);
  const [showFlowchartPanel, setShowFlowchartPanel] = useState(false);
  const [showAnalyzerPanel, setShowAnalyzerPanel] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Handle file double-click (opens document viewer for supported files)
  const handleFileOpen = (filePath: string) => {
    if (isSupported(filePath)) {
      setDocumentViewerPath(filePath);
    }
  };

  useEffect(() => {
    // Development fallback: use mock if electronAPI not available
    if (window.electronAPI) {
      setReady(true);
      loadConfig();
    } else {
      // Mock electronAPI for dev without Electron
      const userProfile = 'C:\\Users\\' + (process.env.USERNAME || 'User');
      (window as any).electronAPI = {
        readDirectory: async () => [],
        readConfig: async () => ({ theme: 'dark', lastLeftPath: userProfile, lastRightPath: userProfile, favorites: [], terminalVisible: false }),
        writeConfig: async () => {},
        showOpenFolderDialog: async () => userProfile,
        openFolderDialog: async () => userProfile,
        openFileDialog: async () => null,
        saveFileDialog: async () => null,
        deleteFile: async () => {},
        renameFile: async () => {},
        copyFile: async () => {},
        moveFile: async () => {},
        createDirectory: async () => {},
        showMessage: async () => 0,
        readFile: async () => '',
        writeFile: async () => {},
        getPath: async () => userProfile,
        minimize: () => {},
        maximize: () => {},
        close: () => {},
        isMaximized: async () => false,
        getClipboard: async () => '',
        setClipboard: async () => {},
        getFileStats: async () => ({ size: 0, modified: new Date(), created: new Date(), isDirectory: false }),
        fileExists: async () => false,
        showInFolder: async () => {},
      };
      setReady(true);
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
          case 'f':
            e.preventDefault();
            // Focus search - will be handled by SearchBar component
            const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
            searchInput?.focus();
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

  const handleTerminalCwdChange = (newCwd: string) => {
    // Update the active panel's path when terminal changes directory
    if (activePanel === 'left') {
      handleLeftPathChange(newCwd);
    } else {
      handleRightPathChange(newCwd);
    }
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

  const handleToggleAI = () => {
    setAiVisible(!aiVisible);
  };

  const handleSidebarNavigate = (path: string) => {
    if (activePanel === 'left') {
      handleLeftPathChange(path);
    } else {
      handleRightPathChange(path);
    }
  };

  const handleNavigateToPath = (path: string) => {
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
        onNavigateToPath={handleNavigateToPath}
        onToggleAI={handleToggleAI}
        aiVisible={aiVisible}
        currentPath={currentPath}
        onOpenGraph={() => setShowGraphPanel(true)}
        onOpenFlowchart={() => setShowFlowchartPanel(true)}
        onOpenAnalyzer={() => setShowAnalyzerPanel(true)}
        onOpenExport={() => setShowExportPanel(true)}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          quickAccess={quickAccess}
          favorites={favorites}
          onNavigate={handleSidebarNavigate}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isOpen={sidebarOpen}
          clipboard={clipboard}
          onCopy={(path) => setClipboard({ action: 'copy', paths: [path] })}
          onCut={(path) => setClipboard({ action: 'cut', paths: [path] })}
          onPaste={async (path) => {
            if (clipboard && clipboard.paths.length > 0) {
              for (const srcPath of clipboard.paths) {
                const fileName = srcPath.split('\\').pop() || srcPath.split('/').pop();
                const dstPath = path.endsWith('\\') ? path + fileName : path + '\\' + fileName;
                try {
                  if (clipboard.action === 'copy') {
                    await fileService.copyFile(srcPath, dstPath);
                  } else if (clipboard.action === 'cut') {
                    await fileService.moveFile(srcPath, dstPath);
                  }
                } catch (error) {
                  console.error('Error pasting:', error);
                }
              }
              setClipboard(null);
            }
          }}
          onRemoveFavorite={(path) => {
            const newFavorites = favorites.filter(f => f !== path);
            setFavorites(newFavorites);
            fileService.saveConfig({ favorites: newFavorites });
          }}
          onRemoveFromQuickAccess={(path) => {
            const newQuickAccess = quickAccess.filter(item => item.path !== path);
            setQuickAccess(newQuickAccess);
            fileService.saveConfig({ quickAccess: newQuickAccess });
          }}
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
            onFileOpen={handleFileOpen}
          />

          {/* Divider */}
          <div className="w-1 bg-[#333] cursor-col-resize hover:bg-[#3b82f6] transition-colors" />

          {/* Right panel or Terminal or AI Chat */}
          {aiVisible ? (
            <div className="w-96 border-l border-[#404040]">
              <AIChat
                projectPath={currentPath}
                onClose={() => setAiVisible(false)}
                onOpenScaffolder={() => setShowScaffolder(true)}
              />
            </div>
          ) : terminalVisible ? (
            <Terminal
              initialCwd={currentPath}
              onClose={() => setTerminalVisible(false)}
              onCwdChange={handleTerminalCwdChange}
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
              onFileOpen={handleFileOpen}
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <footer className="h-7 bg-[#262626] flex items-center px-4 text-xs text-[#737373] border-t border-[#404040]">
        <span>NetVault listo</span>
        <div className="flex-1" />
        {clipboard && (
          <span className="mr-4">
            {clipboard.action === 'copy' ? '📋 Copiar' : '✂️ Cortar'}: {clipboard.paths.length} archivo(s)
          </span>
        )}
        <span>{activePanel === 'left' ? 'Panel izquierdo' : 'Panel derecho'} activo</span>
      </footer>

{/* Scaffolder Modal */}
        {showScaffolder && (
          <Scaffolder
            destinationPath={currentPath}
            onClose={() => setShowScaffolder(false)}
            onProjectCreated={(path) => {
              // Navigate to the newly created project
              if (activePanel === 'left') {
                handleLeftPathChange(path);
              } else {
                handleRightPathChange(path);
              }
            }}
          />
        )}

        {/* Document Viewer Modal */}
        {documentViewerPath && (
          <DocumentViewer
            filePath={documentViewerPath}
            onClose={() => setDocumentViewerPath(null)}
          />
        )}

        {/* Graph Viewer Modal */}
        {showGraphPanel && (
          <GraphPanel
            onClose={() => setShowGraphPanel(false)}
          />
        )}

        {/* Flowchart Generator Modal */}
        {showFlowchartPanel && (
          <FlowchartPanel
            onClose={() => setShowFlowchartPanel(false)}
          />
        )}

        {/* Analyzer Panel Modal */}
        {showAnalyzerPanel && (
          <AnalyzerPanel
            onClose={() => setShowAnalyzerPanel(false)}
          />
        )}

        {/* Export Panel Modal */}
        {showExportPanel && (
          <ExportPanel
            data={createSampleExportData()}
            onClose={() => setShowExportPanel(false)}
          />
        )}
      </div>
    );
  }

export default App;