import type { AnalysisPackage, ZymoCorpusEntry } from '../types';
import type { GraphData, GraphEdge, GraphNode } from '../components/graph/KnowledgeGraph';

const NODE_ID = (kind: string, name: string) => `${kind}:${name.toLowerCase().replace(/\s+/g, '_')}`;

const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.git', 'venv', '.venv', '.obsidian', 'dist-electron',
  '__pycache__', '.cursor', 'build', 'coverage',
]);

const VAULT_MAX_FILES = 400;
const VAULT_MAX_DEPTH = 10;

export interface VaultGraphResult extends GraphData {
  mdCount: number;
  root: string;
  scanError?: string;
}

// ─── Grafo estilo Obsidian (vault / carpeta activa) ───────────────────────────

/**
 * Escanea la carpeta raíz como un vault: cada .md es un nodo y los enlaces
 * [[wikilink]] o [texto](archivo.md) son aristas (como Obsidian Graph View).
 */
export async function loadVaultGraph(rootPath: string): Promise<VaultGraphResult> {
  const root = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  const { files: mdFiles, scanError } = await resolveMarkdownFiles(root);
  return await buildVaultGraphFromFiles(root, mdFiles, scanError);
}

async function resolveMarkdownFiles(root: string): Promise<{ files: string[]; scanError?: string }> {
  type VaultScanResult = {
    success: boolean;
    root: string;
    files: string[];
    count: number;
    error?: string;
  };
  type IndexScanResult = {
    success: boolean;
    count: number;
    entries: Array<{ path: string; name: string; isDirectory?: boolean }>;
    error?: string;
  };

  const api = window.electronAPI as typeof window.electronAPI & {
    scanVaultMarkdown?: (root: string) => Promise<VaultScanResult>;
    scanIndex?: (rootPath: string, maxDepth?: number) => Promise<IndexScanResult>;
  };

  if (api.scanVaultMarkdown) {
    const res = await api.scanVaultMarkdown(root);
    if (!res.success) {
      return { files: [], scanError: res.error ?? 'No se pudo escanear la carpeta' };
    }
    if (res.files?.length) return { files: res.files };
  }

  // Fallback: indexador del main (ya compilado en versiones anteriores)
  if (api.scanIndex) {
    try {
      const res = await api.scanIndex(root, VAULT_MAX_DEPTH);
      if (res.success && res.entries?.length) {
        const md = res.entries
          .filter((e) => !e.isDirectory && /\.md$/i.test(e.name))
          .map((e) => e.path)
          .slice(0, VAULT_MAX_FILES);
        if (md.length) return { files: md };
      }
    } catch {
      // continuar al escaneo por carpetas
    }
  }

  const files = await collectMarkdownFiles(root, VAULT_MAX_FILES, VAULT_MAX_DEPTH);
  if (files.length === 0 && !api.scanVaultMarkdown && !api.scanIndex) {
    return {
      files: [],
      scanError:
        'Sin acceso al sistema de archivos. Cierra el navegador y ejecuta: npm run build:electron && npm run electron:dev',
    };
  }
  return { files };
}

async function buildVaultGraphFromFiles(
  root: string,
  mdFiles: string[],
  scanError?: string,
): Promise<VaultGraphResult> {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  const pathToId = (relPath: string) => `file:${relPath.replace(/\\/g, '/').toLowerCase()}`;

  for (const absPath of mdFiles) {
    const rel = relativePath(root, absPath).replace(/\\/g, '/');
    const id = pathToId(rel);
    const label = rel.split('/').pop()?.replace(/\.md$/i, '') ?? rel;
    const folder = rel.includes('/') ? rel.split('/').slice(0, -1).join('/') : '';

    nodes.set(id, {
      id,
      label,
      type: 'document',
      properties: { path: absPath, rel, folder },
    });
  }

  for (const absPath of mdFiles) {
    const fromRel = relativePath(root, absPath).replace(/\\/g, '/');
    const fromId = pathToId(fromRel);

    let text: string;
    try {
      const raw = await window.electronAPI.readFile(absPath);
      text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as Uint8Array);
    } catch {
      continue;
    }

    const targets = extractVaultLinks(text, fromRel, root);
    for (const { targetRel, label } of targets) {
      let toId = pathToId(targetRel);
      if (!nodes.has(toId)) {
        const stubLabel = targetRel.split('/').pop()?.replace(/\.md$/i, '') ?? targetRel;
        nodes.set(toId, {
          id: toId,
          label: stubLabel,
          type: 'concept',
          properties: { unresolved: 'true', targetRel },
        });
      }
      addEdge(edges, edgeKeys, fromId, toId, label, 'references');
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
    mdCount: mdFiles.length,
    root,
    scanError: mdFiles.length === 0 ? scanError : undefined,
  };
}

