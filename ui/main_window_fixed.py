import os
import tkinter as tk
from tkinter import ttk

from ui.file_panel_fixed import FilePanel
from ui.search_bar import SearchBar
from ui.theme import get_theme
from ui.toolbar import Toolbar


class MainWindow(tk.Tk):
    def __init__(self, app_ctrl):
        super().__init__()
        self.app_ctrl = app_ctrl
        self.t = get_theme(app_ctrl.get_theme())

        self.title("NetVault - Gestor de Archivos de Red")
        self.geometry("1300x780")
        self.minsize(900, 600)
        self.configure(bg=self.t["bg_primary"])

        self._build_toolbar()
        self._build_searchbar()
        self._build_content()
        self._build_statusbar()
        self._wire_toolbar()
        self._subscribe_events()

        left_initial = self.app_ctrl.config.get("last_path_left") or os.path.expanduser("~")
        right_initial = self.app_ctrl.config.get("last_path_right") or left_initial
        self._left.navigate(left_initial)
        self._right.navigate(right_initial)

        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_toolbar(self):
        self._toolbar = Toolbar(self, self.app_ctrl, self._on_theme_change)
        self._toolbar.pack(fill="x")

    def _build_searchbar(self):
        self._searchbar = SearchBar(
            self,
            self.app_ctrl,
            on_search=lambda _keyword, _results: None,
            left=self._left if hasattr(self, "_left") else None,
            global_status=getattr(self, "_global_status", None),
        )
        self._searchbar.pack(fill="x", padx=6, pady=(4, 0))

    def _build_content(self):
        content = tk.Frame(self, bg=self.t["bg_primary"])
        content.pack(fill="both", expand=True, padx=6, pady=6)

        sidebar = tk.Frame(content, bg=self.t["toolbar"], width=190)
        sidebar.pack(side="left", fill="y", padx=(0, 4))
        sidebar.pack_propagate(False)

        tk.Label(
            sidebar,
            text="Favoritos",
            bg=self.t["toolbar"],
            fg=self.t["accent"],
            font=("Segoe UI", 9, "bold"),
        ).pack(anchor="w", padx=10, pady=(10, 4))

        self._fav_list = tk.Listbox(
            sidebar,
            bg=self.t["toolbar"],
            fg=self.t["text_primary"],
            selectbackground=self.t["accent"],
            selectforeground="white",
            font=("Segoe UI", 8),
            relief="flat",
            borderwidth=0,
            activestyle="none",
            cursor="hand2",
        )
        self._fav_list.pack(fill="both", expand=True, padx=6)
        self._fav_list.bind("<Double-1>", self._on_fav_click)

        tk.Button(
            sidebar,
            text="Agregar actual",
            bg=self.t["bg_secondary"],
            fg=self.t["text_secondary"],
            font=("Segoe UI", 8),
            relief="flat",
            cursor="hand2",
            pady=4,
            command=self._add_current_fav,
        ).pack(fill="x", padx=6, pady=(4, 2))

        tk.Button(
            sidebar,
            text="Quitar seleccionado",
            bg=self.t["bg_secondary"],
            fg=self.t["text_secondary"],
            font=("Segoe UI", 8),
            relief="flat",
            cursor="hand2",
            pady=4,
            command=self._remove_fav,
        ).pack(fill="x", padx=6, pady=(0, 8))

        paned = ttk.PanedWindow(content, orient="horizontal")
        paned.pack(side="left", fill="both", expand=True)

        self._left = FilePanel(paned, self.app_ctrl, side_label="Panel Izquierdo")
        self._right = FilePanel(paned, self.app_ctrl, side_label="Panel Derecho")

        paned.add(self._left, weight=1)
        paned.add(self._right, weight=1)
        self._load_favorites()

    def _build_statusbar(self):
        self._global_status = tk.StringVar(value="  NetVault listo.")
        tk.Label(
            self,
            textvariable=self._global_status,
            bg=self.t["toolbar"],
            fg=self.t["text_secondary"],
            font=("Segoe UI", 8),
            anchor="w",
        ).pack(fill="x", side="bottom")

    def _wire_toolbar(self):
        if hasattr(self, "_searchbar"):
            self._searchbar._left = self._left
            self._searchbar._global_status = self._global_status

        self._toolbar.wire(
            {
                "AtrÃ¡s": self._left.go_back,
                "Adelante": self._left.go_forward,
                "Subir": self._left.go_up,
                "Reindexar": lambda: self.app_ctrl.start_index(self._left._current),
                "Nueva carpeta": self._left._new_folder,
                "Nuevo archivo": self._left._new_file,
                "Cortar": self._left._cut_selected,
                "Copiar": self._left._copy_selected,
                "Pegar": self._left._paste_here,
                "Eliminar": lambda: self._left._delete_selected(False),
                "Deshacer": self.app_ctrl.file_ctrl.undo,
            }
        )

    def _subscribe_events(self):
        def on_event(event, data):
            if event == "scan_start":
                self.after(0, lambda: self._global_status.set(f"  Indexando: {data}"))
            elif event == "scan_done":
                self.after(0, lambda: self._global_status.set(f"  Indice actualizado: {data}"))
            elif event == "scan_error":
                self.after(0, lambda: self._global_status.set(f"  Error de indice: {data}"))

        self.app_ctrl.subscribe_indexer(on_event)

    def _load_favorites(self):
        self._fav_list.delete(0, "end")
        for fav in self.app_ctrl.get_favorites():
            self._fav_list.insert("end", f"  {fav}")

    def _on_fav_click(self, _event):
        selection = self._fav_list.curselection()
        if selection:
            path = self._fav_list.get(selection[0]).strip()
            self._left.navigate(path)

    def _add_current_fav(self):
        if self._left._current:
            self.app_ctrl.add_favorite(self._left._current)
            self._load_favorites()

    def _remove_fav(self):
        selection = self._fav_list.curselection()
        if selection:
            path = self._fav_list.get(selection[0]).strip()
            self.app_ctrl.remove_favorite(path)
            self._load_favorites()

    def _on_theme_change(self, _new_theme):
        self.after(0, self._rebuild_window)

    def _rebuild_window(self):
        self._persist_paths()
        self.destroy()
        new_window = MainWindow(self.app_ctrl)
        new_window.run()

    def _persist_paths(self):
        self.app_ctrl.config["last_path_left"] = self._left._current
        self.app_ctrl.config["last_path_right"] = self._right._current
        self.app_ctrl.save_config()

    def _on_close(self):
        self._persist_paths()
        self.destroy()

    def run(self):
        self.mainloop()
