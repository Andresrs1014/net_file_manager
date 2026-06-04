# Plan de implementación — NetVault (lado cliente Electron)

> Repo: `E:\net_file_manager`  
> Stack: **Electron 33 + React 18 + TypeScript + Tailwind**  
> Propósito: conectar NetVault como cliente completo de la intranet ZYMO — login persistente, cola PDF→MD, análisis con Claude real, sync de procedimientos, grafo general y sub-agentes.

---

## Contexto: qué existe hoy y qué vamos a añadir

### Lo que ya existe y se reutiliza

| Pieza existente | Archivo | Uso |
|---|---|---|
| Gestor de archivos dual panel | `src/components/file-panel/` | Base para explorar áreas T&C/P&C/Transportes |
| Visor PDF/DOCX/MD | `src/components/document/DocumentViewer.tsx` | Preview de procedimientos |
| AnalyzerPanel prototipo | `src/components/analyzer/AnalyzerPanel.tsx` | Reemplazar con análisis real |
| Terminal integrada | `src/components/terminal/Terminal.tsx` | Operaciones avanzadas |
| Grafo KnowledgeGraph + GraphPanel | `src/components/graph/` | Extender para grafo por área y general |
| `server/` Express + Claude proxy | `server/src/` | Proxy Claude ya implementado (pero usar intranet en prod) |
| IPC handlers en `electron/main.ts` | `electron/main.ts` | Añadir handlers de auth, queue, sync |
| graphService.ts | `src/services/graphService.ts` | `loadVaultGraph` + `loadLightRagGraph` ya funciona |
| `server/services/analysis.ts` | Análisis completo con Claude | Conectar al endpoint del servidor |

### Lo que vamos a crear

```
src/
├── services/
│   ├── authService.ts         ← Login, token storage, auto-refresh, ping
│   ├── intranetService.ts     ← Todas las llamadas HTTP a la intranet (fetch via IPC)
│   ├── conversionQueue.ts     ← Cola PDF→MD con progreso SSE
│   ├── syncService.ts         ← Push/pull de paquetes con la intranet
│   └── metaService.ts         ← Leer/escribir _meta.json por procedimiento
├── components/
│   ├── auth/
│   │   └── LoginModal.tsx         ← Pantalla de login con "recordar sesión"
│   ├── queue/
│   │   └── ConversionQueue.tsx    ← Panel de cola tipo Google Drive
│   ├── sync/
│   │   └── SyncPanel.tsx          ← Estado de sync por área
│   └── graph/
│       └── (extensiones a GraphPanel.tsx ya existente)
electron/
├── main.ts              ← Añadir IPCs: auth:*, netvault:*, queue:*
└── preload.ts           ← Exponer nuevos IPCs
```

---

## Fase 1 — Auth + sesión persistente (2 días)

### 1.1 IPC seguro para guardar el token

El token JWT **nunca** va a `localStorage` (accesible desde el renderer). Va al proceso main de Electron usando `electron-store` o el filesystem del usuario.

**`electron/main.ts`** — añadir al final de los handlers:

