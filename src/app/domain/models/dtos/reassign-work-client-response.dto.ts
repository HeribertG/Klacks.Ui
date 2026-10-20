// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IWork } from 'src/app/domain/models/schedule/schedule-class';
import { IPeriodHours, IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';

export interface ReassignWorkClientResponse {
  work: IWork;
  sourceScheduleEntries: IScheduleCell[];
  sourcePeriodHours?: IPeriodHours;
}
