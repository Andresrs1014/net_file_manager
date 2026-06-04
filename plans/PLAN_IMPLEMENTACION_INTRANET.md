# Plan de implementación — zymo-intranet (lado servidor)

> Repo: `E:\zymo-intranet`  
> Stack: **FastAPI + Python + SQLModel + LightRAG + Gemini/Claude**  
> Propósito: recibir el puente con NetVault (Electron) para login SSO, proxy IA, conversión PDF→MD, ingest de paquetes analizados y sincronización de áreas.

---

## Contexto: qué existe hoy y qué vamos a añadir

### Lo que ya existe y se reutiliza tal cual

| Pieza existente | Archivo | Uso |
|---|---|---|
| Auth JWT completo | `app/routers/auth.py` | `POST /auth/token` — login desde NetVault |
| `GET /auth/me` | `app/routers/auth.py` | Verificar sesión activa desde NetVault |
| `get_current_user` dep | `app/core/deps.py` | Proteger todos los endpoints nuevos |
| `extraer_texto()` | `app/agents/tools/doc_tools.py` | PDF/DOCX → texto plano (reutilizar en cola) |
| `subir_e_indexar()` | `app/agents/tools/doc_tools.py` | Indexar en LightRAG tras análisis |
| `buscar_conocimiento()` | `app/agents/lightrag_service.py` | Consulta al grafo desde NetVault |
| Gemini BaseAgent | `app/agents/base.py` | Base para agente NetVault |
| CORS config | `app/main.py` | Añadir origen Electron (`app://.`) |
| `config.py` | settings | Añadir `claude_api_key`, `netvault_hmac_secret` |

### Lo que vamos a crear

```
app/
├── routers/
│   └── netvault.py          ← Router principal (prefijo /api/netvault)
│       ├── POST /auth/ping              ← Verifica sesión NetVault
│       ├── POST /claude/chat            ← Proxy Claude (streaming SSE)
│       ├── POST /claude/analizar        ← Análisis completo de procedimiento
│       ├── POST /documentos/convertir   ← PDF/DOCX → MD (cola SSE)
│       ├── POST /documentos/ingest      ← Recibe paquete analizado desde NetVault
│       ├── GET  /sync/area/{area}       ← Lista documentos del área en BD
│       ├── GET  /sync/estado/{codigo}   ← Estado de un procedimiento específico
│       └── POST /lightrag/indexar-lote  ← Indexa corpus_zymo.jsonl en LightRAG
├── models/
│   └── netvault_doc.py      ← Modelo SQLModel para paquetes recibidos
├── services/
│   └── claude_service.py    ← Proxy Anthropic Claude (análogo a server/claude.ts)
│   └── netvault_service.py  ← Lógica de negocio de ingest y sync
└── migrations/
    └── (gestionadas en _migrate_db de main.py)
```

---

## Fase 1 — Autenticación y CORS desde Electron (1 día)

### 1.1 Añadir CORS para origen Electron

**Archivo:** `app/main.py`

```python
# Añadir a cors_origins por defecto en config.py o .env:
# cors_origins = "http://localhost:5173,http://localhost:81,app://."

# Ya existe en main.py:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    ...
)
```

En `.env` de producción añadir: `CORS_ORIGINS=...,app://.`

### 1.2 Endpoint ping de sesión

**Archivo:** `app/routers/netvault.py` (nuevo)

```python
@router.get("/auth/ping")
def ping_session(current_user: User = Depends(get_current_user)):
    """
    NetVault lo llama al arrancar para verificar si el token guardado sigue válido.
    Retorna datos del usuario para mostrar en la UI de la app.
    """
    return {
        "ok": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "area": current_user.area,
            "sede": current_user.sede,
        }
    }
```

**Flujo de login desde NetVault:**
1. `POST /auth/token` (ya existe) → obtiene JWT
2. Al arrancar la app: `GET /api/netvault/auth/ping` con el JWT guardado
3. Si 200 → sesión válida, mostrar usuario
4. Si 401 → mostrar pantalla de login

