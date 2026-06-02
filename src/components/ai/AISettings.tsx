import { useState } from 'react';

export interface AIConfig {
  provider: 'ollama' | 'claude';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface AISettingsProps {
  onClose: () => void;
  onSave: (config: AIConfig) => void;
  currentConfig?: AIConfig;
}

const OLLAMA_MODELS = [
  'qwen2.5-coder:7b',
  'qwen2.5-coder:14b',
  'qwen2.5-coder:32b',
  'codellama:7b',
  'codellama:13b',
  'llama3.2:3b',
  'llama3.2:1b',
  'mistral:7b',
  'phi3:mini',
];

const CLAUDE_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307',
];

export function AISettings({ onClose, onSave, currentConfig }: AISettingsProps) {
  const [provider, setProvider] = useState<AIConfig['provider']>(currentConfig?.provider || 'ollama');
  const [model, setModel] = useState(currentConfig?.model || 'qwen2.5-coder:7b');
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(currentConfig?.baseUrl || 'http://localhost:11434');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleSave = () => {
    onSave({
      provider,
      model,
      apiKey: provider === 'claude' ? apiKey : undefined,
      baseUrl: provider === 'ollama' ? baseUrl : undefined,
    });
    onClose();
  };

  const testConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');

    try {
      if (provider === 'ollama') {
        const response = await fetch(`${baseUrl}/api/tags`);
        if (response.ok) {
          const data = await response.json();
          const models = data.models?.map((m: { name: string }) => m.name) || [];
          setTestStatus('success');
          setTestMessage(`✓ Conectado. Modelos disponibles: ${models.length}`);
        } else {
          setTestStatus('error');
          setTestMessage(`✗ Error: ${response.statusText}`);
        }
      } else {
        // Test Claude API key
        if (!apiKey) {
          setTestStatus('error');
          setTestMessage('✗ API Key requerida');
          return;
        }
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10,
          }),
        });

        if (response.ok) {
          setTestStatus('success');
          setTestMessage('✓ API Key válida');
        } else {
          const error = await response.json();
          setTestStatus('error');
          setTestMessage(`✗ ${error.error?.message || 'Error de autenticación'}`);
        }
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`✗ ${err.message}`);
    }
  };

  const models = provider === 'ollama' ? OLLAMA_MODELS : CLAUDE_MODELS;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-[#262626] border border-[#404040] rounded-lg shadow-xl w-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333]">
          <h2 className="text-base font-medium text-[#e5e5e5]">Configuración de IA</h2>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#e5e5e5] text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Provider */}
          <div>
            <label className="block text-sm text-[#a3a3a3] mb-2">Proveedor</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setProvider('ollama');
                  setModel('qwen2.5-coder:7b');
                }}
                className={`flex-1 px-4 py-2 rounded border transition-colors ${
                  provider === 'ollama'
                    ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]'
                    : 'bg-[#1a1a1a] border-[#404040] text-[#a3a3a3] hover:border-[#505050]'
                }`}
              >
                <div className="text-sm font-medium">Ollama (Local)</div>
                <div className="text-xs opacity-70">Gratis, usa tu GPU</div>
              </button>
              <button
                onClick={() => {
                  setProvider('claude');
                  setModel('claude-sonnet-4-20250514');
                }}
                className={`flex-1 px-4 py-2 rounded border transition-colors ${
                  provider === 'claude'
                    ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]'
                    : 'bg-[#1a1a1a] border-[#404040] text-[#a3a3a3] hover:border-[#505050]'
                }`}
              >
                <div className="text-sm font-medium">Claude API</div>
                <div className="text-xs opacity-70">$5-10/mes, más potente</div>
              </button>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm text-[#a3a3a3] mb-2">Modelo</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#404040] rounded text-[#e5e5e5] outline-none focus:border-[#3b82f6]"
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Ollama URL */}
          {provider === 'ollama' && (
            <div>
              <label className="block text-sm text-[#a3a3a3] mb-2">URL de Ollama</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#404040] rounded text-[#e5e5e5] outline-none focus:border-[#3b82f6]"
              />
            </div>
          )}

          {/* Claude API Key */}
          {provider === 'claude' && (
            <div>
              <label className="block text-sm text-[#a3a3a3] mb-2">API Key de Anthropic</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#404040] rounded text-[#e5e5e5] outline-none focus:border-[#3b82f6]"
              />
              <p className="mt-1 text-xs text-[#737373]">
                Obtén tu API key en{' '}
                <a 
                  href="https://console.anthropic.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#3b82f6] hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
          )}

          {/* Test button */}
          <button
            onClick={testConnection}
            disabled={testStatus === 'testing'}
            className="w-full px-4 py-2 bg-[#333] text-[#e5e5e5] rounded hover:bg-[#404040] transition-colors disabled:opacity-50"
          >
            {testStatus === 'testing' ? 'Probando...' : 'Probar conexión'}
          </button>

          {testMessage && (
            <div className={`text-sm ${
              testStatus === 'success' ? 'text-green-400' :
              testStatus === 'error' ? 'text-red-400' :
              'text-[#a3a3a3]'
            }`}>
              {testMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#333]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-[#a3a3a3] hover:text-[#e5e5e5] hover:bg-[#333] rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-[#3b82f6] text-white rounded hover:bg-[#2563eb] transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}