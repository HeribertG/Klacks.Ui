// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';

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
  /** Three-day schedule snapshot the backend returns post-CRUD so the grid can update in place without a refresh round-trip. */
  scheduleEntries?: IScheduleCell[];
}
