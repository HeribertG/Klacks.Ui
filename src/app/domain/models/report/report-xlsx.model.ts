// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Shape of the spreadsheet request sent to the backend.
 * The rows are already resolved here, because the data providers that read them live in
 * the frontend; the backend only gives the values their type back.
 * @param groupColumnIndex - Zero based column the rows are grouped by, omitted when ungrouped
 */

import { ReportFieldType } from './report-field.model';

export interface ReportXlsxRequest {
  fileName: string;
  sheets: ReportXlsxSheet[];
}

export interface ReportXlsxSheet {
  name: string;
  columns: ReportXlsxColumn[];
  rows: string[][];
  groupColumnIndex?: number;
  subtotals: boolean;
}

export interface ReportXlsxColumn {
  header: string;
  type: ReportFieldType;
}
