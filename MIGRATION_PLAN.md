# Plan de Migración: NetVault → App Híbrida Electron

**Versión:** 1.0  
**Fecha:** 2026-06-01  
**Estado:** Planificado  
**Stack objetivo:** Electron + React + TypeScript + Tailwind + Node.js (Backend)

---

## 1. Resumen Ejecutivo

### 1.1 Qué es NetVault

NetVault es un gestor de archivos de red desarrollado en Python con `tkinter`, diseñado para navegación de carpetas locales y de red. Ofrece:

- **Doble panel de navegación** para gestión eficiente de archivos
- **Búsqueda indexada** con SQLite y fuzzy search usando `rapidfuzz`
- **Terminal integrada** con sugerencias y comandos rápidos por categorías
- **Scaffolder IA** para generar estructuras de proyecto con templates
- **Chat contextual con IA local** via Ollama (Qwen2.5-Coder)
- **Temas claro/oscuro** con persistencia en config.json

### 1.2 Tecnologías actuales

| Capa | Tecnología |
|------|------------|
| UI | tkinter (Python) |
| Lógica | Python 3.14 |
| Datos | SQLite (caché local) |
| Búsqueda | rapidfuzz |
| Empaquetado | PyInstaller |
| IA | Ollama + Qwen2.5-Coder |
| Terminal | PowerShell embebido |

### 1.3 Por qué migrar

1. **tkinter es limitado**: UI anticuada, difícil de estilizar, sin soporte moderno de componentes
2. **Rendimiento**: Python tiene overhead en operaciones de archivo intensivas
3. **Ecosistema**: Node.js tiene más herramientas para UI moderna y tooling
4. **Distribución**: Electron ofrece mejor experiencia de escritorio multiplataforma
5. **Mantenibilidad**: Separación clara frontend/backend con React + TypeScript

### 1.4 Stack objetivo

| Capa | Tecnología |
|------|------------|
| Desktop Shell | Electron 29+ |
| Frontend | React 18 + TypeScript 5 |
| Estilos | Tailwind CSS 3 |
| Build | Vite |
| Backend (Node) | Express/NestJS |
| Base de datos | SQLite (mejorado) o IndexedDB |
| Búsqueda | Fuse.js (fuzzy) |
| IA | Ollama (mantener) |
| Empaquetado | electron-builder |

---

## 2. Arquitectura de la Nueva App

### 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │   IPC Main   │  │ File System │  │  Native Dialogs │    │
│  │   Handler    │  │    APIs     │  │    & Tray       │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC Bridge
┌──────────────────────────┴──────────────────────────────────┐
│                   ELECTRON RENDERER PROCESS                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   REACT APP                          │   │
│  │  ┌───────────┐ ┌───────────┐ ┌─────────────────┐   │   │
│  │  │  Toolbar  │ │ FilePanel │ │  TerminalPanel  │   │   │
│  │  │           │ │ (x2)      │ │                 │   │   │
│  │  └───────────┘ └───────────┘ └─────────────────┘   │   │
│  │  ┌───────────┐ ┌───────────┐ ┌─────────────────┐   │   │
│  │  │ SearchBar │ │ Favorites │ │    AI Chat      │   │   │
│  │  │           │ │  Sidebar  │ │   (Ollama)      │   │   │
│  │  └───────────┘ └───────────┘ └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  NODE.JS BACKEND                      │   │
│  │  ┌───────────┐ ┌───────────┐ ┌─────────────────┐   │   │
│  │  │   File    │ │  Search   │ │     AI          │   │   │
│  │  │  Service  │ │  Service  │ │   Service       │   │   │
│  │  └───────────┘ └───────────┘ └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Estructura de Carpetas

```
netvault/
├── electron/
│   ├── main.ts                 # Proceso principal Electron
│   ├── preload.ts               # Script de preload (IPC seguro)
│   └── ipc/
│       ├── fileHandlers.ts      # Handlers de sistema de archivos
│       ├── dialogHandlers.ts    # Diálogos nativos
│       └── windowHandlers.ts    # Control de ventanas
│
├── src/
│   ├── main.tsx                 # Entry point React
│   ├── App.tsx                  # Componente principal
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Toolbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   │
│   │   ├── file-panel/
│   │   │   ├── FilePanel.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── FileItem.tsx
│   │   │   └── PathNavigator.tsx
│   │   │
│   │   ├── terminal/
│   │   │   ├── Terminal.tsx
│   │   │   ├── TerminalInput.tsx
│   │   │   ├── TerminalOutput.tsx
│   │   │   └── CommandPalette.tsx
│   │   │
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   └── SearchResults.tsx
│   │   │
│   │   ├── ai/
│   │   │   ├── AIChat.tsx
│   │   │   ├── AIContext.tsx
│   │   │   └── Scaffolder.tsx
│   │   │
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── ContextMenu.tsx
│   │       └── Toast.tsx
│   │
│   ├── hooks/
│   │   ├── useFileSystem.ts
│   │   ├── useSearch.ts
│   │   ├── useTerminal.ts
│   │   ├── useAI.ts
│   │   └── useTheme.ts
│   │
│   ├── services/
│   │   ├── fileService.ts       # Operaciones de archivo via IPC
│   │   ├── searchService.ts     # Búsqueda indexada
│   │   ├── aiService.ts         # Comunicación con Ollama
│   │   ├── configService.ts     # Persistencia de configuración
│   │   └── terminalService.ts   # Ejecución de comandos
│   │
│   ├── stores/
│   │   ├── fileStore.ts         # Zustand: estado de archivos
│   │   ├── uiStore.ts           # Zustand: estado de UI
│   │   └── aiStore.ts           # Zustand: estado de chat IA
│   │
│   ├── types/
│   │   ├── file.types.ts
│   │   ├── ai.types.ts
│   │   └── config.types.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   └── styles/
│       ├── globals.css
│       └── themes/
│           ├── light.ts
│           └── dark.ts
│
├── server/                      # Backend Node (minimalista)
│   ├── index.ts                 # Entry point
│   ├── services/
│   │   └── ollamaService.ts      # Wrapper Ollama
│   └── routes/
│       └── ai.routes.ts
│
├── package.json
├── electron-builder.yml
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env.example
```

---

## 3. Plan de Implementación por Fases

### Fase 1: Proyecto Base Electron (Semana 1-2)

#### Objetivos
- Configurar proyecto Electron + React + Vite + TypeScript
- Establecer estructura base y tooling
- Implementar logging y manejo de errores
- Configurar electron-builder para distribución

#### Entregables

**3.1.1 Setup inicial**
```
# Crear proyecto con Vite
npm create vite@latest netvault -- --template react-ts
cd netvault

# Instalar dependencias core
npm install electron electron-builder concurrently wait-on

# Instalar dependencias de desarrollo
npm install -D @electron/rebuild @types/node

# Instalar Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**3.1.2 Archivos de configuración**

`package.json` actualizado:
```json
{
  "name": "netvault",
  "version": "1.0.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "electron:dev": "concurrently -k \"vite\" \"wait-on tcp:5173 && electron .\"",
    "electron:build": "vite build && electron-builder"
  },
  "build": {
    "appId": "com.netvault.app",
    "productName": "NetVault",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    }
  }
}
```

`electron/main.ts`:
```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

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
    backgroundColor: '#1a1a2e',
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
}

