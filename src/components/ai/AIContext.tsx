import { useState, useEffect } from 'react';
import { fastIndexer } from '../../services/indexer/fileIndexer';

interface AIContextProps {
  projectPath: string;
  onClose: () => void;
}

interface ContextFile {
  name: string;
  path: string;
  selected: boolean;
}

export function AIContext({ projectPath, onClose }: AIContextProps) {
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjectFiles();
  }, [projectPath]);

  const loadProjectFiles = async () => {
    setIsLoading(true);
    try {
      // Index the project directory
      await fastIndexer.indexDirectory(projectPath, 3);
      
      // Get key files for context
      const KEY_EXTENSIONS = [
        '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rs',
        '.json', '.yaml', '.yml', '.md', '.txt', '.css', '.html',
      ];

      const allFiles = fastIndexer.search('', { maxResults: 500 });

      // Filter key files
      const keyFiles = allFiles
        .filter(f => !f.isDirectory && KEY_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext)))
        .map(f => ({
          name: f.name,
          path: f.path,
          selected: ['package.json', 'README.md', 'tsconfig.json', 'requirements.txt'].includes(f.name),
        }))
        .slice(0, 50); // Limit to 50 files

      setFiles(keyFiles);
    } catch (error) {
      console.error('Error loading project files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFile = (path: string) => {
    setFiles(prev => prev.map(f => 
      f.path === path ? { ...f, selected: !f.selected } : f
    ));
  };

  const selectedFiles = files.filter(f => f.selected);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-[#262626] border border-[#404040] rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
          <div>
            <h2 className="text-base font-medium text-[#e5e5e5]">Contexto del Proyecto</h2>
            <p className="text-xs text-[#737373] mt-0.5">{projectPath}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#e5e5e5] text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-2 border-b border-[#333] flex items-center gap-4 text-xs text-[#a3a3a3]">
          <span>📄 {files.length} archivos detectados</span>
          <span>✓ {selectedFiles.length} seleccionados para contexto</span>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="text-center text-[#737373] py-8">
              Cargando archivos...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => toggleFile(file.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm text-left transition-colors ${
                    file.selected
                      ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#e5e5e5]'
                      : 'bg-[#1a1a1a] border border-transparent text-[#a3a3a3] hover:border-[#404040]'
                  }`}
                >
                  <span>{file.selected ? '☑' : '☐'}</span>
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#333] flex justify-between items-center">
          <p className="text-xs text-[#737373]">
            Los archivos seleccionados se incluirán en el contexto de la IA
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-[#3b82f6] text-white rounded hover:bg-[#2563eb] transition-colors"
          >
            Aplicar contexto
          </button>
        </div>
      </div>
    </div>
  );
}