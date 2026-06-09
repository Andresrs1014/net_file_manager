import { ElectronAPI } from '../electron/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI & {
      getSystemPaths?: () => Promise<{ home: string; downloads: string; documents: string; desktop: string }>;
      windowMinimize?: () => void;
      windowMaximize?: () => void;
      windowClose?: () => void;
      windowIsMaximized?: () => Promise<boolean>;
      onWindowMaximized?: (cb: (maximized: boolean) => void) => void;
    };
  }
}