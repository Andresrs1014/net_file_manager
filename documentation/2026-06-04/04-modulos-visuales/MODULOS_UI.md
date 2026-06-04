# Módulos de interfaz — NetVault

## Árbol de componentes

```
App
├── Toolbar
│   └── SearchBar
├── Sidebar
├── FilePanel (×2 o Terminal o AIChat)
│   ├── PathNavigator
│   └── FileItem (×N)
├── Footer status
└── Modales condicionales
    ├── Scaffolder
    ├── DocumentViewer
    ├── GraphPanel → KnowledgeGraph
    ├── FlowchartPanel → FlowchartGenerator
    ├── AnalyzerPanel
    └── ExportPanel
```

## Componentes comunes

### `InputDialog`

- Modal centrado; validación opcional; Enter/Escape.
- Usado en renombrar y crear (crear con bug de wiring).

### `ContextMenu`

- Posición x,y; items con separator, danger, shortcut.
- Animación scale + backdrop blur.

## Estados visuales globales

| Token | Uso |
|-------|-----|
| `#1a1a1a` | Fondo principal |
| `#262626` | Paneles, toolbar |
| `#3b82f6` | Acento, selección |
| `#404040` | Bordes |

## Modales — z-index

- Mayoría `z-50` o `z-[200]` para InputDialog/AIContext.
- Toolbar `z-50` para dropdown IA.

## Componentes no montados en App

- `AIContext` — no importado en `App.tsx`
- `AISettings` — usar desde otros flujos si se integra

## Accesibilidad parcial

- FileItem: `role="listitem"`, `aria-selected`, focus ring.
- ContextMenu: `role` en algunos menús.
