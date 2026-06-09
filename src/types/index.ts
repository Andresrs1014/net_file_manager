import React from 'react';

// Tipos para sistema de archivos
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size?: number;
  modified?: Date;
  created?: Date;
}

export interface FileStats {
  size: number;
  modified: Date;
  created: Date;
  isDirectory: boolean;
}

// Tipos para menú contextual
export interface MenuItem {
  label: string;
  icon?: string | React.ReactNode;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
  shortcut?: string;
}

// Tipos para portapapeles
export interface ClipboardContent {
  action: 'copy' | 'cut' | null;
  paths: string[];
}

// Tipos para configuración
export interface AppConfig {
  theme: 'dark' | 'light';
  lastLeftPath: string;
  lastRightPath: string;
  favorites: string[];
  quickAccess: { icon: string; path: string; label: string }[];
  terminalVisible: boolean;
}

// ─── Tipos de procedimientos y análisis (sincronizados con server/src/types) ──
export type UserRole = 'aprobador_maximo' | 'analista' | 'lector';
export type ProcedureArea = string;  // Dinámico — áreas vienen del SIG
export type ProcedureStatus = 'borrador' | 'en_revision' | 'vigente' | 'obsoleto';
export type SyncStatus = 'local' | 'pendiente' | 'sincronizado' | 'conflicto';
export type FindingSeverity = 'critica' | 'alta' | 'media' | 'baja';

export interface ProcedureMeta {
  code: string;
  version: string;
  status: ProcedureStatus;
  area: ProcedureArea;
  hash: string;
  approvedBy?: string;
  approvedAt?: string;
  syncStatus: SyncStatus;
  lastModified: string;
  analysisRunAt?: string;
  uploadedAt?: string;
  rubricVersion?: string;
}

export interface AnalysisFinding {
  id: string;
  category: string;
  severity: FindingSeverity;
  description: string;
  suggestion: string;
  visibility: 'interna' | 'publica';
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
  source: string;
  chunk: string;
  entities: string[];
  relations: Array<{ from: string; to: string; type: string }>;
}

export interface AnalysisPackage {
  procedureCode: string;
  originalPath: string;
  analyzedAt: string;
  flowchartMmd: string;
  flowchartDiff?: string;
  markdownNormalized: string;
  findings: AnalysisFinding[];
  times: ExtractedTime[];
  proposals: Proposal[];
  zymoCorpus: ZymoCorpusEntry[];
  meta: ProcedureMeta;
}

// Tipos para el API de Electron
export interface ElectronAPI {
  // Sistema de archivos
  readDirectory: (path: string) => Promise<FileEntry[]>;
  getFileStats: (path: string) => Promise<FileStats>;
  copyFile: (src: string, dst: string) => Promise<void>;
  moveFile: (src: string, dst: string) => Promise<void>;
  deleteFile: (path: string, permanent: boolean) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  createFile: (path: string, content: string) => Promise<void>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string | Uint8Array>;
  openFile: (path: string) => Promise<void>;
  fileExists: (path: string) => Promise<boolean>;
  renameFile: (oldPath: string, newName: string) => Promise<string>;
  showInFolder: (path: string) => Promise<void>;
  showItemProperties: (path: string) => Promise<{ success: boolean; output: string }>;
  getClipboard: () => Promise<string>;
  setClipboard: (text: string) => Promise<void>;

  // Diálogos nativos
  openFolderDialog: () => Promise<string | null>;
  openFileDialog: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  saveFileDialog: (defaultPath?: string, filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  showMessage: (options: { type?: string; title?: string; message: string; detail?: string; buttons?: string[] }) => Promise<number>;

  // Terminal
  executeCommand: (cmd: string, cwd: string) => Promise<string>;

  // Configuración
  getConfigPath: () => Promise<string>;
  readConfig: () => Promise<object>;
  writeConfig: (config: object) => Promise<void>;

  // Code editors
  detectEditors: () => Promise<{ name: string; path: string; icon: string }[]>;
  openWithEditor: (editorPath: string, filePath: string) => Promise<{ success: boolean; error?: string }>;

  // ─── NetVault Server API ─────────────────────────────────────────────────
  serverGetUrl: () => Promise<string>;
  serverSetUrl: (url: string) => Promise<void>;
  serverHealth: () => Promise<{ ok: boolean; reachable: boolean; version?: string; anthropicConfigured?: boolean; model?: string; error?: string }>;
  serverLogin: (username: string, password: string) => Promise<{ ok: boolean; data?: { username: string; role: UserRole; expiresIn: string }; error?: string }>;
  serverLogout: () => Promise<{ ok: boolean }>;
  serverSession: () => Promise<{ ok: boolean; data?: { username: string; role: UserRole }; error?: string }>;
  serverRunAnalysis: (payload: {
    procedureCode: string;
    area: ProcedureArea;
    textContent: string;
    existingFlowchartMmd?: string;
  }) => Promise<{ ok: boolean; data?: AnalysisPackage; error?: string }>;
  serverGetRubric?: () => Promise<{ ok: boolean; data?: { json: unknown; markdown: string }; error?: string }>;
  analysisGetLocalRubric?: () => Promise<{ ok: boolean; data?: { json: unknown; markdown: string }; error?: string }>;
  analysisSavePackage?: (payload: {
    outputRoot: string;
    area: string;
    procedureCode: string;
    files: Record<string, string>;
    originalPath?: string;
  }) => Promise<{ ok: boolean; folder?: string; error?: string }>;
  openFolderForSave?: () => Promise<string | null>;
  getAppRoot?: () => Promise<string>;

  // Indexador y grafo vault (main process)
  scanIndex?: (rootPath: string, maxDepth?: number) => Promise<{
    success: boolean;
    count: number;
    entries: Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      size: number;
      modified: number;
      extension: string;
    }>;
    error?: string;
  }>;
  loadLightRagGraph?: (
    intranetUrl: string,
    token: string,
    opts?: { maxNodes?: number; maxEdges?: number; q?: string },
  ) => Promise<{
    success: boolean;
    error?: string;
    data: {
      nodes: Array<{ id: string; label: string; type: string; properties?: Record<string, string> }>;
      edges: Array<{ source: string; target: string; label?: string; type: string }>;
      meta?: Record<string, unknown>;
    };
  }>;

  scanVaultMarkdown?: (rootPath: string) => Promise<{
    success: boolean;
    root: string;
    files: string[];
    count: number;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}