import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import yaml from 'js-yaml';

export interface DocumentMetadata {
  name: string;
  originalPath: string;
  type: 'pdf' | 'docx' | 'md' | 'image';
  pages?: number;
  processedAt: string;
  hash?: string;
}

export interface ConversionResult {
  markdown: string;
  metadata: DocumentMetadata;
  success: boolean;
  error?: string;
}

// Set up PDF.js worker from local bundle (Vite resolves this at build time)
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

/**
 * Convert PDF to Markdown using pdfjs-dist
 */
export async function pdfToMarkdown(filePath: string): Promise<ConversionResult> {
  try {
    const data = await window.electronAPI.readFile(filePath);
    // Convert to Uint8Array
    const uint8Data = data instanceof Uint8Array 
      ? data 
      : new TextEncoder().encode(data as string);
    
    const loadingTask = pdfjs.getDocument({ data: uint8Data });
    const pdf = await loadingTask.promise;
    
    let markdown = '';
    const pages: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: unknown) => (item as { str?: string }).str || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (pageText) {
        pages.push(pageText);
      }
    }
    
    // Process pages into markdown with headers
    markdown = pages.map((pageText, index) => {
      const lines = pageText.split(/\n+/).filter(l => l.trim().length > 0);
      let content = `## Página ${index + 1}\n\n`;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          // Detect headings (heuristic: short lines that look like titles)
          if (trimmed.length < 100 && trimmed.length > 5 && 
              (trimmed === trimmed.toUpperCase() || /^[A-Z][^.!?]*$/.test(trimmed))) {
            content += `### ${trimmed}\n\n`;
          } else {
            content += `${trimmed}\n\n`;
          }
        }
      }
      
      return content;
    }).join('\n');
    
    // Generate frontmatter
    const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'document';
    const frontmatter = generateFrontmatter({
      titulo: fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '),
      tipo: 'procedimiento',
      archivoOriginal: filePath,
      paginas: pdf.numPages,
      fechaProcesamiento: new Date().toISOString()
    });
    
    return {
      markdown: frontmatter + markdown,
      metadata: {
        name: fileName,
        originalPath: filePath,
        type: 'pdf',
        pages: pdf.numPages,
        processedAt: new Date().toISOString(),
        hash: await generateHash(markdown)
      },
      success: true
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      markdown: '',
      metadata: {
        name: filePath.split('\\').pop() || 'unknown',
        originalPath: filePath,
        type: 'pdf',
        processedAt: new Date().toISOString()
      },
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Convert Word (.docx) to Markdown using mammoth
 */
export async function docxToMarkdown(filePath: string): Promise<ConversionResult> {
  try {
    const data = await window.electronAPI.readFile(filePath);
    
    // Convert to ArrayBuffer
    let arrayBuffer: ArrayBuffer;
    if (data instanceof Uint8Array) {
      arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    } else if (typeof data === 'string') {
      const encoder = new TextEncoder();
      const uint8 = encoder.encode(data);
      arrayBuffer = uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength) as ArrayBuffer;
    } else {
      arrayBuffer = data as ArrayBuffer;
    }
    
    const result = await mammoth.convertToMarkdown({ arrayBuffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2",
        "p[style-name='Heading 3'] => h3",
        "p[style-name='List Paragraph'] => li",
        "table => table"
      ]
    });
    
    let markdown = result.value;
    
    // Add warnings if there were message conversions
    if (result.messages.length > 0) {
      const warnings = result.messages.map((m) => `> ⚠️ ${m.message}`).join('\n');
      markdown = `\n${warnings}\n\n${markdown}`;
    }
    
    // Generate frontmatter
    const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'document';
    const frontmatter = generateFrontmatter({
      titulo: fileName.replace(/\.docx?$/i, '').replace(/[_-]/g, ' '),
      tipo: 'procedimiento',
      archivoOriginal: filePath,
      fechaProcesamiento: new Date().toISOString()
    });
    
    return {
      markdown: frontmatter + markdown,
      metadata: {
        name: fileName,
        originalPath: filePath,
        type: 'docx',
        processedAt: new Date().toISOString(),
        hash: await generateHash(markdown)
      },
      success: true
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      markdown: '',
      metadata: {
        name: filePath.split('\\').pop() || 'unknown',
        originalPath: filePath,
        type: 'docx',
        processedAt: new Date().toISOString()
      },
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Convert any supported document to Markdown
 */
export async function convertToMarkdown(filePath: string): Promise<ConversionResult> {
  const ext = filePath.toLowerCase();
  
  if (ext.endsWith('.pdf')) {
    return pdfToMarkdown(filePath);
  } else if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
    return docxToMarkdown(filePath);
  } else if (ext.endsWith('.md') || ext.endsWith('.markdown')) {
    // Just read the file directly
    try {
      const content = await window.electronAPI.readFile(filePath);
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'document';
      const textContent = typeof content === 'string' ? content : new TextDecoder().decode(content);
      return {
        markdown: textContent,
        metadata: {
          name: fileName,
          originalPath: filePath,
          type: 'md',
          processedAt: new Date().toISOString(),
          hash: await generateHash(textContent)
        },
        success: true
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        markdown: '',
        metadata: {
          name: filePath.split('\\').pop() || 'unknown',
          originalPath: filePath,
          type: 'md',
          processedAt: new Date().toISOString()
        },
        success: false,
        error: errorMessage
      };
    }
  } else {
    return {
      markdown: '',
      metadata: {
        name: filePath.split('\\').pop() || 'unknown',
        originalPath: filePath,
        type: 'md',
        processedAt: new Date().toISOString()
      },
      success: false,
      error: `Unsupported file type: ${filePath}`
    };
  }
}

/**
 * Generate YAML frontmatter for markdown document
 */
function generateFrontmatter(data: Record<string, unknown>): string {
  const fm: Record<string, unknown> = {
    titulo: data.titulo || 'Documento sin título',
    tipo: data.tipo || 'general',
    area: data.area || '',
    responsable: data.responsable || '',
    version: data.version || '1.0',
    fecha: new Date().toISOString().split('T')[0],
    autor: data.autor || '',
    estado: data.estado || 'borrador',
    paginas: data.paginas,
    archivoOriginal: data.archivoOriginal,
    fechaProcesamiento: data.fechaProcesamiento || new Date().toISOString(),
    entidadesDetectadas: [],
    relaciones: []
  };
  
  // Remove undefined/null values
  Object.keys(fm).forEach(key => {
    if (fm[key] === undefined || fm[key] === null) {
      delete fm[key];
    }
  });
  
  const yamlStr = yaml.dump(fm, { indent: 2, lineWidth: -1, noRefs: true });
  return `---\n${yamlStr}---\n\n`;
}

/**
 * Simple hash for content comparison
 */
async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Get supported file extensions
 */
export const SUPPORTED_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.md', '.markdown',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'
];

export function isSupported(filePath: string): boolean {
  const ext = filePath.toLowerCase();
  return SUPPORTED_EXTENSIONS.some(e => ext.endsWith(e));
}

export function getFileType(filePath: string): 'pdf' | 'docx' | 'md' | 'image' | 'unknown' {
  const ext = filePath.toLowerCase();
  if (ext.endsWith('.pdf')) return 'pdf';
  if (ext.endsWith('.docx') || ext.endsWith('.doc')) return 'docx';
  if (ext.endsWith('.md') || ext.endsWith('.markdown')) return 'md';
  if (
    ext.endsWith('.jpg') || ext.endsWith('.jpeg') ||
    ext.endsWith('.png') || ext.endsWith('.gif') ||
    ext.endsWith('.webp') || ext.endsWith('.svg')
  ) return 'image';
  return 'unknown';
}