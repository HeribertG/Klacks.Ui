// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IWorkConflictItem {
  code: string;
  clientId: string;
  date: string;
  params: Record<string, string>;
}

export interface IWorkConflictProblem {
  errorCode: string;
  shiftId?: string;
  shiftName?: string;
  date?: string;
  conflicts?: IWorkConflictItem[];
  engaged?: number;
  booked?: number;
  capacity?: number;
  rangeFrom?: string;
  rangeUntil?: string;
}
