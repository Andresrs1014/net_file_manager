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
}

export function SearchBar({ onResultSelect, placeholder = 'Buscar archivos...' }: SearchBarProps) {
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
    setIsSearching(true);
    searchService.clear();
    setResults([]);
    setIsSearching(false);
  };

  return (
    <div className="relative flex-1 max-w-md">
      <div className="flex items-center bg-[#1a1a1a] border border-[#404040] rounded focus-within:border-[#3b82f6] transition-colors">
        <span className="pl-3 text-[#737373]">🔍</span>
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
          className="flex-1 px-3 py-2 bg-transparent text-[#e5e5e5] outline-none text-sm placeholder-[#737373]"
        />
        
        <button
          onClick={() => setFuzzyEnabled(!fuzzyEnabled)}
          className={`px-2 py-1 text-xs border-l border-[#404040] transition-colors ${
            fuzzyEnabled ? 'text-[#3b82f6]' : 'text-[#737373] hover:text-[#e5e5e5]'
          }`}
          title="Búsqueda difusa"
        >
          ~ fuzzy
        </button>

        {isSearching && (
          <div className="px-3">
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
            className="px-2 text-[#737373] hover:text-[#e5e5e5] transition-colors"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex items-center mt-1 gap-2">
        <span className="text-xs text-[#737373]">Ext:</span>
        <input
          type="text"
          value={extensionFilter}
          onChange={(e) => setExtensionFilter(e.target.value)}
          placeholder=".pdf, .ts"
          className="px-2 py-0.5 text-xs bg-[#1a1a1a] border border-[#404040] rounded text-[#a3a3a3] outline-none focus:border-[#3b82f6] w-24"
        />
        
        {indexStatus && (
          <span className="text-xs text-[#737373]" title={`${indexStatus.files} archivos`}>
            📇 {indexStatus.files}
          </span>
        )}
        
        <button
          onClick={handleReindex}
          className="text-xs text-[#737373] hover:text-[#e5e5e5] transition-colors ml-2"
          title="Reindexar"
        >
          ↻
        </button>
      </div>

      {showResults && query.trim() && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#404040] rounded shadow-xl z-50 max-h-[300px] overflow-auto"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-[#737373]">
              {isSearching ? 'Buscando...' : 'Sin resultados. Presiona "Indexar".'}
            </div>
          ) : (
            <div className="py-1">
              {results.map((result) => (
                <button
                  key={result.entry.path}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-3 py-2 text-left hover:bg-[#333] flex items-center gap-2 transition-colors"
                >
                  <span className="text-base">{result.entry.isDirectory ? '📁' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#e5e5e5] truncate">{result.entry.name}</div>
                    <div className="text-xs text-[#737373] truncate">{result.entry.path}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          <div className="px-3 py-2 border-t border-[#333] text-xs text-[#737373] flex justify-between">
            <span>{results.length} resultados · Ultra-fast 🔥</span>
            <span>↑↓ Navegar · Enter</span>
          </div>
        </div>
      )}
    </div>
  );
}