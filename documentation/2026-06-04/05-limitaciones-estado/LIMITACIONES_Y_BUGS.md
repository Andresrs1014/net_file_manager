# Limitaciones, bugs y gaps — NetVault (2026-06-04)

Lista para coordinar con el plan de remodelación (`plans/PLAN_REMODELACION_EJECUCION.md`).

## P0 — Funcionalidad rota

| ID | Problema | Ubicación |
|----|----------|-----------|
| B1 | Indexador no registra archivos en subcarpetas | `fileIndexer.recurseIndex` |
| B2 | Reindexar solo borra índice | `SearchBar.handleReindex` |
| B3 | Crear archivo/carpeta no funciona | `FilePanel` + `InputDialog` onConfirm |
| B4 | Copiar/pegar carpetas falla | `fs:copy` |
| B5 | Eliminar carpeta permanente falla | `fs:delete` unlink |
| B6 | Rutas acceso rápido incorrectas | `App.tsx` defaults |

## P1 — Deuda / documentación falsa

| ID | Problema |
|----|----------|
| D1 | `fuse.js` y `sql.js` sin uso |
| D2 | `searchWithAI` sin UI |
| D3 | `autoIndex` sin llamar |
| D4 | Toolbar Scaffolder sin handler |
| D5 | `AIContext` desconectado |
| D6 | Export siempre con sample data |
| D7 | `LICENSE.txt` faltante para electron-builder |
| D8 | `npm run dist:info` path roto |
| D9 | README describe Python/tkinter |
| D10 | Tema no persiste |

## P2 — Producto vs NETVAULT_BRIEF

| Gap | Notas |
|-----|-------|
| Sin servidor / proxy Claude | IA local o key en cliente |
| Sin formato único en carpetas | Analyzer/Export aislados |
| Sin sync / aprobación / ingest | — |
| Sin áreas T&C P&C Transportes | — |
| Sin búsqueda full-text | Solo nombre en índice |
| Sin Rust indexador | Fase 9 pendiente |

## HISTORY.md — correcciones necesarias

- Fase 5: Fuse “integrado” → no en src.
- Fase 6: “escaneo recursivo completo” → incompleto por B1.
- Estructura menciona `FileList.tsx` → eliminado.
- `OLLAMA_INSTRUCTIONS.md` → eliminado.
- Electron version: doc dice 28, package 33.

## Rendimiento

- Indexación desde renderer = N× IPC.
- Bundle JS ~1.6 MB (advertencia Vite).
- `editors:detect` puede ser lento (PowerShell recurse).
