// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PayrollExportBlockReason } from './payroll-export-block-reason';

/**
 * One reason a payroll export is not allowed yet.
 * date is null for blockers concerning the whole period (overlapping export); groupId/groupName are null when no group applies;
 * requiresGlobalClose is true when only a global period close can lock the day.
 */
export interface PayrollExportBlocker {
  clientId: string;
  clientName: string;
  idNumber: number;
  date: string | null;
  groupId: string | null;
  groupName: string | null;
  reason: PayrollExportBlockReason;
  requiresGlobalClose: boolean;
  entryCount: number;
}
