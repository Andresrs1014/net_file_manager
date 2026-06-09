"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// API expuesta al renderer (React)
const electronAPI = {
    // Sistema de archivos
    readDirectory: (path) => electron_1.ipcRenderer.invoke('fs:readDir', path),
    getFileStats: (path) => electron_1.ipcRenderer.invoke('fs:stats', path),
    copyFile: (src, dst) => electron_1.ipcRenderer.invoke('fs:copy', src, dst),
    moveFile: (src, dst) => electron_1.ipcRenderer.invoke('fs:move', src, dst),
    deleteFile: (path, permanent) => electron_1.ipcRenderer.invoke('fs:delete', path, permanent),
    createFolder: (path) => electron_1.ipcRenderer.invoke('fs:mkdir', path),
    createFile: (path, content) => electron_1.ipcRenderer.invoke('fs:writeFile', path, content),
    readFile: (path) => electron_1.ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path, content) => electron_1.ipcRenderer.invoke('fs:writeFile', path, content),
    openFile: (path) => electron_1.ipcRenderer.invoke('fs:open', path),
    fileExists: (path) => electron_1.ipcRenderer.invoke('fs:exists', path),
    renameFile: (oldPath, newName) => electron_1.ipcRenderer.invoke('fs:rename', oldPath, newName),
    showInFolder: (path) => electron_1.ipcRenderer.invoke('fs:showInFolder', path),
    showItemProperties: (path) => electron_1.ipcRenderer.invoke('fs:showProperties', path),
    getClipboard: () => electron_1.ipcRenderer.invoke('fs:getClipboard'),
    setClipboard: (text) => electron_1.ipcRenderer.invoke('fs:setClipboard', text),
    // Diálogos nativos
    openFolderDialog: () => electron_1.ipcRenderer.invoke('dialog:openFolder'),
    openFileDialog: (filters) => electron_1.ipcRenderer.invoke('dialog:openFile', filters),
    openFilesDialog: (filters) => electron_1.ipcRenderer.invoke('dialog:openFiles', filters),
    saveFileDialog: (defaultPath, filters) => electron_1.ipcRenderer.invoke('dialog:saveFile', defaultPath, filters),
    showMessage: (options) => electron_1.ipcRenderer.invoke('dialog:message', options),
    // Configuración
    getConfigPath: () => electron_1.ipcRenderer.invoke('config:getPath'),
    readConfig: () => electron_1.ipcRenderer.invoke('config:read'),
    writeConfig: (config) => electron_1.ipcRenderer.invoke('config:write', config),
    // Terminal
    executeCommand: (cmd, cwd) => electron_1.ipcRenderer.invoke('terminal:execute', cmd, cwd),
    onTerminalStream: (cb) => {
        const handler = (_, data) => cb(data);
        electron_1.ipcRenderer.on('terminal:stream', handler);
        return () => electron_1.ipcRenderer.removeListener('terminal:stream', handler);
    },
    // AI - Ollama chat (bypasses CORS via main process)
    chatWithOllama: (model, messages) => electron_1.ipcRenderer.invoke('ollama:chat', model, messages),
    // Code editors detection
    detectEditors: () => electron_1.ipcRenderer.invoke('editors:detect'),
    openWithEditor: (editorPath, filePath) => electron_1.ipcRenderer.invoke('editors:openWith', editorPath, filePath),
    // System paths
    getSystemPaths: () => electron_1.ipcRenderer.invoke('system:getPaths'),
    getAppRoot: () => electron_1.ipcRenderer.invoke('system:getAppRoot'),
    // Main-process indexer (faster: single IPC instead of N readDir calls)
    scanIndex: (rootPath, maxDepth) => electron_1.ipcRenderer.invoke('index:scan', rootPath, maxDepth ?? 5),
    getIndexStats: () => electron_1.ipcRenderer.invoke('index:stats'),
    loadIndexCache: () => electron_1.ipcRenderer.invoke('index:loadCache'),
    // Grafo vault — listado .md en un solo IPC
    scanVaultMarkdown: (rootPath) => electron_1.ipcRenderer.invoke('graph:scanMarkdown', rootPath),
    // Grafo LightRAG — proxy HTTP para evitar CORS
    loadLightRagGraph: (intranetUrl, token, opts) => electron_1.ipcRenderer.invoke('graph:lightrag', intranetUrl, token, opts ?? {}),
    // ─── NetVault Server API (modo standalone / offline) ─────────────────────
    serverGetUrl: () => electron_1.ipcRenderer.invoke('server:getUrl'),
    serverSetUrl: (url) => electron_1.ipcRenderer.invoke('server:setUrl', url),
    serverHealth: () => electron_1.ipcRenderer.invoke('server:health'),
    serverLogin: (username, password) => electron_1.ipcRenderer.invoke('server:login', username, password),
    serverLogout: () => electron_1.ipcRenderer.invoke('server:logout'),
    serverSession: () => electron_1.ipcRenderer.invoke('server:session'),
    serverRunAnalysis: (payload) => electron_1.ipcRenderer.invoke('server:runAnalysis', payload),
    serverGetRubric: () => electron_1.ipcRenderer.invoke('server:getRubric'),
    // Análisis — formato único en disco
    analysisGetLocalRubric: () => electron_1.ipcRenderer.invoke('analysis:getLocalRubric'),
    analysisSavePackage: (payload) => electron_1.ipcRenderer.invoke('analysis:savePackage', payload),
    openFolderForSave: () => electron_1.ipcRenderer.invoke('dialog:openFolderForSave'),
    // ─── Auth ZYMO Intranet ────────────────────────────────────────────────────
    // El JWT NUNCA toca el renderer directamente; sólo el main process lo guarda/usa.
    auth: {
        login: (intranetUrl, email, password) => electron_1.ipcRenderer.invoke('auth:login', intranetUrl, email, password),
        logout: () => electron_1.ipcRenderer.invoke('auth:logout'),
        getSession: () => electron_1.ipcRenderer.invoke('auth:getSession'),
        ping: () => electron_1.ipcRenderer.invoke('auth:ping'),
    },
    // Proxy fetch a la intranet (añade Bearer y base URL automáticamente)
    netvaultFetch: (endpoint, options) => electron_1.ipcRenderer.invoke('netvault:fetch', endpoint, options ?? {}),
    // Cola de conversión PDF/DOCX → MD
    queueConvertFiles: (filePaths, area) => electron_1.ipcRenderer.invoke('queue:convertFiles', filePaths, area),
    // Escuchar progreso de la cola (SSE relay desde main)
    onQueueProgress: (cb) => {
        const handler = (_, data) => cb(data);
        electron_1.ipcRenderer.on('queue:progress', handler);
        return () => electron_1.ipcRenderer.removeListener('queue:progress', handler);
    },
    // ─── Window controls ──────────────────────────────────────────────────────
    windowMinimize: () => electron_1.ipcRenderer.send('window:minimize'),
    windowMaximize: () => electron_1.ipcRenderer.send('window:maximize'),
    windowClose: () => electron_1.ipcRenderer.send('window:close'),
    windowIsMaximized: () => electron_1.ipcRenderer.invoke('window:isMaximized'),
    onWindowMaximized: (cb) => {
        electron_1.ipcRenderer.on('window:maximized', (_, val) => cb(val));
    },
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map