app.whenReady().then(createWindow);
```

**3.1.3 Preload script para IPC seguro**

`electron/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Sistema de archivos
  readDirectory: (path: string) => ipcRenderer.invoke('fs:readDir', path),
  getFileStats: (path: string) => ipcRenderer.invoke('fs:stats', path),
  copyFile: (src: string, dst: string) => ipcRenderer.invoke('fs:copy', src, dst),
  moveFile: (src: string, dst: string) => ipcRenderer.invoke('fs:move', src, dst),
  deleteFile: (path: string, permanent: boolean) => ipcRenderer.invoke('fs:delete', path, permanent),
  createFolder: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
  createFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  openFile: (path: string) => ipcRenderer.invoke('fs:open', path),
  
  // Diálogos nativos
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:open', options),
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),
  showMessageBox: (options: any) => ipcRenderer.invoke('dialog:message', options),
  
  // Terminal
  executeCommand: (cmd: string, cwd: string) => ipcRenderer.invoke('terminal:exec', cmd, cwd),
  
  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  
  // IA
  chatWithAI: (messages: any[]) => ipcRenderer.invoke('ai:chat', messages),
  checkAIAvailable: () => ipcRenderer.invoke('ai:check'),
});
```

**3.1.4 Handlers IPC base**

`electron/ipc/fileHandlers.ts`:
```typescript
import { ipcMain, shell } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export function registerFileHandlers() {
  ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
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
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
      created: stats.birthtime,
      isDirectory: stats.isDirectory(),
    };
  });

  ipcMain.handle('fs:open', async (_, filePath: string) => {
    await shell.openPath(filePath);
  });
  
  // ... más handlers
}
```

#### Criterios de aceptación
- [ ] App Electron corre sin errores
- [ ] Ventana se abre con dimensions correctas
- [ ] DevTools accesible en desarrollo
- [ ] Build genera .exe funcional

---

### Fase 2: UI Base y Navegación (Semana 3-4)

#### Objetivos
- Implementar layout principal (Toolbar + Sidebar + Dual Panels)
- Sistema de temas (claro/oscuro) con Tailwind
- Navegación básica de archivos
- Sidebar de favoritos

#### Componentes a implementar

**3.2.1 Layout principal**

`src/App.tsx`:
```tsx
import { useState } from 'react';
import { Toolbar } from './components/layout/Toolbar';
import { Sidebar } from './components/layout/Sidebar';
import { FilePanel } from './components/file-panel/FilePanel';
import { StatusBar } from './components/layout/StatusBar';
import { Terminal } from './components/terminal/Terminal';
import { ThemeProvider } from './hooks/useTheme';

export default function App() {
  const [leftPath, setLeftPath] = useState('C:\\');
  const [rightPath, setRightPath] = useState('C:\\');
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<'left' | 'right'>('left');

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-netvault-bg-primary">
        <Toolbar
          onTerminalToggle={() => setTerminalVisible(!terminalVisible)}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          
          <div className="flex flex-1">
            <FilePanel
              id="left"
              path={leftPath}
              onPathChange={setLeftPath}
              isActive={activePanel === 'left'}
              onActivate={() => setActivePanel('left')}
            />
            
            {terminalVisible ? (
              <Terminal
                initialCwd={leftPath}
                onClose={() => setTerminalVisible(false)}
              />
            ) : (
              <FilePanel
                id="right"
                path={rightPath}
                onPathChange={setRightPath}
                isActive={activePanel === 'right'}
                onActivate={() => setActivePanel('right')}
              />
            )}
          </div>
        </div>
        
        <StatusBar />
      </div>
    </ThemeProvider>
  );
}
```

**3.2.2 FilePanel**

`src/components/file-panel/FilePanel.tsx`:
```tsx
import { useEffect, useState, useCallback } from 'react';
import { FileItem } from './FileItem';
import { PathNavigator } from './PathNavigator';
import { fileService } from '../../services/fileService';
import type { FileEntry } from '../../types/file.types';

interface FilePanelProps {
  id: 'left' | 'right';
  path: string;
  onPathChange: (path: string) => void;
  isActive: boolean;
  onActivate: () => void;
}

