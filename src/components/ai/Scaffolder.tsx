import { useState, useEffect } from 'react';
import { TEMPLATES, TEMPLATE_CATEGORIES, processTemplateFiles, type ProjectTemplate } from '../../data/templates';

interface ScaffolderProps {
  onClose: () => void;
  destinationPath: string;
  onProjectCreated?: (path: string) => void;
}

type Step = 'category' | 'template' | 'options' | 'name' | 'creating';

const STEP_ORDER: Step[] = ['category', 'template', 'options', 'name'];

const STEP_LABELS: Record<string, string> = {
  category: 'Categoría',
  template: 'Plantilla',
  options: 'Opciones',
  name: 'Nombre',
};

const CATEGORY_CODES: Record<string, string> = {
  Backend: 'BE',
  Frontend: 'FE',
  'Full Stack': 'FS',
  Desktop: 'DK',
  Other: 'OT',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Backend: 'Servicios, APIs, CLIs',
  Frontend: 'Interfaces de usuario',
  'Full Stack': 'Frontend + Backend integrado',
  Desktop: 'Aplicaciones nativas',
  Other: 'Proyectos generales',
};

/* ───────────────────────── helpers ───────────────────────── */

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    Backend: '⚙️',
    Frontend: '🖥️',
    'Full Stack': '🌐',
    Desktop: '💻',
    Other: '📦',
  };
  return icons[category] || '📦';
}

function processFileName(filePath: string, projectName: string): string {
  return filePath
    .replace(/\{\{name\}\}/g, projectName)
    .replace(/\{\{name_lower\}\}/g, projectName.toLowerCase().replace(/\s+/g, '-'))
    .split('\\')
    .pop() || filePath;
}

function stepIndex(step: Step): number {
  return STEP_ORDER.indexOf(step);
}

/* ───────────────────────── sub-components ───────────────────────── */

interface StepIndicatorProps {
  current: Step;
}

