// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ExportLog } from './export-log';
import { PeriodIssue } from './period-issue';
import { SealedPeriodSummary } from './sealed-period-summary';

export interface PeriodClosingOverview {
  summary: SealedPeriodSummary[];
  issues: PeriodIssue[];
  exportLogs: ExportLog[];
  unstaffedShiftCount: number;
  unstaffedShiftTruncated: boolean;
}
