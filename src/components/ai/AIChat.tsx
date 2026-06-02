import { useState, useRef, useEffect } from 'react';
import { aiService } from '../../services/indexer/aiService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  projectPath?: string;
  onClose: () => void;
  onOpenScaffolder?: () => void;
}

export function AIChat({ projectPath, onClose, onOpenScaffolder }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hola! Soy tu asistente de IA en NetVault. Puedo ayudarte a:\n\n• Analizar código y archivos\n• Explicar conceptos técnicos\n• Ayudar con debugging\n• Generar templates\n\n¿En qué puedo ayudarte?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check AI availability on mount
  useEffect(() => {
    checkAIAvailability();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAIAvailability = async () => {
    setAiStatus('checking');
    try {
      await aiService.initialize({
        provider: 'ollama',
        model: 'qwen2.5-coder:7b',
      });
      setAiStatus('ready');
    } catch {
      setAiStatus('unavailable');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    // Add placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      // Build context with project path if available
      const context = projectPath 
        ? `El usuario está trabajando en el proyecto: ${projectPath}\n\n`
        : '';

      const fullMessages = [
        { role: 'system' as const, content: 'Eres un asistente de coding útil y conciso. Respondes en español.' },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: context + input.trim() },
      ];

      const response = await aiService.chat(fullMessages);

      // Update the last message with response
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.findIndex(m => m.id === assistantId);
        if (lastIndex !== -1) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: response || 'No pude obtener una respuesta.',
          };
        }
        return updated;
      });
    } catch (err: any) {
      // Update error in last message
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.findIndex(m => m.id === assistantId);
        if (lastIndex !== -1) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: `Error: ${err.message || 'No se pudo conectar con la IA.'}`,
          };
        }
        return updated;
      });
      setError(err.message);
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
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Chat limpiado. ¿En qué puedo ayudarte?',
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] border-l border-[#404040]">
      {/* Header */}
      <div className="h-12 bg-[#262626] flex items-center justify-between px-4 border-b border-[#404040]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="text-sm font-medium text-[#e5e5e5]">AI Assistant</h2>
          <span className={`text-xs px-2 py-0.5 rounded ${
            aiStatus === 'ready' ? 'bg-green-600/20 text-green-400' :
            aiStatus === 'unavailable' ? 'bg-red-600/20 text-red-400' :
            'bg-yellow-600/20 text-yellow-400'
          }`}>
            {aiStatus === 'ready' ? '● Conectado' :
             aiStatus === 'unavailable' ? '○ Desconectado' :
             '... Verificando'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScaffolder}
            className="p-1.5 text-[#737373] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors"
            title="Crear proyecto (Scaffolder)"
          >
            🧱
          </button>
          <button
            onClick={clearChat}
            className="p-1.5 text-[#737373] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors"
            title="Limpiar chat"
          >
            🗑️
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#ef4444] hover:bg-[#333] rounded transition-colors"
            title="Cerrar"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#262626] text-[#e5e5e5]'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-xs mt-1 ${
                msg.role === 'user' ? 'text-white/60' : 'text-[#737373]'
              }`}>
                {msg.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#262626] rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-[#a3a3a3]">
                <div className="w-2 h-2 bg-[#60a5fa] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#60a5fa] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-[#60a5fa] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#333]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={aiStatus === 'unavailable' 
              ? 'IA no disponible. Verifica Ollama.' 
              : 'Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)'}
            disabled={aiStatus === 'unavailable' || isLoading}
            className="flex-1 bg-[#262626] border border-[#404040] rounded-lg px-4 py-2 text-[#e5e5e5] placeholder-[#737373] outline-none focus:border-[#3b82f6] resize-none text-sm"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || aiStatus === 'unavailable'}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              input.trim() && !isLoading && aiStatus === 'ready'
                ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                : 'bg-[#404040] text-[#737373] cursor-not-allowed'
            }`}
          >
            Enviar
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-xs text-[#ef4444]">
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}