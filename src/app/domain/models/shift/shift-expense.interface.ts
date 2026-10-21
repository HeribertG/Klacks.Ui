// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IShiftExpense {
  id: string | undefined;
  shiftId: string;
  amount: number;
  description: string;
  taxable: boolean;
}
