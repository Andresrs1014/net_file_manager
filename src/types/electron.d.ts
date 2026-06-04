import { ElectronAPI } from '../electron/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI & {
      chatWithOllama?: (model: string, messages: any[]) => Promise<{ success: boolean; content?: string; error?: string }>;
      getSystemPaths?: () => Promise<{ home: string; downloads: string; documents: string; desktop: string }>;
    };
  }
}