import crypto from 'crypto';
import { askClaude } from './claude';
import { buildRubricSystemSection, getCategoryNames, loadRubricConfig } from './rubric';
import {
  AnalysisPackage,
  AnalysisRequest,
  AnalysisFinding,
  ExtractedTime,
  Proposal,
  ZymoCorpusEntry,
  ProcedureMeta,
} from '../types';

interface AnalysisRawResult {
  flowchartMmd: string;
  markdownNormalized: string;
  findings: AnalysisFinding[];
  times: ExtractedTime[];
  proposals: Proposal[];
  zymoCorpus: ZymoCorpusEntry[];
}

function buildSystemPrompt(): string {
  return `Eres el agente de análisis de procedimientos de NetVault (ZYMO).
Tu misión es evaluar documentos empresariales según la rúbrica oficial y devolver un paquete JSON estructurado.

${buildRubricSystemSection()}`;
}

/**
 * Ejecuta el análisis completo de un procedimiento (Claude + rúbrica).
 */
export async function runAnalysis(request: AnalysisRequest): Promise<AnalysisPackage> {
  const { procedureCode, area, textContent, existingFlowchartMmd } = request;

  const userMessage = buildAnalysisPrompt(procedureCode, area, textContent, existingFlowchartMmd);
  const rawJson = await askClaude(buildSystemPrompt(), [{ role: 'user', content: userMessage }], 8192);

  let parsed: AnalysisRawResult;
  try {
    const clean = rawJson
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/g, '')
      .trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('Sin JSON');
    parsed = JSON.parse(clean.slice(start, end + 1)) as AnalysisRawResult;
  } catch {
    throw new Error(`Claude devolvió JSON inválido: ${rawJson.slice(0, 300)}`);
  }

  return assemblePackage(request, parsed);
}

/** Mock alineado a categorías de la rúbrica (pruebas sin API key). */
export function runAnalysisMock(request: AnalysisRequest): AnalysisPackage {
  const categories = getCategoryNames();
  const findings: AnalysisFinding[] = categories.map((category, i) => ({
    id: `F${String(i + 1).padStart(3, '0')}`,
    category,
    severity: i === 0 ? 'media' : 'baja',
    description:
      category === 'Claridad'
        ? 'Revisar pasos sin responsable explícito en la sección de desarrollo'
        : `Revisión ${category}: sin observaciones críticas en modo mock`,
    suggestion:
      category === 'Mejora continua'
        ? 'Evaluar automatización de notificaciones vía intranet'
        : `Aplicar criterios de ${category} del documento fuente`,
    visibility: 'interna' as const,
  }));

  const parsed: AnalysisRawResult = {
    flowchartMmd: `flowchart LR
  inicio([Inicio]) --> recep[Recepción solicitud]
  recep --> val{¿Válida?}
  val -->|Sí| proc[Procesamiento]
  val -->|No| rech[Rechazo documentado]
  proc --> rev[Revisión supervisor]
  rev --> apr{¿Aprobado?}
  apr -->|Sí| ejec[Ejecución]
  apr -->|No| proc
  ejec --> fin([Cierre])`,
    markdownNormalized: buildMockMarkdown(request),
    findings,
    times: [],
    proposals: [
      {
        type: 'mejora_proceso',
        title: 'Automatizar notificaciones de estado',
        description: 'Webhook desde intranet al cambiar estado del procedimiento',
        priority: 'media',
      },
    ],
    zymoCorpus: [
      {
        source: request.procedureCode,
        chunk: request.textContent.slice(0, 280).replace(/\s+/g, ' '),
        entities: ['Supervisor', 'Solicitante'],
        relations: [{ from: 'Solicitante', to: 'Supervisor', type: 'somete_a_revision' }],
      },
    ],
  };

  return assemblePackage(request, parsed);
}

