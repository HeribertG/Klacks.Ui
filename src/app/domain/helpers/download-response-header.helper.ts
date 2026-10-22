// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Download Response Header Helper
 *
 * Pure functions and header names for reading the file name and the payroll export metadata
 * from the response headers of a file download.
 */

export const CONTENT_DISPOSITION_HEADER = 'content-disposition';

export const EXPORT_SKIPPED_ENTRIES_HEADER = 'x-klacks-export-skipped';

export const EXPORT_MAPPING_INVALID_HEADER = 'x-klacks-export-mapping-invalid';

export const EXPORT_PERSONS_HEADER = 'x-klacks-export-persons';

const HEADER_TRUE_VALUE = 'true';

export const EXPORT_SUPPLEMENTARY_HEADER = 'x-klacks-export-supplementary';

/**
 * Reads the number of persons a payroll export file contains from its response header.
 *
 * @param headerValue - Raw header value or null when absent
 * @returns The count, or 0 when the header is absent or not a number
 */
export function parseExportPersonCount(headerValue: string | null): number {
  const count = Number.parseInt(headerValue ?? '', 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/**
 * Whether the response header flags the export as a supplementary one (re-export of persons exported before).
 *
 * @param headerValue - Raw header value or null when absent
 */
export function isSupplementaryExport(headerValue: string | null): boolean {
  return (headerValue ?? '').toLowerCase() === HEADER_TRUE_VALUE;
}

/**
 * Reads the number of entries a payroll export could not write from its response header.
 *
 * @param headerValue - Raw header value or null when absent
 * @returns The count, or 0 when the header is absent or not a number
 */
export function parseSkippedEntryCount(headerValue: string | null): number {
  const count = Number.parseInt(headerValue ?? '', 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

const FILE_NAME_PATTERN = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i;

/**
 * Extracts the file name from a content-disposition header value.
 *
 * @param contentDisposition - Raw header value or null when absent
 * @returns The file name or null when it cannot be determined
 */
export function extractFileNameFromContentDisposition(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) return null;
  const match = FILE_NAME_PATTERN.exec(contentDisposition);
  return match?.[1] ?? null;
}
