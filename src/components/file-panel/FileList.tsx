import type { FileEntry } from '../../types';
import { fileService } from '../../services/fileService';

interface FileListProps {
  entries: FileEntry[];
  selectedPaths: Set<string>;
  onSelect: (entry: FileEntry, e: React.MouseEvent) => void;
  onDoubleClick: (entry: FileEntry) => void;
}

export function FileList({
  entries,
  selectedPaths,
  onSelect,
  onDoubleClick,
}: FileListProps) {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  if (sortedEntries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#737373] h-full">
        <div className="text-center">
          <div className="text-4xl mb-2">📂</div>
          <p className="text-sm">Carpeta vacía</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-1">
      {sortedEntries.map((entry) => (
        <div
          key={entry.path}
          className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded transition-colors ${
            selectedPaths.has(entry.path) 
              ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/40' 
              : 'hover:bg-[#333]'
          }`}
          onClick={(e) => onSelect(entry, e)}
          onDoubleClick={() => onDoubleClick(entry)}
          onContextMenu={(e) => {
            e.preventDefault();
          }}
        >
          <span className="text-base">{fileService.getFileIcon(entry)}</span>
          <span className="flex-1 truncate text-sm text-[#e5e5e5]">{entry.name}</span>
        </div>
      ))}
    </div>
  );
}