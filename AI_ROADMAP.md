# AI Roadmap

## Propósito

NetVault va a evolucionar de gestor de archivos técnico a `workspace assistant` personal con modelo local.

La meta es que ayude a:

- entender proyectos reales en contexto
- explicar arquitectura y código para aprendizaje
- crear estructuras de proyecto rápidamente
- asistir en terminal con comandos sugeridos
- reducir dependencia de modelos remotos para tareas repetitivas

El backend de IA previsto será local, usando `Ollama` como runtime principal.

## Visión general

El sistema de IA no debe vivir acoplado al resto de la app.

NetVault será el orquestador.
El modelo local será un motor desacoplado y reemplazable.

La integración debe funcionar en dos tipos de máquina:

### PC casa

- RTX 3050 6GB VRAM
- i5 13th
- 24GB RAM
- modelo objetivo inicial: `Qwen2.5-Coder 7B` cuantizado

### PC trabajo

- i7 Ultra
- sin GPU dedicada
- 16GB RAM
- modelo objetivo inicial: `Qwen2.5-Coder 3B` cuantizado

## Runtime elegido

### Opción principal

- `Ollama`
- endpoint local esperado: `http://localhost:11434`

### Motivo

- API local simple
- integración directa desde Python
- cambio de modelo sin reescribir NetVault
- buen punto de partida para dos máquinas con hardware distinto

## Principios de diseño

### 1. Modelo desacoplado

La app no debe depender de un único proveedor ni mezclar la lógica del modelo con la UI principal.

### 2. Human in the loop

La IA puede sugerir, planear y preparar acciones.
No debe ejecutar acciones sensibles por su cuenta.

Siempre se requiere confirmación para:

- instalar dependencias
- ejecutar comandos potencialmente destructivos
- modificar estructuras de proyecto
- operar sobre rutas de red sensibles

### 3. Contexto limitado

No enviar árboles enormes ni demasiados archivos al prompt.

Contexto preferido:

- carpeta activa
- resumen de estructura
- archivos clave
- algunos fragmentos relevantes

Ejemplos de archivos clave:

- `package.json`
- `requirements.txt`
- `pyproject.toml`
- `docker-compose.yml`
- `compose.yaml`
- `README.md`
- archivos de entry point

### 4. Aprendizaje como objetivo explícito

La IA no solo debe ejecutar o proponer.
También debe explicar:

- qué ve en el proyecto
- por qué recomienda algo
- cómo funciona el código
- qué patrones arquitectónicos identifica

### 5. Seguridad sobre automatización

Especialmente en rutas UNC o carpetas de servidor:

- nada de ejecución libre sin confirmación
- evitar acciones masivas sin revisión
- priorizar pasos planeados y visibles

## Fases de implementación

## Fase 1

### Integración con Ollama + medición real

Objetivo:

- conectar NetVault con Ollama
- validar latencia y estabilidad real en ambas máquinas
- medir experiencia mínima antes de construir UX más compleja

Entregables esperados:

- proveedor base de IA
- cliente Ollama
- prueba de conexión
- medición de tiempos de respuesta
- configuración de modelo por máquina

Preguntas que esta fase debe responder:

- cuánto tarda en responder el modelo en casa
- cuánto tarda en trabajo
- qué contexto máximo es usable
- qué modelo es aceptable en cada equipo

## Fase 2

### Chat contextual flotante

Objetivo:

- integrar un panel flotante de chat dentro de NetVault
- enfocado primero en aprendizaje, análisis y explicación

Capacidades esperadas:

- explicar una carpeta activa
- resumir estructura de proyecto
- identificar stack y patrones
- responder preguntas sobre archivos y arquitectura
- sugerir mejoras

Esta fase debe priorizar:

- utilidad real
- contexto mínimo pero útil
- buena UX

## Fase 3

### Asistente de creación de proyectos

Objetivo:

- crear proyectos nuevos en minutos
- combinar IA + estructura base segura

Capacidades esperadas:

- elegir tipo de proyecto
- elegir lenguaje o framework
- generar estructura inicial
- opcionalmente configurar:
  - git
  - README
  - entorno virtual
  - instalación de dependencias
  - archivos base

Regla importante:

- la IA propone y organiza
- NetVault ejecuta de forma segura y confirmada

## Fase 4

### Terminal IA

Objetivo:

- convertir intención en comandos sugeridos
- explicar comandos
- pedir confirmación antes de ejecutar

Capacidades esperadas:

- sugerir comandos según el proyecto actual
- convertir tareas en pasos de shell
- mostrar explicación breve de cada comando
- ejecutar solo tras confirmación

## Arquitectura planeada

La nueva capa de IA se construirá en un paquete separado.

### Estructura prevista

- `ai/provider.py`
  - interfaz base del proveedor de IA

- `ai/ollama_provider.py`
  - implementación concreta para Ollama

- `ai/context_builder.py`
  - construcción de contexto resumido desde carpeta activa y archivos clave

- `ai/prompts.py`
  - prompts base, instrucciones del sistema y plantillas

- `ai/assistant_panel.py`
  - panel flotante de chat en la UI

## Posibles extensiones futuras

- `ai/model_config.py`
  - selección/configuración de modelo local

- `ai/project_generator.py`
  - generación guiada de estructura de proyecto

- `ai/command_planner.py`
  - intención a plan de comandos

- `ai/safety.py`
  - clasificación de riesgo y confirmaciones

## Flujo de trabajo acordado

### Rol de Claude

- diseña la capa de IA
- propone y escribe el código nuevo de esa capa

### Rol de Codex en este repo

- aplica los cambios al repo
- reporta errores reales de integración o ejecución
- verifica compatibilidad con el código existente
- mantiene el repo ordenado

### Regla de coordinación

Si algo falla después de aplicar un archivo:

- Codex reporta el fallo real
- el usuario lo lleva a Claude
- Claude ajusta la propuesta
- luego se aplica la corrección

Para evitar contradicciones:

- Codex no debe rediseñar por su cuenta la capa de IA ya acordada
- salvo ajustes mínimos de integración claramente necesarios

## Orden de implementación acordado

1. Crear este roadmap
2. Preparar la carpeta `ai/`
3. Integrar proveedor Ollama
4. Medir latencia y experiencia base
5. Construir chat contextual flotante
6. Construir asistente de creación de proyectos
7. Construir terminal IA con confirmaciones

## Restricciones operativas

- No hacer commits automáticos
- Los commits los hace el usuario
- Este archivo debe mantenerse actualizado si cambia la dirección del proyecto

## Nota de continuidad

Si una sesión futura no recuerda el contexto:

1. leer este archivo completo
2. leer [`SESSION_CONTINUITY.md`](C:/net_file_manager/SESSION_CONTINUITY.md)
3. confirmar qué fase está activa
4. continuar desde la arquitectura aquí definida