export function FilePanel({ id, path, onPathChange, isActive, onActivate }: FilePanelProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([path]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<{ action: 'copy' | 'cut'; paths: string[] } | null>(null);

  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    try {
      const files = await fileService.readDirectory(dirPath);
      setEntries(files);
      setSelectedPaths(new Set());
    } catch (error) {
      console.error('Error loading directory:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(path);
  }, [path, loadDirectory]);

  const handleNavigate = (newPath: string) => {
    onPathChange(newPath);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newPath]);
    setHistoryIndex(prev => prev + 1);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      onPathChange(history[historyIndex - 1]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      onPathChange(history[historyIndex + 1]);
    }
  };

  const goUp = () => {
    const parentPath = path.split('\\').slice(0, -1).join('\\');
    if (parentPath) handleNavigate(parentPath);
  };

  const handleCopy = () => {
    setClipboard({ action: 'copy', paths: Array.from(selectedPaths) });
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    for (const srcPath of clipboard.paths) {
      const fileName = srcPath.split('\\').pop()!;
      const dstPath = `${path}\\${fileName}`;
      if (clipboard.action === 'copy') {
        await fileService.copyFile(srcPath, dstPath);
      } else {
        await fileService.moveFile(srcPath, dstPath);
      }
    }
    loadDirectory(path);
    setClipboard(null);
  };

  return (
    <div
      className={`flex-1 flex flex-col border-l ${
        isActive ? 'border-netvault-accent' : 'border-transparent'
      }`}
      onClick={onActivate}
    >
      <PathNavigator
        path={path}
        onNavigate={handleNavigate}
        onBack={goBack}
        onForward={goForward}
        onUp={goUp}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
      />
      
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-netvault-text-secondary">Cargando...</span>
          </div>
        ) : (
          entries.map(entry => (
            <FileItem
              key={entry.path}
              entry={entry}
              isSelected={selectedPaths.has(entry.path)}
              onSelect={(e) => {
                if (e.ctrlKey) {
                  setSelectedPaths(prev => {
                    const next = new Set(prev);
                    if (next.has(entry.path)) next.delete(entry.path);
                    else next.add(entry.path);
                    return next;
                  });
                } else {
                  setSelectedPaths(new Set([entry.path]));
                }
              }}
              onDoubleClick={() => {
                if (entry.isDirectory) {
                  handleNavigate(entry.path);
                } else {
                  fileService.openFile(entry.path);
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

**3.2.3 Sistema de temas**

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        netvault: {
          bg: {
            primary: 'var(--bg-primary)',
            secondary: 'var(--bg-secondary)',
          },
          toolbar: 'var(--toolbar-bg)',
          accent: 'var(--accent)',
          text: {
            primary: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
          },
          border: 'var(--border)',
          hover: 'var(--hover)',
          selected: 'var(--selected)',
        },
      },
    },
  },
  plugins: [],
};
```

`src/styles/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --toolbar-bg: #e8e8e8;
  --accent: #3b82f6;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6b6b;
  --border: #d1d1d1;
  --hover: #e5e5e5;
  --selected: #bfdbfe;
}

.dark {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --toolbar-bg: #0f0f23;
  --accent: #60a5fa;
  --text-primary: #e5e5e5;
  --text-secondary: #9ca3af;
  --border: #2d2d44;
  --hover: #252542;
  --selected: #1e3a5f;
}
```

#### Criterios de aceptación
- [ ] Layout de doble panel funcional
- [ ] Navegación con historial (atrás/adelante/subir)
- [ ] Tema claro/oscuro alternable
- [ ] Sidebar con favoritos funcional
- [ ] Selección múltiple con Ctrl/Shift

---

### Fase 3: Operaciones de Archivo (Semana 5-6)

#### Objetivos
- Implementar todas las operaciones de archivo (copiar, mover, eliminar, renombrar)
- Menú contextual completo
- Diálogos de confirmación nativos
- Sistema de deshacer
- Drag & drop

#### Componentes a implementar

**3.3.1 ContextMenu**

`src/components/common/ContextMenu.tsx`:
```tsx
import { useState, useEffect, useRef } from 'react';

interface MenuItem {
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-netvault-bg-secondary border border-netvault-border rounded shadow-lg py-1 min-w-[180px] z-50"
      style={{ left: x, top: y }}
    >
      {items.map((item, idx) =>
        item.separator ? (
          <div key={idx} className="border-t border-netvault-border my-1" />
        ) : (
          <button
            key={idx}
            className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 ${
              item.disabled
                ? 'text-netvault-text-secondary cursor-not-allowed'
                : 'text-netvault-text-primary hover:bg-netvault-hover'
            }`}
            onClick={() => !item.disabled && item.action()}
            disabled={item.disabled}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}
```

**3.3.2 FileItem con contexto**

`src/components/file-panel/FileItem.tsx`:
```tsx
import { useState } from 'react';
import { ContextMenu } from '../common/ContextMenu';
import { fileService } from '../../services/fileService';
import type { FileEntry } from '../../types/file.types';

interface FileItemProps {
  entry: FileEntry;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onDelete?: () => void;
  onRename?: (newName: string) => void;
}

export function FileItem({ entry, isSelected, onSelect, onDoubleClick, onDelete, onRename }: FileItemProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(entry.name);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(e);
  };

  const handleRename = () => {
    if (newName && newName !== entry.name) {
      onRename?.(newName);
    }
    setIsRenaming(false);
  };

  const contextMenuItems = [
    { label: 'Abrir', icon: '📂', action: onDoubleClick },
    { label: 'Copiar', icon: '📋', action: () => fileService.copyToClipboard([entry.path]) },
    { label: 'Cortar', icon: '✂️', action: () => fileService.cutToClipboard([entry.path]) },
    { separator: true, label: '' } as any,
    { label: 'Renombrar', icon: '✏️', action: () => setIsRenaming(true) },
    { label: 'Eliminar', icon: '🗑️', action: () => onDelete?.() },
    { separator: true, label: '' } as any,
    { label: 'Propiedades', icon: 'ℹ️', action: () => fileService.showProperties(entry.path) },
  ];

  return (
    <>
      <div
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer rounded ${
          isSelected
            ? 'bg-netvault-selected'
            : 'hover:bg-netvault-hover'
        }`}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <span className="text-lg">{entry.isDirectory ? '📁' : '📄'}</span>
        {isRenaming ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className="flex-1 px-1 bg-netvault-bg-primary text-netvault-text-primary border border-netvault-accent rounded outline-none"
          />
        ) : (
          <span className="flex-1 truncate text-sm text-netvault-text-primary">
            {entry.name}
          </span>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
```

**3.3.3 Servicio de archivos actualizado**

`src/services/fileService.ts`:
```typescript
import { electronAPI } from '../electronAPI';
import type { FileEntry, FileStats } from '../types/file.types';

export const fileService = {
  async readDirectory(path: string): Promise<FileEntry[]> {
    return await electronAPI.readDirectory(path);
  },

  async getStats(path: string): Promise<FileStats> {
    return await electronAPI.getFileStats(path);
  },

  async copyFile(src: string, dst: string): Promise<void> {
    await electronAPI.copyFile(src, dst);
  },

  async moveFile(src: string, dst: string): Promise<void> {
    await electronAPI.moveFile(src, dst);
  },

  async deleteFile(path: string, permanent: boolean = false): Promise<void> {
    await electronAPI.deleteFile(path, permanent);
  },

  async createFolder(parent: string, name: string): Promise<void> {
    await electronAPI.createFolder(`${parent}\\${name}`);
  },

  async createFile(parent: string, name: string, content: string = ''): Promise<void> {
    await electronAPI.createFile(`${parent}\\${name}`, content);
  },

  async renameFile(oldPath: string, newName: string): Promise<void> {
    const parent = oldPath.split('\\').slice(0, -1).join('\\');
    const newPath = `${parent}\\${newName}`;
    await electronAPI.moveFile(oldPath, newPath);
  },

  async openFile(path: string): Promise<void> {
    await electronAPI.openFile(path);
  },

  async showProperties(path: string): Promise<void> {
    await electronAPI.showProperties(path);
  },

  async showDeleteConfirmation(fileName: string): Promise<boolean> {
    const result = await electronAPI.showMessageBox({
      type: 'question',
      buttons: ['Cancelar', 'Eliminar', 'Eliminar permanentemente'],
      defaultId: 0,
      title: 'Confirmar eliminación',
      message: `¿Eliminar "${fileName}"?`,
      detail: 'Esta acción puede deshacerse desde la papelera de reciclaje.',
    });
    return result.response === 1;
  },
};
```

#### Criterios de aceptación
- [ ] Menú contextual funcional en archivos/carpetas
- [ ] Copiar/cortar/pegar con portapapeles
- [ ] Eliminar a papelera con confirmación
- [ ] Renombrar inline
- [ ] Crear archivo/carpeta
- [ ] Ver propiedades

---

### Fase 4: Terminal Integrada (Semana 7-8)

#### Objetivos
- Terminal PowerShell embebida
- Historial de comandos
- Autocompletado básico
- Comandos rápidos por categorías
- Sincronización de directorio con panel activo

#### Componentes a implementar

**3.4.1 Terminal**

`src/components/terminal/Terminal.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react';
import { TerminalInput } from './TerminalInput';
import { TerminalOutput } from './TerminalOutput';
import { CommandPalette } from './CommandPalette';
import { terminalService } from '../../services/terminalService';
import type { TerminalLine } from '../../types/terminal.types';

interface TerminalProps {
  initialCwd: string;
  onClose: () => void;
}

export function Terminal({ initialCwd, onClose }: TerminalProps) {
  const [cwd, setCwd] = useState(initialCwd);
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', content: `PowerShell - NetVault Terminal\nDirectorio actual: ${initialCwd}\n` },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showPalette, setShowPalette] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight);
  }, [lines]);

  const executeCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setLines(prev => [...prev, { type: 'input', content: `PS ${cwd}> ${command}` }]);
    setHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    if (['cls', 'clear'].includes(trimmed.toLowerCase())) {
      setLines([{ type: 'system', content: 'Terminal limpiada.' }]);
      return;
    }

    try {
      const result = await terminalService.execute(trimmed, cwd);
      setLines(prev => [...prev, { type: 'output', content: result }]);
      setCwd(result.match(/C:\\[^\n]+/)?.pop() || cwd);
    } catch (error: any) {
      setLines(prev => [...prev, { type: 'error', content: error.message }]);
    }
  };

  const handleHistoryNav = (direction: 'up' | 'down') => {
    if (history.length === 0) return;
    
    if (direction === 'up') {
      const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      return history[history.length - 1 - newIndex];
    } else {
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
      setHistoryIndex(newIndex);
      return newIndex === -1 ? '' : history[history.length - 1 - newIndex];
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0c0c0c] border-l border-netvault-border">
      <div className="flex items-center justify-between px-3 py-1 bg-[#1a1a1a] border-b border-[#333]">
        <span className="text-xs text-gray-400">Terminal</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
      
      <div ref={outputRef} className="flex-1 overflow-auto p-2 font-mono text-sm">
        <TerminalOutput lines={lines} />
      </div>
      
      <div className="border-t border-[#333]">
        <TerminalInput
          cwd={cwd}
          onSubmit={executeCommand}
          onHistoryNav={handleHistoryNav}
          onPaletteToggle={() => setShowPalette(!showPalette)}
        />
      </div>
      
      {showPalette && (
        <CommandPalette
          cwd={cwd}
          onSelect={(cmd) => {
            executeCommand(cmd);
            setShowPalette(false);
          }}
          onClose={() => setShowPalette(false)}
        />
      )}
    </div>
  );
}
```

**3.4.2 Comando rápido: npm, git, docker**

`src/components/terminal/CommandPalette.tsx`:
```tsx
import { useState, useEffect, useRef } from 'react';

interface Command {
  name: string;
  command: string;
  description: string;
  category: string;
}

const COMMANDS: Command[] = [
  // Git
  { name: 'Git Status', command: 'git status', description: 'Ver estado del repositorio', category: 'Git' },
  { name: 'Git Add All', command: 'git add .', description: 'Agregar todos los cambios', category: 'Git' },
  { name: 'Git Commit', command: 'git commit -m ""', description: 'Crear commit', category: 'Git' },
  { name: 'Git Push', command: 'git push', description: 'Subir cambios', category: 'Git' },
  { name: 'Git Pull', command: 'git pull', description: 'Descargar cambios', category: 'Git' },
  { name: 'Git Log', command: 'git log --oneline -10', description: 'Ver últimos commits', category: 'Git' },
  { name: 'Git Branch', command: 'git branch', description: 'Ver ramas', category: 'Git' },
  { name: 'Git Checkout', command: 'git checkout ', description: 'Cambiar de rama', category: 'Git' },
  
  // Node
  { name: 'npm install', command: 'npm install', description: 'Instalar dependencias', category: 'Node' },
  { name: 'npm run dev', command: 'npm run dev', description: 'Iniciar desarrollo', category: 'Node' },
  { name: 'npm run build', command: 'npm run build', description: 'Build de producción', category: 'Node' },
  { name: 'npm test', command: 'npm test', description: 'Ejecutar tests', category: 'Node' },
  { name: 'npx create', command: 'npx ', description: 'Ejecutar herramienta npx', category: 'Node' },
  
  // Docker
  { name: 'Docker PS', command: 'docker ps', description: 'Ver contenedores activos', category: 'Docker' },
  { name: 'Docker Compose Up', command: 'docker compose up -d', description: 'Levantar servicios', category: 'Docker' },
  { name: 'Docker Compose Down', command: 'docker compose down', description: 'Detener servicios', category: 'Docker' },
  { name: 'Docker Build', command: 'docker build .', description: 'Construir imagen', category: 'Docker' },
  
  // Python
  { name: 'pip install', command: 'pip install ', description: 'Instalar paquete pip', category: 'Python' },
  { name: 'Python run', command: 'python ', description: 'Ejecutar script Python', category: 'Python' },
  { name: 'Venv activate', command: '.\\venv\\Scripts\\Activate', description: 'Activar entorno virtual', category: 'Python' },
  
  // Common
  { name: 'List dir', command: 'dir', description: 'Listar archivos', category: 'Common' },
  { name: 'Find file', command: 'Get-ChildItem -Recurse -Filter "*"', description: 'Buscar archivo', category: 'Common' },
  { name: 'Env vars', command: 'Get-ChildItem Env:', description: 'Ver variables de entorno', category: 'Common' },
];

interface CommandPaletteProps {
  cwd: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

export function CommandPalette({ cwd, onSelect, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = [...new Set(COMMANDS.map(c => c.category))];
  
  const filteredCommands = COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.command.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].command);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  return (
    <div className="absolute bottom-full left-0 right-0 bg-netvault-bg-secondary border border-netvault-border rounded-t shadow-lg max-h-[300px] overflow-hidden">
      <div className="p-2 border-b border-netvault-border">
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar comando..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 bg-netvault-bg-primary border border-netvault-border rounded text-sm text-netvault-text-primary outline-none focus:border-netvault-accent"
        />
      </div>
      
      <div className="overflow-auto max-h-[250px]">
        {categories.map(category => {
          const categoryCommands = filteredCommands.filter(c => c.category === category);
          if (categoryCommands.length === 0) return null;
          
          return (
            <div key={category}>
              <div className="px-2 py-1 text-xs text-netvault-text-secondary bg-netvault-bg-primary font-bold">
                {category}
              </div>
              {categoryCommands.map((cmd, idx) => {
                const globalIdx = filteredCommands.indexOf(cmd);
                return (
                  <button
                    key={cmd.name}
                    className={`w-full px-3 py-1.5 text-left text-sm flex justify-between items-center ${
                      globalIdx === selectedIndex
                        ? 'bg-netvault-selected text-netvault-text-primary'
                        : 'text-netvault-text-secondary hover:bg-netvault-hover'
                    }`}
                    onClick={() => onSelect(cmd.command)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <span>{cmd.name}</span>
                    <span className="text-xs text-gray-500">{cmd.command}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### Criterios de aceptación
- [ ] Terminal funcional con PowerShell
- [ ] Historial de comandos navegable con flechas
- [ ] Palette de comandos rápidos por categorías
- [ ] Sincronización de cwd con panel de archivos
- [ ] CLS/clear interno

---

### Fase 5: Búsqueda y Indexado (Semana 9-10)

#### Objetivos
- Implementar búsqueda indexada optimizada
- Fuzzy search con Fuse.js
- Búsqueda por extensión
- Resultados en tiempo real con debounce
- Caché en IndexedDB (migrar de SQLite)

#### Componentes a implementar

**3.5.1 SearchBar**

`src/components/search/SearchBar.tsx`:
```tsx
import { useState, useCallback, useEffect } from 'react';
import { searchService } from '../../services/searchService';
import { SearchResults } from './SearchResults';
import type { SearchResult } from '../../types/search.types';

interface SearchBarProps {
  onResults?: (results: SearchResult[]) => void;
}

export function SearchBar({ onResults }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [extension, setExtension] = useState('');
  const [fuzzy, setFuzzy] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, ext: string, fuzzyEnabled: boolean) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await searchService.search(searchQuery, {
          extension: ext || undefined,
          fuzzy: fuzzyEnabled,
          limit: 100,
        });
        setResults(searchResults);
        onResults?.(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [onResults]
  );

  useEffect(() => {
    debouncedSearch(query, extension, fuzzy);
  }, [query, extension, fuzzy, debouncedSearch]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 p-2 bg-netvault-bg-secondary rounded">
        <span className="text-netvault-text-secondary">🔍</span>
        <input
          type="text"
          placeholder="Buscar archivos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="flex-1 bg-transparent outline-none text-netvault-text-primary placeholder-netvault-text-secondary"
        />
        
        <input
          type="text"
          placeholder="Extensión (ej: .ts)"
          value={extension}
          onChange={(e) => setExtension(e.target.value)}
          className="w-28 px-2 py-0.5 bg-netvault-bg-primary border border-netvault-border rounded text-sm text-netvault-text-primary outline-none focus:border-netvault-accent"
        />
        
        <label className="flex items-center gap-1 text-sm text-netvault-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={fuzzy}
            onChange={(e) => setFuzzy(e.target.checked)}
            className="rounded"
          />
          Fuzzy
        </label>
        
        {loading && <span className="text-netvault-text-secondary animate-pulse">...</span>}
      </div>
      
      {showResults && results.length > 0 && (
        <SearchResults
          results={results}
          onClose={() => setShowResults(false)}
          onSelect={(result) => {
            // Navegar al archivo o abrirlo
            setShowResults(false);
          }}
        />
      )}
    </div>
  );
}

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}
```

**3.5.2 Servicio de búsqueda**

`src/services/searchService.ts`:
```typescript
import { electronAPI } from '../electronAPI';
import Fuse from 'fuse.js';
import type { FileEntry, SearchResult } from '../types/search.types';

const INDEXEDB_NAME = 'netvault-cache';
const STORE_NAME = 'file-index';

class SearchIndex {
  private fuse: Fuse<FileEntry> | null = null;
  private entries: FileEntry[] = [];

  async initialize() {
    // Cargar índice desde IndexedDB
    const db = await openDB();
    const stored = await getFromDB<FileEntry[]>(db, STORE_NAME, 'index');
    if (stored) {
      this.entries = stored;
      this.buildIndex();
    }
  }

  private buildIndex() {
    this.fuse = new Fuse(this.entries, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
    });
  }

  async indexDirectory(path: string, entries: FileEntry[]) {
    // Agregar nuevas entradas
    this.entries = this.entries.filter(e => !e.path.startsWith(path));
    this.entries.push(...entries.map(e => ({ ...e, indexedPath: path })));
    this.buildIndex();
    
    // Persistir en IndexedDB
    const db = await openDB();
    await saveToDB(db, STORE_NAME, 'index', this.entries);
  }

  search(query: string, options: { extension?: string; fuzzy?: boolean; limit?: number } = {}) {
    let results = this.entries;

    // Filtro de extensión
    if (options.extension) {
      const ext = options.extension.startsWith('.') ? options.extension : `.${options.extension}`;
      results = results.filter(e => e.name.toLowerCase().endsWith(ext.toLowerCase()));
    }

    // Búsqueda
    if (options.fuzzy && this.fuse) {
      return this.fuse.search(query).slice(0, options.limit || 100).map(r => r.item);
    } else {
      const lowerQuery = query.toLowerCase();
      return results.filter(e => e.name.toLowerCase().includes(lowerQuery)).slice(0, options.limit || 100);
    }
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXEDB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function getFromDB<T>(db: IDBDatabase, store: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

function saveToDB<T>(db: IDBDatabase, store: string, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const request = tx.objectStore(store).put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

const searchIndex = new SearchIndex();
searchIndex.initialize();

export const searchService = {
  async search(query: string, options: { extension?: string; fuzzy?: boolean; limit?: number } = {}): Promise<SearchResult[]> {
    const results = searchIndex.search(query, options);
    return results.map(entry => ({
      ...entry,
      matchScore: 1, // Fuse.js score would go here
    }));
  },

  async indexDirectory(path: string, entries: FileEntry[]) {
    await searchIndex.indexDirectory(path, entries);
  },

  async clearIndex() {
    const db = await openDB();
    await saveToDB(db, STORE_NAME, 'index', []);
  },
};
```

#### Criterios de aceptación
- [ ] Búsqueda con debounce funcional
- [ ] Fuzzy search con Fuse.js
- [ ] Filtro por extensión
- [ ] Resultados en dropdown
- [ ] Índice persistido en IndexedDB

---

### Fase 6: Integración IA con Ollama (Semana 11-12)

#### Objetivos
- Migrar capa de IA de Python a Node.js
- Mantener compatibilidad con Ollama
- Chat contextual flotante
- Context builder para proyectos
- Scaffolder con templates

#### Componentes a implementar

**3.6.1 Servicio de IA (Node.js)**

`server/services/ollamaService.ts`:
```typescript
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OllamaService {
  private model: string;
  private available: boolean = false;

  constructor(model: string = 'qwen2.5-coder:7b') {
    this.model = model;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`);
      if (!response.ok) return false;
      
      const data = await response.json();
      this.available = data.models?.some((m: any) => m.name === this.model);
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  async chat(messages: Message[], stream: boolean = true): Promise<AsyncGenerator<string>> {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    return this.streamResponse(response);
  }

  private async *streamResponse(response: Response): AsyncGenerator<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line);
          if (chunk.message?.content) {
            yield chunk.message.content;
          }
          if (chunk.done) return;
        } catch {
          continue;
        }
      }
    }
  }

  async measureLatency(prompt: string = 'ok'): Promise<{ firstToken: number; total: number }> {
    const start = performance.now();
    let firstToken = 0;

    for await (const _token of await this.chat([{ role: 'user', content: prompt }])) {
      if (firstToken === 0) {
        firstToken = performance.now() - start;
      }
    }

    return { firstToken, total: performance.now() - start };
  }
}
```

**3.6.2 Context Builder**

`src/services/contextBuilder.ts`:
```typescript
import * as path from 'path';
import * as fs from 'fs/promises';

const KEY_FILES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'README.md',
  'CLAUDE.md',
  '.env.example',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.js',
];

export interface ProjectContext {
  rootPath: string;
  projectName: string;
  stack: string[];
  keyFiles: { name: string; path: string }[];
  structure: string;
}

export async function buildContext(rootPath: string): Promise<ProjectContext> {
  const projectName = path.basename(rootPath);
  const stack: string[] = [];
  const keyFiles: { name: string; path: string }[] = [];

  // Detectar stack
  const entries = await fs.readdir(rootPath);
  for (const entry of entries) {
    if (entry === 'package.json') stack.push('Node');
    if (entry === 'requirements.txt' || entry === 'pyproject.toml') stack.push('Python');
    if (entry === 'Cargo.toml') stack.push('Rust');
    if (entry === 'go.mod') stack.push('Go');
    if (entry === 'Dockerfile' || entry === 'docker-compose.yml') stack.push('Docker');
    if (entry === 'tsconfig.json') stack.push('TypeScript');
    if (entry === 'vite.config.ts' || entry === 'vite.config.js') stack.push('Vite');
    if (entry === 'tailwind.config.js') stack.push('Tailwind');
  }

  // Buscar archivos clave
  for (const keyFile of KEY_FILES) {
    try {
      const fullPath = path.join(rootPath, keyFile);
      await fs.access(fullPath);
      keyFiles.push({ name: keyFile, path: fullPath });
    } catch {
      continue;
    }
  }

  // Construir estructura resumida
  const structure = await buildDirectoryTree(rootPath, 2);

  return { rootPath, projectName, stack, keyFiles, structure };
}

async function buildDirectoryTree(dirPath: string, maxDepth: number, currentDepth: number = 0): Promise<string> {
  if (currentDepth >= maxDepth) return '...';

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const lines: string[] = [];
  
  // Solo mostrar primeros 10 items
  const visible = entries.slice(0, 10);
  const hidden = entries.length > 10;

  for (const entry of visible) {
    const prefix = entry.isDirectory() ? '📁 ' : '📄 ';
    if (entry.isDirectory() && currentDepth < maxDepth - 1) {
      lines.push(`${prefix}${entry.name}/`);
      const sub = await buildDirectoryTree(path.join(dirPath, entry.name), maxDepth, currentDepth + 1);
      sub.split('\n').forEach(l => lines.push('  ' + l));
    } else {
      lines.push(`${prefix}${entry.name}`);
    }
  }

  if (hidden) lines.push(`... y ${entries.length - 10} más`);

  return lines.join('\n');
}
```

**3.6.3 AI Chat Panel**

`src/components/ai/AIChat.tsx`:
```tsx
import { useState, useRef, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { contextBuilder } from '../../services/contextBuilder';
import type { Message } from '../../types/ai.types';

interface AIChatProps {
  initialFolder: string;
}

export function AIChat({ initialFolder }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente de NetVault. Puedo ayudarte a entender proyectos, explicar código y sugerir comandos. ¿En qué puedo ayudarte?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAI();
    loadContext(initialFolder);
  }, [initialFolder]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAI = async () => {
    const available = await aiService.checkAvailability();
    setAiAvailable(available);
  };

  const loadContext = async (folder: string) => {
    try {
      const ctx = await contextBuilder.buildContext(folder);
      setContext(ctx);
    } catch (error) {
      console.error('Error building context:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Construir prompt con contexto
      const systemPrompt = buildSystemPrompt(context);
      const allMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
        userMessage,
      ];

      let fullResponse = '';
      for await (const token of await aiService.chat(allMessages)) {
        fullResponse += token;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last.role === 'assistant' && prev.length === messages.length + 1) {
            return [...prev.slice(0, -1), { ...last, content: fullResponse }];
          }
          return [...prev, { role: 'assistant', content: fullResponse }];
        });
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-netvault-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-netvault-toolbar border-b border-netvault-border">
        <div>
          <h3 className="font-semibold text-netvault-text-primary">Asistente IA</h3>
          <span className={`text-xs ${aiAvailable ? 'text-green-500' : 'text-red-500'}`}>
            {aiAvailable ? '● Ollama conectado' : '○ Ollama no disponible'}
          </span>
        </div>
        {context && (
          <div className="text-xs text-netvault-text-secondary">
            📂 {context.projectName} • {context.stack.join(', ')}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-netvault-accent text-white'
                  : 'bg-netvault-bg-secondary text-netvault-text-primary'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-netvault-bg-secondary rounded-lg px-4 py-2">
              <span className="animate-pulse text-netvault-text-secondary">Escribiendo...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-netvault-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={aiAvailable ? 'Pregúntame sobre el proyecto...' : 'Ollama no está disponible'}
            disabled={!aiAvailable}
            className="flex-1 px-3 py-2 bg-netvault-bg-secondary border border-netvault-border rounded text-sm text-netvault-text-primary placeholder-netvault-text-secondary outline-none focus:border-netvault-accent disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!aiAvailable || loading}
            className="px-4 py-2 bg-netvault-accent text-white rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

function buildSystemPrompt(context: any): string {
  if (!context) {
    return 'Eres un asistente de IA útil. Responde en español.';
  }

  return `Eres un asistente de código experto en el proyecto "${context.projectName}".
Stack detectado: ${context.stack.join(', ') || 'No detectado'}

Estructura del proyecto:
${context.structure}

Principios:
1. Explica código y arquitectura cuando sea útil
2. Sugiere comandos relevantes al stack detectado
3. Sé conciso pero informativo
4. Prioriza la seguridad - nunca ejecutes comandos destructivos sin confirmación

Contexto actual: ${context.rootPath}`;
}
```

#### Criterios de aceptación
- [ ] Ollama detectando disponibilidad
- [ ] Chat con streaming de tokens
- [ ] Contexto de proyecto construido automáticamente
- [ ] Prompts con system message contextual

---

### Fase 7: Scaffolder con Templates (Semana 13-14)

#### Objetivos
- Migrar templates de Python a JSON/TypeScript
- UI de selector de template
- Generación de estructura de proyecto
- Opciones configurables (git, docker, readme)
- Integración con IA para personalización

#### Componentes a implementar

**3.7.1 Templates (TypeScript)**

`src/data/templates.ts`:
```typescript
export interface TemplateOption {
  id: string;
  label: string;
  description: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Backend' | 'Frontend' | 'Full Stack' | 'Other';
  options: TemplateOption[];
  files: Record<string, string>;
  gitignore?: string[];
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'fastapi-sqlmodel',
    name: 'FastAPI + SQLModel',
    description: 'API REST con FastAPI, SQLModel y SQLite/PostgreSQL',
    category: 'Backend',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'docker', label: 'Docker' },
      { id: 'readme', label: 'README' },
      { id: 'env', label: '.env' },
    ],
    files: {
      'app/__init__.py': '',
      'app/main.py': `from fastapi import FastAPI
from app.core.database import create_db_and_tables

app = FastAPI(title="{{name}}", version="0.1.0")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def root():
    return {"status": "ok", "app": "{{name}}"}`,
      'app/core/__init__.py': '',
      'app/core/config.py': `from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "{{name}}"
    database_url: str = "sqlite:///./app.db"
    
    class Config:
        env_file = ".env"

settings = Settings()`,
      'requirements.txt': 'fastapi\nuvicorn[standard]\nsqlmodel\npydantic-settings',
      'README.md': '# {{name}}\n\nAPI REST construida con FastAPI y SQLModel.',
    },
    gitignore: ['venv/', '__pycache__/', '*.pyc', '.env', 'dist/', 'build/'],
  },

  {
    id: 'react-vite-tailwind',
    name: 'React + Vite + Tailwind',
    description: 'Frontend React con Vite, TypeScript y Tailwind CSS',
    category: 'Frontend',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'readme', label: 'README' },
    ],
    files: {
      'src/main.tsx': `import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
      'src/App.tsx': `function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-800">{{name}}</h1>
    </div>
  )
}
export default App`,
      'src/index.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;',
      'package.json': JSON.stringify({
        name: '{{name_lower}}',
        version: '0.0.1',
        scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        devDependencies: {
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          '@vitejs/plugin-react': '^4.0.0',
          autoprefixer: '^10.0.0',
          postcss: '^8.0.0',
          tailwindcss: '^3.0.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
})`,
      'tailwind.config.js': `export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }],
      }, null, 2),
      'index.html': `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>{{name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      'README.md': '# {{name}}\n\nReact + Vite + Tailwind.',
    },
    gitignore: ['node_modules/', 'dist/', '.next/', '.env'],
  },

  {
    id: 'nestjs-nextjs',
    name: 'NestJS + Next.js',
    description: 'Full stack con NestJS backend y Next.js frontend',
    category: 'Full Stack',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'docker', label: 'Docker' },
      { id: 'readme', label: 'README' },
    ],
    files: {
      'backend/package.json': JSON.stringify({
        name: '{{name_lower}}-backend',
        scripts: { start: 'nest start', 'start:dev': 'nest start --watch' },
        dependencies: {
          '@nestjs/common': '^10.0.0',
          '@nestjs/core': '^10.0.0',
          '@nestjs/platform-express': '^10.0.0',
        },
      }, null, 2),
      'frontend/package.json': JSON.stringify({
        name: '{{name_lower}}-frontend',
        scripts: { dev: 'next dev', build: 'next build' },
        dependencies: { next: '^14.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' },
      }, null, 2),
      'docker-compose.yml': `version: "3.9"
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend`,
      'README.md': '# {{name}}\n\nNestJS + Next.js monorepo.',
    },
    gitignore: ['node_modules/', 'dist/', '.next/', '.env'],
  },

  {
    id: 'electron-app',
    name: 'Electron App',
    description: 'Aplicación de escritorio con Electron, React y TypeScript',
    category: 'Desktop',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'readme', label: 'README' },
      { id: 'tailwind', label: 'Tailwind' },
    ],
    files: {
      'package.json': JSON.stringify({
        name: '{{name_lower}}',
        version: '1.0.0',
        main: 'dist-electron/main.js',
        scripts: {
          dev: 'vite',
          build: 'vite build && electron-builder',
          'electron:dev': 'concurrently "vite" "wait-on tcp:5173 && electron ."',
        },
        build: {
          appId: 'com.{{name_lower}}.app',
          productName: '{{name}}',
          win: { target: 'nsis' },
        },
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        devDependencies: {
          electron: '^29.0.0',
          'electron-builder': '^24.0.0',
          '@vitejs/plugin-react': '^4.0.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      }, null, 2),
      'electron/main.ts': `import { app, BrowserWindow } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  })
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)`,
      'electron/preload.ts': `import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})`,
      'src/main.tsx': `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
      'src/App.tsx': `function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{{name}}</h1>
    </div>
  )
}
export default App`,
      'README.md': '# {{name}}\n\nElectron app con React y TypeScript.',
    },
    gitignore: ['node_modules/', 'dist/', 'dist-electron/', '.env'],
  },
];

export const TEMPLATE_CATEGORIES = ['Backend', 'Frontend', 'Full Stack', 'Desktop', 'Other'];
```

**3.7.2 Scaffolder UI**

`src/components/ai/Scaffolder.tsx`:
```tsx
import { useState } from 'react';
import { TEMPLATES, TEMPLATE_CATEGORIES, type ProjectTemplate } from '../../data/templates';
import { fileService } from '../../services/fileService';

interface ScaffolderProps {
  onClose: () => void;
  destinationPath: string;
}

export function Scaffolder({ onClose, destinationPath }: ScaffolderProps) {
  const [step, setStep] = useState<'category' | 'template' | 'options' | 'name' | 'creating'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setStep('template');
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setSelectedOptions(new Set(template.options.map(o => o.id)));
    setStep('options');
  };

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!projectName.trim() || !selectedTemplate) return;

    setCreating(true);
    setError(null);

    try {
      const files: Record<string, string> = {};
      
      // Generar archivos con reemplazos
      for (const [path, content] of Object.entries(selectedTemplate.files)) {
        const processedPath = path
          .replace('{{name}}', projectName)
          .replace('{{name_lower}}', projectName.toLowerCase().replace(/\s+/g, '-'));
        const processedContent = content
          .replace(/\{\{name\}\}/g, projectName)
          .replace(/\{\{name_lower\}\}/g, projectName.toLowerCase().replace(/\s+/g, '-'));
        files[processedPath] = processedContent;
      }

      // Agregar .gitignore si se seleccionó
      if (selectedOptions.has('git') && selectedTemplate.gitignore) {
        files['.gitignore'] = selectedTemplate.gitignore.join('\n');
      }

      // Crear archivos vía IPC
      const projectPath = `${destinationPath}\\${projectName}`;
      await fileService.createFolder(destinationPath, projectName);
      
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = `${projectPath}\\${filePath}`;
        const parentDir = fullPath.split('\\').slice(0, -1).join('\\');
        await fileService.createFolder(parentDir, filePath.split('\\').pop() || '');
        await fileService.createFile(parentDir, filePath.split('\\').pop() || '', content);
      }

      // Inicializar git si se seleccionó
      if (selectedOptions.has('git')) {
        await terminalService.execute('git init', projectPath);
      }

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-netvault-bg-primary w-[600px] rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-netvault-toolbar flex items-center justify-between">
          <h2 className="font-semibold text-netvault-text-primary">Crear Nuevo Proyecto</h2>
          <button onClick={onClose} className="text-netvault-text-secondary hover:text-white text-xl">
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step: Category */}
          {step === 'category' && (
            <div className="space-y-3">
              <p className="text-netvault-text-secondary mb-4">Selecciona una categoría:</p>
              {TEMPLATE_CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className="w-full p-4 text-left bg-netvault-bg-secondary rounded hover:bg-netvault-hover transition-colors"
                >
                  <span className="font-medium text-netvault-text-primary">{category}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step: Template */}
          {step === 'template' && selectedCategory && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('category')}
                className="text-sm text-netvault-accent hover:underline"
              >
                ← Volver
              </button>
              <p className="text-netvault-text-secondary mt-2">Selecciona un template:</p>
              {TEMPLATES.filter(t => t.category === selectedCategory).map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full p-4 text-left bg-netvault-bg-secondary rounded hover:bg-netvault-hover transition-colors"
                >
                  <span className="font-medium text-netvault-text-primary">{template.name}</span>
                  <p className="text-sm text-netvault-text-secondary mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step: Options */}
          {step === 'options' && selectedTemplate && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('template')}
                className="text-sm text-netvault-accent hover:underline"
              >
                ← Volver
              </button>
              <h3 className="font-medium text-netvault-text-primary">{selectedTemplate.name}</h3>
              <p className="text-netvault-text-secondary text-sm">{selectedTemplate.description}</p>
              
              <div className="space-y-2">
                <p className="text-sm text-netvault-text-secondary">Opciones:</p>
                {selectedTemplate.options.map(option => (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedOptions.has(option.id)}
                      onChange={() => handleOptionToggle(option.id)}
                      className="rounded"
                    />
                    <span className="text-netvault-text-primary">{option.label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-4">
                <label className="block text-sm text-netvault-text-secondary mb-1">Nombre del proyecto:</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Mi Proyecto"
                  className="w-full px-3 py-2 bg-netvault-bg-secondary border border-netvault-border rounded text-netvault-text-primary outline-none focus:border-netvault-accent"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-netvault-text-secondary hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!projectName.trim() || creating}
                  className="px-4 py-2 bg-netvault-accent text-white rounded font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Creando...' : 'Crear Proyecto'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### Criterios de aceptación
- [ ] Templates organizados por categoría
- [ ] Opciones configurables (git, docker, readme)
- [ ] Generación de estructura completa
- [ ] .gitignore generado automáticamente
- [ ] Git init opcional

---

### Fase 8: Distribución y Empaquetado (Semana 15-16)

#### Objetivos
- Configurar electron-builder
- Builds para Windows (.exe, .msi)
- Instalador NSIS con shortcuts
- Auto-actualización (opcional)
- Código signing (opcional)

#### Configuración

`electron-builder.yml`:
```yaml
appId: com.netvault.app
productName: NetVault
copyright: Copyright © 2024

directories:
  output: release
  buildResources: build

files:
  - dist/**/*
  - dist-electron/**/*
  - package.json

extraMetadata:
  main: dist-electron/main.js

win:
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64
  icon: assets/icon.ico
  artifactName: ${productName}-${version}-${arch}.${ext}

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: NetVault

mac:
  target:
    - dmg
    - zip
  icon: assets/icon.icns
  category: public.app-category.developer-tools

linux:
  target:
    - AppImage
    - deb
  icon: assets
  category: Development
```

`scripts/build.js`:
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building NetVault...\n');

// 1. Build frontend
console.log('📦 Building frontend...');
execSync('npm run build:frontend', { stdio: 'inherit' });

// 2. Build electron main
console.log('\n⚡ Building electron main...');
execSync('npm run build:electron', { stdio: 'inherit' });

// 3. Copy assets
const distElectron = path.join(__dirname, '..', 'dist-electron');
if (!fs.existsSync(distElectron)) {
  fs.mkdirSync(distElectron, { recursive: true });
}

// 4. Package with electron-builder
console.log('\n📦 Packaging with electron-builder...');
execSync('npx electron-builder --win', { stdio: 'inherit' });

console.log('\n✅ Build complete!');
console.log('Output: ./release/');
```

#### Criterios de aceptación
- [ ] .exe generado y funcional
- [ ] Instalador NSIS con wizard
- [ ] Desktop shortcut creado
- [ ] App запускается без ошибок

---

## 4. Plan de Pruebas

### 4.1 Pruebas Unitarias
- Componentes React con Vitest + React Testing Library
-覆盖率 > 80% para lógica de negocio

### 4.2 Pruebas de Integración
- IPC handlers con Spectron (deprecated) o Playwright
- Pruebas E2E de flujos críticos

### 4.3 Pruebas de Flujos Críticos (agent-browser)
```bash
agent-browser open netvault://localhost
agent-browser snapshot -i
agent-browser screenshot --annotate
```

### 4.4 Checklist de pruebas manuales
- [ ] Doble panel navegación
- [ ] Copiar/cortar/pegar archivos
- [ ] Eliminar a papelera
- [ ] Terminal integrada
- [ ] Búsqueda fuzzy
- [ ] Favoritos persistentes
- [ ] Tema claro/oscuro
- [ ] Chat IA (si Ollama disponible)

---

## 5. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad de migración | Alta | Alto | Fasear implementación, milestones claros |
| Pérdida de funcionalidad | Media | Alto | Pruebas exhaustivas en cada fase |
| Rendimiento IPC Electron | Media | Medio | Minimizar llamadas IPC, caching |
| Compatibilidad con rutas UNC | Baja | Alto | Pruebas en entornos de red reales |
| IA Ollama no disponible | Media | Bajo | Graceful degradation, UI informativa |

---

## 6. Estimación de Esfuerzo

| Fase | Semanas | Días | Esfuerzo Total |
|------|---------|------|----------------|
| 1. Proyecto Base | 2 | 10 | 10 días |
| 2. UI Base | 2 | 10 | 10 días |
| 3. Operaciones Archivo | 2 | 10 | 10 días |
| 4. Terminal | 2 | 10 | 10 días |
| 5. Búsqueda | 2 | 10 | 10 días |
| 6. IA + Ollama | 2 | 10 | 10 días |
| 7. Scaffolder | 2 | 10 | 10 días |
| 8. Distribución | 2 | 10 | 10 días |
| **Total** | **16** | **80** | **80 días** |

**Nota:** Estimación basada en trabajo a tiempo completo. Incluye buffer para imprevistos (~15%).

---

## 7. Recomendación Final

**¿Empezar con la migración o mantener Python?**

Migrar tiene sentido si:
- ✅ Querés una UI moderna y atractiva
- ✅ Necesitás distribución multiplataforma
- ✅ El equipo conoce React/TypeScript
- ✅ La app va a crecer en funcionalidades

Mantener Python (tkinter) tiene sentido si:
- ⚠️ Es solo para uso personal interno
- ⚠️ No hay tiempo para la migración
- ⚠️ La app ya está funcionando bien

**Mi recomendación:** Si este es un proyecto que vas a usar todos los días y querés que crezca, la migración vale la pena. Las 16 semanas se recuperan en mejor experiencia de uso y mantenibilidad.

¿Querés que empiece con la Fase 1 o preferís discutir algún aspecto del plan primero?
