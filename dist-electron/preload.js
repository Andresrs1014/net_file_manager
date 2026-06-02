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
    openFile: (path) => electron_1.ipcRenderer.invoke('fs:open', path),
    fileExists: (path) => electron_1.ipcRenderer.invoke('fs:exists', path),
    // Diálogos nativos
    openFolderDialog: () => electron_1.ipcRenderer.invoke('dialog:openFolder'),
    openFileDialog: (filters) => electron_1.ipcRenderer.invoke('dialog:openFile', filters),
    saveFileDialog: (defaultPath, filters) => electron_1.ipcRenderer.invoke('dialog:saveFile', defaultPath, filters),
    showMessage: (options) => electron_1.ipcRenderer.invoke('dialog:message', options),
    // Configuración
    getConfigPath: () => electron_1.ipcRenderer.invoke('config:getPath'),
    readConfig: () => electron_1.ipcRenderer.invoke('config:read'),
    writeConfig: (config) => electron_1.ipcRenderer.invoke('config:write', config),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=preload.js.map