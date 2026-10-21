// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportField } from './report-field.model';

export interface HeaderRow {
  rowIndex: number;
  left: ReportField[];
  center: ReportField[];
  right: ReportField[];
}
