import os
import tkinter as tk
from tkinter import ttk

from ui.file_panel import FilePanel
from ui.search_bar import SearchBar
from ui.terminal_panel import TerminalPanel
from ui.theme import get_theme
from ui.toolbar import Toolbar


class MainWindow(tk.Tk):
    def __init__(self, app_ctrl):
        super().__init__()
        self.app_ctrl = app_ctrl
        self.t = get_theme(app_ctrl.get_theme())

        self.title("NetVault - Gestor de Archivos de Red")
        self.minsize(980, 620)
        self.configure(bg=self.t["bg_primary"])
        self._set_initial_window_size()

        self._terminal_visible = False

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

    def _set_initial_window_size(self):
        self.update_idletasks()
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()

        width = min(1720, max(1100, int(screen_w * 0.88)))
        height = min(960, max(700, int(screen_h * 0.84)))

        x = max(0, (screen_w - width) // 2)
        y = max(0, (screen_h - height) // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")

    def _build_toolbar(self):
        self._toolbar = Toolbar(
            self,
            self.app_ctrl,
            self._on_theme_change,
            on_terminal_toggle=self._toggle_terminal,
        )
        self._toolbar.pack(fill="x")

    def _build_searchbar(self):
        self._searchbar = SearchBar(
            self,
            self.app_ctrl,
            on_search=lambda _keyword, _results: None,
            left=None,
            global_status=None,
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

        self._paned = ttk.PanedWindow(content, orient="horizontal")
        self._paned.pack(side="left", fill="both", expand=True)

        self._left = FilePanel(self._paned, self.app_ctrl, side_label="Panel Izquierdo")
        self._right = FilePanel(self._paned, self.app_ctrl, side_label="Panel Derecho")
        self._terminal = TerminalPanel(self._paned, self.app_ctrl)

        self._paned.add(self._left, weight=1)
        self._paned.add(self._right, weight=1)
        self._load_favorites()

    def _build_statusbar(self):
        self._global_status = tk.StringVar(
            value="  NetVault listo. Usa Ctrl o Shift para seleccionar multiples archivos."
        )
        tk.Label(
            self,
            textvariable=self._global_status,
            bg=self.t["toolbar"],
            fg=self.t["text_secondary"],
            font=("Segoe UI", 8),
            anchor="w",
        ).pack(fill="x", side="bottom")

    def _wire_toolbar(self):
        self._searchbar._left = self._left
        self._searchbar._global_status = self._global_status

        self._toolbar.wire(
            {
                "Atrás": self._left.go_back,
                "Adelante": self._left.go_forward,
                "Subir": self._left.go_up,
                "Reindexar": lambda: self.app_ctrl.start_index(self._left._current, force=True),
                "Nueva carpeta": self._left._new_folder,
                "Nuevo archivo": self._left._new_file,
                "Cortar": self._left._cut_selected,
                "Copiar": self._left._copy_selected,
                "Pegar": self._left._paste_here,
                "Eliminar": lambda: self._left._delete_selected(False),
                "Deshacer": self.app_ctrl.file_ctrl.undo,
            }
        )

    def _toggle_terminal(self):
        if self._terminal_visible:
            try:
                self._paned.forget(self._terminal)
            except tk.TclError:
                pass
            self._paned.add(self._right, weight=1)
            self._terminal_visible = False
            self._global_status.set("  Panel derecho restaurado.")
            return

        try:
            self._paned.forget(self._right)
        except tk.TclError:
            pass
        self._paned.add(self._terminal, weight=1)
        self._terminal_visible = True
        self._terminal.set_cwd(self._left._current or os.path.expanduser("~"))
        self._terminal.focus_terminal()
        self._global_status.set("  Terminal abierta en el costado derecho.")

    def _subscribe_events(self):
        def on_event(event, data):
            if event == "scan_start":
                self.after(0, lambda: self._global_status.set(f"  Indexando: {data}"))
            elif event == "scan_done":
                self.after(0, lambda: self._global_status.set(f"  Indice actualizado: {data}"))
            elif event == "scan_skip":
                self.after(0, lambda: self._global_status.set(f"  Indice reutilizado para: {data}"))
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
