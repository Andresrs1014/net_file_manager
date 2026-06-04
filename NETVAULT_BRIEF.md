# NetVault — Brief de evolución

> Herramienta de escritorio (Electron, instalable `.exe`) que gestiona archivos, analiza
> procedimientos con Claude y, lo aprobado, lo sube a la intranet. "Red Social Empresarial":
> los cambios de un usuario se ven y sincronizan con los demás vía un servicio en el servidor.

---

## 0. Decisiones ya tomadas (lock-in)

| Decisión | Valor |
|---|---|
| Stack | **Electron + React + TypeScript** (se retira Tkinter/Python: `ui/`, `controllers/`, `core/`). |
| Distribución | **`.exe`** vía `electron-builder.yml` + `installer.iss` (ya existen en el repo). |
| Topología | **Cliente desktop + servicio servidor** con sincronización. |
| Cerebro IA | **Solo Claude API** (la key vive en el servidor, NUNCA en el `.exe`). |
| Flujogramas | **Mermaid** (texto versionable). |
| Aprobación | Rol máximo configurable (`aprobador_maximo`, normalmente el Gerente). |

---

## 1. Arquitectura

```
  ┌─────────────────────────────┐        ┌──────────────────────────────┐
  │   NetVault Cliente (.exe)    │  HTTPS │   NetVault Servicio (servidor) │
  │   Electron + React + TS      │ ─────▶ │   - Auth (JWT, SSO intranet)   │
  │   - Gestor de archivos       │        │   - Proxy Claude (key aquí)    │
  │   - Editor / preview         │        │   - Motor de sincronización    │
  │   - Terminal CLI integrado   │        │   - Cola de análisis           │
  │   - Render Mermaid           │ ◀───── │   - Webhook → intranet         │
  └─────────────────────────────┘        └───────────────┬──────────────┘
        (archivos locales por PC)                         │
                                                          │ POST /ingest/documento (HMAC)
                                                          ▼
                                              ┌──────────────────────┐
                                              │   Intranet / zymo.db  │
                                              └──────────────────────┘
```

**Por qué la key de Claude va en el servidor y no en el `.exe`:** un `.exe` distribuido es
inspeccionable; cualquier secreto embebido se extrae en minutos. El cliente llama a *tu* servidor,
y *tu* servidor llama a Anthropic. Beneficio extra: un solo punto para control de costos, auditoría
y rate-limit (atado a OP-8 del doc de la intranet).

---

## 2. Lo que falta (mis críticas, ahora como features de NetVault)

| # | Falencia detectada | Feature a implementar |
|---|---|---|
| N-1 | Dos stacks a medias | Consolidar en Electron/React/TS; portar lo útil de `ai/provider.py` y retirar Tkinter. |
| N-2 | "Analizar procedimientos" sin criterio | **Rúbrica de análisis compartida** con la intranet (qué hace bueno a un procedimiento). Pieza central. |
| N-3 | IA acoplada | `ai/provider.py` → simplificar a `ClaudeProvider`, pero llamando al servidor (no directo a Anthropic). |
| N-4 | Acciones autónomas | Mantener **human-in-the-loop** del `AI_ROADMAP`: la IA propone, no ejecuta acciones sensibles. |
| N-5 | Tres escritores del mismo archivo | **Fuente de verdad = intranet**; NetVault propone, no manda. Versionado real. |
| N-6 | Web research sin freno | Guardrails: lista blanca de fuentes, prohibido mandar texto interno a la web, esquema `duda→hipótesis→fuente→conclusión`. |
| N-7 | Sin sync entre usuarios | Servicio de sincronización con resolución de conflictos (sección 6). |

---

## 3. NetVault como gestor de archivos — opciones

Aprovechando lo que ya existe en el repo (`src/components/`):

| Capacidad | Estado / componente base | Detalle |
|---|---|---|
| Navegación por carpetas | `file-panel/FilePanel.tsx`, `PathNavigator.tsx` | Subcarpetas por área: **T&C, P&C, Transportes**. |
| Preview multi-formato | `document/DocumentViewer.tsx` (+ `mammoth` para docx) | docx, pdf, md, mermaid. |
| Búsqueda full-text | `services/indexer/fileIndexer.ts`, `searchService.ts` | Índice local + búsqueda por contenido. |
| Operaciones de archivo | `fileService.ts` | Abrir, mover, renombrar, copiar, crear carpeta, eliminar (con confirmación). |
| Metadatos / etiquetas | *(nuevo)* | área, tipo (`procedimiento|instructivo|politica`), estado, versión, responsables. |
| Historial + diff | *(nuevo)* | Comparar versión anterior vs nueva, y flujograma viejo vs nuevo. |
| Terminal / CLI | `terminal/Terminal.tsx` | Modo "CLI agente": lanzar análisis por comando. |
| Render Mermaid | `flowchart/FlowchartGenerator.tsx`, `FlowchartPanel.tsx` | Generar y previsualizar flujogramas. |
| Grafo de conocimiento | `graph/KnowledgeGraph.tsx`, `GraphPanel.tsx` | Visualizar entidades/relaciones para ZYMO. |
| Análisis en lote | *(nuevo)* | Analizar varios procedimientos de una subcarpeta de golpe. |
| Estado de sync por archivo | *(nuevo)* | `sincronizado | pendiente | conflicto`. |

