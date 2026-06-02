from pathlib import Path
from typing import Optional


# ── Definición de plantillas ─────────────────────────────────────────────────

TEMPLATES = {

    # ── Backend ──────────────────────────────────────────────────────────────

    "FastAPI + SQLModel": {
        "description": "API REST con FastAPI, SQLModel y SQLite/PostgreSQL",
        "category": "Backend",
        "options": ["git", "docker", "readme", "env"],
        "structure": {
            "app/__init__.py": "",
            "app/main.py": '''\
from fastapi import FastAPI
from app.core.database import create_db_and_tables

app = FastAPI(title="{name}", version="0.1.0")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def root():
    return {{"status": "ok", "app": "{name}"}}
''',
            "app/core/__init__.py": "",
            "app/core/config.py": '''\
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "{name}"
    database_url: str = "sqlite:///./app.db"

    class Config:
        env_file = ".env"

settings = Settings()
''',
            "app/core/database.py": '''\
from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

engine = create_engine(settings.database_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
''',
            "app/models/__init__.py": "",
            "app/schemas/__init__.py": "",
            "app/routers/__init__.py": "",
            "app/services/__init__.py": "",
            "requirements.txt": '''\
fastapi
uvicorn[standard]
sqlmodel
pydantic-settings
''',
            ".env.example": '''\
DATABASE_URL=sqlite:///./app.db
''',
            "README.md": "# {name}\n\nAPI REST construida con FastAPI y SQLModel.\n\n## Instalación\n\n```bash\npip install -r requirements.txt\nuvicorn app.main:app --reload\n```\n",
        },
    },

    "FastAPI + PostgreSQL + Docker": {
        "description": "FastAPI con PostgreSQL, Alembic y Docker Compose",
        "category": "Backend",
        "options": ["git", "readme", "env"],
        "structure": {
            "app/__init__.py": "",
            "app/main.py": '''\
from fastapi import FastAPI

app = FastAPI(title="{name}", version="0.1.0")

@app.get("/")
def root():
    return {{"status": "ok"}}
''',
            "app/core/__init__.py": "",
            "app/core/config.py": '''\
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://user:password@localhost:5432/{name}"
    class Config:
        env_file = ".env"

settings = Settings()
''',
            "app/models/__init__.py": "",
            "app/routers/__init__.py": "",
            "requirements.txt": "fastapi\nuvicorn[standard]\npsycopg2-binary\nalembic\nsqlalchemy\npydantic-settings\n",
            "docker-compose.yml": '''\
version: "3.9"
services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - db
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: {name}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
''',
            "Dockerfile": '''\
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
''',
            ".env.example": "DATABASE_URL=postgresql://user:password@localhost:5432/{name}\n",
            "README.md": "# {name}\n\nFastAPI + PostgreSQL + Docker.\n\n## Desarrollo\n\n```bash\ndocker compose up -d\n```\n",
        },
    },

    "Express + TypeScript": {
        "description": "API REST con Express y TypeScript",
        "category": "Backend",
        "options": ["git", "readme"],
        "structure": {
            "src/index.ts": '''\
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (_req, res) => {{
  res.json({{ status: "ok", app: "{name}" }});
}});

app.listen(PORT, () => {{
  console.log(`{name} corriendo en http://localhost:${{PORT}}`);
}});
''',
            "src/routes/.gitkeep": "",
            "src/controllers/.gitkeep": "",
            "src/middleware/.gitkeep": "",
            "package.json": '''\
{{
  "name": "{name_lower}",
  "version": "1.0.0",
  "scripts": {{
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }},
  "dependencies": {{
    "express": "^4.18.0"
  }},
  "devDependencies": {{
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node-dev": "^2.0.0"
  }}
}}
''',
            "tsconfig.json": '''\
{{
  "compilerOptions": {{
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }}
}}
''',
            "README.md": "# {name}\n\nAPI REST con Express y TypeScript.\n\n## Dev\n\n```bash\nnpm install\nnpm run dev\n```\n",
        },
    },

    "NestJS": {
        "description": "API REST con NestJS y TypeScript",
        "category": "Backend",
        "options": ["git", "readme"],
        "structure": {
            "src/main.ts": '''\
import {{ NestFactory }} from "@nestjs/core";
import {{ AppModule }} from "./app.module";

async function bootstrap() {{
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log("{name} corriendo en http://localhost:3000");
}}
bootstrap();
''',
            "src/app.module.ts": '''\
import {{ Module }} from "@nestjs/common";
import {{ AppController }} from "./app.controller";
import {{ AppService }} from "./app.service";

@Module({{
  controllers: [AppController],
  providers: [AppService],
}})
export class AppModule {{}}
''',
            "src/app.controller.ts": '''\
import {{ Controller, Get }} from "@nestjs/common";
import {{ AppService }} from "./app.service";

@Controller()
export class AppController {{
  constructor(private readonly appService: AppService) {{}}

  @Get()
  getHello(): string {{
    return this.appService.getHello();
  }}
}}
''',
            "src/app.service.ts": '''\
import {{ Injectable }} from "@nestjs/common";

@Injectable()
export class AppService {{
  getHello(): string {{
    return "Hola desde {name}!";
  }}
}}
''',
            "README.md": "# {name}\n\nAPI REST con NestJS.\n\n## Dev\n\n```bash\nnpm install\nnpm run start:dev\n```\n",
        },
    },

    "Microservicio genérico": {
        "description": "Microservicio Python con estructura base",
        "category": "Backend",
        "options": ["git", "docker", "readme", "env"],
        "structure": {
            "src/__init__.py": "",
            "src/main.py": '''\
from fastapi import FastAPI

app = FastAPI(title="{name}-service")

@app.get("/health")
def health():
    return {{"status": "healthy", "service": "{name}"}}
''',
            "src/config.py": '''\
import os

SERVICE_NAME = "{name}"
PORT = int(os.getenv("PORT", 8000))
''',
            "src/handlers/__init__.py": "",
            "src/models/__init__.py": "",
            "requirements.txt": "fastapi\nuvicorn[standard]\n",
            "Dockerfile": "FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD [\"uvicorn\", \"src.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n",
            "README.md": "# {name}\n\nMicroservicio.\n",
        },
    },

    # ── Frontend ─────────────────────────────────────────────────────────────

    "React + Vite + TypeScript": {
        "description": "Frontend React con Vite y TypeScript",
        "category": "Frontend",
        "options": ["git", "readme"],
        "structure": {
            "src/main.tsx": '''\
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
''',
            "src/App.tsx": '''\
function App() {{
  return (
    <div>
      <h1>{name}</h1>
    </div>
  );
}}

export default App;
''',
            "src/components/.gitkeep": "",
            "src/pages/.gitkeep": "",
            "src/hooks/.gitkeep": "",
            "src/services/.gitkeep": "",
            "index.html": '''\
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
''',
            "package.json": '''\
{{
  "name": "{name_lower}",
  "version": "0.0.1",
  "scripts": {{
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }},
  "dependencies": {{
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }},
  "devDependencies": {{
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }}
}}
''',
            "vite.config.ts": '''\
import {{ defineConfig }} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({{
  plugins: [react()],
}});
''',
            "README.md": "# {name}\n\nFrontend React + Vite + TypeScript.\n\n## Dev\n\n```bash\nnpm install\nnpm run dev\n```\n",
        },
    },

    "React + Vite + Tailwind": {
        "description": "Frontend React con Vite, TypeScript y Tailwind CSS",
        "category": "Frontend",
        "options": ["git", "readme"],
        "structure": {
            "src/main.tsx": 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport "./index.css";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n',
            "src/App.tsx": 'function App() {{\n  return (\n    <div className="min-h-screen bg-gray-100 flex items-center justify-center">\n      <h1 className="text-4xl font-bold text-gray-800">{name}</h1>\n    </div>\n  );\n}}\n\nexport default App;\n',
            "src/index.css": "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n",
            "src/components/.gitkeep": "",
            "index.html": '<!DOCTYPE html>\n<html lang="es">\n  <head>\n    <meta charset="UTF-8" />\n    <title>{name}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
            "package.json": '{{\n  "name": "{name_lower}",\n  "version": "0.0.1",\n  "scripts": {{\n    "dev": "vite",\n    "build": "tsc && vite build",\n    "preview": "vite preview"\n  }},\n  "dependencies": {{\n    "react": "^18.0.0",\n    "react-dom": "^18.0.0"\n  }},\n  "devDependencies": {{\n    "@types/react": "^18.0.0",\n    "@vitejs/plugin-react": "^4.0.0",\n    "autoprefixer": "^10.0.0",\n    "postcss": "^8.0.0",\n    "tailwindcss": "^3.0.0",\n    "typescript": "^5.0.0",\n    "vite": "^5.0.0"\n  }}\n}}\n',
            "tailwind.config.js": 'export default {{\n  content: ["./index.html", "./src/**/*.{{js,ts,jsx,tsx}}"],\n  theme: {{ extend: {{}} }},\n  plugins: [],\n}};\n',
            "README.md": "# {name}\n\nReact + Vite + Tailwind.\n\n## Dev\n\n```bash\nnpm install\nnpm run dev\n```\n",
        },
    },

    "Next.js": {
        "description": "Frontend/Fullstack con Next.js y TypeScript",
        "category": "Frontend",
        "options": ["git", "readme"],
        "structure": {
            "src/app/page.tsx": 'export default function Home() {{\n  return (\n    <main>\n      <h1>{name}</h1>\n    </main>\n  );\n}}\n',
            "src/app/layout.tsx": 'export const metadata = {{ title: "{name}" }};\n\nexport default function RootLayout({{ children }}: {{ children: React.ReactNode }}) {{\n  return (\n    <html lang="es">\n      <body>{{children}}</body>\n    </html>\n  );\n}}\n',
            "src/components/.gitkeep": "",
            "package.json": '{{\n  "name": "{name_lower}",\n  "version": "0.1.0",\n  "scripts": {{\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  }},\n  "dependencies": {{\n    "next": "^14.0.0",\n    "react": "^18.0.0",\n    "react-dom": "^18.0.0"\n  }},\n  "devDependencies": {{\n    "@types/node": "^20.0.0",\n    "@types/react": "^18.0.0",\n    "typescript": "^5.0.0"\n  }}\n}}\n',
            "README.md": "# {name}\n\nNext.js App.\n\n## Dev\n\n```bash\nnpm install\nnpm run dev\n```\n",
        },
    },

    # ── Full Stack ────────────────────────────────────────────────────────────

    "FastAPI + React (monorepo)": {
        "description": "Monorepo con FastAPI backend y React frontend",
        "category": "Full Stack",
        "options": ["git", "docker", "readme"],
        "structure": {
            "backend/app/__init__.py": "",
            "backend/app/main.py": 'from fastapi import FastAPI\nfrom fastapi.middleware.cors import CORSMiddleware\n\napp = FastAPI(title="{name} API")\napp.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])\n\n@app.get("/")\ndef root():\n    return {{"status": "ok"}}\n',
            "backend/requirements.txt": "fastapi\nuvicorn[standard]\n",
            "frontend/src/main.tsx": 'import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\n\nReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);\n',
            "frontend/src/App.tsx": 'function App() {{\n  return <div><h1>{name}</h1></div>;\n}}\nexport default App;\n',
            "frontend/index.html": '<!DOCTYPE html>\n<html><head><title>{name}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
            "frontend/package.json": '{{\n  "name": "{name_lower}-frontend",\n  "scripts": {{"dev": "vite", "build": "tsc && vite build"}},\n  "dependencies": {{"react": "^18.0.0", "react-dom": "^18.0.0"}},\n  "devDependencies": {{"@vitejs/plugin-react": "^4.0.0", "typescript": "^5.0.0", "vite": "^5.0.0"}}\n}}\n',
            "docker-compose.yml": 'version: "3.9"\nservices:\n  backend:\n    build: ./backend\n    ports:\n      - "8000:8000"\n  frontend:\n    build: ./frontend\n    ports:\n      - "5173:5173"\n',
            "README.md": "# {name}\n\nMonorepo FastAPI + React.\n\n## Dev\n\n```bash\n# Backend\ncd backend && pip install -r requirements.txt && uvicorn app.main:app --reload\n\n# Frontend\ncd frontend && npm install && npm run dev\n```\n",
        },
    },

    "NestJS + Next.js": {
        "description": "Full stack con NestJS backend y Next.js frontend",
        "category": "Full Stack",
        "options": ["git", "readme"],
        "structure": {
            "backend/src/main.ts": 'import {{ NestFactory }} from "@nestjs/core";\nimport {{ AppModule }} from "./app.module";\n\nasync function bootstrap() {{\n  const app = await NestFactory.create(AppModule);\n  app.enableCors();\n  await app.listen(3001);\n}}\nbootstrap();\n',
            "backend/src/app.module.ts": 'import {{ Module }} from "@nestjs/common";\n\n@Module({{}})\nexport class AppModule {{}}\n',
            "backend/package.json": '{{\n  "name": "{name_lower}-backend",\n  "scripts": {{"start:dev": "nest start --watch"}},\n  "dependencies": {{"@nestjs/common": "^10.0.0", "@nestjs/core": "^10.0.0", "@nestjs/platform-express": "^10.0.0"}}\n}}\n',
            "frontend/src/app/page.tsx": 'export default function Home() {{\n  return <main><h1>{name}</h1></main>;\n}}\n',
            "frontend/package.json": '{{\n  "name": "{name_lower}-frontend",\n  "scripts": {{"dev": "next dev", "build": "next build"}},\n  "dependencies": {{"next": "^14.0.0", "react": "^18.0.0", "react-dom": "^18.0.0"}}\n}}\n',
            "README.md": "# {name}\n\nNestJS + Next.js.\n",
        },
    },

    # ── Otros ─────────────────────────────────────────────────────────────────

    "CLI Python": {
        "description": "Herramienta de línea de comandos en Python",
        "category": "Otros",
        "options": ["git", "readme"],
        "structure": {
            "src/__init__.py": "",
            "src/cli.py": '''\
import argparse

def main():
    parser = argparse.ArgumentParser(description="{name}")
    parser.add_argument("--version", action="version", version="0.1.0")
    args = parser.parse_args()
    print(f"Hola desde {name}")

if __name__ == "__main__":
    main()
''',
            "src/commands/__init__.py": "",
            "src/utils/__init__.py": "",
            "requirements.txt": "",
            "README.md": "# {name}\n\nCLI en Python.\n\n## Uso\n\n```bash\npython -m src.cli\n```\n",
        },
    },

    "Librería Python": {
        "description": "Librería Python con tests y pyproject.toml",
        "category": "Otros",
        "options": ["git", "readme"],
        "structure": {
            "{name_lower}/__init__.py": '"""Librería {name}."""\n\n__version__ = "0.1.0"\n',
            "{name_lower}/core.py": '"""Módulo principal de {name}."""\n\n\ndef hello() -> str:\n    return "Hola desde {name}"\n',
            "tests/__init__.py": "",
            "tests/test_core.py": 'from {name_lower}.core import hello\n\n\ndef test_hello():\n    assert hello() == "Hola desde {name}"\n',
            "pyproject.toml": '[build-system]\nrequires = ["setuptools"]\nbuild-backend = "setuptools.backends.legacy:build"\n\n[project]\nname = "{name_lower}"\nversion = "0.1.0"\ndescription = "{name}"\n',
            "README.md": "# {name}\n\nLibrería Python.\n\n## Instalación\n\n```bash\npip install -e .\n```\n",
        },
    },

    "Docker Compose multi-servicio": {
        "description": "Infraestructura con múltiples servicios Docker",
        "category": "Otros",
        "options": ["git", "readme"],
        "structure": {
            "services/api/.gitkeep": "",
            "services/worker/.gitkeep": "",
            "nginx/nginx.conf": 'events {{}}\nhttp {{\n  server {{\n    listen 80;\n    location / {{\n      proxy_pass http://api:8000;\n    }}\n  }}\n}}\n',
            "docker-compose.yml": 'version: "3.9"\nservices:\n  api:\n    build: ./services/api\n    ports:\n      - "8000:8000"\n  worker:\n    build: ./services/worker\n  redis:\n    image: redis:7-alpine\n  nginx:\n    image: nginx:alpine\n    volumes:\n      - ./nginx/nginx.conf:/etc/nginx/nginx.conf\n    ports:\n      - "80:80"\n    depends_on:\n      - api\n',
            "README.md": "# {name}\n\nInfraestructura Docker multi-servicio.\n\n## Levantar\n\n```bash\ndocker compose up -d\n```\n",
        },
    },
}


