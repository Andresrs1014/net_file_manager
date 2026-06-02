/**
 * Unified Search Service - Ultra-fast file search
 */

import { fastIndexer } from './indexer/fileIndexer';
import { aiService } from './indexer/aiService';
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

  async indexDirectory(path: string): Promise<number> {
    const count = await fastIndexer.indexDirectory(path, 5);
    this.lastIndexedPath = path;
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

  async searchWithAI(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const fastResults = this.search(query, options);
    
    if (aiService.isAvailable()) {
      try {
        const interpretation = await aiService.chat([
          { role: 'system', content: 'You are a file search assistant.' },
          { role: 'user', content: `Suggest keywords for: "${query}"` },
        ]);
        
        if (interpretation) {
          const extraResults = this.search(interpretation, options);
          const allResults = [...fastResults];
          
          for (const result of extraResults) {
            if (!allResults.some(r => r.entry.path === result.entry.path)) {
              allResults.push({ ...result, source: 'ai' as const });
            }
          }
          
          return allResults.slice(0, options.maxResults || 50);
        }
      } catch {
        // AI failed, return fast results
      }
    }
    
    return fastResults;
  }
}

export const searchService = new SearchService();

export { fastIndexer } from './indexer/fileIndexer';
export { aiService } from './indexer/aiService';

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