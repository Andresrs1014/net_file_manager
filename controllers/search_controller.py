from core.search import SearchEngine

class SearchController:
    def __init__(self):
        self.engine        = SearchEngine()
        self._last_results = []

    def toggle_fuzzy(self, enabled: bool):
        self.engine.set_fuzzy(enabled)

    def search(self, keyword: str, ext_filter=None, limit: int = 500):
        self._last_results = self.engine.search(
            keyword, ext_filter=ext_filter, limit=limit
        )
        return self._last_results

    def get_last_results(self):
        return self._last_results
