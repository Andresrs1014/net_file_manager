# Índice de documentación del repositorio

Documentos fuera de `documentation/` que definen visión y planes. **No se copian aquí** — se mantienen en la raíz o `plans/` y deben actualizarse al evolucionar el producto.

## Visión y producto

| Archivo | Propósito |
|---------|-----------|
| [`NETVAULT_BRIEF.md`](../../../NETVAULT_BRIEF.md) | Lock-in arquitectura, formato único, sync, seguridad |
| [`HISTORY.md`](../../../HISTORY.md) | Evolución fases 1–8, decisiones Ollama, hardware |
| [`CLAUDE.md`](../../../CLAUDE.md) | Reglas y stack **de este repo** (extensión proyecto) |
| [`AGENTS.md`](../../../AGENTS.md) | Contexto para agentes en net_file_manager |

## Planes de implementación

| Archivo | Propósito |
|---------|-----------|
| [`plans/PLAN_APP_NETVAULT.md`](../../../plans/PLAN_APP_NETVAULT.md) | Cliente Electron por fases |
| [`plans/PLAN_SERVIDOR_NETVAULT.md`](../../../plans/PLAN_SERVIDOR_NETVAULT.md) | Servidor, endpoints, auth |
| [`plans/INVESTIGACION_UI_NETVAULT.md`](../../../plans/INVESTIGACION_UI_NETVAULT.md) | Layout workbench, ⌘K |
| [`plans/PLAN_REMODELACION_EJECUCION.md`](../../../plans/PLAN_REMODELACION_EJECUCION.md) | Orquestación olas 0–7 y subagentes |

## Técnico legacy / migración

| Archivo | Propósito |
|---------|-----------|
| [`MIGRATION_PLAN.md`](../../../MIGRATION_PLAN.md) | Migración tkinter→Electron; Fase 9 Rust detallada |
| [`ARCHITECTURE_PLAN.md`](../../../ARCHITECTURE_PLAN.md) | Arquitectura amplia ZYMO/intranet (contexto empresa) |
| [`README.md`](../../../README.md) | **Desactualizado** (Python) — reemplazar tras remodelación |

## Documentación generada (esta carpeta)

Ver [`../README.md`](../README.md) — snapshot **2026-06-04** del estado real del código.

## Convención de fechas

Nueva documentación de sesión:

```
documentation/YYYY-MM-DD/
  README.md
  01-.../
  02-.../
```

No sobrescribir carpetas de fechas anteriores; añadir nueva fecha para nuevos snapshots.
