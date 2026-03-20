import json
from pathlib import Path
from core.indexer import Indexer
from controllers.file_controller import FileController
from controllers.search_controller import SearchController

CONFIG_PATH = Path(__file__).parent.parent / "config.json"

DEFAULT_CONFIG = {
    "network_paths":  [],
    "favorites":      [],
    "theme":          "dark",
    "last_path_left": "",
    "last_path_right": ""
}

class AppController:
    def __init__(self):
        self.config      = self._load_config()
        self.indexer     = Indexer()
        self.file_ctrl   = FileController()
        self.search_ctrl = SearchController()

    def _load_config(self):
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return {**DEFAULT_CONFIG, **json.load(f)}
        return DEFAULT_CONFIG.copy()

    def save_config(self):
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)

    def start_index(self, path: str):
        self.indexer.start_scan(path)

    def subscribe_indexer(self, callback):
        self.indexer.subscribe(callback)

    def get_theme(self):
        return self.config.get("theme", "dark")

    def toggle_theme(self):
        self.config["theme"] = (
            "light" if self.config["theme"] == "dark" else "dark"
        )
        self.save_config()
        return self.config["theme"]

    def get_favorites(self):
        return self.config.get("favorites", [])

    def add_favorite(self, path: str):
        favs = self.config.setdefault("favorites", [])
        if path not in favs:
            favs.append(path)
            self.save_config()

    def remove_favorite(self, path: str):
        favs = self.config.get("favorites", [])
        if path in favs:
            favs.remove(path)
            self.save_config()
