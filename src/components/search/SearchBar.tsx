import { useState, useEffect, useCallback, useRef } from 'react';
import { searchService, debounce } from '../../services/searchService';

interface SearchResult {
  entry: { name: string; path: string; isDirectory: boolean; isFile: boolean; size?: number };
  score: number;
  source: 'index' | 'ai';
}

interface SearchBarProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  currentPath?: string;
}

export function SearchBar({ onResultSelect, placeholder = 'Buscar archivos...', currentPath }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [fuzzyEnabled, setFuzzyEnabled] = useState(true);
  const [extensionFilter, setExtensionFilter] = useState('');
  const [indexStatus, setIndexStatus] = useState<{ files: number; dirs: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateStats = () => {
      const stats = searchService.getStats();
      setIndexStatus({ files: stats.totalFiles, dirs: stats.totalDirs });
    };
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      const searchResults = searchService.search(searchQuery, {
        fuzzy: fuzzyEnabled,
        extensions: extensionFilter ? [extensionFilter] : undefined,
        maxResults: 20,
      });
      
      setResults(searchResults);
      setIsSearching(false);
    }, 50),
    [fuzzyEnabled, extensionFilter]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    onResultSelect?.(result);
    setShowResults(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && results.length > 0) {
      handleResultClick(results[0]);
    }
  };

  const handleReindex = async () => {
    if (!currentPath) return;
    setIsSearching(true);
    searchService.clear();
    setResults([]);
    try {
      await searchService.indexDirectory(currentPath);
    } catch {
      // Ignore errors
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded focus-within:border-[var(--accent)] overflow-hidden">
        <span className="pl-2.5 shrink-0 text-[var(--text-muted)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-2 py-1.5 bg-transparent text-[var(--text-primary)] outline-none text-[13px] placeholder-[var(--text-muted)]"
        />
        
        {extensionFilter && (
          <span className="px-2 py-1 text-xs bg-[#333] text-[#a3a3a3] rounded mx-1">
            {extensionFilter}
          </span>
        )}
        
        <button
          onClick={() => setExtensionFilter(extensionFilter ? '' : '.')}
          className={`px-2 py-1 text-xs border-l border-[#404040] transition-colors mx-0.5 ${
            extensionFilter ? 'text-[#3b82f6]' : 'text-[#737373] hover:text-[#e5e5e5]'
          }`}
          title="Filtrar por extensión"
        >
          .ext
        </button>

        <button
          onClick={() => setFuzzyEnabled(!fuzzyEnabled)}
          className={`px-2 py-1 text-xs border-l border-[#404040] transition-colors mx-0.5 ${
            fuzzyEnabled ? 'text-[#3b82f6]' : 'text-[#737373] hover:text-[#e5e5e5]'
          }`}
          title="Búsqueda difusa"
        >
          ~ fuzzy
        </button>

        {isSearching && (
          <div className="px-3 py-1">
            <div className="w-4 h-4 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="px-2 py-1 text-[#737373] hover:text-[#e5e5e5] transition-colors mx-0.5"
          >
            ×
          </button>
        )}
        
        {indexStatus && (
          <span className="px-2 py-1 text-xs text-[#737373] border-l border-[#404040] mx-0.5" title={`${indexStatus.files} archivos`}>
            📇 {indexStatus.files}
          </span>
        )}
        
        <button
          onClick={handleReindex}
          className="px-2 py-1 text-[#737373] hover:text-[#e5e5e5] transition-colors mx-1"
          title="Reindexar"
        >
          ↻
        </button>
      </div>

      {showResults && query.trim() && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded shadow-xl z-50 max-h-[280px] overflow-auto"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-muted)] text-xs">
              {isSearching ? 'Buscando…' : 'Sin resultados.'}
            </div>
          ) : (
            <div className="py-1">
              {results.map((result) => (
                <button
                  key={result.entry.path}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-3 py-1.5 text-left hover:bg-[var(--bg-hover)] flex items-center gap-2 transition-colors duration-100"
                >
                  <span className="text-[var(--accent)] shrink-0">
                    {result.entry.isDirectory
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    }
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[var(--text-primary)] truncate">{result.entry.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">{result.entry.path}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="px-3 py-1.5 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex justify-between">
            <span>{results.length} resultados</span>
            <span className="font-mono">↑↓ · ↵</span>
          </div>
        </div>
      )}
    </div>
  );
}