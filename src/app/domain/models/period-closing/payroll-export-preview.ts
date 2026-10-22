// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PayrollExportBlocker } from './payroll-export-blocker';
import { PayrollExportPerson } from './payroll-export-person';

/**
 * What a payroll export of a period would do right now. blockers is capped; blockerTotal is the count before the cap.
 */
export interface PayrollExportPreview {
  canExport: boolean;
  isComplete: boolean;
  personCount: number;
  newOrChangedPersons: PayrollExportPerson[];
  alreadyExportedCount: number;
  blockers: PayrollExportBlocker[];
  blockerTotal: number;
}
