# Catálogo completo de funcionalidades — NetVault (estado actual)

Documento de referencia para desarrollo paralelo. Describe **qué existe hoy en el código**, cómo se activa cada función, qué esperar y qué limitaciones tiene en la práctica.

---

## 1. Resumen ejecutivo

NetVault es una aplicación de escritorio **Windows** empaquetada con **Electron 33** y UI **React 18 + TypeScript + Tailwind**. Funciona como:

- Gestor de archivos **dual panel** (izquierdo / derecho).
- Barra lateral con acceso rápido y favoritos.
- Barra superior con búsqueda, indexación, terminal, IA y herramientas en modales.
- Capa de **IA local (Ollama)** vía proceso main, con opción **Claude API** desde el renderer (API key en `localStorage`).
- Herramientas auxiliares: visor de documentos, flujogramas Mermaid, grafo de conocimiento, analizador de texto, export ZIP, generador de proyectos (Scaffolder).

**No implementado aún (visión en `NETVAULT_BRIEF.md`):** servidor proxy Claude, sync entre usuarios, formato único de procedimientos, carpetas T&C/P&C/Transportes, aprobación e ingest a intranet.

---

## 2. Arranque y ciclo de vida de la aplicación

### 2.1 Modos de ejecución

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Solo Vite en `http://localhost:5173` — UI sin Electron real; se inyecta **mock** de `electronAPI` |
| `npm run electron:dev` | Vite + Electron; carga URL dev; **DevTools abiertos** automáticamente |
| `npm run build` | `tsc` + `vite build` + compila `electron/` → `dist/` + `dist-electron/` |
| `npm run dist` | Build + instalador NSIS/portable (`electron-builder.yml`) |

### 2.2 Ventana principal (`electron/main.ts`)

- Tamaño inicial: 1400×900 px; mínimo 1100×700.
- Fondo: `#1a1a1a`.
- `contextIsolation: true`, `nodeIntegration: false`.
- Producción: carga `dist/index.html`; desarrollo: `http://localhost:5173`.
- Se muestra tras evento `ready-to-show`.

### 2.3 Pantalla de carga (`App.tsx`)

- Mientras `window.electronAPI` no está listo (solo en mock dev), muestra “Cargando NetVault…”.
- En Electron real, `ready` pasa a `true` y carga configuración.

### 2.4 Configuración persistente de la app

**Ubicación:** `%APPDATA%/NetVault/config.json` (vía `app.getPath('userData')`).

**Campos usados:**

| Campo | Uso |
|-------|-----|
| `lastLeftPath` | Última ruta panel izquierdo |
| `lastRightPath` | Última ruta panel derecho |
| `favorites` | Array de rutas favoritas |
| `quickAccess` | Accesos rápidos (icono, label, path) — también en estado React inicial |
| `theme` | Definido en tipos; **toggle de tema no persiste** hoy |
| `terminalVisible` | En tipos; no sincronizado con UI al reiniciar |

**API:** `fileService.getConfig()` / `saveConfig()` → IPC `config:read` / `config:write`.

---

## 3. Layout general de la interfaz

```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR: logo, Abrir, Indexar, Terminal, AI, menú IA, búsqueda │
├──────────┬──────────────────────────────────┬───────────────────┤
│ SIDEBAR  │ PANEL IZQUIERDO (FilePanel)      │ PANEL DERECHO     │
│          │                                  │ o Terminal        │
│ Acceso   │ PathNavigator + lista archivos   │ o AIChat (396px)  │
│ rápido   │                                  │                   │
│ Favoritos│                                  │                   │
├──────────┴──────────────────────────────────┴───────────────────┤
│ STATUS BAR: estado, portapapeles, panel activo                  │
└─────────────────────────────────────────────────────────────────┘
        Modales superpuestos: Scaffolder, DocumentViewer, Graph,
        Flowchart, Analyzer, Export
```

### 3.1 Panel activo

