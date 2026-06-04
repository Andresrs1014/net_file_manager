# Plan de implementación — APP (cliente Electron) de NetVault

> La app es un **cliente inteligente**: dueña de los archivos locales y de la experiencia visual.
> No tiene secretos, no llama a Claude directo, no decide roles. Para todo eso llama al servidor.

---

## Responsabilidades de la app

| Módulo | Función |
|---|---|
| **Acceso a archivos** | Leer/escribir la carpeta local de procedimientos (proceso *main* de Electron). |
| **Explorador de archivos** | Árbol por área (T&C, P&C, Transportes); navegación, mover, renombrar, crear, eliminar. |
| **Preview multi-formato** | docx (`mammoth`), pdf, md, y render **Mermaid**. |
| **Editor** | Edición de markdown y del flujograma `.mmd`. |
| **Visor de diff** | Comparar versión anterior vs nueva, y flujograma viejo vs nuevo. |
| **Terminal / CLI** | Modo "CLI agente": lanzar análisis por comando. |
| **Grafo de conocimiento** | Visualizar entidades/relaciones para ZYMO. |
| **Cliente de sync** | `pull`/`push` contra el servidor; mostrar estado (sincronizado/pendiente/conflicto) y resolver conflictos. |
| **UI de aprobación** | Botón ✅ que envía la solicitud al servidor (el servidor valida el rol, no la app). |
| **Índice local** | Búsqueda rápida sobre los archivos de *ese* PC. |

**Lo que la app NO hace:** no guarda la API key, no llama a Anthropic, no valida roles,
no es la fuente de verdad de la versión compartida. Todo eso es del servidor.

---

## Arquitectura Electron (clave para seguridad y calidad)

Electron tiene dos procesos; respétalos o se vuelve inseguro y frágil:

```
┌─────────────────────────── Proceso MAIN (Node) ───────────────────────────┐
│  - Acceso a filesystem y SO                                                 │
│  - Cliente HTTP hacia el servidor (guarda el JWT en memoria, no en disco)   │
│  - Índice local de búsqueda                                                 │
└───────────────▲───────────────────────────────────────────┬───────────────┘
                │  IPC seguro (canales explícitos)            │
        preload.ts (contextBridge, API mínima expuesta)       │
┌───────────────┴───────────────────────────────────────────▼───────────────┐
│  Proceso RENDERER (React + TS) — solo UI                                    │
│  - NUNCA toca fs directo ni guarda tokens                                   │
│  - Pide todo vía la API del preload                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

Reglas no negociables:
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- El **renderer nunca** accede a `fs` ni a la red directamente: todo pasa por IPC vía `preload`.
- El JWT vive en el proceso *main*, en memoria. No en `localStorage`.

Stack: **Electron + React + TypeScript** sobre lo que ya existe en `src/components/`
(`FilePanel`, `DocumentViewer`, `FlowchartGenerator`, `KnowledgeGraph`, `Terminal`).
Empaquetado con `electron-builder.yml` + `installer.iss` (ya en el repo).

---

## Fases (app)

1. **Shell + auth + IPC** — ventana, proceso main/preload/renderer, login contra el servidor, acceso a fs por IPC.
2. **Explorador + preview + búsqueda local** — árbol por área, preview docx/pdf/md, índice local. El núcleo de "gestiona archivos".
3. **Editor + render Mermaid + visor de diff** — editar md/flujograma, comparar versiones.
4. **Cliente de análisis + terminal CLI** — botón/comando "analizar" → llama a `/analysis/run`; muestra el paquete (flujograma, hallazgos, tiempos, propuestas).
5. **Cliente de sync + resolución de conflictos + UI de aprobación** — pull/push, estados, diff de conflicto, botón ✅.
6. **Empaquetado `.exe` firmado** — `electron-builder` + *code signing* (evita el SmartScreen de Windows y la suplantación del instalador).

> La distribución visual de todos estos paneles está en el documento de investigación de UI.
