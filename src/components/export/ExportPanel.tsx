import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ExportData {
  analysis: {
    entities: Array<{ name: string; type: string; description: string; mentions: number }>;
    procedures: Array<{ name: string; steps: string[]; responsible: string; relatedEntities: string[] }>;
    summary: string;
    flowchartCode?: string;
  };
  documents: Array<{ name: string; content: string; type: string }>;
  graph: {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; label: string; type: string }>;
  };
  metadata: {
    projectName: string;
    exportDate: string;
    totalDocuments: number;
    totalEntities: number;
    totalProcedures: number;
  };
}

interface ExportPanelProps {
  data: ExportData;
  onClose: () => void;
}

export function ExportPanel({ data, onClose }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [exportFormats, setExportFormats] = useState({
    json: true,
    markdown: true,
    svg: true,
    csv: false,
  });

  const handleFormatToggle = (format: keyof typeof exportFormats) => {
    setExportFormats(prev => ({ ...prev, [format]: !prev[format] }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress('Creando archivo ZIP...');

    try {
      const zip = new JSZip();

      // Add README
      const readme = `# Proyecto de Análisis ZYMO

## Resumen
- **Fecha de exportación:** ${data.metadata.exportDate}
- **Proyecto:** ${data.metadata.projectName}
- **Documentos analizados:** ${data.metadata.totalDocuments}
- **Entidades detectadas:** ${data.metadata.totalEntities}
- **Procedimientos identificados:** ${data.metadata.totalProcedures}

## Estructura del contenido

\`\`\`
/
├── README.md
├── analysis/
│   ├── summary.md
│   ├── entities.json
│   ├── procedures.json
│   └── flowchart.mmd
├── documents/
│   └── *.md (documentos convertidos)
├── graph/
│   ├── nodes.json
│   └── edges.json
└── export/
    └── metadata.json
\`\`\`

## Uso

1. Abre los archivos .md en cualquier editor de texto o visor de Markdown
2. Usa NetVault para visualizar el grafo de conocimiento
3. Importa los archivos .json en otras herramientas de análisis

## Herramientas relacionadas

- **NetVault:** https://github.com/aquinterop/netvault
- **Mermaid:** https://mermaid.js.org/ (para visualizar flujogramas)
- **D3.js:** https://d3js.org/ (para visualizar grafos)

---
Generado automáticamente por NetVault AI
`;
      zip.file('README.md', readme);

      // JSON export
      if (exportFormats.json) {
        setProgress('Agregando archivos JSON...');
        zip.file('export/metadata.json', JSON.stringify(data.metadata, null, 2));
        zip.file('analysis/entities.json', JSON.stringify(data.analysis.entities, null, 2));
        zip.file('analysis/procedures.json', JSON.stringify(data.analysis.procedures, null, 2));
        zip.file('analysis/summary.json', JSON.stringify({ summary: data.analysis.summary }, null, 2));
        zip.file('graph/nodes.json', JSON.stringify(data.graph.nodes, null, 2));
        zip.file('graph/edges.json', JSON.stringify(data.graph.edges, null, 2));
      }

      // Markdown export
      if (exportFormats.markdown) {
        setProgress('Creando archivos Markdown...');
        
        // Summary
        let summaryMd = `# Resumen del Análisis\n\n`;
        summaryMd += `**Fecha:** ${data.metadata.exportDate}\n\n`;
        summaryMd += `## Resumen Ejecutivo\n\n${data.analysis.summary}\n\n`;
        
        // Entities
        summaryMd += `## Entidades Detectadas\n\n`;
        summaryMd += `| Nombre | Tipo | Menciones | Descripción |\n`;
        summaryMd += `|--------|------|-----------|-------------|\n`;
        for (const entity of data.analysis.entities) {
          summaryMd += `| ${entity.name} | ${entity.type} | ${entity.mentions} | ${entity.description || '-'} |\n`;
        }
        summaryMd += `\n`;
        
        // Procedures
        summaryMd += `## Procedimientos Identificados\n\n`;
        for (const procedure of data.analysis.procedures) {
          summaryMd += `### ${procedure.name}\n`;
          if (procedure.responsible) {
            summaryMd += `**Responsable:** ${procedure.responsible}\n\n`;
          }
          summaryMd += `**Pasos:**\n`;
          for (let i = 0; i < procedure.steps.length; i++) {
            summaryMd += `${i + 1}. ${procedure.steps[i]}\n`;
          }
          if (procedure.relatedEntities.length > 0) {
            summaryMd += `\n**Entidades relacionadas:** ${procedure.relatedEntities.join(', ')}\n`;
          }
          summaryMd += `\n---\n\n`;
        }

        zip.file('analysis/summary.md', summaryMd);

        // Documents
        for (const doc of data.documents) {
          zip.file(`documents/${doc.name}.md`, doc.content);
        }
      }

      // CSV export
      if (exportFormats.csv) {
        setProgress('Creando archivos CSV...');
        
        // Entities CSV
        let entitiesCsv = 'Nombre,Tipo,Menciones,Descripción\n';
        for (const entity of data.analysis.entities) {
          entitiesCsv += `"${entity.name}","${entity.type}",${entity.mentions},"${entity.description || ''}"\n`;
        }
        zip.file('analysis/entities.csv', entitiesCsv);

        // Procedures CSV
        let proceduresCsv = 'Nombre,Responsable,Número de pasos,Entidades relacionadas\n';
        for (const procedure of data.analysis.procedures) {
          proceduresCsv += `"${procedure.name}","${procedure.responsible || ''}",${procedure.steps.length},"${procedure.relatedEntities.join('; ')}"\n`;
        }
        zip.file('analysis/procedures.csv', proceduresCsv);
      }

      // SVG (flowchart code)
      if (exportFormats.svg && data.analysis.flowchartCode) {
        setProgress('Agregando flujograma Mermaid...');
        zip.file('analysis/flowchart.mmd', data.analysis.flowchartCode);
      }

      // Generate ZIP
      setProgress('Generando archivo ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Download
      const fileName = `analisis-${data.metadata.projectName.replace(/\s+/g, '-')}-${Date.now()}.zip`;
      saveAs(content, fileName);
      
      setProgress('¡Exportación completada!');
      
      // Close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export error:', error);
      setProgress('Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const getSelectedFormats = () => {
    return Object.entries(exportFormats)
      .filter(([_, selected]) => selected)
      .map(([format]) => format.toUpperCase())
      .join(', ') || 'Ninguno';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-xl w-[500px] border border-[#404040] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#404040]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-lg font-semibold text-[#e5e5e5]">Exportar Análisis</h2>
              <p className="text-xs text-[#737373]">
                Empaqueta todo en un archivo ZIP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-[#262626] hover:bg-[#ef4444] text-[#a3a3a3] hover:text-white rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Project info */}
          <div className="bg-[#262626] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#a3a3a3]">Proyecto</span>
              <span className="text-lg font-semibold text-[#e5e5e5]">{data.metadata.projectName}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#3b82f6]">{data.metadata.totalDocuments}</div>
                <div className="text-xs text-[#737373]">Documentos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#10b981]">{data.metadata.totalEntities}</div>
                <div className="text-xs text-[#737373]">Entidades</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#f59e0b]">{data.metadata.totalProcedures}</div>
                <div className="text-xs text-[#737373]">Procedimientos</div>
              </div>
            </div>
          </div>

          {/* Format selection */}
          <div>
            <label className="text-sm text-[#a3a3a3] mb-3 block">Formatos a incluir</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'json', label: 'JSON', icon: '📋', desc: 'Datos estructurados' },
                { key: 'markdown', label: 'Markdown', icon: '📝', desc: 'Documentos legibles' },
                { key: 'svg', label: 'Mermaid', icon: '📊', desc: 'Código flujograma' },
                { key: 'csv', label: 'CSV', icon: '📈', desc: 'Para Excel/Numbers' },
              ].map(({ key, label, icon, desc }) => (
                <button
                  key={key}
                  onClick={() => handleFormatToggle(key as keyof typeof exportFormats)}
                  className={`p-3 rounded-lg border transition-colors ${
                    exportFormats[key as keyof typeof exportFormats]
                      ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                      : 'border-[#404040] bg-[#262626] hover:border-[#3b82f6]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{icon}</span>
                    <span className="font-medium text-[#e5e5e5]">{label}</span>
                    {exportFormats[key as keyof typeof exportFormats] && (
                      <span className="ml-auto text-[#3b82f6]">✓</span>
                    )}
                  </div>
                  <div className="text-xs text-[#737373]">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Output info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#737373]">Formatos seleccionados:</span>
            <span className="text-[#e5e5e5]">{getSelectedFormats()}</span>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="bg-[#3b82f6]/10 border border-[#3b82f6] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin text-lg">⏳</div>
                <span className="text-[#3b82f6]">{progress}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#404040]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-[#262626] hover:bg-[#333] text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || Object.values(exportFormats).every(v => !v)}
            className="px-6 py-2 text-sm bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>📦</span>
            Exportar ZIP
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to create sample export data
export function createSampleExportData(): ExportData {
  return {
    analysis: {
      entities: [
        { name: 'John Smith', type: 'person', description: 'Gerente de operaciones', mentions: 5 },
        { name: 'Departamento de Ventas', type: 'department', description: 'Equipo de ventas', mentions: 3 },
        { name: 'Manual de Procedimientos', type: 'document', description: 'Documento oficial', mentions: 2 },
      ],
      procedures: [
        {
          name: 'Proceso de Cotización',
          steps: ['Recibir solicitud', 'Crear cotización', 'Revisar con gerente', 'Enviar al cliente'],
          responsible: 'John Smith',
          relatedEntities: ['Departamento de Ventas', 'Manual de Procedimientos'],
        },
      ],
      summary: 'Análisis completado de 3 documentos.',
      flowchartCode: `graph TD
    A[Inicio] --> B[Crear cotización]
    B --> C[Revisar]
    C --> D[Enviar]`,
    },
    documents: [
      { name: 'procedimiento-cotizacion', content: '# Procedimiento de Cotización\n\nContenido...', type: 'md' },
    ],
    graph: {
      nodes: [
        { id: '1', label: 'John Smith', type: 'person' },
        { id: '2', label: 'Ventas', type: 'department' },
      ],
      edges: [
        { source: '1', target: '2', label: 'lidera', type: 'relates' },
      ],
    },
    metadata: {
      projectName: 'ZYMO Training',
      exportDate: new Date().toISOString(),
      totalDocuments: 3,
      totalEntities: 5,
      totalProcedures: 2,
    },
  };
}