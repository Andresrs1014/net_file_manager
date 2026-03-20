import tkinter as tk
from ui.theme import get_theme

class SearchBar(tk.Frame):
    def __init__(self, parent, app_ctrl, on_search, **kwargs):
        self.t = get_theme(app_ctrl.get_theme())
        super().__init__(parent, bg=self.t["bg_primary"],
                         height=44, **kwargs)
        self.pack_propagate(False)
        self.app_ctrl  = app_ctrl
        self.on_search = on_search
        self._build()

    def _build(self):
        t = self.t

        tk.Label(
            self, text="🔍", bg=t["bg_primary"],
            fg=t["accent"], font=("Segoe UI", 14)
        ).pack(side="left", padx=(8, 2))

        self._search_var = tk.StringVar()
        self._entry = tk.Entry(
            self, textvariable=self._search_var,
            bg=t["bg_secondary"], fg=t["text_primary"],
            insertbackground=t["accent"],
            font=("Segoe UI", 11), relief="flat",
            highlightthickness=1,
            highlightbackground=t["border"],
            highlightcolor=t["accent"]
        )
        self._entry.pack(side="left", fill="x", expand=True,
                         ipady=5, pady=6)
        self._search_var.trace_add("write", lambda *_: self._on_change())

        # Filtro por extensión
        tk.Label(
            self, text="Ext:", bg=t["bg_primary"],
            fg=t["text_secondary"], font=("Segoe UI", 9)
        ).pack(side="left", padx=(10, 2))

        self._ext_var = tk.StringVar()
        tk.Entry(
            self, textvariable=self._ext_var,
            bg=t["bg_secondary"], fg=t["text_primary"],
            font=("Segoe UI", 10), relief="flat", width=7,
            insertbackground=t["accent"]
        ).pack(side="left", padx=(0, 8))
        self._ext_var.trace_add("write", lambda *_: self._on_change())

        # Toggle fuzzy
        self._fuzzy_var = tk.BooleanVar(value=False)
        tk.Checkbutton(
            self, text="Fuzzy", variable=self._fuzzy_var,
            command=self._on_change,
            bg=t["bg_primary"], fg=t["text_secondary"],
            selectcolor=t["bg_secondary"],
            activebackground=t["bg_primary"],
            font=("Segoe UI", 9), relief="flat", cursor="hand2"
        ).pack(side="left", padx=(0, 8))

        # Botón limpiar
        tk.Button(
            self, text="✕", bg=t["bg_secondary"],
            fg=t["text_secondary"], font=("Segoe UI", 9),
            relief="flat", cursor="hand2", padx=6, pady=4,
            command=self.clear
        ).pack(side="left", padx=(0, 8))

    def _on_change(self):
        keyword = self._search_var.get()
        ext     = self._ext_var.get().strip().lower()
        ext_filter = (
            f".{ext}" if ext and not ext.startswith(".") else (ext or None)
        )
        self.app_ctrl.search_ctrl.toggle_fuzzy(self._fuzzy_var.get())
        results = self.app_ctrl.search_ctrl.search(
            keyword, ext_filter=ext_filter
        )
        self.on_search(keyword, results)

    def clear(self):
        self._search_var.set("")
        self._ext_var.set("")
        self._fuzzy_var.set(False)

    def get_keyword(self):
        return self._search_var.get()
