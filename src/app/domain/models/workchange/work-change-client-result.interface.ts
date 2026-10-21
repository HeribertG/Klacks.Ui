// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IPeriodHours } from '../schedule/period-hours.interface';
import { IScheduleCell } from '../schedule/schedule-cell.interface';

export interface WorkChangeClientResult {
  clientId: string;
  periodHours?: IPeriodHours;
  scheduleEntries?: IScheduleCell[];
}
