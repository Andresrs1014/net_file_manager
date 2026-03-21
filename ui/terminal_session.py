import queue
import subprocess
import threading
from pathlib import Path


class TerminalSession:
    def __init__(self, initial_cwd=None):
        self.cwd = Path(initial_cwd or Path.cwd())
        self.process = None
        self.queue: queue.Queue[tuple[str, str]] = queue.Queue()
        self.history: list[str] = []
        self.history_index = -1

    def can_run(self) -> bool:
        return self.process is None

    def remember(self, command: str):
        self.history.append(command)
        self.history_index = len(self.history)

    def history_up(self) -> str | None:
        if not self.history:
            return None
        self.history_index = max(0, self.history_index - 1)
        return self.history[self.history_index]

    def history_down(self) -> str:
        if not self.history:
            return ""
        self.history_index = min(len(self.history), self.history_index + 1)
        if self.history_index >= len(self.history):
            return ""
        return self.history[self.history_index]

    def change_cwd(self, raw_target: str) -> Path | None:
        target = raw_target.strip().strip('"')
        if not target:
            return self.cwd
        candidate = Path(target)
        if not candidate.is_absolute():
            candidate = (self.cwd / candidate).resolve()
        if candidate.exists() and candidate.is_dir():
            self.cwd = candidate
            return candidate
        return None

    def set_cwd(self, path: str) -> Path | None:
        candidate = Path(path)
        if candidate.exists() and candidate.is_dir():
            self.cwd = candidate
            return candidate
        return None

    def run_async(self, command: str):
        thread = threading.Thread(target=self._execute_command, args=(command,), daemon=True)
        thread.start()

    def _execute_command(self, command: str):
        try:
            self.process = subprocess.Popen(
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
            stdout, stderr = self.process.communicate()
            if stdout:
                self.queue.put(("stdout", stdout))
            if stderr:
                self.queue.put(("stderr", stderr))
            self.queue.put(("meta", f"[exit {self.process.returncode}]\n"))
        except Exception as exc:
            self.queue.put(("stderr", f"{exc}\n"))
        finally:
            self.process = None
