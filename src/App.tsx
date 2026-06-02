import { useState, useEffect } from 'react';

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Verificar que Electron API está disponible
    if (window.electronAPI) {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a] text-gray-400">
        <p>Cargando NetVault...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a] text-[#f5f5f5]">
      {/* Toolbar */}
      <header className="h-12 bg-[#333] flex items-center px-4 gap-4 border-b border-[#404040]">
        <h1 className="text-lg font-semibold text-[#3b82f6]">NetVault</h1>
        <div className="flex-1" />
        <button className="px-3 py-1 text-sm bg-[#3b82f6] text-white rounded hover:bg-[#2563eb] transition-colors">
          Abrir Carpeta
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 flex">
        {/* Panel izquierdo */}
        <div className="flex-1 flex flex-col border-r border-[#404040]">
          <div className="h-10 bg-[#262626] flex items-center px-4 border-b border-[#404040]">
            <span className="text-sm text-[#a3a3a3]">Panel izquierdo</span>
          </div>
          <div className="flex-1 p-4 text-[#a3a3a3]">
            <p>Selecciona una carpeta para comenzar</p>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex-1 flex flex-col">
          <div className="h-10 bg-[#262626] flex items-center px-4 border-b border-[#404040]">
            <span className="text-sm text-[#a3a3a3]">Panel derecho</span>
          </div>
          <div className="flex-1 p-4 text-[#a3a3a3]">
            <p>Selecciona una carpeta para comenzar</p>
          </div>
        </div>
      </main>

      {/* Status bar */}
      <footer className="h-6 bg-[#262626] flex items-center px-4 text-xs text-[#a3a3a3] border-t border-[#404040]">
        NetVault listo
      </footer>
    </div>
  );
}

export default App;