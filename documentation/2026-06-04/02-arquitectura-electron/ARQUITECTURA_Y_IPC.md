# Arquitectura Electron e IPC — NetVault

## Procesos

| Proceso | Responsabilidad |
|---------|-----------------|
| **Main** (`electron/main.ts` → `dist-electron/main.js`) | FS, diálogos, config en disco, terminal `exec`, Ollama fetch, detección editores |
| **Preload** (`electron/preload.ts`) | `contextBridge.exposeInMainWorld('electronAPI', …)` |
| **Renderer** (`src/` → Vite → `dist/`) | React UI; **sin** `nodeIntegration` |

## Seguridad actual

- `contextIsolation: true`
- `nodeIntegration: false`
- Renderer accede a disco **solo** vía `window.electronAPI`

**Excepciones actuales (deuda):**

- Claude API: `fetch` desde renderer con API key en `localStorage`
- `DocumentViewer`: `navigator.clipboard` en renderer
- Dev sin Electron: mock completo de API en `App.tsx`

## Canales IPC completos

### Sistema de archivos

| Canal | Parámetros | Retorno / efecto |
|-------|------------|------------------|
| `fs:readDir` | `dirPath` | `{ name, path, isDirectory, isFile }[]` |
| `fs:stats` | `filePath` | size, fechas, isDirectory |
| `fs:copy` | src, dst | `copyFile` (solo archivos) |
| `fs:move` | src, dst | `rename` |
| `fs:delete` | path, permanent | trash o unlink |
| `fs:mkdir` | path | recursive |
| `fs:writeFile` | path, content utf-8 | — |
| `fs:readFile` | path | Buffer/string |
| `fs:open` | path | `shell.openPath` |
| `fs:exists` | path | boolean |
| `fs:rename` | oldPath, newName | newPath |
| `fs:showInFolder` | path | Explorador Windows |
| `fs:showProperties` | path | PowerShell o fallback explorer |
| `fs:getClipboard` | — | texto |
| `fs:setClipboard` | text | — |

### Diálogos

| Canal | Uso |
|-------|-----|
| `dialog:openFolder` | Carpeta |
| `dialog:openFile` | Archivo con filtros |
| `dialog:saveFile` | Guardar |
| `dialog:message` | MessageBox nativo |

### Config

| Canal | Uso |
|-------|-----|
| `config:getPath` | userData path |
| `config:read` | JSON objeto |
| `config:write` | Sobrescribe config.json |

### Terminal

| Canal | Uso |
|-------|-----|
| `terminal:execute` | cmd + cwd → stdout/stderr string |

### IA

| Canal | Uso |
|-------|-----|
| `ollama:chat` | model, messages[] → `{ success, content?, error? }` |

### Editores

| Canal | Uso |
|-------|-----|
| `editors:detect` | Lista { name, path, icon } |
| `editors:openWith` | editorPath, filePath |

## Flujo de datos típico (listar carpeta)

```
FilePanel.loadDirectory
  → fileService.readDirectory
    → electronAPI.readDirectory (preload)
      → ipc invoke fs:readDir
        → fs.promises.readdir + withFileTypes
```

## Objetivo de remodelación (brief)

- Mover indexación y `apiClient` servidor al **main**
- JWT en memoria main, no localStorage
- Renderer solo UI + IPC tipado
