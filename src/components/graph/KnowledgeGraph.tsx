import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';

export interface GraphNode {
  id: string;
  label: string;
  type: 'entity' | 'concept' | 'process' | 'document';
  properties?: Record<string, string>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
  type: 'relates' | 'contains' | 'follows' | 'uses' | 'references';
  properties?: Record<string, string>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphLayout = 'force' | 'radial' | 'tree';

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  width?: number;
  height?: number;
  layout?: GraphLayout;
  highlightNodeId?: string | null;
  /** Física suave para grafos grandes (vault > 30 nodos) */
  calmPhysics?: boolean;
  /** Congela la simulación cuando alpha < alphaMin */
  freezeAfterLayout?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  entity:   '#3b82f6',
  concept:  '#8b5cf6',
  process:  '#10b981',
  document: '#f59e0b',
};

const EDGE_COLORS: Record<string, string> = {
  relates:    '#737373',
  contains:   '#3b82f6',
  follows:    '#10b981',
  uses:       '#f59e0b',
  references: '#8b5cf6',
};

type LinkDatum = { source: string; target: string; label?: string; type: GraphEdge['type'] };

export function KnowledgeGraph({
  data,
  onNodeClick,
  onEdgeClick,
  width  = 800,
  height = 600,
  layout = 'force',
  highlightNodeId  = null,
  calmPhysics      = false,
  freezeAfterLayout = true,
}: KnowledgeGraphProps) {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef         = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const simRef       = useRef<d3.Simulation<GraphNode, undefined> | null>(null);
  const nodesRef     = useRef<GraphNode[]>([]);
  const nodeMapRef   = useRef<Map<string, GraphNode>>(new Map());
  const nodeGRef     = useRef<d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown> | null>(null);
  const edgeGRef     = useRef<d3.Selection<SVGPathElement, LinkDatum, SVGGElement, unknown> | null>(null);
  const onNodeRef    = useRef(onNodeClick);
  const onEdgeRef    = useRef(onEdgeClick);
  onNodeRef.current  = onNodeClick;
  onEdgeRef.current  = onEdgeClick;

  const [dims, setDims]           = useState({ width, height });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeHighlight = highlightNodeId ?? selectedId;

  const neighborIds = useMemo(() => {
    if (!activeHighlight) return null as Set<string> | null;
    const set = new Set<string>([activeHighlight]);
    for (const e of data.edges) {
      const s = typeof e.source === 'string' ? e.source : e.source.id;
      const t = typeof e.target === 'string' ? e.target : e.target.id;
      if (s === activeHighlight) set.add(t);
      if (t === activeHighlight) set.add(s);
    }
    return set;
  }, [activeHighlight, data.edges]);

  // ── resize ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDims({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── curved path (uses nodeMap for O(1) lookup) ───────────────────────────
  const linkPath = useCallback((s: GraphNode, t: GraphNode) => {
    const sx = s.x ?? 0, sy = s.y ?? 0, tx = t.x ?? 0, ty = t.y ?? 0;
    const dr = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2) * 0.35;
    return `M${sx},${sy} A${dr},${dr} 0 0,1 ${tx},${ty}`;
  }, []);

  // ── build / rebuild simulation ──────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    nodeGRef.current  = null;
    edgeGRef.current  = null;
    simRef.current?.stop();
    simRef.current = null;

    if (data.nodes.length === 0) return;

    const { width: w, height: h } = dims;
    const n = data.nodes.length;

    // Deep-copy nodes so D3 can mutate x/y without touching original data
    const nodes: GraphNode[] = data.nodes.map(nd => ({ ...nd }));
    const links: LinkDatum[] = data.edges.map(e => ({
      source: typeof e.source === 'string' ? e.source : e.source.id,
      target: typeof e.target === 'string' ? e.target : e.target.id,
      label:  e.label,
      type:   e.type,
    }));

    // Spread nodes in a circle initially — prevents all-in-center chaos
    const spread = Math.min(w, h) * (calmPhysics ? 0.40 : 0.33);
    nodes.forEach((nd, i) => {
      if (nd.x == null) nd.x = w / 2 + spread * Math.cos(2 * Math.PI * i / n);
      if (nd.y == null) nd.y = h / 2 + spread * Math.sin(2 * Math.PI * i / n);
    });

    nodesRef.current  = nodes;
    const nodeMap = new Map(nodes.map(nd => [nd.id, nd]));
    nodeMapRef.current = nodeMap;

    // Physics tuning
    const charge  = calmPhysics ? -35 - Math.sqrt(n) * 6 : -110 - Math.min(n, 80);
    const linkDst = calmPhysics ? 60 + Math.min(n, 100) * 0.1 : 80;
    const linkStr = calmPhysics ? 0.18 : 0.32;

    // ── zoom & pan ────────────────────────────────────────────────────────────
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', ev => g.attr('transform', ev.transform));
    zoomRef.current = zoom;
    svg.call(zoom);

    const g = svg.append('g');
    gRef.current = g;

    // Arrow markers
    const defs = svg.append('defs');
    Object.entries(EDGE_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arr-${type}`)
        .attr('viewBox', '0 -5 10 10').attr('refX', 18).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
    });

    // ── simulation ────────────────────────────────────────────────────────────
    const sim = d3.forceSimulation<GraphNode>(nodes)
      .alphaDecay(calmPhysics ? 0.15 : 0.10)
      .velocityDecay(calmPhysics ? 0.85 : 0.75)
      .alphaMin(0.001);

    if (layout === 'radial') {
      sim
        .force('link',   d3.forceLink<GraphNode, LinkDatum>(links).id(d => d.id).distance(90).strength(0.30))
        .force('charge', d3.forceManyBody().strength(charge))
        .force('radial', d3.forceRadial(Math.min(w, h) * 0.32, w / 2, h / 2).strength(0.55))
        .force('center', d3.forceCenter(w / 2, h / 2).strength(0.03));
    } else if (layout === 'tree') {
      if (nodes[0]) { nodes[0].fx = w / 2; nodes[0].fy = 60; }
      sim
        .force('link',   d3.forceLink<GraphNode, LinkDatum>(links).id(d => d.id).distance(100).strength(0.38))
        .force('charge', d3.forceManyBody().strength(charge))
        .force('y',      d3.forceY(h / 2).strength(0.05))
        .force('x',      d3.forceX(w / 2).strength(0.025));
    } else {
      sim
        .force('link',      d3.forceLink<GraphNode, LinkDatum>(links).id(d => d.id).distance(linkDst).strength(linkStr))
        .force('charge',    d3.forceManyBody().strength(charge))
        .force('center',    d3.forceCenter(w / 2, h / 2).strength(calmPhysics ? 0.025 : 0.05))
        .force('collision', d3.forceCollide<GraphNode>().radius(calmPhysics ? 20 : 26));
    }

    // ── edges ────────────────────────────────────────────────────────────────
    const edgePaths = g.append('g').attr('class', 'edges')
      .selectAll<SVGPathElement, LinkDatum>('path')
      .data(links).join('path')
      .attr('fill', 'none')
      .attr('stroke', d => EDGE_COLORS[d.type] ?? EDGE_COLORS.relates)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.45)
      .attr('marker-end', d => `url(#arr-${d.type})`)
      .style('cursor', 'pointer')
      .on('click', (ev, d) => { ev.stopPropagation(); onEdgeRef.current?.(d as GraphEdge); });
    edgeGRef.current = edgePaths;

    // ── nodes ────────────────────────────────────────────────────────────────
    const nodeGroups = g.append('g').attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g').data(nodes).join('g')
      .attr('class', 'node').style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (_ev, d) => {
            sim.stop();           // freeze physics while dragging
            d.fx = d.x ?? 0;
            d.fy = d.y ?? 0;
          })
          .on('drag', (ev, d) => {
            d.fx = ev.x;
            d.fy = ev.y;
            paint();
          })
          .on('end', (ev, d) => {
            d.fx = ev.x;          // pin where released
            d.fy = ev.y;
            paint();
          }),
      );
    nodeGRef.current = nodeGroups;

    nodeGroups.append('circle')
      .attr('r',            d => d.type === 'document' ? 10 : d.type === 'process' ? 11 : 8)
      .attr('fill',         d => NODE_COLORS[d.type] ?? NODE_COLORS.entity)
      .attr('fill-opacity', 0.88)
      .attr('stroke',       '#1a1a1a')
      .attr('stroke-width', 1.5);

    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 22)
      .attr('fill', '#a3a3a3')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text(d => d.label.length > 24 ? `${d.label.slice(0, 24)}…` : d.label);

    nodeGroups.on('click', (ev, d) => {
      ev.stopPropagation();
      setSelectedId(d.id);
      onNodeRef.current?.(d);
    });

    // Double-click: unpin and gently re-settle
    nodeGroups.on('dblclick', (ev, d) => {
      ev.stopPropagation();
      d.fx = null; d.fy = null;
      sim.alpha(0.18).restart();
      if (!svgRef.current || !zoomRef.current) return;
      const sc = 2.0;
      d3.select(svgRef.current).transition().duration(350).call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(w / 2 - (d.x ?? 0) * sc, h / 2 - (d.y ?? 0) * sc).scale(sc),
      );
    });

    // ── paint fn: O(1) via nodeMap ─────────────────────────────────────────
    function paint() {
      const nm = nodeMapRef.current;
      edgePaths.attr('d', d => {
        const s = nm.get(typeof d.source === 'string' ? d.source : (d.source as GraphNode).id);
        const t = nm.get(typeof d.target === 'string' ? d.target : (d.target as GraphNode).id);
        return s && t ? linkPath(s, t) : '';
      });
      nodeGroups.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    }

    sim.on('tick', paint);
    sim.on('end',  () => { if (freezeAfterLayout) sim.stop(); paint(); });
    simRef.current = sim;

    // Initial view: slight zoom-out so all nodes are visible
    svg.call(zoom.transform, d3.zoomIdentity.translate(w * 0.08, h * 0.08).scale(0.88));

    return () => { sim.stop(); simRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dims, layout, calmPhysics, freezeAfterLayout]);

  // ── highlight effect (no simulation restart) ──────────────────────────────
  useEffect(() => {
    const nG = nodeGRef.current;
    const eG = edgeGRef.current;
    if (!nG || !eG) return;

    nG.attr('opacity', d => (!neighborIds || neighborIds.has(d.id)) ? 1 : 0.18)
      .each(function(d) {
        d3.select(this).select('circle')
          .attr('stroke',       activeHighlight === d.id ? '#fff' : '#1a1a1a')
          .attr('stroke-width', activeHighlight === d.id ? 2.5  : 1.5);
      });

    eG.attr('stroke-opacity', d => {
        if (!neighborIds) return 0.45;
        const s = typeof d.source === 'string' ? d.source : (d.source as GraphNode).id;
        const t = typeof d.target === 'string' ? d.target : (d.target as GraphNode).id;
        return (neighborIds.has(s) && neighborIds.has(t)) ? 0.9 : 0.06;
      })
      .attr('stroke-width', d => {
        if (!neighborIds) return 1.5;
        const s = typeof d.source === 'string' ? d.source : (d.source as GraphNode).id;
        const t = typeof d.target === 'string' ? d.target : (d.target as GraphNode).id;
        return (neighborIds.has(s) && neighborIds.has(t)) ? 2.5 : 1;
      });
  }, [activeHighlight, neighborIds]);

  // ── zoom controls ─────────────────────────────────────────────────────────
  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(180).call(zoomRef.current.scaleBy, factor);
  }, []);

  const resetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const { width: w, height: h } = dims;
    d3.select(svgRef.current).transition().duration(350).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(w * 0.08, h * 0.08).scale(0.88),
    );
  }, [dims]);

  const unpinAll = useCallback(() => {
    nodesRef.current.forEach(n => { n.fx = null; n.fy = null; });
    simRef.current?.alpha(0.30).restart();
  }, []);

  const stopAndFit = useCallback(() => {
    simRef.current?.stop();
  }, []);

  return (
    <div
      ref={containerRef}
      className="knowledge-graph relative w-full h-full bg-[#0c0c0c] rounded-lg overflow-hidden"
    >
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        <button type="button" onClick={() => zoomBy(1.35)} className="px-2 py-1 text-xs bg-[#262626] hover:bg-[#333] text-[#e5e5e5] rounded" title="Acercar">+</button>
        <button type="button" onClick={() => zoomBy(0.75)} className="px-2 py-1 text-xs bg-[#262626] hover:bg-[#333] text-[#e5e5e5] rounded" title="Alejar">−</button>
        <button type="button" onClick={resetView}          className="px-2 py-1 text-xs bg-[#262626] hover:bg-[#333] text-[#e5e5e5] rounded" title="Centrar">⌂</button>
        <button type="button" onClick={unpinAll}           className="px-2 py-1 text-xs bg-[#262626] hover:bg-[#737373] text-[#a3a3a3] rounded" title="Soltar nodos fijados">↺</button>
        <button type="button" onClick={stopAndFit}         className="px-2 py-1 text-xs bg-[#262626] hover:bg-[#737373] text-[#a3a3a3] rounded" title="Detener física">■</button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-[#1a1a1a]/90 p-2 rounded-lg text-[10px] z-10 border border-[#2a2a2a]">
        <div className="font-semibold text-[#505050] mb-1">Leyenda</div>
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[#737373] capitalize">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {type}
          </div>
        ))}
      </div>

      {/* Node/edge counter */}
      <div className="absolute top-3 left-3 bg-[#1a1a1a]/90 px-2 py-1 rounded text-[10px] text-[#505050] z-10 border border-[#2a2a2a]">
        <span className="text-[#3b82f6]">{data.nodes.length}</span> nodos ·{' '}
        <span className="text-[#10b981]">{data.edges.length}</span> enlaces
      </div>

      <svg ref={svgRef} width={dims.width} height={dims.height} className="bg-[#0c0c0c]" />

      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[#505050] pointer-events-none gap-2">
          <span className="text-2xl">⬡</span>
          <p className="text-sm">Sin datos de grafo</p>
          <p className="text-xs text-[#383838]">Selecciona una fuente en el panel izquierdo</p>
        </div>
      )}

      <div className="absolute bottom-3 right-3 text-[10px] text-[#383838] z-10">
        Arrastra → fijar · Doble clic → liberar
      </div>
    </div>
  );
}

export default KnowledgeGraph;
