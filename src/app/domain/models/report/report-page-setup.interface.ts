// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportOrientation } from './report-orientation.enum';
import { ReportPageSize } from './report-page-size.enum';
import { ReportMargins } from './report-margins.interface';

export interface ReportPageSetup {
  orientation: ReportOrientation;
  size: ReportPageSize;
  margins: ReportMargins;
}
