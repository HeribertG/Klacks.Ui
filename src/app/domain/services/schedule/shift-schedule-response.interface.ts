// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IShiftSchedule } from 'src/app/domain/models/schedule/shift-schedule.interface';

export interface ShiftScheduleResponse {
  shifts: IShiftSchedule[];
  totalCount: number;
}
