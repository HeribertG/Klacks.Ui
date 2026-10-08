// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PayrollExportBlocker } from './payroll-export-blocker';
import { PayrollExportErrorCode } from './payroll-export-error-codes';

/**
 * Parsed body of a payroll export 409. blockers and blockerTotal are only present for the blocked code.
 */
export interface PayrollExportConflict {
  code: PayrollExportErrorCode;
  blockers?: PayrollExportBlocker[];
  blockerTotal?: number;
}
