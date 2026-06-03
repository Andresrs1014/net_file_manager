import type { FileEntry, FileStats, AppConfig } from '../types';

export const fileService = {
  // Reading
  async readDirectory(path: string): Promise<FileEntry[]> {
    return await window.electronAPI.readDirectory(path);
  },

  async getStats(path: string): Promise<FileStats> {
    return await window.electronAPI.getFileStats(path);
  },

  async fileExists(path: string): Promise<boolean> {
    return await window.electronAPI.fileExists(path);
  },

  // Operations
  async copyFile(src: string, dst: string): Promise<void> {
    await window.electronAPI.copyFile(src, dst);
  },

  async moveFile(src: string, dst: string): Promise<void> {
    await window.electronAPI.moveFile(src, dst);
  },

  async deleteFile(path: string, permanent: boolean = false): Promise<void> {
    await window.electronAPI.deleteFile(path, permanent);
  },

  async renameFile(oldPath: string, newName: string): Promise<string> {
    return await window.electronAPI.renameFile(oldPath, newName);
  },

  async createFolder(parent: string, name: string): Promise<void> {
    await window.electronAPI.createFolder(`${parent}\\${name}`);
  },

  async createFile(parent: string, name: string, content: string = ''): Promise<void> {
    await window.electronAPI.createFile(`${parent}\\${name}`, content);
  },

  async openFile(path: string): Promise<void> {
    await window.electronAPI.openFile(path);
  },

  async showInFolder(path: string): Promise<void> {
    await window.electronAPI.showInFolder(path);
  },

  // Clipboard
  async copyToClipboard(text: string): Promise<void> {
    await window.electronAPI.setClipboard(text);
  },

  async getFromClipboard(): Promise<string> {
    return await window.electronAPI.getClipboard();
  },

  // Terminal
  async executeCommand(cmd: string, cwd: string): Promise<string> {
    return await window.electronAPI.executeCommand(cmd, cwd);
  },

  // Dialogs
  async showDeleteConfirmation(fileName: string, toTrash: boolean = true): Promise<boolean> {
    const result = await window.electronAPI.showMessage({
      type: 'question',
      buttons: ['Cancelar', toTrash ? 'Mover a papelera' : 'Eliminar'],
      title: 'Confirmar eliminación',
      message: `¿Eliminar "${fileName}"?`,
      detail: toTrash ? 'El archivo se moverá a la papelera de reciclaje.' : 'Esta acción no se puede deshacer.',
    });
    return result === 1;
  },

  async showOverwriteConfirmation(fileName: string): Promise<'skip' | 'overwrite' | 'cancel'> {
    const result = await window.electronAPI.showMessage({
      type: 'question',
      buttons: ['Cancelar', 'Omitir', 'Sobrescribir'],
      title: 'Archivo existente',
      message: `¿Sobrescribir "${fileName}"?`,
      detail: 'Ya existe un archivo con ese nombre.',
    });
    if (result === 1) return 'skip';
    if (result === 2) return 'overwrite';
    return 'cancel';
  },

  async showOpenFolderDialog(): Promise<string | null> {
    return await window.electronAPI.openFolderDialog();
  },

  async showOpenFileDialog(filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
    return await window.electronAPI.openFileDialog(filters);
  },

  async showSaveFileDialog(defaultPath?: string, filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
    return await window.electronAPI.saveFileDialog(defaultPath, filters);
  },

  // Config
  async getConfig(): Promise<AppConfig> {
    const config = await window.electronAPI.readConfig() as AppConfig;
    return config || { theme: 'dark', lastLeftPath: '', lastRightPath: '', favorites: [], terminalVisible: false };
  },

  async saveConfig(config: Partial<AppConfig>): Promise<void> {
    const current = await this.getConfig();
    await window.electronAPI.writeConfig({ ...current, ...config });
  },

  // Helpers
  getFileName(path: string): string {
    return path.split('\\').pop() || path.split('/').pop() || path;
  },

  getParentPath(path: string): string {
    const parts = path.split('\\').filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('\\');
  },

  joinPath(parent: string, name: string): string {
    const sep = parent.endsWith('\\') ? '' : '\\';
    return `${parent}${sep}${name}`;
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  getFileIcon(entry: FileEntry): string {
    if (entry.isDirectory) return '📁';
    
    const ext = entry.name.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      // Documentos
      'pdf': '📕', 'doc': '📘', 'docx': '📘', 'txt': '📝', 'md': '📝',
      // Imágenes
      'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'webp': '🖼️',
      // Código
      'js': '📜', 'ts': '📜', 'tsx': '📜', 'jsx': '📜', 'py': '🐍', 'java': '☕',
      'cpp': '⚙️', 'c': '⚙️', 'rs': '🦀', 'go': '🐹', 'rb': '💎', 'php': '🐘',
      // Datos
      'json': '📋', 'xml': '📋', 'csv': '📊', 'xlsx': '📊', 'xls': '📊',
      // Web
      'html': '🌐', 'css': '🎨', 'scss': '🎨', 'less': '🎨',
      // Config
      'env': '🔐', 'gitignore': '🔒', 'lock': '🔒',
      // Comprimidos
      'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
      // Ejecutables
      'exe': '⚡', 'msi': '⚡', 'dmg': '⚡', 'app': '⚡',
      // Audio/Video
      'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'mp4': '🎬', 'mkv': '🎬', 'avi': '🎬',
    };
    
    return icons[ext] || '📄';
  },

  isValidFileName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'El nombre no puede estar vacío';
    }
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return 'El nombre contiene caracteres inválidos';
    }
    if (name === '.' || name === '..') {
      return 'El nombre no puede ser "." o ".."';
    }
    return null;
  },
};

export async function getConfig(): Promise<AppConfig> {
  return await fileService.getConfig();
}

export async function setConfig(key: string, value: any): Promise<void> {
  await fileService.saveConfig({ [key]: value } as Partial<AppConfig>);
}