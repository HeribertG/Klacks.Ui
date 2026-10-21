// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shape of the spreadsheet request sent to the backend.
 * The rows are already resolved here, because the data providers that read them live in
 * the frontend; the backend only gives the values their type back.
 * @param groupColumnIndex - Zero based column the rows are grouped by, omitted when ungrouped
 */

import { ReportXlsxSheet } from './report-xlsx-sheet.interface';

export interface ReportXlsxRequest {
  fileName: string;
  sheets: ReportXlsxSheet[];
}
