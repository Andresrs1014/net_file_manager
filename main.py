import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from controllers.app_controller import AppController

ctrl = AppController()
fc   = ctrl.file_ctrl
sc   = ctrl.search_ctrl

def cls():
    os.system("cls" if os.name == "nt" else "clear")

def header():
    print("\n" + "="*52)
    print("        NetVault — Gestor de Archivos de Red")
    print("="*52)

def fmt_size(size: float) -> str:
    for unit in ["B","KB","MB","GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"

def menu_principal():
    print("\n  ¿Qué deseas hacer?")
    print("  ─────────────────────────────────────")
    print("  [1]  Listar carpeta")
    print("  [2]  Buscar archivo")
    print("  [3]  Copiar archivo/carpeta")
    print("  [4]  Mover / Traspasar")
    print("  [5]  Eliminar")
    print("  [6]  Renombrar")
    print("  [7]  Crear carpeta")
    print("  [8]  Crear archivo")
    print("  [9]  Abrir archivo")
    print("  [10] Ver favoritos")
    print("  [11] Agregar favorito")
    print("  [12] Quitar favorito")
    print("  [13] Reindexar carpeta")
    print("  [14] Ver propiedades")
    print("  [0]  Salir")
    print("  ─────────────────────────────────────")
    return input("  Opción: ").strip()

def listar(path=None):
    if not path:
        path = input("  Ruta a listar: ").strip()
    if not os.path.isdir(path):
        print(f"  ⚠ Ruta no válida: {path}")
        return
    entries = list(os.scandir(path))
    folders = sorted([e for e in entries if e.is_dir()],  key=lambda e: e.name.lower())
    files   = sorted([e for e in entries if e.is_file()], key=lambda e: e.name.lower())
    print(f"\n  📂 {path}")
    print("  " + "─"*60)
    for e in folders:
        print(f"  📁  {e.name}/")
    for e in files:
        size = fmt_size(e.stat().st_size)
        ext  = os.path.splitext(e.name)[1].upper() or "FILE"
        print(f"  📄  {e.name:<40} {ext:<8} {size:>10}")
    print("  " + "─"*60)
    print(f"  {len(folders)} carpetas  •  {len(files)} archivos\n")

def buscar():
    keyword = input("  Término de búsqueda: ").strip()
    ext     = input("  Extensión (Enter para omitir): ").strip().lower()
    fuzzy   = input("  ¿Búsqueda fuzzy? (s/n): ").strip().lower() == "s"
    ext_filter = f".{ext}" if ext and not ext.startswith(".") else (ext or None)
    sc.toggle_fuzzy(fuzzy)
    results = sc.search(keyword, ext_filter=ext_filter)
    if not results:
        print("  Sin resultados.")
        return
    print(f"\n  🔍 {len(results)} resultado(s):\n")
    for path, name, ftype, size, mtime in results[:50]:
        s = fmt_size(size) if ftype != "folder" else "  -  "
        print(f"  {'📁' if ftype=='folder' else '📄'}  {name:<40} {s:>10}")
        print(f"       {path}")
    if len(results) > 50:
        print(f"\n  ... y {len(results)-50} más.")

def copiar():
    src = input("  Origen: ").strip()
    dst = input("  Destino: ").strip()
    try:
        fc.ops.copy(src, dst)
        print("  ✅ Copiado correctamente.")
    except Exception as e:
        print(f"  ⚠ Error: {e}")

def mover():
    src = input("  Origen: ").strip()
    dst = input("  Destino: ").strip()
    try:
        fc.ops.move(src, dst)
        print("  ✅ Movido correctamente.")
    except Exception as e:
        print(f"  ⚠ Error: {e}")

def eliminar():
    path      = input("  Ruta a eliminar: ").strip()
    perm      = input("  ¿Eliminar permanentemente? (s/n): ").strip().lower() == "s"
    modo      = "PERMANENTEMENTE" if perm else "a la papelera"
    confirmar = input(f"  ¿Confirmar eliminar '{os.path.basename(path)}' {modo}? (s/n): ").strip().lower()
    if confirmar == "s":
        try:
            fc.ops.delete(path, perm)
            print("  ✅ Eliminado.")
        except Exception as e:
            print(f"  ⚠ Error: {e}")
    else:
        print("  Operación cancelada.")

def renombrar():
    path     = input("  Ruta del archivo/carpeta: ").strip()
    new_name = input("  Nuevo nombre: ").strip()
    try:
        fc.ops.rename(path, new_name)
        print("  ✅ Renombrado correctamente.")
    except Exception as e:
        print(f"  ⚠ Error: {e}")

def crear_carpeta():
    parent = input("  Carpeta padre: ").strip()
    name   = input("  Nombre de la nueva carpeta: ").strip()
    try:
        fc.create_folder(parent, name)
        print("  ✅ Carpeta creada.")
    except Exception as e:
        print(f"  ⚠ Error: {e}")

def crear_archivo():
    parent = input("  Carpeta destino: ").strip()
    name   = input("  Nombre del archivo (con extensión): ").strip()
    try:
        fc.create_file(parent, name)
        print("  ✅ Archivo creado.")
    except Exception as e:
        print(f"  ⚠ Error: {e}")

def abrir_archivo():
    path = input("  Ruta del archivo: ").strip()
    fc.open_file(path)

def ver_favoritos():
    favs = ctrl.get_favorites()
    if not favs:
        print("  Sin favoritos guardados.")
        return
    print("\n  ⭐ Favoritos:")
    for i, f in enumerate(favs, 1):
        print(f"  [{i}]  {f}")

def agregar_favorito():
    path = input("  Ruta a guardar como favorito: ").strip()
    ctrl.add_favorite(path)
    print("  ✅ Favorito agregado.")

def quitar_favorito():
    ver_favoritos()
    path = input("  Ruta a quitar: ").strip()
    ctrl.remove_favorite(path)
    print("  ✅ Favorito eliminado.")

def reindexar():
    path = input("  Ruta a reindexar: ").strip()

    def on_event(event, data):
        if event == "scan_start": print(f"  ⟳ Indexando: {data}")
        if event == "scan_done":  print(f"  ✅ Índice actualizado: {data}")
        if event == "scan_error": print(f"  ⚠ Error: {data}")

    ctrl.subscribe_indexer(on_event)
    ctrl.start_index(path)
    input("  (Indexando en background... presiona Enter para continuar)")

def propiedades():
    path = input("  Ruta del archivo/carpeta: ").strip()
    try:
        stat = os.stat(path)
        print(f"\n  ── Propiedades ──────────────────────")
        print(f"  Nombre:     {os.path.basename(path)}")
        print(f"  Ruta:       {path}")
        print(f"  Tipo:       {'Carpeta' if os.path.isdir(path) else os.path.splitext(path)[1]}")
        print(f"  Tamaño:     {fmt_size(stat.st_size)}")
        print(f"  Modificado: {stat.st_mtime}")
        print(f"  ─────────────────────────────────────\n")
    except Exception as e:
        print(f"  ⚠ Error: {e}")

# ── Loop principal ───────────────────────────────────
ACCIONES = {
    "1":  listar,
    "2":  buscar,
    "3":  copiar,
    "4":  mover,
    "5":  eliminar,
    "6":  renombrar,
    "7":  crear_carpeta,
    "8":  crear_archivo,
    "9":  abrir_archivo,
    "10": ver_favoritos,
    "11": agregar_favorito,
    "12": quitar_favorito,
    "13": reindexar,
    "14": propiedades,
}

if __name__ == "__main__":
    cls()
    header()
    while True:
        opcion = menu_principal()
        if opcion == "0":
            print("\n  Hasta luego. 👋\n")
            break
        elif opcion in ACCIONES:
            cls()
            header()
            ACCIONES[opcion]()
            input("\n  Presiona Enter para continuar...")
            cls()
            header()
        else:
            print("  ⚠ Opción no válida.")
