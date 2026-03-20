import os
from core.file_ops import FileOps
from tkinter import messagebox

class FileController:
    def __init__(self):
        self.ops        = FileOps()
        self._clipboard = None  # {"mode": "copy"|"cut", "paths": [...]}

    def copy_to_clipboard(self, paths: list):
        self._clipboard = {"mode": "copy", "paths": paths}

    def cut_to_clipboard(self, paths: list):
        self._clipboard = {"mode": "cut", "paths": paths}

    def paste(self, destination: str):
        if not self._clipboard:
            return
        try:
            for src in self._clipboard["paths"]:
                name = os.path.basename(src)
                dst  = os.path.join(destination, name)
                if self._clipboard["mode"] == "copy":
                    self.ops.copy(src, dst)
                else:
                    self.ops.move(src, dst)
            if self._clipboard["mode"] == "cut":
                self._clipboard = None
        except Exception as e:
            messagebox.showerror("Error al pegar", str(e))

    def delete(self, paths: list, permanent: bool = False):
        try:
            for p in paths:
                self.ops.delete(p, permanent)
        except Exception as e:
            messagebox.showerror("Error al eliminar", str(e))

    def rename(self, path: str, new_name: str):
        try:
            self.ops.rename(path, new_name)
        except Exception as e:
            messagebox.showerror("Error al renombrar", str(e))

    def create_folder(self, parent: str, name: str):
        try:
            self.ops.create_folder(os.path.join(parent, name))
        except Exception as e:
            messagebox.showerror("Error al crear carpeta", str(e))

    def create_file(self, parent: str, name: str):
        try:
            self.ops.create_file(os.path.join(parent, name))
        except Exception as e:
            messagebox.showerror("Error al crear archivo", str(e))

    def open_file(self, path: str):
        try:
            os.startfile(path)
        except Exception as e:
            messagebox.showerror("Error al abrir", str(e))

    def undo(self):
        try:
            self.ops.undo()
        except Exception as e:
            messagebox.showerror("Error al deshacer", str(e))
