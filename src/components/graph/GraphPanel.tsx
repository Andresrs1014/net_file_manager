import { useState } from 'react';
import { KnowledgeGraph, type GraphData, type GraphNode, type GraphEdge } from './KnowledgeGraph';

interface GraphPanelProps {
  onClose: () => void;
  initialData?: GraphData;
}

export function GraphPanel({ onClose, initialData }: GraphPanelProps) {
  const [graphData, setGraphData] = useState<GraphData>(initialData || { nodes: [], edges: [] });

  const handleNodeClick = (_node: GraphNode) => {
    // Handle node click
  };

  const handleEdgeClick = (_edge: GraphEdge) => {
    // Handle edge click
  };

  const handleExportSVG = () => {
    const svg = document.querySelector('.knowledge-graph svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph.svg';
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(graphData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-graph.json';
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    // Sample data for demo
    const sampleData: GraphData = {
      nodes: [
        { id: '1', label: 'Procedimiento A', type: 'process' },
        { id: '2', label: 'Documento X', type: 'document' },
        { id: '3', label: 'Empleado John', type: 'entity' },
        { id: '4', label: 'Departamento Ventas', type: 'concept' },
        { id: '5', label: 'Manual Y', type: 'document' },
        { id: '6', label: 'Procedimiento B', type: 'process' },
        { id: '7', label: 'Empleado Mary', type: 'entity' },
        { id: '8', label: 'Norma ISO', type: 'concept' },
      ],
      edges: [
        { source: '1', target: '2', label: 'documenta', type: 'contains' },
        { source: '1', target: '3', label: 'asigna', type: 'uses' },
        { source: '2', target: '4', label: 'pertenece', type: 'relates' },
        { source: '3', target: '4', label: 'miembro', type: 'relates' },
        { source: '1', target: '5', label: 'referencia', type: 'references' },
        { source: '6', target: '1', label: 'sigue', type: 'follows' },
        { source: '7', target: '4', label: 'lidera', type: 'relates' },
        { source: '5', target: '8', label: 'cumple', type: 'references' },
      ]
    };
    setGraphData(sampleData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-[95vw] h-[95vh] flex flex-col border border-[#404040] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#404040]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕸️</span>
            <div>
              <h2 className="text-lg font-semibold text-[#e5e5e5]">Grafo de Conocimiento</h2>
              <p className="text-xs text-[#737373]">
                Visualiza entidades, conceptos y relaciones extraídas de documentos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#333] text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg transition-colors"
            >
              📊 Datos de ejemplo
            </button>
            <button
              onClick={handleExportSVG}
              className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#333] text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg transition-colors"
              disabled={graphData.nodes.length === 0}
            >
              📥 SVG
            </button>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#333] text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg transition-colors"
              disabled={graphData.nodes.length === 0}
            >
              📥 JSON
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#ef4444] text-[#a3a3a3] hover:text-white rounded-lg transition-colors ml-4"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full w-full">
            <KnowledgeGraph
              data={graphData}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              width={1200}
              height={700}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#404040] flex items-center justify-between text-xs text-[#737373]">
          <span>
            {graphData.nodes.length} nodos · {graphData.edges.length} relaciones
          </span>
          <span>
            Generado por IA · Usa D3.js para visualización
          </span>
        </div>
      </div>
    </div>
  );
}