/**
 * Fast File Indexer - In-memory index with Fuse.js fuzzy search
 */
import Fuse from 'fuse.js';

export interface IndexedFile {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  extension: string;
}

export interface IndexStats {
  totalFiles: number;
  totalDirs: number;
  lastUpdate: Date;
}

class FastIndexer {
  private index: Map<string, IndexedFile> = new Map();
  private extensionsIndex: Map<string, Set<string>> = new Map();
  private fuse: Fuse<IndexedFile> | null = null;

  private rebuildFuse(): void {
    this.fuse = new Fuse(Array.from(this.index.values()), {
      keys: ['name'],
      threshold: 0.35,
      includeScore: true,
      minMatchCharLength: 1,
    });
  }

  /** Load pre-scanned entries from main process (one IPC call replaces N readDirectory calls) */
  loadEntries(entries: { name: string; path: string; isDirectory: boolean; size: number; modified: number; extension: string }[]): number {
    this.index.clear();
    this.extensionsIndex.clear();
    for (const e of entries) {
      const file: IndexedFile = {
        name: e.name,
        path: e.path,
        isDirectory: e.isDirectory,
        size: e.size,
        modified: new Date(e.modified),
        extension: e.extension,
      };
      this.index.set(e.path, file);
      if (e.extension && !e.isDirectory) {
        if (!this.extensionsIndex.has(e.extension)) {
          this.extensionsIndex.set(e.extension, new Set());
        }
        this.extensionsIndex.get(e.extension)!.add(e.path);
      }
    }
    this.rebuildFuse();
    return this.index.size;
  }

  async indexDirectory(dirPath: string, maxDepth = 5): Promise<number> {
    let count = 0;
    
    try {
      const entries = await window.electronAPI.readDirectory(dirPath);
      
      for (const entry of entries) {
        const ext = entry.name.includes('.') ? '.' + entry.name.split('.').pop()!.toLowerCase() : '';
        
        const file: IndexedFile = {
          name: entry.name,
          path: entry.path,
          isDirectory: entry.isDirectory,
          size: entry.size || 0,
          modified: entry.modified ? new Date(entry.modified) : new Date(),
          extension: ext,
        };
        
        this.index.set(entry.path, file);
        
        if (ext && !entry.isDirectory) {
          if (!this.extensionsIndex.has(ext)) {
            this.extensionsIndex.set(ext, new Set());
          }
          this.extensionsIndex.get(ext)!.add(entry.path);
        }
        
        count++;
        
        // Recurse (limited depth)
        if (entry.isDirectory && maxDepth > 0) {
          count += await this.recurseIndex(entry.path, maxDepth - 1);
        }
      }
      // Rebuild Fuse after indexing
      this.rebuildFuse();
    } catch (error) {
      console.error('Index error:', error);
    }
    
    return count;
  }

  private async recurseIndex(dirPath: string, remainingDepth: number): Promise<number> {
    if (remainingDepth <= 0) return 0;
    
    let count = 0;
    try {
      const entries = await window.electronAPI.readDirectory(dirPath);
      for (const entry of entries) {
        const ext = entry.name.includes('.') ? '.' + entry.name.split('.').pop()!.toLowerCase() : '';

        const file: IndexedFile = {
          name: entry.name,
          path: entry.path,
          isDirectory: entry.isDirectory,
          size: entry.size || 0,
          modified: entry.modified ? new Date(entry.modified) : new Date(),
          extension: ext,
        };

        this.index.set(entry.path, file);

        if (ext && !entry.isDirectory) {
          if (!this.extensionsIndex.has(ext)) {
            this.extensionsIndex.set(ext, new Set());
          }
          this.extensionsIndex.get(ext)!.add(entry.path);
        }

        count++;

        if (entry.isDirectory) {
          count += await this.recurseIndex(entry.path, remainingDepth - 1);
        }
      }
    } catch {
      // Ignore permission errors on protected directories
    }
    return count;
  }

  search(query: string, options: { extensions?: string[]; maxResults?: number; fuzzy?: boolean } = {}): IndexedFile[] {
    const { extensions = [], maxResults = 50, fuzzy = true } = options;

    if (!query.trim()) return [];

    let results: IndexedFile[];

    if (fuzzy && this.fuse) {
      // Fuse.js path: accurate fuzzy search
      let fuseResults = this.fuse.search(query, { limit: maxResults * 2 });
      if (extensions.length > 0) {
        const extSet = new Set(extensions.map(e => e.startsWith('.') ? e : '.' + e));
        fuseResults = fuseResults.filter(r => extSet.has(r.item.extension) || r.item.isDirectory);
      }
      results = fuseResults.slice(0, maxResults).map(r => r.item);
    } else {
      // Fast prefix/substring path
      const lowerQuery = query.toLowerCase();
      let pool: IndexedFile[];
      if (extensions.length > 0) {
        pool = [];
        const extSet = new Set(extensions.map(e => e.startsWith('.') ? e : '.' + e));
        extSet.forEach(ext => {
          const files = this.extensionsIndex.get(ext);
          files?.forEach(p => {
            const file = this.index.get(p);
            if (file) pool.push(file);
          });
        });
      } else {
        pool = Array.from(this.index.values());
      }
      results = pool
        .filter(f => f.name.toLowerCase().includes(lowerQuery))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, maxResults);
    }

    return results;
  }


  prefixSearch(prefix: string, maxResults = 20): IndexedFile[] {
    const lowerPrefix = prefix.toLowerCase();
    const results: IndexedFile[] = [];
    
    this.index.forEach(file => {
      if (file.name.toLowerCase().startsWith(lowerPrefix)) {
        results.push(file);
      }
    });
    
    return results.sort((a, b) => a.name.localeCompare(b.name)).slice(0, maxResults);
  }

  clear(): void {
    this.index.clear();
    this.extensionsIndex.clear();
    this.fuse = null;
  }

  getStats(): IndexStats {
    let totalFiles = 0;
    let totalDirs = 0;
    
    this.index.forEach(file => {
      if (file.isDirectory) totalDirs++;
      else totalFiles++;
    });
    
    return { totalFiles, totalDirs, lastUpdate: new Date() };
  }
}

export const fastIndexer = new FastIndexer();
export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};