// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Cleans a value written by other users (a person or shift name) before it is inserted into a question the UI sends
 * as the user's own chat message: the Markdown link characters [ ] ( ) are removed, every whitespace run - line
 * breaks, tabs and the Unicode line and paragraph separators included - collapses to one space, and the result is
 * cut to a maximum length (by code point, so no surrogate pair is split). The name can then neither start a new
 * paragraph nor form a link in the chat.
 * @param value - Raw value from the loaded data
 * @param maxLength - Maximum number of characters kept
 */

const MARKDOWN_LINK_CHARACTERS = /[[\]()]/g;
const WHITESPACE_RUNS = /\s+/g;
const SINGLE_SPACE = ' ';
const NOTHING = '';

export function sanitizeChatPhraseValue(value: string, maxLength: number): string {
  const cleaned = value.replace(MARKDOWN_LINK_CHARACTERS, NOTHING).replace(WHITESPACE_RUNS, SINGLE_SPACE).trim();
  return Array.from(cleaned).slice(0, maxLength).join(NOTHING).trim();
}
