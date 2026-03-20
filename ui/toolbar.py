import tkinter as tk
from ui.theme import get_theme

class Toolbar(tk.Frame):
    def __init__(self, parent, app_ctrl, on_theme_change, **kwargs):
        self.t = get_theme(app_ctrl.get_theme())
        super().__init__(parent, bg=self.t["toolbar"], height=46, **kwargs)
        self.pack_propagate(False)
        self.app_ctrl        = app_ctrl
        self.on_theme_change = on_theme_change
        self._buttons        = {}
        self._build()

    def _build(self):
        t = self.t

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
                self,
                text=f" {icon}  {key} ",
                bg=str(t["bg_secondary"]),
                fg=str(t["text_primary"]),
                font=("Segoe UI", 9),
                relief="flat",
                activebackground=str(t["accent"]),
                activeforeground="white",
                cursor="hand2",
                padx=10,
                pady=8,
                bd=0
            )
            b.pack(side="left", padx=2, pady=5)
            b.bind("<Enter>", lambda e, w=b: w.config(
                bg=t["accent"], fg="white"))
            b.bind("<Leave>", lambda e, w=b: w.config(
                bg=t["bg_secondary"], fg=t["text_primary"]))
            self._buttons[key] = b

        # Toggle tema — siempre a la derecha
        self._toggle_lbl = tk.StringVar(
            value="🌙  Dark" if self.app_ctrl.get_theme() == "dark" else "☀  Light"
        )
        tk.Button(
            self,
            textvariable=self._toggle_lbl,
            command=self._toggle_theme,
            bg=str(t["accent"]),
            fg="white",
            font=("Segoe UI", 9, "bold"),
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=8,
            bd=0
        ).pack(side="right", padx=10, pady=5)

    def _toggle_theme(self):
        new = self.app_ctrl.toggle_theme()
        self._toggle_lbl.set("🌙  Dark" if new == "dark" else "☀  Light")
        self.on_theme_change(new)

    def wire(self, actions: dict):
        """
        Conecta callbacks a los botones.
        actions = {"Atrás": fn, "Copiar": fn, ...}
        """
        for key, cmd in actions.items():
            if key in self._buttons:
                self._buttons[key].config(command=cmd)

    def get_button(self, key: str):
        return self._buttons.get(key)
