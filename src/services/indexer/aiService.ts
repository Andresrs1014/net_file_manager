/**
 * AI Service - Unified interface for Ollama and Claude API
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  provider: 'ollama' | 'claude';
  model: string;
  apiKey?: string;
}

class AIService {
  private config: AIConfig | null = null;

  async initialize(config: AIConfig): Promise<void> {
    this.config = config;
  }

  isAvailable(): boolean {
    return !!this.config;
  }

  getConfig(): AIConfig | null {
    return this.config;
  }

  async chat(messages: Message[]): Promise<string> {
    if (!this.config) throw new Error('AI not configured');

    if (this.config.provider === 'ollama') {
      return this.chatWithOllama(messages);
    } else if (this.config.provider === 'claude') {
      return this.chatWithClaude(messages);
    }

    throw new Error('Unknown provider');
  }

  private async chatWithOllama(messages: Message[]): Promise<string> {
    const model = this.config?.model || 'qwen2.5-coder:7b';
    
    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false }),
      });
      
      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
      
      const data = await response.json();
      return data.message?.content || '';
    } catch (error: any) {
      throw new Error(`Ollama failed: ${error.message}`);
    }
  }

  private async chatWithClaude(messages: Message[]): Promise<string> {
    const apiKey = this.config?.apiKey;
    if (!apiKey) throw new Error('Claude API key required');
    
    const model = this.config?.model || 'claude-sonnet-4-20250514';
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages: messages.filter(m => m.role !== 'system'),
          max_tokens: 4096,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Claude API error');
      }
      
      const data = await response.json();
      return data.content?.[0]?.text || '';
    } catch (error: any) {
      throw new Error(`Claude failed: ${error.message}`);
    }
  }
}

export const aiService = new AIService();