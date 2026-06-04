import fs from 'fs';
import path from 'path';

export interface RubricCategory {
  id: string;
  name: string;
  weight: number;
  description: string;
  checks: string[];
  severityHints: Record<string, string>;
}

export interface RubricConfig {
  version: string;
  name: string;
  locale: string;
  documentTypes: string[];
  areas: string[];
  categories: RubricCategory[];
  markdownNormalizedRules: string[];
  flowchartRules: string[];
  corpusRules: string[];
  visibilityRules: Record<string, string>;
}

let _cached: RubricConfig | null = null;
let _markdownCached: string | null = null;

function findRubricDir(): string {
  const candidates = [
    path.join(process.cwd(), 'resources', 'rubrica'),
    path.join(process.cwd(), '..', 'resources', 'rubrica'),
    path.join(__dirname, '..', '..', '..', 'resources', 'rubrica'),
    path.join(__dirname, '..', '..', 'resources', 'rubrica'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'rubrica-agent.json'))) return dir;
  }
  return candidates[0];
}

export function getRubricDir(): string {
  return findRubricDir();
}

export function loadRubricConfig(): RubricConfig {
  if (_cached) return _cached;
  const dir = findRubricDir();
  const raw = fs.readFileSync(path.join(dir, 'rubrica-agent.json'), 'utf-8');
  _cached = JSON.parse(raw) as RubricConfig;
  return _cached;
}

export function loadRubricMarkdown(): string {
  if (_markdownCached) return _markdownCached;
  const dir = findRubricDir();
  const mdPath = path.join(dir, 'RUBRICA_PROCEDIMIENTOS.md');
  _markdownCached = fs.existsSync(mdPath)
    ? fs.readFileSync(mdPath, 'utf-8')
    : '# Rúbrica no encontrada';
  return _markdownCached;
}

/** Texto compacto para el system prompt del agente */
export function buildRubricSystemSection(): string {
  const cfg = loadRubricConfig();
  const lines: string[] = [
    `Rúbrica ${cfg.name} v${cfg.version}`,
    '',
    'Evalúa el documento en estas categorías (genera al menos un hallazgo por categoría donde haya observación; si está bien, un hallazgo "baja" de refuerzo):',
  ];

  for (const cat of cfg.categories) {
    lines.push(`\n### ${cat.name} (id: ${cat.id}, peso ${cat.weight})`);
    lines.push(cat.description);
    lines.push('Criterios:');
    cat.checks.forEach((c) => lines.push(`- ${c}`));
  }

  lines.push('\n## Reglas markdown normalizado');
  cfg.markdownNormalizedRules.forEach((r) => lines.push(`- ${r}`));

  lines.push('\n## Reglas flujograma Mermaid');
  cfg.flowchartRules.forEach((r) => lines.push(`- ${r}`));

  lines.push('\n## Reglas corpus ZYMO');
  cfg.corpusRules.forEach((r) => lines.push(`- ${r}`));

  lines.push('\n## Visibilidad de hallazgos');
  Object.entries(cfg.visibilityRules).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));

  lines.push(
    '\nResponde ÚNICAMENTE con JSON válido (sin markdown fence). IDs de hallazgos: F001, F002, …',
  );

  return lines.join('\n');
}

export function getCategoryNames(): string[] {
  return loadRubricConfig().categories.map((c) => c.name);
}