/** Enlaces [[nota]], [[nota|alias]], [[nota#encabezado]] y [texto](ruta.md) */
function extractVaultLinks(
  content: string,
  fromRel: string,
  vaultRoot: string,
): Array<{ targetRel: string; label: string }> {
  const found: Array<{ targetRel: string; label: string }> = [];
  const seen = new Set<string>();

  const wikiRe = /\[\[([^\]|#\]]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = wikiRe.exec(content)) !== null) {
    const target = m[1].trim();
    const alias = m[2]?.trim() || target;
    const rel = resolveVaultLink(fromRel, target, vaultRoot);
    if (rel && !seen.has(rel)) {
      seen.add(rel);
      found.push({ targetRel: rel, label: alias });
    }
  }

  const mdLinkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  while ((m = mdLinkRe.exec(content)) !== null) {
    const alias = m[1].trim() || 'enlace';
    const href = m[2].trim().split('#')[0];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) continue;
    const rel = resolveVaultLink(fromRel, href, vaultRoot);
    if (rel && !seen.has(rel)) {
      seen.add(rel);
      found.push({ targetRel: rel, label: alias });
    }
  }

  return found;
}

function resolveVaultLink(fromRel: string, target: string, _vaultRoot: string): string | null {
  const t = target.replace(/\\/g, '/').trim();
  if (!t) return null;

  let rel: string;
  if (t.startsWith('/')) {
    rel = t.slice(1);
  } else if (t.includes('/')) {
    rel = t;
  } else {
    const dir = fromRel.includes('/') ? fromRel.split('/').slice(0, -1).join('/') : '';
    rel = dir ? `${dir}/${t}` : t;
  }

  if (!/\.md$/i.test(rel)) rel += '.md';
  return rel.replace(/\/+/g, '/');
}

async function collectMarkdownFiles(dir: string, max: number, depth = 0): Promise<string[]> {
  if (depth > VAULT_MAX_DEPTH || max <= 0) return [];
  const out: string[] = [];
  const entries = await safeReadDir(dir);
  for (const e of entries) {
    if (out.length >= max) break;
    const full = joinPath(dir, e.name);
    if (e.isDirectory) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      out.push(...await collectMarkdownFiles(full, max - out.length, depth + 1));
    } else if (/\.md$/i.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

// ─── Corpus / análisis ───────────────────────────────────────────────────────

export function fromZymoCorpus(
  entries: ZymoCorpusEntry[],
  procedureCode: string,
): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  const procId = NODE_ID('process', procedureCode);
  nodes.set(procId, {
    id: procId,
    label: procedureCode,
    type: 'process',
    properties: { source: 'procedure' },
  });

  for (const entry of entries) {
    const docId = NODE_ID('document', entry.source || procedureCode);
    if (!nodes.has(docId)) {
      nodes.set(docId, {
        id: docId,
        label: entry.source || procedureCode,
        type: 'document',
        properties: { chunkPreview: entry.chunk.slice(0, 120) },
      });
    }
    addEdge(edges, edgeKeys, procId, docId, 'contiene', 'contains');

    for (const entity of entry.entities ?? []) {
      const eid = NODE_ID('entity', entity);
      if (!nodes.has(eid)) {
        nodes.set(eid, { id: eid, label: entity, type: 'entity' });
      }
      addEdge(edges, edgeKeys, docId, eid, 'menciona', 'references');
    }

    for (const rel of entry.relations ?? []) {
      const fromId = NODE_ID('entity', rel.from);
      const toId = NODE_ID('entity', rel.to);
      if (!nodes.has(fromId)) {
        nodes.set(fromId, { id: fromId, label: rel.from, type: 'entity' });
      }
      if (!nodes.has(toId)) {
        nodes.set(toId, { id: toId, label: rel.to, type: 'entity' });
      }
      addEdge(edges, edgeKeys, fromId, toId, rel.type || 'relaciona', 'relates');
    }
  }

  return { nodes: [...nodes.values()], edges };
}

export function fromAnalysisPackage(pkg: AnalysisPackage): GraphData {
  const base = fromZymoCorpus(pkg.zymoCorpus, pkg.procedureCode);
  const nodes = new Map(base.nodes.map((n) => [n.id, n]));
  const edges = [...base.edges];
  const edgeKeys = new Set(edges.map((e) => edgeKey(e)));

  for (const f of pkg.findings) {
    const cid = NODE_ID('concept', f.category);
    if (!nodes.has(cid)) {
      nodes.set(cid, { id: cid, label: f.category, type: 'concept', properties: { severity: f.severity } });
    }
    const procId = NODE_ID('process', pkg.procedureCode);
    addEdge(edges, edgeKeys, procId, cid, 'evalúa', 'relates');
  }

  for (const p of pkg.proposals) {
    const pid = NODE_ID('concept', p.title);
    if (!nodes.has(pid)) {
      nodes.set(pid, {
        id: pid,
        label: p.title,
        type: 'concept',
        properties: { proposalType: p.type, priority: p.priority },
      });
    }
    addEdge(edges, edgeKeys, NODE_ID('process', pkg.procedureCode), pid, 'propone', 'uses');
  }

  return { nodes: [...nodes.values()], edges };
}

export function parseCorpusJsonl(text: string): ZymoCorpusEntry[] {
  const entries: ZymoCorpusEntry[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as ZymoCorpusEntry);
    } catch {
      // skip
    }
  }
  return entries;
}

