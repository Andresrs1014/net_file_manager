from pathlib import Path

from ui.terminal_commands import dedupe


def build_path_suggestions(cwd: Path) -> list[str]:
    items = []
    try:
        for child in sorted(cwd.iterdir(), key=lambda p: p.name.lower())[:20]:
            if child.is_dir():
                items.append(f'cd "{child.name}"')
                items.append(f'Get-ChildItem "{child.name}"')
            else:
                items.append(child.name)
    except OSError:
        return []
    return items


def find_suggestions(
    query: str,
    history: list[str],
    command_templates: list[str],
    cwd: Path,
    limit: int = 8,
) -> list[str]:
    raw = query.strip().lower()
    if len(raw) < 2:
        return []
    pool = dedupe(history[::-1] + command_templates + build_path_suggestions(cwd))
    return [item for item in pool if raw in item.lower()][:limit]
