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

## Fases Futuras (Plan)

### Fase 9: Rust Fast-Indexer ⚙️
- Indexador de archivos en Rust para máximo rendimiento
- Objetivo: indexar >100K archivos en <1 segundo
- bindings via npm para integración con Electron
- **Pendiente de implementación**

> El usuario expresó interés en Rust/Go/C++ pero no tiene experiencia. Recomendación: Rust por ecosistema (cargo, crates.io, buena integración con Node).

### Mejoras UI Pendientes
- Rediseño de componentes con skill `frontend-design`
- Animaciones y micro-interacciones
- Typography personalizada
- Review con `web-design-guidelines` antes de commits

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