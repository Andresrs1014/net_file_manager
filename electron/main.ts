import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

Menu.setApplicationMenu(null);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#07090f',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: false,
    thickFrame: false,
  });

  // En desarrollo (npm run electron:dev) cargar Vite; en build empaquetado, dist/
  const isDev = !app.isPackaged;
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false));
}

// IPC Handlers - Sistema de archivos
ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return Promise.all(entries.map(async entry => {
      const fullPath = path.join(dirPath, entry.name);
      let size = 0;
      let modified: Date | null = null;
      try {
        const stat = await fs.promises.stat(fullPath);
        size = stat.size;
        modified = stat.mtime;
      } catch {
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
  } catch (error: any) {
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

async function vaultCollectMarkdown(
  dirPath: string,
  depth: number,
  out: string[],
): Promise<void> {
  if (depth > VAULT_MAX_DEPTH || out.length >= VAULT_MAX_MD) return;
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= VAULT_MAX_MD) break;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (VAULT_SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      await vaultCollectMarkdown(fullPath, depth + 1, out);
    } else if (/\.md$/i.test(entry.name)) {
      out.push(fullPath);
    }
  }
}

ipcMain.handle('graph:scanMarkdown', async (_, rootPath: string) => {
  try {
    const root = path.resolve(rootPath);
    const stat = await fs.promises.stat(root);
    if (!stat.isDirectory()) {
      return { success: false, root, files: [] as string[], count: 0, error: 'La ruta no es una carpeta' };
    }
    const files: string[] = [];
    await vaultCollectMarkdown(root, 0, files);
    return { success: true, root, files, count: files.length };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al escanear';
    return { success: false, root: rootPath, files: [] as string[], count: 0, error: message };
  }
});

ipcMain.handle('fs:stats', async (_, filePath: string) => {
  const stats = await fs.promises.stat(filePath);
  return {
    size: stats.size,
    modified: stats.mtime,
    created: stats.birthtime,
    isDirectory: stats.isDirectory(),
  };
});

async function copyRecursive(src: string, dst: string): Promise<void> {
  const stat = await fs.promises.stat(src);
  if (stat.isDirectory()) {
    await fs.promises.mkdir(dst, { recursive: true });
    const entries = await fs.promises.readdir(src);
    await Promise.all(entries.map(e => copyRecursive(path.join(src, e), path.join(dst, e))));
  } else {
    await fs.promises.copyFile(src, dst);
  }
}

ipcMain.handle('fs:copy', async (_, src: string, dst: string) => {
  await copyRecursive(src, dst);
});

ipcMain.handle('fs:move', async (_, src: string, dst: string) => {
  await fs.promises.rename(src, dst);
});

ipcMain.handle('fs:delete', async (_, filePath: string, permanent: boolean) => {
  if (permanent) {
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      await fs.promises.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.promises.unlink(filePath);
    }
  } else {
    await shell.trashItem(filePath);
  }
});

ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
});

ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
  await fs.promises.writeFile(filePath, content, 'utf-8');
});

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  return await fs.promises.readFile(filePath);
});

ipcMain.handle('fs:open', async (_, filePath: string) => {
  await shell.openPath(filePath);
});

ipcMain.handle('fs:exists', async (_, filePath: string) => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:rename', async (_, oldPath: string, newName: string) => {
  const dir = path.dirname(oldPath);
  const newPath = path.join(dir, newName);
  await fs.promises.rename(oldPath, newPath);
  return newPath;
});

