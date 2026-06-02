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

// Tipos para navegación
export interface NavigationHistory {
  entries: string[];
  currentIndex: number;
}

// Tipos para UI
export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  toolbarBg: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  hover: string;
  selected: string;
}

// Tipos para configuración
export interface AppConfig {
  theme: 'dark' | 'light';
  lastLeftPath: string;
  lastRightPath: string;
  favorites: string[];
  terminalVisible: boolean;
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
  openFile: (path: string) => Promise<void>;

  // Diálogos nativos
  showOpenDialog: (options: any) => Promise<any>;
  showSaveDialog: (options: any) => Promise<any>;
  showMessageBox: (options: any) => Promise<any>;

  // Terminal
  executeCommand: (cmd: string, cwd: string) => Promise<string>;

  // Config
  getConfig: () => Promise<AppConfig>;
  setConfig: (key: string, value: any) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}