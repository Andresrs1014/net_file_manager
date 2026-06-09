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
  { id: 'explorer',  icon: <FolderOpen size={18} />,  label: 'Explorador (E)' },
  { id: 'search',    icon: <Search size={18} />,      label: 'Búsqueda (Ctrl+F)' },
  { id: 'analysis',  icon: <BarChart2 size={18} />,   label: 'Análisis de procedimientos' },
  { id: 'sig',       icon: <ShieldCheck size={18} />, label: 'SIG — Gestión de áreas' },
  { id: 'graph',     icon: <GitBranch size={18} />,   label: 'Grafo de conocimiento' },
  { id: 'sync',      icon: <RefreshCw size={18} />,   label: 'Sincronización' },
];

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <div
      className="w-10 flex flex-col items-center shrink-0 select-none"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Top activities */}
      <div className="flex-1 flex flex-col items-center pt-2 gap-0.5">
        {ACTIVITIES.map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={item.label}
              className="relative w-9 h-9 flex items-center justify-center rounded-md transition-all duration-150"
              style={{
                color: isActive
                  ? 'var(--accent)'
                  : 'var(--text-muted)',
                backgroundColor: isActive
                  ? 'var(--accent-dim)'
                  : 'transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Active indicator — left bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
                  style={{
                    width: '2px',
                    height: '18px',
                    backgroundColor: 'var(--accent)',
                  }}
                />
              )}
              {item.icon}
            </button>
          );
        })}
      </div>

      {/* Bottom: settings */}
      <div className="pb-2">
        <button
          title="Configuración"
          className="w-9 h-9 flex items-center justify-center rounded-md transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
