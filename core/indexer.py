import os
import threading
import time
from pathlib import Path
from core.cache import CacheManager

class Indexer:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.cache      = CacheManager()
        self._observers = []
        self._running   = False
        self._lock      = threading.Lock()
        self._last_scan_by_path = {}
        self._initialized = True

    def subscribe(self, callback):
        if callback not in self._observers:
            self._observers.append(callback)

    def _notify(self, event: str, data=None):
        for cb in self._observers:
            cb(event, data)

    def start_scan(self, root_path: str, force: bool = False):
        normalized_path = os.path.normpath(root_path)
        with self._lock:
            if self._running:
                return
            if not force and not self._should_scan(normalized_path):
                self._notify("scan_skip", normalized_path)
                return
            self._running = True
        self._last_scan_by_path[normalized_path] = time.time()
        thread = threading.Thread(target=self._scan, args=(normalized_path,), daemon=True)
        thread.start()

    def _scan(self, root_path: str):
        self._notify("scan_start", root_path)
        try:
            self.cache.clear_path(root_path)
            entries = []
            for dirpath, dirnames, filenames in os.walk(root_path):
                for name in dirnames:
                    full = os.path.join(dirpath, name)
                    entries.append((full, name, "folder", 0, self._mtime(full)))
                for name in filenames:
                    full = os.path.join(dirpath, name)
                    ext  = Path(name).suffix.lower()
                    entries.append((full, name, ext, self._size(full), self._mtime(full)))
                if len(entries) >= 500:
                    self.cache.bulk_insert(entries)
                    entries = []
            if entries:
                self.cache.bulk_insert(entries)
            self._notify("scan_done", root_path)
        except Exception as e:
            self._notify("scan_error", str(e))
        finally:
            with self._lock:
                self._running = False

    def _should_scan(self, root_path: str) -> bool:
        cooldown = 120 if root_path.startswith("\\\\") else 20
        last_scan = self._last_scan_by_path.get(root_path)
        if last_scan is None:
            return True
        return (time.time() - last_scan) >= cooldown

    def _mtime(self, path):
        try:    return os.path.getmtime(path)
        except: return 0.0

    def _size(self, path):
        try:    return os.path.getsize(path)
        except: return 0
