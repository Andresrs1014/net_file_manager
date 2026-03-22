import tkinter as tk
from pathlib import Path

from ui.terminal_commands import build_command_groups, flatten_command_groups
from ui.terminal_session import TerminalSession
from ui.terminal_suggest import find_suggestions
from ui.theme import get_theme


class TerminalPanel(tk.Frame):
    def __init__(self, parent, app_ctrl, initial_cwd=None, **kwargs):
        self.t = get_theme(app_ctrl.get_theme())
        super().__init__(parent, bg=self.t["bg_secondary"], **kwargs)
        self.app_ctrl = app_ctrl
        self.session = TerminalSession(initial_cwd or Path.cwd())
        self.cwd = self.session.cwd
        self._command_groups = build_command_groups(self.cwd)
        self._command_templates = flatten_command_groups(self._command_groups)
        self._active_group = "Comunes"
        self._command_menu = None
        self._command_group_list: tk.Listbox | None = None
        self._command_item_list: tk.Listbox | None = None
        self._suggest_box: tk.Listbox | None = None
        self._build()
        self.after(80, self._drain_queue)

    def _build(self):
        t = self.t

        header = tk.Frame(self, bg=t["toolbar"], height=40)
        header.pack(fill="x")
        header.pack_propagate(False)

        tk.Label(
            header,
            text="Terminal",
            bg=t["toolbar"],
            fg=t["accent"],
            font=("Consolas", 11, "bold"),
        ).pack(side="left", padx=12)

        self._cwd_var = tk.StringVar(value=str(self.cwd))
        cwd_entry = tk.Entry(
            header,
            textvariable=self._cwd_var,
            bg=t["bg_secondary"],
            fg=t["text_primary"],
            insertbackground=t["accent"],
            relief="flat",
            font=("Consolas", 9),
        )
        cwd_entry.pack(side="left", fill="x", expand=True, padx=(0, 8), pady=6, ipady=4)
        cwd_entry.bind("<Return>", lambda _e: self._change_cwd())

        tk.Button(
            header,
            text="Ir",
            command=self._change_cwd,
            bg=t["accent"],
            fg="white",
            relief="flat",
            font=("Segoe UI", 8, "bold"),
            padx=10,
            pady=4,
            cursor="hand2",
        ).pack(side="left", padx=(0, 8), pady=6)

        tk.Button(
            header,
            text="Limpiar",
            command=self.clear,
            bg=t["bg_secondary"],
            fg=t["text_secondary"],
            relief="flat",
            font=("Segoe UI", 8),
            padx=10,
            pady=4,
            cursor="hand2",
        ).pack(side="left", pady=6)

        body = tk.Frame(self, bg=t["bg_secondary"])
        body.pack(fill="both", expand=True, padx=8, pady=8)

        self._output = tk.Text(
            body,
            bg="#111417",
            fg="#d9e1e8",
            insertbackground="#ff6b57",
            relief="flat",
            wrap="word",
            font=("Consolas", 10),
            padx=12,
            pady=12,
            state="disabled",
        )
        self._output.tag_configure("prompt", foreground="#ff8a65")
        self._output.tag_configure("stdout", foreground="#d9e1e8")
        self._output.tag_configure("stderr", foreground="#ff6b6b")
        self._output.tag_configure("meta", foreground="#8aa0b2")

        scrollbar = tk.Scrollbar(body, orient="vertical", command=self._output.yview)
        self._output.configure(yscrollcommand=scrollbar.set)
        self._output.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        footer = tk.Frame(self, bg=t["bg_secondary"])
        footer.pack(fill="x", padx=8, pady=(0, 8))
        self._footer = footer

        tk.Label(
            footer,
            text="PS>",
            bg=t["bg_secondary"],
            fg=t["accent"],
            font=("Consolas", 11, "bold"),
        ).pack(side="left", padx=(4, 8))

        self._preset_var = tk.StringVar(value="Comunes")
        self._preset_button = tk.Button(
            footer,
            textvariable=self._preset_var,
            command=self._toggle_command_menu,
            bg=t["bg_secondary"],
            fg=t["text_primary"],
            activebackground=t["accent"],
            activeforeground="white",
            relief="flat",
            font=("Segoe UI", 9, "bold"),
            padx=10,
            pady=6,
            cursor="hand2",
        )
        self._preset_button.pack(side="left", padx=(0, 8), pady=1)

        self._command_var = tk.StringVar()
        self._command_entry = tk.Entry(
            footer,
            textvariable=self._command_var,
            bg="#111417",
            fg="#f4f7fa",
            insertbackground="#ff6b57",
            relief="flat",
            font=("Consolas", 10),
        )
        self._command_entry.pack(side="left", fill="x", expand=True, ipady=7)
        self._command_entry.bind("<Return>", lambda _e: self.run_command())
        self._command_entry.bind("<Up>", self._history_up)
        self._command_entry.bind("<Down>", self._history_down)
        self._command_entry.bind("<KeyRelease>", self._on_command_change)
        self._command_entry.bind("<Tab>", self._accept_first_suggestion)
        self._command_entry.bind("<Escape>", lambda _e: self._hide_suggestions())

        tk.Button(
            footer,
            text="Usar",
            command=self._toggle_command_menu,
            bg=t["bg_secondary"],
            fg=t["text_secondary"],
            relief="flat",
            font=("Segoe UI", 9),
            padx=10,
            pady=6,
            cursor="hand2",
        ).pack(side="left", padx=(0, 8))

        tk.Button(
            footer,
            text="Ejecutar",
            command=self.run_command,
            bg=t["accent"],
            fg="white",
            relief="flat",
            font=("Segoe UI", 9, "bold"),
            padx=12,
            pady=6,
            cursor="hand2",
        ).pack(side="left", padx=(8, 0))

        self._build_command_menu()
        self._append_output(f"Directorio actual: {self.cwd}\n", "meta")
        self._append_output(
            "Sugerencia: usa Ctrl o Shift para seleccionar multiples archivos.\n",
            "meta",
        )
        self._append_output(
            "Usa la lista de comandos junto a PS> para rellenar acciones comunes.\n",
            "meta",
        )

    def focus_terminal(self):
        self._command_entry.focus_set()

    def clear(self):
        self._output.configure(state="normal")
        self._output.delete("1.0", "end")
        self._output.configure(state="disabled")
        self._hide_suggestions()
        self._hide_command_menu()
        self._append_output(f"Directorio actual: {self.cwd}\n", "meta")

    def set_cwd(self, path: str):
        target = self.session.set_cwd(path)
        if target is not None:
            self.cwd = target
            self._cwd_var.set(str(self.cwd))
            self._refresh_command_templates()
            self._append_output(f"Cambiado a: {self.cwd}\n", "meta")

    def _change_cwd(self):
        raw = self._cwd_var.get().strip()
        target = self.session.set_cwd(raw)
        if target is not None:
            self.cwd = target
            self._cwd_var.set(str(self.cwd))
            self._refresh_command_templates()
            self._append_output(f"Cambiado a: {self.cwd}\n", "meta")
        else:
            self._append_output(f"Ruta invalida: {raw}\n", "stderr")

    def run_command(self):
        command = self._command_var.get().strip()
        if not command:
            return
        if not self.session.can_run():
            self._append_output("Ya hay un comando en ejecucion.\n", "stderr")
            return

        self.session.remember(command)
        self._command_var.set("")
        self._hide_suggestions()
        self._append_output(f"PS {self.cwd}> {command}\n", "prompt")

        lowered = command.lower()
        if lowered in {"cls", "clear"}:
            self.clear()
            return
        if lowered.startswith("cd "):
            self._handle_cd(command[3:].strip())
            return
        if lowered == "cd":
            self._append_output(f"{self.cwd}\n", "stdout")
            return

        self.session.run_async(command)

    def _handle_cd(self, raw_target: str):
        candidate = self.session.change_cwd(raw_target)
        if candidate is not None:
            self.cwd = candidate
            self._cwd_var.set(str(self.cwd))
            self._refresh_command_templates()
            self._append_output(f"Cambiado a: {self.cwd}\n", "meta")
        else:
            self._append_output(f"Ruta invalida: {raw_target}\n", "stderr")

    def _drain_queue(self):
        try:
            while True:
                tag, text = self.session.queue.get_nowait()
                self._append_output(text, tag)
        except Exception:
            pass
        self.after(80, self._drain_queue)

    MAX_LINES = 2000

    def _append_output(self, text: str, tag: str, max_lines=MAX_LINES):
        self._output.configure(state="normal")
        self._output.insert("end", text, tag)

        line_count = int(self._output.index("end-1c").split(".")[0])
        if line_count > max_lines:
            excess = line_count - max_lines
            self._output.delete("1.0", f"{excess + 1}.0")

        self._output.see("end")
        self._output.configure(state="disabled")

    def _build_command_menu(self):
        menu = tk.Frame(
            self,
            bg=self.t["toolbar"],
            bd=1,
            highlightthickness=1,
            highlightbackground=self.t["border"],
        )

        left = tk.Frame(menu, bg=self.t["toolbar"], width=150)
        left.pack(side="left", fill="y")
        left.pack_propagate(False)

        right = tk.Frame(menu, bg=self.t["bg_secondary"])
        right.pack(side="left", fill="both", expand=True)

        tk.Label(
            left,
            text="Categorias",
            bg=self.t["toolbar"],
            fg=self.t["accent"],
            font=("Segoe UI", 9, "bold"),
        ).pack(anchor="w", padx=10, pady=(10, 6))

        tk.Label(
            right,
            text="Comandos",
            bg=self.t["bg_secondary"],
            fg=self.t["accent"],
            font=("Segoe UI", 9, "bold"),
        ).pack(anchor="w", padx=10, pady=(10, 6))

        self._command_group_list = tk.Listbox(
            left,
            bg=self.t["toolbar"],
            fg=self.t["text_primary"],
            selectbackground=self.t["accent"],
            selectforeground="white",
            relief="flat",
            activestyle="none",
            font=("Segoe UI", 9),
        )
        self._command_group_list.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        self._command_item_list = tk.Listbox(
            right,
            bg="#111417",
            fg="#f4f7fa",
            selectbackground=self.t["accent"],
            selectforeground="white",
            relief="flat",
            activestyle="none",
            font=("Consolas", 9),
        )
        self._command_item_list.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        for group in self._command_groups:
            self._command_group_list.insert("end", group)

        self._command_group_list.bind("<<ListboxSelect>>", self._load_selected_group)
        self._command_group_list.bind("<Motion>", self._hover_group_item)
        self._command_item_list.bind("<Double-1>", self._use_selected_command)
        self._command_item_list.bind("<Return>", self._use_selected_command)
        self._command_item_list.bind("<Motion>", self._hover_command_item)

        self._command_menu = menu

    def _toggle_command_menu(self):
        if self._command_menu is None:
            return
        if self._command_menu.winfo_manager():
            self._hide_command_menu()
            return
        self._show_command_menu()

    def _show_command_menu(self):
        if self._command_menu is None:
            return
        self.update_idletasks()
        menu_height = 250
        y = max(8, self._footer.winfo_y() - menu_height - 8)
        self._command_menu.place(x=8, y=y, width=max(520, self.winfo_width() - 16), height=menu_height)

        groups = list(self._command_groups.keys())
        initial_index = groups.index(self._active_group) if self._active_group in groups else 0
        group_list = self._command_group_list
        if group_list is None:
            return
        group_list.selection_clear(0, "end")
        group_list.selection_set(initial_index)
        group_list.activate(initial_index)
        self._load_selected_group()
        self._command_entry.focus_set()

    def _hide_command_menu(self):
        if self._command_menu is not None:
            self._command_menu.place_forget()

    def _load_selected_group(self, _event=None):
        group_list = self._command_group_list
        item_list = self._command_item_list
        if group_list is None or item_list is None:
            return
        selection = group_list.curselection()
        if not selection:
            return
        group_name = group_list.get(selection[0])
        self._active_group = group_name
        self._preset_var.set(group_name)
        item_list.delete(0, "end")
        for item in self._command_groups.get(group_name, []):
            item_list.insert("end", item)
        if item_list.size() > 0:
            item_list.selection_set(0)
            item_list.activate(0)

    def _use_selected_command(self, _event=None):
        item_list = self._command_item_list
        if item_list is None:
            return "break"
        selection = item_list.curselection()
        if not selection:
            return "break"
        value = item_list.get(selection[0])
        self._insert_command(value)
        self._hide_command_menu()
        return "break"

    def _insert_command(self, value: str):
        self._command_var.set(value)
        self._command_entry.focus_set()
        self._command_entry.icursor("end")
        self._update_suggestions()

    def _refresh_command_templates(self):
        self._command_groups = build_command_groups(self.cwd)
        self._command_templates = flatten_command_groups(self._command_groups)
        self._update_suggestions()

    def _on_command_change(self, event):
        if event.keysym in {"Up", "Down", "Return", "Escape", "Tab"}:
            return
        self._update_suggestions()

    def _update_suggestions(self):
        matches = find_suggestions(
            self._command_var.get(),
            self.session.history,
            self._command_templates,
            self.cwd,
        )
        if not matches:
            self._hide_suggestions()
            return
        self._show_suggestions(matches)

    def _show_suggestions(self, matches: list[str]):
        if self._suggest_box is None or not self._suggest_box.winfo_exists():
            self._suggest_box = tk.Listbox(
                self,
                bg="#111417",
                fg="#f4f7fa",
                selectbackground=self.t["accent"],
                selectforeground="white",
                relief="flat",
                activestyle="none",
                font=("Consolas", 9),
                height=8,
            )
            self._suggest_box.bind("<Double-1>", self._use_selected_suggestion)
            self._suggest_box.bind("<Return>", self._use_selected_suggestion)

        self._suggest_box.delete(0, "end")
        for item in matches:
            self._suggest_box.insert("end", item)
        self._suggest_box.selection_clear(0, "end")
        self._suggest_box.selection_set(0)

        self.update_idletasks()
        list_height = min(8, max(3, len(matches))) * 22
        x = self._footer.winfo_x() + self._command_entry.winfo_x()
        y = self._footer.winfo_y() - list_height - 8
        width = self._command_entry.winfo_width()
        self._suggest_box.configure(height=min(8, max(3, len(matches))))
        self._suggest_box.place(x=x, y=y, width=width)
        self._suggest_box.lift()

    def _hide_suggestions(self):
        if self._suggest_box is not None and self._suggest_box.winfo_exists():
            self._suggest_box.place_forget()

    def _use_selected_suggestion(self, _event=None):
        if self._suggest_box is None or not self._suggest_box.winfo_exists():
            return "break"
        selection = self._suggest_box.curselection()
        if not selection:
            return "break"
        value = self._suggest_box.get(selection[0])
        self._insert_command(value)
        self._hide_suggestions()
        return "break"

    def _accept_first_suggestion(self, _event):
        if self._suggest_box is not None and self._suggest_box.winfo_exists():
            self._suggest_box.selection_clear(0, "end")
            self._suggest_box.selection_set(0)
            return self._use_selected_suggestion()
        return None

    def _history_up(self, _event):
        self._hide_command_menu()
        value = self.session.history_up()
        if value is None:
            return "break"
        self._command_var.set(value)
        self._command_entry.icursor("end")
        return "break"

    def _history_down(self, _event):
        self._hide_command_menu()
        if not self.session.history:
            return "break"
        self._command_var.set(self.session.history_down())
        self._command_entry.icursor("end")
        return "break"

    def _hover_group_item(self, event):
        group_list = self._command_group_list
        if group_list is None:
            return
        index = group_list.nearest(event.y)
        if index < 0:
            return
        group_list.selection_clear(0, "end")
        group_list.selection_set(index)
        group_list.activate(index)
        self._load_selected_group()

    def _hover_command_item(self, event):
        item_list = self._command_item_list
        if item_list is None:
            return
        index = item_list.nearest(event.y)
        if index < 0:
            return
        item_list.selection_clear(0, "end")
        item_list.selection_set(index)
        item_list.activate(index)
