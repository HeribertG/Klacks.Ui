// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Font family constants for canvas rendering.
 * DEFAULT_GRID_FONT_STACK is the fallback chain used when no font family is configured.
 * GENERIC_FONT_FAMILIES are the CSS generic families that terminate a fallback chain; system-ui is excluded because WebKit may resolve it to a serif face.
 */
export const DEFAULT_GRID_FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export const GENERIC_FONT_FALLBACK = 'sans-serif';

export const GENERIC_FONT_FAMILIES: readonly string[] = [
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
];
