// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Machine-readable codes of the 409 answers of the payroll export.
 */
export const PAYROLL_EXPORT_ERROR_CODES = {
  blocked: 'payrollExportBlocked',
  nothingNew: 'payrollExportNothingNew',
  concurrent: 'payrollExportConcurrent',
} as const;

export type PayrollExportErrorCode = (typeof PAYROLL_EXPORT_ERROR_CODES)[keyof typeof PAYROLL_EXPORT_ERROR_CODES];
