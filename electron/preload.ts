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
  openFile: (path: string) => ipcRenderer.invoke('fs:open', path),
  fileExists: (path: string) => ipcRenderer.invoke('fs:exists', path),
  renameFile: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:rename', oldPath, newName),
  showInFolder: (path: string) => ipcRenderer.invoke('fs:showInFolder', path),
  getClipboard: () => ipcRenderer.invoke('fs:getClipboard'),
  setClipboard: (text: string) => ipcRenderer.invoke('fs:setClipboard', text),

  // Diálogos nativos
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  openFileDialog: (filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:openFile', filters),
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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Tipos para TypeScript
export type ElectronAPI = typeof electronAPI;