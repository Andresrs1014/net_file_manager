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
    // En desarrollo (npm run electron:dev) cargar Vite; en build empaquetado, dist/
    const isDev = !electron_1.app.isPackaged;
    if (isDev) {
        const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
        mainWindow.loadURL(devUrl);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
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
        return Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            let size = 0;
            let modified = null;
            try {
                const stat = await fs.promises.stat(fullPath);
                size = stat.size;
                modified = stat.mtime;
            }
            catch {
                // ignore (permission errors, broken symlinks)
            }
            return {
                name: entry.name,
                path: fullPath,
                isDirectory: entry.isDirectory(),
                isFile: entry.isFile(),
                size,
                modified,
            };
        }));
    }
    catch (error) {
        throw new Error(`No se pudo leer el directorio: ${error.message}`);
    }
});
// ─── Grafo vault: escaneo .md en main (evita cientos de IPC readDir) ─────────
const VAULT_SKIP_DIRS = new Set([
    'node_modules', 'dist', '.git', 'venv', '.obsidian', 'dist-electron',
    '__pycache__', '.cursor', 'build', 'coverage', '.venv',
]);
const VAULT_MAX_MD = 400;
const VAULT_MAX_DEPTH = 10;
async function vaultCollectMarkdown(dirPath, depth, out) {
    if (depth > VAULT_MAX_DEPTH || out.length >= VAULT_MAX_MD)
        return;
    let entries;
    try {
        entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const entry of entries) {
        if (out.length >= VAULT_MAX_MD)
            break;
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (VAULT_SKIP_DIRS.has(entry.name) || entry.name.startsWith('.'))
                continue;
            await vaultCollectMarkdown(fullPath, depth + 1, out);
        }
        else if (/\.md$/i.test(entry.name)) {
            out.push(fullPath);
        }
    }
}
electron_1.ipcMain.handle('graph:scanMarkdown', async (_, rootPath) => {
    try {
        const root = path.resolve(rootPath);
        const stat = await fs.promises.stat(root);
        if (!stat.isDirectory()) {
            return { success: false, root, files: [], count: 0, error: 'La ruta no es una carpeta' };
        }
        const files = [];
        await vaultCollectMarkdown(root, 0, files);
        return { success: true, root, files, count: files.length };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Error al escanear';
        return { success: false, root: rootPath, files: [], count: 0, error: message };
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
async function copyRecursive(src, dst) {
    const stat = await fs.promises.stat(src);
    if (stat.isDirectory()) {
        await fs.promises.mkdir(dst, { recursive: true });
        const entries = await fs.promises.readdir(src);
        await Promise.all(entries.map(e => copyRecursive(path.join(src, e), path.join(dst, e))));
    }
    else {
        await fs.promises.copyFile(src, dst);
    }
}
electron_1.ipcMain.handle('fs:copy', async (_, src, dst) => {
    await copyRecursive(src, dst);
});
electron_1.ipcMain.handle('fs:move', async (_, src, dst) => {
    await fs.promises.rename(src, dst);
});
electron_1.ipcMain.handle('fs:delete', async (_, filePath, permanent) => {
    if (permanent) {
        const stat = await fs.promises.stat(filePath);
        if (stat.isDirectory()) {
            await fs.promises.rm(filePath, { recursive: true, force: true });
        }
        else {
            await fs.promises.unlink(filePath);
        }
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
// IPC Handlers - System paths
electron_1.ipcMain.handle('system:getPaths', () => {
    return {
        home: electron_1.app.getPath('home'),
        downloads: electron_1.app.getPath('downloads'),
        documents: electron_1.app.getPath('documents'),
        desktop: electron_1.app.getPath('desktop'),
    };
});
electron_1.ipcMain.handle('system:getAppRoot', () => {
    return electron_1.app.isPackaged
        ? path.join(path.dirname(electron_1.app.getPath('exe')), '..')
        : path.join(__dirname, '..');
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
// ─── Terminal ────────────────────────────────────────────────────────────────
/** Remove ANSI escape codes and control characters from terminal output */
function stripAnsi(str) {
    return str
        .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') // CSI sequences (colors, cursor)
        .replace(/\x1B\][^\x07]*\x07/g, '') // OSC sequences (title)
        .replace(/\x1B[()][0-9A-Za-z]/g, '') // charset sequences
        .replace(/\x1B[@-_]/g, '') // Fe sequences
        .replace(/\r\n/g, '\n') // normalize CRLF
        .replace(/\r(?!\n)/g, '\n'); // lone CR
}
electron_1.ipcMain.handle('terminal:execute', (event, cmd, cwd) => {
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
        const proc = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', cmd], {
            cwd,
            windowsHide: true,
            env: { ...process.env, TERM: 'dumb', NO_COLOR: '1' },
        });
        let fullOutput = '';
        const sendChunk = (text, isErr) => {
            const clean = stripAnsi(text);
            if (!clean)
                return;
            fullOutput += clean;
            // Stream chunk to renderer while command is still running
            if (!event.sender.isDestroyed()) {
                event.sender.send('terminal:stream', { type: isErr ? 'stderr' : 'stdout', text: clean });
            }
        };
        proc.stdout.on('data', (chunk) => sendChunk(chunk.toString('utf8'), false));
        proc.stderr.on('data', (chunk) => sendChunk(chunk.toString('utf8'), true));
        proc.on('error', (err) => {
            sendChunk(`Error al ejecutar: ${err.message}\n`, true);
            resolve(fullOutput || err.message);
        });
        proc.on('close', (code) => {
            if (!event.sender.isDestroyed()) {
                event.sender.send('terminal:stream', { type: 'done', code });
            }
            resolve(fullOutput);
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
let indexEntries = [];
let indexing = false;
const INDEX_CACHE_FILE = 'index-cache.json';
async function scanDir(dirPath, depth, results) {
    if (depth <= 0)
        return;
    let entries;
    try {
        entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    }
    catch {
        return;
    }
    await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const isDir = entry.isDirectory();
        let size = 0;
        let modified = Date.now();
        try {
            const stat = await fs.promises.stat(fullPath);
            size = stat.size;
            modified = stat.mtimeMs;
        }
        catch {
            // ignore permission errors
        }
        const ext = isDir ? '' : (entry.name.includes('.') ? '.' + entry.name.split('.').pop().toLowerCase() : '');
        results.push({ name: entry.name, path: fullPath, isDirectory: isDir, size, modified, extension: ext });
        if (isDir)
            await scanDir(fullPath, depth - 1, results);
    }));
}
// ─── LightRAG graph proxy (evita CORS desde renderer) ────────────────────────
electron_1.ipcMain.handle('graph:lightrag', async (_, intranetUrl, token, opts = {}) => {
    try {
        const base = intranetUrl.replace(/\/$/, '');
        const params = new URLSearchParams({
            max_nodes: String(opts.maxNodes ?? 200),
            max_edges: String(opts.maxEdges ?? 600),
            ...(opts.q ? { q: opts.q } : {}),
        });
        const url = `${base}/api/grafo/lightrag?${params}`;
        const http = url.startsWith('https') ? require('https') : require('http');
        const body = await new Promise((resolve, reject) => {
            const req = http.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
                timeout: 15000,
            }, (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    const text = Buffer.concat(chunks).toString('utf-8');
                    if ((res.statusCode ?? 0) >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
                    }
                    else {
                        resolve(text);
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout conectando a la intranet')); });
        });
        const json = JSON.parse(body);
        return { success: true, data: json };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg, data: { nodes: [], edges: [], meta: {} } };
    }
});
electron_1.ipcMain.handle('index:scan', async (_, rootPath, maxDepth = 5) => {
    if (indexing)
        return { success: false, count: indexEntries.length, entries: [] };
    indexing = true;
    const start = Date.now();
    try {
        const results = [];
        await scanDir(rootPath, maxDepth, results);
        indexEntries = results;
        const elapsed = Date.now() - start;
        const cachePath = path.join(electron_1.app.getPath('userData'), INDEX_CACHE_FILE);
        await fs.promises.writeFile(cachePath, JSON.stringify({ rootPath, ts: Date.now(), entries: results }), 'utf-8');
        return { success: true, count: results.length, elapsed, entries: results };
    }
    catch (error) {
        return { success: false, count: 0, error: error.message, entries: [] };
    }
    finally {
        indexing = false;
    }
});
electron_1.ipcMain.handle('index:stats', () => ({
    totalFiles: indexEntries.filter(e => !e.isDirectory).length,
    totalDirs: indexEntries.filter(e => e.isDirectory).length,
    isIndexing: indexing,
}));
electron_1.ipcMain.handle('index:loadCache', async () => {
    try {
        const cachePath = path.join(electron_1.app.getPath('userData'), INDEX_CACHE_FILE);
        const raw = await fs.promises.readFile(cachePath, 'utf-8');
        const { entries } = JSON.parse(raw);
        indexEntries = entries;
        return { success: true, count: entries.length, entries };
    }
    catch {
        return { success: false, count: 0, entries: [] };
    }
});
let serverSession = null;
let serverUrl = 'http://localhost:3847';
electron_1.ipcMain.handle('server:getUrl', () => serverUrl);
electron_1.ipcMain.handle('server:setUrl', (_event, url) => { serverUrl = url; });
electron_1.ipcMain.handle('server:login', async (_event, username, password) => {
    try {
        const https = require('https');
        const http = require('http');
        const url = new URL('/auth/login', serverUrl);
        const body = JSON.stringify({ username, password });
        const transport = url.protocol === 'https:' ? https : http;
        const data = await new Promise((resolve, reject) => {
            const req = transport.request({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
                let raw = '';
                res.on('data', (c) => { raw += c.toString(); });
                res.on('end', () => resolve(raw));
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
        const json = JSON.parse(data);
        if (json.ok) {
            serverSession = { token: json.data.token, username: json.data.user.username, role: json.data.user.role };
            return { ok: true, data: { username: json.data.user.username, role: json.data.user.role, expiresIn: json.data.expiresIn } };
        }
        return { ok: false, error: json.error ?? 'Login fallido' };
    }
    catch (err) {
        return { ok: false, error: `No se pudo conectar al servidor: ${err.message}` };
    }
});
electron_1.ipcMain.handle('server:logout', () => { serverSession = null; return { ok: true }; });
electron_1.ipcMain.handle('server:session', () => {
    if (!serverSession)
        return { ok: false, error: 'Sin sesión activa' };
    return { ok: true, data: { username: serverSession.username, role: serverSession.role } };
});
electron_1.ipcMain.handle('server:health', async () => {
    try {
        const https = require('https');
        const http = require('http');
        const url = new URL('/health', serverUrl);
        const transport = url.protocol === 'https:' ? https : http;
        const data = await new Promise((resolve, reject) => {
            const req = transport.request({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET', timeout: 3000 }, (res) => {
                let raw = '';
                res.on('data', (c) => { raw += c.toString(); });
                res.on('end', () => resolve(raw));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.end();
        });
        const json = JSON.parse(data);
        return { ok: true, reachable: true, ...json.data };
    }
    catch {
        return { ok: false, reachable: false, error: 'Servidor no disponible' };
    }
});
electron_1.ipcMain.handle('server:runAnalysis', async (_event, payload) => {
    if (!serverSession)
        return { ok: false, error: 'No autenticado. Inicia sesión primero.' };
    try {
        const https = require('https');
        const http = require('http');
        const url = new URL('/analysis/run', serverUrl);
        const body = JSON.stringify(payload);
        const transport = url.protocol === 'https:' ? https : http;
        const data = await new Promise((resolve, reject) => {
            const req = transport.request({
                hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'Authorization': `Bearer ${serverSession.token}`,
                },
                timeout: 120000,
            }, (res) => {
                let raw = '';
                res.on('data', (c) => { raw += c.toString(); });
                res.on('end', () => resolve(raw));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout del análisis')); });
            req.write(body);
            req.end();
        });
        return JSON.parse(data);
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
});
electron_1.ipcMain.handle('server:getRubric', async () => {
    try {
        const https = require('https');
        const http = require('http');
        const url = new URL('/analysis/rubric', serverUrl);
        const transport = url.protocol === 'https:' ? https : http;
        const data = await new Promise((resolve, reject) => {
            const req = transport.request({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET', timeout: 5000 }, (res) => {
                let raw = '';
                res.on('data', (c) => { raw += c.toString(); });
                res.on('end', () => resolve(raw));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
            req.end();
        });
        return JSON.parse(data);
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
});
function findRubricDir() {
    const candidates = [
        path.join(process.cwd(), 'resources', 'rubrica'),
        path.join(__dirname, '..', 'resources', 'rubrica'),
        path.join(__dirname, '..', '..', 'resources', 'rubrica'),
    ];
    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, 'rubrica-agent.json')))
            return dir;
    }
    return candidates[0];
}
electron_1.ipcMain.handle('analysis:getLocalRubric', async () => {
    try {
        const dir = findRubricDir();
        const json = JSON.parse(await fs.promises.readFile(path.join(dir, 'rubrica-agent.json'), 'utf-8'));
        const md = await fs.promises.readFile(path.join(dir, 'RUBRICA_PROCEDIMIENTOS.md'), 'utf-8');
        return { ok: true, data: { json, markdown: md } };
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
});
electron_1.ipcMain.handle('analysis:savePackage', async (_event, payload) => {
    const { outputRoot, area, procedureCode, files, originalPath } = payload;
    const folder = path.join(outputRoot, area, procedureCode);
    await fs.promises.mkdir(folder, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
        await fs.promises.writeFile(path.join(folder, name), content, 'utf-8');
    }
    if (originalPath && fs.existsSync(originalPath)) {
        const ext = path.extname(originalPath) || '.bin';
        await fs.promises.copyFile(originalPath, path.join(folder, `original${ext}`));
    }
    return { ok: true, folder };
});
electron_1.ipcMain.handle('dialog:openFolderForSave', async () => {
    const result = await electron_1.dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Carpeta raíz netvault (contiene T&C, P&C, Transportes)',
    });
    if (result.canceled || !result.filePaths[0])
        return null;
    return result.filePaths[0];
});
// ─────────────────────────────────────────────────────────────────────────────
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