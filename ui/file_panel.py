from importlib.resources import path
import os
import tkinter as tk
from tkinter import ttk
from datetime import datetime
from ui.theme import get_theme
from ui.dialogs import (ask_new_name, ask_folder_name, ask_file_name,
                        confirm_delete, show_properties)

class FilePanel(tk.Frame):
    def __init__(self, parent, app_ctrl, side_label="Panel", **kwargs):
        self.t         = get_theme(app_ctrl.get_theme())
        super().__init__(parent, bg=self.t["bg_secondary"], **kwargs)
        self.app_ctrl  = app_ctrl
        self.file_ctrl = app_ctrl.file_ctrl
        self.label     = side_label
        self._current  = ""
        self._history  = []
        self._hist_pos = -1
        self._build()

    # ── Layout ──────────────────────────────────────────
    def _build(self):
        t = self.t
        self._build_header(t)
        self._build_pathbar(t)
        self._build_tree(t)
        self._build_statusbar(t)
        self._build_context_menu(t)
        self._bind_events()

    def _build_header(self, t):
        h = tk.Frame(self, bg=t["toolbar"], height=32)
        h.pack(fill="x")
        h.pack_propagate(False)
        tk.Label(h, text=self.label, bg=t["toolbar"],
                 fg=t["accent"], font=("Segoe UI", 9, "bold")
                 ).pack(side="left", padx=10)

    def _build_pathbar(self, t):
        bar = tk.Frame(self, bg=t["bg_primary"])
        bar.pack(fill="x", padx=4, pady=(4, 0))

        self._path_var   = tk.StringVar()
        self._path_entry = tk.Entry(
            bar, textvariable=self._path_var,
            bg=t["bg_secondary"], fg=t["text_primary"],
            insertbackground=t["accent"],
            font=("Segoe UI", 10), relief="flat",
            highlightthickness=1,
            highlightbackground=t["border"],
            highlightcolor=t["accent"]
        )
        self._path_entry.pack(side="left", fill="x", expand=True, ipady=5)
        self._path_entry.bind("<Return>",
                              lambda e: self.navigate(self._path_var.get()))

        tk.Button(
            bar, text="Ir", bg=t["accent"], fg="white",
            font=("Segoe UI", 9, "bold"), relief="flat",
            cursor="hand2", padx=10, pady=4,
            command=lambda: self.navigate(self._path_var.get())
        ).pack(side="left", padx=(4, 0))

    def _build_tree(self, t):
        frame = tk.Frame(self, bg=t["bg_secondary"])
        frame.pack(fill="both", expand=True, padx=4, pady=4)

        sid = str(id(self))
        style = ttk.Style()
        style.theme_use("default")
        style.configure(f"P{sid}.Treeview",
                        background=t["bg_secondary"],
                        foreground=t["text_primary"],
                        fieldbackground=t["bg_secondary"],
                        rowheight=26,
                        font=("Segoe UI", 9))
        style.configure(f"P{sid}.Treeview.Heading",
                        background=t["toolbar"],
                        foreground=t["accent"],
                        font=("Segoe UI", 9, "bold"),
                        relief="flat")
        style.map(f"P{sid}.Treeview",
                  background=[("selected", t["bg_selected"])],
                  foreground=[("selected", t["text_primary"])])

        cols = ("name", "type", "size", "modified")
        self._tree = ttk.Treeview(
            frame, columns=cols, show="headings",
            style=f"P{sid}.Treeview", selectmode="extended"
        )
        self._tree.heading("name",     text="  Nombre",   anchor="w")
        self._tree.heading("type",     text="Tipo",       anchor="w")
        self._tree.heading("size",     text="Tamaño",     anchor="e")
        self._tree.heading("modified", text="Modificado", anchor="w")
        self._tree.column("name",     width=280, anchor="w", minwidth=140)
        self._tree.column("type",     width=70,  anchor="w", minwidth=50)
        self._tree.column("size",     width=85,  anchor="e", minwidth=60)
        self._tree.column("modified", width=145, anchor="w", minwidth=100)

        self._tree.tag_configure("folder",
                                 foreground=t["tag_folder"],
                                 font=("Segoe UI", 9, "bold"))
        self._tree.tag_configure("file", foreground=t["tag_file"])

        vsb = ttk.Scrollbar(frame, orient="vertical",   command=self._tree.yview)
        hsb = ttk.Scrollbar(frame, orient="horizontal", command=self._tree.xview)
        self._tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)

        self._tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")
        frame.rowconfigure(0, weight=1)
        frame.columnconfigure(0, weight=1)

    def _build_statusbar(self, t):
        self._status = tk.StringVar(value="Listo")
        tk.Label(
            self, textvariable=self._status,
            bg=t["toolbar"], fg=t["text_secondary"],
            font=("Segoe UI", 8), anchor="w"
        ).pack(fill="x", padx=8, pady=(0, 2))

    def _build_context_menu(self, t):
        self._menu = tk.Menu(
            self, tearoff=0,
            bg=t["bg_secondary"], fg=t["text_primary"],
            activebackground=t["accent"], activeforeground="white",
            font=("Segoe UI", 9), relief="flat"
        )
        self._menu.add_command(label="📂  Abrir",              command=self._open_selected)
        self._menu.add_separator()
        self._menu.add_command(label="⎘   Copiar",             command=self._copy_selected)
        self._menu.add_command(label="✂   Cortar",             command=self._cut_selected)
        self._menu.add_command(label="📋  Pegar",              command=self._paste_here)
        self._menu.add_separator()
        self._menu.add_command(label="✏️   Renombrar",          command=self._rename_selected)
        self._menu.add_command(label="🗑   Eliminar",           command=lambda: self._delete_selected(False))
        self._menu.add_command(label="☠   Eliminar permanente",command=lambda: self._delete_selected(True))
        self._menu.add_separator()
        self._menu.add_command(label="📁  Nueva carpeta",      command=self._new_folder)
        self._menu.add_command(label="📄  Nuevo archivo",      command=self._new_file)
        self._menu.add_separator()
        self._menu.add_command(label="⭐  Agregar a favoritos", command=self._add_fav)
        self._menu.add_command(label="ℹ   Propiedades",        command=self._show_props)

    def _bind_events(self):
        self._tree.bind("<Double-1>",         self._on_double_click)
        self._tree.bind("<BackSpace>",        lambda e: self.go_up())
        self._tree.bind("<Button-3>",         self._show_context_menu)

    # ── Navegación ──────────────────────────────────────
    def navigate(self, path: str):
    # Normalizar ruta UNC y eliminar espacios
        path = path.strip().replace("/", "\\")
        if not path:
            return
        # os.path.isdir falla con UNC sin trailing, forzamos con os.path.exists
        if not os.path.exists(path) or not os.path.isdir(path):
            self._status.set(f"⚠ Ruta no válida o inaccesible: {path}")
            return
        self._current = path
        self._path_var.set(path)
        self._push_history(path)
        self._load_directory(path)
        self.app_ctrl.start_index(path)

    def _load_directory(self, path: str):
        self._tree.delete(*self._tree.get_children())
        try:
            entries = list(os.scandir(path))
            folders = sorted([e for e in entries if e.is_dir()],
                             key=lambda e: e.name.lower())
            files   = sorted([e for e in entries if e.is_file()],
                             key=lambda e: e.name.lower())
            for e in folders:
                self._tree.insert("", "end", iid=e.path,
                                  values=(f"  {e.name}", "Carpeta", "-",
                                          self._fmt_date(e.stat().st_mtime)),
                                  tags=("folder",))
            for e in files:
                stat = e.stat()
                ext  = os.path.splitext(e.name)[1].upper() or "FILE"
                self._tree.insert("", "end", iid=e.path,
                                  values=(f"  {e.name}", ext,
                                          self._fmt_size(stat.st_size),
                                          self._fmt_date(stat.st_mtime)),
                                  tags=("file",))
            self._status.set(
                f"  {len(folders)} carpetas  •  {len(files)} archivos  •  {len(entries)} total"
            )
        except PermissionError:
            self._status.set("⚠ Sin permiso para leer esta carpeta")
        except Exception as e:
            self._status.set(f"⚠ Error: {e}")

    def go_up(self):
        if self._current:
            parent = os.path.dirname(self._current)
            if parent != self._current:
                self.navigate(parent)

    def go_back(self):
        if self._hist_pos > 0:
            self._hist_pos -= 1
            path = self._history[self._hist_pos]
            self._path_var.set(path)
            self._load_directory(path)

    def go_forward(self):
        if self._hist_pos < len(self._history) - 1:
            self._hist_pos += 1
            path = self._history[self._hist_pos]
            self._path_var.set(path)
            self._load_directory(path)

    def _push_history(self, path):
        self._history  = self._history[:self._hist_pos + 1]
        self._history.append(path)
        self._hist_pos = len(self._history) - 1

    def refresh(self):
        if self._current:
            self._load_directory(self._current)

    def get_selected_paths(self):
        return list(self._tree.selection())

    def load_search_results(self, results):
        self._tree.delete(*self._tree.get_children())
        for path, name, ftype, size, mtime in results:
            tag = "folder" if ftype == "folder" else "file"
            self._tree.insert("", "end", iid=path,
                              values=(f"  {name}", ftype,
                                      self._fmt_size(size) if ftype != "folder" else "-",
                                      self._fmt_date(mtime)),
                              tags=(tag,))
        self._status.set(f"  🔍 {len(results)} resultados encontrados")

    # ── Acciones ────────────────────────────────────────
    def _on_double_click(self, event):
        sel = self.get_selected_paths()
        if not sel: return
        path = sel[0]
        if os.path.isdir(path): self.navigate(path)
        else: self.file_ctrl.open_file(path)

    def _show_context_menu(self, event):
        self._menu.post(event.x_root, event.y_root)

    def _open_selected(self):
        for p in self.get_selected_paths():
            if os.path.isdir(p): self.navigate(p)
            else: self.file_ctrl.open_file(p)

    def _copy_selected(self):
        sel = self.get_selected_paths()
        self.file_ctrl.copy_to_clipboard(sel)
        self._status.set(f"  ⎘ {len(sel)} elemento(s) copiado(s)")

    def _cut_selected(self):
        sel = self.get_selected_paths()
        self.file_ctrl.cut_to_clipboard(sel)
        self._status.set(f"  ✂ {len(sel)} elemento(s) cortado(s)")

    def _paste_here(self):
        self.file_ctrl.paste(self._current)
        self.refresh()

    def _rename_selected(self):
        sel = self.get_selected_paths()
        if not sel: return
        path     = sel[0]
        new_name = ask_new_name(self, current=os.path.basename(path))
        if new_name:
            self.file_ctrl.rename(path, new_name)
            self.refresh()

    def _delete_selected(self, permanent=False):
        sel = self.get_selected_paths()
        if not sel: return
        names = [os.path.basename(p) for p in sel]
        if confirm_delete(self, names, permanent):
            self.file_ctrl.delete(sel, permanent)
            self.refresh()

    def _new_folder(self):
        name = ask_folder_name(self)
        if name:
            self.file_ctrl.create_folder(self._current, name)
            self.refresh()

    def _new_file(self):
        name = ask_file_name(self)
        if name:
            self.file_ctrl.create_file(self._current, name)
            self.refresh()

    def _add_fav(self):
        if self._current:
            self.app_ctrl.add_favorite(self._current)
            self._status.set("  ⭐ Favorito agregado")

    def _show_props(self):
        sel = self.get_selected_paths()
        if not sel: return
        path = sel[0]
        try:
            stat = os.stat(path)
            info = {
                "Nombre":     os.path.basename(path),
                "Ruta":       path,
                "Tipo":       "Carpeta" if os.path.isdir(path) else os.path.splitext(path)[1],
                "Tamaño":     self._fmt_size(stat.st_size),
                "Modificado": self._fmt_date(stat.st_mtime),
                "Creado":     self._fmt_date(stat.st_ctime),
            }
            show_properties(self, info, self.t)
        except Exception as e:
            self._status.set(f"⚠ Error: {e}")

    # ── Utilidades ──────────────────────────────────────
    @staticmethod
    def _fmt_size(size: float) -> str:
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024: return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

    @staticmethod
    def _fmt_date(ts: float) -> str:
        try:    return datetime.fromtimestamp(ts).strftime("%d/%m/%Y %H:%M")
        except: return "-"
