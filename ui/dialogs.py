import tkinter as tk
from tkinter import simpledialog, messagebox

def ask_new_name(parent, current=""):
    return simpledialog.askstring(
        "Renombrar", "Nuevo nombre:",
        initialvalue=current, parent=parent
    )

def ask_folder_name(parent):
    return simpledialog.askstring(
        "Nueva carpeta", "Nombre de la carpeta:",
        parent=parent
    )

def ask_file_name(parent):
    return simpledialog.askstring(
        "Nuevo archivo", "Nombre del archivo (con extensión):",
        parent=parent
    )

def confirm_delete(parent, names: list, permanent: bool):
    mode = "PERMANENTEMENTE" if permanent else "a la papelera"
    msg  = f"¿Eliminar {mode}?\n\n" + "\n".join(names[:10])
    if len(names) > 10:
        msg += f"\n... y {len(names)-10} más"
    return messagebox.askyesno(
        "Confirmar eliminación", msg,
        parent=parent, icon="warning"
    )

def show_properties(parent, info: dict, t: dict):
    win = tk.Toplevel(parent)
    win.title("Propiedades")
    win.configure(bg=t["bg_secondary"])
    win.resizable(False, False)
    win.grab_set()

    for i, (key, val) in enumerate(info.items()):
        tk.Label(
            win, text=f"{key}:", bg=t["bg_secondary"],
            fg=t["text_secondary"], font=("Segoe UI", 9, "bold"),
            anchor="w", width=16
        ).grid(row=i, column=0, padx=12, pady=4, sticky="w")

        tk.Label(
            win, text=str(val), bg=t["bg_secondary"],
            fg=t["text_primary"], font=("Segoe UI", 9),
            anchor="w", wraplength=320
        ).grid(row=i, column=1, padx=8, pady=4, sticky="w")

    tk.Button(
        win, text="Cerrar", bg=t["accent"], fg="white",
        font=("Segoe UI", 9, "bold"), relief="flat",
        padx=16, pady=6, cursor="hand2",
        command=win.destroy
    ).grid(row=len(info), column=0, columnspan=2, pady=12)
