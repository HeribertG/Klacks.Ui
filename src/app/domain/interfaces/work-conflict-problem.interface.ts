// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IWorkConflictItem } from './work-conflict-item.interface';

export interface IWorkConflictProblem {
  errorCode: string;
  clientId?: string;
  from?: string | null;
  until?: string | null;
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
