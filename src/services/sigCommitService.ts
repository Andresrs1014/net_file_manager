/**
 * sigCommitService — Integración con el SIG backend de ZYMO.
 *
 * Todas las llamadas pasan por el IPC proxy (netvaultFetch) con Bearer JWT.
 * El prefijo /sig-api/ es proxiado por nginx en la intranet → sig-backend:3003
 */

import { intranetGet, intranetPost } from './intranetService';

export interface SigArea {
  id:          number;
  nombre:      string;
  descripcion: string | null;
  color:       string;
}

export interface SigProcedimiento {
  id:          number;
  areaId:      number;
  codigo:      string;
  titulo:      string;
  descripcion: string | null;
  estado:      'BORRADOR' | 'VIGENTE' | 'OBSOLETO';
}

export interface SigCommitPayload {
  procedimientoId:   number;
  contenidoOriginal?: string;
  contenidoAgente?:   string;
  flujogramaMmd?:    string;
  sinCambios:        boolean;
  mensaje:           string;
  versionDoc?:       string;
}

export async function getSigAreas() {
  return intranetGet<SigArea[]>('/sig-api/api/areas');
}

export async function createSigArea(data: {
  nombre: string;
  descripcion?: string;
  color?: string;
}) {
  return intranetPost<SigArea>('/sig-api/api/areas', data);
}

export async function getSigProcedimientos(areaId?: number) {
  const qs = areaId != null ? `?areaId=${areaId}` : '';
  return intranetGet<SigProcedimiento[]>(`/sig-api/api/procedimientos${qs}`);
}

export async function createSigProcedimiento(data: {
  areaId:       number;
  codigo:       string;
  titulo:       string;
  descripcion?: string;
}) {
  return intranetPost<SigProcedimiento>('/sig-api/api/procedimientos', data);
}

export async function submitSigCommit(payload: SigCommitPayload) {
  return intranetPost<{ id: number; mensaje: string }>('/sig-api/api/commits', payload);
}