---

## Fase 2 — Proxy Claude (2 días)

El cliente Electron NUNCA llama directamente a Anthropic. Toda llamada pasa por aquí.

### 2.1 Instalar Anthropic SDK

```bash
cd E:\zymo-intranet\backend
pip install anthropic
```

### 2.2 Añadir config en `app/config.py`

```python
class Settings(BaseSettings):
    # ... existentes ...

    # ── NetVault / Claude proxy ───────────────────────────────────────────
    claude_api_key: str = ""
    claude_model: str = "claude-opus-4-5"
    netvault_hmac_secret: str = ""   # Para verificar webhooks desde NetVault server
```

### 2.3 `app/services/claude_service.py` (nuevo)

```python
"""
Proxy Claude para NetVault.
La API key vive aquí — el cliente .exe nunca la ve.
"""
import anthropic
from typing import AsyncIterable
from app.config import settings

def _client() -> anthropic.Anthropic:
    if not settings.claude_api_key:
        raise ValueError("CLAUDE_API_KEY no configurada en el servidor")
    return anthropic.Anthropic(api_key=settings.claude_api_key)


async def chat_claude(
    system_prompt: str,
    messages: list[dict],
    max_tokens: int = 4096,
) -> str:
    """Llamada síncrona a Claude. Para respuestas cortas."""
    client = _client()
    response = client.messages.create(
        model=settings.claude_model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text


async def stream_claude(
    system_prompt: str,
    messages: list[dict],
    max_tokens: int = 8192,
) -> AsyncIterable[str]:
    """Streaming de Claude vía SSE. Para análisis largos y chat."""
    client = _client()
    with client.messages.stream(
        model=settings.claude_model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text
```

### 2.4 Endpoints en `app/routers/netvault.py`

```python
# ── Chat proxy (streaming SSE) ────────────────────────────────────────────────

class ChatRequest(BaseModel):
    system_prompt: str = "Eres un asistente de gestión documental empresarial ZYMO."
    messages: list[dict]   # [{"role": "user", "content": "..."}]
    max_tokens: int = 4096

@router.post("/claude/chat")
async def proxy_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Proxy SSE de Claude para el chat de NetVault.
    El cliente recibe: data: {"chunk": "texto"}  /  data: {"done": true}
    """
    from app.services.claude_service import stream_claude
    import json

    async def generar():
        try:
            async for chunk in stream_claude(payload.system_prompt, payload.messages, payload.max_tokens):
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generar(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

```python
# ── Análisis completo de procedimiento ────────────────────────────────────────

class AnalisisRequest(BaseModel):
    procedure_code: str
    area: str                         # T&C | P&C | Transportes
    text_content: str                 # texto extraído del PDF/DOCX/MD
    existing_flowchart_mmd: str = ""  # flujograma previo si existe

