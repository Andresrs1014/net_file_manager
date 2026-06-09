export interface TemplateOption {
  id: string;
  label: string;
  description?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Backend' | 'Frontend' | 'Full Stack' | 'Desktop' | 'Other';
  options: TemplateOption[];
  files: Record<string, string>;
  gitignore?: string[];
  icon?: string;
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'fastapi-sqlmodel',
    name: 'FastAPI + SQLModel',
    description: 'API REST con FastAPI, SQLModel y SQLite/PostgreSQL',
    category: 'Backend',
    icon: '🐍',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'docker', label: 'Docker' },
      { id: 'readme', label: 'README' },
      { id: 'env', label: '.env' },
    ],
    files: {
      'app/__init__.py': '',
      'app/main.py': `from fastapi import FastAPI
from app.core.database import create_db_and_tables

app = FastAPI(title="{{name}}", version="0.1.0")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def root():
    return {"status": "ok", "app": "{{name}}"}`,
      'app/core/__init__.py': '',
      'app/core/config.py': `from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "{{name}}"
    database_url: str = "sqlite:///./app.db"
    
    class Config:
        env_file = ".env"

settings = Settings()`,
      'app/core/database.py': `from sqlmodel import SQLModel, Field, Session, create_engine

class Hero(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    age: int | None = None

sqlite_file_name = "app.db"
engine = create_engine(f"sqlite:///{sqlite_file_name}", echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)`,
      'requirements.txt': 'fastapi\nuvicorn[standard]\nsqlmodel\npydantic-settings',
    },
    gitignore: ['venv/', '__pycache__/', '*.pyc', '.env', 'dist/', 'build/'],
  },

  {
    id: 'react-vite-tailwind',
    name: 'React + Vite + Tailwind',
    description: 'Frontend React con Vite, TypeScript y Tailwind CSS',
    category: 'Frontend',
    icon: '⚛️',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'readme', label: 'README' },
      { id: 'eslint', label: 'ESLint' },
    ],
    files: {
      'src/main.tsx': `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
      'src/App.tsx': `function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-800">{{name}}</h1>
    </div>
  )
}
export default App`,
      'src/index.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;',
      'package.json': JSON.stringify({
        name: '{{name_lower}}',
        version: '0.0.1',
        type: 'module',
        scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview' },
        dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.2.0',
          autoprefixer: '^10.4.0',
          postcss: '^8.4.0',
          tailwindcss: '^3.4.0',
          typescript: '^5.3.0',
          vite: '^5.0.0',
        },
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
})`,
      'tailwind.config.js': `export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
        },
        include: ['src'],
        references: [{ path: './tsconfig.node.json' }],
      }, null, 2),
      'index.html': `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>{{name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
    gitignore: ['node_modules/', 'dist/', '.next/', '.env'],
  },

  {
    id: 'nestjs-basic',
    name: 'NestJS API',
    description: 'Backend API con NestJS y TypeScript',
    category: 'Backend',
    icon: '🪺',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'docker', label: 'Docker' },
      { id: 'readme', label: 'README' },
    ],
    files: {
      'src/main.ts': `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();`,
      'src/app.module.ts': `import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}`,
      'package.json': JSON.stringify({
        name: '{{name_lower}}',
        version: '1.0.0',
        scripts: { build: 'nest build', start: 'nest start', dev: 'nest start --watch' },
        dependencies: { '@nestjs/common': '^10.0.0', '@nestjs/core': '^10.0.0', 'reflect-metadata': '^0.1.0', 'rxjs': '^7.0.0' },
        devDependencies: { '@nestjs/cli': '^10.0.0', '@nestjs/testing': '^10.0.0', typescript: '^5.0.0' },
      }, null, 2),
      'tsconfig.json': JSON.stringify({
        compilerOptions: { module: 'commonjs', target: 'ES2021', strict: true, esModuleInterop: true },
        include: ['src'],
      }, null, 2),
    },
    gitignore: ['dist/', 'node_modules/', '.env'],
  },

  {
    id: 'electron-app',
    name: 'Electron App',
    description: 'Aplicación de escritorio con Electron, React y TypeScript',
    category: 'Desktop',
    icon: '⚡',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'readme', label: 'README' },
      { id: 'tailwind', label: 'Tailwind' },
    ],
    files: {
      'package.json': JSON.stringify({
        name: '{{name_lower}}',
        version: '1.0.0',
        main: 'dist-electron/main.js',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build && electron-builder',
          'electron:dev': 'concurrently "vite" "wait-on tcp:5173 && electron ."',
        },
        build: {
          appId: 'com.{{name_lower}}.app',
          productName: '{{name}}',
          files: ['dist/**/*', 'dist-electron/**/*'],
          win: { target: 'nsis' },
        },
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        devDependencies: {
          electron: '^29.0.0',
          'electron-builder': '^24.0.0',
          '@vitejs/plugin-react': '^4.0.0',
          typescript: '^5.0.0',
          vite: '^5.0.0',
        },
      }, null, 2),
      'electron/main.ts': `import { app, BrowserWindow } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true },
  })
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)`,
      'electron/preload.ts': `import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})`,
      'src/main.tsx': `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
      'src/App.tsx': `function App() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <h1 className="text-3xl font-bold text-white">{{name}}</h1>
    </div>
  )
}
export default App`,
    },
    gitignore: ['node_modules/', 'dist/', 'dist-electron/', '.env'],
  },

  {
    id: 'nextjs-app',
    name: 'Next.js App',
    description: 'Full stack con Next.js 14 (App Router)',
    category: 'Full Stack',
    icon: '▲',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'readme', label: 'README' },
      { id: 'tailwind', label: 'Tailwind' },
    ],
    files: {
      'src/app/layout.tsx': `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '{{name}}',
  description: 'Generated by NetVault',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-100">{children}</body>
    </html>
  )
}`,
      'src/app/page.tsx': `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-800">{{name}}</h1>
    </main>
  )
}`,
      'src/app/globals.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;',
      'package.json': JSON.stringify({
        name: '{{name_lower}}',
        version: '0.0.1',
        scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
        dependencies: { next: '^14.0.0', react: '^18.2.0', 'react-dom': '^18.2.0' },
        devDependencies: {
          '@types/node': '^20.0.0',
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          autoprefixer: '^10.4.0',
          postcss: '^8.4.0',
          tailwindcss: '^3.4.0',
          typescript: '^5.0.0',
        },
      }, null, 2),
      'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig`,
      'tailwind.config.js': `export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
}`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: { target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'preserve', incremental: true, plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] } },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }, null, 2),
    },
    gitignore: ['node_modules/', '.next/', 'out/', '.env'],
  },

  {
    id: 'python-cli',
    name: 'Python CLI',
    description: 'Herramienta de línea de comandos en Python',
    category: 'Backend',
    icon: '🐍',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'docker', label: 'Docker' },
      { id: 'readme', label: 'README' },
    ],
    files: {
      'src/__init__.py': '',
      'src/main.py': `import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="{{name}}")
    parser.add_argument('--version', action='version', version='1.0.0')
    parser.add_argument('command', nargs='?', help='Command to run')
    args = parser.parse_args()
    
    if args.command:
        print(f"Running: {args.command}")
    else:
        print("{{name}} CLI")
        print("Usage: {{name_lower}} <command>")

if __name__ == '__main__':
    main()`,
      'requirements.txt': '# Add your dependencies here\nclick>=8.0.0',
      'setup.py': `from setuptools import setup, find_packages

setup(
    name="{{name_lower}}",
    version="1.0.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=["click>=8.0.0"],
    entry_points={
        'console_scripts': [
            '{{name_lower}}=src.main:main',
        ],
    },
)`,
    },
    gitignore: ['venv/', '__pycache__/', '*.pyc', 'dist/', 'build/'],
  },

  {
    id: 'go-api',
    name: 'Go API',
    description: 'Backend API en Go con Gin framework',
    category: 'Backend',
    icon: '🐹',
    options: [
      { id: 'git', label: 'Git' },
      { id: 'docker', label: 'Docker' },
      { id: 'readme', label: 'README' },
    ],
    files: {
      'main.go': `package main

import "github.com/gin-gonic/gin"

func main() {
    r := gin.Default()
    
    r.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok", "app": "{{name}}"})
    })
    
    r.Run(":8080")
}`,
      'go.mod': `module {{name_lower}}

go 1.21

require github.com/gin-gonic/gin v1.9.1`,
      'Dockerfile': `FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o app .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/app .
EXPOSE 8080
CMD ["./app"]`,
    },
    gitignore: ['*.exe', 'bin/', '.env'],
  },
];

export const TEMPLATE_CATEGORIES = ['Backend', 'Frontend', 'Full Stack', 'Desktop', 'Other'] as const;

export function processTemplateFiles(
  template: ProjectTemplate,
  projectName: string,
  options: Set<string>
): Record<string, string> {
  const files: Record<string, string> = {};
  const nameLower = projectName.toLowerCase().replace(/\s+/g, '-');
  
  for (const [path, content] of Object.entries(template.files)) {
    const processedPath = path
      .replace(/\{\{name\}\}/g, projectName)
      .replace(/\{\{name_lower\}\}/g, nameLower);
    
    const processedContent = content
      .replace(/\{\{name\}\}/g, projectName)
      .replace(/\{\{name_lower\}\}/g, nameLower);
    
    files[processedPath] = processedContent;
  }
  
  // Add .gitignore if selected
  if (options.has('git') && template.gitignore) {
    files['.gitignore'] = template.gitignore.join('\n');
  }
  
  // Add README if selected
  if (options.has('readme') && !files['README.md']) {
    files['README.md'] = `# ${projectName}\n\nGenerated by NetVault Scaffolder.`;
  }
  
  return files;
}