// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Name of a country in the user's language, from its two-letter ISO code (e.g. "CH" -> "Schweiz" for "de").
 * Uses the browser's Intl.DisplayNames, which knows every UI language; an unknown code or a browser without
 * the API yields the code itself, an empty code yields an empty string.
 * @param countryCode - Two-letter ISO 3166 code, any case
 * @param language - UI language tag, e.g. "de" or "zh-CN"
 */
export function countryDisplayName(countryCode: string, language: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code.length === 0) {
    return '';
  }

  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
