import os
import shutil
import send2trash
from pathlib import Path

class FileCommand:
    def execute(self): raise NotImplementedError
    def undo(self):    raise NotImplementedError

class CopyCommand(FileCommand):
    def __init__(self, src, dst):
        self.src = src
        self.dst = dst
        self._result = None

    def execute(self):
        if os.path.isdir(self.src):
            self._result = shutil.copytree(self.src, self.dst)
        else:
            self._result = shutil.copy2(self.src, self.dst)

    def undo(self):
        if self._result and os.path.exists(self._result):
            if os.path.isdir(self._result): shutil.rmtree(self._result)
            else: os.remove(self._result)

class MoveCommand(FileCommand):
    def __init__(self, src, dst):
        self.src = src
        self.dst = dst

    def execute(self): shutil.move(self.src, self.dst)
    def undo(self):    shutil.move(self.dst, self.src)

class DeleteCommand(FileCommand):
    def __init__(self, path, permanent=False):
        self.path      = path
        self.permanent = permanent

    def execute(self):
        if self.permanent:
            if os.path.isdir(self.path): shutil.rmtree(self.path)
            else: os.remove(self.path)
        else:
            send2trash.send2trash(self.path)

class RenameCommand(FileCommand):
    def __init__(self, src, new_name):
        self.src = src
        self.dst = os.path.join(str(Path(src).parent), new_name)

    def execute(self): os.rename(self.src, self.dst)
    def undo(self):    os.rename(self.dst, self.src)

class CreateFolderCommand(FileCommand):
    def __init__(self, path):
        self.path = path

    def execute(self): os.makedirs(self.path, exist_ok=True)
    def undo(self):
        if os.path.exists(self.path): shutil.rmtree(self.path)

class CreateFileCommand(FileCommand):
    def __init__(self, path):
        self.path = path

    def execute(self):
        path = Path(self.path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch()

    def undo(self):
        if os.path.exists(self.path): os.remove(self.path)

class FileOps:
    def __init__(self):
        self._history = []

    def _run(self, command: FileCommand):
        command.execute()
        self._history.append(command)

    def copy(self, src, dst):                self._run(CopyCommand(src, dst))
    def move(self, src, dst):                self._run(MoveCommand(src, dst))
    def delete(self, path, permanent=False): self._run(DeleteCommand(path, permanent))
    def rename(self, src, new_name):         self._run(RenameCommand(src, new_name))
    def create_folder(self, path):           self._run(CreateFolderCommand(path))
    def create_file(self, path):             self._run(CreateFileCommand(path))

    def undo(self):
        if self._history:
            self._history.pop().undo()
