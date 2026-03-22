import os
from pathlib import Path


# Archivos clave que se leen completos si existen
KEY_FILES = {
    "requirements.txt", "pyproject.toml", "package.json",
    "docker-compose.yml", "compose.yaml", "README.md",
    ".env.example", "Makefile", "go.mod", "Cargo.toml",
}

# Extensiones de código que se incluyen como fragmentos
CODE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs",
    ".java", ".cs", ".cpp", ".c", ".h",
}

MAX_FILE_CHARS = 2000   # máximo de caracteres por archivo
MAX_TOTAL_CHARS = 6000  # máximo de contexto total


def build_context(folder_path: str) -> str:
    """
    Construye un resumen del proyecto en la carpeta activa.
    Incluye estructura, archivos clave y fragmentos de código relevantes.
    Diseñado para caber dentro del contexto útil del modelo.
    """
    path = Path(folder_path)
    if not path.exists() or not path.is_dir():
        return f"Carpeta no accesible: {folder_path}"

    parts = []
    total_chars = 0

    # 1. Estructura de carpetas (2 niveles)
    tree = _build_tree(path, max_depth=2)
    parts.append(f"## Estructura de {path.name}\n{tree}")
    total_chars += len(tree)

    # 2. Archivos clave completos
    for filename in KEY_FILES:
        file_path = path / filename
        if file_path.exists():
            content = _read_file(file_path, MAX_FILE_CHARS)
            chunk = f"\n## {filename}\n```\n{content}\n```"
            if total_chars + len(chunk) > MAX_TOTAL_CHARS:
                break
            parts.append(chunk)
            total_chars += len(chunk)

    # 3. Entry points de código (main.py, app.py, index.ts, etc.)
    entry_points = _find_entry_points(path)
    for file_path in entry_points:
        if total_chars >= MAX_TOTAL_CHARS:
            break
        content = _read_file(file_path, MAX_FILE_CHARS)
        rel = file_path.relative_to(path)
        ext = file_path.suffix
        chunk = f"\n## {rel}\n```{ext.lstrip('.')}\n{content}\n```"
        if total_chars + len(chunk) > MAX_TOTAL_CHARS:
            break
        parts.append(chunk)
        total_chars += len(chunk)

    return "\n".join(parts)


def _build_tree(path: Path, max_depth: int, _depth: int = 0) -> str:
    """Genera un árbol de directorios simple."""
    if _depth > max_depth:
        return ""
    lines = []
    try:
        entries = sorted(path.iterdir(), key=lambda e: (e.is_file(), e.name.lower()))
        for entry in entries:
            if entry.name.startswith(".") or entry.name in {"__pycache__", "node_modules", ".git", "venv", ".venv"}:
                continue
            indent = "  " * _depth
            if entry.is_dir():
                lines.append(f"{indent}📁 {entry.name}/")
                if _depth < max_depth:
                    lines.append(_build_tree(entry, max_depth, _depth + 1))
            else:
                lines.append(f"{indent}📄 {entry.name}")
    except PermissionError:
        lines.append(f"{'  ' * _depth}[sin acceso]")
    return "\n".join(filter(None, lines))


def _read_file(path: Path, max_chars: int) -> str:
    """Lee un archivo con límite de caracteres."""
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        if len(content) > max_chars:
            return content[:max_chars] + f"\n... [truncado, {len(content)} chars total]"
        return content
    except Exception as e:
        return f"[Error leyendo archivo: {e}]"


def _find_entry_points(path: Path) -> list[Path]:
    """Encuentra archivos de entrada típicos del proyecto."""
    candidates = [
        "main.py", "app.py", "server.py", "run.py",
        "index.ts", "index.js", "main.ts", "main.go",
        "src/main.py", "src/app.py", "src/index.ts",
    ]
    result = []
    for name in candidates:
        p = path / name
        if p.exists():
            result.append(p)
    return result[:3]  # máximo 3 entry points