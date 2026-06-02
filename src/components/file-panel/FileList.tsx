import { FileItem } from './FileItem';
import type { FileEntry } from '../../types';

interface FileListProps {
  entries: FileEntry[];
  selectedPaths: Set<string>;
  onSelect: (entry: FileEntry, e: React.MouseEvent) => void;
  onDoubleClick: (entry: FileEntry) => void;
  getIcon: (entry: FileEntry) => string;
  getSize?: (entry: FileEntry) => string | undefined;
}

export function FileList({ entries, selectedPaths, onSelect, onDoubleClick, getIcon, getSize }: FileListProps) {
  // Ordenar: carpetas primero, luego archivos, ambos ordenados alfabéticamente
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  if (sortedEntries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#737373]">
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
        <FileItem
          key={entry.path}
          entry={entry}
          isSelected={selectedPaths.has(entry.path)}
          onSelect={(e) => onSelect(entry, e)}
          onDoubleClick={() => onDoubleClick(entry)}
          icon={getIcon(entry)}
          size={getSize ? getSize(entry) : undefined}
        />
      ))}
    </div>
  );
}