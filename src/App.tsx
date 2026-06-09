import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { ActivityBar, type ActivityView } from './components/layout/ActivityBar';
import { StatusBar } from './components/layout/StatusBar';
import { CommandPalette, type Command } from './components/layout/CommandPalette';
import { SecondarySidebar } from './components/layout/SecondarySidebar';
import { SearchBar } from './components/search/SearchBar';
import { FilePanel } from './components/file-panel/FilePanel';
import { Terminal } from './components/terminal/Terminal';
import { AIChat } from './components/ai/AIChat';
import { Scaffolder } from './components/ai/Scaffolder';
import { DocumentViewer } from './components/document/DocumentViewer';
import { GraphPanel } from './components/graph/GraphPanel';
import { FlowchartPanel } from './components/flowchart/FlowchartPanel';
import { AnalyzerPanel } from './components/analyzer/AnalyzerPanel';
import { ExportPanel, createSampleExportData } from './components/export/ExportPanel';
import { AuthGate, type AuthSession } from './components/auth/AuthGate';
import { SigManagerPanel } from './components/sig/SigManagerPanel';
import { ConversionQueue } from './components/queue/ConversionQueue';
import { fileService, getConfig as getAppConfig, setConfig as setAppConfig } from './services/fileService';
import { isSupported } from './services/documentService';
import { searchService } from './services/searchService';
import { logoutFromIntranet } from './services/authService';
import type { AnalysisPackage, ClipboardContent } from './types';
import { X, FolderOpen, Search, BarChart2, GitBranch, RefreshCw, Terminal as TerminalIcon, Bot, ChevronLeft, Wifi, FileUp, Columns2, Sun, Moon } from 'lucide-react';

interface OpenTab {
  id: string;
  label: string;
  type: 'files' | 'document' | 'flowchart';
  path?: string;
}

