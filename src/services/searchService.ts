/**
 * Unified Search Service - Ultra-fast file search
 */

import { fastIndexer } from './indexer/fileIndexer';
import type { FileEntry } from '../types';

export interface SearchResult {
  entry: FileEntry;
  score: number;
  source: 'index' | 'ai';
}

export interface SearchOptions {
  extensions?: string[];
  maxResults?: number;
  fuzzy?: boolean;
}

class SearchService {
  private lastIndexedPath = '';

  async indexDirectory(dirPath: string): Promise<number> {
    // Primary: main-process scanner (no IPC per directory, full stats)
    const api = window.electronAPI as typeof window.electronAPI & {
      scanIndex?: (rootPath: string, maxDepth: number) => Promise<{ success: boolean; count: number; entries: any[] }>;
    };
    if (api.scanIndex) {
      try {
        const result = await api.scanIndex(dirPath, 5);
        if (result.success && result.entries.length > 0) {
          fastIndexer.loadEntries(result.entries);
          this.lastIndexedPath = dirPath;
          return result.count;
        }
      } catch (e) {
        console.warn('Main-process indexer failed, falling back to renderer scan:', e);
      }
    }
    // Fallback: renderer-side IPC scan (legacy, slower)
    const count = await fastIndexer.indexDirectory(dirPath, 5);
    this.lastIndexedPath = dirPath;
    return count;
  }

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const { extensions = [], maxResults = 50, fuzzy = true } = options;

    const files = fastIndexer.search(query, { extensions, maxResults, fuzzy });

    return files.map(file => ({
      entry: {
        name: file.name,
        path: file.path,
        isDirectory: file.isDirectory,
        isFile: !file.isDirectory,
        size: file.size,
        modified: file.modified,
      },
      score: 0,
      source: 'index' as const,
    }));
  }

  prefixSearch(prefix: string, maxResults = 10): SearchResult[] {
    const files = fastIndexer.prefixSearch(prefix, maxResults);
    
    return files.map(file => ({
      entry: {
        name: file.name,
        path: file.path,
        isDirectory: file.isDirectory,
        isFile: !file.isDirectory,
        size: file.size,
        modified: file.modified,
      },
      score: 1,
      source: 'index' as const,
    }));
  }

  getStats() {
    return fastIndexer.getStats();
  }

  clear() {
    fastIndexer.clear();
    this.lastIndexedPath = '';
  }

  async autoIndex(path: string): Promise<void> {
    if (path !== this.lastIndexedPath) {
      await this.indexDirectory(path);
    }
  }

}

export const searchService = new SearchService();

export { fastIndexer } from './indexer/fileIndexer';

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}