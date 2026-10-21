// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScheduleCell } from './schedule-cell.interface';
import { IWorkScheduleClient } from './work-schedule-client.interface';
import { IPeriodHours } from './period-hours.interface';

export interface IWorkScheduleResponse {
  entries: IScheduleCell[];
  clients: IWorkScheduleClient[];
  periodHours: Record<string, IPeriodHours>;
  clientAvailabilities: Record<string, Record<string, string>>;
  totalClientCount: number;
  startDate: string;
  endDate: string;
}
