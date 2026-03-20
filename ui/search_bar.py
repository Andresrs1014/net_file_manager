import tkinter as tk

from ui.theme import get_theme


class SearchBar(tk.Frame):
    def __init__(self, parent, app_ctrl, on_search, left=None, global_status=None, **kwargs):
        self.t = get_theme(app_ctrl.get_theme())
        super().__init__(parent, bg=self.t["bg_primary"], height=44, **kwargs)
        self.pack_propagate(False)
        self.app_ctrl = app_ctrl
        self.on_search = on_search
        self._left = left
        self._global_status = global_status
        self._search_job = None
        self._build()

    def _build(self):
        t = self.t

        tk.Label(
            self,
            text="Search",
            bg=t["bg_primary"],
            fg=t["accent"],
            font=("Segoe UI", 11, "bold"),
        ).pack(side="left", padx=(8, 6))

        self._search_var = tk.StringVar()
        self._entry = tk.Entry(
            self,
            textvariable=self._search_var,
            bg=t["bg_secondary"],
            fg=t["text_primary"],
            insertbackground=t["accent"],
            font=("Segoe UI", 11),
            relief="flat",
            highlightthickness=1,
            highlightbackground=t["border"],
            highlightcolor=t["accent"],
        )
        self._entry.pack(side="left", fill="x", expand=True, ipady=5, pady=6)
        self._entry.bind("<KeyRelease>", lambda _event: self._schedule_search())

        tk.Label(
            self,
            text="Ext:",
            bg=t["bg_primary"],
            fg=t["text_secondary"],
            font=("Segoe UI", 9),
        ).pack(side="left", padx=(10, 2))

        self._ext_var = tk.StringVar()
        tk.Entry(
            self,
            textvariable=self._ext_var,
            bg=t["bg_secondary"],
            fg=t["text_primary"],
            font=("Segoe UI", 10),
            relief="flat",
            width=7,
            insertbackground=t["accent"],
        ).pack(side="left", padx=(0, 8))
        self._ext_var.trace_add("write", lambda *_: self._schedule_search())

        self._fuzzy_var = tk.BooleanVar(value=False)
        tk.Checkbutton(
            self,
            text="Fuzzy",
            variable=self._fuzzy_var,
            command=self._run_search_immediately,
            bg=t["bg_primary"],
            fg=t["text_secondary"],
            selectcolor=t["bg_secondary"],
            activebackground=t["bg_primary"],
            font=("Segoe UI", 9),
            relief="flat",
            cursor="hand2",
        ).pack(side="left", padx=(0, 8))

        tk.Button(
            self,
            text="Clear",
            bg=t["bg_secondary"],
            fg=t["text_secondary"],
            font=("Segoe UI", 9),
            relief="flat",
            cursor="hand2",
            padx=6,
            pady=4,
            command=self.clear,
        ).pack(side="left", padx=(0, 8))

    def _normalized_ext_filter(self):
        ext = self._ext_var.get().strip().lower()
        if not ext:
            return None
        return ext if ext.startswith(".") else f".{ext}"

    def _schedule_search(self):
        if self._search_job is not None:
            self.after_cancel(self._search_job)
        self._search_job = self.after(220, self._run_search_immediately)

    def _run_search_immediately(self):
        if self._search_job is not None:
            self.after_cancel(self._search_job)
            self._search_job = None
        self._run_search(update_left=True)

    def _run_search(self, update_left=False):
        keyword = self._search_var.get()
        ext_filter = self._normalized_ext_filter()

        self.app_ctrl.search_ctrl.toggle_fuzzy(self._fuzzy_var.get())
        results = self.app_ctrl.search_ctrl.search(keyword, ext_filter=ext_filter)

        if callable(self.on_search):
            self.on_search(keyword, results)

        if not update_left:
            return

        if keyword.strip():
            if self._left is not None:
                self._left.load_search_results(results)
            if self._global_status is not None:
                self._global_status.set(f"  Search: {len(results)} results for '{keyword}'")
        else:
            if self._left is not None:
                self._left.refresh()
            if self._global_status is not None:
                self._global_status.set("  NetVault ready.")

    def clear(self):
        self._search_var.set("")
        self._ext_var.set("")
        self._fuzzy_var.set(False)
        self._run_search_immediately()

    def get_keyword(self):
        return self._search_var.get()
