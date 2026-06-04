# NetVault - Historia y Contexto

> Documento vivo. Última actualización: 2026-06-04

## ¿Qué es NetVault?

Gestor de archivos Electron + React para Windows, construido como herramienta de desarrollo personal para el proyecto **ZYMO**. Combina exploración de archivos, terminal integrada, e inteligencia artificial local.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-------------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS |
| **Desktop** | Electron 28 |
| **Build** | Vite + tsc |
| **IA Local** | Ollama (qwen2.5-coder:7b por defecto) |
| **IA Cloud** | Claude API (fallback, requiere API key) |
| **Gráficos** | D3.js, Mermaid.js, Cytoscape.js |
| **Ofimática** | mammoth (DOCX→Markdown), pdf.js |

---

## Evolución del Proyecto

### Fase 1-3: Base del Gestor de Archivos
- Explorador de archivos dual-panel (izquierdo/derecho)
- Operaciones: copiar, cortar, pegar, renombrar, eliminar
- Barra lateral con favoritos y acceso rápido
- Menú contextual con acciones de archivo

### Fase 4: Terminal Integrada
- Terminal PowerShell/CMD dentro de Electron
- Paleta de comandos (Git, npm, Docker, Python)
- Historial de comandos
- Working directory sincronizado con panel activo

### Fase 5: Búsqueda Fuzzy
- Integración de Fuse.js para búsqueda difusa
- Filtro por extensión (.ext)
- Toggle de búsqueda fuzzy
- Resultados en tiempo real con debounce 50ms

### Fase 6: Indexador Rápido ⚡
- FastIndexer en memoria (escaneo recursivo 5 niveles)
- Índice por extensión para filtrado instantáneo
- Búsqueda por prefijo para autocomplete (<1ms)
- Algoritmo Levenshtein para fuzzy matching
- Botón "⚡ Indexar" en toolbar + contador visible

### Fase 7: AI Service (Ollama + Claude)
- Interfaz unificada para ambos proveedores
- Cambio dinámico entre Ollama/Claude
- Configuración persistente en localStorage
- Modelo default: `qwen2.5-coder:7b` (7GB VRAM)
- **Fix crítico:** Llamadas a Ollama via IPC del main process de Electron (resuelve CORS)

### Fase 8: Visualización y Documentos
- **Knowledge Graph:** Grafo de conocimiento con D3.js/Cytoscape.js
- **Flowchart Generator:** Diagramas Mermaid con export SVG/PNG
- **Document Viewer:** Visor de PDF y DOCX (conversión a Markdown)
- **AI Analyzer:** Extracción de entidades con IA
- **Export Panel:** Empaquetado de análisis a ZIP

---

## Decisiones Técnicas Importantes

### 1. Puerto de Ollama
- **Problema:** Puerto 11434 conflictuaba con otra instancia de Ollama
- **Solución:** App detecta automáticamente si el puerto está ocupado
- **Fallback:** Claude API cuando Ollama no está disponible

### 2. CORS con Ollama (Electron)
- **Problema:** fetch directo a localhost:11434 era bloqueado por CORS en navegador
- **Solución:** Llamadas via `ipcMain.handle('ollama:chat')` en main.ts → main process sin restricción CORS
- **Archivo:** `electron/main.ts` + `electron/preload.ts`

### 3. Configuración de IA
- Persistencia en localStorage (key: `netvault-ai-config`)
- Modelos Ollama: 9 opciones predefinidas (qwen2.5-coder, codellama, llama3, mistral, etc.)
- Modelos Claude: 4 opciones (Sonnet 4, 3.5, Opus, Haiku)

### 4. Tema Visual
- Fondo: `#1a1a1a`
- Acento: `#3b82f6` (azul)
- UI compacto para evitar overflow horizontal
- Responsive breakpoints: sm/lg para textos de toolbar

---

## Hardware del Usuario

| Equipo | GPU | RAM | Uso |
|--------|-----|-----|-----|
| **PC Casa** | NVIDIA RTX 3050 (7GB VRAM) | 16GB | Desarrollo principal |
| **PC Trabajo** | Intel i7 Ultra (integrada) | 8GB | Viajes |

Esto determina qué modelos de Ollama usar:
- Casa: `qwen2.5-coder:7b` (óptimo)
- Trabajo: `qwen2.5-coder:3b` o `phi3:3.8b`

---

## Ola 0 — Estabilización (2026-06-04) ✅

Corrección de 7 bugs P0 que bloqueaban el uso básico del gestor:

