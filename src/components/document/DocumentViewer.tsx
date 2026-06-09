import { useState, useEffect, useCallback } from 'react';
import { FileText, Image, File, X, Copy, Download, Code, Eye, RotateCcw } from 'lucide-react';
import { convertToMarkdown, isSupported, getFileType, type ConversionResult } from '../../services/documentService';

interface DocumentViewerProps {
  filePath: string;
  onClose: () => void;
  onConvert?: (result: ConversionResult) => void;
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text: string): string {
  // Bold **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // Images — skip rendering (just drop them)
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  // Links [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="md-link" rel="noopener noreferrer">$1</a>'
  );
  return text;
}

function renderMarkdown(raw: string): string {
  // Strip YAML frontmatter
  const withoutFm = raw.replace(/^---[\s\S]*?---\n?/, '');

  const lines = withoutFm.split('\n');
  const html: string[] = [];

  let i = 0;
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inBlockquote = false;
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableHasHead = false;

  const flushList = () => {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
  };
  const flushTable = () => {
    if (inTable) { html.push('</tbody></table>'); inTable = false; tableHasHead = false; }
  };
  const flushBlockquote = () => {
    if (inBlockquote) { html.push('</blockquote>'); inBlockquote = false; }
  };

  while (i < lines.length) {
    const line = lines[i];

    // --- Code block ---
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushList();
        flushTable();
        flushBlockquote();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
        i++;
        continue;
      } else {
        const escapedCode = escapeHtml(codeLines.join('\n'));
        const langAttr = codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : '';
        html.push(
          `<pre class="md-pre"${langAttr}><code class="md-code-block">${escapedCode}</code></pre>`
        );
        inCodeBlock = false;
        codeLang = '';
        codeLines = [];
        i++;
        continue;
      }
    }

    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // --- HR ---
    if (/^(\-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushList();
      flushTable();
      flushBlockquote();
      html.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // --- Headings ---
    const h4m = line.match(/^####\s+(.+)/);
    const h3m = line.match(/^###\s+(.+)/);
    const h2m = line.match(/^##\s+(.+)/);
    const h1m = line.match(/^#\s+(.+)/);
    if (h4m || h3m || h2m || h1m) {
      flushList();
      flushTable();
      flushBlockquote();
      if (h1m) html.push(`<h1 class="md-h1">${renderInline(escapeHtml(h1m[1]))}</h1>`);
      else if (h2m) html.push(`<h2 class="md-h2">${renderInline(escapeHtml(h2m[1]))}</h2>`);
      else if (h3m) html.push(`<h3 class="md-h3">${renderInline(escapeHtml(h3m[1]))}</h3>`);
      else if (h4m) html.push(`<h4 class="md-h4">${renderInline(escapeHtml(h4m[1]))}</h4>`);
      i++;
      continue;
    }

    // --- Blockquote ---
    if (line.startsWith('> ')) {
      flushList();
      flushTable();
      if (!inBlockquote) { html.push('<blockquote class="md-blockquote">'); inBlockquote = true; }
      html.push(`<p class="md-bq-p">${renderInline(escapeHtml(line.slice(2)))}</p>`);
      i++;
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // --- Unordered list ---
    const ulm = line.match(/^(\s*)[-*+]\s+(.+)/);
    if (ulm) {
      flushTable();
      flushBlockquote();
      if (!inUl) { html.push('<ul class="md-ul">'); inUl = false; inUl = true; }
      const indent = ulm[1].length;
      const cls = indent > 0 ? 'md-li md-li-nested' : 'md-li';
      html.push(`<li class="${cls}">${renderInline(escapeHtml(ulm[2]))}</li>`);
      i++;
      continue;
    } else if (inUl && line.trim() !== '') {
      // non-list line ends the list
      flushList();
    }

    // --- Ordered list ---
    const olm = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olm) {
      flushTable();
      flushBlockquote();
      if (!inOl) { html.push('<ol class="md-ol">'); inOl = true; }
      const indent = olm[1].length;
      const cls = indent > 0 ? 'md-li md-li-nested' : 'md-li';
      html.push(`<li class="${cls}">${renderInline(escapeHtml(olm[2]))}</li>`);
      i++;
      continue;
    } else if (inOl && line.trim() !== '') {
      flushList();
    }

    // --- Table ---
    if (line.includes('|') && line.trim().startsWith('|')) {
      flushList();
      flushBlockquote();
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

      // separator row
      if (cells.every(c => /^[-: ]+$/.test(c))) {
        // close thead, open tbody
        if (inTable && !tableHasHead) {
          html.push('</thead><tbody>');
          tableHasHead = true;
        }
        i++;
        continue;
      }

      if (!inTable) {
        html.push('<table class="md-table"><thead><tr>');
        inTable = true;
        tableHasHead = false;
        cells.forEach(c => html.push(`<th class="md-th">${renderInline(escapeHtml(c))}</th>`));
        html.push('</tr>');
      } else {
        html.push('<tr>');
        cells.forEach(c => html.push(`<td class="md-td">${renderInline(escapeHtml(c))}</td>`));
        html.push('</tr>');
      }
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // --- Empty line ---
    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    // --- Paragraph ---
    html.push(`<p class="md-p">${renderInline(escapeHtml(line))}</p>`);
    i++;
  }

  // Flush any open blocks
  flushList();
  flushTable();
  flushBlockquote();
  if (inCodeBlock) {
    const escapedCode = escapeHtml(codeLines.join('\n'));
    html.push(`<pre class="md-pre"><code class="md-code-block">${escapedCode}</code></pre>`);
  }

  return html.join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ViewMode = 'rendered' | 'source';

export function DocumentViewer({ filePath, onClose, onConvert }: DocumentViewerProps) {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('rendered');

  const fileType = getFileType(filePath);
  const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'Document';
  const isImage = fileType === 'image';
  const imageUrl = isImage
    ? 'file:///' + filePath.replace(/\\/g, '/')
    : null;

  const loadDocument = useCallback(async () => {
    if (isImage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (!isSupported(filePath)) {
        setError('Unsupported file type. Supported: PDF, DOCX, MD, and images.');
        setLoading(false);
        return;
      }

      const conversionResult = await convertToMarkdown(filePath);

      if (conversionResult.success) {
        setMarkdown(conversionResult.markdown);
        setResult(conversionResult);
        onConvert?.(conversionResult);
      } else {
        setError(conversionResult.error || 'Unknown conversion error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [filePath, isImage, onConvert]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
  };

  const handleExport = async () => {
    if (!result) return;
    try {
      const outputPath = filePath.replace(/\.(pdf|docx?|md)$/i, '.md');
      await window.electronAPI.writeFile(outputPath, markdown);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Export failed: ${msg}`);
    }
  };

  const canToggleView = !isImage;

  const FileIcon = isImage ? Image : fileType === 'pdf' || fileType === 'docx' ? FileText : File;

  return (
    <>
      <style>{`
        .dv-root {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .dv-panel {
          background: var(--bg-surface, #1a1a1a);
          border: 1px solid var(--border-subtle, #333);
          border-radius: 10px;
          width: 92vw;
          height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .dv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-subtle, #333);
          flex-shrink: 0;
          gap: 12px;
        }
        .dv-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .dv-icon {
          color: var(--accent, #3b82f6);
          flex-shrink: 0;
        }
        .dv-filename {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary, #e5e5e5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 360px;
        }
        .dv-meta {
          font-size: 0.7rem;
          color: var(--text-muted, #737373);
          margin-top: 2px;
        }
        .dv-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .dv-toggle-group {
          display: flex;
          border: 1px solid var(--border-subtle, #333);
          border-radius: 6px;
          overflow: hidden;
        }
        .dv-toggle-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          font-size: 0.75rem;
          background: transparent;
          color: var(--text-secondary, #a3a3a3);
          border: none;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .dv-toggle-btn:hover {
          background: var(--bg-hover, #262626);
          color: var(--text-primary, #e5e5e5);
        }
        .dv-toggle-btn.active {
          background: var(--accent-dim, #1e3a5f);
          color: var(--accent, #3b82f6);
        }
        .dv-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          font-size: 0.75rem;
          background: var(--bg-raised, #262626);
          color: var(--text-secondary, #a3a3a3);
          border: 1px solid var(--border-subtle, #333);
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .dv-btn:hover {
          background: var(--bg-hover, #303030);
          color: var(--text-primary, #e5e5e5);
        }
        .dv-btn-accent {
          background: var(--accent-dim, #1e3a5f);
          color: var(--accent, #3b82f6);
          border-color: var(--accent, #3b82f6);
        }
        .dv-btn-accent:hover {
          background: var(--accent, #3b82f6);
          color: #fff;
        }
        .dv-btn-close {
          background: var(--bg-raised, #262626);
          color: var(--text-secondary, #a3a3a3);
          border-color: var(--border-subtle, #333);
          margin-left: 4px;
        }
        .dv-btn-close:hover {
          background: var(--danger, #ef4444);
          color: #fff;
          border-color: var(--danger, #ef4444);
        }
        .dv-body {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        /* Loading */
        .dv-loading {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
          color: var(--text-muted, #737373);
        }
        .dv-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-subtle, #333);
          border-top-color: var(--accent, #3b82f6);
          border-radius: 50%;
          animation: dv-spin 0.7s linear infinite;
        }
        @keyframes dv-spin { to { transform: rotate(360deg); } }
        .dv-loading-text {
          font-size: 0.85rem;
          color: var(--text-secondary, #a3a3a3);
        }
        /* Error */
        .dv-error {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
          padding: 32px;
        }
        .dv-error-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--danger, #ef4444);
        }
        .dv-error-msg {
          font-size: 0.8rem;
          color: var(--text-muted, #737373);
          text-align: center;
          max-width: 480px;
          line-height: 1.5;
        }
        .dv-retry-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 7px 16px;
          font-size: 0.8rem;
          background: var(--bg-raised, #262626);
          color: var(--text-secondary, #a3a3a3);
          border: 1px solid var(--border-subtle, #333);
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .dv-retry-btn:hover {
          background: var(--bg-hover, #303030);
          color: var(--text-primary, #e5e5e5);
        }
        /* Image view */
        .dv-image-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          padding: 24px;
          background: var(--bg-base, #111);
        }
        .dv-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        /* Rendered markdown */
        .dv-rendered {
          flex: 1;
          overflow-y: auto;
          padding: 28px 36px;
          background: var(--bg-surface, #1a1a1a);
        }
        /* Source view */
        .dv-source {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          background: var(--bg-base, #111);
          font-family: 'DM Mono', 'Fira Mono', monospace;
          font-size: 0.78rem;
          color: var(--text-secondary, #a3a3a3);
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.6;
          tab-size: 2;
        }
        /* Footer */
        .dv-footer {
          padding: 8px 20px;
          border-top: 1px solid var(--border-subtle, #333);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          color: var(--text-muted, #737373);
          flex-shrink: 0;
        }
        /* ---- Markdown styles ---- */
        .md-h1 {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 24px 0 16px;
          color: var(--text-primary, #e5e5e5);
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle, #333);
        }
        .md-h2 {
          font-size: 1.05rem;
          font-weight: 600;
          margin: 20px 0 12px;
          color: var(--text-primary, #e5e5e5);
        }
        .md-h3 {
          font-size: 0.95rem;
          font-weight: 600;
          margin: 16px 0 8px;
          color: var(--text-secondary, #a3a3a3);
        }
        .md-h4 {
          font-size: 0.88rem;
          font-weight: 600;
          margin: 12px 0 6px;
          color: var(--text-secondary, #a3a3a3);
        }
        .md-p {
          margin-bottom: 12px;
          color: var(--text-secondary, #a3a3a3);
          line-height: 1.7;
          font-size: 0.88rem;
        }
        .md-inline-code {
          font-family: 'DM Mono', 'Fira Mono', monospace;
          color: var(--accent, #3b82f6);
          background: var(--bg-raised, #262626);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.85em;
        }
        .md-pre {
          background: var(--bg-base, #111);
          border: 1px solid var(--border-subtle, #333);
          border-radius: 6px;
          padding: 16px;
          margin: 12px 0 16px;
          overflow-x: auto;
        }
        .md-code-block {
          font-family: 'DM Mono', 'Fira Mono', monospace;
          font-size: 0.76rem;
          color: var(--text-secondary, #a3a3a3);
          white-space: pre;
        }
        .md-ul {
          margin: 4px 0 12px 0;
          padding-left: 20px;
          list-style-type: disc;
        }
        .md-ol {
          margin: 4px 0 12px 0;
          padding-left: 20px;
          list-style-type: decimal;
        }
        .md-li {
          color: var(--text-secondary, #a3a3a3);
          font-size: 0.88rem;
          margin-bottom: 4px;
          line-height: 1.6;
        }
        .md-li-nested {
          margin-left: 16px;
        }
        .md-blockquote {
          border-left: 2px solid var(--accent, #3b82f6);
          padding-left: 16px;
          margin: 12px 0;
        }
        .md-bq-p {
          color: var(--text-muted, #737373);
          font-style: italic;
          font-size: 0.88rem;
          margin: 0;
          line-height: 1.6;
        }
        .md-hr {
          border: none;
          border-top: 1px solid var(--border-subtle, #333);
          margin: 20px 0;
        }
        .md-table {
          border-collapse: collapse;
          width: 100%;
          margin: 12px 0 16px;
          font-size: 0.83rem;
        }
        .md-th {
          padding: 8px 12px;
          background: var(--bg-raised, #262626);
          color: var(--text-primary, #e5e5e5);
          border: 1px solid var(--border-subtle, #333);
          text-align: left;
          font-weight: 600;
        }
        .md-td {
          padding: 7px 12px;
          color: var(--text-secondary, #a3a3a3);
          border: 1px solid var(--border-subtle, #333);
        }
        .md-link {
          color: var(--accent, #3b82f6);
          text-decoration: none;
        }
        .md-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <div className="dv-root">
        <div className="dv-panel">
          {/* Header */}
          <div className="dv-header">
            <div className="dv-header-left">
              <FileIcon size={18} className="dv-icon" />
              <div>
                <div className="dv-filename">{fileName}</div>
                <div className="dv-meta">
                  {isImage
                    ? fileType.toUpperCase()
                    : `${fileType.toUpperCase()} → Markdown`}
                  {result?.metadata.pages ? ` · ${result.metadata.pages} page(s)` : ''}
                </div>
              </div>
            </div>

            <div className="dv-header-right">
              {canToggleView && (
                <div className="dv-toggle-group">
                  <button
                    className={`dv-toggle-btn${viewMode === 'rendered' ? ' active' : ''}`}
                    onClick={() => setViewMode('rendered')}
                    title="Rendered view"
                  >
                    <Eye size={13} />
                    Rendered
                  </button>
                  <button
                    className={`dv-toggle-btn${viewMode === 'source' ? ' active' : ''}`}
                    onClick={() => setViewMode('source')}
                    title="Source view"
                  >
                    <Code size={13} />
                    Source
                  </button>
                </div>
              )}

              {result && (
                <>
                  <button className="dv-btn" onClick={handleCopy} title="Copy Markdown">
                    <Copy size={13} />
                    Copy
                  </button>
                  <button className="dv-btn dv-btn-accent" onClick={handleExport} title="Export as .md">
                    <Download size={13} />
                    Export .md
                  </button>
                </>
              )}

              <button className="dv-btn dv-btn-close" onClick={onClose} title="Close">
                <X size={13} />
                Close
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="dv-body">
            {loading ? (
              <div className="dv-loading">
                <div className="dv-spinner" />
                <span className="dv-loading-text">Converting document…</span>
              </div>
            ) : error ? (
              <div className="dv-error">
                <span className="dv-error-title">Failed to load</span>
                <span className="dv-error-msg">{error}</span>
                <button className="dv-retry-btn" onClick={loadDocument}>
                  <RotateCcw size={13} />
                  Retry
                </button>
              </div>
            ) : isImage ? (
              <div className="dv-image-wrap">
                <img
                  src={imageUrl!}
                  alt={fileName}
                  className="dv-image"
                />
              </div>
            ) : viewMode === 'source' ? (
              <div className="dv-source">{markdown}</div>
            ) : (
              <div
                className="dv-rendered"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
              />
            )}
          </div>

          {/* Footer */}
          <div className="dv-footer">
            <span>
              {isImage
                ? `Image · ${fileType.toUpperCase()}`
                : result
                  ? `Converted · ${markdown.split(/\s+/).filter(Boolean).length} words · Hash: ${result.metadata.hash?.substring(0, 8) ?? '—'}`
                  : 'Supported: PDF, DOCX, MD, JPG, PNG, GIF, WEBP, SVG'}
            </span>
            <span>
              {canToggleView ? (viewMode === 'rendered' ? 'Rendered view' : 'Source view') : ''}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
