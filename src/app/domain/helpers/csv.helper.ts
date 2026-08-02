// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * CSV formatting primitives shared by the report exports.
 * @param value - Cell value to escape
 * @param cells - Cells of one row
 */

export const CSV_SEPARATOR = ';';
export const CSV_LINE_BREAK = '\r\n';
export const CSV_UTF8_BOM = '﻿';

const QUOTE = '"';

/**
 * Quotes a value when it contains the separator, a quote or a line break,
 * doubling embedded quotes as the CSV convention requires.
 */
export function escapeCsvValue(value: string | undefined | null): string {
  const text = value ?? '';
  if (!text.includes(CSV_SEPARATOR) && !text.includes(QUOTE) && !/[\r\n]/.test(text)) {
    return text;
  }
  return QUOTE + text.replace(/"/g, QUOTE + QUOTE) + QUOTE;
}

export function buildCsvRow(cells: (string | undefined | null)[]): string {
  return cells.map(escapeCsvValue).join(CSV_SEPARATOR);
}
