/**
 * GraphPanel — panel dual de grafos NetVault
 *
 * Modos:
 *  • Vault (Obsidian) — escanea .md de la carpeta activa y extrae [[wikilinks]]
 *  • LightRAG          — se conecta al backend de la intranet ZYMO y muestra
 *                        el grafo de conocimiento semántico
 *
 * Se puede usar embebido en el área central (`embedded=true`) o como modal flotante.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  KnowledgeGraph,
  type GraphData,
  type GraphNode,
  type GraphEdge,
  type GraphLayout,
} from './KnowledgeGraph';
import {
  loadVaultGraph,
  loadLightRagGraph,
} from '../../services/graphService';
import type { AnalysisPackage } from '../../types';
import {
  X,
  FolderOpen,
  GitBranch,
  Loader,
  RefreshCw,
  BookOpen,
  Network,
  Settings2,
} from 'lucide-react';

// ─── tipos ────────────────────────────────────────────────────────────────────

export type GraphViewMode = 'vault' | 'lightrag';

interface GraphPanelProps {
  onClose?:       () => void;
  workspacePath?: string;
  /** Último análisis (reservado para uso futuro) */
  lastAnalysis?:  AnalysisPackage | null;
  onOpenFile?:    (filePath: string) => void;
  /** Vista integrada en el área central (sin overlay modal) */
  embedded?:      boolean;
}

// ─── valores guardados en localStorage ───────────────────────────────────────

const LS_URL   = 'netvault:lightrag:url';
const LS_TOKEN = 'netvault:lightrag:token';

const readLS  = (key: string, fallback = '') => {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};
const writeLS = (key: string, val: string) => {
  try { localStorage.setItem(key, val); } catch { /* ignore */ }
};

// ─── componente principal ─────────────────────────────────────────────────────

