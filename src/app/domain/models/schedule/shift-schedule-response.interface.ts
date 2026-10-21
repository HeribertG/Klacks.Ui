// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShiftSchedule } from './shift-schedule.interface';

export interface IShiftScheduleResponse {
  shifts: IShiftSchedule[];
  totalCount: number;
}