function StepIndicator({ current }: StepIndicatorProps) {
  const currentIdx = stepIndex(current);
  const isCreating = current === 'creating';

  return (
    <div className="flex items-center gap-0 px-6 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
      {STEP_ORDER.map((step, idx) => {
        const isActive = !isCreating && step === current;
        const isDone = isCreating || idx < currentIdx;

        return (
          <div key={step} className="flex items-center">
            {/* Node */}
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-none flex items-center justify-center text-[10px] transition-all duration-200"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  border: `1px solid ${isActive ? 'var(--accent)' : isDone ? 'var(--success)' : 'var(--border-subtle)'}`,
                  background: isActive ? 'var(--accent)' : isDone ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'var(--bg-raised)',
                  color: isActive ? 'var(--bg-base)' : isDone ? 'var(--success)' : 'var(--text-muted)',
                  fontWeight: 700,
                }}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className="text-[10px] uppercase tracking-wider hidden sm:block"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: isActive ? 'var(--accent)' : isDone ? 'var(--success)' : 'var(--text-muted)',
                }}
              >
                {STEP_LABELS[step]}
              </span>
            </div>

            {/* Connector */}
            {idx < STEP_ORDER.length - 1 && (
              <div
                className="w-8 h-px mx-1"
                style={{
                  background: idx < currentIdx || isCreating
                    ? 'var(--success)'
                    : 'var(--border-subtle)',
                }}
              />
            )}
          </div>
        );
      })}

      {/* Creating indicator appended at end */}
      {isCreating && (
        <div className="flex items-center gap-1.5 ml-1">
          <div
            className="w-6 h-6 rounded-none flex items-center justify-center"
            style={{
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
            }}
          >
            <span
              className="animate-spin inline-block"
              style={{ fontSize: 10, color: 'var(--bg-base)' }}
            >
              ◌
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}
          >
            Init
          </span>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── streaming file list ───────────────────── */

interface StreamingFilesProps {
  files: string[];
  projectPath: string;
}

function StreamingFiles({ files, projectPath }: StreamingFilesProps) {
  const [visible, setVisible] = useState<number>(0);

  useEffect(() => {
    if (visible >= files.length) return;
    const t = setTimeout(() => setVisible(v => v + 1), 80);
    return () => clearTimeout(t);
  }, [visible, files.length]);

  return (
    <div className="space-y-3">
      {/* Project path header */}
      <div
        className="px-3 py-2 text-xs"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>$ </span>
        <span style={{ color: 'var(--text-secondary)' }}>scaffold</span>
        <span style={{ color: 'var(--text-muted)' }}> --dest </span>
        <span style={{ color: 'var(--warning)' }}>{projectPath}</span>
      </div>

      {/* Animated spinner row */}
      <div className="flex items-center gap-3 px-1">
        <div
          className="w-4 h-4 rounded-full animate-spin"
          style={{ border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)' }}
        />
        <span
          className="text-xs"
          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}
        >
          Inicializando estructura...
        </span>
      </div>

      {/* File lines */}
      <div className="space-y-1">
        {files.slice(0, visible).map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-0.5 text-xs"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              animation: 'fadeInRow 0.15s ease-out both',
            }}
          >
            <span style={{ color: 'var(--success)' }}>✓</span>
            <span style={{ color: 'var(--text-muted)' }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */

export function Scaffolder({ onClose, destinationPath, onProjectCreated }: ScaffolderProps) {
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState('');
  const [, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingFiles, setStreamingFiles] = useState<string[]>([]);

  /* ── logic handlers (unchanged) ── */

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
      const projectPath = `${destinationPath}\\${projectName}`;
      const fileNames = Object.keys(files).map(f => processFileName(f, projectName));
      setStreamingFiles(fileNames);

      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = `${projectPath}\\${filePath}`;
        const parts = fullPath.split('\\');

        let currentPath = parts[0];
        for (let i = 1; i < parts.length - 1; i++) {
          currentPath += '\\' + parts[i];
          try {
            await window.electronAPI.createFolder(currentPath);
          } catch {
            // Directory might already exist
          }
        }

        await window.electronAPI.createFile(fullPath, content);
      }

      onProjectCreated?.(projectPath);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
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

  /* ── derived ── */
  const filePreviewKeys = selectedTemplate
    ? Object.keys(selectedTemplate.files).slice(0, 6)
    : [];
  const extraFilesCount = selectedTemplate
    ? Math.max(0, Object.keys(selectedTemplate.files).length - 6)
    : 0;

  const projectPath = `${destinationPath}\\${projectName || '<nombre>'}`;

  /* ══════════════════════════ RENDER ══════════════════════════ */

  return (
    <>
      {/* Inline keyframe styles */}
      <style>{`
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .scaffolder-card:hover .scaffolder-card-code {
          color: var(--accent);
        }
      `}</style>

      {/* Overlay */}
      <div
        className="fixed inset-0 flex items-center justify-center z-[200]"
        style={{ background: 'rgba(0,0,0,0.72)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Dialog */}
        <div
          className="flex flex-col max-w-2xl w-full"
          style={{
            maxHeight: '88vh',
            background: 'var(--bg-surface)',
            borderRadius: 0,
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid var(--accent)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3">
              {step !== 'category' && step !== 'creating' && (
                <button
                  onClick={handleBack}
                  className="flex items-center justify-center w-6 h-6 text-xs transition-colors"
                  title="Atrás"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-raised)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                  }}
                >
                  ←
                </button>
              )}

              {/* Title area */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] px-1.5 py-0.5 uppercase tracking-widest"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'var(--accent)',
                    color: 'var(--bg-base)',
                    fontWeight: 700,
                  }}
                >
                  SCAFF
                </span>
                <h2
                  className="text-sm font-semibold tracking-tight"
                  style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Nuevo Proyecto
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-lg leading-none transition-colors"
              style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)')}
            >
              ✕
            </button>
          </div>

          {/* ── Step indicator ── */}
          <StepIndicator current={step} />

          {/* ── Content ── */}
          <div className="flex-1 overflow-auto p-5">

            {/* ── Step 1: Category ── */}
            {step === 'category' && (
              <div>
                <p
                  className="text-xs mb-4 uppercase tracking-widest"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--text-muted)',
                  }}
                >
                  // Selecciona la categoría del proyecto
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATE_CATEGORIES.map((category) => {
                    const code = CATEGORY_CODES[category] || category.slice(0, 2).toUpperCase();
                    const desc = CATEGORY_DESCRIPTIONS[category] || '';
                    const count = TEMPLATES.filter(t => t.category === category).length;

                    return (
                      <button
                        key={category}
                        onClick={() => handleCategorySelect(category)}
                        className="scaffolder-card group p-4 text-left transition-all duration-150"
                        style={{
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 0,
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.borderColor = 'var(--accent)';
                          el.style.background = 'var(--bg-hover)';
                          el.style.boxShadow = '0 0 0 1px var(--accent-dim), inset 3px 0 0 var(--accent)';
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.borderColor = 'var(--border-subtle)';
                          el.style.background = 'var(--bg-raised)';
                          el.style.boxShadow = 'none';
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span
                            className="scaffolder-card-code text-xl font-black tracking-tighter transition-colors"
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {code}
                          </span>
                          <span className="text-base">{getCategoryIcon(category)}</span>
                        </div>
                        <div
                          className="text-sm font-semibold mb-0.5"
                          style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {category}
                        </div>
                        <div
                          className="text-[11px] mb-2"
                          style={{ color: 'var(--text-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {desc}
                        </div>
                        <div
                          className="text-[10px] uppercase tracking-wider"
                          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}
                        >
                          {count} template{count !== 1 ? 's' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 2: Template ── */}
            {step === 'template' && selectedCategory && (
              <div>
                <p
                  className="text-xs mb-4"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--text-muted)',
                  }}
                >
                  // {CATEGORY_CODES[selectedCategory] || selectedCategory} → elige plantilla
                </p>
                <div className="space-y-2">
                  {TEMPLATES.filter(t => t.category === selectedCategory).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left transition-all duration-150"
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: '4px solid transparent',
                        borderRadius: 0,
                        padding: '12px 14px',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.borderLeftColor = 'var(--accent)';
                        el.style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.borderLeftColor = 'transparent';
                        el.style.background = 'var(--bg-raised)';
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{template.icon || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          >
                            {template.name}
                          </div>
                          <div
                            className="text-xs mt-0.5"
                            style={{ color: 'var(--text-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          >
                            {template.description}
                          </div>
                        </div>
                        {/* Tags */}
                        <div className="flex gap-1 flex-shrink-0">
                          {template.options.slice(0, 3).map(opt => (
                            <span
                              key={opt.id}
                              className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                              style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {opt.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 3: Options ── */}
            {step === 'options' && selectedTemplate && (
              <div className="space-y-4">
                {/* Selected template summary */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '3px solid var(--accent)',
                  }}
                >
                  <span className="text-xl">{selectedTemplate.icon || '📦'}</span>
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      {selectedTemplate.name}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: 'var(--text-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                    >
                      {selectedTemplate.description}
                    </div>
                  </div>
                </div>

                {/* Options heading */}
                <div
                  className="text-[10px] uppercase tracking-widest"
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}
                >
                  // Módulos opcionales
                </div>

                {/* Checkbox list */}
                <div className="space-y-1.5">
                  {selectedTemplate.options.map((option) => {
                    const checked = selectedOptions.has(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionToggle(option.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-100"
                        style={{
                          background: checked ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-raised))' : 'var(--bg-raised)',
                          border: `1px solid ${checked ? 'var(--accent-dim)' : 'var(--border-subtle)'}`,
                          borderRadius: 0,
                        }}
                      >
                        {/* Toggle square */}
                        <div
                          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                          style={{
                            border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-subtle)'}`,
                            background: checked ? 'var(--accent)' : 'var(--bg-surface)',
                          }}
                        >
                          {checked && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--bg-base)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        <span
                          className="text-xs font-medium"
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            color: checked ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {option.label}
                        </span>

                        {option.description && (
                          <span
                            className="text-xs ml-1"
                            style={{ color: 'var(--text-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          >
                            — {option.description}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Continue button */}
                <button
                  onClick={() => setStep('name')}
                  className="w-full py-2.5 text-sm font-semibold tracking-wide transition-all duration-150"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'var(--accent)',
                    color: 'var(--bg-base)',
                    border: 'none',
                    borderRadius: 0,
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
                >
                  CONTINUAR →
                </button>
              </div>
            )}

            {/* ── Step 4: Name ── */}
            {step === 'name' && (
              <div className="space-y-4">
                {/* Terminal-style input */}
                <div>
                  <div
                    className="text-[10px] uppercase tracking-widest mb-2"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}
                  >
                    // Nombre del proyecto
                  </div>
                  <div
                    className="flex items-center"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: '3px solid var(--accent)',
                    }}
                  >
                    <span
                      className="px-3 py-3 text-sm select-none flex-shrink-0"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--accent)',
                        borderRight: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                      }}
                    >
                      &gt;_
                    </span>
                    <span
                      className="px-2 text-xs flex-shrink-0"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--text-muted)',
                      }}
                    >
                      proyecto:
                    </span>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && projectName.trim()) handleCreate();
                      }}
                      placeholder="mi-nuevo-proyecto"
                      className="flex-1 py-3 pr-3 bg-transparent outline-none text-sm"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--text-primary)',
                        caretColor: 'var(--accent)',
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* File preview */}
                {projectName && selectedTemplate && (
                  <div
                    className="px-3 py-3"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      className="text-[10px] uppercase tracking-widest mb-2"
                      style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}
                    >
                      Archivos que se crearán:
                    </div>
                    <div className="space-y-0.5">
                      {filePreviewKeys.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[11px]"
                          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>├─</span>
                          <span>{processFileName(file, projectName)}</span>
                        </div>
                      ))}
                      {selectedOptions.has('git') && (
                        <div
                          className="flex items-center gap-2 text-[11px]"
                          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>├─</span>
                          <span>.gitignore</span>
                        </div>
                      )}
                      {selectedOptions.has('readme') && (
                        <div
                          className="flex items-center gap-2 text-[11px]"
                          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>├─</span>
                          <span>README.md</span>
                        </div>
                      )}
                      {extraFilesCount > 0 && (
                        <div
                          className="text-[11px] mt-1"
                          style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}
                        >
                          └─ … +{extraFilesCount} más
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Destination path display */}
                <div
                  className="flex items-center gap-2 px-3 py-2 text-[11px]"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ color: 'var(--accent)' }}>→</span>
                  <span style={{ color: 'var(--warning)' }}>{projectPath}</span>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="px-3 py-2 text-xs"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                      color: 'var(--danger)',
                    }}
                  >
                    ✗ {error}
                  </div>
                )}

                {/* Create button */}
                <button
                  onClick={handleCreate}
                  disabled={!projectName.trim()}
                  className="w-full py-2.5 text-sm font-semibold tracking-wide transition-all duration-150"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    background: projectName.trim() ? 'var(--accent)' : 'var(--bg-raised)',
                    color: projectName.trim() ? 'var(--bg-base)' : 'var(--text-muted)',
                    border: `1px solid ${projectName.trim() ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    borderRadius: 0,
                    cursor: projectName.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  CREAR PROYECTO
                </button>
              </div>
            )}

            {/* ── Creating state ── */}
            {step === 'creating' && (
              <StreamingFiles
                files={streamingFiles}
                projectPath={projectPath}
              />
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="px-5 py-2 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div
              className="text-[10px] uppercase tracking-widest"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}
            >
              dest:
              <span
                className="ml-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                {destinationPath}
              </span>
            </div>
            <div
              className="text-[10px]"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--border-subtle)' }}
            >
              SCAFF/v1
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