@router.post("/claude/analizar")
async def analizar_procedimiento(
    payload: AnalisisRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Análisis completo estilo AnalyzerPanel pero con Claude real.
    Retorna AnalysisPackage completo (misma estructura que server/analysis.ts).
    SSE: chunks de progreso + resultado final JSON.
    """
    from app.services.netvault_service import run_analisis_procedimiento
    import json

    async def generar():
        yield f"data: {json.dumps({'progress': 'Analizando con Claude...', 'step': 1})}\n\n"
        try:
            resultado = await run_analisis_procedimiento(payload)
            yield f"data: {json.dumps({'progress': 'Extrayendo hallazgos...', 'step': 2})}\n\n"
            yield f"data: {json.dumps({'done': True, 'package': resultado})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generar(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})
```

---

## Fase 3 — Cola PDF→MD con progreso SSE (2 días)

### 3.1 Endpoint de conversión en lote

```python
# En app/routers/netvault.py

@router.post("/documentos/convertir")
async def convertir_documentos(
    archivos: list[UploadFile] = File(...),
    area: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """
    Recibe 1..N archivos (PDF/DOCX/MD/TXT).
    Responde SSE con progreso de conversión:
      {"step": 1, "total": 5, "file": "procedimiento-tc.pdf", "status": "convirtiendo"}
      {"step": 2, "total": 5, "file": "procedimiento-tc.pdf", "status": "listo", "md_preview": "# ..."}
      {"done": true, "resultados": [...]}
    """
    from app.agents.tools.doc_tools import extraer_texto
    import json

    items = [(f.filename or f"archivo_{i}", await f.read(), (f.filename or "").rsplit(".", 1)[-1].lower())
             for i, f in enumerate(archivos)]

    async def generar():
        resultados = []
        total = len(items)
        for i, (nombre, contenido, ext) in enumerate(items, 1):
            yield f"data: {json.dumps({'step': i, 'total': total, 'file': nombre, 'status': 'convirtiendo'}, ensure_ascii=False)}\n\n"
            texto = extraer_texto(contenido, ext)
            md_preview = texto[:500] if texto else ""
            resultados.append({
                "nombre": nombre,
                "extension": ext,
                "caracteres": len(texto),
                "md_preview": md_preview,
                "ok": bool(texto),
                "texto_completo": texto,  # el cliente lo guardará como .md
            })
            yield f"data: {json.dumps({'step': i, 'total': total, 'file': nombre, 'status': 'listo', 'md_preview': md_preview[:200]}, ensure_ascii=False)}\n\n"

        yield f"data: {json.dumps({'done': True, 'resultados': [{k: v for k, v in r.items() if k != 'texto_completo'} for r in resultados]}, ensure_ascii=False)}\n\n"

    return StreamingResponse(generar(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})
```

---

## Fase 4 — Modelo de BD y Ingest de paquetes (2 días)

### 4.1 `app/models/netvault_doc.py` (nuevo)

```python
"""
Registro de paquetes de procedimientos recibidos desde NetVault.
"""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel
import json


class NetvaultDocumento(SQLModel, table=True):
    __tablename__ = "netvault_documentos"

    id: Optional[int]      = Field(default=None, primary_key=True)
    procedure_code: str    = Field(index=True)
    area: str                              # T&C | P&C | Transportes
    version: str           = "1.0.0"
    status: str            = "borrador"    # borrador | en_revision | vigente | obsoleto
    hash_contenido: str    = ""            # SHA-256 del MD normalizado
    sync_status: str       = "recibido"   # recibido | indexado | conflicto

    # Contenido del paquete
    markdown_normalized: str = Field(default="", sa_column_kwargs={"type_": "TEXT"})
    flowchart_mmd: str       = Field(default="", sa_column_kwargs={"type_": "TEXT"})
    analisis_json: str       = Field(default="{}", sa_column_kwargs={"type_": "TEXT"})
    corpus_jsonl: str        = Field(default="", sa_column_kwargs={"type_": "TEXT"})

    # Metadatos
    subido_por_id: int
    subido_por_email: str  = ""
    aprobado_por_id: Optional[int] = None
    aprobado_at: Optional[datetime] = None

    created_at: datetime   = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime   = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def analisis(self) -> dict:
        try:
            return json.loads(self.analisis_json)
        except Exception:
            return {}
```

### 4.2 Registrar en `app/main.py`

```python
# Añadir junto a los otros creates en lifespan():
from app.models.netvault_doc import NetvaultDocumento
from sqlmodel import SQLModel
# Al final de lifespan antes de yield:
SQLModel.metadata.create_all(get_engine(), tables=[NetvaultDocumento.__table__])
```

### 4.3 Endpoint de ingest

```python
# En app/routers/netvault.py

class IngestPackage(BaseModel):
    procedure_code: str
    area: str
    version: str = "1.0.0"
    hash_contenido: str
    markdown_normalized: str
    flowchart_mmd: str
    findings: list[dict] = []
    times: list[dict] = []
    proposals: list[dict] = []
    corpus_entries: list[dict] = []  # corpus_zymo.jsonl entries

@router.post("/documentos/ingest", status_code=201)
async def ingest_paquete(
    payload: IngestPackage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recibe el paquete analizado desde NetVault y lo persiste en la BD.
    Idempotente: mismo hash = actualiza, no duplica.
    Si el corpus viene poblado → dispara indexación en LightRAG.
    """
    from app.models.netvault_doc import NetvaultDocumento
    from app.services.netvault_service import indexar_corpus_en_lightrag
    import json

    # Idempotencia por hash
    existente = db.exec(
        select(NetvaultDocumento)
        .where(NetvaultDocumento.procedure_code == payload.procedure_code)
        .where(NetvaultDocumento.hash_contenido == payload.hash_contenido)
    ).first()
    if existente:
        return {"ok": True, "id": existente.id, "accion": "sin_cambios"}

    # Crear o actualizar por código
    doc = db.exec(
        select(NetvaultDocumento).where(NetvaultDocumento.procedure_code == payload.procedure_code)
    ).first()

    analisis_completo = {
        "findings": payload.findings,
        "times": payload.times,
        "proposals": payload.proposals,
    }

    if doc:
        doc.markdown_normalized = payload.markdown_normalized
        doc.flowchart_mmd       = payload.flowchart_mmd
        doc.hash_contenido      = payload.hash_contenido
        doc.version             = payload.version
        doc.analisis_json       = json.dumps(analisis_completo, ensure_ascii=False)
        doc.corpus_jsonl        = "\n".join(json.dumps(e, ensure_ascii=False) for e in payload.corpus_entries)
        doc.status              = "en_revision"
        doc.sync_status         = "recibido"
        doc.subido_por_id       = current_user.id
        doc.subido_por_email    = current_user.email
        doc.updated_at          = datetime.now(timezone.utc)
        accion = "actualizado"
    else:
        doc = NetvaultDocumento(
            procedure_code      = payload.procedure_code,
            area                = payload.area,
            version             = payload.version,
            hash_contenido      = payload.hash_contenido,
            markdown_normalized = payload.markdown_normalized,
            flowchart_mmd       = payload.flowchart_mmd,
            analisis_json       = json.dumps(analisis_completo, ensure_ascii=False),
            corpus_jsonl        = "\n".join(json.dumps(e, ensure_ascii=False) for e in payload.corpus_entries),
            status              = "borrador",
            sync_status         = "recibido",
            subido_por_id       = current_user.id,
            subido_por_email    = current_user.email,
        )
        accion = "creado"

    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Indexar corpus en LightRAG en background
    if payload.corpus_entries:
        texto_corpus = "\n".join(
            f"{e.get('chunk', '')} [Entidades: {', '.join(e.get('entities', []))}]"
            for e in payload.corpus_entries
        )
        await indexar_corpus_en_lightrag(texto_corpus, payload.procedure_code)
        doc.sync_status = "indexado"
        db.add(doc)
        db.commit()

    return {"ok": True, "id": doc.id, "accion": accion, "sync_status": doc.sync_status}
```

---

## Fase 5 — Sincronización (GET) y consulta de estado (1 día)

```python
# En app/routers/netvault.py

@router.get("/sync/area/{area}")
def sync_area(
    area: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna todos los procedimientos del área con su estado actual.
    NetVault lo usa al entrar a una carpeta para mostrar badges de sync.
    """
    from app.models.netvault_doc import NetvaultDocumento
    docs = db.exec(
        select(NetvaultDocumento).where(NetvaultDocumento.area == area)
    ).all()
    return {
        "area": area,
        "total": len(docs),
        "documentos": [
            {
                "procedure_code": d.procedure_code,
                "version":        d.version,
                "status":         d.status,
                "sync_status":    d.sync_status,
                "hash":           d.hash_contenido,
                "updated_at":     d.updated_at.isoformat(),
            }
            for d in docs
        ]
    }


@router.get("/sync/estado/{procedure_code}")
def sync_estado(
    procedure_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Estado de un procedimiento específico. NetVault actualiza el badge en FilePanel."""
    from app.models.netvault_doc import NetvaultDocumento
    doc = db.exec(
        select(NetvaultDocumento).where(NetvaultDocumento.procedure_code == procedure_code)
    ).first()
    if not doc:
        return {"exists": False, "procedure_code": procedure_code}
    return {
        "exists": True,
        "procedure_code": doc.procedure_code,
        "version":        doc.version,
        "status":         doc.status,
        "sync_status":    doc.sync_status,
        "hash":           doc.hash_contenido,
        "updated_at":     doc.updated_at.isoformat(),
        "aprobado":       doc.aprobado_por_id is not None,
    }


@router.patch("/sync/aprobar/{procedure_code}")
def aprobar_procedimiento(
    procedure_code: str,
    current_user: User = Depends(require_admin),  # Solo admin/aprobador puede aprobar
    db: Session = Depends(get_db),
):
    """
    Marca un procedimiento como vigente. 
    Gatillo final para que los demás usuarios lo vean como oficial.
    """
    from app.models.netvault_doc import NetvaultDocumento
    doc = db.exec(
        select(NetvaultDocumento).where(NetvaultDocumento.procedure_code == procedure_code)
    ).first()
    if not doc:
        raise HTTPException(404, "Procedimiento no encontrado")
    doc.status        = "vigente"
    doc.aprobado_por_id  = current_user.id
    doc.aprobado_at   = datetime.now(timezone.utc)
    db.add(doc)
    db.commit()
    return {"ok": True, "status": "vigente", "aprobado_por": current_user.email}
```

---

## Fase 6 — `app/services/netvault_service.py` (nuevo)

```python
"""
Lógica de negocio para NetVault: análisis de procedimientos con Claude
y orquestación de indexación en LightRAG.
"""
import hashlib
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)


async def run_analisis_procedimiento(payload) -> dict:
    """
    Construye el prompt de análisis de procedimiento, llama a Claude
    y devuelve el AnalysisPackage completo.
    Reutiliza la misma lógica que server/services/analysis.ts pero en Python.
    """
    from app.services.claude_service import chat_claude

    system_prompt = """Eres el agente de análisis de procedimientos de NetVault (ZYMO).
Evalúa documentos empresariales según la rúbrica oficial.
Devuelve EXCLUSIVAMENTE un JSON válido sin texto adicional."""

    user_message = f"""Analiza el procedimiento **{payload.procedure_code}** del área **{payload.area}**.

DOCUMENTO:
---
{payload.text_content[:14000]}
---

JSON requerido:
{{
  "flowchartMmd": "flowchart LR\\n  ...",
  "markdownNormalized": "# {payload.procedure_code}\\n\\n## Objetivo\\n...",
  "findings": [{{"id":"F001","category":"Claridad","severity":"media","description":"...","suggestion":"...","visibility":"interna"}}],
  "times": [{{"activity":"...","minMinutes":0,"maxMinutes":0,"unit":"minutos","rawText":"..."}}],
  "proposals": [{{"type":"mejora_proceso","title":"...","description":"...","priority":"media"}}],
  "zymoCorpus": [{{"source":"{payload.procedure_code}","chunk":"...","entities":["..."],"relations":[{{"from":"...","to":"...","type":"..."}}]}}]
}}"""

    raw = await chat_claude(system_prompt, [{"role": "user", "content": user_message}], 8192)

    # Limpiar y parsear JSON
    clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    start, end = clean.find("{"), clean.rfind("}")
    parsed = json.loads(clean[start:end+1]) if start >= 0 else {}

    hash_c = hashlib.sha256(payload.text_content.encode()).hexdigest()

    return {
        "procedureCode":       payload.procedure_code,
        "area":                payload.area,
        "analyzedAt":          __import__("datetime").datetime.utcnow().isoformat(),
        "flowchartMmd":        parsed.get("flowchartMmd", ""),
        "markdownNormalized":  parsed.get("markdownNormalized", ""),
        "findings":            parsed.get("findings", []),
        "times":               parsed.get("times", []),
        "proposals":           parsed.get("proposals", []),
        "zymoCorpus":          parsed.get("zymoCorpus", []),
        "meta": {
            "code":        payload.procedure_code,
            "version":     "1.0.0",
            "status":      "borrador",
            "area":        payload.area,
            "hash":        hash_c,
            "syncStatus":  "local",
        }
    }


async def indexar_corpus_en_lightrag(texto: str, fuente: str) -> bool:
    """Indexa el corpus generado por el análisis en LightRAG."""
    from app.agents.lightrag_service import indexar_texto
    try:
        return await indexar_texto(f"[FUENTE: {fuente}]\n{texto}")
    except Exception as e:
        logger.error("Error indexando corpus de %s: %s", fuente, e)
        return False
```

---

## Fase 7 — Registrar router y migración

### 7.1 En `app/main.py`

```python
# Añadir junto a los otros imports de routers:
from app.routers.netvault import router as netvault_router

# Añadir junto a los otros include_router:
app.include_router(netvault_router)
```

### 7.2 En `_migrate_db()` de `app/main.py`

```python
# Al final de _migrate_db(), crear tabla netvault_documentos:
try:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS netvault_documentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            procedure_code VARCHAR(100) NOT NULL,
            area VARCHAR(50) NOT NULL,
            version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
            status VARCHAR(30) NOT NULL DEFAULT 'borrador',
            hash_contenido VARCHAR(64) NOT NULL DEFAULT '',
            sync_status VARCHAR(30) NOT NULL DEFAULT 'recibido',
            markdown_normalized TEXT NOT NULL DEFAULT '',
            flowchart_mmd TEXT NOT NULL DEFAULT '',
            analisis_json TEXT NOT NULL DEFAULT '{}',
            corpus_jsonl TEXT NOT NULL DEFAULT '',
            subido_por_id INTEGER NOT NULL DEFAULT 0,
            subido_por_email VARCHAR(200) NOT NULL DEFAULT '',
            aprobado_por_id INTEGER,
            aprobado_at DATETIME,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """))
    conn.commit()
except Exception:
    pass
```

---

## Resumen de endpoints nuevos

| Método | Ruta | Propósito |
|--------|------|-----------|
| `GET` | `/api/netvault/auth/ping` | Verificar sesión al arrancar NetVault |
| `POST` | `/api/netvault/claude/chat` | Chat con Claude (SSE streaming) |
| `POST` | `/api/netvault/claude/analizar` | Análisis completo de procedimiento (SSE) |
| `POST` | `/api/netvault/documentos/convertir` | PDF/DOCX → MD en cola (SSE progreso) |
| `POST` | `/api/netvault/documentos/ingest` | Recibe paquete analizado desde NetVault |
| `GET` | `/api/netvault/sync/area/{area}` | Lista documentos del área en BD |
| `GET` | `/api/netvault/sync/estado/{code}` | Estado de un procedimiento |
| `PATCH` | `/api/netvault/sync/aprobar/{code}` | Aprobar procedimiento (solo admin) |
| `GET` | `/api/grafo/lightrag` | Grafo LightRAG (ya existe en `grafo.py`) |

> **Nota:** Los endpoints de auth (`/auth/token`, `/auth/me`) ya existen y NetVault los usa directamente.

---

## Variables de entorno a añadir en `.env`

```env
# NetVault Bridge
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-opus-4-5
NETVAULT_HMAC_SECRET=secreto-compartido-con-netvault
CORS_ORIGINS=http://localhost:5173,http://localhost:81,app://.
```

---

## Orden de ejecución recomendado

1. `git pull` + crear rama `feat/netvault-bridge`
2. `pip install anthropic` en el entorno del backend
3. Añadir variables `.env`
4. Crear archivos: `netvault.py`, `netvault_doc.py`, `claude_service.py`, `netvault_service.py`
5. Editar `main.py`: import + include_router + migración
6. `cd backend && python run.py` → probar con Swagger en `http://localhost:8001/docs`
7. Verificar: `GET /api/netvault/auth/ping` con token válido → `{"ok": true}`
