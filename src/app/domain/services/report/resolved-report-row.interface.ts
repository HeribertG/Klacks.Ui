// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportRow } from './report-row.type';

export interface ResolvedReportRow {
  row: Record<string, string>;
  sourceEntry: ReportRow;
}
