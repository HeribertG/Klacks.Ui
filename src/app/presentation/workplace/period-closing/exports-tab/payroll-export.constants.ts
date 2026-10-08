// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PayrollExportBlockReason } from 'src/app/infrastructure/api/period-closing/models/payroll-export-block-reason';

export const PAYROLL_BLOCK_REASON_KEYS: Readonly<Record<PayrollExportBlockReason, string>> = {
  [PayrollExportBlockReason.EntryNotClosed]: 'periodClosing.payroll.reason.entryNotClosed',
  [PayrollExportBlockReason.DayNotLocked]: 'periodClosing.payroll.reason.dayNotLocked',
  [PayrollExportBlockReason.OverlappingExport]: 'periodClosing.payroll.reason.overlappingExport',
};

export const PAYROLL_EMPTY_PLACEHOLDER = '–';
