# Investigación — Distribución de opciones en el front de NetVault

> Objetivo: que una app con muchas opciones (explorador, preview, análisis, flujograma, grafo,
> terminal, sync, aprobación) no se sienta saturada y gane calidad visual. Síntesis de patrones
> probados + propuesta concreta para NetVault.

---

## 1. Patrones que aplican (y por qué)

### 1.1 Layout "Workbench" (modelo VS Code)
Es el estándar de facto para herramientas densas. Separa la pantalla en regiones de rol fijo:
**barra de actividad** (lateral extremo, para cambiar de vista), **sidebar primaria** (explorador,
búsqueda, control de versiones), **área de editor** (centro, con pestañas), **panel inferior**
(terminal/salida) y **sidebar secundaria** opcional al lado opuesto para ver dos vistas a la vez
sin perder contexto. La sidebar secundaria nació justamente para mostrar información adicional
sin sacar al usuario de su foco. Cada región es movible y persistible.

> Por qué encaja: NetVault tiene exactamente esa mezcla de navegación + documento + salida + herramientas.

### 1.2 Doble panel (file managers tipo Total Commander)
Para **mover y comparar** archivos, el patrón clásico es dos paneles lado a lado. NetVault no lo
necesita como layout principal, pero sí como **modo puntual** para comparar versiones o mover
entre áreas.

### 1.3 Divulgación progresiva (Nielsen, 1995)
El principio: mostrar primero solo lo esencial y revelar lo avanzado **cuando se necesita**, para
reducir la carga cognitiva y los errores. Variantes útiles aquí:
- **Contextual:** mostrar comandos/barras solo cuando son relevantes al objeto seleccionado o al modo.
- **Condicional:** opciones avanzadas detrás de un toggle ("Avanzado").
- **Paso a paso:** flujos multi-etapa (el análisis y la aprobación encajan como wizard).

Acordeones, "ver más" y barras contextuales son sus formas concretas; mantienen la vista principal
limpia sin esconder funcionalidad.

### 1.4 Paleta de comandos (Cmd/Ctrl+K)
Pensada exactamente para apps con **muchas funciones** y **navegación compleja**: el usuario busca
la acción por nombre en vez de cazarla en menús, y no ocupa espacio permanente en pantalla.
Buenas prácticas: agrupar comandos por categoría, búsqueda rápida y precisa, dar feedback al
ejecutar, y **pistar su existencia en la UI** (si está escondida, nadie la usa). Librerías maduras:
`cmdk` y `kbar`.

> Para NetVault es ideal: el "modo CLI agente" que quieres se expresa muy natural como paleta
> de comandos + terminal.

### 1.5 Estados y feedback
Regla transversal de las fuentes: planifica los estados **vacío, cargando y error** en el mismo
contenedor, y no muevas contenido no relacionado cuando cambia un estado. No dependas de la
decoración para comunicar el estado del sistema.

---

## 2. Layout propuesto para NetVault

```
┌────┬──────────────────┬────────────────────────────────┬──────────────────┐
│ A  │  SIDEBAR PRIMARIA │        ÁREA CENTRAL (pestañas)  │ SIDEBAR SECUND.  │
│ C  │                  │                                │                  │
│ T  │  Explorador por  │   [ procedimiento.md ] [ ... ] │  Resultado del   │
│ I  │  área:           │                                │  análisis:       │
│ V  │   ▸ T&C          │   Preview / Editor del          │   • Hallazgos    │
│ I  │   ▸ P&C          │   documento o flujograma        │   • Flujograma   │
│ D  │   ▸ Transportes  │   Mermaid                       │   • Tiempos      │
│ A  │                  │                                │   • Propuestas   │
│ D  │  (búsqueda ↑)    │                                │                  │
├────┴──────────────────┴────────────────────────────────┴──────────────────┤
│  PANEL INFERIOR:  Terminal / CLI agente   ·   Estado de sincronización      │
├─────────────────────────────────────────────────────────────────────────────┤
│  STATUS BAR:  usuario · rama/versión · sync (✔/⏳/⚠) · costo Claude del día   │
└─────────────────────────────────────────────────────────────────────────────┘
        ⌘K  →  Paleta de comandos (analizar, comparar, subir ✅, buscar, ir a…)
```

