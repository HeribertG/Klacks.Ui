// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * File Download Helper
 *
 * Pure functions for triggering browser blob downloads, opening blobs in a
 * new tab, and extracting file names from content-disposition response
 * headers.
 */

export const CONTENT_DISPOSITION_HEADER = 'content-disposition';

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
