# Documentación NetVault — 2026-06-04

Índice de la documentación generada a partir del código en ejecución (`npm run electron:dev`) y revisión del repositorio.

## Estructura

| Carpeta | Contenido |
|---------|-----------|
| [01-catalogo-funcionalidades](./01-catalogo-funcionalidades/CATALOGO_FUNCIONALIDADES_NETVAULT.md) | **Documento principal:** todas las funciones actuales, flujos, atajos y estado real |
| [02-arquitectura-electron](./02-arquitectura-electron/ARQUITECTURA_Y_IPC.md) | Procesos, seguridad, canales IPC completos |
| [03-servicios-datos](./03-servicios-datos/SERVICIOS_INDEXACION_DOCUMENTOS.md) | Capa de servicios (`fileService`, indexador, búsqueda, documentos, IA) |
| [04-modulos-visuales](./04-modulos-visuales/MODULOS_UI.md) | Componentes React, modales, interacciones |
| [05-limitaciones-estado](./05-limitaciones-estado/LIMITACIONES_Y_BUGS.md) | Bugs conocidos, gaps vs brief, dependencias sin usar |
| [06-referencia-externa](./06-referencia-externa/INDICE_DOCS_PROYECTO.md) | Enlaces a `NETVAULT_BRIEF.md`, `HISTORY.md`, `plans/` |
| [07-desarrollo](./07-desarrollo/COMANDOS_BUILD_CONFIG.md) | Scripts npm, build, config persistente |

## Lectura recomendada

1. **Producto actual (qué hace hoy):** `01-catalogo-funcionalidades/CATALOGO_FUNCIONALIDADES_NETVAULT.md`
2. **Para implementar fixes:** `05-limitaciones-estado/LIMITACIONES_Y_BUGS.md`
3. **Visión futura:** `06-referencia-externa/INDICE_DOCS_PROYECTO.md` → `NETVAULT_BRIEF.md`

## Nota de versión

- **App:** `netvault@1.0.0`
- **Electron:** 33.x (package.json)
- **Stack UI:** React 18 + TypeScript + Tailwind + Lucide React
- **Fecha de captura:** 2026-06-04
