import sqlite3
from pathlib import Path

DB_PATH = Path.home() / ".netvault_cache.db"

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
        self.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self._create_table()
        self._initialized = True

    def _create_table(self):
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
        params = [f"%{keyword}%"]
        if ext_filter:
            query += " AND type = ?"
            params.append(ext_filter)
        query += f" LIMIT {limit}"
        return self.conn.execute(query, params).fetchall()

    def clear_path(self, root_path: str):
        self.conn.execute("DELETE FROM files WHERE path LIKE ?", (f"{root_path}%",))
        self.conn.commit()

    def close(self):
        self.conn.close()