- Clic en un `FilePanel` → `activePanel` = `'left' | 'right'`.
- Atajos globales, terminal, indexación y rutas de “carpeta actual” usan el panel activo.
- Indicador visual: borde azul, punto pulsante en cabecera del panel.

### 3.2 Panel derecho: tres modos mutuamente excluyentes

| Modo | Activación | Contenido |
|------|------------|-----------|
| Explorador | Por defecto | `FilePanel` derecho |
| Terminal | Toolbar → Terminal o tecla `` ` `` | `Terminal.tsx` reemplaza panel derecho |
| AI Chat | Toolbar → AI Assistant | `AIChat.tsx` ancho fijo ~384px (`w-96`) |

---

## 4. Barra superior (`Toolbar.tsx`)

### 4.1 Marca y acciones primarias

| Control | Acción | Detalle |
|---------|--------|---------|
| Logo “N” | — | Gradiente azul–violeta |
| **Abrir** | `Ctrl+O` | `dialog:openFolder` → actualiza ruta del panel **activo** |
| **Indexar** | Clic | `searchService.indexDirectory(currentPath)`; icono pulsa mientras indexa (~500 ms mínimo visual) |

### 4.2 Vista

| Control | Acción |
|---------|--------|
| **Terminal** | Alterna terminal en panel derecho; estado activo resaltado en azul |
| **AI Assistant** | Alterna chat IA en panel derecho |

### 4.3 Menú “Herramientas IA” (hover dropdown)

| Ítem | Acción real |
|------|-------------|
| Scaffolder | **`onClick` vacío** — no abre nada desde aquí |
| Grafo | Abre modal `GraphPanel` |
| Flujograma | Abre modal `FlowchartPanel` |
| Analizador | Abre modal `AnalyzerPanel` |
| Exportar | Abre modal `ExportPanel` con **datos de ejemplo** (`createSampleExportData`) |

### 4.4 Búsqueda integrada (`SearchBar`)

Ver sección 6 (Búsqueda e indexación).

### 4.5 Portapapeles en toolbar

Si hay elementos en portapapeles interno de la app:
- Muestra icono copiar/cortar + cantidad.
- Botón × limpia portapapeles (`onClipboardClear`).

### 4.6 Tema

- Botón luna → `document.documentElement.classList.toggle('dark')`.
- **No guarda** preferencia en `config.json`.

---

## 5. Barra lateral (`Sidebar.tsx`)

### 5.1 Colapsar

- Sidebar cerrada: solo botón hamburguesa para expandir.

### 5.2 Acceso rápido

**Valores por defecto en `App.tsx`:**

| Label | Ruta (hardcodeada) |
|-------|-------------------|
| Este equipo | `C:\` |
| Descargas | `C:\Users\User\Downloads` |
| Documentos | `C:\Users\User\Documents` |
| Disco D: | `D:\` |

**Problema:** `User` no es el usuario de Windows real en la mayoría de equipos.

- Clic en ítem → navega panel activo.
- Menú contextual: abrir en explorador Windows, copiar ruta, copiar/cortar/pegar (sobre la ruta como “archivo”), quitar de acceso rápido.
- Cambios en quick access se guardan en `config.json`.

### 5.3 Favoritos

- Lista de rutas guardadas en config.
- Clic → navegación.
- Context menu: mismas acciones que acceso rápido + quitar favorito.
- **No hay botón visible en FilePanel** para “agregar a favoritos” en esta versión (solo gestión si ya existen en config).

### 5.4 Iconos

- Emojis en datos → mapeados a iconos **Lucide** en UI.

---

## 6. Búsqueda e indexación

### 6.1 Componentes

- `SearchBar.tsx` — UI.
- `searchService.ts` — fachada.
- `fileIndexer.ts` — `FastIndexer` en memoria (singleton `fastIndexer`).

### 6.2 Indexación (`fastIndexer.indexDirectory`)

**Parámetros:** ruta, `maxDepth` (default **5** en `searchService`).

**Proceso:**

1. `readDirectory` vía IPC por cada carpeta visitada (desde **renderer**).
2. Primer nivel: cada entrada se guarda en `Map<path, IndexedFile>`.
3. Subcarpetas: `recurseIndex` — **solo incrementa contador de directorios y baja profundidad; no registra archivos en subcarpetas** (bug conocido).

**Datos por archivo indexado:**

- `name`, `path`, `isDirectory`, `size` (suele ser 0 — IPC no envía size), `modified` (default `new Date()`), `extension`.

**Índice secundario:** `extensionsIndex` — `Map<ext, Set<path>>`.

### 6.3 Botón Indexar (toolbar)

- Indexa **`currentPath`** del panel activo.
- No muestra toast de éxito; errores en consola.

### 6.4 Botón Reindexar (↻ en SearchBar)

- **Solo ejecuta `searchService.clear()`** — vacía índice.
- **No vuelve a escanear** la carpeta actual.

### 6.5 Búsqueda por nombre (`searchService.search`)

| Opción | Comportamiento |
|--------|----------------|
| `query` | Filtra por nombre (lower case) |
| `fuzzy: true` | `includes` o Levenshtein truncado (20 chars) con umbral 0.5 |
| `fuzzy: false` | `startsWith` |
| `extensions` | Filtra primero por extensión en índice (`.ext`) |
| `maxResults` | Default 50 en toolbar flow; SearchBar usa 20 |

**Nota:** `fuse.js` está en `package.json` pero **no se importa** en el código.

### 6.6 Contador 📇 en SearchBar

- Poll cada 5 s de `searchService.getStats()` → muestra `totalFiles` del índice.

### 6.7 `searchWithAI` (no expuesto en UI)

- Llama Ollama para “reinterpretar” query y fusionar resultados.
- **Ningún componente lo invoca** actualmente.

### 6.8 `autoIndex`

- Existe en `searchService` pero **no se llama** al cambiar de carpeta en `FilePanel`.

### 6.9 Resultado de búsqueda → navegación

- Al elegir resultado en toolbar: si es archivo, abre carpeta padre; si es carpeta, navega ahí (`handleSearchSelect`).

---

## 7. Panel de archivos (`FilePanel.tsx` + `FileItem.tsx` + `PathNavigator.tsx`)

### 7.1 PathNavigator

| Control | Función |
|---------|---------|
| Input ruta + Enter | `handleNavigate` — actualiza path y historial |
| Atrás | Historial interno del panel (`history` / `historyIndex`) |
| Adelante | Idem |
| Subir | `fileService.getParentPath` + `\` |

**Historial:** independiente por panel (izq/der).

### 7.2 Listado de carpeta

- `fileService.readDirectory(path)` → lista inmediata (un nivel).
- Orden: orden de `readdir` del SO.
- Estados: loading, vacío, lista de `FileItem`.

### 7.3 Selección

| Input | Comportamiento |
|-------|----------------|
| Clic simple | Selección única |
| Ctrl + clic | Toggle en selección múltiple |
| Shift + clic | Rango desde último seleccionado en lista visible |

### 7.4 Doble clic

- **Carpeta:** entra (`handleNavigate`).
- **Archivo:** si extensión soportada por `documentService.isSupported` → `onFileOpen` → modal `DocumentViewer`; si no, `fileService.openFile` (app predeterminada del SO).

**Soportados para visor:** `.pdf`, `.docx`, `.doc`, `.md` (según `documentService`).

### 7.5 Cabecera del panel

| Botón | Función |
|-------|---------|
| 📁+ | Diálogo crear carpeta |
| 📄+ | Diálogo crear archivo |
| 📂 | Diálogo abrir otra carpeta en este panel |

### 7.6 Portapapeles interno (no es el del SO para archivos)

| Acción | Flujo |
|--------|-------|
| Copiar | `onClipboardChange({ action: 'copy', paths })` |
| Cortar | `action: 'cut'` |
| Pegar | Por cada path: `joinPath(panelActual, fileName)`; si existe → diálogo sobrescribir/omitir/cancelar; `copyFile` o `moveFile` |

**Limitación IPC:** `fs:copy` usa `copyFile` — **solo archivos**, no árboles de carpetas.

### 7.7 Eliminar

- Por cada seleccionado: `showDeleteConfirmation` → `deleteFile(path)` sin flag permanente explícito en UI del panel → usa **papelera** (`shell.trashItem`) por default en IPC.

### 7.8 Renombrar

- `InputDialog` → `renameFile(oldPath, newName)` → IPC `fs:rename`.

### 7.9 Crear archivo / carpeta

- Modal `InputDialog` con validación `fileService.isValidFileName`.
- **Bug:** `onConfirm` en crear **no recibe** el nombre del diálogo; limpia `createName` y llama `handleCreate()` con estado vacío → **falla en la práctica**.

### 7.10 FileItem — menú contextual y teclado

- Abrir, Copiar, Cortar, Pegar (si hay portapapeles), Renombrar (F2), Eliminar (Del), Mostrar en explorador.
- Iconos Lucide por tipo de archivo.
- Hover: botones rápidos copiar/cortar.

### 7.11 Barra de estado del panel

- Cuenta elementos listados, seleccionados, estado portapapeles.

---

## 8. Atajos de teclado globales (`App.tsx`)

| Atajo | Acción |
|-------|--------|
| `Ctrl+O` | Abrir carpeta (panel activo) |
| `Ctrl+F` | Focus en input búsqueda (placeholder “Buscar”) |
| `` ` `` | Toggle terminal |
| `Ctrl+C/X/V/A` | Comentarios en código — **manejo real en FilePanel** (no todos implementados globalmente) |

