// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { IWork } from 'src/app/domain/models/schedule/schedule-class';
import { IScheduleCell } from 'src/app/domain/models/schedule/work-schedule-class';

export interface ReassignWorkClientResponse {
  work: IWork;
  sourceScheduleEntries: IScheduleCell[];
}