ipcMain.handle('fs:showInFolder', async (_, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('fs:showProperties', async (_, filePath: string) => {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    exec(`powershell.exe -Command "Show-ItemProperty -Path '${filePath.replace(/'/g, "''")}'"`, { cwd: path.dirname(filePath) }, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        exec(`explorer.exe /select,"${filePath}"`, (err: Error | null) => {
          resolve({ success: !err, output: err?.message || '' });
        });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
});

ipcMain.handle('fs:getClipboard', () => {
  const clipboard = require('electron').clipboard;
  return clipboard.read('copy') || '';
});

ipcMain.handle('fs:setClipboard', (_, text: string) => {
  const clipboard = require('electron').clipboard;
  clipboard.writeText(text);
});

// IPC Handlers - Diálogos
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:openFile', async (_, filters?: { name: string; extensions: string[] }[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: filters || [
      { name: 'Documentos', extensions: ['pdf', 'docx', 'doc', 'md'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:openFiles', async (_, filters?: { name: string; extensions: string[] }[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: filters || [
      { name: 'Documentos', extensions: ['pdf', 'docx', 'doc', 'md', 'txt'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (_, defaultPath?: string, filters?: { name: string; extensions: string[] }[]) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath,
    filters: filters || [
      { name: 'Archivos ZIP', extensions: ['zip'] },
    ],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('dialog:message', async (_, options: { type?: string; title?: string; message: string; detail?: string; buttons?: string[] }) => {
  const result = await dialog.showMessageBox(mainWindow!, {
    type: options.type as any || 'info',
    title: options.title || 'NetVault',
    message: options.message,
    detail: options.detail,
    buttons: options.buttons || ['Aceptar'],
  });
  return result.response;
});

// IPC Handlers - System paths
ipcMain.handle('system:getPaths', () => {
  return {
    home: app.getPath('home'),
    downloads: app.getPath('downloads'),
    documents: app.getPath('documents'),
    desktop: app.getPath('desktop'),
  };
});

ipcMain.handle('system:getAppRoot', () => {
  return app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), '..')
    : path.join(__dirname, '..');
});

// IPC Handlers - Config
ipcMain.handle('config:getPath', () => {
  return app.getPath('userData');
});

ipcMain.handle('config:read', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    const data = await fs.promises.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
});

ipcMain.handle('config:write', async (_, config: object) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
});

// ─── Terminal ────────────────────────────────────────────────────────────────

/** Remove ANSI escape codes and control characters from terminal output */
function stripAnsi(str: string): string {
  return str
    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')   // CSI sequences (colors, cursor)
    .replace(/\x1B\][^\x07]*\x07/g, '')        // OSC sequences (title)
    .replace(/\x1B[()][0-9A-Za-z]/g, '')       // charset sequences
    .replace(/\x1B[@-_]/g, '')                  // Fe sequences
    .replace(/\r\n/g, '\n')                     // normalize CRLF
    .replace(/\r(?!\n)/g, '\n');               // lone CR
}

ipcMain.handle('terminal:execute', (event, cmd: string, cwd: string) => {
  const { spawn } = require('child_process');

  return new Promise<string>((resolve) => {
    const proc = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', cmd],
      {
        cwd,
        windowsHide: true,
        env: { ...process.env, TERM: 'dumb', NO_COLOR: '1' },
      }
    );

    let fullOutput = '';

    const sendChunk = (text: string, isErr: boolean) => {
      const clean = stripAnsi(text);
      if (!clean) return;
      fullOutput += clean;
      // Stream chunk to renderer while command is still running
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal:stream', { type: isErr ? 'stderr' : 'stdout', text: clean });
      }
    };

    proc.stdout.on('data', (chunk: Buffer) => sendChunk(chunk.toString('utf8'), false));
    proc.stderr.on('data', (chunk: Buffer) => sendChunk(chunk.toString('utf8'), true));

    proc.on('error', (err: Error) => {
      sendChunk(`Error al ejecutar: ${err.message}\n`, true);
      resolve(fullOutput || err.message);
    });

    proc.on('close', (code: number | null) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('terminal:stream', { type: 'done', code });
      }
      resolve(fullOutput);
    });
  });
});