| # | Fix | Archivos |
|---|-----|---------|
| 0.1 | `recurseIndex` ahora indexa **archivos y carpetas** en subcarpetas (con `size`/`modified`) | `fileIndexer.ts` |
| 0.2 | `handleReindex` llama `searchService.indexDirectory(currentPath)` real | `SearchBar.tsx` |
| 0.3 | Crear archivo/carpeta: `InputDialog.onConfirm(name)` usado correctamente | `FilePanel.tsx` |
| 0.4 | `fs:copy` copia árboles recursivos; `fs:delete` borra directorios con `fs.rm` | `electron/main.ts` |
| 0.5 | Quick access carga rutas reales vía `app.getPath()` IPC `system:getPaths` | `App.tsx`, `main.ts` |
| 0.6 | `LICENSE.txt` creado (MIT); `electron-builder.yml` deja de fallar | `LICENSE.txt` |
| 0.7 | `scripts/build-info.js` path corregido a `../package.json` | `scripts/build-info.js` |

## Ola 1 — Indexador en Main Process (2026-06-04) ✅

Movimiento del indexador al main process para eliminar N IPC calls y añadir Fuse.js:

| # | Feature | Notas |
|---|---------|-------|
| 1.1 | IPC `index:scan` — escanea árbol en main con `Promise.all` stats | `electron/main.ts` |
| 1.2 | Caché JSON en `%APPDATA%/NetVault/index-cache.json` | `electron/main.ts` |
| 1.3 | **Fuse.js** reemplaza Levenshtein en renderer; `loadEntries()` en FastIndexer | `fileIndexer.ts`, `searchService.ts` |
| 1.4 | `autoIndex` debounced (800ms) en App.tsx al cambiar path activo | `App.tsx` |
| 1.5 | `scripts/bench-index.mjs` — benchmark Node.js (baseline para Rust Fase 9) | `scripts/bench-index.mjs` |
| 1.6 | `fs:readDir` ahora retorna `size` + `modified` (stat en paralelo) | `electron/main.ts` |

> **Fuse.js (fase 5):** confirmado integrado en renderer como motor de búsqueda fuzzy.  
> **Levenshtein manual:** eliminado, sustituido por Fuse.js threshold 0.35.

## Ola 2 — Layout Workbench (2026-06-04) ✅

Remodelación de UI basada en `INVESTIGACION_UI_NETVAULT.md` (VS Code workbench pattern):

| # | Componente | Descripción |
|---|-----------|-------------|
| 2.1 | `ActivityBar` | Barra lateral izquierda: Explorador, Búsqueda, Análisis, Grafo, Sync |
| 2.2 | Sidebar contextual | Contenido de sidebar cambia según vista activa |
| 2.3 | Tab bar | Pestañas en área central: Archivos + DocumentViewer por tab (no modal) |
| 2.4 | `SecondarySidebar` | Panel secundario derecho para resultados de análisis (placeholder) |
| 2.5 | `StatusBar` | Barra de estado: ruta, índice, sync placeholder, costo placeholder, `⌘K` |
| 2.6 | `CommandPalette` | Paleta de comandos `Ctrl+K` con búsqueda, ↑↓ navegación, grupos |
| 2.7 | `App.tsx` workbench | Layout completo: ActivityBar + PrimarySidebar + CentralTabs + StatusBar |

> **Toolbar anterior eliminada** — sus funciones migradas a CommandPalette y ActivityBar.  
> **DocumentViewer**: ahora abre como pestaña, no como modal.  
> **Ollama**: sigue disponible en `AIChat` pero marcado para migración a proxy servidor (Ola 3).

---

## Fases Futuras (Plan)

### Ola 3: Servidor + Auth (próxima)
- Proyecto `server/` Express+TS: `/health`, `/auth/login`, `/analysis/run`
- JWT en main process, sin API keys en renderer
- Proxy Claude vía servidor (no directo desde `.exe`)

### Fase 9 / Ola 6: Rust Fast-Indexer ⚙️
- Crate `fast-indexer` (NDJSON stdout)
- Objetivo: >100K archivos/s SSD
- Benchmark baseline: `scripts/bench-index.mjs`
- **Precondición: Ola 1 bench documentado** ✅

> El usuario expresó interés en Rust/Go/C++ pero no tiene experiencia. Recomendación: Rust por ecosistema (cargo, crates.io, buena integración con Node).

---

## Mejoras UX/UI Implementadas ✅

### Sistema de Iconos (Lucide React)
- Reemplazo de emojis por iconos vectoriales profesionales
- Iconos dinámicos según tipo de archivo (carpeta, documento, imagen, video, código, etc.)
- Consistencia visual en toda la aplicación

### Animaciones y Micro-interacciones
- **Transiciones suaves**: Hover con scale, translate, y cambios de color
- **Animaciones de entrada**: Fade-in, slide-up, slide-right
- **Feedback visual**: Estados activos con indicadores pulsantes
- **Easing functions**: Custom cubic-bezier para movimiento natural

