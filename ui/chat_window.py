import threading
import tkinter as tk
from tkinter import ttk

from ai.action_parser import execute_action, parse_actions
from ai.context_builder import build_context
from ai.model_config import (
    AVAILABLE_MODELS,
    get_default_model,
    get_model_id,
    get_model_label,
)
from ai.ollama_provider import OllamaProvider
from ai.prompts import SYSTEM_PROMPT
from ui.theme import get_theme


class ChatWindow(tk.Toplevel):
    """
    Ventana de chat independiente con modelo local via Ollama.
    Se abre desde la toolbar de NetVault como una ventana separada.
    """

    def __init__(self, parent, app_ctrl, initial_folder: str = ""):
        super().__init__(parent)
        self.app_ctrl = app_ctrl
        self.t = get_theme(app_ctrl.get_theme())
        self._folder = initial_folder
        self._folders: list[str] = [initial_folder] if initial_folder else []
        self._messages: list[dict] = []
        self._streaming = False
        self._thinking_mark = None
        self._cancel_flag = False

        default_model = get_default_model()
        self._provider = OllamaProvider(model=default_model)

        self.title("NetVault AI")
        self.geometry("780x680")
        self.minsize(600, 500)
        self.configure(bg=self.t["bg_primary"])
        self.resizable(True, True)
        self.transient(parent)

        self._build()
        self._check_availability()

    def _build(self):
        t = self.t
        self._build_header(t)
        self._build_chat_area(t)
        self._build_context_bar(t)
        self._build_input_area(t)

    def _build_header(self, t):
        header = tk.Frame(self, bg=t["toolbar"], height=52)
        header.pack(fill="x")
        header.pack_propagate(False)

        tk.Label(
            header,
            text="⬡  NetVault AI",
            bg=t["toolbar"],
            fg=t["accent"],
            font=("Segoe UI", 11, "bold"),
        ).pack(side="left", padx=16)

        model_labels = [m["label"] for m in AVAILABLE_MODELS]
        default_label = get_model_label(self._provider.model_name())

        self._model_var = tk.StringVar(value=default_label)
        model_menu = ttk.Combobox(
            header,
            textvariable=self._model_var,
            values=model_labels,
            state="readonly",
            font=("Segoe UI", 9),
            width=32,
        )
        model_menu.pack(side="left", padx=(8, 0), pady=10)
        model_menu.bind("<<ComboboxSelected>>", self._on_model_change)

        self._status_var = tk.StringVar(value="● conectando...")
        self._status_label = tk.Label(
            header,
            textvariable=self._status_var,
            bg=t["toolbar"],
            fg=t["text_secondary"],
            font=("Segoe UI", 8),
        )
        self._status_label.pack(side="left", padx=12)

        tk.Button(
            header,
            text="Limpiar",
            command=self._clear_chat,
            bg=t["bg_secondary"],
            fg=t["text_secondary"],
            font=("Segoe UI", 8),
            relief="flat",
            cursor="hand2",
            padx=10,
            pady=4,
        ).pack(side="right", padx=8, pady=10)

    def _build_chat_area(self, t):
        frame = tk.Frame(self, bg=t["bg_primary"])
        frame.pack(fill="both", expand=True, padx=10, pady=(8, 0))

        self._chat = tk.Text(
            frame,
            bg=t["bg_secondary"],
            fg=t["text_primary"],
            insertbackground=t["accent"],
            relief="flat",
            wrap="word",
            font=("Segoe UI", 10),
            padx=16,
            pady=12,
            state="disabled",
            cursor="arrow",
        )

        self._chat.tag_configure(
            "user_name",
            foreground=t["accent"],
            font=("Segoe UI", 9, "bold"),
        )
        self._chat.tag_configure(
            "user_text",
            foreground=t["text_primary"],
            font=("Segoe UI", 10),
        )
        self._chat.tag_configure(
            "ai_name",
            foreground="#4fc3f7",
            font=("Segoe UI", 9, "bold"),
        )
        self._chat.tag_configure(
            "ai_text",
            foreground=t["text_primary"],
            font=("Segoe UI", 10),
        )
        self._chat.tag_configure(
            "code",
            foreground="#a5d6a7",
            font=("Consolas", 9),
            background=t["bg_primary"],
        )
        self._chat.tag_configure(
            "thinking",
            foreground=t["text_secondary"],
            font=("Segoe UI", 9, "italic"),
        )
        self._chat.tag_configure(
            "error",
            foreground="#ef5350",
            font=("Segoe UI", 9),
        )
        self._chat.tag_configure(
            "system",
            foreground=t["text_secondary"],
            font=("Segoe UI", 8, "italic"),
        )

        scrollbar = tk.Scrollbar(frame, orient="vertical", command=self._chat.yview)
        self._chat.configure(yscrollcommand=scrollbar.set)
        self._chat.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def _build_context_bar(self, t):
        """Barra de rutas activas - sincroniza con terminal y permite multiples directorios."""
        bar = tk.Frame(self, bg=t["bg_primary"])
        bar.pack(fill="x", padx=10, pady=(4, 0))

        tk.Label(
            bar,
            text="Rutas activas:",
            bg=t["bg_primary"],
            fg=t["text_secondary"],
            font=("Segoe UI", 8),
        ).pack(side="left")

        tk.Button(
            bar,
            text="+ agregar ruta",
            command=self._add_folder,
            bg=t["bg_primary"],
            fg=t["text_secondary"],
            font=("Segoe UI", 8),
            relief="flat",
            cursor="hand2",
        ).pack(side="right", padx=(4, 0))

        tk.Button(
            bar,
            text="usar terminal",
            command=self._use_terminal_cwd,
            bg=t["bg_primary"],
            fg=t["accent"],
            font=("Segoe UI", 8),
            relief="flat",
            cursor="hand2",
        ).pack(side="right", padx=(4, 0))

        tk.Button(
            bar,
            text="usar panel activo",
            command=self._refresh_folder,
            bg=t["bg_primary"],
            fg=t["text_secondary"],
            font=("Segoe UI", 8),
            relief="flat",
            cursor="hand2",
        ).pack(side="right", padx=(4, 0))

        self._folders_frame = tk.Frame(self, bg=t["bg_primary"])
        self._folders_frame.pack(fill="x", padx=10, pady=(2, 0))
        self._render_folders()

    def _build_input_area(self, t):
        footer = tk.Frame(self, bg=t["bg_primary"])
        footer.pack(fill="x", padx=10, pady=8)

        input_frame = tk.Frame(footer, bg=t["bg_secondary"], bd=0)
        input_frame.pack(fill="x", pady=(0, 6))

        self._input = tk.Text(
            input_frame,
            bg=t["bg_secondary"],
            fg=t["text_primary"],
            insertbackground=t["accent"],
            relief="flat",
            font=("Segoe UI", 10),
            height=3,
            padx=12,
            pady=8,
            wrap="word",
        )
        self._input.pack(fill="x")
        self._input.bind("<Return>", self._on_enter)
        self._input.bind("<Shift-Return>", lambda _e: None)

        btn_row = tk.Frame(footer, bg=t["bg_primary"])
        btn_row.pack(fill="x")

        self._send_btn = tk.Button(
            btn_row,
            text="Enviar  ↵",
            command=self._send_message,
            bg=t["accent"],
            fg="white",
            font=("Segoe UI", 9, "bold"),
            relief="flat",
            cursor="hand2",
            padx=16,
            pady=6,
        )
        self._send_btn.pack(side="right")

        self._cancel_btn = tk.Button(
            btn_row,
            text="Cancelar",
            command=self._cancel_stream,
            bg=t["bg_secondary"],
            fg=t["text_secondary"],
            font=("Segoe UI", 9),
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=6,
            state="disabled",
        )
        self._cancel_btn.pack(side="right", padx=(0, 6))

        tk.Label(
            btn_row,
            text="Enter para enviar · Shift+Enter para nueva linea",
            bg=t["bg_primary"],
            fg=t["text_secondary"],
            font=("Segoe UI", 8),
        ).pack(side="left")

    def _check_availability(self):
        """Verifica disponibilidad del modelo en background."""

        def check():
            available = self._provider.is_available()
            self.after(0, lambda: self._update_status(available))

        threading.Thread(target=check, daemon=True).start()

    def _update_status(self, available: bool):
        if available:
            self._status_var.set(f"● {self._provider.model_name()}")
            self._status_label.config(fg="#66bb6a")
            self._append_system(
                f"Modelo {self._provider.model_name()} listo. "
                f"Puedes preguntarme sobre tu proyecto o cualquier tema tecnico.\n"
            )
        else:
            self._status_var.set("● sin conexion")
            self._status_label.config(fg="#ef5350")
            self._append_system(
                "No se pudo conectar con Ollama. "
                "Verifica que este corriendo con: ollama serve\n"
            )

    def _on_model_change(self, _event=None):
        label = self._model_var.get()
        model_id = get_model_id(label)
        self._provider.set_model(model_id)
        self._status_var.set("● verificando...")
        self._status_label.config(fg=self.t["text_secondary"])
        self._append_system(f"Cambiando a {model_id}...\n")
        self._check_availability()

    def _on_enter(self, event):
        """Enter envia, Shift+Enter inserta salto de linea."""
        if event.state & 0x1:
            return None
        self._send_message()
        return "break"

    def _send_message(self):
        if self._streaming:
            return

        text = self._input.get("1.0", "end-1c").strip()
        if not text:
            return

        self._input.delete("1.0", "end")
        self._messages.append({"role": "user", "content": text})
        self._append_user(text)
        self._start_stream()

    def _start_stream(self):
        self._streaming = True
        self._send_btn.config(state="disabled")
        self._cancel_btn.config(state="normal")

        self._append_thinking()

        from ai.prompts import SYSTEM_PROMPT as BASE_PROMPT

        system_content = BASE_PROMPT
        if self._folders:
            ctx_parts = []
            for folder in self._folders:
                ctx_parts.append(f"### Ruta: {folder}\n{build_context(folder)}")
            system_content += "\n\n## Rutas activas\n" + "\n\n".join(ctx_parts)
        elif self._folder:
            ctx = build_context(self._folder)
            system_content += f"\n\n## Contexto del proyecto actual\n{ctx}"

        full_messages = [{"role": "system", "content": system_content}] + self._messages

        self._cancel_flag = False
        threading.Thread(
            target=self._stream_response,
            args=(full_messages,),
            daemon=True,
        ).start()

    def _stream_response(self, messages: list[dict]):
        """Corre en background y hace streaming token a token a la UI."""
        full_response = []
        first_token = True

        try:
            for token in self._provider.chat(messages, stream=True):
                if self._cancel_flag:
                    self.after(0, self._on_stream_cancelled)
                    return

                if first_token:
                    self.after(0, self._remove_thinking)
                    self.after(0, self._start_ai_bubble)
                    first_token = False

                full_response.append(token)
                self.after(0, lambda t=token: self._append_token(t))

        except Exception as e:
            self.after(0, lambda: self._append_error(str(e)))
        finally:
            response_text = "".join(full_response)
            if response_text:
                self._messages.append({"role": "assistant", "content": response_text})

            active_folder = self._folder or (self._folders[0] if self._folders else "")
            if response_text and active_folder:
                actions = parse_actions(response_text, active_folder)
                if actions:
                    self.after(0, lambda a=actions: self._show_actions(a))
            elif response_text:
                actions = parse_actions(response_text, "")
                if actions:
                    self.after(0, lambda a=actions: self._show_actions(a))

            self.after(0, self._on_stream_done)

    def _cancel_stream(self):
        self._cancel_flag = True

    def _on_stream_cancelled(self):
        self._remove_thinking()
        self._append_system("Respuesta cancelada.\n")
        self._on_stream_done()

    def _on_stream_done(self):
        self._streaming = False
        self._send_btn.config(state="normal")
        self._cancel_btn.config(state="disabled")
        self._append_raw("\n\n", "ai_text")

    def _show_actions(self, actions: list):
        """Renderiza los bloques de acción con botón de confirmación."""
        t = self.t
        self._chat.configure(state="normal")

        self._chat.insert("end", "\n── Acciones propuestas ──────────────────\n", "system")

        for action in actions:
            tag = "error" if action.is_high_risk else "ai_name"
            prefix = "⚠ " if action.is_high_risk else "▸ "
            self._chat.insert("end", f"{prefix}{action.description}\n", tag)

            btn_frame = tk.Frame(self._chat, bg=t["bg_secondary"])
            btn = tk.Button(
                btn_frame,
                text="Ejecutar",
                bg=t["accent"] if not action.is_high_risk else "#ef5350",
                fg="white",
                font=("Segoe UI", 8, "bold"),
                relief="flat",
                cursor="hand2",
                padx=10,
                pady=3,
                command=lambda a=action, b=btn_frame: self._confirm_action(a, b),
            )
            btn.pack(side="left", padx=(0, 6))

            btn_ignore = tk.Button(
                btn_frame,
                text="Ignorar",
                bg=t["bg_secondary"],
                fg=t["text_secondary"],
                font=("Segoe UI", 8),
                relief="flat",
                cursor="hand2",
                padx=8,
                pady=3,
                command=lambda b=btn_frame: self._ignore_action(b),
            )
            btn_ignore.pack(side="left")

            window_index = self._chat.index("end")
            btn_frame._text_index = window_index
            self._chat.window_create("end", window=btn_frame)
            self._chat.insert("end", "\n")

        self._chat.insert("end", "─────────────────────────────────────────\n", "system")
        self._chat.see("end")
        self._chat.configure(state="disabled")

    def _confirm_action(self, action, btn_frame):
        try:
            # busca la terminal session en la ventana principal
            terminal = None
            try:
                master = self.master
                if hasattr(master, "_terminal") and hasattr(master._terminal, "session"):
                    terminal = master._terminal.session
            except Exception:
                pass

            ok, msg = execute_action(action, self.app_ctrl.file_ctrl, terminal)

            self._chat.configure(state="normal")
            text_index = getattr(btn_frame, "_text_index", None)
            if text_index is not None:
                try:
                    self._chat.delete(text_index, f"{text_index} +1 chars")
                except Exception:
                    pass
            btn_frame.destroy()
            tag = "ai_text" if ok else "error"
            icon = "✓" if ok else "✗"
            self._chat.insert("end", f"  {icon} {msg}\n", tag)
            self._chat.see("end")
            self._chat.configure(state="disabled")

            if ok:
                try:
                    if hasattr(master, "_active"):
                        master._active().refresh()
                except Exception:
                    pass
        except Exception as e:
            self._append_error(str(e))

    def _ignore_action(self, btn_frame):
        """Descarta una acción sin ejecutarla."""
        self._chat.configure(state="normal")
        text_index = getattr(btn_frame, "_text_index", None)
        if text_index is not None:
            try:
                self._chat.delete(text_index, f"{text_index} +1 chars")
            except Exception:
                pass
        btn_frame.destroy()
        self._chat.insert("end", "  - ignorado\n", "system")
        self._chat.see("end")
        self._chat.configure(state="disabled")

    def _append_user(self, text: str):
        self._append_raw("Tu\n", "user_name")
        self._append_raw(text + "\n\n", "user_text")

    def _append_thinking(self):
        self._append_raw("NetVault AI\n", "ai_name")
        self._thinking_mark = self._chat.index("end-1c")
        self._append_raw("pensando...\n", "thinking")
        self._animate_thinking(0)

    def _animate_thinking(self, dots: int):
        """Anima los puntos de pensando mientras espera el primer token."""
        if not self._streaming or not self._thinking_mark:
            return
        symbols = ["pensando   ", "pensando.  ", "pensando.. ", "pensando..."]
        try:
            self._chat.configure(state="normal")
            line_start = self._thinking_mark
            line_end = f"{line_start} lineend"
            self._chat.delete(line_start, line_end)
            self._chat.insert(line_start, symbols[dots % 4], "thinking")
            self._chat.configure(state="disabled")
        except Exception:
            return
        self.after(400, lambda: self._animate_thinking(dots + 1))

    def _remove_thinking(self):
        """Elimina el indicador de pensando antes de mostrar la respuesta."""
        try:
            if self._thinking_mark:
                self._chat.configure(state="normal")
                line_start = self._thinking_mark
                line_end = f"{line_start} lineend+1c"
                self._chat.delete(line_start, line_end)
                self._chat.configure(state="disabled")
                self._thinking_mark = None
        except Exception:
            pass

    def _start_ai_bubble(self):
        """Inserta el nombre del AI antes del streaming de tokens."""
        self._append_raw("NetVault AI\n", "ai_name")

    def _append_token(self, token: str):
        """Inserta un token en streaming."""
        self._append_raw(token, "ai_text")

    def _append_error(self, msg: str):
        self._remove_thinking()
        self._append_raw(f"Error: {msg}\n", "error")

    def _append_system(self, msg: str):
        self._append_raw(msg, "system")

    def _append_raw(self, text: str, tag: str):
        self._chat.configure(state="normal")
        self._chat.insert("end", text, tag)
        self._chat.see("end")
        self._chat.configure(state="disabled")

    def _clear_chat(self):
        self._messages.clear()
        self._chat.configure(state="normal")
        self._chat.delete("1.0", "end")
        self._chat.configure(state="disabled")
        self._append_system("Conversacion limpiada.\n")

    def _render_folders(self):
        """Renderiza las chips de rutas activas."""
        t = self.t
        for widget in self._folders_frame.winfo_children():
            widget.destroy()

        if not self._folders:
            tk.Label(
                self._folders_frame,
                text="sin rutas activas",
                bg=t["bg_primary"],
                fg=t["text_secondary"],
                font=("Segoe UI", 8, "italic"),
            ).pack(side="left")
            return

        for folder in self._folders:
            chip = tk.Frame(self._folders_frame, bg=t["bg_secondary"])
            chip.pack(side="left", padx=(0, 4), pady=2)

            name = folder.split("\\")[-1] or folder.split("/")[-1] or folder
            tk.Label(
                chip,
                text=name,
                bg=t["bg_secondary"],
                fg=t["accent"],
                font=("Segoe UI", 8),
                padx=6,
                pady=2,
                cursor="hand2",
            ).pack(side="left")

            tk.Button(
                chip,
                text="✕",
                bg=t["bg_secondary"],
                fg=t["text_secondary"],
                font=("Segoe UI", 7),
                relief="flat",
                cursor="hand2",
                padx=2,
                pady=2,
                bd=0,
                command=lambda f=folder: self._remove_folder(f),
            ).pack(side="left")

    def _add_folder(self):
        """Abre dialogo para agregar una ruta manualmente."""
        from tkinter import filedialog

        folder = filedialog.askdirectory(title="Seleccionar carpeta")
        if folder and folder not in self._folders:
            self._folders.append(folder)
            if not self._folder:
                self._folder = folder
            self._render_folders()
            self._append_system(f"Ruta agregada: {folder}\n")

    def _remove_folder(self, folder: str):
        """Quita una ruta de la lista activa."""
        if folder in self._folders:
            self._folders.remove(folder)
        if self._folder == folder:
            self._folder = self._folders[0] if self._folders else ""
        self._render_folders()

    def _use_terminal_cwd(self):
        """Sincroniza el contexto con el directorio actual de la terminal."""
        try:
            master = self.master
            if hasattr(master, "_terminal") and hasattr(master._terminal, "cwd"):
                folder = str(master._terminal.cwd)
                if folder and folder not in self._folders:
                    self._folders.append(folder)
                self._folder = folder
                self._render_folders()
                self._append_system(f"Contexto sincronizado con terminal: {folder}\n")
        except Exception:
            self._append_system("No se pudo leer el directorio de la terminal.\n")

    def set_folder(self, folder_path: str):
        """Llamado desde NetVault cuando el usuario navega a una carpeta."""
        self._folder = folder_path
        if folder_path and folder_path not in self._folders:
            self._folders.append(folder_path)
        self._render_folders()

    def _refresh_folder(self):
        """Usa la carpeta del panel activo de NetVault."""
        try:
            master = self.master
            if hasattr(master, "_active"):
                folder = master._active()._current
                if folder:
                    if folder not in self._folders:
                        self._folders.append(folder)
                    self._folder = folder
                    self._render_folders()
                    self._append_system(f"Contexto actualizado: {folder}\n")
        except Exception:
            pass
