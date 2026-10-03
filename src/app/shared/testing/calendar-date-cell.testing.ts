// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Spec-only expectations for a calendar date rendered in a list cell or a PDF cell: the wire value
 * "2026-12-25" must show in the reader's locale layout with Latin digits and a Gregorian year.
 * @param CELL_DATE_WIRE_VALUE - The backend wire value every cell spec feeds in
 * @param CELL_DATE_LOCALES - Locale ids whose Angular locale data the specs load
 * @param CELL_DATE_EXPECTATIONS - Exact cell text for the locales with a fixed numeric layout
 */

export const CELL_DATE_WIRE_VALUE = '2026-12-25';

export const CELL_DATE_LOCALES = ['de', 'en', 'ja', 'th', 'ar'] as const;

export const CELL_DATE_EXPECTATIONS: readonly (readonly [string, string])[] = [
  ['de', '25.12.2026'],
  ['en', '12/25/2026'],
  ['ja', '2026/12/25'],
  ['th', '25/12/2026'],
];

export const ARABIC_INDIC_DIGITS = /[٠-٩]/;
