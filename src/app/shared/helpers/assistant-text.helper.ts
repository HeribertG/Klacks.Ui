// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure text-cleanup helpers shared between the assistant chat component and the
 * chat message actions service, so both can strip the same streaming/tool-call
 * markers and speech-unfriendly formatting without duplicating the regexes.
 */

const METADATA_MARKER_REGEX = /\[(SUGGESTIONS|REPLIES|SCROLL)(?::[^\]]*?)?\]/g;
const TRAILING_MARKER_REGEX = /\[(SUGGESTIONS|REPLIES|SCROLL)(?::[\s\S]*)?$/;
const TOOL_CALL_BLOCK_REGEX = /<\s*function_calls\b[\s\S]*?<\s*\/\s*function_calls\s*>/gi;
const TOOL_CALL_TRAILING_REGEX = /<\s*function_calls\b[\s\S]*$/i;
const INVOKE_BLOCK_REGEX = /<\s*invoke\b[\s\S]*?<\s*\/\s*invoke\s*>/gi;
const INVOKE_TRAILING_REGEX = /<\s*invoke\b[\s\S]*$/i;

const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
const TTS_MARKDOWN_REGEX = /^[#>\-*]+\s*|[*_`]+/gm;
const TTS_BULLET_REGEX = /[•‒–—―‣◦▪▫▶◀●○■□]/g;

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const TABLE_SEPARATOR_CELL_REGEX = /^:?-+:?$/;
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
const LIST_ITEM_REGEX = /^[-*]\s+(.+)$/;

/**
 * Strips streaming/tool-call metadata markers (SUGGESTIONS, REPLIES, SCROLL, function_calls
 * and invoke blocks) from assistant text, including trailing partial markers still streaming in.
 * @param text - Raw assistant text, possibly still streaming
 */
export function stripMetadataMarkers(text: string): string {
  if (!text) return text;
  return text
    .replace(TOOL_CALL_BLOCK_REGEX, '')
    .replace(TOOL_CALL_TRAILING_REGEX, '')
    .replace(INVOKE_BLOCK_REGEX, '')
    .replace(INVOKE_TRAILING_REGEX, '')
    .replace(METADATA_MARKER_REGEX, '')
    .replace(TRAILING_MARKER_REGEX, '')
    .trimEnd();
}

/**
 * Strips emoji, markdown syntax and bullet glyphs so text reads naturally through
 * text-to-speech.
 * @param text - Text to clean before handing it to the TTS service
 */
export function stripForTts(text: string): string {
  if (!text) return text;
  const stripped = text
    .replace(EMOJI_REGEX, '')
    .replace(/^-{3,}\s*$/gm, '')
    .replace(TTS_MARKDOWN_REGEX, '')
    .replace(TTS_BULLET_REGEX, '')
    .replace(/[ \t]+/g, ' ');

  return stripped
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}

function escapeForHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseTableRow(line: string): string[] {
  let inner = line;
  if (inner.startsWith('|')) inner = inner.slice(1);
  if (inner.endsWith('|')) inner = inner.slice(0, -1);
  return inner.split('|').map((cell) => cell.trim());
}

function isTableRow(line: string | undefined): boolean {
  return !!line && line.startsWith('|') && line.length > 1;
}

function isTableSeparatorRow(line: string): boolean {
  const cells = parseTableRow(line);
  return cells.length > 0 && cells.every((cell) => TABLE_SEPARATOR_CELL_REGEX.test(cell));
}

function buildTableHtml(headerCells: string[], bodyRows: string[][]): string {
  const headerHtml = headerCells.map((cell) => `<th>${cell}</th>`).join('');
  const bodyHtml = bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

/**
 * Renders raw assistant/user chat text as sanitized HTML: headings, hr rules, bullet lists,
 * pipe tables, links, bold/italic/code spans and line breaks. Shared by the chat component
 * (building formattedContent while streaming) and the chat-message component (its fallback
 * render), so both stay pixel-identical without duplicating the markdown-ish parser.
 * @param content - Raw message text, possibly still carrying streaming metadata markers
 */
export function formatMessage(content: string): string {
  const cleaned = stripMetadataMarkers(content);
  const escaped = escapeForHtml(cleaned);

  const blocks: string[] = [];
  let textBuffer: string[] = [];
  let inList = false;

  const flushText = (): void => {
    if (textBuffer.length > 0) {
      blocks.push(textBuffer.join('<br>'));
      textBuffer = [];
    }
  };
  const closeList = (): void => {
    if (inList) {
      blocks.push('</ul>');
      inList = false;
    }
  };

  const lines = escaped.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (/^-{3,}$/.test(trimmed)) {
      flushText();
      closeList();
      blocks.push('<hr>');
      continue;
    }

    const headingMatch = HEADING_REGEX.exec(trimmed);
    if (headingMatch) {
      flushText();
      closeList();
      const level = Math.min(headingMatch[1].length + 1, 6);
      blocks.push(`<h${level}>${headingMatch[2]}</h${level}>`);
      continue;
    }

    if (isTableRow(trimmed) && isTableRow(lines[i + 1]?.trim()) && isTableSeparatorRow(lines[i + 1].trim())) {
      flushText();
      closeList();
      const headerCells = parseTableRow(trimmed);
      const bodyRows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j].trim()) && !isTableSeparatorRow(lines[j].trim())) {
        bodyRows.push(parseTableRow(lines[j].trim()));
        j++;
      }
      blocks.push(buildTableHtml(headerCells, bodyRows));
      i = j - 1;
      continue;
    }

    const listItemMatch = LIST_ITEM_REGEX.exec(trimmed);
    if (listItemMatch) {
      flushText();
      if (!inList) {
        blocks.push('<ul>');
        inList = true;
      }
      blocks.push(`<li>${listItemMatch[1]}</li>`);
      continue;
    }

    closeList();

    if (trimmed === '') {
      flushText();
      if (blocks.length > 0 && blocks[blocks.length - 1] !== '<br>') {
        blocks.push('<br>');
      }
      continue;
    }

    textBuffer.push(lines[i]);
  }

  flushText();
  closeList();

  return blocks.join('')
    .replace(MARKDOWN_LINK_REGEX, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/`([^`\n]+?)`/g, '<code>$1</code>');
}
