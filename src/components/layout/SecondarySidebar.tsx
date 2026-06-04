import { X, BarChart2, FileText, Clock, Lightbulb } from 'lucide-react';

interface SecondarySidebarProps {
  onClose: () => void;
}

export function SecondarySidebar({ onClose }: SecondarySidebarProps) {
  return (
    <div className="w-72 shrink-0 flex flex-col bg-[#141414] border-l border-[#2a2a2a]">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-[#3b82f6]" />
          <span className="text-xs font-semibold text-[#a3a3a3] uppercase tracking-wide">
            Resultado del análisis
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#505050] hover:text-[#a3a3a3] transition-colors p-1 rounded hover:bg-[#1e1e1e]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Placeholder content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-4">
          <BarChart2 size={26} className="text-[#383838]" />
        </div>
        <p className="text-sm text-[#505050] mb-1">Sin análisis activo</p>
        <p className="text-xs text-[#383838] leading-relaxed">
          Selecciona un procedimiento y presiona <strong className="text-[#505050]">Analizar</strong> para ver los hallazgos aquí.
        </p>
      </div>

      {/* Future sections (collapsed) */}
      <div className="border-t border-[#2a2a2a] divide-y divide-[#1e1e1e]">
        {[
          { icon: <FileText size={13} />, label: 'Hallazgos' },
          { icon: <Clock size={13} />,     label: 'Tiempos' },
          { icon: <Lightbulb size={13} />, label: 'Propuestas' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#383838] cursor-default select-none">
            {s.icon}
            <span>{s.label}</span>
            <span className="ml-auto text-[10px] text-[#2a2a2a] border border-[#2a2a2a] rounded px-1">próximo</span>
          </div>
        ))}
      </div>
    </div>
  );
}
