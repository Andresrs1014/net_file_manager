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

export interface ChatPayload {
  messages: { role: 'user' | 'assistant'; content: string }[];
  system?:  string;
  modelo?:  'claude' | 'gemini';
}

export interface ChatResult {
  content: string;
  tokens:  number;
  modelo:  string;
}

/** Chat general contra el proxy IA de la intranet (Claude o Gemini). */
export async function chatViaIntranet(payload: ChatPayload): Promise<FetchResult<ChatResult>> {
  return intranetPost<ChatResult>('/api/netvault/chat', payload);
}

