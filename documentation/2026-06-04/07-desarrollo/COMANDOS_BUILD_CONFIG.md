# Comandos, build y configuración — NetVault

## Requisitos

- Node.js 18+ (recomendado 22 LTS)
- Windows 10/11 (rutas y terminal orientados a Windows)
- Para IA local: [Ollama](https://ollama.com) en `http://localhost:11434`

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm install` | Dependencias + `electron-builder install-app-deps` |
| `npm run dev` | Vite solo (mock electronAPI) |
| `npm run electron:dev` | Desarrollo completo |
| `npm run build` | Producción frontend + electron |
| `npm run build:electron` | Solo compilar `electron/*.ts` |
| `npm run dist` | Instalador Windows |
| `npm run dist:dir` | Carpeta descomprimida sin NSIS |
| `npm run dist:info` | Info build (**roto:** path package.json) |
| `npm run preview` | Preview Vite del bundle |

## Salidas de build

| Ruta | Contenido |
|------|-----------|
| `dist/` | React estático |
| `dist-electron/` | main.js, preload.js |
| `release/` | Artefactos electron-builder |

## Configuración electron-builder

Archivo: `electron-builder.yml`

- NSIS + portable x64
- `license: LICENSE.txt` — **archivo ausente** en repo
- Iconos comentados (pendiente `assets/icon.ico`)

## Variables de entorno útiles

| Variable | Efecto |
|----------|--------|
| `NODE_ENV=development` | Electron carga localhost:5173 + DevTools |
| `USERNAME` | Usado en detección editores y mock dev |

## Archivos de config en runtime

| Archivo | Contenido |
|---------|-----------|
| `%APPDATA%/NetVault/config.json` | Rutas, favoritos, quickAccess |
| Browser localStorage `netvault-ai-config` | Provider IA, modelo, apiKey |

## Prueba manual mínima

1. `npm run electron:dev`
2. Navegar a una carpeta con archivos
3. Toolbar → Indexar → buscar un archivo en subcarpeta (ver bug B1)
4. Terminal `` ` `` → `dir`
5. AI → requiere Ollama o Claude configurado

## Próximos scripts (plan remodelación)

- `scripts/bench-index.mjs` — benchmark indexación
- Flag `NETVAULT_DEV_LOCAL_AI` — Ollama solo dev
