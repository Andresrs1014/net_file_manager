import { useState, useEffect, useCallback, useRef } from 'react';
import { searchService, debounce, SearchResult } from '../../services/searchService';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const searchResults = await searchService.search(searchQuery, {
          fuzzy: fuzzyEnabled,
          extension: extensionFilter || undefined,
          maxResults: 20,
        });
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [fuzzyEnabled, extensionFilter]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Handle click outside to close results
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

  return (
    <div className="relative flex-1 max-w-md">
      {/* Search input */}
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
        
        {/* Fuzzy toggle */}
        <button
          onClick={() => setFuzzyEnabled(!fuzzyEnabled)}
          className={`px-2 py-1 text-xs border-l border-[#404040] transition-colors ${
            fuzzyEnabled ? 'text-[#3b82f6]' : 'text-[#737373] hover:text-[#e5e5e5]'
          }`}
          title="Búsqueda difusa"
        >
          ~ fuzzy
        </button>

        {/* Loading indicator */}
        {isSearching && (
          <div className="px-3">
            <div className="w-4 h-4 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Clear button */}
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

      {/* Extension filter */}
      <div className="flex items-center mt-1 gap-2">
        <span className="text-xs text-[#737373]">Ext:</span>
        <input
          type="text"
          value={extensionFilter}
          onChange={(e) => setExtensionFilter(e.target.value)}
          placeholder=".pdf, .ts, etc."
          className="px-2 py-0.5 text-xs bg-[#1a1a1a] border border-[#404040] rounded text-[#a3a3a3] outline-none focus:border-[#3b82f6]"
        />
      </div>

      {/* Results dropdown */}
      {showResults && query.trim() && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#404040] rounded shadow-xl z-50 max-h-[300px] overflow-auto"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-[#737373]">
              {isSearching ? 'Buscando...' : 'No se encontraron resultados'}
            </div>
          ) : (
            <div className="py-1">
              {results.map((result) => (
                <button
                  key={result.entry.path}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-3 py-2 text-left hover:bg-[#333] flex items-center gap-2 transition-colors"
                >
                  <span className="text-base">
                    {result.entry.isDirectory ? '📁' : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#e5e5e5] truncate">{result.entry.name}</div>
                    <div className="text-xs text-[#737373] truncate">{result.entry.path}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Footer */}
          <div className="px-3 py-2 border-t border-[#333] text-xs text-[#737373] flex justify-between">
            <span>{results.length} resultados</span>
            <span>↑↓ Navegar · Enter Seleccionar · Esc Cerrar</span>
          </div>
        </div>
      )}
    </div>
  );
}