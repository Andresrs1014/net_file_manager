# Plan de implementación — SERVIDOR de NetVault

> El servidor es el **cerebro y la fuente de verdad**. Aquí vive todo lo que necesita la API key,
> secretos, salida a internet, enforcement de roles y la versión compartida de los documentos.

---

## Regla de reparto (cómo decidí qué va aquí)

Va al **servidor** todo lo que cumpla *al menos una*:

1. Necesita la **API key de Claude** (un `.exe` distribuido jamás debe tenerla).
2. Necesita **salir a internet** (investigación web → control de egreso y guardrails).
3. Es la **fuente de verdad compartida** (versión oficial, sincronización, conflictos).
4. Hace **enforcement de seguridad** (roles, aprobación, auditoría, costos).

Todo lo demás (archivos locales, render, interacción, visualización) va a la **app** (ver su plan).

---

## Responsabilidades del servidor

| Módulo | Función | Por qué aquí |
|---|---|---|
| **Auth / SSO** | Login, emisión/validación de JWT. | Reutiliza `jwt_sso_secret` de la intranet → un solo login en ZYMO. |
| **Proxy Claude** | Único punto que llama a Anthropic. | Protege la key; centraliza costos y rate-limit. |
| **Filtro de redacción** | Quita NITs / datos personales antes de mandar a Claude. | No debe salir del servidor data sensible innecesaria. |
| **Motor de análisis** | Orquesta: documento → rúbrica → flujograma Mermaid → tiempos → propuestas. | Usa la key y la rúbrica compartida. |
| **Investigación web** | Búsqueda con lista blanca + esquema `duda→hipótesis→fuente→conclusión`. | Control de egreso y prohibición de filtrar texto interno. |
| **Motor de sincronización** | Versión oficial de cada documento, detección de conflictos, historial. | Fuente de verdad compartida entre PCs. |
| **Gate de aprobación** | Verifica que quien chulea ✅ tenga el rol `aprobador_maximo`. | El enforcement de rol no puede vivir en el cliente. |
| **Dispatcher a intranet** | `POST /ingest/documento` con HMAC + idempotencia. | El secreto HMAC vive en el servidor. |
| **Costos + auditoría** | Tokens/costo por usuario y agente; log de quién aprobó/subió qué. | OP-8 del doc de la intranet; un solo log central. |

---

## Stack recomendado

- **Node + TypeScript + Express** (consistente con `helix-backend` y `task-backend`; comparte tipos con el cliente Electron, que también es TS).
- **Prisma + PostgreSQL** para el estado de sincronización y metadatos. Puede **compartir `zymo.db`** (los documentos aprobados terminan ahí de todos modos) con tablas propias de sync.
- **`@anthropic-ai/sdk`** para Claude.
- **Zod** para validar todo lo que entra.
- Despliegue en el mismo servidor Ubuntu vía **Cloudflare Tunnel** (TLS ya resuelto).

```
servidor-netvault/
├── src/
│   ├── auth/            # JWT, SSO con intranet
│   ├── claude/          # proxy + filtro de redacción
│   ├── analysis/        # motor de análisis (rúbrica, flujograma, tiempos, propuestas)
│   ├── research/        # investigación web con guardrails
│   ├── sync/            # versionado, detección de conflictos
│   ├── approval/        # gate de rol + dispatcher a intranet (HMAC)
│   ├── audit/           # costos + log
│   └── prisma/          # esquema sync + metadatos
└── ...
```

---

## Endpoints principales

| Endpoint | Método | Función |
|---|---|---|
| `/auth/login` | POST | Login SSO; devuelve JWT. |
| `/analysis/run` | POST | Recibe un documento; devuelve el paquete (flujograma, md, hallazgos, tiempos, propuestas). |
| `/research/query` | POST | Investigación web acotada por la lista blanca. |
| `/sync/pull` | GET | Versión oficial + estado de un documento/carpeta. |
| `/sync/push` | POST | Sube cambios; el servidor versiona o marca **conflicto**. |
| `/approval/submit` | POST | El `aprobador_maximo` chulea ✅ → dispara subida a la intranet. |
| `/costs/me` | GET | Consumo de tokens/costo del usuario. |

---

## Fases (servidor)

1. **Auth + Proxy Claude + redacción** — la base de seguridad; pone la key a salvo y habilita análisis.
2. **Motor de análisis** — rúbrica compartida, flujograma Mermaid, extracción de tiempos, propuestas.
3. **Investigación web con guardrails** — lista blanca, prohibición de filtrar texto interno, esquema fijo.
4. **Motor de sincronización** — versión oficial, historial, detección de conflictos (no *last-write-wins*).
5. **Gate de aprobación + dispatcher + auditoría + costos** — el ✅ del `aprobador_maximo` → `POST /ingest/documento` (HMAC), log central, control de presupuesto.

> Cada fase es desplegable sola y deja al cliente funcionando con lo que ya exista.
