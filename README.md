# NetVault

NetVault es un gestor de archivos de red hecho en Python con `tkinter`, pensado para navegar carpetas locales y de red con una interfaz propia, doble panel, búsqueda indexada y una terminal lateral integrada.

El objetivo del proyecto es ofrecer una experiencia rápida para administración técnica de archivos, proyectos y rutas de servidor, sin depender por completo del explorador de Windows.

## Estado actual

La aplicación ya incluye:

- navegación en doble panel
- barra superior de acciones
- barra de búsqueda con filtro por extensión y fuzzy search
- favoritos
- operaciones de archivos
- indexado local para búsqueda
- terminal lateral integrada
- selector de comandos rápidos por categorías
- sugerencias ligeras en terminal
- soporte visual básico para tema claro/oscuro

## Tecnologías

- Python
- `tkinter`
- `sqlite3`
- `rapidfuzz`
- `send2trash`
- `pyinstaller`

## Estructura del proyecto

- [`app.py`](C:/net_file_manager/app.py): punto de entrada principal
- [`controllers/`](C:/net_file_manager/controllers): coordinación entre UI y lógica
- [`core/`](C:/net_file_manager/core): caché, búsqueda, indexado y operaciones de archivos
- [`ui/`](C:/net_file_manager/ui): ventanas, paneles, toolbar, búsqueda y terminal
- [`config.json`](C:/net_file_manager/config.json): configuración persistente

## Arquitectura resumida

### Controladores

- [`controllers/app_controller.py`](C:/net_file_manager/controllers/app_controller.py)
  - carga y guarda configuración
  - expone tema, favoritos e indexador
  - conecta `FileController` y `SearchController`

- [`controllers/file_controller.py`](C:/net_file_manager/controllers/file_controller.py)
  - copiar, mover, eliminar, renombrar, crear y abrir archivos
  - portapapeles de copiar/cortar/pegar
  - deshacer de operaciones soportadas

- [`controllers/search_controller.py`](C:/net_file_manager/controllers/search_controller.py)
  - búsqueda exacta o fuzzy
  - caché del último resultado repetido

### Core

- [`core/cache.py`](C:/net_file_manager/core/cache.py)
  - caché SQLite de archivos indexados
  - búsqueda por nombre y extensión
  - fallback a memoria si no hay base escribible

- [`core/indexer.py`](C:/net_file_manager/core/indexer.py)
  - escaneo en segundo plano
  - evita rescans redundantes con cooldown
  - permite forzar reindexado manual

- [`core/search.py`](C:/net_file_manager/core/search.py)
  - búsqueda exacta
  - fuzzy search con `rapidfuzz`

- [`core/file_ops.py`](C:/net_file_manager/core/file_ops.py)
  - comandos de archivo con historial para undo

### UI

- [`ui/main_window_v2.py`](C:/net_file_manager/ui/main_window_v2.py)
  - ventana principal usada actualmente
  - layout general, favoritos, paneles, status y terminal lateral

- [`ui/file_panel_fixed.py`](C:/net_file_manager/ui/file_panel_fixed.py)
  - panel de archivos
  - navegación, historial, contexto y operaciones

- [`ui/search_bar.py`](C:/net_file_manager/ui/search_bar.py)
  - búsqueda con debounce
  - filtro por extensión
  - fuzzy toggle

- [`ui/toolbar_fixed.py`](C:/net_file_manager/ui/toolbar_fixed.py)
  - acciones principales
  - cambio de tema
  - toggle de terminal

- [`ui/terminal_panel_v2.py`](C:/net_file_manager/ui/terminal_panel_v2.py)
  - terminal integrada en UI
  - sugerencias y panel de comandos

- [`ui/terminal_session.py`](C:/net_file_manager/ui/terminal_session.py)
  - ejecución y estado de sesión de terminal

- [`ui/terminal_commands.py`](C:/net_file_manager/ui/terminal_commands.py)
  - catálogo de comandos agrupados

- [`ui/terminal_suggest.py`](C:/net_file_manager/ui/terminal_suggest.py)
  - lógica de sugerencias de terminal

## Funcionalidades disponibles

### Gestión de archivos

- abrir carpetas y archivos
- navegar por ruta manual
- doble panel
- historial atrás/adelante
- subir de carpeta
- selección múltiple con `Ctrl` y `Shift`
- copiar
- cortar
- pegar
- eliminar a papelera
- eliminar permanente
- renombrar
- crear carpeta
- crear archivo
- ver propiedades
- deshacer operaciones compatibles

### Búsqueda

- búsqueda por nombre
- filtro por extensión
- fuzzy search opcional
- debounce para no buscar en cada tecla
- búsqueda basada en índice local

### Favoritos

- agregar carpeta actual a favoritos
- quitar favorito
- abrir favorito con doble clic

### Terminal integrada