// IPC Handler - Detect installed code editors
ipcMain.handle('editors:detect', async () => {
  const { exec } = require('child_process');
  const editors: { name: string; path: string; icon: string }[] = [];

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
      const pathResult = await new Promise<string>((resolve) => {
        exec(`where ${editor.cmd}`, (error: Error | null, stdout: string) => {
          resolve(error ? '' : stdout.trim().split('\n')[0]);
        });
      });

      if (pathResult) {
        editors.push({ name: editor.name, path: pathResult, icon: editor.icon });
        continue;
      }

      // Search in common installation directories
      for (const searchPath of searchPaths) {
        if (!searchPath) continue;

        const patterns = [
          `**/${editor.cmd}*.exe`,
          `**/${editor.cmd}/**/*.exe`,
        ];

        // Use PowerShell to search for the executable
        const searchResult: string = await new Promise((resolve) => {
          exec(
            `powershell.exe -Command "Get-ChildItem -Path '${searchPath}' -Recurse -Filter '${editor.cmd}*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName"`,
            (error: Error | null, stdout: string) => {
              resolve(error ? '' : stdout.trim());
            }
          );
        });

        if (searchResult && searchResult.length > 0 && searchResult.length < 260) {
          editors.push({ name: editor.name, path: searchResult, icon: editor.icon });
          break;
        }
      }
    } catch {
      // Continue to next editor
    }
  }

  return editors;
});

// IPC Handler - Open file with specific editor
ipcMain.handle('editors:openWith', async (_, editorPath: string, filePath: string) => {
  const { exec } = require('child_process');
  const { spawn } = require('child_process');

  return new Promise((resolve) => {
    try {
      // Use start command to properly handle paths with spaces
      exec(`start "" "${editorPath}" "${filePath}"`, { shell: 'cmd.exe' }, (error: Error | null) => {
        resolve({ success: !error, error: error?.message });
      });
    } catch (error: any) {
      resolve({ success: false, error: error.message });
    }
  });
});

// ─── Main-process file indexer ───────────────────────────────────────────────

interface IndexEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  extension: string;
}

let indexEntries: IndexEntry[] = [];
let indexing = false;
const INDEX_CACHE_FILE = 'index-cache.json';

async function scanDir(dirPath: string, depth: number, results: IndexEntry[]): Promise<void> {
  if (depth <= 0) return;
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(entries.map(async entry => {
    const fullPath = path.join(dirPath, entry.name);
    const isDir = entry.isDirectory();
    let size = 0;
    let modified = Date.now();
    try {
      const stat = await fs.promises.stat(fullPath);
      size = stat.size;
      modified = stat.mtimeMs;
    } catch {
      // ignore permission errors
    }
    const ext = isDir ? '' : (entry.name.includes('.') ? '.' + entry.name.split('.').pop()!.toLowerCase() : '');
    results.push({ name: entry.name, path: fullPath, isDirectory: isDir, size, modified, extension: ext });
    if (isDir) await scanDir(fullPath, depth - 1, results);
  }));
}

// ─── LightRAG graph proxy (evita CORS desde renderer) ────────────────────────
ipcMain.handle('graph:lightrag', async (
  _,
  intranetUrl: string,
  token: string,
  opts: { maxNodes?: number; maxEdges?: number; q?: string } = {},
) => {
  try {
    const base   = intranetUrl.replace(/\/$/, '');
    const params = new URLSearchParams({
      max_nodes: String(opts.maxNodes ?? 200),
      max_edges: String(opts.maxEdges ?? 600),
      ...(opts.q ? { q: opts.q } : {}),
    });
    const url  = `${base}/api/grafo/lightrag?${params}`;
    const http = url.startsWith('https') ? require('https') : require('http');

    const body: string = await new Promise((resolve, reject) => {
      const req = http.get(
        url,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          timeout: 15000,
        },
        (res: import('http').IncomingMessage) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf-8');
            if ((res.statusCode ?? 0) >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
            } else {
              resolve(text);
            }
          });
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout conectando a la intranet')); });
    });

    const json = JSON.parse(body);
    return { success: true, data: json };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg, data: { nodes: [], edges: [], meta: {} } };
  }
});

ipcMain.handle('index:scan', async (_, rootPath: string, maxDepth: number = 5) => {
  if (indexing) return { success: false, count: indexEntries.length, entries: [] };
  indexing = true;
  const start = Date.now();
  try {
    const results: IndexEntry[] = [];
    await scanDir(rootPath, maxDepth, results);
    indexEntries = results;
    const elapsed = Date.now() - start;

    const cachePath = path.join(app.getPath('userData'), INDEX_CACHE_FILE);
    await fs.promises.writeFile(cachePath, JSON.stringify({ rootPath, ts: Date.now(), entries: results }), 'utf-8');

    return { success: true, count: results.length, elapsed, entries: results };
  } catch (error: any) {
    return { success: false, count: 0, error: error.message, entries: [] };
  } finally {
    indexing = false;
  }
});

