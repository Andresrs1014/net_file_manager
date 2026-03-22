from abc import ABC, abstractmethod
from typing import Generator


class AIProvider(ABC):
    """
    Interfaz base para cualquier proveedor de IA.
    NetVault habla con esta interfaz — no con Ollama directamente.
    Si mañana cambias a OpenAI, LM Studio u otro backend,
    solo escribes un nuevo Provider y no tocas nada más.
    """

    @abstractmethod
    def chat(self, messages: list[dict], stream: bool = True) -> Generator[str, None, None]:
        """
        Envía una conversación y devuelve la respuesta token a token (stream=True)
        o como un solo string (stream=False).

        messages: lista de dicts con formato estándar OpenAI:
            [
                {"role": "system", "content": "..."},
                {"role": "user",   "content": "..."},
                {"role": "assistant", "content": "..."},
            ]
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """
        Verifica si el backend está corriendo y accesible.
        Usado al arrancar NetVault para mostrar estado del modelo.
        """
        ...

    @abstractmethod
    def model_name(self) -> str:
        """Nombre del modelo activo, para mostrarlo en la UI."""
        ...