Mapeo de tus componentes actuales:
- **Barra de actividad (A):** Explorador · Búsqueda · Análisis · Grafo de conocimiento · Sync.
- **Sidebar primaria:** `FilePanel` + `PathNavigator`, árbol por área.
- **Área central:** `DocumentViewer` (docx/pdf/md) y `FlowchartGenerator` (Mermaid), en pestañas.
- **Sidebar secundaria:** salida del análisis (hallazgos, flujograma generado, tiempos, propuestas)
  — visible **sin** tapar el documento; aquí brilla la sidebar secundaria.
- **Panel inferior:** `Terminal` + estado de sync.
- **Status bar:** usuario, versión, estado de sync y **costo del día** (ata OP-8 a la vista).
- **`KnowledgeGraph`:** vista de pantalla completa desde la barra de actividad (no compite por espacio).

---

## 3. Cómo distribuir las opciones (la regla práctica)

1. **Tres niveles de profundidad:**
   - *Nivel 1 (siempre visible):* navegar archivos, abrir, analizar, subir ✅. Lo que se usa siempre.
   - *Nivel 2 (contextual):* aparece al seleccionar un documento (comparar versión, regenerar
     flujograma, ver tiempos) — barra contextual, no menú global.
   - *Nivel 3 (paleta ⌘K / "Avanzado"):* investigación web, reindexar, exportar corpus ZYMO,
     resolver conflictos, configuración.
2. **Una acción = un lugar.** Que "analizar" o "subir" estén siempre en el mismo sitio, no en tres.
3. **La paleta de comandos es tu válvula de escape:** cualquier opción rara vive ahí y no ensucia
   la pantalla. Pista su existencia con un hint visible (`⌘K`).
4. **Feedback explícito:** cada acción larga (análisis, sync, subida) muestra cargando → resultado/error
   en su mismo contenedor.

---

## 4. Calidad visual (lo que más rinde con menos esfuerzo)

- **Sistema de espaciado y tipografía consistente** (una escala de 4/8px; 2–3 tamaños de texto, no diez).
- **Jerarquía por peso, no por color saturado:** el color fuerte se reserva para estado y acción primaria.
- **Estado de sync y severidad de hallazgos con color semántico** (✔ verde, ⏳ ámbar, ⚠ rojo) y siempre
  con ícono + texto (no solo color, por accesibilidad).
- **Densidad ajustable** (compacto/cómodo), como hace el "layout picker" de los file managers modernos.
- **Persistir el layout** del usuario (qué paneles abiertos, anchos) entre sesiones.
- **Animaciones mínimas y con propósito** (transición de panel, no decorativas).

---

## 5. Resumen de decisiones

- Layout base: **workbench** (barra de actividad + sidebar primaria + central + secundaria + panel + status).
- Opciones repartidas por **divulgación progresiva** en 3 niveles.
- **Paleta de comandos ⌘K** para el modo CLI y para todo lo avanzado.
- Doble panel solo como **modo puntual** de comparación.
- Calidad visual = consistencia + jerarquía + estados explícitos + persistencia de layout.

---

## Fuentes

- VS Code – Custom Layout y User Interface: https://code.visualstudio.com/docs/configure/custom-layout
- VS Code – Workbench Layer (regiones): https://microsoft-vscode-15.mintlify.app/architecture/workbench-layer
- Sidebar secundaria (motivación): https://github.com/microsoft/vscode/issues/132893
- Total Commander / doble panel: https://www.techradar.com/best/the-best-file-manager
- Files 3.3 – layout picker / densidad: https://tech.yahoo.com/general/articles/microsoft-needs-copy-feature-best-140037753.html
- Divulgación progresiva (definición y variantes): https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/ · https://ui-patterns.com/patterns/ProgressiveDisclosure
- Divulgación progresiva en apps densas (Slack, dashboards): https://www.interaction-design.org/literature/topics/progressive-disclosure
- Controles de divulgación / comandos contextuales: https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-progressive-disclosure-controls
- Paleta de comandos (buenas prácticas): https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1 · https://uxpatterns.dev/patterns/advanced/command-palette
- Paleta de comandos (variantes y libs cmdk/kbar): https://mobbin.com/glossary/command-palette
