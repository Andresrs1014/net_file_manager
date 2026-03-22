import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


# Acciones que el modelo puede proponer
ACTION_CREATE_FOLDER  = "create_folder"
ACTION_CREATE_FILE    = "create_file"
ACTION_WRITE_FILE     = "write_file"
ACTION_RENAME         = "rename"
ACTION_MOVE           = "move"
ACTION_DELETE_TRASH   = "delete_trash"
ACTION_RUN_COMMAND    = "run_command"

SAFE_ACTIONS = {
    ACTION_CREATE_FOLDER,
    ACTION_CREATE_FILE,
    ACTION_WRITE_FILE,
    ACTION_RENAME,
    ACTION_MOVE,
    ACTION_DELETE_TRASH,
    ACTION_RUN_COMMAND,
}

# Comandos que NUNCA se ejecutan sin confirmación explícita adicional
HIGH_RISK_COMMANDS = {
    "rm", "rmdir", "del", "format", "rd",
    "remove-item", "clear-recyclebin",
}


@dataclass
class ParsedAction:
    action:      str
    params:      dict
    description: str   # texto legible para mostrar al usuario
    is_high_risk: bool = False


def parse_actions(text: str, base_folder: str) -> list[ParsedAction]:
    """
    Busca bloques de acción en la respuesta del modelo.
    El modelo debe responder con bloques JSON entre ```action y ```.

    Ejemplo que el modelo puede generar:
```action
        {
          "action": "create_folder",
          "path": "src/services",
          "description": "Crear carpeta services dentro de src"
        }
```
    """
    actions = []
    pattern = r"```action\s*([\s\S]*?)```"
    matches = re.findall(pattern, text, re.IGNORECASE)

    for match in matches:
        try:
            data = json.loads(match.strip())
            action_type = data.get("action", "")
            if action_type not in SAFE_ACTIONS:
                continue

            parsed = _build_action(action_type, data, base_folder)
            if parsed:
                actions.append(parsed)
        except (json.JSONDecodeError, Exception):
            continue

    return actions


def _build_action(action_type: str, data: dict, base_folder: str) -> Optional[ParsedAction]:
    base = Path(base_folder)

    if action_type == ACTION_CREATE_FOLDER:
        rel_path = data.get("path", "")
        if not rel_path:
            return None
        full_path = str(base / rel_path)
        return ParsedAction(
            action=action_type,
            params={"path": full_path},
            description=f"Crear carpeta: {rel_path}",
        )

    if action_type == ACTION_CREATE_FILE:
        rel_path = data.get("path", "")
        if not rel_path:
            return None
        full_path = str(base / rel_path)
        return ParsedAction(
            action=action_type,
            params={"path": full_path},
            description=f"Crear archivo: {rel_path}",
        )

    if action_type == ACTION_WRITE_FILE:
        rel_path = data.get("path", "")
        content  = data.get("content", "")
        if not rel_path:
            return None
        full_path = str(base / rel_path)
        preview = content[:80] + "..." if len(content) > 80 else content
        return ParsedAction(
            action=action_type,
            params={"path": full_path, "content": content},
            description=f"Escribir en {rel_path}: {preview}",
        )

    if action_type == ACTION_RENAME:
        rel_path = data.get("path", "")
        new_name = data.get("new_name", "")
        if not rel_path or not new_name:
            return None
        full_path = str(base / rel_path)
        return ParsedAction(
            action=action_type,
            params={"path": full_path, "new_name": new_name},
            description=f"Renombrar {rel_path} → {new_name}",
        )

    if action_type == ACTION_MOVE:
        src = data.get("src", "")
        dst = data.get("dst", "")
        if not src or not dst:
            return None
        full_src = str(base / src)
        full_dst = str(base / dst)
        return ParsedAction(
            action=action_type,
            params={"src": full_src, "dst": full_dst},
            description=f"Mover {src} → {dst}",
        )

    if action_type == ACTION_DELETE_TRASH:
        rel_path = data.get("path", "")
        if not rel_path:
            return None
        full_path = str(base / rel_path)
        return ParsedAction(
            action=action_type,
            params={"path": full_path},
            description=f"Eliminar a papelera: {rel_path}",
            is_high_risk=True,
        )

    if action_type == ACTION_RUN_COMMAND:
        command = data.get("command", "")
        if not command:
            return None
        cmd_lower = command.lower().split()[0]
        is_risk = cmd_lower in HIGH_RISK_COMMANDS
        return ParsedAction(
            action=action_type,
            params={"command": command, "cwd": base_folder},
            description=f"Ejecutar: {command}",
            is_high_risk=is_risk,
        )

    return None


def execute_action(action: ParsedAction, file_ctrl, terminal_session=None) -> tuple[bool, str]:
    """
    Ejecuta una acción confirmada por el usuario.
    Retorna (éxito, mensaje).
    """
    try:
        a = action.action
        p = action.params

        if a == ACTION_CREATE_FOLDER:
            parent = str(Path(p["path"]).parent)
            name   = Path(p["path"]).name
            file_ctrl.create_folder(parent, name)
            return True, f"Carpeta creada: {p['path']}"

        if a == ACTION_CREATE_FILE:
            parent = str(Path(p["path"]).parent)
            name   = Path(p["path"]).name
            file_ctrl.create_file(parent, name)
            return True, f"Archivo creado: {p['path']}"

        if a == ACTION_WRITE_FILE:
            path = Path(p["path"])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(p["content"], encoding="utf-8")
            return True, f"Archivo escrito: {p['path']}"

        if a == ACTION_RENAME:
            file_ctrl.rename(p["path"], p["new_name"])
            return True, f"Renombrado correctamente"

        if a == ACTION_MOVE:
            file_ctrl.ops.move(p["src"], p["dst"])
            return True, f"Movido correctamente"

        if a == ACTION_DELETE_TRASH:
            file_ctrl.delete([p["path"]], permanent=False)
            return True, f"Eliminado a papelera"

        if a == ACTION_RUN_COMMAND:
            if terminal_session:
                terminal_session.run_async(p["command"])
                return True, f"Comando enviado a terminal"
            return False, "Terminal no disponible"

        return False, "Acción desconocida"

    except Exception as e:
        return False, f"Error: {e}"