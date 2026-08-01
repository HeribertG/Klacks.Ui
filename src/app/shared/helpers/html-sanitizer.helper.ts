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
