import { useState, useEffect } from 'react';
import { Send, X, Loader, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import {
  getSigAreas, getSigProcedimientos, createSigProcedimiento, submitSigCommit,
  type SigArea, type SigProcedimiento,
} from '../../services/sigCommitService';
import type { AnalysisPackage } from '../../types';

interface Props {
  pkg: AnalysisPackage;
  textContent: string;
  onClose: () => void;
  onSuccess: (commitId: number) => void;
}

type Step = 'loading' | 'select' | 'create-proc' | 'commit' | 'done' | 'error';

export function SigCommitModal({ pkg, textContent, onClose, onSuccess }: Props) {
  const [step, setStep]               = useState<Step>('loading');
  const [areas, setAreas]             = useState<SigArea[]>([]);
  const [procs, setProcs]             = useState<SigProcedimiento[]>([]);
  const [selectedArea, setSelectedArea] = useState<SigArea | null>(null);
  const [selectedProc, setSelectedProc] = useState<SigProcedimiento | null>(null);

  // Crear procedimiento nuevo
  const [newCodigo,  setNewCodigo]   = useState(pkg.procedureCode);
  const [newTitulo,  setNewTitulo]   = useState('');
  const [newDesc,    setNewDesc]     = useState('');
  const [creatingProc, setCreatingProc] = useState(false);

  // Commit
  const [mensaje,    setMensaje]     = useState('');
  const [sinCambios, setSinCambios]  = useState(false);
  const [submitting, setSubmitting]  = useState(false);
  const [commitId,   setCommitId]    = useState<number | null>(null);
  const [errorMsg,   setErrorMsg]    = useState('');

  // ── Init: cargar áreas y buscar procedimiento por código ──────────────────
  useEffect(() => {
    void (async () => {
      const areasRes = await getSigAreas();
      if (!areasRes.ok || !areasRes.data) {
        setErrorMsg(areasRes.error ?? 'No se pudieron cargar las áreas del SIG.');
        setStep('error');
        return;
      }
      setAreas(areasRes.data);

      // Intentar encontrar el procedimiento por código
      const procsRes = await getSigProcedimientos();
      if (procsRes.ok && procsRes.data) {
        const match = procsRes.data.find(
          (p) => p.codigo.toLowerCase() === pkg.procedureCode.toLowerCase(),
        );
        if (match) {
          setSelectedProc(match);
          const area = areasRes.data.find((a) => a.id === match.areaId) ?? null;
          setSelectedArea(area);
          setProcs(procsRes.data.filter((p) => p.areaId === match.areaId));
          setMensaje(`Análisis de ${match.codigo} — rev. ${pkg.meta.version}`);
          setStep('commit');
          return;
        }
        setProcs(procsRes.data);
      }

      setStep('select');
    })();
  }, []);

  // ── Cargar procedimientos cuando cambia el área ───────────────────────────
  const handleAreaChange = async (areaId: number) => {
    const area = areas.find((a) => a.id === areaId) ?? null;
    setSelectedArea(area);
    setSelectedProc(null);
    if (!area) return;
    const res = await getSigProcedimientos(area.id);
    if (res.ok && res.data) setProcs(res.data);
  };

  // ── Seleccionar procedimiento y avanzar ───────────────────────────────────
  const handleProcSelect = (procId: number | 'new') => {
    if (procId === 'new') {
      setSelectedProc(null);
      setStep('create-proc');
      return;
    }
    const proc = procs.find((p) => p.id === procId) ?? null;
    setSelectedProc(proc);
    if (proc) {
      setMensaje(`Análisis de ${proc.codigo} — rev. ${pkg.meta.version}`);
      setStep('commit');
    }
  };

  // ── Crear procedimiento nuevo ─────────────────────────────────────────────
  const handleCreateProc = async () => {
    if (!selectedArea || !newCodigo.trim() || !newTitulo.trim()) return;
    setCreatingProc(true);
    try {
      const res = await createSigProcedimiento({
        areaId:      selectedArea.id,
        codigo:      newCodigo.trim(),
        titulo:      newTitulo.trim(),
        descripcion: newDesc.trim() || undefined,
      });
      if (!res.ok || !res.data) {
        setErrorMsg(res.error ?? 'Error al crear el procedimiento');
        setStep('error');
        return;
      }
      setSelectedProc(res.data);
      setMensaje(`Análisis de ${res.data.codigo} — rev. ${pkg.meta.version}`);
      setStep('commit');
    } finally {
      setCreatingProc(false);
    }
  };

  // ── Enviar commit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedProc || !mensaje.trim()) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await submitSigCommit({
        procedimientoId:   selectedProc.id,
        contenidoOriginal: textContent,
        contenidoAgente:   pkg.markdownNormalized,
        flujogramaMmd:     pkg.flowchartMmd || undefined,
        sinCambios,
        mensaje:           mensaje.trim(),
        versionDoc:        pkg.meta.version,
      });
      if (!res.ok || !res.data) {
        setErrorMsg(res.error ?? 'Error al enviar el commit');
        return;
      }
      setCommitId(res.data.id);
      setStep('done');
      onSuccess(res.data.id);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70">
      <div className="bg-[#1a1a1a] rounded-xl w-full max-w-md border border-[#333] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Send size={15} className="text-emerald-400" />
            <span className="text-sm font-semibold text-[#e5e5e5]">Enviar a SIG</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#a3a3a3] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5">
          {/* LOADING */}
          {step === 'loading' && (
            <div className="flex items-center gap-3 py-6 justify-center text-[#737373] text-sm">
              <Loader size={16} className="animate-spin" />
              Conectando con el SIG…
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400">{errorMsg}</p>
              </div>
              <p className="text-xs text-[#737373]">
                Verifica que hayas iniciado sesión en la intranet y que tengas acceso al módulo SIG.
              </p>
              <button onClick={onClose} className="w-full py-2 text-xs text-[#737373] hover:text-[#a3a3a3] border border-[#333] rounded-lg">
                Cerrar
              </button>
            </div>
          )}

          {/* SELECT: área + procedimiento */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-xs text-[#737373]">
                No se encontró <span className="font-mono text-[#a3a3a3]">{pkg.procedureCode}</span> en el SIG.
                Selecciona el área y procedimiento de destino.
              </p>

              {/* Área */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Área</label>
                <select
                  value={selectedArea?.id ?? ''}
                  onChange={(e) => handleAreaChange(Number(e.target.value))}
                  className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-2 text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Seleccionar área…</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Procedimiento */}
              {selectedArea && (
                <div>
                  <label className="text-xs text-[#737373] block mb-1">Procedimiento</label>
                  <select
                    value={selectedProc?.id ?? ''}
                    onChange={(e) => handleProcSelect(e.target.value === 'new' ? 'new' : Number(e.target.value))}
                    className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-2 text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Seleccionar procedimiento…</option>
                    {procs.map((p) => (
                      <option key={p.id} value={p.id}>{p.codigo} — {p.titulo}</option>
                    ))}
                    <option value="new">+ Crear nuevo procedimiento</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* CREATE PROC */}
          {step === 'create-proc' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Plus size={13} className="text-emerald-400" />
                <span className="text-xs font-semibold text-[#e5e5e5]">
                  Nuevo procedimiento en {selectedArea?.nombre}
                </span>
              </div>
              <div>
                <label className="text-xs text-[#737373] block mb-1">Código</label>
                <input
                  value={newCodigo}
                  onChange={(e) => setNewCodigo(e.target.value)}
                  placeholder="ej. TC-001"
                  className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1.5 text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-[#737373] block mb-1">Título</label>
                <input
                  value={newTitulo}
                  onChange={(e) => setNewTitulo(e.target.value)}
                  placeholder="Nombre del procedimiento"
                  className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1.5 text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-[#737373] block mb-1">Descripción (opcional)</label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descripción breve"
                  className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1.5 text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 py-2 text-xs text-[#737373] hover:text-[#a3a3a3] border border-[#333] rounded-lg"
                >
                  Atrás
                </button>
                <button
                  onClick={handleCreateProc}
                  disabled={creatingProc || !newCodigo.trim() || !newTitulo.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
                >
                  {creatingProc ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />}
                  {creatingProc ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </div>
          )}

          {/* COMMIT */}
          {step === 'commit' && selectedProc && (
            <div className="space-y-4">
              {/* Procedimiento seleccionado */}
              <div className="p-3 rounded-lg bg-[#262626] border border-[#333]">
                <p className="text-[10px] text-[#737373] uppercase tracking-wide mb-0.5">Procedimiento destino</p>
                <p className="text-sm font-mono text-[#a3a3a3]">{selectedProc.codigo}</p>
                <p className="text-xs text-[#737373] mt-0.5">{selectedProc.titulo}</p>
              </div>

              {/* Mensaje */}
              <div>
                <label className="text-xs text-[#737373] block mb-1">Mensaje del commit</label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  rows={3}
                  className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1.5 text-xs text-[#e5e5e5] resize-none focus:outline-none focus:border-emerald-500"
                  placeholder="Describe brevemente el análisis realizado…"
                />
              </div>

              {/* Sin cambios */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sinCambios}
                  onChange={(e) => setSinCambios(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span className="text-xs text-[#737373]">
                  El agente no realizó cambios — el procedimiento estaba correcto
                </span>
              </label>

              {errorMsg && (
                <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/30">
                  <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-400">{errorMsg}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('select')}
                  className="px-3 py-2 text-xs text-[#737373] hover:text-[#a3a3a3] border border-[#333] rounded-lg"
                >
                  Atrás
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !mensaje.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {submitting ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
                  {submitting ? 'Enviando…' : 'Enviar a revisión'}
                </button>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === 'done' && commitId != null && (
            <div className="space-y-4 text-center py-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle size={24} className="text-emerald-400" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e5e5e5] mb-1">Commit enviado</p>
                <p className="text-xs text-[#737373]">
                  El commit #{commitId} está pendiente de aprobación del Gerente en la intranet ZYMO.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 text-xs text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
