import { useState, useEffect, useCallback } from 'react';
import type { AIConfig } from './aiService';

const STORAGE_KEY = 'netvault-ai-config';

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  model: 'qwen2.5-coder:7b',
  apiKey: undefined,
};

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AIConfig;
        setConfig(parsed);
      }
    } catch {
      // Ignore errors, use default
    }
    setIsLoaded(true);
  }, []);

  // Save config to localStorage whenever it changes
  const updateConfig = useCallback((newConfig: Partial<AIConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    config,
    isLoaded,
    updateConfig,
    resetConfig,
  };
}

// Ollama models list (common models)
export const OLLAMA_MODELS = [
  { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B', description: 'Código y análisis', memory: '~7GB' },
  { id: 'qwen2.5-coder:3b', name: 'Qwen 2.5 Coder 3B', description: 'Código ligero', memory: '~3GB' },
  { id: 'codellama:7b', name: 'Code Llama 7B', description: 'Código general', memory: '~7GB' },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', description: 'Generalista', memory: '~3GB' },
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B', description: 'Generalista avanzado', memory: '~8GB' },
  { id: 'mistral:7b', name: 'Mistral 7B', description: 'Código y texto', memory: '~7GB' },
  { id: 'deepseek-coder:6.7b', name: 'DeepSeek Coder 6.7B', description: 'Código especializado', memory: '~7GB' },
  { id: 'phi3:3.8b', name: 'Phi-3 3.8B', description: 'Código ligero (Microsoft)', memory: '~4GB' },
  { id: 'nomic-embed-text', name: 'Nomic Embed Text', description: 'Embeddings para búsqueda', memory: '~274MB' },
];

// Claude models
export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Equilibrado' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Rápido y capaz' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Premium' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Ultra rápido' },
];

export function getModelInfo(provider: 'ollama' | 'claude', modelId: string) {
  if (provider === 'ollama') {
    return OLLAMA_MODELS.find(m => m.id === modelId);
  }
  return CLAUDE_MODELS.find(m => m.id === modelId);
}

export function getDefaultOllamaModel(): string {
  return 'qwen2.5-coder:7b';
}

export function getDefaultClaudeModel(): string {
  return 'claude-sonnet-4-20250514';
}