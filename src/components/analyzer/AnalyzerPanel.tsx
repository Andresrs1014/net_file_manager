import { useState, useRef, useEffect } from 'react';
import { aiService, type Message } from '../../services/indexer/aiService';
import { useAIConfig, getDefaultOllamaModel } from '../../services/indexer/aiConfig';

interface AnalysisResult {
  entities: Entity[];
  procedures: Procedure[];
  flowchartCode?: string;
  summary: string;
}

interface Entity {
  name: string;
  type: 'person' | 'department' | 'document' | 'system' | 'process' | 'location';
  description?: string;
  mentions: number;
}

interface Procedure {
  name: string;
  steps: string[];
  responsible?: string;
  inputs?: string[];
  outputs?: string[];
  relatedEntities: string[];
}

export function AnalyzerPanel({ onClose }: { onClose: () => void }) {
  const { config, isLoaded } = useAIConfig();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isAIReady, setIsAIReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize AI on mount
  useEffect(() => {
    if (isLoaded && config) {
      aiService.initialize({
        provider: config.provider,
        model: config.model || getDefaultOllamaModel(),
        apiKey: config.apiKey,
      }).then(() => setIsAIReady(true)).catch(() => setIsAIReady(false));
    }
  }, [isLoaded, config]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProgress('Convirtiendo documento...');
    setError(null);
    setAnalysisResult(null);

    try {
      // Read file content (for supported types)
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        setDocumentContent(content);
        setProgress('Documento cargado. Listo para analizar.');
      };
      reader.readAsText(file);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  };

  const handleAnalyze = async () => {
    if (!documentContent.trim()) {
      setError('Primero carga un documento');
      return;
    }

    if (!isAIReady) {
      setError('AI no está configurado. Configura Ollama o Claude en AI Settings.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress('Analizando documento...');

    try {
      // Prepare the analysis prompt
      const systemPrompt = `Eres un asistente especializado en análisis de procedimientos empresariales. Analiza el documento proporcionado y extrae:

1. ENTIDADES: Personas, departamentos, documentos, sistemas, procesos y ubicaciones mencionadas. Para cada entidad incluye:
   - Nombre
   - Tipo (person/department/document/system/process/location)
   - Descripción breve
   - Número de menciones

2. PROCEDIMIENTOS: Flujos de trabajo y procesos descritos. Para cada procedimiento incluye:
   - Nombre
   - Pasos (secuencia de acciones)
   - Responsable
   - Entradas y salidas
   - Entidades relacionadas

3. FLUJOGRAMA: Código Mermaid para visualizar el procedimiento principal.

4. RESUMEN: Resumen ejecutivo del documento.

Responde en JSON con esta estructura exacta:
{
  "entities": [{"name": "", "type": "", "description": "", "mentions": 0}],
  "procedures": [{"name": "", "steps": [], "responsible": "", "inputs": [], "outputs": [], "relatedEntities": []}],
  "flowchartCode": "graph TD ...",
  "summary": ""
}`;

      const userMessage = `Analiza este documento:\n\n${documentContent.substring(0, 15000)}`;

      setProgress('Enviando a IA...');

      const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ];

      const response = await aiService.chat(messages);
      
      setProgress('Procesando respuesta...');

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as AnalysisResult;
        setAnalysisResult(result);
        setProgress('Análisis completado');
      } else {
        // Try to extract markdown content
        setAnalysisResult({
          entities: [],
          procedures: [],
          summary: response,
          flowchartCode: '',
        });
        setProgress('Análisis completado');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error en análisis: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportResults = () => {
    if (!analysisResult) return;

    const exportData = {
      fechaAnalisis: new Date().toISOString(),
      documentoOriginal: documentContent.substring(0, 1000) + '...',
      ...analysisResult,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    if (analysisResult?.summary) {
      navigator.clipboard.writeText(analysisResult.summary);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-[95vw] h-[95vh] flex flex-col border border-[#404040] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#404040]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔬</span>
            <div>
              <h2 className="text-lg font-semibold text-[#e5e5e5]">Analizador de Procedimientos</h2>
              <p className="text-xs text-[#737373]">
                Analiza documentos y extrae entidades, procedimientos y flujogramas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportResults}
              disabled={!analysisResult}
              className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#333] text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📥 Exportar JSON
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#ef4444] text-[#a3a3a3] hover:text-white rounded-lg transition-colors"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* File upload */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.docx,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-[#262626] hover:bg-[#333] text-[#e5e5e5] rounded-lg border border-[#404040] transition-colors"
            >
              📁 Cargar documento (MD, TXT, DOCX, PDF)
            </button>
            {documentContent && (
              <span className="ml-4 text-[#737373]">
                {documentContent.length} caracteres cargados
              </span>
            )}
          </div>

          {/* Progress / Status */}
          {(progress || error) && (
            <div className={`mb-6 p-4 rounded-lg ${
              error ? 'bg-[#ef4444]/10 border border-[#ef4444]' : 'bg-[#3b82f6]/10 border border-[#3b82f6]'
            }`}>
              {error ? (
                <p className="text-[#ef4444]">{error}</p>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="animate-spin text-lg">⏳</div>
                  <p className="text-[#3b82f6]">{progress}</p>
                </div>
              )}
            </div>
          )}

          {/* Analyze button */}
          <div className="mb-6">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !documentContent}
              className="px-6 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? '⏳ Analizando...' : '🔬 Analizar documento'}
            </button>
          </div>

          {/* Results */}
          {analysisResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-[#262626] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-[#e5e5e5]">📋 Resumen</h3>
                  <button
                    onClick={handleCopySummary}
                    className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors"
                  >
                    📋 Copiar
                  </button>
                </div>
                <p className="text-[#a3a3a3] leading-relaxed whitespace-pre-wrap">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Entities */}
              <div className="bg-[#262626] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#e5e5e5] mb-3">
                  🧩 Entidades detectadas ({analysisResult.entities.length})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {analysisResult.entities.map((entity, index) => (
                    <div
                      key={index}
                      className="bg-[#1a1a1a] p-3 rounded border border-[#333]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {entity.type === 'person' ? '👤' :
                           entity.type === 'department' ? '🏢' :
                           entity.type === 'document' ? '📄' :
                           entity.type === 'system' ? '💻' :
                           entity.type === 'process' ? '⚙️' : '📍'}
                        </span>
                        <span className="font-medium text-[#e5e5e5]">{entity.name}</span>
                      </div>
                      <div className="text-xs text-[#737373]">
                        <span className="px-2 py-0.5 bg-[#333] rounded">{entity.type}</span>
                        <span className="ml-2">📍 {entity.mentions} menciones</span>
                      </div>
                      {entity.description && (
                        <p className="mt-2 text-sm text-[#a3a3a3]">{entity.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Procedures */}
              <div className="bg-[#262626] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#e5e5e5] mb-3">
                  📝 Procedimientos detectados ({analysisResult.procedures.length})
                </h3>
                {analysisResult.procedures.map((procedure, index) => (
                  <div
                    key={index}
                    className="bg-[#1a1a1a] p-4 rounded border border-[#333] mb-4 last:mb-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📌</span>
                      <span className="font-semibold text-[#e5e5e5]">{procedure.name}</span>
                    </div>
                    {procedure.responsible && (
                      <p className="text-sm text-[#737373] mb-2">
                        <span className="text-[#a3a3a3]">Responsable:</span> {procedure.responsible}
                      </p>
                    )}
                    <div className="mb-2">
                      <span className="text-sm text-[#737373]">Pasos:</span>
                      <ol className="mt-1 space-y-1">
                        {procedure.steps.map((step, stepIndex) => (
                          <li key={stepIndex} className="flex items-start gap-2 text-sm text-[#a3a3a3]">
                            <span className="text-[#3b82f6] font-bold">{stepIndex + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                    {procedure.relatedEntities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {procedure.relatedEntities.map((entity, eIndex) => (
                          <span key={eIndex} className="px-2 py-0.5 bg-[#333] text-xs text-[#a3a3a3] rounded">
                            {entity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Flowchart Code */}
              {analysisResult.flowchartCode && (
                <div className="bg-[#262626] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#e5e5e5] mb-3">
                    📊 Código Mermaid
                  </h3>
                  <pre className="bg-[#1a1a1a] p-4 rounded text-sm text-[#a3a3a3] overflow-x-auto">
                    <code>{analysisResult.flowchartCode}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!analysisResult && !progress && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-6xl mb-4">🔬</div>
              <h3 className="text-xl font-semibold text-[#e5e5e5] mb-2">
                Analizador de Procedimientos
              </h3>
              <p className="text-[#737373] max-w-md">
                Carga un documento y usa IA para extraer entidades, procedimientos
                y generar flujogramas automáticamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#404040] text-xs text-[#737373]">
          Usa Ollama local o Claude API para el análisis · Configura en AI Settings
        </div>
      </div>
    </div>
  );
}