import tkinter as tk

from ui.theme import get_theme


class Toolbar(tk.Frame):
    def __init__(self, parent, app_ctrl, on_theme_change, on_terminal_toggle=None, **kwargs):
        self.t = get_theme(app_ctrl.get_theme())
        super().__init__(parent, bg=self.t["toolbar"], height=46, **kwargs)
        self.pack_propagate(False)
        self.app_ctrl = app_ctrl
        self.on_theme_change = on_theme_change
        self.on_terminal_toggle = on_terminal_toggle
        self._buttons = {}
        self._build()

    def _build(self):
        t = self.t
        buttons = [
            ("←", "Atrás"),
            ("→", "Adelante"),
            ("↑", "Subir"),
            ("⟳", "Reindexar"),
            ("📁", "Nueva carpeta"),
            ("📄", "Nuevo archivo"),
            ("✂", "Cortar"),
            ("⧉", "Copiar"),
            ("📋", "Pegar"),
            ("🗑", "Eliminar"),
            ("↩", "Deshacer"),
        ]

        for icon, key in buttons:
            button = tk.Button(
                self,
                text=f" {icon}  {key} ",
                bg=t["bg_secondary"],
                fg=t["text_primary"],
                font=("Segoe UI", 9),
                relief="flat",
                activebackground=t["accent"],
                activeforeground="white",
                cursor="hand2",
                padx=10,
                pady=8,
                bd=0,
            )
            button.pack(side="left", padx=2, pady=5)
            button.bind("<Enter>", lambda _e, w=button: w.config(bg=t["accent"], fg="white"))
            button.bind(
                "<Leave>",
                lambda _e, w=button: w.config(bg=t["bg_secondary"], fg=t["text_primary"]),
            )
            self._buttons[key] = button

        self._toggle_lbl = tk.StringVar(
            value="Dark" if self.app_ctrl.get_theme() == "dark" else "Light"
        )

        if self.on_terminal_toggle is not None:
            tk.Button(
                self,
                text="Terminal",
                command=self.on_terminal_toggle,
                bg=t["bg_secondary"],
                fg=t["text_primary"],
                font=("Segoe UI", 9, "bold"),
                relief="flat",
                cursor="hand2",
                padx=12,
                pady=8,
                bd=0,
            ).pack(side="right", padx=(0, 8), pady=5)

        tk.Button(
            self,
            textvariable=self._toggle_lbl,
            command=self._toggle_theme,
            bg=t["accent"],
            fg="white",
            font=("Segoe UI", 9, "bold"),
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=8,
            bd=0,
        ).pack(side="right", padx=10, pady=5)

    def _toggle_theme(self):
        new = self.app_ctrl.toggle_theme()
        self._toggle_lbl.set("Dark" if new == "dark" else "Light")
        self.on_theme_change(new)

    def wire(self, actions: dict):
        for key, cmd in actions.items():
            if key in self._buttons:
                self._buttons[key].config(command=cmd)

    def get_button(self, key: str):
        return self._buttons.get(key)
