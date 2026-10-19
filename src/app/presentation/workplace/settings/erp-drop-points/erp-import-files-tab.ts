// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * File list tabs of the ERP drop-point page and the column count of their table (expand, name, size, date,
 * source and detail; the failed tab adds an actions column), used for aria-colspan of full-width rows.
 * @param tab - The visible file list tab
 */

export type ErpImportFilesTab = 'inbox' | 'processed' | 'failed';

const BASE_COLUMN_COUNT = 6;
const FAILED_TAB_COLUMN_COUNT = BASE_COLUMN_COUNT + 1;

export function erpImportFilesColumnCount(tab: ErpImportFilesTab): number {
  return tab === 'failed' ? FAILED_TAB_COLUMN_COUNT : BASE_COLUMN_COUNT;
}
