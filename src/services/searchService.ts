import Fuse from 'fuse.js';
import type { FileEntry } from '../types';

export interface SearchResult {
  entry: FileEntry;
  score: number;
}

export interface SearchOptions {
  fuzzy?: boolean;
  extension?: string;
  maxResults?: number;
  caseSensitive?: boolean;
}

class SearchService {
  private fuse: Fuse<FileEntry> | null = null;
  private entries: FileEntry[] = [];
  private indexedPaths: Set<string> = new Set();

  async indexDirectory(path: string, entries: FileEntry[]): Promise<void> {
    // Remove old entries from this path
    this.entries = this.entries.filter(e => !e.path.startsWith(path));
    
    // Add new entries
    this.entries.push(...entries);
    
    this.indexedPaths.add(path);
    
    // Rebuild index
    this.fuse = new Fuse(this.entries, {
      keys: ['name', 'path'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      fuzzy = true,
      extension,
      maxResults = 50,
    } = options;

    if (!query.trim()) {
      return [];
    }

    let results: SearchResult[] = [];

    if (fuzzy && this.fuse) {
      // Fuzzy search
      const fuseResults = this.fuse.search(query);
      results = fuseResults.slice(0, maxResults).map(r => ({
        entry: r.item,
        score: r.score || 0,
      }));
    } else {
      // Simple substring search
      const lowerQuery = query.toLowerCase();
      results = this.entries
        .filter(e => e.name.toLowerCase().includes(lowerQuery))
        .slice(0, maxResults)
        .map(entry => ({
          entry,
          score: 0,
        }));
    }

    // Filter by extension if specified
    if (extension) {
      const ext = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
      results = results.filter(r => 
        r.entry.name.toLowerCase().endsWith(ext)
      );
    }

    return results;
  }

  clearIndex(): void {
    this.entries = [];
    this.indexedPaths.clear();
    this.fuse = null;
  }

  getIndexedPaths(): string[] {
    return Array.from(this.indexedPaths);
  }

  getEntryCount(): number {
    return this.entries.length;
  }
}

// Singleton instance
export const searchService = new SearchService();

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}