`Delete`, `F2`: pensados para FilePanel con foco en ítem.

---

## 9. Terminal integrada (`Terminal.tsx`)

### 9.1 Modelo de ejecución

- **No es PTY interactivo** — cada comando es `exec` en PowerShell/CMD vía `terminal:execute` con `cwd`.
- Salida: stdout o stderr como texto plano en buffer de líneas.

### 9.2 Comandos internos (procesados en renderer)

| Comando | Efecto |
|---------|--------|
| `cls` / `clear` | Limpia buffer |
| `help` | Texto de ayuda |
| `pwd` | Muestra `cwd` |
| `cd <path>` | Actualiza `cwd` local + `onCwdChange` → sincroniza panel activo en App |

### 9.3 Comandos externos

- Cualquier otro → IPC `executeCommand(cmd, cwd)`.

### 9.4 Paleta de comandos rápidos (`Ctrl+K`)

Categorías precargadas: Git, Node, Docker, Python, Common (ver array `QUICK_COMMANDS` en archivo).

- Búsqueda filtra por nombre/comando/categoría.
- Enter inserta comando en input.

### 9.5 Historial

- Flechas ↑/↓ recorren `commandHistory`.

### 9.6 UI

- Prompt estilo `PS {cwd}>`.
- Botón cerrar → vuelve panel derecho a FilePanel.