export function GraphPanel({
  onClose,
  workspacePath,
  onOpenFile,
  embedded = false,
}: GraphPanelProps) {
  // ── shared state ───────────────────────────────────────────────────────────
  const [viewMode,      setViewMode]      = useState<GraphViewMode>('vault');
  const [layout,        setLayout]        = useState<GraphLayout>('force');
  const [graphData,     setGraphData]     = useState<GraphData>({ nodes: [], edges: [] });
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [selectedNode,  setSelectedNode]  = useState<GraphNode | null>(null);
  const [selectedEdge,  setSelectedEdge]  = useState<GraphEdge | null>(null);

  // ── vault state ─────────────────────────────────────────────────────────────
  const [vaultPath,  setVaultPath]  = useState(workspacePath ?? '');
  const [mdCount,    setMdCount]    = useState(0);
  const lastVaultRef = useRef('');

  // ── lightrag state ──────────────────────────────────────────────────────────
  const [lrUrl,       setLrUrl]       = useState(() => readLS(LS_URL, 'http://localhost:8000'));
  const [lrToken,     setLrToken]     = useState(() => readLS(LS_TOKEN, ''));
  const [lrMeta,      setLrMeta]      = useState<Record<string, unknown> | null>(null);
  const [showLrCfg,   setShowLrCfg]   = useState(false);

  const api = window.electronAPI;
  const hasVaultScan = Boolean(api?.scanVaultMarkdown || api?.scanIndex);
  const hasLightRag  = Boolean(api?.loadLightRagGraph);

  // ─── helpers ────────────────────────────────────────────────────────────────

  const applyData = useCallback((data: GraphData) => {
    setGraphData(data);
    setError('');
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // ─── VAULT ──────────────────────────────────────────────────────────────────

  const loadVault = useCallback(async (root: string) => {
    if (!root?.trim()) {
      setError('Navega a una carpeta en el explorador para cargar el vault.');
      return;
    }
    setLoading(true);
    setError('');
    setVaultPath(root);
    try {
      const data = await loadVaultGraph(root);
      setMdCount(data.mdCount);
      if (data.nodes.length === 0) {
        setError(
          data.scanError
          ?? `Sin archivos .md en «${root}». ¿Estás en la carpeta correcta?`,
        );
        setGraphData({ nodes: [], edges: [] });
      } else {
        applyData(data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al leer el vault');
    } finally {
      setLoading(false);
    }
  }, [applyData]);

  // Cargar vault al cambiar la carpeta del explorador
  useEffect(() => {
    if (!workspacePath?.trim()) return;
    setVaultPath(workspacePath);
    if (viewMode !== 'vault') return;
    if (lastVaultRef.current === workspacePath) return;
    lastVaultRef.current = workspacePath;
    loadVault(workspacePath);
  }, [workspacePath, viewMode, loadVault]);

  const handlePickVault = async () => {
    const picked = await api.openFolderDialog?.();
    if (!picked) return;
    lastVaultRef.current = '';
    setVaultPath(picked);
    loadVault(picked);
  };

  // ─── LIGHTRAG ───────────────────────────────────────────────────────────────

  const loadLightRag = useCallback(async () => {
    const url   = lrUrl.trim();
    const token = lrToken.trim();
    if (!url) { setError('Configura la URL de la intranet primero.'); return; }
    if (!token) { setError('Introduce el token JWT de la intranet.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await loadLightRagGraph(url, token);
      setLrMeta(data.meta as Record<string, unknown>);
      if (!data.meta.initialized) {
        setError(
          (data.meta.message as string | undefined)
          ?? 'LightRAG no tiene datos indexados todavía.',
        );
        setGraphData({ nodes: [], edges: [] });
      } else if (data.nodes.length === 0) {
        setError('El grafo LightRAG está vacío. Sube documentos primero.');
        setGraphData({ nodes: [], edges: [] });
      } else {
        applyData(data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error conectando a la intranet');
    } finally {
      setLoading(false);
    }
  }, [lrUrl, lrToken, applyData]);

  const saveLrConfig = () => {
    writeLS(LS_URL,   lrUrl);
    writeLS(LS_TOKEN, lrToken);
    setShowLrCfg(false);
  };

  // ─── cambio de modo ──────────────────────────────────────────────────────────

  const switchMode = (mode: GraphViewMode) => {
    setViewMode(mode);
    setError('');
    setGraphData({ nodes: [], edges: [] });
    setSelectedNode(null);
    setSelectedEdge(null);

    if (mode === 'vault') {
      lastVaultRef.current = '';
      if (vaultPath?.trim()) loadVault(vaultPath);
    }
    // LightRAG: no carga automáticamente — el usuario pulsa el botón
  };

  // ─── nodo click ──────────────────────────────────────────────────────────────

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    if (node.properties?.path && onOpenFile) onOpenFile(node.properties.path);
  };

  // ─── exportar ────────────────────────────────────────────────────────────────

  const exportSVG = () => {
    const svg = document.querySelector('.knowledge-graph svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: `grafo-${viewMode}.svg`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: `grafo-${viewMode}.json`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── clases contenedor ───────────────────────────────────────────────────────

  const shellCls = embedded
    ? 'flex flex-col h-full min-h-0'
    : 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3';

  const panelCls = embedded
    ? 'flex flex-col flex-1 min-h-0 border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#1a1a1a]'
    : 'bg-[#1a1a1a] rounded-xl w-full max-w-[96vw] h-[94vh] flex flex-col border border-[#404040] shadow-2xl';

  // ─── render ───────────────────────────────────────────────────────────────────

  return (
    <div className={shellCls}>
      <div className={panelCls}>

        {/* ── Topbar ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#404040] shrink-0 min-w-0">

          {/* Title */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <GitBranch size={17} className="text-[#3b82f6] shrink-0" />
            <div className="leading-tight min-w-0">
              <p className="text-[13px] font-semibold text-[#e5e5e5]">Grafo de conocimiento</p>
              <p className="text-[10px] text-[#505050] truncate" title={vaultPath}>
                {viewMode === 'vault'
                  ? (vaultPath || 'Sin vault') + (mdCount > 0 ? ` · ${mdCount} notas` : '')
                  : lrUrl || 'Sin URL configurada'}
              </p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-lg border border-[#333] overflow-hidden shrink-0 ml-2">
            <ModeTab
              active={viewMode === 'vault'}
              icon={<BookOpen size={13} />}
              label="Vault .md"
              title="Grafo de notas Markdown (estilo Obsidian)"
              onClick={() => switchMode('vault')}
            />
            <ModeTab
              active={viewMode === 'lightrag'}
              icon={<Network size={13} />}
              label="LightRAG"
              title="Grafo de conocimiento semántico de la intranet ZYMO"
              onClick={() => switchMode('lightrag')}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Layout selector */}
          <select
            value={layout}
            onChange={e => setLayout(e.target.value as GraphLayout)}
            className="text-xs bg-[#262626] border border-[#404040] rounded px-2 py-1 text-[#e5e5e5] shrink-0"
          >
            <option value="force">Exploración (force)</option>
            <option value="radial">Radial</option>
            <option value="tree">Árbol</option>
          </select>

          <button onClick={exportSVG} disabled={!graphData.nodes.length}
            className="text-xs px-2 py-1 bg-[#262626] rounded text-[#a3a3a3] disabled:opacity-40 shrink-0">SVG</button>
          <button onClick={exportJSON} disabled={!graphData.nodes.length}
            className="text-xs px-2 py-1 bg-[#262626] rounded text-[#a3a3a3] disabled:opacity-40 shrink-0">JSON</button>

          {onClose && (
            <button onClick={onClose} className="p-1 text-[#505050] hover:text-red-400 shrink-0">
              <X size={17} />
            </button>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Left panel ───────────────────────────────────────────────────── */}
          <aside className="w-52 shrink-0 border-r border-[#2a2a2a] flex flex-col text-xs overflow-y-auto">

            {viewMode === 'vault' ? (
              <div className="p-3 flex flex-col gap-2">
                <p className="text-[10px] text-[#505050] uppercase font-semibold">Vault Obsidian</p>
                <p className="text-[#737373] text-[11px] leading-relaxed">
                  Escanea archivos <code className="text-[#a3a3a3]">.md</code> y extrae
                  los enlaces <code className="text-[#a3a3a3]">[[wiki]]</code> como aristas.
                  Haz clic en un nodo para abrirlo.
                </p>

                <button
                  type="button" onClick={() => { lastVaultRef.current = ''; loadVault(vaultPath); }}
                  disabled={loading || !vaultPath}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded border border-[#3b82f6]/40 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#93c5fd] disabled:opacity-40"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Escanear vault
                </button>

                <button
                  type="button" onClick={handlePickVault} disabled={loading}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded border border-[#333] hover:bg-[#222] text-[#a3a3a3] disabled:opacity-40"
                >
                  <FolderOpen size={12} />
                  Elegir carpeta…
                </button>

                <p className="text-[10px] text-[#505050] break-all px-1" title={vaultPath}>
                  {vaultPath || '—'}
                </p>

                {mdCount > 0 && (
                  <p className="text-[10px] text-green-500/80">
                    {mdCount} archivos .md encontrados
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                <p className="text-[10px] text-[#505050] uppercase font-semibold">LightRAG · ZYMO</p>
                <p className="text-[#737373] text-[11px] leading-relaxed">
                  Muestra el grafo de entidades y relaciones extraído semánticamente por LightRAG
                  de los documentos indexados en la intranet.
                </p>

                <button
                  type="button" onClick={loadLightRag} disabled={loading}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded border border-[#8b5cf6]/40 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 text-[#c4b5fd] disabled:opacity-40"
                >
                  {loading
                    ? <Loader size={12} className="animate-spin" />
                    : <Network size={12} />
                  }
                  Cargar grafo
                </button>

                <button
                  type="button" onClick={() => setShowLrCfg(v => !v)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded border border-[#333] hover:bg-[#222] text-[#a3a3a3]"
                >
                  <Settings2 size={12} />
                  {showLrCfg ? 'Ocultar config' : 'Configurar…'}
                </button>

                {showLrCfg && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <label className="text-[10px] text-[#505050]">URL intranet</label>
                    <input
                      value={lrUrl}
                      onChange={e => setLrUrl(e.target.value)}
                      placeholder="http://localhost:8000"
                      className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-[#e5e5e5] placeholder-[#383838]"
                    />
                    <label className="text-[10px] text-[#505050]">Token JWT</label>
                    <input
                      type="password"
                      value={lrToken}
                      onChange={e => setLrToken(e.target.value)}
                      placeholder="eyJhbGciOi…"
                      className="w-full bg-[#111] border border-[#333] rounded px-2 py-1 text-[11px] text-[#e5e5e5] placeholder-[#383838]"
                    />
                    <button
                      type="button" onClick={saveLrConfig}
                      className="px-2 py-1 text-[11px] bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {lrMeta && (
                  <div className="text-[10px] text-[#505050] space-y-0.5 mt-1">
                    <p>Entidades totales: <span className="text-[#a3a3a3]">{String(lrMeta.total_entities ?? '—')}</span></p>
                    <p>Relaciones totales: <span className="text-[#a3a3a3]">{String(lrMeta.total_relations ?? '—')}</span></p>
                    <p>Mostrando: <span className="text-[#3b82f6]">{String(lrMeta.showing_nodes ?? '—')}</span> nodos · <span className="text-[#10b981]">{String(lrMeta.showing_edges ?? '—')}</span> aristas</p>
                  </div>
                )}
              </div>
            )}

            {/* Muestra cómo obtener el token */}
            {viewMode === 'lightrag' && !showLrCfg && (
              <div className="px-3 pb-3 mt-auto">
                <details className="text-[10px] text-[#383838]">
                  <summary className="cursor-pointer text-[#505050] hover:text-[#737373]">¿Cómo obtengo el token?</summary>
                  <ol className="mt-1.5 space-y-1 list-decimal list-inside">
                    <li>Inicia sesión en la intranet</li>
                    <li>Abre DevTools → Application → localStorage</li>
                    <li>Copia el valor de <code>token</code> o usa el endpoint <code>/api/auth/login</code></li>
                  </ol>
                </details>
              </div>
            )}

            {!hasVaultScan && viewMode === 'vault' && (
              <p className="mx-3 text-[10px] text-amber-400 border border-amber-900/40 rounded p-1.5 bg-amber-950/20">
                Sin acceso al disco. Cierra el navegador y abre la ventana <strong>Electron</strong> con{' '}
                <code className="text-[#a3a3a3]">npm run electron:dev</code>
              </p>
            )}
            {!hasLightRag && viewMode === 'lightrag' && (
              <p className="mx-3 text-[10px] text-amber-400 border border-amber-900/40 rounded p-1.5 bg-amber-950/20">
                IPC LightRAG no cargado. Ejecuta <code className="text-[#a3a3a3]">npm run build:electron</code> y reinicia Electron.
              </p>
            )}

            {/* Errores */}
            {error && (
              <p className="mx-3 mb-3 text-[10px] text-red-400 break-words border border-red-900/40 rounded p-1.5 bg-red-950/20">
                {error}
              </p>
            )}
          </aside>

          {/* ── Canvas ──────────────────────────────────────────────────────── */}
          <div className="flex-1 relative min-w-0">
            {loading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 gap-2">
                <Loader size={26} className="animate-spin text-[#3b82f6]" />
                <p className="text-xs text-[#737373]">
                  {viewMode === 'lightrag' ? 'Cargando grafo LightRAG…' : 'Escaneando vault…'}
                </p>
              </div>
            )}
            <KnowledgeGraph
              key={`${viewMode}-${layout}-${graphData.nodes.length}-${graphData.edges.length}`}
              data={graphData}
              layout={layout}
              calmPhysics={viewMode === 'vault' || graphData.nodes.length > 30}
              freezeAfterLayout
              highlightNodeId={selectedNode?.id ?? null}
              onNodeClick={handleNodeClick}
              onEdgeClick={setSelectedEdge}
            />
          </div>

          {/* ── Right detail panel ──────────────────────────────────────────── */}
          <div className="w-52 shrink-0 border-l border-[#2a2a2a] p-3 overflow-y-auto text-xs">
            <p className="text-[10px] font-semibold text-[#505050] uppercase mb-2">Detalle</p>
            {selectedNode ? (
              <div className="space-y-1.5">
                <p className="text-sm text-[#e5e5e5] font-medium break-words">{selectedNode.label}</p>
                <TypeBadge type={selectedNode.type} />
                {selectedNode.properties?.entity_type && (
                  <p className="text-[10px] text-[#505050]">{selectedNode.properties.entity_type}</p>
                )}
                {selectedNode.properties?.description && (
                  <p className="text-[10px] text-[#737373] leading-relaxed">
                    {selectedNode.properties.description}
                  </p>
                )}
                {selectedNode.properties?.rel && (
                  <p className="text-[10px] text-[#505050] break-all">{selectedNode.properties.rel}</p>
                )}
                {selectedNode.properties?.path && (
                  <button
                    type="button"
                    onClick={() => onOpenFile?.(selectedNode.properties!.path!)}
                    className="text-[#3b82f6] hover:underline text-left break-all text-[11px]"
                  >
                    Abrir archivo
                  </button>
                )}
                {selectedNode.properties?.unresolved === 'true' && (
                  <p className="text-amber-500/80 text-[10px]">Enlace sin archivo</p>
                )}
              </div>
            ) : selectedEdge ? (
              <div className="space-y-1">
                <p className="text-[#a3a3a3]">{selectedEdge.label || selectedEdge.type}</p>
                <p className="text-[10px] text-[#505050]">Tipo: {selectedEdge.type}</p>
              </div>
            ) : (
              <p className="text-[#383838] text-[11px]">Haz clic en un nodo o arista</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function ModeTab({
  active, icon, label, title, onClick,
}: { active: boolean; icon: React.ReactNode; label: string; title?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] transition-colors ${
        active
          ? 'bg-[#3b82f6]/25 text-[#e5e5e5]'
          : 'bg-[#1a1a1a] text-[#606060] hover:text-[#a3a3a3] hover:bg-[#222]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

const TYPE_COLORS: Record<string, string> = {
  entity:   'bg-blue-500/20 text-blue-300',
  concept:  'bg-purple-500/20 text-purple-300',
  process:  'bg-emerald-500/20 text-emerald-300',
  document: 'bg-amber-500/20 text-amber-300',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded capitalize ${TYPE_COLORS[type] ?? 'bg-[#262626] text-[#737373]'}`}>
      {type}
    </span>
  );
}
