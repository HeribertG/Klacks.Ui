// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IClient } from '../client/client-class';
import { IShift } from '../shift/shift.interface';
import { IPeriodHours } from './period-hours.interface';
import { IScheduleCell } from './schedule-cell.interface';
import { IWork } from './work.interface';

export class Work implements IWork {
  client?: IClient;
  clientId = '';
  currentDate: Date = new Date();
  id?: string;
  information?: string;
  lockLevel = 0;
  sealedAt?: string;
  sealedBy?: string;
  shift?: IShift;
  shiftId = '';
  workTime = 0;
  surcharges = 0;
  startTime = '';
  endTime = '';
  periodHours?: IPeriodHours;
  periodStart?: string;
  periodEnd?: string;
  scheduleEntries?: IScheduleCell[];
  analyseToken?: string;
}
