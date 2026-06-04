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

// ── Animaciones inline — sin dependencia de Motion ni CSS global ──────────────
const STYLES = `
@keyframes nv-fade-up   { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes nv-scale-in  { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }
@keyframes nv-ring-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
@keyframes nv-backdrop  { from { opacity:0; } to { opacity:1; } }
.nv-fade-up  { animation: nv-fade-up  0.18s cubic-bezier(.22,1,.36,1) both; }
.nv-scale-in { animation: nv-scale-in 0.25s cubic-bezier(.34,1.56,.64,1) both; }
.nv-backdrop { animation: nv-backdrop 0.15s ease both; }
`;

function StepBody({ step, children }: { step: Step; children: React.ReactNode }) {
  return (
    <div key={step} className="nv-fade-up">
      {children}
    </div>
  );
}

export function SigCommitModal({ pkg, textContent, onClose, onSuccess }: Props) {
  const [step, setStep]               = useState<Step>('loading');
  const [areas, setAreas]             = useState<SigArea[]>([]);
  const [procs, setProcs]             = useState<SigProcedimiento[]>([]);
  const [selectedArea, setSelectedArea] = useState<SigArea | null>(null);
  const [selectedProc, setSelectedProc] = useState<SigProcedimiento | null>(null);

  const [newCodigo,    setNewCodigo]    = useState(pkg.procedureCode);
  const [newTitulo,    setNewTitulo]    = useState('');
  const [newDesc,      setNewDesc]      = useState('');
  const [creatingProc, setCreatingProc] = useState(false);

  const [mensaje,    setMensaje]    = useState('');
  const [sinCambios, setSinCambios] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commitId,   setCommitId]   = useState<number | null>(null);
  const [errorMsg,   setErrorMsg]   = useState('');

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      const areasRes = await getSigAreas();
      if (!areasRes.ok || !areasRes.data) {
        setErrorMsg(areasRes.error ?? 'No se pudieron cargar las áreas del SIG.');
        setStep('error');
        return;
      }
      setAreas(areasRes.data);

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

  const handleAreaChange = async (areaId: number) => {
    const area = areas.find((a) => a.id === areaId) ?? null;
    setSelectedArea(area);
    setSelectedProc(null);
    if (!area) return;
    const res = await getSigProcedimientos(area.id);
    if (res.ok && res.data) setProcs(res.data);
  };

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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>

      {/* Backdrop */}
      <div className="nv-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/75">
        <div className="bg-[#161616] rounded-2xl w-full max-w-md border border-[#2a2a2a] shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Send size={12} className="text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-[#e5e5e5] tracking-tight">Enviar a SIG</span>
              {selectedArea && (
                <span
                  className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border"
                  style={{
                    color: selectedArea.color,
                    borderColor: `${selectedArea.color}40`,
                    backgroundColor: `${selectedArea.color}10`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedArea.color }}
                  />
                  {selectedArea.nombre}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded text-[#555] hover:text-[#a3a3a3] hover:bg-[#2a2a2a] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-5 min-h-[160px]">

            {/* LOADING */}
            {step === 'loading' && (
              <StepBody step={step}>
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full border border-[#2a2a2a]" />
                    <div
                      className="absolute inset-0 rounded-full border border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent"
                      style={{ animation: 'nv-ring-spin 0.8s linear infinite' }}
                    />
                  </div>
                  <p className="text-xs text-[#555]">Conectando con el SIG…</p>
                </div>
              </StepBody>
            )}

            {/* ERROR */}
            {step === 'error' && (
              <StepBody step={step}>
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/8 border border-red-500/20">
                    <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400 leading-relaxed">{errorMsg}</p>
                  </div>
                  <p className="text-[11px] text-[#555] leading-relaxed">
                    Verifica que hayas iniciado sesión en la intranet y que tengas acceso al módulo SIG.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-2 text-xs text-[#666] hover:text-[#a3a3a3] border border-[#2a2a2a] hover:border-[#444] rounded-lg transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </StepBody>
            )}

            {/* SELECT */}
            {step === 'select' && (
              <StepBody step={step}>
                <div className="space-y-4">
                  <p className="text-[11px] text-[#555] leading-relaxed">
                    No se encontró{' '}
                    <code className="text-[#a3a3a3] bg-[#222] px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {pkg.procedureCode}
                    </code>{' '}
                    en el SIG. Selecciona el destino.
                  </p>

                  <div>
                    <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Área</label>
                    <select
                      value={selectedArea?.id ?? ''}
                      onChange={(e) => handleAreaChange(Number(e.target.value))}
                      className="w-full bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#404040] rounded-lg px-3 py-2 text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500/60 transition-colors"
                    >
                      <option value="">Seleccionar área…</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {selectedArea && (
                    <div className="nv-fade-up">
                      <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Procedimiento</label>
                      <select
                        value={selectedProc?.id ?? ''}
                        onChange={(e) => handleProcSelect(e.target.value === 'new' ? 'new' : Number(e.target.value))}
                        className="w-full bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#404040] rounded-lg px-3 py-2 text-xs text-[#e5e5e5] focus:outline-none focus:border-emerald-500/60 transition-colors"
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
              </StepBody>
            )}

            {/* CREATE PROC */}
            {step === 'create-proc' && (
              <StepBody step={step}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Plus size={11} className="text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-[#c5c5c5]">
                      Nuevo procedimiento
                    </span>
                    {selectedArea && (
                      <span className="text-[10px] text-[#555]">en {selectedArea.nombre}</span>
                    )}
                  </div>

                  {[
                    { label: 'Código', value: newCodigo, onChange: setNewCodigo, placeholder: 'ej. TC-001', mono: true },
                    { label: 'Título', value: newTitulo, onChange: setNewTitulo, placeholder: 'Nombre del procedimiento', mono: false },
                    { label: 'Descripción (opcional)', value: newDesc, onChange: setNewDesc, placeholder: 'Descripción breve', mono: false },
                  ].map(({ label, value, onChange, placeholder, mono }) => (
                    <div key={label}>
                      <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1">{label}</label>
                      <input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={`w-full bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#404040] rounded-lg px-3 py-1.5 text-xs text-[#e5e5e5] placeholder-[#3a3a3a] focus:outline-none focus:border-emerald-500/60 transition-colors ${mono ? 'font-mono' : ''}`}
                      />
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setStep('select')}
                      className="px-4 py-2 text-xs text-[#666] hover:text-[#a3a3a3] border border-[#2a2a2a] hover:border-[#444] rounded-lg transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleCreateProc}
                      disabled={creatingProc || !newCodigo.trim() || !newTitulo.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors"
                    >
                      {creatingProc ? <Loader size={11} className="animate-spin" /> : <Plus size={11} />}
                      {creatingProc ? 'Creando…' : 'Crear procedimiento'}
                    </button>
                  </div>
                </div>
              </StepBody>
            )}

            {/* COMMIT */}
            {step === 'commit' && selectedProc && (
              <StepBody step={step}>
                <div className="space-y-3.5">
                  {/* Destino con color de área */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1e1e1e] border border-[#2a2a2a]">
                    {selectedArea && (
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: selectedArea.color }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Procedimiento destino</p>
                      <p className="text-xs font-mono text-emerald-400">{selectedProc.codigo}</p>
                      <p className="text-[11px] text-[#666] truncate mt-0.5">{selectedProc.titulo}</p>
                    </div>
                  </div>

                  {/* Mensaje */}
                  <div>
                    <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">Mensaje del commit</label>
                    <textarea
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      rows={3}
                      autoFocus
                      className="w-full bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#404040] rounded-lg px-3 py-2 text-xs text-[#e5e5e5] placeholder-[#3a3a3a] resize-none focus:outline-none focus:border-emerald-500/60 transition-colors leading-relaxed"
                      placeholder="Describe brevemente el análisis realizado…"
                    />
                  </div>

                  {/* Sin cambios */}
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        sinCambios
                          ? 'bg-emerald-500/20 border-emerald-500/50'
                          : 'border-[#333] group-hover:border-[#555]'
                      }`}
                      onClick={() => setSinCambios(v => !v)}
                    >
                      {sinCambios && <span className="text-emerald-400 text-[10px] leading-none">✓</span>}
                    </div>
                    <span className="text-[11px] text-[#666] group-hover:text-[#888] transition-colors">
                      El agente no realizó cambios — procedimiento correcto
                    </span>
                  </label>

                  {errorMsg && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/8 border border-red-500/20">
                      <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-400">{errorMsg}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-0.5">
                    <button
                      onClick={() => setStep('select')}
                      className="px-3 py-2 text-xs text-[#666] hover:text-[#a3a3a3] border border-[#2a2a2a] hover:border-[#444] rounded-lg transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !mensaje.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors"
                    >
                      {submitting
                        ? <><Loader size={11} className="animate-spin" /> Enviando…</>
                        : <><Send size={11} /> Enviar a revisión</>
                      }
                    </button>
                  </div>
                </div>
              </StepBody>
            )}

            {/* DONE */}
            {step === 'done' && commitId != null && (
              <StepBody step={step}>
                <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
                  {/* Animated check */}
                  <div className="nv-scale-in relative">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/8 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle size={26} className="text-emerald-400" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-emerald-500/10 scale-125 opacity-50" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#e5e5e5] mb-1">Commit enviado</p>
                    <p className="text-[11px] text-[#555] leading-relaxed max-w-[240px]">
                      #{commitId} está pendiente de aprobación del Gerente en la intranet ZYMO.
                    </p>
                  </div>

                  {selectedProc && selectedArea && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1e1e] border border-[#2a2a2a]">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: selectedArea.color }}
                      />
                      <span className="text-[10px] font-mono text-[#666]">{selectedProc.codigo}</span>
                    </div>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </StepBody>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
