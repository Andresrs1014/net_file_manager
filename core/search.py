from rapidfuzz import process, fuzz
from core.cache import CacheManager

class ExactSearch:
    def __init__(self):
        self.cache = CacheManager()

    def search(self, keyword, ext_filter=None, limit=500):
        return self.cache.search(keyword, ext_filter or "", limit)

class FuzzySearch:
    def __init__(self):
        self.cache = CacheManager()

    def search(self, keyword, ext_filter=None, limit=500, threshold=60):
        all_results = self.cache.search("", ext_filter or "", limit=5000)
        names   = [r[1] for r in all_results]
        matches = process.extract(keyword, names, scorer=fuzz.WRatio, limit=limit)
        matched_names = {match[0] for match in matches if match[1] >= threshold}
        results = [row for row in all_results if row[1] in matched_names]
        return results[:limit]

class SearchEngine:
    def __init__(self):
        self._exact    = ExactSearch()
        self._fuzzy    = FuzzySearch()
        self._strategy = self._exact

    def set_fuzzy(self, enabled: bool):
        self._strategy = self._fuzzy if enabled else self._exact

    def search(self, keyword, ext_filter=None, limit=500):
        if not keyword.strip():
            return []
        return self._strategy.search(keyword, ext_filter=ext_filter, limit=limit)
