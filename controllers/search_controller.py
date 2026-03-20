from core.search import SearchEngine

class SearchController:
    def __init__(self):
        self.engine        = SearchEngine()
        self._last_results = []
        self._last_query   = None

    def toggle_fuzzy(self, enabled: bool):
        self.engine.set_fuzzy(enabled)

    def search(self, keyword: str, ext_filter=None, limit: int = 500):
        query = (keyword, ext_filter, limit, type(self.engine._strategy).__name__)
        if query == self._last_query:
            return self._last_results
        self._last_results = self.engine.search(
            keyword, ext_filter=ext_filter, limit=limit
        )
        self._last_query = query
        return self._last_results

    def get_last_results(self):
        return self._last_results
