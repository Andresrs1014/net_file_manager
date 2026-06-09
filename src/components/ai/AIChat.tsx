import { useState, useRef, useEffect } from 'react';
import { X, Trash2, Layers, Zap, Bot } from 'lucide-react';
import { chatViaIntranet } from '../../services/intranetService';
import { getStoredSession } from '../../services/authService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  modelo?: 'claude' | 'gemini';
}

interface AIChatProps {
  projectPath?: string;
  onClose: () => void;
  onOpenScaffolder?: () => void;
}

export function AIChat({ projectPath, onClose, onOpenScaffolder }: AIChatProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modelo, setModelo] = useState<'claude' | 'gemini'>('claude');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'NetVault AI listo. Puedo analizar archivos, generar código y responder preguntas sobre tu proyecto.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(288);
  const dragRef = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Session check ──────────────────────────────────────────────────────────

  useEffect(() => {
    getStoredSession().then((s) => setIsLoggedIn(s.loggedIn)).catch(() => setIsLoggedIn(false));
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !isLoggedIn) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date(), modelo },
    ]);

    try {
      const context = projectPath
        ? `El usuario está trabajando en el proyecto: ${projectPath}\n\n`
        : '';

      // Build historial excluding welcome and empty assistant placeholder
      const historial = messages
        .filter((m) => m.role !== 'system' && m.id !== 'welcome' && m.content)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const result = await chatViaIntranet({
        messages: [
          ...historial,
          { role: 'user', content: context + input.trim() },
        ],
        system: 'Eres un asistente de NetVault, el gestor de archivos de escritorio de ZYMO. Eres útil, conciso y respondes en español.',
        modelo,
      });

      const content = result.ok && result.data
        ? result.data.content
        : result.error || 'No se pudo obtener una respuesta.';

      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m) => m.id === assistantId);
        if (idx !== -1) updated[idx] = { ...updated[idx], content };
        return updated;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m) => m.id === assistantId);
        if (idx !== -1) updated[idx] = { ...updated[idx], content: `Error: ${msg}` };
        return updated;
      });
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Chat limpiado.',
        timestamp: new Date(),
      },
    ]);
    setError(null);
  };

  // ── Drag-to-resize ─────────────────────────────────────────────────────────

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = e.clientX;

    const onMove = (ev: MouseEvent) => {
      if (dragRef.current === null) return;
      const delta = ev.clientX - dragRef.current;
      setPanelWidth((w) => Math.min(480, Math.max(224, w + delta)));
      dragRef.current = ev.clientX;
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Status badge ───────────────────────────────────────────────────────────

  const statusBadge = () => {
    if (!isLoggedIn)
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--danger)]/15 text-[var(--danger)]">
          sin sesión
        </span>
      );
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--success)]/15 text-[var(--success)]">
        conectado
      </span>
    );
  };

  const isDisabled = !isLoggedIn || isLoading;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full relative shrink-0" style={{ width: panelWidth }}>
      {/* Drag handle — left edge */}
      <div
        onMouseDown={onDragStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10
                   bg-[var(--border-subtle)] hover:bg-[var(--accent)] transition-colors duration-150"
        title="Arrastrar para redimensionar"
      />

      <div className="flex flex-col h-full w-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)]">
        {/* Header */}
        <div className="h-9 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] shrink-0
                        bg-[var(--bg-raised)]">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
              AI
            </span>
            {statusBadge()}
          </div>
          <div className="flex items-center gap-1">
            {/* Model toggle */}
            <button
              onClick={() => setModelo((m) => (m === 'claude' ? 'gemini' : 'claude'))}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors
                ${modelo === 'claude'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--border-accent)]'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}
              title={`Modelo: ${modelo}. Click para cambiar.`}
            >
              {modelo === 'claude' ? <Bot size={10} /> : <Zap size={10} />}
              {modelo === 'claude' ? 'Claude' : 'Gemini'}
            </button>

            {onOpenScaffolder && (
              <button
                onClick={onOpenScaffolder}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]
                           hover:bg-[var(--bg-hover)] rounded transition-colors"
                title="Scaffolder"
              >
                <Layers size={13} />
              </button>
            )}
            <button
              onClick={clearChat}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]
                         hover:bg-[var(--bg-hover)] rounded transition-colors"
              title="Limpiar chat"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]
                         hover:bg-[var(--bg-hover)] rounded transition-colors"
              title="Cerrar"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* No-session notice */}
        {!isLoggedIn && (
          <div className="mx-3 mt-2 px-2.5 py-2 rounded border border-[var(--warning)]/30
                          bg-[var(--warning)]/8 text-[10px] text-[var(--warning)]">
            Inicia sesión en la intranet ZYMO para usar el chat IA.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-auto px-3 py-3 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded px-2.5 py-1.5 text-[12px] border ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                {msg.role === 'assistant' && msg.modelo && (
                  <div className="flex items-center gap-1 mb-0.5">
                    {msg.modelo === 'gemini'
                      ? <Zap size={9} className="text-emerald-400" />
                      : <Bot size={9} className="text-[var(--accent)]" />}
                    <span className={`text-[9px] ${msg.modelo === 'gemini' ? 'text-emerald-400' : 'text-[var(--accent)]'}`}>
                      {msg.modelo === 'gemini' ? 'Gemini' : 'Claude'}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <div className="text-[10px] mt-0.5 text-[var(--text-muted)] opacity-70">
                  {msg.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '120ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-3 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-raised)]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isLoggedIn
                  ? 'Requiere sesión activa en la intranet'
                  : 'Escribe... (Enter envía, Shift+Enter nueva línea)'
              }
              disabled={isDisabled}
              rows={2}
              className="flex-1 bg-[var(--bg-base)] border border-[var(--border-default)]
                         rounded px-3 py-2.5 text-[11px] font-[JetBrains_Mono,monospace]
                         text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         outline-none focus:border-[var(--border-accent)]
                         resize-none disabled:opacity-40 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isDisabled}
              className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                input.trim() && !isDisabled
                  ? 'bg-[var(--accent)] text-[var(--bg-base)] hover:bg-[var(--accent-hover)]'
                  : 'bg-[var(--bg-overlay)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              Enviar
            </button>
          </div>

          {error && (
            <p className="mt-1.5 text-[10px] text-[var(--danger)]">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
