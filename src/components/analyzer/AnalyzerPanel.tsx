import { useState, useEffect } from 'react';
import {
  Server, LogIn, LogOut, RefreshCw, FileText, Play, GitBranch,
  AlertTriangle, CheckCircle, Clock, Lightbulb,
  Database, Download, X, ChevronDown, Loader, Send
} from 'lucide-react';
import type { AnalysisPackage, UserRole, FindingSeverity } from '../../types';
import { MermaidPreview } from './MermaidPreview';
import {
  extractTextFromPath,
  inferProcedureCode,
  inferAreaFromPath,
  buildPackageFiles,
  isAnalyzableFile,
} from '../../services/procedureAnalysisService';
import { getStoredSession, loginToIntranet, logoutFromIntranet } from '../../services/authService';
import { intranetPost, intranetGet } from '../../services/intranetService';
import { getSigAreas, type SigArea } from '../../services/sigCommitService';
import { SigCommitModal } from '../sig/SigCommitModal';

// ─── Sub-componentes de resultado ─────────────────────────────────────────────

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  critica: 'text-red-400 bg-red-400/10 border-red-400/30',
  alta: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  media: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  baja: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
};

function FindingCard({ f }: { f: AnalysisPackage['findings'][0] }) {
  return (
    <div className={`p-3 rounded-lg border ${SEVERITY_COLORS[f.severity]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold uppercase tracking-wide opacity-80">{f.severity}</span>
        <span className="text-xs opacity-60">·</span>
        <span className="text-xs opacity-80">{f.category}</span>
        {f.visibility === 'publica' && (
          <span className="ml-auto text-xs px-1.5 py-0.5 bg-white/10 rounded">público</span>
        )}
      </div>
      <p className="text-sm text-[#e5e5e5] mb-1">{f.description}</p>
      <p className="text-xs text-[#a3a3a3]">→ {f.suggestion}</p>
    </div>
  );
}

function ResultTabs({ pkg }: { pkg: AnalysisPackage }) {
  const [tab, setTab] = useState<'findings' | 'flowchart' | 'markdown' | 'proposals' | 'times' | 'corpus' | 'meta'>('findings');
  const tabs = [
    { id: 'findings', label: `Hallazgos (${pkg.findings.length})`, icon: AlertTriangle },
    { id: 'flowchart', label: 'Flujograma', icon: GitBranch },
    { id: 'markdown', label: 'Procedimiento', icon: FileText },
    { id: 'proposals', label: `Propuestas (${pkg.proposals.length})`, icon: Lightbulb },
    { id: 'times', label: 'Tiempos', icon: Clock },
    { id: 'corpus', label: 'Corpus ZYMO', icon: Database },
    { id: 'meta', label: 'Meta', icon: Server },
  ] as const;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[#1a1a1a] rounded-lg mb-3 flex-shrink-0 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              tab === id
                ? 'bg-[#404040] text-[#e5e5e5]'
                : 'text-[#737373] hover:text-[#a3a3a3]'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {tab === 'findings' && (
          <div className="space-y-2">
            {pkg.findings.length === 0 ? (
              <div className="text-center py-8 text-[#737373]">Sin hallazgos</div>
            ) : (
              pkg.findings.map((f) => <FindingCard key={f.id} f={f} />)
            )}
          </div>
        )}

        {tab === 'flowchart' && (
          <div className="space-y-3">
            {pkg.flowchartMmd && <MermaidPreview code={pkg.flowchartMmd} />}
            <pre className="bg-[#1a1a1a] p-4 rounded-lg text-sm text-[#a3a3a3] overflow-x-auto font-mono leading-6 border border-[#333]">
              {pkg.flowchartMmd || '(sin flujograma generado)'}
            </pre>
            {pkg.flowchartDiff && (
              <div>
                <p className="text-xs text-[#737373] mb-1">Diff con flujograma previo:</p>
                <pre className="bg-[#1a1a1a] p-3 rounded text-xs font-mono text-[#a3a3a3] overflow-x-auto border border-[#333]">
                  {pkg.flowchartDiff}
                </pre>
              </div>
            )}
          </div>
        )}

        {tab === 'markdown' && (
          <pre className="bg-[#1a1a1a] p-4 rounded-lg text-sm text-[#a3a3a3] overflow-auto font-mono leading-6 border border-[#333] whitespace-pre-wrap">
            {pkg.markdownNormalized || '(sin markdown generado)'}
          </pre>
        )}

        {tab === 'proposals' && (
          <div className="space-y-2">
            {pkg.proposals.length === 0 ? (
              <div className="text-center py-8 text-[#737373]">Sin propuestas</div>
            ) : (
              pkg.proposals.map((p, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#333]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      p.priority === 'alta' ? 'bg-red-500/20 text-red-400'
                        : p.priority === 'media' ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>{p.priority}</span>
                    <span className="text-xs text-[#737373] px-2 py-0.5 bg-[#262626] rounded">{p.type}</span>
                  </div>
                  <p className="text-sm font-medium text-[#e5e5e5] mb-0.5">{p.title}</p>
                  <p className="text-xs text-[#a3a3a3]">{p.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'times' && (
          <div className="space-y-2">
            {pkg.times.length === 0 ? (
              <div className="text-center py-8 text-[#737373]">No se extrajeron tiempos del procedimiento</div>
            ) : (
              pkg.times.map((t, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#e5e5e5]">{t.activity}</p>
                    <p className="text-xs text-[#737373] mt-0.5">{t.rawText}</p>
                  </div>
                  <div className="text-sm font-mono text-[#3b82f6] text-right">
                    {t.minMinutes != null ? `${t.minMinutes}` : '?'}
                    {t.maxMinutes != null ? `–${t.maxMinutes}` : ''}
                    <span className="text-xs text-[#737373] ml-1">{t.unit}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'corpus' && (
          <div className="space-y-2">
            {pkg.zymoCorpus.length === 0 ? (
              <div className="text-center py-8 text-[#737373]">Sin corpus generado</div>
            ) : (
              pkg.zymoCorpus.map((entry, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#333]">
                  <p className="text-xs text-[#737373] mb-1">Fuente: {entry.source}</p>
                  <p className="text-sm text-[#a3a3a3] mb-2">{entry.chunk}</p>
                  <div className="flex flex-wrap gap-1">
                    {entry.entities.map((e, j) => (
                      <span key={j} className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">{e}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'meta' && (
          <div className="space-y-2">
            {Object.entries(pkg.meta).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-[#2a2a2a]">
                <span className="text-xs text-[#737373] font-mono">{k}</span>
                <span className="text-xs text-[#a3a3a3] font-mono max-w-[60%] text-right truncate">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  filePath?: string;
  /** Carpeta raíz sugerida para guardar paquete (ej. ruta activa del explorador) */
  defaultOutputRoot?: string;
  /** Notifica al app cuando hay un paquete listo (p. ej. para el grafo) */
  onAnalysisComplete?: (pkg: AnalysisPackage) => void;
  onOpenGraph?: (pkg: AnalysisPackage) => void;
  /** Si se pasa desde App.tsx (ya validado por AuthGate), evita race condition async */
  alreadyLoggedIn?: boolean;
}

export function AnalyzerPanel({ onClose, filePath, defaultOutputRoot, onAnalysisComplete, onOpenGraph, alreadyLoggedIn }: Props) {
  // Server connection state (fallback offline)
  const [serverUrl, setServerUrl] = useState('http://localhost:3847');
  const [serverHealth, setServerHealth] = useState<{
    reachable: boolean; anthropicConfigured?: boolean; model?: string; mode?: string;
  } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [showOfflineSection, setShowOfflineSection] = useState(false);

  // Auth state — local server (fallback)
  const [session, setSession] = useState<{ username: string; role: UserRole } | null>(null);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Auth state — intranet ZYMO (primary)
  const [intranetUrl, setIntranetUrl] = useState('https://zymointranet.com');
  const [intranetEmail, setIntranetEmail] = useState('');
  const [intranetPw, setIntranetPw] = useState('');
  const [intranetUser, setIntranetUser] = useState<{ email: string; full_name: string | null } | null>(null);
  const [intranetLoggingIn, setIntranetLoggingIn] = useState(false);
  const [intranetLoginError, setIntranetLoginError] = useState('');

  // Analysis config
  const [procedureCode, setProcedureCode] = useState('');
  const [area, setArea] = useState('');
  const [sigAreas, setSigAreas] = useState<SigArea[]>([]);
  const [textContent, setTextContent] = useState('');
  const [textSource, setTextSource] = useState<'file' | 'paste'>('file');

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [result, setResult] = useState<AnalysisPackage | null>(null);
  const [progress, setProgress] = useState('');
  const [outputRoot, setOutputRoot] = useState(defaultOutputRoot ?? '');
  const [sourceFilePath, setSourceFilePath] = useState(filePath ?? '');
  const [savedFolder, setSavedFolder] = useState<string | null>(null);
  const [showRubric, setShowRubric] = useState(false);
  const [rubricMarkdown, setRubricMarkdown] = useState('');
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [existingFlowchart, setExistingFlowchart] = useState('');
  const [showSigModal, setShowSigModal] = useState(false);
  const [intranetLoggedIn, setIntranetLoggedIn] = useState(alreadyLoggedIn ?? false);

  const api = window.electronAPI;

  const loadRubric = async () => {
    const remote = await api.serverGetRubric?.();
    if (remote?.ok && remote.data?.markdown) {
      setRubricMarkdown(remote.data.markdown);
      return;
    }
    const local = await api.analysisGetLocalRubric?.();
    if (local?.ok && local.data?.markdown) setRubricMarkdown(local.data.markdown);
  };

  const loadDocumentFromPath = async (path: string) => {
    setLoadingDoc(true);
    setAnalysisError('');
    try {
      const text = await extractTextFromPath(path);
      setTextContent(text);
      setSourceFilePath(path);
      setProcedureCode(inferProcedureCode(path));
      setArea(inferAreaFromPath(path));
      const mmdPath = path.replace(/\.[^.]+$/i, '') + '.mmd';
      if (await api.fileExists(mmdPath)) {
        const mmd = await api.readFile(mmdPath);
        if (typeof mmd === 'string') setExistingFlowchart(mmd);
      }
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Error al cargar documento');
    } finally {
      setLoadingDoc(false);
    }
  };

  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.serverGetUrl?.().then((url) => { if (url) setServerUrl(url); });
    api.serverSession?.().then((r) => { if (r.ok && r.data) setSession(r.data); });
    loadRubric();
    if (defaultOutputRoot) setOutputRoot(defaultOutputRoot);
    // Verificar sesión de intranet guardada y cargar áreas del SIG
    getStoredSession().then(async (s) => {
      setIntranetLoggedIn(s.loggedIn);
      if (s.loggedIn && s.user) {
        setIntranetUser({ email: s.user.email, full_name: s.user.full_name });
        if (s.intranetUrl) setIntranetUrl(s.intranetUrl);
        const areasRes = await getSigAreas();
        if (areasRes.ok && areasRes.data && areasRes.data.length > 0) {
          setSigAreas(areasRes.data);
          setArea(areasRes.data[0].nombre);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (filePath) loadDocumentFromPath(filePath);
  }, [filePath]);

  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const h = await api.serverHealth?.();
      setServerHealth(h ?? { reachable: false });
    } catch {
      setServerHealth({ reachable: false });
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleSetUrl = async () => {
    await api.serverSetUrl?.(serverUrl);
    checkHealth();
  };

  // ─── Auth intranet ZYMO ──────────────────────────────────────────────────────
  const handleIntranetLogin = async () => {
    if (!intranetUrl.trim() || !intranetEmail.trim() || !intranetPw) return;
    setIntranetLoggingIn(true);
    setIntranetLoginError('');
    try {
      const res = await loginToIntranet(intranetUrl.replace(/\/$/, ''), intranetEmail, intranetPw);
      if (res.ok && res.user) {
        setIntranetLoggedIn(true);
        setIntranetUser({ email: res.user.email, full_name: res.user.full_name });
        setIntranetPw('');
      } else {
        setIntranetLoginError(res.error ?? 'Credenciales incorrectas');
      }
    } finally {
      setIntranetLoggingIn(false);
    }
  };

  const handleIntranetLogout = async () => {
    await logoutFromIntranet();
    setIntranetLoggedIn(false);
    setIntranetUser(null);
    setResult(null);
  };

  // ─── Auth local server (fallback offline) ────────────────────────────────────
  const handleLogin = async () => {
    setLoggingIn(true);
    setLoginError('');
    try {
      const r = await api.serverLogin?.(loginUsername, loginPassword);
      if (r?.ok && r.data) {
        setSession(r.data);
        setLoginPassword('');
      } else {
        setLoginError(r?.error ?? 'Error de login');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await api.serverLogout?.();
    setSession(null);
    setResult(null);
  };

  const handleOpenFile = async () => {
    const path = await api.openFileDialog?.([
      { name: 'Documentos', extensions: ['md', 'txt', 'docx', 'pdf'] },
    ]);
    if (path && isAnalyzableFile(path)) await loadDocumentFromPath(path);
  };

  const handleLoadSample = async () => {
    const root = await api.getAppRoot?.();
    if (!root) return;
    const sep = root.includes('/') ? '/' : '\\';
    const samplePath = `${root}${sep}samples${sep}netvault${sep}T&C${sep}TC-EJEMPLO-001${sep}procedimiento-ejemplo.md`;
    await loadDocumentFromPath(samplePath);
  };

  // ─── Analysis ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!textContent.trim()) { setAnalysisError('Carga o pega el contenido del procedimiento.'); return; }
    if (!procedureCode.trim()) { setAnalysisError('Ingresa el código del procedimiento.'); return; }
    if (!intranetLoggedIn && !session) { setAnalysisError('Inicia sesión en la intranet o en el servidor local.'); return; }

    setAnalyzing(true);
    setAnalysisError('');
    setResult(null);

    const payload = {
      procedureCode,
      area,
      textContent,
      existingFlowchartMmd: existingFlowchart || undefined,
    };

    try {
      let r: { ok: boolean; data?: AnalysisPackage; error?: string } | null = null;

      if (intranetLoggedIn) {
        // 1. Iniciar job — retorna inmediatamente con job_id
        setProgress('Iniciando análisis…');
        const startRes = await intranetPost<{ ok: boolean; job_id?: string; error?: string }>('/api/netvault/analizar', payload);
        if (!startRes.ok || !startRes.data?.job_id) {
          r = { ok: false, error: startRes.data?.error ?? startRes.error ?? 'No se pudo iniciar el análisis' };
        } else {
          // 2. Polling hasta que el job termine (máx 5 min)
          const jobId = startRes.data.job_id;
          const deadline = Date.now() + 5 * 60 * 1000;
          let dots = 0;
          while (Date.now() < deadline) {
            await new Promise(res => setTimeout(res, 3000));
            dots = (dots + 1) % 4;
            setProgress(`Analizando con Claude${'…'.repeat(dots + 1)}`);
            const poll = await intranetGet<{ ok: boolean; status: string; data?: AnalysisPackage; error?: string }>(`/api/netvault/job/${jobId}`);
            if (!poll.ok) { r = { ok: false, error: poll.error ?? 'Error consultando análisis' }; break; }
            const job = poll.data;
            if (job?.status === 'done' && job.data) { r = { ok: true, data: job.data }; break; }
            if (job?.status === 'error') { r = { ok: false, error: job.error ?? 'Error en el análisis' }; break; }
          }
          if (!r) r = { ok: false, error: 'Timeout — el análisis tardó demasiado' };
        }
      } else {
        setProgress('Analizando via servidor local…');
        r = await api.serverRunAnalysis?.(payload) ?? null;
      }

      if (r?.ok && r.data) {
        setResult(r.data);
        onAnalysisComplete?.(r.data);
        setProgress('');
      } else {
        console.warn('[NV] análisis falló — r:', r);
        setAnalysisError(r?.error ?? 'Error del servidor');
      }
    } catch (err: unknown) {
      console.error('[NV] catch error:', err);
      setAnalysisError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setAnalyzing(false);
      setProgress('');
    }
  };

  const handleSavePackage = async () => {
    if (!result) return;
    let root = outputRoot.trim();
    if (!root) {
      root = (await api.openFolderForSave?.()) ?? '';
      if (!root) return;
      setOutputRoot(root);
    }
    setProgress('Guardando formato único…');
    const files = buildPackageFiles(result, sourceFilePath);
    const r = await api.analysisSavePackage?.({
      outputRoot: root,
      area,
      procedureCode,
      files,
      originalPath: sourceFilePath || undefined,
    });
    setProgress('');
    if (r?.ok && r.folder) {
      setSavedFolder(r.folder);
      setAnalysisError('');
    } else {
      setAnalysisError(r?.error ?? 'No se pudo guardar el paquete');
    }
  };

  // ─── Export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!result) return;
    const json = JSON.stringify(result, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.procedureCode}-analisis-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-6">
      <div className="bg-[#1a1a1a] rounded-xl w-[97vw] h-[94vh] flex flex-col border border-[#404040] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#404040] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-purple-400" />
            <span className="font-semibold text-[#e5e5e5]">Analizador de Procedimientos</span>
            <span className="text-xs text-[#737373]">· via NetVault Server</span>
          </div>
          <div className="flex items-center gap-2">
            {result && onOpenGraph && (
              <button
                type="button"
                onClick={() => onOpenGraph(result)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#3b82f6]/20 hover:bg-[#3b82f6]/40 text-[#93c5fd] rounded-lg"
              >
                <GitBranch size={12} /> Ver grafo
              </button>
            )}
            {result && (
              <>
                {intranetLoggedIn && (
                  <button
                    onClick={() => setShowSigModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    <Send size={12} /> Enviar a SIG
                  </button>
                )}
                <button
                  onClick={handleSavePackage}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600/80 hover:bg-purple-500 text-white rounded-lg transition-colors"
                >
                  <Download size={12} /> Guardar formato único
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#262626] hover:bg-[#333] text-[#a3a3a3] hover:text-[#e5e5e5] rounded-lg transition-colors"
                >
                  <Download size={12} /> JSON
                </button>
              </>
            )}
            <button
              onClick={() => setShowRubric((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#262626] hover:bg-[#333] text-[#a3a3a3] rounded-lg"
            >
              <FileText size={12} /> Rúbrica
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#262626] hover:bg-red-500/20 text-[#a3a3a3] hover:text-red-400 rounded-lg transition-colors"
            >
              <X size={12} /> Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">

          {/* Left panel: config */}
          <div className="w-72 flex-shrink-0 border-r border-[#2a2a2a] flex flex-col overflow-y-auto">

            {/* Auth — intranet ZYMO (primary) */}
            <div className="p-3 border-b border-[#2a2a2a]">
              <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2">Conexión ZYMO</p>
              {intranetLoggedIn ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-emerald-400 truncate">{intranetUser?.full_name || intranetUser?.email || 'Conectado'}</p>
                      <p className="text-[10px] text-[#505050] truncate">{intranetUrl}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleIntranetLogout}
                    className="flex items-center gap-1 text-xs text-[#737373] hover:text-red-400 transition-colors shrink-0 ml-2"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    value={intranetUrl}
                    onChange={(e) => setIntranetUrl(e.target.value)}
                    placeholder="https://zymointranet.com"
                    className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] placeholder-[#4a4a4a] focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="email"
                    value={intranetEmail}
                    onChange={(e) => setIntranetEmail(e.target.value)}
                    placeholder="usuario@zymo.com"
                    autoComplete="username"
                    className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] placeholder-[#4a4a4a] focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="password"
                    value={intranetPw}
                    onChange={(e) => setIntranetPw(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleIntranetLogin()}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] placeholder-[#4a4a4a] focus:outline-none focus:border-emerald-500"
                  />
                  {intranetLoginError && <p className="text-xs text-red-400">{intranetLoginError}</p>}
                  <button
                    onClick={handleIntranetLogin}
                    disabled={intranetLoggingIn || !intranetUrl.trim() || !intranetEmail.trim() || !intranetPw}
                    className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded transition-colors disabled:opacity-50"
                  >
                    {intranetLoggingIn ? <Loader size={12} className="animate-spin" /> : <LogIn size={12} />}
                    {intranetLoggingIn ? 'Conectando…' : 'Conectar a ZYMO'}
                  </button>
                </div>
              )}
            </div>

            {/* Auth — servidor local (modo offline, colapsable) */}
            <div className="border-b border-[#2a2a2a]">
              <button
                onClick={() => setShowOfflineSection(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-[#505050] hover:text-[#737373] transition-colors"
              >
                <span className="uppercase tracking-wide font-semibold">Modo offline (servidor local)</span>
                <span>{showOfflineSection ? '▾' : '▸'}</span>
              </button>
              {showOfflineSection && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="flex gap-1">
                    <input
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetUrl()}
                      className="flex-1 bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] placeholder-[#4a4a4a] focus:outline-none focus:border-purple-500"
                      placeholder="http://localhost:3847"
                    />
                    <button onClick={handleSetUrl} disabled={checkingHealth}
                      className="px-2 py-1 bg-[#262626] hover:bg-[#333] text-[#737373] rounded border border-[#404040]">
                      {checkingHealth ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    </button>
                  </div>
                  {serverHealth && (
                    <div className={`flex items-center gap-1 text-[10px] ${serverHealth.reachable ? 'text-green-400' : 'text-red-400'}`}>
                      {serverHealth.reachable ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                      {serverHealth.reachable ? `Conectado · ${serverHealth.model ?? ''}` : 'Sin conexión'}
                    </div>
                  )}
                  {session ? (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#e5e5e5]">{session.username}</p>
                      <button onClick={handleLogout} className="text-xs text-[#737373] hover:text-red-400 flex items-center gap-1">
                        <LogOut size={12} /> Salir
                      </button>
                    </div>
                  ) : (
                    <>
                      <input value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Usuario"
                        className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] placeholder-[#4a4a4a] focus:outline-none focus:border-purple-500" />
                      <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="Contraseña"
                        className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] placeholder-[#4a4a4a] focus:outline-none focus:border-purple-500" />
                      {loginError && <p className="text-xs text-red-400">{loginError}</p>}
                      <button onClick={handleLogin} disabled={loggingIn || !serverHealth?.reachable}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors disabled:opacity-50">
                        {loggingIn ? <Loader size={12} className="animate-spin" /> : <LogIn size={12} />}
                        {loggingIn ? 'Conectando...' : 'Iniciar sesión'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Procedure config */}
            <div className="p-3 border-b border-[#2a2a2a]">
              <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2">Procedimiento</p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-[#737373]">Código</label>
                  <input
                    value={procedureCode}
                    onChange={(e) => setProcedureCode(e.target.value)}
                    placeholder="ej. TC-001, PC-COMPRAS-003"
                    className="w-full mt-0.5 bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] placeholder-[#4a4a4a] focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#737373]">Área</label>
                  <div className="relative mt-0.5">
                    {sigAreas.length > 0 ? (
                      <>
                        <select
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          className="w-full appearance-none bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] focus:outline-none focus:border-purple-500"
                        >
                          {sigAreas.map((a) => (
                            <option key={a.id} value={a.nombre}>{a.nombre}</option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none" />
                      </>
                    ) : (
                      <input
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="Nombre del área…"
                        className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] focus:outline-none focus:border-purple-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Carpeta de salida */}
            <div className="p-3 border-b border-[#2a2a2a]">
              <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2">Salida local</p>
              <input
                value={outputRoot}
                onChange={(e) => setOutputRoot(e.target.value)}
                placeholder="C:\netvault"
                className="w-full bg-[#262626] border border-[#404040] rounded px-2 py-1 text-xs text-[#e5e5e5] mb-1"
              />
              <button
                type="button"
                onClick={async () => {
                  const p = await api.openFolderForSave?.();
                  if (p) setOutputRoot(p);
                }}
                className="text-xs text-[#737373] hover:text-purple-400"
              >
                Elegir carpeta raíz…
              </button>
            </div>

            {/* Document input */}
            <div className="p-3 flex-1">
              <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2">Documento</p>
              <div className="flex gap-1 mb-2">
                {(['file', 'paste'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTextSource(s)}
                    className={`flex-1 text-xs py-1 rounded transition-colors ${
                      textSource === s ? 'bg-[#404040] text-[#e5e5e5]' : 'text-[#737373] hover:text-[#a3a3a3]'
                    }`}
                  >
                    {s === 'file' ? 'Archivo' : 'Pegar texto'}
                  </button>
                ))}
              </div>

              {textSource === 'file' ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleOpenFile}
                    disabled={loadingDoc}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-[#404040] rounded-lg text-xs text-[#737373] hover:text-[#a3a3a3] hover:border-[#555] transition-colors disabled:opacity-50"
                  >
                    {loadingDoc ? <Loader size={12} className="animate-spin" /> : <FileText size={12} />}
                    {textContent ? `${textContent.length.toLocaleString()} caracteres` : 'Abrir .md / .txt / .docx / .pdf'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    disabled={loadingDoc}
                    className="w-full text-xs py-1.5 text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded"
                  >
                    Cargar ejemplo TC-EJEMPLO-001
                  </button>
                  {sourceFilePath && (
                    <p className="text-[10px] text-[#505050] truncate" title={sourceFilePath}>{sourceFilePath}</p>
                  )}
                </div>
              ) : (
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Pega aquí el texto del procedimiento..."
                  className="w-full h-32 bg-[#262626] border border-[#404040] rounded px-2 py-1.5 text-xs text-[#e5e5e5] placeholder-[#4a4a4a] focus:outline-none focus:border-purple-500 resize-none"
                />
              )}
            </div>

            {/* Analyze button */}
            <div className="p-3 border-t border-[#2a2a2a]">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || (!intranetLoggedIn && !session) || !textContent.trim() || !procedureCode.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                {analyzing ? 'Analizando...' : 'Analizar procedimiento'}
              </button>
              {!intranetLoggedIn && !session && (
                <p className="text-[10px] text-center text-[#505050] mt-1.5">
                  Inicia sesión en la intranet o el servidor local
                </p>
              )}
              {intranetLoggedIn && (
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[10px] text-emerald-600 font-mono tracking-tight">via intranet ZYMO</span>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: results */}
          <div className="flex-1 p-4 flex flex-col min-h-0 relative">
            {showRubric && rubricMarkdown && (
              <div className="absolute inset-0 z-10 bg-[#141414] p-4 overflow-auto border border-[#404040] rounded-lg m-2">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-[#e5e5e5]">Rúbrica activa</span>
                  <button type="button" onClick={() => setShowRubric(false)} className="text-xs text-[#737373]">Cerrar</button>
                </div>
                <pre className="text-xs text-[#a3a3a3] whitespace-pre-wrap font-sans leading-relaxed">{rubricMarkdown}</pre>
              </div>
            )}
            {savedFolder && (
              <div className="mb-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                Paquete guardado en: {savedFolder}
              </div>
            )}
            {progress && (
              <div className="flex items-center gap-2 mb-3 text-xs text-blue-400">
                <Loader size={12} className="animate-spin" />
                {progress}
              </div>
            )}

            {analysisError && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-start gap-2">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                {analysisError}
              </div>
            )}

            {result ? (
              <ResultTabs pkg={result} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Server size={40} className="text-[#333] mb-4" />
                <h3 className="text-base font-semibold text-[#404040] mb-2">
                  Listo para analizar
                </h3>
                <p className="text-sm text-[#4a4a4a] max-w-sm">
                  Configura el servidor, inicia sesión, carga un procedimiento y pulsa <strong>Analizar</strong>.
                </p>
                <div className="mt-6 text-xs text-[#333] space-y-1 text-left">
                  <p>• Flujograma Mermaid generado automáticamente</p>
                  <p>• Hallazgos con severidad y sugerencias</p>
                  <p>• Tiempos extraídos del procedimiento</p>
                  <p>• Propuestas de mejora (intranet, MCP)</p>
                  <p>• Corpus para entrenar a ZYMO</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSigModal && result && (
        <SigCommitModal
          pkg={result}
          textContent={textContent}
          onClose={() => setShowSigModal(false)}
          onSuccess={(id) => {
            setShowSigModal(false);
            console.info('[SIG] Commit enviado, id:', id);
          }}
        />
      )}
    </div>
  );
}
