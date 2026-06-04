# Servicios de datos — NetVault

## `fileService.ts`

Fachada del renderer sobre `electronAPI`.

| Método | Descripción |
|--------|-------------|
| `readDirectory` | Lista un nivel |
| `getStats` | Metadatos archivo |
| `copyFile` / `moveFile` | Operaciones |
| `deleteFile` | Papelera o permanente |
| `renameFile` | Solo nuevo nombre (mismo directorio) |
| `createFolder` / `createFile` | Creación |
| `openFile` | App predeterminada SO |
| `showInFolder` | — |
| `getConfig` / `saveConfig` | Merge con config actual |
| `showOpenFolderDialog` | Diálogo nativo |
| `showDeleteConfirmation` | 2 botones papelera |
| `showOverwriteConfirmation` | skip / overwrite / cancel |
| `getFileName`, `getParentPath`, `joinPath` | Utilidades rutas Windows `\` |
| `formatFileSize`, `formatDate` | UI |
| `getFileIcon` | Emoji por extensión (legacy; FileItem usa Lucide) |
| `isValidFileName` | Caracteres prohibidos Windows |

Export: `getConfig`, `setConfig` (clave suelta).

## `searchService.ts`

| Método | Descripción |
|--------|-------------|
| `indexDirectory(path)` | Delega a `fastIndexer`, depth 5 |
| `search(query, options)` | Resultados con score 0, source `index` |
| `prefixSearch` | Autocomplete por prefijo |
| `getStats` | Stats del indexador |
| `clear` | Vacía índice |
| `autoIndex` | Si path ≠ último, reindexa — **no usado** |
| `searchWithAI` | Ollama + merge — **no usado en UI** |

## `fileIndexer.ts` — FastIndexer

- Estructura: `Map<path, IndexedFile>` + índice por extensión.
- `search`: filtro O(n) sobre todos los valores.
- `debounce` exportado (duplicado en searchService).

## `documentService.ts`

| Función | Descripción |
|---------|-------------|
| `pdfToMarkdown` | pdf.js página a página |
| `docxToMarkdown` | mammoth |
| `mdToMarkdown` | Lee + frontmatter |
| `convertToMarkdown` | Router por extensión |
| `isSupported` | .pdf .docx .doc .md |
| `getFileType` | Tipo enum |
| `generateFrontmatter` | YAML metadatos procedimiento |

## `aiService.ts` + `aiConfig.ts`

- Provider ollama | claude.
- Inicialización explícita antes de chat.
- Config en localStorage vía hook.

## Persistencia

| Dato | Ubicación |
|------|-----------|
| App config | `%APPDATA%/NetVault/config.json` |
| AI config | `localStorage` `netvault-ai-config` |
| Índice archivos | Solo RAM (se pierde al cerrar) |
