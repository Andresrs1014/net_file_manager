declare module 'mammoth' {
  export interface Message {
    message: string;
  }

  export interface ConversionResult {
    value: string;
    messages: Message[];
  }

  export interface StyleMap {
    styleMap: string[];
  }

  export function convertToMarkdown(
    input: { arrayBuffer: ArrayBuffer } | { path: string } | { buffer: Buffer },
    options?: StyleMap
  ): Promise<ConversionResult>;

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { path: string } | { buffer: Buffer },
    options?: StyleMap
  ): Promise<{ value: string; messages: Message[] }>;
}