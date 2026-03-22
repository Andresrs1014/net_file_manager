import queue
import subprocess
import threading
from pathlib import Path


# Marcador único que usamos para saber cuándo terminó un comando
_PROMPT_MARKER = "<<NETVAULT_PROMPT>>"


class TerminalSession:
    def __init__(self, initial_cwd=None):
        self.cwd = Path(initial_cwd or Path.cwd())
        self.queue: queue.Queue[tuple[str, str]] = queue.Queue()
        self.history: list[str] = []
        self.history_index = -1
        self._lock = threading.Lock()
        self._running = False
        self._process = None
        self._start_shell()

    # ── Ciclo de vida ────────────────────────────────────────────────

    def _start_shell(self):
        """Arranca un proceso PowerShell persistente con stdin/stdout conectados."""
        self._process = subprocess.Popen(
            ["powershell", "-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "-"],
            cwd=str(self.cwd),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        # Hilo que lee stdout continuamente
        threading.Thread(target=self._read_stdout, daemon=True).start()
        # Hilo que lee stderr continuamente
        threading.Thread(target=self._read_stderr, daemon=True).start()

    def close(self):
        """Cierra la sesión limpiamente."""
        try:
            if self._process and self._process.poll() is None:
                self._send_raw("exit\n")
                self._process.wait(timeout=3)
        except Exception:
            pass
        finally:
            if self._process:
                self._process.kill()

    # ── Lectura continua de output ───────────────────────────────────

    def _read_stdout(self):
        """Lee stdout línea a línea y lo manda a la queue. Detecta el marcador de fin."""
        for line in self._process.stdout:
            if _PROMPT_MARKER in line:
                # El comando terminó — apagamos el flag de "corriendo"
                self._running = False
                self.queue.put(("meta", f"[listo]\n"))
            else:
                self.queue.put(("stdout", line))

    def _read_stderr(self):
        """Lee stderr línea a línea y lo manda a la queue."""
        for line in self._process.stderr:
            self.queue.put(("stderr", line))

    # ── Ejecución de comandos ────────────────────────────────────────

    def _send_raw(self, text: str):
        """Escribe directamente en stdin del proceso."""
        try:
            self._process.stdin.write(text)
            self._process.stdin.flush()
        except Exception as e:
            self.queue.put(("stderr", f"[Error enviando comando: {e}]\n"))

    def run_async(self, command: str):
        """
        Envía el comando al shell persistente.
        Después del comando envía un echo del marcador para saber cuándo terminó.
        """
        with self._lock:
            self._running = True

        # Ejecuta el comando y luego imprime el marcador para detectar el fin
        full = f"{command}\nWrite-Output '{_PROMPT_MARKER}'\n"
        threading.Thread(target=self._send_raw, args=(full,), daemon=True).start()

    def can_run(self) -> bool:
        """True si no hay un comando corriendo actualmente."""
        return not self._running

    # ── Directorio de trabajo ────────────────────────────────────────

    def change_cwd(self, raw_target: str) -> Path | None:
        """
        Cambia el directorio tanto en Python como en el proceso PowerShell.
        Retorna el nuevo Path si tuvo éxito, None si la ruta no existe.
        """
        target = raw_target.strip().strip('"')
        if not target:
            return self.cwd
        candidate = Path(target)
        if not candidate.is_absolute():
            candidate = (self.cwd / candidate).resolve()
        if candidate.exists() and candidate.is_dir():
            self.cwd = candidate
            # Sincroniza el cwd del proceso PowerShell
            self._send_raw(f"Set-Location '{self.cwd}'\n")
            return candidate
        return None

    def set_cwd(self, path: str) -> Path | None:
        candidate = Path(path)
        if candidate.exists() and candidate.is_dir():
            self.cwd = candidate
            self._send_raw(f"Set-Location '{self.cwd}'\n")
            return candidate
        return None

    # ── Historial ────────────────────────────────────────────────────

    def remember(self, command: str):
        self.history.append(command)
        self.history_index = len(self.history)

    def history_up(self) -> str | None:
        if not self.history:
            return None
        self.history_index = max(0, self.history_index - 1)
        return self.history[self.history_index]

    def history_down(self) -> str | None:
        if not self.history:
            return "None"
        self.history_index = min(len(self.history), self.history_index + 1)
        if self.history_index >= len(self.history):
            return "None"
        return self.history[self.history_index]