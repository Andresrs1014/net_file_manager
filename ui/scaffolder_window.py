import threading
import tkinter as tk
from tkinter import ttk, filedialog

from ai.scaffolder import TEMPLATES, get_categories, scaffold
from ui.theme import get_theme


class ScaffolderWindow(tk.Toplevel):
    """
    Ventana de scaffolding de proyectos.
    Tres pasos: elegir plantilla → configurar → confirmar y crear.
    """

    def __init__(self, parent, app_ctrl):
        super().__init__(parent)
        self.app_ctrl = app_ctrl
        self.t = get_theme(app_ctrl.get_theme())

        self.title("NetVault — Nuevo Proyecto")
        self.geometry("860x620")
        self.minsize(720, 520)
        self.configure(bg=self.t["bg_primary"])
        self.resizable(True, True)
        self.transient(parent)
        self.lift()
        self.focus_force()

        # estado
        self._selected_template = tk.StringVar()
        self._project_name      = tk.StringVar()
        self._destination       = tk.StringVar()
        self._opt_git           = tk.BooleanVar(value=True)
        self._opt_docker        = tk.BooleanVar(value=False)
        self._opt_readme        = tk.BooleanVar(value=True)
        self._opt_env           = tk.BooleanVar(value=False)

        # destino por defecto = panel activo
        try:
            folder = parent._active()._current or ""
            self._destination.set(folder)
        except Exception:
            pass

        self._build()

    def _build(self):
        t = self.t

        # header
        header = tk.Frame(self, bg=t["toolbar"], height=52)
        header.pack(fill="x")
        header.pack_propagate(False)
        tk.Label(
            header, text="⬡  Nuevo Proyecto",
            bg=t["toolbar"], fg=t["accent"],
            font=("Segoe UI", 11, "bold"),
        ).pack(side="left", padx=16)

        # body con dos columnas
        body = tk.Frame(self, bg=t["bg_primary"])
        body.pack(fill="both", expand=True, padx=12, pady=10)

        self._build_template_panel(body, t)
        self._build_config_panel(body, t)

        # footer
        self._build_footer(t)

    def _build_template_panel(self, parent, t):
        """Panel izquierdo — selector de plantillas por categoría."""
        left = tk.Frame(parent, bg=t["bg_secondary"], width=280)
        left.pack(side="left", fill="y", padx=(0, 8))
        left.pack_propagate(False)

        tk.Label(
            left, text="Plantilla",
            bg=t["bg_secondary"], fg=t["accent"],
            font=("Segoe UI", 9, "bold"),
        ).pack(anchor="w", padx=12, pady=(12, 6))

        categories = get_categories()
        self._template_tree = ttk.Treeview(left, show="tree", selectmode="browse")
        self._template_tree.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        style = ttk.Style()
        style.configure("Treeview",
            background=t["bg_secondary"],
            foreground=t["text_primary"],
            fieldbackground=t["bg_secondary"],
            font=("Segoe UI", 9),
        )
        style.configure("Treeview.Heading", background=t["toolbar"], foreground=t["accent"])
        style.map("Treeview", background=[("selected", t["accent"])], foreground=[("selected", "white")])

        for category, templates in categories.items():
            cat_node = self._template_tree.insert("", "end", text=f"  {category}", open=True)
            for tmpl_name in templates:
                self._template_tree.insert(cat_node, "end", text=f"    {tmpl_name}", values=[tmpl_name])

        self._template_tree.bind("<<TreeviewSelect>>", self._on_template_select)

    def _build_config_panel(self, parent, t):
        """Panel derecho — configuración del proyecto."""
        right = tk.Frame(parent, bg=t["bg_primary"])
        right.pack(side="left", fill="both", expand=True)

        # descripción de la plantilla seleccionada
        self._desc_var = tk.StringVar(value="Selecciona una plantilla para comenzar.")
        tk.Label(
            right, textvariable=self._desc_var,
            bg=t["bg_primary"], fg=t["text_secondary"],
            font=("Segoe UI", 9, "italic"), wraplength=500, justify="left",
        ).pack(anchor="w", pady=(0, 12))

        # nombre del proyecto
        tk.Label(right, text="Nombre del proyecto",
            bg=t["bg_primary"], fg=t["text_primary"],
            font=("Segoe UI", 9, "bold"),
        ).pack(anchor="w")
        tk.Entry(
            right, textvariable=self._project_name,
            bg=t["bg_secondary"], fg=t["text_primary"],
            insertbackground=t["accent"], relief="flat",
            font=("Segoe UI", 10),
        ).pack(fill="x", ipady=6, pady=(4, 12))

        # directorio destino
        tk.Label(right, text="Crear en",
            bg=t["bg_primary"], fg=t["text_primary"],
            font=("Segoe UI", 9, "bold"),
        ).pack(anchor="w")

        dest_row = tk.Frame(right, bg=t["bg_primary"])
        dest_row.pack(fill="x", pady=(4, 12))
        tk.Entry(
            dest_row, textvariable=self._destination,
            bg=t["bg_secondary"], fg=t["text_primary"],
            insertbackground=t["accent"], relief="flat",
            font=("Segoe UI", 9),
        ).pack(side="left", fill="x", expand=True, ipady=6)
        tk.Button(
            dest_row, text="Explorar",
            command=self._browse_destination,
            bg=t["bg_secondary"], fg=t["text_secondary"],
            font=("Segoe UI", 8), relief="flat", cursor="hand2",
            padx=10, pady=6,
        ).pack(side="left", padx=(6, 0))

        # opciones
        tk.Label(right, text="Opciones",
            bg=t["bg_primary"], fg=t["text_primary"],
            font=("Segoe UI", 9, "bold"),
        ).pack(anchor="w", pady=(0, 6))

        opts_frame = tk.Frame(right, bg=t["bg_primary"])
        opts_frame.pack(anchor="w")

        self._opt_checks = {}
        opts = [
            ("git",    "Inicializar Git + .gitignore", self._opt_git),
            ("readme", "Incluir README.md",            self._opt_readme),
            ("docker", "Incluir Docker / Compose",     self._opt_docker),
            ("env",    "Incluir .env.example",         self._opt_env),
        ]
        for key, label, var in opts:
            cb = tk.Checkbutton(
                opts_frame, text=label, variable=var,
                bg=t["bg_primary"], fg=t["text_primary"],
                selectcolor=t["bg_secondary"],
                activebackground=t["bg_primary"],
                font=("Segoe UI", 9), cursor="hand2",
            )
            cb.pack(anchor="w")
            self._opt_checks[key] = cb

        # preview del árbol de archivos
        tk.Label(right, text="Vista previa",
            bg=t["bg_primary"], fg=t["text_primary"],
            font=("Segoe UI", 9, "bold"),
        ).pack(anchor="w", pady=(12, 4))

        self._preview = tk.Text(
            right,
            bg=t["bg_secondary"], fg=t["text_secondary"],
            font=("Consolas", 8), relief="flat",
            height=10, state="disabled",
            padx=8, pady=6,
        )
        self._preview.pack(fill="both", expand=True)

    def _build_footer(self, t):
        footer = tk.Frame(self, bg=t["bg_primary"])
        footer.pack(fill="x", padx=12, pady=(0, 10))

        self._status_var = tk.StringVar(value="")
        tk.Label(
            footer, textvariable=self._status_var,
            bg=t["bg_primary"], fg=t["text_secondary"],
            font=("Segoe UI", 8),
        ).pack(side="left")

        self._create_btn = tk.Button(
            footer, text="✓  Crear proyecto",
            command=self._create_project,
            bg=t["accent"], fg="white",
            font=("Segoe UI", 9, "bold"),
            relief="flat", cursor="hand2",
            padx=16, pady=7,
        )
        self._create_btn.pack(side="right")

        tk.Button(
            footer, text="Cancelar",
            command=self.destroy,
            bg=t["bg_secondary"], fg=t["text_secondary"],
            font=("Segoe UI", 9), relief="flat", cursor="hand2",
            padx=12, pady=7,
        ).pack(side="right", padx=(0, 8))

    # ── Lógica ───────────────────────────────────────────────────────────────

    def _on_template_select(self, _event=None):
        selection = self._template_tree.selection()
        if not selection:
            return
        values = self._template_tree.item(selection[0], "values")
        if not values:
            return
        name = values[0]
        self._selected_template.set(name)

        tmpl = TEMPLATES[name]
        self._desc_var.set(tmpl["description"])

        # activa/desactiva opciones según la plantilla
        available = tmpl.get("options", [])
        for key, cb in self._opt_checks.items():
            if key in available:
                cb.config(state="normal")
            else:
                cb.config(state="disabled")
                getattr(self, f"_opt_{key}").set(False)

        self._update_preview(name)

    def _update_preview(self, template_name: str):
        tmpl = TEMPLATES.get(template_name, {})
        lines = []
        project_name = self._project_name.get() or "mi-proyecto"
        name_lower = project_name.lower().replace(" ", "_").replace("-", "_")

        lines.append(f"{project_name}/")
        for path in tmpl.get("structure", {}).keys():
            path = path.replace("{name_lower}", name_lower).replace("{name}", project_name)
            lines.append(f"  {path}")

        self._preview.configure(state="normal")
        self._preview.delete("1.0", "end")
        self._preview.insert("end", "\n".join(lines))
        self._preview.configure(state="disabled")

    def _browse_destination(self):
        folder = filedialog.askdirectory(title="Seleccionar destino")
        if folder:
            self._destination.set(folder)

    def _get_options(self) -> list[str]:
        opts = []
        if self._opt_git.get():    opts.append("git")
        if self._opt_docker.get(): opts.append("docker")
        if self._opt_readme.get(): opts.append("readme")
        if self._opt_env.get():    opts.append("env")
        return opts

    def _create_project(self):
        template = self._selected_template.get()
        name     = self._project_name.get().strip()
        dest     = self._destination.get().strip()

        if not template:
            self._status_var.set("⚠ Selecciona una plantilla.")
            return
        if not name:
            self._status_var.set("⚠ Escribe el nombre del proyecto.")
            return
        if not dest:
            self._status_var.set("⚠ Selecciona el directorio destino.")
            return

        self._create_btn.config(state="disabled")
        self._status_var.set("Creando proyecto...")

        def run():
            ok, msg, created = scaffold(template, name, dest, self._get_options())
            self.after(0, lambda: self._on_done(ok, msg, created))

        threading.Thread(target=run, daemon=True).start()

    def _on_done(self, ok: bool, msg: str, created: list[str]):
        if ok:
            self._status_var.set(f"✓ {msg}")
            self._status_var.set(f"✓ Creados {len(created)} archivos")
            # refresca el panel activo de NetVault
            try:
                self.master._active().refresh()
            except Exception:
                pass
        else:
            self._status_var.set(f"✗ {msg}")
            self._create_btn.config(state="normal")
