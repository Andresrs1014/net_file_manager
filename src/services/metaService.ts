/**
 * metaService — Gestiona el archivo _meta.json de cada paquete de procedimiento.
 *
 * Estructura de un paquete:
 *   <area>/<codigo>/
 *     procedimiento.md
 *     flowchart.mmd          (opcional)
 *     _meta.json             ← este archivo
 *
 * _meta.json sigue la convención de NetVault para sincronización.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ipc = () => (window.electronAPI as any);

export type ProcedureStatus = 'local' | 'pendiente' | 'analizado' | 'aprobado' | 'desactualizado';

export interface ProcedureMeta {
  codigo:       string;
  titulo:       string;
  area:         string;
  version:      string;
  hash_md5:     string;
  estado:       ProcedureStatus;
  synced_at:    string | null;
  analyzed_at:  string | null;
  score:        number | null;
  netvault_id:  number | null;
}

const DEFAULT_META: Omit<ProcedureMeta, 'codigo' | 'titulo' | 'area'> = {
  version:     '1.0',
  hash_md5:    '',
  estado:      'local',
  synced_at:   null,
  analyzed_at: null,
  score:       null,
  netvault_id: null,
};

/** Lee _meta.json desde una carpeta de procedimiento. Devuelve null si no existe. */
export async function readMeta(procedureDir: string): Promise<ProcedureMeta | null> {
  const metaPath = `${procedureDir}\\_meta.json`;
  const exists: boolean = await ipc().fileExists(metaPath);
  if (!exists) return null;
  try {
    const raw: string = await ipc().readFile(metaPath);
    return JSON.parse(raw) as ProcedureMeta;
  } catch {
    return null;
  }
}

/** Escribe _meta.json en la carpeta de procedimiento (merge con lo existente). */
export async function writeMeta(
  procedureDir: string,
  partial: Partial<ProcedureMeta> & { codigo: string; titulo: string; area: string },
): Promise<void> {
  const existing = await readMeta(procedureDir) ?? { ...DEFAULT_META, ...partial };
  const merged   = { ...existing, ...partial, updated_at: new Date().toISOString() };
  await ipc().writeFile(`${procedureDir}\\_meta.json`, JSON.stringify(merged, null, 2));
}

/**
 * Calcula un hash simple (djb2) del contenido de un archivo MD
 * para detectar cambios sin necesidad de crypto nativo.
 */
export function quickHash(content: string): string {
  let h = 5381;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) + h) ^ content.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

