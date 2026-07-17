// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Color Helper
 *
 * Pure functions for validating CSS color values against a strict whitelist
 * before they are interpolated into raw HTML/SVG template strings. Prevents
 * stored XSS via admin-configurable color fields (e.g. Absence.color) that
 * are rendered through DomSanitizer.bypassSecurityTrustHtml.
 */

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_PATTERN = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;
const RGBA_COLOR_PATTERN =
  /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|1|0?\.\d+)\s*\)$/;
const SAFE_COLOR_KEYWORDS = new Set<string>(['transparent', 'currentcolor']);

export const DEFAULT_SVG_FILL_COLOR = 'transparent';

/**
 * Checks whether a value is a safe, recognized CSS color format.
 * Accepts only hex colors (#rgb, #rrggbb, #rrggbbaa), rgb()/rgba() with
 * purely numeric components, and a small set of known safe keywords.
 *
 * @param value - Candidate color value (e.g. Absence.color from the database)
 * @returns true if the value matches the whitelist, false otherwise
 */
export function isValidCssColor(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();

  return (
    HEX_COLOR_PATTERN.test(trimmed) ||
    RGB_COLOR_PATTERN.test(trimmed) ||
    RGBA_COLOR_PATTERN.test(trimmed) ||
    SAFE_COLOR_KEYWORDS.has(trimmed.toLowerCase())
  );
}

/**
 * Validates a color value and falls back to a safe default when it does not
 * match the whitelist. Use this at every point where an untrusted color value
 * is about to be interpolated into an HTML/SVG string.
 *
 * @param value - Candidate color value to sanitize
 * @param fallback - Color used when validation fails (default: DEFAULT_SVG_FILL_COLOR)
 * @returns The trimmed input value if valid, otherwise the fallback color
 */
export function sanitizeCssColor(
  value: string | undefined | null,
  fallback: string = DEFAULT_SVG_FILL_COLOR
): string {
  if (!isValidCssColor(value)) {
    return fallback;
  }

  return (value as string).trim();
}
