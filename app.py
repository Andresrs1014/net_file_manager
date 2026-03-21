import sys
import os
import ctypes

sys.path.insert(0, os.path.dirname(__file__))

from controllers.app_controller import AppController
from ui.main_window import MainWindow


def _enable_dpi_awareness():
    if os.name != "nt":
        return
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

def main():
    _enable_dpi_awareness()
    ctrl   = AppController()
    window = MainWindow(ctrl)
    window.run()

if __name__ == "__main__":
    main()
