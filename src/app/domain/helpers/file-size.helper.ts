// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Formats a byte count as a human readable size (B, KB, MB, GB) with one decimal place.
 * @param sizeBytes - Raw file size in bytes as reported by the backend
 */

const BYTES_PER_UNIT = 1024;
const FILE_SIZE_UNITS = ['KB', 'MB', 'GB'];
const FILE_SIZE_DECIMALS = 1;
const BYTES_UNIT = 'B';

export function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return `0 ${BYTES_UNIT}`;
  }
  if (sizeBytes < BYTES_PER_UNIT) {
    return `${sizeBytes} ${BYTES_UNIT}`;
  }
  let size = sizeBytes;
  let unitIndex = -1;
  while (size >= BYTES_PER_UNIT && unitIndex < FILE_SIZE_UNITS.length - 1) {
    size /= BYTES_PER_UNIT;
    unitIndex++;
  }
  return `${size.toFixed(FILE_SIZE_DECIMALS)} ${FILE_SIZE_UNITS[unitIndex]}`;
}