---

## 4. Flujo de análisis y "formato único"

**Entrada:** un documento (docx/pdf/md) dentro de una subcarpeta de área.

**El agente (Claude vía servidor) produce un paquete fijo:**

1. **Flujograma Mermaid** generado + **comparación** con el flujograma que ya trae el archivo
   (señalando diferencias).
2. **Markdown normalizado** del procedimiento.
3. **Análisis contra la rúbrica** → hallazgos con `severidad` y `visibilidad` (atado a OP-3 de la intranet).
4. **Tiempos extraídos** (si el procedimiento los define).
5. **Propuestas**: desarrollos para la intranet, MCPs con potencial, mejoras de proceso
   (qué dejar de hacer, qué implementar).
6. **Corpus para entrenar a ZYMO** (formato exacto = decisión pendiente, sección 8).

**Salida:** una carpeta por documento con archivos de nombre fijo (el "formato único").

**Gate:** el `aprobador_maximo` da el **✅** → el servidor dispara `POST /ingest/documento`
(HMAC + idempotencia, OP-7 de la intranet). Sin ✅, nada sube.

---

## 5. Estructura de carpetas (el "una sola carpeta, CLI-style")

```
netvault/
├── T&C/
│   └── <codigo_procedimiento>/
│       ├── original.docx            # archivo fuente
│       ├── procedimiento.md         # markdown normalizado
│       ├── flujograma.mmd           # Mermaid generado
│       ├── analisis.md              # hallazgos vs rúbrica
│       ├── propuestas.md            # desarrollos / MCPs / mejoras
│       ├── tiempos.json             # tiempos extraídos
│       ├── corpus_zymo.jsonl        # lenguaje para entrenar a ZYMO
│       └── _meta.json               # estado, versión, aprobaciones, hash, sync
├── P&C/
└── Transportes/
```

`_meta.json` es la pieza que conecta todo: estado (`borrador|en_revision|vigente|obsoleto`),
versión, quién aprobó, hash de contenido (para sync e idempotencia) y estado de sincronización.

---

## 6. Sincronización — modelo recomendado (decisión que tomé por ti; ajústala)

Como los archivos viven en cada PC pero los cambios deben verse en todos:

- **Servidor = fuente de verdad** de la versión compartida de cada documento.
- **Cliente:** `pull` al abrir una carpeta, `push` al guardar. El servidor versiona cada push.
- **Conflicto:** si dos editan el mismo documento, el servidor lo detecta por `hash`/`version`
  y marca **CONFLICTO** — **no sobreescribe nada**. El usuario resuelve con diff visual.
  (Evitamos *last-write-wins* ciego, que pierde trabajo en silencio.)
- **Atado a estados:** solo el `aprobador_maximo` promueve a `vigente`. Lo demás es `borrador`,
  visible para todos pero claramente marcado como propuesta.

Esto es, en esencia, un mini control de versiones. Si más adelante crece, se puede respaldar con
Git real por debajo, pero el modelo hash+versión+conflicto explícito ya te cubre el MVP.

---

## 7. Seguridad y hardening (mi rol)

- **Key de Claude solo en el servidor.** El `.exe` jamás la ve.
- **Auth cliente↔servidor** con JWT; reutiliza el `SECRET_KEY`/SSO de la intranet (`jwt_sso_secret`)
  para que sea un solo login en todo ZYMO.
- **TLS** de extremo a extremo (ya tienes Cloudflare Tunnel).
- **Redacción previa a Claude:** filtro que quita NITs y datos personales que no aporten al análisis,
  antes de salir del servidor. Mandas a Anthropic lo mínimo necesario.
- **Code signing del `.exe`** (certificado): evita el SmartScreen de Windows y la suplantación del instalador.
- **Auditoría:** quién aprobó, qué se subió, cuándo, con qué hash. Un solo log central.
- **Idempotencia** en la subida: reenviar el mismo documento no duplica en la intranet.

---

## 8. Decisiones pendientes (siguiente ronda)

1. **Formato del "corpus para entrenar a ZYMO"** (`corpus_zymo.jsonl`). Mi recomendación:
   **tripletas entidad–relación + chunks**, alineadas con tu LightRAG (ya tienes ~970 entidades /
   ~1065 relaciones indexadas), para que ZYMO lo consuma directo sin re-procesar. Alternativas:
   pares pregunta/respuesta, o corpus narrativo. → **¿cuál?**
2. **Política de conflictos de sync** — propuse hash+versión+resolución manual con diff. → **¿la confirmas?**
3. **Features MVP del gestor de archivos** — de la tabla de la sección 3, ¿cuáles entran en la
   primera versión y cuáles después? → **¿priorizas?**

---

## 9. Orden de ataque (fases)

1. **Servicio servidor + auth + proxy Claude** — la base; pone la key a salvo y habilita el análisis.
2. **Cliente Electron: gestor de archivos + preview + estructura por área** — el núcleo de "gestiona archivos".
3. **Motor de análisis (formato único)** — flujograma Mermaid, markdown, rúbrica, tiempos, propuestas.
4. **Gate de aprobación + webhook a la intranet** — el ✅ del `aprobador_maximo` → `POST /ingest/documento`.
5. **Sincronización** — pull/push, versionado, conflictos.
6. **Empaquetado `.exe` firmado** — `electron-builder` + code signing + instalador.
