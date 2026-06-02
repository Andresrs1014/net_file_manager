# CLAUDE.md — Plantilla General

Este archivo puede colocarse en la raíz de cualquier proyecto para que Claude Code lo cargue automáticamente.

---

## Confirmación de carga

Al iniciar cada sesión, responde con este mensaje exacto al primer mensaje del usuario:
> ✅ He leído las reglas del proyecto y he cargado: **find-skills · frontend-design · web-design-guidelines · agent-browser · mcp-builder**

---

## Skills obligatorias

### find-skills
Ejecutar antes de implementar cualquier solución compleja o control de seguridad:
```
npx skills find [query]
```
Queries recomendados:
- `npx skills find owasp top 10`
- `npx skills find jwt hardening`
- `npx skills find docker security`
- `npx skills find xss csrf protection`
- `npx skills find secrets management`
- `npx skills find nginx security headers`

### frontend-design
Obligatorio antes de escribir cualquier componente UI:
- Revisar la dirección estética del proyecto antes de proponer componentes
- Micro-animaciones en momentos clave: carga, transición de estado, feedback
- Usar las fuentes y paleta definidas por el proyecto — no sustituir por defaults genéricos
- Prohibido: layouts SaaS genéricos, gradientes sin intención, Inter/Roboto sin justificación

### web-design-guidelines
Auditar antes de cada commit que incluya cambios de UI:
```
Revisa src/components/[modulo]/ contra las web-design-guidelines
```
Reporte en formato `archivo:linea`.

### agent-browser
Pruebas E2E de flujos críticos antes de despliegues:
```bash
agent-browser open [url]
agent-browser snapshot -i
agent-browser screenshot --annotate
```
Usar `--session [rol]` para aislar sesiones por rol de usuario.

### mcp-builder
Para integraciones con agentes IA usar Python/FastMCP con transporte streamable HTTP en producción.

---

## Reglas de código

- **Nunca hardcodear** secretos, tokens, credenciales ni datos sensibles
- **Docker-ready** — todo cambio debe poder desplegarse en contenedor antes de cerrar
- **No romper flujos existentes** sin justificación documentada
- **Buscar skill** con `find-skills` antes de implementar seguridad manualmente
- **frontend-design** es obligatorio en todo componente UI nuevo
- **web-design-guidelines** es obligatorio antes de commit con cambios de UI
- **agent-browser** es obligatorio para flujos críticos antes de despliegue
- **No agregar** funcionalidades no solicitadas, comentarios innecesarios ni code bloat
- **Preferir editar** archivos existentes antes de crear nuevos
- **Confirmar** antes de acciones destructivas o irreversibles (borrar ramas, force push, etc.)

---

## Stack de referencia (completar por proyecto)

| Capa | Tecnología |
|---|---|
| Frontend | — |
| Backend | — |
| Base de datos | — |
| Infra | — |
| CI/CD | — |

---

## Definición de Done

Un cambio está listo solo si:
- Build pasa en el módulo afectado
- No rompe endpoints existentes sin documentación
- Cumple criterios de seguridad (sin secrets, sin vulnerabilidades obvias)
- Es desplegable sin pasos ocultos
- UI auditada con `web-design-guidelines` (si aplica)
- Flujos críticos probados con `agent-browser` (si aplica)
- `docs` actualizado si cambió comportamiento público o de seguridad
