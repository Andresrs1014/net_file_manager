import os
import queue
import subprocess
import threading
import tkinter as tk
from pathlib import Path
from tkinter import ttk

from ui.theme import get_theme


class TerminalPanel(tk.Frame):
    def __init__(self, parent, app_ctrl, initial_cwd=None, **kwargs):
        self.t = get_theme(app_ctrl.get_theme())
        super().__init__(parent, bg=self.t["bg_secondary"], **kwargs)
        self.app_ctrl = app_ctrl
        self.cwd = Path(initial_cwd or Path.cwd())
        self._process = None
        self._queue: queue.Queue[tuple[str, str]] = queue.Queue()
        self._history: list[str] = []
        self._history_index = -1
        self._base_command_templates = [
            "git status",
            "git pull",
            "git checkout -b feature/",
            "docker compose up -d",
            "docker compose logs -f",
            "ssh user@server",
            "ping 8.8.8.8",
            "dir",
            "cd ..",
        ]
        self._command_templates = []
        self._build()
        self._refresh_command_templates()
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

        scrollbar = ttk.Scrollbar(body, orient="vertical", command=self._output.yview)
        self._output.configure(yscrollcommand=scrollbar.set)
        self._output.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        footer = tk.Frame(self, bg=t["bg_secondary"])
        footer.pack(fill="x", padx=8, pady=(0, 8))

        prompt = tk.Label(
            footer,
            text="PS>",
            bg=t["bg_secondary"],
            fg=t["accent"],
            font=("Consolas", 11, "bold"),
        )
        prompt.pack(side="left", padx=(4, 8))

        self._preset_var = tk.StringVar(value="Comandos")
        self._preset_box = ttk.Combobox(
            footer,
            textvariable=self._preset_var,
            values=self._command_templates,
            state="readonly",
            width=30,
            font=("Segoe UI", 9),
        )
        self._preset_box.pack(side="left", padx=(0, 8), pady=1)
        self._preset_box.bind("<<ComboboxSelected>>", self._apply_selected_template)

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

        tk.Button(
            footer,
            text="Usar",
            command=self._apply_selected_template,
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
        self._append_output(f"Directorio actual: {self.cwd}\n", "meta")

    def set_cwd(self, path: str):
        target = Path(path)
        if target.exists() and target.is_dir():
            self.cwd = target
            self._cwd_var.set(str(self.cwd))
            self._refresh_command_templates()
            self._append_output(f"Cambiado a: {self.cwd}\n", "meta")

    def _change_cwd(self):
        raw = self._cwd_var.get().strip()
        target = Path(raw)
        if target.exists() and target.is_dir():
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
        if self._process is not None:
            self._append_output("Ya hay un comando en ejecucion.\n", "stderr")
            return

        self._history.append(command)
        self._history_index = len(self._history)
        self._command_var.set("")
        self._append_output(f"PS {self.cwd}> {command}\n", "prompt")

        if command.lower().startswith("cd "):
            self._handle_cd(command[3:].strip())
            return
        if command.lower() == "cd":
            self._append_output(f"{self.cwd}\n", "stdout")
            return

        thread = threading.Thread(target=self._execute_command, args=(command,), daemon=True)
        thread.start()

    def _handle_cd(self, raw_target: str):
        target = raw_target.strip().strip('"')
        if not target:
            self._append_output(f"{self.cwd}\n", "stdout")
            return

        candidate = Path(target)
        if not candidate.is_absolute():
            candidate = (self.cwd / candidate).resolve()

        if candidate.exists() and candidate.is_dir():
            self.cwd = candidate
            self._cwd_var.set(str(self.cwd))
            self._refresh_command_templates()
            self._append_output(f"Cambiado a: {self.cwd}\n", "meta")
        else:
            self._append_output(f"Ruta invalida: {candidate}\n", "stderr")

    def _execute_command(self, command: str):
        try:
            self._process = subprocess.Popen(
                [
                    "powershell",
                    "-NoLogo",
                    "-NoProfile",
                    "-Command",
                    command,
                ],
                cwd=str(self.cwd),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            stdout, stderr = self._process.communicate()
            if stdout:
                self._queue.put(("stdout", stdout))
            if stderr:
                self._queue.put(("stderr", stderr))
            self._queue.put(("meta", f"[exit {self._process.returncode}]\n"))
        except Exception as exc:
            self._queue.put(("stderr", f"{exc}\n"))
        finally:
            self._process = None

    def _drain_queue(self):
        try:
            while True:
                tag, text = self._queue.get_nowait()
                self._append_output(text, tag)
        except queue.Empty:
            pass
        self.after(80, self._drain_queue)

    def _append_output(self, text: str, tag: str):
        self._output.configure(state="normal")
        self._output.insert("end", text, tag)
        self._output.see("end")
        self._output.configure(state="disabled")

    def _apply_selected_template(self, _event=None):
        value = self._preset_var.get().strip()
        if not value or value == "Comandos":
            return
        self._command_var.set(value)
        self._command_entry.focus_set()
        self._command_entry.icursor("end")

    def _refresh_command_templates(self):
        templates = []

        if (self.cwd / "requirements.txt").exists() or (self.cwd / "pyproject.toml").exists():
            templates.extend(
                [
                    "python -m venv .venv",
                    ".\\.venv\\Scripts\\activate",
                    "pip install -r requirements.txt",
                    "python -m pip install -r requirements.txt",
                    "pytest",
                ]
            )

        if (self.cwd / "package.json").exists():
            templates.extend(
                [
                    "npm install",
                    "npm run dev",
                    "npm test",
                    "npm run build",
                ]
            )

        if (self.cwd / "docker-compose.yml").exists() or (self.cwd / "compose.yaml").exists():
            templates.extend(
                [
                    "docker compose up -d",
                    "docker compose down",
                    "docker compose logs -f",
                ]
            )

        self._command_templates = self._dedupe_templates(templates + self._base_command_templates)
        if hasattr(self, "_preset_box"):
            self._preset_box.configure(values=self._command_templates)
            if self._preset_var.get() not in self._command_templates:
                self._preset_var.set("Comandos")

    @staticmethod
    def _dedupe_templates(items: list[str]) -> list[str]:
        seen = set()
        ordered = []
        for item in items:
            if item not in seen:
                seen.add(item)
                ordered.append(item)
        return ordered

    def _history_up(self, _event):
        if not self._history:
            return "break"
        self._history_index = max(0, self._history_index - 1)
        self._command_var.set(self._history[self._history_index])
        self._command_entry.icursor("end")
        return "break"

    def _history_down(self, _event):
        if not self._history:
            return "break"
        self._history_index = min(len(self._history), self._history_index + 1)
        if self._history_index >= len(self._history):
            self._command_var.set("")
        else:
            self._command_var.set(self._history[self._history_index])
        self._command_entry.icursor("end")
        return "break"
