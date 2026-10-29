// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Escapes text for places that only accept an HTML string (e.g. a Leaflet attribution or popup), so user or
 * configuration text is shown as text and never parsed as markup.
 * @param text - Raw text to escape
 */
const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const HTML_SPECIAL_CHARACTERS = /[&<>"']/g;

export function escapeHtml(text: string): string {
  return text.replace(HTML_SPECIAL_CHARACTERS, (character) => HTML_ESCAPES[character]);
}
