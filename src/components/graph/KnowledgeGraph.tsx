import { useEffect, useRef, useState, useCallback } from 'react';
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

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  width?: number;
  height?: number;
}

const NODE_COLORS: Record<string, string> = {
  entity: '#3b82f6',    // Blue
  concept: '#8b5cf6',    // Purple
  process: '#10b981',    // Green
  document: '#f59e0b',   // Amber
};

const EDGE_COLORS: Record<string, string> = {
  relates: '#737373',
  contains: '#3b82f6',
  follows: '#10b981',
  uses: '#f59e0b',
  references: '#8b5cf6',
};

export function KnowledgeGraph({
  data,
  onNodeClick,
  onEdgeClick,
  width = 800,
  height = 600,
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw graph
  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Main group for zoom/pan
    const g = svg.append('g');

    // Define arrow markers for edges
    const defs = svg.append('defs');
    
    Object.entries(EDGE_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(data.edges)
        .id(d => d.id)
        .distance(150)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60));

    // Draw edges
    const edges = g.append('g')
      .attr('class', 'edges')
      .selectAll('g')
      .data(data.edges)
      .join('g')
      .attr('class', 'edge');

    const edgePaths = edges.append('path')
      .attr('d', d => {
        const source = typeof d.source === 'string' ? data.nodes.find(n => n.id === d.source) : d.source;
        const target = typeof d.target === 'string' ? data.nodes.find(n => n.id === d.target) : d.target;
        if (!source || !target) return '';
        
        const sx = source.x || 0, sy = source.y || 0;
        const tx = target.x || 0, ty = target.y || 0;
        
        // Curved path
        const dx = tx - sx, dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.5;
        
        return `M${sx},${sy} A${dr},${dr} 0 0,1 ${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', d => EDGE_COLORS[d.type] || EDGE_COLORS.relates)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.type})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onEdgeClick?.(d);
      });

    // Edge labels
    edges.append('text')
      .attr('class', 'edge-label')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('fill', '#a3a3a3')
      .attr('font-size', '10px')
      .attr('opacity', 0.8)
      .text(d => d.label || '')
      .clone(true) // Ghost text for background
      .attr('class', 'edge-label-bg')
      .attr('fill', 'none')
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 4);

    // Draw nodes
    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);

    // Node circles
    nodes.append('circle')
      .attr('r', d => d.type === 'document' ? 35 : d.type === 'process' ? 28 : 24)
      .attr('fill', d => NODE_COLORS[d.type] || NODE_COLORS.entity)
      .attr('fill-opacity', d => hoveredNode === d.id ? 1 : 0.8)
      .attr('stroke', d => selectedNode === d.id ? '#fff' : 'transparent')
      .attr('stroke-width', selectedNode === data.nodes[0]?.id ? 3 : 0)
      .on('mouseenter', (_event, d) => setHoveredNode(d.id))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.id);
        onNodeClick?.(d);
      });

    // Node icons
    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => d.type === 'document' ? '16px' : '14px')
      .attr('fill', '#fff')
      .text(d => {
        switch (d.type) {
          case 'entity': return '📄';
          case 'concept': return '💡';
          case 'process': return '⚙️';
          case 'document': return '📋';
          default: return '•';
        }
      });

    // Node labels
    nodes.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'document' ? 50 : d.type === 'process' ? 42 : 38)
      .attr('fill', '#e5e5e5')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text(d => d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label);

    // Update positions on tick
    simulation.on('tick', () => {
      edgePaths.attr('d', (d: GraphEdge) => {
        const source = typeof d.source === 'string' ? d.source : (d.source as GraphNode).id;
        const target = typeof d.target === 'string' ? d.target : (d.target as GraphNode).id;
        const sNode = data.nodes.find(n => n.id === source);
        const tNode = data.nodes.find(n => n.id === target);
        if (!sNode || !tNode) return '';
        
        const sx = sNode.x || 0, sy = sNode.y || 0;
        const tx = tNode.x || 0, ty = tNode.y || 0;
        
        const dx = tx - sx, dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.5;
        
        return `M${sx},${sy} A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });

      nodes.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Zoom to fit
    const initialTransform = d3.zoomIdentity
      .translate(width / 4, height / 4)
      .scale(0.8);
    svg.call(zoom.transform, initialTransform);

    return () => {
      simulation.stop();
    };
  }, [data, dimensions, selectedNode, hoveredNode, onNodeClick, onEdgeClick]);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.5
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.67
    );
  }, []);

  const handleReset = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity.translate(width / 4, height / 4).scale(0.8)
    );
  }, [dimensions]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-[#262626] hover:bg-[#333] text-[#e5e5e5] rounded-lg transition-colors"
          title="Acercar"
        >
          🔍+
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-[#262626] hover:bg-[#333] text-[#e5e5e5] rounded-lg transition-colors"
          title="Alejar"
        >
          🔍-
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-[#262626] hover:bg-[#333] text-[#e5e5e5] rounded-lg transition-colors"
          title="Resetear vista"
        >
          🎯
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[#262626]/90 p-3 rounded-lg text-xs">
        <div className="font-semibold text-[#a3a3a3] mb-2">Leyenda</div>
        <div className="space-y-1">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[#a3a3a3] capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-4 bg-[#262626]/90 px-3 py-2 rounded-lg text-xs text-[#a3a3a3]">
        <span className="text-[#3b82f6]">{data.nodes.length}</span> nodos ·{' '}
        <span className="text-[#10b981]">{data.edges.length}</span> relaciones
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-[#1a1a1a]"
      />

      {/* Empty state */}
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[#737373]">
          <div className="text-center">
            <div className="text-5xl mb-4">🕸️</div>
            <p className="text-lg">Sin datos para visualizar</p>
            <p className="text-sm mt-2">Analiza documentos para generar el grafo</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-xs text-[#737373]">
        Arrastra nodos · Scroll para zoom · Drag fondo para pan
      </div>
    </div>
  );
}

export default KnowledgeGraph;