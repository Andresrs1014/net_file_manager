/**
 * syncService — Sincronización entre los paquetes locales y la BD de la intranet.
 *
 * Operaciones:
 *   - ingestPackage:     sube un paquete nuevo/actualizado a la intranet
 *   - fetchAreaStatus:   descarga el estado de todos los docs de un área
 *   - syncLocalMeta:     compara local vs intranet y actualiza _meta.json
 */

import { intranetPost, intranetGet } from './intranetService';
import { readMeta, writeMeta, quickHash, type ProcedureMeta } from './metaService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ipc = () => (window.electronAPI as any);

export interface IngestPayload {
  codigo:       string;
  titulo:       string;
  area:         string;
  version:      string;
  contenido_md: string;
  hash_md5:     string;
  flowchart_mmd?: string;
}

export interface IngestResult {
  id:      number;
  codigo:  string;
  estado:  string;
  message: string;
}

/**
 * Sube un paquete de procedimiento a la intranet.
 * Lee el procedimiento.md, calcula el hash y llama al endpoint de ingest.
 */
export async function ingestPackage(procedureDir: string): Promise<{ ok: boolean; error?: string }> {
  const meta = await readMeta(procedureDir);
  if (!meta) return { ok: false, error: 'No se encontró _meta.json en la carpeta' };

  const mdPath = `${procedureDir}\\procedimiento.md`;
  let contenido = '';
  try { contenido = await ipc().readFile(mdPath); } catch {
    return { ok: false, error: 'No se encontró procedimiento.md' };
  }

  let flowchart: string | undefined;
  const mmdPath = `${procedureDir}\\flowchart.mmd`;
  try { flowchart = await ipc().readFile(mmdPath); } catch { /* opcional */ }

  const hash = quickHash(contenido);
  const payload: IngestPayload = {
    codigo:       meta.codigo,
    titulo:       meta.titulo,
    area:         meta.area,
    version:      meta.version,
    contenido_md: contenido,
    hash_md5:     hash,
    flowchart_mmd: flowchart,
  };

  const res = await intranetPost<IngestResult>('/api/netvault/documentos/ingest', payload);
  if (!res.ok) return { ok: false, error: res.error ?? `HTTP ${res.status}` };

  // Actualizar _meta.json con el ID asignado y estado
  await writeMeta(procedureDir, {
    ...meta,
    hash_md5:    hash,
    estado:      'pendiente',
    synced_at:   new Date().toISOString(),
    netvault_id: res.data?.id ?? null,
  });

  return { ok: true };
}

export interface AreaSyncStatus {
  area:      string;
  docs:      RemoteDocStatus[];
  fetchedAt: string;
}

export interface RemoteDocStatus {
  codigo:     string;
  titulo:     string;
  estado:     ProcedureMeta['estado'];
  version:    string;
  hash_md5:   string;
  updated_at: string;
}

/** Obtiene el estado de todos los documentos de un área desde la intranet. */
export async function fetchAreaStatus(area: string): Promise<AreaSyncStatus | null> {
  const res = await intranetGet<RemoteDocStatus[]>(
    `/api/netvault/sync/area/${encodeURIComponent(area)}`,
  );
  if (!res.ok) return null;
  return { area, docs: res.data ?? [], fetchedAt: new Date().toISOString() };
}

/**
 * Compara el hash local de un procedimiento con el de la intranet.
 * Actualiza _meta.json con el estado correcto.
 */
export async function syncLocalMeta(
  procedureDir: string,
  remoteDocs: RemoteDocStatus[],
): Promise<void> {
  const meta = await readMeta(procedureDir);
  if (!meta) return;

  const remote = remoteDocs.find(d => d.codigo === meta.codigo);
  if (!remote) return; // no está en la intranet todavía

  // Recalcular hash local
  let localHash = meta.hash_md5;
  try {
    const content: string = await ipc().readFile(`${procedureDir}\\procedimiento.md`);
    localHash = quickHash(content);
  } catch { /* usa el guardado */ }

  const estado: ProcedureMeta['estado'] =
    localHash !== remote.hash_md5 ? 'desactualizado' : remote.estado;

  await writeMeta(procedureDir, { ...meta, hash_md5: localHash, estado });
}
