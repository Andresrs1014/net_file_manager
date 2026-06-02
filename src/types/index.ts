export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileStats {
  size: number;
  modified: Date;
  created: Date;
  isDirectory: boolean;
}

export interface DialogOptions {
  type?: 'info' | 'warning' | 'error' | 'question';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
}

export interface Config {
  tema?: 'dark' | 'light';
  idioma?: string;
  proyectosRecientes?: ProjectInfo[];
  claudeApiKey?: string;
  servidorUrl?: string;
}

export interface ProjectInfo {
  id: string;
  nombre: string;
  ruta: string;
  ultimoAcceso: string;
}