'use client';

import { cn } from '@/lib/utils';

/**
 * Lightweight markdown renderer for AI responses.
 * Handles: headers, bold, italic, inline code, code blocks,
 * bullet/numbered lists, blockquotes, horizontal rules, and tables.
 * No external dependencies.
 */

interface MarkdownProps {
  content: string;
  className?: string;
  streaming?: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  // Bold+italic: ***text***
  let s = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');
  // Inline code: `code`
  s = s.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Citation links: [§N]
  s = s.replace(/\[§(\d+)\]/g, '<cite class="citation" data-ref="$1">[§$1]</cite>');
  // Source refs: [Source N]
  s = s.replace(/\[Source (\d+)\]/g, '<cite class="citation" data-ref="$1">[§$1]</cite>');
  // Links: [text](url) — treat as plain text for security
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '<span class="link-text">$1</span>');
  return s;
}

function parseMarkdown(md: string): string {
  const lines = md.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      output.push(
        `<pre class="code-block"><code${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}>${codeLines.join('\n')}</code></pre>`
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      output.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = renderInline(escapeHtml(headingMatch[2]));
      output.push(`<h${level} class="md-h${level}">${text}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      output.push(
        `<blockquote class="md-blockquote">${renderInline(escapeHtml(quoteLines.join(' ')))}</blockquote>`
      );
      continue;
    }

    // Table (detect by | delimiters)
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0]
          .split('|')
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((h) => `<th class="md-th">${renderInline(escapeHtml(h.trim()))}</th>`)
          .join('');
        const rows = tableLines
          .slice(2)
          .map((row) => {
            const cells = row
              .split('|')
              .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
              .map((c) => `<td class="md-td">${renderInline(escapeHtml(c.trim()))}</td>`)
              .join('');
            return `<tr class="md-tr">${cells}</tr>`;
          })
          .join('');
        output.push(
          `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`
        );
        continue;
      }
    }

    // Unordered list
    if (/^[\-\*\+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\-\*\+]\s+/.test(lines[i])) {
        listItems.push(`<li class="md-li">${renderInline(escapeHtml(lines[i].replace(/^[\-\*\+]\s+/, '')))}</li>`);
        i++;
      }
      output.push(`<ul class="md-ul">${listItems.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        listItems.push(`<li class="md-li">${renderInline(escapeHtml(lines[i].replace(/^\d+\.\s+/, '')))}</li>`);
        i++;
      }
      output.push(`<ol class="md-ol">${listItems.join('')}</ol>`);
      continue;
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      output.push('<div class="md-spacer"></div>');
      i++;
      continue;
    }

    // Regular paragraph
    output.push(`<p class="md-p">${renderInline(escapeHtml(line))}</p>`);
    i++;
  }

  return output.join('');
}

export function Markdown({ content, className, streaming = false }: MarkdownProps) {
  const html = parseMarkdown(content || '');

  return (
    <div
      className={cn('ai-prose', streaming && 'token-cursor', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