function assemblePackage(request: AnalysisRequest, parsed: AnalysisRawResult): AnalysisPackage {
  const { procedureCode, area, textContent, existingFlowchartMmd } = request;
  const hash = crypto.createHash('sha256').update(textContent).digest('hex');

  const meta: ProcedureMeta = {
    code: procedureCode,
    version: '1.0.0',
    status: 'borrador',
    area,
    hash,
    syncStatus: 'local',
    lastModified: new Date().toISOString(),
    analysisRunAt: new Date().toISOString(),
    rubricVersion: loadRubricConfig().version,
  };

  return {
    procedureCode,
    originalPath: '',
    analyzedAt: new Date().toISOString(),
    flowchartMmd: parsed.flowchartMmd ?? '',
    flowchartDiff: existingFlowchartMmd
      ? diffFlowcharts(existingFlowchartMmd, parsed.flowchartMmd ?? '')
      : undefined,
    markdownNormalized: parsed.markdownNormalized ?? '',
    findings: normalizeFindings(parsed.findings ?? []),
    times: parsed.times ?? [],
    proposals: parsed.proposals ?? [],
    zymoCorpus: parsed.zymoCorpus ?? [],
    meta,
  };
}

function normalizeFindings(findings: AnalysisFinding[]): AnalysisFinding[] {
  const validCategories = new Set(getCategoryNames());
  return findings.map((f, i) => ({
    ...f,
    id: f.id || `F${String(i + 1).padStart(3, '0')}`,
    category: validCategories.has(f.category) ? f.category : f.category,
    visibility: f.visibility === 'publica' ? 'publica' : 'interna',
  }));
}

function buildMockMarkdown(request: AnalysisRequest): string {
  const { procedureCode, area, textContent } = request;
  return `# ${procedureCode} — Procedimiento (mock)

> Área: ${area} · Rúbrica v${loadRubricConfig().version} · **Configura ANTHROPIC_API_KEY para análisis real**

## Objetivo

Documento analizado en modo prueba.

## Alcance

Derivado del archivo fuente (${textContent.length} caracteres).

## Desarrollo

${textContent.slice(0, 2000)}

${textContent.length > 2000 ? '\n\n_(contenido truncado en mock)_' : ''}
`;
}

function buildAnalysisPrompt(
  code: string,
  area: string,
  text: string,
  existingChart?: string,
): string {
  const categoryList = getCategoryNames().join(' | ');
  return `Analiza el procedimiento con código **${code}** del área **${area}**.

DOCUMENTO FUENTE:
---
${text.slice(0, 14000)}
---

${existingChart ? `FLUJOGRAMA EXISTENTE (comparar y reflejar diferencias en flowchartDiff si aplica):\n\`\`\`\n${existingChart}\n\`\`\`\n` : ''}

INSTRUCCIONES:
1. Evalúa todas las categorías: ${categoryList}.
2. Genera hallazgos concretos (mínimo 3 si el documento lo permite).
3. Normaliza a markdown con las secciones de la rúbrica.
4. Flujograma Mermaid del proceso principal.
5. Extrae tiempos solo si el texto los menciona.
6. Propuestas accionables (intranet, mcp, mejora_proceso, eliminar_paso).
7. Corpus ZYMO: chunks con entidades y relaciones.

JSON exacto (sin texto fuera del JSON):
{
  "flowchartMmd": "flowchart LR\\n  ...",
  "markdownNormalized": "# ${code} — ...\\n\\n## Objetivo\\n...",
  "findings": [
    {
      "id": "F001",
      "category": "${categoryList.split(' | ')[0]}",
      "severity": "critica|alta|media|baja",
      "description": "...",
      "suggestion": "...",
      "visibility": "interna|publica"
    }
  ],
  "times": [
    { "activity": "...", "minMinutes": 0, "maxMinutes": 0, "unit": "minutos|horas|días", "rawText": "..." }
  ],
  "proposals": [
    { "type": "desarrollo_intranet|mcp|mejora_proceso|eliminar_paso", "title": "...", "description": "...", "priority": "alta|media|baja" }
  ],
  "zymoCorpus": [
    { "source": "${code}", "chunk": "...", "entities": ["..."], "relations": [{ "from": "...", "to": "...", "type": "..." }] }
  ]
}`;
}

function diffFlowcharts(oldMmd: string, newMmd: string): string {
  const oldLines = new Set(oldMmd.split('\n').map((l) => l.trim()).filter(Boolean));
  const newLines = new Set(newMmd.split('\n').map((l) => l.trim()).filter(Boolean));
  const added = [...newLines].filter((l) => !oldLines.has(l)).map((l) => `+ ${l}`);
  const removed = [...oldLines].filter((l) => !newLines.has(l)).map((l) => `- ${l}`);
  if (!added.length && !removed.length) return '(sin cambios)';
  return [...removed, ...added].join('\n');
}
