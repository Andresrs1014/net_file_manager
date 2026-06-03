import { FlowchartGenerator } from './FlowchartGenerator';

interface FlowchartPanelProps {
  onClose: () => void;
  initialCode?: string;
}

export function FlowchartPanel({ onClose, initialCode }: FlowchartPanelProps) {
  const handleExport = (svg: string) => {
    console.log('Exported SVG:', svg.substring(0, 100) + '...');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-[95vw] h-[95vh] flex flex-col border border-[#404040] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#404040]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-lg font-semibold text-[#e5e5e5]">Generador de Flujogramas</h2>
              <p className="text-xs text-[#737373]">
                Crea diagramas con sintaxis Mermaid y exporta a SVG/PNG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#ef4444] text-[#a3a3a3] hover:text-white rounded-lg transition-colors"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full">
            <FlowchartGenerator
              initialCode={initialCode}
              onExport={handleExport}
            />
          </div>
        </div>
      </div>
    </div>
  );
}