---

## 10. Inteligencia artificial

### 10.1 Configuración (`aiConfig.ts` + `AISettings.tsx`)

**Persistencia:** `localStorage` key `netvault-ai-config`.

| Campo | Descripción |
|-------|-------------|
| `provider` | `'ollama' \| 'claude'` |
| `model` | ID modelo |
| `apiKey` | Solo Claude |
| `baseUrl` | Ollama (default `http://localhost:11434`) |

**Hook:** `useAIConfig()` — carga al montar, `updateConfig` guarda.

**AISettings modal:** prueba conexión Ollama (`/api/tags`) o Claude (POST mínimo a Anthropic).

### 10.2 Servicio unificado (`aiService.ts`)

| Provider | Ruta técnica |
|----------|----------------|
| Ollama | `electronAPI.chatWithOllama` → main `fetch localhost:11434/api/chat` |
| Claude | `fetch` directo desde renderer a `api.anthropic.com` con `x-api-key` |

**Mensajes:** array `{ role, content }`.

### 10.3 Chat (`AIChat.tsx`)

- Panel lateral con historial de mensajes.
- System prompt fijo: asistente de coding en español.
- Si `projectPath`: prefijo de contexto con ruta (texto), **no lee archivos del disco automáticamente**.
- Estados: checking / ready / unavailable.
- Acciones: limpiar chat, abrir Scaffolder, cerrar.
- Enter envía; Shift+Enter nueva línea en textarea.

