import subprocess


def _has_nvidia_gpu() -> bool:
    """Detecta si hay GPU NVIDIA disponible en el sistema."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0 and result.stdout.strip() != ""
    except Exception:
        return False


# Modelos disponibles — orden = como aparecen en el selector
AVAILABLE_MODELS = [
    {"id": "qwen2.5-coder:7b",  "label": "Qwen 2.5 Coder 7B  · rápido"},
    {"id": "qwen3:8b",          "label": "Qwen 3 8B  · balanceado"},
    {"id": "gpt-oss:20b",       "label": "GPT OSS 20B  · lento pero potente"},
    {"id": "qwen2.5-coder:3b",  "label": "Qwen 2.5 Coder 3B  · ligero"},
]

def get_default_model() -> str:
    """Elige el modelo por defecto según el hardware disponible."""
    if _has_nvidia_gpu():
        return "qwen2.5-coder:7b"
    return "qwen2.5-coder:3b"


def get_model_labels() -> list[str]:
    """Lista de labels para mostrar en el selector de la UI."""
    return [m["label"] for m in AVAILABLE_MODELS]


def get_model_id(label: str) -> str:
    """Convierte el label del selector al id real del modelo."""
    for m in AVAILABLE_MODELS:
        if m["label"] == label:
            return m["id"]
    return get_default_model()


def get_model_label(model_id: str) -> str:
    """Convierte el id del modelo a su label para mostrar en UI."""
    for m in AVAILABLE_MODELS:
        if m["id"] == model_id:
            return m["label"]
    return model_id