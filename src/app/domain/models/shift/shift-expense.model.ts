// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Model for default expenses attached to a shift template.
 * @param shiftId - The shift this default expense belongs to
 * @param amount - Expense amount in currency
 * @param taxable - True = taxable (Spesen), False = reimbursement (Vergütung)
 */
export interface IShiftExpense {
  id: string | undefined;
  shiftId: string;
  amount: number;
  description: string;
  taxable: boolean;
}

export class ShiftExpense implements IShiftExpense {
  id: string | undefined = undefined;
  shiftId = '';
  amount = 0;
  description = '';
  taxable = true;
}
