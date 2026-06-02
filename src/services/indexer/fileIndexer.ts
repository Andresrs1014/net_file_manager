/**
 * Fast File Indexer - In-memory index for ultra-fast search
 */

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
        
        if (ext) {
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
        if (entry.isDirectory) {
          count++;
          count += await this.recurseIndex(entry.path, remainingDepth - 1);
        }
      }
    } catch {
      // Ignore permission errors
    }
    return count;
  }

  search(query: string, options: { extensions?: string[]; maxResults?: number; fuzzy?: boolean } = {}): IndexedFile[] {
    const { extensions = [], maxResults = 50, fuzzy = true } = options;
    const lowerQuery = query.toLowerCase();
    
    let results: IndexedFile[] = [];
    
    // Filter by extension first
    if (extensions.length > 0) {
      const extSet = new Set(extensions.map(e => e.startsWith('.') ? e : '.' + e));
      extSet.forEach(ext => {
        const files = this.extensionsIndex.get(ext);
        files?.forEach(path => {
          const file = this.index.get(path);
          if (file) results.push(file);
        });
      });
    } else {
      results = Array.from(this.index.values());
    }
    
    // Filter by query
    results = results.filter(file => {
      if (fuzzy) {
        return file.name.toLowerCase().includes(lowerQuery) || this.fuzzyMatch(file.name, query) > 0.5;
      } else {
        return file.name.toLowerCase().startsWith(lowerQuery);
      }
    });
    
    // Sort
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    return results.slice(0, maxResults);
  }

  private fuzzyMatch(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText.includes(lowerQuery)) return 0.9;
    
    const maxLen = Math.max(text.length, query.length);
    if (maxLen === 0) return 0;
    
    const distance = this.levenshtein(lowerText.substring(0, 20), lowerQuery.substring(0, 20));
    return 1 - (distance / maxLen);
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = 1 + Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]);
        }
      }
    }
    
    return matrix[b.length][a.length];
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