ipcMain.handle('index:stats', () => ({
  totalFiles: indexEntries.filter(e => !e.isDirectory).length,
  totalDirs: indexEntries.filter(e => e.isDirectory).length,
  isIndexing: indexing,
}));

ipcMain.handle('index:loadCache', async () => {
  try {
    const cachePath = path.join(app.getPath('userData'), INDEX_CACHE_FILE);
    const raw = await fs.promises.readFile(cachePath, 'utf-8');
    const { entries } = JSON.parse(raw) as { rootPath: string; entries: IndexEntry[] };
    indexEntries = entries;
    return { success: true, count: entries.length, entries };
  } catch {
    return { success: false, count: 0, entries: [] };
  }
});

// ─── NetVault Server API client ───────────────────────────────────────────────
// El token JWT y la URL del servidor se guardan SOLO en el proceso principal.
// El renderer nunca toca la key de Claude ni maneja el token directamente.

interface ServerSession {
  token: string;
  username: string;
  role: string;
}

let serverSession: ServerSession | null = null;
let serverUrl = 'http://localhost:3847';

ipcMain.handle('server:getUrl', () => serverUrl);
ipcMain.handle('server:setUrl', (_event, url: string) => { serverUrl = url; });

ipcMain.handle('server:login', async (_event, username: string, password: string) => {
  try {
    const https = require('https');
    const http = require('http');
    const url = new URL('/auth/login', serverUrl);
    const body = JSON.stringify({ username, password });
    const transport = url.protocol === 'https:' ? https : http;

    const data = await new Promise<string>((resolve, reject) => {
      const req = transport.request(
        { hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res: any) => {
          let raw = '';
          res.on('data', (c: Buffer) => { raw += c.toString(); });
          res.on('end', () => resolve(raw));
        },
      );
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
  } catch (err: any) {
    return { ok: false, error: `No se pudo conectar al servidor: ${err.message}` };
  }
});

ipcMain.handle('server:logout', () => { serverSession = null; return { ok: true }; });

ipcMain.handle('server:session', () => {
  if (!serverSession) return { ok: false, error: 'Sin sesión activa' };
  return { ok: true, data: { username: serverSession.username, role: serverSession.role } };
});

ipcMain.handle('server:health', async () => {
  try {
    const https = require('https');
    const http = require('http');
    const url = new URL('/health', serverUrl);
    const transport = url.protocol === 'https:' ? https : http;

    const data = await new Promise<string>((resolve, reject) => {
      const req = transport.request(
        { hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET', timeout: 3000 },
        (res: any) => {
          let raw = '';
          res.on('data', (c: Buffer) => { raw += c.toString(); });
          res.on('end', () => resolve(raw));
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.end();
    });

    const json = JSON.parse(data);
    return { ok: true, reachable: true, ...json.data };
  } catch {
    return { ok: false, reachable: false, error: 'Servidor no disponible' };
  }
});

ipcMain.handle('server:runAnalysis', async (_event, payload: {
  procedureCode: string;
  area: string;
  textContent: string;
  existingFlowchartMmd?: string;
}) => {
  if (!serverSession) return { ok: false, error: 'No autenticado. Inicia sesión primero.' };

  try {
    const https = require('https');
    const http = require('http');
    const url = new URL('/analysis/run', serverUrl);
    const body = JSON.stringify(payload);
    const transport = url.protocol === 'https:' ? https : http;

    const data = await new Promise<string>((resolve, reject) => {
      const req = transport.request(
        {
          hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'Authorization': `Bearer ${serverSession!.token}`,
          },
          timeout: 120000,
        },
        (res: any) => {
          let raw = '';
          res.on('data', (c: Buffer) => { raw += c.toString(); });
          res.on('end', () => resolve(raw));
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout del análisis')); });
      req.write(body);
      req.end();
    });

    return JSON.parse(data);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('server:getRubric', async () => {
  try {
    const https = require('https');
    const http = require('http');
    const url = new URL('/analysis/rubric', serverUrl);
    const transport = url.protocol === 'https:' ? https : http;
    const data = await new Promise<string>((resolve, reject) => {
      const req = transport.request(
        { hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET', timeout: 5000 },
        (res: any) => {
          let raw = '';
          res.on('data', (c: Buffer) => { raw += c.toString(); });
          res.on('end', () => resolve(raw));
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.end();
    });
    return JSON.parse(data);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

function findRubricDir(): string {
  const candidates = [
    path.join(process.cwd(), 'resources', 'rubrica'),
    path.join(__dirname, '..', 'resources', 'rubrica'),
    path.join(__dirname, '..', '..', 'resources', 'rubrica'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'rubrica-agent.json'))) return dir;
  }
  return candidates[0];
}

ipcMain.handle('analysis:getLocalRubric', async () => {
  try {
    const dir = findRubricDir();
    const json = JSON.parse(await fs.promises.readFile(path.join(dir, 'rubrica-agent.json'), 'utf-8'));
    const md = await fs.promises.readFile(path.join(dir, 'RUBRICA_PROCEDIMIENTOS.md'), 'utf-8');
    return { ok: true, data: { json, markdown: md } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('analysis:savePackage', async (
  _event,
  payload: {
    outputRoot: string;
    area: string;
    procedureCode: string;
    files: Record<string, string>;
    originalPath?: string;
  },
) => {
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

ipcMain.handle('dialog:openFolderForSave', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Carpeta raíz netvault (contiene T&C, P&C, Transportes)',
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

// ─── Auth ZYMO Intranet ───────────────────────────────────────────────────────
// El token JWT nunca toca el renderer. Se guarda en userData y sale solo por IPC.

interface ZymoAuthData {
  token:        string;
  user:         Record<string, unknown>;
  intranetUrl:  string;
  savedAt:      number;
}

// Session not persisted to disk when rememberMe=false
let inMemoryAuth: ZymoAuthData | null = null;

function authFilePath(): string {
  return path.join(app.getPath('userData'), 'zymo-auth.json');
}

function readAuth(): ZymoAuthData | null {
  try {
    return JSON.parse(fs.readFileSync(authFilePath(), 'utf-8')) as ZymoAuthData;
  } catch { return inMemoryAuth; }
}

function writeAuth(data: ZymoAuthData): void {
  fs.writeFileSync(authFilePath(), JSON.stringify(data, null, 2), 'utf-8');
}

function clearAuth(): void {
  inMemoryAuth = null;
  try { fs.unlinkSync(authFilePath()); } catch { /* ignore */ }
}

ipcMain.handle('auth:login', async (_, intranetUrl: string, email: string, password: string, rememberMe: boolean = true) => {
  try {
    const base = intranetUrl.replace(/\/$/, '');
    const params = new URLSearchParams({ username: email, password });
    const tokenRes = await fetch(`${base}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!tokenRes.ok) {
      let detail = 'Credenciales incorrectas';
      try { detail = ((await tokenRes.json()) as { detail?: string }).detail ?? detail; } catch { /* ignore */ }
      return { ok: false, error: detail };
    }
    const { access_token } = await tokenRes.json() as { access_token: string };

    // Obtener perfil del usuario
    const meRes = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const user = meRes.ok ? (await meRes.json() as Record<string, unknown>) : {};

    const authData: ZymoAuthData = { token: access_token, user, intranetUrl: base, savedAt: Date.now() };
    if (rememberMe) {
      writeAuth(authData);
      inMemoryAuth = null;
    } else {
      inMemoryAuth = authData;
      // Clear any previously persisted session
      try { fs.unlinkSync(authFilePath()); } catch { /* ignore */ }
    }
    return { ok: true, user };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de red' };
  }
});

ipcMain.handle('auth:logout', () => {
  clearAuth();
  return { ok: true };
});

ipcMain.handle('auth:getSession', () => {
  const d = readAuth();
  if (!d) return { loggedIn: false, token: '', user: {}, intranetUrl: '' };
  return { loggedIn: true, token: d.token, user: d.user, intranetUrl: d.intranetUrl };
});

ipcMain.handle('auth:ping', async () => {
  const d = readAuth();
  if (!d?.token) return { ok: false, loggedIn: false };
  try {
    const res = await fetch(`${d.intranetUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${d.token}` },
    });
    if (!res.ok) { clearAuth(); return { ok: false, loggedIn: false, error: 'Sesión expirada' }; }
    const user = await res.json() as Record<string, unknown>;
    return { ok: true, loggedIn: true, user: user ?? d.user };
  } catch (e: unknown) {
    return { ok: false, loggedIn: false, error: e instanceof Error ? e.message : 'Sin conexión' };
  }
});

// ─── Intranet fetch proxy (evita CORS, añade Bearer automáticamente) ──────────
ipcMain.handle('netvault:fetch', async (
  _,
  endpoint: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {},
) => {
  const d = readAuth();
  if (!d?.token) return { ok: false, status: 401, data: null, error: 'Sin sesión activa' };
  try {
    const res = await fetch(`${d.intranetUrl}${endpoint}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${d.token}`,
        ...(options.headers ?? {}),
      },
      body: options.body ?? undefined,
    });
    let data: unknown;
    try { data = await res.json(); } catch { data = null; }
    return { ok: res.ok, status: res.status, data };
  } catch (e: unknown) {
    return { ok: false, status: 0, data: null, error: e instanceof Error ? e.message : 'Error de red' };
  }
});

// ─── Cola de conversión PDF/DOCX → MD via intranet (SSE progress) ─────────────
ipcMain.handle('queue:convertFiles', async (event, filePaths: string[], area: string) => {
  const d = readAuth();
  if (!d?.token) return { ok: false, error: 'Sin sesión activa' };

  // Construir multipart manualmente con boundary
  const boundary = `----NetVaultBoundary${Date.now()}`;
  const chunks: Buffer[] = [];

  const enc = (s: string) => Buffer.from(s, 'utf-8');
  const CRLF = '\r\n';

  // campo area
  chunks.push(enc(`--${boundary}${CRLF}`));
  chunks.push(enc(`Content-Disposition: form-data; name="area"${CRLF}${CRLF}`));
  chunks.push(enc(`${area}${CRLF}`));

  // archivos
  for (const fp of filePaths) {
    const name = path.basename(fp);
    let content: Buffer;
    try { content = fs.readFileSync(fp); } catch { continue; }
    chunks.push(enc(`--${boundary}${CRLF}`));
    chunks.push(enc(`Content-Disposition: form-data; name="archivos"; filename="${name}"${CRLF}`));
    chunks.push(enc(`Content-Type: application/octet-stream${CRLF}${CRLF}`));
    chunks.push(content);
    chunks.push(enc(CRLF));
  }
  chunks.push(enc(`--${boundary}--${CRLF}`));

  const body = Buffer.concat(chunks);
  const url  = `${d.intranetUrl}/api/netvault/documentos/convertir`;
  const http = url.startsWith('https') ? require('https') : require('http');
  const urlObj = new URL(url);

  return new Promise<{ ok: boolean; resultados?: unknown[]; error?: string }>((resolve) => {
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port:     urlObj.port || (url.startsWith('https') ? 443 : 80),
        path:     urlObj.pathname,
        method:   'POST',
        headers: {
          'Content-Type':   `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
          Authorization:    `Bearer ${d.token}`,
        },
      },
      (res: import('http').IncomingMessage) => {
        let buf = '';
        res.on('data', (chunk: Buffer) => {
          buf += chunk.toString('utf-8');
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            try {
              const parsed = JSON.parse(trimmed.slice(6)) as Record<string, unknown>;
              event.sender.send('queue:progress', parsed);
              if (parsed['done']) resolve({ ok: true, resultados: parsed['resultados'] as unknown[] });
            } catch { /* continuar */ }
          }
        });
        res.on('end', () => resolve({ ok: true }));
        res.on('error', (e: Error) => resolve({ ok: false, error: e.message }));
      },
    );
    req.on('error', (e: Error) => resolve({ ok: false, error: e.message }));
    req.write(body);
    req.end();
  });
});

// ─── Window controls ─────────────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// ─────────────────────────────────────────────────────────────────────────────

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});