import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!config.anthropic.apiKey) {
      throw new Error('ANTHROPIC_API_KEY no configurada en el servidor');
    }
    _client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return _client;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Llamada simple a Claude. Toda llamada a Anthropic pasa por aquí;
 * la API key NUNCA sale del servidor hacia el cliente .exe.
 */
export async function askClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens = 4096,
): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Respuesta inesperada de Claude');
  return block.text;
}

/**
 * Versión streaming — devuelve AsyncIterable de fragmentos de texto.
 * Úsala para respuestas largas (análisis de procedimientos).
 */
export async function* askClaudeStream(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens = 8192,
): AsyncIterable<string> {
  const client = getClient();

  const stream = await client.messages.stream({
    model: config.anthropic.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
