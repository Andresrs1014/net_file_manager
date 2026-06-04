# NetVault — extensión del proyecto

> **Reglas globales (usuario):** `~/.claude/CLAUDE.md`  
> **Cursor:** `~/.cursor/rules/claude-md-primary.mdc` (`alwaysApply: true`)

Este archivo solo documenta el **stack y convenciones de este repositorio**. La fuente principal de reglas es el `CLAUDE.md` de usuario.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS |
| Desktop | Electron 33 |
| Lenguaje | TypeScript |
| Búsqueda | Fuse.js + indexador local (sql.js) |
| IA | Ollama vía IPC en `electron/main.ts` |
| Empaquetado | electron-builder (Windows) |

---

## Estructura relevante

- `electron/` — main process, IPC, terminal, config
- `src/` — UI React (paneles, terminal, IA, documentos)
- `dist/` — build del renderer
- `dist-electron/` — main/preload compilados

---

## Comandos

```powershell
npm run electron:dev   # desarrollo (build:electron + Vite + ventana Electron)
npm run build:electron # tras cambiar solo electron/main.ts o preload.ts
npm run build          # compilar frontend + electron
npm run dist           # instalador Windows
```

No uses solo `npm run dev` ni `http://localhost:5173` en el navegador para probar el grafo: ahí no hay acceso real al disco.

Tras `npm run electron:dev`, abre la **ventana Electron** (no solo la pestaña del navegador). Icono **Grafo** en la barra izquierda → pestañas **Vault .md** / **LightRAG** en el panel central.

---

## Definición de Done (este repo)

- `npm run build` sin errores
- Sin secretos en código ni en commits
- Cambios de UI revisados con web-design-guidelines
- Flujos críticos probados con agent-browser antes de release