export function mergeGraphData(...graphs: GraphData[]): GraphData {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  for (const g of graphs) {
    for (const n of g.nodes) nodes.set(n.id, { ...nodes.get(n.id), ...n });
    for (const e of g.edges) {
      const k = edgeKey(e);
      if (!edgeKeys.has(k)) {
        edgeKeys.add(k);
        edges.push({
          ...e,
          source: typeof e.source === 'object' ? (e.source as GraphNode).id : e.source,
          target: typeof e.target === 'object' ? (e.target as GraphNode).id : e.target,
        });
      }
    }
  }
  return { nodes: [...nodes.values()], edges };
}

export async function loadGraphFromDirectory(rootPath: string): Promise<GraphData> {
  const parts: GraphData[] = [];
  const areas = await safeReadDir(rootPath);

  for (const areaEntry of areas) {
    if (!areaEntry.isDirectory) continue;
    const areaPath = joinPath(rootPath, areaEntry.name);
    const codes = await safeReadDir(areaPath);

    for (const codeEntry of codes) {
      if (!codeEntry.isDirectory) continue;
      const codePath = joinPath(areaPath, codeEntry.name);
      const corpusPath = joinPath(codePath, 'corpus_zymo.jsonl');
      if (!(await window.electronAPI.fileExists(corpusPath))) continue;

      const raw = await window.electronAPI.readFile(corpusPath);
      const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as Uint8Array);
      const entries = parseCorpusJsonl(text);
      if (entries.length) parts.push(fromZymoCorpus(entries, codeEntry.name));
    }
  }

  if (parts.length === 0) return { nodes: [], edges: [] };
  return mergeGraphData(...parts);
}

