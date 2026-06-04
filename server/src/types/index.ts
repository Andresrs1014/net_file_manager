// ─── Roles de usuario ───────────────────────────────────────────────────────
export type UserRole = 'aprobador_maximo' | 'analista' | 'lector';

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  username: string;
  role: UserRole;
}

export interface JwtPayload extends AuthUser {
  iat?: number;
  exp?: number;
}

// ─── Análisis de procedimiento ───────────────────────────────────────────────
export type ProcedureArea = 'T&C' | 'P&C' | 'Transportes';
export type ProcedureStatus = 'borrador' | 'en_revision' | 'vigente' | 'obsoleto';
export type SyncStatus = 'local' | 'pendiente' | 'sincronizado' | 'conflicto';
export type FindingSeverity = 'critica' | 'alta' | 'media' | 'baja';

export interface ProcedureMeta {
  code: string;
  version: string;
  status: ProcedureStatus;
  area: ProcedureArea;
  hash: string;                 // SHA-256 del original; detecta cambios y conflictos
  approvedBy?: string;
  approvedAt?: string;          // ISO-8601
  syncStatus: SyncStatus;
  lastModified: string;         // ISO-8601
  analysisRunAt?: string;       // ISO-8601
  uploadedAt?: string;          // ISO-8601; se llena después del POST /ingest
  rubricVersion?: string;
}

export interface AnalysisFinding {
  id: string;
  category: string;             // e.g. "Claridad", "Completitud", "Riesgos"
  severity: FindingSeverity;
  description: string;
  suggestion: string;
  visibility: 'interna' | 'publica'; // atado a OP-3 intranet
}

export interface ExtractedTime {
  activity: string;
  minMinutes?: number;
  maxMinutes?: number;
  unit: string;
  rawText: string;
}

export interface Proposal {
  type: 'desarrollo_intranet' | 'mcp' | 'mejora_proceso' | 'eliminar_paso';
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baja';
}

export interface ZymoCorpusEntry {
  source: string;               // código del procedimiento
  chunk: string;                // texto del fragmento
  entities: string[];           // entidades mencionadas
  relations: Array<{ from: string; to: string; type: string }>;
}

export interface AnalysisPackage {
  procedureCode: string;
  originalPath: string;
  analyzedAt: string;           // ISO-8601
  flowchartMmd: string;         // Mermaid flowchart LR
  flowchartDiff?: string;       // diff con el flujograma previo (si existe)
  markdownNormalized: string;   // procedimiento normalizado
  findings: AnalysisFinding[];
  times: ExtractedTime[];
  proposals: Proposal[];
  zymoCorpus: ZymoCorpusEntry[];
  meta: ProcedureMeta;
}

// ─── Petición de análisis ────────────────────────────────────────────────────
export interface AnalysisRequest {
  procedureCode: string;
  area: ProcedureArea;
  /** Contenido de texto ya extraído del documento (sin binarios) */
  textContent: string;
  /** Flujograma previo en Mermaid (si existe, para comparar) */
  existingFlowchartMmd?: string;
}

export interface AnalysisResponse {
  ok: boolean;
  package?: AnalysisPackage;
  error?: string;
}

// ─── Respuestas API genéricas ─────────────────────────────────────────────────
export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiOk<T> | ApiError;
