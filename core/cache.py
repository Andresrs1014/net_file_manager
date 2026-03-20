import os
import sqlite3
from pathlib import Path


def _candidate_db_paths() -> list[Path | None]:
    candidates: list[Path | None] = []
    local_appdata = os.getenv("LOCALAPPDATA")
    if local_appdata:
        candidates.append(Path(local_appdata) / "NetVault" / "cache.db")
    candidates.append(Path.home() / ".netvault" / "cache.db")
    candidates.append(Path.cwd() / ".netvault" / "cache.db")
    candidates.append(None)
    return candidates


def _connect_writable() -> tuple[sqlite3.Connection, str]:
    last_error = None
    for db_path in _candidate_db_paths():
        try:
            if db_path is None:
                conn = sqlite3.connect(":memory:", check_same_thread=False)
                return conn, ":memory:"
            db_path.parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(str(db_path), check_same_thread=False)
            conn.execute("CREATE TABLE IF NOT EXISTS __write_test (id INTEGER PRIMARY KEY)")
            conn.execute("DROP TABLE __write_test")
            conn.commit()
            return conn, str(db_path)
        except Exception as exc:
            last_error = exc
    raise sqlite3.OperationalError(f"unable to open writable database file: {last_error}")


DB_PATH = _candidate_db_paths()[0]

class CacheManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.conn, self.db_path = _connect_writable()
        self._create_table()
        self._initialized = True

    def _create_table(self):
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                path  TEXT UNIQUE,
                name  TEXT,
                type  TEXT,
                size  INTEGER,
                mtime REAL
            )
        """)
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_name ON files(name)")
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_type ON files(type)")
        self.conn.commit()

    def bulk_insert(self, entries: list):
        self.conn.executemany("""
            INSERT OR REPLACE INTO files (path, name, type, size, mtime)
            VALUES (?, ?, ?, ?, ?)
        """, entries)
        self.conn.commit()

    def search(self, keyword: str, ext_filter: str = "", limit: int = 500):
        query = "SELECT path, name, type, size, mtime FROM files WHERE name LIKE ?"
        params: list[object] = [f"%{keyword}%"]
        if ext_filter:
            query += " AND type = ?"
            params.append(ext_filter)
        query += " ORDER BY name COLLATE NOCASE LIMIT ?"
        params.append(max(1, int(limit)))
        return self.conn.execute(query, params).fetchall()

    def clear_path(self, root_path: str):
        self.conn.execute("DELETE FROM files WHERE path LIKE ?", (f"{root_path}%",))
        self.conn.commit()

    def close(self):
        self.conn.close()
