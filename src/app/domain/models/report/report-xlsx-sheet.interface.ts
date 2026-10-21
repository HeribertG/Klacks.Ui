// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportXlsxColumn } from './report-xlsx-column.interface';

export interface ReportXlsxSheet {
  name: string;
  columns: ReportXlsxColumn[];
  rows: string[][];
  groupColumnIndex?: number;
  subtotals: boolean;
}
