interface StatusBarProps {
  version?: string;
  syncStatus?: 'idle' | 'syncing' | 'error' | 'ok';
  indexedFiles?: number;
  currentPath?: string;
  onCommandPalette?: () => void;
}

const SYNC_BADGE: Record<string, { label: string; color: string }> = {
  idle:    { label: 'Sin conectar',    color: 'var(--text-muted)' },
  syncing: { label: '⏳ Sincronizando…', color: 'var(--warning)' },
  error:   { label: '⚠ Error sync',   color: 'var(--danger)' },
  ok:      { label: '✔ Sincronizado', color: 'var(--success)' },
};

export function StatusBar({
  version = '1.0.0',
  syncStatus = 'idle',
  indexedFiles = 0,
  currentPath = '',
  onCommandPalette,
}: StatusBarProps) {
  const sync = SYNC_BADGE[syncStatus];

  return (
    <div
      className="h-5 flex items-center px-3 gap-4 shrink-0 select-none"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '9px',
        letterSpacing: '0.01em',
      }}
    >
      {/* Left: current path */}
      <span
        className="font-mono truncate max-w-[280px]"
        style={{ color: 'var(--text-muted)' }}
        title={currentPath}
      >
        {currentPath || '—'}
      </span>

      <span className="flex-1" />

      {/* Indexed files count */}
      {indexedFiles > 0 && (
        <span style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--accent)' }}>{indexedFiles.toLocaleString()}</span>
          {' '}archivos
        </span>
      )}

      {/* Command palette shortcut */}
      <button
        onClick={onCommandPalette}
        title="Paleta de comandos"
        className="flex items-center gap-0.5 px-1 rounded transition-colors duration-100"
        style={{
          color: 'var(--text-muted)',
          fontSize: '9px',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-hover)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
        }}
      >
        ⌘K Paleta
      </button>

      {/* Sync status */}
      <span style={{ color: sync.color }}>{sync.label}</span>

      {/* Cost placeholder */}
      <span style={{ color: 'var(--text-muted)' }}>$0.00 hoy</span>

      {/* Version */}
      <span style={{ color: 'var(--border-strong)' }}>NetVault v{version}</span>
    </div>
  );
}
