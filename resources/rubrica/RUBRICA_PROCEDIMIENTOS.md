# Rúbrica de análisis — Procedimientos e instructivos (NetVault v1.0)

Esta rúbrica es la **fuente de verdad** para el agente de análisis. El servidor la carga en cada
`POST /analysis/run`. Cualquier cambio aquí (o en `rubrica-agent.json`) altera el comportamiento
del motor sin tocar código.

---

## Objetivo del análisis

Transformar un documento fuente (docx, pdf, md, txt) en un **paquete formato único** listo para
revisión humana y publicación futura en intranet / indexación ZYMO.

| Salida | Archivo | Descripción |
|--------|---------|-------------|
| Procedimiento normalizado | `procedimiento.md` | Markdown estructurado según reglas abajo |
| Flujograma | `flujograma.mmd` | Mermaid `flowchart` del proceso principal |
| Hallazgos | `analisis.md` | Un ítem por categoría de la rúbrica cuando aplique |
| Tiempos | `tiempos.json` | Actividades con plazos detectados o inferidos |
| Propuestas | `propuestas.md` | Mejoras intranet, MCP, proceso, eliminar pasos |
| Corpus ZYMO | `corpus_zymo.jsonl` | Chunks + entidades + relaciones para LightRAG |
| Metadatos | `_meta.json` | código, versión, hash, estado, área, fechas |

---

## Categorías de evaluación (7)

### 1. Claridad
- Pasos con verbo de acción.
- Condiciones explícitas (si / entonces / sino).
- Sin ambigüedad en pasos críticos.

### 2. Completitud
- Inicio, desarrollo, cierre.
- Excepciones documentadas.
- Referencias a formularios y sistemas.

### 3. Responsabilidades
- Rol o cargo por actividad.
- Escalamiento definido.
- Aprobaciones con autoridad.

### 4. Riesgos
- Riesgos nombrados por fase.
- Controles o mitigaciones.
- Manejo de datos sensibles.

### 5. Tiempos
- SLAs numéricos cuando el texto los mencione o implique.
- Unidades consistentes (minutos, horas, días hábiles).

### 6. Cumplimiento
- Referencias a políticas internas.
- Evidencias / registros exigidos.
- Trazabilidad y versionado.

### 7. Mejora continua
- Pasos redundantes o automatizables.
- Integraciones posibles (intranet, webhooks).
- KPIs sugeridos si no existen.

---

## Severidad de hallazgos

| Nivel | Cuándo usar |
|-------|-------------|
| **critica** | Bloquea ejecución correcta o incumple norma obligatoria |
| **alta** | Riesgo operativo relevante o ambigüedad en paso clave |
| **media** | Mejora necesaria pero el proceso puede ejecutarse |
| **baja** | Redacción, detalle menor, optimización |

Cada hallazgo debe incluir: `id` (F001…), `category`, `severity`, `description`, `suggestion`, `visibility` (`interna` | `publica`).

---

## Reglas del markdown normalizado

1. `# {código} — {título}`
2. `## Objetivo`
3. `## Alcance`
4. `## Responsables` (tabla)
5. `## Desarrollo` (lista numerada)
6. `## Excepciones`
7. `## Registros y evidencias`
8. `## Referencias`

**No inventar** pasos que no estén en el documento fuente. Para lagunas, registrar un hallazgo en Completitud.

---

## Reglas del flujograma Mermaid

- Sintaxis: `flowchart LR` o `flowchart TD`.
- Nodos: acción concreta; decisiones con `{¿…?}`.
- Siempre `Inicio` y `Cierre`.
- Comparar con flujograma existente si el cliente lo envía; reportar diff en el paquete.

---

## Corpus ZYMO (LightRAG)

Por cada fragmento relevante del procedimiento:

```json
{"source":"TC-001","chunk":"texto…","entities":["Sistema X","Área Y"],"relations":[{"from":"A","to":"B","type":"aprueba"}]}
```

- 3 a 15 líneas en `corpus_zymo.jsonl`.
- Redactar PII innecesaria (NIT, cédulas, salarios).

---

## Human-in-the-loop

El agente **propone**; no publica en intranet. Estado inicial en `_meta.json`: `borrador`.
Solo un `aprobador_maximo` (fuera de este análisis) podrá disparar publicación.

---

## Versión

- Rúbrica: **1.0.0** (`rubrica-agent.json`)
- Última revisión: 2026-06-04