### 10.4 Contexto de proyecto (`AIContext.tsx`)

- Modal: indexa `projectPath` con depth 3.
- Filtra extensiones “clave” (.ts, .py, .md, etc.).
- Preselecciona `package.json`, `README.md`, `tsconfig.json`, `requirements.txt` si existen.
- Máximo 50 archivos en UI.
- **No conecta** la selección al chat ni a análisis posterior.

### 10.5 Scaffolder (`Scaffolder.tsx` + `templates.ts`)

**Flujo wizard:**

1. Categoría: Backend | Frontend | Full Stack | Desktop | Other  
2. Plantilla (7 definidas): FastAPI+SQLModel, React+Vite+Tailwind, NestJS, Electron app, Next.js, Python CLI, Go API  
3. Opciones por plantilla (git, docker, readme, etc.)  
4. Nombre de proyecto  
5. Creación: escribe árbol de archivos en `{destinationPath}\{projectName}` vía `createFolder` + `createFile`

**Variables en plantillas:** `{{name}}`, `{{Name}}`, etc. (`processTemplateFiles`).

**Entrada:** botón 🧱 en AIChat (no desde menú toolbar Scaffolder).

---

## 11. Visor de documentos (`DocumentViewer.tsx` + `documentService.ts`)

### 11.1 Formatos

| Tipo | Motor |
|------|--------|
| PDF | pdf.js (worker desde CDN cloudflare) |
| DOCX | mammoth → HTML/Markdown |
| MD | lectura directa + frontmatter YAML (`js-yaml`) |

### 11.2 Funciones del modal

- Carga y conversión a Markdown para vista.
- Render Markdown simplificado (regex → HTML inline en componente).
- Copiar Markdown al portapapeles del navegador.
- Export: guarda `.md` junto al original (reemplaza extensión).
- Muestra metadatos de conversión si éxito.

### 11.3 Apertura

- Doble clic en archivo soportado desde FilePanel.

---

## 12. Generador de flujogramas (`FlowchartPanel` + `FlowchartGenerator.tsx`)

- Modal pantalla casi completa.
- Editor de código **Mermaid** en vivo.
- Preview renderizado (librería `mermaid`).
- Export SVG/PNG desde generador (callback `onExport` en panel hoy solo `console.log`).
- Plantillas de diagrama incluidas en generador (flowchart, sequence, etc.).

---

## 13. Grafo de conocimiento (`GraphPanel` + `KnowledgeGraph.tsx`)

- Modal con visualización **D3.js** / grafo interactivo.
- Carga datos de ejemplo con botón “Cargar ejemplo” (nodos/edges demo).
- Export SVG del SVG renderizado.
- Export JSON del estado `graphData`.
- Clics en nodos/aristas: handlers vacíos (stub).
- **No lee** datos de proyecto real ni intranet.

---

## 14. Analizador IA (`AnalyzerPanel.tsx`)

