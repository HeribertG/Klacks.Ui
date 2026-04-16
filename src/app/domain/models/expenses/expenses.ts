// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface ExpensesRequest {
  workId: string;
  amount: number;
  description: string;
  taxable: boolean;
  analyseToken?: string;
}

export interface ExpensesResource {
  id: string;
  workId: string;
  amount: number;
  description: string;
  taxable: boolean;
  analyseToken?: string;
}
