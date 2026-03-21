# Session Continuity

Este archivo existe para futuras sesiones donde el contexto del chat ya no esté disponible.

## Estado actual del proyecto

La aplicación vigente arranca desde:

- [`app.py`](C:/net_file_manager/app.py)

Y usa como ruta principal de UI:

- [`ui/main_window.py`](C:/net_file_manager/ui/main_window.py)

## Archivos vigentes

### Ventana principal

- [`ui/main_window.py`](C:/net_file_manager/ui/main_window.py)

### Paneles de archivos

- [`ui/file_panel.py`](C:/net_file_manager/ui/file_panel.py)

### Toolbar

- [`ui/toolbar.py`](C:/net_file_manager/ui/toolbar.py)

### Búsqueda

- [`ui/search_bar.py`](C:/net_file_manager/ui/search_bar.py)
- [`controllers/search_controller.py`](C:/net_file_manager/controllers/search_controller.py)
- [`core/search.py`](C:/net_file_manager/core/search.py)
- [`core/cache.py`](C:/net_file_manager/core/cache.py)
- [`core/indexer.py`](C:/net_file_manager/core/indexer.py)

### Terminal

- [`ui/terminal_panel.py`](C:/net_file_manager/ui/terminal_panel.py)
- [`ui/terminal_session.py`](C:/net_file_manager/ui/terminal_session.py)
- [`ui/terminal_commands.py`](C:/net_file_manager/ui/terminal_commands.py)
- [`ui/terminal_suggest.py`](C:/net_file_manager/ui/terminal_suggest.py)

## Cambios importantes ya realizados

- Se eliminó la coexistencia de varias ventanas viejas y paneles viejos de UI.
- La app ya usa solo la ventana principal moderna `main_window.py`.
- Se agregó DPI awareness en Windows para mejorar nitidez.
- La ventana inicial ahora se adapta mejor a la resolución.
- La búsqueda usa debounce.
- El indexado evita rescans redundantes, pero `Reindexar` sigue forzando escaneo.
- La terminal lateral ya tiene:
  - historial
  - comandos rápidos por categorías
  - sugerencias ligeras
  - `cls` / `clear`
  - cambio de directorio

## Decisiones de arquitectura

- No mezclar más lógica nueva en archivos “legacy”.
- Si se agregan nuevas funciones de terminal, hacerlo sobre:
  - `terminal_panel.py`
  - `terminal_session.py`
  - `terminal_commands.py`
  - `terminal_suggest.py`
- Si se agregan nuevas funciones de archivos o paneles, hacerlo sobre:
  - `main_window.py`
  - `file_panel.py`
  - `toolbar.py`

## Pendientes recientes

- Revisar visualmente que el suggest de la terminal quede exactamente donde el usuario lo quiere.
- Seguir expandiendo la terminal como centro de trabajo para proyectos, dependencias y administración técnica.
- Posible futura mejora: renombrar `*_fixed` y `*_v2` a nombres definitivos si se quiere una estructura más limpia todavía.

## Instrucción para futuras sesiones

Antes de hacer cambios:

1. Confirmar que `app.py` siga importando `ui.main_window`.
2. No reintroducir archivos viejos eliminados.
3. Leer este archivo y el [`README.md`](C:/net_file_manager/README.md).
4. Mantener las mejoras nuevas sobre la ruta moderna, no sobre módulos antiguos.
