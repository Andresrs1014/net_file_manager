import { useState } from 'react';
import { TEMPLATES, TEMPLATE_CATEGORIES, processTemplateFiles, type ProjectTemplate } from '../../data/templates';

interface ScaffolderProps {
  onClose: () => void;
  destinationPath: string;
  onProjectCreated?: (path: string) => void;
}

type Step = 'category' | 'template' | 'options' | 'name' | 'creating';

export function Scaffolder({ onClose, destinationPath, onProjectCreated }: ScaffolderProps) {
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState('');
  const [, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setStep('template');
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setSelectedOptions(new Set(template.options.map(o => o.id)));
    setStep('options');
  };

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!projectName.trim() || !selectedTemplate) return;

    setCreating(true);
    setStep('creating');
    setError(null);

    try {
      const files = processTemplateFiles(selectedTemplate, projectName, selectedOptions);
      
      // Create project directory
      const projectPath = `${destinationPath}\\${projectName}`;
      
      // Create folders and files via fileService
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = `${projectPath}\\${filePath}`;
        const parts = fullPath.split('\\');
        
        // Ensure parent directory exists
        let currentPath = parts[0];
        for (let i = 1; i < parts.length - 1; i++) {
          currentPath += '\\' + parts[i];
          try {
            await window.electronAPI.createFolder(currentPath);
          } catch {
            // Directory might already exist
          }
        }
        
        // Create file
        await window.electronAPI.createFile(fullPath, content);
      }

      onProjectCreated?.(projectPath);
      onClose();
    } catch (err: any) {
      setError(err.message);
      setStep('name');
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'template':
        setStep('category');
        setSelectedCategory(null);
        break;
      case 'options':
        setStep('template');
        setSelectedTemplate(null);
        break;
      case 'name':
        setStep('options');
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-[#262626] border border-[#404040] rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
          <div className="flex items-center gap-2">
            {step !== 'category' && (
              <button
                onClick={handleBack}
                className="p-1 text-[#737373] hover:text-[#e5e5e5] transition-colors"
                title="Atrás"
              >
                ←
              </button>
            )}
            <span className="text-lg">🧱</span>
            <h2 className="text-base font-medium text-[#e5e5e5]">Crear Nuevo Proyecto</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#e5e5e5] text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-4 py-2 border-b border-[#333] flex items-center gap-2 text-xs text-[#737373]">
          {step === 'category' && <span className="text-[#3b82f6]">1. Categoría</span>}
          {step === 'template' && <span>1. ✓</span>}
          {(step === 'template' || step === 'options' || step === 'name' || step === 'creating') && (
            <>
              <span className={step === 'template' ? 'text-[#3b82f6]' : 'text-[#3b82f6]/60'}>2. Template</span>
              {(step === 'options' || step === 'name' || step === 'creating') && (
                <>
                  <span className={step === 'options' ? 'text-[#3b82f6]' : 'text-[#3b82f6]/60'}>3. ✓</span>
                  {(step === 'name' || step === 'creating') && (
                    <span className={step === 'name' ? 'text-[#3b82f6]' : 'text-[#3b82f6]/60'}>4. Nombre</span>
                  )}
                </>
              )}
            </>)}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Step 1: Category selection */}
          {step === 'category' && (
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className="p-4 bg-[#1a1a1a] border border-[#404040] rounded-lg hover:border-[#3b82f6] transition-colors text-left group"
                >
                  <div className="text-2xl mb-2">{getCategoryIcon(category)}</div>
                  <div className="text-sm font-medium text-[#e5e5e5] group-hover:text-[#3b82f6]">{category}</div>
                  <div className="text-xs text-[#737373] mt-1">
                    {TEMPLATES.filter(t => t.category === category).length} templates
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Template selection */}
          {step === 'template' && selectedCategory && (
            <div className="space-y-3">
              <div className="text-sm text-[#737373] mb-3">
                Selecciona un template para <span className="text-[#e5e5e5]">{selectedCategory}</span>
              </div>
              {TEMPLATES.filter(t => t.category === selectedCategory).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full p-4 bg-[#1a1a1a] border border-[#404040] rounded-lg hover:border-[#3b82f6] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon || '📦'}</span>
                    <div>
                      <div className="text-sm font-medium text-[#e5e5e5] group-hover:text-[#3b82f6]">
                        {template.name}
                      </div>
                      <div className="text-xs text-[#737373] mt-1">
                        {template.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Options selection */}
          {step === 'options' && selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                <span className="text-2xl">{selectedTemplate.icon || '📦'}</span>
                <div>
                  <div className="text-sm font-medium text-[#e5e5e5]">{selectedTemplate.name}</div>
                  <div className="text-xs text-[#737373]">{selectedTemplate.description}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-[#737373] uppercase mb-2">Opciones</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionToggle(option.id)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        selectedOptions.has(option.id)
                          ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#3b82f6]'
                          : 'bg-[#1a1a1a] border border-[#404040] text-[#a3a3a3] hover:border-[#505050]'
                      }`}
                    >
                      {selectedOptions.has(option.id) ? '☑' : '☐'} {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep('name')}
                className="w-full py-3 bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors font-medium"
              >
                Continuar →
              </button>
            </div>
          )}

          {/* Step 4: Project name */}
          {step === 'name' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#737373] uppercase block mb-2">
                  Nombre del proyecto
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Mi Nuevo Proyecto"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#404040] rounded-lg text-[#e5e5e5] text-lg outline-none focus:border-[#3b82f6] transition-colors"
                  autoFocus
                />
              </div>

              {projectName && selectedTemplate && (
                <div className="p-3 bg-[#1a1a1a] rounded-lg text-xs text-[#737373]">
                  <div className="font-medium text-[#a3a3a3] mb-2">Archivos a crear:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.keys(selectedTemplate.files).slice(0, 6).map((file, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span>📄</span>
                        <span>{processFileName(file, projectName)}</span>
                      </div>
                    ))}
                    {Object.keys(selectedTemplate.files).length > 6 && (
                      <div className="text-[#505050]">
                        ... y {Object.keys(selectedTemplate.files).length - 6} más
                      </div>
                    )}
                    {selectedOptions.has('git') && (
                      <div className="flex items-center gap-1">
                        <span>📋</span>
                        <span>.gitignore</span>
                      </div>
                    )}
                    {selectedOptions.has('readme') && (
                      <div className="flex items-center gap-1">
                        <span>📝</span>
                        <span>README.md</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={!projectName.trim()}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  projectName.trim()
                    ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                    : 'bg-[#404040] text-[#737373] cursor-not-allowed'
                }`}
              >
                Crear Proyecto
              </button>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          {/* Creating state */}
          {step === 'creating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-4" />
              <div className="text-sm text-[#e5e5e5]">Creando proyecto...</div>
              <div className="text-xs text-[#737373] mt-1">{projectName}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#333] text-xs text-[#737373]">
          Destino: <span className="text-[#a3a3a3]">{destinationPath}</span>
        </div>
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Backend': '⚙️',
    'Frontend': '🖥️',
    'Full Stack': '🌐',
    'Desktop': '💻',
    'Other': '📦',
  };
  return icons[category] || '📦';
}

function processFileName(filePath: string, projectName: string): string {
  return filePath
    .replace(/\{\{name\}\}/g, projectName)
    .replace(/\{\{name_lower\}\}/g, projectName.toLowerCase().replace(/\s+/g, '-'))
    .split('\\').pop() || filePath;
}