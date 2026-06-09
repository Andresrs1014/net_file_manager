import { useState, useEffect } from 'react';

// Extended API type that includes window control methods
type TitleBarAPI = {
  windowMinimize?: () => void;
  windowMaximize?: () => void;
  windowClose?: () => void;
  windowIsMaximized?: () => Promise<boolean>;
  onWindowMaximized?: (cb: (maximized: boolean) => void) => void;
};

function getAPI(): TitleBarAPI {
  return (window as unknown as { electronAPI?: TitleBarAPI }).electronAPI ?? {};
}

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const api = getAPI();
    api.windowIsMaximized?.().then((val) => setIsMaximized(val));
    api.onWindowMaximized?.((val: boolean) => setIsMaximized(val));
  }, []);

  const drag: React.CSSProperties & { WebkitAppRegion?: string } = {
    WebkitAppRegion: 'drag',
  };
  const noDrag: React.CSSProperties & { WebkitAppRegion?: string } = {
    WebkitAppRegion: 'no-drag',
  };

  return (
    <div
      className="h-9 flex items-center shrink-0 select-none relative"
      style={{
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
        ...drag,
      }}
    >
      {/* Cyan accent line — left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ background: 'linear-gradient(to bottom, var(--accent), transparent)' }}
      />

      {/* Left: logo + name */}
      <div className="flex items-center gap-2 pl-4 pr-3">
        {/* N mark */}
        <div
          className="flex items-center justify-center rounded-[3px] shrink-0"
          style={{
            width: 18,
            height: 18,
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent-glow)',
          }}
        >
          <span
            style={{
              fontFamily: 'JetBrains Mono, DM Mono, monospace',
              fontSize: 11,
              fontWeight: 700,
              color: '#000',
              lineHeight: 1,
            }}
          >
            N
          </span>
        </div>

        <span
          style={{
            fontFamily: 'Plus Jakarta Sans, DM Sans, sans-serif',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          NetVault
        </span>
      </div>

      {/* Draggable spacer */}
      <div className="flex-1" style={drag} />

      {/* Window controls */}
      <div className="flex items-stretch h-full" style={noDrag}>
        <TrafficButton
          title="Minimizar"
          hoverColor="rgba(255,196,0,0.15)"
          hoverIconColor="#fbbf24"
          onClick={() => getAPI().windowMinimize?.()}
          icon={
            <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
              <rect y="0.5" width="10" height="1" rx="0.5" fill="currentColor"/>
            </svg>
          }
        />
        <TrafficButton
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
          hoverColor="rgba(0,200,100,0.12)"
          hoverIconColor="#4ade80"
          onClick={() => getAPI().windowMaximize?.()}
          icon={
            isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="2" y="0" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1"/>
                <rect x="0" y="2" width="8" height="8" rx="1" fill="var(--bg-base)" stroke="currentColor" strokeWidth="1"/>
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="0.5" y="0.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/>
              </svg>
            )
          }
        />
        <TrafficButton
          title="Cerrar"
          hoverColor="rgba(220,38,38,0.2)"
          hoverIconColor="#ef4444"
          onClick={() => getAPI().windowClose?.()}
          icon={
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          }
        />
      </div>
    </div>
  );
}

// ── Minimal traffic-light style button ────────────────────────────────────────

interface TrafficButtonProps {
  title: string;
  hoverColor: string;
  hoverIconColor: string;
  onClick: () => void;
  icon: React.ReactNode;
}

function TrafficButton({ title, hoverColor, hoverIconColor, onClick, icon }: TrafficButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-11 h-full flex items-center justify-center transition-colors duration-100"
      style={{
        background: hovered ? hoverColor : 'transparent',
        color: hovered ? hoverIconColor : 'var(--text-muted)',
      }}
    >
      {icon}
    </button>
  );
}