function App() {
  const [ready, setReady] = useState(false);
  const [leftPath, setLeftPath] = useState('C:\\');
  const [rightPath, setRightPath] = useState('C:\\');
  /** Última carpeta visitada en cualquier panel (para grafo / IA) */
  const [lastExplorerPath, setLastExplorerPath] = useState('C:\\');
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left');
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [quickAccess, setQuickAccess] = useState<{ icon: string; path: string; label: string }[]>([
    { icon: '💻', path: 'C:\\', label: 'Este equipo' },
  ]);
  const [clipboard, setClipboard] = useState<ClipboardContent | null>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [showScaffolder, setShowScaffolder] = useState(false);
  const [showGraphPanel, setShowGraphPanel] = useState(false);
  const [lastAnalysisPackage, setLastAnalysisPackage] = useState<AnalysisPackage | null>(null);
  const [showFlowchartPanel, setShowFlowchartPanel] = useState(false);
  const [showAnalyzerPanel, setShowAnalyzerPanel] = useState(false);
  const [analyzerFilePath, setAnalyzerFilePath] = useState<string | undefined>();
  const [showExportPanel, setShowExportPanel] = useState(false);

  // ─── Auth ZYMO Intranet ────────────────────────────────────────────────────
  const [session,        setSession]        = useState<AuthSession | null>(null);
  const [showQueue,      setShowQueue]      = useState(false);
  const [conversionArea, setConversionArea] = useState('');

  // ─── Layout & Theme ───────────────────────────────────────────────────────
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(208); // default w-52 = 208px

  // Workbench state
  const [activeView, setActiveView] = useState<ActivityView>('explorer');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(false);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: 'files', label: 'Archivos', type: 'files' },
  ]);
  const [activeTab, setActiveTab] = useState('files');
  const [indexedFiles, setIndexedFiles] = useState(0);

  // Open a document in a new tab (replaces modal)
  const handleFileOpen = (filePath: string) => {
    if (isSupported(filePath)) {
      const tabId = 'doc:' + filePath;
      const fileName = filePath.split('\\').pop() ?? filePath.split('/').pop() ?? filePath;
      if (!openTabs.find(t => t.id === tabId)) {
        setOpenTabs(prev => [...prev, { id: tabId, label: fileName, type: 'document', path: filePath }]);
      }
      setActiveTab(tabId);
    }
  };

  const closeTab = (tabId: string) => {
    if (tabId === 'files') return;
    setOpenTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTab === tabId) setActiveTab('files');
  };

  // Track index stats for status bar
  useEffect(() => {
    const updateStats = () => {
      const stats = searchService.getStats();
      setIndexedFiles(stats.totalFiles);
    };
    updateStats();
    const id = setInterval(updateStats, 3000);
    return () => clearInterval(id);
  }, []);

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
          case 'k':
            e.preventDefault();
            setCommandPaletteOpen(prev => !prev);
            break;
          case 'o':
            e.preventDefault();
            handleOpenFolder();
            break;
          case 'f':
            e.preventDefault();
            setActiveView('search');
            setTimeout(() => {
              const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
              searchInput?.focus();
            }, 50);
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

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const pushRecentPath = useCallback((path: string) => {
    setRecentPaths(prev => {
      const filtered = prev.filter(p => p !== path);
      return [path, ...filtered].slice(0, 10);
    });
  }, []);

  const handleAddFavorite = useCallback((path: string) => {
    setFavorites(prev => {
      if (prev.includes(path)) return prev;
      const next = [...prev, path];
      fileService.saveConfig({ favorites: next });
      return next;
    });
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getAppConfig();
      if (config.lastLeftPath) {
        setLeftPath(config.lastLeftPath);
        setLastExplorerPath(config.lastLeftPath);
      }
      if (config.lastRightPath) setRightPath(config.lastRightPath);
      if (config.favorites) setFavorites(config.favorites);
      if (config.quickAccess) {
        setQuickAccess(config.quickAccess);
      } else {
        try {
          type SysPaths = { home: string; downloads: string; documents: string; desktop: string };
          const api = window.electronAPI as typeof window.electronAPI & { getSystemPaths?: () => Promise<SysPaths> };
          if (api.getSystemPaths) {
            const sysPaths = await api.getSystemPaths();
            setQuickAccess([
              { icon: '💻', path: 'C:\\', label: 'Este equipo' },
              { icon: '📥', path: sysPaths.downloads, label: 'Descargas' },
              { icon: '📁', path: sysPaths.documents, label: 'Documentos' },
              { icon: '🖥️', path: sysPaths.desktop, label: 'Escritorio' },
            ]);
          }
        } catch {
          // Keep fallback
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  // Auto-index the active panel's path (debounced, 800ms)
  const indexTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoIndex = useCallback((dirPath: string) => {
    if (indexTimerRef.current) clearTimeout(indexTimerRef.current);
    indexTimerRef.current = setTimeout(async () => {
      try {
        await searchService.indexDirectory(dirPath);
      } catch {
        // Non-critical
      }
    }, 800);
  }, []);

  useEffect(() => {
    const activePath = activePanel === 'left' ? leftPath : rightPath;
    if (activePath) autoIndex(activePath);
  }, [leftPath, rightPath, activePanel, autoIndex]);

  const savePath = async (side: 'left' | 'right', path: string) => {
    try {
      await setAppConfig(side === 'left' ? 'lastLeftPath' : 'lastRightPath', path);
    } catch (error) {
      console.error('Error saving path:', error);
    }
  };

  const handleLeftPathChange = (path: string) => {
    setLeftPath(path);
    setLastExplorerPath(path);
    savePath('left', path);
    pushRecentPath(path);
  };

  const handleRightPathChange = (path: string) => {
    setRightPath(path);
    setLastExplorerPath(path);
    savePath('right', path);
    pushRecentPath(path);
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

  /** Carpeta para el grafo: última visitada, o la más “profunda” entre paneles */
  const vaultPath = useMemo(() => {
    const isRoot = (p: string) => /^[A-Za-z]:\\?$/.test(p.replace(/\\+$/, ''));
    const candidates = [lastExplorerPath, leftPath, rightPath].filter(
      (p, i, arr) => p && arr.indexOf(p) === i,
    );
    const project = candidates.find((p) => !isRoot(p) && p.length > 4);
    return project ?? candidates[0] ?? leftPath;
  }, [lastExplorerPath, leftPath, rightPath]);

  const commands = useMemo<Command[]>(() => [
    {
      id: 'open-folder', label: 'Abrir carpeta…', icon: <FolderOpen size={16} />,
      group: 'Explorador', shortcut: 'Ctrl+O',
      action: handleOpenFolder,
    },
    {
      id: 'view-explorer', label: 'Mostrar explorador', icon: <FolderOpen size={16} />,
      group: 'Vistas', shortcut: 'E',
      action: () => setActiveView('explorer'),
    },
    {
      id: 'view-search', label: 'Mostrar búsqueda', icon: <Search size={16} />,
      group: 'Vistas', shortcut: 'Ctrl+F',
      action: () => setActiveView('search'),
    },
    {
      id: 'view-analysis', label: 'Mostrar análisis', icon: <BarChart2 size={16} />,
      group: 'Vistas',
      action: () => setActiveView('analysis'),
    },
    {
      id: 'analyze-procedure', label: 'Analizar procedimiento…', icon: <BarChart2 size={16} />,
      group: 'Análisis',
      action: () => {
        setAnalyzerFilePath(undefined);
        setShowAnalyzerPanel(true);
      },
    },
    {
      id: 'view-graph', label: 'Abrir grafo de conocimiento', icon: <GitBranch size={16} />,
      group: 'Vistas',
      action: () => {
        setActiveView('graph');
        setSidebarOpen(true);
      },
    },
    {
      id: 'toggle-terminal', label: terminalVisible ? 'Cerrar terminal' : 'Abrir terminal',
      icon: <TerminalIcon size={16} />, group: 'Panel', shortcut: '`',
      action: handleToggleTerminal,
    },
    {
      id: 'toggle-ai', label: aiVisible ? 'Cerrar asistente IA' : 'Abrir asistente IA',
      icon: <Bot size={16} />, group: 'Panel',
      action: handleToggleAI,
    },
    {
      id: 'toggle-secondary', label: secondarySidebarOpen ? 'Cerrar panel análisis' : 'Abrir panel análisis',
      icon: <BarChart2 size={16} />, group: 'Panel',
      action: () => setSecondarySidebarOpen(p => !p),
    },
    {
      id: 'reindex', label: 'Reindexar carpeta activa',
      icon: <RefreshCw size={16} />, group: 'Índice',
      action: () => searchService.indexDirectory(currentPath),
    },
    {
      id: 'open-flowchart', label: 'Abrir generador de flujograma',
      icon: <GitBranch size={16} />, group: 'Herramientas',
      action: () => setShowFlowchartPanel(true),
    },
    {
      id: 'open-export', label: 'Exportar paquete ZIP',
      icon: <FolderOpen size={16} />, group: 'Herramientas',
      action: () => setShowExportPanel(true),
    },
    {
      id: 'open-scaffolder', label: 'Crear proyecto desde plantilla',
      icon: <FolderOpen size={16} />, group: 'Herramientas',
      action: () => setShowScaffolder(true),
    },
  ], [terminalVisible, aiVisible, secondarySidebarOpen, currentPath]);

  const clipboardPasteHandler = async (path: string) => {
    if (!clipboard || clipboard.paths.length === 0) return;
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
  };

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#111111] text-[#505050]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center animate-pulse">
            <span className="text-white text-xl font-bold">N</span>
          </div>
          <p className="text-sm">Iniciando NetVault…</p>
        </div>
      </div>
    );
  }

  // ── Auth gate — show login screen until session is established ──
  if (!session) {
    return (
      <AuthGate onAuthenticated={(s) => setSession(s)} />
    );
  }

  // Primary sidebar content based on active view
  const renderPrimarySidebar = () => {
    if (activeView === 'explorer') {
      return (
        <Sidebar
          quickAccess={quickAccess}
          favorites={favorites}
          recentPaths={recentPaths}
          onNavigate={handleSidebarNavigate}
          onToggle={() => setSidebarOpen(false)}
          isOpen={true}
          clipboard={clipboard}
          onCopy={(p) => setClipboard({ action: 'copy', paths: [p] })}
          onCut={(p) => setClipboard({ action: 'cut', paths: [p] })}
          onPaste={clipboardPasteHandler}
          onRemoveFavorite={(p) => {
            const n = favorites.filter(f => f !== p);
            setFavorites(n);
            fileService.saveConfig({ favorites: n });
          }}
          onRemoveFromQuickAccess={(p) => {
            const n = quickAccess.filter(item => item.path !== p);
            setQuickAccess(n);
            fileService.saveConfig({ quickAccess: n });
          }}
        />
      );
    }

    const panelHeader = (title: string) => (
      <div className="h-8 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] shrink-0">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">{title}</span>
        <button onClick={() => setSidebarOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors duration-150">
          <ChevronLeft size={13} />
        </button>
      </div>
    );

    if (activeView === 'search') {
      return (
        <div className="w-full flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]">
          {panelHeader('Búsqueda')}
          <div className="p-2 overflow-hidden">
            <SearchBar
              currentPath={currentPath}
              placeholder="Buscar archivos…"
              onResultSelect={(result) => handleNavigateToPath(result.entry.path)}
            />
          </div>
        </div>
      );
    }

    if (activeView === 'analysis') {
      return (
        <div className="w-full flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]">
          {panelHeader('Análisis')}
          <div className="p-3 flex flex-col gap-3">
            <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">Analiza procedimientos con la rúbrica NetVault.</p>
            <button
              type="button"
              onClick={() => { setAnalyzerFilePath(undefined); setShowAnalyzerPanel(true); }}
              className="w-full py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white text-xs rounded font-medium transition-colors duration-150"
            >
              Abrir analizador
            </button>
          </div>
        </div>
      );
    }

    if (activeView === 'sig') {
      return <SigManagerPanel />;
    }

    if (activeView === 'graph') {
      return (
        <div className="w-full flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]">
          {panelHeader('Grafo')}
          <div className="p-3 flex flex-col gap-3">
            <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">Vault .md (Obsidian) y LightRAG (intranet).</p>
            <p className="text-[11px] text-[var(--text-muted)] break-all font-mono" title={vaultPath}>{vaultPath.split(/[\\/]/).pop()}</p>
            <button
              type="button"
              onClick={() => setShowGraphPanel(true)}
              className="w-full py-1.5 bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs rounded font-medium border border-[var(--border-subtle)] transition-colors duration-150"
            >
              Abrir en ventana
            </button>
            {lastAnalysisPackage && (
              <p className="text-[11px] text-[var(--success)]">Análisis: {lastAnalysisPackage.procedureCode}</p>
            )}
          </div>
        </div>
      );
    }

    if (activeView === 'sync') {
      return (
        <div className="w-full flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]">
          {panelHeader('Sincronización')}
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-[12px] text-[var(--text-muted)] text-center">Próximamente</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden ring-1 ring-inset ring-[var(--border-subtle)]">
      <TitleBar />
      {/* ── Workspace ── */}
      <div className="flex flex-1 min-h-0">

        {/* Activity Bar */}
        <ActivityBar activeView={activeView} onViewChange={(v) => {
          if (v === activeView && sidebarOpen) {
            setSidebarOpen(false);
          } else {
            setActiveView(v);
            setSidebarOpen(true);
          }
        }} />

        {/* Primary Sidebar — resizable */}
        {sidebarOpen && (
          <div className="relative flex shrink-0" style={{ width: sidebarWidth }}>
            <div className="flex-1 min-w-0 overflow-hidden">
              {renderPrimarySidebar()}
            </div>
            {/* Drag handle on right edge */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 z-20 cursor-col-resize
                         hover:bg-[var(--accent)] transition-colors duration-150"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = sidebarWidth;
                const onMove = (ev: MouseEvent) => {
                  const next = Math.max(160, Math.min(480, startW + ev.clientX - startX));
                  setSidebarWidth(next);
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          </div>
        )}

        {/* Central area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-surface)]">

          {/* Tab bar */}
          <div className="h-8 flex items-center bg-[var(--bg-base)] border-b border-[var(--border-subtle)] overflow-x-auto shrink-0">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="h-full px-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-150 shrink-0"
                title="Mostrar sidebar"
              >
                <ChevronLeft size={13} className="rotate-180" />
              </button>
            )}
            {openTabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-3 h-full text-[12px] cursor-pointer select-none shrink-0
                  border-r border-[var(--border-subtle)] transition-colors duration-150
                  ${activeTab === tab.id
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-t-2 border-t-[var(--accent)] mt-px'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  }
                `}
              >
                <span>{tab.label}</span>
                {tab.id !== 'files' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] rounded w-3.5 h-3.5 flex items-center justify-center transition-colors duration-150"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-0.5 px-2">
              <button
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
                className="h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-150"
              >
                {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              <button
                onClick={() => setShowRightPanel(p => !p)}
                title={showRightPanel ? 'Cerrar segundo panel' : 'Abrir segundo panel'}
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors duration-150 ${showRightPanel ? 'text-[var(--accent)] bg-[var(--accent-dim)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              >
                <Columns2 size={13} />
              </button>
              <button
                onClick={handleToggleAI}
                title="Asistente IA"
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors duration-150 ${aiVisible ? 'text-[var(--accent)] bg-[var(--accent-dim)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              >
                <Bot size={13} />
              </button>
              <button
                onClick={handleToggleTerminal}
                title="Terminal (`)"
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors duration-150 ${terminalVisible ? 'text-[var(--success)] bg-[var(--success)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              >
                <TerminalIcon size={13} />
              </button>
              <button
                onClick={() => setSecondarySidebarOpen(p => !p)}
                title="Panel análisis"
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors duration-150 ${secondarySidebarOpen ? 'text-[var(--warning)] bg-[var(--warning)]/10' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              >
                <BarChart2 size={13} />
              </button>
              {session && (
                <>
                  <button
                    onClick={() => { setConversionArea(session.user.area ?? ''); setShowQueue(p => !p); }}
                    title="Cola de conversión PDF → MD"
                    className="h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-150"
                  >
                    <FileUp size={13} />
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    title={`Sesión: ${session.user.email} — Cerrar sesión`}
                    className="h-6 px-2 flex items-center gap-1.5 rounded text-[var(--success)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors duration-150 text-[11px]"
                  >
                    <Wifi size={13} />
                    <span className="max-w-[72px] truncate hidden sm:inline">{session.user.full_name?.split(' ')[0] ?? session.user.email}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0 min-h-0">

              {/* Tab content */}
              {activeView === 'graph' && (
                <div className="flex flex-1 min-h-0 p-2">
                  <GraphPanel
                    embedded
                    workspacePath={vaultPath}
                    lastAnalysis={lastAnalysisPackage}
                    onOpenFile={handleFileOpen}
                  />
                </div>
              )}

              {activeView !== 'graph' && activeTab === 'files' && (
                <div className="flex flex-1 min-h-0">
                  <FilePanel
                    id="left"
                    path={leftPath}
                    onPathChange={handleLeftPathChange}
                    isActive={activePanel === 'left'}
                    onActivate={() => setActivePanel('left')}
                    clipboard={clipboard}
                    onClipboardChange={setClipboard}
                    onFileOpen={handleFileOpen}
                    onAddFavorite={handleAddFavorite}
                  />
                  {aiVisible && (
                    <AIChat
                      projectPath={currentPath}
                      onClose={() => setAiVisible(false)}
                      onOpenScaffolder={() => setShowScaffolder(true)}
                    />
                  )}
                  {showRightPanel && !aiVisible && (
                    <>
                      <div className="w-px bg-[#2a2a2a] shrink-0" />
                      <FilePanel
                        id="right"
                        path={rightPath}
                        onPathChange={handleRightPathChange}
                        isActive={activePanel === 'right'}
                        onActivate={() => setActivePanel('right')}
                        clipboard={clipboard}
                        onClipboardChange={setClipboard}
                        onFileOpen={handleFileOpen}
                        onAddFavorite={handleAddFavorite}
                      />
                    </>
                  )}
                </div>
              )}

              {activeTab.startsWith('doc:') && (() => {
                const docPath = openTabs.find(t => t.id === activeTab)?.path;
                return docPath ? (
                  <DocumentViewer
                    filePath={docPath}
                    onClose={() => closeTab(activeTab)}
                  />
                ) : null;
              })()}

              {/* Terminal panel — resizable */}
              {terminalVisible && (
                <div
                  className="shrink-0 border-t border-[#2a2a2a] flex flex-col relative"
                  style={{ height: terminalHeight }}
                >
                  {/* Drag handle */}
                  <div
                    className="h-1 w-full cursor-row-resize shrink-0 hover:bg-[#3b82f6]/40 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startY = e.clientY;
                      const startH = terminalHeight;
                      const onMove = (mv: MouseEvent) => {
                        const delta = startY - mv.clientY;
                        setTerminalHeight(Math.max(120, Math.min(600, startH + delta)));
                      };
                      const onUp = () => {
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);
                      };
                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                    }}
                  />
                  <div className="flex-1 min-h-0">
                    <Terminal
                      initialCwd={currentPath}
                      onClose={() => setTerminalVisible(false)}
                      onCwdChange={handleTerminalCwdChange}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Secondary sidebar */}
            {secondarySidebarOpen && (
              <SecondarySidebar onClose={() => setSecondarySidebarOpen(false)} />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        version="1.0.0"
        currentPath={currentPath}
        indexedFiles={indexedFiles}
        onCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* ── Overlays ── */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />

      {showScaffolder && (
        <Scaffolder
          destinationPath={currentPath}
          onClose={() => setShowScaffolder(false)}
          onProjectCreated={(path) => {
            if (activePanel === 'left') handleLeftPathChange(path);
            else handleRightPathChange(path);
          }}
        />
      )}

      {showGraphPanel && (
        <GraphPanel
          onClose={() => setShowGraphPanel(false)}
          workspacePath={vaultPath}
          lastAnalysis={lastAnalysisPackage}
          onOpenFile={handleFileOpen}
        />
      )}
      {showFlowchartPanel && <FlowchartPanel onClose={() => setShowFlowchartPanel(false)} />}
      {showAnalyzerPanel && (
        <AnalyzerPanel
          onClose={() => setShowAnalyzerPanel(false)}
          filePath={analyzerFilePath}
          defaultOutputRoot={currentPath}
          alreadyLoggedIn={session !== null}
          onAnalysisComplete={(pkg) => setLastAnalysisPackage(pkg)}
          onOpenGraph={(pkg) => {
            setLastAnalysisPackage(pkg);
            setShowAnalyzerPanel(false);
            setShowGraphPanel(true);
          }}
        />
      )}
      {showExportPanel && <ExportPanel data={createSampleExportData()} onClose={() => setShowExportPanel(false)} />}

      {/* ── Cola conversión PDF→MD ── */}
      {showQueue && session && (
        <ConversionQueue
          area={conversionArea}
          onClose={() => setShowQueue(false)}
          onFinish={(count) => {
            setShowQueue(false);
            if (count > 0) {
              (window.electronAPI as typeof window.electronAPI & { showMessage?: (o: object) => Promise<number> })
                .showMessage?.({ type: 'info', title: 'Conversión completada', message: `${count} archivo(s) convertidos y enviados a la intranet.` });
            }
          }}
        />
      )}

      {/* ── Logout confirmation ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-2xl w-80 p-6 flex flex-col gap-5">
            <div>
              <p className="text-[var(--text-primary)] font-semibold text-sm mb-1">Cerrar sesión</p>
              <p className="text-[var(--text-muted)] text-xs">¿Seguro que deseas cerrar la sesión de la intranet?</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-1.5 text-xs rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-150"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logoutFromIntranet();
                  setSession(null);
                }}
                className="px-4 py-1.5 text-xs rounded bg-[var(--danger)] hover:bg-[var(--danger)]/80 text-white font-medium transition-colors duration-150"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;