### CSS Global Mejorado
```css
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

### Toolbar Rediseñada
- Logo con gradiente y sombra
- Agrupación de herramientas por función
- Dropdown para herramientas IA
- Indicadores de estado activo
- Shortcuts visibles

### Sidebar Mejorado
- Animación de entrada slide-right
- Hover con translate-x
- Stagger animations en items
- Footer con branding
- Botones para agregar favoritos/acceso rápido

### ContextMenu Mejorado
- Animación de entrada con scale + opacity
- Backdrop blur
- Hover con translate-x
- Shortcuts visibles
- Accesibilidad (role, aria)

### FileItem Mejorado
- Iconos dinámicos por tipo de archivo
- Acciones rápidas visibles en hover
- Indicador de selección animado
- Soporte de teclado (Enter, Delete, F2)

### Componentes Personalizados
- `.btn-primary`, `.btn-secondary`, `.btn-icon`
- `.list-item`, `.list-item.selected`
- `.toast-success`, `.toast-error`, `.toast-warning`
- `.animate-fade-in`, `.animate-slide-up`, `.animate-scale`

---

## Commits Principales (Branch zelda)

---

## Commits Principales (Branch zelda)

```
af5d700 fix(ai): use Electron main process IPC to call Ollama (bypasses CORS)
dbafb71 fix(ai): use Vite proxy for Ollama to bypass CORS
48a7e79 fix(ai): change Ollama default port to 11435 to avoid conflicts
e5a90ea docs: add Ollama setup instructions
aec663e feat(ai): add configurable AI settings with localStorage persistence
877d64d fix(ui): compact toolbar buttons and prevent horizontal overflow
7c618f0 feat: Phase 6 - Ultra-fast file indexer and AI service abstraction
984d3dc feat: Phase 5 - Fuzzy search with Fuse.js
00cfe59 feat: Phase 4 - Enhanced terminal with command palette
cf3cfee feat: Phase 3 - file operations with clipboard
```

---

## Estructura del Proyecto

```
net_file_manager/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ai/              # AIChat, AISettings, Scaffolder
│   │   ├── analyzer/        # AnalyzerPanel
│   │   ├── document/        # DocumentViewer
│   │   ├── export/          # ExportPanel
│   │   ├── flowchart/       # FlowchartGenerator, FlowchartPanel
│   │   ├── graph/           # KnowledgeGraph, GraphPanel
│   │   ├── layout/          # Sidebar, Toolbar
│   │   ├── search/          # SearchBar
│   │   ├── terminal/        # Terminal
│   │   ├── file-panel/      # FilePanel, FileList, FileItem
│   │   └── common/          # ContextMenu, InputDialog
│   ├── services/
│   │   └── indexer/          # FastIndexer, aiService, aiConfig
│   └── types/               # Definiciones de tipos
├── electron/
│   ├── main.ts             # Main process (incluye handler ollama:chat)
│   └── preload.ts          # Context bridge
├── dist/                   # Build output
├── dist-electron/          # Electron build output
└── OLLAMA_INSTRUCTIONS.md   # Guía de setup para usuarios
```

---

## Cómo Funciona la IA

### Flujo de una pregunta al chat:

1. Usuario escribe mensaje en `AIChat.tsx`
2. `aiService.chat(messages)` es llamado
3. Si provider = `ollama`:
   - Llama a `window.electronAPI.chatWithOllama(model, messages)`
   - IPC → `electron/main.ts` → `ipcMain.handle('ollama:chat')`
   - Main process hace `fetch('http://localhost:11434/api/chat')`
   - Respuesta vuelve por IPC al renderer
4. Si provider = `claude`:
   - Fetch directo a `https://api.anthropic.com/v1/messages`
   - Requiere API key en config

### Configuración de IA

```typescript
// localStorage key: netvault-ai-config
{
  provider: 'ollama' | 'claude',
  model: string,
  apiKey?: string
}
```

---

## Problemas Conocidos y Soluciones

| Problema | Solución |
|----------|----------|
| CORS al llamar Ollama desde renderer | IPC через main process (`ollama:chat`) |
| Puerto 11434 ocupado | Detección automática + fallback a Claude |
| Overflow horizontal en toolbar | Botones compactos + overflow-x: hidden |
| Build lento (1.5MB bundle) | Code splitting con manualChunks |

---

## shortcuts de Desarrollo

```powershell
npm run dev          # Dev server (http://localhost:5173)
npm run electron:dev # Dev + Electron
npm run build        # Production build
```

---

## Para Nuevo Desarrollador

1. `npm install`
2. `npm run build` (verifica que compila)
3. `npm run electron:dev` (prueba la app)
4. Para IA: asegurar que Ollama esté corriendo en `localhost:11434`
5. Ver `OLLAMA_INSTRUCTIONS.md` para setup de Ollama

---

*Este documento se actualiza automáticamente con cada sesión de desarrollo.*