- abrir/cerrar terminal en el panel derecho
- cambiar directorio de trabajo
- ejecutar comandos PowerShell
- historial de comandos con flechas
- `cls` y `clear` internos
- sugerencias ligeras al escribir
- lista de comandos rápidos por categorías
- comandos contextuales según el proyecto actual

## Categorías actuales de comandos rápidos

- `Comunes`
- `Creación`
- `Revisión`
- `Git`
- `Python`
- `Node`
- `Docker`
- `Red`

## Manual de usuario

### 1. Iniciar la aplicación

Ejecuta:

```powershell
python app.py
```

O desde el entorno virtual:

```powershell
venv\Scripts\python.exe app.py
```

### 2. Navegar carpetas

- usa el panel izquierdo o derecho
- escribe una ruta y pulsa `Enter` o `Ir`
- puedes usar rutas locales o rutas UNC, por ejemplo:

```text
\\SERVIDOR\Compartida
```

### 3. Seleccionar archivos

- clic normal: selección simple
- `Ctrl` + clic: selección múltiple
- `Shift` + clic: selección por rango

### 4. Usar la barra superior

Acciones disponibles:

- `Atrás`
- `Adelante`
- `Subir`
- `Reindexar`
- `Nueva carpeta`
- `Nuevo archivo`
- `Cortar`
- `Copiar`
- `Pegar`
- `Eliminar`
- `Deshacer`
- `Terminal`
- cambio de tema

### 5. Buscar archivos

- escribe el término en la barra `Search`
- opcionalmente escribe una extensión como `txt` o `.txt`
- activa `Fuzzy` si quieres coincidencias aproximadas
- usa `Clear` para limpiar la búsqueda

### 6. Usar el menú contextual

Haz clic derecho sobre un archivo o carpeta para ver acciones como:

- abrir
- copiar
- cortar
- pegar
- renombrar
- eliminar
- crear archivo/carpeta
- agregar a favoritos
- ver propiedades

### 7. Usar la terminal lateral

- pulsa `Terminal` en la barra superior
- la terminal reemplaza temporalmente el panel derecho
- puedes volver a pulsar `Terminal` para restaurar el panel

Comandos útiles:

```powershell
dir
cd ..
git status
pip install -r requirements.txt
npm install
docker compose up -d
```

### 8. Usar sugerencias de terminal

- escribe al menos 2 caracteres
- aparecerán sugerencias sobre el input
- `Tab` acepta la primera sugerencia
- doble clic también inserta la sugerencia

### 9. Usar comandos rápidos

- pulsa el botón de categoría al lado de `PS>`
- selecciona una categoría
- luego selecciona un comando
- el comando se copiará al input de la terminal

## Configuración

La configuración persistente vive en [`config.json`](C:/net_file_manager/config.json).

Campos actuales:

- `network_paths`
- `favorites`
- `theme`
- `last_path_left`
- `last_path_right`

## Comportamiento importante

### Indexado

- al navegar a una carpeta se intenta indexar en background
- para evitar sobrecarga, no reindexa la misma ruta inmediatamente otra vez
- `Reindexar` fuerza el escaneo manual

### Caché

- si SQLite no puede abrir una base escribible, la app usa caché en memoria
- en ese caso la búsqueda sigue funcionando durante la sesión, pero el índice puede no persistir al reiniciar

### Resolución y nitidez

- la app habilita DPI awareness en Windows al iniciar
- la ventana intenta abrir centrada con tamaño adaptado a la pantalla
- usa un tope inferior a full HD para evitar escalado borroso en algunas máquinas

## Instalación

### 1. Crear y activar entorno virtual

```powershell
python -m venv venv
venv\Scripts\activate
```

### 2. Instalar dependencias

```powershell
pip install -r requirements.txt
```

### 3. Ejecutar

```powershell
python app.py
```

## Dependencias actuales

Según [`requirements.txt`](C:/net_file_manager/requirements.txt):

- `ttkbootstrap==1.10.1`
- `tkinterdnd2==0.3.0`
- `Pillow`
- `send2trash==1.8.3`
- `rapidfuzz==3.9.3`
- `pyinstaller`

## Limitaciones actuales

- el sistema de terminal aún no es una shell persistente completa
- la sugerencia de terminal es ligera, no un autocomplete profundo del sistema
- el proyecto todavía conserva archivos anteriores y variantes nuevas coexistiendo
- algunas partes viejas del proyecto siguen presentes pero la app actual usa la ruta moderna basada en `main_window_v2`

## Hoja de ruta sugerida

- terminal por proyecto
- tabs de terminal
- acciones rápidas por stack
- mejor persistencia del índice
- selector visual de rutas de red
- sistema de comandos favoritos personalizados
- mejora del sistema de tema sin reconstruir la ventana completa

## Punto de entrada actual

La aplicación actualmente arranca desde:

- [`app.py`](C:/net_file_manager/app.py)
- usando la ventana principal [`ui/main_window_v2.py`](C:/net_file_manager/ui/main_window_v2.py)

