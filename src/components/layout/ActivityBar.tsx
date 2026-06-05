import {
  FolderOpen,
  Search,
  BarChart2,
  GitBranch,
  RefreshCw,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export type ActivityView = 'explorer' | 'search' | 'analysis' | 'graph' | 'sync' | 'sig';

interface ActivityBarProps {
  activeView: ActivityView;
  onViewChange: (view: ActivityView) => void;
}

interface ActivityItem {
  id: ActivityView;
  icon: React.ReactNode;
  label: string;
}

const ACTIVITIES: ActivityItem[] = [
  { id: 'explorer',  icon: <FolderOpen size={22} />,    label: 'Explorador (E)' },
  { id: 'search',    icon: <Search size={22} />,        label: 'Búsqueda (Ctrl+F)' },
  { id: 'analysis',  icon: <BarChart2 size={22} />,     label: 'Análisis de procedimientos' },
  { id: 'sig',       icon: <ShieldCheck size={22} />,   label: 'SIG — Gestión de áreas' },
  { id: 'graph',     icon: <GitBranch size={22} />,     label: 'Grafo de conocimiento' },
  { id: 'sync',      icon: <RefreshCw size={22} />,     label: 'Sincronización' },
];

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <div className="w-12 flex flex-col items-center bg-[#111111] border-r border-[#2a2a2a] shrink-0 select-none">
      {/* Top activities */}
      <div className="flex-1 flex flex-col items-center pt-2 gap-1">
        {ACTIVITIES.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={item.label}
            className={`
              relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150
              ${activeView === item.id
                ? 'text-[#e5e5e5] bg-[#1e3a5f]/60'
                : 'text-[#606060] hover:text-[#a3a3a3] hover:bg-[#1e1e1e]'
              }
            `}
          >
            {activeView === item.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#3b82f6] rounded-r" />
            )}
            {item.icon}
          </button>
        ))}
      </div>

      {/* Bottom: settings */}
      <div className="pb-2">
        <button
          title="Configuración"
          className="w-10 h-10 flex items-center justify-center text-[#606060] hover:text-[#a3a3a3] hover:bg-[#1e1e1e] rounded-lg transition-all duration-150"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
