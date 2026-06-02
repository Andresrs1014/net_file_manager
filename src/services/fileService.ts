import type { FileEntry, FileStats, AppConfig } from '../types';

export const fileService = {
  async readDirectory(path: string): Promise<FileEntry[]> {
    return await window.electronAPI.readDirectory(path);
  },

  async getStats(path: string): Promise<FileStats> {
    return await window.electronAPI.getFileStats(path);
  },

  async copyFile(src: string, dst: string): Promise<void> {
    await window.electronAPI.copyFile(src, dst);
  },

  async moveFile(src: string, dst: string): Promise<void> {
    await window.electronAPI.moveFile(src, dst);
  },

  async deleteFile(path: string, permanent: boolean = false): Promise<void> {
    await window.electronAPI.deleteFile(path, permanent);
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

  async showDeleteConfirmation(fileName: string): Promise<boolean> {
    const result = await window.electronAPI.showMessageBox({
      type: 'question',
      buttons: ['Cancelar', 'Mover a papelera'],
      defaultId: 0,
      title: 'Confirmar eliminación',
      message: `¿Eliminar "${fileName}"?`,
      detail: 'El archivo se moverá a la papelera de reciclaje.',
    });
    return result.response === 1;
  },

  async showOpenFolderDialog(): Promise<string | null> {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  },

  getFileName(path: string): string {
    return path.split('\\').pop() || path.split('/').pop() || path;
  },

  getParentPath(path: string): string {
    const parts = path.split('\\').filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('\\');
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
};

export async function getConfig(): Promise<AppConfig> {
  return await window.electronAPI.getConfig();
}

export async function setConfig(key: string, value: any): Promise<void> {
  await window.electronAPI.setConfig(key, value);
}