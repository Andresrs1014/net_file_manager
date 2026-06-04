import type { AnalysisPackage, AnalysisFinding, Proposal } from '../types';
import { convertToMarkdown, isSupported } from './documentService';

const SUPPORTED_EXT = ['.md', '.txt', '.docx', '.pdf'];

export function isAnalyzableFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return SUPPORTED_EXT.some((ext) => lower.endsWith(ext)) || isSupported(filePath);
}

/** Extrae texto plano desde ruta local (md/txt/docx/pdf). */
export async function extractTextFromPath(filePath: string): Promise<string> {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.txt')) {
    const raw = await window.electronAPI.readFile(filePath);
    return typeof raw === 'string' ? raw : new TextDecoder().decode(raw as Uint8Array);
  }
  if (lower.endsWith('.docx') || lower.endsWith('.pdf')) {
    const result = await convertToMarkdown(filePath);
    if (!result.success) throw new Error(result.error ?? 'No se pudo convertir el documento');
    return result.markdown;
  }
  throw new Error('Formato no soportado para análisis');
}

export function inferProcedureCode(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const base = parts[parts.length - 1] ?? 'PROC';
  return base.replace(/\.[^.]+$/, '').replace(/\s+/g, '-').toUpperCase();
}

export function inferAreaFromPath(filePath: string): 'T&C' | 'P&C' | 'Transportes' {
  const p = filePath.replace(/\\/g, '/').toUpperCase();
  if (p.includes('/T&C/') || p.includes('\\T&C\\') || p.includes('/TC/')) return 'T&C';
  if (p.includes('/P&C/') || p.includes('\\P&C\\') || p.includes('/PC/')) return 'P&C';
  if (p.includes('/TRANSPORTES/') || p.includes('\\TRANSPORTES\\')) return 'Transportes';
  return 'T&C';
}

export function buildAnalisisMarkdown(findings: AnalysisFinding[], analyzedAt: string): string {
  const lines = [
    `# Análisis de procedimiento`,
    ``,
    `**Fecha:** ${analyzedAt}`,
    `**Hallazgos:** ${findings.length}`,
    ``,
  ];
  for (const f of findings) {
    lines.push(`## ${f.id} — ${f.category} (${f.severity})`);
    lines.push('');
    lines.push(f.description);
    lines.push('');
    lines.push(`**Sugerencia:** ${f.suggestion}`);
    lines.push('');
    lines.push(`_Visibilidad: ${f.visibility}_`);
    lines.push('');
  }
  return lines.join('\n');
}

export function buildPropuestasMarkdown(proposals: Proposal[]): string {
  if (!proposals.length) return '# Propuestas\n\nSin propuestas en este análisis.\n';
  const lines = ['# Propuestas de mejora', ''];
  for (const p of proposals) {
    lines.push(`## ${p.title} (${p.priority})`);
    lines.push(`- **Tipo:** ${p.type}`);
    lines.push(`- ${p.description}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function buildCorpusJsonl(pkg: AnalysisPackage): string {
  return pkg.zymoCorpus.map((e) => JSON.stringify(e)).join('\n') + (pkg.zymoCorpus.length ? '\n' : '');
}

/** Archivos del formato único para guardar en disco. */
export function buildPackageFiles(pkg: AnalysisPackage, originalPath?: string): Record<string, string> {
  const meta = {
    ...pkg.meta,
    rubricVersion: pkg.meta.rubricVersion ?? '1.0.0',
    originalPath: originalPath ?? pkg.originalPath,
    packageGeneratedAt: pkg.analyzedAt,
  };
  return {
    'procedimiento.md': pkg.markdownNormalized,
    'flujograma.mmd': pkg.flowchartMmd,
    'analisis.md': buildAnalisisMarkdown(pkg.findings, pkg.analyzedAt),
    'propuestas.md': buildPropuestasMarkdown(pkg.proposals),
    'tiempos.json': JSON.stringify(pkg.times, null, 2),
    'corpus_zymo.jsonl': buildCorpusJsonl(pkg),
    '_meta.json': JSON.stringify(meta, null, 2),
  };
}
