import { contextBridge, ipcRenderer } from 'electron';

// API expuesta al renderer (React)
const electronAPI = {
  // Sistema de archivos
  readDirectory: (path: string) => ipcRenderer.invoke('fs:readDir', path),
  getFileStats: (path: string) => ipcRenderer.invoke('fs:stats', path),
  copyFile: (src: string, dst: string) => ipcRenderer.invoke('fs:copy', src, dst),
  moveFile: (src: string, dst: string) => ipcRenderer.invoke('fs:move', src, dst),
  deleteFile: (path: string, permanent: boolean) => ipcRenderer.invoke('fs:delete', path, permanent),
  createFolder: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
  createFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  openFile: (path: string) => ipcRenderer.invoke('fs:open', path),
  fileExists: (path: string) => ipcRenderer.invoke('fs:exists', path),
  renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:rename', oldPath, newName),
  showInFolder: (path: string) => ipcRenderer.invoke('fs:showInFolder', path),
  showItemProperties: (path: string) => ipcRenderer.invoke('fs:showProperties', path),
  getClipboard: () => ipcRenderer.invoke('fs:getClipboard'),
  setClipboard: (text: string) => ipcRenderer.invoke('fs:setClipboard', text),

  // Diálogos nativos
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  openFileDialog: (filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:openFile', filters),
  openFilesDialog: (filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:openFiles', filters),
  saveFileDialog: (defaultPath?: string, filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:saveFile', defaultPath, filters),
  showMessage: (options: { type?: string; title?: string; message: string; detail?: string; buttons?: string[] }) =>
    ipcRenderer.invoke('dialog:message', options),

  // Configuración
  getConfigPath: () => ipcRenderer.invoke('config:getPath'),
  readConfig: () => ipcRenderer.invoke('config:read'),
  writeConfig: (config: object) => ipcRenderer.invoke('config:write', config),

  // Terminal
  executeCommand: (cmd: string, cwd: string) => ipcRenderer.invoke('terminal:execute', cmd, cwd),
  onTerminalStream: (cb: (data: { type: string; text?: string; code?: number }) => void) => {
    const handler = (_: unknown, data: { type: string; text?: string; code?: number }) => cb(data);
    ipcRenderer.on('terminal:stream', handler);
    return () => ipcRenderer.removeListener('terminal:stream', handler);
  },

  // AI - Ollama chat (bypasses CORS via main process)
  chatWithOllama: (model: string, messages: any[]) => ipcRenderer.invoke('ollama:chat', model, messages),

  // Code editors detection
  detectEditors: () => ipcRenderer.invoke('editors:detect'),
  openWithEditor: (editorPath: string, filePath: string) => ipcRenderer.invoke('editors:openWith', editorPath, filePath),

  // System paths
  getSystemPaths: () => ipcRenderer.invoke('system:getPaths'),
  getAppRoot: () => ipcRenderer.invoke('system:getAppRoot'),

  // Main-process indexer (faster: single IPC instead of N readDir calls)
  scanIndex: (rootPath: string, maxDepth?: number) => ipcRenderer.invoke('index:scan', rootPath, maxDepth ?? 5),
  getIndexStats: () => ipcRenderer.invoke('index:stats'),
  loadIndexCache: () => ipcRenderer.invoke('index:loadCache'),

  // Grafo vault — listado .md en un solo IPC
  scanVaultMarkdown: (rootPath: string) => ipcRenderer.invoke('graph:scanMarkdown', rootPath),

  // Grafo LightRAG — proxy HTTP para evitar CORS
  loadLightRagGraph: (
    intranetUrl: string,
    token: string,
    opts?: { maxNodes?: number; maxEdges?: number; q?: string },
  ) => ipcRenderer.invoke('graph:lightrag', intranetUrl, token, opts ?? {}),

  // ─── NetVault Server API (modo standalone / offline) ─────────────────────
  serverGetUrl: () => ipcRenderer.invoke('server:getUrl'),
  serverSetUrl: (url: string) => ipcRenderer.invoke('server:setUrl', url),
  serverHealth: () => ipcRenderer.invoke('server:health'),
  serverLogin: (username: string, password: string) => ipcRenderer.invoke('server:login', username, password),
  serverLogout: () => ipcRenderer.invoke('server:logout'),
  serverSession: () => ipcRenderer.invoke('server:session'),
  serverRunAnalysis: (payload: {
    procedureCode: string;
    area: string;
    textContent: string;
    existingFlowchartMmd?: string;
  }) => ipcRenderer.invoke('server:runAnalysis', payload),
  serverGetRubric: () => ipcRenderer.invoke('server:getRubric'),

  // Análisis — formato único en disco
  analysisGetLocalRubric: () => ipcRenderer.invoke('analysis:getLocalRubric'),
  analysisSavePackage: (payload: {
    outputRoot: string;
    area: string;
    procedureCode: string;
    files: Record<string, string>;
    originalPath?: string;
  }) => ipcRenderer.invoke('analysis:savePackage', payload),
  openFolderForSave: () => ipcRenderer.invoke('dialog:openFolderForSave'),

  // ─── Auth ZYMO Intranet ────────────────────────────────────────────────────
  // El JWT NUNCA toca el renderer directamente; sólo el main process lo guarda/usa.
  auth: {
    login:      (intranetUrl: string, email: string, password: string) =>
      ipcRenderer.invoke('auth:login', intranetUrl, email, password),
    logout:     () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
    ping:       () => ipcRenderer.invoke('auth:ping'),
  },

  // Proxy fetch a la intranet (añade Bearer y base URL automáticamente)
  netvaultFetch: (
    endpoint: string,
    options?: { method?: string; body?: string; headers?: Record<string, string> },
  ) => ipcRenderer.invoke('netvault:fetch', endpoint, options ?? {}),

  // Cola de conversión PDF/DOCX → MD
  queueConvertFiles: (filePaths: string[], area: string) =>
    ipcRenderer.invoke('queue:convertFiles', filePaths, area),

  // Escuchar progreso de la cola (SSE relay desde main)
  onQueueProgress: (cb: (data: Record<string, unknown>) => void) => {
    const handler = (_: unknown, data: Record<string, unknown>) => cb(data);
    ipcRenderer.on('queue:progress', handler);
    return () => ipcRenderer.removeListener('queue:progress', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Tipos para TypeScript
export type ElectronAPI = typeof electronAPI;