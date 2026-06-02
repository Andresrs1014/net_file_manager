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

// Tipos para menú contextual
export interface MenuItem {
  label: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
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
  readFile: (path: string) => Promise<Buffer>;
  openFile: (path: string) => Promise<void>;
  fileExists: (path: string) => Promise<boolean>;
  renameFile: (oldPath: string, newName: string) => Promise<string>;
  showInFolder: (path: string) => Promise<void>;
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}