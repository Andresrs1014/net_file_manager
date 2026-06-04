interface StatusBarProps {
  version?: string;
  syncStatus?: 'idle' | 'syncing' | 'error' | 'ok';
  indexedFiles?: number;
  currentPath?: string;
  onCommandPalette?: () => void;
}

const SYNC_BADGE: Record<string, { label: string; color: string }> = {
  idle:    { label: 'Sin conectar', color: 'text-[#606060]' },
  syncing: { label: '⏳ Sincronizando…', color: 'text-[#f59e0b]' },
  error:   { label: '⚠ Error sync', color: 'text-[#ef4444]' },
  ok:      { label: '✔ Sincronizado', color: 'text-[#22c55e]' },
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
    <div className="h-6 flex items-center px-3 gap-4 bg-[#0d0d0d] border-t border-[#2a2a2a] text-[10px] shrink-0 select-none">
      {/* Left: path */}
      <span className="text-[#505050] truncate max-w-[300px]" title={currentPath}>
        {currentPath || '—'}
      </span>

      <span className="flex-1" />

      {/* Index count */}
      {indexedFiles > 0 && (
        <span className="text-[#505050]">
          📇 {indexedFiles.toLocaleString()} archivos
        </span>
      )}

      {/* Command palette hint */}
      <button
        onClick={onCommandPalette}
        className="text-[#505050] hover:text-[#a3a3a3] transition-colors px-1.5 py-0.5 rounded hover:bg-[#1e1e1e]"
        title="Paleta de comandos"
      >
        ⌘K Paleta
      </button>

      {/* Sync */}
      <span className={sync.color}>{sync.label}</span>

      {/* Cost placeholder */}
      <span className="text-[#505050]">$0.00 hoy</span>

      {/* Version */}
      <span className="text-[#383838]">NetVault v{version}</span>
    </div>
  );
}
