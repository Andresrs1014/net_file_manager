from rapidfuzz import process, fuzz
from core.cache import CacheManager

class ExactSearch:
    def __init__(self):
        self.cache = CacheManager()

    def search(self, keyword, ext_filter=None, limit=500):
        return self.cache.search(keyword, str(ext_filter), limit)

class FuzzySearch:
    def __init__(self):
        self.cache = CacheManager()

    def search(self, keyword, ext_filter=None, limit=500, threshold=60):
        all_results = self.cache.search("", str(ext_filter), limit=5000)
        names   = [r[1] for r in all_results]
        matches = process.extract(keyword, names, scorer=fuzz.WRatio, limit=limit)
        matched = {m[0] for m in matches if m[1] >= threshold}
        return [r for r in all_results if r[1] in matched]

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
