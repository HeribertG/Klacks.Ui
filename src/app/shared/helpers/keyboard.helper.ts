// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Detects whether a keyboard event represents actual text editing intent
 * (printable character, Backspace, Delete or Enter without modifier keys).
 * @param event - The keyboard event to classify
 */
export function isPrintableKey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.altKey || event.metaKey) return false;
  if (event.key.length === 1) return true;
  return event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Enter';
}
