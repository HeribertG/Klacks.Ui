// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ExpensesRequest {
  workId: string;
  amount: number;
  description: string;
  taxable: boolean;
  analyseToken?: string;
}