1. Usuario elige archivo local (`<input type="file">`).
2. `FileReader.readAsText` — **texto plano**; PDF/DOCX no pasan por mammoth aquí.
3. Botón analizar → prompt largo a `aiService.chat` pidiendo JSON con entidades, procedimientos, resumen, opcional Mermaid.
4. Parseo JSON de respuesta → pestañas UI: entidades, procedimientos, flujograma embebido.
5. Requiere Ollama/Claude configurado.

**Uso:** prototipo de extracción; no guarda formato único en carpeta ni llama servidor.

---

## 15. Exportación (`ExportPanel.tsx`)

- Recibe objeto `ExportData` (desde App: **sample hardcodeado**).
- Formatos ZIP opcionales: JSON, Markdown, SVG, CSV.
- Estructura ZIP: README, `analysis/`, `documents/`, `graph/`, `export/metadata.json`.
- Descarga vía `file-saver` + `jszip`.

---

## 16. Detección de editores (`editors:detect` / `editors:openWith`)

- Main process busca VS Code, Notepad++, Sublime, Atom, Vim, Emacs, etc.
- `where` en PATH o búsqueda PowerShell en Program Files.
- `openWithEditor`: `start "" editor file` en cmd.
- **No hay UI** en FileItem “Abrir con…” con lista de editores aún (IPC existe, UI limitada a “Abrir con…” genérico).

---

## 17. Diálogos nativos (Electron)

| IPC | Uso en app |
|-----|------------|
| `dialog:openFolder` | Toolbar Abrir, FilePanel 📂 |
| `dialog:openFile` | Filtros pdf/docx/md — poco usado en UI principal |
| `dialog:saveFile` | Export y otros |
| `dialog:message` | Confirmaciones borrar, sobrescribir, etc. |

---

## 18. Dependencias npm relevantes (funcionalidad)

| Paquete | Uso real en código |
|---------|-------------------|
| react / react-dom | UI |
| electron | Desktop |
| tailwindcss | Estilos |
| lucide-react | Iconos toolbar/sidebar/files |
| mammoth, pdfjs-dist, js-yaml | Documentos |
| mermaid | Flujogramas |
| d3 | Grafo |
| jszip, file-saver | Export ZIP |
| @anthropic-ai/sdk | Declarado; Claude vía fetch en aiService |
| fuse.js | **No usado** |
| sql.js | **No usado** |
| uuid | Uso puntual si existe en export/graph |

---

## 19. Mapa rápido: función → archivo

| Función usuario | Archivo principal |
|-----------------|-------------------|
| Layout app | `src/App.tsx` |
| Toolbar | `src/components/layout/Toolbar.tsx` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| Explorador | `src/components/file-panel/FilePanel.tsx` |
| Búsqueda | `src/components/search/SearchBar.tsx` |
| Indexador | `src/services/indexer/fileIndexer.ts` |
| Terminal | `src/components/terminal/Terminal.tsx` |
| Chat IA | `src/components/ai/AIChat.tsx` |
| Scaffolder | `src/components/ai/Scaffolder.tsx` |
| Documentos | `src/components/document/DocumentViewer.tsx` |
| FS + IPC | `electron/main.ts`, `electron/preload.ts` |
| Config app | IPC `config:*` |

---

## 20. Relación con la visión ZYMO (`NETVAULT_BRIEF.md`)

| Función actual | ¿Alineada al brief? |
|----------------|---------------------|
| Dual panel + ops archivos | Sí (base del gestor) |
| Búsqueda por nombre | Parcial (índice incompleto) |
| Búsqueda full-text contenido | No |
| Preview docx/pdf/md | Sí |
| Mermaid local | Sí (falta diff vs original del procedimiento) |
| IA Ollama/Claude local | **Transitoria** — brief exige servidor |
| Analizador / Export / Graph | Prototipos — no formato único ni sync |
| Estructura T&C / `_meta.json` | No |
| Aprobación + ingest | No |

---

*Documento generado para trabajo en paralelo. Actualizar cuando se cierren bugs de la ola 0 del plan de remodelación.*
