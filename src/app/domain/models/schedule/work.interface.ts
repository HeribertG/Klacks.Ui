// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClient } from '../client/client-class';
import { IShift } from '../shift/shift.interface';
import { IPeriodHours } from './period-hours.interface';
import { IScheduleCell } from './schedule-cell.interface';

export interface IWork {
  client?: IClient;
  clientId: string;
  currentDate: Date;
  id?: string;
  information?: string;
  lockLevel: number;
  sealedAt?: string;
  sealedBy?: string;
  shift?: IShift;
  shiftId: string;
  workTime: number;
  surcharges: number;
  startTime: string;
  endTime: string;
  periodHours?: IPeriodHours;
  periodStart?: string;
  periodEnd?: string;
  scheduleEntries?: IScheduleCell[];
  analyseToken?: string;
}
