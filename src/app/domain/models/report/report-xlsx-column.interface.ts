// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportFieldType } from './report-field-type.enum';

export interface ReportXlsxColumn {
  header: string;
  type: ReportFieldType;
}
