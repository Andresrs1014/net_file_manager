import { useState, useRef, useEffect, useCallback } from 'react';
import mermaid from 'mermaid';

interface FlowchartGeneratorProps {
  initialCode?: string;
  onExport?: (svg: string) => void;
}

export function FlowchartGenerator({ initialCode, onExport }: FlowchartGeneratorProps) {
  const [code, setCode] = useState(initialCode || `graph TD
    A[Inicio] --> B{¿Hay datos?}
    B -->|Sí| C[Procesar]
    B -->|No| D[Esperar]
    C --> E[Guardar]
    D --> B
    E --> F[Fin]`);
  const [svgOutput, setSvgOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#e5e5e5',
        primaryBorderColor: '#404040',
        lineColor: '#737373',
        secondaryColor: '#262626',
        tertiaryColor: '#1a1a1a',
        background: '#1a1a1a',
        mainBkg: '#262626',
        nodeBorder: '#404040',
        clusterBkg: '#262626',
        clusterBorder: '#404040',
        titleColor: '#e5e5e5',
        edgeLabelBackground: '#262626',
      },
      flowchart: {
        curve: 'basis',
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 80,
        useMaxWidth: true,
        htmlLabels: true,
      },
      securityLevel: 'loose',
    });
  }, []);

  // Render mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!code.trim()) {
      setSvgOutput('');
      setError(null);
      return;
    }

    try {
      const id = `mermaid-${Date.now()}`;
      const { svg } = await mermaid.render(id, code);
      setSvgOutput(svg);
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setSvgOutput('');
    }
  }, [code]);

  // Auto-render on code change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      renderDiagram();
    }, 500);
    return () => clearTimeout(timer);
  }, [code, renderDiagram]);

  // Initial render
  useEffect(() => {
    renderDiagram();
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const handleCopySVG = () => {
    if (svgOutput) {
      navigator.clipboard.writeText(svgOutput);
    }
  };

  const handleExportSVG = () => {
    if (!svgOutput) return;
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flowchart.svg';
    link.click();
    URL.revokeObjectURL(url);
    onExport?.(svgOutput);
  };

  const handleExportPNG = async () => {
    if (!svgOutput) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgOutput], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = 'flowchart.png';
          link.click();
          URL.revokeObjectURL(pngUrl);
        }
      });
    };

    img.src = url;
  };

  const handleLoadTemplate = (template: string) => {
    const templates: Record<string, string> = {
      process: `graph TD
    A[Inicio] --> B[Proceso principal]
    B --> C{Decisión}
    C -->|Sí| D[Accción A]
    C -->|No| E[Acción B]
    D --> F[Fin]
    E --> F`,
      flowchart: `graph TB
    subgraph Proceso
        A[Entrada] --> B[Validar]
        B --> C{¿Válido?}
        C -->|Sí| D[Procesar]
        C -->|No| E[Error]
    end
    D --> F[Guardar]
    E --> G[Mostrar mensaje]
    F --> H[Confirmar]
    G --> H`,
      sequence: `sequenceDiagram
    participant U as Usuario
    participant S as Sistema
    participant D as Base de datos
    
    U->>S: Solicitud
    S->>D: Consulta
    D-->>S: Resultado
    S-->>U: Respuesta`,
      state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Iniciar
    Processing --> Success: Completado
    Processing --> Error: Fallo
    Success --> [*]
    Error --> Idle: Reintentar`,
    };
    setCode(templates[template] || templates.process);
  };

  const handlePrettify = () => {
    // Simple prettification - add proper indentation
    let lines = code.split('\n');
    let indentLevel = 0;
    
    lines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Decrease indent for closing brackets
      if (trimmed.startsWith('end') || trimmed.startsWith(']')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      const indented = '    '.repeat(indentLevel) + trimmed;
      
      // Increase indent for opening brackets
      if (trimmed.endsWith('{') || trimmed.startsWith('subgraph')) {
        indentLevel++;
      }
      
      return indented;
    });
    
    setCode(lines.join('\n'));
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#262626] border-b border-[#404040]">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-[#e5e5e5]">Generador de Flujogramas</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleLoadTemplate(e.target.value)}
            className="px-3 py-1.5 bg-[#1a1a1a] text-[#a3a3a3] rounded border border-[#404040] text-sm"
            defaultValue=""
          >
            <option value="" disabled>Cargar plantilla...</option>
            <option value="process">Proceso</option>
            <option value="flowchart">Flujograma completo</option>
            <option value="sequence">Diagrama de secuencia</option>
            <option value="state">Diagrama de estados</option>
          </select>
          <button
            onClick={handlePrettify}
            className="px-3 py-1.5 bg-[#333] hover:bg-[#404040] text-[#a3a3a3] hover:text-[#e5e5e5] rounded text-sm transition-colors"
          >
            ✨ Prettify
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code editor */}
        <div className="w-1/2 flex flex-col border-r border-[#404040]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#333]">
            <span className="text-xs text-[#737373]">Código Mermaid</span>
            <button
              onClick={handleCopyCode}
              className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors"
            >
              📋 Copiar
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-4 bg-[#1a1a1a] text-[#a3a3a3] font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
            placeholder="Escribe tu código Mermaid aquí..."
          />
        </div>

        {/* Preview */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#333]">
            <span className="text-xs text-[#737373]">Vista previa</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySVG}
                className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors"
                disabled={!svgOutput}
              >
                📋 Copiar SVG
              </button>
            </div>
          </div>
          <div
            ref={svgRef}
            className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#1a1a1a]"
          >
            {error ? (
              <div className="text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-[#ef4444] text-sm">{error}</p>
              </div>
            ) : svgOutput ? (
              <div
                className="mermaid-output"
                dangerouslySetInnerHTML={{ __html: svgOutput }}
              />
            ) : (
              <div className="text-center text-[#737373]">
                <div className="text-4xl mb-2">📊</div>
                <p>Escribe código Mermaid para ver el flujograma</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[#262626] border-t border-[#404040]">
        <button
          onClick={handleExportSVG}
          disabled={!svgOutput}
          className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Exportar SVG
        </button>
        <button
          onClick={handleExportPNG}
          disabled={!svgOutput}
          className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-[#e5e5e5] rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Exportar PNG
        </button>
      </div>
    </div>
  );
}