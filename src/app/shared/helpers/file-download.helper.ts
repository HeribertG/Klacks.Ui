// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * File Download Helper
 *
 * Pure functions for triggering browser blob downloads, opening blobs in a
 * new tab, and extracting file names from content-disposition response
 * headers.
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
 * Starts a browser download for the given blob under the given file name.
 *
 * @param blob - Binary content to download
 * @param fileName - File name presented to the user
 */
export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Opens the given blob in a new browser tab. Falls back to a download under
 * fallbackFileName when the tab could not be opened (e.g. popup blocker).
 *
 * @param blob - Binary content to display
 * @param fallbackFileName - File name used for the download fallback
 */
export function openBlobInNewTab(blob: Blob, fallbackFileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const opened = window.open(url, '_blank');
  if (!opened) {
    window.URL.revokeObjectURL(url);
    triggerBlobDownload(blob, fallbackFileName);
  }
}

export interface PendingBlobTab {
  show(blob: Blob, fallbackFileName: string): void;
  cancel(): void;
}

/**
 * Opens an empty tab synchronously inside the user's click so that the popup blocker
 * lets it through, and fills it with the blob once the (slow, async) generation is done.
 * Falls back to a download when the tab could not be opened.
 *
 * @returns Handle to fill the tab with a blob or to close it again on failure
 */
export function openPendingBlobTab(): PendingBlobTab {
  const tab = window.open('', '_blank');
  return {
    show(blob: Blob, fallbackFileName: string): void {
      if (!tab || tab.closed) {
        triggerBlobDownload(blob, fallbackFileName);
        return;
      }
      tab.location.href = window.URL.createObjectURL(blob);
    },
    cancel(): void {
      tab?.close();
    },
  };
}

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