```typescript
import Store from 'electron-store'; // npm install electron-store

// Fuera de handlers:
const authStore = new Store<{ token: string; user: object; intranetUrl: string }>({
  name: 'auth',
  encryptionKey: 'netvault-2026', // ofuscación básica en disco
});

// ─── Auth IPC ────────────────────────────────────────────────────────────────
ipcMain.handle('auth:login', async (_, intranetUrl: string, email: string, password: string) => {
  try {
    const res = await fetch(`${intranetUrl.replace(/\/$/, '')}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error de autenticación' }));
      return { ok: false, error: err.detail ?? 'Credenciales incorrectas' };
    }
    const { access_token } = await res.json();

    // Obtener datos del usuario
    const meRes = await fetch(`${intranetUrl.replace(/\/$/, '')}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const user = meRes.ok ? await meRes.json() : {};

    authStore.set('token', access_token);
    authStore.set('user', user);
    authStore.set('intranetUrl', intranetUrl);

    return { ok: true, token: access_token, user };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de red' };
  }
});

ipcMain.handle('auth:logout', () => {
  authStore.clear();
  return { ok: true };
});

ipcMain.handle('auth:getSession', () => {
  const token = authStore.get('token', '');
  const user  = authStore.get('user', {});
  const url   = authStore.get('intranetUrl', '');
  return { token, user, intranetUrl: url, loggedIn: Boolean(token) };
});

ipcMain.handle('auth:ping', async () => {
  const token = authStore.get('token', '');
  const url   = authStore.get('intranetUrl', '');
  if (!token || !url) return { ok: false, loggedIn: false };
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/netvault/auth/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      authStore.delete('token');
      return { ok: false, loggedIn: false, error: 'Sesión expirada' };
    }
    const data = await res.json();
    return { ok: true, loggedIn: true, user: data.user };
  } catch (e: unknown) {
    return { ok: false, loggedIn: false, error: e instanceof Error ? e.message : 'Sin conexión' };
  }
});
```

### 1.2 Instalar electron-store

```powershell
cd E:\net_file_manager
npm install electron-store
```

### 1.3 `electron/preload.ts` — exponer IPCs

```typescript
// Añadir en el contextBridge.exposeInMainWorld:
auth: {
  login:      (url: string, email: string, password: string) => ipcRenderer.invoke('auth:login', url, email, password),
  logout:     () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:getSession'),
  ping:       () => ipcRenderer.invoke('auth:ping'),
},
```

### 1.4 `src/services/authService.ts` (nuevo)

```typescript
/**
 * authService — Gestiona la sesión con la intranet ZYMO.
 * Guarda/lee el token via IPC (proceso main), no en localStorage.
 */

export interface ZymoUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  area: string | null;
  sede: string | null;
}

export interface AuthSession {
  loggedIn: boolean;
  token: string;
  user: ZymoUser | null;
  intranetUrl: string;
}

const api = window.electronAPI as any; // tipo completo en electron.d.ts

export async function login(intranetUrl: string, email: string, password: string) {
  return api.auth.login(intranetUrl, email, password);
}

export async function logout() {
  return api.auth.logout();
}

export async function getSession(): Promise<AuthSession> {
  const s = await api.auth.getSession();
  return {
    loggedIn:    s.loggedIn,
    token:       s.token ?? '',
    user:        (s.user && Object.keys(s.user).length) ? s.user : null,
    intranetUrl: s.intranetUrl ?? '',
  };
}

/** Verifica en cada arranque si el token guardado sigue válido en el servidor. */
export async function pingSession() {
  return api.auth.ping();
}
```

### 1.5 `src/components/auth/LoginModal.tsx` (nuevo)

```tsx
/**
 * LoginModal — Pantalla de login que aparece si no hay sesión guardada.
 * Conecta con la intranet ZYMO mediante el IPC auth:login.
 */
import { useState } from 'react';
import { login } from '../../services/authService';
import { Loader, Network } from 'lucide-react';

interface Props {
  onSuccess: (intranetUrl: string, user: object) => void;
}

const DEFAULT_URL = 'http://localhost:8001';

export function LoginModal({ onSuccess }: Props) {
  const [url,      setUrl]      = useState(localStorage.getItem('nv:intranetUrl') ?? DEFAULT_URL);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!url || !email || !password) { setError('Completa todos los campos.'); return; }
    setLoading(true); setError('');
    const res = await login(url.trim(), email.trim(), password);
    setLoading(false);
    if (!res.ok) { setError(res.error ?? 'Error de autenticación'); return; }
    localStorage.setItem('nv:intranetUrl', url.trim());
    onSuccess(url.trim(), res.user);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-xl w-full max-w-sm p-8 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Network size={22} className="text-[#3b82f6]" />
          <h2 className="text-lg font-semibold text-[#e5e5e5]">Conectar a ZYMO</h2>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs text-[#737373]">URL de la intranet</label>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="http://servidor:8001"
            className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm text-[#e5e5e5]" />

          <label className="text-xs text-[#737373]">Correo electrónico</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            type="email" placeholder="usuario@empresa.com"
            className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm text-[#e5e5e5]" />

          <label className="text-xs text-[#737373]">Contraseña</label>
          <input value={password} onChange={e => setPassword(e.target.value)}
            type="password" placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm text-[#e5e5e5]" />
        </div>

        {error && <p className="text-xs text-red-400 border border-red-900/40 rounded p-2 bg-red-950/20">{error}</p>}

        <button onClick={handleLogin} disabled={loading}
          className="flex items-center justify-center gap-2 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-medium disabled:opacity-50">
          {loading ? <Loader size={16} className="animate-spin" /> : null}
          {loading ? 'Conectando…' : 'Iniciar sesión'}
        </button>

        <p className="text-[10px] text-[#383838] text-center">
          La sesión se guarda de forma segura en el proceso de Electron, no en el navegador.
        </p>
      </div>
    </div>
  );
}
```

### 1.6 Integrar en `src/App.tsx`

```tsx
// Añadir al inicio del componente App:
const [session, setSession] = useState<AuthSession | null>(null);
const [authChecked, setAuthChecked] = useState(false);

useEffect(() => {
  // Al arrancar, verificar si hay sesión guardada válida
  pingSession().then(res => {
    if (res.loggedIn) {
      getSession().then(s => setSession(s));
    }
    setAuthChecked(true);
  });
}, []);

// En el render, antes de mostrar la app:
if (!authChecked) return <SplashScreen />;
if (!session?.loggedIn) {
  return <LoginModal onSuccess={(url, user) => {
    getSession().then(s => setSession(s));
  }} />;
}

// El resto de la app ya sabe quién está logueado via `session`
```

---

## Fase 2 — `intranetService.ts` (proxy HTTP via IPC)

Todo fetch a la intranet pasa por el main process para evitar CORS y manejar el token:

### 2.1 IPC genérico en `electron/main.ts`

```typescript
ipcMain.handle('netvault:fetch', async (_, endpoint: string, options: RequestInit = {}) => {
  const token = authStore.get('token', '');
  const url   = authStore.get('intranetUrl', '');
  if (!token || !url) return { ok: false, status: 401, error: 'Sin sesión' };

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });
    const body = await res.text();
    let data: unknown;
    try { data = JSON.parse(body); } catch { data = body; }
    return { ok: res.ok, status: res.status, data };
  } catch (e: unknown) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'Error de red' };
  }
});
```

### 2.2 `src/services/intranetService.ts` (nuevo)

```typescript
const api = window.electronAPI as any;

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const res = await api.netvault.fetch(endpoint, options);
  if (!res.ok) throw new Error(res.error ?? `HTTP ${res.status}`);
  return res.data;
}

export const intranetService = {
  // Auth
  ping: () => apiFetch('/api/netvault/auth/ping'),

  // Sync
  syncArea: (area: string) => apiFetch(`/api/netvault/sync/area/${area}`),
  syncEstado: (code: string) => apiFetch(`/api/netvault/sync/estado/${code}`),
  aprobar: (code: string) => apiFetch(`/api/netvault/sync/aprobar/${code}`, { method: 'PATCH' }),

  // Ingest
  ingestPaquete: (pkg: object) => apiFetch('/api/netvault/documentos/ingest', {
    method: 'POST',
    body: JSON.stringify(pkg),
  }),

  // Grafo
  lightragGraph: (params = {}) => apiFetch(`/api/grafo/lightrag?${new URLSearchParams(params as any)}`),
  lightragStatus: () => apiFetch('/api/grafo/lightrag/status'),
};
```

---

## Fase 3 — Cola PDF→MD con progreso SSE (3 días)

### 3.1 IPC de conversión en lote con SSE

```typescript
// En electron/main.ts — añadir:
ipcMain.handle('queue:convertFiles', async (event, filePaths: string[], area: string) => {
  const token = authStore.get('token', '');
  const url   = authStore.get('intranetUrl', '');
  if (!token || !url) return { ok: false, error: 'Sin sesión' };

  const FormData = require('form-data');
  const form = new FormData();
  form.append('area', area);

  for (const fp of filePaths) {
    const content = fs.readFileSync(fp);
    const name = path.basename(fp);
    form.append('archivos', content, { filename: name });
  }

  return new Promise((resolve) => {
    const http = url.startsWith('https') ? require('https') : require('http');
    const urlObj = new URL(`${url}/api/netvault/documentos/convertir`);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    }, (res: any) => {
      const chunks: string[] = [];
      res.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter((l: string) => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            event.sender.send('queue:progress', parsed); // → renderer
            if (parsed.done) resolve({ ok: true, resultados: parsed.resultados });
          } catch { /* continuar */ }
        }
      });
    });
    form.pipe(req);
  });
});
```

### 3.2 `src/components/queue/ConversionQueue.tsx` (nuevo)

```tsx
/**
 * ConversionQueue — Panel de cola de conversión PDF→MD.
 * Estilo Google Drive: muestra progreso en tiempo real.
 */
import { useState, useEffect, useCallback } from 'react';
import { Loader, FileText, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

interface QueueItem {
  file: string;
  status: 'esperando' | 'convirtiendo' | 'listo' | 'error';
  md_preview?: string;
  step?: number;
  total?: number;
}

interface Props {
  onConvertComplete: (resultados: QueueItem[]) => void;
}

export function ConversionQueue({ onConvertComplete }: Props) {
  const [items, setItems]         = useState<QueueItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    // Escuchar eventos SSE del IPC
    const api = window.electronAPI as any;
    const unsubscribe = api.on?.('queue:progress', (data: any) => {
      if (data.done) {
        setDone(true);
        onConvertComplete(data.resultados ?? []);
        return;
      }
      setItems(prev => {
        const idx = prev.findIndex(i => i.file === data.file);
        const updated: QueueItem = {
          file: data.file,
          status: data.status === 'listo' ? 'listo' : 'convirtiendo',
          md_preview: data.md_preview,
          step: data.step,
          total: data.total,
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
    });
    return () => unsubscribe?.();
  }, [onConvertComplete]);

  if (items.length === 0) return null;

  const completados = items.filter(i => i.status === 'listo').length;
  const total       = items[0]?.total ?? items.length;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          {done ? <CheckCircle size={16} className="text-green-400" /> : <Loader size={16} className="text-[#3b82f6] animate-spin" />}
          <span className="text-sm font-medium text-[#e5e5e5]">
            {done ? `${total} archivos convertidos` : `Convirtiendo ${completados}/${total}…`}
          </span>
        </div>
        <ChevronDown size={14} className={`text-[#505050] transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </div>

      {/* Barra de progreso */}
      {!done && (
        <div className="h-0.5 bg-[#262626] mx-4">
          <div
            className="h-full bg-[#3b82f6] transition-all"
            style={{ width: `${total > 0 ? (completados / total) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Lista de archivos */}
      {!collapsed && (
        <ul className="max-h-48 overflow-y-auto divide-y divide-[#222] text-xs">
          {items.map(item => (
            <li key={item.file} className="flex items-center gap-2 px-4 py-2">
              {item.status === 'listo'
                ? <CheckCircle size={12} className="text-green-400 shrink-0" />
                : item.status === 'error'
                ? <XCircle size={12} className="text-red-400 shrink-0" />
                : <Loader size={12} className="text-[#3b82f6] animate-spin shrink-0" />
              }
              <span className="truncate text-[#a3a3a3]" title={item.file}>{item.file}</span>
              {item.status === 'listo' && (
                <span className="ml-auto text-[#505050] shrink-0">MD ✓</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Fase 4 — `_meta.json` y estructura de carpetas por área (2 días)

### 4.1 `src/services/metaService.ts` (nuevo)

```typescript
/**
 * metaService — Lee y escribe _meta.json en carpetas de procedimientos.
 * Define el "formato único" de NetVault.
 */

export interface ProcedureMeta {
  code: string;
  version: string;
  status: 'borrador' | 'en_revision' | 'vigente' | 'obsoleto';
  area: 'T&C' | 'P&C' | 'Transportes';
  hash: string;
  syncStatus: 'local' | 'pendiente' | 'sincronizado' | 'conflicto';
  lastModified: string;
  analysisRunAt?: string;
  rubricVersion?: string;
  approvedBy?: string;
  approvedAt?: string;
}

const api = window.electronAPI;

export async function readMeta(procedureFolder: string): Promise<ProcedureMeta | null> {
  const metaPath = `${procedureFolder}\\_meta.json`;
  try {
    const text = await api.readFile(metaPath);
    return JSON.parse(text) as ProcedureMeta;
  } catch {
    return null;
  }
}

export async function writeMeta(procedureFolder: string, meta: ProcedureMeta): Promise<void> {
  const metaPath = `${procedureFolder}\\_meta.json`;
  await api.writeFile(metaPath, JSON.stringify(meta, null, 2));
}

export async function updateSyncStatus(
  procedureFolder: string,
  syncStatus: ProcedureMeta['syncStatus'],
): Promise<void> {
  const meta = await readMeta(procedureFolder);
  if (!meta) return;
  await writeMeta(procedureFolder, { ...meta, syncStatus, lastModified: new Date().toISOString() });
}

/** Crea la estructura de carpeta de formato único para un procedimiento nuevo. */
export async function initProcedureFolder(
  rootArea: string,
  code: string,
  area: ProcedureMeta['area'],
): Promise<string> {
  const folder = `${rootArea}\\${code}`;
  await api.createDirectory(folder);
  const meta: ProcedureMeta = {
    code,
    version: '1.0.0',
    status: 'borrador',
    area,
    hash: '',
    syncStatus: 'local',
    lastModified: new Date().toISOString(),
  };
  await writeMeta(folder, meta);
  return folder;
}
```

### 4.2 Estructura de carpetas esperada

```
netvault/
├── T&C/
│   └── TC-001-SOLICITUDES/
│       ├── original.pdf          (o .docx)
│       ├── procedimiento.md      (convertido)
│       ├── flujograma.mmd        (Mermaid generado por Claude)
│       ├── analisis.md           (hallazgos vs rúbrica)
│       ├── propuestas.md
│       ├── tiempos.json
│       ├── corpus_zymo.jsonl
│       └── _meta.json            ← estado, versión, hash, sync
├── P&C/
└── Transportes/
```

---

## Fase 5 — syncService.ts y badge de estado en FilePanel (2 días)

### 5.1 `src/services/syncService.ts` (nuevo)

```typescript
import { intranetService } from './intranetService';
import { readMeta, writeMeta } from './metaService';
import crypto from 'crypto'; // disponible via Electron

/** Sube un paquete analizado a la intranet. */
export async function pushPaquete(procedureFolder: string, pkg: object): Promise<void> {
  const meta = await readMeta(procedureFolder);
  if (!meta) throw new Error('Sin _meta.json en la carpeta del procedimiento');

  await intranetService.ingestPaquete(pkg);
  await writeMeta(procedureFolder, { ...meta, syncStatus: 'sincronizado', lastModified: new Date().toISOString() });
}

/** Compara hash local con el del servidor. */
export async function checkSyncStatus(code: string, localHash: string): Promise<'sincronizado' | 'pendiente' | 'conflicto'> {
  try {
    const remoto = await intranetService.syncEstado(code);
    if (!remoto.exists) return 'pendiente';
    if (remoto.hash === localHash) return 'sincronizado';
    return 'conflicto';
  } catch {
    return 'pendiente';
  }
}

/** Retorna mapa {code → syncStatus} para todo el área. */
export async function pullAreaStatus(area: string): Promise<Record<string, string>> {
  try {
    const res = await intranetService.syncArea(area);
    return Object.fromEntries(
      (res.documentos ?? []).map((d: any) => [d.procedure_code, d.sync_status])
    );
  } catch {
    return {};
  }
}
```

### 5.2 Badge en `FileItem.tsx`

Añadir badge de sync visible en el explorador de archivos:

```tsx
// En FileItem.tsx — añadir después del nombre del archivo:
{syncStatus && (
  <span className={`ml-auto text-[9px] px-1 py-0.5 rounded shrink-0 ${
    syncStatus === 'sincronizado' ? 'bg-green-900/40 text-green-400' :
    syncStatus === 'conflicto'   ? 'bg-red-900/40 text-red-400' :
    syncStatus === 'pendiente'   ? 'bg-amber-900/40 text-amber-400' :
    'bg-[#262626] text-[#505050]'
  }`}>
    {syncStatus === 'sincronizado' ? '✓' : syncStatus === 'conflicto' ? '!' : '↑'}
  </span>
)}
```

---

## Fase 6 — AnalyzerPanel mejorado con Claude real (2 días)

Reemplazar el análisis mock por llamada al endpoint `/api/netvault/claude/analizar`:

### 6.1 Modificar `AnalyzerPanel.tsx`

```tsx
// Reemplazar la llamada a aiService.chat() por:
const handleAnalizar = async () => {
  if (!textContent || !procedureCode) return;
  setLoading(true);

  const api = window.electronAPI as any;
  const session = await api.auth.getSession();

  // Llamada SSE al servidor
  const url = `${session.intranetUrl}/api/netvault/claude/analizar`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      procedure_code: procedureCode,
      area: selectedArea,
      text_content: textContent,
      existing_flowchart_mmd: existingMmd,
    }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const data = JSON.parse(line.slice(6));
      if (data.progress) setProgress(data.progress);
      if (data.done && data.package) {
        setAnalysisPackage(data.package);
        setLoading(false);
      }
      if (data.error) { setError(data.error); setLoading(false); }
    }
  }
};
```

---

## Fase 7 — Chat IA conectado al proxy Claude del servidor

El chat actual llama directamente a `api.anthropic.com` desde el renderer. Cambiar a:

### 7.1 En `src/services/aiService.ts`

```typescript
// Nueva función para usar el proxy de la intranet:
export async function chatViaIntranet(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
): Promise<AsyncIterable<string>> {
  const api = window.electronAPI as any;
  const session = await api.auth.getSession();
  if (!session.loggedIn) throw new Error('Sin sesión. Inicia sesión en la intranet.');

  const res = await fetch(`${session.intranetUrl}/api/netvault/claude/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ messages, system_prompt: systemPrompt }),
  });

  return streamFromSSE(res); // helper que parsea SSE chunks
}

async function* streamFromSSE(res: Response): AsyncIterable<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
      const d = JSON.parse(line.slice(6));
      if (d.chunk) yield d.chunk;
      if (d.done || d.error) return;
    }
  }
}
```

---

## Fase 8 — Grafo por área y general (2 días)

El `GraphPanel.tsx` ya tiene el modo **LightRAG** (grafo semántico de la intranet).  
Añadir dos modos más al sidebar:

```
Vault .md     — ya existe: escanea [[wikilinks]] de la carpeta activa
LightRAG      — ya existe: grafo semántico de la intranet
─────────────────────────────────
[NUEVO] Área  — filtra el grafo LightRAG por área (q=T&C, q=P&C, etc.)
[NUEVO] General — todos los procedimientos de todas las áreas
```

En `graphService.ts` añadir:

```typescript
export async function loadAreaGraph(area: string): Promise<LightRagResult> {
  return loadLightRagGraph(getIntranetUrl(), getToken(), { q: area, maxNodes: 150 });
}

export async function loadGeneralGraph(): Promise<LightRagResult> {
  return loadLightRagGraph(getIntranetUrl(), getToken(), { maxNodes: 300, maxEdges: 1000 });
}

// Helpers para leer URL/token desde el IPC:
async function getIntranetUrl(): Promise<string> {
  const s = await (window.electronAPI as any).auth.getSession();
  return s.intranetUrl;
}
async function getToken(): Promise<string> {
  const s = await (window.electronAPI as any).auth.getSession();
  return s.token;
}
```

---

## Resumen de archivos nuevos / modificados

| Archivo | Acción | Prioridad |
|---------|--------|-----------|
| `electron/main.ts` | Añadir IPCs: auth:*, netvault:fetch, queue:* | **Alta** |
| `electron/preload.ts` | Exponer nuevos IPCs | **Alta** |
| `src/services/authService.ts` | NUEVO | **Alta** |
| `src/services/intranetService.ts` | NUEVO | **Alta** |
| `src/components/auth/LoginModal.tsx` | NUEVO | **Alta** |
| `src/App.tsx` | Integrar auth/login/pingSession | **Alta** |
| `src/services/metaService.ts` | NUEVO | Media |
| `src/services/syncService.ts` | NUEVO | Media |
| `src/components/queue/ConversionQueue.tsx` | NUEVO | Media |
| `src/services/aiService.ts` | Añadir `chatViaIntranet()` | Media |
| `src/components/analyzer/AnalyzerPanel.tsx` | Llamar endpoint intranet | Media |
| `src/components/file-panel/FileItem.tsx` | Badge sync | Media |
| `src/services/graphService.ts` | `loadAreaGraph`, `loadGeneralGraph` | Baja |
| `src/components/graph/GraphPanel.tsx` | Modos Área + General | Baja |
| `src/types/electron.d.ts` | Tipados de auth + netvault | **Alta** |

---

## Orden de ejecución recomendado

```
Semana 1: Auth (Fases 1 + 2)
  1. npm install electron-store
  2. Añadir IPCs en electron/main.ts (auth:*, netvault:fetch)
  3. Actualizar preload.ts
  4. Crear authService.ts + LoginModal.tsx
  5. Integrar en App.tsx (mostrar login si !session.loggedIn)
  6. Probar: npm run build:electron + npm run electron:dev
     → Debe aparecer el LoginModal al arrancar
     → Tras login, debe mostrar la app normal

Semana 2: Cola de conversión + _meta.json (Fases 3 + 4)
  1. IPC queue:convertFiles en electron/main.ts
  2. ConversionQueue.tsx
  3. metaService.ts
  4. Probar drag & drop de PDFs → cola → archivos .md creados

Semana 3: Análisis real + Sync (Fases 5 + 6 + 7)
  1. syncService.ts + badges en FileItem
  2. AnalyzerPanel → endpoint intranet
  3. aiService chatViaIntranet
  4. pushPaquete → ingest en BD intranet

Semana 4: Grafos por área + General (Fase 8)
  1. loadAreaGraph / loadGeneralGraph
  2. Nuevas pestañas en GraphPanel
```

---

## Dependencias npm a añadir

```powershell
cd E:\net_file_manager
npm install electron-store
# electron-store requiere que sea CommonJS en electron/; ya es así.
```

---

## Nota sobre el `server/` de NetVault

El `server/` (Express + TS en `E:\net_file_manager\server\`) ya tiene:
- Proxy Claude funcional (`services/claude.ts`)
- Análisis completo de procedimientos (`services/analysis.ts`)
- Auth JWT propio

**En desarrollo local** (sin intranet levantada) se puede usar el `server/` como backend provisional:
```powershell
cd E:\net_file_manager\server
npm install && npm run dev   # levanta en localhost:3847
```
La URL en LoginModal sería `http://localhost:3847`.

**En producción** se usa la intranet directamente (`http://servidor:8001`).
El servicio `server/` puede quedar como modo "standalone/offline" de NetVault.
