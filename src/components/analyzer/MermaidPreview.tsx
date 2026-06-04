import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidReady = false;

interface Props {
  code: string;
  className?: string;
}

export function MermaidPreview({ code, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code.trim() || !containerRef.current) {
      setError(null);
      return;
    }

    if (!mermaidReady) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
      });
      mermaidReady = true;
    }

    const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;
    setError(null);

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg;
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Error al renderizar Mermaid');
        if (containerRef.current) containerRef.current.innerHTML = '';
      });
  }, [code]);

  if (!code.trim()) {
    return <p className="text-xs text-[#737373]">Sin flujograma</p>;
  }

  return (
    <div className={className}>
      {error && (
        <p className="text-xs text-amber-400 mb-2">Vista previa: {error}. Ver código abajo.</p>
      )}
      <div ref={containerRef} className="overflow-auto bg-[#0c0c0c] rounded-lg p-4 border border-[#333] [&_svg]:max-w-full" />
    </div>
  );
}
