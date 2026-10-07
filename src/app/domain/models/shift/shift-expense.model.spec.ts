// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ShiftExpense } from './shift-expense.model';

describe('ShiftExpense', () => {
  it('starts as a non-taxable expense (Spesen), like the expense dialog', () => {
    expect(new ShiftExpense().taxable).toBe(false);
  });
});
