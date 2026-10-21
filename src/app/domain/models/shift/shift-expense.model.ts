// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Model for default expenses attached to a shift template.
 * @param shiftId - The shift this default expense belongs to
 * @param amount - Expense amount in currency
 * @param taxable - True = taxable wage supplement (Vergütung), False = non-taxable reimbursement of advanced money (Spesen)
 */

import { IShiftExpense } from './shift-expense.interface';

export class ShiftExpense implements IShiftExpense {
  id: string | undefined = undefined;
  shiftId = '';
  amount = 0;
  description = '';
  taxable = false;
}
