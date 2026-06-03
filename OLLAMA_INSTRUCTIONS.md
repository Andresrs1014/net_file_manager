# NetVault - Instrucciones de Uso con Ollama

## Requisitos

1. **Ollama instalado** - Descarga desde https://ollama.com/download
2. **Modelo de Ollama** - Recomendado: `qwen2.5-coder:7b`

## Instalación de Ollama

### 1. Instalar Ollama (Windows)

```powershell
# Descarga desde https://ollama.com/download
# O usa winget:
winget install Ollama.Ollama
```

### 2. Descargar modelo

```powershell
# Modelo recomendado para código
ollama pull qwen2.5-coder:7b

# Alternativa más pequeña (3B)
ollama pull qwen2.5-coder:3b

# Otros modelos compatibles
ollama pull codellama:7b
ollama pull llama3.2:3b
ollama pull mistral:7b
```

### 3. Verificar que Ollama está corriendo

```powershell
# En navegador: http://localhost:11434
# Debería mostrar "Ollama is running"

# Listar modelos descargados
ollama list
```

## Configuración en NetVault

1. Abre NetVault con `npm run electron:dev`
2. Activa el panel AI (click en 🤖)
3. El sistema automáticamente detectará Ollama si está corriendo en `localhost:11434`

### Modelos disponibles por defecto:

| Modelo | Descripción | RAM |
|--------|-------------|-----|
| qwen2.5-coder:7b | Código y análisis (RECOMENDADO) | ~7GB |
| qwen2.5-coder:3b | Versión ligera | ~3GB |
| codellama:7b | Código general | ~7GB |
| llama3.2:3b | Generalista | ~3GB |
| mistral:7b | Código y texto | ~7GB |

## Solución de problemas

### Ollama no responde

```powershell
# Reiniciar Ollama
ollama serve

# Ver logs
ollama ps
```

### Error de conexión

1. Verificar que Ollama está corriendo: `http://localhost:11434`
2. Verificar que el modelo está descargado: `ollama list`
3. Reiniciar NetVault

### Modelo muy lento

- Usar modelo más pequeño (`qwen2.5-coder:3b`)
- Cerrar otras aplicaciones
- Verificar que no hay swapped de memoria

## Configuración avanzada

Para cambiar el modelo, edita el archivo `src/services/indexer/aiConfig.ts`:

```typescript
export const OLLAMA_MODELS = [
  { id: 'tu-modelo:version', name: 'Nombre', description: 'Desc', memory: '~XGB' },
  // ...
];
```

## Alternativa: Claude API

Si no tienes GPU suficiente para Ollama, puedes usar Claude API:

1. Obtén API key de https://console.anthropic.com/
2. En el futuro panel de configuración de AI, selecciona "claude" como provider

---

**Nota:** Ollama usa toda la RAM del modelo. Si tienes 16GB de RAM, usa `qwen2.5-coder:7b`. Si tienes 8GB, usa `qwen2.5-coder:3b` o `phi3:3.8b`.