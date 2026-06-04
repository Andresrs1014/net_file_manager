# Pruebas de análisis de procedimientos — NetVault

## Requisitos

1. Node 18+ en `E:\net_file_manager`
2. Dependencias: `npm install` (raíz) y `cd server && npm install`

## Arranque (dos terminales o uno combinado)

```powershell
# Terminal 1 — servidor de análisis
cd E:\net_file_manager\server
npm run dev

# Terminal 2 — app Electron
cd E:\net_file_manager
npm run electron:dev
```

O desde la raíz (si añadiste el script):

```powershell
npm run dev:analysis
```

## Credenciales demo (servidor)

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | aprobador_maximo |
| analista | analista123 | analista |

## Flujo de prueba recomendado

1. Abrir NetVault → barra lateral **Análisis** → **Abrir analizador de procedimientos**
2. Servidor: `http://localhost:3847` → verificar estado **Conectado**
3. Iniciar sesión (`admin` / `admin123`)
4. Cargar muestra: botón **Cargar ejemplo TC-EJEMPLO-001** o archivo  
   `samples\netvault\T&C\TC-EJEMPLO-001\procedimiento-ejemplo.md`
5. Código: `TC-EJEMPLO-001` · Área: `T&C`
6. **Analizar procedimiento** (modo mock si no hay `ANTHROPIC_API_KEY` en `server/.env`)
7. Revisar pestañas: Hallazgos, Flujograma (vista Mermaid), Procedimiento, etc.
8. **Guardar formato único** → elegir carpeta raíz (ej. `D:\netvault`)  
   Resultado: `D:\netvault\T&C\TC-EJEMPLO-001\` con `procedimiento.md`, `flujograma.mmd`, `analisis.md`, …

## Análisis real con Claude

En `server/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-opus-4-5
```

Reiniciar `npm run dev` en server. El health mostrará **Claude ✓**.

## Rúbrica

- Editar: `resources/rubrica/RUBRICA_PROCEDIMIENTOS.md` y `rubrica-agent.json`
- Reiniciar servidor para recargar
- Ver en app: pestaña **Rúbrica** en el analizador

## Límite de NetVault (esta fase)

- Analiza y guarda paquete local
- **No** publica aún en intranet ZYMO ni indexa LightRAG (siguiente fase)
