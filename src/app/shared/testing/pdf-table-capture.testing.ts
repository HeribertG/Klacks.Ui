// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Spec-only helpers to inspect the table a PDF export service drew with the real jsPDF and jspdf-autotable,
 * without vi.mock: the Angular unit-test builder runs all specs in one module registry (isolate=false), so a
 * mock registered in a spec has no effect once another spec has already loaded the real package.
 * @param pdf - The jsPDF document the service exported (captured from the stubbed PdfUnicodeTextService)
 * @param rowIndex - Zero-based body row of the table autoTable drew last
 * @param columnIndex - Zero-based column of that row
 */
import { vi } from 'vitest';
import type { jsPDF } from 'jspdf';

interface AutoTableCell {
  raw: unknown;
}

interface AutoTableResult {
  body: { cells: Record<number, AutoTableCell> }[];
}

export function autoTableBodyCell(pdf: jsPDF, rowIndex: number, columnIndex: number): string {
  const table = (pdf as unknown as { lastAutoTable?: AutoTableResult }).lastAutoTable;
  if (!table) {
    throw new Error('No autoTable result on the exported PDF: the export did not draw a table');
  }
  return String(table.body[rowIndex].cells[columnIndex].raw);
}

/**
 * Replaces the browser calls the export makes after generating the PDF (opening the pending tab and creating
 * the blob URL) with inert stubs, so the specs stay silent and independent of jsdom internals.
 * @returns Function that restores the original browser APIs
 */
export function stubPdfTabAndBlobUrl(): () => void {
  const originalOpen = window.open;
  const originalCreateObjectUrl = window.URL.createObjectURL;
  const originalRevokeObjectUrl = window.URL.revokeObjectURL;
  window.open = vi.fn(() => ({ closed: false, location: { href: '' }, close: vi.fn() }) as unknown as Window);
  window.URL.createObjectURL = vi.fn(() => 'blob:pdf-test');
  window.URL.revokeObjectURL = vi.fn();
  return () => {
    window.open = originalOpen;
    window.URL.createObjectURL = originalCreateObjectUrl;
    window.URL.revokeObjectURL = originalRevokeObjectUrl;
  };
}
