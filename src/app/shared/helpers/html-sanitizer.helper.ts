// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Central DOMPurify configuration for every path that renders stored HTML
 * (rich text editor content, received e-mail bodies).
 *
 * DOMPurify's default allowlist already strips scripts, event handlers and
 * javascript: URLs, but it keeps <style> blocks and form controls. A <style>
 * block injected through an e-mail or a pasted Word document applies to the
 * whole page, which allows UI redressing; form controls allow credential
 * phishing inside an otherwise trusted view. Both categories are removed here.
 *
 * The style ATTRIBUTE stays allowed on purpose: the rich text editor produces
 * inline styles for text alignment, and stripping them would both lose existing
 * formatting and make InitContentDirective rewrite innerHTML on every keystroke.
 */

import DOMPurify from 'dompurify';

const FORBIDDEN_TAGS = [
  'style',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'iframe',
  'object',
  'embed',
  'base',
  'link',
  'meta',
];

/**
 * Sanitises HTML that was stored by one user and is rendered for another.
 *
 * @param html - Untrusted HTML from the backend
 * @returns Sanitised HTML safe to assign to innerHTML
 */
export function sanitizeStoredHtml(html: string): string {
  if (!html) {
    return '';
  }

  return DOMPurify.sanitize(html, {
    FORBID_TAGS: FORBIDDEN_TAGS,
    ALLOW_DATA_ATTR: false,
  });
}

const LINE_BREAKING_TAGS = 'br, p, div, li, tr, h1, h2, h3, h4, h5, h6';

/**
 * Converts stored rich text HTML into plain text for outputs that cannot render markup,
 * such as the PDF report renderer. Block level elements become line breaks so a multi
 * paragraph description keeps its structure instead of collapsing into one line.
 *
 * @param html - Rich text HTML from the backend, may already be plain text
 * @returns Plain text with one line per block element and no empty lines
 */
export function htmlToPlainText(html: string): string {
  if (!html) {
    return '';
  }

  const parsed = new DOMParser().parseFromString(sanitizeStoredHtml(html), 'text/html');
  parsed.body.querySelectorAll(LINE_BREAKING_TAGS).forEach(element => element.insertAdjacentText('afterend', '\n'));

  return (parsed.body.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}
