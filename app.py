import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from controllers.app_controller import AppController
from ui.main_window_v2 import MainWindow

def main():
    ctrl   = AppController()
    window = MainWindow(ctrl)
    window.run()

if __name__ == "__main__":
    main()
