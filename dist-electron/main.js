"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        backgroundColor: '#1a1a1a',
        show: false,
    });
    // Cargar la app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// IPC Handlers - Sistema de archivos
electron_1.ipcMain.handle('fs:readDir', async (_, dirPath) => {
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        return entries.map(entry => ({
            name: entry.name,
            path: path.join(dirPath, entry.name),
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
        }));
    }
    catch (error) {
        throw new Error(`No se pudo leer el directorio: ${error.message}`);
    }
});
electron_1.ipcMain.handle('fs:stats', async (_, filePath) => {
    const stats = await fs.promises.stat(filePath);
    return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        isDirectory: stats.isDirectory(),
    };
});
electron_1.ipcMain.handle('fs:copy', async (_, src, dst) => {
    await fs.promises.copyFile(src, dst);
});
electron_1.ipcMain.handle('fs:move', async (_, src, dst) => {
    await fs.promises.rename(src, dst);
});
electron_1.ipcMain.handle('fs:delete', async (_, filePath, permanent) => {
    if (permanent) {
        await fs.promises.unlink(filePath);
    }
    else {
        await electron_1.shell.trashItem(filePath);
    }
});
electron_1.ipcMain.handle('fs:mkdir', async (_, dirPath) => {
    await fs.promises.mkdir(dirPath, { recursive: true });
});
electron_1.ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
    await fs.promises.writeFile(filePath, content, 'utf-8');
});
electron_1.ipcMain.handle('fs:readFile', async (_, filePath) => {
    return await fs.promises.readFile(filePath);
});
electron_1.ipcMain.handle('fs:open', async (_, filePath) => {
    await electron_1.shell.openPath(filePath);
});
electron_1.ipcMain.handle('fs:exists', async (_, filePath) => {
    try {
        await fs.promises.access(filePath);
        return true;
    }
    catch {
        return false;
    }
});
electron_1.ipcMain.handle('fs:rename', async (_, oldPath, newName) => {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    await fs.promises.rename(oldPath, newPath);
    return newPath;
});
electron_1.ipcMain.handle('fs:showInFolder', async (_, filePath) => {
    electron_1.shell.showItemInFolder(filePath);
});
electron_1.ipcMain.handle('fs:showProperties', async (_, filePath) => {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
        exec(`powershell.exe -Command "Show-ItemProperty -Path '${filePath.replace(/'/g, "''")}'"`, { cwd: path.dirname(filePath) }, (error, stdout, stderr) => {
            if (error) {
                exec(`explorer.exe /select,"${filePath}"`, (err) => {
                    resolve({ success: !err, output: err?.message || '' });
                });
            }
            else {
                resolve({ success: true, output: stdout });
            }
        });
    });
});
electron_1.ipcMain.handle('fs:getClipboard', () => {
    const clipboard = require('electron').clipboard;
    return clipboard.read('copy') || '';
});
electron_1.ipcMain.handle('fs:setClipboard', (_, text) => {
    const clipboard = require('electron').clipboard;
    clipboard.writeText(text);
});
// IPC Handlers - Diálogos
electron_1.ipcMain.handle('dialog:openFolder', async () => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
});
electron_1.ipcMain.handle('dialog:openFile', async (_, filters) => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: filters || [
            { name: 'Documentos', extensions: ['pdf', 'docx', 'doc', 'md'] },
            { name: 'Todos los archivos', extensions: ['*'] },
        ],
    });
    return result.canceled ? null : result.filePaths[0];
});
electron_1.ipcMain.handle('dialog:saveFile', async (_, defaultPath, filters) => {
    const result = await electron_1.dialog.showSaveDialog(mainWindow, {
        defaultPath,
        filters: filters || [
            { name: 'Archivos ZIP', extensions: ['zip'] },
        ],
    });
    return result.canceled ? null : result.filePath;
});
electron_1.ipcMain.handle('dialog:message', async (_, options) => {
    const result = await electron_1.dialog.showMessageBox(mainWindow, {
        type: options.type || 'info',
        title: options.title || 'NetVault',
        message: options.message,
        detail: options.detail,
        buttons: options.buttons || ['Aceptar'],
    });
    return result.response;
});
// IPC Handlers - Config
electron_1.ipcMain.handle('config:getPath', () => {
    return electron_1.app.getPath('userData');
});
electron_1.ipcMain.handle('config:read', async () => {
    const configPath = path.join(electron_1.app.getPath('userData'), 'config.json');
    try {
        const data = await fs.promises.readFile(configPath, 'utf-8');
        return JSON.parse(data);
    }
    catch {
        return {};
    }
});
electron_1.ipcMain.handle('config:write', async (_, config) => {
    const configPath = path.join(electron_1.app.getPath('userData'), 'config.json');
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
});
// IPC Handlers - Terminal
electron_1.ipcMain.handle('terminal:execute', async (_, cmd, cwd) => {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
        exec(cmd, { cwd }, (error, stdout, stderr) => {
            if (error) {
                resolve(stderr || error.message);
            }
            else {
                resolve(stdout);
            }
        });
    });
});
// Ollama chat handler (bypasses CORS since main process has no restrictions)
electron_1.ipcMain.handle('ollama:chat', async (_, model, messages) => {
    try {
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, stream: false }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const data = await response.json();
        return { success: true, content: data.message?.content || '' };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// IPC Handler - Detect installed code editors
electron_1.ipcMain.handle('editors:detect', async () => {
    const { exec } = require('child_process');
    const editors = [];
    const commonEditors = [
        { name: 'Visual Studio Code', cmd: 'code', icon: '💻' },
        { name: 'Notepad++', cmd: 'notepad++', icon: '📝' },
        { name: 'Sublime Text', cmd: 'sublime_text', icon: '🔥' },
        { name: 'Atom', cmd: 'atom', icon: '⚛️' },
        { name: 'Vim', cmd: 'vim', icon: '✌️' },
        { name: 'GNU Emacs', cmd: 'emacs', icon: '🦋' },
        { name: 'TextMate', cmd: 'mate', icon: '🍎' },
        { name: 'Espresso', cmd: 'espresso', icon: '☕' },
    ];
    const searchPaths = [
        process.env.LOCALAPPDATA || '',
        process.env.PROGRAMFILES || '',
        process.env['PROGRAMFILES(X86)'] || '',
        'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs',
    ];
    for (const editor of commonEditors) {
        try {
            // First try to find in PATH
            const pathResult = await new Promise((resolve) => {
                exec(`where ${editor.cmd}`, (error, stdout) => {
                    resolve(error ? '' : stdout.trim().split('\n')[0]);
                });
            });
            if (pathResult) {
                editors.push({ name: editor.name, path: pathResult, icon: editor.icon });
                continue;
            }
            // Search in common installation directories
            for (const searchPath of searchPaths) {
                if (!searchPath)
                    continue;
                const patterns = [
                    `**/${editor.cmd}*.exe`,
                    `**/${editor.cmd}/**/*.exe`,
                ];
                // Use PowerShell to search for the executable
                const searchResult = await new Promise((resolve) => {
                    exec(`powershell.exe -Command "Get-ChildItem -Path '${searchPath}' -Recurse -Filter '${editor.cmd}*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName"`, (error, stdout) => {
                        resolve(error ? '' : stdout.trim());
                    });
                });
                if (searchResult && searchResult.length > 0 && searchResult.length < 260) {
                    editors.push({ name: editor.name, path: searchResult, icon: editor.icon });
                    break;
                }
            }
        }
        catch {
            // Continue to next editor
        }
    }
    return editors;
});
// IPC Handler - Open file with specific editor
electron_1.ipcMain.handle('editors:openWith', async (_, editorPath, filePath) => {
    const { exec } = require('child_process');
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
        try {
            // Use start command to properly handle paths with spaces
            exec(`start "" "${editorPath}" "${filePath}"`, { shell: 'cmd.exe' }, (error) => {
                resolve({ success: !error, error: error?.message });
            });
        }
        catch (error) {
            resolve({ success: false, error: error.message });
        }
    });
});
// App lifecycle
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map