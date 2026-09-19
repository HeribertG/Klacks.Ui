// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  GENERIC_FONT_FALLBACK,
  GENERIC_FONT_FAMILIES,
} from 'src/app/domain/constants/grid-font.constants';

/**
 * Appends a generic sans-serif fallback to a font family list when it has none.
 * @param fontFamily - Comma separated CSS font family list as configured by the user
 */
export function ensureFontFallback(fontFamily: string): string {
  const trimmed = fontFamily.trim();
  if (!trimmed) {
    return GENERIC_FONT_FALLBACK;
  }

  const families = trimmed
    .split(',')
    .map((f) => f.trim().replace(/^["']|["']$/g, '').toLowerCase());

  if (families.some((f) => GENERIC_FONT_FAMILIES.includes(f))) {
    return trimmed;
  }

  return `${trimmed}, ${GENERIC_FONT_FALLBACK}`;
}