export async function loadGraphFromCodeImports(
  rootPath: string,
  maxFiles = 80,
): Promise<GraphData> {
  const codeFiles = await collectCodeFiles(rootPath, maxFiles);
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  for (const filePath of codeFiles) {
    const rel = relativePath(rootPath, filePath);
    const nid = NODE_ID('file', rel);
    nodes.set(nid, { id: nid, label: rel.split(/[/\\]/).pop() ?? rel, type: 'document', properties: { path: filePath } });

    let content: string;
    try {
      const raw = await window.electronAPI.readFile(filePath);
      content = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as Uint8Array);
    } catch {
      continue;
    }

    const importRe = /(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(content)) !== null) {
      const dep = m[1] || m[2];
      if (!dep || dep.startsWith('.')) {
        const depId = NODE_ID('file', `${rel} -> ${dep}`);
        if (!nodes.has(depId)) {
          nodes.set(depId, { id: depId, label: dep, type: 'concept', properties: { local: 'true' } });
        }
        addEdge(edges, edgeKeys, nid, depId, 'importa', 'references');
      } else {
        const depId = NODE_ID('concept', dep);
        if (!nodes.has(depId)) {
          nodes.set(depId, { id: depId, label: dep, type: 'concept' });
        }
        addEdge(edges, edgeKeys, nid, depId, 'importa', 'uses');
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}

function addEdge(
  edges: GraphEdge[],
  keys: Set<string>,
  source: string,
  target: string,
  label: string,
  type: GraphEdge['type'],
): void {
  const e: GraphEdge = { source, target, label, type };
  const k = edgeKey(e);
  if (!keys.has(k)) {
    keys.add(k);
    edges.push(e);
  }
}

function edgeKey(e: GraphEdge): string {
  const s = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
  const t = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
  return `${s}|${t}|${e.type}`;
}

async function safeReadDir(path: string) {
  try {
    return await window.electronAPI.readDirectory(path);
  } catch {
    return [];
  }
}

function joinPath(a: string, b: string): string {
  const sep = a.includes('\\') ? '\\' : '/';
  return a.endsWith(sep) ? a + b : a + sep + b;
}

function relativePath(root: string, full: string): string {
  const n = full.replace(/\\/g, '/');
  const r = root.replace(/\\/g, '/').replace(/\/$/, '');
  return n.toLowerCase().startsWith(r.toLowerCase())
    ? n.slice(r.length).replace(/^\//, '')
    : full;
}

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs']);

async function collectCodeFiles(dir: string, max: number, depth = 0): Promise<string[]> {
  if (depth > 4 || max <= 0) return [];
  const out: string[] = [];
  const entries = await safeReadDir(dir);
  for (const e of entries) {
    if (out.length >= max) break;
    const full = joinPath(dir, e.name);
    if (e.isDirectory) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...await collectCodeFiles(full, max - out.length, depth + 1));
    } else if (CODE_EXT.has(extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function extname(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

// ─── Grafo LightRAG (intranet ZYMO) ──────────────────────────────────────────

export interface LightRagResult extends GraphData {
  meta: {
    total_entities:  number;
    total_relations: number;
    showing_nodes:   number;
    showing_edges:   number;
    initialized:     boolean;
    message?:        string;
  };
}

const VALID_EDGE_TYPES = new Set(['relates', 'contains', 'follows', 'uses', 'references']);

export async function loadLightRagGraph(
  intranetUrl: string,
  token: string,
  opts: { maxNodes?: number; maxEdges?: number; q?: string } = {},
): Promise<LightRagResult> {
  const api = window.electronAPI as typeof window.electronAPI & {
    loadLightRagGraph?: (
      url: string,
      tok: string,
      o?: { maxNodes?: number; maxEdges?: number; q?: string },
    ) => Promise<{
      success: boolean;
      error?: string;
      data: {
        nodes: Array<{ id: string; label: string; type: string; properties?: Record<string, string> }>;
        edges: Array<{ source: string; target: string; label?: string; type: string }>;
        meta?: Record<string, unknown>;
      };
    }>;
  };

  if (!api.loadLightRagGraph) {
    throw new Error('IPC loadLightRagGraph no disponible. Ejecuta npm run build:electron primero.');
  }

  const res = await api.loadLightRagGraph(intranetUrl, token, opts);

  if (!res.success) {
    throw new Error(res.error ?? 'Error conectando a la intranet');
  }

  const raw = res.data;

  const nodes: GraphNode[] = (raw.nodes ?? []).map(n => ({
    id:         n.id,
    label:      n.label,
    type:       (['entity', 'concept', 'process', 'document'].includes(n.type)
                  ? n.type
                  : 'concept') as GraphNode['type'],
    properties: n.properties ?? {},
  }));

  const edges: GraphEdge[] = (raw.edges ?? []).map(e => ({
    source: e.source,
    target: e.target,
    label:  e.label,
    type:   (VALID_EDGE_TYPES.has(e.type) ? e.type : 'relates') as GraphEdge['type'],
  }));

  const meta = raw.meta as LightRagResult['meta'] | undefined;

  return {
    nodes,
    edges,
    meta: meta ?? {
      total_entities:  nodes.length,
      total_relations: edges.length,
      showing_nodes:   nodes.length,
      showing_edges:   edges.length,
      initialized:     nodes.length > 0,
    },
  };
}

export function getSampleGraphData(): GraphData {
  return fromZymoCorpus(
    [
      {
        source: 'TC-EJEMPLO-001',
        chunk: 'El coordinador T&C valida solicitudes de transporte en 2 horas hábiles.',
        entities: ['Coordinador T&C', 'Solicitante', 'Supervisor T&C', 'Sistema de flota'],
        relations: [
          { from: 'Solicitante', to: 'Coordinador T&C', type: 'envía_solicitud' },
          { from: 'Coordinador T&C', to: 'Supervisor T&C', type: 'escala' },
          { from: 'Coordinador T&C', to: 'Sistema de flota', type: 'asigna' },
        ],
      },
    ],
    'TC-EJEMPLO-001',
  );
}
