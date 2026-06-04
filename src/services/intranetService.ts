/**
 * intranetService — Proxy para llamadas REST a la intranet ZYMO.
 *
 * Todas las peticiones pasan por el IPC (netvault:fetch) para que el
 * token JWT nunca esté expuesto en el renderer y para evitar CORS.
 *
 * Para SSE (streaming) se expone la URL base para que el componente
 * haga fetch directo con el token obtenido de getStoredSession().
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ipc = () => (window.electronAPI as any);

export interface FetchResult<T = unknown> {
  ok:     boolean;
  status: number;
  data:   T | null;
  error?: string;
}

/** GET a /endpoint de la intranet. Añade Bearer automáticamente. */
export async function intranetGet<T = unknown>(endpoint: string): Promise<FetchResult<T>> {
  return ipc().netvaultFetch(endpoint) as Promise<FetchResult<T>>;
}

/** POST JSON a /endpoint de la intranet. */
export async function intranetPost<T = unknown>(
  endpoint: string,
  body: unknown,
): Promise<FetchResult<T>> {
  return ipc().netvaultFetch(endpoint, {
    method: 'POST',
    body:   JSON.stringify(body),
  }) as Promise<FetchResult<T>>;
}

/** PATCH JSON a /endpoint. */
export async function intranetPatch<T = unknown>(
  endpoint: string,
  body: unknown,
): Promise<FetchResult<T>> {
  return ipc().netvaultFetch(endpoint, {
    method: 'PATCH',
    body:   JSON.stringify(body),
  }) as Promise<FetchResult<T>>;
}

/** DELETE a /endpoint. */
export async function intranetDelete<T = unknown>(endpoint: string): Promise<FetchResult<T>> {
  return ipc().netvaultFetch(endpoint, { method: 'DELETE' }) as Promise<FetchResult<T>>;
}

// ─── Tipos de respuesta de la API ─────────────────────────────────────────────

export interface AnalyzePayload {
  codigo:      string;
  area:        string;
  contenido:   string;
  flowchart?:  string;
}

export interface AnalysisResult {
  diagnostico:   string;
  score:         number;
  recomendaciones: string[];
  flowchart_mmd?: string;
}

/** Envía un procedimiento al Claude Proxy de la intranet para análisis. */
export async function analyzeWithClaude(payload: AnalyzePayload): Promise<FetchResult<AnalysisResult>> {
  return intranetPost<AnalysisResult>('/api/netvault/claude/analizar', payload);
}

export interface ChatPayload {
  messages: { role: 'user' | 'assistant'; content: string }[];
  system?:  string;
}

export interface ChatResult {
  content: string;
  tokens:  number;
}

/** Chat general contra el proxy Claude de la intranet. */
export async function chatViaIntranet(payload: ChatPayload): Promise<FetchResult<ChatResult>> {
  return intranetPost<ChatResult>('/api/netvault/claude/chat', payload);
}

export interface SyncAreaEntry {
  codigo:    string;
  titulo:    string;
  estado:    'pendiente' | 'analizado' | 'aprobado' | 'desactualizado';
  version:   string;
  hash_md5:  string;
  updated_at: string;
}

/** Lista todos los documentos de un área sincronizados en la BD. */
export async function getSyncArea(area: string): Promise<FetchResult<SyncAreaEntry[]>> {
  return intranetGet<SyncAreaEntry[]>(`/api/netvault/sync/area/${encodeURIComponent(area)}`);
}

/** Estado de un documento específico. */
export async function getSyncStatus(codigo: string): Promise<FetchResult<SyncAreaEntry>> {
  return intranetGet<SyncAreaEntry>(`/api/netvault/sync/estado/${encodeURIComponent(codigo)}`);
}

/** Aprueba un procedimiento en la BD. */
export async function approveProcedure(codigo: string): Promise<FetchResult<{ ok: boolean }>> {
  return intranetPost(`/api/netvault/sync/aprobar/${encodeURIComponent(codigo)}`, {});
}
