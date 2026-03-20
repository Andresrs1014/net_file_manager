import os
import tkinter as tk
from tkinter import ttk
from ui.theme import get_theme
from ui.file_panel import FilePanel

class MainWindow(tk.Tk):
    def __init__(self, app_ctrl):
        super().__init__()
        self.app_ctrl = app_ctrl
        self.t        = get_theme(app_ctrl.get_theme())

        self.title("NetVault — Gestor de Archivos de Red")
        self.geometry("1300x780")
        self.minsize(900, 600)
        self.configure(bg=self.t["bg_primary"])

        self._build_toolbar()
        self._build_searchbar()
        self._build_content()
        self._build_statusbar()
        self._wire_toolbar()
        self._subscribe_events()

        initial = self.app_ctrl.config.get("last_path_left") or os.path.expanduser("~")
        self._left.navigate(initial)
        self._right.navigate(initial)

    # ── Toolbar ─────────────────────────────────────────
    def _build_toolbar(self):
        t = self.t
        self._toolbar = tk.Frame(self, bg=t["toolbar"], height=46)
        self._toolbar.pack(fill="x")
        self._toolbar.pack_propagate(False)

        btn_cfg = dict(
        bg=t["bg_secondary"], fg=t["text_primary"],
        font=("Segoe UI", 9), relief="flat",
        activebackground=t["accent"], activeforeground="white",
        cursor="hand2", padx=10, pady=8, bd=0
        )

        self._tb_buttons = {}
        buttons = [
            ("⬅",  "Atrás"),
            ("➡",  "Adelante"),
            ("⬆",  "Subir"),
            ("⟳",  "Reindexar"),
            ("📁", "Nueva carpeta"),
            ("📄", "Nuevo archivo"),
            ("✂",  "Cortar"),
            ("⎘",  "Copiar"),
            ("📋", "Pegar"),
            ("🗑",  "Eliminar"),
            ("↩",  "Deshacer"),
        ]

        for icon, key in buttons:
            b = tk.Button(
                self._toolbar,
                text=f" {icon}  {key} ",
                bg=str(t["bg_secondary"]),
                fg=str(t["text_primary"]),
                font=("Segoe UI", 9),
                relief="flat",
                activebackground=str(t["accent"]),
                activeforeground="white",
                cursor="hand2",
                bd=0
            )
            b.pack(side="left", padx=10, pady=8)

        lbl = "🌙  Dark" if self.app_ctrl.get_theme() == "dark" else "☀  Light"
        self._toggle_lbl = tk.StringVar(value=lbl)
        tk.Button(
            self._toolbar, textvariable=self._toggle_lbl,
            command=self._toggle_theme,
            bg=t["accent"], fg="white",
            font=("Segoe UI", 9, "bold"), relief="flat",
            cursor="hand2", padx=12, pady=8, bd=0
        ).pack(side="right", padx=10, pady=5)

    def _wire_toolbar(self):
        actions = {
            "Atrás":         self._left.go_back,
            "Adelante":      self._left.go_forward,
            "Subir":         self._left.go_up,
            "Reindexar":     lambda: self.app_ctrl.start_index(self._left._current),
            "Nueva carpeta": self._left._new_folder,
            "Nuevo archivo": self._left._new_file,
            "Cortar":        self._left._cut_selected,
            "Copiar":        self._left._copy_selected,
            "Pegar":         self._left._paste_here,
            "Eliminar":      lambda: self._left._delete_selected(False),
            "Deshacer":      self.app_ctrl.file_ctrl.undo,
        }
        for key, cmd in actions.items():
            if key in self._tb_buttons:
                self._tb_buttons[key].config(command=cmd)

    # ── Barra de búsqueda ───────────────────────────────
    def _build_searchbar(self):
        t   = self.t
        bar = tk.Frame(self, bg=t["bg_primary"], height=44)
        bar.pack(fill="x", padx=6, pady=(4, 0))
        bar.pack_propagate(False)

        tk.Label(bar, text="🔍", bg=t["bg_primary"],
                 fg=t["accent"], font=("Segoe UI", 14)
                 ).pack(side="left", padx=(8, 2))

        self._search_var = tk.StringVar()
        tk.Entry(
            bar, textvariable=self._search_var,
            bg=t["bg_secondary"], fg=t["text_primary"],
            insertbackground=t["accent"],
            font=("Segoe UI", 11), relief="flat",
            highlightthickness=1,
            highlightbackground=t["border"],
            highlightcolor=t["accent"]
        ).pack(side="left", fill="x", expand=True, ipady=5, pady=6)

        self._search_var.trace_add("write", lambda *_: self._on_search())

        tk.Label(bar, text="Ext:", bg=t["bg_primary"],
                 fg=t["text_secondary"], font=("Segoe UI", 9)
                 ).pack(side="left", padx=(10, 2))

        self._ext_var = tk.StringVar()
        tk.Entry(
            bar, textvariable=self._ext_var,
            bg=t["bg_secondary"], fg=t["text_primary"],
            font=("Segoe UI", 10), relief="flat", width=7,
            insertbackground=t["accent"]
        ).pack(side="left", padx=(0, 8))

        self._fuzzy_var = tk.BooleanVar(value=False)
        tk.Checkbutton(
            bar, text="Fuzzy", variable=self._fuzzy_var,
            command=self._on_search,
            bg=t["bg_primary"], fg=t["text_secondary"],
            selectcolor=t["bg_secondary"],
            activebackground=t["bg_primary"],
            font=("Segoe UI", 9), relief="flat", cursor="hand2"
        ).pack(side="left", padx=(0, 8))

    def _on_search(self):
        keyword = self._search_var.get()
        ext     = self._ext_var.get().strip().lower()
        ext_filter = f".{ext}" if ext and not ext.startswith(".") else (ext or None)
        self.app_ctrl.search_ctrl.toggle_fuzzy(self._fuzzy_var.get())
        results = self.app_ctrl.search_ctrl.search(keyword, ext_filter=ext_filter)
        if keyword.strip():
            self._left.load_search_results(results)
            self._global_status.set(f"  🔍 {len(results)} resultados para '{keyword}'")
        else:
            self._left.refresh()
            self._global_status.set("  NetVault listo.")

    # ── Contenido ───────────────────────────────────────
    def _build_content(self):
        t       = self.t
        content = tk.Frame(self, bg=t["bg_primary"])
        content.pack(fill="both", expand=True, padx=6, pady=6)

        # Sidebar favoritos
        sidebar = tk.Frame(content, bg=t["toolbar"], width=175)
        sidebar.pack(side="left", fill="y", padx=(0, 4))
        sidebar.pack_propagate(False)

        tk.Label(sidebar, text="⭐  Favoritos", bg=t["toolbar"],
                 fg=t["accent"], font=("Segoe UI", 9, "bold")
                 ).pack(anchor="w", padx=10, pady=(10, 4))

        self._fav_list = tk.Listbox(
            sidebar, bg=t["toolbar"], fg=t["text_primary"],
            selectbackground=t["accent"], selectforeground="white",
            font=("Segoe UI", 8), relief="flat", borderwidth=0,
            activestyle="none", cursor="hand2"
        )
        self._fav_list.pack(fill="both", expand=True, padx=6)
        self._fav_list.bind("<Double-1>", self._on_fav_click)

        tk.Button(
            sidebar, text="＋ Agregar actual",
            bg=t["bg_secondary"], fg=t["text_secondary"],
            font=("Segoe UI", 8), relief="flat",
            cursor="hand2", pady=4,
            command=self._add_current_fav
        ).pack(fill="x", padx=6, pady=(4, 2))

        tk.Button(
            sidebar, text="✕ Quitar seleccionado",
            bg=t["bg_secondary"], fg=t["text_secondary"],
            font=("Segoe UI", 8), relief="flat",
            cursor="hand2", pady=4,
            command=self._remove_fav
        ).pack(fill="x", padx=6, pady=(0, 8))

        self._load_favorites()

        # Paneles duales
        paned = ttk.PanedWindow(content, orient="horizontal")
        paned.pack(side="left", fill="both", expand=True)

        self._left  = FilePanel(paned, self.app_ctrl, side_label="◀  Panel Izquierdo")
        self._right = FilePanel(paned, self.app_ctrl, side_label="Panel Derecho  ▶")

        paned.add(self._left,  weight=1)
        paned.add(self._right, weight=1)

    # ── Status bar ──────────────────────────────────────
    def _build_statusbar(self):
        t = self.t
        self._global_status = tk.StringVar(value="  NetVault listo.")
        tk.Label(
            self, textvariable=self._global_status,
            bg=t["toolbar"], fg=t["text_secondary"],
            font=("Segoe UI", 8), anchor="w"
        ).pack(fill="x", side="bottom")

    # ── Favoritos ───────────────────────────────────────
    def _load_favorites(self):
        self._fav_list.delete(0, "end")
        for fav in self.app_ctrl.get_favorites():
            self._fav_list.insert("end", f"  {fav}")

    def _on_fav_click(self, event):
        sel = self._fav_list.curselection()
        if sel:
            path = self._fav_list.get(sel[0]).strip()
            self._left.navigate(path)

    def _add_current_fav(self):
        if self._left._current:
            self.app_ctrl.add_favorite(self._left._current)
            self._load_favorites()

    def _remove_fav(self):
        sel = self._fav_list.curselection()
        if sel:
            path = self._fav_list.get(sel[0]).strip()
            self.app_ctrl.remove_favorite(path)
            self._load_favorites()

    # ── Tema ────────────────────────────────────────────
    def _toggle_theme(self):
        new = self.app_ctrl.toggle_theme()
        self._toggle_lbl.set("🌙  Dark" if new == "dark" else "☀  Light")
        self._global_status.set(
            "  Tema cambiado. Reinicia la app para aplicarlo completamente."
        )

    # ── Indexer events ──────────────────────────────────
    def _subscribe_events(self):
        def on_event(event, data):
            if event == "scan_start":
                self.after(0, lambda: self._global_status.set(f"  ⟳ Indexando: {data}"))
            elif event == "scan_done":
                self.after(0, lambda: self._global_status.set(f"  ✅ Índice actualizado: {data}"))
            elif event == "scan_error":
                self.after(0, lambda: self._global_status.set(f"  ⚠ Error de índice: {data}"))
        self.app_ctrl.subscribe_indexer(on_event)

    def run(self):
        self.mainloop()
