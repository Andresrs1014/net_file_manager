from pathlib import Path


BASE_COMMAND_GROUPS = {
    "Comunes": [
        "dir",
        "Get-ChildItem -Force",
        "cd ..",
        "pwd",
        "cls",
        "tree /f",
    ],
    "Creación": [
        "mkdir nueva_carpeta",
        "New-Item archivo.txt -ItemType File",
        "python -m venv .venv",
        "npm init -y",
    ],
    "Revisión": [
        "Get-ChildItem",
        "Get-ChildItem -Recurse -File | Select-Object -First 30",
        "Get-ChildItem -Recurse | Measure-Object",
        "where python",
        "where git",
    ],
    "Git": [
        "git status",
        "git pull",
        "git checkout -b feature/",
        "git branch",
        "git log --oneline -10",
    ],
    "Python": [
        "python -m venv .venv",
        ".\\.venv\\Scripts\\activate",
        "pip install -r requirements.txt",
        "python -m pip install -r requirements.txt",
        "pytest",
        "python -m pip list",
    ],
    "Node": [
        "npm install",
        "npm run dev",
        "npm test",
        "npm run build",
        "npm list --depth=0",
    ],
    "Docker": [
        "docker compose up -d",
        "docker compose down",
        "docker compose logs -f",
        "docker ps",
    ],
    "Red": [
        "ping 8.8.8.8",
        "ipconfig",
        "net use",
        "ssh user@server",
    ],
}


def dedupe(items: list[str]) -> list[str]:
    seen = set()
    ordered = []
    for item in items:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def build_command_groups(cwd: Path) -> dict[str, list[str]]:
    groups = {name: values[:] for name, values in BASE_COMMAND_GROUPS.items()}

    dynamic_common = [
        "Get-ChildItem -Force",
        "Get-ChildItem -Recurse -File | Select-Object -First 50",
        f'cd "{cwd}"',
    ]
    groups["Comunes"] = dedupe(dynamic_common + groups["Comunes"])

    if (cwd / "requirements.txt").exists() or (cwd / "pyproject.toml").exists():
        groups["Python"] = dedupe(
            [
                "python -m venv .venv",
                ".\\.venv\\Scripts\\activate",
                "pip install -r requirements.txt",
                "python -m pip install -r requirements.txt",
                "pytest",
                "python -m pip list",
            ]
            + groups["Python"]
        )

    if (cwd / "package.json").exists():
        groups["Node"] = dedupe(
            [
                "npm install",
                "npm run dev",
                "npm test",
                "npm run build",
                "npm list --depth=0",
            ]
            + groups["Node"]
        )

    if (cwd / "docker-compose.yml").exists() or (cwd / "compose.yaml").exists():
        groups["Docker"] = dedupe(
            [
                "docker compose up -d",
                "docker compose down",
                "docker compose logs -f",
            ]
            + groups["Docker"]
        )

    return groups


def flatten_command_groups(groups: dict[str, list[str]]) -> list[str]:
    return dedupe([item for values in groups.values() for item in values])
