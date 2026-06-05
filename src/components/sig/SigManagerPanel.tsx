/**
 * SigManagerPanel — Gestión de áreas y procedimientos SIG independiente del análisis.
 * Se accede desde la ActivityBar (ícono ShieldCheck).
 * Permite: crear áreas, ver procedimientos por área, y crear commits de inicialización.
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Layers, FileText, RefreshCw, Send, ChevronRight, Loader } from 'lucide-react';
import {
  getSigAreas, createSigArea, getSigProcedimientos, createSigProcedimiento,
  type SigArea, type SigProcedimiento,
} from '../../services/sigCommitService';
import { SigCommitModal } from './SigCommitModal';

// ── Paleta de colores ──────────────────────────────────────────────────────────
const COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#6366f1',
];

// ── Sub-componente: crear área ─────────────────────────────────────────────────
function CreateAreaForm({ onCreated }: { onCreated: (area: SigArea) => void }) {
  const [nombre, setNombre] = useState('');
  const [desc,   setDesc]   = useState('');
  const [color,  setColor]  = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleCreate = async () => {
    if (!nombre.trim()) return;
    setSaving(true); setError('');
    const res = await createSigArea({ nombre: nombre.trim(), descripcion: desc.trim() || undefined, color });
    setSaving(false);
    if (!res.ok || !res.data) { setError(res.error ?? 'Error al crear'); return; }
    setNombre(''); setDesc(''); setColor(COLORS[0]);
    onCreated(res.data);
  };

  return (
    <div className="p-3 border border-[#2a2a2a] rounded-lg bg-[#111] space-y-2.5">
      <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest">Nueva área</p>

      <input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
        placeholder="Nombre del área"
        autoFocus
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] transition-colors"
      />

      <input
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Descripción (opcional)"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] transition-colors"
      />

      <div>
        <p className="text-[9px] text-[#444] uppercase tracking-widest mb-1.5">Color</p>
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0"
              style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={saving || !nombre.trim()}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#1a3a6a] hover:bg-[#1e4a8a] disabled:opacity-40 text-[#7ab0f0] text-xs rounded transition-colors"
      >
        {saving ? <Loader size={11} className="animate-spin" /> : <Plus size={11} />}
        {saving ? 'Creando…' : 'Crear área'}
      </button>
    </div>
  );
}

// ── Sub-componente: crear procedimiento ───────────────────────────────────────
function CreateProcForm({ area, onCreated }: { area: SigArea; onCreated: (p: SigProcedimiento) => void }) {
  const [codigo,  setCodigo]  = useState('');
  const [titulo,  setTitulo]  = useState('');
  const [desc,    setDesc]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const handleCreate = async () => {
    if (!codigo.trim() || !titulo.trim()) return;
    setSaving(true); setError('');
    const res = await createSigProcedimiento({
      areaId: area.id,
      codigo: codigo.trim(),
      titulo: titulo.trim(),
      descripcion: desc.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok || !res.data) { setError(res.error ?? 'Error al crear'); return; }
    setCodigo(''); setTitulo(''); setDesc('');
    onCreated(res.data);
  };

  return (
    <div className="mt-2 p-3 border border-[#2a2a2a] rounded-lg bg-[#111] space-y-2">
      <p className="text-[10px] font-semibold text-[#555] uppercase tracking-widest">
        Nuevo procedimiento en <span style={{ color: area.color }}>{area.nombre}</span>
      </p>

      <input
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        placeholder="Código (ej. FIN-001)"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#e5e5e5] font-mono placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] transition-colors"
      />
      <input
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        placeholder="Título del procedimiento"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] transition-colors"
      />
      <input
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Descripción (opcional)"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-[#444] transition-colors"
      />

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={saving || !codigo.trim() || !titulo.trim()}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#0d3028] hover:bg-[#0f3d32] disabled:opacity-40 text-emerald-400 text-xs rounded transition-colors"
      >
        {saving ? <Loader size={11} className="animate-spin" /> : <Plus size={11} />}
        {saving ? 'Creando…' : 'Crear procedimiento'}
      </button>
    </div>
  );
}

// ── Panel principal ────────────────────────────────────────────────────────────
export function SigManagerPanel() {
  const [areas,         setAreas]         = useState<SigArea[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedArea,  setSelectedArea]  = useState<SigArea | null>(null);
  const [procs,         setProcs]         = useState<SigProcedimiento[]>([]);
  const [loadingProcs,  setLoadingProcs]  = useState(false);
  const [showCreateArea,setShowCreateArea]= useState(false);
  const [showCreateProc,setShowCreateProc]= useState(false);
  const [commitProc,    setCommitProc]    = useState<SigProcedimiento | null>(null);

  const loadAreas = useCallback(async () => {
    setLoading(true);
    const res = await getSigAreas();
    if (res.ok && res.data) setAreas(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadAreas(); }, [loadAreas]);

  const handleSelectArea = async (area: SigArea) => {
    setSelectedArea(area);
    setShowCreateProc(false);
    setLoadingProcs(true);
    const res = await getSigProcedimientos(area.id);
    if (res.ok && res.data) setProcs(res.data);
    setLoadingProcs(false);
  };

  const handleAreaCreated = (area: SigArea) => {
    setAreas(prev => [...prev, area]);
    setShowCreateArea(false);
    handleSelectArea(area);
  };

  const handleProcCreated = (proc: SigProcedimiento) => {
    setProcs(prev => [...prev, proc]);
    setShowCreateProc(false);
  };

  const ESTADO_COLOR: Record<string, string> = {
    BORRADOR: 'text-zinc-500 bg-zinc-800/60',
    VIGENTE:  'text-emerald-400 bg-emerald-900/30',
    OBSOLETO: 'text-zinc-600 bg-zinc-900/40',
  };

  return (
    <>
      <div className="w-64 flex flex-col bg-[#111] border-r border-[#1e1e1e] overflow-hidden h-full">

        {/* Header */}
        <div className="px-3 pt-3 pb-2 border-b border-[#1e1e1e]">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-[#444] uppercase tracking-widest">SIG</p>
            <div className="flex items-center gap-1">
              <button
                onClick={loadAreas}
                title="Recargar áreas"
                className="p-1 text-[#3a3a3a] hover:text-[#777] transition-colors rounded"
              >
                <RefreshCw size={11} />
              </button>
              <button
                onClick={() => { setShowCreateArea(v => !v); setShowCreateProc(false); }}
                title="Nueva área"
                className={`p-1 rounded transition-colors ${showCreateArea ? 'text-[#7ab0f0] bg-[#1a3a6a]/40' : 'text-[#3a3a3a] hover:text-[#7ab0f0]'}`}
              >
                <Layers size={13} />
              </button>
            </div>
          </div>
          <p className="text-[9px] text-[#333]">Áreas · Procedimientos · Commits</p>
        </div>

        {/* Create area form */}
        {showCreateArea && (
          <div className="px-2 pt-2 border-b border-[#1e1e1e]">
            <CreateAreaForm onCreated={handleAreaCreated} />
            <button
              onClick={() => setShowCreateArea(false)}
              className="w-full text-[10px] text-[#3a3a3a] hover:text-[#666] py-1.5 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Areas list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader size={14} className="animate-spin text-[#333]" />
            </div>
          ) : areas.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-[#333] mb-3">Sin áreas creadas.</p>
              <button
                onClick={() => setShowCreateArea(true)}
                className="text-[11px] text-[#7ab0f0] hover:text-[#93c5fd] transition-colors"
              >
                + Crear primera área
              </button>
            </div>
          ) : (
            <div className="py-1">
              {areas.map(area => (
                <button
                  key={area.id}
                  onClick={() => handleSelectArea(area)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors group ${
                    selectedArea?.id === area.id
                      ? 'bg-[#1a1a1a] text-[#e5e5e5]'
                      : 'text-[#666] hover:bg-[#151515] hover:text-[#a3a3a3]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                  <span className="text-xs flex-1 truncate">{area.nombre}</span>
                  <span className="text-[9px] text-[#333] tabular-nums group-hover:text-[#555]">
                    {(area as SigArea & { _count?: { procedimientos: number } })._count?.procedimientos ?? 0}
                  </span>
                  <ChevronRight size={10} className="text-[#2a2a2a] group-hover:text-[#555]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected area — procedures */}
        {selectedArea && (
          <div className="border-t border-[#1e1e1e] flex flex-col max-h-[55%]">
            <div className="flex items-center justify-between px-3 py-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: selectedArea.color }} />
                <span className="text-[10px] text-[#555] truncate">{selectedArea.nombre}</span>
              </div>
              <button
                onClick={() => { setShowCreateProc(v => !v); }}
                title="Nuevo procedimiento"
                className={`p-1 rounded transition-colors ${showCreateProc ? 'text-emerald-400 bg-emerald-900/20' : 'text-[#3a3a3a] hover:text-emerald-400'}`}
              >
                <Plus size={12} />
              </button>
            </div>

            {showCreateProc && (
              <div className="px-2 pb-2 border-b border-[#1e1e1e]">
                <CreateProcForm area={selectedArea} onCreated={handleProcCreated} />
                <button
                  onClick={() => setShowCreateProc(false)}
                  className="w-full text-[10px] text-[#3a3a3a] hover:text-[#666] py-1 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {loadingProcs ? (
                <div className="flex justify-center py-4">
                  <Loader size={12} className="animate-spin text-[#333]" />
                </div>
              ) : procs.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-[11px] text-[#333] mb-2">Sin procedimientos</p>
                  <button
                    onClick={() => setShowCreateProc(true)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-400 transition-colors"
                  >
                    + Crear procedimiento
                  </button>
                </div>
              ) : (
                <div className="py-1">
                  {procs.map(proc => (
                    <div
                      key={proc.id}
                      className="flex items-center gap-2 px-3 py-1.5 group hover:bg-[#151515] transition-colors"
                    >
                      <FileText size={11} className="text-[#333] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono text-[#888] group-hover:text-[#aaa] truncate">{proc.codigo}</p>
                        <p className="text-[10px] text-[#3a3a3a] truncate">{proc.titulo}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[9px] px-1 py-0.5 rounded ${ESTADO_COLOR[proc.estado] ?? ''}`}>
                          {proc.estado === 'VIGENTE' ? 'V' : proc.estado === 'BORRADOR' ? 'B' : 'O'}
                        </span>
                        <button
                          onClick={() => setCommitProc(proc)}
                          title="Commit de inicialización"
                          className="p-0.5 text-[#2a2a2a] hover:text-emerald-400 transition-colors rounded opacity-0 group-hover:opacity-100"
                        >
                          <Send size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status bar */}
        <div className="px-3 py-1.5 border-t border-[#1e1e1e] shrink-0">
          <p className="text-[9px] text-[#2a2a2a] font-mono">
            {areas.length} área{areas.length !== 1 ? 's' : ''} · SIG
          </p>
        </div>
      </div>

      {/* Commit init modal */}
      {commitProc && (
        <SigCommitModal
          onClose={() => setCommitProc(null)}
          onSuccess={() => setCommitProc(null)}
        />
      )}
    </>
  );
}
