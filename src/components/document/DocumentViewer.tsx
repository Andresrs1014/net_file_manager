import { useState, useEffect } from 'react';
import { convertToMarkdown, isSupported, getFileType, type ConversionResult } from '../../services/documentService';

interface DocumentViewerProps {
  filePath: string;
  onClose: () => void;
  onConvert?: (result: ConversionResult) => void;
}

export function DocumentViewer({ filePath, onClose, onConvert }: DocumentViewerProps) {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);

  useEffect(() => {
    loadDocument();
  }, [filePath]);

  const loadDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupported(filePath)) {
        setError(`Tipo de archivo no soportado. Solo PDF, DOCX y MD.`);
        setLoading(false);
        return;
      }

      const conversionResult = await convertToMarkdown(filePath);

      if (conversionResult.success) {
        setMarkdown(conversionResult.markdown);
        setResult(conversionResult);
        onConvert?.(conversionResult);
      } else {
        setError(conversionResult.error || 'Error desconocido al convertir');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el documento');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown);
  };

  const handleExport = async () => {
    if (!result) return;

    try {
      const outputPath = filePath.replace(/\.(pdf|docx?|md)$/i, '.md');
      await window.electronAPI.writeFile(outputPath, markdown);
      alert(`Guardado: ${outputPath}`);
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    }
  };

  const renderMarkdown = (md: string) => {
    // Simple markdown rendering
    let html = md
      // Frontmatter
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-[#3b82f6]">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-[#60a5fa]">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      // Code
      .replace(/`([^`]+)`/g, '<code class="bg-[#262626] px-1.5 py-0.5 rounded text-[#f97316] text-sm">$1</code>')
      // Code blocks
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```\w*\n?/g, '');
        return `<pre class="bg-[#1a1a1a] p-4 rounded-lg my-4 overflow-x-auto"><code class="text-[#a3a3a3] text-sm">${code.trim()}</code></pre>`;
      })
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc list-inside text-[#a3a3a3]">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal list-inside text-[#a3a3a3]">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#3b82f6] hover:underline">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="my-3 text-[#a3a3a3] leading-relaxed">')
      .replace(/\n/g, '<br/>');

    return `<p class="my-3 text-[#a3a3a3] leading-relaxed">${html}</p>`;
  };

  const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'Documento';
  const fileType = getFileType(filePath);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-[90vw] h-[90vh] flex flex-col border border-[#404040] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#404040]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {fileType === 'pdf' ? '📄' : fileType === 'docx' ? '📝' : '📋'}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#e5e5e5]">{fileName}</h2>
              <p className="text-xs text-[#737373]">
                {fileType.toUpperCase()} → Markdown
                {result && ` • ${result.metadata.pages || '?'} página(s)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result && (
              <>
                <button
                  onClick={handleCopyMarkdown}
                  className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#333] text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg transition-colors"
                  title="Copiar Markdown"
                >
                  📋 Copiar
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-sm bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors"
                  title="Exportar como .md"
                >
                  💾 Exportar .md
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#ef4444] text-[#a3a3a3] hover:text-white rounded-lg transition-colors ml-4"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4 animate-bounce">📖</div>
                <p className="text-[#a3a3a3]">Convirtiendo documento...</p>
                <p className="text-xs text-[#737373] mt-2">{filePath}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">⚠️</div>
                <p className="text-[#ef4444] text-lg font-medium">Error</p>
                <p className="text-[#a3a3a3] mt-2">{error}</p>
                <button
                  onClick={loadDocument}
                  className="mt-4 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#404040] flex items-center justify-between text-xs text-[#737373]">
          <span>
            {result ? (
              <>
                ✓ Convertido • {markdown.split(/\s+/).length} palabras • Hash: {result.metadata.hash?.substring(0, 8)}
              </>
            ) : (
              <>
                Formatos soportados: PDF, DOCX, DOC, MD
              </>
            )}
          </span>
          <span>Usa Ctrl+C para copiar el contenido completo</span>
        </div>
      </div>
    </div>
  );
}