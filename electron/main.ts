import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

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
    backgroundColor: '#1a1a1a',
    show: false,
  });

  // Cargar la app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
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
ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      path: path.join(dirPath, entry.name),
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));
  } catch (error: any) {
    throw new Error(`No se pudo leer el directorio: ${error.message}`);
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

ipcMain.handle('fs:copy', async (_, src: string, dst: string) => {
  await fs.promises.copyFile(src, dst);
});

ipcMain.handle('fs:move', async (_, src: string, dst: string) => {
  await fs.promises.rename(src, dst);
});

ipcMain.handle('fs:delete', async (_, filePath: string, permanent: boolean) => {
  if (permanent) {
    await fs.promises.unlink(filePath);
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