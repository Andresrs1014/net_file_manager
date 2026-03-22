import json
import time
import urllib.request
import urllib.error
from typing import Generator

from ai.provider import AIProvider


OLLAMA_BASE_URL = "http://localhost:11434"


class OllamaProvider(AIProvider):
    """
    Implementación de AIProvider para Ollama corriendo localmente.
    Compatible con la API de Ollama en /api/chat.

    Uso básico:
        provider = OllamaProvider(model="qwen2.5-coder:7b")
        if provider.is_available():
            for token in provider.chat([{"role": "user", "content": "Hola"}]):
                print(token, end="", flush=True)
    """

    def __init__(self, model: str = "qwen2.5-coder:7b"):
        self._model = model

    def model_name(self) -> str:
        return self._model

    def is_available(self) -> bool:
        """Hace un ping rápido a Ollama y verifica que el modelo esté disponible."""
        try:
            with urllib.request.urlopen(f"{OLLAMA_BASE_URL}/api/tags", timeout=3) as resp:
                data = json.loads(resp.read())
                models = [m["name"] for m in data.get("models", [])]
                # acepta tanto "qwen2.5-coder:7b" como "qwen2.5-coder:7b-..."
                return any(m.startswith(self._model.split(":")[0]) for m in models)
        except Exception:
            return False

    def chat(self, messages: list[dict], stream: bool = True) -> Generator[str, None, None]:
        """
        Llama a /api/chat de Ollama y hace yield de cada token recibido.
        Con stream=False acumula todo y hace yield una sola vez.
        """
        payload = json.dumps({
            "model":    self._model,
            "messages": messages,
            "stream":   stream,
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{OLLAMA_BASE_URL}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                if stream:
                    for raw_line in resp:
                        line = raw_line.decode("utf-8").strip()
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("message", {}).get("content", "")
                            if token:
                                yield token
                            if chunk.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue
                else:
                    raw = resp.read().decode("utf-8")
                    data = json.loads(raw)
                    yield data.get("message", {}).get("content", "")

        except urllib.error.URLError as e:
            yield f"[Error de conexión con Ollama: {e.reason}]"
        except Exception as e:
            yield f"[Error inesperado: {e}]"

    def measure_latency(self, prompt: str = "responde solo: ok") -> dict:
        """
        Mide cuánto tarda el modelo en dar el primer token y en completar.
        Útil para validar la experiencia en cada máquina antes de construir UX.

        Retorna:
            {
                "model": str,
                "time_to_first_token_ms": float,
                "total_time_ms": float,
                "tokens_generated": int,
                "available": bool
            }
        """
        if not self.is_available():
            return {
                "model": self._model,
                "time_to_first_token_ms": None,
                "total_time_ms": None,
                "tokens_generated": 0,
                "available": False,
            }

        messages = [{"role": "user", "content": prompt}]
        start = time.perf_counter()
        first_token_ms = None
        tokens = 0

        for token in self.chat(messages, stream=True):
            if first_token_ms is None:
                first_token_ms = (time.perf_counter() - start) * 1000
            tokens += 1

        total_ms = (time.perf_counter() - start) * 1000

        return {
            "model":                  self._model,
            "time_to_first_token_ms": round(first_token_ms or 0, 1),
            "total_time_ms":          round(total_ms, 1),
            "tokens_generated":       tokens,
            "available":              True,
        }