def get_categories() -> dict[str, list[str]]:
    """Retorna las plantillas agrupadas por categoría."""
    categories: dict[str, list[str]] = {}
    for name, tmpl in TEMPLATES.items():
        cat = tmpl["category"]
        categories.setdefault(cat, []).append(name)
    return categories


def scaffold(
    template_name: str,
    project_name: str,
    destination: str,
    options: Optional[list[str]] = None,
) -> tuple[bool, str, list[str]]:
    """
    Crea la estructura del proyecto en destination/project_name.
    Retorna (éxito, mensaje, lista de archivos creados).
    """
    if template_name not in TEMPLATES:
        return False, f"Plantilla '{template_name}' no existe.", []

    tmpl = TEMPLATES[template_name]
    base = Path(destination) / project_name
    options = options or []
    name_lower = project_name.lower().replace(" ", "_").replace("-", "_")

    created = []

    try:
        base.mkdir(parents=True, exist_ok=True)

        for rel_path, content in tmpl["structure"].items():
            # sustituye variables en el path y en el contenido
            rel_path = rel_path.replace("{name_lower}", name_lower).replace("{name}", project_name)
            content  = content.replace("{name_lower}", name_lower).replace("{name}", project_name)

            file_path = base / rel_path
            file_path.parent.mkdir(parents=True, exist_ok=True)

            if rel_path.endswith(".gitkeep"):
                file_path.touch()
            else:
                file_path.write_text(content, encoding="utf-8")
            created.append(rel_path)

        # opciones adicionales
        if "git" in options:
            _create_gitignore(base, template_name)
            created.append(".gitignore")
            try:
                import subprocess
                subprocess.run(["git", "init"], cwd=str(base), capture_output=True, timeout=10)
                created.append(".git/")
            except Exception:
                pass

        return True, f"Proyecto '{project_name}' creado en {base}", created

    except Exception as e:
        return False, f"Error al crear proyecto: {e}", created


def _create_gitignore(base: Path, template_name: str):
    tmpl = TEMPLATES.get(template_name, {})
    category = tmpl.get("category", "")

    lines = ["# General", "__pycache__/", "*.pyc", ".env", ".DS_Store", ""]

    if category in ("Backend", "Full Stack") or "Python" in template_name:
        lines += ["venv/", ".venv/", "*.egg-info/", "dist/", "build/", ""]

    if category in ("Frontend", "Full Stack") or "Node" in template_name or "React" in template_name or "Next" in template_name:
        lines += ["node_modules/", "dist/", ".next/", ""]

    if "Docker" in template_name:
        lines += ["*.log", ""]

    (base / ".gitignore").write_text("\n".join(lines), encoding="utf-8")